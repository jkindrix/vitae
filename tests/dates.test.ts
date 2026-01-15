import { describe, it, expect } from 'vitest';
import { formatDate, formatDateShort, formatDateRange } from '../src/lib/dates.js';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats YYYY-MM to full month name', () => {
      expect(formatDate('2024-01')).toBe('January 2024');
      expect(formatDate('2024-06')).toBe('June 2024');
      expect(formatDate('2024-12')).toBe('December 2024');
    });

    it('returns year only for YYYY format', () => {
      expect(formatDate('2024')).toBe('2024');
      expect(formatDate('2020')).toBe('2020');
    });

    it('handles "present" case-insensitively', () => {
      expect(formatDate('present')).toBe('Present');
      expect(formatDate('Present')).toBe('Present');
      expect(formatDate('PRESENT')).toBe('Present');
    });

    it('returns empty string for undefined/empty', () => {
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
    });

    it('handles edge cases for invalid months', () => {
      expect(formatDate('2024-00')).toBe('2024');
      expect(formatDate('2024-13')).toBe('2024');
    });
  });

  describe('formatDateShort', () => {
    it('formats YYYY-MM to abbreviated month', () => {
      expect(formatDateShort('2024-01')).toBe('Jan 2024');
      expect(formatDateShort('2024-06')).toBe('Jun 2024');
      expect(formatDateShort('2024-12')).toBe('Dec 2024');
    });

    it('returns year only for YYYY format', () => {
      expect(formatDateShort('2024')).toBe('2024');
    });

    it('handles "present" case-insensitively', () => {
      expect(formatDateShort('present')).toBe('Present');
      expect(formatDateShort('Present')).toBe('Present');
    });

    it('returns empty string for undefined/empty', () => {
      expect(formatDateShort(undefined)).toBe('');
      expect(formatDateShort('')).toBe('');
    });
  });

  describe('formatDateRange', () => {
    it('formats date range with default separator', () => {
      expect(formatDateRange('2020-01', '2024-06')).toBe('Jan 2020 - Jun 2024');
    });

    it('formats date range with custom separator', () => {
      expect(formatDateRange('2020-01', '2024-06', { separator: ' to ' })).toBe(
        'Jan 2020 to Jun 2024'
      );
    });

    it('uses full month names when short=false', () => {
      expect(formatDateRange('2020-01', '2024-06', { short: false })).toBe(
        'January 2020 - June 2024'
      );
    });

    it('handles present end date', () => {
      expect(formatDateRange('2020-01', 'present')).toBe('Jan 2020 - Present');
    });

    it('returns start only when no end date', () => {
      expect(formatDateRange('2020-01', undefined)).toBe('Jan 2020');
    });

    it('returns empty string when no start date', () => {
      expect(formatDateRange(undefined, '2024-06')).toBe('');
    });

    it('handles year-only dates', () => {
      expect(formatDateRange('2020', '2024')).toBe('2020 - 2024');
    });
  });
});
