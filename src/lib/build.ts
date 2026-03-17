/**
 * High-level build API — single-call function that orchestrates the full
 * load → validate → variant → normalize → render → output pipeline.
 */

import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve, basename, extname, join } from 'path';
import { loadDocument, loadVariant } from './loader.js';
import { applyVariant } from './variant.js';
import { normalizeResume } from './normalize.js';
import { renderStandaloneHtml } from './renderer.js';
import type { RenderOptions } from './renderer.js';
import { renderCoverLetterStandaloneHtml } from './cover-letter.js';
import { generatePdf, generatePng, closeBrowser } from './pdf.js';
import { generateDocx, generateCoverLetterDocx } from './docx.js';
import { resumeToMarkdown } from './markdown.js';
import { coverLetterToMarkdown } from './cover-letter.js';
import type { OutputFormat, SectionName } from '../types/index.js';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Options for the high-level build function.
 */
export interface BuildOptions {
  /** Path to resume or cover-letter YAML/JSON file */
  input: string;

  /** Theme name (e.g. 'minimal', 'modern') */
  theme: string;

  /** Output format */
  format: OutputFormat;

  /** Output directory (defaults to input file's directory) */
  output?: string;

  /** Output filename without extension (defaults to input basename) */
  name?: string;

  /** Path to variant YAML file */
  variant?: string;

  /** Theme layout variant name (from theme.config.js variants) */
  layout?: string;

  /** PDF target page count (default: 1) */
  pages?: number;

  /** Auto-scale PDF to fit target pages */
  fit?: boolean;
}

/**
 * Result returned by the build function.
 */
export interface BuildResult {
  /** Normalized format label (e.g. 'pdf', 'html') */
  format: OutputFormat;

  /** Absolute path to the generated file */
  path: string;

  /** Number of pages in the output (PDF only) */
  pageCount?: number | undefined;

  /** Scale factor applied (PDF fit mode only) */
  scale?: number | undefined;
}

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build a single output file from a resume or cover letter.
 *
 * Orchestrates the full pipeline: load → validate → variant → normalize →
 * render → output. Returns the path to the generated file along with
 * format-specific metadata.
 *
 * @example
 * ```ts
 * import { build } from '@jkindrix/vitae';
 *
 * // Generate a PDF
 * const result = await build({
 *   input: 'resume.yaml',
 *   theme: 'minimal',
 *   format: 'pdf',
 * });
 * console.log(result.path); // '/absolute/path/to/resume.pdf'
 *
 * // Generate HTML with a variant
 * const html = await build({
 *   input: 'resume.yaml',
 *   theme: 'modern',
 *   format: 'html',
 *   variant: 'frontend.yaml',
 *   output: './dist',
 * });
 * ```
 */
