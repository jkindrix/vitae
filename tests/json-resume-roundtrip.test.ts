import { describe, it, expect } from 'vitest';
import { fromJsonResume, toJsonResume } from '../src/lib/json-resume.js';
import type { Resume } from '../src/types/index.js';

/**
 * Round-trip fidelity test: Vitae → JSON Resume → Vitae
 *
 * The conversion is intentionally lossy in specific ways:
 *   - tags, ids: stripped (JSON Resume has no concept of these)
 *   - tagged highlights: flattened to plain strings
 *   - theme overrides: dropped entirely
 *   - language field: dropped (not in JSON Resume basics)
 *
 * Everything else should survive the round trip.
 */
describe('JSON Resume round-trip fidelity', () => {
  const original: Resume = {
    meta: {
      name: 'Alex Rivera',
      title: 'Staff Engineer',
      email: 'alex@example.com',
      phone: '555-1234',
      location: 'Seattle, WA',
      links: [
        { label: 'GitHub', url: 'https://github.com/alexrivera' },
        { url: 'https://alexrivera.dev' },
      ],
    },
    summary: 'Staff Engineer with 10+ years of experience.',
    skills: [
      { id: 'lang', category: 'Languages', items: ['TypeScript', 'Go'], tags: ['backend'] },
      { category: 'Frontend', items: ['React', 'Vue.js'] },
    ],
    experience: [
      {
        id: 'cloudscale',
        company: 'CloudScale Inc.',
        tags: ['cloud'],
        roles: [
          {
            id: 'staff',
            title: 'Staff Engineer',
            start: '2022-01',
            end: 'present',
            location: 'Seattle, WA',
            summary: 'Led platform team.',
            tags: ['cloud', 'leadership'],
            highlights: [
              'Architected multi-region failover system',
              { text: 'Reduced cloud spend by 35%', tags: ['cloud'] },
            ],
          },
          {
            title: 'Senior Engineer',
            start: '2020-03',
            end: '2022-01',
            highlights: ['Built event processing pipeline'],
          },
        ],
      },
      {
        company: 'WebFlow Studios',
        roles: [
          {
            title: 'Lead Frontend Engineer',
            start: '2018-06',
            end: '2020-02',
            highlights: ['Led design system initiative'],
          },
        ],
      },
    ],
    projects: [
      {
        id: 'orch',
        name: 'cloud-orchestrator',
        url: 'https://github.com/alex/orch',
        description: 'Multi-cloud deployment tool',
        tags: ['cloud'],
        highlights: ['1000+ GitHub stars', { text: 'Used by 50 companies', tags: ['cloud'] }],
      },
    ],
    education: [
      {
        id: 'ut',
        institution: 'UT Austin',
        degree: 'BS',
        field: 'Computer Science',
        start: '2009',
        end: '2013',
        tags: ['backend'],
        highlights: ['GPA: 3.7', { text: 'Thesis on consensus', tags: ['backend'] }],
      },
    ],
    certifications: [
      {
        id: 'aws',
        name: 'AWS Solutions Architect',
        issuer: 'Amazon',
        date: '2023',
        url: 'https://aws.amazon.com/verify/123',
        tags: ['cloud'],
      },
    ],
    languages: [
      { language: 'English', fluency: 'Native' },
      { language: 'Spanish', fluency: 'Conversational' },
    ],
    awards: [
      {
        title: 'Engineer of the Year',
        awarder: 'CloudScale Inc.',
        date: '2023',
        summary: 'Annual award',
      },
    ],
    publications: [
      {
        name: 'Distributed Consensus at Scale',
        publisher: 'ACM',
        date: '2022-06',
        url: 'https://acm.org/paper/123',
        summary: 'Novel consensus protocol.',
      },
    ],
    volunteer: [
      {
        id: 'code',
        organization: 'Code.org',
        position: 'Instructor',
        start: '2019',
        end: '2021',
        tags: ['leadership'],
        highlights: ['Taught 200+ students', { text: 'Developed curriculum', tags: ['frontend'] }],
      },
    ],
    references: [{ name: 'Jane Smith', reference: 'Alex is an exceptional engineer.' }],
  };

  const roundTripped = fromJsonResume(toJsonResume(original));

  describe('meta fields are preserved', () => {
    it('preserves name', () => {
      expect(roundTripped.meta.name).toBe(original.meta.name);
    });

    it('preserves title', () => {
      expect(roundTripped.meta.title).toBe(original.meta.title);
    });

    it('preserves email', () => {
      expect(roundTripped.meta.email).toBe(original.meta.email);
    });

    it('preserves phone', () => {
      expect(roundTripped.meta.phone).toBe(original.meta.phone);
    });

    it('preserves location', () => {
      expect(roundTripped.meta.location).toBe(original.meta.location);
    });

    it('preserves links count and URLs', () => {
      expect(roundTripped.meta.links).toHaveLength(2);
      expect(roundTripped.meta.links![0]!.url).toBe('https://github.com/alexrivera');
      expect(roundTripped.meta.links![0]!.label).toBe('GitHub');
      expect(roundTripped.meta.links![1]!.url).toBe('https://alexrivera.dev');
    });
  });

  it('preserves summary', () => {
    expect(roundTripped.summary).toBe(original.summary);
  });

  describe('experience round-trips via company grouping', () => {
    it('preserves company count', () => {
      expect(roundTripped.experience).toHaveLength(2);
    });

    it('re-groups multi-role companies by name', () => {
      const cloudscale = roundTripped.experience.find((e) => e.company === 'CloudScale Inc.');
      expect(cloudscale).toBeDefined();
      expect(cloudscale!.roles).toHaveLength(2);
      expect(cloudscale!.roles[0]!.title).toBe('Staff Engineer');
      expect(cloudscale!.roles[1]!.title).toBe('Senior Engineer');
    });

    it('preserves role dates', () => {
      const cloudscale = roundTripped.experience.find((e) => e.company === 'CloudScale Inc.');
      expect(cloudscale!.roles[0]!.start).toBe('2022-01');
      // "present" doesn't survive — toJsonResume passes it through, fromJsonResume's convertDate returns it as-is
      expect(cloudscale!.roles[0]!.end).toBe('present');
      expect(cloudscale!.roles[1]!.start).toBe('2020-03');
      expect(cloudscale!.roles[1]!.end).toBe('2022-01');
    });

    it('preserves role location', () => {
      const cloudscale = roundTripped.experience.find((e) => e.company === 'CloudScale Inc.');
      expect(cloudscale!.roles[0]!.location).toBe('Seattle, WA');
    });

    it('preserves role summary', () => {
      const cloudscale = roundTripped.experience.find((e) => e.company === 'CloudScale Inc.');
      expect(cloudscale!.roles[0]!.summary).toBe('Led platform team.');
    });

    it('flattens tagged highlights to plain strings', () => {
      const cloudscale = roundTripped.experience.find((e) => e.company === 'CloudScale Inc.');
      expect(cloudscale!.roles[0]!.highlights).toEqual([
        'Architected multi-region failover system',
        'Reduced cloud spend by 35%',
      ]);
    });
  });

  describe('skills are preserved', () => {
    it('preserves skill count', () => {
      expect(roundTripped.skills).toHaveLength(2);
    });

    it('preserves category names and items', () => {
      expect(roundTripped.skills![0]!.category).toBe('Languages');
      expect(roundTripped.skills![0]!.items).toEqual(['TypeScript', 'Go']);
      expect(roundTripped.skills![1]!.category).toBe('Frontend');
      expect(roundTripped.skills![1]!.items).toEqual(['React', 'Vue.js']);
    });
  });

  describe('projects are preserved', () => {
    it('preserves project fields', () => {
      expect(roundTripped.projects).toHaveLength(1);
      expect(roundTripped.projects![0]!.name).toBe('cloud-orchestrator');
      expect(roundTripped.projects![0]!.url).toBe('https://github.com/alex/orch');
      expect(roundTripped.projects![0]!.description).toBe('Multi-cloud deployment tool');
    });

    it('flattens tagged highlights to plain strings', () => {
      expect(roundTripped.projects![0]!.highlights).toEqual([
        '1000+ GitHub stars',
        'Used by 50 companies',
      ]);
    });
  });

  describe('education is preserved', () => {
    it('preserves education fields', () => {
      expect(roundTripped.education).toHaveLength(1);
      expect(roundTripped.education![0]!.institution).toBe('UT Austin');
      expect(roundTripped.education![0]!.degree).toBe('BS');
      expect(roundTripped.education![0]!.field).toBe('Computer Science');
      expect(roundTripped.education![0]!.start).toBe('2009');
      expect(roundTripped.education![0]!.end).toBe('2013');
    });

    it('maps highlights to courses and back to highlights', () => {
      // Vitae highlights → JSON Resume courses → Vitae highlights
      expect(roundTripped.education![0]!.highlights).toEqual(['GPA: 3.7', 'Thesis on consensus']);
    });
  });

  describe('certifications are preserved', () => {
    it('preserves certification fields', () => {
      expect(roundTripped.certifications).toHaveLength(1);
      expect(roundTripped.certifications![0]!.name).toBe('AWS Solutions Architect');
      expect(roundTripped.certifications![0]!.issuer).toBe('Amazon');
      expect(roundTripped.certifications![0]!.date).toBe('2023');
    });

    it('loses url (JSON Resume certificates have url but fromJsonResume maps it)', () => {
      // url DOES survive — fromJsonResume maps cert.url
      expect(roundTripped.certifications![0]!.url).toBe('https://aws.amazon.com/verify/123');
    });
  });

  describe('languages are preserved', () => {
    it('preserves language entries', () => {
      expect(roundTripped.languages).toHaveLength(2);
      expect(roundTripped.languages![0]!.language).toBe('English');
      expect(roundTripped.languages![0]!.fluency).toBe('Native');
      expect(roundTripped.languages![1]!.language).toBe('Spanish');
      expect(roundTripped.languages![1]!.fluency).toBe('Conversational');
    });
  });

  describe('awards are preserved', () => {
    it('preserves award fields', () => {
      expect(roundTripped.awards).toHaveLength(1);
      expect(roundTripped.awards![0]!.title).toBe('Engineer of the Year');
      expect(roundTripped.awards![0]!.awarder).toBe('CloudScale Inc.');
      expect(roundTripped.awards![0]!.date).toBe('2023');
      expect(roundTripped.awards![0]!.summary).toBe('Annual award');
    });
  });

  describe('publications are preserved', () => {
    it('preserves publication fields', () => {
      expect(roundTripped.publications).toHaveLength(1);
      expect(roundTripped.publications![0]!.name).toBe('Distributed Consensus at Scale');
      expect(roundTripped.publications![0]!.publisher).toBe('ACM');
      expect(roundTripped.publications![0]!.date).toBe('2022-06');
      expect(roundTripped.publications![0]!.url).toBe('https://acm.org/paper/123');
      expect(roundTripped.publications![0]!.summary).toBe('Novel consensus protocol.');
    });
  });

  describe('volunteer is preserved', () => {
    it('preserves volunteer fields', () => {
      expect(roundTripped.volunteer).toHaveLength(1);
      expect(roundTripped.volunteer![0]!.organization).toBe('Code.org');
      expect(roundTripped.volunteer![0]!.position).toBe('Instructor');
      expect(roundTripped.volunteer![0]!.start).toBe('2019');
      expect(roundTripped.volunteer![0]!.end).toBe('2021');
    });

    it('flattens tagged highlights to plain strings', () => {
      expect(roundTripped.volunteer![0]!.highlights).toEqual([
        'Taught 200+ students',
        'Developed curriculum',
      ]);
    });
  });

  describe('references are preserved', () => {
    it('preserves reference fields', () => {
      expect(roundTripped.references).toHaveLength(1);
      expect(roundTripped.references![0]!.name).toBe('Jane Smith');
      expect(roundTripped.references![0]!.reference).toBe('Alex is an exceptional engineer.');
    });
  });

  describe('intentionally lost fields', () => {
    it('loses all ids', () => {
      expect(roundTripped.experience[0]).not.toHaveProperty('id');
      expect(roundTripped.experience[0]!.roles[0]).not.toHaveProperty('id');
      expect(roundTripped.skills![0]).not.toHaveProperty('id');
      expect(roundTripped.projects![0]).not.toHaveProperty('id');
      expect(roundTripped.education![0]).not.toHaveProperty('id');
      expect(roundTripped.certifications![0]).not.toHaveProperty('id');
      expect(roundTripped.volunteer![0]).not.toHaveProperty('id');
    });

    it('loses all tags', () => {
      expect(roundTripped.experience[0]).not.toHaveProperty('tags');
      expect(roundTripped.experience[0]!.roles[0]).not.toHaveProperty('tags');
      expect(roundTripped.skills![0]).not.toHaveProperty('tags');
      expect(roundTripped.projects![0]).not.toHaveProperty('tags');
      expect(roundTripped.education![0]).not.toHaveProperty('tags');
      expect(roundTripped.certifications![0]).not.toHaveProperty('tags');
      expect(roundTripped.volunteer![0]).not.toHaveProperty('tags');
    });

    it('loses tagged highlight structure (all become plain strings)', () => {
      const highlights = roundTripped.experience[0]!.roles[0]!.highlights!;
      for (const h of highlights) {
        expect(typeof h).toBe('string');
      }
    });
  });
});
