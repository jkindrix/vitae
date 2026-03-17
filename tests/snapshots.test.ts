/**
 * Snapshot tests for rendered output.
 *
 * These catch structural regressions in HTML and Markdown output that
 * presence-based assertions miss (e.g., changed DOM structure, element
 * ordering, CSS class names, heading hierarchy).
 *
 * When a snapshot fails, review the diff to determine if the change was
 * intentional. If so, update the snapshot with: npx vitest -u
 */

import { describe, it, expect } from 'vitest';
import { renderStandaloneHtml } from '../src/lib/renderer.js';
import { renderCoverLetterStandaloneHtml } from '../src/lib/cover-letter.js';
import { resumeToMarkdown } from '../src/lib/markdown.js';
import { normalizeResume } from '../src/lib/normalize.js';
import type { Resume } from '../src/types/index.js';
import type { CoverLetter } from '../src/types/cover-letter.js';

// ---------------------------------------------------------------------------
// Stable fixture — all fields populated, deterministic content
// ---------------------------------------------------------------------------

const SNAPSHOT_RESUME: Resume = {
  meta: {
    name: 'Alex Rivera',
    title: 'Senior Software Engineer',
    email: 'alex@example.com',
    phone: '(555) 867-5309',
    location: 'Austin, TX',
    links: [
      { label: 'GitHub', url: 'https://github.com/arivera' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/arivera' },
    ],
  },
  summary:
    'Full-stack engineer with 8 years of experience building scalable web applications and distributed systems.',
  skills: [
    { category: 'Languages', items: ['TypeScript', 'Python', 'Go'] },
    { category: 'Frameworks', items: ['React', 'Node.js', 'FastAPI'] },
    { category: 'Infrastructure', items: ['AWS', 'Docker', 'Kubernetes'] },
  ],
  experience: [
    {
      company: 'Acme Corp',
      roles: [
        {
          title: 'Senior Software Engineer',
          start: '2021-03',
          end: 'present',
          location: 'Austin, TX',
          highlights: [
            'Architected event-driven microservices handling 50K requests per second',
            'Led migration from monolith to distributed system, reducing deploy time by 80%',
            'Mentored team of 4 junior engineers through weekly code reviews',
          ],
        },
        {
          title: 'Software Engineer',
          start: '2019-01',
          end: '2021-03',
          highlights: [
            'Built real-time analytics dashboard used by 200+ internal users',
            'Reduced API response times by 60% through query optimization',
          ],
        },
      ],
    },
    {
      company: 'StartupCo',
      roles: [
        {
          title: 'Full Stack Developer',
          start: '2016-06',
          end: '2018-12',
          location: 'Remote',
          highlights: [
            'Developed customer-facing portal from scratch serving 10K daily users',
            'Implemented CI/CD pipeline reducing release cycle from weeks to hours',
          ],
        },
      ],
    },
  ],
  projects: [
    {
      name: 'fastcache',
      url: 'https://github.com/arivera/fastcache',
      description: 'High-performance in-memory caching library for Node.js',
      highlights: ['5K+ npm downloads per week', 'Sub-millisecond read latency'],
    },
  ],
  education: [
    {
      institution: 'University of Texas at Austin',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      start: '2012',
      end: '2016',
      highlights: ['Summa Cum Laude', 'Teaching Assistant for Systems Programming'],
    },
  ],
  certifications: [
    {
      name: 'AWS Solutions Architect - Professional',
      issuer: 'Amazon Web Services',
      date: '2023',
    },
  ],
  languages: [
    { language: 'English', fluency: 'Native' },
    { language: 'Spanish', fluency: 'Conversational' },
  ],
};

const SNAPSHOT_COVER_LETTER: CoverLetter = {
  type: 'cover-letter',
  meta: {
    name: 'Alex Rivera',
    email: 'alex@example.com',
    phone: '(555) 867-5309',
    location: 'Austin, TX',
  },
  recipient: {
    name: 'Jamie Chen',
    title: 'VP of Engineering',
    company: 'TechVentures Inc.',
    address: '100 Innovation Way, San Francisco, CA 94105',
  },
  date: '2025-01-15',
  subject: 'Application for Senior Backend Engineer',
  greeting: 'Dear Jamie,',
  body: [
    'I am writing to express my interest in the Senior Backend Engineer position at TechVentures Inc. With 8 years of experience building distributed systems and leading engineering teams, I am excited about the opportunity to contribute to your platform.',
    'In my current role at Acme Corp, I architected an event-driven microservices platform handling 50,000 requests per second and led the migration from a monolithic architecture. This experience directly aligns with the challenges described in your job posting.',
    'I would welcome the opportunity to discuss how my background in scalable systems and team leadership can contribute to TechVentures. Thank you for your consideration.',
  ],
  closing: 'Best regards,',
};

// ---------------------------------------------------------------------------
// HTML snapshots — one per theme
// ---------------------------------------------------------------------------

describe('HTML snapshots', () => {
  const normalized = normalizeResume(SNAPSHOT_RESUME);

  for (const theme of ['minimal', 'modern', 'professional']) {
    it(`${theme} theme matches snapshot`, async () => {
      const html = await renderStandaloneHtml(normalized, theme);
      expect(html).toMatchSnapshot();
    });
  }
});

// ---------------------------------------------------------------------------
// Markdown snapshot
// ---------------------------------------------------------------------------

describe('Markdown snapshot', () => {
  it('resume markdown matches snapshot', () => {
    const normalized = normalizeResume(SNAPSHOT_RESUME);
    const md = resumeToMarkdown(normalized);
    expect(md).toMatchSnapshot();
  });
});

// ---------------------------------------------------------------------------
// Cover letter HTML snapshot
// ---------------------------------------------------------------------------

describe('Cover letter HTML snapshot', () => {
  it('minimal theme matches snapshot', async () => {
    const html = await renderCoverLetterStandaloneHtml(SNAPSHOT_COVER_LETTER, 'minimal');
    expect(html).toMatchSnapshot();
  });
});
