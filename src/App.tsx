import { useState, useEffect, useRef } from 'react';
import { Toaster } from 'react-hot-toast';
import { useThemeStore } from './stores/useThemeStore';
import { useUserStore } from './stores/useUserStore';
import { useI18nStore } from './stores/useI18nStore';
import { db } from './services/database';
import { navigationService } from './services/navigationService';
import { useNavigationHistory } from './services/navigationHistory';
import LoginForm from './components/auth/LoginForm';
import FirstTimeSetup from './components/auth/FirstTimeSetup';
import ProductionFlow from './components/auth/ProductionFlow';
import Sidebar from './components/layout/Sidebar';
import Dashboard from './components/modules/Dashboard';
import ProductionDashboard from './components/modules/ProductionDashboard';
import UserPreferences from './components/modules/UserPreferences';
import Sections from './components/modules/Sections';
import Families from './components/modules/Families';
import ProductsWithViews from './components/modules/ProductsWithViews';
import FeaturesSimple from './components/modules/FeaturesSimple';
import RoutesWithViews from './components/modules/RoutesWithViews';
import Measurements from './components/modules/Measurements';
import Users from './components/modules/Users';
import Groups from './components/modules/Groups';
import RegistrationCodes from './components/modules/RegistrationCodes';
import UserValidation from './components/modules/UserValidation';
import DatabaseManagement from './components/modules/DatabaseManagement';
import DatabaseCRUD from './components/modules/DatabaseCRUD';
import TranslationCRUD from './components/modules/TranslationCRUD';
import LogsViewer from './components/modules/LogsViewer';
import StorageSettings from './components/modules/StorageSettings';
import SystemSettings from './components/modules/SystemSettings';
import SettingsPanel from './components/ui/SettingsPanel';
import NotificationCenter from './components/ui/NotificationCenter';
// import NavigationDebug from './components/ui/NavigationDebug';
// import Breadcrumb from './components/ui/Breadcrumb';

type ModuleType = 'home' | 'production-dashboard' | 'user-preferences' | 'sections' | 'families' | 'products' | 'features' | 'gammas' | 'measurements' | 'users' | 'groups' | 'registration-codes' | 'user-validation' | 'database' | 'database-crud' | 'translations' | 'logs' | 'storage' | 'system-settings';

