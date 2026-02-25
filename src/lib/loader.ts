import { readFile } from 'fs/promises';
import { extname, dirname, resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { assertValidResume, assertValidVariant, assertValidCoverLetter } from './schema.js';
import { isJsonResumeFormat, fromJsonResume } from './json-resume.js';
import type { Resume, Variant, CoverLetter, SectionName } from '../types/index.js';

interface LoadOptions {
  /**
   * Force interpretation as JSON Resume format
   * (by default, the loader auto-detects the format)
   */
  jsonResume?: boolean;
}

/**
 * Parse content as YAML or JSON based on file extension
 */
function parseContent(content: string, filePath: string): unknown {
  const ext = extname(filePath).toLowerCase();

  if (ext === '.json') {
    return JSON.parse(content) as unknown;
  }

  // YAML parser handles both .yaml and .yml
  return parseYaml(content);
}

/**
 * Load and validate a resume from a YAML or JSON file
 * Automatically detects and converts JSON Resume format
 */
export async function loadResume(filePath: string, options: LoadOptions = {}): Promise<Resume> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseContent(content, filePath);

  // Check if this is JSON Resume format
  if (options.jsonResume || isJsonResumeFormat(data)) {
    const converted = fromJsonResume(data as Parameters<typeof fromJsonResume>[0]);
    return assertValidResume(converted);
  }

  return assertValidResume(data);
}

/**
 * Load a single variant file without resolving extends.
 */
async function loadVariantRaw(filePath: string): Promise<Variant> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseContent(content, filePath);
  return assertValidVariant(data);
}

/** Section keys that are replaced (not merged) during extends resolution */
const SECTION_KEYS: SectionName[] = [
  'skills', 'experience', 'projects', 'education',
  'certifications', 'languages', 'awards', 'publications',
  'volunteer', 'references',
];

/**
 * Merge a parent variant with a child variant following the v2 merge rules:
 * - meta: deep merge (child overrides parent fields)
 * - summary: child replaces parent
 * - layout: child replaces parent
 * - tags: child replaces parent
 * - section selectors: child replaces parent entirely
 * - style: shallow merge (child properties override, parent-only preserved)
 * - extends: not inherited
 */
function mergeVariants(parent: Variant, child: Variant): Variant {
  const result: Variant = {};

  // Meta: deep merge
  if (parent.meta || child.meta) {
    result.meta = { ...parent.meta, ...child.meta };
  }

  // Summary: child replaces parent
  if (child.summary !== undefined) {
    result.summary = child.summary;
  } else if (parent.summary !== undefined) {
    result.summary = parent.summary;
  }

  // Layout: child replaces parent
  if (child.layout !== undefined) {
    result.layout = child.layout;
  } else if (parent.layout !== undefined) {
    result.layout = parent.layout;
  }

  // Global tags: child replaces parent
  if (child.tags !== undefined) {
    result.tags = child.tags;
  } else if (parent.tags !== undefined) {
    result.tags = parent.tags;
  }

  // Style: shallow merge
  if (parent.style || child.style) {
    result.style = { ...parent.style, ...child.style };
  }

  // Section selectors: child replaces parent entirely
  for (const key of SECTION_KEYS) {
    if (child[key] !== undefined) {
      (result as Record<string, unknown>)[key] = child[key];
    } else if (parent[key] !== undefined) {
      (result as Record<string, unknown>)[key] = parent[key];
    }
  }

  return result;
}

/**
 * Resolve variant extends chain, loading parent variants recursively.
 * Single-parent only; chains are supported (A extends B extends C).
 */
async function resolveExtends(
  variant: Variant,
  filePath: string,
  visited: Set<string> = new Set(),
): Promise<Variant> {
  if (!variant.extends) return variant;

  const resolvedPath = resolve(dirname(filePath), variant.extends);

  // Detect circular extends
  if (visited.has(resolvedPath)) {
    throw new Error(`Circular variant extends detected: ${resolvedPath}`);
  }
  visited.add(resolvedPath);

  // Load parent
  const parent = await loadVariantRaw(resolvedPath);

  // Recursively resolve parent's extends
  const resolvedParent = await resolveExtends(parent, resolvedPath, visited);

  // Merge: child overrides parent
  return mergeVariants(resolvedParent, variant);
}

/**
 * Load and validate a variant file, resolving extends chain if present.
 */
export async function loadVariant(filePath: string): Promise<Variant> {
  const variant = await loadVariantRaw(filePath);
  return resolveExtends(variant, filePath);
}

/**
 * Load a resume from a YAML or JSON string
 * Automatically detects and converts JSON Resume format
 */
export async function parseResume(content: string, options: LoadOptions = {}): Promise<Resume> {
  // Try to parse as JSON first (for JSON Resume), fall back to YAML
  let data: unknown;
  try {
    data = JSON.parse(content) as unknown;
  } catch {
    data = parseYaml(content);
  }

  // Check if this is JSON Resume format
  if (options.jsonResume || isJsonResumeFormat(data)) {
    const converted = fromJsonResume(data as Parameters<typeof fromJsonResume>[0]);
    return assertValidResume(converted);
  }

  return assertValidResume(data);
}

/**
 * Detect whether parsed data looks like a cover letter
 */
export function isCoverLetterFormat(data: unknown): boolean {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  // Explicit type discriminator
  if (obj.type === 'cover-letter') return true;
  // Heuristic: has cover-letter-specific fields, lacks resume-specific fields
  return 'recipient' in obj && 'body' in obj && Array.isArray(obj.body)
    && 'greeting' in obj && !('experience' in obj);
}

/**
 * Load and validate a cover letter from a YAML or JSON file
 */
export async function loadCoverLetter(filePath: string): Promise<CoverLetter> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseContent(content, filePath);
  return assertValidCoverLetter(data);
}

/**
 * Discriminated result from loading a document
 */
export type DocumentResult =
  | { type: 'resume'; resume: Resume }
  | { type: 'cover-letter'; coverLetter: CoverLetter };

/**
 * Load a document, auto-detecting whether it is a resume or cover letter
 */
export async function loadDocument(filePath: string, options: LoadOptions = {}): Promise<DocumentResult> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseContent(content, filePath);

  if (isCoverLetterFormat(data)) {
    const coverLetter = await assertValidCoverLetter(data);
    return { type: 'cover-letter', coverLetter };
  }

  // Check if this is JSON Resume format
  if (options.jsonResume || isJsonResumeFormat(data)) {
    const converted = fromJsonResume(data as Parameters<typeof fromJsonResume>[0]);
    const resume = await assertValidResume(converted);
    return { type: 'resume', resume };
  }

  const resume = await assertValidResume(data);
  return { type: 'resume', resume };
}
