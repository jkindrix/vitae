import { writeFile, stat } from 'fs/promises';
import { resolve } from 'path';
import chalk from 'chalk';

const EXAMPLE_RESUME = `# Vitae Resume
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

  await writeFile(outputPath, EXAMPLE_RESUME, 'utf-8');

  console.log(chalk.green(`✓ Created ${outputPath}`));
  console.log('');
  console.log('Next steps:');
  console.log(chalk.dim('  1. Edit resume.yaml with your information'));
  console.log(chalk.dim('  2. Run: vitae build resume.yaml'));
  console.log(chalk.dim('  3. Or preview: vitae preview resume.yaml'));
}
