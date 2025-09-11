import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppState, ProcessData, Dashboard, UserPreferences, ChartConfig } from '../types/spc';

interface AppStore extends AppState {
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | undefined) => void;
  
  // Process management
  addProcess: (process: ProcessData) => void;
  updateProcess: (id: string, updates: Partial<ProcessData>) => void;
  deleteProcess: (id: string) => void;
  setCurrentProcess: (process: ProcessData | undefined) => void;
  
  // Dashboard management
  addDashboard: (dashboard: Dashboard) => void;
  updateDashboard: (id: string, updates: Partial<Dashboard>) => void;
  deleteDashboard: (id: string) => void;
  setCurrentDashboard: (dashboard: Dashboard | undefined) => void;
  
  // Preferences
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  
  // Data operations
  addDataPoint: (processId: string, dataPoint: any) => void;
  updateDataPoint: (processId: string, dataPointId: string, updates: any) => void;
  deleteDataPoint: (processId: string, dataPointId: string) => void;
  
  // Chart management
  createChart: (chartConfig: ChartConfig) => void;
  updateChart: (chartId: string, updates: Partial<ChartConfig>) => void;
  deleteChart: (chartId: string) => void;
}

const defaultPreferences: UserPreferences = {
  theme: 'system',
  language: 'en',
  defaultSigmaLevel: 3,
  chartColors: {
    dataPoint: '#3b82f6',
    centerLine: '#6b7280',
    controlLimits: '#ef4444',
    specificationLimits: '#f59e0b',
    outOfControl: '#dc2626',
    trendLine: '#8b5cf6',
  },
  autoSave: true,
  notifications: {
    email: false,
    browser: true,
    violations: true,
  },
  keyboardShortcuts: {
    'ctrl+n': 'new-process',
    'ctrl+s': 'save',
    'ctrl+o': 'open',
    'ctrl+e': 'export',
    'ctrl+d': 'dashboard',
  },
};

export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      processes: [],
      currentProcess: undefined,
      dashboards: [],
      currentDashboard: undefined,
      preferences: defaultPreferences,
      isLoading: false,
      error: undefined,
      
      // Actions
      setLoading: (loading) => set({ isLoading: loading }),
      setError: (error) => set({ error }),
      
      // Process management
      addProcess: (process) => set((state) => ({
        processes: [...state.processes, process],
        currentProcess: process,
      })),
      
      updateProcess: (id, updates) => set((state) => ({
        processes: state.processes.map(p => 
          p.id === id ? { ...p, ...updates, updatedAt: new Date() } : p
        ),
        currentProcess: state.currentProcess?.id === id 
          ? { ...state.currentProcess, ...updates, updatedAt: new Date() }
          : state.currentProcess,
      })),
      
      deleteProcess: (id) => set((state) => ({
        processes: state.processes.filter(p => p.id !== id),
        currentProcess: state.currentProcess?.id === id ? undefined : state.currentProcess,
      })),
      
      setCurrentProcess: (process) => set({ currentProcess: process }),
      
      // Dashboard management
      addDashboard: (dashboard) => set((state) => ({
        dashboards: [...state.dashboards, dashboard],
        currentDashboard: dashboard,
      })),
      
      updateDashboard: (id, updates) => set((state) => ({
        dashboards: state.dashboards.map(d => 
          d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d
        ),
        currentDashboard: state.currentDashboard?.id === id 
          ? { ...state.currentDashboard, ...updates, updatedAt: new Date() }
          : state.currentDashboard,
      })),
      
      deleteDashboard: (id) => set((state) => ({
        dashboards: state.dashboards.filter(d => d.id !== id),
        currentDashboard: state.currentDashboard?.id === id ? undefined : state.currentDashboard,
      })),
      
      setCurrentDashboard: (dashboard) => set({ currentDashboard: dashboard }),
      
      // Preferences
      updatePreferences: (preferences) => set((state) => ({
        preferences: { ...state.preferences, ...preferences },
      })),
      
      // Data operations
      addDataPoint: (processId, dataPoint) => set((state) => ({
        processes: state.processes.map(p => 
          p.id === processId 
            ? { 
                ...p, 
                dataPoints: [...p.dataPoints, { ...dataPoint, id: crypto.randomUUID() }],
                updatedAt: new Date()
              }
            : p
        ),
        currentProcess: state.currentProcess?.id === processId 
          ? {
              ...state.currentProcess,
              dataPoints: [...state.currentProcess.dataPoints, { ...dataPoint, id: crypto.randomUUID() }],
              updatedAt: new Date()
            }
          : state.currentProcess,
      })),
      
      updateDataPoint: (processId, dataPointId, updates) => set((state) => ({
        processes: state.processes.map(p => 
          p.id === processId 
            ? { 
                ...p, 
                dataPoints: p.dataPoints.map(dp => 
                  dp.id === dataPointId ? { ...dp, ...updates } : dp
                ),
                updatedAt: new Date()
              }
            : p
        ),
        currentProcess: state.currentProcess?.id === processId 
          ? {
              ...state.currentProcess,
              dataPoints: state.currentProcess.dataPoints.map(dp => 
                dp.id === dataPointId ? { ...dp, ...updates } : dp
              ),
              updatedAt: new Date()
            }
          : state.currentProcess,
      })),
      
      deleteDataPoint: (processId, dataPointId) => set((state) => ({
        processes: state.processes.map(p => 
          p.id === processId 
            ? { 
                ...p, 
                dataPoints: p.dataPoints.filter(dp => dp.id !== dataPointId),
                updatedAt: new Date()
              }
            : p
        ),
        currentProcess: state.currentProcess?.id === processId 
          ? {
              ...state.currentProcess,
              dataPoints: state.currentProcess.dataPoints.filter(dp => dp.id !== dataPointId),
              updatedAt: new Date()
            }
          : state.currentProcess,
      })),
      
      // Chart management
      createChart: (chartConfig) => {
        // This would typically be handled by a separate chart store
        // For now, we'll just log it
        console.log('Creating chart:', chartConfig);
      },
      
      updateChart: (chartId, updates) => {
        console.log('Updating chart:', chartId, updates);
      },
      
      deleteChart: (chartId) => {
        console.log('Deleting chart:', chartId);
      },
    }),
    {
      name: 'spacial-ai-storage',
      partialize: (state) => ({
        processes: state.processes,
        dashboards: state.dashboards,
        preferences: state.preferences,
      }),
    }
  )
);