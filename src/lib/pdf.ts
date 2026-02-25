import { chromium, type Browser, type Page } from 'playwright';
import { writeFile } from 'fs/promises';
import { renderStandaloneHtml } from './renderer.js';
import { PdfError } from './errors.js';
import type { NormalizedResume } from '../types/index.js';

/**
 * Result metadata from PDF generation
 */
export interface PdfResult {
  pageCount: number;
  scale: number;
  outputPath?: string;
}

/**
 * Result metadata from PDF buffer generation
 */
export interface PdfBufferResult extends PdfResult {
  buffer: Buffer;
}

let browser: Browser | null = null;

/**
 * Debug logger for PDF generation
 */
interface DebugLogger {
  log: (message: string) => void;
  timing: (label: string, startTime: number) => void;
}

function createDebugLogger(enabled: boolean): DebugLogger {
  if (!enabled) {
    // No-op logger for non-debug mode
    const noop = (): void => {
      // Intentionally empty - no logging when debug is disabled
    };
    return {
      log: noop,
      timing: noop,
    };
  }

  return {
    log: (message: string) => {
      console.log(`[PDF Debug] ${message}`);
    },
    timing: (label: string, startTime: number) => {
      const elapsed = Date.now() - startTime;
      console.log(`[PDF Debug] ${label}: ${elapsed}ms`);
    },
  };
}

/**
 * Get or create a browser instance
 */
async function getBrowser(): Promise<Browser> {
  if (!browser) {
    browser = await chromium.launch({
      headless: true,
    });
  }
  return browser;
}

/**
 * Close the browser instance
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
  }
}

export interface PdfOptions {
  /**
   * Paper format (default: 'Letter')
   */
  format?: 'Letter' | 'A4' | 'Legal';

  /**
   * Page margins
   */
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };

  /**
   * Print background colors and images (default: true)
   */
  printBackground?: boolean;

  /**
   * Scale of the webpage rendering (default: 1)
   */
  scale?: number;

  /**
   * Enable debug mode with verbose logging
   */
  debug?: boolean;

  /**
   * Path to save intermediate HTML for debugging
   * Only used when debug is true
   */
  saveHtml?: string;

  /**
   * Path to save screenshot before PDF generation
   * Only used when debug is true
   */
  screenshot?: string;

  /**
   * Theme layout variant name
   */
  layout?: string;

  /**
   * CSS custom property overrides from variant style config
   */
  styleOverrides?: Record<string, string>;

  /**
   * Target number of pages (default: 1). Used for warnings and fit scaling.
   */
  targetPages?: number;

  /**
   * Auto-scale content to fit within targetPages (default: false)
   */
  fit?: boolean;

  /**
   * Minimum scale factor when fit is enabled (default: 0.80)
   */
  scaleFloor?: number;
}

interface DefaultPdfOptions {
  format: 'Letter' | 'A4' | 'Legal';
  margin: {
    top: string;
    right: string;
    bottom: string;
    left: string;
  };
  printBackground: boolean;
  scale: number;
}

const defaultOptions: DefaultPdfOptions = {
  format: 'Letter',
  margin: {
    top: '0.5in',
    right: '0.5in',
    bottom: '0.5in',
    left: '0.5in',
  },
  printBackground: true,
  scale: 1,
};

/**
 * Page dimensions in inches for supported paper formats
 */
const PAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  Letter: { width: 8.5, height: 11 },
  A4: { width: 8.27, height: 11.69 },
  Legal: { width: 8.5, height: 14 },
};

/**
 * Parse a CSS inch value (e.g., "0.5in") to a number
 */
function parseInches(value: string | undefined): number {
  if (!value) return 0;
  const match = value.match(/^([\d.]+)in$/);
  return match?.[1] != null ? parseFloat(match[1]) : 0;
}

/**
 * Count the number of pages in a PDF buffer by scanning for /Type /Page markers.
 * Excludes /Type /Pages (the page tree root).
 */
export function countPdfPages(buffer: Buffer): number {
  const str = buffer.toString('binary');
  const matches = str.match(/\/Type\s*\/Page(?!s)/g);
  return matches ? matches.length : 0;
}

/**
 * Measure the content height of a page in pixels.
 * Sets viewport width to match the paper's usable width for accurate reflow.
 */
async function measureContentHeight(
  page: Page,
  mergedOptions: DefaultPdfOptions
): Promise<number> {
  const dims = PAGE_DIMENSIONS[mergedOptions.format] ?? PAGE_DIMENSIONS['Letter']!;
  const marginLeft = parseInches(mergedOptions.margin.left);
  const marginRight = parseInches(mergedOptions.margin.right);
  const usableWidthInches = dims.width - marginLeft - marginRight;
  const usableWidthPx = Math.floor(usableWidthInches * 96);

  await page.setViewportSize({ width: usableWidthPx, height: 800 });
  await page.emulateMedia({ media: 'print', colorScheme: 'light' });

  return page.evaluate('document.documentElement.scrollHeight') as Promise<number>;
}

