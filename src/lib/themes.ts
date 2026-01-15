import { readdir, readFile, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ThemeError } from './errors.js';
import type { Theme } from '../types/index.js';

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

  if (!hasTemplate) {
    throw ThemeError.missingTemplate(themeName);
  }

  return {
    name: themeName,
    path: themePath,
    hasTemplate,
    hasStyles,
    hasDocxReference,
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
