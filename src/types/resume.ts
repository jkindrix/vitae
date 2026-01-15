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
