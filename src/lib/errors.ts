/**
 * Structured error types for Vitae
 */

interface ErrorOptions {
  cause?: Error | undefined;
}

/**
 * Base error class for Vitae errors
 */
export class VitaeError extends Error {
  public readonly code: string;

  constructor(message: string, code: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = 'VitaeError';
    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when a theme cannot be found or loaded
 */
export class ThemeError extends VitaeError {
  public readonly themeName: string;

  constructor(message: string, themeName: string) {
    super(message, 'THEME_ERROR');
    this.themeName = themeName;
    this.name = 'ThemeError';
  }

  static notFound(themeName: string, searchedPath: string): ThemeError {
    return new ThemeError(`Theme '${themeName}' not found at ${searchedPath}`, themeName);
  }

  static missingTemplate(themeName: string): ThemeError {
    return new ThemeError(`Theme '${themeName}' is missing required template.html`, themeName);
  }

  static variantNotFound(themeName: string, variantName: string): ThemeError {
    return new ThemeError(
      `Layout variant '${variantName}' not found in theme '${themeName}'`,
      themeName,
    );
  }
}

/**
 * Error thrown when resume validation fails
 */
export class ValidationError extends VitaeError {
  public readonly errors: ValidationErrorDetail[];

  constructor(message: string, errors: ValidationErrorDetail[]) {
    super(message, 'VALIDATION_ERROR');
    this.errors = errors;
    this.name = 'ValidationError';
  }

  static fromDetails(errors: ValidationErrorDetail[]): ValidationError {
    const errorMessages = errors.map((e) => `  - ${e.path}: ${e.message}`).join('\n');
    return new ValidationError(`Invalid resume data:\n${errorMessages}`, errors);
  }
}

export interface ValidationErrorDetail {
  path: string;
  message: string;
  keyword?: string;
}

/**
 * Error thrown when file operations fail
 */
export class FileError extends VitaeError {
  public readonly filePath: string;

  constructor(message: string, filePath: string, cause?: Error) {
    super(message, 'FILE_ERROR', { cause });
    this.filePath = filePath;
    this.name = 'FileError';
  }

  static notFound(filePath: string): FileError {
    return new FileError(`File not found: ${filePath}`, filePath);
  }

  static readError(filePath: string, cause: Error): FileError {
    return new FileError(`Failed to read file: ${filePath}`, filePath, cause);
  }

  static parseError(filePath: string, cause: Error): FileError {
    return new FileError(`Failed to parse file: ${filePath}`, filePath, cause);
  }
}

/**
 * Error thrown when PDF generation fails
 */
export class PdfError extends VitaeError {
  constructor(message: string, cause?: Error) {
    super(message, 'PDF_ERROR', { cause });
    this.name = 'PdfError';
  }

  static browserLaunchFailed(cause: Error): PdfError {
    return new PdfError('Failed to launch browser for PDF generation', cause);
  }

  static generationFailed(cause: Error): PdfError {
    return new PdfError('PDF generation failed', cause);
  }
}

/**
 * Error thrown when DOCX generation fails
 */
export class DocxError extends VitaeError {
  constructor(message: string, cause?: Error) {
    super(message, 'DOCX_ERROR', { cause });
    this.name = 'DocxError';
  }

  static generationFailed(cause: Error): DocxError {
    return new DocxError('DOCX generation failed', cause);
  }
}

/**
 * Type guard to check if an error is a VitaeError
 */
export function isVitaeError(error: unknown): error is VitaeError {
  return error instanceof VitaeError;
}

/**
 * Get a user-friendly error message
 */
export function formatError(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  if (error instanceof VitaeError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
