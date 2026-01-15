import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve, basename, extname } from 'path';
import chalk from 'chalk';
import {
  loadResume,
  renderStandaloneHtml,
  generatePdf,
  generateDocx,
  closeBrowser,
  checkPandoc,
} from '../lib/index.js';
import type { OutputFormat } from '../types/index.js';

export interface BuildCommandOptions {
  theme: string;
  output?: string;
  formats?: string;
}

/**
 * Build command - generate resume outputs
 */
export async function buildCommand(
  inputPath: string,
  options: BuildCommandOptions
): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.blue('Loading resume...'));

  // Resolve input path
  const resolvedInput = resolve(inputPath);

  // Load and validate resume
  const resume = await loadResume(resolvedInput);
  console.log(chalk.green(`✓ Loaded resume for ${resume.meta.name}`));

  // Determine output formats
  const formatStr = options.formats ?? 'pdf,docx,html';
  const formats = formatStr.split(',').map((f) => f.trim().toLowerCase()) as OutputFormat[];

  // Determine output directory/basename
  const inputBasename = basename(resolvedInput, extname(resolvedInput));
  const outputDir = options.output ? resolve(options.output) : dirname(resolvedInput);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Check Pandoc availability if DOCX is requested
  if (formats.includes('docx')) {
    const hasPandoc = await checkPandoc();
    if (!hasPandoc) {
      console.log(
        chalk.yellow('⚠ Pandoc not installed - skipping DOCX generation')
      );
      console.log(chalk.dim('  Install from: https://pandoc.org/installing.html'));
      const docxIndex = formats.indexOf('docx');
      if (docxIndex > -1) formats.splice(docxIndex, 1);
    }
  }

  // Generate each format
  const results: { format: string; path: string }[] = [];

  for (const format of formats) {
    const outputPath = `${outputDir}/${inputBasename}.${format}`;

    try {
      switch (format) {
        case 'html': {
          console.log(chalk.blue(`Generating HTML...`));
          const html = await renderStandaloneHtml(resume, options.theme);
          await writeFile(outputPath, html, 'utf-8');
          results.push({ format: 'HTML', path: outputPath });
          console.log(chalk.green(`✓ HTML: ${outputPath}`));
          break;
        }

        case 'pdf': {
          console.log(chalk.blue(`Generating PDF...`));
          await generatePdf(resume, options.theme, outputPath);
          results.push({ format: 'PDF', path: outputPath });
          console.log(chalk.green(`✓ PDF: ${outputPath}`));
          break;
        }

        case 'docx': {
          console.log(chalk.blue(`Generating DOCX...`));
          await generateDocx(resume, options.theme, outputPath);
          results.push({ format: 'DOCX', path: outputPath });
          console.log(chalk.green(`✓ DOCX: ${outputPath}`));
          break;
        }

        case 'json': {
          console.log(chalk.blue(`Generating JSON...`));
          const json = JSON.stringify(resume, null, 2);
          await writeFile(outputPath, json, 'utf-8');
          results.push({ format: 'JSON', path: outputPath });
          console.log(chalk.green(`✓ JSON: ${outputPath}`));
          break;
        }

        default:
          console.log(chalk.yellow(`⚠ Unknown format: ${format}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`✗ Failed to generate ${format}: ${message}`));
    }
  }

  // Clean up browser
  await closeBrowser();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log(
    chalk.green(`✓ Generated ${results.length} file(s) in ${elapsed}s`)
  );
}
