import Ajv, { type ValidateFunction, type ErrorObject } from 'ajv';
import addFormats from 'ajv-formats';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { ValidationError as VitaeValidationError, type ValidationErrorDetail } from './errors.js';
import type { Resume, Variant, CoverLetter } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let validateFn: ValidateFunction | null = null;
let variantValidateFn: ValidateFunction | null = null;
let coverLetterValidateFn: ValidateFunction | null = null;

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

export interface ValidationResult {
  valid: boolean;
  errors: ValidationErrorDetail[];
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

  const errors: ValidationErrorDetail[] = (validate.errors ?? []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
    keyword: err.keyword,
  }));

  return { valid: false, errors };
}

/**
 * Assert that data is a valid Resume, throwing if invalid
 */
export async function assertValidResume(data: unknown): Promise<Resume> {
  const result = await validateResume(data);

  if (!result.valid) {
    throw VitaeValidationError.fromDetails(result.errors);
  }

  return data as Resume;
}

/**
 * Load and compile the variant JSON schema
 */
async function getVariantValidator(): Promise<ValidateFunction> {
  if (variantValidateFn) return variantValidateFn;

  const schemaPath = join(__dirname, '../../schemas/variant.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent) as object;

  const ajv = new Ajv.default({ allErrors: true, strict: false });
  addFormats.default(ajv);
  variantValidateFn = ajv.compile(schema);

  return variantValidateFn;
}

/**
 * Validate variant data against the schema
 */
export async function validateVariant(data: unknown): Promise<ValidationResult> {
  const validate = await getVariantValidator();
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationErrorDetail[] = (validate.errors ?? []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
    keyword: err.keyword,
  }));

  return { valid: false, errors };
}

/**
 * Assert that data is a valid Variant, throwing if invalid
 */
export async function assertValidVariant(data: unknown): Promise<Variant> {
  const result = await validateVariant(data);

  if (!result.valid) {
    throw VitaeValidationError.fromDetails(result.errors);
  }

  return data as Variant;
}

/**
 * Load and compile the cover letter JSON schema
 */
async function getCoverLetterValidator(): Promise<ValidateFunction> {
  if (coverLetterValidateFn) return coverLetterValidateFn;

  const schemaPath = join(__dirname, '../../schemas/cover-letter.schema.json');
  const schemaContent = await readFile(schemaPath, 'utf-8');
  const schema = JSON.parse(schemaContent) as object;

  const ajv = new Ajv.default({ allErrors: true, strict: false });
  addFormats.default(ajv);
  coverLetterValidateFn = ajv.compile(schema);

  return coverLetterValidateFn;
}

/**
 * Validate cover letter data against the schema
 */
export async function validateCoverLetter(data: unknown): Promise<ValidationResult> {
  const validate = await getCoverLetterValidator();
  const valid = validate(data);

  if (valid) {
    return { valid: true, errors: [] };
  }

  const errors: ValidationErrorDetail[] = (validate.errors ?? []).map((err: ErrorObject) => ({
    path: err.instancePath || '/',
    message: err.message ?? 'Unknown validation error',
    keyword: err.keyword,
  }));

  return { valid: false, errors };
}

/**
 * Assert that data is a valid CoverLetter, throwing if invalid
 */
export async function assertValidCoverLetter(data: unknown): Promise<CoverLetter> {
  const result = await validateCoverLetter(data);

  if (!result.valid) {
    throw VitaeValidationError.fromDetails(result.errors);
  }

  return data as CoverLetter;
}
