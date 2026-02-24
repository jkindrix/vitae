import type { NormalizedResume } from './resume.js';

// ---------------------------------------------------------------------------
// Theme plugin configuration types
// ---------------------------------------------------------------------------

/**
 * Metadata displayed by `vitae themes`
 */
export interface ThemeMetadata {
  description?: string;
  author?: string;
  version?: string;
  license?: string;
  tags?: string[];
  homepage?: string;
}

/**
 * A layout variant offered by a theme
 */
export interface ThemeLayoutVariant {
  name: string;
  description?: string;
  /** Template filename relative to theme directory, e.g. "template-compact.html" */
  template: string;
  /** Optional cover letter variant template filename */
  coverLetterTemplate?: string;
}

/**
 * A custom Nunjucks filter definition
 */
export interface ThemeFilter {
  name: string;
  filter: (...args: unknown[]) => unknown;
}

/**
 * Theme configuration exported from theme.config.js
 */
export interface ThemeConfig {
  /** Theme metadata for display and discovery */
  metadata?: ThemeMetadata;
  /** Custom Nunjucks filters available in templates */
  filters?: ThemeFilter[];
  /** Static globals available in all templates */
  globals?: Record<string, unknown>;
  /** Function that receives the resume and returns computed template context */
  helpers?: (resume: NormalizedResume) => Record<string, unknown>;
  /** Named layout alternatives for the theme */
  variants?: ThemeLayoutVariant[];
}
