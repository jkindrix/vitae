import { chromium, type Browser } from 'playwright';
import { writeFile } from 'fs/promises';
import { renderStandaloneHtml } from './renderer.js';
import { PdfError } from './errors.js';
import type { Resume } from '../types/index.js';

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
 * Generate a PDF from a resume
 */
export async function generatePdf(
  resume: Resume,
  themeName: string,
  outputPath: string,
  options: PdfOptions = {}
): Promise<void> {
  const mergedOptions = { ...defaultOptions, ...options };
  const debug = createDebugLogger(options.debug ?? false);
  const totalStart = Date.now();

  debug.log(`Starting PDF generation for ${resume.meta.name}`);
  debug.log(`Theme: ${themeName}, Output: ${outputPath}`);
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
  const consoleMessages: string[] = [];

  // Capture console messages in debug mode
  if (options.debug) {
    page.on('console', (msg) => {
      const text = `[${msg.type()}] ${msg.text()}`;
      consoleMessages.push(text);
      debug.log(`Browser console: ${text}`);
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

    // Generate PDF
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

    if (options.debug && consoleMessages.length > 0) {
      debug.log(`Captured ${consoleMessages.length} console message(s)`);
    }
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
  resume: Resume,
  themeName: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const mergedOptions = { ...defaultOptions, ...options };
  const debug = createDebugLogger(options.debug ?? false);
  const totalStart = Date.now();

  debug.log(`Starting PDF buffer generation for ${resume.meta.name}`);

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
    const contentStart = Date.now();
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });
    debug.timing('Page content load', contentStart);

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
