import { describe, it, expect } from 'vitest';
import { getLocale, getSectionLabel } from '../src/lib/i18n.js';

describe('i18n', () => {
  describe('getLocale', () => {
    it('returns empty locale for undefined (no language set)', () => {
      const locale = getLocale(undefined);
      expect(locale.code).toBe('');
      expect(locale.months.full).toHaveLength(0);
      expect(locale.keywords.present).toBe('');
    });

    it('returns English locale for "en"', () => {
      const locale = getLocale('en');
      expect(locale.code).toBe('en');
      expect(locale.labels.summary).toBe('Summary');
      expect(locale.labels.experience).toBe('Experience');
      expect(locale.months.full[0]).toBe('January');
      expect(locale.months.short[0]).toBe('Jan');
      expect(locale.keywords.present).toBe('Present');
    });

    it('returns French locale for "fr"', () => {
      const locale = getLocale('fr');
      expect(locale.code).toBe('fr');
      expect(locale.labels.summary).toBe('Profil');
      expect(locale.labels.experience).toBe('Expérience Professionnelle');
      expect(locale.labels.education).toBe('Formation');
      expect(locale.months.full[0]).toBe('janvier');
      expect(locale.months.short[0]).toBe('janv.');
      expect(locale.keywords.present).toBe('Présent');
    });

    it('returns Spanish locale for "es"', () => {
      const locale = getLocale('es');
      expect(locale.code).toBe('es');
      expect(locale.labels.skills).toBe('Habilidades');
      expect(locale.months.full[0]).toBe('enero');
      expect(locale.keywords.present).toBe('Presente');
    });

    it('returns German locale for "de"', () => {
      const locale = getLocale('de');
      expect(locale.code).toBe('de');
      expect(locale.labels.experience).toBe('Berufserfahrung');
      expect(locale.months.full[2]).toBe('März');
      expect(locale.keywords.present).toBe('Heute');
    });

    it('returns Portuguese locale for "pt"', () => {
      const locale = getLocale('pt');
      expect(locale.code).toBe('pt');
      expect(locale.labels.education).toBe('Formação');
      expect(locale.months.full[0]).toBe('janeiro');
      expect(locale.keywords.present).toBe('Presente');
    });

    it('extracts base language from regional code', () => {
      const locale = getLocale('fr-FR');
      expect(locale.code).toBe('fr');
      expect(locale.labels.summary).toBe('Profil');
    });

    it('falls back to English for unsupported language', () => {
      const locale = getLocale('zz');
      expect(locale.code).toBe('en');
      expect(locale.labels.summary).toBe('Summary');
    });

    it('returns all 13 section labels', () => {
      const locale = getLocale('en');
      const expectedLabels = [
        'summary', 'skills', 'experience', 'projects', 'education',
        'certifications', 'languages', 'awards', 'publications',
        'volunteer', 'references', 'contact', 'profile',
      ];
      for (const label of expectedLabels) {
        expect(locale.labels).toHaveProperty(label);
      }
    });

    it('returns 12 full month names', () => {
      const locale = getLocale('en');
      expect(locale.months.full).toHaveLength(12);
      expect(locale.months.short).toHaveLength(12);
    });
  });

  describe('getSectionLabel', () => {
    it('returns label for known section', () => {
      const locale = getLocale('fr');
      expect(getSectionLabel(locale, 'experience')).toBe('Expérience Professionnelle');
      expect(getSectionLabel(locale, 'education')).toBe('Formation');
    });

    it('returns undefined for unknown section', () => {
      const locale = getLocale('en');
      expect(getSectionLabel(locale, 'nonexistent')).toBeUndefined();
    });

    it('returns undefined for empty locale', () => {
      const locale = getLocale(undefined);
      expect(getSectionLabel(locale, 'summary')).toBeUndefined();
    });
  });
});
