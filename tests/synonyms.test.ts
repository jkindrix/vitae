import { describe, it, expect } from 'vitest';
import { getSynonyms } from '../src/lib/synonyms.js';
import { textContainsKeyword } from '../src/lib/ats.js';

describe('getSynonyms', () => {
  it('returns synonyms for a known tech term', () => {
    const syns = getSynonyms('JavaScript');
    expect(syns).toContain('js');
    expect(syns).toContain('ecmascript');
  });

  it('is case-insensitive', () => {
    expect(getSynonyms('javascript')).toContain('js');
    expect(getSynonyms('JAVASCRIPT')).toContain('js');
  });

  it('returns synonyms for abbreviations', () => {
    const syns = getSynonyms('k8s');
    expect(syns).toContain('kubernetes');
  });

  it('returns synonyms for cloud platforms', () => {
    const syns = getSynonyms('AWS');
    expect(syns).toContain('amazon web services');
  });

  it('returns synonyms for action verbs', () => {
    const syns = getSynonyms('managed');
    expect(syns).toContain('led');
    expect(syns).toContain('directed');
  });

  it('returns empty array for unknown terms', () => {
    expect(getSynonyms('xyzzy')).toEqual([]);
  });

  it('returns synonyms for framework variants', () => {
    const syns = getSynonyms('React');
    expect(syns).toContain('react.js');
    expect(syns).toContain('reactjs');
  });

  it('returns synonyms for databases', () => {
    const syns = getSynonyms('PostgreSQL');
    expect(syns).toContain('postgres');
  });

  it('returns synonyms for title terms', () => {
    const syns = getSynonyms('frontend');
    expect(syns).toContain('front-end');
    expect(syns).toContain('front end');
  });
});

describe('textContainsKeyword with synonyms', () => {
  it('matches JavaScript in resume when job says JS', () => {
    expect(textContainsKeyword('Proficient in JavaScript and TypeScript', 'JS')).toBe(true);
  });

  it('matches JS in resume when job says JavaScript', () => {
    expect(textContainsKeyword('Built applications with JS and React', 'JavaScript')).toBe(true);
  });

  it('matches k8s in resume when job says Kubernetes', () => {
    expect(textContainsKeyword('Deployed services on k8s clusters', 'Kubernetes')).toBe(true);
  });

  it('matches Kubernetes in resume when job says k8s', () => {
    expect(textContainsKeyword('Managed Kubernetes infrastructure', 'k8s')).toBe(true);
  });

  it('matches AWS in resume when job says Amazon Web Services', () => {
    expect(textContainsKeyword('Certified AWS Solutions Architect', 'Amazon Web Services')).toBe(
      true
    );
  });

  it('matches led in resume when job says managed', () => {
    expect(textContainsKeyword('Led a team of 5 engineers', 'managed')).toBe(true);
  });

  it('matches React.js in resume when job says React', () => {
    expect(textContainsKeyword('Built UIs with React.js', 'React')).toBe(true);
  });

  it('matches Postgres in resume when job says PostgreSQL', () => {
    expect(textContainsKeyword('Managed Postgres databases', 'PostgreSQL')).toBe(true);
  });

  it('matches full-stack variants', () => {
    expect(textContainsKeyword('Fullstack developer', 'full-stack')).toBe(true);
    expect(textContainsKeyword('Full stack engineer', 'fullstack')).toBe(true);
  });

  it('still returns false for genuinely unrelated terms', () => {
    expect(textContainsKeyword('Python developer', 'JavaScript')).toBe(false);
    expect(textContainsKeyword('React expert', 'Angular')).toBe(false);
  });

  it('still does exact matching for terms without synonyms', () => {
    expect(textContainsKeyword('Experience with Rust', 'Rust')).toBe(true);
    expect(textContainsKeyword('Experience with Rust', 'Go')).toBe(false);
  });
});
