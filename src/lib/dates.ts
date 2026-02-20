/**
 * Date formatting utilities for resume dates
 */

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
 * Format a date string (YYYY-MM or YYYY) to full month format (January 2024)
 */
export function formatDate(dateStr: string | undefined): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';
  if (parsed.isPresent) return 'Present';

  if (parsed.month !== null && parsed.month >= 0 && parsed.month < 12) {
    const monthName = MONTH_NAMES_FULL[parsed.month];
    return `${monthName} ${parsed.year}`;
  }

  return parsed.year;
}

/**
 * Format a date string (YYYY-MM or YYYY) to abbreviated format (Jan 2024)
 */
export function formatDateShort(dateStr: string | undefined): string {
  const parsed = parseDate(dateStr);
  if (!parsed) return '';
  if (parsed.isPresent) return 'Present';

  if (parsed.month !== null && parsed.month >= 0 && parsed.month < 12) {
    const monthAbbr = MONTH_NAMES_SHORT[parsed.month];
    return `${monthAbbr} ${parsed.year}`;
  }

  return parsed.year;
}

/**
 * Format a date range (start - end) with optional separator
 */
export function formatDateRange(
  start: string | undefined,
  end: string | undefined,
  options: { short?: boolean; separator?: string } = {}
): string {
  const { short = true, separator = ' - ' } = options;
  const formatter = short ? formatDateShort : formatDate;

  const startFormatted = formatter(start);
  const endFormatted = formatter(end);

  if (!startFormatted) return '';
  if (!endFormatted) return startFormatted;

  return `${startFormatted}${separator}${endFormatted}`;
}
