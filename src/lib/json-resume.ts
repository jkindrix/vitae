/**
 * JSON Resume import support
 * Converts JSON Resume format (https://jsonresume.org/schema) to Vitae format
 */

import type {
  Resume,
  Meta,
  Link,
  Highlight,
  SkillCategory,
  Experience,
  Role,
  Project,
  Education,
  Certification,
  Language,
  Award,
  Publication,
  Volunteer,
  Reference,
} from '../types/index.js';

/**
 * JSON Resume format types (simplified)
 * Based on https://jsonresume.org/schema
 */

interface JsonResumeBasics {
  name?: string | undefined;
  label?: string | undefined;
  email?: string | undefined;
  phone?: string | undefined;
  url?: string | undefined;
  summary?: string | undefined;
  location?:
    | {
        city?: string | undefined;
        region?: string | undefined;
        countryCode?: string | undefined;
      }
    | undefined;
  profiles?:
    | {
        network?: string | undefined;
        username?: string | undefined;
        url?: string | undefined;
      }[]
    | undefined;
}

interface JsonResumeWork {
  name?: string | undefined;
  company?: string | undefined; // Some versions use 'company' instead of 'name'
  position?: string | undefined;
  location?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  summary?: string | undefined;
  highlights?: string[] | undefined;
}

interface JsonResumeSkill {
  name?: string | undefined;
  level?: string | undefined;
  keywords?: string[] | undefined;
}

interface JsonResumeProject {
  name?: string | undefined;
  description?: string | undefined;
  url?: string | undefined;
  highlights?: string[] | undefined;
  keywords?: string[] | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}

interface JsonResumeEducation {
  institution?: string | undefined;
  area?: string | undefined;
  studyType?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  score?: string | undefined;
  courses?: string[] | undefined;
}

interface JsonResumeCertificate {
  name?: string | undefined;
  issuer?: string | undefined;
  date?: string | undefined;
  url?: string | undefined;
}

interface JsonResumeLanguage {
  language?: string | undefined;
  fluency?: string | undefined;
}

interface JsonResumeAward {
  title?: string | undefined;
  awarder?: string | undefined;
  date?: string | undefined;
  summary?: string | undefined;
}

interface JsonResumePublication {
  name?: string | undefined;
  publisher?: string | undefined;
  releaseDate?: string | undefined;
  url?: string | undefined;
  summary?: string | undefined;
}

interface JsonResumeVolunteer {
  organization?: string | undefined;
  position?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  summary?: string | undefined;
  highlights?: string[] | undefined;
}

interface JsonResumeReference {
  name?: string | undefined;
  reference?: string | undefined;
}

interface JsonResumeFormat {
  basics?: JsonResumeBasics | undefined;
  work?: JsonResumeWork[] | undefined;
  education?: JsonResumeEducation[] | undefined;
  skills?: JsonResumeSkill[] | undefined;
  projects?: JsonResumeProject[] | undefined;
  certificates?: JsonResumeCertificate[] | undefined;
  languages?: JsonResumeLanguage[] | undefined;
  awards?: JsonResumeAward[] | undefined;
  publications?: JsonResumePublication[] | undefined;
  volunteer?: JsonResumeVolunteer[] | undefined;
  references?: JsonResumeReference[] | undefined;
  // Not currently used
  interests?: unknown[] | undefined;
}

/**
 * Extract text from a Highlight (plain string or tagged object)
 */
function highlightText(h: Highlight): string {
  return typeof h === 'string' ? h : h.text;
}

/**
 * Convert Highlight[] to string[]
 */
function flattenHighlights(highlights: Highlight[]): string[] {
  return highlights.map(highlightText);
}

/**
 * Convert a date string from JSON Resume format (YYYY-MM-DD) to Vitae format (YYYY-MM)
 */
function convertDate(date: string | undefined): string | undefined {
  if (!date) return undefined;

  // JSON Resume uses ISO 8601 format (YYYY-MM-DD)
  // Convert to YYYY-MM for Vitae
  const match = date.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!match) return date;

  const [, year, month] = match;
  if (month) {
    return `${year}-${month}`;
  }
  return year;
}

/**
 * Convert JSON Resume basics to Vitae meta
 */
function convertBasics(basics: JsonResumeBasics | undefined): Meta {
  if (!basics) {
    return { name: 'Unknown' };
  }

  const links: Link[] = [];

  // Add website URL if present
  if (basics.url) {
    links.push({ url: basics.url });
  }

  // Convert profiles to links
  if (basics.profiles) {
    for (const profile of basics.profiles) {
      if (profile.url) {
        const link: Link = { url: profile.url };
        if (profile.network) {
          link.label = profile.network;
        }
        links.push(link);
      }
    }
  }

  // Build location string
  let location: string | undefined;
  if (basics.location) {
    const parts = [basics.location.city, basics.location.region].filter(Boolean);
    if (parts.length > 0) {
      location = parts.join(', ');
    }
  }

  // Build meta object, only including defined properties
  const meta: Meta = {
    name: basics.name ?? 'Unknown',
  };

  if (basics.label) meta.title = basics.label;
  if (basics.email) meta.email = basics.email;
  if (basics.phone) meta.phone = basics.phone;
  if (location) meta.location = location;
  if (links.length > 0) meta.links = links;

  return meta;
}

