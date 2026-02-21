import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify as stringifyYaml } from 'yaml';
import {
  validateCoverLetter,
  assertValidCoverLetter,
  loadCoverLetter,
  isCoverLetterFormat,
  loadDocument,
  renderCoverLetterHtml,
  renderCoverLetterStandaloneHtml,
  coverLetterToMarkdown,
} from '../src/lib/index.js';
import type { CoverLetter } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeValidCoverLetter(): CoverLetter {
  return {
    meta: {
      name: 'Jane Smith',
      title: 'Software Engineer',
      email: 'jane@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/janesmith' }],
    },
    recipient: {
      name: 'John Doe',
      title: 'Hiring Manager',
      company: 'Acme Corp',
      address: '123 Main St, San Francisco, CA',
    },
    date: 'March 15, 2025',
    subject: 'Application for Senior Software Engineer',
    greeting: 'Dear Mr. Doe,',
    body: [
      'I am writing to express my interest in the Senior Software Engineer position.',
      'With over 10 years of experience in software development, I bring expertise in building scalable systems.',
      'I would welcome the opportunity to discuss how my background aligns with your needs.',
    ],
    closing: 'Sincerely,',
  };
}

function makeMinimalCoverLetter(): CoverLetter {
  return {
    meta: { name: 'Jane Smith' },
    recipient: {},
    greeting: 'Dear Hiring Manager,',
    body: ['I am interested in the open position.'],
    closing: 'Best regards,',
  };
}

let tempDir: string;

