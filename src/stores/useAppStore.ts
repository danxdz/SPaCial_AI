import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'en' | 'fr' | 'es';
  defaultSigmaLevel: number;
  autoSave: boolean;
  notifications: {
    browser: boolean;
    violations: boolean;
  };
  keyboardShortcuts: Record<string, string>;
}

interface AppState {
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Preferences
  preferences: UserPreferences;
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  defaultSigmaLevel: 3,
  autoSave: true,
  notifications: {
    browser: true,
    violations: true,
  },
  keyboardShortcuts: {
    'ctrl+n': 'new-process',
    'ctrl+s': 'save',
    'ctrl+o': 'open',
    'ctrl+e': 'export',
  },
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      isLoading: false,
      error: null,
      preferences: defaultPreferences,

      // UI actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      updatePreferences: (preferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },
    }),
    {
      name: 'spc-app-store',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);