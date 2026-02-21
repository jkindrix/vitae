import { describe, it, expect } from 'vitest';
import {
  VitaeError,
  ThemeError,
  ValidationError,
  FileError,
  PdfError,
  DocxError,
  isVitaeError,
  formatError,
} from '../src/lib/errors.js';

describe('error types', () => {
  describe('VitaeError', () => {
    it('creates error with message and code', () => {
      const error = new VitaeError('Test message', 'TEST_CODE');

      expect(error.message).toBe('Test message');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('VitaeError');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('ThemeError', () => {
    it('creates error with theme name', () => {
      const error = new ThemeError('Theme failed', 'dark');

      expect(error.themeName).toBe('dark');
      expect(error.code).toBe('THEME_ERROR');
      expect(error.name).toBe('ThemeError');
    });

    it('creates notFound error', () => {
      const error = ThemeError.notFound('custom', '/path/to/themes/custom');

      expect(error.message).toContain("Theme 'custom' not found");
      expect(error.message).toContain('/path/to/themes/custom');
      expect(error.themeName).toBe('custom');
    });

    it('creates missingTemplate error', () => {
      const error = ThemeError.missingTemplate('minimal');

      expect(error.message).toContain("Theme 'minimal' is missing required template.html");
      expect(error.themeName).toBe('minimal');
    });
  });

  describe('ValidationError', () => {
    it('creates error with validation details', () => {
      const details = [
        { path: '/meta/name', message: 'is required' },
        { path: '/experience', message: 'must be array' },
      ];
      const error = new ValidationError('Invalid data', details);

      expect(error.errors).toEqual(details);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.name).toBe('ValidationError');
    });

    it('creates error from details', () => {
      const details = [
        { path: '/meta/name', message: 'is required' },
        { path: '/experience', message: 'must be array' },
      ];
      const error = ValidationError.fromDetails(details);

      expect(error.message).toContain('Invalid resume data');
      expect(error.message).toContain('/meta/name: is required');
      expect(error.message).toContain('/experience: must be array');
      expect(error.errors).toEqual(details);
    });
  });

  describe('FileError', () => {
    it('creates error with file path', () => {
      const error = new FileError('File failed', '/path/to/file.yaml');

      expect(error.filePath).toBe('/path/to/file.yaml');
      expect(error.code).toBe('FILE_ERROR');
      expect(error.name).toBe('FileError');
    });

    it('creates error with cause', () => {
      const cause = new Error('Original error');
      const error = new FileError('File failed', '/path/to/file.yaml', cause);

      expect(error.cause).toBe(cause);
    });

    it('creates notFound error', () => {
      const error = FileError.notFound('/path/to/missing.yaml');

      expect(error.message).toContain('File not found');
      expect(error.filePath).toBe('/path/to/missing.yaml');
    });

    it('creates readError with cause', () => {
      const cause = new Error('Permission denied');
      const error = FileError.readError('/path/to/file.yaml', cause);

      expect(error.message).toContain('Failed to read file');
      expect(error.cause).toBe(cause);
    });
  });

  describe('PdfError', () => {
    it('creates error with code', () => {
      const error = new PdfError('PDF failed');

      expect(error.code).toBe('PDF_ERROR');
      expect(error.name).toBe('PdfError');
    });

    it('creates browserLaunchFailed error', () => {
      const cause = new Error('Browser not installed');
      const error = PdfError.browserLaunchFailed(cause);

      expect(error.message).toContain('Failed to launch browser');
      expect(error.cause).toBe(cause);
    });
  });

  describe('DocxError', () => {
    it('creates error with code', () => {
      const error = new DocxError('DOCX failed');

      expect(error.code).toBe('DOCX_ERROR');
      expect(error.name).toBe('DocxError');
    });

    it('creates generationFailed error', () => {
      const cause = new Error('buffer write failed');
      const error = DocxError.generationFailed(cause);

      expect(error.message).toContain('DOCX generation failed');
      expect(error.cause).toBe(cause);
    });
  });

  describe('isVitaeError', () => {
    it('returns true for VitaeError instances', () => {
      expect(isVitaeError(new VitaeError('test', 'CODE'))).toBe(true);
      expect(isVitaeError(new ThemeError('test', 'theme'))).toBe(true);
      expect(isVitaeError(new ValidationError('test', []))).toBe(true);
      expect(isVitaeError(new FileError('test', '/path'))).toBe(true);
      expect(isVitaeError(new PdfError('test'))).toBe(true);
      expect(isVitaeError(new DocxError('test'))).toBe(true);
    });

    it('returns false for regular errors', () => {
      expect(isVitaeError(new Error('test'))).toBe(false);
      expect(isVitaeError(null)).toBe(false);
      expect(isVitaeError(undefined)).toBe(false);
      expect(isVitaeError('string error')).toBe(false);
    });
  });

  describe('formatError', () => {
    it('formats VitaeError', () => {
      const error = new VitaeError('Test message', 'CODE');
      expect(formatError(error)).toBe('Test message');
    });

    it('formats regular Error', () => {
      const error = new Error('Regular error');
      expect(formatError(error)).toBe('Regular error');
    });

    it('formats string error', () => {
      expect(formatError('String error')).toBe('String error');
    });

    it('formats ValidationError with full message', () => {
      const error = ValidationError.fromDetails([{ path: '/test', message: 'failed' }]);
      expect(formatError(error)).toContain('Invalid resume data');
      expect(formatError(error)).toContain('/test: failed');
    });
  });
});
