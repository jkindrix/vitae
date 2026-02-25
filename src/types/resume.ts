/**
 * Link to a professional profile or website
 */
export interface Link {
  label?: string;
  url: string;
}

/**
 * Personal and contact information
 */
export interface Meta {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  location?: string;
  links?: Link[];
}

/**
 * A highlight with optional tags for variant filtering
 */
export interface TaggedHighlight {
  text: string;
  tags?: string[];
}

/**
 * A highlight can be a plain string or a tagged object
 */
export type Highlight = string | TaggedHighlight;

/**
 * Categorized skill group
 */
export interface SkillCategory {
  id?: string;
  category: string;
  items: string[];
  tags?: string[];
}

/**
 * A role held at a company
 */
export interface Role {
  id?: string;
  title: string;
  start: string;
  end?: string;
  location?: string;
  summary?: string;
  highlights?: Highlight[];
  tags?: string[];
}

/**
 * Work experience at a company
 */
export interface Experience {
  id?: string;
  company: string;
  roles: Role[];
  tags?: string[];
}

/**
 * Project or open source work
 */
export interface Project {
  id?: string;
  name: string;
  url?: string;
  description?: string;
  highlights?: Highlight[];
  tags?: string[];
}

/**
 * Educational background
 */
export interface Education {
  id?: string;
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  highlights?: Highlight[];
  tags?: string[];
}

/**
 * Professional certification
 */
export interface Certification {
  id?: string;
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
  tags?: string[];
}

/**
 * Language proficiency
 */
export interface Language {
  language: string;
  fluency?: string;
}

/**
 * Award or honor
 */
export interface Award {
  title: string;
  awarder?: string;
  date?: string;
  summary?: string;
}

/**
 * Academic or professional publication
 */
export interface Publication {
  name: string;
  publisher?: string;
  releaseDate?: string;
  url?: string;
  summary?: string;
}

/**
 * Volunteer experience
 */
export interface Volunteer {
  id?: string;
  organization: string;
  position?: string;
  start?: string;
  end?: string;
  summary?: string;
  highlights?: Highlight[];
  tags?: string[];
}

/**
 * Professional reference
 */
export interface Reference {
  name: string;
  reference?: string;
}

// ---------------------------------------------------------------------------
// Theme override types
// ---------------------------------------------------------------------------

export interface ThemeColors {
  accent?: string;
  text?: string;
  textSecondary?: string;
  textMuted?: string;
  background?: string;
  border?: string;
}

export interface ThemeFonts {
  sans?: string;
  serif?: string;
}

export interface ThemeOverrides {
  colors?: ThemeColors;
  fonts?: ThemeFonts;
}

/**
 * Complete resume data structure
 */
export interface Resume {
  meta: Meta;
  language?: string;
  summary?: string;
  skills?: SkillCategory[];
  experience: Experience[];
  projects?: Project[];
  education?: Education[];
  certifications?: Certification[];
  languages?: Language[];
  awards?: Award[];
  publications?: Publication[];
  volunteer?: Volunteer[];
  references?: Reference[];
  theme?: ThemeOverrides;
}

// ---------------------------------------------------------------------------
// Variant types
// ---------------------------------------------------------------------------

/**
 * Valid section names for section ordering
 */
export type SectionName =
  | 'summary'
  | 'skills'
  | 'experience'
  | 'projects'
  | 'education'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'publications'
  | 'volunteer'
  | 'references';

/**
 * Advanced tag matching with AND/NOT operators.
 * Simple form (string[]) is OR: match if item has ANY of the listed tags.
 */
export interface TagExpr {
  any?: string[];
  all?: string[];
  not?: string[];
}

/**
 * Filters individual bullet points within an item.
 */
export interface HighlightSelector {
  tags?: string[] | TagExpr;
  limit?: number;
}

/**
 * Base selector used by most sections.
 */
export interface SectionSelector {
  pick?: string[];
  tags?: string[] | TagExpr;
  omit?: string[];
  limit?: number;
  highlights?: HighlightSelector;
}

/**
 * Extended selector for the experience section's 3-level hierarchy.
 * SectionSelector fields (pick, tags, omit, limit) apply to companies.
 */
export interface ExperienceSelector extends Omit<SectionSelector, 'highlights'> {
  roles?: {
    pick?: string[];
    tags?: string[] | TagExpr;
    omit?: string[];
    limit?: number;
  };
  highlights?: HighlightSelector;
}

/**
 * Variant file v2 — per-section selection with composition support
 */
export interface Variant {
  extends?: string;
  meta?: Partial<Meta>;
  summary?: string;
  layout?: SectionName[];
  tags?: string[] | TagExpr;
  style?: Record<string, string>;
  skills?: SectionSelector;
  experience?: ExperienceSelector;
  projects?: SectionSelector;
  education?: SectionSelector;
  certifications?: SectionSelector;
  languages?: SectionSelector;
  awards?: SectionSelector;
  publications?: SectionSelector;
  volunteer?: SectionSelector;
  references?: SectionSelector;
}

// ---------------------------------------------------------------------------
// Normalized types — output of normalization, input to all renderers
// ---------------------------------------------------------------------------

/**
 * Role with highlights guaranteed to be string[]
 */
export interface NormalizedRole {
  title: string;
  start: string;
  end?: string;
  location?: string;
  summary?: string;
  highlights?: string[];
}

/**
 * Experience with normalized roles
 */
export interface NormalizedExperience {
  company: string;
  roles: NormalizedRole[];
}

/**
 * Project with highlights guaranteed to be string[]
 */
export interface NormalizedProject {
  name: string;
  url?: string;
  description?: string;
  highlights?: string[];
}

/**
 * Education with highlights guaranteed to be string[]
 */
export interface NormalizedEducation {
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  highlights?: string[];
}

/**
 * Volunteer with highlights guaranteed to be string[]
 */
export interface NormalizedVolunteer {
  organization: string;
  position?: string;
  start?: string;
  end?: string;
  summary?: string;
  highlights?: string[];
}

/**
 * Fully normalized resume — all highlights are string[], sections are ordered
 */
export interface NormalizedResume {
  meta: Meta;
  language?: string;
  summary?: string;
  skills?: SkillCategory[];
  experience: NormalizedExperience[];
  projects?: NormalizedProject[];
  education?: NormalizedEducation[];
  certifications?: Certification[];
  languages?: Language[];
  awards?: Award[];
  publications?: Publication[];
  volunteer?: NormalizedVolunteer[];
  references?: Reference[];
  sections: SectionName[];
  theme?: ThemeOverrides;
}

// ---------------------------------------------------------------------------
// Build and output types
// ---------------------------------------------------------------------------

/**
 * Build output configuration
 */
export interface BuildOptions {
  input: string;
  output: string;
  theme: string;
  formats: OutputFormat[];
}

/**
 * Supported output formats
 */
export type OutputFormat = 'pdf' | 'docx' | 'html' | 'json' | 'md' | 'png';

/**
 * Theme configuration
 */
export interface Theme {
  name: string;
  path: string;
  hasTemplate: boolean;
  hasStyles: boolean;
  hasDocxReference: boolean;
  hasCoverLetterTemplate: boolean;
  hasConfig: boolean;
}
