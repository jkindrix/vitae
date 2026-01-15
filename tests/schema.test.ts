import { describe, it, expect } from 'vitest';
import { validateResume, assertValidResume } from '../src/lib/schema.js';
import type { Resume } from '../src/types/index.js';

describe('schema validation', () => {
  const validResume: Resume = {
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
    summary: 'Experienced software engineer with 10 years in the industry.',
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
        ],
      },
    ],
    projects: [
      {
        name: 'Open Source Project',
        url: 'https://github.com/project',
        description: 'A helpful tool',
        highlights: ['1000+ stars'],
      },
    ],
    education: [
      {
        institution: 'University of Example',
        degree: 'BS',
        field: 'Computer Science',
        start: '2010',
        end: '2014',
      },
    ],
    certifications: [
      {
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
        date: '2023',
        url: 'https://aws.amazon.com/verify',
      },
    ],
  };

  describe('validateResume', () => {
    it('validates a complete valid resume', async () => {
      const result = await validateResume(validResume);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('validates minimal resume with only required fields', async () => {
      const minimal = {
        meta: { name: 'John Doe' },
        experience: [
          {
            company: 'Company',
            roles: [{ title: 'Developer', start: '2020-01' }],
          },
        ],
      };
      const result = await validateResume(minimal);
      expect(result.valid).toBe(true);
    });

    it('rejects resume missing meta.name', async () => {
      const invalid = {
        meta: { title: 'Engineer' },
        experience: [
          {
            company: 'Company',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
      // Error should mention 'name' is required in /meta
      expect(result.errors.some((e) => e.path.includes('meta') || e.message.includes('name'))).toBe(
        true
      );
    });

    it('rejects resume missing experience', async () => {
      const invalid = {
        meta: { name: 'John Doe' },
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('experience'))).toBe(true);
    });

    it('validates email format', async () => {
      const invalid = {
        meta: { name: 'John', email: 'not-an-email' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('email'))).toBe(true);
    });

    it('validates URL format in links', async () => {
      const invalid = {
        meta: {
          name: 'John',
          links: [{ url: 'not-a-url' }],
        },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('url'))).toBe(true);
    });

    it('validates date format in roles', async () => {
      const invalid = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: 'invalid-date' }],
          },
        ],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.path.includes('start'))).toBe(true);
    });

    it('accepts "present" as end date', async () => {
      const resume = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020-01', end: 'present' }],
          },
        ],
      };
      const result = await validateResume(resume);
      expect(result.valid).toBe(true);
    });

    it('accepts "Present" as end date (case insensitive)', async () => {
      const resume = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020-01', end: 'Present' }],
          },
        ],
      };
      const result = await validateResume(resume);
      expect(result.valid).toBe(true);
    });

    it('accepts year-only date format', async () => {
      const resume = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = await validateResume(resume);
      expect(result.valid).toBe(true);
    });

    it('validates project URL format', async () => {
      const invalid = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
        projects: [{ name: 'Project', url: 'not-valid' }],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
    });

    it('validates certification URL format', async () => {
      const invalid = {
        meta: { name: 'John' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
        certifications: [{ name: 'Cert', url: 'bad-url' }],
      };
      const result = await validateResume(invalid);
      expect(result.valid).toBe(false);
    });
  });

  describe('assertValidResume', () => {
    it('returns resume data for valid input', async () => {
      const result = await assertValidResume(validResume);
      expect(result).toEqual(validResume);
    });

    it('throws on invalid input', async () => {
      const invalid = { meta: {} };
      await expect(assertValidResume(invalid)).rejects.toThrow('Invalid resume data');
    });

    it('includes field paths in error message', async () => {
      const invalid = { meta: { name: 'John' } };
      await expect(assertValidResume(invalid)).rejects.toThrow('experience');
    });
  });
});
