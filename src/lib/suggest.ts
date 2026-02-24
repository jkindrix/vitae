/**
 * AI content suggestion engine — analyzes resume content via LLM and
 * returns structured improvement suggestions.
 */

import { resolveLlmConfig, callLlm } from './llm.js';
import { LlmError } from './errors.js';
import type { Resume, Highlight } from '../types/resume.js';
import type {
  SuggestOptions,
  SuggestResult,
  SectionSuggestions,
  Suggestion,
  SuggestionCategory,
  LlmMessage,
} from '../types/suggest.js';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate AI-powered content improvement suggestions for a resume.
 */
export async function generateSuggestions(
  resume: Resume,
  options?: SuggestOptions,
): Promise<SuggestResult> {
  const config = resolveLlmConfig(options);
  const resumeContent = extractResumeContent(resume, options?.section);
  const messages = buildPrompt(resumeContent, options?.section);

  const response = await callLlm(config, messages);
  const sections = parseResponse(response.content);

  // Filter to requested section if specified
  const filtered = options?.section
    ? sections.filter((s) => s.section === options.section)
    : sections;

  const totalSuggestions = filtered.reduce((n, s) => n + s.suggestions.length, 0);

  return {
    sections: filtered,
    totalSuggestions,
    provider: config.provider,
    model: config.model,
  };
}

// ---------------------------------------------------------------------------
// Resume content extraction
// ---------------------------------------------------------------------------

function highlightText(h: Highlight): string {
  return typeof h === 'string' ? h : h.text;
}

/**
 * Extract resume content into a structured text representation for the LLM.
 */
