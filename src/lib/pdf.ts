import { chromium, type Browser, type Page } from 'playwright';
import { renderStandaloneHtml } from './renderer.js';
import type { Resume } from '../types/index.js';

let browser: Browser | null = null;

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
}

const defaultOptions: Required<PdfOptions> = {
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
  const html = await renderStandaloneHtml(resume, themeName);

  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    // Set content and wait for any fonts/resources to load
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    // Force print color mode for accurate colors
    await page.emulateMedia({ media: 'print', colorScheme: 'light' });

    // Generate PDF
    await page.pdf({
      path: outputPath,
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: mergedOptions.scale,
    });
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
  const html = await renderStandaloneHtml(resume, themeName);

  const browserInstance = await getBrowser();
  const page = await browserInstance.newPage();

  try {
    await page.setContent(html, {
      waitUntil: 'networkidle',
    });

    await page.emulateMedia({ media: 'print', colorScheme: 'light' });

    const buffer = await page.pdf({
      format: mergedOptions.format,
      margin: mergedOptions.margin,
      printBackground: mergedOptions.printBackground,
      scale: mergedOptions.scale,
    });

    return Buffer.from(buffer);
  } finally {
    await page.close();
  }
}
