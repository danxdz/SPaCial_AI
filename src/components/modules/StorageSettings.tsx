import { useState } from 'react';
import { toast } from 'react-hot-toast';
// import { db } from '../../services/database';
import { 
  ServerIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const StorageSettings = () => {
  const [loading, setLoading] = useState(false);

  const handleClearLocalStorage = async () => {
    if (!window.confirm('Are you sure you want to clear all SPC data from localStorage? This action cannot be undone!')) {
      return;
    }

    setLoading(true);
    try {
      // Get all localStorage keys that start with 'spc_'
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('spc_')) {
          keysToRemove.push(key);
        }
      }

      if (keysToRemove.length === 0) {
        toast('No SPC data found in localStorage. Database is already clean!');
        return;
      }

      // Remove all SPC-related keys
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      toast.success(`Cleared ${keysToRemove.length} SPC data entries from localStorage`);
    } catch (error) {
      console.error('Error clearing localStorage:', error);
      toast.error(`Failed to clear localStorage: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
          <ServerIcon className="h-8 w-8 mr-3 text-blue-600" />
          Storage Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your application storage and data persistence settings.
        </p>
      </div>

      {/* Current Storage Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <InformationCircleIcon className="h-5 w-5 mr-2 text-blue-600" />
          Current Storage Status
        </h2>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircleIcon className="h-5 w-5 text-blue-600 mt-0.5 mr-3" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Database Storage Mode
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Database is running in {window.electronAPI ? 'Electron' : 'Browser'} mode.
                {window.electronAPI ? ' Data is automatically saved to file system.' : ' Data is stored in memory.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 mr-2 text-red-600" />
          Storage Actions
        </h2>
        
        <div className="space-y-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Clear localStorage Data
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  This will remove all SPC-related data from browser localStorage. This includes image data and cached information.
                </p>
                <button
                  onClick={handleClearLocalStorage}
                  disabled={loading}
                  className="mt-3 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Clearing...' : 'Clear localStorage Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StorageSettings;