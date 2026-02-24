import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname, resolve, relative } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { ThemeError } from './errors.js';
import type { Theme, ThemeConfig } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get the path to the themes directory
 */
export function getThemesDir(): string {
  // In development, themes are at project root
  // In published package, themes are in the package
  return join(__dirname, '../../themes');
}

/**
 * Check if a file exists
 */
async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load information about a specific theme
 */
export async function loadTheme(themeName: string): Promise<Theme> {
  const themesDir = getThemesDir();
  const themePath = join(themesDir, themeName);

  const exists = await fileExists(themePath);
  if (!exists) {
    throw ThemeError.notFound(themeName, themePath);
  }

  const hasTemplate = await fileExists(join(themePath, 'template.html'));
  const hasStyles = await fileExists(join(themePath, 'style.css'));
  const hasDocxReference = await fileExists(join(themePath, 'reference.docx'));
  const hasCoverLetterTemplate = await fileExists(join(themePath, 'cover-letter.html'));
  const hasConfig = await fileExists(join(themePath, 'theme.config.js'));

  if (!hasTemplate) {
    throw ThemeError.missingTemplate(themeName);
  }

  return {
    name: themeName,
    path: themePath,
    hasTemplate,
    hasStyles,
    hasDocxReference,
    hasCoverLetterTemplate,
    hasConfig,
  };
}

/**
 * List all available themes
 */
export async function listThemes(): Promise<Theme[]> {
  const themesDir = getThemesDir();
  const entries = await readdir(themesDir, { withFileTypes: true });

  const themes: Theme[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      try {
        const theme = await loadTheme(entry.name);
        themes.push(theme);
      } catch {
        // Skip invalid theme directories
      }
    }
  }

  return themes;
}

/**
 * Read a theme's template file
 */
export async function readTemplate(theme: Theme): Promise<string> {
  const templatePath = join(theme.path, 'template.html');
  return readFile(templatePath, 'utf-8');
}

/**
 * Read a theme's stylesheet
 */
export async function readStyles(theme: Theme): Promise<string | null> {
  if (!theme.hasStyles) return null;
  const stylePath = join(theme.path, 'style.css');
  return readFile(stylePath, 'utf-8');
}

/**
 * Get path to theme's DOCX reference file
 */
export function getDocxReferencePath(theme: Theme): string | null {
  if (!theme.hasDocxReference) return null;
  return join(theme.path, 'reference.docx');
}

/**
 * Read a theme's cover letter template file
 */
export async function readCoverLetterTemplate(theme: Theme): Promise<string> {
  if (!theme.hasCoverLetterTemplate) {
    throw new ThemeError(
      `Theme '${theme.name}' does not have a cover letter template (cover-letter.html)`,
      theme.name,
    );
  }
  const templatePath = join(theme.path, 'cover-letter.html');
  return readFile(templatePath, 'utf-8');
}

/**
 * Load a theme's configuration file (theme.config.js)
 * Returns null if the theme has no config file.
 */
export async function loadThemeConfig(theme: Theme): Promise<ThemeConfig | null> {
  if (!theme.hasConfig) return null;
  const configPath = join(theme.path, 'theme.config.js');
  const configUrl = pathToFileURL(configPath).href;
  // Bust Node module cache with mtime so config changes are picked up
  const { mtimeMs } = await stat(configPath);
  const mod = await import(`${configUrl}?v=${mtimeMs}`);
  return (mod.default ?? mod) as ThemeConfig;
}

/**
 * Read a variant template file from a theme directory.
 * The filename must resolve to a path within the theme directory.
 */
export async function readVariantTemplate(theme: Theme, filename: string): Promise<string> {
  const resolved = resolve(theme.path, filename);
  const rel = relative(theme.path, resolved);
  if (rel.startsWith('..') || resolve(theme.path, rel) !== resolved) {
    throw new ThemeError(
      `Variant template '${filename}' resolves outside theme directory`,
      theme.name,
    );
  }
  const exists = await fileExists(resolved);
  if (!exists) {
    throw new ThemeError(
      `Variant template '${filename}' not found in theme '${theme.name}'`,
      theme.name,
    );
  }
  return readFile(resolved, 'utf-8');
}
