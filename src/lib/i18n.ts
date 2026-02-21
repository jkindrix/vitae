import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LocaleLabels {
  summary: string;
  skills: string;
  experience: string;
  projects: string;
  education: string;
  certifications: string;
  languages: string;
  awards: string;
  publications: string;
  volunteer: string;
  references: string;
  contact: string;
  profile: string;
}

export interface LocaleMonths {
  full: string[];
  short: string[];
}

export interface LocaleKeywords {
  present: string;
}

export interface Locale {
  code: string;
  labels: LocaleLabels;
  months: LocaleMonths;
  keywords: LocaleKeywords;
}

// ---------------------------------------------------------------------------
// Locale loading with cache
// ---------------------------------------------------------------------------

const localeCache = new Map<string, Locale>();

function localesDir(): string {
  return join(__dirname, '../../locales');
}

function loadLocaleFromDisk(code: string): Locale | undefined {
  try {
    const filePath = join(localesDir(), `${code}.json`);
    const raw = readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as Locale;
  } catch {
    return undefined;
  }
}

/**
 * Get a locale by language code. Falls back to English if the code is not
 * found. Returns an empty-labels locale when called with `undefined` (the
 * default when `language` is not set in resume.yaml) — callers should treat
 * empty labels as "use theme default".
 */
export function getLocale(code?: string): Locale {
  if (code === undefined) {
    return getEmptyLocale();
  }

  // Normalize: take base language code (e.g., 'fr' from 'fr-FR')
  const base = code.split('-')[0]!.toLowerCase();

  const cached = localeCache.get(base);
  if (cached) return cached;

  const locale = loadLocaleFromDisk(base);
  if (locale) {
    localeCache.set(base, locale);
    return locale;
  }

  // Fallback to English
  const en = loadLocaleFromDisk('en');
  if (en) {
    localeCache.set(base, en);
    return en;
  }

  // Absolute fallback: hardcoded English (should never happen)
  const fallback = getHardcodedEnglish();
  localeCache.set(base, fallback);
  return fallback;
}

/**
 * Get the label for a given section name. Returns the localized label
 * or `undefined` if the locale has no label for that section (callers
 * should fall back to the theme's hardcoded heading).
 */
export function getSectionLabel(
  locale: Locale,
  section: string,
): string | undefined {
  return (locale.labels as unknown as Record<string, string>)[section];
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getEmptyLocale(): Locale {
  return {
    code: '',
    labels: {} as LocaleLabels,
    months: { full: [], short: [] },
    keywords: { present: '' },
  };
}

function getHardcodedEnglish(): Locale {
  return {
    code: 'en',
    labels: {
      summary: 'Summary',
      skills: 'Skills',
      experience: 'Experience',
      projects: 'Projects',
      education: 'Education',
      certifications: 'Certifications',
      languages: 'Languages',
      awards: 'Awards',
      publications: 'Publications',
      volunteer: 'Volunteer',
      references: 'References',
      contact: 'Contact',
      profile: 'Profile',
    },
    months: {
      full: [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ],
      short: [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ],
    },
    keywords: { present: 'Present' },
  };
}
