/**
 * ATS (Applicant Tracking System) compatibility analyzer.
 *
 * Performs static analysis on a Resume to produce a compatibility score
 * across six categories: contact completeness, section presence, experience
 * quality, content depth, date continuity, and structural soundness.
 *
 * Optionally matches resume keywords against a job description.
 */

import { parseDate } from './dates.js';
import type { Resume, Highlight } from '../types/index.js';
import type {
  AtsResult,
  AtsAnalyzeOptions,
  AtsCategoryScore,
  AtsFinding,
  AtsDateGap,
  AtsKeywordAnalysis,
  AtsKeywordMatch,
  AtsCategory,
  AtsSeverity,
} from '../types/ats.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Analyze a resume for ATS compatibility. */
export function analyzeResume(
  resume: Resume,
  options?: AtsAnalyzeOptions
): AtsResult {
  const contactScore = analyzeContact(resume);
  const sectionsScore = analyzeSections(resume);
  const experienceScore = analyzeExperience(resume);
  const contentScore = analyzeContent(resume);
  const datesResult = analyzeDates(resume);
  const structureScore = analyzeStructure(resume);

  const categories: AtsCategoryScore[] = [
    contactScore,
    sectionsScore,
    experienceScore,
    contentScore,
    datesResult.categoryScore,
    structureScore,
  ];

  const findings = categories.flatMap((c) => c.findings);
  const score = computeOverallScore(categories);

  const result: AtsResult = {
    score,
    categories,
    findings,
    gaps: datesResult.gaps,
  };

  if (options?.jobDescription) {
    result.keywords = analyzeKeywords(resume, options.jobDescription);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function finding(
  category: AtsCategory,
  severity: AtsSeverity,
  message: string
): AtsFinding {
  return { category, severity, message };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function highlightText(h: Highlight): string {
  return typeof h === 'string' ? h : h.text;
}

// ---------------------------------------------------------------------------
// Category: Contact Completeness (weight 15)
// ---------------------------------------------------------------------------

function analyzeContact(resume: Resume): AtsCategoryScore {
  const findings: AtsFinding[] = [];
  let score = 100;

  const { meta } = resume;

  if (!meta.email) {
    score -= 25;
    findings.push(
      finding('contact', 'error', 'Email address is strongly recommended for recruiter contact')
    );
  }

  if (!meta.phone) {
    score -= 15;
    findings.push(
      finding('contact', 'warning', 'Phone number is recommended for recruiter contact')
    );
  }

  if (!meta.location) {
    score -= 10;
    findings.push(
      finding('contact', 'warning', 'Location helps with geographic filtering')
    );
  }

  if (!meta.title) {
    score -= 5;
    findings.push(
      finding('contact', 'suggestion', 'A professional title helps ATS categorize your profile')
    );
  }

  const hasProfessional = meta.links?.some((link) => {
    const url = link.url.toLowerCase();
    return url.includes('linkedin.com') || url.includes('github.com');
  });

  if (!hasProfessional) {
    score -= 10;
    findings.push(
      finding(
        'contact',
        'warning',
        'At least one professional profile link (LinkedIn, GitHub) is recommended'
      )
    );
  }

  return {
    category: 'contact',
    label: 'Contact',
    score: clamp(score, 0, 100),
    weight: 15,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Section Presence (weight 15)
// ---------------------------------------------------------------------------

function analyzeSections(resume: Resume): AtsCategoryScore {
  const findings: AtsFinding[] = [];
  let score = 100;

  if (!resume.summary) {
    score -= 25;
    findings.push(
      finding(
        'sections',
        'warning',
        'A professional summary helps ATS and recruiters quickly assess your profile'
      )
    );
  }

  if (!resume.skills || resume.skills.length === 0) {
    score -= 30;
    findings.push(
      finding('sections', 'error', 'Skills section is critical for ATS keyword matching')
    );
  }

  if (resume.experience.length === 0) {
    score -= 35;
    findings.push(
      finding('sections', 'error', 'Experience section is essential')
    );
  }

  if (!resume.education || resume.education.length === 0) {
    score -= 15;
    findings.push(
      finding('sections', 'warning', 'Education section is expected by most ATS systems')
    );
  }

  return {
    category: 'sections',
    label: 'Section Presence',
    score: clamp(score, 0, 100),
    weight: 15,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Experience Quality (weight 25)
// ---------------------------------------------------------------------------

function analyzeExperience(resume: Resume): AtsCategoryScore {
  const findings: AtsFinding[] = [];
  const roleScores: number[] = [];

  for (const exp of resume.experience) {
    for (const role of exp.roles) {
      let roleScore = 100;
      const count = role.highlights?.length ?? 0;

      if (count === 0) {
        roleScore -= 30;
        findings.push(
          finding(
            'experience',
            'error',
            `Role '${role.title}' at '${exp.company}' has no highlights`
          )
        );
      } else if (count < 2) {
        roleScore -= 15;
        findings.push(
          finding(
            'experience',
            'warning',
            `Role '${role.title}' at '${exp.company}' has only ${count} highlight; aim for 2-5`
          )
        );
      } else if (count > 8) {
        roleScore -= 5;
        findings.push(
          finding(
            'experience',
            'suggestion',
            `Role '${role.title}' at '${exp.company}' has ${count} highlights; consider trimming to 5-8`
          )
        );
      }

      if (!role.location) {
        roleScore -= 3;
        findings.push(
          finding(
            'experience',
            'suggestion',
            `Role '${role.title}' at '${exp.company}' has no location specified`
          )
        );
      }

      roleScores.push(clamp(roleScore, 0, 100));
    }
  }

  const score =
    roleScores.length > 0
      ? Math.round(roleScores.reduce((a, b) => a + b, 0) / roleScores.length)
      : 0;

  return {
    category: 'experience',
    label: 'Experience Quality',
    score: clamp(score, 0, 100),
    weight: 25,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Content Depth (weight 20)
// ---------------------------------------------------------------------------

function analyzeContent(resume: Resume): AtsCategoryScore {
  const findings: AtsFinding[] = [];
  let score = 100;

  // Summary length
  if (resume.summary) {
    if (resume.summary.length < 30) {
      score -= 20;
      findings.push(
        finding(
          'content',
          'warning',
          `Summary is very short (${resume.summary.length} chars); aim for 2-4 sentences`
        )
      );
    } else if (resume.summary.length > 500) {
      score -= 5;
      findings.push(
        finding(
          'content',
          'suggestion',
          `Summary is long (${resume.summary.length} chars); consider keeping it under 500 characters`
        )
      );
    }
  }

  // Highlight substance
  let shortHighlightDeduction = 0;
  const allHighlights = collectAllHighlights(resume);

  if (allHighlights.length === 0 && resume.experience.length > 0) {
    score -= 20;
    findings.push(
      finding(
        'content',
        'error',
        'Resume has no bullet points/highlights; these are critical for ATS parsing'
      )
    );
  }

  for (const h of allHighlights) {
    const text = highlightText(h);
    if (text.length < 20 && shortHighlightDeduction < 25) {
      shortHighlightDeduction += 5;
      const preview = text.length > 30 ? text.slice(0, 30) + '...' : text;
      findings.push(
        finding('content', 'warning', `Short highlight: '${preview}'`)
      );
    }
  }
  score -= shortHighlightDeduction;

  // Skills depth
  if (resume.skills && resume.skills.length > 0) {
    if (resume.skills.length < 2) {
      score -= 15;
      findings.push(
        finding(
          'content',
          'warning',
          `Only ${resume.skills.length} skill category; multiple categories improve keyword coverage`
        )
      );
    }

    let emptyDeduction = 0;
    for (const cat of resume.skills) {
      if (cat.items.length < 2 && emptyDeduction < 15) {
        emptyDeduction += 5;
        findings.push(
          finding(
            'content',
            'suggestion',
            `Skill category '${cat.category}' has only ${cat.items.length} item(s)`
          )
        );
      }
    }
    score -= emptyDeduction;

    const totalItems = resume.skills.reduce((sum, cat) => sum + cat.items.length, 0);
    if (totalItems < 5) {
      score -= 15;
      findings.push(
        finding(
          'content',
          'warning',
          `Only ${totalItems} total skills listed; ATS systems match against skill keywords`
        )
      );
    }
  }

  return {
    category: 'content',
    label: 'Content Depth',
    score: clamp(score, 0, 100),
    weight: 20,
    findings,
  };
}

function collectAllHighlights(resume: Resume): Highlight[] {
  const highlights: Highlight[] = [];

  for (const exp of resume.experience) {
    for (const role of exp.roles) {
      if (role.highlights) highlights.push(...role.highlights);
    }
  }

  if (resume.projects) {
    for (const proj of resume.projects) {
      if (proj.highlights) highlights.push(...proj.highlights);
    }
  }

  if (resume.education) {
    for (const edu of resume.education) {
      if (edu.highlights) highlights.push(...edu.highlights);
    }
  }

  if (resume.volunteer) {
    for (const vol of resume.volunteer) {
      if (vol.highlights) highlights.push(...vol.highlights);
    }
  }

  return highlights;
}

// ---------------------------------------------------------------------------
// Category: Date Continuity (weight 10)
// ---------------------------------------------------------------------------

interface DatePoint {
  startMonths: number;
  endMonths: number;
  label: string;
  startStr: string;
  endStr: string;
}

function parseDateToMonths(
  dateStr: string | undefined,
  defaultMonth: 'start' | 'end'
): number | null {
  const parsed = parseDate(dateStr);
  if (!parsed) return null;

  if (parsed.isPresent) {
    const now = new Date();
    return now.getFullYear() * 12 + now.getMonth();
  }

  const year = parseInt(parsed.year, 10);
  if (isNaN(year)) return null;

  // For year-only dates: use January for start, December for end
  const month = parsed.month ?? (defaultMonth === 'start' ? 0 : 11);
  return year * 12 + month;
}

function analyzeDates(
  resume: Resume
): { categoryScore: AtsCategoryScore; gaps: AtsDateGap[] } {
  const findings: AtsFinding[] = [];
  const gaps: AtsDateGap[] = [];

  // Collect all date points
  const points: DatePoint[] = [];
  for (const exp of resume.experience) {
    for (const role of exp.roles) {
      const start = parseDateToMonths(role.start, 'start');
      const endStr = role.end ?? role.start;
      const end = parseDateToMonths(endStr, 'end');

      if (start !== null) {
        points.push({
          startMonths: start,
          endMonths: end ?? start,
          label: `${role.title} at ${exp.company}`,
          startStr: role.start,
          endStr,
        });
      }
    }
  }

  // Sort by start ascending, then by end descending (longest roles first)
  points.sort(
    (a, b) => a.startMonths - b.startMonths || b.endMonths - a.endMonths
  );

  // Walk and detect gaps
  let latestEnd = -Infinity;
  let latestLabel = '';
  let latestEndStr = '';

  for (const point of points) {
    if (latestEnd !== -Infinity) {
      const gapMonths = point.startMonths - latestEnd;
      if (gapMonths > 6) {
        const gap: AtsDateGap = {
          from: latestEndStr,
          to: point.startStr,
          months: gapMonths,
          fromRole: latestLabel,
          toRole: point.label,
        };
        gaps.push(gap);

        const severity: AtsSeverity = gapMonths > 12 ? 'error' : 'warning';
        findings.push(
          finding(
            'dates',
            severity,
            `${gapMonths}-month gap between '${latestLabel}' and '${point.label}'`
          )
        );
      }
    }

    if (point.endMonths > latestEnd) {
      latestEnd = point.endMonths;
      latestLabel = point.label;
      latestEndStr = point.endStr;
    }
  }

  // Score: start at 100, deduct per gap
  let score = 100;
  for (const gap of gaps) {
    if (gap.months > 12) {
      score -= 30;
    } else {
      score -= 15;
    }
  }

  return {
    categoryScore: {
      category: 'dates',
      label: 'Date Continuity',
      score: clamp(score, 0, 100),
      weight: 10,
      findings,
    },
    gaps,
  };
}

// ---------------------------------------------------------------------------
// Category: Structure (weight 15)
// ---------------------------------------------------------------------------

function analyzeStructure(resume: Resume): AtsCategoryScore {
  const findings: AtsFinding[] = [];
  let score = 100;

  // Count non-empty sections
  let sectionCount = 0;
  if (resume.summary) sectionCount++;
  if (resume.skills && resume.skills.length > 0) sectionCount++;
  if (resume.experience.length > 0) sectionCount++;
  if (resume.education && resume.education.length > 0) sectionCount++;
  if (resume.projects && resume.projects.length > 0) sectionCount++;
  if (resume.certifications && resume.certifications.length > 0) sectionCount++;
  if (resume.volunteer && resume.volunteer.length > 0) sectionCount++;
  if (resume.languages && resume.languages.length > 0) sectionCount++;
  if (resume.awards && resume.awards.length > 0) sectionCount++;
  if (resume.publications && resume.publications.length > 0) sectionCount++;

  if (sectionCount <= 1) {
    score -= 30;
    findings.push(
      finding(
        'structure',
        'error',
        `Resume has only ${sectionCount} section with content; ATS expects multiple sections`
      )
    );
  } else if (sectionCount === 2) {
    score -= 15;
    findings.push(
      finding('structure', 'warning', 'Resume has only 2 sections with content')
    );
  } else if (sectionCount < 4) {
    score -= 5;
    findings.push(
      finding(
        'structure',
        'suggestion',
        'Consider adding more sections for a comprehensive resume'
      )
    );
  }

  // Empty containers
  for (const exp of resume.experience) {
    if (exp.roles.length === 0) {
      score -= 10;
      findings.push(
        finding(
          'structure',
          'warning',
          `Company '${exp.company}' has no roles defined`
        )
      );
    }
  }

  if (resume.skills) {
    for (const cat of resume.skills) {
      if (cat.items.length === 0) {
        score -= 10;
        findings.push(
          finding(
            'structure',
            'warning',
            `Skill category '${cat.category}' has no items`
          )
        );
      }
    }
  }

  // Education completeness
  if (resume.education) {
    let eduDeduction = 0;
    for (const edu of resume.education) {
      if (!edu.degree && !edu.field && eduDeduction < 15) {
        eduDeduction += 5;
        findings.push(
          finding(
            'structure',
            'suggestion',
            `Education at '${edu.institution}' is missing degree and field`
          )
        );
      }
    }
    score -= eduDeduction;
  }

  return {
    category: 'structure',
    label: 'Structure',
    score: clamp(score, 0, 100),
    weight: 15,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Overall Score
// ---------------------------------------------------------------------------

function computeOverallScore(categories: AtsCategoryScore[]): number {
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = categories.reduce(
    (sum, c) => sum + c.score * c.weight,
    0
  );
  return Math.round(weightedSum / totalWeight);
}

// ---------------------------------------------------------------------------
// Keyword Matching
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought',
  'used', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
  'as', 'into', 'through', 'during', 'before', 'after', 'above', 'below',
  'between', 'out', 'off', 'over', 'under', 'again', 'further', 'then',
  'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
  'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
  'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'because', 'but', 'and', 'or', 'if', 'while', 'about',
  'up', 'that', 'this', 'these', 'those', 'am', 'it', 'its', 'my',
  'your', 'we', 'our', 'you', 'they', 'them', 'their', 'what', 'which',
  'who', 'whom', 'he', 'she', 'him', 'her', 'his', 'hers', 'i', 'me',
  'us', 'also', 'able', 'etc', 'must', 'including', 'required',
  'preferred', 'strong', 'looking', 'work', 'working', 'role',
  'responsibilities', 'requirements', 'qualifications', 'apply',
]);

export function extractKeywords(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const words = normalized
    .split(' ')
    .map((w) => w.replace(/\.+$/g, ''))
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  const freq = new Map<string, number>();

  // Unigrams
  for (const word of words) {
    freq.set(word, (freq.get(word) ?? 0) + 1);
  }

  // Bigrams
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i]!;
    const b = words[i + 1]!;
    if (!STOP_WORDS.has(a) && !STOP_WORDS.has(b)) {
      const bigram = `${a} ${b}`;
      freq.set(bigram, (freq.get(bigram) ?? 0) + 1);
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([keyword]) => keyword);
}

export function buildResumeTextBlocks(resume: Resume): Record<string, string> {
  const blocks: Record<string, string> = {};

  blocks['meta'] = [resume.meta.name, resume.meta.title]
    .filter(Boolean)
    .join(' ');

  if (resume.summary) {
    blocks['summary'] = resume.summary;
  }

  if (resume.skills && resume.skills.length > 0) {
    blocks['skills'] = resume.skills
      .flatMap((s) => [s.category, ...s.items])
      .join(' ');
  }

  if (resume.experience.length > 0) {
    blocks['experience'] = resume.experience
      .flatMap((exp) =>
        exp.roles.flatMap((role) => [
          role.title,
          role.summary ?? '',
          ...(role.highlights?.map(highlightText) ?? []),
        ])
      )
      .join(' ');
  }

  if (resume.projects && resume.projects.length > 0) {
    blocks['projects'] = resume.projects
      .flatMap((p) => [
        p.name,
        p.description ?? '',
        ...(p.highlights?.map(highlightText) ?? []),
      ])
      .join(' ');
  }

  if (resume.education && resume.education.length > 0) {
    blocks['education'] = resume.education
      .flatMap((e) => [e.institution, e.degree ?? '', e.field ?? ''])
      .join(' ');
  }

  if (resume.certifications && resume.certifications.length > 0) {
    blocks['certifications'] = resume.certifications
      .map((c) => [c.name, c.issuer ?? ''].join(' '))
      .join(' ');
  }

  return blocks;
}

export function textContainsKeyword(text: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`\\b${escaped}\\b`, 'i');
  return regex.test(text);
}

function analyzeKeywords(
  resume: Resume,
  jobDescription: string
): AtsKeywordAnalysis {
  const keywords = extractKeywords(jobDescription);
  const blocks = buildResumeTextBlocks(resume);

  const results: AtsKeywordMatch[] = keywords.map((keyword) => {
    const foundIn: string[] = [];
    for (const [section, text] of Object.entries(blocks)) {
      if (textContainsKeyword(text, keyword)) {
        foundIn.push(section);
      }
    }
    return { keyword, found: foundIn.length > 0, foundIn };
  });

  const matchedCount = results.filter((r) => r.found).length;

  return {
    totalKeywords: keywords.length,
    matchedCount,
    matchPercentage:
      keywords.length > 0
        ? Math.round((matchedCount / keywords.length) * 100)
        : 100,
    keywords: results,
  };
}
