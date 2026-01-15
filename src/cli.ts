#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import {
  buildCommand,
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
  .description('Generate resume outputs (PDF, DOCX, HTML)')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-t, --theme <name>', 'Theme to use', 'minimal')
  .option('-o, --output <dir>', 'Output directory (defaults to input directory)')
  .option('-n, --name <prefix>', 'Output filename prefix (defaults to input filename)')
  .option(
    '-f, --formats <formats>',
    'Comma-separated output formats: pdf,docx,html,json',
    'pdf,docx,html'
  )
  .option('-a, --all-themes', 'Generate outputs for all available themes')
  .option('--open', 'Open the first generated file after build')
  .option('-d, --debug', 'Enable debug mode with verbose logging and intermediate files')
  .action(async (input: string, options) => {
    try {
      await buildCommand(input, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

// Init command
program
  .command('init')
  .description('Create a new resume.yaml file')
  .option('-f, --force', 'Overwrite existing file')
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

// Preview command
program
  .command('preview')
  .description('Start a local server to preview the resume')
  .argument('<input>', 'Path to resume.yaml file')
  .option('-t, --theme <name>', 'Theme to use', 'minimal')
  .option('-p, --port <number>', 'Port to run on', '3000')
  .action(async (input: string, options) => {
    try {
      await previewCommand(input, {
        theme: options.theme,
        port: parseInt(options.port, 10),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(chalk.red(`Error: ${message}`));
      process.exitCode = 1;
    }
  });

program.parse();
