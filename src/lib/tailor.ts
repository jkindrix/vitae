import yaml from 'yaml';
import { extractKeywords, buildResumeTextBlocks, textContainsKeyword } from './ats.js';
import type { Resume, Variant, SectionName } from '../types/resume.js';
import type { AtsKeywordMatch } from '../types/ats.js';
import type {
  TailorAnalysis,
  SectionRelevance,
  SkillCategoryRelevance,
  SummaryRecommendation,
} from '../types/tailor.js';

// ---------------------------------------------------------------------------
// Text block key → SectionName mapping
// ---------------------------------------------------------------------------

/** Maps buildResumeTextBlocks keys to SectionName values (excludes 'meta') */
const BLOCK_TO_SECTION: Record<string, SectionName> = {
  summary: 'summary',
  skills: 'skills',
  experience: 'experience',
  projects: 'projects',
  education: 'education',
  certifications: 'certifications',
};

// ---------------------------------------------------------------------------
// Core analysis
// ---------------------------------------------------------------------------

/**
 * Analyze a resume against a job description and produce tailoring data.
 */
export function analyzeTailoring(resume: Resume, jobDescription: string): TailorAnalysis {
  const keywords = extractKeywords(jobDescription);
  const blocks = buildResumeTextBlocks(resume);

  // Match each keyword against resume sections
  const keywordMatches: AtsKeywordMatch[] = keywords.map((keyword) => {
    const foundIn: string[] = [];
    for (const [section, text] of Object.entries(blocks)) {
      if (textContainsKeyword(text, keyword)) {
        foundIn.push(section);
      }
    }
    return { keyword, found: foundIn.length > 0, foundIn };
  });

  const matched = keywordMatches.filter((k) => k.found);
  const missing = keywordMatches.filter((k) => !k.found);
  const matchPercentage =
    keywords.length > 0 ? Math.round((matched.length / keywords.length) * 100) : 100;

  // Section relevance — count keyword matches per section
  const sectionRelevance = buildSectionRelevance(keywordMatches, blocks, resume);

  // Skill category relevance
  const skillRelevance = buildSkillRelevance(resume, keywords);

  // Summary recommendations
  const summaryRecommendation = buildSummaryRecommendation(blocks, keywords);

  // Recommended section order: summary first, then by match count descending
  const recommendedSectionOrder = buildRecommendedSectionOrder(sectionRelevance);

  // Recommended skill order: by match count descending
  const recommendedSkillOrder = skillRelevance.map((s) => s.category);

  return {
    matchPercentage,
    keywords: keywordMatches,
    sectionRelevance,
    skillRelevance,
    summaryRecommendation,
    recommendedSectionOrder,
    recommendedSkillOrder,
    missingKeywords: missing.map((k) => k.keyword),
    matchedKeywords: matched.map((k) => k.keyword),
  };
}

// ---------------------------------------------------------------------------
// Section relevance
// ---------------------------------------------------------------------------

function buildSectionRelevance(
  keywordMatches: AtsKeywordMatch[],
  blocks: Record<string, string>,
  resume: Resume
): SectionRelevance[] {
  const relevance: SectionRelevance[] = [];

  for (const [blockKey, sectionName] of Object.entries(BLOCK_TO_SECTION)) {
    if (!blocks[blockKey]) continue;

    const matchedKeywords = keywordMatches
      .filter((k) => k.foundIn.includes(blockKey))
      .map((k) => k.keyword);

    relevance.push({
      section: sectionName,
      matchedKeywords,
      matchCount: matchedKeywords.length,
    });
  }

  // Include sections that have content but no text block (languages, awards, etc.)
  const additionalSections: { section: SectionName; field: keyof Resume }[] = [
    { section: 'languages', field: 'languages' },
    { section: 'awards', field: 'awards' },
    { section: 'publications', field: 'publications' },
    { section: 'volunteer', field: 'volunteer' },
    { section: 'references', field: 'references' },
  ];

  for (const { section, field } of additionalSections) {
    const value = resume[field];
    if (value && Array.isArray(value) && value.length > 0) {
      // Build a simple text block for keyword matching
      const text = JSON.stringify(value).toLowerCase();
      const matchedKeywords = keywordMatches
        .filter((k) => textContainsKeyword(text, k.keyword))
        .map((k) => k.keyword);

      relevance.push({
        section,
        matchedKeywords,
        matchCount: matchedKeywords.length,
      });
    }
  }

  // Sort by match count descending
  relevance.sort((a, b) => b.matchCount - a.matchCount);

  return relevance;
}

// ---------------------------------------------------------------------------
// Skill category relevance
// ---------------------------------------------------------------------------

function buildSkillRelevance(
  resume: Resume,
  keywords: string[]
): SkillCategoryRelevance[] {
  if (!resume.skills || resume.skills.length === 0) return [];

  const relevance: SkillCategoryRelevance[] = resume.skills.map((category) => {
    const text = [category.category, ...category.items].join(' ');
    const matchedKeywords = keywords.filter((kw) => textContainsKeyword(text, kw));

    return {
      category: category.category,
      matchedKeywords,
      matchCount: matchedKeywords.length,
    };
  });

  // Sort by match count descending
  relevance.sort((a, b) => b.matchCount - a.matchCount);

  return relevance;
}