/**
 * Calculate the scale factor needed to fit content within targetPages.
 * Returns a value clamped between scaleFloor and 1.0.
 */
function calculateFitScale(
  contentHeightPx: number,
  mergedOptions: DefaultPdfOptions,
  targetPages: number,
  scaleFloor: number
): number {
  const dims = PAGE_DIMENSIONS[mergedOptions.format] ?? PAGE_DIMENSIONS['Letter']!;
  const marginTop = parseInches(mergedOptions.margin.top);
  const marginBottom = parseInches(mergedOptions.margin.bottom);
  const usableHeightInches = dims.height - marginTop - marginBottom;
  const usableHeightPx = usableHeightInches * 96;

  const totalUsableHeight = usableHeightPx * targetPages;
  const scale = totalUsableHeight / contentHeightPx;

  return Math.max(scaleFloor, Math.min(1.0, scale));
}

/**
 * Prepared page context for PDF generation
 */
interface PreparedPage {
  page: Page;
  mergedOptions: DefaultPdfOptions;
  debug: DebugLogger;
}

/**
 * Prepare a browser page from raw HTML string
 * This is the low-level setup shared by all PDF/PNG generation functions
 */
async function prepareHtmlPage(
  html: string,
  options: PdfOptions
): Promise<PreparedPage> {
  const mergedOptions: DefaultPdfOptions = {
    format: options.format ?? defaultOptions.format,
    margin: {
      top: options.margin?.top ?? defaultOptions.margin.top,
      right: options.margin?.right ?? defaultOptions.margin.right,
      bottom: options.margin?.bottom ?? defaultOptions.margin.bottom,
      left: options.margin?.left ?? defaultOptions.margin.left,
    },
    printBackground: options.printBackground ?? defaultOptions.printBackground,
    scale: options.scale ?? defaultOptions.scale,
  };
  const debug = createDebugLogger(options.debug ?? false);

  debug.log(`Options: format=${mergedOptions.format}, scale=${mergedOptions.scale}`);

  // Save intermediate HTML if requested
  if (options.debug && options.saveHtml) {
    try {
      await writeFile(options.saveHtml, html, 'utf-8');
      debug.log(`Saved intermediate HTML to ${options.saveHtml}`);
    } catch (error) {
      debug.log(
        `Warning: Could not save HTML: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  // Get browser instance
  let browserInstance: Browser;
  try {
    const browserStart = Date.now();
    browserInstance = await getBrowser();
    debug.timing('Browser acquisition', browserStart);
  } catch (error) {
    throw new PdfError(
      `Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }

  const page = await browserInstance.newPage();

  // Capture console messages in debug mode
  if (options.debug) {
    page.on('console', (msg) => {
      debug.log(`Browser console: [${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      debug.log(`Page error: ${error.message}`);
    });
  }

  try {
    // Set content and wait for any fonts/resources to load
    const contentStart = Date.now();
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });
    debug.timing('Page content load', contentStart);

    // Force print color mode for accurate colors
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });

    // Take screenshot if requested
    if (options.debug && options.screenshot) {
      try {
        await page.screenshot({ path: options.screenshot, fullPage: true });
        debug.log(`Saved screenshot to ${options.screenshot}`);
      } catch (error) {
        debug.log(
          `Warning: Could not save screenshot: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    return { page, mergedOptions, debug };
  } catch (error) {
    await page.close();
    throw new PdfError(
      `Failed to prepare page: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Render resume HTML and prepare a browser page for PDF generation
 */
async function preparePdfPage(
  resume: NormalizedResume,
  themeName: string,
  options: PdfOptions
): Promise<PreparedPage> {
  const debug = createDebugLogger(options.debug ?? false);
  debug.log(`Starting PDF preparation for ${resume.meta.name}`);
  debug.log(`Theme: ${themeName}`);

  let html: string;
  try {
    const renderStart = Date.now();
    const renderOpts: import('./renderer.js').RenderOptions = {};
    if (options.layout) renderOpts.variant = options.layout;
    if (options.styleOverrides) renderOpts.styleOverrides = options.styleOverrides;
    const hasRenderOpts = options.layout || options.styleOverrides;
    html = await renderStandaloneHtml(resume, themeName, hasRenderOpts ? renderOpts : undefined);
    debug.timing('HTML rendering', renderStart);
  } catch (error) {
    throw new PdfError(
      `Failed to render HTML: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }

  return prepareHtmlPage(html, options);
}

/**
 * Generate a PDF from a resume and save to file
 */
export async function generatePdf(
  resume: NormalizedResume,
  themeName: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<PdfResult> {
  const totalStart = Date.now();
  const { page, mergedOptions, debug } = await preparePdfPage(resume, themeName, options);

  debug.log(`Output: ${outputPath}`);

  const targetPages = options.targetPages ?? 1;
  const scaleFloor = options.scaleFloor ?? 0.80;
  let finalScale = mergedOptions.scale;

  try {
    // If fit mode is enabled, measure content and calculate scale
    if (options.fit) {
      const measureStart = Date.now();
      const contentHeight = await measureContentHeight(page, mergedOptions);
      debug.timing('Content measurement', measureStart);
      debug.log(`Content height: ${contentHeight}px`);

      finalScale = calculateFitScale(contentHeight, mergedOptions, targetPages, scaleFloor);
      debug.log(`Fit scale: ${finalScale.toFixed(3)}`);
    }

    const pdfStart = Date.now();
    const buffer = await page.pdf({
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: finalScale,
    });
    debug.timing('PDF generation', pdfStart);

    const pdfBuffer = Buffer.from(buffer);
    const pageCount = countPdfPages(pdfBuffer);
    debug.log(`Page count: ${pageCount}`);

    await writeFile(outputPath, pdfBuffer);
    debug.timing('Total PDF generation', totalStart);

    return { pageCount, scale: finalScale, outputPath };
  } catch (error) {
    throw new PdfError(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    await page.close();
  }
}

/**
 * Generate PDF and return as Buffer (useful for preview/streaming)
 */
export async function generatePdfBuffer(
  resume: NormalizedResume,
  themeName: string,
  options: PdfOptions = {}
): Promise<PdfBufferResult> {
  const totalStart = Date.now();
  const { page, mergedOptions, debug } = await preparePdfPage(resume, themeName, options);

  const targetPages = options.targetPages ?? 1;
  const scaleFloor = options.scaleFloor ?? 0.80;
  let finalScale = mergedOptions.scale;

  try {
    // If fit mode is enabled, measure content and calculate scale
    if (options.fit) {
      const measureStart = Date.now();
      const contentHeight = await measureContentHeight(page, mergedOptions);
      debug.timing('Content measurement', measureStart);
      debug.log(`Content height: ${contentHeight}px`);

      finalScale = calculateFitScale(contentHeight, mergedOptions, targetPages, scaleFloor);
      debug.log(`Fit scale: ${finalScale.toFixed(3)}`);
    }

    const pdfStart = Date.now();
    const buffer = await page.pdf({
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: finalScale,
    });
    debug.timing('PDF generation', pdfStart);
    debug.timing('Total PDF buffer generation', totalStart);

    const pdfBuffer = Buffer.from(buffer);
    const pageCount = countPdfPages(pdfBuffer);
    debug.log(`Page count: ${pageCount}`);

    return { buffer: pdfBuffer, pageCount, scale: finalScale };
  } catch (error) {
    throw new PdfError(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    await page.close();
  }
}

/**
 * Generate a PNG screenshot from a resume
 */
export async function generatePng(
  resume: NormalizedResume,
  themeName: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<void> {
  const { page, debug } = await preparePdfPage(resume, themeName, options);

  debug.log(`Generating PNG: ${outputPath}`);

  try {
    // Use screen media for PNG (preparePdfPage sets print media for PDF)
    await page.emulateMedia({ media: 'screen', colorScheme: 'light' });

    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    debug.log(`PNG saved to ${outputPath}`);
  } catch (error) {
    throw new PdfError(
      `Failed to generate PNG: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    await page.close();
  }
}

/**
 * Generate a PDF from a standalone HTML string and save to file
 */
export async function generatePdfFromHtml(
  html: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<PdfResult> {
  const totalStart = Date.now();
  const { page, mergedOptions, debug } = await prepareHtmlPage(html, options);

  debug.log(`Output: ${outputPath}`);

  const targetPages = options.targetPages ?? 1;
  const scaleFloor = options.scaleFloor ?? 0.80;
  let finalScale = mergedOptions.scale;

  try {
    // If fit mode is enabled, measure content and calculate scale
    if (options.fit) {
      const measureStart = Date.now();
      const contentHeight = await measureContentHeight(page, mergedOptions);
      debug.timing('Content measurement', measureStart);
      debug.log(`Content height: ${contentHeight}px`);

      finalScale = calculateFitScale(contentHeight, mergedOptions, targetPages, scaleFloor);
      debug.log(`Fit scale: ${finalScale.toFixed(3)}`);
    }

    const pdfStart = Date.now();
    const buffer = await page.pdf({
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: finalScale,
    });
    debug.timing('PDF generation', pdfStart);

    const pdfBuffer = Buffer.from(buffer);
    const pageCount = countPdfPages(pdfBuffer);
    debug.log(`Page count: ${pageCount}`);

    await writeFile(outputPath, pdfBuffer);
    debug.timing('Total PDF generation', totalStart);

    return { pageCount, scale: finalScale, outputPath };
  } catch (error) {
    throw new PdfError(
      `Failed to generate PDF: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    await page.close();
  }
}

/**
 * Generate a PNG screenshot from a standalone HTML string
 */
export async function generatePngFromHtml(
  html: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<void> {
  const { page, debug } = await prepareHtmlPage(html, options);

  debug.log(`Generating PNG: ${outputPath}`);

  try {
    await page.emulateMedia({ media: 'screen', colorScheme: 'light' });

    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });

    debug.log(`PNG saved to ${outputPath}`);
  } catch (error) {
    throw new PdfError(
      `Failed to generate PNG: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  } finally {
    await page.close();
  }
}
