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
  category: string;
  items: string[];
  tags?: string[];
}

/**
 * A role held at a company
 */
export interface Role {
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
  company: string;
  roles: Role[];
  tags?: string[];
}

/**
 * Project or open source work
 */
export interface Project {
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

/**
 * Complete resume data structure
 */
export interface Resume {
  meta: Meta;
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
 * Variant file — filters and overrides applied to a base resume
 */
export interface Variant {
  include_tags?: string[];
  exclude_tags?: string[];
  meta?: Partial<Meta>;
  summary?: string;
  section_order?: SectionName[];
  skills?: {
    include?: string[];
    exclude?: string[];
  };
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
export type OutputFormat = 'pdf' | 'docx' | 'html' | 'json';

/**
 * Theme configuration
 */
export interface Theme {
  name: string;
  path: string;
  hasTemplate: boolean;
  hasStyles: boolean;
  hasDocxReference: boolean;
}