export function extractResumeContent(resume: Resume, section?: string): string {
  const parts: string[] = [];

  if (!section || section === 'meta') {
    const meta = resume.meta;
    const metaParts = [meta.name, meta.title].filter(Boolean);
    if (metaParts.length > 0) {
      parts.push(`## Meta\nName: ${meta.name}${meta.title ? `\nTitle: ${meta.title}` : ''}`);
    }
  }

  if (!section || section === 'summary') {
    if (resume.summary) {
      parts.push(`## Summary\n${resume.summary}`);
    }
  }

  if (!section || section === 'experience') {
    if (resume.experience.length > 0) {
      const expParts: string[] = ['## Experience'];
      for (const exp of resume.experience) {
        for (const role of exp.roles) {
          expParts.push(`\n### ${role.title} at ${exp.company}`);
          if (role.summary) {
            expParts.push(role.summary);
          }
          if (role.highlights && role.highlights.length > 0) {
            expParts.push('Highlights:');
            for (const h of role.highlights) {
              expParts.push(`- ${highlightText(h)}`);
            }
          }
        }
      }
      parts.push(expParts.join('\n'));
    }
  }

  if (!section || section === 'skills') {
    if (resume.skills && resume.skills.length > 0) {
      const skillParts = ['## Skills'];
      for (const cat of resume.skills) {
        skillParts.push(`${cat.category}: ${cat.items.join(', ')}`);
      }
      parts.push(skillParts.join('\n'));
    }
  }

  if (!section || section === 'projects') {
    if (resume.projects && resume.projects.length > 0) {
      const projParts = ['## Projects'];
      for (const p of resume.projects) {
        projParts.push(`\n### ${p.name}`);
        if (p.description) projParts.push(p.description);
        if (p.highlights && p.highlights.length > 0) {
          projParts.push('Highlights:');
          for (const h of p.highlights) {
            projParts.push(`- ${highlightText(h)}`);
          }
        }
      }
      parts.push(projParts.join('\n'));
    }
  }

  if (!section || section === 'education') {
    if (resume.education && resume.education.length > 0) {
      const eduParts = ['## Education'];
      for (const e of resume.education) {
        const line = [e.degree, e.field].filter(Boolean).join(' in ');
        eduParts.push(`${line ? `${line}, ` : ''}${e.institution}`);
        if (e.highlights && e.highlights.length > 0) {
          for (const h of e.highlights) {
            eduParts.push(`- ${highlightText(h)}`);
          }
        }
      }
      parts.push(eduParts.join('\n'));
    }
  }

  if (!section || section === 'volunteer') {
    if (resume.volunteer && resume.volunteer.length > 0) {
      const volParts = ['## Volunteer'];
      for (const v of resume.volunteer) {
        volParts.push(`${v.position ? `${v.position} at ` : ''}${v.organization}`);
        if (v.summary) volParts.push(v.summary);
        if (v.highlights && v.highlights.length > 0) {
          for (const h of v.highlights) {
            volParts.push(`- ${highlightText(h)}`);
          }
        }
      }
      parts.push(volParts.join('\n'));
    }
  }

  return parts.join('\n\n');
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert resume consultant. Your task is to analyze resume content and suggest specific, actionable improvements.

For each suggestion, identify:
- The exact current text that should be improved
- A concrete improved version
- A brief reasoning explaining why the change helps

Focus on these improvement categories:
- **action-verb**: Replace weak verbs (worked, helped, did, was responsible for) with strong action verbs (architected, delivered, led, optimized, spearheaded)
- **quantify**: Add metrics, numbers, or percentages to vague achievements (e.g., "improved performance" → "improved API response times by 60%")
- **impact**: Frame achievements in terms of business outcomes (revenue, cost savings, user growth, efficiency gains)
- **conciseness**: Remove filler words, redundancies, and unnecessary qualifiers
- **clarity**: Improve unclear or ambiguous phrasing
- **keyword**: Suggest industry-relevant keywords or terms that are missing

Guidelines:
- Only suggest changes where there is a clear improvement
- Be specific — provide the exact replacement text, not vague advice
- Keep suggestions realistic and grounded in the resume's actual content
- Limit to the most impactful suggestions (3-5 per section maximum)
- Do not fabricate achievements or metrics the person didn't mention

Respond with valid JSON matching this exact schema:
{
  "sections": [
    {
      "section": "<section-name>",
      "label": "<human-readable label>",
      "suggestions": [
        {
          "category": "<action-verb|quantify|impact|conciseness|clarity|keyword|general>",
          "current": "<exact current text>",
          "suggested": "<improved text>",
          "reasoning": "<brief explanation>"
        }
      ]
    }
  ]
}

Section names must be one of: meta, summary, experience, skills, projects, education, volunteer.
Only include sections that have suggestions. If no improvements are needed, return {"sections": []}.`;

function buildSectionGuidance(section?: string): string {
  if (!section) {
    return `Analyze all sections of the resume below and suggest improvements across all areas.`;
  }

  const guidance: Record<string, string> = {
    summary:
      'Focus on the professional summary. Look for weak positioning language, missing keywords, excessive length, and opportunities to strengthen the opening hook.',
    experience:
      'Focus on experience highlights. Look for weak action verbs, missing metrics/quantification, vague impact statements, and opportunities to frame achievements with business outcomes (STAR method).',
    skills:
      'Focus on the skills section. Look for missing industry-relevant keywords, poor categorization, and opportunities to add in-demand technologies.',
    projects:
      'Focus on project descriptions. Look for missing impact metrics, weak technical descriptions, and opportunities to highlight outcomes.',
    education:
      'Focus on education entries. Look for opportunities to emphasize relevant achievements, coursework, or honors.',
    volunteer:
      'Focus on volunteer experience. Look for weak descriptions and missing impact statements.',
    meta:
      'Focus on the professional title. Look for positioning improvements, keyword optimization, and clarity.',
  };

  return guidance[section] ?? `Focus on the "${section}" section and suggest improvements.`;
}

function buildPrompt(resumeContent: string, section?: string): LlmMessage[] {
  const userContent = `${buildSectionGuidance(section)}

---

${resumeContent}`;

  return [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userContent },
  ];
}

// ---------------------------------------------------------------------------
// Response parsing
// ---------------------------------------------------------------------------

const VALID_CATEGORIES = new Set<SuggestionCategory>([
  'action-verb',
  'quantify',
  'impact',
  'conciseness',
  'clarity',
  'keyword',
  'general',
]);

const VALID_SECTIONS = new Set([
  'meta',
  'summary',
  'experience',
  'skills',
  'projects',
  'education',
  'certifications',
  'languages',
  'awards',
  'publications',
  'volunteer',
  'references',
]);

function parseResponse(content: string): SectionSuggestions[] {
  let parsed: unknown;
  try {
    // Strip markdown code fences if present
    const cleaned = content.replace(/^```(?:json)?\s*\n?/m, '').replace(/\n?```\s*$/m, '');
    parsed = JSON.parse(cleaned);
  } catch (cause) {
    throw LlmError.invalidResponse(
      'llm',
      cause instanceof Error ? cause : new Error(String(cause)),
    );
  }

  if (!parsed || typeof parsed !== 'object' || !('sections' in parsed)) {
    throw LlmError.invalidResponse('llm', new Error('Response missing "sections" field'));
  }

  const raw = parsed as { sections: unknown[] };
  if (!Array.isArray(raw.sections)) {
    throw LlmError.invalidResponse('llm', new Error('"sections" is not an array'));
  }

  const sections: SectionSuggestions[] = [];

  for (const sec of raw.sections) {
    if (!sec || typeof sec !== 'object') continue;
    const s = sec as Record<string, unknown>;
    const section = String(s['section'] ?? '');
    const label = String(s['label'] ?? section);

    if (!VALID_SECTIONS.has(section)) continue;

    const rawSuggestions = Array.isArray(s['suggestions']) ? s['suggestions'] : [];
    const suggestions: Suggestion[] = [];

    for (const sug of rawSuggestions) {
      if (!sug || typeof sug !== 'object') continue;
      const r = sug as Record<string, unknown>;

      const category = String(r['category'] ?? 'general');
      const current = String(r['current'] ?? '');
      const suggested = String(r['suggested'] ?? '');
      const reasoning = String(r['reasoning'] ?? '');

      if (!current || !suggested) continue;

      suggestions.push({
        category: VALID_CATEGORIES.has(category as SuggestionCategory)
          ? (category as SuggestionCategory)
          : 'general',
        section: section as Suggestion['section'],
        current,
        suggested,
        reasoning,
      });
    }

    if (suggestions.length > 0) {
      sections.push({
        section: section as SectionSuggestions['section'],
        label,
        suggestions,
      });
    }
  }

  return sections;
}
