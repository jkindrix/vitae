# Resume Variant & Tailoring System Design

## The Problem

The single most cited factor in separating resumes that get callbacks is the practice of adjusting keyword emphasis, section order, or bullet selection for different target roles. Currently, Vitae has no mechanism for this — users must maintain separate YAML files per role, duplicating content and violating the single-source-of-truth principle.

## Problem Decomposition

Three distinct tailoring operations are needed:

| Operation | What changes | Example |
|-----------|-------------|---------|
| **Bullet selection** | Which highlights appear for each role | Backend variant omits frontend bullets |
| **Section reordering** | The order sections appear in the output | Skills-first for career changers, experience-first for senior roles |
| **Keyword emphasis** | Summary text, title, skill category ordering/filtering | Different professional summary and title per target role |

## Design: Tags + Variant Files

Two complementary mechanisms working together.

### 1. Item-Level Tags in the Base Resume

Tags are added as optional metadata on content items throughout the resume. The key design constraint: **backward compatibility**. Plain strings continue to work everywhere. Untagged items are always included.

#### Highlights: Union Type

All `highlights` arrays across every type (Role, Project, Education, Volunteer) accept either a plain string or a tagged object — both can coexist in the same array:

```yaml
experience:
  - company: Acme Corp
    tags: [tech]                          # Experience-level tag
    roles:
      - title: Principal Engineer
        tags: [backend, leadership]       # Role-level tag
        start: 2020-01
        highlights:
          # Plain string — always included (no tags = universal)
          - "Promoted to principal engineer within 18 months"
          # Tagged objects — filtered by variant
          - text: "Architected distributed caching layer reducing latency by 60%"
            tags: [backend, infrastructure]
          - text: "Built React dashboard for real-time analytics"
            tags: [frontend, fullstack]
          - text: "Led cross-functional team of 12 across 3 product lines"
            tags: [leadership, management]
          - text: "Designed ML pipeline processing 2M daily predictions"
            tags: [ai, backend]
```

**Rule: Untagged items are always included.** This means existing resumes work unchanged, and users adopt tagging incrementally — tag only the items that need filtering.

#### Skill Categories

```yaml
skills:
  - category: Languages
    items: [Go, Python, TypeScript, Rust]
    tags: [backend]
  - category: Frontend
    items: [React, Next.js, Tailwind]
    tags: [frontend, fullstack]
  - category: Infrastructure
    items: [Kubernetes, Terraform, AWS]
    tags: [backend, infrastructure]
  - category: ML/AI
    items: [PyTorch, scikit-learn, MLflow]
    tags: [ai]
```

#### Projects

```yaml
projects:
  - name: vitae
    description: YAML-based resume generator
    tags: [fullstack, oss]
  - name: cache-proxy
    description: Distributed caching reverse proxy
    tags: [backend, infrastructure]
```

#### Education, Certifications, Volunteer

```yaml
education:
  - institution: MIT
    degree: MBA
    tags: [management, leadership]
  - institution: State University
    degree: BS
    field: Computer Science
    # No tags — always included

certifications:
  - name: Certified Scrum Master
    tags: [management]
  - name: AWS Solutions Architect
    tags: [backend, infrastructure]

volunteer:
  - organization: Code.org
    position: Instructor
    tags: [education, leadership]
```

### 2. Variant Files

Small, focused YAML files that specify what to select and what to override. Variant files are **filters over the base resume**, not copies of it.

```yaml
# variants/backend-engineer.yaml

# --- Filtering ---
include_tags: [backend, infrastructure]
# exclude_tags: [frontend]   # Optional — for explicit exclusion

# --- Overrides ---
meta:
  title: Senior Backend Engineer

summary: >-
  Principal Engineer with 12 years specializing in
  distributed systems and platform architecture.

section_order:
  - summary
  - experience
  - skills
  - certifications
  - projects

# --- Skill category filtering ---
skills:
  include: [Languages, Infrastructure, Databases]
  # exclude: [Frontend]   # Alternative to include
```

```yaml
# variants/engineering-manager.yaml
include_tags: [leadership, management, backend]

meta:
  title: Engineering Manager

summary: >-
  Engineering leader with 12 years of hands-on technical
  experience and 5 years managing high-performing teams.

section_order:
  - summary
  - experience
  - skills
  - education
  - certifications
```

#### Variant File Design Decisions