/**
 * Convert JSON Resume work to Vitae experience
 */
function convertWork(work: JsonResumeWork[] | undefined): Experience[] {
  if (!work || work.length === 0) {
    return [];
  }

  // Group work entries by company for proper Vitae format
  // (Vitae groups multiple roles under a single company)
  const companyMap = new Map<string, Role[]>();

  for (const job of work) {
    const company = job.name ?? job.company ?? 'Unknown Company';

    const role: Role = {
      title: job.position ?? 'Unknown Position',
      start: convertDate(job.startDate) ?? 'Unknown',
    };

    const endDate = convertDate(job.endDate);
    if (endDate) role.end = endDate;
    if (job.location) role.location = job.location;
    if (job.summary) role.summary = job.summary;
    if (job.highlights && job.highlights.length > 0) {
      role.highlights = job.highlights;
    }

    const existing = companyMap.get(company);
    if (existing) {
      existing.push(role);
    } else {
      companyMap.set(company, [role]);
    }
  }

  // Convert map to array
  return Array.from(companyMap.entries()).map(([company, roles]) => ({
    company,
    roles,
  }));
}

/**
 * Convert JSON Resume skills to Vitae skill categories
 */
function convertSkills(skills: JsonResumeSkill[] | undefined): SkillCategory[] | undefined {
  if (!skills || skills.length === 0) {
    return undefined;
  }

  const result = skills
    .filter((skill): skill is JsonResumeSkill & { name: string; keywords: string[] } =>
      Boolean(skill.name && skill.keywords && skill.keywords.length > 0)
    )
    .map((skill) => ({
      category: skill.name,
      items: skill.keywords,
    }));

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume projects to Vitae projects
 */
function convertProjects(projects: JsonResumeProject[] | undefined): Project[] | undefined {
  if (!projects || projects.length === 0) {
    return undefined;
  }

  const result = projects
    .filter((project): project is JsonResumeProject & { name: string } => Boolean(project.name))
    .map((project) => {
      const p: Project = { name: project.name };
      if (project.url) p.url = project.url;
      if (project.description) p.description = project.description;
      if (project.highlights && project.highlights.length > 0) {
        p.highlights = project.highlights;
      }
      return p;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume education to Vitae education
 */
function convertEducation(education: JsonResumeEducation[] | undefined): Education[] | undefined {
  if (!education || education.length === 0) {
    return undefined;
  }

  const result = education
    .filter((edu): edu is JsonResumeEducation & { institution: string } => Boolean(edu.institution))
    .map((edu) => {
      const e: Education = { institution: edu.institution };
      if (edu.studyType) e.degree = edu.studyType;
      if (edu.area) e.field = edu.area;
      const startDate = convertDate(edu.startDate);
      const endDate = convertDate(edu.endDate);
      if (startDate) e.start = startDate;
      if (endDate) e.end = endDate;
      if (edu.courses && edu.courses.length > 0) e.highlights = edu.courses;
      return e;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume certificates to Vitae certifications
 */
function convertCertificates(
  certificates: JsonResumeCertificate[] | undefined
): Certification[] | undefined {
  if (!certificates || certificates.length === 0) {
    return undefined;
  }

  const result = certificates
    .filter((cert): cert is JsonResumeCertificate & { name: string } => Boolean(cert.name))
    .map((cert) => {
      const c: Certification = { name: cert.name };
      if (cert.issuer) c.issuer = cert.issuer;
      const date = convertDate(cert.date);
      if (date) c.date = date;
      if (cert.url) c.url = cert.url;
      return c;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume languages to Vitae languages
 */
function convertLanguages(languages: JsonResumeLanguage[] | undefined): Language[] | undefined {
  if (!languages || languages.length === 0) {
    return undefined;
  }

  const result = languages
    .filter((lang): lang is JsonResumeLanguage & { language: string } => Boolean(lang.language))
    .map((lang) => {
      const l: Language = { language: lang.language };
      if (lang.fluency) l.fluency = lang.fluency;
      return l;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume awards to Vitae awards
 */
function convertAwards(awards: JsonResumeAward[] | undefined): Award[] | undefined {
  if (!awards || awards.length === 0) {
    return undefined;
  }

  const result = awards
    .filter((award): award is JsonResumeAward & { title: string } => Boolean(award.title))
    .map((award) => {
      const a: Award = { title: award.title };
      if (award.awarder) a.awarder = award.awarder;
      const date = convertDate(award.date);
      if (date) a.date = date;
      if (award.summary) a.summary = award.summary;
      return a;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume publications to Vitae publications
 */
function convertPublications(
  publications: JsonResumePublication[] | undefined
): Publication[] | undefined {
  if (!publications || publications.length === 0) {
    return undefined;
  }

  const result = publications
    .filter((pub): pub is JsonResumePublication & { name: string } => Boolean(pub.name))
    .map((pub) => {
      const p: Publication = { name: pub.name };
      if (pub.publisher) p.publisher = pub.publisher;
      const releaseDate = convertDate(pub.releaseDate);
      if (releaseDate) p.releaseDate = releaseDate;
      if (pub.url) p.url = pub.url;
      if (pub.summary) p.summary = pub.summary;
      return p;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume volunteer to Vitae volunteer
 */
function convertVolunteer(volunteer: JsonResumeVolunteer[] | undefined): Volunteer[] | undefined {
  if (!volunteer || volunteer.length === 0) {
    return undefined;
  }

  const result = volunteer
    .filter((vol): vol is JsonResumeVolunteer & { organization: string } =>
      Boolean(vol.organization)
    )
    .map((vol) => {
      const v: Volunteer = { organization: vol.organization };
      if (vol.position) v.position = vol.position;
      const start = convertDate(vol.startDate);
      if (start) v.start = start;
      const end = convertDate(vol.endDate);
      if (end) v.end = end;
      if (vol.summary) v.summary = vol.summary;
      if (vol.highlights && vol.highlights.length > 0) v.highlights = vol.highlights;
      return v;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Convert JSON Resume references to Vitae references
 */
function convertReferences(references: JsonResumeReference[] | undefined): Reference[] | undefined {
  if (!references || references.length === 0) {
    return undefined;
  }

  const result = references
    .filter((ref): ref is JsonResumeReference & { name: string } => Boolean(ref.name))
    .map((ref) => {
      const r: Reference = { name: ref.name };
      if (ref.reference) r.reference = ref.reference;
      return r;
    });

  return result.length > 0 ? result : undefined;
}

/**
 * Check if the given data looks like JSON Resume format
 */
export function isJsonResumeFormat(data: unknown): data is JsonResumeFormat {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // JSON Resume typically has 'basics' section
  // Vitae has 'meta' section instead
  if ('basics' in obj && typeof obj['basics'] === 'object') {
    return true;
  }

  // Check for work array without company grouping (JSON Resume style)
  if ('work' in obj && Array.isArray(obj['work'])) {
    const work = obj['work'] as unknown[];
    if (work.length > 0 && typeof work[0] === 'object' && work[0] !== null) {
      const firstWork = work[0] as Record<string, unknown>;
      // JSON Resume uses 'position' instead of 'roles'
      if ('position' in firstWork || 'startDate' in firstWork) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Convert JSON Resume format to Vitae Resume format
 */
export function fromJsonResume(jsonResume: JsonResumeFormat): Resume {
  const meta = convertBasics(jsonResume.basics);
  const experience = convertWork(jsonResume.work);

  // If no experience, add a placeholder (experience is required in Vitae)
  const finalExperience =
    experience.length > 0
      ? experience
      : [{ company: 'Unknown', roles: [{ title: 'Unknown', start: 'Unknown' }] }];

  const resume: Resume = {
    meta,
    experience: finalExperience,
  };

  // Add optional fields only if they have values
  if (jsonResume.basics?.summary) {
    resume.summary = jsonResume.basics.summary;
  }

  const skills = convertSkills(jsonResume.skills);
  if (skills) resume.skills = skills;

  const projects = convertProjects(jsonResume.projects);
  if (projects) resume.projects = projects;

  const education = convertEducation(jsonResume.education);
  if (education) resume.education = education;

  const certifications = convertCertificates(jsonResume.certificates);
  if (certifications) resume.certifications = certifications;

  const languages = convertLanguages(jsonResume.languages);
  if (languages) resume.languages = languages;

  const awards = convertAwards(jsonResume.awards);
  if (awards) resume.awards = awards;

  const publications = convertPublications(jsonResume.publications);
  if (publications) resume.publications = publications;

  const volunteer = convertVolunteer(jsonResume.volunteer);
  if (volunteer) resume.volunteer = volunteer;

  const references = convertReferences(jsonResume.references);
  if (references) resume.references = references;

  return resume;
}

/**
 * Convert Vitae Resume format to JSON Resume format
 */
export function toJsonResume(resume: Resume): JsonResumeFormat {
  // Build basics
  const basics: JsonResumeBasics = {
    name: resume.meta.name,
  };

  if (resume.meta.title) basics.label = resume.meta.title;
  if (resume.meta.email) basics.email = resume.meta.email;
  if (resume.meta.phone) basics.phone = resume.meta.phone;
  if (resume.summary) basics.summary = resume.summary;

  // Convert location
  if (resume.meta.location) {
    const parts = resume.meta.location.split(',').map((p) => p.trim());
    if (parts.length >= 2 && parts[0] && parts[1]) {
      basics.location = { city: parts[0], region: parts[1] };
    } else if (parts.length === 1 && parts[0]) {
      basics.location = { city: parts[0] };
    }
  }

  // Convert profiles
  if (resume.meta.links && resume.meta.links.length > 0) {
    basics.profiles = resume.meta.links.map((link) => {
      const profile: NonNullable<JsonResumeBasics['profiles']>[number] = {
        url: link.url,
      };
      if (link.label) profile.network = link.label;
      return profile;
    });
  }

  const result: JsonResumeFormat = { basics };

  // Flatten experience into work entries
  if (resume.experience.length > 0) {
    const work: JsonResumeWork[] = [];
    for (const exp of resume.experience) {
      for (const role of exp.roles) {
        const job: JsonResumeWork = {
          name: exp.company,
          position: role.title,
          startDate: role.start,
        };
        if (role.end) job.endDate = role.end;
        if (role.location) job.location = role.location;
        if (role.summary) job.summary = role.summary;
        if (role.highlights) job.highlights = flattenHighlights(role.highlights);
        work.push(job);
      }
    }
    result.work = work;
  }

  // Convert skills
  if (resume.skills && resume.skills.length > 0) {
    result.skills = resume.skills.map((cat) => ({
      name: cat.category,
      keywords: cat.items,
    }));
  }

  // Convert projects
  if (resume.projects && resume.projects.length > 0) {
    result.projects = resume.projects.map((proj) => {
      const p: JsonResumeProject = { name: proj.name };
      if (proj.description) p.description = proj.description;
      if (proj.url) p.url = proj.url;
      if (proj.highlights) p.highlights = flattenHighlights(proj.highlights);
      return p;
    });
  }

  // Convert education
  if (resume.education && resume.education.length > 0) {
    result.education = resume.education.map((edu) => {
      const e: JsonResumeEducation = { institution: edu.institution };
      if (edu.degree) e.studyType = edu.degree;
      if (edu.field) e.area = edu.field;
      if (edu.start) e.startDate = edu.start;
      if (edu.end) e.endDate = edu.end;
      if (edu.highlights) e.courses = flattenHighlights(edu.highlights);
      return e;
    });
  }

  // Convert certifications
  if (resume.certifications && resume.certifications.length > 0) {
    result.certificates = resume.certifications.map((cert) => {
      const c: JsonResumeCertificate = { name: cert.name };
      if (cert.issuer) c.issuer = cert.issuer;
      if (cert.date) c.date = cert.date;
      if (cert.url) c.url = cert.url;
      return c;
    });
  }

  // Convert languages
  if (resume.languages && resume.languages.length > 0) {
    result.languages = resume.languages.map((lang) => {
      const l: JsonResumeLanguage = { language: lang.language };
      if (lang.fluency) l.fluency = lang.fluency;
      return l;
    });
  }

  // Convert awards
  if (resume.awards && resume.awards.length > 0) {
    result.awards = resume.awards.map((award) => {
      const a: JsonResumeAward = { title: award.title };
      if (award.awarder) a.awarder = award.awarder;
      if (award.date) a.date = award.date;
      if (award.summary) a.summary = award.summary;
      return a;
    });
  }

  // Convert publications
  if (resume.publications && resume.publications.length > 0) {
    result.publications = resume.publications.map((pub) => {
      const p: JsonResumePublication = { name: pub.name };
      if (pub.publisher) p.publisher = pub.publisher;
      if (pub.releaseDate) p.releaseDate = pub.releaseDate;
      if (pub.url) p.url = pub.url;
      if (pub.summary) p.summary = pub.summary;
      return p;
    });
  }

  // Convert volunteer
  if (resume.volunteer && resume.volunteer.length > 0) {
    result.volunteer = resume.volunteer.map((vol) => {
      const v: JsonResumeVolunteer = { organization: vol.organization };
      if (vol.position) v.position = vol.position;
      if (vol.start) v.startDate = vol.start;
      if (vol.end) v.endDate = vol.end;
      if (vol.summary) v.summary = vol.summary;
      if (vol.highlights) v.highlights = flattenHighlights(vol.highlights);
      return v;
    });
  }

  // Convert references
  if (resume.references && resume.references.length > 0) {
    result.references = resume.references.map((ref) => {
      const r: JsonResumeReference = { name: ref.name };
      if (ref.reference) r.reference = ref.reference;
      return r;
    });
  }

  return result;
}
