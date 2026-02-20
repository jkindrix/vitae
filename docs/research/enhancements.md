# Proposed Enhancements

High-value additions organized by ROI tier — accounting for Vitae's existing architecture, the competitive landscape, and the effort-to-impact ratio.

---

## Tier 1: High Value, Low Effort

These leverage existing infrastructure directly. Each could be implemented in a day or less.

### 1. JSON Schema Publishing for Editor Autocompletion — IMPLEMENTED

**Status:** Shipped. The `vitae init` command now prepends a `# yaml-language-server: $schema=<url>` directive to all generated YAML files, enabling autocompletion, validation, and hover docs in VS Code (with redhat.vscode-yaml extension), JetBrains, and any editor supporting the YAML Language Server protocol. The schema URL points to the published `schemas/resume.schema.json` on GitHub.

### 2. Theme Color/Font Overrides via Resume File

**What:** Allow a `theme` key in `resume.yaml` with overrides like `primaryColor`, `fontFamily`, `fontSize` — passed through to CSS variables that all three themes already partially use.

**Why:** The #1 customization request for any themed tool. Currently, users must fork an entire theme to change a color. The minimal theme already uses CSS custom properties — this pattern just needs to be exposed to the data layer.

**Effort:** Add optional theme config to schema, pass values to template context, inject as CSS variable overrides in the renderer.

### 3. PNG/Image Output — IMPLEMENTED

**Status:** Shipped. `vitae build resume.yaml -f png` generates a full-page PNG screenshot via Playwright. Uses `preparePdfPage()` internally but overrides to screen media for better screenshot rendering. Supports all themes and `--all-themes` mode.

### 4. Watch Mode for Build

**What:** `vitae build --watch` that rebuilds output files on save, similar to how `preview` watches for changes.

**Why:** The preview command already implements file watching with debouncing. Some users want to generate actual PDF/DOCX files on save rather than use the browser preview — especially for workflows that pipe output to other tools or share via cloud sync.

**Effort:** Extract the existing watcher from `preview.ts` into a shared utility and wire it into the build command.

### 5. Markdown Output Format — IMPLEMENTED

**Status:** Shipped. `vitae build resume.yaml -f md` generates a clean Markdown resume. Reuses the existing `resumeToMarkdown()` function (previously internal to the DOCX pipeline), now exported as a first-class API. Theme-independent — generates the same output regardless of theme selection.

### 6. GitHub Actions Workflow Template — IMPLEMENTED

**Status:** Shipped. `.github/workflows/build-resume.yml` provides a ready-to-use CI workflow that builds all output formats across all themes on push, installs Playwright for PDF/PNG generation, and uploads artifacts. Triggered only on changes to `resume.yaml` or variant files.

---

## Tier 2: High Value, Medium Effort

These require meaningful implementation but have outsized impact on user value or competitive positioning.

### 7. ATS Compatibility Analyzer — IMPLEMENTED

**Status:** Shipped. `vitae check <input>` scores a resume 0-100 for ATS compatibility using static analysis across 6 weighted categories: contact completeness (15%), section presence (15%), experience quality (25%), content depth (20%), date continuity (10%), and structure (15%). Supports `--job <file>` for keyword gap analysis against a job description, `--variant` for role-specific checks, and `--json` for machine-readable output. Colored terminal output with progress bars, categorized findings (errors/warnings/suggestions), and employment gap detection. No AI or external dependencies — pure static analysis.

### 8. Job Description Tailoring

**What:** `vitae tailor <resume> --job <job-description.txt>` that compares resume content against a job posting and reports keyword gaps, suggests reordering, and optionally generates a tailored variant.

**Why:** ResumeLM and every AI-powered commercial tool offers this. The basic version (keyword extraction + gap analysis) doesn't require AI — it's text analysis. An advanced version could optionally integrate an LLM API.

**Effort:** New command + text analysis module. Basic version is pure string matching; advanced version needs optional LLM integration.

### 9. Resume Variants from a Single Source — IMPLEMENTED

