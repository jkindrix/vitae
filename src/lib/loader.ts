import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { assertValidResume } from './schema.js';
import type { Resume } from '../types/index.js';

/**
 * Load and validate a resume from a YAML file
 */
export async function loadResume(filePath: string): Promise<Resume> {
  const content = await readFile(filePath, 'utf-8');
  const data = parseYaml(content);
  return assertValidResume(data);
}

/**
 * Load a resume from a YAML string
 */
export async function parseResume(yamlContent: string): Promise<Resume> {
  const data = parseYaml(yamlContent);
  return assertValidResume(data);
}
