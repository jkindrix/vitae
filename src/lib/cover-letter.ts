import nunjucks from 'nunjucks';
import { loadTheme, readCoverLetterTemplate, readStyles, loadThemeConfig } from './themes.js';
import { generateThemeOverrideCss } from './renderer.js';
import type { CoverLetter, ThemeConfig } from '../types/index.js';

/**
 * Create a Nunjucks environment for cover letter rendering.
 * When a theme config is provided, its filters and globals are registered.
 */
function createCoverLetterEnvironment(config?: ThemeConfig | null): nunjucks.Environment {
  const env = new nunjucks.Environment(null, {
    autoescape: true,
    trimBlocks: true,
    lstripBlocks: true,
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

export interface CoverLetterRenderResult {
  html: string;
  css: string | null;
}

/**
 * Render a cover letter to HTML using a theme's cover letter template
 */
export async function renderCoverLetterHtml(
  coverLetter: CoverLetter,
  themeName: string
): Promise<CoverLetterRenderResult> {
  const theme = await loadTheme(themeName);
  const config = await loadThemeConfig(theme);
  const template = await readCoverLetterTemplate(theme);
  const css = await readStyles(theme);

  const env = createCoverLetterEnvironment(config);

  const html = env.renderString(template, {
    meta: coverLetter.meta,
    recipient: coverLetter.recipient,
    date: coverLetter.date,
    subject: coverLetter.subject,
    greeting: coverLetter.greeting,
    body: coverLetter.body,
    closing: coverLetter.closing,
  });

  return { html, css };
}

/**
 * Render a complete standalone HTML document for a cover letter
 */
export async function renderCoverLetterStandaloneHtml(
  coverLetter: CoverLetter,
  themeName: string
): Promise<string> {
  const { html, css } = await renderCoverLetterHtml(coverLetter, themeName);
  const overrideCss = coverLetter.theme ? generateThemeOverrideCss(coverLetter.theme) : '';

  const lang = coverLetter.language ?? 'en';

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${coverLetter.meta.name} - Cover Letter</title>
  ${css ? `<style>\n${css}\n</style>` : ''}
  ${overrideCss ? `<style>\n${overrideCss}\n</style>` : ''}
</head>
<body>
${html}
</body>
</html>`;
}

/**
 * Convert a cover letter to Markdown (for DOCX generation)
 */
export function coverLetterToMarkdown(coverLetter: CoverLetter): string {
  const lines: string[] = [];

  // Sender info
  lines.push(`**${coverLetter.meta.name}**`);
  lines.push('');

  const contactParts: string[] = [];
  if (coverLetter.meta.email) contactParts.push(coverLetter.meta.email);
  if (coverLetter.meta.phone) contactParts.push(coverLetter.meta.phone);
  if (coverLetter.meta.location) contactParts.push(coverLetter.meta.location);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
    lines.push('');
  }

  // Date
  if (coverLetter.date) {
    lines.push(coverLetter.date);
    lines.push('');
  }

  // Recipient
  const recipientParts: string[] = [];
  if (coverLetter.recipient.name) recipientParts.push(coverLetter.recipient.name);
  if (coverLetter.recipient.title) recipientParts.push(coverLetter.recipient.title);
  if (coverLetter.recipient.company) recipientParts.push(coverLetter.recipient.company);
  if (coverLetter.recipient.address) recipientParts.push(coverLetter.recipient.address);
  if (recipientParts.length > 0) {
    for (const part of recipientParts) {
      lines.push(part);
    }
    lines.push('');
  }

  // Subject
  if (coverLetter.subject) {
    lines.push(`**${coverLetter.subject}**`);
    lines.push('');
  }

  // Greeting
  lines.push(coverLetter.greeting);
  lines.push('');

  // Body paragraphs
  for (const paragraph of coverLetter.body) {
    lines.push(paragraph);
    lines.push('');
  }

  // Closing
  lines.push(coverLetter.closing);
  lines.push('');

  // Signature
  lines.push(coverLetter.meta.name);
  lines.push('');

  return lines.join('\n');
}
