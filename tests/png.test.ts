import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, unlinkSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generatePng, generatePngFromHtml, closeBrowser } from '../src/lib/pdf.js';
import { renderStandaloneHtml } from '../src/lib/renderer.js';
import { normalizeResume } from '../src/lib/normalize.js';
import { renderCoverLetterStandaloneHtml } from '../src/lib/cover-letter.js';
import type { Resume } from '../src/types/index.js';
import type { CoverLetter } from '../src/types/cover-letter.js';

describe('generatePng', () => {
  afterAll(async () => {
    await closeBrowser();
  });

  it('creates a PNG file', async () => {
    const resume: Resume = {
      meta: { name: 'PNG Test User', title: 'Engineer' },
      experience: [
        {
          company: 'Test Corp',
          roles: [{ title: 'Dev', start: '2020', highlights: ['Built things'] }],
        },
      ],
    };
    const normalized = normalizeResume(resume);
    const outPath = join(tmpdir(), `vitae-png-test-${Date.now()}.png`);

    try {
      await generatePng(normalized, 'minimal', outPath);

      expect(existsSync(outPath)).toBe(true);

      // Verify it's actually a PNG (starts with PNG magic bytes)
      const buffer = readFileSync(outPath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);

  it('generates PNG from standalone HTML via generatePngFromHtml', async () => {
    const resume: Resume = {
      meta: { name: 'PNG HTML Test', title: 'Engineer' },
      experience: [
        {
          company: 'Test Corp',
          roles: [{ title: 'Dev', start: '2020', highlights: ['Built things'] }],
        },
      ],
    };
    const normalized = normalizeResume(resume);
    const html = await renderStandaloneHtml(normalized, 'minimal');
    const outPath = join(tmpdir(), `vitae-png-from-html-${Date.now()}.png`);

    try {
      await generatePngFromHtml(html, outPath);

      expect(existsSync(outPath)).toBe(true);
      const buffer = readFileSync(outPath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);

  it('works with all themes', async () => {
    const resume: Resume = {
      meta: { name: 'Theme Test' },
      experience: [
        { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
      ],
    };
    const normalized = normalizeResume(resume);

    for (const theme of ['minimal', 'modern', 'professional']) {
      const outPath = join(tmpdir(), `vitae-png-${theme}-${Date.now()}.png`);
      try {
        await generatePng(normalized, theme, outPath);
        expect(existsSync(outPath)).toBe(true);
      } finally {
        if (existsSync(outPath)) unlinkSync(outPath);
      }
    }
  }, 60000);

  it('generates PNG from cover letter standalone HTML', async () => {
    const coverLetter: CoverLetter = {
      meta: { name: 'CL PNG Test' },
      recipient: { company: 'Test Co' },
      greeting: 'Dear Hiring Manager,',
      body: ['I am writing to express my interest.'],
      closing: 'Sincerely,',
    };
    const html = await renderCoverLetterStandaloneHtml(coverLetter, 'minimal');
    const outPath = join(tmpdir(), `vitae-cl-png-${Date.now()}.png`);

    try {
      await generatePngFromHtml(html, outPath);
      expect(existsSync(outPath)).toBe(true);
      const buffer = readFileSync(outPath);
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50); // P
      expect(buffer[2]).toBe(0x4e); // N
      expect(buffer[3]).toBe(0x47); // G
    } finally {
      if (existsSync(outPath)) unlinkSync(outPath);
    }
  }, 30000);
});
