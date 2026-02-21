import { describe, it, expect } from 'vitest';
import { resumeToMarkdown } from '../src/lib/docx.js';
import { normalizeResume } from '../src/lib/normalize.js';
import type { Resume } from '../src/types/index.js';

describe('resumeToMarkdown', () => {
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
        end: '2018',
      },
    ],
    certifications: [
      { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' },
    ],
  };

  it('includes name as H1', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('# Jane Smith');
  });

  it('includes title', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('**Senior Engineer**');
  });

  it('includes contact info', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('jane@example.com');
    expect(md).toContain('555-123-4567');
    expect(md).toContain('San Francisco, CA');
  });

  it('includes links as markdown links', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('[GitHub](https://github.com/janesmith)');
    expect(md).toContain('linkedin.com');
  });

  it('includes summary section', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Summary');
    expect(md).toContain('Experienced engineer');
  });

  it('includes skills with categories', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Skills');
    expect(md).toContain('**Languages:**');
    expect(md).toContain('TypeScript, Python, Go');
  });

  it('includes experience with highlights as bullets', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Experience');
    expect(md).toContain('Tech Corp');
    expect(md).toContain('Senior Engineer');
    expect(md).toContain('- Led team of 5');
  });

  it('includes projects section', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Projects');
    expect(md).toContain('OSS Tool');
    expect(md).toContain('A useful CLI tool');
  });

  it('includes education section', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Education');
    expect(md).toContain('University of Example');
    expect(md).toContain('Computer Science');
  });

  it('includes certifications section', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Certifications');
    expect(md).toContain('AWS Solutions Architect');
  });

  it('omits sections without content', () => {
    const minimal: Resume = {
      meta: { name: 'Minimal' },
      experience: [
        { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
      ],
    };
    const md = resumeToMarkdown(normalizeResume(minimal));

    expect(md).toContain('# Minimal');
    expect(md).not.toContain('## Summary');
    expect(md).not.toContain('## Skills');
    expect(md).not.toContain('## Projects');
  });

  it('flattens tagged highlights to plain text', () => {
    const resume: Resume = {
      meta: { name: 'Test' },
      experience: [
        {
          company: 'Co',
          roles: [
            {
              title: 'Dev',
              start: '2020',
              highlights: [
                'Plain highlight',
                { text: 'Tagged highlight', tags: ['backend'] },
              ],
            },
          ],
        },
      ],
    };
    const md = resumeToMarkdown(normalizeResume(resume));

    expect(md).toContain('- Plain highlight');
    expect(md).toContain('- Tagged highlight');
    // Should not contain tag metadata
    expect(md).not.toContain('backend');
  });

  it('uses localized section headings when language is set', () => {
    const frResume: Resume = {
      ...fullResume,
      language: 'fr',
    };
    const md = resumeToMarkdown(normalizeResume(frResume));
    expect(md).toContain('## Profil');
    expect(md).toContain('## Compétences');
    expect(md).toContain('## Expérience Professionnelle');
    expect(md).toContain('## Projets');
    expect(md).toContain('## Formation');
    expect(md).toContain('## Certifications');
  });

  it('uses English section headings when language is not set', () => {
    const md = resumeToMarkdown(normalizeResume(fullResume));
    expect(md).toContain('## Summary');
    expect(md).toContain('## Skills');
    expect(md).toContain('## Experience');
  });

  it('uses localized Present keyword in experience', () => {
    const frResume: Resume = {
      ...fullResume,
      language: 'fr',
    };
    const md = resumeToMarkdown(normalizeResume(frResume));
    expect(md).toContain('Présent');
  });

  it('uses localized month names in experience dates', () => {
    const frResume: Resume = {
      ...fullResume,
      language: 'fr',
    };
    const md = resumeToMarkdown(normalizeResume(frResume));
    expect(md).toContain('janv.');
  });

  it('respects custom section order', () => {
    const md = resumeToMarkdown(
      normalizeResume(fullResume, ['education', 'experience', 'skills'])
    );

    const eduIdx = md.indexOf('## Education');
    const expIdx = md.indexOf('## Experience');
    const skillIdx = md.indexOf('## Skills');

    expect(eduIdx).toBeLessThan(expIdx);
    expect(expIdx).toBeLessThan(skillIdx);
    // Sections not in custom order should not appear
    expect(md).not.toContain('## Summary');
    expect(md).not.toContain('## Projects');
  });
});
