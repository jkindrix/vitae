import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';
import { validateResume } from '../lib/index.js';

/**
 * Validate command - check a resume.yaml for errors
 */
export async function validateCommand(inputPath: string): Promise<void> {
  const resolvedPath = resolve(inputPath);

  console.log(chalk.blue(`Validating ${resolvedPath}...`));
  console.log('');

  try {
    const content = await readFile(resolvedPath, 'utf-8');
    const data = parseYaml(content);
    const result = await validateResume(data);

    if (result.valid) {
      console.log(chalk.green('✓ Resume is valid'));

      // Show some stats about the resume
      if (data && typeof data === 'object') {
        const resume = data as Record<string, unknown>;
        console.log('');
        console.log(chalk.dim('Summary:'));

        if (resume['meta'] && typeof resume['meta'] === 'object') {
          const meta = resume['meta'] as Record<string, unknown>;
          if (meta['name']) {
            console.log(chalk.dim(`  Name: ${meta['name']}`));
          }
        }

        if (Array.isArray(resume['experience'])) {
          console.log(chalk.dim(`  Experience entries: ${resume['experience'].length}`));
        }

        if (Array.isArray(resume['skills'])) {
          console.log(chalk.dim(`  Skill categories: ${resume['skills'].length}`));
        }

        if (Array.isArray(resume['projects'])) {
          console.log(chalk.dim(`  Projects: ${resume['projects'].length}`));
        }
      }
    } else {
      console.log(chalk.red('✗ Resume has validation errors:'));
      console.log('');

      for (const error of result.errors) {
        console.log(chalk.red(`  ${error.path}: ${error.message}`));
      }

      process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.log(chalk.red(`✗ Failed to validate: ${message}`));
    process.exitCode = 1;
  }
}