| Decision | Chosen approach | Rationale |
|----------|----------------|-----------|
| Base resume reference | CLI argument, not in variant file | Keeps variants decoupled from file paths; more composable and Unix-like |
| Tag filtering direction | `include_tags` with optional `exclude_tags` | `include_tags` handles 90% of cases; `exclude_tags` covers edge cases where you want "everything except X" |
| Skill filtering | Category names via `skills.include` / `skills.exclude` | Preserves single source of truth — skill items stay in base resume, variant selects which categories appear and in what order |
| Summary override | Full replacement string | Summaries are short and role-specific enough that filtering doesn't make sense — just replace |
| Meta overrides | Deep-merge over base meta | Enables role-specific title, location (remote vs on-site), etc. without duplicating all meta fields |
| Section ordering | Ordered list of section names | Simple, explicit, no ambiguity. `meta` is always rendered first regardless of this list |

#### Tag Filtering Semantics

When `include_tags` and `exclude_tags` interact, the rules are:

| Configuration | Behavior |
|---------------|----------|
| Only `include_tags` | Keep items with at least one matching tag (+ all untagged items) |
| Only `exclude_tags` | Keep everything except items with a matching tag (untagged items kept) |
| Both specified | Include matching items, then remove excluded items. **Exclude takes precedence on conflicts.** |

The "exclude wins" precedence matters: an item tagged `[backend, legacy]` with `include_tags: [backend]` and `exclude_tags: [legacy]` should be excluded. Without this rule, users can't carve out exceptions from broad include sets.

### 3. CLI Integration

```bash
# Explicit variant path
vitae build resume.yaml --variant variants/backend-engineer.yaml

# Short flag
vitae build resume.yaml -v variants/fullstack.yaml

# No variant = all content, default section order
vitae build resume.yaml

# Combine with existing flags
vitae build resume.yaml -v variants/backend-engineer.yaml -t modern -f pdf,docx

# Preview with variant (hot-reload watches both resume and variant files)
vitae preview resume.yaml --variant variants/backend-engineer.yaml
```

Note: `-v` (lowercase) is used because Commander.js reserves `-V` for `--version`.

## How Tailoring Operations Map to Mechanisms

| Tailoring Operation | Mechanism | Where it lives |
|--------------------|-----------|----|
| Bullet selection | Tags on highlights, filtered by variant's `include_tags` / `exclude_tags` | Base resume (tags) + variant file (filter) |
| Section reordering | Variant's `section_order` field + macro-based templates | Variant file + theme templates |
| Keyword emphasis | Variant's `meta.title` + `summary` override + `skills.include` / `skills.exclude` | Variant file |
| Content filtering | Tags on experience, education, certifications, volunteer entries | Base resume (tags) + variant file (filter) |

## Build Pipeline Integration

The variant system inserts filtering and normalization steps between loading and rendering. Normalization is a **standalone step that always runs**, not a sub-step of variant application — this ensures consumers (HTML templates, DOCX generator, JSON export) always receive `string[]` highlights regardless of whether a variant was used.

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Load Base   │────>│   Validate   │────>│ Load Variant │
│  resume.yaml │     │   (schema)   │     │  (if given)  │
└──────────────┘     └──────────────┘     └──────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │ Apply Variant  │
                                          │  1. Filter by  │
                                          │     tags       │
                                          │  2. Override   │
                                          │     meta       │
                                          │  3. Override   │
                                          │     summary    │
                                          │  4. Filter     │
                                          │     skills     │
                                          └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │  Normalize     │
                                          │  (always runs) │
                                          │  1. Highlights │
                                          │     to strings │
                                          │  2. Section    │
                                          │     ordering   │
                                          └───────┬───────┘
                                                  │
                                          ┌───────▼───────┐
                                          │    Render      │
                                          │  (templates,   │
                                          │   DOCX, JSON)  │
                                          └───────────────┘
