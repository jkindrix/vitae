import chalk from 'chalk';
import { listThemes } from '../lib/index.js';

/**
 * Themes command - list available themes
 */
export async function themesCommand(): Promise<void> {
  console.log(chalk.blue('Available themes:'));
  console.log('');

  const themes = await listThemes();

  if (themes.length === 0) {
    console.log(chalk.yellow('  No themes found'));
    return;
  }

  for (const theme of themes) {
    const features: string[] = [];
    if (theme.hasTemplate) features.push('HTML');
    if (theme.hasStyles) features.push('CSS');
    if (theme.hasDocxReference) features.push('DOCX');

    console.log(`  ${chalk.green(theme.name)}`);
    console.log(chalk.dim(`    Supports: ${features.join(', ')}`));
    console.log(chalk.dim(`    Path: ${theme.path}`));
    console.log('');
  }
}
