import { writeFile } from 'fs/promises';
import { resolve, basename, extname } from 'path';
import chalk from 'chalk';
import { loadResume, loadVariant, applyVariant, toJsonResume } from '../lib/index.js';

export interface ExportCommandOptions {
  output?: string;
  format?: 'json-resume';
  variant?: string;
}

/**
 * Export command - convert Vitae YAML to other resume formats
 */
export async function exportCommand(
  inputPath: string,
  options: ExportCommandOptions
): Promise<void> {
  console.log(chalk.blue('Loading resume...'));

  const resolvedInput = resolve(inputPath);

  // Load and validate resume
  let resume = await loadResume(resolvedInput);
  console.log(chalk.green(`✓ Loaded resume for ${resume.meta.name}`));

  // Load and apply variant if specified
  if (options.variant) {
    const resolvedVariant = resolve(options.variant);
    console.log(chalk.blue(`Loading variant: ${resolvedVariant}...`));
    const variant = await loadVariant(resolvedVariant);
    resume = applyVariant(resume, variant);
    console.log(chalk.green('✓ Applied variant'));
  }

  const format = options.format ?? 'json-resume';

  switch (format) {
    case 'json-resume': {
      console.log(chalk.blue('Converting to JSON Resume format...'));
      const jsonResume = toJsonResume(resume);
      const jsonContent = JSON.stringify(jsonResume, null, 2);

      // Determine output path
      const inputBasename = basename(resolvedInput, extname(resolvedInput));
      const outputPath = options.output
        ? resolve(options.output)
        : resolve(`${inputBasename}.resume.json`);

      await writeFile(outputPath, jsonContent, 'utf-8');
      console.log(chalk.green(`✓ Exported: ${outputPath}`));

      console.log('');
      console.log(chalk.dim('Summary:'));
      console.log(chalk.dim(`  Format: JSON Resume (https://jsonresume.org)`));
      console.log(chalk.dim(`  Name: ${resume.meta.name}`));
      console.log(chalk.dim(`  Work entries: ${jsonResume.work?.length ?? 0}`));
      console.log(chalk.dim(`  Skill categories: ${jsonResume.skills?.length ?? 0}`));
      break;
    }

    default:
      throw new Error(
        `Unknown export format: ${format}. Supported formats: json-resume`
      );
  }
}