```

### Filtering Logic Detail

1. **Tag filtering on highlights**: For each highlight, if it's a tagged object, check if any of its tags intersect with `include_tags`. If using `exclude_tags`, remove items whose tags intersect with the exclusion set. Untagged (plain string) highlights always pass through.

2. **Tag filtering on sections**: Experience entries, individual roles, education entries, certifications, and volunteer entries are filtered by the same tag logic. Tags can be applied at the experience level (whole company) and/or role level (individual positions within a company).

3. **Meta override**: If the variant specifies `meta` fields, they are deep-merged over the base resume's meta (e.g., variant `meta.title` replaces base `meta.title`, but `meta.name` and `meta.email` are preserved from base).

4. **Summary override**: If the variant specifies a `summary`, it replaces the base resume's summary entirely.

5. **Skill category filtering**: If `skills.include` is specified, only categories whose names appear in the list are kept (in the listed order). If `skills.exclude` is specified instead, all categories except those named are kept. Specifying both `skills.include` and `skills.exclude` simultaneously is a **validation error** — `include` already implies everything else is excluded, so both together is almost certainly a user mistake. This runs **after** tag filtering — items must pass both filters. Build-time validation warns when a variant references a nonexistent category name.

6. **Project filtering**: Same tag-intersection logic as highlights — projects with tags that don't match `include_tags` are removed. Untagged projects always pass through.

7. **Section ordering**: If `section_order` is specified, sections are rendered in that order. Sections not listed are omitted. `meta` (header with name, contact info) is **always rendered first** regardless of `section_order` — a resume without contact information is never valid output. `section_order` controls all other sections.

8. **Highlight normalization** (always runs, with or without variant): Tagged highlight objects (`{ text, tags }`) are normalized to plain strings. All consumers (templates, DOCX generator, JSON Resume export) always receive `string[]` highlights.

### Empty Container Rules

When tag filtering removes content, empty containers are handled as follows:

| Scenario | Behavior | Rationale |
|----------|----------|-----------|
| All highlights filtered from a role | Role still appears | Title, dates, and summary still have value |
| All roles filtered from an experience entry | Experience entry removed | A company heading with no roles is meaningless |
| All entries filtered from a section | Section omitted from output | An empty section heading is noise |

These rules apply uniformly: if all education entries are filtered out, the "Education" section is omitted. If all certifications are filtered, "Certifications" is omitted. The variant applier prunes empty containers bottom-up after tag filtering.

## Codebase Changes Required

### Schema (`schemas/resume.schema.json`)

- All `highlights` arrays: `items: { type: "string" }` becomes `items: { oneOf: [{ type: "string" }, { type: "object", properties: { text, tags } }] }`
- Add optional `tags: string[]` to `SkillCategory`, `Project`, `Experience`, `Role`, `Education`, `Certification`, and `Volunteer` definitions
- New `variant.schema.json` for variant file validation

### Types (`src/types/resume.ts`)

```typescript
// New types
interface TaggedHighlight {
  text: string;
  tags?: string[];
}

type Highlight = string | TaggedHighlight;

// Modified — tags added as optional
interface SkillCategory {
  category: string;
  items: string[];
  tags?: string[];
}

interface Role {
  title: string;
  start: string;
  end?: string;
  location?: string;
  summary?: string;
  highlights?: Highlight[];
  tags?: string[];
}

interface Experience {
  company: string;
  roles: Role[];
  tags?: string[];
}

interface Project {
  name: string;
  url?: string;
  description?: string;
  highlights?: Highlight[];
  tags?: string[];
}

interface Education {
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  highlights?: Highlight[];
  tags?: string[];
}

interface Certification {
  name: string;
  issuer?: string;
  date?: string;
  url?: string;
  tags?: string[];
}

interface Volunteer {
  organization: string;
  position?: string;
  start?: string;
  end?: string;
  summary?: string;
  highlights?: Highlight[];
  tags?: string[];
}

// New variant interface
interface Variant {
  include_tags?: string[];
  exclude_tags?: string[];
  meta?: Partial<Meta>;
  summary?: string;
  section_order?: string[];
  skills?: {
    include?: string[];   // Mutually exclusive with exclude
    exclude?: string[];   // (validation error if both specified)
  };
}

// Output type from normalization — contract for all downstream consumers
interface NormalizedResume {
  meta: Meta;
  summary?: string;
  skills?: SkillCategory[];
  experience: NormalizedExperience[];
  projects?: NormalizedProject[];
  education?: NormalizedEducation[];
  certifications?: Certification[];
  languages?: Language[];
  awards?: Award[];
  publications?: Publication[];
  volunteer?: NormalizedVolunteer[];
  references?: Reference[];
  sections: string[];   // Ordered section names for rendering
}

// Normalized variants of types that contain highlights
// (highlights are string[], never TaggedHighlight)
interface NormalizedRole {
  title: string;
  start: string;
  end?: string;
  location?: string;
  summary?: string;
  highlights?: string[];   // Always string[] after normalization
}

interface NormalizedExperience {
  company: string;
  roles: NormalizedRole[];
}

interface NormalizedProject {
  name: string;
  url?: string;
  description?: string;
  highlights?: string[];   // Always string[] after normalization
}

interface NormalizedEducation {
  institution: string;
  degree?: string;
  field?: string;
  start?: string;
  end?: string;
  highlights?: string[];   // Always string[] after normalization
}

