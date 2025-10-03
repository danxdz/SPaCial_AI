import { db } from './database';
import { logger } from './logger';
import { availableLanguages } from '../translations';

export interface TranslationKey {
  id: number;
  key: string;
  category: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Translation {
  id: number;
  key_id: number;
  language: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface TranslationWithKey extends Translation {
  key: string;
  category: string;
  description?: string;
}

export interface TranslationGroup {
  key: string;
  category: string;
  description?: string;
  translations: Record<string, string>;
}

class TranslationService {
  private readonly SUPPORTED_LANGUAGES = availableLanguages;

  // Initialize translation tables
  async initializeTables(): Promise<void> {
    try {
      // Create translation_keys table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS translation_keys (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key TEXT UNIQUE NOT NULL,
          category TEXT NOT NULL DEFAULT 'common',
          description TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create translations table
      await db.execute(`
        CREATE TABLE IF NOT EXISTS translations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          key_id INTEGER NOT NULL,
          language TEXT NOT NULL,
          value TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (key_id) REFERENCES translation_keys(id) ON DELETE CASCADE,
          UNIQUE(key_id, language)
        )
      `);

      // Migrate existing translations from i18n store
      await this.migrateExistingTranslations();

      logger.logDatabase('INIT', 'Translation tables initialized');
    } catch (error) {
      console.error('Error initializing translation tables:', error);
      throw error;
    }
  }

  // Migrate existing translations from the i18n store
  private async migrateExistingTranslations(): Promise<void> {
    try {
      // Check if we already have translations
      const existingKeys = await db.queryAll('SELECT COUNT(*) as count FROM translation_keys');
      if (existingKeys[0]?.count > 0) {
        return; // Already migrated
      }

      // Add some sample translations for demonstration
      await this.addSampleTranslations();
      
      // No need to migrate hardcoded translations since they're now in separate files
      // The database will be used for custom translations only
      logger.logDatabase('MIGRATE', 'Translation tables ready for custom translations');
    } catch (error) {
      console.error('Error migrating translations:', error);
    }
  }

  // Add sample translations for demonstration
  private async addSampleTranslations(): Promise<void> {
    const sampleTranslations = [
      {
        key: 'welcome.message',
        category: 'common',
        description: 'Welcome message displayed to users',
        translations: {
          en: 'Welcome to our application!',
          fr: 'Bienvenue dans notre application !',
          es: '¡Bienvenido a nuestra aplicación!',
          de: 'Willkommen in unserer Anwendung!',
          it: 'Benvenuto nella nostra applicazione!',
          pt: 'Bem-vindo à nossa aplicação!',
          zh: '欢迎使用我们的应用程序！',
          ja: 'アプリケーションへようこそ！',
          ru: 'Добро пожаловать в наше приложение!'
        }
      },
      {
        key: 'error.network',
        category: 'errors',
        description: 'Network error message',
        translations: {
          en: 'Network connection error. Please check your internet connection.',
          fr: 'Erreur de connexion réseau. Veuillez vérifier votre connexion internet.',
          es: 'Error de conexión de red. Por favor verifique su conexión a internet.',
          de: 'Netzwerkverbindungsfehler. Bitte überprüfen Sie Ihre Internetverbindung.',
          it: 'Errore di connessione di rete. Si prega di controllare la connessione internet.',
          pt: 'Erro de conexão de rede. Por favor verifique sua conexão com a internet.',
          zh: '网络连接错误。请检查您的互联网连接。',
          ja: 'ネットワーク接続エラー。インターネット接続を確認してください。',
          ru: 'Ошибка сетевого подключения. Пожалуйста, проверьте ваше интернет-соединение.'
        }
      },
      {
        key: 'button.save',
        category: 'buttons',
        description: 'Save button text',
        translations: {
          en: 'Save',
          fr: 'Enregistrer',
          es: 'Guardar',
          de: 'Speichern',
          it: 'Salva',
          pt: 'Salvar',
          zh: '保存',
          ja: '保存',
          ru: 'Сохранить'
        }
      },
      {
        key: 'button.cancel',
        category: 'buttons',
        description: 'Cancel button text',
        translations: {
          en: 'Cancel',
          fr: 'Annuler',
          es: 'Cancelar',
          de: 'Abbrechen',
          it: 'Annulla',
          pt: 'Cancelar',
          zh: '取消',
          ja: 'キャンセル',
          ru: 'Отмена'
        }
      },
      {
        key: 'status.loading',
        category: 'status',
        description: 'Loading status message',
        translations: {
          en: 'Loading...',
          fr: 'Chargement...',
          es: 'Cargando...',
          de: 'Laden...',
          it: 'Caricamento...',
          pt: 'Carregando...',
          zh: '加载中...',
          ja: '読み込み中...',
          ru: 'Загрузка...'
        }
      }
    ];

    for (const translation of sampleTranslations) {
      // Create translation key
      const keyResult = await this.upsertTranslationKey(translation.key, translation.category, translation.description);
      if (!keyResult.success || !keyResult.keyId) continue;

      // Insert translations for each language
      for (const [language, value] of Object.entries(translation.translations)) {
        await this.upsertTranslation(keyResult.keyId, language, value);
      }
    }
  }

  // Get all translation keys with their translations
  async getAllTranslations(): Promise<TranslationGroup[]> {
    try {
      const translations = await db.queryAll(`
        SELECT 
          tk.id as key_id,
          tk.key,
          tk.category,
          tk.description,
          t.language,
          t.value
        FROM translation_keys tk
        LEFT JOIN translations t ON tk.id = t.key_id
        ORDER BY tk.category, tk.key, t.language
      `);

      // Group by key
      const grouped: Record<string, TranslationGroup> = {};
      
      translations.forEach((row: any) => {
        if (!grouped[row.key]) {
          grouped[row.key] = {
            key: row.key,
            category: row.category,
            description: row.description,
            translations: {}
          };
        }
        
        if (row.language && row.value) {
          grouped[row.key].translations[row.language] = row.value;
        }
      });

      return Object.values(grouped);
    } catch (error) {
      console.error('Error getting translations:', error);
      return [];
    }
  }

  // Get translations for a specific language
  async getTranslationsForLanguage(language: string): Promise<Record<string, string>> {
    try {
      const translations = await db.queryAll(`
        SELECT tk.key, t.value
        FROM translation_keys tk
        LEFT JOIN translations t ON tk.id = t.key_id AND t.language = ?
        ORDER BY tk.key
      `, [language]);

      const result: Record<string, string> = {};
      translations.forEach((row: any) => {
        result[row.key] = row.value || row.key; // Fallback to key if no translation
      });

      return result;
    } catch (error) {
      console.error('Error getting translations for language:', error);
      return {};
    }
  }

  // Create or update a translation key
  async upsertTranslationKey(key: string, category: string, description?: string): Promise<{ success: boolean; keyId?: number; error?: string }> {
    try {
      // Check if key exists
      const existing = await db.queryOne('SELECT id FROM translation_keys WHERE key = ?', [key]);
      
      if (existing) {
        // Update existing key
        await db.execute(`
          UPDATE translation_keys 
          SET category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
          WHERE key = ?
        `, [category, description, key]);
        
        return { success: true, keyId: existing.id };
      } else {
        // Create new key
        await db.execute(`
          INSERT INTO translation_keys (key, category, description)
          VALUES (?, ?, ?)
        `, [key, category, description]);
        
        const newKey = await db.queryOne('SELECT id FROM translation_keys WHERE key = ?', [key]);
        return { success: true, keyId: newKey?.id };
      }
    } catch (error) {
      console.error('Error upserting translation key:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Create or update a translation
  async upsertTranslation(keyId: number, language: string, value: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.execute(`
        INSERT OR REPLACE INTO translations (key_id, language, value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [keyId, language, value]);
      
      return { success: true };
    } catch (error) {
      console.error('Error upserting translation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a translation key (and all its translations)
  async deleteTranslationKey(key: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.execute('DELETE FROM translation_keys WHERE key = ?', [key]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting translation key:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete a specific translation
  async deleteTranslation(keyId: number, language: string): Promise<{ success: boolean; error?: string }> {
    try {
      await db.execute('DELETE FROM translations WHERE key_id = ? AND language = ?', [keyId, language]);
      return { success: true };
    } catch (error) {
      console.error('Error deleting translation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get available categories
  async getCategories(): Promise<string[]> {
    try {
      const categories = await db.queryAll(`
        SELECT DISTINCT category 
        FROM translation_keys 
        ORDER BY category
      `);
      return categories.map((c: any) => c.category);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  // Get supported languages
  getSupportedLanguages(): string[] {
    return [...this.SUPPORTED_LANGUAGES];
  }

  // Export translations to JSON
  async exportTranslations(): Promise<{ success: boolean; data?: Record<string, Record<string, string>>; error?: string }> {
    try {
      const translations = await this.getAllTranslations();
      const result: Record<string, Record<string, string>> = {};
      
      translations.forEach(group => {
        if (!result[group.category]) {
          result[group.category] = {};
        }
        result[group.category][group.key] = group.translations;
      });
      
      return { success: true, data: result };
    } catch (error) {
      console.error('Error exporting translations:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Import translations from JSON
  async importTranslations(data: Record<string, Record<string, Record<string, string>>>): Promise<{ success: boolean; error?: string }> {
    try {
      for (const [category, keys] of Object.entries(data)) {
        for (const [key, translations] of Object.entries(keys)) {
          // Create/update translation key
          const keyResult = await this.upsertTranslationKey(key, category);
          if (!keyResult.success || !keyResult.keyId) continue;
          
          // Insert translations
          for (const [language, value] of Object.entries(translations)) {
            await this.upsertTranslation(keyResult.keyId, language, value);
          }
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error importing translations:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const translationService = new TranslationService();