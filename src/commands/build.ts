import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve, basename, extname } from 'path';
import { exec } from 'child_process';
import { platform } from 'os';
import chalk from 'chalk';
import {
  loadResume,
  loadVariant,
  applyVariant,
  normalizeResume,
  renderStandaloneHtml,
  generatePdf,
  generatePng,
  generateDocx,
  closeBrowser,
  checkPandoc,
  listThemes,
  resumeToMarkdown,
} from '../lib/index.js';
import type { OutputFormat, NormalizedResume } from '../types/index.js';

export interface BuildCommandOptions {
  theme: string;
  output?: string;
  name?: string;
  formats?: string;
  allThemes?: boolean;
  open?: boolean;
  debug?: boolean;
  variant?: string;
}

/**
 * Open a file with the system's default application
 */
function openFile(filePath: string): void {
  const plat = platform();
  let cmd: string;

  switch (plat) {
    case 'darwin':
      cmd = `open "${filePath}"`;
      break;
    case 'win32':
      cmd = `start "" "${filePath}"`;
      break;
    default:
      // Linux and others
      cmd = `xdg-open "${filePath}"`;
  }

  exec(cmd, (error) => {
    if (error) {
      console.log(chalk.yellow(`⚠ Could not open file: ${error.message}`));
    }
  });
}

/**
 * Generate outputs for a single theme
 */
