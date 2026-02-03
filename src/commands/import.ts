import { readFile, writeFile } from 'fs/promises';
import { resolve, basename, extname } from 'path';
import chalk from 'chalk';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { isJsonResumeFormat, fromJsonResume } from '../lib/json-resume.js';
import { validateResume } from '../lib/schema.js';

export interface ImportCommandOptions {
  output?: string;
  format?: 'json-resume' | 'auto';
}

/**
 * Detect input format from file content
 */
function detectFormat(data: unknown): 'json-resume' | 'vitae' | 'unknown' {
  if (typeof data !== 'object' || data === null) {
    return 'unknown';
  }

  // Check for JSON Resume format
  if (isJsonResumeFormat(data)) {
    return 'json-resume';
  }

  // Check for Vitae format (has meta and experience)
  const obj = data as Record<string, unknown>;
  if ('meta' in obj && 'experience' in obj) {
    return 'vitae';
  }

  return 'unknown';
}

/**
 * Import command - convert other formats to Vitae YAML
 */
export async function importCommand(
  inputPath: string,
  options: ImportCommandOptions
): Promise<void> {
  console.log(chalk.blue('Reading input file...'));

  // Resolve input path
  const resolvedInput = resolve(inputPath);
  const inputExt = extname(resolvedInput).toLowerCase();
  const inputBasename = basename(resolvedInput, inputExt);

  // Read the file
  let content: string;
  try {
    content = await readFile(resolvedInput, 'utf-8');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to read file: ${message}`);
  }

  // Parse the content
  let data: unknown;
  try {
    if (inputExt === '.json') {
      data = JSON.parse(content);
    } else if (inputExt === '.yaml' || inputExt === '.yml') {
      data = parseYaml(content);
    } else {
      // Try JSON first, then YAML
      try {
        data = JSON.parse(content);
      } catch {
        data = parseYaml(content);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse file: ${message}`);
  }

  // Detect or use specified format
  const detectedFormat =
    options.format === 'auto' || !options.format ? detectFormat(data) : options.format;

  console.log(chalk.dim(`Detected format: ${detectedFormat}`));

  // Convert based on format
  let resume;
  switch (detectedFormat) {
    case 'json-resume':
      console.log(chalk.blue('Converting from JSON Resume format...'));
      resume = fromJsonResume(data as Parameters<typeof fromJsonResume>[0]);
      break;

    case 'vitae':
      console.log(chalk.yellow('File is already in Vitae format'));
      resume = data;
      break;

    case 'unknown':
    default:
      throw new Error(
        'Could not detect input format. Supported formats: JSON Resume.\n' +
          'If your file is in JSON Resume format, try: --format json-resume'
      );
  }

  // Validate the result
  console.log(chalk.blue('Validating converted resume...'));
  const validation = await validateResume(resume);
  if (!validation.valid) {
    console.log(chalk.yellow('⚠ Validation warnings:'));
    for (const error of validation.errors) {
      console.log(chalk.yellow(`  - ${error.path}: ${error.message}`));
    }
    console.log(
      chalk.dim('  The file will still be created, but you may need to fix these issues.')
    );
  } else {
    console.log(chalk.green('✓ Resume validates successfully'));
  }

  // Determine output path
  const outputPath = options.output
    ? resolve(options.output)
    : resolve(`${inputBasename}.vitae.yaml`);

  // Convert to YAML and write
  console.log(chalk.blue('Writing Vitae YAML...'));
  const yamlContent = stringifyYaml(resume, {
    indent: 2,
    lineWidth: 0, // Don't wrap lines
  });

  await writeFile(outputPath, yamlContent, 'utf-8');
  console.log(chalk.green(`✓ Created: ${outputPath}`));

  // Print summary
  const r = resume as {
    meta?: { name?: string };
    experience?: unknown[];
    skills?: unknown[];
    projects?: unknown[];
  };
  console.log('');
  console.log(chalk.dim('Summary:'));
  console.log(chalk.dim(`  Name: ${r.meta?.name ?? 'Unknown'}`));
  console.log(chalk.dim(`  Experience entries: ${r.experience?.length ?? 0}`));
  console.log(chalk.dim(`  Skill categories: ${r.skills?.length ?? 0}`));
  console.log(chalk.dim(`  Projects: ${r.projects?.length ?? 0}`));
}
