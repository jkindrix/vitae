import nunjucks from 'nunjucks';
import { loadTheme, readTemplate, readStyles } from './themes.js';
import { formatDate, formatDateShort, formatDateRange } from './dates.js';
import type { Resume } from '../types/index.js';

// Configure Nunjucks environment
const env = new nunjucks.Environment(null, {
  autoescape: true,
  trimBlocks: true,
  lstripBlocks: true,
});

// Add custom filters

// Date formatting filters using shared utilities
env.addFilter('formatDate', formatDate);
env.addFilter('formatDateShort', formatDateShort);
env.addFilter('formatDateRange', formatDateRange);

/**
 * Join array items with a separator
 */
env.addFilter('joinItems', (items: string[] | undefined, separator = ', '): string => {
  if (!items || items.length === 0) return '';
  return items.join(separator);
});

/**
 * Extract domain from URL for display
 */
env.addFilter('domain', (url: string | undefined): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
});

export interface RenderResult {
  html: string;
  css: string | null;
}

/**
 * Render a resume to HTML using a theme
 */
export async function renderHtml(resume: Resume, themeName: string): Promise<RenderResult> {
  const theme = await loadTheme(themeName);
  const template = await readTemplate(theme);
  const css = await readStyles(theme);

  const html = env.renderString(template, {
    resume,
    meta: resume.meta,
    summary: resume.summary,
    skills: resume.skills,
    experience: resume.experience,
    projects: resume.projects,
    education: resume.education,
    certifications: resume.certifications,
  });

  return { html, css };
}

/**
 * Render a complete standalone HTML document
 */
export async function renderStandaloneHtml(resume: Resume, themeName: string): Promise<string> {
  const { html, css } = await renderHtml(resume, themeName);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resume.meta.name} - Resume</title>
  ${css ? `<style>\n${css}\n</style>` : ''}
</head>
<body>
${html}
</body>
</html>`;
}