**Status:** Shipped. See `docs/research/variant-tailoring-design.md` for the full design.

**What was built:** Tagged highlights (`string | {text, tags}`), variant YAML files with `include_tags`/`exclude_tags` filtering, meta deep-merge, summary override, skill name-based filtering, section ordering, empty container pruning, and a normalize-before-render pipeline. Wired into `build` and `preview` via `--variant` flag.

### 10. Plugin/Extension System for Themes

**What:** Allow themes to include a `theme.config.js` or `theme.ts` that exports configuration (color options, layout variants, custom filters, custom Nunjucks extensions).

**Why:** The current theme system is file-based (HTML + CSS only). A programmatic layer would enable themes to declare their own configuration options, custom template helpers, and layout variants — making community themes richer without changing the core.

**Effort:** Theme loader enhancement + config schema + documentation.

### 11. Multi-Language / i18n Support

**What:** Allow section headings and date formatting to be localized (e.g., "Experience" to "Exp&eacute;rience", "January" to "Janvier"). Support a `language` field in the resume or theme config.

**Why:** brilliant-cv (Typst) markets multilingual support as a key feature. The date formatting in `src/lib/dates.ts` is English-only. Section headings are hardcoded in templates. For an international user base, this is essential.

**Effort:** Locale-aware date formatting + translatable section heading strings in themes.

### 12. Export to JSON Resume Format — IMPLEMENTED

**Status:** Shipped. `vitae export resume.yaml` converts Vitae YAML to JSON Resume format. Supports `-o/--output` for custom output path (defaults to `<basename>.resume.json`), `--format` flag, and `-v/--variant` for exporting a tailored variant. Completes bidirectional JSON Resume interop alongside the existing `import` command.

---

## Tier 3: Very High Value, Higher Effort

These are larger investments that would significantly shift Vitae's competitive position.

### 13. Web-Based Theme Preview / Configurator

**What:** A companion web UI (could be a single HTML file served by the preview command) that lets users browse themes, adjust colors/fonts via sliders, and see live results — then exports the configuration back to their `resume.yaml`.

**Why:** Bridges the gap between CLI power and the visual feedback loop that commercial tools provide. The preview command already serves HTML with hot reload — this extends it with an interactive configuration panel.

**Effort:** Frontend work (HTML/CSS/JS panel injected alongside the preview), theme config schema, two-way binding with resume data.

### 14. Optional AI Content Assistant

**What:** `vitae suggest <input> [--section experience]` that uses an LLM API (user-provided key) to suggest improvements — stronger action verbs, quantified achievements, concise phrasing.

**Why:** AI content assistance is table stakes in commercial tools. Making it optional (bring-your-own-key) keeps the tool free and avoids vendor lock-in. The structured data format makes prompt engineering straightforward.

**Effort:** New command + LLM API integration (OpenAI/Anthropic/Ollama) with prompt templates per section type.

### 15. Community Theme Registry

**What:** `vitae themes install <name>` that pulls themes from npm (following a naming convention like `vitae-theme-*`) or a GitHub registry.

**Why:** JSON Resume's 400+ theme ecosystem is its strongest moat. Vitae's theme format (HTML + CSS) is more accessible than JSON Resume's (full npm packages with JS rendering). A registry would unlock community contribution.

**Effort:** Theme discovery/install logic + naming convention + documentation + starter theme template.

### 16. Native DOCX Generation (Drop Pandoc Dependency)

**What:** Replace the Pandoc subprocess with a native Node.js DOCX library (e.g., `docx` npm package) for direct resume-to-DOCX generation with full styling control.

**Why:** Pandoc is the only external system dependency. Removing it means zero-install beyond `npm install`. It also gives full control over DOCX styling — the current Markdown-to-DOCX pipeline loses all CSS styling. Native generation could produce DOCX that matches the theme's visual design.

**Effort:** Replace `src/lib/docx.ts` with a DOCX builder using the `docx` npm package, mapping resume structure to styled document elements.