async function generateForTheme(
  resume: NormalizedResume,
  themeName: string,
  formats: OutputFormat[],
  outputDir: string,
  outputBasename: string,
  options: { debug?: boolean; includeThemeInName?: boolean }
): Promise<{ format: string; path: string }[]> {
  const results: { format: string; path: string }[] = [];
  const namePrefix = options.includeThemeInName ? `${outputBasename}-${themeName}` : outputBasename;

  for (const format of formats) {
    const outputPath = `${outputDir}/${namePrefix}.${format}`;

    try {
      switch (format) {
        case 'html': {
          console.log(
            chalk.blue(`Generating HTML${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const html = await renderStandaloneHtml(resume, themeName);
          await writeFile(outputPath, html, 'utf-8');
          results.push({ format: 'HTML', path: outputPath });
          console.log(chalk.green(`✓ HTML: ${outputPath}`));
          break;
        }

        case 'pdf': {
          console.log(
            chalk.blue(`Generating PDF${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const pdfOptions = options.debug
            ? {
                debug: true,
                saveHtml: outputPath.replace('.pdf', '-debug.html'),
                screenshot: outputPath.replace('.pdf', '-debug.png'),
              }
            : {};
          await generatePdf(resume, themeName, outputPath, pdfOptions);
          results.push({ format: 'PDF', path: outputPath });
          console.log(chalk.green(`✓ PDF: ${outputPath}`));
          break;
        }

        case 'docx': {
          console.log(
            chalk.blue(`Generating DOCX${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          await generateDocx(resume, themeName, outputPath);
          results.push({ format: 'DOCX', path: outputPath });
          console.log(chalk.green(`✓ DOCX: ${outputPath}`));
          break;
        }

        case 'json': {
          // JSON output is theme-independent, only generate once
          if (!options.includeThemeInName) {
            console.log(chalk.blue(`Generating JSON...`));
            const json = JSON.stringify(resume, null, 2);
            await writeFile(outputPath, json, 'utf-8');
            results.push({ format: 'JSON', path: outputPath });
            console.log(chalk.green(`✓ JSON: ${outputPath}`));
          }
          break;
        }

        case 'md': {
          // Markdown output is theme-independent, only generate once
          if (!options.includeThemeInName) {
            console.log(chalk.blue(`Generating Markdown...`));
            const markdown = resumeToMarkdown(resume);
            await writeFile(outputPath, markdown, 'utf-8');
            results.push({ format: 'Markdown', path: outputPath });
            console.log(chalk.green(`✓ Markdown: ${outputPath}`));
          }
          break;
        }

        case 'png': {
          console.log(
            chalk.blue(`Generating PNG${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const pngOptions = options.debug ? { debug: true } : {};
          await generatePng(resume, themeName, outputPath, pngOptions);
          results.push({ format: 'PNG', path: outputPath });
          console.log(chalk.green(`✓ PNG: ${outputPath}`));
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

  return results;
}

/**
 * Build command - generate resume outputs
 */
export async function buildCommand(inputPath: string, options: BuildCommandOptions): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.blue('Loading resume...'));

  // Resolve input path
  const resolvedInput = resolve(inputPath);

  // Load and validate resume
  let resume = await loadResume(resolvedInput);
  console.log(chalk.green(`✓ Loaded resume for ${resume.meta.name}`));

  // Load and apply variant if specified
  let sectionOrder = undefined;
  if (options.variant) {
    const resolvedVariant = resolve(options.variant);
    console.log(chalk.blue(`Loading variant: ${resolvedVariant}...`));
    const variant = await loadVariant(resolvedVariant);
    resume = applyVariant(resume, variant);
    sectionOrder = variant.section_order;
    console.log(chalk.green('✓ Applied variant'));
  }

  // Normalize resume (always runs — converts tagged highlights, builds section order)
  const normalized = normalizeResume(resume, sectionOrder);

  // Determine output formats
  const formatStr = options.formats ?? 'pdf,docx,html';
  const formats = formatStr.split(',').map((f) => f.trim().toLowerCase()) as OutputFormat[];

  // Determine output directory and basename
  const inputBasename = basename(resolvedInput, extname(resolvedInput));
  const outputBasename = options.name ?? inputBasename;
  const outputDir = options.output ? resolve(options.output) : dirname(resolvedInput);

  // Ensure output directory exists
  await mkdir(outputDir, { recursive: true });

  // Check Pandoc availability if DOCX is requested
  if (formats.includes('docx')) {
    const hasPandoc = await checkPandoc();
    if (!hasPandoc) {
      console.log(chalk.yellow('⚠ Pandoc not installed - skipping DOCX generation'));
      console.log(chalk.dim('  Install from: https://pandoc.org/installing.html'));
      const docxIndex = formats.indexOf('docx');
      if (docxIndex > -1) formats.splice(docxIndex, 1);
    }
  }

  // Determine which themes to use
  let themesToBuild: string[];
  if (options.allThemes) {
    const availableThemes = await listThemes();
    themesToBuild = availableThemes.map((t) => t.name);
    console.log(
      chalk.blue(`Building for ${themesToBuild.length} themes: ${themesToBuild.join(', ')}`)
    );
  } else {
    themesToBuild = [options.theme];
  }

  // Generate for each theme
  const allResults: { format: string; path: string }[] = [];

  for (const themeName of themesToBuild) {
    const results = await generateForTheme(
      normalized,
      themeName,
      formats,
      outputDir,
      outputBasename,
      {
        debug: options.debug ?? false,
        includeThemeInName: options.allThemes ?? false,
      }
    );
    allResults.push(...results);
  }

  // For --all-themes, generate theme-independent formats once
  if (options.allThemes) {
    if (formats.includes('json')) {
      const jsonPath = `${outputDir}/${outputBasename}.json`;
      console.log(chalk.blue('Generating JSON...'));
      const json = JSON.stringify(normalized, null, 2);
      await writeFile(jsonPath, json, 'utf-8');
      allResults.push({ format: 'JSON', path: jsonPath });
      console.log(chalk.green(`✓ JSON: ${jsonPath}`));
    }
    if (formats.includes('md')) {
      const mdPath = `${outputDir}/${outputBasename}.md`;
      console.log(chalk.blue('Generating Markdown...'));
      const markdown = resumeToMarkdown(normalized);
      await writeFile(mdPath, markdown, 'utf-8');
      allResults.push({ format: 'Markdown', path: mdPath });
      console.log(chalk.green(`✓ Markdown: ${mdPath}`));
    }
  }

  // Clean up browser
  await closeBrowser();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  console.log(chalk.green(`✓ Generated ${allResults.length} file(s) in ${elapsed}s`));

  // Open first file if requested
  if (options.open) {
    const firstFile = allResults[0];
    if (firstFile) {
      console.log(chalk.blue(`Opening ${firstFile.path}...`));
      openFile(firstFile.path);
    }
  }
}
