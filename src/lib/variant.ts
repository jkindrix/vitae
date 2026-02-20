/**
 * Variant applier — filters and transforms a Resume based on a Variant definition
 */

import type {
  Resume,
  Variant,
  Highlight,
  Meta,
  Experience,
  Role,
  SkillCategory,
  Project,
  Education,
  Certification,
  Volunteer,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Tag filtering helpers
// ---------------------------------------------------------------------------

/**
 * Check if a tagged item passes the include/exclude filter.
 * Untagged items (no tags array or empty tags) always pass through.
 */
function passesTagFilter(
  itemTags: string[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): boolean {
  // Untagged items always pass
  if (!itemTags || itemTags.length === 0) return true;

  // Check exclude first (exclude wins on conflicts)
  if (excludeTags && excludeTags.length > 0) {
    if (itemTags.some((t) => excludeTags.includes(t))) return false;
  }

  // If include_tags specified, item must match at least one
  if (includeTags && includeTags.length > 0) {
    return itemTags.some((t) => includeTags.includes(t));
  }

  // No include filter = item passes
  return true;
}

/**
 * Filter highlights by tags. Plain string highlights always pass through.
 */
function filterHighlights(
  highlights: Highlight[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Highlight[] | undefined {
  if (!highlights) return undefined;

  const filtered = highlights.filter((h) => {
    if (typeof h === 'string') return true;
    return passesTagFilter(h.tags, includeTags, excludeTags);
  });

  return filtered.length > 0 ? filtered : undefined;
}

// ---------------------------------------------------------------------------
// Section-level filtering
// ---------------------------------------------------------------------------

function filterRole(
  role: Role,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Role {
  const filtered = filterHighlights(role.highlights, includeTags, excludeTags);
  if (filtered === role.highlights) return role;

  const result: Role = {
    title: role.title,
    start: role.start,
  };
  if (role.end) result.end = role.end;
  if (role.location) result.location = role.location;
  if (role.summary) result.summary = role.summary;
  if (filtered) result.highlights = filtered;
  if (role.tags) result.tags = role.tags;
  return result;
}

function filterExperience(
  experience: Experience[],
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Experience[] {
  return experience
    .filter((exp) => passesTagFilter(exp.tags, includeTags, excludeTags))
    .map((exp) => {
      const roles = exp.roles
        .filter((role) => passesTagFilter(role.tags, includeTags, excludeTags))
        .map((role) => filterRole(role, includeTags, excludeTags));

      const result: Experience = { company: exp.company, roles };
      if (exp.tags) result.tags = exp.tags;
      return result;
    })
    // Prune: remove experience entries with no roles remaining
    .filter((exp) => exp.roles.length > 0);
}

function filterProjects(
  projects: Project[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Project[] | undefined {
  if (!projects) return undefined;

  const filtered = projects
    .filter((p) => passesTagFilter(p.tags, includeTags, excludeTags))
    .map((p) => {
      const highlights = filterHighlights(p.highlights, includeTags, excludeTags);
      const result: Project = { name: p.name };
      if (p.url) result.url = p.url;
      if (p.description) result.description = p.description;
      if (highlights) result.highlights = highlights;
      if (p.tags) result.tags = p.tags;
      return result;
    });

  return filtered.length > 0 ? filtered : undefined;
}

function filterEducation(
  education: Education[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Education[] | undefined {
  if (!education) return undefined;

  const filtered = education
    .filter((e) => passesTagFilter(e.tags, includeTags, excludeTags))
    .map((e) => {
      const highlights = filterHighlights(e.highlights, includeTags, excludeTags);
      const result: Education = { institution: e.institution };
      if (e.degree) result.degree = e.degree;
      if (e.field) result.field = e.field;
      if (e.start) result.start = e.start;
      if (e.end) result.end = e.end;
      if (highlights) result.highlights = highlights;
      if (e.tags) result.tags = e.tags;
      return result;
    });

  return filtered.length > 0 ? filtered : undefined;
}

function filterCertifications(
  certifications: Certification[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Certification[] | undefined {
  if (!certifications) return undefined;

  const filtered = certifications.filter((c) =>
    passesTagFilter(c.tags, includeTags, excludeTags)
  );

  return filtered.length > 0 ? filtered : undefined;
}

function filterVolunteer(
  volunteer: Volunteer[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): Volunteer[] | undefined {
  if (!volunteer) return undefined;

  const filtered = volunteer
    .filter((v) => passesTagFilter(v.tags, includeTags, excludeTags))
    .map((v) => {
      const highlights = filterHighlights(v.highlights, includeTags, excludeTags);
      const result: Volunteer = { organization: v.organization };
      if (v.position) result.position = v.position;
      if (v.start) result.start = v.start;
      if (v.end) result.end = v.end;
      if (v.summary) result.summary = v.summary;
      if (highlights) result.highlights = highlights;
      if (v.tags) result.tags = v.tags;
      return result;
    });

  return filtered.length > 0 ? filtered : undefined;
}

function filterSkillCategories(
  skills: SkillCategory[] | undefined,
  includeTags: string[] | undefined,
  excludeTags: string[] | undefined
): SkillCategory[] | undefined {
  if (!skills) return undefined;

  const filtered = skills.filter((s) =>
    passesTagFilter(s.tags, includeTags, excludeTags)
  );

  return filtered.length > 0 ? filtered : undefined;
}

// ---------------------------------------------------------------------------
// Skill name-based filtering (runs after tag filtering)
// ---------------------------------------------------------------------------

function filterSkillsByName(
  skills: SkillCategory[] | undefined,
  skillsFilter: Variant['skills']
): SkillCategory[] | undefined {
  if (!skills || !skillsFilter) return skills;

  if (skillsFilter.include && skillsFilter.exclude) {
    throw new Error(
      'Variant error: skills.include and skills.exclude are mutually exclusive — specify one or the other'
    );
  }

  if (skillsFilter.include) {
    // Keep only named categories, in the specified order
    const result: SkillCategory[] = [];
    for (const name of skillsFilter.include) {
      const found = skills.find((s) => s.category === name);
      if (found) result.push(found);
    }
    return result.length > 0 ? result : undefined;
  }

  if (skillsFilter.exclude) {
    const excluded = new Set(skillsFilter.exclude);
    const result = skills.filter((s) => !excluded.has(s.category));
    return result.length > 0 ? result : undefined;
  }

  return skills;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a variant to a resume, returning a new filtered/overridden Resume.
 * Does NOT normalize highlights — that is handled by the normalize step.
 */
export function applyVariant(resume: Resume, variant: Variant): Resume {
  const { include_tags, exclude_tags } = variant;
  const hasTagFilter =
    (include_tags && include_tags.length > 0) ||
    (exclude_tags && exclude_tags.length > 0);

  // Build result with required fields
  const result: Resume = {
    meta: resume.meta,
    experience: resume.experience,
  };

  // Copy optional fields from base
  if (resume.summary) result.summary = resume.summary;
  if (resume.skills) result.skills = resume.skills;
  if (resume.projects) result.projects = resume.projects;
  if (resume.education) result.education = resume.education;
  if (resume.certifications) result.certifications = resume.certifications;
  if (resume.languages) result.languages = resume.languages;
  if (resume.awards) result.awards = resume.awards;
  if (resume.publications) result.publications = resume.publications;
  if (resume.volunteer) result.volunteer = resume.volunteer;
  if (resume.references) result.references = resume.references;

  // 1. Meta deep-merge
  if (variant.meta) {
    const merged: Meta = { ...result.meta };
    const overrides = variant.meta;
    if (overrides.title !== undefined) merged.title = overrides.title;
    if (overrides.email !== undefined) merged.email = overrides.email;
    if (overrides.phone !== undefined) merged.phone = overrides.phone;
    if (overrides.location !== undefined) merged.location = overrides.location;
    if (overrides.links !== undefined) merged.links = overrides.links;
    result.meta = merged;
  }

  // 2. Summary override
  if (variant.summary !== undefined) {
    result.summary = variant.summary;
  }

  // 3. Tag filtering (only if tags are specified)
  if (hasTagFilter) {
    result.experience = filterExperience(result.experience, include_tags, exclude_tags);

    const skills = filterSkillCategories(result.skills, include_tags, exclude_tags);
    if (skills) result.skills = skills;
    else delete result.skills;

    const projects = filterProjects(result.projects, include_tags, exclude_tags);
    if (projects) result.projects = projects;
    else delete result.projects;

    const education = filterEducation(result.education, include_tags, exclude_tags);
    if (education) result.education = education;
    else delete result.education;

    const certs = filterCertifications(result.certifications, include_tags, exclude_tags);
    if (certs) result.certifications = certs;
    else delete result.certifications;

    const volunteer = filterVolunteer(result.volunteer, include_tags, exclude_tags);
    if (volunteer) result.volunteer = volunteer;
    else delete result.volunteer;
  }

  // 4. Skill name-based filtering (after tag filtering)
  if (variant.skills) {
    const filtered = filterSkillsByName(result.skills, variant.skills);
    if (filtered) result.skills = filtered;
    else delete result.skills;
  }

  return result;
}
