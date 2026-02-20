# Proposed Enhancements

High-value additions organized by ROI tier — accounting for Vitae's existing architecture, the competitive landscape, and the effort-to-impact ratio.

---

## Tier 1: High Value, Low Effort

These leverage existing infrastructure directly. Each could be implemented in a day or less.

### 1. JSON Schema Publishing for Editor Autocompletion

**What:** Add a `$schema` comment/directive to generated YAML files and publish the schema so VS Code, JetBrains, and other editors provide real-time autocompletion, validation, and hover docs while editing `resume.yaml`.

**Why:** RenderCV's single biggest UX advantage is its editor autocompletion. Vitae already has a complete JSON Schema at `schemas/resume.schema.json` — it just isn't wired up for editor consumption. This is nearly free value.

**Effort:** Add a schema comment to init output, document the VS Code YAML extension configuration, optionally host the schema at a stable URL.

### 2. Theme Color/Font Overrides via Resume File

**What:** Allow a `theme` key in `resume.yaml` with overrides like `primaryColor`, `fontFamily`, `fontSize` — passed through to CSS variables that all three themes already partially use.

**Why:** The #1 customization request for any themed tool. Currently, users must fork an entire theme to change a color. The minimal theme already uses CSS custom properties — this pattern just needs to be exposed to the data layer.

**Effort:** Add optional theme config to schema, pass values to template context, inject as CSS variable overrides in the renderer.

### 3. PNG/Image Output

**What:** Add `png` as a supported output format.

**Why:** Useful for social media sharing, portfolio sites, and preview thumbnails. Playwright already supports `page.screenshot()` — it's literally called in debug mode today (`src/lib/pdf.ts` uses it for debug screenshots). This is a one-line addition to the format pipeline.

**Effort:** Expose the existing screenshot capability as a first-class output format.

### 4. Watch Mode for Build

**What:** `vitae build --watch` that rebuilds output files on save, similar to how `preview` watches for changes.

**Why:** The preview command already implements file watching with debouncing. Some users want to generate actual PDF/DOCX files on save rather than use the browser preview — especially for workflows that pipe output to other tools or share via cloud sync.

**Effort:** Extract the existing watcher from `preview.ts` into a shared utility and wire it into the build command.

### 5. Markdown Output Format

**What:** Add `md` as a supported output format (plain Markdown resume).

**Why:** The DOCX generator already converts the resume to Markdown as an intermediate step (`src/lib/docx.ts`). Markdown output is useful for GitHub profiles, README files, plain-text job applications, and as input to other tools. This is extracting existing functionality.

**Effort:** Expose the existing Markdown conversion as a first-class output format.

### 6. GitHub Actions Workflow Template

**What:** Ship a `.github/workflows/build-resume.yml` example that builds the resume on push and attaches artifacts.

**Why:** RenderCV markets this heavily. "Resume as code" users want CI/CD for their resume. This is a documentation/example task, not a code change.

**Effort:** Write one YAML workflow file and document it.

---

## Tier 2: High Value, Medium Effort

These require meaningful implementation but have outsized impact on user value or competitive positioning.

### 7. ATS Compatibility Analyzer

**What:** A `vitae check <input>` command that scores a resume for ATS compatibility — analyzing section structure, keyword presence, format compliance, content length, and common pitfalls (e.g., tables, images, non-standard section names).

**Why:** ATS scoring is the #1 selling point of every commercial resume builder ($8-25/mo). No CLI tool offers this. Vitae has full structured access to the resume data, making static analysis straightforward — no AI required for the core checks. This would be a category-defining feature for the CLI space.

Checks could include:

- Section presence (does it have skills, experience, education?)
- Content length per section (too short? too long?)
- Date gap detection in experience
- Keyword density analysis (optionally against a job description)
- Contact info completeness
- Single-page detection (estimate rendered length)

**Effort:** New command + analysis module. No external dependencies needed.

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

### 12. Export to JSON Resume Format

**What:** `vitae export <input> --format json-resume` that converts Vitae YAML back to JSON Resume format.

**Why:** `toJsonResume()` already exists in `src/lib/json-resume.ts` but isn't exposed as a CLI command. This completes the bidirectional interop story and makes Vitae a hub in the resume ecosystem — import from JSON Resume, work in Vitae's YAML, export back for use with any of the 400+ JSON Resume themes.

**Effort:** Wire existing `toJsonResume()` into a new CLI command or flag.

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
| 1 | Editor autocompletion (schema) | High | Medium | Matches RenderCV | Very Low |
| 2 | Theme color/font overrides | High | Low | Unique in Node.js CLIs | Low |
| 3 | PNG output | Medium | Low | Matches RenderCV | Very Low |
| 4 | Watch mode for build | Medium | Medium | Standard expectation | Low |
| 5 | Markdown output | Medium | Medium | Extracts existing code | Very Low |
| 6 | GitHub Actions template | Medium | High | Matches RenderCV | Very Low |
| **7** | **ATS analyzer** | **Very High** | **Low** | **Category-defining** | **Medium** |
| 8 | Job description tailoring | Very High | Low | Matches commercial tier | Medium |
| 9 | ~~Resume variants~~ | ~~High~~ | ~~Medium~~ | ~~Novel in CLI space~~ | **DONE** |
| 10 | Plugin system for themes | Medium | Very High | Enables ecosystem | Medium |
| 11 | Multi-language / i18n | High | Low | Matches brilliant-cv | Medium |
| 12 | Export to JSON Resume | Medium | Medium | Completes interop | Very Low |
| 13 | Web theme configurator | High | Medium | Bridges CLI/GUI gap | High |
| 14 | AI content assistant | High | Low | Matches commercial tier | Medium-High |
| 15 | Theme registry | Medium | Very High | Matches JSON Resume | High |
| 16 | Native DOCX (drop Pandoc) | High | High | Zero-install goal | High |
| 17 | Cover letter support | High | Low | Matches commercial tier | Medium |
| 18 | Resume analytics | Medium | Low | Novel | High |
| 19 | Hosted deploy | Medium | Low | Matches Reactive Resume | Medium |
| 20 | Accessibility auditing | Medium | Low | Novel | Medium |

**The single highest-ROI item is #7 (ATS Analyzer)** — it addresses the primary concern of every resume user, no CLI tool offers it, commercial tools charge $8-25/month for it, and Vitae's structured data format makes it straightforward to implement without AI or external services.

**The quickest wins are #1, #3, #5, #6, and #12** — each leverages code or infrastructure that already exists in the codebase and could ship with minimal implementation.
