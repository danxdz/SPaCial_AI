import { useState, useEffect } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';
import { useNavigationHistory } from '../../services/navigationHistory';
import { navigationService } from '../../services/navigationService';
import { Cog6ToothIcon, ShieldCheckIcon, KeyIcon, UserGroupIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

interface SystemSetting {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const SystemSettings = () => {
  const { canGoBack, goBack } = useNavigationHistory();
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarAlwaysVisible, setSidebarAlwaysVisible] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settingsData = await db.queryAll('SELECT * FROM system_settings ORDER BY setting_key');
      setSettings(settingsData);
      
      // Load specific settings
      const sidebarSetting = settingsData.find(s => s.setting_key === 'sidebar_always_visible');
      setSidebarAlwaysVisible(sidebarSetting?.setting_value === 'true');
    } catch (error) {
      console.error('Error loading system settings:', error);
      toast.error('Failed to load system settings');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (settingKey: string, newValue: string) => {
    setSaving(true);
    try {
      await db.execute(
        'UPDATE system_settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?',
        [newValue, settingKey]
      );
      
      // Update local state
      setSettings(prev => 
        prev.map(setting => 
          setting.setting_key === settingKey 
            ? { ...setting, setting_value: newValue }
            : setting
        )
      );
      
      toast.success('Setting updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      toast.error('Failed to update setting');
    } finally {
      setSaving(false);
    }
  };

  const getSettingValue = (key: string): string => {
    const setting = settings.find(s => s.setting_key === key);
    return setting?.setting_value || '';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center mb-2">
          {canGoBack() && (
            <button
              onClick={() => {
                const previousModule = goBack();
                if (previousModule) {
                  navigationService.navigateTo(previousModule);
                }
              }}
              className="mr-4 p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              title="Go back"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </button>
          )}
          <Cog6ToothIcon className="h-8 w-8 mr-3 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            System Settings
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure system-wide settings and security policies
        </p>
      </div>

      <div className="grid gap-6">
        {/* Password Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <KeyIcon className="h-6 w-6 text-green-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Password Requirements
            </h2>
          </div>
          
          <div className="space-y-4">
            {/* Password Optional for Production Users */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Optional Passwords for Production Users
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Allow production/operator users to have optional passwords. When enabled, production users can skip password entry during registration.
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getSettingValue('password_optional_for_production') === 'true'}
                    onChange={(e) => updateSetting('password_optional_for_production', e.target.checked ? 'true' : 'false')}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>

            {/* Password Required for All Users */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Require Passwords for All Users
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Force all user types to have passwords, overriding the production user setting above.
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={getSettingValue('password_required_for_all') === 'true'}
                    onChange={(e) => updateSetting('password_required_for_all', e.target.checked ? 'true' : 'false')}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <ShieldCheckIcon className="h-6 w-6 text-red-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Security Settings
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Session Timeout
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Users are automatically logged out after 2 hours of inactivity for security.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Password Encryption
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All passwords are encrypted using secure hashing algorithms and cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        {/* User Management Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <UserGroupIcon className="h-6 w-6 text-purple-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              User Management
            </h2>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Registration Approval
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                All new user registrations require admin or method user approval before activation.
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Role-Based Access
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Users have different access levels based on their assigned roles (Admin, Controle, Method, Production).
              </p>
            </div>
          </div>
        </div>

        {/* Interface Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center mb-4">
            <Cog6ToothIcon className="h-6 w-6 text-indigo-600 mr-3" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Interface Settings
            </h2>
          </div>
          
          <div className="space-y-4">
            {/* Sidebar Always Visible */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Always Show Sidebar on Desktop
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Keep the sidebar always visible on desktop screens. When disabled, sidebar can be toggled with hamburger menu.
                </p>
              </div>
              <div className="ml-4">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sidebarAlwaysVisible}
                    onChange={(e) => {
                      const newValue = e.target.checked ? 'true' : 'false';
                      setSidebarAlwaysVisible(e.target.checked);
                      updateSetting('sidebar_always_visible', newValue);
                    }}
                    disabled={saving}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Settings Information
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                Changes to these settings take effect immediately and affect all new user registrations. 
                Existing users are not affected by password requirement changes.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;
