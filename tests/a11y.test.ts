import { describe, it, expect } from 'vitest';
import {
  auditAccessibility,
  parseColor,
  relativeLuminance,
  contrastRatio,
  extractCssCustomProperties,
} from '../src/lib/a11y.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Well-formed, fully compliant standalone HTML. */
function compliantHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Jane Smith - Resume</title>
  <style>
    :root {
      --color-text: #1a1a1a;
      --color-text-secondary: #4a4a4a;
      --color-text-muted: #6b6b6b;
      --color-accent: #2563eb;
      --color-background: #ffffff;
      --font-sans: system-ui, -apple-system, sans-serif;
      --font-size-base: 10pt;
      --line-height-normal: 1.5;
      --line-height-tight: 1.25;
    }
  </style>
</head>
<body>
  <article class="resume">
    <header class="resume__header">
      <h1>Jane Smith</h1>
      <p>Senior Software Engineer</p>
      <div>
        <a href="https://linkedin.com/in/janesmith" target="_blank" rel="noopener">LinkedIn</a>
        <a href="https://github.com/janesmith" target="_blank" rel="noopener">GitHub</a>
      </div>
    </header>
    <section>
      <h2>Experience</h2>
      <div>
        <h3>Tech Corp</h3>
        <ul>
          <li>Led architecture of real-time features</li>
          <li>Reduced API response times by 60%</li>
        </ul>
      </div>
    </section>
    <section>
      <h2>Skills</h2>
      <ul>
        <li>TypeScript, Python, Go</li>
      </ul>
    </section>
  </article>
</body>
</html>`;
}

/** Non-compliant HTML with multiple issues. */
function nonCompliantHtml(): string {
  return `<html>
<head></head>
<body>
  <style>
    :root {
      --color-text: #cccccc;
      --color-text-secondary: #dddddd;
      --color-text-muted: #eeeeee;
      --color-accent: #f0f0f0;
      --color-background: #ffffff;
      --font-sans: CustomFont;
      --font-size-base: 7pt;
      --line-height-normal: 1.0;
      --line-height-tight: 1.0;
    }
  </style>
  <h1>Name</h1>
  <h1>Name Again</h1>
  <h3>Skipped heading</h3>
  <a href="https://example.com"></a>
  <a href="https://example.com">https://example.com</a>
  <a href="https://external.com">Link</a>
  <li>Orphaned list item</li>
  <b>Bold text</b>
  <i>Italic text</i>
  <img src="photo.jpg">
</body>
</html>`;
}

/** HTML with low contrast colors. */
function lowContrastHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test</title>
  <style>
    :root {
      --color-text: #999999;
      --color-text-secondary: #aaaaaa;
      --color-text-muted: #cccccc;
      --color-accent: #bbbbbb;
      --color-background: #ffffff;
      --font-sans: Arial, sans-serif;
      --font-size-base: 10pt;
      --line-height-normal: 1.5;
      --line-height-tight: 1.25;
    }
  </style>
</head>
<body>
  <article>
    <header><h1>Test</h1></header>
    <section><h2>Section</h2><p>Content</p></section>
  </article>
</body>
</html>`;
}

/** HTML with sidebar colors (modern theme pattern). */
function sidebarHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test</title>
  <style>
    :root {
      --color-text: #1a1a1a;
      --color-background: #ffffff;
      --color-sidebar-text: #f1f5f9;
      --color-sidebar-bg: #1e293b;
      --color-sidebar-muted: #94a3b8;
      --font-sans: system-ui, sans-serif;
      --font-size-base: 10pt;
      --line-height-normal: 1.5;
    }
  </style>
