/**
 * Check command — analyze resume for ATS compatibility.
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import chalk from 'chalk';
import { loadResume, loadVariant, applyVariant, isCoverLetterFormat } from '../lib/index.js';
import { analyzeResume } from '../lib/ats.js';
import type {
  AtsResult,
  AtsFinding,
  AtsKeywordAnalysis,
} from '../types/ats.js';

export interface CheckCommandOptions {
  job?: string;
  variant?: string;
  json?: boolean;
}

export async function checkCommand(
  inputPath: string,
  options: CheckCommandOptions
): Promise<void> {
  const resolvedInput = resolve(inputPath);

  // Detect cover letters early — ATS analysis is not applicable
  const raw = await readFile(resolvedInput, 'utf-8');
  const parsed = parseYaml(raw);
  if (isCoverLetterFormat(parsed)) {
    console.log('');
    console.log(
      chalk.blue('ATS analysis is not applicable to cover letters.')
    );
    console.log(
      chalk.dim('Use `vitae validate` to check cover letter schema.')
    );
    return;
  }

  let resume = await loadResume(resolvedInput);

  if (options.variant) {
    const variant = await loadVariant(resolve(options.variant));
    resume = applyVariant(resume, variant);
  }

  let jobDescription: string | undefined;
  if (options.job) {
    jobDescription = await readFile(resolve(options.job), 'utf-8');
  }

  const result = analyzeResume(resume, jobDescription ? { jobDescription } : {});

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  renderResult(result);

  if (result.score < 60) {
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function scoreColor(score: number): (text: string) => string {
  if (score >= 80) return chalk.green;
  if (score >= 60) return chalk.yellow;
  return chalk.red;
}

function severityIcon(severity: AtsFinding['severity']): string {
  switch (severity) {
    case 'error':
      return chalk.red('\u2717');
    case 'warning':
      return chalk.yellow('!');
    case 'suggestion':
      return chalk.blue('~');
  }
}

function renderBar(score: number): string {
  const filled = Math.round(score / 5);
  const empty = 20 - filled;
  const colorFn = scoreColor(score);
  return colorFn('\u2588'.repeat(filled)) + chalk.dim('\u2591'.repeat(empty));
}

function renderResult(result: AtsResult): void {
  const colorFn = scoreColor(result.score);
  console.log('');
  console.log(colorFn(`  ATS Compatibility Score: ${result.score}/100`));
  console.log('');

  // Category breakdown
  console.log(chalk.bold('  Category Breakdown:'));
  console.log('');
  for (const cat of result.categories) {
    const catColor = scoreColor(cat.score);
    const bar = renderBar(cat.score);
    console.log(
      `    ${cat.label.padEnd(20)} ${catColor(String(cat.score).padStart(3))}/100  ${bar}`
    );
  }
  console.log('');

  // Findings by severity
  const errors = result.findings.filter((f) => f.severity === 'error');
  const warnings = result.findings.filter((f) => f.severity === 'warning');
  const suggestions = result.findings.filter((f) => f.severity === 'suggestion');

  if (errors.length > 0) {
    console.log(chalk.red.bold('  Issues:'));
    for (const f of errors) {
      console.log(`    ${severityIcon(f.severity)} ${f.message}`);
    }
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(chalk.yellow.bold('  Warnings:'));
    for (const f of warnings) {
      console.log(`    ${severityIcon(f.severity)} ${f.message}`);
    }
    console.log('');
  }

  if (suggestions.length > 0) {
    console.log(chalk.blue.bold('  Suggestions:'));
    for (const f of suggestions) {
      console.log(`    ${severityIcon(f.severity)} ${f.message}`);
    }
    console.log('');
  }

  if (result.findings.length === 0) {
    console.log(chalk.green('  No issues found.'));
    console.log('');
  }

  // Keyword analysis
  if (result.keywords) {
    renderKeywordAnalysis(result.keywords);
  }
}

function renderKeywordAnalysis(keywords: AtsKeywordAnalysis): void {
  console.log(chalk.bold('  Keyword Match Analysis:'));
  const colorFn = scoreColor(keywords.matchPercentage);
  console.log(
    `    Match rate: ${colorFn(`${keywords.matchPercentage}%`)} (${keywords.matchedCount}/${keywords.totalKeywords} keywords)`
  );
  console.log('');

  const missing = keywords.keywords.filter((k) => !k.found);
  const found = keywords.keywords.filter((k) => k.found);

  if (found.length > 0) {
    console.log(chalk.green('    Matched keywords:'));
    for (const k of found.slice(0, 20)) {
      console.log(
        chalk.green(`      \u2713 ${k.keyword}`) +
          chalk.dim(` (${k.foundIn.join(', ')})`)
      );
    }
    if (found.length > 20) {
      console.log(chalk.dim(`      ... and ${found.length - 20} more`));
    }
    console.log('');
  }

  if (missing.length > 0) {
    console.log(chalk.red('    Missing keywords:'));
    for (const k of missing.slice(0, 20)) {
      console.log(chalk.red(`      \u2717 ${k.keyword}`));
    }
    if (missing.length > 20) {
      console.log(chalk.dim(`      ... and ${missing.length - 20} more`));
    }
    console.log('');
  }
}
