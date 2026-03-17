import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { generateForTheme, generateCoverLetterForTheme } from '../src/commands/build.js';
import { normalizeResume } from '../src/lib/normalize.js';
import { closeBrowser } from '../src/lib/pdf.js';
import type { Resume, NormalizedResume } from '../src/types/index.js';
import type { CoverLetter } from '../src/types/cover-letter.js';

const testDir = join(tmpdir(), `vitae-build-formats-${Date.now()}`);

const sampleResume: Resume = {
  meta: {
    name: 'Build Test User',
    title: 'Engineer',
    email: 'build@test.com',
  },
  summary: 'Experienced engineer.',
  experience: [
    {
      company: 'TestCo',
      roles: [
        {
          title: 'Developer',
          start: '2020-01',
          end: 'present',
          highlights: ['Built things', 'Led team'],
        },
      ],
    },
  ],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Go'] }],
  education: [{ institution: 'MIT', degree: 'BS', field: 'CS', end: '2019' }],
};

const normalized: NormalizedResume = normalizeResume(sampleResume);

const sampleCoverLetter: CoverLetter = {
  type: 'cover-letter',
  meta: { name: 'Build Test User', title: 'Engineer' },
  recipient: { name: 'Jane Hiring', title: 'CTO', company: 'TargetCo' },
  greeting: 'Dear Ms. Hiring,',
  body: ['I am writing to express my interest.', 'I have relevant experience.'],
  closing: 'Sincerely,',
};

function outDir(subdir: string): string {
  const dir = join(testDir, subdir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

afterAll(async () => {
  await closeBrowser();
  rmSync(testDir, { recursive: true, force: true });
});

describe('generateForTheme — resume format dispatch', () => {
  it('generates HTML file with valid content', async () => {
    const dir = outDir('html');
    const results = await generateForTheme(normalized, 'minimal', ['html'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('HTML');
    const content = readFileSync(join(dir, 'test.html'), 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Build Test User');
  });

  it('generates JSON file with resume data', async () => {
    const dir = outDir('json');
    const results = await generateForTheme(normalized, 'minimal', ['json'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('JSON');
    const parsed = JSON.parse(readFileSync(join(dir, 'test.json'), 'utf-8'));
    expect(parsed.meta.name).toBe('Build Test User');
  });

  it('generates Markdown file with resume content', async () => {
    const dir = outDir('md');
    const results = await generateForTheme(normalized, 'minimal', ['md'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('Markdown');
    const content = readFileSync(join(dir, 'test.md'), 'utf-8');
    expect(content).toContain('Build Test User');
    expect(content).toContain('TestCo');
  });

  it('generates DOCX file', async () => {
    const dir = outDir('docx');
    const results = await generateForTheme(normalized, 'minimal', ['docx'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('DOCX');
    const buffer = readFileSync(join(dir, 'test.docx'));
    // DOCX is a ZIP — starts with PK magic bytes
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
  });

  it('generates PDF file with page metadata', async () => {
    const dir = outDir('pdf');
    const results = await generateForTheme(normalized, 'minimal', ['pdf'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('PDF');
    const buffer = readFileSync(join(dir, 'test.pdf'));
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  }, 30000);

  it('generates PNG file', async () => {
    const dir = outDir('png');
    const results = await generateForTheme(normalized, 'minimal', ['png'], dir, 'test', {});
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('PNG');
    const buffer = readFileSync(join(dir, 'test.png'));
    expect(buffer[0]).toBe(0x89);
    expect(buffer[1]).toBe(0x50); // P
  }, 30000);

  it('skips JSON and MD when includeThemeInName is set (theme-independent formats)', async () => {
    const dir = outDir('theme-indep');
    const results = await generateForTheme(
      normalized, 'minimal', ['json', 'md', 'html'], dir, 'test',
      { includeThemeInName: true },
    );
    // JSON and MD are skipped when includeThemeInName is true; only HTML is generated
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('HTML');
    expect(existsSync(join(dir, 'test-minimal.html'))).toBe(true);
    expect(existsSync(join(dir, 'test-minimal.json'))).toBe(false);
    expect(existsSync(join(dir, 'test-minimal.md'))).toBe(false);
  });

  it('handles unknown format gracefully', async () => {
    const dir = outDir('unknown');
    const results = await generateForTheme(
      normalized, 'minimal', ['xml' as any], dir, 'test', {},
    );
    expect(results).toHaveLength(0);
  });

  it('passes layout option through to HTML rendering', async () => {
    // This verifies the option plumbing — layout is passed to renderStandaloneHtml
    // With a non-existent layout, it should throw and be caught as a format error
    const dir = outDir('layout');
    const results = await generateForTheme(
      normalized, 'minimal', ['html'], dir, 'test',
      { layout: 'nonexistent-layout' },
    );
    // generateForTheme catches errors per format and returns empty results
    expect(results).toHaveLength(0);
  });

  it('generates multiple formats in a single call', async () => {
    const dir = outDir('multi');
    const results = await generateForTheme(
      normalized, 'minimal', ['html', 'json', 'md'], dir, 'test', {},
    );
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.format).sort()).toEqual(['HTML', 'JSON', 'Markdown']);
  });
});

describe('generateCoverLetterForTheme — cover letter format dispatch', () => {
  it('generates HTML cover letter', async () => {
    const dir = outDir('cl-html');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['html'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const content = readFileSync(join(dir, 'cover.html'), 'utf-8');
    expect(content).toContain('Build Test User');
  });

  it('generates DOCX cover letter', async () => {
    const dir = outDir('cl-docx');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['docx'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const buffer = readFileSync(join(dir, 'cover.docx'));
    expect(buffer[0]).toBe(0x50); // PK
  });

  it('generates JSON cover letter', async () => {
    const dir = outDir('cl-json');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['json'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const parsed = JSON.parse(readFileSync(join(dir, 'cover.json'), 'utf-8'));
    expect(parsed.meta.name).toBe('Build Test User');
  });

  it('generates Markdown cover letter', async () => {
    const dir = outDir('cl-md');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['md'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const content = readFileSync(join(dir, 'cover.md'), 'utf-8');
    expect(content).toContain('Build Test User');
  });

  it('generates PDF cover letter', async () => {
    const dir = outDir('cl-pdf');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['pdf'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const buffer = readFileSync(join(dir, 'cover.pdf'));
    expect(buffer.toString('ascii', 0, 5)).toBe('%PDF-');
  }, 30000);

  it('generates PNG cover letter', async () => {
    const dir = outDir('cl-png');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['png'], dir, 'cover', {},
    );
    expect(results).toHaveLength(1);
    const buffer = readFileSync(join(dir, 'cover.png'));
    expect(buffer[0]).toBe(0x89); // PNG magic
  }, 30000);

  it('skips theme-independent formats when includeThemeInName is set', async () => {
    const dir = outDir('cl-theme-indep');
    const results = await generateCoverLetterForTheme(
      sampleCoverLetter, 'minimal', ['json', 'md', 'html'], dir, 'cover',
      { includeThemeInName: true },
    );
    expect(results).toHaveLength(1);
    expect(results[0]!.format).toBe('HTML');
  });
});
