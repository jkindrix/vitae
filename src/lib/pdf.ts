import { chromium, type Browser, type Page } from 'playwright';
import { writeFile } from 'fs/promises';
import { renderStandaloneHtml } from './renderer.js';
import { PdfError } from './errors.js';
import type { NormalizedResume } from '../types/index.js';

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
 * Prepared page context for PDF generation
 */
interface PreparedPage {
  page: Page;
  mergedOptions: DefaultPdfOptions;
  debug: DebugLogger;
}

/**
 * Render HTML and prepare a browser page for PDF generation
 * This is the common setup logic shared by generatePdf and generatePdfBuffer
 */
async function preparePdfPage(
  resume: NormalizedResume,
  themeName: string,
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

  debug.log(`Starting PDF preparation for ${resume.meta.name}`);
  debug.log(`Theme: ${themeName}`);
  debug.log(`Options: format=${mergedOptions.format}, scale=${mergedOptions.scale}`);

  // Render HTML
  let html: string;
  try {
    const renderStart = Date.now();
    html = await renderStandaloneHtml(resume, themeName);
    debug.timing('HTML rendering', renderStart);
  } catch (error) {
    throw new PdfError(
      `Failed to render HTML: ${error instanceof Error ? error.message : String(error)}`,
      error instanceof Error ? error : undefined
    );
  }

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
 * Generate a PDF from a resume and save to file
 */
export async function generatePdf(
  resume: NormalizedResume,
  themeName: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<void> {
  const totalStart = Date.now();
  const { page, mergedOptions, debug } = await preparePdfPage(resume, themeName, options);

  debug.log(`Output: ${outputPath}`);

  try {
    const pdfStart = Date.now();
    await page.pdf({
      path: outputPath,
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: mergedOptions.scale,
    });
    debug.timing('PDF generation', pdfStart);
    debug.timing('Total PDF generation', totalStart);
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
): Promise<Buffer> {
  const totalStart = Date.now();
  const { page, mergedOptions, debug } = await preparePdfPage(resume, themeName, options);

  try {
    const pdfStart = Date.now();
    const buffer = await page.pdf({
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: mergedOptions.scale,
    });
    debug.timing('PDF generation', pdfStart);
    debug.timing('Total PDF buffer generation', totalStart);

    return Buffer.from(buffer);
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
