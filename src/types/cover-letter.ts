import type { Meta, ThemeOverrides } from './resume.js';

/**
 * Cover letter recipient information
 */
export interface Recipient {
  name?: string;
  title?: string;
  company?: string;
  address?: string;
}

/**
 * Cover letter data structure
 */
export interface CoverLetter {
  type?: 'cover-letter';
  meta: Meta;
  recipient: Recipient;
  date?: string;
  subject?: string;
  greeting: string;
  body: string[];
  closing: string;
  theme?: ThemeOverrides;
}
