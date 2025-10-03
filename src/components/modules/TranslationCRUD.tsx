import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { translationService, TranslationGroup } from '../../services/translationService';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { db } from '../../services/database';
import { useI18nStore } from '../../stores/useI18nStore';
import { 
  ArrowLeftIcon,
  LanguageIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface TranslationEditorProps {
  translation: TranslationGroup;
  onSave: (key: string, translations: Record<string, string>) => void;
  onCancel: () => void;
}

const TranslationEditor = ({ translation, onSave, onCancel }: TranslationEditorProps) => {
  const { t } = useI18nStore();
  const [translations, setTranslations] = useState<Record<string, string>>(translation.translations);
  const [category, setCategory] = useState(translation.category);
  const [description, setDescription] = useState(translation.description || '');

  const languages = translationService.getSupportedLanguages();

  const handleSave = () => {
    onSave(translation.key, translations);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {t('translation.editTitle', { key: translation.key })}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('translation.category')}
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('translation.description')}
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('translation.translations')}
          </label>
          <div className="space-y-3">
            {languages.map(lang => (
              <div key={lang} className="flex items-center space-x-3">
                <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang.toUpperCase()}
                </div>
                <input
                  type="text"
                  value={translations[lang] || ''}
                  onChange={(e) => setTranslations(prev => ({ ...prev, [lang]: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder={t('translation.placeholder', { lang })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
{t('common.save')}
        </button>
      </div>
    </div>
  );
};

interface TranslationRowProps {
  translation: TranslationGroup;
  onEdit: (translation: TranslationGroup) => void;
  onDelete: (key: string) => void;
}

const TranslationRow = ({ translation, onEdit, onDelete }: TranslationRowProps) => {
  const { t } = useI18nStore();
  const languages = translationService.getSupportedLanguages();
  const [showPreview, setShowPreview] = useState(false);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
              {translation.category}
            </span>
            <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
              {translation.key}
            </span>
          </div>
          {translation.description && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {translation.description}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            title={t('translation.togglePreview')}
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onEdit(translation)}
            className="p-2 text-blue-600 hover:text-blue-800 dark:hover:text-blue-400"
            title={t('common.edit')}
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(translation.key)}
            className="p-2 text-red-600 hover:text-red-800 dark:hover:text-red-400"
            title={t('common.delete')}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      
      {showPreview && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {languages.map(lang => (
              <div key={lang} className="text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {lang.toUpperCase()}:
                </span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {translation.translations[lang] || 'Not translated'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const TranslationCRUD = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t } = useI18nStore();
  
  // State
  const [translations, setTranslations] = useState<TranslationGroup[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  // UI state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTranslation, setEditingTranslation] = useState<TranslationGroup | null>(null);
  const [newTranslation, setNewTranslation] = useState({
    key: '',
    category: 'common',
    description: '',
    translations: {} as Record<string, string>
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await translationService.initializeTables();
      
      const [translationsData, categoriesData] = await Promise.all([
        translationService.getAllTranslations(),
        translationService.getCategories()
      ]);
      
      setTranslations(translationsData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading translations:', error);
      toast.error(t('translation.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddTranslation = async () => {
    if (!newTranslation.key.trim()) {
      toast.error(t('translation.keyRequired'));
      return;
    }

    try {
      // Create translation key
      const keyResult = await translationService.upsertTranslationKey(
        newTranslation.key,
        newTranslation.category,
        newTranslation.description
      );

      if (!keyResult.success || !keyResult.keyId) {
        toast.error(keyResult.error || 'Failed to create translation key');
        return;
      }

      // Add translations for each language
      for (const [language, value] of Object.entries(newTranslation.translations)) {
        if (value.trim()) {
          await translationService.upsertTranslation(keyResult.keyId, language, value);
        }
      }

      toast.success(t('translation.addedSuccess'));
      setShowAddForm(false);
      setNewTranslation({ key: '', category: 'common', description: '', translations: {} });
      await loadData();
    } catch (error) {
      console.error('Error adding translation:', error);
      toast.error(t('translation.addError'));
    }
  };

  const handleEditTranslation = async (key: string, translations: Record<string, string>) => {
    try {
      // Get the key ID
      const keyResult = await db.queryOne('SELECT id FROM translation_keys WHERE key = ?', [key]);
      if (!keyResult) {
        toast.error(t('translation.keyNotFound'));
        return;
      }

      // Update translations for each language
      for (const [language, value] of Object.entries(translations)) {
        if (value.trim()) {
          await translationService.upsertTranslation(keyResult.id, language, value);
        } else {
          await translationService.deleteTranslation(keyResult.id, language);
        }
      }

      toast.success(t('translation.updatedSuccess'));
      setEditingTranslation(null);
      await loadData();
    } catch (error) {
      console.error('Error updating translation:', error);
      toast.error(t('translation.updateError'));
    }
  };

  const handleDeleteTranslation = async (key: string) => {
    if (!window.confirm(t('translation.confirmDelete', { key }))) {
      return;
    }

    try {
      const result = await translationService.deleteTranslationKey(key);
      if (result.success) {
        toast.success(t('translation.deletedSuccess'));
        await loadData();
      } else {
        toast.error(result.error || t('translation.deleteError'));
      }
    } catch (error) {
      console.error('Error deleting translation:', error);
      toast.error(t('translation.deleteError'));
    }
  };

  const handleExport = async () => {
    try {
      const result = await translationService.exportTranslations();
      if (result.success && result.data) {
        const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'translations.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        toast.success(t('translation.exportSuccess'));
      } else {
        toast.error(result.error || t('translation.exportError'));
      }
    } catch (error) {
      console.error('Error exporting translations:', error);
      toast.error(t('translation.exportError'));
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await translationService.importTranslations(data);
      if (result.success) {
        toast.success(t('translation.importSuccess'));
        await loadData();
      } else {
        toast.error(result.error || t('translation.importError'));
      }
    } catch (error) {
      console.error('Error importing translations:', error);
      toast.error(t('translation.importError'));
    }
  };

  // Filter translations
  const filteredTranslations = translations.filter(translation => {
    const matchesSearch = translation.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         translation.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || translation.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          {canGoBack() && (
            <button
              onClick={() => {
                const previousModule = goBack();
                if (previousModule) {
                  navigationService.navigateTo(previousModule);
                }
              }}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title={t('ui.back')}
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <LanguageIcon className="h-8 w-8 mr-3 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('translation.title')}
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {t('translation.subtitle')}
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t('translation.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="">{t('translation.allCategories')}</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <PlusIcon className="h-4 w-4 mr-1" />
              {t('translation.addTranslation')}
            </button>
            <button
              onClick={handleExport}
              className="flex items-center px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              Export
            </button>
            <label className="flex items-center px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
              <DocumentArrowUpIcon className="h-4 w-4 mr-1" />
              Import
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Add Translation Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Add New Translation
          </h3>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Translation Key
                </label>
                <input
                  type="text"
                  value={newTranslation.key}
                  onChange={(e) => setNewTranslation(prev => ({ ...prev, key: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="e.g., common.save"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={newTranslation.category}
                  onChange={(e) => setNewTranslation(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <input
                type="text"
                value={newTranslation.description}
                onChange={(e) => setNewTranslation(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder={t('translation.optionalDescription')}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Translations
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {translationService.getSupportedLanguages().map(lang => (
                  <div key={lang} className="flex items-center space-x-3">
                    <div className="w-16 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {lang.toUpperCase()}
                    </div>
                    <input
                      type="text"
                      value={newTranslation.translations[lang] || ''}
                      onChange={(e) => setNewTranslation(prev => ({
                        ...prev,
                        translations: { ...prev.translations, [lang]: e.target.value }
                      }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      placeholder={`Translation for ${lang}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleAddTranslation}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              {t('translation.addTranslation')}
            </button>
          </div>
        </div>
      )}

      {/* Edit Translation Modal */}
      {editingTranslation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <TranslationEditor
              translation={editingTranslation}
              onSave={handleEditTranslation}
              onCancel={() => setEditingTranslation(null)}
            />
          </div>
        </div>
      )}

      {/* Translations List */}
      <div className="space-y-4">
        {filteredTranslations.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <LanguageIcon className="h-12 w-12 mx-auto mb-2" />
              <p>{t('translation.noTranslations')}</p>
              <p className="text-sm">{t('translation.getStarted')}</p>
            </div>
          </div>
        ) : (
          filteredTranslations.map(translation => (
            <TranslationRow
              key={translation.key}
              translation={translation}
              onEdit={setEditingTranslation}
              onDelete={handleDeleteTranslation}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default TranslationCRUD;
