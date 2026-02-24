/**
 * Suggest command — AI-powered content improvement suggestions.
 */

import { resolve } from 'path';
import chalk from 'chalk';
import { loadResume, loadVariant, applyVariant } from '../lib/index.js';
import { generateSuggestions } from '../lib/suggest.js';
import type { LlmProvider, SuggestResult, SectionSuggestions, SuggestionCategory } from '../types/suggest.js';

export interface SuggestCommandOptions {
  section?: string;
  variant?: string;
  provider?: string;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  json?: boolean;
}

export async function suggestCommand(
  inputPath: string,
  options: SuggestCommandOptions,
): Promise<void> {
  const resolvedInput = resolve(inputPath);

  let resume = await loadResume(resolvedInput);

  if (options.variant) {
    const variant = await loadVariant(resolve(options.variant));
    resume = applyVariant(resume, variant);
  }

  console.log(chalk.dim('  Analyzing resume content...'));

  const result = await generateSuggestions(resume, {
    ...(options.section ? { section: options.section } : {}),
    ...(options.provider ? { provider: options.provider as LlmProvider } : {}),
    ...(options.model ? { model: options.model } : {}),
    ...(options.apiKey ? { apiKey: options.apiKey } : {}),
    ...(options.baseUrl ? { baseUrl: options.baseUrl } : {}),
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  renderResult(result);
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

function categoryLabel(category: SuggestionCategory): string {
  switch (category) {
    case 'action-verb':
      return 'Stronger action verb';
    case 'quantify':
      return 'Add metrics';
    case 'impact':
      return 'Strengthen impact';
    case 'conciseness':
      return 'More concise';
    case 'clarity':
      return 'Improve clarity';
    case 'keyword':
      return 'Add keywords';
    case 'general':
      return 'Improvement';
  }
}

function renderResult(result: SuggestResult): void {
  console.log('');

  if (result.totalSuggestions === 0) {
    console.log(chalk.green('  No suggestions — your resume content looks strong!'));
    console.log('');
    return;
  }

  const count = result.totalSuggestions;
  const via = `${result.provider}/${result.model}`;
  console.log(
    chalk.bold(`  AI Content Suggestions`) +
      chalk.dim(` (${count} suggestion${count !== 1 ? 's' : ''} via ${via})`),
  );
  console.log('');

  for (const section of result.sections) {
    renderSection(section);
  }
}

function renderSection(section: SectionSuggestions): void {
  console.log(chalk.bold.blue(`  ${section.label}`));

  for (const sug of section.suggestions) {
    const label = categoryLabel(sug.category);
    console.log(
      `    ${chalk.yellow('~')} ${chalk.yellow(label)}: ${chalk.dim('"')}${sug.current}${chalk.dim('"')} ${chalk.dim('\u2192')} ${chalk.dim('"')}${chalk.green(sug.suggested)}${chalk.dim('"')}`,
    );
    if (sug.reasoning) {
      console.log(chalk.dim(`      ${sug.reasoning}`));
    }
  }

  console.log('');
}