export async function build(options: BuildOptions): Promise<BuildResult> {
  const resolvedInput = resolve(options.input);
  const inputBasename = basename(resolvedInput, extname(resolvedInput));
  const outputBasename = options.name ?? inputBasename;
  const outputDir = options.output ? resolve(options.output) : dirname(resolvedInput);
  const outputPath = join(outputDir, `${outputBasename}.${options.format}`);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Load and validate
  const document = await loadDocument(resolvedInput);

  if (document.type === 'cover-letter') {
    return buildCoverLetter(document.coverLetter, options, outputPath);
  }

  return buildResume(document.resume, options, outputPath);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

import type { Resume, CoverLetter } from '../types/index.js';

async function buildResume(
  resume: Resume,
  options: BuildOptions,
  outputPath: string
): Promise<BuildResult> {
  const { format, theme } = options;

  // Apply variant
  let processed = resume;
  let sectionOrder: SectionName[] | undefined;
  let styleOverrides: Record<string, string> | undefined;

  if (options.variant) {
    const variant = await loadVariant(resolve(options.variant));
    processed = applyVariant(processed, variant);
    sectionOrder = variant.layout;
    styleOverrides = variant.style;
  }

  // Normalize
  const normalized = normalizeResume(processed, sectionOrder);

  try {
    switch (format) {
      case 'html': {
        const renderOpts: RenderOptions = {};
        if (options.layout) renderOpts.variant = options.layout;
        if (styleOverrides) renderOpts.styleOverrides = styleOverrides;
        const hasOpts = options.layout || styleOverrides;
        const html = await renderStandaloneHtml(
          normalized,
          theme,
          hasOpts ? renderOpts : undefined
        );
        await writeFile(outputPath, html, 'utf-8');
        return { format, path: outputPath };
      }

      case 'pdf': {
        const targetPages = options.pages ?? 1;
        const pdfOptions = {
          ...(options.layout ? { layout: options.layout } : {}),
          ...(styleOverrides ? { styleOverrides } : {}),
          ...(options.fit ? { fit: true, targetPages } : { targetPages }),
        };
        const result = await generatePdf(normalized, theme, outputPath, pdfOptions);
        return {
          format,
          path: outputPath,
          pageCount: result.pageCount,
          scale: result.scale,
        };
      }

      case 'png': {
        const pngOptions = {
          ...(options.layout ? { layout: options.layout } : {}),
          ...(styleOverrides ? { styleOverrides } : {}),
        };
        await generatePng(normalized, theme, outputPath, pngOptions);
        return { format, path: outputPath };
      }

      case 'docx': {
        await generateDocx(normalized, theme, outputPath);
        return { format, path: outputPath };
      }

      case 'json': {
        const json = JSON.stringify(normalized, null, 2);
        await writeFile(outputPath, json, 'utf-8');
        return { format, path: outputPath };
      }

      case 'md': {
        const markdown = resumeToMarkdown(normalized);
        await writeFile(outputPath, markdown, 'utf-8');
        return { format, path: outputPath };
      }

      default: {
        const _exhaustive: never = format;
        throw new Error(`Unsupported format: ${_exhaustive}`);
      }
    }
  } finally {
    if (format === 'pdf' || format === 'png') {
      await closeBrowser();
    }
  }
}

async function buildCoverLetter(
  coverLetter: CoverLetter,
  options: BuildOptions,
  outputPath: string
): Promise<BuildResult> {
  const { format, theme } = options;

  try {
    switch (format) {
      case 'html': {
        const html = await renderCoverLetterStandaloneHtml(coverLetter, theme);
        await writeFile(outputPath, html, 'utf-8');
        return { format, path: outputPath };
      }

      case 'pdf': {
        const html = await renderCoverLetterStandaloneHtml(coverLetter, theme);
        // Import inline to avoid circular dependency at module level
        const { generatePdfFromHtml } = await import('./pdf.js');
        const targetPages = options.pages ?? 1;
        const pdfOptions = {
          ...(options.fit ? { fit: true, targetPages } : { targetPages }),
        };
        const result = await generatePdfFromHtml(html, outputPath, pdfOptions);
        return {
          format,
          path: outputPath,
          pageCount: result.pageCount,
          scale: result.scale,
        };
      }

      case 'png': {
        const html = await renderCoverLetterStandaloneHtml(coverLetter, theme);
        const { generatePngFromHtml } = await import('./pdf.js');
        await generatePngFromHtml(html, outputPath);
        return { format, path: outputPath };
      }

      case 'docx': {
        await generateCoverLetterDocx(coverLetter, outputPath);
        return { format, path: outputPath };
      }

      case 'json': {
        const json = JSON.stringify(coverLetter, null, 2);
        await writeFile(outputPath, json, 'utf-8');
        return { format, path: outputPath };
      }

      case 'md': {
        const markdown = coverLetterToMarkdown(coverLetter);
        await writeFile(outputPath, markdown, 'utf-8');
        return { format, path: outputPath };
      }

      default: {
        const _exhaustive: never = format;
        throw new Error(`Unsupported format: ${_exhaustive}`);
      }
    }
  } finally {
    if (format === 'pdf' || format === 'png') {
      await closeBrowser();
    }
  }
}
