import { describe, it, expect } from 'vitest';
import { generateConfiguratorPanel } from '../src/lib/configurator.js';
import { parseCssCustomProperties } from '../src/lib/css-properties.js';
import type { ConfiguratorTheme } from '../src/lib/configurator.js';

describe('parseCssCustomProperties', () => {
  it('extracts CSS custom properties from raw CSS', () => {
    const css = `:root {
      --color-accent: #2563eb;
      --color-text: #1a1a1a;
      --font-sans: system-ui, sans-serif;
    }`;
    const props = parseCssCustomProperties(css);
    expect(props['--color-accent']).toBe('#2563eb');
    expect(props['--color-text']).toBe('#1a1a1a');
    expect(props['--font-sans']).toBe('system-ui, sans-serif');
  });

  it('handles multiple :root blocks', () => {
    const css = `:root { --a: 1; } .foo { color: red; } :root { --b: 2; }`;
    const props = parseCssCustomProperties(css);
    expect(props['--a']).toBe('1');
    expect(props['--b']).toBe('2');
  });

  it('returns empty object for CSS without custom properties', () => {
    expect(parseCssCustomProperties('body { color: red; }')).toEqual({});
  });

  it('returns empty object for empty string', () => {
    expect(parseCssCustomProperties('')).toEqual({});
  });
});

describe('generateConfiguratorPanel', () => {
  const themes: ConfiguratorTheme[] = [
    {
      name: 'minimal',
      properties: {
        '--color-accent': '#2563eb',
        '--color-text': '#1a1a1a',
        '--font-sans': 'system-ui, sans-serif',
      },
    },
    {
      name: 'modern',
      properties: {
        '--color-accent': '#4f46e5',
        '--color-text': '#2d3748',
        '--font-sans': 'Inter, sans-serif',
      },
    },
  ];

  it('returns HTML containing the panel structure', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test-token-123',
    });

    expect(html).toContain('vitae-cfg');
    expect(html).toContain('Theme Configurator');
    expect(html).toContain('<style>');
    expect(html).toContain('<script>');
  });

  it('includes theme names in the output', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test-token-123',
    });

    expect(html).toContain('minimal');
    expect(html).toContain('modern');
  });

  it('includes the CSRF token', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'secret-token-xyz',
    });

    expect(html).toContain('secret-token-xyz');
  });

  it('includes core color variable names', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test',
    });

    expect(html).toContain('--color-accent');
    expect(html).toContain('--color-text');
  });

  it('includes export and reset buttons', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test',
    });

    expect(html).toContain('Export to YAML');
    expect(html).toContain('Reset');
  });

  it('includes print media query to hide panel', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test',
    });

    expect(html).toContain('@media print');
    expect(html).toContain('display: none !important');
  });

  it('includes keyboard shortcut handler', () => {
    const html = generateConfiguratorPanel({
      themes,
      currentTheme: 'minimal',
      csrfToken: 'test',
    });

    expect(html).toContain('Shift');
  });
});
