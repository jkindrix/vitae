import { describe, it, expect, afterAll } from 'vitest';
import { writeFile, readFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { buildCommand } from '../src/commands/build.js';
import { validateCommand } from '../src/commands/validate.js';
import { checkCommand } from '../src/commands/check.js';
import { auditCommand } from '../src/commands/audit.js';
import { themesCommand } from '../src/commands/themes.js';
import { importCommand } from '../src/commands/import.js';
import { closeBrowser } from '../src/lib/index.js';

const testDir = join(tmpdir(), `vitae-cli-${randomUUID()}`);

const MINIMAL_RESUME = `
meta:
  name: Test User
  email: test@example.com
experience:
  - company: Acme Corp
    roles:
      - title: Engineer
        start: "2020"
`;

const INVALID_RESUME = `
meta:
  name: 123
`;

const MINIMAL_COVER_LETTER = `
type: cover-letter
meta:
  name: Test User
recipient:
  company: Acme Corp
greeting: "Dear Hiring Manager,"
body:
  - "I am writing to apply."
closing: "Sincerely,"
`;

const JSON_RESUME = JSON.stringify({
  basics: { name: 'Test User', email: 'test@example.com' },
  work: [{ name: 'Acme Corp', position: 'Engineer', startDate: '2020-01-01' }],
});

async function writeFixture(name: string, content: string): Promise<string> {
  const dir = join(testDir, randomUUID());
  await mkdir(dir, { recursive: true });
  const path = join(dir, name);
  await writeFile(path, content, 'utf-8');
  return path;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

afterAll(async () => {
  await closeBrowser();
  await rm(testDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// buildCommand
// ---------------------------------------------------------------------------

describe('buildCommand', () => {
  it('generates HTML, JSON, and Markdown for a minimal resume', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const outputDir = join(testDir, `build-${randomUUID()}`);
    await mkdir(outputDir, { recursive: true });

    await buildCommand(inputPath, {
      theme: 'minimal',
      output: outputDir,
      formats: 'html,json,md',
    });

    expect(await fileExists(join(outputDir, 'resume.html'))).toBe(true);
    expect(await fileExists(join(outputDir, 'resume.json'))).toBe(true);
    expect(await fileExists(join(outputDir, 'resume.md'))).toBe(true);

    const html = await readFile(join(outputDir, 'resume.html'), 'utf-8');
    expect(html).toContain('Test User');

    const json = JSON.parse(await readFile(join(outputDir, 'resume.json'), 'utf-8'));
    expect(json.meta.name).toBe('Test User');

    const md = await readFile(join(outputDir, 'resume.md'), 'utf-8');
    expect(md).toContain('# Test User');
  });

  it('generates DOCX output', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const outputDir = join(testDir, `build-docx-${randomUUID()}`);
    await mkdir(outputDir, { recursive: true });

    await buildCommand(inputPath, {
      theme: 'minimal',
      output: outputDir,
      formats: 'docx',
    });

    expect(await fileExists(join(outputDir, 'resume.docx'))).toBe(true);
  });

  it('applies custom output name prefix', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const outputDir = join(testDir, `build-name-${randomUUID()}`);
    await mkdir(outputDir, { recursive: true });

    await buildCommand(inputPath, {
      theme: 'minimal',
      output: outputDir,
      name: 'john-doe',
      formats: 'html',
    });

    expect(await fileExists(join(outputDir, 'john-doe.html'))).toBe(true);
  });

  it('builds a cover letter', async () => {
    const inputPath = await writeFixture('cover-letter.yaml', MINIMAL_COVER_LETTER);
    const outputDir = join(testDir, `build-cl-${randomUUID()}`);
    await mkdir(outputDir, { recursive: true });

    await buildCommand(inputPath, {
      theme: 'minimal',
      output: outputDir,
      formats: 'html,md',
    });

    expect(await fileExists(join(outputDir, 'cover-letter.html'))).toBe(true);
    expect(await fileExists(join(outputDir, 'cover-letter.md'))).toBe(true);
  });

  it('throws when build produces no output files', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const outputDir = join(testDir, `build-empty-${randomUUID()}`);
    await mkdir(outputDir, { recursive: true });

    // Use an invalid format string to trigger no output
    await expect(
      buildCommand(inputPath, {
        theme: 'minimal',
        output: outputDir,
        formats: 'invalid',
      })
    ).rejects.toThrow('Build produced no output files');
  });
});

// ---------------------------------------------------------------------------
// validateCommand
// ---------------------------------------------------------------------------

describe('validateCommand', () => {
  it('succeeds for a valid resume', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const savedExitCode = process.exitCode;
    process.exitCode = undefined;

    await validateCommand(inputPath);

    expect(process.exitCode).toBeUndefined();
    process.exitCode = savedExitCode;
  });

  it('sets exitCode for an invalid resume', async () => {
    const inputPath = await writeFixture('invalid.yaml', INVALID_RESUME);
    const savedExitCode = process.exitCode;
    process.exitCode = undefined;

    await validateCommand(inputPath);

    expect(process.exitCode).toBe(1);
    process.exitCode = savedExitCode;
  });

  it('succeeds for a valid cover letter', async () => {
    const inputPath = await writeFixture('cover-letter.yaml', MINIMAL_COVER_LETTER);
    const savedExitCode = process.exitCode;
    process.exitCode = undefined;

    await validateCommand(inputPath);

    expect(process.exitCode).toBeUndefined();
    process.exitCode = savedExitCode;
  });
});

