/**
 * Types for the ATS (Applicant Tracking System) compatibility analyzer.
 */

/** Severity of an ATS finding */
export type AtsSeverity = 'error' | 'warning' | 'suggestion';

/** Scoring category identifiers */
export type AtsCategory =
  | 'contact'
  | 'sections'
  | 'experience'
  | 'content'
  | 'dates'
  | 'structure';

/** A single finding from ATS analysis */
export interface AtsFinding {
  category: AtsCategory;
  severity: AtsSeverity;
  message: string;
}

/** Score breakdown for a single category */
export interface AtsCategoryScore {
  category: AtsCategory;
  label: string;
  score: number;
  weight: number;
  findings: AtsFinding[];
}

/** A detected gap between roles */
export interface AtsDateGap {
  from: string;
  to: string;
  months: number;
  fromRole: string;
  toRole: string;
}

/** Keyword match result for a single keyword */
export interface AtsKeywordMatch {
  keyword: string;
  found: boolean;
  foundIn: string[];
}

/** Keyword analysis results (when --job is provided) */
export interface AtsKeywordAnalysis {
  totalKeywords: number;
  matchedCount: number;
  matchPercentage: number;
  keywords: AtsKeywordMatch[];
}

/** Options for the analyzeResume function */
export interface AtsAnalyzeOptions {
  jobDescription?: string;
}

/** Complete ATS analysis result */
export interface AtsResult {
  score: number;
  categories: AtsCategoryScore[];
  findings: AtsFinding[];
  gaps: AtsDateGap[];
  keywords?: AtsKeywordAnalysis;
}
