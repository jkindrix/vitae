import { writeFile } from 'fs/promises';
import {
  Document,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Packer,
  BorderStyle,
  AlignmentType,
} from 'docx';
import { formatDateShort } from './dates.js';
import { getLocale, getSectionLabel } from './i18n.js';
import { DocxError } from './errors.js';
import type { Locale } from './i18n.js';
import type { NormalizedResume, SectionName, ThemeOverrides } from '../types/index.js';
import type { CoverLetter } from '../types/cover-letter.js';

// ---------------------------------------------------------------------------
// Styling infrastructure
// ---------------------------------------------------------------------------

interface DocxStyles {
  accentColor: string; // hex without #, e.g. "1B4F72"
  textColor: string;
  fontFamily: string;
  fontSize: number; // half-points (22 = 11pt)
  headingSize: number; // half-points (28 = 14pt)
  nameSize: number; // half-points (44 = 22pt)
}

const DEFAULT_STYLES: DocxStyles = {
  accentColor: '1B4F72',
  textColor: '333333',
  fontFamily: 'Calibri',
  fontSize: 22,
  headingSize: 28,
  nameSize: 44,
};

function stripHash(color: string): string {
  return color.startsWith('#') ? color.slice(1) : color;
}

function resolveStyles(theme?: ThemeOverrides): DocxStyles {
  if (!theme) return { ...DEFAULT_STYLES };
  return {
    accentColor: theme.colors?.accent ? stripHash(theme.colors.accent) : DEFAULT_STYLES.accentColor,
    textColor: theme.colors?.text ? stripHash(theme.colors.text) : DEFAULT_STYLES.textColor,
    fontFamily: theme.fonts?.sans ?? DEFAULT_STYLES.fontFamily,
    fontSize: DEFAULT_STYLES.fontSize,
    headingSize: DEFAULT_STYLES.headingSize,
    nameSize: DEFAULT_STYLES.nameSize,
  };
}

// ---------------------------------------------------------------------------
// DOCX helpers
// ---------------------------------------------------------------------------

function docxSectionHeading(text: string, styles: DocxStyles): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: styles.headingSize,
        color: styles.accentColor,
        font: styles.fontFamily,
      }),
    ],
    spacing: { before: 240, after: 120 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: styles.accentColor,
      },
    },
  });
}

function textRun(text: string, styles: DocxStyles, overrides?: { bold?: boolean; italics?: boolean; color?: string; size?: number }): TextRun {
  const opts: {
    text: string;
    font: string;
    size: number;
    color: string;
    bold?: boolean;
    italics?: boolean;
  } = {
    text,
    font: styles.fontFamily,
    size: overrides?.size ?? styles.fontSize,
    color: overrides?.color ?? styles.textColor,
  };
  if (overrides?.bold !== undefined) opts.bold = overrides.bold;
  if (overrides?.italics !== undefined) opts.italics = overrides.italics;
  return new TextRun(opts);
}

function emptyParagraph(): Paragraph {
  return new Paragraph({ text: '' });
}

function localeHeading(locale: Locale, section: SectionName, fallback: string): string {
  return getSectionLabel(locale, section) ?? fallback;
}

function localePresentKeyword(locale: Locale): string {
  return locale.keywords.present || 'Present';
}

// ---------------------------------------------------------------------------
// DOCX section renderers
// ---------------------------------------------------------------------------

