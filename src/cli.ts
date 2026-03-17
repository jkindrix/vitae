#!/usr/bin/env node

import { createRequire } from 'module';
import { Command } from 'commander';
import chalk from 'chalk';

const require = createRequire(import.meta.url);
const pkg = require('../package.json') as { version: string };
import {
  buildCommand,
  importCommand,
  exportCommand,
  checkCommand,
  tailorCommand,
  auditCommand,
  suggestCommand,
  initCommand,
  themesCommand,
  validateCommand,
  previewCommand,
  deployCommand,
} from './commands/index.js';

const program = new Command();

program.name('vitae').description('Beautiful resume generator from YAML').version(pkg.version);

// Build command
program
  .command('build')
  .description('Generate resume outputs (PDF, DOCX, HTML, Markdown, PNG)')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-t, --theme <name>', 'Theme to use', 'minimal')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory)')
  .option('-n, --name <prefix>', 'Output filename prefix (defaults to input filename)')
  .option(
    '-f, --formats <formats>',
    'Comma-separated output formats: pdf,docx,html,json,md,png',
    'pdf,docx,html'
  )
  .option('-a, --all-themes', 'Generate outputs for all available themes')
  .option('--open', 'Open the first generated file after build')
  .option('-d, --debug', 'Enable debug mode with verbose logging and intermediate files')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option('-w, --watch', 'Watch for changes and rebuild automatically')
  .option('-l, --layout <name>', 'Theme layout preset name')
  .option('--fit', 'Auto-scale PDF to fit target page count')
  .option('--pages <count>', 'Target page count for PDF (default: 1)', parseInt)
  .option('--no-page-warn', 'Suppress page count warnings')
  .action(async (input: string, options) => {
    try {
      await buildCommand(input, {
        ...options,
        noPageWarn: options.pageWarn === false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Import command
program
  .command('import')
  .description('Convert other resume formats to Vitae YAML')
  .argument('<input>', 'Path to input file (JSON Resume format)')
  .option('-o, --output <path>', 'Output file path (defaults to <input>.vitae.yaml)')
  .option('--format <format>', 'Input format: json-resume, auto (default: auto)', 'auto')
  .action(async (input: string, options) => {
    try {
      await importCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Export command
program
  .command('export')
  .description('Convert Vitae YAML to other resume formats (e.g., JSON Resume)')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-o, --output <path>', 'Output file path (defaults to <input>.resume.json)')
  .option(
    '--format <format>',
    'Output format: json-resume (or json) (default: json-resume)',
    'json-resume'
  )
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .action(async (input: string, options) => {
    try {
      await exportCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Init command
program
  .command('init')
  .description('Create a new resume.yaml or cover-letter.yaml file')
  .option(
    '-o, --output <path>',
    'Output file path (defaults to resume.yaml or cover-letter.yaml in current directory)'
  )
  .option('--force', 'Overwrite existing file')
  .option('-i, --interactive', 'Build resume interactively with prompts')
  .option('-c, --cover-letter', 'Create a cover letter template instead of a resume')
  .action(async (options) => {
    try {
      await initCommand(options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Themes command
program
  .command('themes')
  .description('List available themes')
  .option('--json', 'Output results as JSON')
  .action(async (options) => {
    try {
      await themesCommand({ json: options.json });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Validate command
program
  .command('validate')
  .description('Validate a resume.yaml file')
  .argument('<input>', 'Path to resume.yaml file')
  .option('--json', 'Output results as JSON')
  .action(async (input: string, options) => {
    try {
      await validateCommand(input, { json: options.json });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Check command (ATS compatibility)
program
  .command('check')
  .alias('ats')
  .description('Analyze resume for ATS (Applicant Tracking System) compatibility')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-j, --job <file>', 'Path to job description text file for keyword matching')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option('--json', 'Output results as JSON')
  .action(async (input: string, options) => {
    try {
      await checkCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Tailor command (job description tailoring)
program
  .command('tailor')
  .description('Generate a tailored variant from a job description')
  .argument('<input>', 'Path to resume.yaml file')
  .requiredOption('-j, --job <file>', 'Path to job description text file')
  .option('-o, --output <path>', 'Output path for the generated variant YAML')
  .option('-v, --variant <path>', 'Apply an existing variant before tailoring')
  .option('--json', 'Output analysis as JSON')
  .option('--report-only', 'Print analysis report without generating a variant file')
  .action(async (input: string, options) => {
    try {
      await tailorCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Audit command (Accessibility)
program
  .command('audit')
  .description('Audit rendered HTML output for WCAG accessibility compliance')
  .argument('<input>', 'Path to resume.yaml or cover-letter.yaml file')
  .option('-t, --theme <name>', 'Theme to audit against', 'minimal')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option('--level <level>', 'WCAG conformance level: AA or AAA', 'AA')
  .option('-l, --layout <name>', 'Theme layout preset name')
  .option('--json', 'Output results as JSON')
  .action(async (input: string, options) => {
    try {
      await auditCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Suggest command (AI content assistant)
program
  .command('suggest')
  .description('Get AI-powered suggestions for improving resume content')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-s, --section <name>', 'Focus on a specific section (summary, experience, skills, etc.)')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option(
    '--provider <name>',
    'LLM provider: openai, anthropic, ollama (auto-detected from env vars if omitted)'
  )
  .option(
    '--model <name>',
    'LLM model to use (defaults: gpt-4o-mini, claude-sonnet-4-5, llama3.2)'
  )
  .option('--base-url <url>', 'Custom API base URL (for Ollama or proxies)')
  .option('--json', 'Output results as JSON')
  .action(async (input: string, options) => {
    try {
      await suggestCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Preview command
program
  .command('preview')
  .description('Start a local server to preview the resume')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-t, --theme <name>', 'Theme to use', 'minimal')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option('-l, --layout <name>', 'Theme layout preset name')
  .action(async (input: string, options) => {
    try {
      await previewCommand(input, {
        theme: options.theme,
        port: parseInt(options.port, 10),
        variant: options.variant,
        layout: options.layout,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy resume as a GitHub Pages site')
  .argument('<input>', 'Path to resume.yaml or cover-letter.yaml file')
  .option('-t, --theme <name>', 'Theme to use', 'minimal')
  .option('-v, --variant <path>', 'Path to variant YAML file for role-specific filtering')
  .option('-l, --layout <name>', 'Theme layout preset name')
  .option('-b, --branch <name>', 'Deploy branch name', 'gh-pages')
  .option('-r, --remote <name>', 'Git remote name', 'origin')
  .option('-m, --message <msg>', 'Commit message', 'Deploy resume via Vitae')
  .option('--cname <domain>', 'Custom domain (creates CNAME file)')
  .option('--dry-run', 'Show what would be deployed without pushing')
  .option('--force', 'Allow force-push to protected branches (main/master)')
  .action(async (input: string, options) => {
    try {
      await deployCommand(input, {
        theme: options.theme,
        variant: options.variant,
        layout: options.layout,
        branch: options.branch,
        remote: options.remote,
        message: options.message,
        cname: options.cname,
        dryRun: options.dryRun,
        force: options.force,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

program.parse();
