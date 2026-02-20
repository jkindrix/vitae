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
        include_tags: ['frontend', 'ui'],
        exclude_tags: ['legacy'],
        meta: {
          title: 'Frontend Engineer',
          location: 'Remote',
        },
        summary: 'Focused on UI/UX development.',
        section_order: ['summary', 'skills', 'experience', 'education'],
        skills: {
          include: ['Languages', 'Frameworks'],
        },
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with exclude_tags only', async () => {
      const result = await validateVariant({
        exclude_tags: ['irrelevant'],
      });
      expect(result.valid).toBe(true);
    });

    it('validates variant with skills.exclude', async () => {
      const result = await validateVariant({
        skills: { exclude: ['Soft Skills'] },
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
    it('rejects skills with both include and exclude', async () => {
      const result = await validateVariant({
        skills: {
          include: ['Languages'],
          exclude: ['DevOps'],
        },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects invalid section names in section_order', async () => {
      const result = await validateVariant({
        section_order: ['summary', 'invalid_section' as never],
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
      // meta.name is not allowed in variant (you can't override name)
    });

    it('rejects invalid email format in meta', async () => {
      const result = await validateVariant({
        meta: { email: 'not-an-email' },
      });
      expect(result.valid).toBe(false);
    });

    it('rejects non-string include_tags items', async () => {
      const result = await validateVariant({
        include_tags: [123 as unknown as string],
      });
      expect(result.valid).toBe(false);
    });

    it('rejects duplicate section_order items', async () => {
      const result = await validateVariant({
        section_order: ['summary', 'summary'],
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
        section_order: allSections,
      });
      expect(result.valid).toBe(true);
    });

    it('rejects additional properties in skills', async () => {
      const result = await validateVariant({
        skills: { include: ['Languages'], sort: true },
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('assertValidVariant', () => {
    it('returns variant data for valid input', async () => {
      const input = { include_tags: ['frontend'] };
      const result = await assertValidVariant(input);
      expect(result).toEqual(input);
    });

    it('throws on invalid input', async () => {
      const invalid = { skills: { include: ['A'], exclude: ['B'] } };
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
  });
});