function App() {
  const { colorBlindMode } = useThemeStore();
  const { currentUser, setCurrentUser, logout, needsWorkshopSelection, needsWorkstationSelection } = useUserStore();
  const { loadTranslations } = useI18nStore();
  const { push } = useNavigationHistory();
  const [currentModule, setCurrentModule] = useState<ModuleType>('home');
  const [needsFirstTimeSetup, setNeedsFirstTimeSetup] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const setupChecked = useRef(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [skipProductionFlow, setSkipProductionFlow] = useState(false);

  // Load workshops for navigation
  useEffect(() => {
    const loadWorkshops = async () => {
      try {
        const workshopsData = await db.queryAll('SELECT id, name FROM workshops ORDER BY name');
        setWorkshops(workshopsData);
      } catch (error) {
        console.error('Failed to load workshops:', error);
      }
    };
    
    if (currentUser) {
      loadWorkshops();
    }
  }, [currentUser]);

  // Subscribe to navigation service
  useEffect(() => {
    const unsubscribe = navigationService.subscribe((state) => {
      setCurrentModule(state.currentModule as ModuleType);
    });
    return unsubscribe;
  }, []);

  // Track module changes for navigation history
  useEffect(() => {
    if (currentModule && currentModule !== 'home') {
      push(currentModule);
    }
  }, [currentModule, push]);

  // Global database initialization and first-time setup check
  useEffect(() => {
    if (setupChecked.current) return;
    
    const initializeApp = async () => {
      try {
        setupChecked.current = true;
        
        // Initialize database globally (this is the only place that should call initialize)
        await db.initialize();
        
        // Load translations
        await loadTranslations();
        
        // Auto-update database schema if needed (like Git)
        const { autoDatabaseUpdate } = await import('./services/autoDatabaseUpdate');
        const updateResult = await autoDatabaseUpdate.checkAndUpdate();
        if (updateResult.updated) {
          console.log('Database auto-updated:', updateResult.message);
        }
        
        // Check for auto-login (Remember Me) before checking setup
        const { authService } = await import('./services/authService');
        const autoLoginResult = await authService.checkRememberMe();
        
        if (autoLoginResult.success && autoLoginResult.user) {
          console.log('Auto-login successful for:', autoLoginResult.user.username);
          setCurrentUser(autoLoginResult.user as any);
          setCheckingSetup(false);
          return; // Skip setup check if auto-login succeeded
        }
        
        // Check for first-time setup
        const users = await db.queryAll('SELECT COUNT(*) as count FROM users');
        const userCount = users[0]?.count || 0;
        
        console.log('First-time setup check: userCount =', userCount);
        
        if (userCount === 0) {
          // Clear any persisted user state when no users exist in database
          setCurrentUser(null);
          setNeedsFirstTimeSetup(true);
        }
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setCheckingSetup(false);
      }
    };

    initializeApp();
  }, [setCurrentUser]);

  // Listen for database restore events
  useEffect(() => {
    const handleDatabaseRestored = async () => {
      console.log('Database restored event received, re-checking setup...');
      setupChecked.current = false; // Allow re-check
      setCheckingSetup(true);
      
      try {
        // Reinitialize database connection
        await db.reinitialize();
        
        // Check for first-time setup again
        const users = await db.queryAll('SELECT COUNT(*) as count FROM users');
        const userCount = users[0]?.count || 0;
        
        console.log('Post-restore setup check: userCount =', userCount);
        
        if (userCount === 0) {
          setCurrentUser(null);
          setNeedsFirstTimeSetup(true);
        } else {
          // Database has users, show login screen
          setCurrentUser(null);
          setNeedsFirstTimeSetup(false);
        }
      } catch (error) {
        console.error('Error during post-restore check:', error);
      } finally {
        setCheckingSetup(false);
      }
    };

    const handleDatabaseUpdated = async () => {
      console.log('Database updated event received, re-checking setup...');
      setupChecked.current = false; // Allow re-check
      setCheckingSetup(true);
      
      try {
        // Check for first-time setup again
        const users = await db.queryAll('SELECT COUNT(*) as count FROM users');
        const userCount = users[0]?.count || 0;
        
        console.log('Post-update setup check: userCount =', userCount);
        
        if (userCount === 0) {
          setCurrentUser(null);
          setNeedsFirstTimeSetup(true);
        } else {
          // Database has users, show login screen
          setCurrentUser(null);
          setNeedsFirstTimeSetup(false);
        }
      } catch (error) {
        console.error('Error during post-update check:', error);
      } finally {
        setCheckingSetup(false);
      }
    };

    // Listen for user logout events to ensure immediate login form display
    const handleUserLogout = () => {
      console.log('User logout event received, ensuring login form is ready...');
      // Don't trigger setup check on logout - just ensure we're ready for login
      setCheckingSetup(false);
      setNeedsFirstTimeSetup(false);
      setSkipProductionFlow(false); // Reset skip flag on logout
    };

    window.addEventListener('database-restored', handleDatabaseRestored);
    window.addEventListener('databaseUpdated', handleDatabaseUpdated);
    window.addEventListener('user-logout', handleUserLogout);
    
    return () => {
      window.removeEventListener('database-restored', handleDatabaseRestored);
      window.removeEventListener('databaseUpdated', handleDatabaseUpdated);
      window.removeEventListener('user-logout', handleUserLogout);
    };
  }, [setCurrentUser]);

  // Show loading while checking setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing SPC Dashboard...</p>
        </div>
      </div>
    );
  }

  // Show first-time setup if no users exist
  if (needsFirstTimeSetup) {
    return <FirstTimeSetup />;
  }

  // Simple authentication check - show app or login
  const isAuthenticated = currentUser !== null;
  const isAdmin = currentUser?.role === 'admin';
  const isProductionUser = currentUser?.role === 'prod';
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">SPC Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Please login to continue</p>
          </div>
          
          <LoginForm 
            onSuccess={() => {
              // Login successful, app will re-render with authenticated user
            }}
            showCancel={false}
          />
          
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account? Contact your administrator.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Production users need to go through workshop/workstation/route selection
  // But only if they haven't completed it yet and haven't chosen to skip
  if (isProductionUser && !skipProductionFlow && (needsWorkshopSelection() || needsWorkstationSelection())) {
    return <ProductionFlow onSkipToMain={() => setSkipProductionFlow(true)} />;
  }

  const renderModule = () => {
    switch (currentModule) {
      case 'home':
        return <Dashboard onNavigate={(module: string, id?: number) => {
          setCurrentModule(module as ModuleType);
          if (id) {
            // Store the ID for filtering if needed
            sessionStorage.setItem(`${module}SearchResult`, id.toString());
          }
        }} />;
      case 'production-dashboard':
        return <ProductionDashboard />;
      case 'user-preferences':
        return <UserPreferences />;
      case 'sections':
        return <Sections onNavigateToFamilies={(atelierId: number) => {
          const workshop = workshops.find(w => w.id === atelierId);
          navigationService.navigateTo(
            'families',
            { type: 'workshop', id: atelierId, name: workshop?.name },
            { name: workshop?.name || 'Workshop', id: atelierId }
          );
        }} />;
      case 'families':
        return <Families onNavigateToProducts={(familyId: number) => {
          setCurrentModule('products');
          // Store the family filter for products module
          sessionStorage.setItem('productsFamilyFilter', familyId.toString());
        }} />;
      case 'products':
        return <ProductsWithViews onNavigateToGammas={(productId: number) => {
          // Products now go to Gammas first (role-based navigation)
          setCurrentModule('gammas');
          // Store the product filter for gammas module
          sessionStorage.setItem('gammasProductFilter', productId.toString());
        }} />;
      case 'features':
        return <FeaturesSimple onNavigateToGammas={(productId: number) => {
          setCurrentModule('gammas');
          // Store the product filter for gammas module
          sessionStorage.setItem('gammasProductFilter', productId.toString());
        }} />;
      case 'gammas':
        return <RoutesWithViews 
          onNavigateToFeatures={(gammaId: number) => {
            // Routes → Features (for admin/controle/method)
            setCurrentModule('features');
            sessionStorage.setItem('featuresGammaFilter', gammaId.toString());
          }}
          onNavigateToMeasurements={(gammaId: number) => {
            // Routes → Measurements (for all roles, especially prod)
            setCurrentModule('measurements');
            sessionStorage.setItem('measurementsGammaFilter', gammaId.toString());
          }}
        />;
      case 'measurements':
        return <Measurements />;
      case 'users':
        return isAdmin ? <Users /> : <div>Access Denied</div>;
      case 'groups':
        return isAdmin ? <Groups /> : <div>Access Denied</div>;
      case 'registration-codes':
        return isAdmin ? <RegistrationCodes /> : <div>Access Denied</div>;
      case 'user-validation':
        return (isAdmin || currentUser?.role === 'method') ? <UserValidation /> : <div>Access Denied</div>;
      case 'database':
        return isAdmin ? <DatabaseManagement /> : <div>Access Denied</div>;
      case 'database-crud':
        return isAdmin ? <DatabaseCRUD /> : <div>Access Denied</div>;
      case 'translations':
        return isAdmin ? <TranslationCRUD /> : <div>Access Denied</div>;
      case 'logs':
        return isAdmin ? <LogsViewer /> : <div>Access Denied</div>;
      case 'storage':
        return isAdmin ? <StorageSettings /> : <div>Access Denied</div>;
      case 'system-settings':
        return isAdmin ? <SystemSettings /> : <div>Access Denied</div>;
      default:
        return <Dashboard onNavigate={(module) => setCurrentModule(module as ModuleType)} />;
    }
  };


  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 flex ${colorBlindMode !== 'none' ? colorBlindMode : ''}`}>
      <Sidebar
        currentModule={currentModule}
        setCurrentModule={(module: string) => setCurrentModule(module as ModuleType)}
        isAdmin={isAdmin}
        isAuthenticated={isAuthenticated}
        onSettingsClick={() => setShowSettings(true)}
        onLogout={logout}
        onNotificationsClick={() => setShowNotifications(true)}
      />

      <main className="flex-1 lg:ml-64 pt-20 lg:pt-0">
        {renderModule()}
      </main>
      
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--toast-bg)',
            color: 'var(--toast-color)',
            borderRadius: '8px',
            padding: '12px 16px',
            fontSize: '14px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
          loading: {
            iconTheme: {
              primary: '#3b82f6',
              secondary: '#ffffff',
            },
        },
      }}
    />

    <SettingsPanel 
      isOpen={showSettings} 
      onClose={() => setShowSettings(false)} 
    />

    <NotificationCenter 
      isOpen={showNotifications} 
      onClose={() => setShowNotifications(false)} 
    />
  </div>
);
}

export default App;
