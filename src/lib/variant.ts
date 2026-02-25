/**
 * Variant applier v2 — per-section selection with composition support.
 *
 * Each section declares its own inclusion criteria independently.
 * Global tags are a convenience fallback for sections without their own config.
 */

import type {
  Resume,
  Variant,
  Highlight,
  Meta,
  Experience,
  SkillCategory,
  Project,
  Education,
  Certification,
  Volunteer,
  TagExpr,
  SectionSelector,
  ExperienceSelector,
  HighlightSelector,
  SectionName,
} from '../types/index.js';

// ---------------------------------------------------------------------------
// Tag matching
// ---------------------------------------------------------------------------

/**
 * Normalize tags config to a TagExpr object.
 * Array form is treated as OR (any match).
 */
function normalizeTagExpr(tags: string[] | TagExpr): TagExpr {
  if (Array.isArray(tags)) {
    return { any: tags };
  }
  return tags;
}

/**
 * Check if a tagged item passes a TagExpr filter.
 * Untagged items (no tags or empty tags) always pass any/all checks,
 * but are NOT affected by `not`.
 */
function passesTagExpr(itemTags: string[] | undefined, expr: TagExpr): boolean {
  const isUntagged = !itemTags || itemTags.length === 0;

  // Untagged items pass any/all checks and are unaffected by `not`
  if (isUntagged) return true;

  // Check `not` first — exclude items with any of these tags
  if (expr.not && expr.not.length > 0) {
    if (itemTags.some((t) => expr.not!.includes(t))) return false;
  }

  // Check `all` — item must have every tag
  if (expr.all && expr.all.length > 0) {
    if (!expr.all.every((t) => itemTags.includes(t))) return false;
  }

  // Check `any` — item must have at least one tag
  if (expr.any && expr.any.length > 0) {
    if (!itemTags.some((t) => expr.any!.includes(t))) return false;
  }

  return true;
}

// ---------------------------------------------------------------------------
// Name/ID matching
// ---------------------------------------------------------------------------

/**
 * Match an item against a pick name. Checks id first, then the name field.
 */
function matchesName(
  pickValue: string,
  id: string | undefined,
  name: string
): boolean {
  if (id !== undefined && id === pickValue) return true;
  return name === pickValue;
}

/**
 * Check if an item should be omitted. Checks id first, then name.
 */
function isOmitted(
  omitList: string[],
  id: string | undefined,
  name: string
): boolean {
  return omitList.some((o) => matchesName(o, id, name));
}

// ---------------------------------------------------------------------------
// Helper: build a SectionSelector from partial fields (avoiding undefined)
// ---------------------------------------------------------------------------

function buildSelector(fields: {
  pick?: string[];
  tags?: string[] | TagExpr;
  omit?: string[];
  limit?: number;
}): SectionSelector {
  const s: SectionSelector = {};
  if (fields.pick !== undefined) s.pick = fields.pick;
  if (fields.tags !== undefined) s.tags = fields.tags;
  if (fields.omit !== undefined) s.omit = fields.omit;
  if (fields.limit !== undefined) s.limit = fields.limit;
  return s;
}

// ---------------------------------------------------------------------------
// Generic item selection pipeline
// ---------------------------------------------------------------------------

/**
 * Core selection pipeline: pick → tags → omit → limit.
 */
