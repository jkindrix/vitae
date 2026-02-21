/**
 * Accessibility (WCAG) auditor.
 *
 * Performs static analysis on rendered standalone HTML to produce a WCAG
 * compliance score across six categories: document structure, color contrast,
 * links & navigation, semantic HTML, typography & readability, and images & media.
 *
 * Operates on the HTML string output of renderStandaloneHtml() or
 * renderCoverLetterStandaloneHtml(). Uses linkedom for lightweight DOM parsing.
 */

import { parseHTML } from 'linkedom';
import type {
  A11yResult,
  A11yAuditOptions,
  A11yCategoryScore,
  A11yFinding,
  A11yContrastPair,
  A11yCategory,
  A11ySeverity,
} from '../types/a11y.js';

/** DOM document type from linkedom (avoids dependency on DOM lib types). */
type DomDocument = ReturnType<typeof parseHTML>['document'];

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Audit an HTML string for WCAG accessibility compliance. */
export function auditAccessibility(
  html: string,
  options?: A11yAuditOptions
): A11yResult {
  const { document: doc } = parseHTML(html);
  const level = options?.level ?? 'AA';

  const structureScore = analyzeDocumentStructure(doc, html);
  const contrastResult = analyzeColorContrast(doc, level);
  const linksScore = analyzeLinksNavigation(doc);
  const semanticScore = analyzeSemanticHtml(doc);
  const typographyScore = analyzeTypographyReadability(doc);
  const imagesScore = analyzeImagesMedia(doc);

  const categories: A11yCategoryScore[] = [
    structureScore,
    contrastResult.categoryScore,
    linksScore,
    semanticScore,
    typographyScore,
    imagesScore,
  ];

  const findings = categories.flatMap((c) => c.findings);
  const score = computeOverallScore(categories);

  return {
    score,
    categories,
    findings,
    contrastPairs: contrastResult.contrastPairs,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function finding(
  category: A11yCategory,
  severity: A11ySeverity,
  message: string
): A11yFinding {
  return { category, severity, message };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computeOverallScore(categories: A11yCategoryScore[]): number {
  const totalWeight = categories.reduce((sum, c) => sum + c.weight, 0);
  const weightedSum = categories.reduce(
    (sum, c) => sum + c.score * c.weight,
    0
  );
  return Math.round(weightedSum / totalWeight);
}

// ---------------------------------------------------------------------------
// Color utilities (exported for testing and programmatic use)
// ---------------------------------------------------------------------------

/**
 * Parse a CSS color string (#rgb, #rrggbb, rgb(r,g,b)) to [R, G, B] in 0-1 range.
 * Returns null for unsupported formats.
 */
export function parseColor(color: string): [number, number, number] | null {
  const trimmed = color.trim();

  // #rrggbb
  const hex6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(trimmed);
  if (hex6) {
    return [
      parseInt(hex6[1]!, 16) / 255,
      parseInt(hex6[2]!, 16) / 255,
      parseInt(hex6[3]!, 16) / 255,
    ];
  }

  // #rgb
  const hex3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(trimmed);
  if (hex3) {
    return [
      parseInt(hex3[1]! + hex3[1]!, 16) / 255,
      parseInt(hex3[2]! + hex3[2]!, 16) / 255,
      parseInt(hex3[3]! + hex3[3]!, 16) / 255,
    ];
  }

  // rgb(r, g, b) or rgb(r g b)
  const rgbMatch = /^rgb\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*\)$/i.exec(trimmed);
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]!, 10) / 255,
      parseInt(rgbMatch[2]!, 10) / 255,
      parseInt(rgbMatch[3]!, 10) / 255,
    ];
  }

  return null;
}

/** Convert sRGB component to linear RGB. */
function sRGBtoLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Calculate relative luminance per WCAG 2.1. */
export function relativeLuminance(r: number, g: number, b: number): number {
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b);
}

