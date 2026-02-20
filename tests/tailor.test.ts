import { describe, it, expect } from 'vitest';
import {
  analyzeTailoring,
  generateVariant,
  serializeVariantWithComments,
} from '../src/lib/tailor.js';
import { extractKeywords } from '../src/lib/ats.js';
import { assertValidVariant } from '../src/lib/schema.js';
import { applyVariant } from '../src/lib/variant.js';
import type { Resume } from '../src/types/index.js';
import yaml from 'yaml';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function fullResume(): Resume {
  return {
    meta: {
      name: 'Jane Doe',
      title: 'Senior Software Engineer',
      email: 'jane@example.com',
      phone: '555-123-4567',
      location: 'San Francisco, CA',
    },
    summary:
      'Experienced software engineer with 10 years building scalable web applications and cloud infrastructure.',
    skills: [
      { category: 'Languages', items: ['TypeScript', 'Python', 'Go', 'Rust'] },
      { category: 'Backend', items: ['Node.js', 'Django', 'PostgreSQL', 'Redis'] },
      { category: 'Infrastructure', items: ['Docker', 'Kubernetes', 'AWS', 'Terraform'] },
      { category: 'Frontend', items: ['React', 'Vue.js', 'CSS', 'HTML'] },
    ],
    experience: [
      {
        company: 'BigCorp',
        roles: [
          {
            title: 'Senior Engineer',
            start: '2021-01',
            end: 'present',
            highlights: [
              'Led migration to microservices architecture serving 2M+ users',
              'Reduced API response times by 60% through caching and query optimization',
              'Built CI/CD pipeline using GitHub Actions and Docker containers',
            ],
          },
        ],
      },
      {
        company: 'StartupCo',
        roles: [
          {
            title: 'Full Stack Developer',
            start: '2018-01',
            end: '2020-12',
            highlights: [
              'Developed RESTful API powering mobile and web applications',
              'Implemented automated testing with 95% code coverage',
            ],
          },
        ],
      },
    ],
    education: [
      { institution: 'MIT', degree: 'BS', field: 'Computer Science', end: '2017' },
    ],
    projects: [
      {
        name: 'Cloud Dashboard',
        description: 'Real-time monitoring dashboard for AWS infrastructure',
        highlights: ['Processes 100K events per second', 'Used by 50+ teams'],
      },
    ],
    certifications: [
      { name: 'AWS Solutions Architect', issuer: 'Amazon', date: '2023' },
    ],
  };
}

function minimalResume(): Resume {
  return {
    meta: { name: 'Test User' },
    experience: [
      { company: 'Co', roles: [{ title: 'Dev', start: '2020' }] },
    ],
  };
}

const backendJobDescription = `
Senior Backend Engineer - Cloud Platform

We are looking for a Senior Backend Engineer to join our Cloud Platform team.
You will design and build scalable microservices using Node.js and TypeScript,
manage cloud infrastructure on AWS, and maintain our CI/CD pipelines.

Requirements:
- 5+ years of backend engineering experience
- Strong proficiency in TypeScript and Node.js
- Experience with AWS services (EC2, Lambda, ECS)
- Experience with Docker and Kubernetes
- Knowledge of microservices architecture
- Experience with PostgreSQL and Redis
- Strong understanding of RESTful APIs
- Experience with CI/CD and GitHub Actions

Nice to have:
- Experience with Terraform
- Knowledge of GraphQL
- Experience with event-driven architecture
`;

const frontendJobDescription = `
Frontend Developer

We need a Frontend Developer with React and Vue.js expertise.
Strong CSS skills and responsive design experience required.
Must have experience with component libraries and design systems.

Requirements:
- React or Vue.js proficiency
- CSS and HTML mastery
- Responsive design
- Component library experience
- Design system knowledge
`;

// ---------------------------------------------------------------------------
// analyzeTailoring
// ---------------------------------------------------------------------------