function createTempFile(filename: string, content: string): string {
  if (!tempDir) {
    tempDir = mkdtempSync(join(tmpdir(), 'vitae-cl-test-'));
  }
  const filePath = join(tempDir, filename);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// Clean up after all tests
import { afterAll } from 'vitest';
afterAll(() => {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('cover letter schema validation', () => {
  it('validates a complete cover letter', async () => {
    const result = await validateCoverLetter(makeValidCoverLetter());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates a minimal cover letter', async () => {
    const result = await validateCoverLetter(makeMinimalCoverLetter());
    expect(result.valid).toBe(true);
  });

  it('validates with explicit type discriminator', async () => {
    const cl = { ...makeMinimalCoverLetter(), type: 'cover-letter' as const };
    const result = await validateCoverLetter(cl);
    expect(result.valid).toBe(true);
  });

  it('rejects missing required fields', async () => {
    const result = await validateCoverLetter({ meta: { name: 'Test' } });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects empty body array', async () => {
    const cl = { ...makeMinimalCoverLetter(), body: [] };
    const result = await validateCoverLetter(cl);
    expect(result.valid).toBe(false);
  });

  it('rejects missing meta.name', async () => {
    const cl = {
      meta: {},
      recipient: {},
      greeting: 'Hello,',
      body: ['Test'],
      closing: 'Bye,',
    };
    const result = await validateCoverLetter(cl);
    expect(result.valid).toBe(false);
  });

  it('rejects additional properties', async () => {
    const cl = { ...makeMinimalCoverLetter(), unknownField: 'bad' };
    const result = await validateCoverLetter(cl);
    expect(result.valid).toBe(false);
  });

  it('validates theme overrides', async () => {
    const cl = {
      ...makeValidCoverLetter(),
      theme: {
        colors: { accent: '#ff0000', text: '#333' },
        fonts: { sans: 'Helvetica' },
      },
    };
    const result = await validateCoverLetter(cl);
    expect(result.valid).toBe(true);
  });

  it('assertValidCoverLetter returns typed data', async () => {
    const data = makeValidCoverLetter();
    const result = await assertValidCoverLetter(data);
    expect(result.meta.name).toBe('Jane Smith');
    expect(result.body).toHaveLength(3);
  });

  it('assertValidCoverLetter throws on invalid data', async () => {
    await expect(assertValidCoverLetter({})).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

describe('isCoverLetterFormat', () => {
  it('detects cover letter by explicit type', () => {
    expect(isCoverLetterFormat({ type: 'cover-letter', meta: {}, recipient: {}, greeting: 'Hi', body: [], closing: 'Bye' })).toBe(true);
  });

  it('detects cover letter by heuristic', () => {
    expect(isCoverLetterFormat({
      meta: { name: 'Test' },
      recipient: { company: 'Acme' },
      greeting: 'Dear Sir,',
      body: ['Paragraph'],
      closing: 'Sincerely,',
    })).toBe(true);
  });

  it('rejects resume data', () => {
    expect(isCoverLetterFormat({
      meta: { name: 'Test' },
      experience: [{ company: 'Acme', roles: [] }],
    })).toBe(false);
  });

  it('rejects data with experience even if it has recipient', () => {
    expect(isCoverLetterFormat({
      meta: { name: 'Test' },
      recipient: { company: 'Acme' },
      body: ['Paragraph'],
      greeting: 'Hi',
      experience: [],
    })).toBe(false);
  });

  it('rejects null and non-objects', () => {
    expect(isCoverLetterFormat(null)).toBe(false);
    expect(isCoverLetterFormat('string')).toBe(false);
    expect(isCoverLetterFormat(42)).toBe(false);
  });

  it('rejects objects missing body array', () => {
    expect(isCoverLetterFormat({
      recipient: {},
      greeting: 'Hi',
      body: 'not an array',
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Loader
// ---------------------------------------------------------------------------

describe('loadCoverLetter', () => {
  it('loads a YAML cover letter', async () => {
    const cl = makeValidCoverLetter();
    const filePath = createTempFile('valid-cl.yaml', stringifyYaml(cl));
    const loaded = await loadCoverLetter(filePath);
    expect(loaded.meta.name).toBe('Jane Smith');
    expect(loaded.body).toHaveLength(3);
  });

  it('loads a JSON cover letter', async () => {
    const cl = makeValidCoverLetter();
    const filePath = createTempFile('valid-cl.json', JSON.stringify(cl));
    const loaded = await loadCoverLetter(filePath);
    expect(loaded.meta.name).toBe('Jane Smith');
  });

  it('throws on invalid cover letter', async () => {
    const filePath = createTempFile('invalid-cl.yaml', stringifyYaml({ meta: {} }));
    await expect(loadCoverLetter(filePath)).rejects.toThrow();
  });
});

describe('loadDocument auto-detection', () => {
  it('detects a cover letter', async () => {
    const cl = makeValidCoverLetter();
    const filePath = createTempFile('doc-cl.yaml', stringifyYaml(cl));
    const doc = await loadDocument(filePath);
    expect(doc.type).toBe('cover-letter');
    if (doc.type === 'cover-letter') {
      expect(doc.coverLetter.meta.name).toBe('Jane Smith');
    }
  });

  it('detects a resume', async () => {
    const resume = {
      meta: { name: 'Test Person' },
      experience: [{
        company: 'Acme',
        roles: [{ title: 'Engineer', start: '2020-01' }],
      }],
    };
    const filePath = createTempFile('doc-resume.yaml', stringifyYaml(resume));
    const doc = await loadDocument(filePath);
    expect(doc.type).toBe('resume');
    if (doc.type === 'resume') {
      expect(doc.resume.meta.name).toBe('Test Person');
    }
  });
});

// ---------------------------------------------------------------------------
// HTML rendering
// ---------------------------------------------------------------------------

describe('renderCoverLetterHtml', () => {
  it('renders HTML with cover letter content', async () => {
    const cl = makeValidCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    expect(result.html).toContain('Jane Smith');
    expect(result.html).toContain('Dear Mr. Doe,');
    expect(result.html).toContain('Sincerely,');
    expect(result.html).toContain('cover-letter');
    expect(result.css).toBeTruthy();
  });

  it('renders recipient information', async () => {
    const cl = makeValidCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    expect(result.html).toContain('John Doe');
    expect(result.html).toContain('Acme Corp');
    expect(result.html).toContain('Hiring Manager');
  });

  it('renders all body paragraphs', async () => {
    const cl = makeValidCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    for (const paragraph of cl.body) {
      expect(result.html).toContain(paragraph);
    }
  });

  it('renders subject line', async () => {
    const cl = makeValidCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    expect(result.html).toContain('Application for Senior Software Engineer');
  });

  it('renders date', async () => {
    const cl = makeValidCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    expect(result.html).toContain('March 15, 2025');
  });

  it('works with all themes', async () => {
    const cl = makeValidCoverLetter();
    for (const theme of ['minimal', 'modern', 'professional']) {
      const result = await renderCoverLetterHtml(cl, theme);
      expect(result.html).toContain('Jane Smith');
      expect(result.html).toContain('cover-letter');
    }
  });

  it('renders minimal cover letter without optional fields', async () => {
    const cl = makeMinimalCoverLetter();
    const result = await renderCoverLetterHtml(cl, 'minimal');
    expect(result.html).toContain('Jane Smith');
    expect(result.html).toContain('Dear Hiring Manager,');
    expect(result.html).not.toContain('undefined');
  });
});

describe('renderCoverLetterStandaloneHtml', () => {
  it('produces a complete HTML document', async () => {
    const cl = makeValidCoverLetter();
    const html = await renderCoverLetterStandaloneHtml(cl, 'minimal');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<style>');
    expect(html).toContain('Jane Smith - Cover Letter');
  });

  it('uses dynamic lang attribute from coverLetter.language', async () => {
    const cl = { ...makeValidCoverLetter(), language: 'fr' };
    const html = await renderCoverLetterStandaloneHtml(cl, 'minimal');
    expect(html).toContain('<html lang="fr">');
  });

  it('defaults to lang="en" when language is not set', async () => {
    const cl = makeValidCoverLetter();
    const html = await renderCoverLetterStandaloneHtml(cl, 'minimal');
    expect(html).toContain('<html lang="en">');
  });

  it('includes theme override CSS when present', async () => {
    const cl = {
      ...makeValidCoverLetter(),
      theme: { colors: { accent: '#ff0000' } },
    };
    const html = await renderCoverLetterStandaloneHtml(cl, 'minimal');
    expect(html).toContain('--color-accent: #ff0000');
  });
});

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

describe('coverLetterToMarkdown', () => {
  it('produces markdown with sender info', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('**Jane Smith**');
    expect(md).toContain('jane@example.com');
    expect(md).toContain('555-123-4567');
    expect(md).toContain('San Francisco, CA');
  });

  it('includes date', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('March 15, 2025');
  });

  it('includes recipient info', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('John Doe');
    expect(md).toContain('Hiring Manager');
    expect(md).toContain('Acme Corp');
  });

  it('includes subject line in bold', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('**Application for Senior Software Engineer**');
  });

  it('includes greeting and closing', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('Dear Mr. Doe,');
    expect(md).toContain('Sincerely,');
  });

  it('includes all body paragraphs', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    for (const paragraph of cl.body) {
      expect(md).toContain(paragraph);
    }
  });

  it('includes signature', () => {
    const cl = makeValidCoverLetter();
    const md = coverLetterToMarkdown(cl);
    // Name appears as signature at the end
    const lines = md.split('\n');
    const nameLines = lines.filter((l) => l.trim() === 'Jane Smith');
    expect(nameLines.length).toBeGreaterThanOrEqual(1);
  });

  it('handles minimal cover letter', () => {
    const cl = makeMinimalCoverLetter();
    const md = coverLetterToMarkdown(cl);
    expect(md).toContain('**Jane Smith**');
    expect(md).toContain('Dear Hiring Manager,');
    expect(md).toContain('Best regards,');
    expect(md).not.toContain('undefined');
  });
});
