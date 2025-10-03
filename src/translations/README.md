# Translation System

This directory contains all language translations for the SPC application. The system is designed to be easily extensible - you can add new languages by simply creating a new file.

## How to Add a New Language

### Step 1: Create Language File
Create a new file `src/translations/[language-code].ts` (e.g., `src/translations/ru.ts` for Russian).

### Step 2: Export Language Object
Export a language object with the same structure as existing languages:

```typescript
// src/translations/ru.ts
export const ru = {
  // Common
  common: {
    save: 'Сохранить',
    cancel: 'Отменить',
    // ... other translations
  },
  
  // Navigation
  nav: {
    dashboard: 'Панель управления',
    // ... other navigation items
  },
  
  // ... other categories
};
```

### Step 3: Update Index File
Add the new language to `src/translations/index.ts`:

```typescript
// Import the new language
import { ru } from './ru';

// Export it individually
export { en, fr, es, de, it, pt, zh, ja, ru };

// Add to translations object
export const translations = {
  en,
  fr,
  es,
  de,
  it,
  pt,
  zh,
  ja,
  ru, // Add here
};

// Add to language names
export const getLanguageName = (code: string): string => {
  const names: Record<string, string> = {
    // ... existing languages
    ru: 'Русский', // Add here
  };
  return names[code] || code.toUpperCase();
};
```

### Step 4: That's It!
The language will automatically be available in the application. The system will:
- Automatically detect the new language
- Make it available in language selection dropdowns
- Load translations from the database or fall back to hardcoded translations

## Language File Structure

Each language file should follow this structure:

```typescript
export const [languageCode] = {
  // Common UI elements
  common: {
    save: 'Translation',
    cancel: 'Translation',
    // ...
  },
  
  // Navigation items
  nav: {
    dashboard: 'Translation',
    users: 'Translation',
    // ...
  },
  
  // Authentication
  auth: {
    login: 'Translation',
    logout: 'Translation',
    // ...
  },
  
  // Dashboard
  dashboard: {
    welcome: {
      guest: 'Translation',
      // ...
    },
    // ...
  },
  
  // UI Components
  ui: {
    home: 'Translation',
    back: 'Translation',
    // ...
  },
  
  // Translation CRUD
  translation: {
    title: 'Translation',
    // ...
  },
  
  // Add other categories as needed
};
```

## Translation Categories

- `common`: Common UI elements (buttons, actions, etc.)
- `nav`: Navigation menu items
- `auth`: Authentication related text
- `dashboard`: Dashboard specific text
- `ui`: General UI components
- `translation`: Translation management interface
- Add more categories as needed for specific modules

## Database Integration

The system supports both:
1. **Hardcoded translations**: Fallback translations in the language files
2. **Database translations**: Dynamic translations stored in the database (editable via Translation CRUD)

Database translations override hardcoded ones, allowing for easy customization without code changes.

## Best Practices

1. **Consistency**: Use the same key structure across all languages
2. **Completeness**: Ensure all keys from English are translated
3. **Context**: Provide meaningful translations that fit the context
4. **Testing**: Test the new language thoroughly in the application
5. **Documentation**: Update this README when adding new categories

## Example: Adding Spanish

1. Create `src/translations/es.ts`
2. Copy structure from `en.ts` and translate values
3. Add import and export to `index.ts`
4. Add language name to `getLanguageName` function
5. Test in application

The language will automatically appear in all language selection dropdowns throughout the application.
