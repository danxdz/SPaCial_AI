const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  console.log('isDev:', isDev);
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('isPackaged:', app.isPackaged);
  
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.cjs'),
      webSecurity: true,
      allowRunningInsecureContent: false
    },
    icon: path.join(__dirname, '../public/vite.svg'),
    titleBarStyle: 'default',
    show: false
  });

  // Set Content Security Policy (only in production)
  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            'default-src \'self\' \'unsafe-inline\' data: blob: https://sql.js.org; ' +
            'style-src \'self\' \'unsafe-inline\' https://fonts.googleapis.com; ' +
            'font-src \'self\' https://fonts.gstatic.com; ' +
            'script-src \'self\' \'unsafe-inline\' http://localhost:*; ' +
            'img-src \'self\' data: blob: http://localhost:*'
          ]
        }
      });
    });
  }

  // Load the app
  if (isDev) {
    console.log('Loading app from http://localhost:3001');
    
    // Clear all caches and storage
    mainWindow.webContents.session.clearCache().then(() => {
      console.log('Cache cleared');
      return mainWindow.webContents.session.clearStorageData({
        storages: ['appcache', 'cookies', 'filesystem', 'indexdb', 'localstorage', 'shadercache', 'websql', 'serviceworkers', 'cachestorage']
      });
    }).then(() => {
      console.log('Storage cleared');
      // Force reload with timestamp to bypass cache
      const url = 'http://localhost:3001/?t=' + Date.now();
      console.log('Loading URL:', url);
      return mainWindow.loadURL(url);
    }).then(() => {
      console.log('App loaded successfully');
    }).catch((error) => {
      console.error('Failed to load app:', error);
    });
    
    // Open DevTools
    mainWindow.webContents.openDevTools();
    
    // Handle navigation to prevent loading local files
    mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
      const parsedUrl = new URL(navigationUrl);
      if (parsedUrl.origin !== 'http://localhost:3001') {
        event.preventDefault();
      }
    });
    
    // Handle failed resource loading
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.log('Failed to load resource:', validatedURL, errorDescription);
    });
    
    // Log when page finishes loading
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Create menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Process',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-process');
          }
        },
        {
          label: 'Import Data',
          accelerator: 'CmdOrCtrl+I',
          click: async () => {
            const result = await dialog.showOpenDialog(mainWindow, {
              properties: ['openFile'],
              filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Excel Files', extensions: ['xlsx', 'xls'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-import-data', result.filePaths[0]);
            }
          }
        },
        {
          label: 'Export Data',
          accelerator: 'CmdOrCtrl+E',
          click: async () => {
            const result = await dialog.showSaveDialog(mainWindow, {
              filters: [
                { name: 'CSV Files', extensions: ['csv'] },
                { name: 'Excel Files', extensions: ['xlsx'] }
              ]
            });
            
            if (!result.canceled) {
              mainWindow.webContents.send('menu-export-data', result.filePath);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About SPaCial AI',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About SPaCial AI',
              message: 'SPaCial AI Dashboard',
              detail: 'A modern Statistical Process Control dashboard for manufacturing quality control'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Database operations
ipcMain.handle('db-execute', async (event, sql, params) => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    const db = new Database(dbPath);
    
    // Check if SQL contains multiple statements (like transactions)
    if (sql.includes(';') && sql.split(';').length > 1) {
      // Execute multiple statements
      const statements = sql.split(';').filter(stmt => stmt.trim());
      let lastResult = null;
      
      for (const statement of statements) {
        const trimmedStmt = statement.trim();
        if (trimmedStmt) {
          const stmt = db.prepare(trimmedStmt);
          lastResult = stmt.run(params);
        }
      }
      
      db.close();
      return { success: true, result: lastResult };
    } else {
      // Single statement
      const stmt = db.prepare(sql);
      const result = stmt.run(params);
      
      db.close();
      return { success: true, result };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-query', async (event, sql, params) => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    const db = new Database(dbPath);
    
    const stmt = db.prepare(sql);
    const result = params ? stmt.all(params) : stmt.all();
    
    db.close();
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('db-init', async () => {
  try {
    const Database = require('better-sqlite3');
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    const db = new Database(dbPath);
    
    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS workshops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        manager_user_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS workstations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        workshop_id INTEGER NOT NULL,
        description TEXT,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      );
      
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        permissions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS workshop_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workshop_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(workshop_id, user_id)
      );
      
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        workstation_id INTEGER,
        workshop_id INTEGER,
        group_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        last_login_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (group_id) REFERENCES groups(id)
      );
      
      CREATE TABLE IF NOT EXISTS registration_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        workshop_id INTEGER,
        workstation_id INTEGER,
        group_id INTEGER,
        created_by INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME,
        used_at DATETIME,
        used_by INTEGER,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (used_by) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS user_validation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_code TEXT NOT NULL,
        username TEXT NOT NULL,
        requested_role TEXT NOT NULL,
        requested_workshop_id INTEGER,
        requested_workstation_id INTEGER,
        requested_group_id INTEGER,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME,
        processed_by INTEGER,
        validated_by INTEGER,
        FOREIGN KEY (requested_workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (requested_workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (requested_group_id) REFERENCES groups(id),
        FOREIGN KEY (processed_by) REFERENCES users(id),
        FOREIGN KEY (validated_by) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        workshop_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      );
      
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        family_id INTEGER,
        workshop_id INTEGER,
        workstation_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id)
      );
      
      CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        product_id INTEGER,
        workshop_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      );
      
      CREATE TABLE IF NOT EXISTS gammas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        product_id INTEGER NOT NULL,
        sequence_number INTEGER NOT NULL,
        operation_name TEXT NOT NULL,
        workstation TEXT NOT NULL,
        estimated_time REAL DEFAULT 0,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        route_id INTEGER,
        product_id INTEGER,
        specification_type TEXT DEFAULT 'nominal',
        target_value REAL DEFAULT 0,
        tolerance_plus REAL DEFAULT 0,
        tolerance_minus REAL DEFAULT 0,
        unit TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      );
      
      CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        feature_id INTEGER NOT NULL,
        route_id INTEGER,
        product_id INTEGER,
        gamma_id INTEGER,
        measured_value REAL NOT NULL,
        operator_id INTEGER NOT NULL,
        workstation_id INTEGER,
        workshop_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        FOREIGN KEY (feature_id) REFERENCES features(id),
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (gamma_id) REFERENCES gammas(id),
        FOREIGN KEY (operator_id) REFERENCES users(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      );
      
      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER,
        module TEXT,
        action TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
      
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        preference_type TEXT NOT NULL,
        preference_value INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, preference_type, preference_value)
      );
      
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, setting_key)
      );
      
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        image_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    db.close();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Reset database handler
ipcMain.handle('reset-database', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    
    // Check if database file exists
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log('Database file deleted successfully');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('backup-database', async () => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    const backupPath = path.join(app.getPath('userData'), `spc-dashboard-backup-${Date.now()}.db`);
    
    console.log('Backup request received:');
    console.log('  Source path:', dbPath);
    console.log('  Backup path:', backupPath);
    console.log('  Source exists:', fs.existsSync(dbPath));
    
    if (fs.existsSync(dbPath)) {
      const sourceStats = fs.statSync(dbPath);
      console.log('  Source file size:', sourceStats.size, 'bytes');
      
      if (sourceStats.size === 0) {
        console.log('  WARNING: Source database file is empty (0 bytes)');
        return { success: false, error: 'Database file is empty (0 bytes). Cannot create backup.' };
      }
      
      fs.copyFileSync(dbPath, backupPath);
      
      const backupStats = fs.statSync(backupPath);
      console.log('  Backup file size:', backupStats.size, 'bytes');
      console.log('  Sizes match:', sourceStats.size === backupStats.size);
      
      if (backupStats.size === 0) {
        console.log('  ERROR: Backup file is empty after copy');
        return { success: false, error: 'Backup file is empty after copy operation' };
      }
      
      console.log('Database backed up successfully');
      return { success: true, backupPath, message: `Backed up ${sourceStats.size} bytes to ${backupPath}` };
    } else {
      console.log('Database file not found:', dbPath);
      return { success: false, error: 'Database file not found' };
    }
  } catch (error) {
    console.error('Error backing up database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('restore-database', async (event, backupPath) => {
  try {
    const dbPath = path.join(app.getPath('userData'), 'spc-dashboard.db');
    
    console.log('Restore request received:');
    console.log('  Backup path:', backupPath);
    console.log('  Target path:', dbPath);
    console.log('  Backup exists:', fs.existsSync(backupPath));
    console.log('  Target exists before restore:', fs.existsSync(dbPath));
    
    if (fs.existsSync(backupPath)) {
      // Get file sizes for verification
      const backupStats = fs.statSync(backupPath);
      console.log('  Backup file size:', backupStats.size, 'bytes');
      
      // Copy the backup file
      fs.copyFileSync(backupPath, dbPath);
      
      // Verify the copy
      const restoredStats = fs.statSync(dbPath);
      console.log('  Restored file size:', restoredStats.size, 'bytes');
      console.log('  Sizes match:', backupStats.size === restoredStats.size);
      
      console.log('Database restored successfully');
      return { success: true, message: `Restored ${backupStats.size} bytes from ${backupPath}` };
    } else {
      console.log('Backup file not found:', backupPath);
      return { success: false, error: 'Backup file not found' };
    }
  } catch (error) {
    console.error('Error restoring database:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('show-open-dialog', async () => {
  try {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Database Files', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      return { success: true, filePath: result.filePaths[0] };
    } else {
      return { success: false, error: 'No file selected' };
    }
  } catch (error) {
    console.error('Error showing open dialog:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('validate-backup-admin-password', async (event, backupPath, password) => {
  try {
    const Database = require('better-sqlite3');
    const crypto = require('crypto');
    
    // Create a temporary connection to the backup database
    const backupDb = new Database(backupPath);
    
    try {
      // Get admin user from backup
      const admin = backupDb.prepare('SELECT id, password_hash FROM users WHERE role = ? LIMIT 1').get('admin');
      
      if (!admin) {
        return { success: false, error: 'No admin user found in backup database' };
      }
      
      // Verify password using the same method as the main app
      const hash = crypto.pbkdf2Sync(password, 'spc-salt', 100000, 64, 'sha512');
      const passwordHash = hash.toString('hex');
      
      const isValid = passwordHash === admin.password_hash;
      
      return { success: true, valid: isValid };
    } finally {
      backupDb.close();
    }
  } catch (error) {
    console.error('Error validating backup admin password:', error);
    return { success: false, error: error.message };
  }
});

// App event handlers
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});