function selectItems<T>(
  items: T[],
  selector: SectionSelector | undefined,
  getId: (item: T) => string | undefined,
  getName: (item: T) => string,
  getTags: (item: T) => string[] | undefined,
): T[] {
  if (!selector) return items;

  const { pick, tags, omit, limit } = selector;
  let result: T[];

  // Step 2: Build inclusion set
  const hasPick = pick !== undefined && pick.length > 0;
  const hasTags = tags !== undefined;

  if (!hasPick && !hasTags) {
    // No filtering — include everything
    result = [...items];
  } else if (hasPick && !hasTags) {
    // Only pick: exactly those items, in pick order
    result = [];
    for (const name of pick) {
      const found = items.find((item) => matchesName(name, getId(item), getName(item)));
      if (found) result.push(found);
    }
  } else if (!hasPick && hasTags) {
    // Only tags: tag-matched + untagged, in original order
    const expr = normalizeTagExpr(tags!);
    result = items.filter((item) => passesTagExpr(getTags(item), expr));
  } else {
    // Both pick and tags: picked (in pick order) + tag-matched non-picked + untagged non-picked
    const pickedSet = new Set<T>();
    result = [];

    // First: picked items in pick order
    for (const name of pick!) {
      const found = items.find((item) => matchesName(name, getId(item), getName(item)));
      if (found) {
        result.push(found);
        pickedSet.add(found);
      }
    }

    // Then: tag-matched non-picked items in original order (includes untagged)
    const expr = normalizeTagExpr(tags!);
    for (const item of items) {
      if (!pickedSet.has(item) && passesTagExpr(getTags(item), expr)) {
        result.push(item);
      }
    }
  }

  // Step 3: Apply exclusion
  if (omit !== undefined && omit.length > 0) {
    result = result.filter((item) => !isOmitted(omit, getId(item), getName(item)));
  }

  // Step 4: Apply limit
  if (limit !== undefined) {
    result = result.slice(0, limit);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Highlight filtering
// ---------------------------------------------------------------------------

/**
 * Filter highlights by tag expression. Plain string highlights always pass.
 */
function filterHighlightsByTags(
  highlights: Highlight[],
  expr: TagExpr,
): Highlight[] {
  return highlights.filter((h) => {
    if (typeof h === 'string') return true;
    return passesTagExpr(h.tags, expr);
  });
}

/**
 * Apply a HighlightSelector to a list of highlights.
 * Returns the original array if nothing changed, or a new filtered array,
 * or undefined if all highlights were removed.
 */
function applyHighlightSelector(
  highlights: Highlight[] | undefined,
  selector: HighlightSelector | undefined,
): Highlight[] | undefined {
  if (!highlights || highlights.length === 0) return highlights;
  if (!selector) return highlights;

  let result = highlights;

  if (selector.tags !== undefined) {
    const expr = normalizeTagExpr(selector.tags);
    result = filterHighlightsByTags(result, expr);
  }

  if (selector.limit !== undefined) {
    result = result.slice(0, selector.limit);
  }

  return result.length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Section-level filtering
// ---------------------------------------------------------------------------

function filterSkills(
  skills: SkillCategory[] | undefined,
  selector: SectionSelector | undefined,
): SkillCategory[] | undefined {
  if (!skills || skills.length === 0) return undefined;

  const result = selectItems(
    skills,
    selector,
    (s) => s.id,
    (s) => s.category,
    (s) => s.tags,
  );

  return result.length > 0 ? result : undefined;
}

function filterExperience(
  experience: Experience[],
  selector: ExperienceSelector | undefined,
): Experience[] {
  if (experience.length === 0) return [];

  // Step 1: Filter companies using base selector fields
  let companies = selectItems(
    experience,
    selector ? buildSelector(selector) : undefined,
    (e) => e.id,
    (e) => e.company,
    (e) => e.tags,
  );

  // Step 2: Filter roles within surviving companies
  if (selector?.roles) {
    const rolesSelector = buildSelector(selector.roles);
    companies = companies.map((exp) => {
      const filteredRoles = selectItems(
        exp.roles,
        rolesSelector,
        (r) => r.id,
        (r) => r.title,
        (r) => r.tags,
      );
      return { ...exp, roles: filteredRoles };
    });
  }

  // Step 3: Filter highlights within surviving roles
  if (selector?.highlights) {
    const hlSelector = selector.highlights;
    companies = companies.map((exp) => ({
      ...exp,
      roles: exp.roles.map((role) => {
        const filtered = applyHighlightSelector(role.highlights, hlSelector);
        if (filtered === role.highlights) return role;
        // Build a new role without undefined highlights
        const newRole = { ...role };
        if (filtered) {
          newRole.highlights = filtered;
        } else {
          delete newRole.highlights;
        }
        return newRole;
      }),
    }));
  }

  // Step 4: Prune empty containers — remove companies with no surviving roles
  return companies.filter((exp) => exp.roles.length > 0);
}

function filterProjects(
  projects: Project[] | undefined,
  selector: SectionSelector | undefined,
): Project[] | undefined {
  if (!projects || projects.length === 0) return undefined;

  let result = selectItems(
    projects,
    selector,
    (p) => p.id,
    (p) => p.name,
    (p) => p.tags,
  );

  // Apply highlight selector
  if (selector?.highlights) {
    const hlSelector = selector.highlights;
    result = result.map((p) => {
      const filtered = applyHighlightSelector(p.highlights, hlSelector);
      if (filtered === p.highlights) return p;
      const newP = { ...p };
      if (filtered) {
        newP.highlights = filtered;
      } else {
        delete newP.highlights;
      }
      return newP;
    });
  }

  return result.length > 0 ? result : undefined;
}

function filterEducation(
  education: Education[] | undefined,
  selector: SectionSelector | undefined,
): Education[] | undefined {
  if (!education || education.length === 0) return undefined;

  let result = selectItems(
    education,
    selector,
    (e) => e.id,
    (e) => e.institution,
    (e) => e.tags,
  );

  if (selector?.highlights) {
    const hlSelector = selector.highlights;
    result = result.map((e) => {
      const filtered = applyHighlightSelector(e.highlights, hlSelector);
      if (filtered === e.highlights) return e;
      const newE = { ...e };
      if (filtered) {
        newE.highlights = filtered;
      } else {
        delete newE.highlights;
      }
      return newE;
    });
  }

  return result.length > 0 ? result : undefined;
}

function filterCertifications(
  certifications: Certification[] | undefined,
  selector: SectionSelector | undefined,
): Certification[] | undefined {
  if (!certifications || certifications.length === 0) return undefined;

  const result = selectItems(
    certifications,
    selector,
    (c) => c.id,
    (c) => c.name,
    (c) => c.tags,
  );

  return result.length > 0 ? result : undefined;
}

function filterVolunteer(
  volunteer: Volunteer[] | undefined,
  selector: SectionSelector | undefined,
): Volunteer[] | undefined {
  if (!volunteer || volunteer.length === 0) return undefined;

  let result = selectItems(
    volunteer,
    selector,
    (v) => v.id,
    (v) => v.organization,
    (v) => v.tags,
  );

  if (selector?.highlights) {
    const hlSelector = selector.highlights;
    result = result.map((v) => {
      const filtered = applyHighlightSelector(v.highlights, hlSelector);
      if (filtered === v.highlights) return v;
      const newV = { ...v };
      if (filtered) {
        newV.highlights = filtered;
      } else {
        delete newV.highlights;
      }
      return newV;
    });
  }

  return result.length > 0 ? result : undefined;
}

// ---------------------------------------------------------------------------
// Global tags → section selector conversion
// ---------------------------------------------------------------------------

function globalTagsToSelector(globalTags: string[] | TagExpr): SectionSelector {
  return { tags: globalTags };
}

function globalTagsToExperienceSelector(globalTags: string[] | TagExpr): ExperienceSelector {
  return {
    tags: globalTags,
    roles: { tags: globalTags },
    highlights: { tags: globalTags },
  };
}

function globalTagsToSelectorWithHighlights(globalTags: string[] | TagExpr): SectionSelector {
  return {
    tags: globalTags,
    highlights: { tags: globalTags },
  };
}

// ---------------------------------------------------------------------------
// Selector resolution
// ---------------------------------------------------------------------------

/**
 * Determine the effective selector for a section.
 * If the section has its own config, use it.
 * If global tags are present, derive a selector from them.
 * Otherwise, no filtering.
 */
function resolveSelector(
  section: SectionName,
  variant: Variant,
): SectionSelector | ExperienceSelector | undefined {
  // Check for section-specific config
  if (section !== 'summary' && variant[section] !== undefined) {
    return variant[section];
  }

  // Fall back to global tags
  if (variant.tags !== undefined) {
    if (section === 'experience') {
      return globalTagsToExperienceSelector(variant.tags);
    }
    if (section === 'projects' || section === 'education' || section === 'volunteer') {
      return globalTagsToSelectorWithHighlights(variant.tags);
    }
    if (section !== 'summary') {
      return globalTagsToSelector(variant.tags);
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Apply a v2 variant to a resume, returning a new filtered/overridden Resume.
 * Does NOT normalize highlights — that is handled by the normalize step.
 */
export function applyVariant(resume: Resume, variant: Variant): Resume {
  // Build result starting with all base resume data
  const result: Resume = {
    meta: resume.meta,
    experience: resume.experience,
  };

  // Copy optional fields from base
  if (resume.language) result.language = resume.language;
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
  if (resume.theme) result.theme = resume.theme;

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

  // 3. Per-section filtering
  const skillsSelector = resolveSelector('skills', variant) as SectionSelector | undefined;
  if (skillsSelector) {
    const filtered = filterSkills(result.skills, skillsSelector);
    if (filtered) result.skills = filtered;
    else delete result.skills;
  }

  const expSelector = resolveSelector('experience', variant) as ExperienceSelector | undefined;
  if (expSelector) {
    result.experience = filterExperience(result.experience, expSelector);
  }

  const projSelector = resolveSelector('projects', variant) as SectionSelector | undefined;
  if (projSelector) {
    const filtered = filterProjects(result.projects, projSelector);
    if (filtered) result.projects = filtered;
    else delete result.projects;
  }

  const eduSelector = resolveSelector('education', variant) as SectionSelector | undefined;
  if (eduSelector) {
    const filtered = filterEducation(result.education, eduSelector);
    if (filtered) result.education = filtered;
    else delete result.education;
  }

  const certSelector = resolveSelector('certifications', variant) as SectionSelector | undefined;
  if (certSelector) {
    const filtered = filterCertifications(result.certifications, certSelector);
    if (filtered) result.certifications = filtered;
    else delete result.certifications;
  }

  const langSelector = resolveSelector('languages', variant) as SectionSelector | undefined;
  if (langSelector) {
    const langs = result.languages;
    if (langs && langs.length > 0) {
      const filtered = selectItems(
        langs,
        langSelector,
        () => undefined,
        (l) => l.language,
        () => undefined,
      );
      if (filtered.length > 0) result.languages = filtered;
      else delete result.languages;
    }
  }

  const awardSelector = resolveSelector('awards', variant) as SectionSelector | undefined;
  if (awardSelector) {
    const awards = result.awards;
    if (awards && awards.length > 0) {
      const filtered = selectItems(
        awards,
        awardSelector,
        () => undefined,
        (a) => a.title,
        () => undefined,
      );
      if (filtered.length > 0) result.awards = filtered;
      else delete result.awards;
    }
  }

  const pubSelector = resolveSelector('publications', variant) as SectionSelector | undefined;
  if (pubSelector) {
    const pubs = result.publications;
    if (pubs && pubs.length > 0) {
      const filtered = selectItems(
        pubs,
        pubSelector,
        () => undefined,
        (p) => p.name,
        () => undefined,
      );
      if (filtered.length > 0) result.publications = filtered;
      else delete result.publications;
    }
  }

  const volSelector = resolveSelector('volunteer', variant) as SectionSelector | undefined;
  if (volSelector) {
    const filtered = filterVolunteer(result.volunteer, volSelector);
    if (filtered) result.volunteer = filtered;
    else delete result.volunteer;
  }

  const refSelector = resolveSelector('references', variant) as SectionSelector | undefined;
  if (refSelector) {
    const refs = result.references;
    if (refs && refs.length > 0) {
      const filtered = selectItems(
        refs,
        refSelector,
        () => undefined,
        (r) => r.name,
        () => undefined,
      );
      if (filtered.length > 0) result.references = filtered;
      else delete result.references;
    }
  }

  return result;
}
