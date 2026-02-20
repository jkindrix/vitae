import { writeFile, stat } from 'fs/promises';
import { resolve } from 'path';
import { createInterface } from 'readline';
import chalk from 'chalk';
import { stringify as stringifyYaml } from 'yaml';

const SCHEMA_URL =
  'https://raw.githubusercontent.com/jkindrix/vitae/main/schemas/resume.schema.json';

const EXAMPLE_RESUME = `# yaml-language-server: $schema=${SCHEMA_URL}
# Vitae Resume
# Edit this file with your information

meta:
  name: Your Name
  title: Your Title | Your Specialty
  email: your.email@example.com
  phone: (555) 123-4567
  location: City, State
  links:
    - label: LinkedIn
      url: https://linkedin.com/in/yourprofile
    - label: GitHub
      url: https://github.com/yourusername

summary: >
  A brief professional summary that highlights your key qualifications,
  years of experience, and what makes you unique. Keep it to 2-3 sentences.

skills:
  - category: Programming Languages
    items:
      - JavaScript
      - TypeScript
      - Python

  - category: Frameworks & Tools
    items:
      - React
      - Node.js
      - PostgreSQL

experience:
  - company: Current Company
    roles:
      - title: Senior Engineer
        start: 2022-01
        end: present
        location: City, State
        highlights:
          - Led development of key feature that improved metrics by X%
          - Mentored team of N engineers on best practices
          - Architected scalable system handling N requests/day

  - company: Previous Company
    roles:
      - title: Software Engineer
        start: 2019-06
        end: 2021-12
        location: City, State
        highlights:
          - Implemented feature that reduced costs by $X
          - Collaborated with cross-functional teams to deliver project

projects:
  - name: Notable Project
    url: https://github.com/yourusername/project
    description: Brief description of what the project does and its impact

# Optional sections (uncomment to use):

# education:
#   - institution: University Name
#     degree: Bachelor of Science
#     field: Computer Science
#     end: "2019"

# certifications:
#   - name: AWS Solutions Architect
#     issuer: Amazon Web Services
#     date: "2023"
`;

export interface InitCommandOptions {
  force?: boolean;
  interactive?: boolean;
}

/**
 * Prompt user for input
 */
function prompt(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

/**
 * Interactive resume builder
 */
async function buildInteractiveResume(): Promise<Record<string, unknown>> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log('');
  console.log(chalk.blue("Let's build your resume! Press Enter to skip optional fields."));
  console.log('');

  try {
    // Basic info
    const name = await prompt(rl, chalk.cyan('Your full name: '));
    if (!name) {
      throw new Error('Name is required');
    }

    const title = await prompt(rl, chalk.cyan('Professional title (e.g., "Software Engineer"): '));
    const email = await prompt(rl, chalk.cyan('Email address: '));
    const phone = await prompt(rl, chalk.cyan('Phone number: '));
    const location = await prompt(rl, chalk.cyan('Location (e.g., "San Francisco, CA"): '));

    // Links
    console.log('');
    console.log(chalk.dim('Add your professional links (press Enter to skip):'));
    const linkedinUrl = await prompt(rl, chalk.cyan('LinkedIn URL: '));
    const githubUrl = await prompt(rl, chalk.cyan('GitHub URL: '));
    const websiteUrl = await prompt(rl, chalk.cyan('Personal website URL: '));

    // Summary
    console.log('');
    const summary = await prompt(rl, chalk.cyan('Professional summary (1-2 sentences): '));

    // Current job
    console.log('');
    console.log(chalk.dim('Add your current or most recent job:'));
    const company = await prompt(rl, chalk.cyan('Company name: '));
    const jobTitle = await prompt(rl, chalk.cyan('Job title: '));
    const startDate = await prompt(rl, chalk.cyan('Start date (YYYY-MM): '));
    const stillThere = await prompt(rl, chalk.cyan('Still working there? (y/n): '));
    let endDate: string | undefined;
    if (stillThere.toLowerCase() !== 'y') {
      endDate = await prompt(rl, chalk.cyan('End date (YYYY-MM): '));
    }
    const jobLocation = await prompt(rl, chalk.cyan('Job location: '));

    // Build the resume object
    const resume: Record<string, unknown> = {
      meta: {
        name,
        ...(title && { title }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(location && { location }),
        ...((linkedinUrl || githubUrl || websiteUrl) && {
          links: [
            ...(linkedinUrl ? [{ label: 'LinkedIn', url: linkedinUrl }] : []),
            ...(githubUrl ? [{ label: 'GitHub', url: githubUrl }] : []),
            ...(websiteUrl ? [{ url: websiteUrl }] : []),
          ],
        }),
      },
      ...(summary && { summary }),
      experience: company
        ? [
            {
              company,
              roles: [
                {
                  title: jobTitle || 'Role Title',
                  start: startDate || '2020-01',
                  ...(stillThere.toLowerCase() === 'y'
                    ? { end: 'present' }
                    : endDate
                      ? { end: endDate }
                      : {}),
                  ...(jobLocation && { location: jobLocation }),
                  highlights: ['Add your key accomplishments here'],
                },
              ],
            },
          ]
        : [
            {
              company: 'Company Name',
              roles: [
                {
                  title: 'Job Title',
                  start: '2020-01',
                  end: 'present',
                  highlights: ['Add your key accomplishments here'],
                },
              ],
            },
          ],
    };

    return resume;
  } finally {
    rl.close();
  }
}

/**
 * Init command - create a new resume.yaml file
 */
export async function initCommand(options: InitCommandOptions): Promise<void> {
  const outputPath = resolve('resume.yaml');

  // Check if file exists
  try {
    await stat(outputPath);
    if (!options.force) {
      console.log(chalk.yellow(`⚠ File already exists: ${outputPath}`));
      console.log(chalk.dim('  Use --force to overwrite'));
      return;
    }
  } catch {
    // File doesn't exist, which is fine
  }

  let content: string;

  if (options.interactive) {
    // Interactive mode
    const resume = await buildInteractiveResume();
    content =
      `# yaml-language-server: $schema=${SCHEMA_URL}\n` +
      '# Vitae Resume\n# Generated interactively - edit to add more details\n\n' +
      stringifyYaml(resume, { indent: 2, lineWidth: 0 });
  } else {
    // Template mode
    content = EXAMPLE_RESUME;
  }

  await writeFile(outputPath, content, 'utf-8');

  console.log('');
  console.log(chalk.green(`✓ Created ${outputPath}`));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.dim('  1. Edit resume.yaml to add more details'));
  console.log(chalk.dim('  2. Run: vitae build resume.yaml'));
  console.log(chalk.dim('  3. Or preview: vitae preview resume.yaml'));
}
