import { readFile } from 'fs/promises';
import { extname } from 'path';
import { parse as parseYaml } from 'yaml';
import { assertValidResume, assertValidVariant } from './schema.js';
import { isJsonResumeFormat, fromJsonResume } from './json-resume.js';
import type { Resume, Variant } from '../types/index.js';

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
 * Load and validate a variant file from a YAML or JSON file
 */
export async function loadVariant(filePath: string): Promise<Variant> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseContent(content, filePath);
  return assertValidVariant(data);
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
