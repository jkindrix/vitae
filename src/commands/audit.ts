/**
 * Audit command — analyze rendered HTML for WCAG accessibility compliance.
 */

import { resolve } from 'path';
import chalk from 'chalk';
import {
  loadDocument,
  loadVariant,
  applyVariant,
  normalizeResume,
  renderStandaloneHtml,
} from '../lib/index.js';
import { renderCoverLetterStandaloneHtml } from '../lib/cover-letter.js';
import { auditAccessibility } from '../lib/a11y.js';
import type { A11yResult, A11yFinding, A11yContrastPair } from '../types/a11y.js';

export interface AuditCommandOptions {
  theme?: string;
  variant?: string;
  level?: string;
  json?: boolean;
}

export async function auditCommand(
  inputPath: string,
  options: AuditCommandOptions
): Promise<void> {
  const resolvedInput = resolve(inputPath);
  const themeName = options.theme ?? 'minimal';
  const level = (options.level === 'AAA' ? 'AAA' : 'AA') as 'AA' | 'AAA';

  const document = await loadDocument(resolvedInput);

  let html: string;

  if (document.type === 'cover-letter') {
    html = await renderCoverLetterStandaloneHtml(document.coverLetter, themeName);
  } else {
    let resume = document.resume;
    if (options.variant) {
      const variant = await loadVariant(resolve(options.variant));
      resume = applyVariant(resume, variant);
    }
    const normalized = normalizeResume(resume);
    html = await renderStandaloneHtml(normalized, themeName);
  }

  const result = auditAccessibility(html, { level });

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

function severityIcon(severity: A11yFinding['severity']): string {
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

function renderResult(result: A11yResult): void {
  const colorFn = scoreColor(result.score);
  console.log('');
  console.log(colorFn(`  Accessibility Score: ${result.score}/100`));
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

  // Contrast pairs
  if (result.contrastPairs.length > 0) {
    renderContrastPairs(result.contrastPairs);
  }
}

function renderContrastPairs(pairs: A11yContrastPair[]): void {
  console.log(chalk.bold('  Color Contrast Details:'));
  console.log('');

  const passing = pairs.filter((p) => p.passes);
  const failing = pairs.filter((p) => !p.passes);

  if (passing.length > 0) {
    for (const p of passing) {
      console.log(
        chalk.green(`    \u2713 ${p.element}`) +
          chalk.dim(`: ${p.ratio}:1 (requires ${p.required}:1)`)
      );
    }
  }

  if (failing.length > 0) {
    for (const p of failing) {
      console.log(
        chalk.red(`    \u2717 ${p.element}`) +
          chalk.dim(`: ${p.ratio}:1 (requires ${p.required}:1) — ${p.foreground} on ${p.background}`)
      );
    }
  }

  console.log('');
}
