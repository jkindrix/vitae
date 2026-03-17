# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `vitae deploy` command for publishing resumes to GitHub Pages
- Snapshot tests for HTML (all 3 themes), Markdown, and cover letter output
- CLI smoke tests for build, validate, check, audit, tailor, import, and themes commands
- Format dispatch, JSON Resume roundtrip, schema regression, and theme accessibility tests
- Project guide (`CLAUDE.md`), changelog, and `.env.example`
- PDF page scaling options (`--pages`, `--fit`, `--no-page-warn`) documented in README

### Changed
- Switched from `playwright` to `playwright-core` for lighter installs (~5MB vs ~500MB); users run `npx playwright install chromium` for PDF/PNG support
- Extracted markdown renderer to `src/lib/markdown.ts` (zero docx dependency)
- Extracted shared DOCX styles to `src/lib/docx-styles.ts`
- Centralized variant highlight filtering into generic `filterSectionWithHighlights`
- Replaced `exec()` with `execFile()` in file opener for security

### Fixed
- Preview server now validates port range (1-65535)
- Init command distinguishes ENOENT from permission errors in file existence checks
- User-friendly error message when Playwright browsers are not installed

## [0.1.0] — 2025-01-14 to present

Initial development release with full feature set.

### Features

#### Core Pipeline
- YAML-based resume format with JSON Schema validation
- Six output formats: PDF, DOCX, HTML, JSON, Markdown, PNG
- PDF and PNG generation via Playwright (headless Chromium)
- Native DOCX generation via `docx` package (no Pandoc dependency)
- Standalone HTML output with embedded CSS
- Markdown output for plain-text workflows
- JSON output of normalized resume data

#### Theming
- Three bundled themes: minimal, modern, professional
- Nunjucks-based HTML/CSS templates with design token system (CSS custom properties)
- Theme color and font overrides directly in `resume.yaml`
- Theme plugin system via `theme.config.js` (filters, globals, helpers, layout variants, metadata)
- Compact layout variant for minimal theme
- `vitae themes` command to list available themes with metadata

#### Variant System (v2)
- Per-section selectors with `pick`, `tags`, `omit`, `limit` pipeline
- Tag expressions: simple arrays (OR) or `{any, all, not}` objects
- Three-tier experience filtering: company, role, and highlight levels
- Variant composition via `extends` with circular dependency detection
- Variant style overrides (CSS custom properties)
- Layout and section ordering control
- Meta field deep-merge and summary override

#### Analysis Tools
- ATS compatibility analyzer with 6-category weighted scoring
- Job description keyword matching and gap analysis
- Job description tailoring: auto-generate variant YAML from job posting
- WCAG accessibility auditing (AA/AAA) across 6 categories via linkedom
- Color contrast ratio checking against WCAG 2.1 thresholds

#### AI Content Assistant
- LLM-powered resume content suggestions (action verbs, quantification, impact framing)
- Three provider support: OpenAI, Anthropic, Ollama (local)
- Bring-your-own-key via environment variables
- Per-section analysis with structured prompt templates

#### Cover Letters
- Dedicated cover letter YAML schema with auto-detection
- Cover letter templates for all three themes
- PDF, DOCX, HTML, Markdown, PNG, and JSON output
- `vitae init --cover-letter` scaffolding

#### Internationalization
- Five bundled locales: English, Spanish, French, German, Portuguese
- Localized section headings, month names, and "Present" keyword
- Locale-aware date formatting across all output formats

#### JSON Resume Interop
- Bidirectional conversion with JSON Resume standard
- `vitae import` for JSON Resume to Vitae YAML
- `vitae export` for Vitae YAML to JSON Resume
- Auto-detection of JSON Resume format in `loadResume` and `parseResume`

#### CLI
- `vitae build` with format selection, theme, output directory, filename prefix
- `vitae preview` with hot-reload development server
- `vitae validate` for schema validation
- `vitae init` with interactive mode and cover letter support
- `vitae check` for ATS compatibility scoring
- `vitae audit` for WCAG accessibility scoring
- `vitae suggest` for AI content improvement
- `vitae tailor` for job-targeted variant generation
- Watch mode (`--watch`) for automatic rebuild on file changes
- PDF page counting with fit scaling (`--fit`, `--pages`)
- Debug mode (`--debug`) with intermediate file output
- Auto-open generated files (`--open`)
- All-themes mode (`--all-themes`)

#### Library API
- Full programmatic API alongside CLI (`import { ... } from '@jkindrix/vitae'`)
- All rendering, validation, analysis, and conversion functions exported
- Complete TypeScript type definitions

### Infrastructure
- TypeScript strict mode with comprehensive strictness flags
- Vitest test suite (700+ tests)
- ESLint with TypeScript strict and stylistic rules
- Prettier formatting
- GitHub Actions workflow template for CI/CD
- JSON Schema files for editor autocompletion
