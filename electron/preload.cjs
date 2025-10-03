const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Database operations
  dbExecute: (sql, params) => ipcRenderer.invoke('db-execute', sql, params),
  dbQuery: (sql, params) => ipcRenderer.invoke('db-query', sql, params),
  dbInit: () => ipcRenderer.invoke('db-init'),
  resetDatabase: () => ipcRenderer.invoke('reset-database'),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: (backupPath) => ipcRenderer.invoke('restore-database', backupPath),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  validateBackupAdminPassword: (backupPath, password) => ipcRenderer.invoke('validate-backup-admin-password', backupPath, password),
  
  // Menu event listeners
  onMenuNewProcess: (callback) => ipcRenderer.on('menu-new-process', callback),
  onMenuImportData: (callback) => ipcRenderer.on('menu-import-data', callback),
  onMenuExportData: (callback) => ipcRenderer.on('menu-export-data', callback),
  
  // Remove listeners
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});