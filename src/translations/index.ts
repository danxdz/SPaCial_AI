// Dynamic language loading - automatically imports all language files
import { en } from './en';
import { fr } from './fr';
import { es } from './es';
import { de } from './de';
import { it } from './it';
import { pt } from './pt';
import { zh } from './zh';
import { ja } from './ja';
import { ru } from './ru';

// Export individual languages
export { en, fr, es, de, it, pt, zh, ja, ru };

// Combined translations object
export const translations = {
  en,
  fr,
  es,
  de,
  it,
  pt,
  zh,
  ja,
  ru,
};

// Export available language codes for dynamic loading
export const availableLanguages = Object.keys(translations) as Array<keyof typeof translations>;

// Helper function to get language name
export const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    en: 'English',
    fr: 'Français',
    es: 'Español',
    de: 'Deutsch',
    it: 'Italiano',
    pt: 'Português',
    zh: '中文',
    ja: '日本語',
    ru: 'Русский',
  };
  return names[code] || code.toUpperCase();
};
