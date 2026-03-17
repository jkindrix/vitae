import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { loadResume, parseResume, loadVariant } from '../src/lib/loader.js';

describe('loader', () => {
  const testDir = join(tmpdir(), `vitae-test-${randomUUID()}`);
  const validYaml = `
meta:
  name: Test User
  email: test@example.com
experience:
  - company: Test Corp
    roles:
      - title: Developer
        start: 2020-01
`;

  const invalidYaml = `
meta:
  title: Missing Name
`;

  const malformedYaml = `
meta:
  name: Test
  broken: [unclosed
`;

  beforeAll(async () => {
    await mkdir(testDir, { recursive: true });
  });

  afterAll(async () => {
    try {
      const { rm } = await import('fs/promises');
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadResume', () => {
    it('loads and parses a valid YAML resume file', async () => {
      const filePath = join(testDir, 'valid.yaml');
      await writeFile(filePath, validYaml, 'utf-8');

      const resume = await loadResume(filePath);

      expect(resume.meta.name).toBe('Test User');
      expect(resume.meta.email).toBe('test@example.com');
      expect(resume.experience).toHaveLength(1);
      expect(resume.experience[0]?.company).toBe('Test Corp');
    });

    it('throws on non-existent file', async () => {
      const filePath = join(testDir, 'does-not-exist.yaml');
      await expect(loadResume(filePath)).rejects.toThrow();
    });

    it('throws on invalid resume data', async () => {
      const filePath = join(testDir, 'invalid.yaml');
      await writeFile(filePath, invalidYaml, 'utf-8');

      await expect(loadResume(filePath)).rejects.toThrow('Invalid resume data');
    });

    it('throws on malformed YAML', async () => {
      const filePath = join(testDir, 'malformed.yaml');
      await writeFile(filePath, malformedYaml, 'utf-8');

      await expect(loadResume(filePath)).rejects.toThrow();
    });
  });

  describe('parseResume', () => {
    it('parses valid YAML string', async () => {
      const resume = await parseResume(validYaml);

      expect(resume.meta.name).toBe('Test User');
      expect(resume.experience[0]?.roles[0]?.title).toBe('Developer');
    });

    it('throws on invalid resume data', async () => {
      await expect(parseResume(invalidYaml)).rejects.toThrow('Invalid resume data');
    });

    it('handles resume with all optional fields', async () => {
      const fullYaml = `
meta:
  name: Full User
  title: Senior Engineer
  email: full@example.com
  phone: 555-1234
  location: New York, NY
  links:
    - label: GitHub
      url: https://github.com/user
summary: A professional summary
skills:
  - category: Languages
    items:
      - TypeScript
      - Python
experience:
  - company: Corp
    roles:
      - title: Lead
        start: 2020-01
        end: present
        location: Remote
        highlights:
          - Achievement 1
projects:
  - name: Project
    url: https://github.com/project
    description: Description
    highlights:
      - Feature 1
education:
  - institution: University
    degree: BS
    field: CS
    start: "2014"
    end: "2018"
certifications:
  - name: Cert
    issuer: Org
    date: "2023"
`;

      const resume = await parseResume(fullYaml);

      expect(resume.meta.name).toBe('Full User');
      expect(resume.meta.title).toBe('Senior Engineer');
      expect(resume.summary).toContain('professional summary');
      expect(resume.skills).toHaveLength(1);
      expect(resume.projects).toHaveLength(1);
      expect(resume.education).toHaveLength(1);
      expect(resume.certifications).toHaveLength(1);
    });

    it('handles empty optional arrays gracefully', async () => {
      const yaml = `
meta:
  name: Minimal
experience:
  - company: Co
    roles:
      - title: Dev
        start: "2020"
`;
      const resume = await parseResume(yaml);
      expect(resume.skills).toBeUndefined();
      expect(resume.projects).toBeUndefined();
    });
  });

  describe('loadVariant', () => {
    it('loads and validates a valid variant YAML file', async () => {
      const filePath = join(testDir, 'valid-variant.yaml');
      await writeFile(
        filePath,
        `
meta:
  title: Frontend Engineer
summary: A frontend-focused summary
tags:
  - frontend
`,
        'utf-8'
      );

      const variant = await loadVariant(filePath);
      expect(variant.meta?.title).toBe('Frontend Engineer');
      expect(variant.summary).toBe('A frontend-focused summary');
      expect(variant.tags).toEqual(['frontend']);
    });

    it('returns typed Variant with correct field values', async () => {
      const filePath = join(testDir, 'typed-variant.yaml');
      await writeFile(
        filePath,
        `
meta:
  title: Backend Dev
layout:
  - experience
  - skills
style:
  "--color-accent": "#ff0000"
skills:
  pick:
    - Go
    - Python
  limit: 2
`,
        'utf-8'
      );

      const variant = await loadVariant(filePath);
      expect(variant.meta?.title).toBe('Backend Dev');
      expect(variant.layout).toEqual(['experience', 'skills']);
      expect(variant.style).toEqual({ '--color-accent': '#ff0000' });
      expect(variant.skills).toEqual({ pick: ['Go', 'Python'], limit: 2 });
    });

    it('throws on non-existent file', async () => {
      await expect(loadVariant(join(testDir, 'no-such-file.yaml'))).rejects.toThrow();
    });

    it('throws on invalid variant data (unknown fields rejected)', async () => {
      const filePath = join(testDir, 'bad-variant.yaml');
      await writeFile(
        filePath,
        `
unknownField: true
anotherBadKey: 123
`,
        'utf-8'
      );

      await expect(loadVariant(filePath)).rejects.toThrow();
    });

    it('throws on malformed YAML', async () => {
      const filePath = join(testDir, 'malformed-variant.yaml');
      await writeFile(
        filePath,
        `
meta:
  title: [unclosed
`,
        'utf-8'
      );

      await expect(loadVariant(filePath)).rejects.toThrow();
    });
  });

  describe('variant extends / composition', () => {
    const extendsDir = join(testDir, 'extends');

    beforeAll(async () => {
      await mkdir(extendsDir, { recursive: true });

      // Parent variant
      await writeFile(
        join(extendsDir, 'parent.yaml'),
        `
meta:
  title: Parent Title
  location: NYC
summary: Parent summary
layout:
  - experience
  - skills
tags:
  - backend
style:
  "--color-accent": "#111"
  "--font-size": "14px"
skills:
  pick:
    - Go
  limit: 3
experience:
  tags:
    - backend
`,
        'utf-8'
      );

      // Child variant that extends parent
      await writeFile(
        join(extendsDir, 'child.yaml'),
        `
extends: parent.yaml
meta:
  title: Child Title
summary: Child summary
style:
  "--font-size": "16px"
  "--color-bg": "#fff"
skills:
  tags:
    - frontend
`,
        'utf-8'
      );

      // Child that only overrides some fields (inherits rest)
      await writeFile(
        join(extendsDir, 'partial-child.yaml'),
        `
extends: parent.yaml
meta:
  title: Partial Child
`,
        'utf-8'
      );

      // 3-level chain: grandparent -> mid -> leaf
      await writeFile(
        join(extendsDir, 'grandparent.yaml'),
        `
meta:
  title: GP Title
  location: London
style:
  "--gp-var": "gp-value"
  "--shared": "gp"
skills:
  pick:
    - Databases
`,
        'utf-8'
      );

      await writeFile(
        join(extendsDir, 'mid.yaml'),
        `
extends: grandparent.yaml
meta:
  title: Mid Title
style:
  "--mid-var": "mid-value"
  "--shared": "mid"
experience:
  tags:
    - devops
`,
        'utf-8'
      );

      await writeFile(
        join(extendsDir, 'leaf.yaml'),
        `
extends: mid.yaml
style:
  "--leaf-var": "leaf-value"
  "--shared": "leaf"
`,
        'utf-8'
      );

      // Circular extends
      await writeFile(
        join(extendsDir, 'circular-a.yaml'),
        `
extends: circular-b.yaml
meta:
  title: A
`,
        'utf-8'
      );

      await writeFile(
        join(extendsDir, 'circular-b.yaml'),
        `
extends: circular-a.yaml
meta:
  title: B
`,
        'utf-8'
      );
    });

    // --- Single-level extends ---

    it('child overrides parent meta fields (deep merge)', async () => {
      const variant = await loadVariant(join(extendsDir, 'child.yaml'));
      // Child overrides title, parent-only location preserved
      expect(variant.meta?.title).toBe('Child Title');
      expect(variant.meta?.location).toBe('NYC');
    });

    it('child replaces parent summary', async () => {
      const variant = await loadVariant(join(extendsDir, 'child.yaml'));
      expect(variant.summary).toBe('Child summary');
    });

    it('child inherits parent summary when child omits it', async () => {
      const variant = await loadVariant(join(extendsDir, 'partial-child.yaml'));
      expect(variant.summary).toBe('Parent summary');
    });

    it('child inherits parent layout when child omits it', async () => {
      const variant = await loadVariant(join(extendsDir, 'partial-child.yaml'));
      expect(variant.layout).toEqual(['experience', 'skills']);
    });

    it('child inherits parent global tags when child omits them', async () => {
      const variant = await loadVariant(join(extendsDir, 'partial-child.yaml'));
      expect(variant.tags).toEqual(['backend']);
    });

    it('child replaces parent section selector entirely (not merged field-by-field)', async () => {
      const variant = await loadVariant(join(extendsDir, 'child.yaml'));
      // Child skills has tags:["frontend"] only; parent's pick and limit are NOT inherited
      expect(variant.skills).toEqual({ tags: ['frontend'] });
      expect((variant.skills as Record<string, unknown>)?.pick).toBeUndefined();
      expect((variant.skills as Record<string, unknown>)?.limit).toBeUndefined();
    });

    it('child inherits parent section selector when child omits that section', async () => {
      const variant = await loadVariant(join(extendsDir, 'partial-child.yaml'));
      // Parent has experience.tags: [backend], child omits experience → inherits
      expect(variant.experience).toEqual({ tags: ['backend'] });
    });

    it('style: shallow merge (child overrides parent, parent-only preserved)', async () => {
      const variant = await loadVariant(join(extendsDir, 'child.yaml'));
      expect(variant.style).toEqual({
        '--color-accent': '#111', // parent-only preserved
        '--font-size': '16px', // child overrides parent
        '--color-bg': '#fff', // child-only added
      });
    });

    it('extends field is not present on the resolved result', async () => {
      const variant = await loadVariant(join(extendsDir, 'child.yaml'));
      expect(variant.extends).toBeUndefined();
    });

    // --- Multi-level chain ---

    it('3-level chain resolves correctly', async () => {
      const variant = await loadVariant(join(extendsDir, 'leaf.yaml'));
      // Meta: grandparent location preserved, mid overrides title, leaf doesn't set meta
      expect(variant.meta?.title).toBe('Mid Title');
      expect(variant.meta?.location).toBe('London');
    });

    it('style merges across 3 levels', async () => {
      const variant = await loadVariant(join(extendsDir, 'leaf.yaml'));
      expect(variant.style).toEqual({
        '--gp-var': 'gp-value', // grandparent-only
        '--mid-var': 'mid-value', // mid-only
        '--leaf-var': 'leaf-value', // leaf-only
        '--shared': 'leaf', // leaf overrides mid overrides grandparent
      });
    });

    it('section from grandparent inherited through parent when neither overrides', async () => {
      const variant = await loadVariant(join(extendsDir, 'leaf.yaml'));
      // Grandparent has skills.pick: ["Databases"], mid doesn't override skills, leaf doesn't either
      expect(variant.skills).toEqual({ pick: ['Databases'] });
    });

    it('child section override replaces grandparent section (not merged)', async () => {
      const variant = await loadVariant(join(extendsDir, 'leaf.yaml'));
      // Mid has experience.tags: [devops], which replaced grandparent's (GP had no experience)
      // Leaf doesn't override experience → inherits mid's
      expect(variant.experience).toEqual({ tags: ['devops'] });
    });

    // --- Error cases ---

    it('circular extends detected and throws', async () => {
      await expect(loadVariant(join(extendsDir, 'circular-a.yaml'))).rejects.toThrow(
        'Circular variant extends detected'
      );
    });

    it('missing parent file throws', async () => {
      const filePath = join(extendsDir, 'missing-parent.yaml');
      await writeFile(
        filePath,
        `
extends: does-not-exist.yaml
meta:
  title: Orphan
`,
        'utf-8'
      );

      await expect(loadVariant(filePath)).rejects.toThrow();
    });
  });
});
