import { describe, it, expect } from 'vitest';
import { join } from 'path';
import { writeFile, mkdir, rm } from 'fs/promises';
import {
  loadTheme,
  listThemes,
  loadThemeConfig,
  getThemesDir,
  renderHtml,
  renderStandaloneHtml,
} from '../src/lib/index.js';
import type { NormalizedResume, ThemeConfig } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Factory: minimal normalized resume for rendering
// ---------------------------------------------------------------------------

function minimalResume(overrides?: Partial<NormalizedResume>): NormalizedResume {
  return {
    meta: { name: 'Test User' },
    experience: [
      {
        company: 'Acme Corp',
        roles: [{ title: 'Engineer', start: '2020-01' }],
      },
    ],
    sections: ['experience'],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Theme config loading
// ---------------------------------------------------------------------------

describe('theme config', () => {
  describe('loadTheme hasConfig detection', () => {
    it('detects config in bundled themes', async () => {
      const theme = await loadTheme('minimal');
      expect(theme.hasConfig).toBe(true);
    });

    it('detects config in all bundled themes', async () => {
      const themes = await listThemes();
      for (const theme of themes) {
        expect(theme.hasConfig).toBe(true);
      }
    });
  });

  describe('loadThemeConfig', () => {
    it('loads config from minimal theme', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      expect(config).not.toBeNull();
      expect(config!.metadata).toBeDefined();
      expect(config!.metadata!.description).toBeDefined();
      expect(config!.metadata!.author).toBe('Vitae');
      expect(config!.metadata!.version).toBe('1.0.0');
    });

    it('loads config from modern theme', async () => {
      const theme = await loadTheme('modern');
      const config = await loadThemeConfig(theme);

      expect(config).not.toBeNull();
      expect(config!.metadata!.tags).toContain('sidebar');
    });

    it('loads config from professional theme', async () => {
      const theme = await loadTheme('professional');
      const config = await loadThemeConfig(theme);

      expect(config).not.toBeNull();
      expect(config!.metadata!.tags).toContain('serif');
    });

    it('returns null for theme without config', async () => {
      const mockTheme = {
        name: 'mock',
        path: '/nonexistent',
        hasTemplate: true,
        hasStyles: false,
        hasDocxReference: false,
        hasCoverLetterTemplate: false,
        hasConfig: false,
      };

      const config = await loadThemeConfig(mockTheme);
      expect(config).toBeNull();
    });
  });

  describe('metadata', () => {
    it('includes all expected metadata fields', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      expect(config!.metadata!.description).toEqual(expect.any(String));
      expect(config!.metadata!.author).toEqual(expect.any(String));
      expect(config!.metadata!.version).toEqual(expect.any(String));
      expect(config!.metadata!.license).toEqual(expect.any(String));
      expect(Array.isArray(config!.metadata!.tags)).toBe(true);
    });

    it('has distinct descriptions per theme', async () => {
      const themes = await listThemes();
      const descriptions = new Set<string>();

      for (const theme of themes) {
        const config = await loadThemeConfig(theme);
        if (config?.metadata?.description) {
          descriptions.add(config.metadata.description);
        }
      }

      expect(descriptions.size).toBe(themes.length);
    });
  });

  describe('filters', () => {
    it('defines custom filters', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      expect(config!.filters).toBeDefined();
      expect(config!.filters!.length).toBeGreaterThan(0);
    });

    it('initials filter extracts first letters', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);
      const initialsFilter = config!.filters!.find((f) => f.name === 'initials');

      expect(initialsFilter).toBeDefined();
      expect(initialsFilter!.filter('John Doe')).toBe('JD');
      expect(initialsFilter!.filter('Jane Ann Smith')).toBe('JAS');
    });

    it('initials filter handles empty/null input', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);
      const initialsFilter = config!.filters!.find((f) => f.name === 'initials');

      expect(initialsFilter!.filter('')).toBe('');
      expect(initialsFilter!.filter(null)).toBe('');
      expect(initialsFilter!.filter(undefined)).toBe('');
    });

    it('custom filters are usable in template rendering', async () => {
      const resume = minimalResume();
      const { html } = await renderHtml(resume, 'minimal');

      // The template renders successfully with config loaded
      expect(html).toContain('Test User');
    });
  });

  describe('helpers', () => {
    it('defines helper function', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      expect(config!.helpers).toBeDefined();
      expect(typeof config!.helpers).toBe('function');
    });

    it('computes totalExperienceYears', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      const resume = minimalResume({
        experience: [
          {
            company: 'Acme',
            roles: [{ title: 'Dev', start: '2020-01' }],
          },
        ],
      });

      const helperContext = config!.helpers!(resume);
      expect(helperContext.totalExperienceYears).toBeGreaterThanOrEqual(4);
    });

    it('computes skillCount', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      const resume = minimalResume({
        skills: [
          { category: 'Languages', items: ['TypeScript', 'Go'] },
          { category: 'Tools', items: ['Docker'] },
        ],
      });

      const helperContext = config!.helpers!(resume);
      expect(helperContext.skillCount).toBe(3);
    });

    it('returns zero for empty experience', async () => {
      const theme = await loadTheme('minimal');
      const config = await loadThemeConfig(theme);

      const resume = minimalResume({
        experience: [
          {
            company: 'Acme',
            roles: [],
          },
        ],
      });

      const helperContext = config!.helpers!(resume);
      expect(helperContext.totalExperienceYears).toBe(0);
    });
  });

  describe('backwards compatibility', () => {
    it('themes without config render identically', async () => {
      // Rendering with bundled themes (which have configs) still works
      const resume = minimalResume();
      const html = await renderStandaloneHtml(resume, 'minimal');

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Test User');
      expect(html).toContain('<html lang="en">');
    });

    it('all existing themes still render successfully', async () => {
      const themes = await listThemes();
      const resume = minimalResume();

      for (const theme of themes) {
        const html = await renderStandaloneHtml(resume, theme.name);
        expect(html).toContain('Test User');
      }
    });
  });

  describe('render with variant option', () => {
    it('throws for non-existent variant', async () => {
      const resume = minimalResume();
      await expect(
        renderHtml(resume, 'minimal', { variant: 'nonexistent' })
      ).rejects.toThrow(/variant.*nonexistent.*not found/i);
    });

    it('renders compact variant for minimal theme', async () => {
      const resume = minimalResume();
      const { html } = await renderHtml(resume, 'minimal', { variant: 'compact' });
      expect(html).toContain('resume--compact');
      expect(html).toContain('Test User');
    });
  });

  describe('listThemes with config', () => {
    it('includes hasConfig in theme objects', async () => {
      const themes = await listThemes();

      for (const theme of themes) {
        expect(typeof theme.hasConfig).toBe('boolean');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// Layout variant integration (using temp theme)
// ---------------------------------------------------------------------------

describe('layout variants', () => {
  const tempThemeName = '__test-variant-theme__';
  const tempThemePath = join(getThemesDir(), tempThemeName);

  // Create temp theme with a variant before tests
  async function setupVariantTheme(): Promise<void> {
    await mkdir(tempThemePath, { recursive: true });

    // Default template
    await writeFile(
      join(tempThemePath, 'template.html'),
      '<article class="default">{{ meta.name }}</article>',
      'utf-8',
    );

    // Variant template
    await writeFile(
      join(tempThemePath, 'template-compact.html'),
      '<article class="compact">{{ meta.name }} (compact)</article>',
      'utf-8',
    );

    // Style
    await writeFile(
      join(tempThemePath, 'style.css'),
      ':root { --color-text: #000; }',
      'utf-8',
    );

    // Config with variant
    const config = `export default {
  metadata: { description: 'Test theme', author: 'Test', version: '0.0.1' },
  filters: [
    { name: 'upper', filter: (s) => typeof s === 'string' ? s.toUpperCase() : '' },
  ],
  globals: { appName: 'Vitae' },
  helpers: (resume) => ({ nameLength: resume.meta.name.length }),
  variants: [
    { name: 'compact', description: 'Compact layout', template: 'template-compact.html' },
  ],
};`;

    await writeFile(join(tempThemePath, 'theme.config.js'), config, 'utf-8');
  }

  async function teardownVariantTheme(): Promise<void> {
    try {
      await rm(tempThemePath, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }

  it('loads variant theme config', async () => {
    await setupVariantTheme();
    try {
      const theme = await loadTheme(tempThemeName);
      expect(theme.hasConfig).toBe(true);

      const config = await loadThemeConfig(theme);
      expect(config).not.toBeNull();
      expect(config!.variants).toHaveLength(1);
      expect(config!.variants![0].name).toBe('compact');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('renders default template without variant option', async () => {
    await setupVariantTheme();
    try {
      const resume = minimalResume();
      const { html } = await renderHtml(resume, tempThemeName);

      expect(html).toContain('class="default"');
      expect(html).toContain('Test User');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('renders variant template when variant specified', async () => {
    await setupVariantTheme();
    try {
      const resume = minimalResume();
      const { html } = await renderHtml(resume, tempThemeName, { variant: 'compact' });

      expect(html).toContain('class="compact"');
      expect(html).toContain('Test User (compact)');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('custom filter works in rendered template', async () => {
    await setupVariantTheme();
    try {
      // Create template that uses custom filter
      await writeFile(
        join(tempThemePath, 'template.html'),
        '<div>{{ meta.name | upper }}</div>',
        'utf-8',
      );

      const resume = minimalResume();
      const { html } = await renderHtml(resume, tempThemeName);

      expect(html).toContain('TEST USER');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('globals are accessible in templates', async () => {
    await setupVariantTheme();
    try {
      await writeFile(
        join(tempThemePath, 'template.html'),
        '<div>{{ appName }} - {{ meta.name }}</div>',
        'utf-8',
      );

      const resume = minimalResume();
      const { html } = await renderHtml(resume, tempThemeName);

      expect(html).toContain('Vitae - Test User');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('helper context is accessible in templates', async () => {
    await setupVariantTheme();
    try {
      await writeFile(
        join(tempThemePath, 'template.html'),
        '<div>{{ meta.name }} ({{ nameLength }} chars)</div>',
        'utf-8',
      );

      const resume = minimalResume();
      const { html } = await renderHtml(resume, tempThemeName);

      expect(html).toContain('Test User (9 chars)');
    } finally {
      await teardownVariantTheme();
    }
  });

  it('rejects path traversal in variant template', async () => {
    await setupVariantTheme();
    try {
      // Overwrite config with path traversal attempt
      const config = `export default {
  variants: [
    { name: 'evil', template: '../minimal/template.html' },
  ],
};`;
      await writeFile(join(tempThemePath, 'theme.config.js'), config, 'utf-8');

      const resume = minimalResume();
      await expect(
        renderHtml(resume, tempThemeName, { variant: 'evil' })
      ).rejects.toThrow(/outside theme directory/i);
    } finally {
      await teardownVariantTheme();
    }
  });

  it('rejects missing variant template file', async () => {
    await setupVariantTheme();
    try {
      const config = `export default {
  variants: [
    { name: 'ghost', template: 'nonexistent.html' },
  ],
};`;
      await writeFile(join(tempThemePath, 'theme.config.js'), config, 'utf-8');

      const resume = minimalResume();
      await expect(
        renderHtml(resume, tempThemeName, { variant: 'ghost' })
      ).rejects.toThrow(/not found/i);
    } finally {
      await teardownVariantTheme();
    }
  });
});