/** Calculate contrast ratio between two luminance values. */
export function contrastRatio(l1: number, l2: number): number {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract CSS custom properties from all <style> blocks in an HTML string.
 * Later declarations override earlier ones (theme overrides win).
 */
export function extractCssCustomProperties(html: string): Record<string, string> {
  const props: Record<string, string> = {};
  const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch: RegExpExecArray | null;

  while ((styleMatch = styleRegex.exec(html)) !== null) {
    const css = styleMatch[1]!;
    const propRegex = /(--[\w-]+)\s*:\s*([^;]+)/g;
    let propMatch: RegExpExecArray | null;
    while ((propMatch = propRegex.exec(css)) !== null) {
      props[propMatch[1]!] = propMatch[2]!.trim();
    }
  }

  return props;
}

// ---------------------------------------------------------------------------
// Category: Document Structure (weight 20)
// ---------------------------------------------------------------------------

function analyzeDocumentStructure(
  doc: DomDocument,
  html: string
): A11yCategoryScore {
  const findings: A11yFinding[] = [];
  let score = 100;

  // DOCTYPE
  if (!/^<!DOCTYPE\s+html>/i.test(html.trimStart())) {
    score -= 15;
    findings.push(
      finding('document-structure', 'error', 'Missing <!DOCTYPE html> declaration')
    );
  }

  // lang attribute
  const lang = doc.documentElement?.getAttribute('lang');
  if (!lang) {
    score -= 20;
    findings.push(
      finding('document-structure', 'error', 'Missing lang attribute on <html> element')
    );
  }

  // charset meta
  if (!doc.querySelector('meta[charset]')) {
    score -= 10;
    findings.push(
      finding('document-structure', 'warning', 'Missing <meta charset> declaration')
    );
  }

  // viewport meta
  if (!doc.querySelector('meta[name="viewport"]')) {
    score -= 10;
    findings.push(
      finding('document-structure', 'warning', 'Missing <meta name="viewport"> declaration')
    );
  }

  // Exactly one h1
  const h1s = doc.querySelectorAll('h1');
  if (h1s.length === 0) {
    score -= 15;
    findings.push(
      finding('document-structure', 'error', 'No <h1> element found')
    );
  } else if (h1s.length > 1) {
    score -= 15;
    findings.push(
      finding(
        'document-structure',
        'error',
        `Multiple <h1> elements found (${h1s.length}); a page should have exactly one`
      )
    );
  }

  // Heading hierarchy — no skipping levels
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let prevLevel = 0;
  let hierarchyViolations = 0;
  for (const heading of headings) {
    const level = parseInt(heading.tagName.charAt(1), 10);
    if (prevLevel > 0 && level > prevLevel + 1) {
      hierarchyViolations++;
    }
    prevLevel = level;
  }
  if (hierarchyViolations > 0) {
    score -= 10;
    findings.push(
      finding(
        'document-structure',
        'warning',
        `Heading hierarchy skips levels (${hierarchyViolations} violation${hierarchyViolations > 1 ? 's' : ''}); headings should be sequential`
      )
    );
  }

  // Title element
  const title = doc.querySelector('title');
  if (!title || !title.textContent?.trim()) {
    score -= 10;
    findings.push(
      finding('document-structure', 'warning', 'Missing or empty <title> element')
    );
  }

  // Semantic elements
  const hasArticle = !!doc.querySelector('article');
  const hasSection = !!doc.querySelector('section');
  const hasHeader = !!doc.querySelector('header');
  if (!hasArticle && !hasSection && !hasHeader) {
    score -= 10;
    findings.push(
      finding(
        'document-structure',
        'suggestion',
        'No semantic landmark elements (<article>, <section>, <header>) found'
      )
    );
  }

  return {
    category: 'document-structure',
    label: 'Document Structure',
    score: clamp(score, 0, 100),
    weight: 20,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Color Contrast (weight 25)
// ---------------------------------------------------------------------------

/** Known foreground/background pairs to check. */
const CONTRAST_PAIRS: Array<{
  fg: string;
  bg: string;
  element: string;
  largeText?: boolean;
}> = [
  { fg: '--color-text', bg: '--color-background', element: 'Primary text' },
  { fg: '--color-text-secondary', bg: '--color-background', element: 'Secondary text' },
  { fg: '--color-text-muted', bg: '--color-background', element: 'Muted text' },
  { fg: '--color-accent', bg: '--color-background', element: 'Links / accent' },
  // Modern theme sidebar pairs
  { fg: '--color-sidebar-text', bg: '--color-sidebar-bg', element: 'Sidebar text' },
  { fg: '--color-sidebar-muted', bg: '--color-sidebar-bg', element: 'Sidebar muted text' },
];

function analyzeColorContrast(
  doc: DomDocument,
  level: 'AA' | 'AAA'
): { categoryScore: A11yCategoryScore; contrastPairs: A11yContrastPair[] } {
  const findings: A11yFinding[] = [];
  const contrastPairs: A11yContrastPair[] = [];
  let score = 100;

  // Extract CSS custom properties from the full HTML
  const html = doc.documentElement?.outerHTML ?? '';
  const fullHtml = '<!DOCTYPE html>' + html;
  const props = extractCssCustomProperties(fullHtml);

  // If we have no CSS properties at all, we can't check contrast
  if (!props['--color-text'] && !props['--color-background']) {
    findings.push(
      finding(
        'color-contrast',
        'suggestion',
        'No CSS custom properties found for color contrast analysis'
      )
    );
    return {
      categoryScore: {
        category: 'color-contrast',
        label: 'Color Contrast',
        score: clamp(score, 0, 100),
        weight: 25,
        findings,
      },
      contrastPairs,
    };
  }

  // Normal text threshold: AA = 4.5:1, AAA = 7:1
  // Large text threshold: AA = 3:1, AAA = 4.5:1
  const normalRequired = level === 'AAA' ? 7 : 4.5;
  const largeRequired = level === 'AAA' ? 4.5 : 3;

  for (const pair of CONTRAST_PAIRS) {
    const fgColor = props[pair.fg];
    const bgColor = props[pair.bg];

    // Skip pairs where either variable is absent (theme doesn't use these)
    if (!fgColor || !bgColor) continue;

    const fgRgb = parseColor(fgColor);
    const bgRgb = parseColor(bgColor);

    if (!fgRgb || !bgRgb) {
      findings.push(
        finding(
          'color-contrast',
          'suggestion',
          `Cannot parse colors for ${pair.element}: ${pair.fg}=${fgColor}, ${pair.bg}=${bgColor}`
        )
      );
      continue;
    }

    const fgLum = relativeLuminance(...fgRgb);
    const bgLum = relativeLuminance(...bgRgb);
    const ratio = contrastRatio(fgLum, bgLum);
    const required = pair.largeText ? largeRequired : normalRequired;
    const passes = ratio >= required;

    contrastPairs.push({
      foreground: fgColor,
      background: bgColor,
      ratio: Math.round(ratio * 100) / 100,
      required,
      element: pair.element,
      passes,
    });

    if (!passes) {
      if (ratio < 3) {
        score -= 20;
        findings.push(
          finding(
            'color-contrast',
            'error',
            `${pair.element}: contrast ratio ${ratio.toFixed(2)}:1 is below minimum 3:1 (${fgColor} on ${bgColor})`
          )
        );
      } else {
        score -= 15;
        findings.push(
          finding(
            'color-contrast',
            'warning',
            `${pair.element}: contrast ratio ${ratio.toFixed(2)}:1 below ${required}:1 ${level} threshold (${fgColor} on ${bgColor})`
          )
        );
      }
    }
  }

  return {
    categoryScore: {
      category: 'color-contrast',
      label: 'Color Contrast',
      score: clamp(score, 0, 100),
      weight: 25,
      findings,
    },
    contrastPairs,
  };
}

// ---------------------------------------------------------------------------
// Category: Links & Navigation (weight 15)
// ---------------------------------------------------------------------------

function analyzeLinksNavigation(doc: DomDocument): A11yCategoryScore {
  const findings: A11yFinding[] = [];
  let score = 100;

  const links = doc.querySelectorAll('a');
  let emptyCount = 0;
  let bareUrlCount = 0;
  let missingRelCount = 0;

  // Track link text → set of hrefs for duplicate detection
  const textToHrefs = new Map<string, Set<string>>();

  for (const link of links) {
    const text = (link.textContent?.trim() ?? '');
    const ariaLabel = link.getAttribute('aria-label')?.trim() ?? '';
    const href = link.getAttribute('href') ?? '';

    // Empty link text
    if (!text && !ariaLabel) {
      emptyCount++;
    }

    // Bare URL as link text
    if (text && /^https?:\/\//i.test(text)) {
      bareUrlCount++;
    }

    // External links should have rel="noopener"
    if (href && /^https?:\/\//i.test(href)) {
      const rel = link.getAttribute('rel') ?? '';
      if (!rel.includes('noopener')) {
        missingRelCount++;
      }
    }

    // Duplicate link text tracking
    const accessibleText = text || ariaLabel;
    if (accessibleText && href) {
      const normalized = accessibleText.toLowerCase();
      if (!textToHrefs.has(normalized)) {
        textToHrefs.set(normalized, new Set());
      }
      textToHrefs.get(normalized)!.add(href);
    }
  }

  if (emptyCount > 0) {
    score -= Math.min(emptyCount * 15, 30);
    findings.push(
      finding(
        'links-navigation',
        'error',
        `${emptyCount} link${emptyCount > 1 ? 's' : ''} with no accessible text`
      )
    );
  }

  if (bareUrlCount > 0) {
    score -= Math.min(bareUrlCount * 10, 20);
    findings.push(
      finding(
        'links-navigation',
        'warning',
        `${bareUrlCount} link${bareUrlCount > 1 ? 's' : ''} using bare URL as display text`
      )
    );
  }

  if (missingRelCount > 0) {
    score -= Math.min(missingRelCount * 5, 15);
    findings.push(
      finding(
        'links-navigation',
        'suggestion',
        `${missingRelCount} external link${missingRelCount > 1 ? 's' : ''} missing rel="noopener"`
      )
    );
  }

  // Check duplicate link text
  let duplicateCount = 0;
  for (const [, hrefs] of textToHrefs) {
    if (hrefs.size > 1) {
      duplicateCount++;
    }
  }
  if (duplicateCount > 0) {
    score -= Math.min(duplicateCount * 5, 15);
    findings.push(
      finding(
        'links-navigation',
        'suggestion',
        `${duplicateCount} link text${duplicateCount > 1 ? 's' : ''} used for multiple different URLs`
      )
    );
  }

  return {
    category: 'links-navigation',
    label: 'Links & Navigation',
    score: clamp(score, 0, 100),
    weight: 15,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Semantic HTML (weight 20)
// ---------------------------------------------------------------------------

const PRESENTATIONAL_TAGS = new Set(['b', 'i', 'font', 'center', 'big', 'small', 'strike', 'tt', 'u']);

function analyzeSemanticHtml(doc: DomDocument): A11yCategoryScore {
  const findings: A11yFinding[] = [];
  let score = 100;

  // Sections should have headings
  const sections = doc.querySelectorAll('section');
  let sectionsWithoutHeading = 0;
  for (const section of sections) {
    const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
    if (!heading) {
      sectionsWithoutHeading++;
    }
  }
  if (sectionsWithoutHeading > 0) {
    score -= Math.min(sectionsWithoutHeading * 10, 20);
    findings.push(
      finding(
        'semantic-html',
        'warning',
        `${sectionsWithoutHeading} <section> element${sectionsWithoutHeading > 1 ? 's' : ''} without a heading`
      )
    );
  }

  // Empty headings
  const headings = doc.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let emptyHeadings = 0;
  for (const h of headings) {
    if (!h.textContent?.trim()) {
      emptyHeadings++;
    }
  }
  if (emptyHeadings > 0) {
    score -= Math.min(emptyHeadings * 15, 30);
    findings.push(
      finding(
        'semantic-html',
        'error',
        `${emptyHeadings} empty heading${emptyHeadings > 1 ? 's' : ''} found`
      )
    );
  }

  // Empty list items
  const listItems = doc.querySelectorAll('li');
  let emptyLi = 0;
  for (const li of listItems) {
    if (!li.textContent?.trim()) {
      emptyLi++;
    }
  }
  if (emptyLi > 0) {
    score -= Math.min(emptyLi * 10, 20);
    findings.push(
      finding(
        'semantic-html',
        'warning',
        `${emptyLi} empty list item${emptyLi > 1 ? 's' : ''} found`
      )
    );
  }

  // Orphaned list items (li not inside ul or ol)
  let orphanedLi = 0;
  for (const li of listItems) {
    const parent = li.parentElement;
    if (parent && parent.tagName !== 'UL' && parent.tagName !== 'OL') {
      orphanedLi++;
    }
  }
  if (orphanedLi > 0) {
    score -= Math.min(orphanedLi * 10, 20);
    findings.push(
      finding(
        'semantic-html',
        'error',
        `${orphanedLi} <li> element${orphanedLi > 1 ? 's' : ''} not inside a <ul> or <ol>`
      )
    );
  }

  // Presentational elements
  let presentational = 0;
  for (const tag of PRESENTATIONAL_TAGS) {
    const els = doc.querySelectorAll(tag);
    presentational += els.length;
  }
  if (presentational > 0) {
    score -= Math.min(presentational * 5, 15);
    findings.push(
      finding(
        'semantic-html',
        'suggestion',
        `${presentational} presentational element${presentational > 1 ? 's' : ''} found; prefer semantic elements (<strong>, <em>)`
      )
    );
  }

  return {
    category: 'semantic-html',
    label: 'Semantic HTML',
    score: clamp(score, 0, 100),
    weight: 20,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Typography & Readability (weight 10)
// ---------------------------------------------------------------------------

/** Parse a CSS length value and return the value in pt. */
function parsePt(value: string): number | null {
  const ptMatch = /^([\d.]+)\s*pt$/i.exec(value.trim());
  if (ptMatch) return parseFloat(ptMatch[1]!);

  const pxMatch = /^([\d.]+)\s*px$/i.exec(value.trim());
  if (pxMatch) return parseFloat(pxMatch[1]!) * 0.75; // 1px = 0.75pt

  const remMatch = /^([\d.]+)\s*rem$/i.exec(value.trim());
  if (remMatch) return parseFloat(remMatch[1]!) * 12; // assume 16px base = 12pt

  return null;
}

/** Parse a CSS line-height value (unitless or with unit). */
function parseLineHeight(value: string): number | null {
  const trimmed = value.trim();
  const num = parseFloat(trimmed);
  if (isNaN(num)) return null;

  // Unitless number (e.g., "1.5")
  if (/^[\d.]+$/.test(trimmed)) return num;

  // Percentage (e.g., "150%")
  if (trimmed.endsWith('%')) return num / 100;

  return num;
}

function analyzeTypographyReadability(doc: DomDocument): A11yCategoryScore {
  const findings: A11yFinding[] = [];
  let score = 100;

  const html = doc.documentElement?.outerHTML ?? '';
  const props = extractCssCustomProperties('<!DOCTYPE html>' + html);

  // Base font size
  const baseFontSize = props['--font-size-base'];
  if (baseFontSize) {
    const pt = parsePt(baseFontSize);
    if (pt !== null && pt < 9) {
      score -= 20;
      findings.push(
        finding(
          'typography-readability',
          'error',
          `Base font size (${baseFontSize}) is below 9pt minimum for readability`
        )
      );
    } else if (pt !== null && pt < 10) {
      score -= 10;
      findings.push(
        finding(
          'typography-readability',
          'warning',
          `Base font size (${baseFontSize}) is small; 10pt or larger recommended`
        )
      );
    }
  }

  // Line height
  const lineHeight = props['--line-height-normal'];
  if (lineHeight) {
    const parsed = parseLineHeight(lineHeight);
    if (parsed !== null && parsed < 1.2) {
      score -= 15;
      findings.push(
        finding(
          'typography-readability',
          'warning',
          `Normal line height (${lineHeight}) is below 1.2 minimum (WCAG 1.4.12)`
        )
      );
    }
  }

  // Tight line height
  const tightLineHeight = props['--line-height-tight'];
  if (tightLineHeight) {
    const parsed = parseLineHeight(tightLineHeight);
    if (parsed !== null && parsed < 1.15) {
      score -= 10;
      findings.push(
        finding(
          'typography-readability',
          'suggestion',
          `Tight line height (${tightLineHeight}) is below 1.15; may impact readability`
        )
      );
    }
  }

  // Generic font fallback
  const fontSans = props['--font-sans'];
  if (fontSans) {
    const hasGeneric = /\b(sans-serif|serif|monospace|system-ui|cursive|fantasy)\b/i.test(fontSans);
    if (!hasGeneric) {
      score -= 10;
      findings.push(
        finding(
          'typography-readability',
          'warning',
          'Font stack lacks a generic fallback (sans-serif, serif, monospace, system-ui)'
        )
      );
    }
  }

  return {
    category: 'typography-readability',
    label: 'Typography',
    score: clamp(score, 0, 100),
    weight: 10,
    findings,
  };
}

// ---------------------------------------------------------------------------
// Category: Images & Media (weight 10)
// ---------------------------------------------------------------------------

function analyzeImagesMedia(doc: DomDocument): A11yCategoryScore {
  const findings: A11yFinding[] = [];
  let score = 100;

  // Images without alt
  const images = doc.querySelectorAll('img');
  let missingAlt = 0;
  for (const img of images) {
    if (!img.hasAttribute('alt')) {
      missingAlt++;
    }
  }
  if (missingAlt > 0) {
    score -= Math.min(missingAlt * 25, 50);
    findings.push(
      finding(
        'images-media',
        'error',
        `${missingAlt} <img> element${missingAlt > 1 ? 's' : ''} missing alt attribute`
      )
    );
  }

  // SVGs without accessible labels
  const svgs = doc.querySelectorAll('svg');
  let inaccessibleSvg = 0;
  for (const svg of svgs) {
    const hasRole = svg.getAttribute('role') === 'img';
    const hasAriaLabel = !!svg.getAttribute('aria-label');
    const hasTitle = !!svg.querySelector('title');
    if (!hasRole && !hasAriaLabel && !hasTitle) {
      inaccessibleSvg++;
    }
  }
  if (inaccessibleSvg > 0) {
    score -= Math.min(inaccessibleSvg * 15, 30);
    findings.push(
      finding(
        'images-media',
        'warning',
        `${inaccessibleSvg} <svg> element${inaccessibleSvg > 1 ? 's' : ''} without role, aria-label, or <title>`
      )
    );
  }

  return {
    category: 'images-media',
    label: 'Images & Media',
    score: clamp(score, 0, 100),
    weight: 10,
    findings,
  };
}
