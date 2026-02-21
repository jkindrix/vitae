/**
 * Date formatting utilities for resume dates
 */

import type { Locale } from './i18n.js';

const MONTH_NAMES_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

function monthFull(index: number, locale?: Locale): string {
  if (locale && locale.months.full.length > index) {
    return locale.months.full[index] ?? MONTH_NAMES_FULL[index]!;
  }
  return MONTH_NAMES_FULL[index]!;
}

function monthShort(index: number, locale?: Locale): string {
  if (locale && locale.months.short.length > index) {
    return locale.months.short[index] ?? MONTH_NAMES_SHORT[index]!;
  }
  return MONTH_NAMES_SHORT[index]!;
}

function presentKeyword(locale?: Locale): string {
  if (locale && locale.keywords.present) {
    return locale.keywords.present;
  }
  return 'Present';
}

export interface ParsedDate {
  year: string;
  month: number | null;
  isPresent: boolean;
}

/**
 * Parse a date string in YYYY-MM, YYYY, or 'present' format
 */
export function parseDate(dateStr: string | undefined): ParsedDate | null {
  if (!dateStr) return null;

  if (dateStr.toLowerCase() === 'present') {
    return { year: '', month: null, isPresent: true };
  }

  const [year, monthStr] = dateStr.split('-');
  if (!year) return null;

  const month = monthStr ? parseInt(monthStr, 10) - 1 : null;
  return { year, month, isPresent: false };
}

/**
 * Format a date string (YYYY-MM or YYYY) to full month format (January 2024).
 * When a locale is provided, month names and the "Present" keyword are localized.
 */
export function formatDate(dateStr: string | undefined, locale?: Locale): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';
  if (parsed.isPresent) return presentKeyword(locale);

  if (parsed.month !== null && parsed.month >= 0 && parsed.month < 12) {
    return `${monthFull(parsed.month, locale)} ${parsed.year}`;
  }

  return parsed.year;
}

/**
 * Format a date string (YYYY-MM or YYYY) to abbreviated format (Jan 2024).
 * When a locale is provided, month names and the "Present" keyword are localized.
 */
export function formatDateShort(dateStr: string | undefined, locale?: Locale): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';
  if (parsed.isPresent) return presentKeyword(locale);

  if (parsed.month !== null && parsed.month >= 0 && parsed.month < 12) {
    return `${monthShort(parsed.month, locale)} ${parsed.year}`;
  }

  return parsed.year;
}

/**
 * Format a date range (start - end) with optional separator.
 * When a locale is provided, month names and the "Present" keyword are localized.
 */
export function formatDateRange(
  start: string | undefined,
  end: string | undefined,
  options: { short?: boolean; separator?: string; locale?: Locale } = {}
): string {
  const { short = true, separator = ' - ', locale } = options;
  const formatter = short ? formatDateShort : formatDate;

  const startFormatted = formatter(start, locale);
  const endFormatted = formatter(end, locale);

  if (!startFormatted) return '';
  if (!endFormatted) return startFormatted;

  return `${startFormatted}${separator}${endFormatted}`;
}