function renderMetaDocx(resume: NormalizedResume, styles: DocxStyles): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Name
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: resume.meta.name,
          bold: true,
          size: styles.nameSize,
          color: styles.accentColor,
          font: styles.fontFamily,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    })
  );

  // Title
  if (resume.meta.title) {
    paragraphs.push(
      new Paragraph({
        children: [textRun(resume.meta.title, styles, { italics: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      })
    );
  }

  // Contact line
  const contactParts: string[] = [];
  if (resume.meta.email) contactParts.push(resume.meta.email);
  if (resume.meta.phone) contactParts.push(resume.meta.phone);
  if (resume.meta.location) contactParts.push(resume.meta.location);
  if (contactParts.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [textRun(contactParts.join('  |  '), styles)],
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
      })
    );
  }

  // Links
  if (resume.meta.links && resume.meta.links.length > 0) {
    const children: (TextRun | ExternalHyperlink)[] = [];
    for (let i = 0; i < resume.meta.links.length; i++) {
      const link = resume.meta.links[i]!;
      if (i > 0) {
        children.push(textRun('  |  ', styles));
      }
      const label = link.label ?? new URL(link.url).hostname;
      children.push(
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: label,
              font: styles.fontFamily,
              size: styles.fontSize,
              color: styles.accentColor,
              underline: { type: 'single' },
            }),
          ],
          link: link.url,
        })
      );
    }
    paragraphs.push(
      new Paragraph({
        children,
        alignment: AlignmentType.CENTER,
        spacing: { after: 120 },
      })
    );
  }

  return paragraphs;
}

function renderSummaryDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.summary) return [];
  return [
    docxSectionHeading(localeHeading(locale, 'summary', 'Summary'), styles),
    new Paragraph({
      children: [textRun(resume.summary, styles)],
      spacing: { after: 120 },
    }),
  ];
}

function renderSkillsDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.skills || resume.skills.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'skills', 'Skills'), styles),
  ];
  for (const category of resume.skills) {
    paragraphs.push(
      new Paragraph({
        children: [
          textRun(`${category.category}: `, styles, { bold: true }),
          textRun(category.items.join(', '), styles),
        ],
        spacing: { after: 60 },
      })
    );
  }
  return paragraphs;
}

function renderExperienceDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.experience || resume.experience.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'experience', 'Experience'), styles),
  ];

  for (const exp of resume.experience) {
    for (const role of exp.roles) {
      // Company name
      paragraphs.push(
        new Paragraph({
          children: [textRun(exp.company, styles, { bold: true, size: 24 })],
          spacing: { before: 120, after: 40 },
        })
      );

      // Role title + date range
      const dateChildren: TextRun[] = [
        textRun(role.title, styles, { italics: true }),
      ];

      const dateParts: string[] = [];
      if (role.start) {
        const endDate = role.end ?? localePresentKeyword(locale);
        dateParts.push(`${formatDateShort(role.start, locale)} - ${formatDateShort(endDate, locale)}`);
      }
      if (role.location) dateParts.push(role.location);

      if (dateParts.length > 0) {
        dateChildren.push(textRun(`  |  ${dateParts.join('  |  ')}`, styles));
      }

      paragraphs.push(
        new Paragraph({
          children: dateChildren,
          spacing: { after: 60 },
        })
      );

      // Highlights
      if (role.highlights && role.highlights.length > 0) {
        for (const highlight of role.highlights) {
          paragraphs.push(
            new Paragraph({
              children: [textRun(highlight, styles)],
              bullet: { level: 0 },
              spacing: { after: 40 },
            })
          );
        }
      }
    }
  }

  return paragraphs;
}

function renderProjectsDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.projects || resume.projects.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'projects', 'Projects'), styles),
  ];

  for (const project of resume.projects) {
    // Project name (with hyperlink if URL)
    if (project.url) {
      paragraphs.push(
        new Paragraph({
          children: [
            new ExternalHyperlink({
              children: [
                new TextRun({
                  text: project.name,
                  bold: true,
                  font: styles.fontFamily,
                  size: 24,
                  color: styles.accentColor,
                  underline: { type: 'single' },
                }),
              ],
              link: project.url,
            }),
          ],
          spacing: { before: 120, after: 40 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [textRun(project.name, styles, { bold: true, size: 24 })],
          spacing: { before: 120, after: 40 },
        })
      );
    }

    if (project.description) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(project.description, styles)],
          spacing: { after: 60 },
        })
      );
    }

    if (project.highlights && project.highlights.length > 0) {
      for (const highlight of project.highlights) {
        paragraphs.push(
          new Paragraph({
            children: [textRun(highlight, styles)],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      }
    }
  }

  return paragraphs;
}

function renderEducationDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.education || resume.education.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'education', 'Education'), styles),
  ];

  for (const edu of resume.education) {
    // Institution
    paragraphs.push(
      new Paragraph({
        children: [textRun(edu.institution, styles, { bold: true, size: 24 })],
        spacing: { before: 120, after: 40 },
      })
    );

    // Degree + field + dates
    const parts: TextRun[] = [];
    if (edu.degree || edu.field) {
      const degreeField = [edu.degree, edu.field].filter(Boolean).join(' in ');
      parts.push(textRun(degreeField, styles, { italics: true }));
    }

    if (edu.start || edu.end) {
      const dateParts: string[] = [];
      if (edu.start) dateParts.push(formatDateShort(edu.start, locale));
      if (edu.end) dateParts.push(formatDateShort(edu.end, locale));
      if (parts.length > 0) {
        parts.push(textRun('  |  ', styles));
      }
      parts.push(textRun(dateParts.join(' - '), styles));
    }

    if (parts.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: parts,
          spacing: { after: 60 },
        })
      );
    }

    if (edu.highlights && edu.highlights.length > 0) {
      for (const highlight of edu.highlights) {
        paragraphs.push(
          new Paragraph({
            children: [textRun(highlight, styles)],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      }
    }
  }

  return paragraphs;
}

function renderCertificationsDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.certifications || resume.certifications.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'certifications', 'Certifications'), styles),
  ];

  for (const cert of resume.certifications) {
    const children: TextRun[] = [textRun(cert.name, styles, { bold: true })];
    if (cert.issuer) children.push(textRun(` (${cert.issuer})`, styles));
    if (cert.date) children.push(textRun(` - ${cert.date}`, styles));
    paragraphs.push(
      new Paragraph({
        children,
        bullet: { level: 0 },
        spacing: { after: 40 },
      })
    );
  }

  return paragraphs;
}

function renderLanguagesDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.languages || resume.languages.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'languages', 'Languages'), styles),
  ];

  for (const lang of resume.languages) {
    const children: TextRun[] = [textRun(lang.language, styles)];
    if (lang.fluency) children.push(textRun(` (${lang.fluency})`, styles));
    paragraphs.push(
      new Paragraph({
        children,
        bullet: { level: 0 },
        spacing: { after: 40 },
      })
    );
  }

  return paragraphs;
}

function renderAwardsDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.awards || resume.awards.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'awards', 'Awards'), styles),
  ];

  for (const award of resume.awards) {
    const children: TextRun[] = [textRun(award.title, styles, { bold: true })];
    if (award.awarder) children.push(textRun(` (${award.awarder})`, styles));
    if (award.date) children.push(textRun(` - ${award.date}`, styles));
    paragraphs.push(
      new Paragraph({
        children,
        bullet: { level: 0 },
        spacing: { after: 40 },
      })
    );
    if (award.summary) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(award.summary, styles)],
          indent: { left: 360 },
          spacing: { after: 40 },
        })
      );
    }
  }

  return paragraphs;
}

function renderPublicationsDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.publications || resume.publications.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'publications', 'Publications'), styles),
  ];

  for (const pub of resume.publications) {
    const children: (TextRun | ExternalHyperlink)[] = [];
    if (pub.url) {
      children.push(
        new ExternalHyperlink({
          children: [
            new TextRun({
              text: pub.name,
              bold: true,
              font: styles.fontFamily,
              size: styles.fontSize,
              color: styles.accentColor,
              underline: { type: 'single' },
            }),
          ],
          link: pub.url,
        })
      );
    } else {
      children.push(textRun(pub.name, styles, { bold: true }));
    }
    paragraphs.push(
      new Paragraph({
        children,
        bullet: { level: 0 },
        spacing: { after: 40 },
      })
    );
    if (pub.publisher) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(pub.publisher, styles, { italics: true })],
          indent: { left: 360 },
          spacing: { after: 40 },
        })
      );
    }
    if (pub.summary) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(pub.summary, styles)],
          indent: { left: 360 },
          spacing: { after: 40 },
        })
      );
    }
  }

  return paragraphs;
}

function renderVolunteerDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.volunteer || resume.volunteer.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'volunteer', 'Volunteer'), styles),
  ];

  for (const vol of resume.volunteer) {
    // Organization
    paragraphs.push(
      new Paragraph({
        children: [textRun(vol.organization, styles, { bold: true, size: 24 })],
        spacing: { before: 120, after: 40 },
      })
    );

    // Position + dates
    const parts: TextRun[] = [];
    if (vol.position) {
      parts.push(textRun(vol.position, styles, { italics: true }));
    }
    if (vol.start || vol.end) {
      const dateParts: string[] = [];
      if (vol.start) dateParts.push(vol.start);
      if (vol.end) dateParts.push(vol.end);
      if (parts.length > 0) {
        parts.push(textRun('  |  ', styles));
      }
      parts.push(textRun(dateParts.join(' - '), styles));
    }
    if (parts.length > 0) {
      paragraphs.push(
        new Paragraph({
          children: parts,
          spacing: { after: 60 },
        })
      );
    }

    if (vol.summary) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(vol.summary, styles)],
          spacing: { after: 60 },
        })
      );
    }

    if (vol.highlights && vol.highlights.length > 0) {
      for (const highlight of vol.highlights) {
        paragraphs.push(
          new Paragraph({
            children: [textRun(highlight, styles)],
            bullet: { level: 0 },
            spacing: { after: 40 },
          })
        );
      }
    }
  }

  return paragraphs;
}

function renderReferencesDocx(resume: NormalizedResume, styles: DocxStyles, locale: Locale): Paragraph[] {
  if (!resume.references || resume.references.length === 0) return [];
  const paragraphs: Paragraph[] = [
    docxSectionHeading(localeHeading(locale, 'references', 'References'), styles),
  ];

  for (const ref of resume.references) {
    paragraphs.push(
      new Paragraph({
        children: [textRun(ref.name, styles, { bold: true })],
        spacing: { before: 60, after: 40 },
      })
    );
    if (ref.reference) {
      paragraphs.push(
        new Paragraph({
          children: [textRun(`"${ref.reference}"`, styles, { italics: true })],
          indent: { left: 360 },
          spacing: { after: 60 },
        })
      );
    }
  }

  return paragraphs;
}

// ---------------------------------------------------------------------------
// DOCX section renderer map
// ---------------------------------------------------------------------------

type DocxSectionRenderer = (resume: NormalizedResume, styles: DocxStyles, locale: Locale) => Paragraph[];

const docxSectionRenderers: Record<SectionName, DocxSectionRenderer> = {
  summary: renderSummaryDocx,
  skills: renderSkillsDocx,
  experience: renderExperienceDocx,
  projects: renderProjectsDocx,
  education: renderEducationDocx,
  certifications: renderCertificationsDocx,
  languages: renderLanguagesDocx,
  awards: renderAwardsDocx,
  publications: renderPublicationsDocx,
  volunteer: renderVolunteerDocx,
  references: renderReferencesDocx,
};

// ---------------------------------------------------------------------------
// Section renderers for Markdown (unchanged — used by --format md)
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

