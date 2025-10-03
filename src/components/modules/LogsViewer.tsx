import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
// import { useI18nStore } from '../../stores/useI18nStore';
import { useUserStore } from '../../stores/useUserStore';
import { logger, LogEntry, LogLevel, LogCategory } from '../../services/logger';
import { 
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ExclamationCircleIcon,
  BugAntIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface LogFilters {
  level?: LogLevel;
  category?: LogCategory;
  userId?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

const LogsViewer = () => {
  // const { t } = useI18nStore();
  const { currentUser } = useUserStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [filters, setFilters] = useState<LogFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [stats, setStats] = useState(logger.getLogStats());

  // Check if user has admin access
  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadLogs();
      // Refresh logs every 5 seconds
      const interval = setInterval(loadLogs, 5000);
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  useEffect(() => {
    applyFilters();
  }, [logs, filters]);

  const loadLogs = () => {
    const allLogs = logger.getAllLogs();
    setLogs(allLogs);
    setStats(logger.getLogStats());
  };

  const applyFilters = () => {
    const filtered = logger.getLogs(filters);
    setFilteredLogs(filtered);
  };

  const handleFilterChange = (key: keyof LogFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  const clearLogs = () => {
    if (confirm('Are you sure you want to clear all logs? This action cannot be undone.')) {
      logger.clearLogs();
      loadLogs();
      toast.success('All logs cleared');
    }
  };

  const exportLogs = () => {
    try {
      const logData = logger.exportLogs();
      const blob = new Blob([logData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `spc-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Logs exported successfully');
    } catch (error) {
      toast.error('Failed to export logs');
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return <ExclamationCircleIcon className="h-4 w-4 text-red-500" />;
      case 'warn':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <InformationCircleIcon className="h-4 w-4 text-blue-500" />;
      case 'debug':
        return <BugAntIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warn':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getCategoryColor = (category: LogCategory) => {
    switch (category) {
      case 'auth':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'database':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'ui':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      case 'api':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'system':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'user_action':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    }
  };

  const formatDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Logs viewer requires admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">System Logs</h1>
          <p className="text-gray-600 dark:text-gray-400">Monitor application logs, errors, and user activities</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn btn-secondary flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          <button
            onClick={exportLogs}
            className="btn btn-secondary flex items-center"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={clearLogs}
            className="btn btn-danger flex items-center"
          >
            <TrashIcon className="h-4 w-4 mr-2" />
            Clear All
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ClockIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Logs</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <ExclamationCircleIcon className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Recent Errors</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.recentErrors}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <UserIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">User Actions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.byCategory.user_action}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center">
            <CogIcon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Events</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.byCategory.system}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Logs</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="label block mb-2">Level</label>
              <select
                value={filters.level || ''}
                onChange={(e) => handleFilterChange('level', e.target.value || undefined)}
                className="input w-full"
              >
                <option value="">All Levels</option>
                <option value="error">Error</option>
                <option value="warn">Warning</option>
                <option value="info">Info</option>
                <option value="debug">Debug</option>
              </select>
            </div>
            <div>
              <label className="label block mb-2">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) => handleFilterChange('category', e.target.value || undefined)}
                className="input w-full"
              >
                <option value="">All Categories</option>
                <option value="auth">Authentication</option>
                <option value="database">Database</option>
                <option value="ui">User Interface</option>
                <option value="api">API</option>
                <option value="system">System</option>
                <option value="user_action">User Action</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div>
              <label className="label block mb-2">User ID</label>
              <input
                type="text"
                value={filters.userId || ''}
                onChange={(e) => handleFilterChange('userId', e.target.value || undefined)}
                placeholder="Filter by user"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label block mb-2">Module</label>
              <input
                type="text"
                value={filters.module || ''}
                onChange={(e) => handleFilterChange('module', e.target.value || undefined)}
                placeholder="Filter by module"
                className="input w-full"
              />
            </div>
            <div>
              <label className="label block mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={filters.startDate || ''}
                onChange={(e) => handleFilterChange('startDate', e.target.value || undefined)}
                className="input w-full"
              />
            </div>
            <div>
              <label className="label block mb-2">End Date</label>
              <input
                type="datetime-local"
                value={filters.endDate || ''}
                onChange={(e) => handleFilterChange('endDate', e.target.value || undefined)}
                className="input w-full"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-4">
            <div className="flex-1">
              <label className="label block mb-2">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  value={filters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value || undefined)}
                  placeholder="Search in messages and details..."
                  className="input w-full pl-10"
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Logs ({filteredLogs.length} of {logs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Module
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    No logs found matching the current filters
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getLevelIcon(log.level)}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(log.level)}`}>
                          {log.level.toUpperCase()}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                      {log.message}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.userId ? (
                        <div>
                          <div className="font-medium">{log.userId}</div>
                          {log.userRole && (
                            <div className="text-xs text-gray-400">{log.userRole}</div>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {log.module || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Log Details</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {formatDate(selectedLog.timestamp)} • {selectedLog.id}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Basic Information</h4>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Level:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(selectedLog.level)}`}>
                        {selectedLog.level.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Category:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCategoryColor(selectedLog.category)}`}>
                        {selectedLog.category}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Message:</span>
                      <span className="text-gray-900 dark:text-white font-medium">{selectedLog.message}</span>
                    </div>
                    {selectedLog.userId && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">User:</span>
                        <span className="text-gray-900 dark:text-white">{selectedLog.userId} ({selectedLog.userRole})</span>
                      </div>
                    )}
                    {selectedLog.module && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Module:</span>
                        <span className="text-gray-900 dark:text-white">{selectedLog.module}</span>
                      </div>
                    )}
                    {selectedLog.action && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Action:</span>
                        <span className="text-gray-900 dark:text-white">{selectedLog.action}</span>
                      </div>
                    )}
                  </div>
                </div>

                {selectedLog.details && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Details</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedLog.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedLog.error && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Error Information</h4>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                      <div className="space-y-2">
                        <div>
                          <span className="font-medium text-red-800 dark:text-red-200">Name:</span>
                          <span className="ml-2 text-red-700 dark:text-red-300">{selectedLog.error.name}</span>
                        </div>
                        <div>
                          <span className="font-medium text-red-800 dark:text-red-200">Message:</span>
                          <span className="ml-2 text-red-700 dark:text-red-300">{selectedLog.error.message}</span>
                        </div>
                        {selectedLog.error.stack && (
                          <div>
                            <span className="font-medium text-red-800 dark:text-red-200">Stack:</span>
                            <pre className="mt-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap overflow-x-auto">
                              {selectedLog.error.stack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">Metadata</h4>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                      <pre className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LogsViewer;
