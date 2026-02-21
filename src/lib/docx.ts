import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { loadTheme, getDocxReferencePath } from './themes.js';
import { DocxError } from './errors.js';
import { formatDateShort } from './dates.js';
import { getLocale, getSectionLabel } from './i18n.js';
import type { Locale } from './i18n.js';
import type { NormalizedResume, SectionName } from '../types/index.js';

/**
 * Check if Pandoc is installed
 */
export async function checkPandoc(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn('pandoc', ['--version']);
    proc.on('error', () => resolve(false));
    proc.on('close', (code) => resolve(code === 0));
  });
}

// ---------------------------------------------------------------------------
// Section renderers for Markdown
// ---------------------------------------------------------------------------

function sectionHeading(locale: Locale, section: SectionName, fallback: string): string {
  return getSectionLabel(locale, section) ?? fallback;
}

function presentKeyword(locale: Locale): string {
  return locale.keywords.present || 'Present';
}

function renderMetaMarkdown(resume: NormalizedResume, lines: string[]): void {
  lines.push(`# ${resume.meta.name}`);
  lines.push('');

  if (resume.meta.title) {
    lines.push(`**${resume.meta.title}**`);
    lines.push('');
  }

  const contactParts: string[] = [];
  if (resume.meta.email) contactParts.push(resume.meta.email);
  if (resume.meta.phone) contactParts.push(resume.meta.phone);
  if (resume.meta.location) contactParts.push(resume.meta.location);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
    lines.push('');
  }

  if (resume.meta.links && resume.meta.links.length > 0) {
    const linkParts = resume.meta.links.map((link) => {
      const label = link.label ?? new URL(link.url).hostname;
      return `[${label}](${link.url})`;
    });
    lines.push(linkParts.join(' | '));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
}

function renderSummaryMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.summary) return;
  lines.push(`## ${sectionHeading(locale, 'summary', 'Summary')}`);
  lines.push('');
  lines.push(resume.summary);
  lines.push('');
}

function renderSkillsMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.skills || resume.skills.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'skills', 'Skills')}`);
  lines.push('');
  for (const category of resume.skills) {
    lines.push(`**${category.category}:** ${category.items.join(', ')}`);
    lines.push('');
  }
}

function renderExperienceMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.experience || resume.experience.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'experience', 'Experience')}`);
  lines.push('');

  for (const exp of resume.experience) {
    for (const role of exp.roles) {
      lines.push(`### ${exp.company}`);
      lines.push('');
      lines.push(`**${role.title}**`);

      const dateParts: string[] = [];
      if (role.start) {
        const endDate = role.end ?? presentKeyword(locale);
        dateParts.push(`${formatDateShort(role.start, locale)} - ${formatDateShort(endDate, locale)}`);
      }
      if (role.location) dateParts.push(role.location);

      if (dateParts.length > 0) {
        lines.push(dateParts.join(' | '));
      }
      lines.push('');

      if (role.highlights && role.highlights.length > 0) {
        for (const highlight of role.highlights) {
          lines.push(`- ${highlight}`);
        }
        lines.push('');
      }
    }
  }
}

function renderProjectsMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.projects || resume.projects.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'projects', 'Projects')}`);
  lines.push('');

  for (const project of resume.projects) {
    if (project.url) {
      lines.push(`### [${project.name}](${project.url})`);
    } else {
      lines.push(`### ${project.name}`);
    }
    lines.push('');

    if (project.description) {
      lines.push(project.description);
      lines.push('');
    }

    if (project.highlights && project.highlights.length > 0) {
      for (const highlight of project.highlights) {
        lines.push(`- ${highlight}`);
      }
      lines.push('');
    }
  }
}

function renderEducationMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.education || resume.education.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'education', 'Education')}`);
  lines.push('');

  for (const edu of resume.education) {
    lines.push(`### ${edu.institution}`);
    lines.push('');

    if (edu.degree || edu.field) {
      const parts = [edu.degree, edu.field].filter(Boolean);
      lines.push(`**${parts.join(' in ')}**`);
    }

    if (edu.start || edu.end) {
      const dateParts: string[] = [];
      if (edu.start) dateParts.push(formatDateShort(edu.start, locale));
      if (edu.end) dateParts.push(formatDateShort(edu.end, locale));
      lines.push(dateParts.join(' - '));
    }
    lines.push('');

    if (edu.highlights && edu.highlights.length > 0) {
      for (const highlight of edu.highlights) {
        lines.push(`- ${highlight}`);
      }
      lines.push('');
    }
  }
}

function renderCertificationsMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.certifications || resume.certifications.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'certifications', 'Certifications')}`);
  lines.push('');

  for (const cert of resume.certifications) {
    const parts = [cert.name];
    if (cert.issuer) parts.push(`(${cert.issuer})`);
    if (cert.date) parts.push(`- ${cert.date}`);
    lines.push(`- ${parts.join(' ')}`);
  }
  lines.push('');
}

function renderLanguagesMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.languages || resume.languages.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'languages', 'Languages')}`);
  lines.push('');

  for (const lang of resume.languages) {
    const parts = [lang.language];
    if (lang.fluency) parts.push(`(${lang.fluency})`);
    lines.push(`- ${parts.join(' ')}`);
  }
  lines.push('');
}

function renderAwardsMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.awards || resume.awards.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'awards', 'Awards')}`);
  lines.push('');

  for (const award of resume.awards) {
    const parts = [award.title];
    if (award.awarder) parts.push(`(${award.awarder})`);
    if (award.date) parts.push(`- ${award.date}`);
    lines.push(`- ${parts.join(' ')}`);
    if (award.summary) {
      lines.push(`  ${award.summary}`);
    }
  }
  lines.push('');
}

function renderPublicationsMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.publications || resume.publications.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'publications', 'Publications')}`);
  lines.push('');

  for (const pub of resume.publications) {
    if (pub.url) {
      lines.push(`- [${pub.name}](${pub.url})`);
    } else {
      lines.push(`- ${pub.name}`);
    }
    if (pub.publisher) {
      lines.push(`  *${pub.publisher}*`);
    }
    if (pub.summary) {
      lines.push(`  ${pub.summary}`);
    }
  }
  lines.push('');
}

function renderVolunteerMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.volunteer || resume.volunteer.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'volunteer', 'Volunteer')}`);
  lines.push('');

  for (const vol of resume.volunteer) {
    lines.push(`### ${vol.organization}`);
    lines.push('');
    if (vol.position) {
      lines.push(`**${vol.position}**`);
    }
    if (vol.start || vol.end) {
      const dateParts: string[] = [];
      if (vol.start) dateParts.push(vol.start);
      if (vol.end) dateParts.push(vol.end);
      lines.push(dateParts.join(' - '));
    }
    lines.push('');
    if (vol.summary) {
      lines.push(vol.summary);
      lines.push('');
    }
    if (vol.highlights && vol.highlights.length > 0) {
      for (const highlight of vol.highlights) {
        lines.push(`- ${highlight}`);
      }
      lines.push('');
    }
  }
}

function renderReferencesMarkdown(resume: NormalizedResume, lines: string[], locale: Locale): void {
  if (!resume.references || resume.references.length === 0) return;
  lines.push(`## ${sectionHeading(locale, 'references', 'References')}`);
  lines.push('');

  for (const ref of resume.references) {
    lines.push(`**${ref.name}**`);
    if (ref.reference) {
      lines.push(`> "${ref.reference}"`);
    }
    lines.push('');
  }
}

const sectionRenderers: Record<SectionName, (resume: NormalizedResume, lines: string[], locale: Locale) => void> = {
  summary: renderSummaryMarkdown,
  skills: renderSkillsMarkdown,
  experience: renderExperienceMarkdown,
  projects: renderProjectsMarkdown,
  education: renderEducationMarkdown,
  certifications: renderCertificationsMarkdown,
  languages: renderLanguagesMarkdown,
  awards: renderAwardsMarkdown,
  publications: renderPublicationsMarkdown,
  volunteer: renderVolunteerMarkdown,
  references: renderReferencesMarkdown,
};

/**
 * Convert resume to Markdown format for Pandoc, respecting section ordering
 */
export function resumeToMarkdown(resume: NormalizedResume): string {
  const locale = getLocale(resume.language);
  const lines: string[] = [];

  // Meta is always first
  renderMetaMarkdown(resume, lines);

  // Sections in order
  for (const section of resume.sections) {
    const renderer = sectionRenderers[section];
    if (renderer) {
      renderer(resume, lines, locale);
    }
  }

  return lines.join('\n');
}

export interface DocxOptions {
  /**
   * Path to custom reference DOCX for styling
   */
  referenceDoc?: string;
}

/**
 * Generate a DOCX file from a normalized resume using Pandoc
 */
export async function generateDocx(
  resume: NormalizedResume,
  themeName: string,
  outputPath: string,
  options: DocxOptions = {}
): Promise<void> {
  const pandocAvailable = await checkPandoc();
  if (!pandocAvailable) {
    throw DocxError.pandocNotInstalled();
  }

  // Convert resume to Markdown
  const markdown = resumeToMarkdown(resume);

  // Create temp file for markdown
  const tempDir = tmpdir();
  const tempMd = join(tempDir, `vitae-${randomUUID()}.md`);

  try {
    await writeFile(tempMd, markdown, 'utf-8');

    // Build Pandoc command
    const args = [tempMd, '-o', outputPath, '-f', 'markdown', '-t', 'docx'];

    // Try to use theme's reference doc, or user-provided one
    let referenceDoc = options.referenceDoc;
    if (!referenceDoc) {
      try {
        const theme = await loadTheme(themeName);
        referenceDoc = getDocxReferencePath(theme) ?? undefined;
      } catch {
        // Theme might not have a reference doc
      }
    }

    if (referenceDoc) {
      args.push('--reference-doc', referenceDoc);
    }

    // Run Pandoc
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('pandoc', args);

      let stderr = '';
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`Failed to run Pandoc: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Pandoc exited with code ${code}: ${stderr}`));
        }
      });
    });
  } finally {
    // Clean up temp file
    try {
      await unlink(tempMd);
    } catch {
      // Ignore cleanup errors
    }
  }
}
