import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { readFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';
import { initCommand } from '../src/commands/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('init command schema directive', () => {
  // Read the init.ts source to verify the schema directive is embedded
  const initSource = readFileSync(join(__dirname, '../src/commands/init.ts'), 'utf-8');

  it('defines schema URL constants pointing to raw GitHub schemas', () => {
    expect(initSource).toContain('RESUME_SCHEMA_URL');
    expect(initSource).toContain(
      'raw.githubusercontent.com/jkindrix/vitae/main/schemas/resume.schema.json'
    );
    expect(initSource).toContain('COVER_LETTER_SCHEMA_URL');
    expect(initSource).toContain(
      'raw.githubusercontent.com/jkindrix/vitae/main/schemas/cover-letter.schema.json'
    );
  });

  it('includes yaml-language-server directive in resume template', () => {
    expect(initSource).toContain('# yaml-language-server: $schema=${RESUME_SCHEMA_URL}');
  });

  it('includes yaml-language-server directive in cover letter template', () => {
    expect(initSource).toContain('# yaml-language-server: $schema=${COVER_LETTER_SCHEMA_URL}');
  });

  it('includes directive in both template and interactive mode', () => {
    // Count occurrences of the resume schema directive pattern
    const matches = initSource.match(/yaml-language-server: \$schema=\$\{RESUME_SCHEMA_URL\}/g);
    // Should appear at least twice: EXAMPLE_RESUME template + interactive output
    expect(matches?.length).toBeGreaterThanOrEqual(2);
  });
});

describe('initCommand template YAML validity', () => {
  it('resume template is valid YAML with required structure', async () => {
    const testDir = join(tmpdir(), `vitae-init-yaml-${randomUUID()}`);
    const outPath = join(testDir, 'resume.yaml');
    const { mkdir } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    try {
      await initCommand({ output: outPath });
      const content = await readFile(outPath, 'utf-8');
      const parsed = parseYaml(content);

      expect(parsed).toHaveProperty('meta');
      expect(parsed).toHaveProperty('experience');
      expect(parsed.meta).toHaveProperty('name');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('cover letter template is valid YAML with required structure', async () => {
    const testDir = join(tmpdir(), `vitae-init-cl-${randomUUID()}`);
    const outPath = join(testDir, 'cover-letter.yaml');
    const { mkdir } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    try {
      await initCommand({ output: outPath, coverLetter: true });
      const content = await readFile(outPath, 'utf-8');
      const parsed = parseYaml(content);

      expect(parsed).toHaveProperty('meta');
      expect(parsed).toHaveProperty('greeting');
      expect(parsed).toHaveProperty('body');
      expect(parsed).toHaveProperty('closing');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('written file contains yaml-language-server directive', async () => {
    const testDir = join(tmpdir(), `vitae-init-directive-${randomUUID()}`);
    const outPath = join(testDir, 'resume.yaml');
    const { mkdir } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    try {
      await initCommand({ output: outPath });
      const content = await readFile(outPath, 'utf-8');

      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('yaml-language-server');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});

describe('initCommand overwrite protection', () => {
  it('does not overwrite existing file without force', async () => {
    const testDir = join(tmpdir(), `vitae-init-protect-${randomUUID()}`);
    const outPath = join(testDir, 'resume.yaml');
    const { mkdir, writeFile: write } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    const sentinel = 'DO_NOT_OVERWRITE';
    await write(outPath, sentinel, 'utf-8');

    try {
      await initCommand({ output: outPath });
      const content = await readFile(outPath, 'utf-8');
      expect(content).toBe(sentinel);
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });

  it('overwrites existing file with force: true', async () => {
    const testDir = join(tmpdir(), `vitae-init-force-${randomUUID()}`);
    const outPath = join(testDir, 'resume.yaml');
    const { mkdir, writeFile: write } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    await write(outPath, 'old content', 'utf-8');

    try {
      await initCommand({ output: outPath, force: true });
      const content = await readFile(outPath, 'utf-8');
      expect(content).not.toBe('old content');
      expect(content).toContain('meta');
    } finally {
      await rm(testDir, { recursive: true, force: true });
    }
  });
});
