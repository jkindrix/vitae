/**
 * Shared DOCX styling infrastructure — used by both resume and cover letter
 * DOCX generation. Isolates font, color, spacing, and paragraph helper
 * concerns from section-specific rendering logic.
 */

import { Paragraph, TextRun, BorderStyle } from 'docx';
import { getSectionLabel } from './i18n.js';
import type { Locale } from './i18n.js';
import type { SectionName, ThemeOverrides } from '../types/index.js';

// ---------------------------------------------------------------------------
// Style definitions
// ---------------------------------------------------------------------------

export interface DocxStyles {
  accentColor: string; // hex without #, e.g. "1B4F72"
  textColor: string;
  fontFamily: string;
  fontSize: number; // half-points (22 = 11pt)
  headingSize: number; // half-points (28 = 14pt)
  nameSize: number; // half-points (44 = 22pt)
}

export const DEFAULT_STYLES: DocxStyles = {
  accentColor: '1B4F72',
  textColor: '333333',
  fontFamily: 'Calibri',
  fontSize: 22,
  headingSize: 28,
  nameSize: 44,
};

function stripHash(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

export function resolveStyles(theme?: ThemeOverrides): DocxStyles {
  if (!theme) return { ...DEFAULT_STYLES };
  return {
    accentColor: theme.colors?.accent ? stripHash(theme.colors.accent) : DEFAULT_STYLES.accentColor,
    textColor: theme.colors?.text ? stripHash(theme.colors.text) : DEFAULT_STYLES.textColor,
    fontFamily: theme.fonts?.sans ?? DEFAULT_STYLES.fontFamily,
    fontSize: DEFAULT_STYLES.fontSize,
    headingSize: DEFAULT_STYLES.headingSize,
    nameSize: DEFAULT_STYLES.nameSize,
  };
}

// ---------------------------------------------------------------------------
// Paragraph helpers
// ---------------------------------------------------------------------------

export function docxSectionHeading(text: string, styles: DocxStyles): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: styles.headingSize,
        color: styles.accentColor,
        font: styles.fontFamily,
      }),
    ],
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: styles.accentColor,
      },
    },
  });
}

export function textRun(
  text: string,
  styles: DocxStyles,
  overrides?: { bold?: boolean; italics?: boolean; color?: string; size?: number }
): TextRun {
  const opts: {
    text: string;
    font: string;
    size: number;
    color: string;
    bold?: boolean;
    italics?: boolean;
  } = {
    text,
    font: styles.fontFamily,
    size: overrides?.size ?? styles.fontSize,
    color: overrides?.color ?? styles.textColor,
  };
  if (overrides?.bold !== undefined) opts.bold = overrides.bold;
  if (overrides?.italics !== undefined) opts.italics = overrides.italics;
  return new TextRun(opts);
}

export function emptyParagraph(): Paragraph {
  return new Paragraph({ text: '' });
}

// ---------------------------------------------------------------------------
// Locale helpers
// ---------------------------------------------------------------------------

export function localeHeading(locale: Locale, section: SectionName, fallback: string): string {
  return getSectionLabel(locale, section) ?? fallback;
}

export function localePresentKeyword(locale: Locale): string {
  return locale.keywords.present || 'Present';
}
