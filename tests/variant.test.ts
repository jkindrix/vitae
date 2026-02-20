import { describe, it, expect } from 'vitest';
import { applyVariant } from '../src/lib/variant.js';
import type { Resume, Variant } from '../src/types/index.js';

/**
 * Base resume fixture used across variant tests.
 * Contains tagged and untagged items for thorough filter testing.
 */
function makeBaseResume(): Resume {
  return {
    meta: {
      name: 'Jane Doe',
      title: 'Full-Stack Developer',
      email: 'jane@example.com',
      location: 'NYC',
    },
    summary: 'Experienced full-stack developer.',
    skills: [
      { category: 'Languages', items: ['TypeScript', 'Go'], tags: ['backend', 'frontend'] },
      { category: 'Frameworks', items: ['React', 'Vue'], tags: ['frontend'] },
      { category: 'DevOps', items: ['Docker', 'K8s'], tags: ['backend'] },
      { category: 'Soft Skills', items: ['Leadership'] }, // untagged
    ],
    experience: [
      {
        company: 'Alpha Corp',
        tags: ['frontend'],
        roles: [
          {
            title: 'Senior Engineer',
            start: '2021-01',
            end: 'present',
            highlights: [
              'Led frontend team',
              { text: 'Built React dashboard', tags: ['frontend'] },
              { text: 'Deployed microservices', tags: ['backend'] },
            ],
            tags: ['frontend'],
          },
          {
            title: 'Engineer',
            start: '2019-06',
            end: '2021-01',
            highlights: ['General work'],
            tags: ['backend'],
          },
        ],
      },
      {
        company: 'Beta Inc',
        tags: ['backend'],
        roles: [
          {
            title: 'Backend Dev',
            start: '2017-01',
            end: '2019-05',
            highlights: [
              { text: 'Designed APIs', tags: ['backend'] },
              { text: 'Wrote React widgets', tags: ['frontend'] },
            ],
          },
        ],
      },
      {
        company: 'Gamma LLC',
        // no tags — untagged
        roles: [
          {
            title: 'Intern',
            start: '2016-06',
            end: '2016-12',
            highlights: ['Assisted team'],
          },
        ],
      },
    ],
    projects: [
      { name: 'OSS CLI', description: 'A CLI tool', tags: ['backend'], highlights: ['Stars'] },
      { name: 'Portfolio', description: 'Personal site', tags: ['frontend'] },
      { name: 'Side Project', description: 'Fun stuff' }, // untagged
    ],
    education: [
      {
        institution: 'State University',
        degree: 'BS',
        field: 'CS',
        end: '2016',
        tags: ['backend', 'frontend'],
        highlights: [
          { text: 'Dean\'s list', tags: ['academic'] },
          'Graduated magna cum laude',
        ],
      },
    ],
    certifications: [
      { name: 'AWS SA', issuer: 'Amazon', tags: ['backend'] },
      { name: 'React Cert', issuer: 'Meta', tags: ['frontend'] },
      { name: 'PMP', issuer: 'PMI' }, // untagged
    ],
    volunteer: [
      {
        organization: 'Code for Good',
        position: 'Mentor',
        tags: ['frontend'],
        highlights: ['Taught React'],
      },
      {
        organization: 'Open Source Foundation',
        position: 'Contributor',
        highlights: ['Fixed bugs'],
        // no tags
      },
    ],
  };
}

