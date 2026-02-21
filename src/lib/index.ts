export { loadResume, parseResume, loadVariant, loadCoverLetter, loadDocument, isCoverLetterFormat } from './loader.js';
export type { DocumentResult } from './loader.js';
export { validateResume, assertValidResume, validateVariant, assertValidVariant, validateCoverLetter, assertValidCoverLetter } from './schema.js';
export { listThemes, loadTheme, getThemesDir, readCoverLetterTemplate } from './themes.js';
export { renderHtml, renderStandaloneHtml, generateThemeOverrideCss } from './renderer.js';
export { generatePdf, generatePdfBuffer, generatePng, generatePdfFromHtml, generatePngFromHtml, closeBrowser } from './pdf.js';
export type { PdfOptions } from './pdf.js';
export { generateDocx, generateCoverLetterDocx, resumeToMarkdown } from './docx.js';
export type { DocxOptions } from './docx.js';
export { parseDate, formatDate, formatDateShort, formatDateRange } from './dates.js';
export type { ParsedDate } from './dates.js';
export {
  VitaeError,
  ThemeError,
  ValidationError,
  FileError,
  PdfError,
  DocxError,
  isVitaeError,
  formatError,
} from './errors.js';
export type { ValidationErrorDetail } from './errors.js';
export { fromJsonResume, toJsonResume, isJsonResumeFormat } from './json-resume.js';
export { applyVariant } from './variant.js';
export { normalizeResume, DEFAULT_SECTION_ORDER } from './normalize.js';
export { analyzeResume, extractKeywords, buildResumeTextBlocks, textContainsKeyword } from './ats.js';
export { analyzeTailoring, generateVariant, serializeVariantWithComments } from './tailor.js';
export { renderCoverLetterHtml, renderCoverLetterStandaloneHtml, coverLetterToMarkdown } from './cover-letter.js';
export { getLocale, getSectionLabel } from './i18n.js';
export type { Locale, LocaleLabels, LocaleMonths, LocaleKeywords } from './i18n.js';
export { auditAccessibility, parseColor, relativeLuminance, contrastRatio, extractCssCustomProperties } from './a11y.js';
