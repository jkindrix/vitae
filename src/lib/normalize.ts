/**
 * Resume normalizer — converts tagged highlights to plain strings and produces
 * an ordered sections array. Always runs before rendering, regardless of
 * whether a variant was applied.
 */

import type {
  Resume,
  Highlight,
  SectionName,
  NormalizedResume,
  NormalizedExperience,
  NormalizedRole,
  NormalizedProject,
  NormalizedEducation,
  NormalizedVolunteer,
} from '../types/index.js';

/**
 * Default section order matching current template hardcoded order
 */
export const DEFAULT_SECTION_ORDER: SectionName[] = [
  'summary',
  'skills',
  'experience',
  'projects',
  'education',
  'certifications',
  'languages',
  'awards',
  'publications',
  'volunteer',
  'references',
];

/**
 * Extract text from a Highlight (plain string or tagged object)
 */
function highlightToString(h: Highlight): string {
  return typeof h === 'string' ? h : h.text;
}

/**
 * Convert Highlight[] to string[]
 */
function flattenHighlights(highlights: Highlight[]): string[] {
  return highlights.map(highlightToString);
}

function normalizeRole(role: Resume['experience'][0]['roles'][0]): NormalizedRole {
  const result: NormalizedRole = {
    title: role.title,
    start: role.start,
  };
  if (role.end) result.end = role.end;
  if (role.location) result.location = role.location;
  if (role.summary) result.summary = role.summary;
  if (role.highlights && role.highlights.length > 0) {
    result.highlights = flattenHighlights(role.highlights);
  }
  return result;
}

function normalizeExperience(experience: Resume['experience']): NormalizedExperience[] {
  return experience.map((exp) => ({
    company: exp.company,
    roles: exp.roles.map(normalizeRole),
  }));
}

function normalizeProjects(projects: Resume['projects']): NormalizedProject[] | undefined {
  if (!projects || projects.length === 0) return undefined;

  return projects.map((p) => {
    const result: NormalizedProject = { name: p.name };
    if (p.url) result.url = p.url;
    if (p.description) result.description = p.description;
    if (p.highlights && p.highlights.length > 0) {
      result.highlights = flattenHighlights(p.highlights);
    }
    return result;
  });
}

function normalizeEducation(education: Resume['education']): NormalizedEducation[] | undefined {
  if (!education || education.length === 0) return undefined;

  return education.map((e) => {
    const result: NormalizedEducation = { institution: e.institution };
    if (e.degree) result.degree = e.degree;
    if (e.field) result.field = e.field;
    if (e.start) result.start = e.start;
    if (e.end) result.end = e.end;
    if (e.highlights && e.highlights.length > 0) {
      result.highlights = flattenHighlights(e.highlights);
    }
    return result;
  });
}

function normalizeVolunteer(volunteer: Resume['volunteer']): NormalizedVolunteer[] | undefined {
  if (!volunteer || volunteer.length === 0) return undefined;

  return volunteer.map((v) => {
    const result: NormalizedVolunteer = { organization: v.organization };
    if (v.position) result.position = v.position;
    if (v.start) result.start = v.start;
    if (v.end) result.end = v.end;
    if (v.summary) result.summary = v.summary;
    if (v.highlights && v.highlights.length > 0) {
      result.highlights = flattenHighlights(v.highlights);
    }
    return result;
  });
}

/**
 * Strip tags from skill categories (tags are filtering metadata, not render data)
 */
function normalizeSkills(skills: Resume['skills']): Resume['skills'] {
  if (!skills || skills.length === 0) return undefined;
  return skills.map(({ category, items }) => ({ category, items }));
}

/**
 * Strip tags from certifications
 */
function normalizeCertifications(certs: Resume['certifications']): Resume['certifications'] {
  if (!certs || certs.length === 0) return undefined;
  return certs.map(({ name, issuer, date, url }) => {
    const result: { name: string; issuer?: string; date?: string; url?: string } = { name };
    if (issuer) result.issuer = issuer;
    if (date) result.date = date;
    if (url) result.url = url;
    return result;
  });
}

/**
 * Determine which sections have content and produce the ordered list
 */
function buildSectionOrder(
  resume: Resume,
  requestedOrder?: SectionName[]
): SectionName[] {
  const order = requestedOrder ?? DEFAULT_SECTION_ORDER;

  // Only include sections that have content
  return order.filter((section) => {
    switch (section) {
      case 'summary':
        return !!resume.summary;
      case 'skills':
        return resume.skills && resume.skills.length > 0;
      case 'experience':
        return resume.experience && resume.experience.length > 0;
      case 'projects':
        return resume.projects && resume.projects.length > 0;
      case 'education':
        return resume.education && resume.education.length > 0;
      case 'certifications':
        return resume.certifications && resume.certifications.length > 0;
      case 'languages':
        return resume.languages && resume.languages.length > 0;
      case 'awards':
        return resume.awards && resume.awards.length > 0;
      case 'publications':
        return resume.publications && resume.publications.length > 0;
      case 'volunteer':
        return resume.volunteer && resume.volunteer.length > 0;
      case 'references':
        return resume.references && resume.references.length > 0;
      default:
        return false;
    }
  });
}

/**
 * Normalize a resume for rendering:
 * - Converts all tagged highlights to plain strings
 * - Strips tag metadata from all types
 * - Produces an ordered sections array
 *
 * Always runs before rendering, regardless of whether a variant was applied.
 */
export function normalizeResume(
  resume: Resume,
  sectionOrder?: SectionName[]
): NormalizedResume {
  const result: NormalizedResume = {
    meta: resume.meta,
    experience: normalizeExperience(resume.experience),
    sections: buildSectionOrder(resume, sectionOrder),
  };

  if (resume.summary) result.summary = resume.summary;

  const skills = normalizeSkills(resume.skills);
  if (skills) result.skills = skills;

  const projects = normalizeProjects(resume.projects);
  if (projects) result.projects = projects;

  const education = normalizeEducation(resume.education);
  if (education) result.education = education;

  const certs = normalizeCertifications(resume.certifications);
  if (certs) result.certifications = certs;

  if (resume.languages && resume.languages.length > 0) result.languages = resume.languages;
  if (resume.awards && resume.awards.length > 0) result.awards = resume.awards;
  if (resume.publications && resume.publications.length > 0) result.publications = resume.publications;

  const volunteer = normalizeVolunteer(resume.volunteer);
  if (volunteer) result.volunteer = volunteer;

  if (resume.references && resume.references.length > 0) result.references = resume.references;

  if (resume.theme) result.theme = resume.theme;
  if (resume.language) result.language = resume.language;

  return result;
}
