import { describe, it, expect } from 'vitest';
import { applyVariant } from '../src/lib/variant.js';
import type { Resume, Variant } from '../src/types/index.js';

/**
 * Base resume fixture with ids, tags, and a mix of tagged/untagged items.
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
      { id: 'langs', category: 'Languages', items: ['TypeScript', 'Go'], tags: ['backend', 'frontend'] },
      { id: 'frameworks', category: 'Frameworks', items: ['React', 'Vue'], tags: ['frontend'] },
      { id: 'devops', category: 'DevOps', items: ['Docker', 'K8s'], tags: ['backend'] },
      { category: 'Soft Skills', items: ['Leadership'] }, // untagged, no id
    ],
    experience: [
      {
        id: 'alpha',
        company: 'Alpha Corp',
        tags: ['frontend'],
        roles: [
          {
            id: 'senior',
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
            id: 'engineer',
            title: 'Engineer',
            start: '2019-06',
            end: '2021-01',
            highlights: ['General work'],
            tags: ['backend'],
          },
        ],
      },
      {
        id: 'beta',
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
        // no tags, no id — untagged
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
      { id: 'oss-cli', name: 'OSS CLI', description: 'A CLI tool', tags: ['backend'], highlights: ['Stars'] },
      { id: 'portfolio', name: 'Portfolio', description: 'Personal site', tags: ['frontend'] },
      { name: 'Side Project', description: 'Fun stuff' }, // untagged
    ],
    education: [
      {
        id: 'state-u',
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
      { id: 'aws', name: 'AWS SA', issuer: 'Amazon', tags: ['backend'] },
      { id: 'react-cert', name: 'React Cert', issuer: 'Meta', tags: ['frontend'] },
      { name: 'PMP', issuer: 'PMI' }, // untagged
    ],
    volunteer: [
      {
        id: 'cfg',
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

describe('applyVariant v2', () => {
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

      expect(result.meta.name).toBe('Jane Doe');
      expect(result.meta.email).toBe('jane@example.com');
      expect(result.meta.title).toBe('Frontend Specialist');
      expect(result.meta.location).toBe('Remote');
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
  // Pick selection (by id and by name)
  // -----------------------------------------------------------------------
  describe('pick selection', () => {
    it('selects skills by id in specified order', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['frameworks', 'langs'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks', 'Languages']);
    });

    it('selects skills by category name when no id', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['Soft Skills'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual(['Soft Skills']);
    });

    it('selects experience by id', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: { pick: ['beta'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.experience.map((e) => e.company)).toEqual(['Beta Inc']);
    });

    it('selects projects by id', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        projects: { pick: ['oss-cli'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.projects?.map((p) => p.name)).toEqual(['OSS CLI']);
    });

    it('pick excludes untagged items not named', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['langs'] },
      };
      const result = applyVariant(resume, variant);

      // Only Languages; Soft Skills (untagged) is NOT included because pick is strict
      expect(result.skills?.map((s) => s.category)).toEqual(['Languages']);
    });

    it('pick + tags includes picked items and tag-matched + untagged', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['devops'], tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      // DevOps (picked, even though tagged backend) first,
      // then Languages (frontend tag match), Frameworks (frontend match),
      // Soft Skills (untagged passes tag filter)
      expect(result.skills?.map((s) => s.category)).toEqual([
        'DevOps', 'Languages', 'Frameworks', 'Soft Skills',
      ]);
    });
  });

  // -----------------------------------------------------------------------
  // Tag filtering (simple array form)
  // -----------------------------------------------------------------------
  describe('section-level tag filtering', () => {
    it('filters skills by tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      // Languages (backend+frontend), Frameworks (frontend), Soft Skills (untagged) pass
      // DevOps (backend only) excluded
      expect(result.skills?.map((s) => s.category)).toEqual([
        'Languages', 'Frameworks', 'Soft Skills',
      ]);
    });

    it('filters experience companies by tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: { tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      // Alpha (frontend), Gamma (untagged) pass; Beta (backend) excluded
      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);
    });

    it('filters projects by tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        projects: { tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.projects?.map((p) => p.name)).toEqual(['Portfolio', 'Side Project']);
    });

    it('filters certifications by tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        certifications: { tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.certifications?.map((c) => c.name)).toEqual(['React Cert', 'PMP']);
    });
  });

  // -----------------------------------------------------------------------
  // TagExpr (object form with any/all/not)
  // -----------------------------------------------------------------------
  describe('TagExpr filtering', () => {
    it('any: matches items with at least one tag', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: { any: ['frontend'] } },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual([
        'Languages', 'Frameworks', 'Soft Skills',
      ]);
    });

    it('all: requires all specified tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: { all: ['backend', 'frontend'] } },
      };
      const result = applyVariant(resume, variant);

      // Only Languages has both backend + frontend tags; Soft Skills (untagged) also passes
      expect(result.skills?.map((s) => s.category)).toEqual(['Languages', 'Soft Skills']);
    });

    it('not: excludes items with any listed tag', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: { not: ['backend'] } },
      };
      const result = applyVariant(resume, variant);

      // Languages (has backend) excluded, DevOps (has backend) excluded
      // Frameworks (frontend only) passes, Soft Skills (untagged, unaffected by not) passes
      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks', 'Soft Skills']);
    });

    it('combines all + not', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        certifications: { tags: { any: ['backend', 'frontend'], not: ['backend'] } },
      };
      const result = applyVariant(resume, variant);

      // AWS SA (backend, excluded by not), React Cert (frontend, passes), PMP (untagged, passes)
      expect(result.certifications?.map((c) => c.name)).toEqual(['React Cert', 'PMP']);
    });
  });

  // -----------------------------------------------------------------------
  // Omit
  // -----------------------------------------------------------------------
  describe('omit', () => {
    it('removes items by id after pick', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['langs', 'frameworks', 'devops'], omit: ['devops'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.map((s) => s.category)).toEqual(['Languages', 'Frameworks']);
    });

    it('removes items by name', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        certifications: { omit: ['PMP'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.certifications?.map((c) => c.name)).toEqual(['AWS SA', 'React Cert']);
    });

    it('removes experience companies by id', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: { omit: ['beta'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);
    });
  });

  // -----------------------------------------------------------------------
  // Limit
  // -----------------------------------------------------------------------
  describe('limit', () => {
    it('caps the number of items', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { limit: 2 },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills).toHaveLength(2);
      expect(result.skills?.map((s) => s.category)).toEqual(['Languages', 'Frameworks']);
    });

    it('caps experience companies', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: { limit: 1 },
      };
      const result = applyVariant(resume, variant);

      expect(result.experience).toHaveLength(1);
    });

    it('caps projects', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        projects: { limit: 1 },
      };
      const result = applyVariant(resume, variant);

      expect(result.projects).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Highlight selectors
  // -----------------------------------------------------------------------
  describe('highlight selectors', () => {
    it('filters highlights by tags within projects', () => {
      const resume: Resume = {
        meta: { name: 'Test' },
        experience: [{ company: 'Co', roles: [{ title: 'Dev', start: '2020' }] }],
        projects: [
          {
            name: 'Proj',
            highlights: [
              'Universal bullet',
              { text: 'Frontend feature', tags: ['frontend'] },
              { text: 'Backend feature', tags: ['backend'] },
            ],
          },
        ],
      };
      const variant: Variant = {
        projects: {
          highlights: { tags: ['frontend'] },
        },
      };
      const result = applyVariant(resume, variant);

      expect(result.projects?.[0]?.highlights).toHaveLength(2);
      expect(result.projects?.[0]?.highlights?.[0]).toBe('Universal bullet');
    });

    it('limits highlights per item', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          highlights: { limit: 1 },
        },
      };
      const result = applyVariant(resume, variant);

      // Alpha Corp Senior Engineer has 3 highlights, should be capped at 1
      const alphaSenior = result.experience[0]?.roles[0];
      expect(alphaSenior?.highlights).toHaveLength(1);
    });

    it('combines tag filter and limit for highlights', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          highlights: { tags: ['frontend'], limit: 1 },
        },
      };
      const result = applyVariant(resume, variant);

      const alphaSenior = result.experience[0]?.roles[0];
      // After tag filter: 'Led frontend team' (plain, passes) + 'Built React dashboard' (frontend)
      // After limit: just 1
      expect(alphaSenior?.highlights).toHaveLength(1);
    });
  });

  // -----------------------------------------------------------------------
  // Experience 3-level hierarchy (company → roles → highlights)
  // -----------------------------------------------------------------------
  describe('experience roles selector', () => {
    it('filters roles by tags', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          roles: { tags: ['frontend'] },
        },
      };
      const result = applyVariant(resume, variant);

      // Alpha Corp: Senior (frontend) + Intern (untagged) pass; Engineer (backend) excluded
      // Beta Inc: Backend Dev (untagged role) passes
      // Gamma LLC: Intern (untagged) passes
      const alphaRoles = result.experience.find((e) => e.company === 'Alpha Corp')?.roles;
      expect(alphaRoles?.map((r) => r.title)).toEqual(['Senior Engineer']);
    });

    it('filters roles by id via omit', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          roles: { omit: ['engineer'] },
        },
      };
      const result = applyVariant(resume, variant);

      const alphaRoles = result.experience.find((e) => e.company === 'Alpha Corp')?.roles;
      expect(alphaRoles?.map((r) => r.title)).toEqual(['Senior Engineer']);
    });

    it('limits roles per company', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          roles: { limit: 1 },
        },
      };
      const result = applyVariant(resume, variant);

      const alphaRoles = result.experience.find((e) => e.company === 'Alpha Corp')?.roles;
      expect(alphaRoles).toHaveLength(1);
    });

    it('prunes companies with no roles after filtering', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          pick: ['alpha'],
          roles: { tags: ['backend'] },
        },
      };
      const result = applyVariant(resume, variant);

      // Alpha Corp: Senior (frontend) excluded, Engineer (backend) passes
      const alpha = result.experience.find((e) => e.company === 'Alpha Corp');
      expect(alpha?.roles.map((r) => r.title)).toEqual(['Engineer']);
    });

    it('combined: company pick + role filtering + highlight filtering', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          pick: ['alpha'],
          roles: { tags: ['frontend'] },
          highlights: { tags: ['frontend'], limit: 2 },
        },
      };
      const result = applyVariant(resume, variant);

      expect(result.experience).toHaveLength(1);
      expect(result.experience[0]?.company).toBe('Alpha Corp');
      // Only Senior Engineer role (tagged frontend) passes
      expect(result.experience[0]?.roles).toHaveLength(1);
      // Highlights: 'Led frontend team' (plain, passes) + 'Built React dashboard' (frontend)
      // 'Deployed microservices' (backend) excluded by tag filter
      const highlights = result.experience[0]?.roles[0]?.highlights;
      expect(highlights).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Global tags
  // -----------------------------------------------------------------------
  describe('global tags', () => {
    it('applies to sections without their own config', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        tags: ['frontend'],
      };
      const result = applyVariant(resume, variant);

      // Skills: Languages (both), Frameworks (frontend), Soft Skills (untagged) pass
      expect(result.skills?.map((s) => s.category)).toEqual([
        'Languages', 'Frameworks', 'Soft Skills',
      ]);

      // Experience: Alpha (frontend) + Gamma (untagged) pass
      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);

      // Certifications: React Cert + PMP (untagged) pass
      expect(result.certifications?.map((c) => c.name)).toEqual(['React Cert', 'PMP']);
    });

    it('is overridden by section-specific config', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        tags: ['frontend'],
        skills: { pick: ['devops'] }, // section has its own config → global tags ignored
      };
      const result = applyVariant(resume, variant);

      // Skills: only DevOps (picked), global tags not applied
      expect(result.skills?.map((s) => s.category)).toEqual(['DevOps']);

      // Experience still uses global tags
      expect(result.experience.map((e) => e.company)).toEqual(['Alpha Corp', 'Gamma LLC']);
    });

    it('applies to experience at all levels (company, role, highlight)', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        tags: ['frontend'],
      };
      const result = applyVariant(resume, variant);

      // Alpha Corp Senior Engineer highlights:
      // 'Led frontend team' (plain, passes) + 'Built React dashboard' (frontend, passes)
      // 'Deployed microservices' (backend) excluded
      const alphaSenior = result.experience[0]?.roles[0];
      expect(alphaSenior?.highlights).toHaveLength(2);
    });
  });

  // -----------------------------------------------------------------------
  // Untagged item behavior
  // -----------------------------------------------------------------------
  describe('untagged items', () => {
    it('pass through tag filters (included)', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: ['nonexistent'] },
      };
      const result = applyVariant(resume, variant);

      // Only Soft Skills (untagged) passes — tagged items don't match 'nonexistent'
      expect(result.skills?.map((s) => s.category)).toEqual(['Soft Skills']);
    });

    it('pass through TagExpr.not (unaffected)', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { tags: { not: ['backend'] } },
      };
      const result = applyVariant(resume, variant);

      // Soft Skills (untagged) unaffected by not
      expect(result.skills?.find((s) => s.category === 'Soft Skills')).toBeDefined();
    });

    it('are excluded by pick (strict selection)', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['langs'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills?.find((s) => s.category === 'Soft Skills')).toBeUndefined();
    });

    it('plain string highlights always pass tag filters', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        experience: {
          highlights: { tags: ['nonexistent'] },
        },
      };
      const result = applyVariant(resume, variant);

      // Gamma LLC has only plain string highlights
      const gamma = result.experience.find((e) => e.company === 'Gamma LLC');
      expect(gamma?.roles[0]?.highlights).toEqual(['Assisted team']);
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
      const variant: Variant = {
        experience: { roles: { tags: ['frontend'] } },
      };
      const result = applyVariant(resume, variant);

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
      const variant: Variant = {
        projects: { tags: ['frontend'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.projects).toBeUndefined();
    });

    it('removes skills section when pick matches nothing', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        skills: { pick: ['Nonexistent'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.skills).toBeUndefined();
    });
  });

  // -----------------------------------------------------------------------
  // Combined operations
  // -----------------------------------------------------------------------
  describe('combined operations', () => {
    it('applies meta, summary, tags, and skills pick together', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        meta: { title: 'Frontend Engineer' },
        summary: 'Focused on UI/UX.',
        tags: ['frontend'],
        skills: { pick: ['frameworks'] },
      };
      const result = applyVariant(resume, variant);

      expect(result.meta.title).toBe('Frontend Engineer');
      expect(result.summary).toBe('Focused on UI/UX.');
      expect(result.skills?.map((s) => s.category)).toEqual(['Frameworks']);
      // Experience uses global tags
      expect(result.experience.find((e) => e.company === 'Beta Inc')).toBeUndefined();
    });

    it('full variant with experience hierarchy + projects + style', () => {
      const resume = makeBaseResume();
      const variant: Variant = {
        meta: { title: 'Backend Specialist' },
        layout: ['summary', 'skills', 'experience', 'projects'],
        skills: { pick: ['langs', 'devops'] },
        experience: {
          tags: ['backend'],
          roles: { tags: ['backend'] },
          highlights: { tags: ['backend'], limit: 2 },
        },
        projects: {
          pick: ['oss-cli'],
          limit: 1,
        },
        style: {
          '--line-height-normal': '1.2',
        },
      };
      const result = applyVariant(resume, variant);

      expect(result.meta.title).toBe('Backend Specialist');
      expect(result.skills?.map((s) => s.category)).toEqual(['Languages', 'DevOps']);
      // Experience: Beta (backend) + Gamma (untagged) pass tag filter
      expect(result.experience.map((e) => e.company)).toContain('Beta Inc');
      expect(result.projects?.map((p) => p.name)).toEqual(['OSS CLI']);
    });
  });
});
