# Vitae — Project Guide

Resume generator: YAML to PDF, DOCX, HTML, JSON, Markdown, PNG.

## Architecture

```
src/
├── cli.ts                  # Commander CLI entry point
├── commands/               # CLI command handlers (thin wrappers over lib)
│   ├── index.ts            # Command barrel export
│   ├── build.ts            # Multi-format generation with watch mode
│   ├── init.ts             # Template scaffolding (resume + cover letter)
│   ├── preview.ts          # Hot-reload dev server
│   ├── validate.ts         # Schema validation
│   ├── check.ts            # ATS compatibility scoring
│   ├── audit.ts            # WCAG accessibility auditing
│   ├── suggest.ts          # AI content suggestions (BYO key)
│   ├── tailor.ts           # Job description → variant generation
│   ├── import.ts           # JSON Resume → Vitae YAML
│   ├── export.ts           # Vitae YAML → JSON Resume
│   └── themes.ts           # List available themes
├── lib/                    # Core library (public API)
│   ├── index.ts            # Public API barrel — exports are intentional
│   ├── loader.ts           # File I/O, format detection, variant composition
│   ├── schema.ts           # AJV-based JSON Schema validation (lazy-compiled)
│   ├── variant.ts          # v2 variant engine: pick/tags/omit/limit pipeline
│   ├── normalize.ts        # Tagged highlights → strings, section ordering
│   ├── renderer.ts         # Nunjucks template rendering with locale filters
│   ├── pdf.ts              # Playwright-based PDF/PNG generation
│   ├── docx.ts             # DOCX generation via docx package
│   ├── markdown.ts         # Markdown resume rendering
│   ├── cover-letter.ts     # Cover letter rendering (HTML, Markdown)
│   ├── json-resume.ts      # Bidirectional JSON Resume conversion
│   ├── ats.ts              # ATS compatibility analysis (pure static)
│   ├── a11y.ts             # WCAG accessibility auditing via linkedom
│   ├── tailor.ts           # Job description analysis and variant generation
│   ├── suggest.ts          # LLM prompt templates for content suggestions
│   ├── llm.ts              # LLM client (OpenAI, Anthropic, Ollama)
│   ├── themes.ts           # Theme discovery, loading, config
│   ├── dates.ts            # Date parsing and locale-aware formatting
│   ├── i18n.ts             # Locale loading with fallback chain
│   └── errors.ts           # Error hierarchy (VitaeError base + subclasses)
└── types/                  # TypeScript type definitions
    ├── index.ts            # Type barrel export
    ├── resume.ts           # Resume, Meta, Experience, Role, Highlight, etc.
    ├── cover-letter.ts     # CoverLetter, Recipient
    ├── theme-config.ts     # ThemeConfig, ThemeFilter, ThemeLayoutVariant
    ├── a11y.ts             # A11yResult, A11yFinding, A11yCategoryScore
    ├── ats.ts              # AtsResult, AtsFinding, AtsCategory
    ├── suggest.ts          # SuggestResult, Suggestion, SectionSuggestions
    └── tailor.ts           # TailorResult, TailorAnalysis
```

## Core Pipeline

Every build follows this pipeline:

```
load → validate → [variant] → normalize → render → output
```

1. **Load** (`loader.ts`): Read YAML/JSON, auto-detect format (resume vs cover letter vs JSON Resume)
2. **Validate** (`schema.ts`): AJV validation against JSON Schema in `schemas/`
3. **Variant** (`variant.ts`): Optional — filter/reorder using v2 variant system
4. **Normalize** (`normalize.ts`): Always runs — flattens tagged highlights to strings, builds section order
5. **Render** (`renderer.ts`): Nunjucks template rendering with theme CSS and locale labels
6. **Output**: Format-specific generation (PDF/PNG via Playwright, DOCX via docx package, etc.)

