import { describe, it, expect, afterAll } from 'vitest';
import { build } from '../src/lib/build.js';
import { closeBrowser } from '../src/lib/pdf.js';
import { mkdtemp, readFile, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

const SAMPLE = join(__dirname, '..', 'examples', 'sample.yaml');

describe('build', () => {
  const tmpDirs: string[] = [];

  async function makeTmpDir(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'vitae-build-'));
    tmpDirs.push(dir);
    return dir;
  }

  afterAll(async () => {
    await closeBrowser();
    for (const dir of tmpDirs) {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('generates HTML from sample resume', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'minimal',
      format: 'html',
      output,
    });

    expect(result.format).toBe('html');
    expect(result.path).toMatch(/\.html$/);

    const content = await readFile(result.path, 'utf-8');
    expect(content).toContain('<!DOCTYPE html>');
    expect(content).toContain('Jane Smith');
  });

  it('generates JSON from sample resume', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'minimal',
      format: 'json',
      output,
    });

    expect(result.format).toBe('json');
    const parsed = JSON.parse(await readFile(result.path, 'utf-8'));
    expect(parsed.meta.name).toBe('Jane Smith');
  });

  it('generates Markdown from sample resume', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'minimal',
      format: 'md',
      output,
    });

    expect(result.format).toBe('md');
    const content = await readFile(result.path, 'utf-8');
    expect(content).toContain('Jane Smith');
  });

  it('generates PDF with page count and scale', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'minimal',
      format: 'pdf',
      output,
    });

    expect(result.format).toBe('pdf');
    expect(result.path).toMatch(/\.pdf$/);
    expect(result.pageCount).toBeGreaterThanOrEqual(1);
    expect(result.scale).toBeDefined();
  });

  it('respects custom output name', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'minimal',
      format: 'html',
      output,
      name: 'my-resume',
    });

    expect(result.path).toContain('my-resume.html');
  });

  it('uses input directory as default output', async () => {
    // Build to a temp copy to avoid polluting examples/
    const tmpDir = await makeTmpDir();
    const { copyFile } = await import('fs/promises');
    const tmpInput = join(tmpDir, 'resume.yaml');
    await copyFile(SAMPLE, tmpInput);

    const result = await build({
      input: tmpInput,
      theme: 'minimal',
      format: 'json',
    });

    expect(result.path).toBe(join(tmpDir, 'resume.json'));
  });

  it('works with different themes', async () => {
    const output = await makeTmpDir();
    const result = await build({
      input: SAMPLE,
      theme: 'modern',
      format: 'html',
      output,
    });

    const content = await readFile(result.path, 'utf-8');
    expect(content).toContain('resume__sidebar');
  });

  it('throws on invalid theme', async () => {
    const output = await makeTmpDir();
    await expect(
      build({ input: SAMPLE, theme: 'nonexistent', format: 'html', output })
    ).rejects.toThrow();
  });

  it('throws on invalid input path', async () => {
    const output = await makeTmpDir();
    await expect(
      build({ input: '/no/such/file.yaml', theme: 'minimal', format: 'html', output })
    ).rejects.toThrow();
  });
});