interface NormalizedVolunteer {
  organization: string;
  position?: string;
  start?: string;
  end?: string;
  summary?: string;
  highlights?: string[];   // Always string[] after normalization
}
```

### Loader (`src/lib/loader.ts`)

- New `loadVariant(path)` function
- Variant schema validation

### New module: Variant Applier (`src/lib/variant.ts`)

- `applyVariant(resume: Resume, variant: Variant): Resume`
- Tag intersection/exclusion logic
- Meta deep-merge
- Summary replacement
- Skill category filtering (after tag filtering; validates `include`/`exclude` mutual exclusivity)
- Section-level filtering (experience, education, certifications, volunteer)
- Empty container pruning (remove experience entries with no roles, omit sections with no entries)

### New module: Normalizer (`src/lib/normalize.ts`)

- `normalizeResume(resume: Resume, sectionOrder?: string[]): NormalizedResume`
- Highlight normalization (tagged objects → plain strings)
- Section ordering (reorder data to match `section_order`, or apply default order)
- Always runs before rendering, regardless of variant usage
- Returns `NormalizedResume` — all `highlights` are `string[]`, `sections` array is populated

### Build Command (`src/commands/build.ts`)

- Add `--variant` / `-v` option
- Load and validate variant file
- Apply variant, then normalize, before rendering

### Preview Command (`src/commands/preview.ts`)

- Add `--variant` / `-v` option (same as build)
- File watcher watches both the resume file AND the variant file for changes
- Hot-reload re-applies variant on either file change

### Renderer (`src/lib/renderer.ts`)

- Pass `sections` (ordered section name list) to templates
- No filtering logic — receives already-filtered, normalized data

### Templates (`themes/*/template.html`)

Templates must be refactored to support dynamic section ordering. Current templates render sections in a hardcoded order — no amount of data reordering changes the output.

**Solution: Nunjucks macros with an ordered sections loop.**

```jinja2
{# Define macros for each section #}
{% macro render_summary() %}
  {% if summary %}
  <section class="resume__section">
    <h2 class="resume__section-title">Summary</h2>
    <p class="resume__summary">{{ summary }}</p>
  </section>
  {% endif %}
{% endmacro %}

{% macro render_skills() %}
  {# ... existing skills markup ... #}
{% endmacro %}

{% macro render_experience() %}
  {# ... existing experience markup ... #}
{% endmacro %}

{# ... macros for all other sections ... #}

{# Header/meta always renders first #}
<article class="resume">
  <header class="resume__header">
    {# ... name, title, contact, links ... #}
  </header>

  {# Sections render in the order specified by the sections array #}
  {% for section in sections %}
    {% if section == "summary" %}{{ render_summary() }}
    {% elif section == "skills" %}{{ render_skills() }}
    {% elif section == "experience" %}{{ render_experience() }}
    {% elif section == "projects" %}{{ render_projects() }}
    {% elif section == "education" %}{{ render_education() }}
    {% elif section == "certifications" %}{{ render_certifications() }}
    {% elif section == "languages" %}{{ render_languages() }}
    {% elif section == "awards" %}{{ render_awards() }}
    {% elif section == "publications" %}{{ render_publications() }}
    {% elif section == "volunteer" %}{{ render_volunteer() }}
    {% elif section == "references" %}{{ render_references() }}
    {% endif %}
  {% endfor %}
</article>
```

All three themes (minimal, modern, professional) need this refactoring. **Backward compatible**: when no variant is used, the renderer passes a default `sections` array matching today's hardcoded order.

### DOCX Generator (`src/lib/docx.ts`)

- Section ordering in `resumeToMarkdown()` driven by the same `sections` array
- No other changes — receives normalized `string[]` highlights

### JSON Resume Export (`src/lib/json-resume.ts`)

- No changes needed — receives normalized `string[]` highlights after normalization step

## Design Principles

1. **Single source of truth** — All content lives in one `resume.yaml`. Variants only select and arrange; they never add new content (except summary and meta overrides, which are inherently role-specific).

2. **Backward compatible** — Plain `string[]` highlights work unchanged. No variant flag = no filtering. Existing resumes and workflows are unaffected.

3. **Incremental adoption** — Users can tag one bullet at a time. No need to tag everything upfront.

4. **Deterministic** — Pure data filtering, no AI or heuristics. Given the same inputs, the same output every time.

5. **Git-friendly** — Variant files are small, diffable YAML. Easy to track in version control alongside the base resume.

6. **Composable** — Tags can overlap across categories (e.g., a bullet tagged `[backend, leadership]` appears in both backend and leadership variants).

7. **Uniform filtering** — The same tag semantics apply to all content types: highlights, skill categories, projects, experience entries, roles, education, certifications, and volunteer entries. One mental model for all filtering.

8. **Normalization as infrastructure** — Highlight normalization and section ordering run as a standalone pipeline step, not tied to variant application. Every consumer always receives clean `string[]` highlights and ordered sections.
