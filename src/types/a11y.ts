/**
 * Types for the Accessibility (WCAG) auditor.
 */

/** Severity of an accessibility finding */
export type A11ySeverity = 'error' | 'warning' | 'suggestion';

/** Accessibility audit category identifiers */
export type A11yCategory =
  | 'document-structure'
  | 'color-contrast'
  | 'links-navigation'
  | 'semantic-html'
  | 'typography-readability'
  | 'images-media';

/** A single finding from accessibility analysis */
export interface A11yFinding {
  category: A11yCategory;
  severity: A11ySeverity;
  message: string;
}

/** Score breakdown for a single category */
export interface A11yCategoryScore {
  category: A11yCategory;
  label: string;
  score: number;
  weight: number;
  findings: A11yFinding[];
}

/** A specific color contrast pair result */
export interface A11yContrastPair {
  foreground: string;
  background: string;
  ratio: number;
  required: number;
  element: string;
  passes: boolean;
}

/** Options for the auditAccessibility function */
export interface A11yAuditOptions {
  /** WCAG conformance level: 'AA' (default) or 'AAA' */
  level?: 'AA' | 'AAA';
}

/** Complete accessibility audit result */
export interface A11yResult {
  score: number;
  categories: A11yCategoryScore[];
  findings: A11yFinding[];
  contrastPairs: A11yContrastPair[];
}
