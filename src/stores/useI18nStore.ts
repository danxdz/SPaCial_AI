import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { translationService } from '../services/translationService';
import { translations, availableLanguages, getLanguageName } from '../translations';

// Dynamic language type based on available languages
export type Language = typeof availableLanguages[number];

interface I18nState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
  translations: Record<string, Record<string, string>>;
  loadTranslations: () => Promise<void>;
  getAvailableLanguages: () => Language[];
  getLanguageName: (code: string) => string;
}

// Translations are now imported from separate files

// Initialize with hardcoded translations immediately
const initialTranslations: Record<string, Record<string, string>> = {};
for (const lang of availableLanguages) {
  initialTranslations[lang] = translations[lang] as Record<string, string> || translations.en as Record<string, string>;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      language: 'en',
      translations: initialTranslations, // Start with hardcoded translations
      
      // Initialize translations immediately
      loadTranslations: async () => {
        try {
          console.log('Loading translations...');
          
          // First, load all hardcoded translations
          const allTranslations: Record<string, Record<string, string>> = {};
          
          for (const lang of availableLanguages) {
            allTranslations[lang] = translations[lang] as Record<string, string> || translations.en as Record<string, string>;
          }
          
          console.log('Hardcoded translations loaded for languages:', Object.keys(allTranslations));
          
          // Then try to load database translations as overrides
          try {
            await translationService.initializeTables();
            
            for (const lang of availableLanguages) {
              try {
                const dbTranslations = await translationService.getTranslationsForLanguage(lang);
                
                // Merge database translations as overrides
                allTranslations[lang] = {
                  ...allTranslations[lang],
                  ...dbTranslations
                };
                
                console.log(`Database translations loaded for ${lang}:`, Object.keys(dbTranslations).length, 'keys');
              } catch (error) {
                console.warn(`Failed to load database translations for ${lang}:`, error);
                // Keep hardcoded translations
              }
            }
          } catch (error) {
            console.warn('Failed to initialize translation tables, using hardcoded translations only:', error);
          }
          
          set({ translations: allTranslations });
          console.log('All translations loaded successfully');
        } catch (error) {
          console.error('Error loading translations:', error);
          // Fallback to hardcoded translations for all languages
          const fallbackTranslations: Record<string, Record<string, string>> = {};
          for (const lang of availableLanguages) {
            fallbackTranslations[lang] = translations[lang] as Record<string, string> || translations.en as Record<string, string>;
          }
          set({ translations: fallbackTranslations });
        }
      },
      
      setLanguage: async (language) => {
        set({ language });
        document.documentElement.lang = language;
        // No need to reload translations since we load all languages at once
      },
      
      t: (key, params = {}) => {
        const { language, translations: storeTranslations } = get();
        
        // Try store translations first
        let translation = storeTranslations[language]?.[key];
        
        if (!translation) {
          // Try hardcoded translations for current language
          translation = (translations[language] as Record<string, string>)?.[key];
        }
        
        if (!translation) {
          // Try English fallback
          translation = (translations.en as Record<string, string>)[key];
        }
        
        if (!translation) {
          // Last resort: return the key itself
          console.warn(`Translation key not found: ${key} for language: ${language}. Available keys:`, Object.keys(storeTranslations[language] || {}).slice(0, 10));
          translation = key;
        }
        
        // Replace parameters in translation
        return Object.keys(params).reduce((str, param) => {
          return str.replace(`{${param}}`, params[param]);
        }, translation);
      },
      
      getAvailableLanguages: () => availableLanguages,
      getLanguageName: (code: string) => getLanguageName(code),
    }),
    {
      name: 'i18n-storage',
    }
  )
);