const markdownSectionRenderers: Record<SectionName, (resume: NormalizedResume, lines: string[], locale: Locale) => void> = {
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
 * Convert resume to Markdown format, respecting section ordering
 */
export function resumeToMarkdown(resume: NormalizedResume): string {
  const locale = getLocale(resume.language);
  const lines: string[] = [];

  // Meta is always first
  renderMetaMarkdown(resume, lines);

  // Sections in order
  for (const section of resume.sections) {
    const renderer = markdownSectionRenderers[section];
    if (renderer) {
      renderer(resume, lines, locale);
    }
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public DOCX generation API
// ---------------------------------------------------------------------------

export interface DocxOptions {
  /**
   * Path to custom reference DOCX for styling (reserved for future use)
   */
  referenceDoc?: string;
}

/**
 * Generate a DOCX file from a normalized resume using native docx generation
 */
export async function generateDocx(
  resume: NormalizedResume,
  _themeName: string,
  outputPath: string,
  _options: DocxOptions = {}
): Promise<void> {
  try {
    const locale = getLocale(resume.language);
    const styles = resolveStyles(resume.theme);

    const children: Paragraph[] = [...renderMetaDocx(resume, styles)];

    // Render sections in order
    for (const section of resume.sections) {
      const renderer = docxSectionRenderers[section];
      if (renderer) {
        children.push(...renderer(resume, styles, locale));
      }
    }

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    await writeFile(outputPath, buffer);
  } catch (error) {
    if (error instanceof DocxError) throw error;
    throw DocxError.generationFailed(error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Generate a DOCX file from a cover letter
 */
export async function generateCoverLetterDocx(
  coverLetter: CoverLetter,
  outputPath: string
): Promise<void> {
  try {
    const styles = resolveStyles(coverLetter.theme);
    const children: Paragraph[] = [];

    // Sender info
    children.push(
      new Paragraph({
        children: [textRun(coverLetter.meta.name, styles, { bold: true })],
        spacing: { after: 40 },
      })
    );

    const contactParts: string[] = [];
    if (coverLetter.meta.email) contactParts.push(coverLetter.meta.email);
    if (coverLetter.meta.phone) contactParts.push(coverLetter.meta.phone);
    if (coverLetter.meta.location) contactParts.push(coverLetter.meta.location);
    if (contactParts.length > 0) {
      children.push(
        new Paragraph({
          children: [textRun(contactParts.join('  |  '), styles)],
          spacing: { after: 120 },
        })
      );
    }

    // Date
    if (coverLetter.date) {
      children.push(
        new Paragraph({
          children: [textRun(coverLetter.date, styles)],
          spacing: { after: 120 },
        })
      );
    }

    // Recipient
    const recipientParts: string[] = [];
    if (coverLetter.recipient.name) recipientParts.push(coverLetter.recipient.name);
    if (coverLetter.recipient.title) recipientParts.push(coverLetter.recipient.title);
    if (coverLetter.recipient.company) recipientParts.push(coverLetter.recipient.company);
    if (coverLetter.recipient.address) recipientParts.push(coverLetter.recipient.address);
    for (const part of recipientParts) {
      children.push(
        new Paragraph({
          children: [textRun(part, styles)],
          spacing: { after: 40 },
        })
      );
    }
    if (recipientParts.length > 0) {
      children.push(emptyParagraph());
    }

    // Subject
    if (coverLetter.subject) {
      children.push(
        new Paragraph({
          children: [textRun(coverLetter.subject, styles, { bold: true })],
          spacing: { after: 120 },
        })
      );
    }

    // Greeting
    children.push(
      new Paragraph({
        children: [textRun(coverLetter.greeting, styles)],
        spacing: { after: 120 },
      })
    );

    // Body paragraphs
    for (const paragraph of coverLetter.body) {
      children.push(
        new Paragraph({
          children: [textRun(paragraph, styles)],
          spacing: { after: 120 },
        })
      );
    }

    // Closing
    children.push(
      new Paragraph({
        children: [textRun(coverLetter.closing, styles)],
        spacing: { after: 120 },
      })
    );

    // Signature
    children.push(
      new Paragraph({
        children: [textRun(coverLetter.meta.name, styles)],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: 1440,
                right: 1440,
                bottom: 1440,
                left: 1440,
              },
            },
          },
          children,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);
    await writeFile(outputPath, buffer);
  } catch (error) {
    if (error instanceof DocxError) throw error;
    throw DocxError.generationFailed(error instanceof Error ? error : new Error(String(error)));
  }
}
