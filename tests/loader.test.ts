import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { loadResume, parseResume } from '../src/lib/loader.js';

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
});
