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
 * Categorized skill group
 */
export interface SkillCategory {
  category: string;
  items: string[];
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
  highlights?: string[];
}

/**
 * Work experience at a company
 */
export interface Experience {
  company: string;
  roles: Role[];
}

/**
 * Project or open source work
 */
export interface Project {
  name: string;
  url?: string;
  description?: string;
  highlights?: string[];
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
  highlights?: string[];
}

/**
 * Professional certification
 */
export interface Certification {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
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
  highlights?: string[];
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
