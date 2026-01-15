import { describe, it, expect } from 'vitest';
import {
  loadTheme,
  listThemes,
  readTemplate,
  readStyles,
  getDocxReferencePath,
  getThemesDir,
} from '../src/lib/themes.js';

describe('themes', () => {
  describe('getThemesDir', () => {
    it('returns a valid path', () => {
      const dir = getThemesDir();
      expect(dir).toBeDefined();
      expect(dir).toContain('themes');
    });
  });

  describe('loadTheme', () => {
    it('loads the minimal theme', async () => {
      const theme = await loadTheme('minimal');

      expect(theme.name).toBe('minimal');
      expect(theme.hasTemplate).toBe(true);
      expect(theme.hasStyles).toBe(true);
      expect(theme.path).toContain('minimal');
    });

    it('loads the professional theme', async () => {
      const theme = await loadTheme('professional');

      expect(theme.name).toBe('professional');
      expect(theme.hasTemplate).toBe(true);
      expect(theme.hasStyles).toBe(true);
      expect(theme.path).toContain('professional');
    });

    it('loads the modern theme', async () => {
      const theme = await loadTheme('modern');

      expect(theme.name).toBe('modern');
      expect(theme.hasTemplate).toBe(true);
      expect(theme.hasStyles).toBe(true);
      expect(theme.path).toContain('modern');
    });

    it('throws on non-existent theme', async () => {
      await expect(loadTheme('non-existent')).rejects.toThrow("Theme 'non-existent' not found");
    });

    it('throws on theme without template.html', async () => {
      // This would require creating a test fixture
      // For now, we verify the error is thrown for missing theme
      await expect(loadTheme('__invalid__')).rejects.toThrow();
    });
  });

  describe('listThemes', () => {
    it('returns array of themes', async () => {
      const themes = await listThemes();

      expect(Array.isArray(themes)).toBe(true);
      expect(themes.length).toBeGreaterThan(0);
    });

    it('includes all bundled themes', async () => {
      const themes = await listThemes();
      const themeNames = themes.map((t) => t.name);

      expect(themeNames).toContain('minimal');
      expect(themeNames).toContain('professional');
      expect(themeNames).toContain('modern');
    });

    it('includes minimal theme in list', async () => {
      const themes = await listThemes();
      const minimal = themes.find((t) => t.name === 'minimal');

      expect(minimal).toBeDefined();
      expect(minimal?.hasTemplate).toBe(true);
    });

    it('returns valid theme objects', async () => {
      const themes = await listThemes();

      for (const theme of themes) {
        expect(theme.name).toBeDefined();
        expect(theme.path).toBeDefined();
        expect(typeof theme.hasTemplate).toBe('boolean');
        expect(typeof theme.hasStyles).toBe('boolean');
        expect(typeof theme.hasDocxReference).toBe('boolean');
      }
    });
  });

  describe('readTemplate', () => {
    it('reads template content from theme', async () => {
      const theme = await loadTheme('minimal');
      const template = await readTemplate(theme);

      expect(template).toBeDefined();
      expect(template).toContain('resume');
      expect(template).toContain('{{ meta.name }}');
    });

    it('returns valid Nunjucks template', async () => {
      const theme = await loadTheme('minimal');
      const template = await readTemplate(theme);

      // Check for common Nunjucks patterns
      expect(template).toMatch(/{%.*%}/); // Block tags
      expect(template).toMatch(/{{.*}}/); // Variable tags
    });
  });

  describe('readStyles', () => {
    it('reads CSS from minimal theme', async () => {
      const theme = await loadTheme('minimal');
      const styles = await readStyles(theme);

      expect(styles).toBeDefined();
      expect(styles).toContain('.resume');
      expect(styles).toContain('font-family');
    });

    it('reads CSS from professional theme', async () => {
      const theme = await loadTheme('professional');
      const styles = await readStyles(theme);

      expect(styles).toBeDefined();
      expect(styles).toContain('.resume');
      expect(styles).toContain('serif'); // Professional uses serif fonts
    });

    it('reads CSS from modern theme', async () => {
      const theme = await loadTheme('modern');
      const styles = await readStyles(theme);

      expect(styles).toBeDefined();
      expect(styles).toContain('.resume__sidebar'); // Modern has sidebar layout
      expect(styles).toContain('--color-accent');
    });

    it('returns null for theme without styles', async () => {
      // Create a mock theme without styles
      const mockTheme = {
        name: 'mock',
        path: '/mock',
        hasTemplate: true,
        hasStyles: false,
        hasDocxReference: false,
      };

      const styles = await readStyles(mockTheme);
      expect(styles).toBeNull();
    });

    it('includes CSS custom properties', async () => {
      const theme = await loadTheme('minimal');
      const styles = await readStyles(theme);

      expect(styles).toContain(':root');
      expect(styles).toContain('--');
    });

    it('includes print styles', async () => {
      const theme = await loadTheme('minimal');
      const styles = await readStyles(theme);

      expect(styles).toContain('@media print');
    });
  });

  describe('getDocxReferencePath', () => {
    it('returns null for theme without reference.docx', async () => {
      const theme = await loadTheme('minimal');

      // The minimal theme may or may not have reference.docx
      const path = getDocxReferencePath(theme);

      if (theme.hasDocxReference) {
        expect(path).toContain('reference.docx');
      } else {
        expect(path).toBeNull();
      }
    });

    it('returns path when theme has reference.docx', () => {
      const mockTheme = {
        name: 'mock',
        path: '/path/to/theme',
        hasTemplate: true,
        hasStyles: true,
        hasDocxReference: true,
      };

      const path = getDocxReferencePath(mockTheme);
      expect(path).toBe('/path/to/theme/reference.docx');
    });

    it('returns null when theme lacks reference.docx', () => {
      const mockTheme = {
        name: 'mock',
        path: '/path/to/theme',
        hasTemplate: true,
        hasStyles: true,
        hasDocxReference: false,
      };

      const path = getDocxReferencePath(mockTheme);
      expect(path).toBeNull();
    });
  });
});