describe('applyVariant', () => {
  // -----------------------------------------------------------------------
  // Empty / no-op variant
  // -----------------------------------------------------------------------
  describe('identity variant', () => {
    it('returns resume unchanged for empty variant', () => {
      const resume = makeBaseResume();
      const variant: Variant = {};
      const result = applyVariant(resume, variant);

      expect(result.meta).toEqual(resume.meta);
      expect(result.summary).toBe(resume.summary);
      expect(result.experience).toEqual(resume.experience);
      expect(result.skills).toEqual(resume.skills);
      expect(result.projects).toEqual(resume.projects);
    });
  });

  // -----------------------------------------------------------------------
  // Meta deep-merge
  // -----------------------------------------------------------------------
  describe('meta override', () => {
    it('deep-merges meta fields', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        meta: { title: 'Frontend Specialist', location: 'Remote' },
      };
      const result = applyVariant(resume, variant);

      expect(result.meta.name).toBe('Jane Doe'); // unchanged
      expect(result.meta.email).toBe('jane@example.com'); // unchanged
      expect(result.meta.title).toBe('Frontend Specialist'); // overridden
      expect(result.meta.location).toBe('Remote'); // overridden
    });

    it('does not mutate the original resume meta', () => {
      const resume = makeBaseResume();
      const variant: Variant = { meta: { title: 'Changed' } };
      applyVariant(resume, variant);

      expect(resume.meta.title).toBe('Full-Stack Developer');
    });
  });

  // -----------------------------------------------------------------------
  // Summary override
  // -----------------------------------------------------------------------
  describe('summary override', () => {
    it('replaces the summary entirely', () => {
      const resume = makeBaseResume();
      const variant: Variant = { summary: 'Frontend-focused engineer.' };
      const result = applyVariant(resume, variant);

      expect(result.summary).toBe('Frontend-focused engineer.');
    });
  });

  // -----------------------------------------------------------------------
  // Tag filtering — include_tags
  // -----------------------------------------------------------------------
  describe('include_tags filtering', () => {
    it('keeps items matching include_tags and untagged items', () => {
      const resume = makeBaseResume();
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      // Skills: Languages (backend+frontend), Frameworks (frontend), Soft Skills (untagged) kept
      // DevOps (backend only) excluded
      expect(result.skills?.map((s) => s.category)).toEqual([
        'Languages',
        'Frameworks',
        'Soft Skills',
      ]);

      // Experience: Alpha Corp (frontend) and Gamma LLC (untagged) kept, Beta Inc (backend) excluded
      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);

      // Projects: Portfolio (frontend), Side Project (untagged) kept; OSS CLI (backend) excluded
      expect(result.projects?.map((p) => p.name)).toEqual(['Portfolio', 'Side Project']);

      // Certifications: React Cert (frontend), PMP (untagged) kept; AWS SA (backend) excluded
      expect(result.certifications?.map((c) => c.name)).toEqual(['React Cert', 'PMP']);

      // Volunteer: Code for Good (frontend), Open Source Foundation (untagged)
      expect(result.volunteer?.map((v) => v.organization)).toEqual([
        'Code for Good',
        'Open Source Foundation',
      ]);
    });

    it('filters highlights within items by include_tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      // Alpha Corp Senior Engineer highlights:
      // - 'Led frontend team' (string, always passes)
      // - { text: 'Built React dashboard', tags: ['frontend'] } (passes)
      // - { text: 'Deployed microservices', tags: ['backend'] } (excluded)
      const alphaSenior = result.experience[0].roles[0];
      expect(alphaSenior.highlights).toHaveLength(2);
      expect(alphaSenior.highlights?.[0]).toBe('Led frontend team');
      expect(alphaSenior.highlights?.[1]).toEqual({ text: 'Built React dashboard', tags: ['frontend'] });
    });
  });

  // -----------------------------------------------------------------------
  // Tag filtering — exclude_tags
  // -----------------------------------------------------------------------
  describe('exclude_tags filtering', () => {
    it('removes items matching exclude_tags, keeps everything else', () => {
      const resume = makeBaseResume();
      const variant: Variant = { exclude_tags: ['backend'] };
      const result = applyVariant(resume, variant);

      // Skills: Frameworks (frontend only), Soft Skills (untagged) kept
      // Languages (has backend) excluded, DevOps (has backend) excluded
      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks', 'Soft Skills']);

      // Experience: Alpha Corp (frontend, not backend) kept, Beta Inc (backend) excluded, Gamma (untagged) kept
      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);

      // Projects: Portfolio (frontend), Side Project (untagged) kept; OSS CLI (backend) excluded
      expect(result.projects?.map((p) => p.name)).toEqual(['Portfolio', 'Side Project']);
    });

    it('filters highlights by exclude_tags', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [{ company: 'Co', roles: [{ title: 'Dev', start: '2020' }] }],
        education: [
          {
            institution: 'University',
            // no item-level tags, so item passes
            highlights: [
              { text: 'Backend research', tags: ['backend'] },
              { text: 'Frontend capstone', tags: ['frontend'] },
              'General coursework', // plain string, always passes
            ],
          },
        ],
      };
      const variant: Variant = { exclude_tags: ['backend'] };
      const result = applyVariant(resume, variant);

      const edu = result.education?.[0];
      // Backend research excluded, Frontend capstone and plain string remain
      expect(edu?.highlights).toHaveLength(2);
      expect(edu?.highlights?.[0]).toEqual({ text: 'Frontend capstone', tags: ['frontend'] });
      expect(edu?.highlights?.[1]).toBe('General coursework');
    });
  });

  // -----------------------------------------------------------------------
  // Tag filtering — exclude wins on conflict
  // -----------------------------------------------------------------------
  describe('exclude wins on conflict', () => {
    it('excludes item when tags match both include and exclude', () => {
      const resume = makeBaseResume();
      // Languages has tags: ['backend', 'frontend'] — matches both
      const variant: Variant = {
        include_tags: ['frontend'],
        exclude_tags: ['backend'],
      };
      const result = applyVariant(resume, variant);

      // Languages should be excluded because it has 'backend' tag (exclude wins)
      expect(result.skills?.find((s) => s.category === 'Languages')).toBeUndefined();
      // Frameworks (frontend only) should pass
      expect(result.skills?.find((s) => s.category === 'Frameworks')).toBeDefined();
    });
  });

  // -----------------------------------------------------------------------
  // Empty container pruning
  // -----------------------------------------------------------------------
  describe('empty container pruning', () => {
    it('removes experience entries with no roles after filtering', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'OnlyBackend',
            roles: [
              { title: 'Backend Dev', start: '2020', tags: ['backend'] },
            ],
          },
        ],
      };
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      // Experience entry should be pruned because all roles were filtered out
      expect(result.experience).toHaveLength(0);
    });

    it('removes projects section when all items filtered', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [{ company: 'Co', roles: [{ title: 'Dev', start: '2020' }] }],
        projects: [
          { name: 'Backend Tool', tags: ['backend'] },
        ],
      };
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      expect(result.projects).toBeUndefined();
    });

    it('keeps roles with no highlights (roles are not pruned)', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [
          {
            company: 'Co',
            roles: [
              {
                title: 'Dev',
                start: '2020',
                highlights: [{ text: 'Backend stuff', tags: ['backend'] }],
              },
            ],
          },
        ],
      };
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      // Role still exists (with no highlights), experience still has 1 role
      expect(result.experience).toHaveLength(1);
      expect(result.experience[0].roles).toHaveLength(1);
      expect(result.experience[0].roles[0].highlights).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Skill name-based filtering
  // -----------------------------------------------------------------------
  describe('skills name filtering', () => {
    it('keeps only included skill categories in specified order', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { include: ['Frameworks', 'Languages'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks', 'Languages']);
    });

    it('excludes named skill categories', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { exclude: ['DevOps', 'Soft Skills'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual(['Languages', 'Frameworks']);
    });

    it('throws when both include and exclude are specified', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { include: ['Languages'], exclude: ['DevOps'] },
      };

      expect(() => applyVariant(resume, variant)).toThrow('mutually exclusive');
    });

    it('applies name filtering after tag filtering', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        include_tags: ['frontend'],
        skills: { include: ['Frameworks'] },
      };
      const result = applyVariant(resume, variant);

      // Tag filter first: Languages (both tags, passes), Frameworks (frontend), Soft Skills (untagged)
      // DevOps (backend only) excluded by tag filter
      // Then name filter: only Frameworks
      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks']);
    });

    it('removes skills section when name filter eliminates all', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { include: ['Nonexistent'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Untagged items always pass
  // -----------------------------------------------------------------------
  describe('untagged items always pass', () => {
    it('keeps untagged experience through include filter', () => {
      const resume = makeBaseResume();
      const variant: Variant = { include_tags: ['frontend'] };
      const result = applyVariant(resume, variant);

      expect(result.experience.find((e) => e.company === 'Gamma LLC')).toBeDefined();
    });

    it('keeps untagged experience through exclude filter', () => {
      const resume = makeBaseResume();
      const variant: Variant = { exclude_tags: ['backend', 'frontend'] };
      const result = applyVariant(resume, variant);

      expect(result.experience.find((e) => e.company === 'Gamma LLC')).toBeDefined();
    });

    it('keeps plain string highlights (always pass)', () => {
      const resume = makeBaseResume();
      const variant: Variant = { include_tags: ['nonexistent-tag'] };
      const result = applyVariant(resume, variant);

      // Gamma LLC intern has only string highlights — always passes
      const gamma = result.experience.find((e) => e.company === 'Gamma LLC');
      expect(gamma?.roles[0].highlights).toEqual(['Assisted team']);
    });
  });

  // -----------------------------------------------------------------------
  // Combined operations
  // -----------------------------------------------------------------------
  describe('combined operations', () => {
    it('applies meta, summary, tags, and skill name filter together', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        meta: { title: 'Frontend Engineer' },
        summary: 'Focused on UI/UX.',
        include_tags: ['frontend'],
        skills: { include: ['Frameworks'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.meta.title).toBe('Frontend Engineer');
      expect(result.summary).toBe('Focused on UI/UX.');
      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks']);
      expect(result.experience.find((e) => e.company === 'Beta Inc')).toBeUndefined();
    });
  });
});
