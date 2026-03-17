import { describe, it, expect } from 'vitest';
import { renderStandaloneHtml } from '../src/lib/renderer.js';
import { normalizeResume } from '../src/lib/normalize.js';
import { auditAccessibility } from '../src/lib/a11y.js';
import type { Resume } from '../src/types/index.js';

describe('bundled theme accessibility', () => {
  const resume: Resume = {
    meta: {
      name: 'Jane Smith',
      title: 'Senior Engineer',
      email: 'jane@example.com',
      phone: '555-1234',
      location: 'San Francisco, CA',
      links: [{ label: 'GitHub', url: 'https://github.com/janesmith' }],
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
            highlights: ['Led team of 5', 'Improved performance by 50%'],
          },
        ],
      },
    ],
    education: [{ institution: 'MIT', degree: 'BS', field: 'Computer Science', end: '2018' }],
    projects: [
      {
        name: 'OSS Tool',
        url: 'https://github.com/tool',
        description: 'A CLI tool',
        highlights: ['1000+ stars'],
      },
    ],
    certifications: [{ name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' }],
  };

  const themes = ['minimal', 'modern', 'professional'] as const;

  for (const theme of themes) {
    describe(`theme: ${theme}`, () => {
      it('scores above accessibility threshold', async () => {
        const html = await renderStandaloneHtml(normalizeResume(resume), theme);
        const result = auditAccessibility(html);
        expect(result.score).toBeGreaterThanOrEqual(80);
      });

      it('has no error-severity findings', async () => {
        const html = await renderStandaloneHtml(normalizeResume(resume), theme);
        const errors = auditAccessibility(html).findings.filter((f) => f.severity === 'error');
        expect(errors).toHaveLength(0);
      });
    });
  }
});
