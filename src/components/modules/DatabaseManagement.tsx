import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../services/database';
import { SampleDataService } from '../../services/sampleData';
import { autoDatabaseUpdate } from '../../services/autoDatabaseUpdate';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { useI18nStore } from '../../stores/useI18nStore';
import RestorePasswordDialog from '../ui/RestorePasswordDialog';
import { 
  ServerIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  TrashIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';

const DatabaseManagement = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  const { t } = useI18nStore();
  const [stats, setStats] = useState({
    users: 0,
    families: 0,
    products: 0,
    routes: 0,
    features: 0,
    measurements: 0,
    workshops: 0,
    workstations: 0
  });
  const [loading, setLoading] = useState(false);
  const [schemaVersion, setSchemaVersion] = useState<number>(0);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [selectedBackupPath, setSelectedBackupPath] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const databaseStats = await db.getDatabaseStats();
      setStats(databaseStats);
      
      const version = await db.getSchemaVersion();
      setSchemaVersion(version);
    } catch (error) {
      console.error('Error loading database stats:', error);
    }
  };

  const handleClearAllData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL data? This action cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      const result = await db.clearAllData();
      if (result.success) {
        toast.success('All data cleared successfully');
        await loadStats();
      } else {
        toast.error(result.error || 'Failed to clear data');
      }
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setLoading(false);
    }
  };

  const handleFillSampleData = async () => {
    if (!window.confirm('This will add comprehensive sample data to your database. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      // First, ensure database is properly initialized
      console.log('Initializing database for sample data...');
      await db.initialize();
      
      // Always ensure tables exist before adding sample data
      console.log('Ensuring database schema exists...');
      await db.createTablesPublic();
      
      const result = await SampleDataService.addSampleData();
      if (result.success) {
        toast.success('Sample data added successfully!');
        await loadStats();
      } else {
        toast.error(result.error || 'Failed to add sample data');
      }
    } catch (error) {
      console.error('Error adding sample data:', error);
      toast.error('Failed to add sample data');
    } finally {
      setLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm('This will completely reset the database and restart the app. Are you sure?')) {
      return;
    }

    try {
      // Delete the database file
      if (window.electronAPI) {
        await window.electronAPI.resetDatabase();
        toast.success('Database reset successfully! The app will restart.');
        // Reload the page to trigger first-time setup
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Web version - clear localStorage
        localStorage.removeItem('spc_database');
        toast.success('Web database reset successfully! Please refresh the page.');
        // Reload the page to trigger first-time setup
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      console.error('Error resetting database:', error);
      toast.error('Failed to reset database');
    }
  };


  const handleBackupDatabase = async () => {
    try {
      if (window.electronAPI) {
        console.log('Starting database backup...');
        const result = await window.electronAPI.backupDatabase();
        
        if (result.success) {
          console.log('Database backup successful:', result.filePath);
          toast.success(`Database backed up successfully! File: ${result.filePath}`);
        } else {
          console.error('Database backup failed:', result.error);
          toast.error(`Failed to backup database: ${result.error}`);
        }
      } else {
        toast.error('Database backup is only available in Electron mode');
      }
    } catch (error) {
      console.error('Error backing up database:', error);
      toast.error('Failed to backup database');
    }
  };

  const handleRestoreDatabase = async () => {
    if (!window.confirm('Are you sure you want to restore from a backup? This will replace the current database!')) {
      return;
    }

    try {
      if (window.electronAPI) {
        // Show native file dialog
        const dialogResult = await window.electronAPI.showOpenDialog();
        if (!dialogResult.success) {
          if (dialogResult.error !== 'No file selected') {
            toast.error(`Failed to open file dialog: ${dialogResult.error}`);
          }
          return;
        }

        // Store the selected backup path and show password dialog
        if (dialogResult.filePath) {
          setSelectedBackupPath(dialogResult.filePath);
          setShowPasswordDialog(true);
        }
      }
    } catch (error) {
      console.error('Error opening file dialog:', error);
      toast.error('Failed to open file dialog');
    }
  };

  const handleAutoUpdate = async () => {
    setLoading(true);
    try {
      await autoDatabaseUpdate.manualUpdate();
      await loadStats(); // Refresh stats after update
    } catch (error) {
      console.error('Error during auto update:', error);
      toast.error('Auto update failed');
    } finally {
      setLoading(false);
    }
  };


  const handlePasswordConfirm = async (currentPassword: string, restoredPassword: string) => {
    setLoading(true);
    
    try {
      // Validate current admin password
      const currentValid = await db.validateAdminPassword(currentPassword);
      if (!currentValid) {
        toast.error('Current admin password is incorrect');
        setShowPasswordDialog(false);
        return;
      }

      // Validate restored database admin password
      const backupResult = await db.validateBackupAdminPassword(selectedBackupPath, restoredPassword);
      if (!backupResult.success) {
        toast.error(`Failed to validate backup password: ${backupResult.error}`);
        setShowPasswordDialog(false);
        return;
      }

      if (!backupResult.valid) {
        toast.error('Restored database admin password is incorrect');
        setShowPasswordDialog(false);
        return;
      }

      // Both passwords are valid, proceed with restore
      setShowPasswordDialog(false);
      console.log('Starting database restore from:', selectedBackupPath);
      const result = await window.electronAPI.restoreDatabase(selectedBackupPath);
      
      if (result.success) {
        console.log('Database restore successful');
        
        // Check if backup file was actually restored (not 0 bytes)
        if (result.error && result.error.includes('0 bytes')) {
          toast.error('Backup file appears to be empty (0 bytes). Restore failed.');
          return;
        }
        
        // Additional check: if the restored database has no tables, it was empty
        try {
          const tables = await db.queryAll("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
          if (tables.length === 0) {
            toast.error('Backup file was empty. Database schema will be recreated.');
          }
        } catch (schemaError) {
          console.warn('Could not check database schema:', schemaError);
        }
        
        // Force database reinitialization to recognize the restored data
        console.log('Reinitializing database connection...');
        await db.reinitialize();
        
        // Ensure tables exist and run migrations (in case restore was from old schema)
        console.log('Ensuring database schema exists and running migrations...');
        await db.createTablesPublic();
        
        // Verify the restore by checking user count
        try {
          const users = await db.queryAll('SELECT COUNT(*) as count FROM users');
          const userCount = users[0]?.count || 0;
          console.log('User count after restore:', userCount);
          
          if (userCount > 0) {
            // Clear current user session since we're switching to restored database
            const { useUserStore } = await import('../../stores/useUserStore');
            useUserStore.getState().setCurrentUser(null);
            
            toast.success(`Database restored successfully! Found ${userCount} users. Please log in with your admin credentials from the restored database.`);
            
            // Don't refresh - just redirect to login
            setTimeout(() => {
              // Trigger a re-render by updating a state that forces login screen
              window.dispatchEvent(new CustomEvent('database-restored'));
            }, 1000);
          } else {
            toast.error('Database restored but no users found. You may need to create an admin account.');
          }
        } catch (verifyError) {
          console.error('Error verifying restore:', verifyError);
          toast.error('Database restored but verification failed. Please check the restored data.');
        }
      } else {
        console.error('Database restore failed:', result.error);
        toast.error(`Failed to restore database: ${result.error}`);
      }
  } catch (error) {
      console.error('Error during password validation or restore:', error);
      toast.error('Failed to validate passwords or restore database');
    } finally {
      setLoading(false);
      setSelectedBackupPath('');
    }
  };

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
          <ServerIcon className="h-8 w-8 mr-3 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('database.title')}
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Manage your SPC database, add sample data, and perform maintenance operations.
        </p>
      </div>

      {/* Database Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <InformationCircleIcon className="h-6 w-6 mr-3 text-blue-600" />
          Database Overview
        </h2>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-xl border border-blue-200 dark:border-blue-700">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">{stats.users}</div>
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">Users</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 rounded-xl border border-green-200 dark:border-green-700">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">{stats.workshops}</div>
            <div className="text-sm font-medium text-green-700 dark:text-green-300">Workshops</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-xl border border-purple-200 dark:border-purple-700">
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">{stats.families}</div>
            <div className="text-sm font-medium text-purple-700 dark:text-purple-300">Families</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-6 rounded-xl border border-orange-200 dark:border-orange-700">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-1">{stats.products}</div>
            <div className="text-sm font-medium text-orange-700 dark:text-orange-300">Products</div>
          </div>
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-700">
            <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-1">{stats.routes}</div>
            <div className="text-sm font-medium text-indigo-700 dark:text-indigo-300">Routes</div>
          </div>
          <div className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 p-6 rounded-xl border border-pink-200 dark:border-pink-700">
            <div className="text-3xl font-bold text-pink-600 dark:text-pink-400 mb-1">{stats.features}</div>
            <div className="text-sm font-medium text-pink-700 dark:text-pink-300">Features</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 p-6 rounded-xl border border-red-200 dark:border-red-700">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{stats.measurements}</div>
            <div className="text-sm font-medium text-red-700 dark:text-red-300">Measurements</div>
          </div>
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 p-6 rounded-xl border border-teal-200 dark:border-teal-700">
            <div className="text-3xl font-bold text-teal-600 dark:text-teal-400 mb-1">{stats.workstations}</div>
            <div className="text-sm font-medium text-teal-700 dark:text-teal-300">Workstations</div>
          </div>
        </div>
        
        {/* Database Status */}
        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Database Status: <span className="text-green-600">Healthy</span>
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Schema Version {schemaVersion} • Running in {window.electronAPI ? 'Electron' : 'Browser'} mode
                </div>
              </div>
            </div>
            {schemaVersion < 7 && (
              <div className="flex items-center text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Update Available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Cog6ToothIcon className="h-6 w-6 mr-3 text-blue-600" />
          Database Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Sample Data */}
          <button
            onClick={handleFillSampleData}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <DocumentPlusIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? 'Adding...' : 'Add Sample Data'}</div>
            <div className="text-sm opacity-90 mt-1">Get started quickly</div>
          </button>

          {/* Update Schema */}
          <button
            onClick={handleAutoUpdate}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <CloudArrowUpIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? 'Updating...' : 'Update Schema'}</div>
            <div className="text-sm opacity-90 mt-1">Keep database current</div>
          </button>

          {/* Backup */}
          <button
            onClick={handleBackupDatabase}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ServerIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? 'Backing up...' : 'Create Backup'}</div>
            <div className="text-sm opacity-90 mt-1">Save your data</div>
          </button>

          {/* Restore */}
          <button
            onClick={handleRestoreDatabase}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? 'Restoring...' : 'Restore Backup'}</div>
            <div className="text-sm opacity-90 mt-1">Load saved data</div>
          </button>

          {/* Clear Data */}
          <button
            onClick={handleClearAllData}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <TrashIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? t('database.clearing') : t('database.clearAllData')}</div>
            <div className="text-sm opacity-90 mt-1">{t('database.startFresh')}</div>
          </button>

          {/* Reset Database */}
          <button
            onClick={handleResetDatabase}
            disabled={loading}
            className="flex flex-col items-center justify-center px-6 py-8 border border-transparent text-base font-medium rounded-lg text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ExclamationTriangleIcon className="h-8 w-8 mb-3" />
            <div className="font-semibold">{loading ? t('database.resetting') : t('database.resetDatabase')}</div>
            <div className="text-sm opacity-90 mt-1">{t('database.completeRestart')}</div>
          </button>
        </div>

        {/* Sample Data Info */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700">
          <div className="text-sm text-green-800 dark:text-green-200">
            <strong>{t('database.sampleDataIncludes')}:</strong> {t('database.sampleDataDescription')}
          </div>
        </div>
      </div>

      {/* Password Validation Dialog */}
      <RestorePasswordDialog
        isOpen={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onConfirm={handlePasswordConfirm}
        loading={loading}
      />
    </div>
  );
};

export default DatabaseManagement;