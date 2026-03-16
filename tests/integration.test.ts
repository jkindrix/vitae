/**
 * End-to-end pipeline integration tests.
 *
 * Tests the full pipeline: resume data → applyVariant() → normalizeResume() → renderStandaloneHtml()
 * Uses in-memory fixtures (no file I/O) to test the seams between modules.
 */
import { describe, it, expect } from 'vitest';
import { applyVariant } from '../src/lib/variant.js';
import { normalizeResume } from '../src/lib/normalize.js';
import { renderStandaloneHtml } from '../src/lib/renderer.js';
import type { Resume, Variant } from '../src/types/index.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseResume: Resume = {
  meta: {
    name: 'Alice Johnson',
    title: 'Full Stack Developer',
    email: 'alice@example.com',
    location: 'Austin, TX',
  },
  summary: 'Versatile engineer with backend and frontend expertise.',
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Go', 'Python'], tags: ['backend', 'frontend'] },
    { category: 'Frontend', items: ['React', 'Vue'], tags: ['frontend'] },
    { category: 'DevOps', items: ['Docker', 'Terraform'], tags: ['devops'] },
  ],
  experience: [
    {
      company: 'Acme Corp',
      tags: ['backend'],
      roles: [
        {
          title: 'Senior Engineer',
          start: '2021-01',
          end: 'present',
          tags: ['backend'],
          highlights: [
            { text: 'Built microservices', tags: ['backend'] },
            { text: 'Led migration to Go', tags: ['backend'] },
            { text: 'Mentored 3 junior devs', tags: ['leadership'] },
          ],
        },
      ],
    },
    {
      company: 'StartupXYZ',
      tags: ['frontend'],
      roles: [
        {
          title: 'Frontend Dev',
          start: '2019-06',
          end: '2020-12',
          tags: ['frontend'],
          highlights: [
            { text: 'Shipped React redesign', tags: ['frontend'] },
            'Improved load time by 40%',
          ],
        },
      ],
    },
    {
      company: 'Legacy Inc',
      tags: ['legacy'],
      roles: [
        {
          title: 'Junior Dev',
          start: '2017-01',
          end: '2019-05',
          highlights: ['Fixed bugs'],
        },
      ],
    },
  ],
  projects: [
    { name: 'OpenLib', description: 'OSS library', tags: ['backend'], highlights: ['500 stars'] },
    { name: 'Portfolio', description: 'Personal site', tags: ['frontend'], highlights: ['Responsive design'] },
  ],
  education: [
    { institution: 'State University', degree: 'BS', field: 'Computer Science', end: '2017' },
  ],
  certifications: [
    { name: 'AWS Solutions Architect', issuer: 'Amazon', tags: ['devops'] },
    { name: 'CKA', issuer: 'CNCF', tags: ['devops'] },
  ],
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('integration: pipeline end-to-end', () => {
  it('base resume with no variant renders all sections', async () => {
    const normalized = normalizeResume(baseResume);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    // All section content present
    expect(html).toContain('Alice Johnson');
    expect(html).toContain('Full Stack Developer');
    expect(html).toContain('Versatile engineer');
    expect(html).toContain('Languages');
    expect(html).toContain('Frontend');
    expect(html).toContain('DevOps');
    expect(html).toContain('Acme Corp');
    expect(html).toContain('StartupXYZ');
    expect(html).toContain('Legacy Inc');
    expect(html).toContain('OpenLib');
    expect(html).toContain('Portfolio');
    expect(html).toContain('State University');
    expect(html).toContain('AWS Solutions Architect');
  });

  it('variant with tags filters content, normalization flattens highlights, renderer outputs filtered HTML', async () => {
    const variant: Variant = {
      tags: ['backend'],
    };

    const filtered = applyVariant(baseResume, variant);
    const normalized = normalizeResume(filtered);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    // Backend-tagged content survives
    expect(html).toContain('Acme Corp');
    expect(html).toContain('Built microservices');
    expect(html).toContain('OpenLib');

    // Frontend-only company filtered out by tag
    expect(html).not.toContain('StartupXYZ');

    // Languages skill category passes (has backend tag)
    expect(html).toContain('Languages');
    // Frontend-only skill category filtered out
    expect(html).not.toContain('React');

    // Highlights are flattened to plain strings (no tag objects in output)
    expect(normalized.experience[0]?.roles[0]?.highlights).toEqual(
      expect.arrayContaining([expect.any(String)])
    );
  });

  it('variant with pick + limit → normalize → render: correct items in correct order', async () => {
    const variant: Variant = {
      skills: {
        pick: ['DevOps', 'Languages'],
        limit: 1,
      },
    };

    const filtered = applyVariant(baseResume, variant);
    const normalized = normalizeResume(filtered);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    // Pick order: DevOps first, Languages second; limit 1 means only DevOps
    expect(html).toContain('Docker');
    expect(html).toContain('Terraform');
    // Languages skill category items should be absent (filtered out by limit)
    expect(html).not.toContain('TypeScript');
    expect(html).not.toContain('Python');
    // Frontend skill category items should be absent (not picked)
    // Note: "React" also appears in experience highlight, so check for "Vue" which is skills-only
    expect(html).not.toContain('Vue');
  });

  it('variant with layout controls which sections appear in rendered HTML', async () => {
    const variant: Variant = {
      layout: ['experience', 'skills'],
    };

    const filtered = applyVariant(baseResume, variant);
    // Pass layout as section order to normalizeResume
    const normalized = normalizeResume(filtered, variant.layout);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    // Experience and Skills should be present
    expect(html).toContain('Acme Corp');
    expect(html).toContain('Languages');

    // Sections not in layout should be absent from sections array
    expect(normalized.sections).toEqual(['experience', 'skills']);
    expect(normalized.sections).not.toContain('projects');
    expect(normalized.sections).not.toContain('education');
  });

  it('variant with style overrides → rendered HTML contains injected CSS custom properties', async () => {
    const variant: Variant = {
      style: {
        '--color-accent': '#0066cc',
        '--font-heading': '"Inter", sans-serif',
      },
    };

    const filtered = applyVariant(baseResume, variant);
    const normalized = normalizeResume(filtered);
    const html = await renderStandaloneHtml(normalized, 'minimal', {
      styleOverrides: variant.style,
    });

    expect(html).toContain('--color-accent: #0066cc');
    expect(html).toContain('--font-heading: "Inter", sans-serif');
    expect(html).toContain(':root {');
  });

  it('experience 3-level filtering (company + role + highlight tags) produces correct output', async () => {
    const variant: Variant = {
      experience: {
        tags: ['backend'],
        roles: {
          tags: ['backend'],
        },
        highlights: {
          tags: ['backend'],
        },
      },
    };

    const filtered = applyVariant(baseResume, variant);
    const normalized = normalizeResume(filtered);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    // Only backend company
    expect(html).toContain('Acme Corp');
    expect(html).not.toContain('StartupXYZ');

    // Only backend highlights
    expect(html).toContain('Built microservices');
    expect(html).toContain('Led migration to Go');
    // Leadership-tagged highlight filtered out
    expect(html).not.toContain('Mentored 3 junior devs');

    // Legacy Inc has tags: ['legacy'] — not matching ['backend'], so filtered out
    expect(html).not.toContain('Legacy Inc');
  });

  it('empty section after filtering → section heading absent from rendered HTML', async () => {
    const variant: Variant = {
      certifications: {
        tags: ['nonexistent-tag'],
      },
    };

    const filtered = applyVariant(baseResume, variant);

    // Certifications have devops tags, none match nonexistent-tag → but untagged items pass
    // Actually, all certs have tags so they won't be "untagged". Let's use omit instead.
    const variant2: Variant = {
      certifications: {
        omit: ['AWS Solutions Architect', 'CKA'],
      },
    };

    const filtered2 = applyVariant(baseResume, variant2);
    const normalized2 = normalizeResume(filtered2);

    // Certifications section should be absent
    expect(normalized2.sections).not.toContain('certifications');
    expect(normalized2.certifications).toBeUndefined();

    const html = await renderStandaloneHtml(normalized2, 'minimal');
    expect(html).not.toContain('AWS Solutions Architect');
    expect(html).not.toContain('CKA');
  });

  it('meta override in variant → rendered HTML shows overridden title', async () => {
    const variant: Variant = {
      meta: {
        title: 'Backend Specialist',
      },
    };

    const filtered = applyVariant(baseResume, variant);
    const normalized = normalizeResume(filtered);
    const html = await renderStandaloneHtml(normalized, 'minimal');

    expect(html).toContain('Backend Specialist');
    expect(html).not.toContain('Full Stack Developer');
    // Name unchanged
    expect(html).toContain('Alice Johnson');
  });
});
