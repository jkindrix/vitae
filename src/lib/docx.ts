import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { loadTheme, getDocxReferencePath } from './themes.js';
import { DocxError } from './errors.js';
import { formatDateShort } from './dates.js';
import type { Resume } from '../types/index.js';

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

/**
 * Convert resume to Markdown format for Pandoc
 */
function resumeToMarkdown(resume: Resume): string {
  const lines: string[] = [];

  // Header
  lines.push(`# ${resume.meta.name}`);
  lines.push('');

  if (resume.meta.title) {
    lines.push(`**${resume.meta.title}**`);
    lines.push('');
  }

  // Contact info
  const contactParts: string[] = [];
  if (resume.meta.email) contactParts.push(resume.meta.email);
  if (resume.meta.phone) contactParts.push(resume.meta.phone);
  if (resume.meta.location) contactParts.push(resume.meta.location);
  if (contactParts.length > 0) {
    lines.push(contactParts.join(' | '));
    lines.push('');
  }

  // Links
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

  // Summary
  if (resume.summary) {
    lines.push('## Summary');
    lines.push('');
    lines.push(resume.summary);
    lines.push('');
  }

  // Skills
  if (resume.skills && resume.skills.length > 0) {
    lines.push('## Skills');
    lines.push('');
    for (const category of resume.skills) {
      lines.push(`**${category.category}:** ${category.items.join(', ')}`);
      lines.push('');
    }
  }

  // Experience
  if (resume.experience && resume.experience.length > 0) {
    lines.push('## Experience');
    lines.push('');

    for (const exp of resume.experience) {
      for (const role of exp.roles) {
        lines.push(`### ${exp.company}`);
        lines.push('');
        lines.push(`**${role.title}**`);

        const dateParts: string[] = [];
        if (role.start) {
          const endDate = role.end ?? 'Present';
          dateParts.push(`${formatDateShort(role.start)} - ${formatDateShort(endDate)}`);
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

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    lines.push('## Projects');
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

  // Education
  if (resume.education && resume.education.length > 0) {
    lines.push('## Education');
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
        if (edu.start) dateParts.push(formatDateShort(edu.start));
        if (edu.end) dateParts.push(formatDateShort(edu.end));
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

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    lines.push('## Certifications');
    lines.push('');

    for (const cert of resume.certifications) {
      const parts = [cert.name];
      if (cert.issuer) parts.push(`(${cert.issuer})`);
      if (cert.date) parts.push(`- ${cert.date}`);
      lines.push(`- ${parts.join(' ')}`);
    }
    lines.push('');
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
 * Generate a DOCX file from a resume using Pandoc
 */
export async function generateDocx(
  resume: Resume,
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
