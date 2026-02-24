import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve, basename, extname } from 'path';
import { exec } from 'child_process';
import { platform } from 'os';
import { watch, type FSWatcher } from 'fs';
import chalk from 'chalk';
import {
  loadVariant,
  loadDocument,
  applyVariant,
  normalizeResume,
  renderStandaloneHtml,
  renderCoverLetterStandaloneHtml,
  coverLetterToMarkdown,
  generatePdf,
  generatePng,
  generatePdfFromHtml,
  generatePngFromHtml,
  generateDocx,
  generateCoverLetterDocx,
  closeBrowser,
  listThemes,
  resumeToMarkdown,
} from '../lib/index.js';
import type { OutputFormat, NormalizedResume, CoverLetter } from '../types/index.js';

export interface BuildCommandOptions {
  theme: string;
  output?: string;
  name?: string;
  formats?: string;
  allThemes?: boolean;
  open?: boolean;
  debug?: boolean;
  variant?: string;
  watch?: boolean;
  layout?: string;
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
      console.log(chalk.yellow(`\u26A0 Could not open file: ${error.message}`));
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
  options: { debug?: boolean; includeThemeInName?: boolean; layout?: string }
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
          const renderOpts = options.layout ? { variant: options.layout } : undefined;
          const html = await renderStandaloneHtml(resume, themeName, renderOpts);
          await writeFile(outputPath, html, 'utf-8');
          results.push({ format: 'HTML', path: outputPath });
          console.log(chalk.green(`\u2713 HTML: ${outputPath}`));
          break;
        }

        case 'pdf': {
          console.log(
            chalk.blue(`Generating PDF${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const pdfOptions = {
            ...(options.debug
              ? {
                  debug: true,
                  saveHtml: outputPath.replace('.pdf', '-debug.html'),
                  screenshot: outputPath.replace('.pdf', '-debug.png'),
                }
              : {}),
            ...(options.layout ? { layout: options.layout } : {}),
          };
          await generatePdf(resume, themeName, outputPath, pdfOptions);
          results.push({ format: 'PDF', path: outputPath });
          console.log(chalk.green(`\u2713 PDF: ${outputPath}`));
          break;
        }

        case 'docx': {
          console.log(
            chalk.blue(`Generating DOCX${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          await generateDocx(resume, themeName, outputPath);
          results.push({ format: 'DOCX', path: outputPath });
          console.log(chalk.green(`\u2713 DOCX: ${outputPath}`));
          break;
        }

        case 'json': {
          // JSON output is theme-independent, only generate once
          if (!options.includeThemeInName) {
            console.log(chalk.blue(`Generating JSON...`));
            const json = JSON.stringify(resume, null, 2);
            await writeFile(outputPath, json, 'utf-8');
            results.push({ format: 'JSON', path: outputPath });
            console.log(chalk.green(`\u2713 JSON: ${outputPath}`));
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
            console.log(chalk.green(`\u2713 Markdown: ${outputPath}`));
          }
          break;
        }

        case 'png': {
          console.log(
            chalk.blue(`Generating PNG${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const pngOptions = {
            ...(options.debug ? { debug: true } : {}),
            ...(options.layout ? { layout: options.layout } : {}),
          };
          await generatePng(resume, themeName, outputPath, pngOptions);
          results.push({ format: 'PNG', path: outputPath });
          console.log(chalk.green(`\u2713 PNG: ${outputPath}`));
          break;
        }

        default:
          console.log(chalk.yellow(`\u26A0 Unknown format: ${format}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\u2717 Failed to generate ${format}: ${message}`));
    }
  }

  return results;
}

/**
 * Generate cover letter outputs for a single theme
 */
async function generateCoverLetterForTheme(
  coverLetter: CoverLetter,
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
          const html = await renderCoverLetterStandaloneHtml(coverLetter, themeName);
          await writeFile(outputPath, html, 'utf-8');
          results.push({ format: 'HTML', path: outputPath });
          console.log(chalk.green(`\u2713 HTML: ${outputPath}`));
          break;
        }

        case 'pdf': {
          console.log(
            chalk.blue(`Generating PDF${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const html = await renderCoverLetterStandaloneHtml(coverLetter, themeName);
          const pdfOptions = options.debug
            ? {
                debug: true,
                saveHtml: outputPath.replace('.pdf', '-debug.html'),
                screenshot: outputPath.replace('.pdf', '-debug.png'),
              }
            : {};
          await generatePdfFromHtml(html, outputPath, pdfOptions);
          results.push({ format: 'PDF', path: outputPath });
          console.log(chalk.green(`\u2713 PDF: ${outputPath}`));
          break;
        }

        case 'png': {
          console.log(
            chalk.blue(`Generating PNG${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          const html = await renderCoverLetterStandaloneHtml(coverLetter, themeName);
          const pngOptions = options.debug ? { debug: true } : {};
          await generatePngFromHtml(html, outputPath, pngOptions);
          results.push({ format: 'PNG', path: outputPath });
          console.log(chalk.green(`\u2713 PNG: ${outputPath}`));
          break;
        }

        case 'md': {
          if (!options.includeThemeInName) {
            console.log(chalk.blue(`Generating Markdown...`));
            const markdown = coverLetterToMarkdown(coverLetter);
            await writeFile(outputPath, markdown, 'utf-8');
            results.push({ format: 'Markdown', path: outputPath });
            console.log(chalk.green(`\u2713 Markdown: ${outputPath}`));
          }
          break;
        }

        case 'json': {
          if (!options.includeThemeInName) {
            console.log(chalk.blue(`Generating JSON...`));
            const json = JSON.stringify(coverLetter, null, 2);
            await writeFile(outputPath, json, 'utf-8');
            results.push({ format: 'JSON', path: outputPath });
            console.log(chalk.green(`\u2713 JSON: ${outputPath}`));
          }
          break;
        }

        case 'docx': {
          console.log(
            chalk.blue(`Generating DOCX${options.includeThemeInName ? ` (${themeName})` : ''}...`)
          );
          await generateCoverLetterDocx(coverLetter, outputPath);
          results.push({ format: 'DOCX', path: outputPath });
          console.log(chalk.green(`\u2713 DOCX: ${outputPath}`));
          break;
        }

        default:
          console.log(chalk.yellow(`\u26A0 Unknown format: ${format}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(chalk.red(`\u2717 Failed to generate ${format}: ${message}`));
    }
  }

  return results;
}

/**
 * Core build logic — load, normalize, generate outputs
 */
async function runBuild(inputPath: string, options: BuildCommandOptions): Promise<void> {
  const startTime = Date.now();

  console.log(chalk.blue('Loading document...'));

  // Resolve input path
  const resolvedInput = resolve(inputPath);

  // Auto-detect document type
  const document = await loadDocument(resolvedInput);

  if (document.type === 'cover-letter') {
    // Cover letter build path
    const coverLetter = document.coverLetter;
    console.log(chalk.green(`\u2713 Loaded cover letter for ${coverLetter.meta.name}`));

    // Determine output formats (cover letters default to pdf,html)
    const formatStr = options.formats ?? 'pdf,html';
    const formats = formatStr.split(',').map((f) => f.trim().toLowerCase()) as OutputFormat[];

    // Determine output directory and basename
    const inputBasename = basename(resolvedInput, extname(resolvedInput));
    const outputBasename = options.name ?? inputBasename;
    const outputDir = options.output ? resolve(options.output) : dirname(resolvedInput);

    await mkdir(outputDir, { recursive: true });

    // Determine themes
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

    const allResults: { format: string; path: string }[] = [];

    for (const themeName of themesToBuild) {
      const results = await generateCoverLetterForTheme(
        coverLetter,
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
        const json = JSON.stringify(coverLetter, null, 2);
        await writeFile(jsonPath, json, 'utf-8');
        allResults.push({ format: 'JSON', path: jsonPath });
        console.log(chalk.green(`\u2713 JSON: ${jsonPath}`));
      }
      if (formats.includes('md')) {
        const mdPath = `${outputDir}/${outputBasename}.md`;
        console.log(chalk.blue('Generating Markdown...'));
        const markdown = coverLetterToMarkdown(coverLetter);
        await writeFile(mdPath, markdown, 'utf-8');
        allResults.push({ format: 'Markdown', path: mdPath });
        console.log(chalk.green(`\u2713 Markdown: ${mdPath}`));
      }
    }

    await closeBrowser();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('');
    if (allResults.length === 0) {
      console.log(chalk.red(`\u2717 Build failed — no files generated`));
      throw new Error('Build produced no output files');
    }
    console.log(chalk.green(`\u2713 Generated ${allResults.length} file(s) in ${elapsed}s`));

    if (options.open && !options.watch) {
      const firstFile = allResults[0];
      if (firstFile) {
        console.log(chalk.blue(`Opening ${firstFile.path}...`));
        openFile(firstFile.path);
      }
    }
    return;
  }

  // Resume build path
  let resume = document.resume;
  console.log(chalk.green(`\u2713 Loaded resume for ${resume.meta.name}`));

  // Load and apply variant if specified
  let sectionOrder = undefined;
  if (options.variant) {
    const resolvedVariant = resolve(options.variant);
    console.log(chalk.blue(`Loading variant: ${resolvedVariant}...`));
    const variant = await loadVariant(resolvedVariant);
    resume = applyVariant(resume, variant);
    sectionOrder = variant.section_order;
    console.log(chalk.green('\u2713 Applied variant'));
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
        ...(options.layout ? { layout: options.layout } : {}),
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
      console.log(chalk.green(`\u2713 JSON: ${jsonPath}`));
    }
    if (formats.includes('md')) {
      const mdPath = `${outputDir}/${outputBasename}.md`;
      console.log(chalk.blue('Generating Markdown...'));
      const markdown = resumeToMarkdown(normalized);
      await writeFile(mdPath, markdown, 'utf-8');
      allResults.push({ format: 'Markdown', path: mdPath });
      console.log(chalk.green(`\u2713 Markdown: ${mdPath}`));
    }
  }

  // Clean up browser
  await closeBrowser();

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('');
  if (allResults.length === 0) {
    console.log(chalk.red(`\u2717 Build failed — no files generated`));
    throw new Error('Build produced no output files');
  }
  console.log(chalk.green(`\u2713 Generated ${allResults.length} file(s) in ${elapsed}s`));

  // Open first file if requested (only on first build, not in watch mode)
  if (options.open && !options.watch) {
    const firstFile = allResults[0];
    if (firstFile) {
      console.log(chalk.blue(`Opening ${firstFile.path}...`));
      openFile(firstFile.path);
    }
  }
}

/**
 * Build command - generate resume outputs, optionally watching for changes
 */
export async function buildCommand(inputPath: string, options: BuildCommandOptions): Promise<void> {
  // Initial build
  await runBuild(inputPath, options);

  // If not watching, we're done
  if (!options.watch) return;

  // Watch mode
  const resolvedInput = resolve(inputPath);
  const watchers: FSWatcher[] = [];
  let debounceTimer: NodeJS.Timeout | null = null;
  let building = false;

  console.log('');
  console.log(chalk.blue('Watch mode enabled. Watching for changes...'));
  console.log(chalk.dim('Press Ctrl+C to stop'));
  console.log('');

  const handleChange = (): void => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      if (building) return;
      building = true;
      console.log(
        chalk.dim(`[${new Date().toLocaleTimeString()}] File changed, rebuilding...`)
      );
      console.log('');
      try {
        await runBuild(inputPath, options);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`Build failed: ${msg}`));
      }
      building = false;
      console.log('');
      console.log(chalk.dim('Watching for changes...'));
    }, 100);
  };

  // Watch resume directory for YAML changes
  const resumeWatcher = watch(dirname(resolvedInput), (_eventType, filename) => {
    if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
      handleChange();
    }
  });
  watchers.push(resumeWatcher);

  // Watch variant directory if different from resume directory
  if (options.variant) {
    const resolvedVariant = resolve(options.variant);
    const variantDir = dirname(resolvedVariant);
    if (variantDir !== dirname(resolvedInput)) {
      const variantWatcher = watch(variantDir, (_eventType, filename) => {
        if (filename?.endsWith('.yaml') || filename?.endsWith('.yml')) {
          handleChange();
        }
      });
      watchers.push(variantWatcher);
    }
  }

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('');
    console.log(chalk.blue('Stopping watch mode...'));
    for (const w of watchers) {
      w.close();
    }
    process.exit(0);
  });

  // Keep process alive
  await new Promise<never>(() => {});
}
