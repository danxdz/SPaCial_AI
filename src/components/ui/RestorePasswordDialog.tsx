import React, { useState } from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RestorePasswordDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (currentPassword: string, restoredPassword: string) => void;
  loading?: boolean;
}

const RestorePasswordDialog: React.FC<RestorePasswordDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [restoredPassword, setRestoredPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentPassword.trim()) {
      setError('Current admin password is required');
      return;
    }
    
    if (!restoredPassword.trim()) {
      setError('Restored database admin password is required');
      return;
    }
    
    setError('');
    onConfirm(currentPassword, restoredPassword);
  };

  const handleClose = () => {
    setCurrentPassword('');
    setRestoredPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-6 w-6 text-amber-600 mr-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Database Restore Security
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Security Check Required:</strong> To restore this database, you must provide both passwords to verify you have legitimate access to both the current system and the restored database.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Admin Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter current admin password"
                autoComplete="current-password"
              />
            </div>

            <div>
              <label htmlFor="restoredPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Restored Database Admin Password
              </label>
              <input
                type="password"
                id="restoredPassword"
                value={restoredPassword}
                onChange={(e) => setRestoredPassword(e.target.value)}
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="Enter admin password from restored database"
                autoComplete="new-password"
              />
            </div>

            {error && (
              <div className="text-red-600 dark:text-red-400 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Validating...' : 'Confirm Restore'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RestorePasswordDialog;