</head>
<body>
  <article><header><h1>Test</h1></header>
  <section><h2>Section</h2></section></article>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('auditAccessibility', () => {
  describe('overall scoring', () => {
    it('returns a high score for compliant HTML', () => {
      const result = auditAccessibility(compliantHtml());
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns a low score for non-compliant HTML', () => {
      const result = auditAccessibility(nonCompliantHtml());
      expect(result.score).toBeLessThan(60);
    });

    it('score is between 0 and 100', () => {
      const result = auditAccessibility(compliantHtml());
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns all 6 categories', () => {
      const result = auditAccessibility(compliantHtml());
      expect(result.categories).toHaveLength(6);
    });

    it('category weights sum to 100', () => {
      const result = auditAccessibility(compliantHtml());
      const totalWeight = result.categories.reduce((sum, c) => sum + c.weight, 0);
      expect(totalWeight).toBe(100);
    });
  });

  describe('document structure', () => {
    it('gives full marks for proper document structure', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.score).toBe(100);
      expect(cat.findings).toHaveLength(0);
    });

    it('penalizes missing DOCTYPE', () => {
      const html = compliantHtml().replace('<!DOCTYPE html>\n', '');
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.score).toBeLessThan(100);
      expect(cat.findings.some((f) => f.message.includes('DOCTYPE'))).toBe(true);
    });

    it('penalizes missing lang attribute', () => {
      const html = compliantHtml().replace(' lang="en"', '');
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.score).toBeLessThan(100);
      expect(cat.findings.some((f) => f.message.includes('lang'))).toBe(true);
    });

    it('penalizes missing charset meta', () => {
      const html = compliantHtml().replace('<meta charset="UTF-8">\n', '');
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('charset'))).toBe(true);
    });

    it('penalizes missing viewport meta', () => {
      const html = compliantHtml().replace(
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n',
        ''
      );
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('viewport'))).toBe(true);
    });

    it('penalizes multiple h1 elements', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('Multiple <h1>'))).toBe(true);
    });

    it('penalizes skipped heading levels', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('skips levels'))).toBe(true);
    });

    it('penalizes missing title', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('title'))).toBe(true);
    });

    it('penalizes lack of semantic elements', () => {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>T</title></head><body><h1>Name</h1><div>Content</div></body></html>`;
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'document-structure')!;
      expect(cat.findings.some((f) => f.message.includes('semantic'))).toBe(true);
    });
  });

  describe('color contrast', () => {
    it('gives full marks for high contrast colors', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'color-contrast')!;
      expect(cat.score).toBe(100);
    });

    it('penalizes low contrast text', () => {
      const result = auditAccessibility(lowContrastHtml());
      const cat = result.categories.find((c) => c.category === 'color-contrast')!;
      expect(cat.score).toBeLessThan(100);
      expect(cat.findings.length).toBeGreaterThan(0);
    });

    it('reports specific contrast ratios', () => {
      const result = auditAccessibility(lowContrastHtml());
      expect(result.contrastPairs.length).toBeGreaterThan(0);
      for (const pair of result.contrastPairs) {
        expect(pair.ratio).toBeGreaterThan(0);
        expect(pair.required).toBeGreaterThan(0);
      }
    });

    it('checks sidebar color pairs when present', () => {
      const result = auditAccessibility(sidebarHtml());
      const sidebarPairs = result.contrastPairs.filter((p) => p.element.includes('Sidebar'));
      expect(sidebarPairs.length).toBeGreaterThan(0);
    });

    it('handles AAA level option', () => {
      const resultAA = auditAccessibility(compliantHtml(), { level: 'AA' });
      const resultAAA = auditAccessibility(compliantHtml(), { level: 'AAA' });
      // AAA is stricter, so score should be <= AA score
      const aaScore = resultAA.categories.find((c) => c.category === 'color-contrast')!.score;
      const aaaScore = resultAAA.categories.find((c) => c.category === 'color-contrast')!.score;
      expect(aaaScore).toBeLessThanOrEqual(aaScore);
    });

    it('handles theme override styles', () => {
      const html = compliantHtml().replace(
        '</style>\n</head>',
        `</style>
  <style>
    :root {
      --color-text: #333333;
      --color-background: #fefefe;
    }
  </style>
</head>`
      );
      const result = auditAccessibility(html);
      // Should use the override values, not the original
      const textPair = result.contrastPairs.find((p) => p.element === 'Primary text');
      if (textPair) {
        expect(textPair.foreground).toBe('#333333');
        expect(textPair.background).toBe('#fefefe');
      }
    });
  });

  describe('links and navigation', () => {
    it('gives full marks for accessible links', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      expect(cat.score).toBe(100);
      expect(cat.findings).toHaveLength(0);
    });

    it('penalizes empty links', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      expect(cat.findings.some((f) => f.message.includes('no accessible text'))).toBe(true);
    });

    it('penalizes bare URL link text', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      expect(cat.findings.some((f) => f.message.includes('bare URL'))).toBe(true);
    });

    it('penalizes missing rel on external links', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      expect(cat.findings.some((f) => f.message.includes('rel="noopener"'))).toBe(true);
    });

    it('handles links with aria-label', () => {
      const html = compliantHtml().replace(
        '<a href="https://linkedin.com/in/janesmith" target="_blank" rel="noopener">LinkedIn</a>',
        '<a href="https://linkedin.com/in/janesmith" target="_blank" rel="noopener" aria-label="LinkedIn profile"></a>'
      );
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      // Should not penalize for empty text when aria-label is present
      expect(cat.findings.filter((f) => f.message.includes('no accessible text'))).toHaveLength(0);
    });

    it('detects duplicate link text with different URLs', () => {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>T</title></head><body><article><header><h1>Name</h1></header>
        <section><h2>Links</h2>
        <a href="https://a.com" rel="noopener">Click here</a>
        <a href="https://b.com" rel="noopener">Click here</a>
        </section></article></body></html>`;
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'links-navigation')!;
      expect(cat.findings.some((f) => f.message.includes('multiple different URLs'))).toBe(true);
    });
  });

  describe('semantic HTML', () => {
    it('gives full marks for semantic markup', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'semantic-html')!;
      expect(cat.score).toBe(100);
      expect(cat.findings).toHaveLength(0);
    });

    it('penalizes sections without headings', () => {
      const html = compliantHtml().replace(
        '<section>\n      <h2>Skills</h2>',
        '<section>'
      );
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'semantic-html')!;
      expect(cat.findings.some((f) => f.message.includes('without a heading'))).toBe(true);
    });

    it('penalizes empty headings', () => {
      const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>T</title></head><body><article><header><h1>Name</h1></header>
        <section><h2></h2></section></article></body></html>`;
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'semantic-html')!;
      expect(cat.findings.some((f) => f.message.includes('empty heading'))).toBe(true);
    });

    it('penalizes orphaned li elements', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'semantic-html')!;
      expect(cat.findings.some((f) => f.message.includes('not inside a <ul> or <ol>'))).toBe(true);
    });

    it('penalizes presentational elements', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'semantic-html')!;
      expect(cat.findings.some((f) => f.message.includes('presentational'))).toBe(true);
    });
  });

  describe('typography and readability', () => {
    it('gives full marks for readable typography', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'typography-readability')!;
      expect(cat.score).toBe(100);
      expect(cat.findings).toHaveLength(0);
    });

    it('penalizes small font sizes', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'typography-readability')!;
      expect(cat.findings.some((f) => f.message.includes('font size'))).toBe(true);
    });

    it('penalizes tight line height', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'typography-readability')!;
      expect(cat.findings.some((f) => f.message.includes('line height'))).toBe(true);
    });

    it('penalizes missing generic font fallback', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'typography-readability')!;
      expect(cat.findings.some((f) => f.message.includes('generic fallback'))).toBe(true);
    });
  });

  describe('images and media', () => {
    it('gives full marks when no images present', () => {
      const result = auditAccessibility(compliantHtml());
      const cat = result.categories.find((c) => c.category === 'images-media')!;
      expect(cat.score).toBe(100);
      expect(cat.findings).toHaveLength(0);
    });

    it('penalizes img without alt', () => {
      const result = auditAccessibility(nonCompliantHtml());
      const cat = result.categories.find((c) => c.category === 'images-media')!;
      expect(cat.findings.some((f) => f.message.includes('missing alt'))).toBe(true);
    });

    it('allows img with alt attribute', () => {
      const html = compliantHtml().replace(
        '</article>',
        '<img src="photo.jpg" alt="Profile photo"></article>'
      );
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'images-media')!;
      expect(cat.score).toBe(100);
    });

    it('penalizes svg without role or aria-label', () => {
      const html = compliantHtml().replace(
        '</article>',
        '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg></article>'
      );
      const result = auditAccessibility(html);
      const cat = result.categories.find((c) => c.category === 'images-media')!;
      expect(cat.findings.some((f) => f.message.includes('svg'))).toBe(true);
    });
  });

  describe('color utility functions', () => {
    it('parseColor handles 6-digit hex', () => {
      const c = parseColor('#ff0000');
      expect(c).toEqual([1, 0, 0]);
    });

    it('parseColor handles 3-digit hex', () => {
      const c = parseColor('#f00');
      expect(c).toEqual([1, 0, 0]);
    });

    it('parseColor handles rgb() notation', () => {
      const c = parseColor('rgb(255, 0, 0)');
      expect(c).toEqual([1, 0, 0]);
    });

    it('parseColor returns null for invalid input', () => {
      expect(parseColor('red')).toBeNull();
      expect(parseColor('hsl(0, 100%, 50%)')).toBeNull();
      expect(parseColor('')).toBeNull();
    });

    it('relativeLuminance calculates correctly for white', () => {
      expect(relativeLuminance(1, 1, 1)).toBeCloseTo(1, 5);
    });

    it('relativeLuminance calculates correctly for black', () => {
      expect(relativeLuminance(0, 0, 0)).toBeCloseTo(0, 5);
    });

    it('contrastRatio is 21:1 for black on white', () => {
      const white = relativeLuminance(1, 1, 1);
      const black = relativeLuminance(0, 0, 0);
      expect(contrastRatio(white, black)).toBeCloseTo(21, 0);
    });

    it('contrastRatio is 1:1 for same color', () => {
      const lum = relativeLuminance(0.5, 0.5, 0.5);
      expect(contrastRatio(lum, lum)).toBeCloseTo(1, 5);
    });
  });

  describe('CSS property extraction', () => {
    it('extracts custom properties from style blocks', () => {
      const html = '<style>:root { --color-text: #1a1a1a; --font-size-base: 10pt; }</style>';
      const props = extractCssCustomProperties(html);
      expect(props['--color-text']).toBe('#1a1a1a');
      expect(props['--font-size-base']).toBe('10pt');
    });

    it('handles override style blocks', () => {
      const html = `
        <style>:root { --color-text: #111111; }</style>
        <style>:root { --color-text: #222222; }</style>
      `;
      const props = extractCssCustomProperties(html);
      expect(props['--color-text']).toBe('#222222');
    });

    it('handles missing properties gracefully', () => {
      const props = extractCssCustomProperties('<p>No styles</p>');
      expect(Object.keys(props)).toHaveLength(0);
    });
  });

  describe('result shape', () => {
    it('returns all required fields', () => {
      const result = auditAccessibility(compliantHtml());
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('contrastPairs');
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.categories)).toBe(true);
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.contrastPairs)).toBe(true);
    });

    it('findings have correct severity types', () => {
      const result = auditAccessibility(nonCompliantHtml());
      for (const f of result.findings) {
        expect(['error', 'warning', 'suggestion']).toContain(f.severity);
        expect([
          'document-structure',
          'color-contrast',
          'links-navigation',
          'semantic-html',
          'typography-readability',
          'images-media',
        ]).toContain(f.category);
      }
    });

    it('category scores are 0-100', () => {
      const result = auditAccessibility(nonCompliantHtml());
      for (const cat of result.categories) {
        expect(cat.score).toBeGreaterThanOrEqual(0);
        expect(cat.score).toBeLessThanOrEqual(100);
      }
    });

    it('contrast pairs have required fields', () => {
      const result = auditAccessibility(compliantHtml());
      for (const pair of result.contrastPairs) {
        expect(pair).toHaveProperty('foreground');
        expect(pair).toHaveProperty('background');
        expect(pair).toHaveProperty('ratio');
        expect(pair).toHaveProperty('required');
        expect(pair).toHaveProperty('element');
        expect(pair).toHaveProperty('passes');
        expect(typeof pair.ratio).toBe('number');
        expect(typeof pair.passes).toBe('boolean');
      }
    });
  });
});