### 17. Cover Letter Generation

**What:** Support a `cover-letter.yaml` (or a `coverLetter` section) that generates a formatted cover letter using the same theme system.

**Why:** Every commercial tool bundles cover letters. The existing theme/rendering pipeline can handle this with a second template per theme. Resume + cover letter is the standard job application package.

**Effort:** New schema section or file format + cover letter templates per theme + build command integration.

---

## Tier 4: Strategic / Long-Term

### 18. Resume Analytics Dashboard

**What:** Track resume versions, generate diffs between versions, show statistics (word count per section, skill frequency, experience timeline visualization).

**Why:** No tool in any tier offers resume analytics for self-reflection. This is a novel feature that leverages the structured data format.

### 19. Hosted Resume Pages

**What:** `vitae deploy` that publishes the HTML output to GitHub Pages, Netlify, or Cloudflare Pages as a living resume URL.

**Why:** Reactive Resume offers shareable links. A deploy command would give CLI users the same capability without a hosted service.

### 20. Accessibility Auditing

**What:** WCAG compliance checking for HTML output — color contrast, heading hierarchy, screen reader compatibility, semantic HTML validation.

**Why:** Differentiator that no competitor offers. Demonstrates the tool's quality standards and makes HTML output genuinely usable as a web resume.

---

## Summary Matrix

| # | Enhancement | User Value | Dev Value | Competitive Edge | Effort |
| --- | --- | --- | --- | --- | --- |
| 1 | ~~Editor autocompletion (schema)~~ | ~~High~~ | ~~Medium~~ | ~~Matches RenderCV~~ | **DONE** |
| 2 | Theme color/font overrides | High | Low | Unique in Node.js CLIs | Low |
| 3 | ~~PNG output~~ | ~~Medium~~ | ~~Low~~ | ~~Matches RenderCV~~ | **DONE** |
| 4 | Watch mode for build | Medium | Medium | Standard expectation | Low |
| 5 | ~~Markdown output~~ | ~~Medium~~ | ~~Medium~~ | ~~Extracts existing code~~ | **DONE** |
| 6 | ~~GitHub Actions template~~ | ~~Medium~~ | ~~High~~ | ~~Matches RenderCV~~ | **DONE** |
| 7 | ~~ATS analyzer~~ | ~~Very High~~ | ~~Low~~ | ~~Category-defining~~ | **DONE** |
| 8 | Job description tailoring | Very High | Low | Matches commercial tier | Medium |
| 9 | ~~Resume variants~~ | ~~High~~ | ~~Medium~~ | ~~Novel in CLI space~~ | **DONE** |
| 10 | Plugin system for themes | Medium | Very High | Enables ecosystem | Medium |
| 11 | Multi-language / i18n | High | Low | Matches brilliant-cv | Medium |
| 12 | ~~Export to JSON Resume~~ | ~~Medium~~ | ~~Medium~~ | ~~Completes interop~~ | **DONE** |
| 13 | Web theme configurator | High | Medium | Bridges CLI/GUI gap | High |
| 14 | AI content assistant | High | Low | Matches commercial tier | Medium-High |
| 15 | Theme registry | Medium | Very High | Matches JSON Resume | High |
| 16 | Native DOCX (drop Pandoc) | High | High | Zero-install goal | High |
| 17 | Cover letter support | High | Low | Matches commercial tier | Medium |
| 18 | Resume analytics | Medium | Low | Novel | High |
| 19 | Hosted deploy | Medium | Low | Matches Reactive Resume | Medium |
| 20 | Accessibility auditing | Medium | Low | Novel | Medium |

**Completed (7 of 20):** #1 (schema autocompletion), #3 (PNG output), #5 (Markdown output), #6 (GitHub Actions template), #7 (ATS analyzer), #9 (resume variants), #12 (JSON Resume export).

**Next highest-ROI items:** #2 (theme color/font overrides), #4 (watch mode for build), #8 (job description tailoring — pairs with the ATS analyzer).
