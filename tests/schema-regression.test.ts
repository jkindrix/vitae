import { describe, it, expect } from 'vitest';
import { loadResume } from '../src/lib/loader.js';
import { validateResume } from '../src/lib/schema.js';
import { resolve } from 'path';

/**
 * Schema regression test — ensures that committed example files always
 * validate against the current schema. If a schema change breaks these
 * fixtures, the diff will be visible in review.
 */
describe('schema regression', () => {
  const fixturesDir = resolve(import.meta.dirname, '..', 'examples');

  it('examples/sample.yaml validates against the resume schema', async () => {
    const resume = await loadResume(resolve(fixturesDir, 'sample.yaml'));
    const result = await validateResume(resume);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('examples/sample-rich.yaml validates against the resume schema', async () => {
    const resume = await loadResume(resolve(fixturesDir, 'sample-rich.yaml'));
    const result = await validateResume(resume);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('sample.yaml loads without error and has required fields', async () => {
    const resume = await loadResume(resolve(fixturesDir, 'sample.yaml'));
    expect(resume.meta.name).toBeTruthy();
    expect(resume.experience.length).toBeGreaterThan(0);
  });

  it('sample-rich.yaml loads without error and exercises optional sections', async () => {
    const resume = await loadResume(resolve(fixturesDir, 'sample-rich.yaml'));
    expect(resume.meta.name).toBeTruthy();
    expect(resume.experience.length).toBeGreaterThan(0);
    expect(resume.skills!.length).toBeGreaterThan(0);
    expect(resume.projects!.length).toBeGreaterThan(0);
    expect(resume.education!.length).toBeGreaterThan(0);
    expect(resume.certifications!.length).toBeGreaterThan(0);
    expect(resume.volunteer!.length).toBeGreaterThan(0);
  });
});
