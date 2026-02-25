import { describe, it, expect } from 'vitest';
import { validateVariant, assertValidVariant } from '../src/lib/schema.js';
import { validateResume } from '../src/lib/schema.js';

describe('variant schema validation', () => {
  describe('validateVariant', () => {
    it('validates an empty variant (all fields optional)', async () => {
      const result = await validateVariant({});
      expect(result.valid).toBe(true);
    });

    it('validates a complete variant', async () => {
      const result = await validateVariant({
        extends: './base.yaml',
        meta: {
          title: 'Frontend Engineer',
          location: 'Remote',
        },
        summary: 'Focused on UI/UX development.',
        layout: ['summary', 'skills', 'experience', 'education'],
        tags: ['frontend'],
        skills: {
          pick: ['Languages', 'Frameworks'],
          limit: 3,
        },
        experience: {
          tags: ['backend'],
          roles: { tags: ['backend'], limit: 4 },
          highlights: { tags: ['backend'], limit: 3 },
        },
        projects: {
          pick: ['oss-cli'],
          tags: ['backend'],
          limit: 2,
        },
        style: {
          '--line-height-normal': '1.2',
        },
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with global tags as array', async () => {
      const result = await validateVariant({
        tags: ['backend', 'frontend'],
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with global tags as TagExpr', async () => {
      const result = await validateVariant({
        tags: { any: ['backend'], all: ['web'], not: ['legacy'] },
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with skills.pick', async () => {
      const result = await validateVariant({
        skills: { pick: ['Languages', 'Frameworks'] },
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with skills.omit', async () => {
      const result = await validateVariant({
        skills: { omit: ['Soft Skills'] },
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with meta.email format', async () => {
      const result = await validateVariant({
        meta: { email: 'jane@example.com' },
      });
      expect(result.valid).toBe(true);
    });

    // Invalid cases
    it('rejects invalid section names in layout', async () => {
      const result = await validateVariant({
        layout: ['summary', 'invalid_section' as never],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects additional properties', async () => {
      const result = await validateVariant({
        unknown_field: 'value',
      });
      expect(result.valid).toBe(false);
    });

    it('rejects additional properties in meta', async () => {
      const result = await validateVariant({
        meta: { name: 'Jane' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid email format in meta', async () => {
      const result = await validateVariant({
        meta: { email: 'not-an-email' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects non-string tags items', async () => {
      const result = await validateVariant({
        tags: [123 as unknown as string],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate layout items', async () => {
      const result = await validateVariant({
        layout: ['summary', 'summary'],
      });
      expect(result.valid).toBe(false);
    });

    it('validates all valid section names', async () => {
      const allSections = [
        'summary', 'skills', 'experience', 'projects', 'education',
        'certifications', 'languages', 'awards', 'publications',
        'volunteer', 'references',
      ];
      const result = await validateVariant({
        layout: allSections,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects additional properties in skills', async () => {
      const result = await validateVariant({
        skills: { pick: ['Languages'], sort: true },
      });
      expect(result.valid).toBe(false);
    });

    it('validates experience with nested selectors', async () => {
      const result = await validateVariant({
        experience: {
          pick: ['company-id'],
          tags: { any: ['backend'] },
          omit: ['old-company'],
          limit: 3,
          roles: {
            pick: ['role-id'],
            tags: ['backend'],
            omit: ['intern'],
            limit: 2,
          },
          highlights: {
            tags: { any: ['backend'], not: ['legacy'] },
            limit: 4,
          },
        },
      });
      expect(result.valid).toBe(true);
    });

    it('validates style overrides', async () => {
      const result = await validateVariant({
        style: {
          '--line-height-normal': '1.2',
          '--space-md': '0.5rem',
          '--font-size-sm': '9.5pt',
        },
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('assertValidVariant', () => {
    it('returns variant data for valid input', async () => {
      const input = { tags: ['frontend'] };
      const result = await assertValidVariant(input);
      expect(result).toEqual(input);
    });

    it('throws on invalid input', async () => {
      const invalid = { unknown: true };
      await expect(assertValidVariant(invalid)).rejects.toThrow();
    });
  });

  // -----------------------------------------------------------------------
  // Resume schema — tagged highlights validation
  // -----------------------------------------------------------------------
  describe('resume schema with tagged highlights', () => {
    it('accepts plain string highlights', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{
            title: 'Dev',
            start: '2020',
            highlights: ['Plain string'],
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tagged highlight objects', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{
            title: 'Dev',
            start: '2020',
            highlights: [
              { text: 'Tagged item', tags: ['backend'] },
            ],
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts mixed plain and tagged highlights', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{
            title: 'Dev',
            start: '2020',
            highlights: [
              'Plain string',
              { text: 'Tagged', tags: ['tag1'] },
              'Another plain',
            ],
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tagged highlight without tags array', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{
            title: 'Dev',
            start: '2020',
            highlights: [
              { text: 'No tags' },
            ],
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on experience items', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          tags: ['backend'],
          roles: [{
            title: 'Dev',
            start: '2020',
            tags: ['backend'],
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on skill categories', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        skills: [
          { category: 'Languages', items: ['TS'], tags: ['backend'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on projects', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        projects: [
          { name: 'Tool', tags: ['oss'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on education', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        education: [
          { institution: 'Uni', tags: ['academic'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on certifications', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        certifications: [
          { name: 'Cert', tags: ['cloud'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts tags on volunteer entries', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        volunteer: [
          { organization: 'Org', tags: ['community'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('rejects invalid highlight type (number)', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{
            title: 'Dev',
            start: '2020',
            highlights: [42 as unknown as string],
          }],
        }],
      });
      expect(result.valid).toBe(false);
    });

    it('accepts id field on experience', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          id: 'company-1',
          company: 'Co',
          roles: [{
            id: 'role-1',
            title: 'Dev',
            start: '2020',
          }],
        }],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts id field on skills', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        skills: [
          { id: 'langs', category: 'Languages', items: ['TS'] },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('accepts id field on projects', async () => {
      const result = await validateResume({
        meta: { name: 'Test' },
        experience: [{
          company: 'Co',
          roles: [{ title: 'Dev', start: '2020' }],
        }],
        projects: [
          { id: 'proj-1', name: 'Tool' },
        ],
      });
      expect(result.valid).toBe(true);
    });
  });
});
