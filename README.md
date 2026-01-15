# Vitae

A beautiful resume generator that converts YAML to PDF, DOCX, HTML, and JSON with theming support.

## Features

- **YAML-based resumes** - Version control your resume with Git
- **Multiple output formats** - PDF, DOCX, HTML, and JSON
- **Theming system** - Customizable templates with CSS
- **Live preview** - Hot-reload preview server for rapid iteration
- **Schema validation** - Catch errors before generating
- **CLI & Library** - Use from command line or as a Node.js module

## Installation

### Prerequisites

- **Node.js 20+** (required)
- **Pandoc** (optional, for DOCX generation) - [Install Pandoc](https://pandoc.org/installing.html)

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

# Edit resume.yaml with your information
# Then generate outputs
vitae build resume.yaml

# Or preview with hot-reload
vitae preview resume.yaml
```

## CLI Commands

### `vitae init`

Create a new `resume.yaml` file from a template.

```bash
vitae init              # Create resume.yaml in current directory
vitae init --force      # Overwrite existing file
```

### `vitae build <input>`

Generate resume outputs in multiple formats.

```bash
vitae build resume.yaml                           # Generate PDF, DOCX, HTML
vitae build resume.yaml -f pdf                    # PDF only
vitae build resume.yaml -f pdf,html               # PDF and HTML
vitae build resume.yaml -f pdf,docx,html,json     # All formats
vitae build resume.yaml -o ./output               # Custom output directory
vitae build resume.yaml -t minimal                # Use specific theme
vitae build resume.yaml -n john-doe               # Custom output filename (john-doe.pdf, etc.)
vitae build resume.yaml -a                        # All themes (resume-minimal.pdf, resume-modern.pdf, etc.)
vitae build resume.yaml --open                    # Open PDF after generation
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-f, --formats <formats>` | Comma-separated output formats | `pdf,docx,html` |
| `-o, --output <dir>` | Output directory | Input file directory |
| `-n, --name <prefix>` | Output filename prefix | Input filename |
| `-t, --theme <name>` | Theme to use | `minimal` |
| `-a, --all-themes` | Generate outputs for all available themes | - |
| `--open` | Open the first generated file after build | - |

### `vitae preview <input>`

Start a local server with hot-reload preview.

```bash
vitae preview resume.yaml             # Preview on port 3000
vitae preview resume.yaml -p 8080     # Custom port
vitae preview resume.yaml -t minimal  # Use specific theme
```

**Options:**
| Option | Description | Default |
|--------|-------------|---------|
| `-p, --port <number>` | Port to run server on | `3000` |
| `-t, --theme <name>` | Theme to use | `minimal` |

### `vitae validate <input>`

Validate a resume file against the schema.

```bash
vitae validate resume.yaml
```

### `vitae themes`

List available themes and their features.

```bash
vitae themes
```

## Resume Schema

Vitae uses YAML format with the following structure:

```yaml
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

# Optional: Professional summary
summary: >
  Senior Software Engineer with 8+ years of experience...

# Optional: Categorized skills
skills:
  - category: Languages
    items:
      - TypeScript
      - Python
      - Go

# Required: Work experience
experience:
  - company: Tech Innovations Inc.
    roles:
      - title: Senior Software Engineer         # Required
        start: 2021-03                          # Required (YYYY-MM or YYYY)
        end: present                            # Optional (YYYY-MM, YYYY, or "present")
        location: San Francisco, CA             # Optional
        summary: >                              # Optional (brief role description)
          Led backend team building scalable APIs for real-time collaboration features.
        highlights:                             # Optional
          - Led architecture of real-time features
          - Reduced API response times by 60%

# Optional: Projects
projects:
  - name: fastcache                             # Required
    url: https://github.com/user/fastcache      # Optional (validated)
    description: High-performance caching lib    # Optional
    highlights:                                  # Optional
      - 10K+ npm downloads

# Optional: Education
education:
  - institution: University of Texas            # Required
    degree: Bachelor of Science                 # Optional
    field: Computer Science                     # Optional
    start: "2011"                               # Optional
    end: "2015"                                 # Optional
    highlights:                                 # Optional
      - "GPA: 3.8/4.0"

# Optional: Certifications
certifications:
  - name: AWS Solutions Architect               # Required
    issuer: Amazon Web Services                 # Optional
    date: "2023"                                # Optional
    url: https://verify.aws/...                 # Optional (validated)
```

### Date Formats

- `YYYY-MM` - Month and year (e.g., `2023-06`)
- `YYYY` - Year only (e.g., `2023`)
- `present` or `Present` - Current/ongoing

### Validation

Vitae validates:
- Required fields (`meta.name`, `experience`)
- Email format (`meta.email`)
- URL format (`meta.links[].url`, `projects[].url`, `certifications[].url`)
- Date patterns (`roles[].start`, `roles[].end`)

## Themes

Themes are directories containing templates and styles:

```
themes/
└── minimal/
    ├── template.html    # Required: Nunjucks template
    ├── style.css        # Optional: CSS styles
    └── reference.docx   # Optional: DOCX style reference
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

4. Use your theme:
   ```bash
   vitae build resume.yaml -t mytheme
   ```

### Template Variables

| Variable | Type | Description |
|----------|------|-------------|
| `resume` | `Resume` | Complete resume object |
| `meta` | `Meta` | Personal/contact info |
| `summary` | `string?` | Professional summary |
| `skills` | `SkillCategory[]?` | Categorized skills |
| `experience` | `Experience[]` | Work experience |
| `projects` | `Project[]?` | Projects |
| `education` | `Education[]?` | Education history |
| `certifications` | `Certification[]?` | Certifications |

### Template Filters

| Filter | Description | Example |
|--------|-------------|---------|
| `formatDate` | Full date (January 2024) | `{{ role.start \| formatDate }}` |
| `formatDateShort` | Short date (Jan 2024) | `{{ role.start \| formatDateShort }}` |
| `formatDateRange` | Date range (Jan 2024 - Present) | `{{ role.start \| formatDateRange(role.end) }}` |
| `joinItems` | Join array with separator | `{{ skills \| joinItems(', ') }}` |
| `domain` | Extract domain from URL | `{{ url \| domain }}` |

## Library Usage

Vitae can be used as a Node.js library:

```typescript
import {
  loadResume,
  parseResume,
  validateResume,
  renderHtml,
  renderStandaloneHtml,
  generatePdf,
  generatePdfBuffer,
  generateDocx,
  closeBrowser,
  listThemes,
  loadTheme,
} from 'vitae';

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
  format: 'Letter',      // 'Letter' | 'A4' | 'Legal'
  margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
  printBackground: true,
  scale: 1,
});

// Generate PDF as buffer (for streaming)
const pdfBuffer = await generatePdfBuffer(resume, 'minimal');

// Generate DOCX (requires Pandoc)
await generateDocx(resume, 'minimal', 'output.docx');

// Clean up browser instance when done
await closeBrowser();

// Theme management
const themes = await listThemes();
const theme = await loadTheme('minimal');
```

## TypeScript Types

```typescript
import type {
  Resume,
  Meta,
  Link,
  SkillCategory,
  Experience,
  Role,
  Project,
  Education,
  Certification,
  Theme,
  OutputFormat,
  BuildOptions,
} from 'vitae';
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

| Format | Extension | Requires | Description |
|--------|-----------|----------|-------------|
| PDF | `.pdf` | Playwright | High-quality PDF via headless Chrome |
| DOCX | `.docx` | Pandoc | Microsoft Word document |
| HTML | `.html` | - | Standalone HTML with embedded CSS |
| JSON | `.json` | - | Raw resume data as JSON |

## Examples

See the [`examples/`](./examples) directory for sample resumes.

```bash
# Build the sample resume
vitae build examples/sample.yaml -o examples/output
```

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

## JSON Resume Compatibility

Vitae automatically detects and converts [JSON Resume](https://jsonresume.org/) format. No manual conversion needed:

```bash
# JSON Resume files work directly
vitae build resume.json                    # Auto-detected and converted
vitae preview resume.json                  # Works with preview too
vitae validate resume.json                 # Validates after conversion
```

### Programmatic Import

```typescript
import { loadResume, parseResume } from 'vitae';

// Load from file (auto-detects format)
const resume = await loadResume('resume.json');

// Parse from string (auto-detects format)
const resume = await parseResume(jsonResumeString);

// Force JSON Resume interpretation
const resume = await loadResume('data.yaml', { jsonResume: true });
```

### Export to JSON Resume

```typescript
import { toJsonResume } from 'vitae';

const jsonResume = toJsonResume(vitaeResume);
```

## Troubleshooting

### DOCX generation fails

DOCX generation requires Pandoc. Install it from [pandoc.org/installing](https://pandoc.org/installing.html).

```bash
# macOS
brew install pandoc

# Ubuntu/Debian
sudo apt install pandoc

# Windows
choco install pandoc
```

### PDF looks different than preview

PDF uses print media styles. Check your theme's `@media print` rules.

### Validation errors

Run `vitae validate resume.yaml` to see detailed error messages with paths.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing`)
3. Make your changes
4. Run tests (`npm test`)
5. Commit (`git commit -m 'feat: add amazing feature'`)
6. Push (`git push origin feature/amazing`)
7. Open a Pull Request

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

- [Playwright](https://playwright.dev/) for PDF generation
- [Nunjucks](https://mozilla.github.io/nunjucks/) for templating
- [AJV](https://ajv.js.org/) for schema validation
- [Commander.js](https://github.com/tj/commander.js) for CLI
- [Pandoc](https://pandoc.org/) for DOCX conversion