describe('analyzeTailoring', () => {
  describe('keyword matching', () => {
    it('returns match percentage', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.matchPercentage).toBeGreaterThan(0);
      expect(analysis.matchPercentage).toBeLessThanOrEqual(100);
    });

    it('separates matched and missing keywords', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.matchedKeywords.length).toBeGreaterThan(0);
      expect(analysis.missingKeywords.length).toBeGreaterThan(0);
      expect(analysis.matchedKeywords.length + analysis.missingKeywords.length).toBe(
        analysis.keywords.length
      );
    });

    it('finds keywords present in the resume', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      // TypeScript, Node.js, AWS, Docker, Kubernetes should all match
      expect(analysis.matchedKeywords).toContain('typescript');
      expect(analysis.matchedKeywords).toContain('aws');
      expect(analysis.matchedKeywords).toContain('docker');
    });

    it('returns 100% for empty job description yielding no keywords', () => {
      // extractKeywords with all stop words returns empty → 100%
      const analysis = analyzeTailoring(fullResume(), 'the and or is a an');
      expect(analysis.matchPercentage).toBe(100);
    });
  });

  describe('section relevance', () => {
    it('ranks sections by keyword match count', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.sectionRelevance.length).toBeGreaterThan(0);

      // Should be sorted descending by matchCount
      for (let i = 1; i < analysis.sectionRelevance.length; i++) {
        expect(analysis.sectionRelevance[i]!.matchCount).toBeLessThanOrEqual(
          analysis.sectionRelevance[i - 1]!.matchCount
        );
      }
    });

    it('includes sections with content', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      const sectionNames = analysis.sectionRelevance.map((s) => s.section);
      expect(sectionNames).toContain('experience');
      expect(sectionNames).toContain('skills');
    });

    it('excludes sections without content', () => {
      const analysis = analyzeTailoring(minimalResume(), backendJobDescription);
      const sectionNames = analysis.sectionRelevance.map((s) => s.section);
      expect(sectionNames).not.toContain('skills');
      expect(sectionNames).not.toContain('summary');
      expect(sectionNames).not.toContain('projects');
    });

    it('tracks which keywords matched in each section', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      const expSection = analysis.sectionRelevance.find((s) => s.section === 'experience');
      expect(expSection).toBeDefined();
      expect(expSection!.matchedKeywords.length).toBe(expSection!.matchCount);
      expect(expSection!.matchedKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('skill category relevance', () => {
    it('ranks skill categories by keyword match count', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.skillRelevance.length).toBe(4);

      // Should be sorted descending
      for (let i = 1; i < analysis.skillRelevance.length; i++) {
        expect(analysis.skillRelevance[i]!.matchCount).toBeLessThanOrEqual(
          analysis.skillRelevance[i - 1]!.matchCount
        );
      }
    });

    it('returns empty for resume without skills', () => {
      const analysis = analyzeTailoring(minimalResume(), backendJobDescription);
      expect(analysis.skillRelevance).toEqual([]);
    });

    it('ranks Infrastructure higher than Frontend for a backend job', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      const infraIdx = analysis.skillRelevance.findIndex((s) => s.category === 'Infrastructure');
      const frontendIdx = analysis.skillRelevance.findIndex((s) => s.category === 'Frontend');
      expect(infraIdx).toBeLessThan(frontendIdx);
    });

    it('ranks Frontend higher for a frontend job', () => {
      const analysis = analyzeTailoring(fullResume(), frontendJobDescription);
      const frontendIdx = analysis.skillRelevance.findIndex((s) => s.category === 'Frontend');
      // Frontend should be near the top
      expect(frontendIdx).toBeLessThanOrEqual(1);
    });
  });

  describe('summary recommendation', () => {
    it('identifies keywords missing from summary', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.summaryRecommendation.missingKeywords.length).toBeGreaterThan(0);
    });

    it('identifies keywords present in summary', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.summaryRecommendation.presentKeywords.length).toBeGreaterThan(0);
    });

    it('handles resume without summary', () => {
      const analysis = analyzeTailoring(minimalResume(), backendJobDescription);
      // All top keywords should be missing from summary
      expect(analysis.summaryRecommendation.presentKeywords).toEqual([]);
      expect(analysis.summaryRecommendation.missingKeywords.length).toBeGreaterThan(0);
    });
  });

  describe('recommended ordering', () => {
    it('puts summary first in section order', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.recommendedSectionOrder[0]).toBe('summary');
    });

    it('only includes sections with content', () => {
      const analysis = analyzeTailoring(minimalResume(), backendJobDescription);
      expect(analysis.recommendedSectionOrder).not.toContain('summary');
      expect(analysis.recommendedSectionOrder).not.toContain('skills');
      // Should only have experience (the only section with content)
      expect(analysis.recommendedSectionOrder).toContain('experience');
    });

    it('orders skill categories by relevance', () => {
      const analysis = analyzeTailoring(fullResume(), backendJobDescription);
      expect(analysis.recommendedSkillOrder.length).toBe(4);
      // First category should have the most matches
      const topCategory = analysis.recommendedSkillOrder[0];
      const topRelevance = analysis.skillRelevance.find((s) => s.category === topCategory);
      expect(topRelevance!.matchCount).toBe(analysis.skillRelevance[0]!.matchCount);
    });
  });
});

