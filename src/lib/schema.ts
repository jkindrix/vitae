import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import type { Resume } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let validateFn: ValidateFunction | null = null;

/**
 * Load and compile the JSON schema
 */
async function getValidator(): Promise<ValidateFunction> {
  if (validateFn) return validateFn;

  const schemaPath = join(__dirname, '../../schemas/resume.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent) as object;

  const ajv = new Ajv.default({ allErrors: true, strict: false });
  addFormats.default(ajv);
  validateFn = ajv.compile(schema);

  return validateFn;
}

export interface ValidationError {
  path: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate resume data against the schema
 */
export async function validateResume(data: unknown): Promise<ValidationResult> {
  const validate = await getValidator();
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationError[] = (validate.errors ?? []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
  }));

  return { valid: false, errors };
}

/**
 * Assert that data is a valid Resume, throwing if invalid
 */
export async function assertValidResume(data: unknown): Promise<Resume> {
  const result = await validateResume(data);

  if (!result.valid) {
    const errorMessages = result.errors
      .map((e) => `  ${e.path}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid resume data:\n${errorMessages}`);
  }

  return data as Resume;
}
