# Vitae

A resume generator that converts YAML to PDF, DOCX, HTML, JSON, Markdown, and PNG with theming, cover letters, and i18n support.

## Features

- **6 output formats** — PDF, DOCX, HTML, JSON, Markdown, PNG
- **Theming system** — Customizable Nunjucks templates with CSS; override colors and fonts in `resume.yaml`
- **Cover letters** — Generate cover letters in all output formats from a dedicated YAML schema
- **Resume variants** — Tag highlights, skills, and sections; filter with variant YAML for role-targeted resumes
- **ATS analyzer** — Score resume for ATS compatibility with optional job description keyword matching
- **Job tailoring** — Generate a variant YAML automatically from a job description
- **Multi-language** — Localized section headings and date formatting (en, es, fr, de, pt)
- **JSON Resume** — Bidirectional import/export with the [JSON Resume](https://jsonresume.org/) standard
- **Watch mode** — Rebuild automatically on file changes
- **Live preview** — Hot-reload preview server for rapid iteration
- **Schema validation** — Catch errors before generating; provides editor autocompletion via JSON Schema
- **CLI & library** — Use from the command line or as a Node.js module
- **Zero system deps** — Only requires Node.js 20+
- **CI/CD ready** — Includes a GitHub Actions workflow template

## Installation

### Prerequisites

- **Node.js 20+** (required)

### Install from npm

```bash
npm install -g @jkindrix/vitae
```

### Install from source

```bash
git clone https://github.com/jkindrix/vitae.git
cd vitae
npm install
npm run build
npm link
```

## Quick Start

```bash
# Create a new resume from template
vitae init

# Or build interactively with prompts
vitae init --interactive

# Create a cover letter template
vitae init --cover-letter

# Edit resume.yaml with your information, then generate outputs
vitae build resume.yaml

# Watch for changes and rebuild automatically
vitae build resume.yaml --watch

# Preview with hot-reload
vitae preview resume.yaml
```

## CLI Commands

### `vitae init`

Create a new `resume.yaml` or `cover-letter.yaml` file from a template.

```bash
vitae init                    # Create resume.yaml in current directory
vitae init --force            # Overwrite existing file
vitae init --interactive      # Build resume interactively with prompts
vitae init --cover-letter     # Create a cover letter template
```

**Options:**
| Option | Description |
|--------|-------------|
| `-f, --force` | Overwrite existing file |
| `-i, --interactive` | Build resume interactively with prompts |
| `-c, --cover-letter` | Create a cover letter template instead of a resume |

### `vitae build <input>`

Generate resume or cover letter outputs in multiple formats. Cover letters are auto-detected by the `type: cover-letter` field.

```bash
vitae build resume.yaml                           # Generate PDF, DOCX, HTML
vitae build resume.yaml -f pdf                    # PDF only
vitae build resume.yaml -f pdf,html,md,png        # Multiple formats
vitae build resume.yaml -f pdf,docx,html,json,md,png  # All formats
vitae build resume.yaml -o ./output               # Custom output directory
vitae build resume.yaml -t minimal                # Use specific theme
vitae build resume.yaml -n john-doe               # Custom output filename prefix
vitae build resume.yaml -a                        # All themes
vitae build resume.yaml --open                    # Open PDF after generation
vitae build resume.yaml -v backend.variant.yaml   # Apply variant for role filtering
vitae build resume.yaml -w                        # Watch for changes and rebuild
vitae build resume.yaml -d                        # Debug mode with verbose logging
vitae build cover-letter.yaml                     # Build a cover letter (auto-detected)
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-f, --formats <formats>` | Comma-separated output formats: `pdf,docx,html,json,md,png` | `pdf,docx,html` |
| `-o, --output <dir>` | Output directory | Input file directory |
| `-n, --name <prefix>` | Output filename prefix | Input filename |
| `-t, --theme <name>` | Theme to use | `minimal` |
| `-a, --all-themes` | Generate outputs for all available themes | — |
| `--open` | Open the first generated file after build | — |
| `-v, --variant <path>` | Variant YAML file for role-specific filtering | — |
| `-w, --watch` | Watch for changes and rebuild automatically | — |
| `-d, --debug` | Debug mode with verbose logging and intermediate files | — |

### `vitae preview <input>`

Start a local server with hot-reload preview.

```bash
vitae preview resume.yaml                         # Preview on port 3000
vitae preview resume.yaml -p 8080                 # Custom port
vitae preview resume.yaml -t minimal              # Use specific theme
vitae preview resume.yaml -v backend.variant.yaml # Preview with variant applied
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <number>` | Port to run server on | `3000` |
| `-t, --theme <name>` | Theme to use | `minimal` |
| `-v, --variant <path>` | Variant YAML file for role-specific filtering | — |

### `vitae validate <input>`

Validate a resume file against the schema.

```bash
vitae validate resume.yaml
```

### `vitae check <input>`

Analyze a resume for ATS (Applicant Tracking System) compatibility. Optionally match against a job description.

```bash
vitae check resume.yaml                           # ATS compatibility score
vitae check resume.yaml -j job.txt                # With job description keyword matching
vitae check resume.yaml -v backend.variant.yaml   # Check a variant
vitae check resume.yaml --json                    # Machine-readable JSON output
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-j, --job <file>` | Job description text file for keyword matching | — |
| `-v, --variant <path>` | Variant YAML file for role-specific filtering | — |
| `--json` | Output results as JSON | — |

### `vitae tailor <input>`

Generate a tailored variant YAML from a job description. Analyzes keyword overlap and produces a variant that reorders sections and filters skills by relevance.

```bash
vitae tailor resume.yaml -j job.txt               # Generate variant file
vitae tailor resume.yaml -j job.txt -o sre.variant.yaml  # Custom output path
vitae tailor resume.yaml -j job.txt --report-only # Print analysis without generating file
vitae tailor resume.yaml -j job.txt --json        # JSON analysis output
vitae tailor resume.yaml -j job.txt -v base.variant.yaml # Chain on existing variant
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-j, --job <file>` | Job description text file (required) | — |
| `-o, --output <path>` | Output path for the generated variant YAML | — |
| `-v, --variant <path>` | Apply an existing variant before tailoring | — |
| `--json` | Output analysis as JSON | — |
| `--report-only` | Print analysis report without generating a variant file | — |

### `vitae import <input>`

Convert other resume formats to Vitae YAML.

```bash
vitae import resume.json                          # Import JSON Resume (auto-detected)
vitae import resume.json -o my-resume.yaml        # Custom output path
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `<input>.vitae.yaml` |
| `--format <format>` | Input format: `json-resume`, `auto` | `auto` |

### `vitae export <input>`

Convert Vitae YAML to other resume formats.

```bash
vitae export resume.yaml                          # Export as JSON Resume
vitae export resume.yaml -o portfolio.json        # Custom output path
vitae export resume.yaml -v backend.variant.yaml  # Export with variant applied
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output file path | `<input>.resume.json` |
| `--format <format>` | Output format: `json-resume` | `json-resume` |
| `-v, --variant <path>` | Variant YAML file for role-specific filtering | — |

### `vitae themes`

List available themes and their features.

```bash
vitae themes
```

## Resume Schema

Vitae uses YAML format with the following structure:

```yaml
# Optional: Language for localized headings and date formatting
language: en    # en, es, fr, de, pt

# Required: Personal and contact information
meta:
  name: Jane Smith                              # Required
  title: Senior Software Engineer               # Optional
  email: jane@example.com                       # Optional (validated)
  phone: (555) 123-4567                         # Optional
  location: San Francisco, CA                   # Optional
  links:                                        # Optional
    - label: LinkedIn                           # Optional (defaults to domain)
      url: https://linkedin.com/in/janesmith   # Required

# Optional: Theme color and font overrides
theme:
  colors:
    accent: "#2563eb"
    text: "#1a1a1a"
    textSecondary: "#4a4a4a"
    textMuted: "#8a8a8a"
    background: "#ffffff"
    border: "#e5e5e5"
  fonts:
    sans: Inter, system-ui, sans-serif
    serif: Georgia, serif

# Optional: Professional summary
summary: >
  Senior Software Engineer with 8+ years of experience...

# Optional: Categorized skills (tags for variant filtering)
skills:
  - category: Languages
    tags: [backend]                             # Optional: for variant filtering
    items:
      - TypeScript
      - Python
      - Go

# Required: Work experience
experience:
  - company: Tech Innovations Inc.
    tags: [backend]                             # Optional: filter entire company
    roles:
      - title: Senior Software Engineer         # Required
        start: 2021-03                          # Required (YYYY-MM or YYYY)
        end: present                            # Optional (YYYY-MM, YYYY, or "present")
        location: San Francisco, CA             # Optional
        tags: [backend, leadership]             # Optional: filter this role
        summary: >                              # Optional
          Led backend team building scalable APIs for real-time collaboration.
        highlights:                             # Optional (plain strings or tagged)
          - Led architecture of real-time features
          - text: Reduced API response times by 60%   # Tagged highlight
            tags: [backend, performance]

# Optional: Projects
projects:
  - name: fastcache                             # Required
    url: https://github.com/user/fastcache      # Optional (validated)
    description: High-performance caching lib    # Optional
    tags: [backend]                             # Optional
    highlights:                                  # Optional
      - 10K+ npm downloads

# Optional: Education
education:
  - institution: University of Texas            # Required
    degree: Bachelor of Science                 # Optional
    field: Computer Science                     # Optional
    start: "2011"                               # Optional
    end: "2015"                                 # Optional
    tags: [cs]                                  # Optional
    highlights:                                 # Optional
      - "GPA: 3.8/4.0"

# Optional: Certifications
certifications:
  - name: AWS Solutions Architect               # Required
    issuer: Amazon Web Services                 # Optional
    date: "2023"                                # Optional
    url: https://verify.aws/...                 # Optional (validated)
    tags: [cloud]                               # Optional

# Optional: Languages spoken
languages:
  - language: English                           # Required
    fluency: Native                             # Optional

# Optional: Awards and honors
awards:
  - title: Employee of the Year                 # Required
    awarder: Tech Innovations Inc.              # Optional
    date: "2023"                                # Optional
    summary: Recognized for technical leadership # Optional

# Optional: Publications
publications:
  - name: "Scaling Real-Time Systems"           # Required
    publisher: IEEE Software                    # Optional
    releaseDate: "2022"                         # Optional
    url: https://doi.org/...                    # Optional
    summary: Survey of real-time architectures  # Optional

# Optional: Volunteer experience
volunteer:
  - organization: Code for America              # Required
    position: Technical Lead                    # Optional
    start: 2020-01                              # Optional
    end: 2021-12                                # Optional
    tags: [leadership]                          # Optional
    summary: Led civic tech projects            # Optional
    highlights:                                 # Optional
      - Built open-source civic engagement platform

# Optional: Professional references
references:
  - name: John Doe                              # Required
    reference: >                                # Optional
      Jane is an exceptional engineer...
```

### Date Formats

- `YYYY-MM` — Month and year (e.g., `2023-06`)
- `YYYY` — Year only (e.g., `2023`)
- `present` or `Present` — Current/ongoing

### Validation

Vitae validates:
- Required fields (`meta.name`, `experience`)
- Email format (`meta.email`)
- URL format (`meta.links[].url`, `projects[].url`, `certifications[].url`)
- Date patterns (`roles[].start`, `roles[].end`)

Run `vitae validate resume.yaml` to see detailed error messages with paths. The bundled JSON Schema also enables autocompletion in editors that support it.

## Cover Letters

Vitae supports cover letter generation using a dedicated YAML schema.

### Cover Letter Schema

```yaml
type: cover-letter                              # Required: identifies as cover letter

meta:
  name: Jane Smith
  email: jane@example.com
  phone: (555) 123-4567
  location: San Francisco, CA
  links:
    - url: https://linkedin.com/in/janesmith

language: en                                    # Optional (en, es, fr, de, pt)

recipient:
  name: Hiring Manager                          # Optional
  title: VP of Engineering                      # Optional
  company: Acme Corp                            # Optional
  address: 123 Main St, New York, NY            # Optional

date: "2025-01-15"                              # Optional
subject: Application for Senior Engineer        # Optional
greeting: Dear Hiring Manager,                  # Required
body:                                           # Required (array of paragraphs)
  - >
    I am writing to express my interest in the Senior Engineer position...
  - >
    In my current role at Tech Innovations...
  - >
    I would welcome the opportunity to discuss...
closing: Sincerely,                             # Required

theme:                                          # Optional: same overrides as resume
  colors:
    accent: "#2563eb"
```

### Usage

```bash
# Create a cover letter template
vitae init --cover-letter

# Build cover letter (auto-detected by type field)
vitae build cover-letter.yaml
vitae build cover-letter.yaml -f pdf,docx,md

# Preview cover letter
vitae preview cover-letter.yaml
```

## Resume Variants

Variants let you create role-targeted versions of your resume without duplicating content. Tag items in your resume, then create a variant YAML that filters by tags.

### Tagged Highlights

Highlights can be plain strings or tagged objects:

```yaml
highlights:
  - Plain string highlight (always included)
  - text: Tagged highlight for backend roles
    tags: [backend, api]
  - text: Tagged highlight for frontend roles
    tags: [frontend, ui]
```

Tags can also be placed on `skills`, `experience`, `roles`, `projects`, `education`, `certifications`, and `volunteer` entries.

### Variant File

```yaml
# backend.variant.yaml
include_tags:                   # Only include items matching these tags
  - backend
  - api

exclude_tags:                   # Exclude items matching these tags
  - frontend

meta:                           # Override meta fields
  title: Backend Engineer

summary: >                      # Replace summary entirely
  Backend engineer specializing in distributed systems...

section_order:                  # Reorder sections
  - summary
  - skills
  - experience
  - projects
  - certifications
  - education

skills:                         # Filter skill categories
  include:
    - Languages
    - Backend
    - Databases
  exclude:
    - Frontend
```

### Usage

```bash
vitae build resume.yaml -v backend.variant.yaml
vitae preview resume.yaml -v backend.variant.yaml
vitae check resume.yaml -v backend.variant.yaml
vitae export resume.yaml -v backend.variant.yaml
```

## Theme Overrides

Customize colors and fonts directly in `resume.yaml` without creating a custom theme:

```yaml
theme:
  colors:
    accent: "#2563eb"           # Links, headings, accent elements
    text: "#1a1a1a"             # Primary text color
    textSecondary: "#4a4a4a"    # Secondary text
    textMuted: "#8a8a8a"        # Muted/subtle text
    background: "#ffffff"       # Page background
    border: "#e5e5e5"           # Borders and dividers
  fonts:
    sans: Inter, system-ui, sans-serif
    serif: Georgia, serif
```

Overrides are applied via CSS custom properties and affect HTML, PDF, and PNG output. DOCX output picks up the accent color for headings and links.

## Multi-Language / i18n

Set the `language` field in your resume or cover letter to localize section headings, month names, and the "Present" keyword:

```yaml
language: fr    # French
```

**Bundled locales:** `en` (English), `es` (Spanish), `fr` (French), `de` (German), `pt` (Portuguese)

**What gets localized:**
- Section headings (e.g., "Expérience", "Compétences" in French)
- Month names in date formatting (e.g., "Janvier 2024")
- The "Present" keyword (e.g., "Présent" in French)

Works across all output formats (PDF, DOCX, HTML, JSON, Markdown, PNG).

## Themes

Themes are directories containing templates and styles:

```
themes/
└── minimal/
    ├── template.html         # Required: Nunjucks template for resume
    ├── style.css             # Optional: CSS styles
    └── cover-letter.html     # Optional: Nunjucks template for cover letters
```

### Creating a Custom Theme

1. Create a theme directory:
   ```bash
   mkdir -p themes/mytheme
   ```

2. Create `template.html` using [Nunjucks](https://mozilla.github.io/nunjucks/) syntax:
   ```html
   <article class="resume">
     <h1>{{ meta.name }}</h1>
     {% if meta.title %}
     <p>{{ meta.title }}</p>
     {% endif %}

     {% for exp in experience %}
     <section>
       <h2>{{ exp.company }}</h2>
       {% for role in exp.roles %}
       <div>
         <strong>{{ role.title }}</strong>
         <span>{{ role.start | formatDateShort }} – {{ role.end | formatDateShort }}</span>
       </div>
       {% endfor %}
     </section>
     {% endfor %}
   </article>
   ```

3. Add optional `style.css` for styling

4. Add optional `cover-letter.html` for cover letter support

5. Use your theme:
   ```bash
   vitae build resume.yaml -t mytheme
   ```

### Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `resume` | `NormalizedResume` | Complete normalized resume object |
| `meta` | `Meta` | Personal/contact info |
| `summary` | `string?` | Professional summary |
| `skills` | `SkillCategory[]?` | Categorized skills |
| `experience` | `NormalizedExperience[]` | Work experience (highlights normalized to `string[]`) |
| `projects` | `NormalizedProject[]?` | Projects |
| `education` | `NormalizedEducation[]?` | Education history |
| `certifications` | `Certification[]?` | Certifications |
| `languages` | `Language[]?` | Languages spoken |
| `awards` | `Award[]?` | Awards and honors |
| `publications` | `Publication[]?` | Publications |
| `volunteer` | `NormalizedVolunteer[]?` | Volunteer experience |
| `references` | `Reference[]?` | Professional references |
| `labels` | `LocaleLabels` | Localized section labels (e.g., `labels.experience`) |

The `labels` object provides locale-aware section headings. Use `labels.present` for the localized "Present" keyword in date ranges.

### Template Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `formatDate` | Full date (January 2024) | `{{ role.start \| formatDate }}` |
| `formatDateShort` | Short date (Jan 2024) | `{{ role.start \| formatDateShort }}` |
| `formatDateRange` | Date range (Jan 2024 – Present) | `{{ role.start \| formatDateRange(role.end) }}` |
| `joinItems` | Join array with separator | `{{ skills \| joinItems(', ') }}` |
| `domain` | Extract domain from URL | `{{ url \| domain }}` |

## Library Usage

Vitae can be used as a Node.js library:

```typescript
import {
  // Loading
  loadResume,
  parseResume,
  loadCoverLetter,
  loadVariant,
  loadDocument,
  isCoverLetterFormat,

  // Validation
  validateResume,
  validateVariant,
  validateCoverLetter,

  // Rendering
  renderHtml,
  renderStandaloneHtml,
  renderCoverLetterHtml,
  renderCoverLetterStandaloneHtml,
  generateThemeOverrideCss,

  // Output generation
  generatePdf,
  generatePdfBuffer,
  generatePng,
  generateDocx,
  generateCoverLetterDocx,
  resumeToMarkdown,
  coverLetterToMarkdown,
  closeBrowser,

  // Processing
  normalizeResume,
  applyVariant,
  analyzeResume,
  analyzeTailoring,
  generateVariant,

  // JSON Resume interop
  fromJsonResume,
  toJsonResume,
  isJsonResumeFormat,

  // i18n
  getLocale,
  getSectionLabel,

  // Themes
  listThemes,
  loadTheme,
  readCoverLetterTemplate,
} from '@jkindrix/vitae';
```

### Examples

```typescript
// Load and validate from file
const resume = await loadResume('resume.yaml');

// Parse from string
const resume = await parseResume(yamlContent);

// Validate without loading
const { valid, errors } = await validateResume(data);

// Render HTML
const { html, css } = await renderHtml(resume, 'minimal');
const standaloneHtml = await renderStandaloneHtml(resume, 'minimal');

// Generate PDF
await generatePdf(resume, 'minimal', 'output.pdf', {
  format: 'Letter',
  margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  printBackground: true,
  scale: 1,
});

// Generate PDF as buffer (for streaming)
const pdfBuffer = await generatePdfBuffer(resume, 'minimal');

// Generate DOCX
await generateDocx(resume, 'minimal', 'output.docx');

// Generate PNG
await generatePng(resume, 'minimal', 'output.png');

// Generate Markdown
const md = resumeToMarkdown(resume);

// Apply a variant
const variant = await loadVariant('backend.variant.yaml');
const filtered = applyVariant(resume, variant);

// ATS analysis
const result = analyzeResume(resume);
const resultWithJob = analyzeResume(resume, { jobDescription: jobText });

// Clean up browser instance when done
await closeBrowser();

// Theme management
const themes = await listThemes();
const theme = await loadTheme('minimal');
```

## TypeScript Types

```typescript
import type {
  // Resume
  Resume,
  Meta,
  Link,
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
  Highlight,
  TaggedHighlight,

  // Normalized (renderer input)
  NormalizedResume,
  NormalizedExperience,
  NormalizedRole,
  NormalizedProject,
  NormalizedEducation,
  NormalizedVolunteer,

  // Theme
  ThemeOverrides,
  ThemeColors,
  ThemeFonts,
  Theme,

  // Variant
  Variant,
  SectionName,

  // Cover letter
  CoverLetter,
  Recipient,

  // Build
  OutputFormat,
  BuildOptions,
  PdfOptions,
  DocxOptions,

  // i18n
  Locale,
  LocaleLabels,
  LocaleMonths,
  LocaleKeywords,

  // Other
  DocumentResult,
  ValidationErrorDetail,
  ParsedDate,
} from '@jkindrix/vitae';
```

## PDF Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `format` | `'Letter' \| 'A4' \| 'Legal'` | `'Letter'` | Paper size |
| `margin.top` | `string` | `'0.5in'` | Top margin |
| `margin.right` | `string` | `'0.5in'` | Right margin |
| `margin.bottom` | `string` | `'0.5in'` | Bottom margin |
| `margin.left` | `string` | `'0.5in'` | Left margin |
| `printBackground` | `boolean` | `true` | Print background colors |
| `scale` | `number` | `1` | Webpage scale factor |

## Output Formats

| Format | Extension | Engine | Description |
|--------|-----------|--------|-------------|
| PDF | `.pdf` | Playwright | High-quality PDF via headless Chromium |
| DOCX | `.docx` | Native Node.js | Microsoft Word document |
| HTML | `.html` | — | Standalone HTML with embedded CSS |
| JSON | `.json` | — | Raw resume data as JSON |
| Markdown | `.md` | — | Clean text in Markdown format |
| PNG | `.png` | Playwright | Screenshot image of the resume |

## Examples

See the [`examples/`](./examples) directory for sample resumes.

```bash
# Build the sample resume
vitae build examples/sample.yaml -o examples/output
```

## JSON Resume Compatibility

Vitae automatically detects and converts [JSON Resume](https://jsonresume.org/) format. No manual conversion needed:

```bash
# JSON Resume files work directly
vitae build resume.json                    # Auto-detected and converted
vitae preview resume.json                  # Works with preview too
vitae validate resume.json                 # Validates after conversion
```

### CLI Import / Export

```bash
# Import: convert JSON Resume to Vitae YAML
vitae import resume.json
vitae import resume.json -o my-resume.yaml

# Export: convert Vitae YAML to JSON Resume
vitae export resume.yaml
vitae export resume.yaml -o portfolio.json
vitae export resume.yaml -v backend.variant.yaml
```

### Programmatic Import

```typescript
import { loadResume, parseResume } from '@jkindrix/vitae';

// Load from file (auto-detects format)
const resume = await loadResume('resume.json');

// Parse from string (auto-detects format)
const resume = await parseResume(jsonResumeString);
```

### Programmatic Export

```typescript
import { toJsonResume } from '@jkindrix/vitae';

const jsonResume = toJsonResume(vitaeResume);
```

## CI/CD Integration

Vitae ships with a GitHub Actions workflow template at `.github/workflows/build-resume.yml`. It builds your resume on every push to `resume.yaml` or `*.variant.yaml`, generating all output formats across all themes, and uploads results as downloadable artifacts.

To use it, ensure your repository has a `resume.yaml` in the root. Customize the workflow to select specific formats, themes, or add variant builds.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Watch mode
npm run dev

# Run CLI
npm start -- build examples/sample.yaml

# Run tests
npm test

# Lint
npm run lint

# Format
npm run format
```

## Troubleshooting

### PDF looks different than preview

PDF uses print media styles. Check your theme's `@media print` rules.

### Validation errors

Run `vitae validate resume.yaml` to see detailed error messages with paths.

### Cover letter not detected

Ensure your cover letter YAML includes `type: cover-letter` at the top level. This field is how Vitae distinguishes cover letters from resumes.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing`)
7. Open a Pull Request

## License

MIT License — see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Playwright](https://playwright.dev/) for PDF and PNG generation
- [Nunjucks](https://mozilla.github.io/nunjucks/) for templating
- [AJV](https://ajv.js.org/) for schema validation
- [Commander.js](https://github.com/tj/commander.js) for CLI
- [docx](https://www.npmjs.com/package/docx) for DOCX generation
