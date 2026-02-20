import { describe, it, expect } from 'vitest';
import { normalizeResume, DEFAULT_SECTION_ORDER } from '../src/lib/normalize.js';
import type { Resume, SectionName } from '../src/types/index.js';

/**
 * Base resume with tagged highlights for normalization testing.
 */
function makeResume(): Resume {
  return {
    meta: { name: 'Test User', title: 'Engineer' },
    summary: 'An engineer.',
    skills: [
      { category: 'Languages', items: ['TS', 'Go'], tags: ['backend'] },
      { category: 'Frameworks', items: ['React'] },
    ],
    experience: [
      {
        company: 'Acme',
        roles: [
          {
            title: 'Senior Dev',
            start: '2021-01',
            end: 'present',
            location: 'Remote',
            summary: 'Led team',
            highlights: [
              'Plain highlight',
              { text: 'Tagged highlight', tags: ['backend'] },
            ],
            tags: ['backend'],
          },
        ],
        tags: ['backend'],
      },
    ],
    projects: [
      {
        name: 'OSS Tool',
        url: 'https://example.com',
        description: 'A tool',
        highlights: [
          { text: 'Starred', tags: ['oss'] },
          'Used widely',
        ],
        tags: ['oss'],
      },
    ],
    education: [
      {
        institution: 'University',
        degree: 'BS',
        field: 'CS',
        start: '2015',
        end: '2019',
        highlights: [
          { text: 'Honors', tags: ['academic'] },
          'Graduated',
        ],
        tags: ['academic'],
      },
    ],
    certifications: [
      { name: 'AWS SA', issuer: 'Amazon', date: '2023', url: 'https://aws.com', tags: ['cloud'] },
    ],
    volunteer: [
      {
        organization: 'Charity',
        position: 'Volunteer',
        start: '2020',
        end: '2021',
        summary: 'Helped out',
        highlights: [
          { text: 'Fundraised', tags: ['community'] },
          'Organized events',
        ],
        tags: ['community'],
      },
    ],
    languages: [{ language: 'English', fluency: 'Native' }],
  };
}

