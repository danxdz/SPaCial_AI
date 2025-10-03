import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '../services/database';
import { useUserStore } from './useUserStore';

export type Theme = 'light' | 'dark' | 'auto';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

interface AccessibilitySettings {
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
  focusVisible: boolean;
  keyboardNavigation: boolean;
}

interface ThemeState {
  theme: Theme;
  colorBlindMode: ColorBlindMode;
  sidebarCollapsed: boolean;
  sidebarAlwaysVisible: boolean;
  accessibility: AccessibilitySettings;
  setTheme: (theme: Theme) => Promise<void>;
  setColorBlindMode: (mode: ColorBlindMode) => Promise<void>;
  setSidebarCollapsed: (collapsed: boolean) => Promise<void>;
  setSidebarAlwaysVisible: (visible: boolean) => Promise<void>;
  setAccessibilitySetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => Promise<void>;
  toggleAccessibilitySetting: (key: keyof AccessibilitySettings) => Promise<void>;
  toggleTheme: () => Promise<void>;
  loadUserPreferences: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      colorBlindMode: 'none',
      sidebarCollapsed: false,
      sidebarAlwaysVisible: false,
      accessibility: {
        highContrast: false,
        largeText: false,
        reducedMotion: false,
        focusVisible: true,
        keyboardNavigation: true,
      },
      
      setTheme: async (theme) => {
        set({ theme });
        applyTheme(theme);
        await saveThemePreference('theme', theme);
      },
      
      setColorBlindMode: async (mode) => {
        set({ colorBlindMode: mode });
        applyColorBlindMode(mode);
        await saveThemePreference('colorBlindMode', mode);
      },
      
      setSidebarCollapsed: async (collapsed) => {
        set({ sidebarCollapsed: collapsed });
        await saveThemePreference('sidebarCollapsed', collapsed.toString());
      },
      
      setSidebarAlwaysVisible: async (visible) => {
        set({ sidebarAlwaysVisible: visible });
        await saveThemePreference('sidebarAlwaysVisible', visible.toString());
      },
      
      setAccessibilitySetting: async (key, value) => {
        set((state) => ({
          accessibility: { ...state.accessibility, [key]: value }
        }));
        applyAccessibilitySettings({ ...get().accessibility, [key]: value });
        await saveThemePreference(`accessibility.${key}`, value.toString());
      },
      
      toggleAccessibilitySetting: async (key) => {
        const currentValue = get().accessibility[key];
        const newValue = !currentValue;
        await get().setAccessibilitySetting(key, newValue);
      },
      
      toggleTheme: async () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        set({ theme: newTheme });
        applyTheme(newTheme);
        await saveThemePreference('theme', newTheme);
      },

      loadUserPreferences: async () => {
        try {
          const { currentUser } = useUserStore.getState();
          if (!currentUser) return;

          const settings = await db.getAllUserSettings(currentUser.id);
          
          if (settings.theme) {
            set({ theme: settings.theme as Theme });
            applyTheme(settings.theme as Theme);
          }
          
          if (settings.colorBlindMode) {
            set({ colorBlindMode: settings.colorBlindMode as ColorBlindMode });
            applyColorBlindMode(settings.colorBlindMode as ColorBlindMode);
          }
          
          if (settings.sidebarCollapsed) {
            set({ sidebarCollapsed: settings.sidebarCollapsed === 'true' });
          }
          
          if (settings.sidebarAlwaysVisible) {
            set({ sidebarAlwaysVisible: settings.sidebarAlwaysVisible === 'true' });
          }
          
          // Load accessibility settings
          const accessibilitySettings = {
            highContrast: settings['accessibility.highContrast'] === 'true',
            largeText: settings['accessibility.largeText'] === 'true',
            reducedMotion: settings['accessibility.reducedMotion'] === 'true',
            focusVisible: settings['accessibility.focusVisible'] !== 'false', // default true
            keyboardNavigation: settings['accessibility.keyboardNavigation'] !== 'false', // default true
          };
          
          set({ accessibility: accessibilitySettings });
          applyAccessibilitySettings(accessibilitySettings);
        } catch (error) {
          console.error('Error loading user preferences:', error);
        }
      },
    }),
    {
      name: 'theme-storage',
      // Only persist basic theme settings, user-specific ones go to database
      partialize: (state) => ({
        theme: state.theme,
        colorBlindMode: state.colorBlindMode,
        accessibility: state.accessibility,
      }),
    }
  )
);

// Helper function to save theme preferences to database
async function saveThemePreference(key: string, value: string): Promise<void> {
  try {
    const { currentUser } = useUserStore.getState();
    if (!currentUser) return;

    await db.setUserSetting(currentUser.id, key, value);
  } catch (error) {
    console.error('Error saving theme preference:', error);
  }
}

// Apply theme to document
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  if (theme === 'auto') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', theme === 'dark');
  }
}

// Apply color blind mode
function applyColorBlindMode(mode: ColorBlindMode) {
  const root = document.documentElement;
  
  // Remove existing color blind classes
  root.classList.remove('protanopia', 'deuteranopia', 'tritanopia');
  
  if (mode !== 'none') {
    root.classList.add(mode);
  }
}

// Apply accessibility settings
function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;
  
  // High contrast mode
  root.classList.toggle('high-contrast', settings.highContrast);
  
  // Large text mode
  root.classList.toggle('large-text', settings.largeText);
  
  // Reduced motion
  root.classList.toggle('reduced-motion', settings.reducedMotion);
  
  // Focus visible
  root.classList.toggle('focus-visible', settings.focusVisible);
  
  // Keyboard navigation
  root.classList.toggle('keyboard-navigation', settings.keyboardNavigation);
  
  // Apply CSS custom properties for dynamic styling
  root.style.setProperty('--accessibility-high-contrast', settings.highContrast ? '1' : '0');
  root.style.setProperty('--accessibility-large-text', settings.largeText ? '1.25' : '1');
  root.style.setProperty('--accessibility-reduced-motion', settings.reducedMotion ? '0' : '1');
}

// Initialize theme on load
if (typeof window !== 'undefined') {
  const store = useThemeStore.getState();
  applyTheme(store.theme);
  applyColorBlindMode(store.colorBlindMode);
  applyAccessibilitySettings(store.accessibility);
}
