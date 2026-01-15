import { describe, it, expect } from 'vitest';
import { fromJsonResume, toJsonResume, isJsonResumeFormat } from '../src/lib/json-resume.js';
import { parseResume } from '../src/lib/loader.js';

describe('JSON Resume support', () => {
  describe('isJsonResumeFormat', () => {
    it('detects JSON Resume format with basics section', () => {
      const jsonResume = {
        basics: { name: 'Test User' },
        work: [],
      };
      expect(isJsonResumeFormat(jsonResume)).toBe(true);
    });

    it('detects JSON Resume format with work position field', () => {
      const jsonResume = {
        work: [{ name: 'Company', position: 'Developer', startDate: '2020-01-01' }],
      };
      expect(isJsonResumeFormat(jsonResume)).toBe(true);
    });

    it('returns false for Vitae format', () => {
      const vitaeResume = {
        meta: { name: 'Test User' },
        experience: [{ company: 'Company', roles: [{ title: 'Dev', start: '2020' }] }],
      };
      expect(isJsonResumeFormat(vitaeResume)).toBe(false);
    });

    it('returns false for null/undefined', () => {
      expect(isJsonResumeFormat(null)).toBe(false);
      expect(isJsonResumeFormat(undefined)).toBe(false);
    });
  });

  describe('fromJsonResume', () => {
    it('converts basics to meta', () => {
      const jsonResume = {
        basics: {
          name: 'John Doe',
          label: 'Software Engineer',
          email: 'john@example.com',
          phone: '555-1234',
          location: { city: 'San Francisco', region: 'CA' },
        },
      };

      const result = fromJsonResume(jsonResume);

      expect(result.meta.name).toBe('John Doe');
      expect(result.meta.title).toBe('Software Engineer');
      expect(result.meta.email).toBe('john@example.com');
      expect(result.meta.phone).toBe('555-1234');
      expect(result.meta.location).toBe('San Francisco, CA');
    });

    it('converts profiles to links', () => {
      const jsonResume = {
        basics: {
          name: 'John Doe',
          url: 'https://johndoe.com',
          profiles: [
            { network: 'GitHub', url: 'https://github.com/johndoe' },
            { network: 'LinkedIn', url: 'https://linkedin.com/in/johndoe' },
          ],
        },
      };

      const result = fromJsonResume(jsonResume);

      expect(result.meta.links).toHaveLength(3);
      expect(result.meta.links![0]).toEqual({ url: 'https://johndoe.com' });
      expect(result.meta.links![1]).toEqual({
        label: 'GitHub',
        url: 'https://github.com/johndoe',
      });
    });

    it('converts work to experience', () => {
      const jsonResume = {
        basics: { name: 'Test' },
        work: [
          {
            name: 'Tech Corp',
            position: 'Senior Developer',
            startDate: '2020-01-01',
            endDate: '2023-06-30',
            location: 'Remote',
            highlights: ['Built features', 'Led team'],
          },
        ],
      };

      const result = fromJsonResume(jsonResume);

      expect(result.experience).toHaveLength(1);
      expect(result.experience[0]?.company).toBe('Tech Corp');
      expect(result.experience[0]?.roles).toHaveLength(1);
      expect(result.experience[0]?.roles[0]?.title).toBe('Senior Developer');
      expect(result.experience[0]?.roles[0]?.start).toBe('2020-01');
      expect(result.experience[0]?.roles[0]?.end).toBe('2023-06');
      expect(result.experience[0]?.roles[0]?.highlights).toEqual(['Built features', 'Led team']);
    });

    it('groups multiple roles at same company', () => {
      const jsonResume = {
        basics: { name: 'Test' },
        work: [
          { name: 'Tech Corp', position: 'Senior Dev', startDate: '2022-01-01' },
          { name: 'Tech Corp', position: 'Junior Dev', startDate: '2020-01-01' },
          { name: 'Other Corp', position: 'Developer', startDate: '2019-01-01' },
        ],
      };

      const result = fromJsonResume(jsonResume);

      expect(result.experience).toHaveLength(2);
      const techCorp = result.experience.find((e) => e.company === 'Tech Corp');
      expect(techCorp?.roles).toHaveLength(2);
    });

    it('converts skills with keywords', () => {
      const jsonResume = {
        basics: { name: 'Test' },
        skills: [
          { name: 'Languages', keywords: ['TypeScript', 'Python'] },
          { name: 'Frameworks', keywords: ['React', 'Node.js'] },
        ],
      };

      const result = fromJsonResume(jsonResume);

      expect(result.skills).toHaveLength(2);
      expect(result.skills![0]).toEqual({ category: 'Languages', items: ['TypeScript', 'Python'] });
    });

    it('converts education', () => {
      const jsonResume = {
        basics: { name: 'Test' },
        education: [
          {
            institution: 'MIT',
            studyType: 'BS',
            area: 'Computer Science',
            startDate: '2010-09-01',
            endDate: '2014-05-15',
          },
        ],
      };

      const result = fromJsonResume(jsonResume);

      expect(result.education).toHaveLength(1);
      expect(result.education![0]?.institution).toBe('MIT');
      expect(result.education![0]?.degree).toBe('BS');
      expect(result.education![0]?.field).toBe('Computer Science');
      expect(result.education![0]?.start).toBe('2010-09');
      expect(result.education![0]?.end).toBe('2014-05');
    });

    it('converts certificates', () => {
      const jsonResume = {
        basics: { name: 'Test' },
        certificates: [
          {
            name: 'AWS Solutions Architect',
            issuer: 'Amazon',
            date: '2023-06-15',
            url: 'https://aws.amazon.com/verify',
          },
        ],
      };

      const result = fromJsonResume(jsonResume);

      expect(result.certifications).toHaveLength(1);
      expect(result.certifications![0]?.name).toBe('AWS Solutions Architect');
      expect(result.certifications![0]?.issuer).toBe('Amazon');
      expect(result.certifications![0]?.date).toBe('2023-06');
    });

    it('handles missing sections gracefully', () => {
      const jsonResume = {
        basics: { name: 'Minimal User' },
      };

      const result = fromJsonResume(jsonResume);

      expect(result.meta.name).toBe('Minimal User');
      expect(result.experience).toBeDefined();
      expect(result.skills).toBeUndefined();
      expect(result.projects).toBeUndefined();
    });
  });

  describe('toJsonResume', () => {
    it('converts Vitae resume to JSON Resume format', () => {
      const vitaeResume = {
        meta: {
          name: 'John Doe',
          title: 'Engineer',
          email: 'john@example.com',
          location: 'San Francisco, CA',
          links: [{ label: 'GitHub', url: 'https://github.com/johndoe' }],
        },
        summary: 'A software engineer',
        experience: [
          {
            company: 'Tech Corp',
            roles: [{ title: 'Developer', start: '2020-01', end: '2023-06' }],
          },
        ],
      };

      const result = toJsonResume(vitaeResume);

      expect(result.basics?.name).toBe('John Doe');
      expect(result.basics?.label).toBe('Engineer');
      expect(result.basics?.email).toBe('john@example.com');
      expect(result.basics?.summary).toBe('A software engineer');
      expect(result.basics?.location?.city).toBe('San Francisco');
      expect(result.basics?.location?.region).toBe('CA');
      expect(result.basics?.profiles).toHaveLength(1);
      expect(result.work).toHaveLength(1);
      expect(result.work?.[0]?.name).toBe('Tech Corp');
      expect(result.work?.[0]?.position).toBe('Developer');
    });

    it('flattens multiple roles into separate work entries', () => {
      const vitaeResume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Tech Corp',
            roles: [
              { title: 'Senior Dev', start: '2022' },
              { title: 'Junior Dev', start: '2020' },
            ],
          },
        ],
      };

      const result = toJsonResume(vitaeResume);

      expect(result.work).toHaveLength(2);
      expect(result.work?.[0]?.name).toBe('Tech Corp');
      expect(result.work?.[0]?.position).toBe('Senior Dev');
      expect(result.work?.[1]?.position).toBe('Junior Dev');
    });
  });

  describe('parseResume with JSON Resume', () => {
    it('auto-detects and converts JSON Resume format', async () => {
      const jsonResumeContent = JSON.stringify({
        basics: {
          name: 'Auto Detected',
          label: 'Developer',
        },
        work: [
          {
            name: 'Company',
            position: 'Dev',
            startDate: '2020-01-01',
          },
        ],
      });

      const result = await parseResume(jsonResumeContent);

      expect(result.meta.name).toBe('Auto Detected');
      expect(result.meta.title).toBe('Developer');
      expect(result.experience[0]?.company).toBe('Company');
    });

    it('can force JSON Resume interpretation', async () => {
      const yamlContent = `
basics:
  name: YAML JSON Resume
  label: Engineer
work:
  - name: Company
    position: Developer
    startDate: "2020-01"
`;

      const result = await parseResume(yamlContent, { jsonResume: true });

      expect(result.meta.name).toBe('YAML JSON Resume');
      expect(result.meta.title).toBe('Engineer');
    });
  });
});