// ---------------------------------------------------------------------------
// checkCommand
// ---------------------------------------------------------------------------

describe('checkCommand', () => {
  it('produces JSON ATS result', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await checkCommand(inputPath, { json: true });
    } finally {
      console.log = origLog;
    }

    const output = logs.join('\n');
    const result = JSON.parse(output);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
    expect(result).toHaveProperty('categories');
  });

  it('handles cover letter gracefully', async () => {
    const inputPath = await writeFixture('cover-letter.yaml', MINIMAL_COVER_LETTER);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await checkCommand(inputPath, {});
    } finally {
      console.log = origLog;
    }

    expect(logs.join(' ')).toContain('not applicable to cover letters');
  });
});

// ---------------------------------------------------------------------------
// auditCommand
// ---------------------------------------------------------------------------

describe('auditCommand', () => {
  it('produces JSON accessibility result', async () => {
    const inputPath = await writeFixture('resume.yaml', MINIMAL_RESUME);
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await auditCommand(inputPath, { theme: 'minimal', level: 'AA', json: true });
    } finally {
      console.log = origLog;
    }

    const output = logs.join('\n');
    const result = JSON.parse(output);
    expect(result).toHaveProperty('score');
    expect(typeof result.score).toBe('number');
    expect(result).toHaveProperty('categories');
  });
});

// ---------------------------------------------------------------------------
// importCommand
// ---------------------------------------------------------------------------

describe('importCommand', () => {
  it('imports a JSON Resume file to Vitae YAML', async () => {
    const inputPath = await writeFixture('resume.json', JSON_RESUME);
    const outputPath = join(testDir, `import-${randomUUID()}.yaml`);

    await importCommand(inputPath, { output: outputPath, format: 'auto' });

    const content = await readFile(outputPath, 'utf-8');
    expect(content).toContain('Test User');
    expect(content).toContain('Acme Corp');
  });
});

// ---------------------------------------------------------------------------
// themesCommand
// ---------------------------------------------------------------------------

describe('themesCommand', () => {
  it('lists available themes without error', async () => {
    const logs: string[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => logs.push(args.join(' '));

    try {
      await themesCommand();
    } finally {
      console.log = origLog;
    }

    const output = logs.join('\n');
    expect(output).toContain('minimal');
    expect(output).toContain('modern');
    expect(output).toContain('professional');
  });
});
