import nunjucks from 'nunjucks';
import { loadTheme, readTemplate, readStyles, loadThemeConfig, readVariantTemplate } from './themes.js';
import { ThemeError } from './errors.js';
import { formatDate, formatDateShort, formatDateRange } from './dates.js';
import { getLocale } from './i18n.js';
import type { Locale } from './i18n.js';
import type { NormalizedResume, ThemeOverrides, ThemeConfig } from '../types/index.js';

/**
 * Options for rendering HTML
 */
export interface RenderOptions {
  /** Theme layout variant name */
  variant?: string;
  /** CSS custom property overrides from variant style config */
  styleOverrides?: Record<string, string>;
}

/**
 * Create a Nunjucks environment with locale-bound date filters.
 * Each render gets its own environment so that locale-specific filters
 * don't leak across concurrent renders with different languages.
 *
 * When a theme config is provided, its custom filters and globals are
 * registered on the environment after the built-in ones.
 */
function createEnvironment(locale: Locale, config?: ThemeConfig | null): nunjucks.Environment {
  const env = new nunjucks.Environment(null, {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true,
  });

  // Date formatting filters bound to the current locale
  env.addFilter('formatDate', (dateStr: string | undefined) => formatDate(dateStr, locale));
  env.addFilter('formatDateShort', (dateStr: string | undefined) => formatDateShort(dateStr, locale));
  env.addFilter('formatDateRange', (start: string | undefined, end: string | undefined) =>
    formatDateRange(start, end, { locale }),
  );

  env.addFilter('joinItems', (items: string[] | undefined, separator = ', '): string => {
    if (!items || items.length === 0) return '';
    return items.join(separator);
  });

  env.addFilter('domain', (url: string | undefined): string => {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return url;
    }
  });

  // Register theme-provided filters
  if (config?.filters) {
    for (const f of config.filters) {
      env.addFilter(f.name, f.filter);
    }
  }

  // Register theme-provided globals
  if (config?.globals) {
    for (const [key, value] of Object.entries(config.globals)) {
      env.addGlobal(key, value);
    }
  }

  return env;
}

export interface RenderResult {
  html: string;
  css: string | null;
}

/**
 * Build the labels context object. When the resume has no `language` set,
 * labels is an empty object so templates fall through to their hardcoded
 * English defaults via `{{ labels.xxx or "Fallback" }}`.
 */
function buildLabels(locale: Locale): Record<string, string> {
  if (!locale.code) return {};
  const labels: Record<string, string> = {};
  for (const [key, value] of Object.entries(locale.labels)) {
    if (value) labels[key] = value;
  }
  if (locale.keywords.present) {
    labels['present'] = locale.keywords.present;
  }
  return labels;
}

/**
 * Render a normalized resume to HTML using a theme
 */
export async function renderHtml(
  resume: NormalizedResume,
  themeName: string,
  options?: RenderOptions,
): Promise<RenderResult> {
  const theme = await loadTheme(themeName);
  const config = await loadThemeConfig(theme);

  // Select template: use layout variant if specified, otherwise default
  let template: string;
  if (options?.variant) {
    if (!config?.variants) {
      throw ThemeError.variantNotFound(themeName, options.variant);
    }
    const v = config.variants.find((lv) => lv.name === options.variant);
    if (!v) {
      throw ThemeError.variantNotFound(themeName, options.variant);
    }
    template = await readVariantTemplate(theme, v.template);
  } else {
    template = await readTemplate(theme);
  }

  const css = await readStyles(theme);
  const locale = getLocale(resume.language);
  const env = createEnvironment(locale, config);

  // Build template context
  const context: Record<string, unknown> = {
    resume,
    meta: resume.meta,
    summary: resume.summary,
    skills: resume.skills,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
    languages: resume.languages,
    awards: resume.awards,
    publications: resume.publications,
    volunteer: resume.volunteer,
    references: resume.references,
    sections: resume.sections,
    labels: buildLabels(locale),
  };

  // Merge helper-computed context from theme config
  if (config?.helpers) {
    const helperContext = config.helpers(resume);
    Object.assign(context, helperContext);
  }

  const html = env.renderString(template, context);

  return { html, css };
}

/**
 * Generate CSS overrides from theme configuration
 */
export function generateThemeOverrideCss(theme: ThemeOverrides): string {
  const vars: string[] = [];

  if (theme.colors) {
    const colorMap: Record<string, string> = {
      accent: '--color-accent',
      text: '--color-text',
      textSecondary: '--color-text-secondary',
      textMuted: '--color-text-muted',
      background: '--color-background',
      border: '--color-border',
    };
    for (const [key, cssVar] of Object.entries(colorMap)) {
      const value = theme.colors[key as keyof typeof theme.colors];
      if (value) vars.push(`${cssVar}: ${value}`);
    }
  }

  if (theme.fonts) {
    const fontMap: Record<string, string> = {
      sans: '--font-sans',
      serif: '--font-serif',
    };
    for (const [key, cssVar] of Object.entries(fontMap)) {
      const value = theme.fonts[key as keyof typeof theme.fonts];
      if (value) vars.push(`${cssVar}: ${value}`);
    }
  }

  return vars.length > 0 ? `:root { ${vars.join('; ')}; }` : '';
}

/**
 * Generate CSS overrides from variant style config (arbitrary CSS custom properties).
 */
export function generateStyleOverrideCss(style: Record<string, string>): string {
  const vars: string[] = [];
  for (const [prop, value] of Object.entries(style)) {
    vars.push(`${prop}: ${value}`);
  }
  return vars.length > 0 ? `:root { ${vars.join('; ')}; }` : '';
}

/**
 * Render a complete standalone HTML document
 */
export async function renderStandaloneHtml(
  resume: NormalizedResume,
  themeName: string,
  options?: RenderOptions,
): Promise<string> {
  const { html, css } = await renderHtml(resume, themeName, options);
  const overrideCss = resume.theme ? generateThemeOverrideCss(resume.theme) : '';
  const styleOverrideCss = options?.styleOverrides
    ? generateStyleOverrideCss(options.styleOverrides)
    : '';
  const lang = resume.language ?? 'en';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.meta.name} - Resume</title>
  ${css ? `<style>\n${css}\n</style>` : ''}
  ${overrideCss ? `<style>\n${overrideCss}\n</style>` : ''}
  ${styleOverrideCss ? `<style>\n${styleOverrideCss}\n</style>` : ''}
</head>
<body>
${html}
</body>
</html>`;
}
