import { describe, it, expect, afterEach } from 'vitest';
import { readFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import JSZip from 'jszip';
import { generateDocx, generateCoverLetterDocx } from '../src/lib/docx.js';
import { normalizeResume } from '../src/lib/normalize.js';
import type { Resume } from '../src/types/index.js';
import type { CoverLetter } from '../src/types/cover-letter.js';

const tempFiles: string[] = [];

function tempPath(ext: string): string {
  const p = join(tmpdir(), `vitae-test-${randomUUID()}.${ext}`);
  tempFiles.push(p);
  return p;
}

/**
 * Extract text content from a DOCX file by reading word/document.xml
 * and stripping XML tags
 */
async function extractDocxText(filePath: string): Promise<string> {
  const buffer = await readFile(filePath);
  const zip = await JSZip.loadAsync(buffer);
  const docXml = zip.file('word/document.xml');
  if (!docXml) throw new Error('No document.xml in DOCX');
  const xml = await docXml.async('text');
  // Strip XML tags, collapse whitespace
  return xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

afterEach(async () => {
  for (const f of tempFiles) {
    try {
      await unlink(f);
    } catch {
      // ignore
    }
  }
  tempFiles.length = 0;
});

const fullResume: Resume = {
  meta: {
    name: 'Jane Smith',
    title: 'Senior Engineer',
    email: 'jane@example.com',
    phone: '555-123-4567',
    location: 'San Francisco, CA',
    links: [
      { label: 'GitHub', url: 'https://github.com/janesmith' },
      { url: 'https://linkedin.com/in/janesmith' },
    ],
  },
  summary: 'Experienced engineer with 10 years in web development.',
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Python', 'Go'] },
    { category: 'Frameworks', items: ['React', 'Node.js'] },
  ],
  experience: [
    {
      company: 'Tech Corp',
      roles: [
        {
          title: 'Senior Engineer',
          start: '2020-01',
          end: 'present',
          location: 'Remote',
          highlights: ['Led team of 5', 'Improved performance by 50%'],
        },
        {
          title: 'Engineer',
          start: '2018-06',
          end: '2020-01',
          highlights: ['Built core features'],
        },
      ],
    },
  ],
  projects: [
    {
      name: 'OSS Tool',
      url: 'https://github.com/tool',
      description: 'A useful CLI tool',
      highlights: ['1000+ stars'],
    },
  ],
  education: [
    {
      institution: 'University of Example',
      degree: 'BS',
      field: 'Computer Science',
      start: '2014',
      end: '2018',
    },
  ],
  certifications: [
    { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' },
  ],
  languages: [
    { language: 'English', fluency: 'Native' },
    { language: 'Spanish', fluency: 'Conversational' },
  ],
  awards: [
    { title: 'Employee of the Year', awarder: 'Tech Corp', date: '2022', summary: 'Outstanding contributions' },
  ],
  publications: [
    { name: 'Building Scalable Systems', publisher: 'Tech Blog', url: 'https://example.com/article' },
  ],
  volunteer: [
    {
      organization: 'Code for Good',
      position: 'Mentor',
      start: '2019',
      end: '2023',
      highlights: ['Mentored 20 students'],
    },
  ],
  references: [
    { name: 'John Doe', reference: 'Jane is an excellent engineer.' },
  ],
};

describe('generateDocx', () => {
  it('produces a valid DOCX file (ZIP format)', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const buffer = await readFile(out);
    // DOCX is a ZIP archive — first 2 bytes are 'PK' (0x50, 0x4B)
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('includes resume content', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Jane Smith');
    expect(text).toContain('Senior Engineer');
    expect(text).toContain('Tech Corp');
  });

  it('includes all section headings', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Summary');
    expect(text).toContain('Skills');
    expect(text).toContain('Experience');
    expect(text).toContain('Projects');
    expect(text).toContain('Education');
    expect(text).toContain('Certifications');
    expect(text).toContain('Languages');
    expect(text).toContain('Awards');
    expect(text).toContain('Publications');
    expect(text).toContain('Volunteer');
    expect(text).toContain('References');
  });

  it('includes highlights', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Led team of 5');
    expect(text).toContain('Improved performance by 50%');
    expect(text).toContain('1000+ stars');
  });

  it('uses localized section headings when language is set', async () => {
    const frResume: Resume = { ...fullResume, language: 'fr' };
    const out = tempPath('docx');
    await generateDocx(normalizeResume(frResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Profil');
    expect(text).toContain('Compétences');
    expect(text).toContain('Expérience Professionnelle');
    expect(text).toContain('Formation');
  });

  it('uses English headings when language is not set', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Summary');
    expect(text).toContain('Experience');
    expect(text).toContain('Education');
  });

  it('applies theme accent color', async () => {
    const themedResume: Resume = {
      ...fullResume,
      theme: { colors: { accent: '#FF5733' } },
    };
    const out = tempPath('docx');
    await generateDocx(normalizeResume(themedResume), 'minimal', out);

    // Read the raw XML to check color attributes
    const buffer = await readFile(out);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = zip.file('word/document.xml');
    const xml = await docXml!.async('text');
    expect(xml).toContain('FF5733');
  });

  it('applies theme font', async () => {
    const themedResume: Resume = {
      ...fullResume,
      theme: { fonts: { sans: 'Arial' } },
    };
    const out = tempPath('docx');
    await generateDocx(normalizeResume(themedResume), 'minimal', out);

    const buffer = await readFile(out);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = zip.file('word/document.xml');
    const xml = await docXml!.async('text');
    expect(xml).toContain('Arial');
  });

  it('handles minimal resume with no optional sections', async () => {
    const minimal: Resume = {
      meta: { name: 'Minimal User' },
      experience: [
        { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
      ],
    };
    const out = tempPath('docx');
    await generateDocx(normalizeResume(minimal), 'minimal', out);

    const buffer = await readFile(out);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const text = await extractDocxText(out);
    expect(text).toContain('Minimal User');
    expect(text).toContain('Co');
  });

  it('respects section ordering', async () => {
    const normalized = normalizeResume(fullResume, ['education', 'experience', 'skills']);
    const out = tempPath('docx');
    await generateDocx(normalized, 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Education');
    expect(text).toContain('Experience');
    expect(text).toContain('Skills');
    // Summary not in the section order — content should be absent
    expect(text).not.toContain('Experienced engineer');
  });

  it('includes contact information', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('jane@example.com');
    expect(text).toContain('555-123-4567');
    expect(text).toContain('San Francisco, CA');
  });

  it('includes link labels', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('GitHub');
  });

  it('uses localized Present keyword', async () => {
    const frResume: Resume = { ...fullResume, language: 'fr' };
    const out = tempPath('docx');
    await generateDocx(normalizeResume(frResume), 'minimal', out);

    const text = await extractDocxText(out);
    expect(text).toContain('Présent');
  });

  it('uses default Calibri font when no theme overrides', async () => {
    const out = tempPath('docx');
    await generateDocx(normalizeResume(fullResume), 'minimal', out);

    const buffer = await readFile(out);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = zip.file('word/document.xml');
    const xml = await docXml!.async('text');
    expect(xml).toContain('Calibri');
  });
});

describe('generateCoverLetterDocx', () => {
  const coverLetter: CoverLetter = {
    type: 'cover-letter',
    meta: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
    },
    recipient: {
      name: 'John Hiring',
      title: 'Engineering Manager',
      company: 'Great Co',
      address: '123 Main St, City',
    },
    date: 'February 20, 2026',
    subject: 'Application for Senior Engineer',
    greeting: 'Dear Mr. Hiring,',
    body: [
      'I am writing to express my interest in the Senior Engineer position.',
      'I bring 10 years of experience in web development.',
    ],
    closing: 'Sincerely,',
  };

  it('produces a valid DOCX file', async () => {
    const out = tempPath('docx');
    await generateCoverLetterDocx(coverLetter, out);

    const buffer = await readFile(out);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('includes cover letter content', async () => {
    const out = tempPath('docx');
    await generateCoverLetterDocx(coverLetter, out);

    const text = await extractDocxText(out);
    expect(text).toContain('Jane Smith');
    expect(text).toContain('jane@example.com');
    expect(text).toContain('John Hiring');
    expect(text).toContain('Engineering Manager');
    expect(text).toContain('Great Co');
    expect(text).toContain('February 20, 2026');
    expect(text).toContain('Application for Senior Engineer');
    expect(text).toContain('Dear Mr. Hiring,');
    expect(text).toContain('Senior Engineer position');
    expect(text).toContain('Sincerely,');
  });

  it('handles cover letter without optional fields', async () => {
    const minimal: CoverLetter = {
      type: 'cover-letter',
      meta: { name: 'Test User' },
      recipient: { company: 'Some Co' },
      greeting: 'Hello,',
      body: ['I am interested.'],
      closing: 'Thanks,',
    };
    const out = tempPath('docx');
    await generateCoverLetterDocx(minimal, out);

    const buffer = await readFile(out);
    expect(buffer[0]).toBe(0x50);
    expect(buffer[1]).toBe(0x4b);

    const text = await extractDocxText(out);
    expect(text).toContain('Test User');
    expect(text).toContain('Some Co');
    expect(text).toContain('I am interested.');
  });

  it('applies theme font override', async () => {
    const themed: CoverLetter = {
      ...coverLetter,
      theme: {
        colors: { accent: '#2E86C1' },
        fonts: { sans: 'Georgia' },
      },
    };
    const out = tempPath('docx');
    await generateCoverLetterDocx(themed, out);

    const buffer = await readFile(out);
    const zip = await JSZip.loadAsync(buffer);
    const docXml = zip.file('word/document.xml');
    const xml = await docXml!.async('text');
    expect(xml).toContain('Georgia');
  });
});