The normalize step always runs before rendering, regardless of whether a variant was applied. Templates receive `NormalizedResume` (highlights as `string[]`), never raw `Resume` (highlights as `Highlight[]`).

## Variant System (v2)

The variant system uses per-section selectors with a global tags fallback. There is no v1 — it was replaced.

Selection pipeline per section: **pick → tags → omit → limit**

- `pick`: Explicit inclusion by name/id, in specified order
- `tags`: Tag expression filtering (`string[]` = OR, `{any, all, not}` = complex)
- `omit`: Exclusion after pick/tags
- `limit`: Maximum items to keep

Untagged items always pass `any`/`all` checks. Experience has three-tier filtering: company → role → highlight.

Variants support `extends` for composition (child overrides parent, circular detection included).

## Theme Authoring

Themes live in `themes/<name>/` and must include:

| File | Required | Purpose |
|------|----------|---------|
| `template.html` | Yes | Nunjucks resume template |
| `style.css` | No | CSS styles (loaded automatically) |
| `cover-letter.html` | No | Nunjucks cover letter template |
| `theme.config.js` | No | Plugin config (filters, globals, helpers, variants, metadata) |

Templates receive: `resume`, `meta`, `summary`, `skills`, `experience`, `projects`, `education`, `certifications`, `languages`, `awards`, `publications`, `volunteer`, `references`, `labels`.

All themes use CSS custom properties as design tokens (`--color-accent`, `--color-text`, `--font-sans`, etc.). Theme overrides in `resume.yaml` are injected as a `:root` block after the theme stylesheet.

Built-in filters: `formatDate`, `formatDateShort`, `formatDateRange`, `joinItems`, `domain`.

## Public API

`src/lib/index.ts` is the curated public API barrel. Every export is intentional. When adding new library functions, decide explicitly whether they belong in the public API.

`src/index.ts` re-exports types and lib:
```typescript
export type * from './types/index.js';
export * from './lib/index.js';
```

## Testing

- **Framework:** Vitest with globals enabled
- **Timeout:** 30s (PDF/PNG generation via Playwright can be slow)
- **Location:** `tests/*.test.ts`
- **Coverage:** v8 provider, excludes `src/cli.ts`
- **Pattern:** Library functions are thoroughly tested; CLI commands have lighter coverage

Setup (after `npm install`):
```bash
npx playwright install chromium   # Required for PDF/PNG tests
```

Run tests:
```bash
npm test              # Watch mode
npm run test:run      # Single run
npm run test:coverage # With coverage report
```

## Build & Quality

```bash
npm run build         # TypeScript compilation (tsc)
npm run lint          # ESLint
npm run format:check  # Prettier check
npm run check         # All three: format + lint + test (run before committing)
```

TypeScript is configured with maximum strictness: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`.

## Commits

- Conventional commit format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `chore:`, `style:`
- No AI branding in commit messages (no OpenAI, Anthropic, Claude, ChatGPT, etc.)
- Prefer logical increments over large monolithic commits

## Key Dependencies

| Package | Purpose | Note |
|---------|---------|------|
| `playwright-core` | PDF and PNG generation | Requires browser install (`npx playwright install chromium`) |
| `docx` | DOCX file generation | Pure Node.js, no system deps |
| `nunjucks` | HTML template rendering | Configured with `autoescape: true` |
| `ajv` + `ajv-formats` | JSON Schema validation | Lazy-compiled, cached |
| `linkedom` | HTML DOM parsing for a11y auditing | Lightweight, no browser needed |
| `yaml` | YAML parsing | |
| `chalk` | CLI colored output | |
| `commander` | CLI argument parsing | |

## i18n

Locales are JSON files in `locales/` (en, es, fr, de, pt). They provide section labels, month names, and keywords (e.g., "Present"). Fallback chain: explicit locale → base language → English.

## Schemas

JSON Schema files in `schemas/` for resume, cover letter, and variant. These are the source of truth for validation and editor autocompletion. The variant schema defines the v2 selector system.