// ---------------------------------------------------------------------------
// generateVariant
// ---------------------------------------------------------------------------

describe('generateVariant', () => {
  it('produces a variant with section_order', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    expect(variant.section_order).toBeDefined();
    expect(variant.section_order!.length).toBeGreaterThan(0);
  });

  it('produces a variant with skills.include', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    expect(variant.skills).toBeDefined();
    expect(variant.skills!.include).toBeDefined();
    expect(variant.skills!.include!.length).toBe(4);
  });

  it('omits skills when resume has no skills', () => {
    const analysis = analyzeTailoring(minimalResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    expect(variant.skills).toBeUndefined();
  });

  it('produces a valid variant that passes schema validation', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    expect(() => assertValidVariant(variant)).not.toThrow();
  });

  it('produces a variant that can be applied to a resume', () => {
    const resume = fullResume();
    const analysis = analyzeTailoring(resume, backendJobDescription);
    const variant = generateVariant(analysis);
    const tailored = applyVariant(resume, variant);

    // Skills should be reordered per variant
    expect(tailored.skills).toBeDefined();
    expect(tailored.skills!.length).toBe(4);
    expect(tailored.skills![0]!.category).toBe(variant.skills!.include![0]);
  });
});

// ---------------------------------------------------------------------------
// serializeVariantWithComments
// ---------------------------------------------------------------------------

describe('serializeVariantWithComments', () => {
  it('produces valid YAML', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'test-job.txt');

    const parsed = yaml.parse(yamlStr);
    expect(parsed).toBeDefined();
    expect(parsed.section_order).toBeDefined();
  });

  it('includes job file name in header comment', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'senior-engineer.txt');

    expect(yamlStr).toContain('senior-engineer.txt');
  });

  it('includes match percentage in header', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'test.txt');

    expect(yamlStr).toContain(`${analysis.matchPercentage}%`);
  });

  it('includes missing keywords in comments', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'test.txt');

    // Should mention at least one missing keyword
    expect(yamlStr).toContain('Missing keywords');
  });

  it('includes keyword match counts as inline comments', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'test.txt');

    expect(yamlStr).toContain('keyword match');
  });

  it('parsed YAML matches variant object', () => {
    const analysis = analyzeTailoring(fullResume(), backendJobDescription);
    const variant = generateVariant(analysis);
    const yamlStr = serializeVariantWithComments(variant, analysis, 'test.txt');

    const parsed = yaml.parse(yamlStr);
    expect(parsed.section_order).toEqual(variant.section_order);
    expect(parsed.skills.include).toEqual(variant.skills!.include);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles high match percentage gracefully', () => {
    // Job description that closely matches the resume
    const jobDesc =
      'Senior Software Engineer with TypeScript, Node.js, Python, Go, Docker, Kubernetes, AWS, PostgreSQL, Redis, microservices, CI/CD, GitHub Actions, Terraform, RESTful API';
    const analysis = analyzeTailoring(fullResume(), jobDesc);
    expect(analysis.matchPercentage).toBeGreaterThanOrEqual(70);
    expect(analysis.recommendedSectionOrder.length).toBeGreaterThan(0);
  });

  it('handles very short job description', () => {
    const analysis = analyzeTailoring(fullResume(), 'TypeScript developer');
    expect(analysis.keywords.length).toBeGreaterThan(0);
    expect(analysis.matchPercentage).toBeGreaterThan(0);
  });

  it('handles job description with special characters', () => {
    const jobDesc = 'C++ engineer with .NET & React.js experience (5+ years)';
    const analysis = analyzeTailoring(fullResume(), jobDesc);
    expect(analysis.keywords.length).toBeGreaterThan(0);
  });

  it('handles resume with no matching keywords', () => {
    const jobDesc =
      'Experienced plumber with knowledge of copper piping, soldering, and residential plumbing codes. Must have journeyman license.';
    const analysis = analyzeTailoring(fullResume(), jobDesc);
    expect(analysis.matchPercentage).toBeLessThan(50);
    expect(analysis.missingKeywords.length).toBeGreaterThan(0);
  });

  it('different job descriptions produce different section orderings', () => {
    const backendAnalysis = analyzeTailoring(fullResume(), backendJobDescription);
    const frontendAnalysis = analyzeTailoring(fullResume(), frontendJobDescription);

    // Skill ordering should differ
    expect(backendAnalysis.recommendedSkillOrder).not.toEqual(
      frontendAnalysis.recommendedSkillOrder
    );
  });
});