// ---------------------------------------------------------------------------
// Summary recommendations
// ---------------------------------------------------------------------------

function buildSummaryRecommendation(
  blocks: Record<string, string>,
  keywords: string[]
): SummaryRecommendation {
  const summaryText = blocks['summary'] ?? '';
  // Focus on the top 20 most frequent keywords
  const topKeywords = keywords.slice(0, 20);

  const presentKeywords = topKeywords.filter(
    (kw) => summaryText && textContainsKeyword(summaryText, kw)
  );
  const missingKeywords = topKeywords.filter(
    (kw) => !summaryText || !textContainsKeyword(summaryText, kw)
  );

  return { missingKeywords, presentKeywords };
}

// ---------------------------------------------------------------------------
// Recommended section order
// ---------------------------------------------------------------------------

function buildRecommendedSectionOrder(
  sectionRelevance: SectionRelevance[]
): SectionName[] {
  // Summary always first (it's the introduction and where missing keywords go)
  const order: SectionName[] = [];
  const hasSummary = sectionRelevance.some((s) => s.section === 'summary');

  if (hasSummary) {
    order.push('summary');
  }

  // Remaining sections sorted by match count (already sorted in sectionRelevance)
  for (const sr of sectionRelevance) {
    if (sr.section !== 'summary') {
      order.push(sr.section);
    }
  }

  return order;
}

// ---------------------------------------------------------------------------
// Variant generation
// ---------------------------------------------------------------------------

/**
 * Generate a variant YAML object from tailoring analysis.
 */
export function generateVariant(analysis: TailorAnalysis): Variant {
  const variant: Variant = {};

  // Section order based on relevance
  if (analysis.recommendedSectionOrder.length > 0) {
    variant.section_order = analysis.recommendedSectionOrder;
  }

  // Skill category ordering (only if there are skills)
  if (analysis.recommendedSkillOrder.length > 0) {
    variant.skills = { include: analysis.recommendedSkillOrder };
  }

  return variant;
}

// ---------------------------------------------------------------------------
// YAML serialization with comments
// ---------------------------------------------------------------------------

/**
 * Serialize a variant to YAML with explanatory comments.
 */
export function serializeVariantWithComments(
  variant: Variant,
  analysis: TailorAnalysis,
  jobFile: string
): string {
  const doc = new yaml.Document(variant);

  // Build header comment
  const headerLines: string[] = [
    ` Tailored variant for: ${jobFile}`,
    ` Generated by: vitae tailor`,
    ` Keyword match: ${analysis.matchPercentage}% (${analysis.matchedKeywords.length}/${analysis.keywords.length})`,
  ];

  if (analysis.missingKeywords.length > 0) {
    headerLines.push('');
    headerLines.push(` Missing keywords to address manually:`);
    const displayed = analysis.missingKeywords.slice(0, 15);
    headerLines.push(`   ${displayed.join(', ')}`);
    if (analysis.missingKeywords.length > 15) {
      headerLines.push(`   ... and ${analysis.missingKeywords.length - 15} more`);
    }
  }

  if (analysis.summaryRecommendation.missingKeywords.length > 0) {
    headerLines.push('');
    headerLines.push(` Recommendation: Update your summary to incorporate:`);
    const topMissing = analysis.summaryRecommendation.missingKeywords.slice(0, 10);
    headerLines.push(`   ${topMissing.join(', ')}`);
  }

  doc.commentBefore = headerLines.join('\n');

  // Add inline comments to section_order entries
  if (doc.contents && yaml.isMap(doc.contents)) {
    const sectionOrderNode = doc.contents.items.find(
      (item) => yaml.isScalar(item.key) && item.key.value === 'section_order'
    );

    if (sectionOrderNode && yaml.isSeq(sectionOrderNode.value)) {
      for (const item of sectionOrderNode.value.items) {
        if (yaml.isScalar(item)) {
          const sr = analysis.sectionRelevance.find((s) => s.section === item.value);
          if (sr && sr.matchCount > 0) {
            item.comment = ` ${sr.matchCount} keyword ${sr.matchCount === 1 ? 'match' : 'matches'}`;
          }
        }
      }
    }

    // Add inline comments to skills.include entries
    const skillsNode = doc.contents.items.find(
      (item) => yaml.isScalar(item.key) && item.key.value === 'skills'
    );

    if (skillsNode && yaml.isMap(skillsNode.value)) {
      const includeNode = skillsNode.value.items.find(
        (item) => yaml.isScalar(item.key) && item.key.value === 'include'
      );

      if (includeNode && yaml.isSeq(includeNode.value)) {
        for (const item of includeNode.value.items) {
          if (yaml.isScalar(item)) {
            const sr = analysis.skillRelevance.find((s) => s.category === item.value);
            if (sr && sr.matchCount > 0) {
              item.comment = ` ${sr.matchCount} keyword ${sr.matchCount === 1 ? 'match' : 'matches'}`;
            }
          }
        }
      }
    }
  }

  return doc.toString();
}
