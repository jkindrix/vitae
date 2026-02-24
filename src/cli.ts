#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
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
} from './commands/index.js';

const program = new Command();

program.name('vitae').description('Beautiful resume generator from YAML').version('0.1.0');

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
  .option('-l, --layout <name>', 'Theme layout variant to use')
  .action(async (input: string, options) => {
    try {
      await buildCommand(input, options);
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
  .option('--format <format>', 'Output format: json-resume (default: json-resume)', 'json-resume')
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
  .option('-f, --force', 'Overwrite existing file')
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
  .action(async () => {
    try {
      await themesCommand();
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
  .action(async (input: string) => {
    try {
      await validateCommand(input);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Check command (ATS compatibility)
program
  .command('check')
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
  .option('-l, --layout <name>', 'Theme layout variant to use')
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
  .option('--provider <name>', 'LLM provider: openai, anthropic, ollama')
  .option('--model <name>', 'LLM model to use')
  .option('--api-key <key>', 'API key (prefer env var for security)')
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
  .option('-l, --layout <name>', 'Theme layout variant to use')
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

program.parse();
