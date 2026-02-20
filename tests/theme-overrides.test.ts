import { describe, it, expect } from 'vitest';
import { generateThemeOverrideCss, renderStandaloneHtml } from '../src/lib/renderer.js';
import { normalizeResume } from '../src/lib/normalize.js';
import type { Resume, ThemeOverrides } from '../src/types/index.js';

describe('theme overrides', () => {
  describe('generateThemeOverrideCss', () => {
    it('generates empty string for empty overrides', () => {
      expect(generateThemeOverrideCss({})).toBe('');
    });

    it('generates CSS for accent color', () => {
      const css = generateThemeOverrideCss({
        colors: { accent: '#e63946' },
      });
      expect(css).toContain(':root');
      expect(css).toContain('--color-accent: #e63946');
    });

    it('generates CSS for multiple colors', () => {
      const css = generateThemeOverrideCss({
        colors: {
          accent: '#e63946',
          text: '#222222',
          background: '#f8f8f8',
        },
      });
      expect(css).toContain('--color-accent: #e63946');
      expect(css).toContain('--color-text: #222222');
      expect(css).toContain('--color-background: #f8f8f8');
    });

    it('generates CSS for font overrides', () => {
      const css = generateThemeOverrideCss({
        fonts: { sans: 'Inter, sans-serif' },
      });
      expect(css).toContain('--font-sans: Inter, sans-serif');
    });

    it('generates CSS for serif font', () => {
      const css = generateThemeOverrideCss({
        fonts: { serif: 'Merriweather, serif' },
      });
      expect(css).toContain('--font-serif: Merriweather, serif');
    });

    it('combines colors and fonts', () => {
      const css = generateThemeOverrideCss({
        colors: { accent: '#ff0000' },
        fonts: { sans: 'Roboto, sans-serif' },
      });
      expect(css).toContain('--color-accent: #ff0000');
      expect(css).toContain('--font-sans: Roboto, sans-serif');
    });

    it('maps textSecondary to --color-text-secondary', () => {
      const css = generateThemeOverrideCss({
        colors: { textSecondary: '#666' },
      });
      expect(css).toContain('--color-text-secondary: #666');
    });

    it('maps textMuted to --color-text-muted', () => {
      const css = generateThemeOverrideCss({
        colors: { textMuted: '#999' },
      });
      expect(css).toContain('--color-text-muted: #999');
    });

    it('maps border to --color-border', () => {
      const css = generateThemeOverrideCss({
        colors: { border: '#ddd' },
      });
      expect(css).toContain('--color-border: #ddd');
    });

    it('skips undefined color values', () => {
      const css = generateThemeOverrideCss({
        colors: { accent: '#ff0000' },
      });
      expect(css).not.toContain('--color-text:');
      expect(css).not.toContain('--color-background:');
    });

    it('skips empty colors object', () => {
      const css = generateThemeOverrideCss({ colors: {} });
      expect(css).toBe('');
    });

    it('skips empty fonts object', () => {
      const css = generateThemeOverrideCss({ fonts: {} });
      expect(css).toBe('');
    });
  });

  describe('normalization pass-through', () => {
    it('preserves theme overrides through normalization', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        theme: {
          colors: { accent: '#e63946' },
          fonts: { sans: 'Inter, sans-serif' },
        },
      };
      const normalized = normalizeResume(resume);
      expect(normalized.theme).toBeDefined();
      expect(normalized.theme?.colors?.accent).toBe('#e63946');
      expect(normalized.theme?.fonts?.sans).toBe('Inter, sans-serif');
    });

    it('handles resume without theme overrides', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const normalized = normalizeResume(resume);
      expect(normalized.theme).toBeUndefined();
    });
  });

  describe('HTML rendering integration', () => {
    it('injects theme override CSS into standalone HTML', async () => {
      const resume: Resume = {
        meta: { name: 'Override Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        theme: {
          colors: { accent: '#e63946' },
        },
      };
      const normalized = normalizeResume(resume);
      const html = await renderStandaloneHtml(normalized, 'minimal');

      expect(html).toContain('--color-accent: #e63946');
    });

    it('does not inject override CSS when no theme overrides', async () => {
      const resume: Resume = {
        meta: { name: 'No Override' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const normalized = normalizeResume(resume);
      const html = await renderStandaloneHtml(normalized, 'minimal');

      // Should have theme CSS but not override CSS
      expect(html).toContain('--color-accent:');
      // Count <style> tags — should be exactly 1 (theme only)
      const styleMatches = html.match(/<style>/g);
      expect(styleMatches?.length).toBe(1);
    });

    it('override CSS appears after theme CSS', async () => {
      const resume: Resume = {
        meta: { name: 'Order Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        theme: {
          colors: { accent: '#ff0000' },
        },
      };
      const normalized = normalizeResume(resume);
      const html = await renderStandaloneHtml(normalized, 'minimal');

      // Should have 2 <style> tags — theme then override
      const styleMatches = html.match(/<style>/g);
      expect(styleMatches?.length).toBe(2);

      // Override should come after theme CSS
      const themeIdx = html.indexOf('--color-accent: #2563eb'); // minimal theme default
      const overrideIdx = html.indexOf('--color-accent: #ff0000');
      expect(overrideIdx).toBeGreaterThan(themeIdx);
    });
  });
});
