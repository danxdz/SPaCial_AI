import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authService } from '../services/authService';
import { db } from '../services/database';

export type UserRole = 'admin' | 'controle' | 'method' | 'prod';

interface User {
  id: number;
  username: string;
  role: UserRole;
  group_id: number;
  group_name?: string;
  workstation_id: number;
  workstation_name?: string;
  workshop_id: number;
  workshop_name?: string;
  selected_workshop_id?: number;
  selected_workstation_id?: number;
}

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  canAccessModule: (module: string) => boolean;
  getNavigationTarget: (fromModule: string, toModule: string) => string | null;
  isProductionUser: () => boolean;
  canAccessMeasurements: () => boolean;
  validateSession: () => Promise<boolean>;
  setSelectedWorkshop: (workshopId: number) => void;
  setSelectedWorkstation: (workstationId: number) => void;
  needsWorkshopSelection: () => boolean;
  needsWorkstationSelection: () => boolean;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      currentUser: null, // Start with no user - measurements accessible without login
      
      setCurrentUser: (user) => set({ currentUser: user }),
      
      // Real login function using authentication service
      login: async (username: string, password?: string) => {
        try {
          const result = await authService.login({ username, password });
          if (result.success && result.user) {
            set({ currentUser: result.user as any });
            return true;
          }
          return false;
        } catch (error) {
          console.error('Login error:', error);
          return false;
        }
      },
      
      logout: async () => {
        try {
          await authService.logout();
          set({ currentUser: null });
          // Dispatch logout event for immediate UI response
          window.dispatchEvent(new CustomEvent('user-logout'));
        } catch (error) {
          console.error('Logout error:', error);
          set({ currentUser: null });
          // Dispatch logout event even on error
          window.dispatchEvent(new CustomEvent('user-logout'));
        }
      },
      
      hasRole: (role) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        
        if (Array.isArray(role)) {
          return role.includes(currentUser.role);
        }
        return currentUser.role === role;
      },
      
      canAccessModule: (module) => {
        const { currentUser } = get();
        
        switch (module) {
          case 'measurements':
            return true; // Measurements accessible to everyone (including no login)
          case 'home':
            return true; // Home accessible to everyone (including no login)
          default:
            if (!currentUser) return false; // Other modules require login
            
            switch (module) {
              case 'sections':
                return currentUser.role === 'admin' || currentUser.role === 'method';
              case 'families':
                return currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method';
              case 'products':
                return currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method';
              case 'gammas':
                return true; // All logged-in roles can access these
              case 'features':
                return currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method';
              case 'users':
              case 'registration-codes':
              case 'database':
              case 'database-crud':
              case 'translations':
              case 'logs':
              case 'storage':
                return currentUser.role === 'admin';
              case 'user-validation':
                return currentUser.role === 'admin' || currentUser.role === 'method';
              default:
                return false;
            }
        }
      },
      
      getNavigationTarget: (fromModule, toModule) => {
        const { currentUser } = get();
        if (!currentUser) return null;
        
        // Role-based navigation logic
        if (fromModule === 'products' && toModule === 'features') {
          // Products should go to Gammas first, not Features
          return 'gammas';
        }
        
        if (fromModule === 'gammas') {
          if (toModule === 'features') {
            // Gammas → Features (for admin/controle/method)
            return currentUser.role === 'admin' || currentUser.role === 'controle' || currentUser.role === 'method' ? 'features' : null;
          } else if (toModule === 'measurements') {
            // Gammas → Measurements (for all roles, but especially prod)
            return 'measurements';
          }
        }
        
        // Default navigation
        return toModule;
      },
      
      isProductionUser: () => {
        const { currentUser } = get();
        return currentUser?.role === 'prod';
      },
      
      canAccessMeasurements: () => {
        // Measurements are accessible to everyone, including no login
        return true;
      },

      validateSession: async () => {
        try {
          const session = await authService.validateSession();
          if (session) {
            // Session is valid, update user if needed
            const { currentUser } = get();
            if (!currentUser || currentUser.id !== session.userId) {
              // Need to reload user data
              // For now, just return true - in a real app you'd fetch user data
              return true;
            }
            return true;
          } else {
            // Session is invalid, clear user
            set({ currentUser: null });
            return false;
          }
        } catch (error) {
          console.error('Session validation error:', error);
          set({ currentUser: null });
          return false;
        }
      },

      setSelectedWorkshop: async (workshopId: number) => {
        const { currentUser } = get();
        if (currentUser) {
          try {
            // Save to database
            await db.execute(`
              UPDATE users 
              SET selected_workshop_id = ? 
              WHERE id = ?
            `, [workshopId, currentUser.id]);
            
            // Update local state
            set({
              currentUser: {
                ...currentUser,
                selected_workshop_id: workshopId
              }
            });
          } catch (error) {
            console.error('Error saving workshop selection:', error);
          }
        }
      },

      setSelectedWorkstation: async (workstationId: number) => {
        const { currentUser } = get();
        if (currentUser) {
          try {
            // Save to database
            await db.execute(`
              UPDATE users 
              SET selected_workstation_id = ? 
              WHERE id = ?
            `, [workstationId, currentUser.id]);
            
            // Update local state
            set({
              currentUser: {
                ...currentUser,
                selected_workstation_id: workstationId
              }
            });
          } catch (error) {
            console.error('Error saving workstation selection:', error);
          }
        }
      },

      needsWorkshopSelection: () => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'prod') return false;
        return !currentUser.selected_workshop_id;
      },

      needsWorkstationSelection: () => {
        const { currentUser } = get();
        if (!currentUser || currentUser.role !== 'prod') return false;
        return !currentUser.selected_workstation_id;
      }
    }),
    {
      name: 'user-store',
    }
  )
);
