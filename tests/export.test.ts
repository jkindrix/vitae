import { describe, it, expect } from 'vitest';
import { toJsonResume } from '../src/lib/json-resume.js';
import { exportCommand } from '../src/commands/export.js';
import { writeFile, readFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import type { Resume } from '../src/types/index.js';

describe('exportCommand format alias', () => {
  it('accepts "json" as alias for "json-resume"', async () => {
    const testDir = join(tmpdir(), `vitae-export-${randomUUID()}`);
    const inputPath = join(testDir, 'resume.yaml');
    const outputPath = join(testDir, 'out.json');

    const { mkdir } = await import('fs/promises');
    await mkdir(testDir, { recursive: true });

    await writeFile(
      inputPath,
      `meta:\n  name: Test\nexperience:\n  - company: Co\n    roles:\n      - title: Dev\n        start: "2020"\n`,
      'utf-8'
    );

    await exportCommand(inputPath, { format: 'json', output: outputPath });

    const content = await readFile(outputPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.basics?.name).toBe('Test');

    await rm(testDir, { recursive: true, force: true });
  });
});

describe('export to JSON Resume', () => {
  const fullResume: Resume = {
    meta: {
      name: 'Jane Doe',
      title: 'Senior Engineer',
      email: 'jane@test.com',
      phone: '555-0100',
      location: 'Austin, TX',
      links: [
        { label: 'GitHub', url: 'https://github.com/jane' },
        { url: 'https://linkedin.com/in/jane' },
      ],
    },
    summary: 'Experienced engineer.',
    experience: [
      {
        company: 'BigCo',
        roles: [
          {
            title: 'Lead',
            start: '2021-01',
            end: 'present',
            location: 'Remote',
            highlights: ['Led team of 5', 'Shipped v2'],
          },
          {
            title: 'Engineer',
            start: '2019-06',
            end: '2021-01',
            highlights: ['Built features'],
          },
        ],
      },
    ],
    skills: [
      { category: 'Languages', items: ['TypeScript', 'Go'] },
    ],
    education: [
      { institution: 'MIT', degree: 'BS', field: 'CS', end: '2019' },
    ],
    projects: [
      { name: 'Tool', url: 'https://github.com/tool', highlights: ['Popular'] },
    ],
    certifications: [
      { name: 'AWS SA', issuer: 'Amazon', date: '2023' },
    ],
  };

  it('maps basics correctly', () => {
    const result = toJsonResume(fullResume);

    expect(result.basics?.name).toBe('Jane Doe');
    expect(result.basics?.label).toBe('Senior Engineer');
    expect(result.basics?.email).toBe('jane@test.com');
    expect(result.basics?.phone).toBe('555-0100');
    expect(result.basics?.location?.city).toBe('Austin');
    expect(result.basics?.summary).toBe('Experienced engineer.');
  });

  it('flattens multi-role experience into separate work entries', () => {
    const result = toJsonResume(fullResume);

    // BigCo has 2 roles → 2 work entries
    expect(result.work).toHaveLength(2);
    expect(result.work?.[0]?.name).toBe('BigCo');
    expect(result.work?.[0]?.position).toBe('Lead');
    expect(result.work?.[1]?.position).toBe('Engineer');
  });

  it('maps highlights correctly', () => {
    const result = toJsonResume(fullResume);

    expect(result.work?.[0]?.highlights).toEqual(['Led team of 5', 'Shipped v2']);
  });

  it('maps skills, education, projects, certifications', () => {
    const result = toJsonResume(fullResume);

    expect(result.skills).toHaveLength(1);
    expect(result.skills?.[0]?.name).toBe('Languages');
    expect(result.skills?.[0]?.keywords).toEqual(['TypeScript', 'Go']);

    expect(result.education).toHaveLength(1);
    expect(result.education?.[0]?.institution).toBe('MIT');

    expect(result.projects).toHaveLength(1);
    expect(result.projects?.[0]?.name).toBe('Tool');

    expect(result.certificates).toHaveLength(1);
    expect(result.certificates?.[0]?.name).toBe('AWS SA');
  });

  it('maps profiles from links', () => {
    const result = toJsonResume(fullResume);

    expect(result.basics?.profiles).toHaveLength(2);
    expect(result.basics?.profiles?.[0]?.network).toBe('GitHub');
    expect(result.basics?.profiles?.[0]?.url).toBe('https://github.com/jane');
  });

  it('flattens tagged highlights to plain strings', () => {
    const resume: Resume = {
      meta: { name: 'Test' },
      experience: [
        {
          company: 'Co',
          roles: [
            {
              title: 'Dev',
              start: '2020',
              highlights: [
                'plain string',
                { text: 'tagged item', tags: ['backend'] },
              ],
            },
          ],
        },
      ],
    };

    const result = toJsonResume(resume);

    expect(result.work?.[0]?.highlights).toEqual(['plain string', 'tagged item']);
  });

  it('handles minimal resume', () => {
    const resume: Resume = {
      meta: { name: 'Minimal' },
      experience: [
        { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
      ],
    };

    const result = toJsonResume(resume);

    expect(result.basics?.name).toBe('Minimal');
    expect(result.work).toHaveLength(1);
    expect(result.skills).toBeUndefined();
    expect(result.education).toBeUndefined();
  });
});
