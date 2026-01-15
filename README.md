# vitae

Beautiful resume generator from YAML. Outputs pixel-perfect PDF, ATS-optimized DOCX, and web-ready HTML.

## Features

- **YAML-based** — Human-readable resume format with schema validation
- **Multiple outputs** — PDF (via Playwright), DOCX (via Pandoc), HTML
- **Theming** — Customizable themes with HTML templates and CSS
- **Live preview** — Hot-reloading development server
- **ATS-friendly** — DOCX output optimized for Applicant Tracking Systems

## Installation

```bash
npm install -g vitae
```

### Requirements

- Node.js 20+
- [Pandoc](https://pandoc.org/installing.html) (for DOCX generation)

Playwright browsers are installed automatically on first use.

## Quick Start

```bash
# Create a new resume
vitae init

# Edit resume.yaml with your information
# Then build all formats
vitae build resume.yaml

# Or preview with hot reload
vitae preview resume.yaml
```

## Commands

### `vitae init`

Creates a new `resume.yaml` template in the current directory.

```bash
vitae init
vitae init --force  # Overwrite existing file
```

### `vitae build <input>`

Generates resume outputs from a YAML file.

```bash
vitae build resume.yaml                     # PDF, DOCX, HTML (default)
vitae build resume.yaml -f pdf              # PDF only
vitae build resume.yaml -f pdf,html         # PDF and HTML
vitae build resume.yaml -t minimal          # Use specific theme
vitae build resume.yaml -o ./output         # Custom output directory
```

Options:
- `-t, --theme <name>` — Theme to use (default: `minimal`)
- `-o, --output <dir>` — Output directory (default: input file directory)
- `-f, --formats <list>` — Comma-separated formats: `pdf`, `docx`, `html`, `json`

### `vitae preview <input>`

Starts a local server with live preview. The page auto-refreshes when you edit your resume.

```bash
vitae preview resume.yaml
vitae preview resume.yaml -p 8080           # Custom port
vitae preview resume.yaml -t minimal        # Use specific theme
```

### `vitae validate <input>`

Validates a resume YAML file against the schema.

```bash
vitae validate resume.yaml
```

### `vitae themes`

Lists available themes.

```bash
vitae themes
```

## Resume Format

Resumes are written in YAML:

```yaml
meta:
  name: Jane Smith
  title: Senior Software Engineer
  email: jane@example.com
  phone: (555) 123-4567
  location: San Francisco, CA
  links:
    - label: GitHub
      url: https://github.com/janesmith
    - label: LinkedIn
      url: https://linkedin.com/in/janesmith

summary: >
  Senior engineer with 8+ years of experience building
  scalable web applications and leading engineering teams.

skills:
  - category: Languages
    items: [TypeScript, Python, Go, Rust]
  - category: Frameworks
    items: [React, Node.js, Django, FastAPI]

experience:
  - company: Tech Corp
    roles:
      - title: Senior Software Engineer
        start: 2020-03
        end: present
        location: San Francisco, CA
        highlights:
          - Led migration to microservices architecture
          - Mentored team of 5 junior engineers
          - Reduced API latency by 40%

projects:
  - name: open-source-project
    url: https://github.com/janesmith/project
    description: Description of the project and its impact
```

See the [schema](schemas/resume.schema.json) for the complete specification.

## Themes

Themes are located in the `themes/` directory. Each theme contains:

- `template.html` — Nunjucks template for HTML output
- `style.css` — Stylesheet for PDF and HTML
- `reference.docx` — (Optional) Pandoc reference doc for DOCX styling

### Built-in Themes

- **minimal** — Clean, professional design with excellent typography

### Creating Custom Themes

1. Copy an existing theme directory
2. Modify the template and styles
3. Use with `vitae build -t your-theme`

## Programmatic Usage

```typescript
import { loadResume, generatePdf, generateDocx } from 'vitae';

const resume = await loadResume('resume.yaml');
await generatePdf(resume, 'minimal', 'output.pdf');
await generateDocx(resume, 'minimal', 'output.docx');
```

## License

MIT
