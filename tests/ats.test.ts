import { describe, it, expect } from 'vitest';
import { analyzeResume } from '../src/lib/ats.js';
import type { Resume } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function comprehensive(): Resume {
  return {
    meta: {
      name: 'Jane Doe',
      title: 'Senior Software Engineer',
      email: 'jane@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
      links: [
        { label: 'GitHub', url: 'https://github.com/janedoe' },
        { url: 'https://linkedin.com/in/janedoe' },
      ],
    },
    summary:
      'Experienced software engineer with 10 years building scalable web applications and leading high-performing engineering teams.',
    skills: [
      { category: 'Languages', items: ['TypeScript', 'Python', 'Go', 'Rust'] },
      { category: 'Frameworks', items: ['React', 'Node.js', 'Django'] },
      { category: 'Tools', items: ['Docker', 'Kubernetes', 'AWS'] },
      { category: 'Practices', items: ['CI/CD', 'TDD', 'Agile'] },
    ],
    experience: [
      {
        company: 'BigCorp',
        roles: [
          {
            title: 'Senior Engineer',
            start: '2021-01',
            end: 'present',
            location: 'Remote',
            highlights: [
              'Led migration to microservices architecture serving 2M+ users',
              'Reduced API response times by 60% through caching and query optimization',
              'Mentored team of 5 junior engineers through code reviews and pairing sessions',
            ],
          },
          {
            title: 'Software Engineer',
            start: '2018-06',
            end: '2021-01',
            location: 'San Francisco, CA',
            highlights: [
              'Built real-time data pipeline processing 500K events per second',
              'Implemented OAuth2 authentication system used by 50+ internal services',
              'Designed and launched customer-facing analytics dashboard',
            ],
          },
        ],
      },
      {
        company: 'StartupCo',
        roles: [
          {
            title: 'Full Stack Developer',
            start: '2015-03',
            end: '2018-06',
            location: 'Austin, TX',
            highlights: [
              'Built core product from prototype to 100K active users in 18 months',
              'Developed RESTful API powering mobile and web applications',
              'Implemented automated CI/CD pipeline reducing deployment time by 80%',
            ],
          },
        ],
      },
    ],
    education: [
      {
        institution: 'MIT',
        degree: 'BS',
        field: 'Computer Science',
        end: '2015',
      },
    ],
    projects: [
      {
        name: 'OSS Framework',
        url: 'https://github.com/janedoe/framework',
        description: 'A lightweight web framework for building APIs',
        highlights: ['2000+ GitHub stars', 'Used by 50+ companies in production'],
      },
    ],
    certifications: [
      { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' },
    ],
  };
}

function minimal(): Resume {
  return {
    meta: { name: 'Test User' },
    experience: [
      { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
    ],
  };
}

function withGaps(): Resume {
  return {
    meta: {
      name: 'Gap Person',
      email: 'gap@test.com',
      phone: '555-0000',
      location: 'NYC',
    },
    summary: 'Engineer with varied experience across multiple companies and industries.',
    skills: [
      { category: 'Languages', items: ['JavaScript', 'Python'] },
      { category: 'Tools', items: ['Git', 'Docker'] },
    ],
    experience: [
      {
        company: 'LatestCo',
        roles: [
          {
            title: 'Engineer',
            start: '2023-01',
            end: 'present',
            location: 'Remote',
            highlights: ['Working on platform', 'Leading frontend team'],
          },
        ],
      },
      {
        company: 'OldCo',
        roles: [
          {
            title: 'Developer',
            start: '2019-01',
            end: '2021-06',
            location: 'Austin',
            highlights: ['Built features', 'Improved performance by 40%'],
          },
        ],
      },
    ],
    education: [
      { institution: 'State U', degree: 'BS', field: 'CS', end: '2018' },
    ],
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('analyzeResume', () => {
  describe('overall scoring', () => {
    it('returns a high score for a comprehensive resume', () => {
      const result = analyzeResume(comprehensive());
      expect(result.score).toBeGreaterThanOrEqual(85);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('returns a low score for a minimal resume', () => {
      const result = analyzeResume(minimal());
      expect(result.score).toBeLessThan(70);
      expect(result.findings.length).toBeGreaterThan(5);
    });

    it('score is between 0 and 100', () => {
      for (const resume of [comprehensive(), minimal(), withGaps()]) {
        const result = analyzeResume(resume);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(100);
      }
    });

    it('returns all 6 categories', () => {
      const result = analyzeResume(comprehensive());
      expect(result.categories).toHaveLength(6);
      const names = result.categories.map((c) => c.category);
      expect(names).toEqual([
        'contact',
        'sections',
        'experience',
        'content',
        'dates',
        'structure',
      ]);
    });

    it('category weights sum to 100', () => {
      const result = analyzeResume(comprehensive());
      const total = result.categories.reduce((s, c) => s + c.weight, 0);
      expect(total).toBe(100);
    });
  });

  describe('contact completeness', () => {
    it('gives full marks for complete contact info', () => {
      const result = analyzeResume(comprehensive());
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.score).toBe(100);
      expect(contact.findings).toHaveLength(0);
    });

    it('penalizes missing email', () => {
      const resume = comprehensive();
      delete (resume.meta as Record<string, unknown>).email;
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.score).toBeLessThan(100);
      expect(contact.findings.some((f) => f.message.includes('Email'))).toBe(true);
    });

    it('penalizes missing phone', () => {
      const resume = comprehensive();
      delete (resume.meta as Record<string, unknown>).phone;
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.score).toBeLessThan(100);
      expect(contact.findings.some((f) => f.message.includes('Phone'))).toBe(true);
    });

    it('penalizes missing location', () => {
      const resume = comprehensive();
      delete (resume.meta as Record<string, unknown>).location;
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.findings.some((f) => f.message.includes('Location'))).toBe(true);
    });

    it('penalizes missing professional links', () => {
      const resume = comprehensive();
      resume.meta.links = [{ url: 'https://myblog.example.com' }];
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.findings.some((f) => f.message.includes('professional profile'))).toBe(true);
    });

    it('detects LinkedIn as professional link', () => {
      const resume = comprehensive();
      resume.meta.links = [{ url: 'https://linkedin.com/in/test' }];
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.findings.some((f) => f.message.includes('professional profile'))).toBe(false);
    });

    it('detects GitHub as professional link', () => {
      const resume = comprehensive();
      resume.meta.links = [{ url: 'https://github.com/test' }];
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.findings.some((f) => f.message.includes('professional profile'))).toBe(false);
    });

    it('penalizes missing title', () => {
      const resume = comprehensive();
      delete (resume.meta as Record<string, unknown>).title;
      const result = analyzeResume(resume);
      const contact = result.categories.find((c) => c.category === 'contact')!;
      expect(contact.findings.some((f) => f.message.includes('title'))).toBe(true);
    });
  });

  describe('section presence', () => {
    it('gives full marks when all key sections present', () => {
      const result = analyzeResume(comprehensive());
      const sections = result.categories.find((c) => c.category === 'sections')!;
      expect(sections.score).toBe(100);
    });

    it('penalizes missing summary', () => {
      const resume = comprehensive();
      delete (resume as Record<string, unknown>).summary;
      const result = analyzeResume(resume);
      const sections = result.categories.find((c) => c.category === 'sections')!;
      expect(sections.score).toBeLessThan(100);
      expect(sections.findings.some((f) => f.message.includes('summary'))).toBe(true);
    });

    it('penalizes missing skills', () => {
      const resume = comprehensive();
      delete (resume as Record<string, unknown>).skills;
      const result = analyzeResume(resume);
      const sections = result.categories.find((c) => c.category === 'sections')!;
      expect(sections.findings.some((f) => f.message.includes('Skills'))).toBe(true);
    });

    it('penalizes missing education', () => {
      const resume = comprehensive();
      delete (resume as Record<string, unknown>).education;
      const result = analyzeResume(resume);
      const sections = result.categories.find((c) => c.category === 'sections')!;
      expect(sections.findings.some((f) => f.message.includes('Education'))).toBe(true);
    });
  });

  describe('experience quality', () => {
    it('gives full marks for roles with good highlights', () => {
      const result = analyzeResume(comprehensive());
      const exp = result.categories.find((c) => c.category === 'experience')!;
      expect(exp.score).toBe(100);
    });

    it('penalizes roles with no highlights', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020', location: 'Remote' }],
          },
        ],
      };
      const result = analyzeResume(resume);
      const exp = result.categories.find((c) => c.category === 'experience')!;
      expect(exp.score).toBeLessThan(100);
      expect(exp.findings.some((f) => f.message.includes('no highlights'))).toBe(true);
    });

    it('penalizes roles with only 1 highlight', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [
              {
                title: 'Dev',
                start: '2020',
                location: 'Remote',
                highlights: ['Did something meaningful for the company'],
              },
            ],
          },
        ],
      };
      const result = analyzeResume(resume);
      const exp = result.categories.find((c) => c.category === 'experience')!;
      expect(exp.findings.some((f) => f.message.includes('only 1 highlight'))).toBe(true);
    });

    it('warns about excessive highlights', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [
              {
                title: 'Dev',
                start: '2020',
                location: 'Remote',
                highlights: Array.from({ length: 10 }, (_, i) => `Achievement number ${i + 1} that demonstrates value`),
              },
            ],
          },
        ],
      };
      const result = analyzeResume(resume);
      const exp = result.categories.find((c) => c.category === 'experience')!;
      expect(exp.findings.some((f) => f.message.includes('trimming'))).toBe(true);
    });

    it('handles multiple companies and roles', () => {
      const result = analyzeResume(comprehensive());
      const exp = result.categories.find((c) => c.category === 'experience')!;
      // comprehensive() has 3 roles across 2 companies — all with highlights
      expect(exp.score).toBe(100);
    });
  });

  describe('content depth', () => {
    it('penalizes short summary', () => {
      const resume = comprehensive();
      resume.summary = 'Short.';
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('very short'))).toBe(true);
    });

    it('penalizes very long summary', () => {
      const resume = comprehensive();
      resume.summary = 'A '.repeat(300);
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('long'))).toBe(true);
    });

    it('penalizes short highlights', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [
              {
                title: 'Dev',
                start: '2020',
                highlights: ['OK', 'Tiny', 'Built a comprehensive distributed system for processing data'],
              },
            ],
          },
        ],
      };
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('Short highlight'))).toBe(true);
    });

    it('penalizes too few skill categories', () => {
      const resume = comprehensive();
      resume.skills = [{ category: 'All', items: ['JS', 'Python', 'Go', 'Rust', 'TS'] }];
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('skill category'))).toBe(true);
    });

    it('penalizes too few total skills', () => {
      const resume = comprehensive();
      resume.skills = [
        { category: 'A', items: ['X'] },
        { category: 'B', items: ['Y'] },
      ];
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('total skills'))).toBe(true);
    });

    it('reports no highlights as error when experience exists', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const result = analyzeResume(resume);
      const content = result.categories.find((c) => c.category === 'content')!;
      expect(content.findings.some((f) => f.message.includes('no bullet points'))).toBe(true);
    });
  });

  describe('date gap detection', () => {
    it('detects no gaps in continuous employment', () => {
      const result = analyzeResume(comprehensive());
      expect(result.gaps).toHaveLength(0);
      const dates = result.categories.find((c) => c.category === 'dates')!;
      expect(dates.score).toBe(100);
    });

    it('detects a gap between roles', () => {
      // withGaps: OldCo ends 2021-06, LatestCo starts 2023-01 = 19-month gap
      const result = analyzeResume(withGaps());
      expect(result.gaps.length).toBeGreaterThan(0);
      const gap = result.gaps[0]!;
      expect(gap.months).toBeGreaterThan(12);
      expect(gap.fromRole).toContain('OldCo');
      expect(gap.toRole).toContain('LatestCo');
    });

    it('classifies >12 month gaps as errors', () => {
      const result = analyzeResume(withGaps());
      const dates = result.categories.find((c) => c.category === 'dates')!;
      expect(dates.findings.some((f) => f.severity === 'error')).toBe(true);
    });

    it('classifies 7-12 month gaps as warnings', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'NewCo',
            roles: [{ title: 'Dev', start: '2022-02', end: 'present' }],
          },
          {
            company: 'OldCo',
            roles: [{ title: 'Dev', start: '2020-01', end: '2021-06' }],
          },
        ],
      };
      const result = analyzeResume(resume);
      expect(result.gaps.length).toBe(1);
      expect(result.gaps[0]!.months).toBe(8); // 2021-06 to 2022-02
      const dates = result.categories.find((c) => c.category === 'dates')!;
      expect(dates.findings.some((f) => f.severity === 'warning')).toBe(true);
    });

    it('handles overlapping roles correctly', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [
              { title: 'Lead', start: '2021-01', end: 'present' },
              { title: 'Dev', start: '2019-01', end: '2021-06' },
            ],
          },
        ],
      };
      const result = analyzeResume(resume);
      // Roles overlap (Dev ends 2021-06 but Lead starts 2021-01), no gap
      expect(result.gaps).toHaveLength(0);
    });

    it('handles year-only dates', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'NewCo',
            roles: [{ title: 'Dev', start: '2022', end: 'present' }],
          },
          {
            company: 'OldCo',
            roles: [{ title: 'Dev', start: '2019', end: '2021' }],
          },
        ],
      };
      const result = analyzeResume(resume);
      // 2021 end (month 11) to 2022 start (month 0) = 1 month, no gap
      expect(result.gaps).toHaveLength(0);
    });

    it('handles present as end date', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020-01', end: 'present' }],
          },
        ],
      };
      const result = analyzeResume(resume);
      expect(result.gaps).toHaveLength(0);
    });
  });

  describe('structure', () => {
    it('gives good marks for well-structured resume', () => {
      const result = analyzeResume(comprehensive());
      const structure = result.categories.find((c) => c.category === 'structure')!;
      expect(structure.score).toBeGreaterThanOrEqual(90);
    });

    it('penalizes minimal section count', () => {
      const result = analyzeResume(minimal());
      const structure = result.categories.find((c) => c.category === 'structure')!;
      expect(structure.score).toBeLessThan(100);
    });

    it('penalizes companies with no roles', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [{ company: 'Co', roles: [] }],
      };
      const result = analyzeResume(resume);
      const structure = result.categories.find((c) => c.category === 'structure')!;
      expect(structure.findings.some((f) => f.message.includes('no roles'))).toBe(true);
    });

    it('penalizes empty skill items', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        skills: [{ category: 'Empty', items: [] }],
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const result = analyzeResume(resume);
      const structure = result.categories.find((c) => c.category === 'structure')!;
      expect(structure.findings.some((f) => f.message.includes('no items'))).toBe(true);
    });

    it('penalizes education without degree and field', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        education: [{ institution: 'Some University' }],
      };
      const result = analyzeResume(resume);
      const structure = result.categories.find((c) => c.category === 'structure')!;
      expect(structure.findings.some((f) => f.message.includes('missing degree'))).toBe(true);
    });
  });

  describe('keyword matching', () => {
    const jobDescription = `
      We are looking for a Senior Software Engineer with experience in
      TypeScript, React, Node.js, and AWS. The ideal candidate has
      experience with microservices architecture, CI/CD pipelines,
      and leading engineering teams. Experience with Python and
      Docker is a plus. Must have strong communication skills and
      experience with agile methodologies.
    `;

    it('returns undefined keywords when no job description provided', () => {
      const result = analyzeResume(comprehensive());
      expect(result.keywords).toBeUndefined();
    });

    it('returns keyword analysis when job description provided', () => {
      const result = analyzeResume(comprehensive(), { jobDescription });
      expect(result.keywords).toBeDefined();
      expect(result.keywords!.totalKeywords).toBeGreaterThan(0);
    });

    it('matches keywords found in skills', () => {
      const result = analyzeResume(comprehensive(), { jobDescription });
      const ts = result.keywords!.keywords.find(
        (k) => k.keyword === 'typescript'
      );
      expect(ts?.found).toBe(true);
      expect(ts?.foundIn).toContain('skills');
    });

    it('matches keywords found in experience', () => {
      const result = analyzeResume(comprehensive(), { jobDescription });
      const micro = result.keywords!.keywords.find(
        (k) => k.keyword === 'microservices'
      );
      expect(micro?.found).toBe(true);
      expect(micro?.foundIn).toContain('experience');
    });

    it('reports missing keywords', () => {
      const result = analyzeResume(minimal(), { jobDescription });
      const missing = result.keywords!.keywords.filter((k) => !k.found);
      expect(missing.length).toBeGreaterThan(0);
    });

    it('handles case-insensitive matching', () => {
      const result = analyzeResume(comprehensive(), {
        jobDescription: 'TYPESCRIPT REACT NODE.JS',
      });
      const ts = result.keywords!.keywords.find(
        (k) => k.keyword === 'typescript'
      );
      expect(ts?.found).toBe(true);
    });

    it('reports match percentage', () => {
      const result = analyzeResume(comprehensive(), { jobDescription });
      expect(result.keywords!.matchPercentage).toBeGreaterThanOrEqual(0);
      expect(result.keywords!.matchPercentage).toBeLessThanOrEqual(100);
    });

    it('identifies which sections contain each keyword', () => {
      const result = analyzeResume(comprehensive(), { jobDescription });
      const matched = result.keywords!.keywords.filter((k) => k.found);
      for (const k of matched) {
        expect(k.foundIn.length).toBeGreaterThan(0);
      }
    });

    it('returns 100% match when no keywords extracted', () => {
      const result = analyzeResume(comprehensive(), {
        jobDescription: 'the a an is are',
      });
      expect(result.keywords!.matchPercentage).toBe(100);
    });
  });

  describe('tagged highlights', () => {
    it('handles tagged highlights in content analysis', () => {
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
                  'Plain highlight that is long enough for content check',
                  { text: 'Tagged highlight that is also long enough for check', tags: ['backend'] },
                ],
              },
            ],
          },
        ],
      };
      const result = analyzeResume(resume);
      // Should not crash, and both highlights should be counted
      const exp = result.categories.find((c) => c.category === 'experience')!;
      expect(exp.findings.every((f) => !f.message.includes('no highlights'))).toBe(true);
    });

    it('extracts tagged highlight text for keyword matching', () => {
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
                  { text: 'Built microservices architecture with Kubernetes', tags: ['backend'] },
                ],
              },
            ],
          },
        ],
      };
      const result = analyzeResume(resume, {
        jobDescription: 'microservices kubernetes',
      });
      const micro = result.keywords!.keywords.find(
        (k) => k.keyword === 'microservices'
      );
      expect(micro?.found).toBe(true);
    });
  });

  describe('result shape', () => {
    it('returns all required fields', () => {
      const result = analyzeResume(comprehensive());
      expect(typeof result.score).toBe('number');
      expect(Array.isArray(result.categories)).toBe(true);
      expect(Array.isArray(result.findings)).toBe(true);
      expect(Array.isArray(result.gaps)).toBe(true);
    });

    it('findings have correct severity types', () => {
      const result = analyzeResume(minimal());
      for (const f of result.findings) {
        expect(['error', 'warning', 'suggestion']).toContain(f.severity);
        expect(['contact', 'sections', 'experience', 'content', 'dates', 'structure']).toContain(f.category);
        expect(typeof f.message).toBe('string');
      }
    });

    it('category scores are 0-100', () => {
      for (const resume of [comprehensive(), minimal(), withGaps()]) {
        const result = analyzeResume(resume);
        for (const cat of result.categories) {
          expect(cat.score).toBeGreaterThanOrEqual(0);
          expect(cat.score).toBeLessThanOrEqual(100);
        }
      }
    });

    it('gaps have required fields', () => {
      const result = analyzeResume(withGaps());
      for (const gap of result.gaps) {
        expect(typeof gap.from).toBe('string');
        expect(typeof gap.to).toBe('string');
        expect(typeof gap.months).toBe('number');
        expect(typeof gap.fromRole).toBe('string');
        expect(typeof gap.toRole).toBe('string');
        expect(gap.months).toBeGreaterThan(0);
      }
    });
  });
});