describe('normalizeResume', () => {
  // -----------------------------------------------------------------------
  // Highlight flattening
  // -----------------------------------------------------------------------
  describe('highlight flattening', () => {
    it('converts tagged highlights to plain strings in roles', () => {
      const result = normalizeResume(makeResume());

      const highlights = result.experience[0].roles[0].highlights;
      expect(highlights).toEqual(['Plain highlight', 'Tagged highlight']);
      // All should be strings
      highlights?.forEach((h) => expect(typeof h).toBe('string'));
    });

    it('converts tagged highlights to plain strings in projects', () => {
      const result = normalizeResume(makeResume());

      expect(result.projects?.[0].highlights).toEqual(['Starred', 'Used widely']);
    });

    it('converts tagged highlights to plain strings in education', () => {
      const result = normalizeResume(makeResume());

      expect(result.education?.[0].highlights).toEqual(['Honors', 'Graduated']);
    });

    it('converts tagged highlights to plain strings in volunteer', () => {
      const result = normalizeResume(makeResume());

      expect(result.volunteer?.[0].highlights).toEqual(['Fundraised', 'Organized events']);
    });

    it('handles roles with no highlights', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = normalizeResume(resume);

      expect(result.experience[0].roles[0].highlights).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Tag stripping
  // -----------------------------------------------------------------------
  describe('tag stripping', () => {
    it('strips tags from skill categories', () => {
      const result = normalizeResume(makeResume());

      result.skills?.forEach((s) => {
        expect(s).not.toHaveProperty('tags');
      });
    });

    it('strips tags from certifications', () => {
      const result = normalizeResume(makeResume());

      result.certifications?.forEach((c) => {
        expect(c).not.toHaveProperty('tags');
      });
      // Other fields preserved
      expect(result.certifications?.[0].name).toBe('AWS SA');
      expect(result.certifications?.[0].issuer).toBe('Amazon');
      expect(result.certifications?.[0].date).toBe('2023');
      expect(result.certifications?.[0].url).toBe('https://aws.com');
    });
  });

  // -----------------------------------------------------------------------
  // Section ordering — default
  // -----------------------------------------------------------------------
  describe('section ordering', () => {
    it('produces sections array with default order', () => {
      const result = normalizeResume(makeResume());

      // The resume has: summary, skills, experience, projects, education,
      // certifications, languages, volunteer (no awards, publications, references)
      expect(result.sections).toEqual([
        'summary',
        'skills',
        'experience',
        'projects',
        'education',
        'certifications',
        'languages',
        'volunteer',
      ]);
    });

    it('only includes sections that have content', () => {
      const resume: Resume = {
        meta: { name: 'Minimal' },
        experience: [
          {
            company: 'Co',
            roles: [{ title: 'Dev', start: '2020' }],
          },
        ],
      };
      const result = normalizeResume(resume);

      expect(result.sections).toEqual(['experience']);
    });

    it('includes summary section when summary exists', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        summary: 'A summary.',
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const result = normalizeResume(resume);

      expect(result.sections).toContain('summary');
    });
  });

  // -----------------------------------------------------------------------
  // Custom section order
  // -----------------------------------------------------------------------
  describe('custom section order', () => {
    it('respects provided section order', () => {
      const resume = makeResume();
      const customOrder: SectionName[] = ['experience', 'education', 'skills'];
      const result = normalizeResume(resume, customOrder);

      expect(result.sections).toEqual(['experience', 'education', 'skills']);
    });

    it('filters custom order to sections with content', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        skills: [{ category: 'Lang', items: ['TS'] }],
      };
      const customOrder: SectionName[] = ['awards', 'skills', 'experience', 'projects'];
      const result = normalizeResume(resume, customOrder);

      // awards and projects don't exist, so filtered out
      expect(result.sections).toEqual(['skills', 'experience']);
    });

    it('omits sections not listed in custom order', () => {
      const resume = makeResume();
      // Only include experience — everything else should be excluded from sections
      const customOrder: SectionName[] = ['experience'];
      const result = normalizeResume(resume, customOrder);

      expect(result.sections).toEqual(['experience']);
      // But other data is still on the object (sections just controls rendering order)
      expect(result.skills).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Preserves non-highlight fields
  // -----------------------------------------------------------------------
  describe('field preservation', () => {
    it('preserves role optional fields', () => {
      const result = normalizeResume(makeResume());
      const role = result.experience[0].roles[0];

      expect(role.title).toBe('Senior Dev');
      expect(role.start).toBe('2021-01');
      expect(role.end).toBe('present');
      expect(role.location).toBe('Remote');
      expect(role.summary).toBe('Led team');
    });

    it('preserves project optional fields', () => {
      const result = normalizeResume(makeResume());
      const project = result.projects?.[0];

      expect(project?.name).toBe('OSS Tool');
      expect(project?.url).toBe('https://example.com');
      expect(project?.description).toBe('A tool');
    });

    it('preserves education optional fields', () => {
      const result = normalizeResume(makeResume());
      const edu = result.education?.[0];

      expect(edu?.institution).toBe('University');
      expect(edu?.degree).toBe('BS');
      expect(edu?.field).toBe('CS');
      expect(edu?.start).toBe('2015');
      expect(edu?.end).toBe('2019');
    });

    it('preserves volunteer optional fields', () => {
      const result = normalizeResume(makeResume());
      const vol = result.volunteer?.[0];

      expect(vol?.organization).toBe('Charity');
      expect(vol?.position).toBe('Volunteer');
      expect(vol?.start).toBe('2020');
      expect(vol?.end).toBe('2021');
      expect(vol?.summary).toBe('Helped out');
    });

    it('preserves passthrough sections (languages, awards, etc.)', () => {
      const result = normalizeResume(makeResume());

      expect(result.languages).toEqual([{ language: 'English', fluency: 'Native' }]);
    });

    it('preserves meta unchanged', () => {
      const result = normalizeResume(makeResume());

      expect(result.meta).toEqual({ name: 'Test User', title: 'Engineer' });
    });
  });

  // -----------------------------------------------------------------------
  // DEFAULT_SECTION_ORDER
  // -----------------------------------------------------------------------
  describe('DEFAULT_SECTION_ORDER', () => {
    it('contains all 11 section names', () => {
      expect(DEFAULT_SECTION_ORDER).toHaveLength(11);
    });

    it('starts with summary and includes all section types', () => {
      expect(DEFAULT_SECTION_ORDER[0]).toBe('summary');
      expect(DEFAULT_SECTION_ORDER).toContain('skills');
      expect(DEFAULT_SECTION_ORDER).toContain('experience');
      expect(DEFAULT_SECTION_ORDER).toContain('projects');
      expect(DEFAULT_SECTION_ORDER).toContain('education');
      expect(DEFAULT_SECTION_ORDER).toContain('certifications');
      expect(DEFAULT_SECTION_ORDER).toContain('languages');
      expect(DEFAULT_SECTION_ORDER).toContain('awards');
      expect(DEFAULT_SECTION_ORDER).toContain('publications');
      expect(DEFAULT_SECTION_ORDER).toContain('volunteer');
      expect(DEFAULT_SECTION_ORDER).toContain('references');
    });
  });

  // -----------------------------------------------------------------------
  // Empty / undefined section handling
  // -----------------------------------------------------------------------
  describe('empty section handling', () => {
    it('omits undefined optional sections from result', () => {
      const resume: Resume = {
        meta: { name: 'Bare' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
      };
      const result = normalizeResume(resume);

      expect(result.projects).toBeUndefined();
      expect(result.education).toBeUndefined();
      expect(result.certifications).toBeUndefined();
      expect(result.volunteer).toBeUndefined();
      expect(result.skills).toBeUndefined();
      expect(result.languages).toBeUndefined();
    });

    it('omits empty arrays from result', () => {
      const resume: Resume = {
        meta: { name: 'Empty' },
        experience: [
          { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
        ],
        projects: [],
        education: [],
      };
      const result = normalizeResume(resume);

      expect(result.projects).toBeUndefined();
      expect(result.education).toBeUndefined();
    });
  });
});
