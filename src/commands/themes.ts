import chalk from 'chalk';
import { listThemes, loadThemeConfig } from '../lib/index.js';

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
    const config = await loadThemeConfig(theme);

    console.log(`  ${chalk.green(theme.name)}`);

    // Show metadata from config if available
    if (config?.metadata?.description) {
      console.log(chalk.dim(`    ${config.metadata.description}`));
    }

    const metaParts: string[] = [];
    if (config?.metadata?.author) metaParts.push(`Author: ${config.metadata.author}`);
    if (config?.metadata?.version) metaParts.push(`Version: ${config.metadata.version}`);
    if (metaParts.length > 0) {
      console.log(chalk.dim(`    ${metaParts.join('  ')}`));
    }

    const features: string[] = [];
    if (theme.hasTemplate) features.push('HTML');
    if (theme.hasStyles) features.push('CSS');
    if (theme.hasDocxReference) features.push('DOCX');
    if (theme.hasCoverLetterTemplate) features.push('Cover Letter');
    if (theme.hasConfig) features.push('Plugin');
    console.log(chalk.dim(`    Supports: ${features.join(', ')}`));

    // Show layout variants if available
    if (config?.variants && config.variants.length > 0) {
      const variantNames = config.variants.map((v) => v.name);
      console.log(chalk.dim(`    Layouts: ${variantNames.join(', ')}`));
    }

    console.log(chalk.dim(`    Path: ${theme.path}`));
    console.log('');
  }
}
