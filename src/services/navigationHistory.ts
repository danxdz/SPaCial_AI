import { create } from 'zustand';

interface NavigationHistoryState {
  history: string[];
  currentIndex: number;
  push: (module: string) => void;
  goBack: () => string | null;
  canGoBack: () => boolean;
  clear: () => void;
  getCurrentModule: () => string | null;
  getPreviousModule: () => string | null;
  setCurrentIndex: (index: number) => void;
}

export const useNavigationHistory = create<NavigationHistoryState>((set, get) => ({
  history: [],
  currentIndex: -1,

  push: (module: string) => {
    const { history, currentIndex } = get();
    
    // Remove any modules after current index (when navigating from middle of history)
    const newHistory = history.slice(0, currentIndex + 1);
    
    // Add new module
    newHistory.push(module);
    
    set({
      history: newHistory,
      currentIndex: newHistory.length - 1
    });
  },

  goBack: () => {
    const { history, currentIndex } = get();
    
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const previousModule = history[newIndex];
      
      set({ currentIndex: newIndex });
      return previousModule;
    }
    
    return null;
  },

  canGoBack: () => {
    const { currentIndex } = get();
    return currentIndex > 0;
  },

  clear: () => {
    set({
      history: [],
      currentIndex: -1
    });
  },

  getCurrentModule: () => {
    const { history, currentIndex } = get();
    return currentIndex >= 0 ? history[currentIndex] : null;
  },

  getPreviousModule: () => {
    const { history, currentIndex } = get();
    return currentIndex > 0 ? history[currentIndex - 1] : null;
  },

  setCurrentIndex: (index: number) => {
    set({ currentIndex: index });
  }
}));
