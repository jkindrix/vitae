import { readFile, writeFile } from 'fs/promises';
import { resolve, basename, extname } from 'path';
import chalk from 'chalk';
import {
  loadResume,
  loadVariant,
  applyVariant,
  analyzeTailoring,
  generateVariant,
  serializeVariantWithComments,
} from '../lib/index.js';
import type { TailorAnalysis } from '../types/index.js';

export interface TailorCommandOptions {
  job: string;
  output?: string;
  variant?: string;
  json?: boolean;
  reportOnly?: boolean;
}

export async function tailorCommand(
  inputPath: string,
  options: TailorCommandOptions
): Promise<void> {
  const resolvedInput = resolve(inputPath);
  const resolvedJob = resolve(options.job);

  // Load resume
  console.log(chalk.blue('Loading resume...'));
  let resume = await loadResume(resolvedInput);
  console.log(chalk.green(`\u2713 Loaded resume for ${resume.meta.name}`));

  // Apply existing variant if specified
  if (options.variant) {
    const resolvedVariant = resolve(options.variant);
    console.log(chalk.blue(`Applying variant: ${resolvedVariant}...`));
    const variant = await loadVariant(resolvedVariant);
    resume = applyVariant(resume, variant);
    console.log(chalk.green('\u2713 Applied variant'));
  }

  // Read job description
  console.log(chalk.blue('Reading job description...'));
  const jobDescription = await readFile(resolvedJob, 'utf-8');
  if (jobDescription.trim().length === 0) {
    throw new Error('Job description file is empty');
  }
  console.log(chalk.green('\u2713 Loaded job description'));

  // Analyze
  console.log(chalk.blue('Analyzing resume against job description...'));
  const analysis = analyzeTailoring(resume, jobDescription);

  // JSON output mode
  if (options.json) {
    console.log(JSON.stringify(analysis, null, 2));
    return;
  }

  // Render console report
  renderReport(analysis);

  // Generate variant file
  if (!options.reportOnly) {
    const variant = generateVariant(analysis);
    const jobBasename = basename(resolvedJob, extname(resolvedJob));
    const outputPath = options.output
      ? resolve(options.output)
      : resolve(`${jobBasename}.variant.yaml`);

    const yamlContent = serializeVariantWithComments(variant, analysis, basename(resolvedJob));
    await writeFile(outputPath, yamlContent, 'utf-8');

    console.log(chalk.green(`\u2713 Generated variant: ${outputPath}`));
    console.log('');
    console.log(
      chalk.dim(
        `  Use with: vitae build ${basename(resolvedInput)} --variant ${basename(outputPath)}`
      )
    );
    console.log('');
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

function renderBar(score: number, width = 20): string {
  const filled = Math.round((score / 100) * width);
  const empty = width - filled;
  const colorFn = scoreColor(score);
  return colorFn('\u2588'.repeat(filled)) + chalk.dim('\u2591'.repeat(empty));
}

function renderReport(analysis: TailorAnalysis): void {
  const colorFn = scoreColor(analysis.matchPercentage);
  console.log('');
  console.log(
    colorFn(
      `  Keyword Match: ${analysis.matchPercentage}% (${analysis.matchedKeywords.length}/${analysis.keywords.length} keywords)`
    )
  );
  console.log('');

  // Section relevance
  if (analysis.sectionRelevance.length > 0) {
    console.log(chalk.bold('  Section Relevance:'));
    console.log('');
    const maxCount = Math.max(...analysis.sectionRelevance.map((s) => s.matchCount), 1);
    for (const sr of analysis.sectionRelevance) {
      const pct = Math.round((sr.matchCount / maxCount) * 100);
      const bar = renderBar(pct, 20);
      const countStr = `${sr.matchCount} ${sr.matchCount === 1 ? 'match' : 'matches'}`;
      console.log(`    ${sr.section.padEnd(18)} ${countStr.padStart(12)}  ${bar}`);
    }
    console.log('');
  }

  // Skill category relevance
  if (analysis.skillRelevance.length > 0) {
    console.log(chalk.bold('  Skill Category Relevance:'));
    console.log('');
    const maxCount = Math.max(...analysis.skillRelevance.map((s) => s.matchCount), 1);
    for (const sr of analysis.skillRelevance) {
      const pct = Math.round((sr.matchCount / maxCount) * 100);
      const bar = renderBar(pct, 20);
      const countStr = `${sr.matchCount} ${sr.matchCount === 1 ? 'match' : 'matches'}`;
      console.log(`    ${sr.category.padEnd(18)} ${countStr.padStart(12)}  ${bar}`);
    }
    console.log('');
  }

  // Missing keywords
  if (analysis.missingKeywords.length > 0) {
    console.log(chalk.red.bold('  Missing Keywords:'));
    for (const kw of analysis.missingKeywords.slice(0, 15)) {
      console.log(chalk.red(`    \u2717 ${kw}`));
    }
    if (analysis.missingKeywords.length > 15) {
      console.log(chalk.dim(`    ... and ${analysis.missingKeywords.length - 15} more`));
    }
    console.log('');
  }

  // Summary recommendations
  const rec = analysis.summaryRecommendation;
  if (rec.missingKeywords.length > 0) {
    console.log(chalk.bold('  Summary Recommendations:'));
    const topMissing = rec.missingKeywords.slice(0, 10);
    console.log(chalk.yellow(`    Add to your summary: ${topMissing.join(', ')}`));
    if (rec.presentKeywords.length > 0) {
      console.log(chalk.green(`    Already in summary: ${rec.presentKeywords.join(', ')}`));
    }
    console.log('');
  }

  // High match celebration
  if (analysis.matchPercentage >= 90) {
    console.log(
      chalk.green('  \u2713 Your resume is already well-tailored to this job description!')
    );
    console.log('');
  }
}
