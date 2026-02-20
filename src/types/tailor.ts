import type { SectionName } from './resume.js';
import type { AtsKeywordMatch } from './ats.js';

/**
 * Per-section relevance to a job description
 */
export interface SectionRelevance {
  section: SectionName;
  matchedKeywords: string[];
  matchCount: number;
}

/**
 * Per-skill-category relevance to a job description
 */
export interface SkillCategoryRelevance {
  category: string;
  matchedKeywords: string[];
  matchCount: number;
}

/**
 * Keywords that should be worked into the professional summary
 */
export interface SummaryRecommendation {
  missingKeywords: string[];
  presentKeywords: string[];
}

/**
 * Complete tailoring analysis result
 */
export interface TailorAnalysis {
  /** Overall keyword match percentage */
  matchPercentage: number;

  /** All keyword match data */
  keywords: AtsKeywordMatch[];

  /** Sections ordered by relevance to job description */
  sectionRelevance: SectionRelevance[];

  /** Skill categories ordered by relevance */
  skillRelevance: SkillCategoryRelevance[];

  /** Recommendation for summary improvement */
  summaryRecommendation: SummaryRecommendation;

  /** Recommended section order (most relevant first) */
  recommendedSectionOrder: SectionName[];

  /** Recommended skill category order (most relevant first) */
  recommendedSkillOrder: string[];

  /** Keywords found nowhere in the resume */
  missingKeywords: string[];

  /** Keywords found in the resume */
  matchedKeywords: string[];
}
