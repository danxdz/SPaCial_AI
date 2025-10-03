import { useState } from 'react';
import { useThemeStore, Theme, ColorBlindMode } from '../../stores/useThemeStore';
import { useI18nStore, Language } from '../../stores/useI18nStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const { theme, colorBlindMode, accessibility, setTheme, setColorBlindMode, setAccessibilitySetting } = useThemeStore();
  const { language, setLanguage, t } = useI18nStore();
  const [activeTab, setActiveTab] = useState<'appearance' | 'language' | 'accessibility'>('appearance');

  if (!isOpen) return null;

  const languages: { value: Language; label: string; flag: string }[] = [
    { value: 'en', label: 'English', flag: '🇺🇸' },
    { value: 'fr', label: 'Français', flag: '🇫🇷' },
    { value: 'es', label: 'Español', flag: '🇪🇸' },
    { value: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { value: 'it', label: 'Italiano', flag: '🇮🇹' },
    { value: 'pt', label: 'Português', flag: '🇵🇹' },
    { value: 'zh', label: '中文', flag: '🇨🇳' },
    { value: 'ja', label: '日本語', flag: '🇯🇵' },
  ];

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: t('settings.lightTheme'), icon: '☀️' },
    { value: 'dark', label: t('settings.darkTheme'), icon: '🌙' },
    { value: 'auto', label: t('settings.autoTheme'), icon: '🔄' },
  ];

  const colorBlindModes: { value: ColorBlindMode; label: string; description: string }[] = [
    { value: 'none', label: t('settings.noColorBlind'), description: 'Normal vision' },
    { value: 'protanopia', label: t('settings.protanopia'), description: 'Red-green color blindness (red-weak)' },
    { value: 'deuteranopia', label: t('settings.deuteranopia'), description: 'Red-green color blindness (green-weak)' },
    { value: 'tritanopia', label: t('settings.tritanopia'), description: 'Blue-yellow color blindness' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'appearance', label: t('settings.theme'), icon: '🎨' },
            { id: 'language', label: t('settings.language'), icon: '🌐' },
            { id: 'accessibility', label: t('settings.accessibility'), icon: '♿' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'appearance' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {t('settings.theme')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {themes.map((themeOption) => (
                    <button
                      key={themeOption.value}
                      onClick={() => setTheme(themeOption.value)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        theme === themeOption.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="text-2xl mb-2">{themeOption.icon}</div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {themeOption.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'language' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {t('settings.language')}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {languages.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLanguage(lang.value)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        language === lang.value
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{lang.flag}</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {lang.label}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'accessibility' && (
            <div className="space-y-6">
              {/* Visual Accessibility */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Visual Accessibility
                </h3>
                <div className="space-y-4">
                  {/* High Contrast Mode */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        High Contrast Mode
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Increases contrast for better visibility
                      </div>
                    </div>
                    <button
                      onClick={() => setAccessibilitySetting('highContrast', !accessibility.highContrast)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accessibility.highContrast ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accessibility.highContrast ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Large Text Mode */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Large Text Mode
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Increases text size by 25% for better readability
                      </div>
                    </div>
                    <button
                      onClick={() => setAccessibilitySetting('largeText', !accessibility.largeText)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accessibility.largeText ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accessibility.largeText ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Color Blind Mode */}
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Color Blind Support
                    </div>
                    <div className="space-y-2">
                      {colorBlindModes.map((mode) => (
                        <button
                          key={mode.value}
                          onClick={() => setColorBlindMode(mode.value)}
                          className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                            colorBlindMode === mode.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {mode.label}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {mode.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Interaction Accessibility */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Interaction Accessibility
                </h3>
                <div className="space-y-4">
                  {/* Reduced Motion */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Reduced Motion
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Disables animations and transitions
                      </div>
                    </div>
                    <button
                      onClick={() => setAccessibilitySetting('reducedMotion', !accessibility.reducedMotion)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accessibility.reducedMotion ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accessibility.reducedMotion ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Enhanced Focus */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Enhanced Focus Indicators
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Makes focus indicators more visible
                      </div>
                    </div>
                    <button
                      onClick={() => setAccessibilitySetting('focusVisible', !accessibility.focusVisible)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accessibility.focusVisible ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accessibility.focusVisible ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Navigation */}
                  <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        Enhanced Keyboard Navigation
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Improves keyboard navigation and touch targets
                      </div>
                    </div>
                    <button
                      onClick={() => setAccessibilitySetting('keyboardNavigation', !accessibility.keyboardNavigation)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        accessibility.keyboardNavigation ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          accessibility.keyboardNavigation ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Accessibility Tips */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  💡 Accessibility Tips
                </h4>
                <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• Use Tab to navigate between elements</li>
                  <li>• Press Enter or Space to activate buttons</li>
                  <li>• Use Escape to close modals and menus</li>
                  <li>• High contrast mode works with both light and dark themes</li>
                  <li>• Large text mode increases all text sizes proportionally</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
