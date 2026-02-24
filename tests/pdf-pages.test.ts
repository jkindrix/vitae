import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { countPdfPages, generatePdf, generatePdfBuffer, closeBrowser } from '../src/lib/pdf.js';
import { normalizeResume } from '../src/lib/normalize.js';
import type { Resume } from '../src/types/index.js';

describe('countPdfPages', () => {
  it('counts 1 page in a synthetic PDF', () => {
    const fakePdf = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n' +
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n'
    );
    expect(countPdfPages(fakePdf)).toBe(1);
  });

  it('counts 2 pages in a synthetic PDF', () => {
    const fakePdf = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj\n<< /Type /Pages /Kids [2 0 R 3 0 R] /Count 2 >>\nendobj\n' +
      '2 0 obj\n<< /Type /Page /Parent 1 0 R >>\nendobj\n' +
      '3 0 obj\n<< /Type /Page /Parent 1 0 R >>\nendobj\n'
    );
    expect(countPdfPages(fakePdf)).toBe(2);
  });

  it('excludes /Type /Pages from count', () => {
    const fakePdf = Buffer.from(
      '%PDF-1.4\n' +
      '1 0 obj\n<< /Type /Pages /Count 1 >>\nendobj\n' +
      '2 0 obj\n<< /Type /Page >>\nendobj\n'
    );
    // Should count only /Type /Page, not /Type /Pages
    expect(countPdfPages(fakePdf)).toBe(1);
  });

  it('returns 0 for empty/invalid buffer', () => {
    expect(countPdfPages(Buffer.from('not a pdf'))).toBe(0);
  });
});

describe('PDF generation with PdfResult', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  const minimalResume: Resume = {
    meta: { name: 'Page Test User', title: 'Engineer' },
    experience: [
      {
        company: 'Test Corp',
        roles: [{ title: 'Dev', start: '2020', highlights: ['Built things'] }],
      },
    ],
  };

  it('generatePdf returns PdfResult with metadata', async () => {
    const normalized = normalizeResume(minimalResume);
    const outPath = join(tmpdir(), `vitae-pdf-result-${Date.now()}.pdf`);

    try {
      const result = await generatePdf(normalized, 'minimal', outPath);

      expect(result.pageCount).toBeGreaterThanOrEqual(1);
      expect(result.scale).toBe(1);
      expect(result.outputPath).toBe(outPath);
      expect(existsSync(outPath)).toBe(true);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);

  it('generatePdfBuffer returns PdfBufferResult with buffer and metadata', async () => {
    const normalized = normalizeResume(minimalResume);
    const result = await generatePdfBuffer(normalized, 'minimal');

    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.scale).toBe(1);
  }, 30000);

  it('fit mode with short resume keeps scale at 1.0', async () => {
    const normalized = normalizeResume(minimalResume);
    const outPath = join(tmpdir(), `vitae-pdf-fit-short-${Date.now()}.pdf`);

    try {
      const result = await generatePdf(normalized, 'minimal', outPath, {
        fit: true,
        targetPages: 1,
      });

      expect(result.scale).toBe(1.0);
      expect(result.pageCount).toBe(1);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);

  it('fit mode scales down a long resume', async () => {
    // Create a resume with lots of content to force multi-page
    const longResume: Resume = {
      meta: { name: 'Long Resume User', title: 'Senior Staff Engineer' },
      summary: 'A very experienced engineer. '.repeat(20),
      experience: Array.from({ length: 6 }, (_, i) => ({
        company: `Company ${i + 1}`,
        roles: [
          {
            title: `Role ${i + 1}`,
            start: `${2015 + i}-01`,
            end: i < 5 ? `${2016 + i}-12` : 'present',
            highlights: Array.from({ length: 5 }, (_, j) => `Achievement ${j + 1} at Company ${i + 1} involving significant work`),
          },
        ],
      })),
      skills: [
        { category: 'Languages', items: ['TypeScript', 'Python', 'Go', 'Rust', 'Java', 'C++'] },
        { category: 'Frameworks', items: ['React', 'Node.js', 'Django', 'FastAPI', 'Spring'] },
        { category: 'Infrastructure', items: ['AWS', 'Docker', 'Kubernetes', 'Terraform'] },
      ],
    };
    const normalized = normalizeResume(longResume);
    const outPath = join(tmpdir(), `vitae-pdf-fit-long-${Date.now()}.pdf`);

    try {
      const result = await generatePdf(normalized, 'minimal', outPath, {
        fit: true,
        targetPages: 1,
      });

      expect(result.scale).toBeLessThan(1.0);
      expect(result.scale).toBeGreaterThanOrEqual(0.80);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);

  it('respects custom scaleFloor', async () => {
    const longResume: Resume = {
      meta: { name: 'Floor Test User' },
      experience: Array.from({ length: 6 }, (_, i) => ({
        company: `Company ${i + 1}`,
        roles: [
          {
            title: `Role ${i + 1}`,
            start: `${2015 + i}-01`,
            highlights: Array.from({ length: 5 }, (_, j) => `Achievement ${j + 1} at Company ${i + 1}`),
          },
        ],
      })),
    };
    const normalized = normalizeResume(longResume);
    const outPath = join(tmpdir(), `vitae-pdf-floor-${Date.now()}.pdf`);

    try {
      const result = await generatePdf(normalized, 'minimal', outPath, {
        fit: true,
        targetPages: 1,
        scaleFloor: 0.90,
      });

      expect(result.scale).toBeGreaterThanOrEqual(0.90);
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);
});
