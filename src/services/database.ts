// SQL.js will be imported dynamically
import { logger } from './logger';
import { encryption } from './encryption';

// Electron API types
declare global {
  interface Window {
    electronAPI: {
      dbExecute: (sql: string, params?: any[]) => Promise<{ success: boolean; result?: any; error?: string }>;
      dbQuery: (sql: string, params?: any[]) => Promise<{ success: boolean; result?: any[]; error?: string }>;
      dbInit: () => Promise<{ success: boolean; error?: string }>;
      validateBackupAdminPassword: (backupPath: string, password: string) => Promise<{ success: boolean; valid?: boolean; error?: string }>;
      resetDatabase: () => Promise<{ success: boolean; error?: string }>;
      backupDatabase: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
      restoreDatabase: (backupPath: string) => Promise<{ success: boolean; error?: string }>;
      showOpenDialog: () => Promise<{ success: boolean; filePath?: string; error?: string }>;
    };
  }
}

class DatabaseService {
  private db: any = null;
  private initialized: boolean = false;
  private initializing: boolean = false;
  private readonly SCHEMA_VERSION = 1; // Clean start - no migrations needed
  private isElectron: boolean = false;
  private SQLConstructor: any = null;

  async initialize() {
    if (this.initialized) {
      // Silently skip - no need to log every time
      return;
    }

    if (this.initializing) {
      console.log('Database initialization already in progress, waiting...');
      while (this.initializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.initializing = true;

    try {
      // Only log on first initialization
      logger.logDatabase('INIT', 'Database initialization started');

      // Check if we're in Electron environment
      this.isElectron = typeof window !== 'undefined' && !!window.electronAPI;
      
      if (this.isElectron) {
        logger.logDatabase('INIT', 'Electron environment detected');
        await this.initializeElectron();
      } else {
        logger.logDatabase('INIT', 'Web environment detected');
        await this.initializeWeb();
      }

      this.initialized = true;
      logger.logDatabase('INIT', 'Database initialization completed');

    } catch (error) {
      console.error('Database initialization failed:', error);
      logger.logDatabase('ERROR', 'Database initialization failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    } finally {
      this.initializing = false;
    }
  }

  private async initializeElectron() {
    const result = await window.electronAPI.dbInit();
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize database in Electron');
    }
    logger.logDatabase('INIT', 'Database initialized successfully (Electron)');
  }

  private async initializeWeb() {
    try {
      // Dynamically import SQL.js to avoid ES module issues
      const initSqlJs = (await import('sql.js')).default;
      
      // Initialize SQL.js for web environment with proper configuration
      const SQL = await initSqlJs({
        locateFile: file => {
          // Use CDN for WASM files to avoid MIME type issues
          if (file.endsWith('.wasm')) {
            return `https://sql.js.org/dist/${file}`;
          }
          return file;
        }
      });
      
      // Store the SQL constructor for later use
      this.SQLConstructor = SQL.Database;
      
      // Try to load existing database from localStorage first
      if (this.loadFromLocalStorage()) {
        console.log('Loaded existing database from localStorage');
        logger.logDatabase('INIT', 'Database loaded from localStorage');
      } else {
        // No existing database, create a fresh one
        console.log('Creating fresh database with complete schema...');
        this.db = new SQL.Database();
        await this.createTables();
      }
      
      logger.logDatabase('INIT', 'Database initialized successfully (Web)');
    } catch (error) {
      logger.logDatabase('ERROR', 'Web database initialization failed', { error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  private async createTables() {
    // Create all necessary tables for the SPC system
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'operator',
        group_id INTEGER,
        workstation_id INTEGER,
        workshop_id INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        last_login_at DATETIME,
        selected_workshop_id INTEGER,
        selected_workstation_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (selected_workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (selected_workstation_id) REFERENCES workstations(id)
      )`,
      
      // Routes table
      `CREATE TABLE IF NOT EXISTS routes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        product_id INTEGER,
        workshop_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      )`,
      
      // Products table
      `CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        route_id INTEGER,
        family_id INTEGER,
        workshop_id INTEGER,
        workstation_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (family_id) REFERENCES families(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id)
      )`,
      
      // Measurements table
      `CREATE TABLE IF NOT EXISTS measurements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        value REAL NOT NULL,
        feature_id INTEGER,
        route_id INTEGER,
        gamma_id INTEGER,
        measured_value REAL NOT NULL,
        operator_id INTEGER NOT NULL,
        workstation_id INTEGER,
        workshop_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        user_id INTEGER,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (feature_id) REFERENCES features(id),
        FOREIGN KEY (route_id) REFERENCES routes(id),
        FOREIGN KEY (gamma_id) REFERENCES gammas(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (operator_id) REFERENCES users(id),
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      
      // Groups table
      `CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        permissions_families TEXT DEFAULT "read",
        permissions_products TEXT DEFAULT "read",
        permissions_features TEXT DEFAULT "read",
        permissions_gammas TEXT DEFAULT "read",
        permissions_measurements TEXT DEFAULT "read",
        permissions_sections TEXT DEFAULT "read",
        permissions_users TEXT DEFAULT "read",
        permissions_database TEXT DEFAULT "read",
        permissions_storage TEXT DEFAULT "read",
        permissions_logs TEXT DEFAULT "read",
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Sections table
      `CREATE TABLE IF NOT EXISTS sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Families table
      `CREATE TABLE IF NOT EXISTS families (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Features table
      `CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        product_id INTEGER,
        workshop_id INTEGER,
        workstation_id INTEGER,
        image_filename TEXT,
        gamma_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (gamma_id) REFERENCES gammas(id)
      )`,
      
      // Registration codes table
      `CREATE TABLE IF NOT EXISTS registration_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL,
        workshop_id INTEGER,
        workstation_id INTEGER,
        group_id INTEGER,
        created_by INTEGER NOT NULL,
        expires_at DATETIME,
        used_at DATETIME,
        used_by INTEGER,
        used BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (group_id) REFERENCES groups(id),
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (used_by) REFERENCES users(id)
      )`,
      
      // Workshops table
      `CREATE TABLE IF NOT EXISTS workshops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        manager_user_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (manager_user_id) REFERENCES users(id)
      )`,
      
      // Workstations table
      `CREATE TABLE IF NOT EXISTS workstations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        workshop_id INTEGER,
        location TEXT,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      )`,
      
      // Gammas table
      `CREATE TABLE IF NOT EXISTS gammas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        product_id INTEGER NOT NULL,
        sequence_number INTEGER NOT NULL,
        operation_name TEXT NOT NULL,
        workstation TEXT NOT NULL,
        estimated_time REAL DEFAULT 0,
        workshop_id INTEGER,
        image_filename TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id)
      )`,
      
      // Schema version table
      `CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Family workshop relationship table
      `CREATE TABLE IF NOT EXISTS family_workshops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        workshop_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id),
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        UNIQUE(family_id, workshop_id)
      )`,
      
      // Workshop methods table
      `CREATE TABLE IF NOT EXISTS workshop_methods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workshop_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(workshop_id, user_id)
      )`,
      
      // User validation requests table
      `CREATE TABLE IF NOT EXISTS user_validation_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        registration_code TEXT NOT NULL,
        username TEXT NOT NULL,
        requested_role TEXT NOT NULL,
        requested_workshop_id INTEGER,
        requested_workstation_id INTEGER,
        requested_group_id INTEGER,
        status TEXT NOT NULL DEFAULT 'pending',
        validated_by INTEGER,
        validated_at DATETIME,
        rejection_reason TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (requested_workshop_id) REFERENCES workshops(id),
        FOREIGN KEY (requested_workstation_id) REFERENCES workstations(id),
        FOREIGN KEY (requested_group_id) REFERENCES groups(id),
        FOREIGN KEY (validated_by) REFERENCES users(id)
      )`,
      
      // Notifications table
      `CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        user_id INTEGER,
        read_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`,
      
      // User preferences table
      `CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        preference_type TEXT NOT NULL,
        preference_value INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, preference_type, preference_value)
      )`,
      
      // User settings table
      `CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, setting_key)
      )`,
      
      // Images table
      `CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        image_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const tableSql of tables) {
      this.db.exec(tableSql);
    }
    
    // Don't create default admin user - let first-time setup handle this
    
    // Insert default system settings
    this.db.exec(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('password_optional_for_production', 'true', 'Whether passwords are optional for production users'),
      ('password_required_for_all', 'false', 'Whether passwords are required for all user types'),
      ('sidebar_always_visible', 'false', 'Whether sidebar should always be visible on desktop')`);
    
    // Initialize schema version
    this.db.exec(`INSERT OR IGNORE INTO schema_version (version) VALUES (7)`);
    
    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    if (this.db && typeof window !== 'undefined' && window.localStorage) {
      try {
        const data = this.db.export();
        const uint8Array = new Uint8Array(data);
        
        // Use a more efficient method to convert to base64
        let binary = '';
        const len = uint8Array.byteLength;
        for (let i = 0; i < len; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        const base64 = btoa(binary);
        
        // Check if the data is too large for localStorage
        if (base64.length > 5 * 1024 * 1024) { // 5MB limit
          console.warn('Database too large for localStorage, skipping save');
          return;
        }
        
        localStorage.setItem('spc_database', base64);
      } catch (error) {
        console.warn('Failed to save database to localStorage:', error);
      }
    }
  }

  private loadFromLocalStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const base64 = localStorage.getItem('spc_database');
        if (base64) {
          const binaryString = atob(base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          // Create a new database instance with the loaded data
          // We'll need to store the SQL constructor reference
          if (this.SQLConstructor) {
            this.db = new this.SQLConstructor(bytes);
            return true;
          }
        }
      } catch (error) {
        console.warn('Failed to load database from localStorage:', error);
      }
    }
    return false;
  }

  // Force reinitialize database (useful after restore)
  async reinitialize(): Promise<void> {
    this.initialized = false;
    this.initializing = false;
    await this.initialize();
  }

  async createTablesPublic() {
    // Ensure database is initialized
    await this.initialize();
    
    // Helper function to execute SQL via IPC
    const executeSQL = async (sql: string) => {
      if (window.electronAPI) {
        const result = await window.electronAPI.dbExecute(sql, []);
        if (!result.success) {
          throw new Error(result.error || 'Database execution failed');
        }
        return result.result;
      } else {
        throw new Error('Electron API not available');
      }
    };
    
    // Core tables
    await executeSQL(`CREATE TABLE IF NOT EXISTS workshops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      manager_user_id INTEGER,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manager_user_id) REFERENCES users (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS workstations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      workshop_id INTEGER NOT NULL,
      description TEXT,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      permissions TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS workshop_methods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workshop_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(workshop_id, user_id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS system_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value TEXT NOT NULL,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS schema_version (
      id INTEGER PRIMARY KEY,
      version INTEGER NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert default system settings
    await executeSQL(`INSERT OR IGNORE INTO system_settings (setting_key, setting_value, description) VALUES
      ('password_optional_for_production', 'true', 'Whether passwords are optional for production users'),
      ('password_required_for_all', 'false', 'Whether passwords are required for all user types'),
      ('sidebar_always_visible', 'false', 'Whether sidebar should always be visible on desktop')`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS users (
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
      FOREIGN KEY (workstation_id) REFERENCES workstations (id),
      FOREIGN KEY (workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (group_id) REFERENCES groups (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS registration_codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      workshop_id INTEGER,
      workstation_id INTEGER,
      group_id INTEGER,
      created_by INTEGER NOT NULL,
      expires_at DATETIME,
      used_at DATETIME,
      used_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (workstation_id) REFERENCES workstations (id),
      FOREIGN KEY (group_id) REFERENCES groups (id),
      FOREIGN KEY (created_by) REFERENCES users (id),
      FOREIGN KEY (used_by) REFERENCES users (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS user_validation_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      registration_code TEXT NOT NULL,
      username TEXT NOT NULL,
      requested_role TEXT NOT NULL,
      requested_workshop_id INTEGER,
      requested_workstation_id INTEGER,
      requested_group_id INTEGER,
      status TEXT NOT NULL DEFAULT 'pending',
      validated_by INTEGER,
      validated_at DATETIME,
      rejection_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requested_workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (requested_workstation_id) REFERENCES workstations (id),
      FOREIGN KEY (requested_group_id) REFERENCES groups (id),
      FOREIGN KEY (validated_by) REFERENCES users (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id INTEGER,
      read_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS families (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      workshop_id INTEGER,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (workshop_id) REFERENCES workshops (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      family_id INTEGER,
      workshop_id INTEGER,
      workstation_id INTEGER,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (family_id) REFERENCES families (id),
      FOREIGN KEY (workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (workstation_id) REFERENCES workstations (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS routes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      product_id INTEGER,
      workshop_id INTEGER,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (workshop_id) REFERENCES workshops (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS gammas (
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
      FOREIGN KEY (product_id) REFERENCES products (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS features (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      route_id INTEGER,
      product_id INTEGER,
      workshop_id INTEGER,
      specification_type TEXT,
      target_value REAL,
      tolerance_plus REAL,
      tolerance_minus REAL,
      unit TEXT,
      image_url TEXT,
      image_filename TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (route_id) REFERENCES routes (id),
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (workshop_id) REFERENCES workshops (id)
    )`);

    await executeSQL(`CREATE TABLE IF NOT EXISTS measurements (
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
      FOREIGN KEY (feature_id) REFERENCES features (id),
      FOREIGN KEY (route_id) REFERENCES routes (id),
      FOREIGN KEY (product_id) REFERENCES products (id),
      FOREIGN KEY (gamma_id) REFERENCES gammas (id),
      FOREIGN KEY (workstation_id) REFERENCES workstations (id),
      FOREIGN KEY (workshop_id) REFERENCES workshops (id),
      FOREIGN KEY (operator_id) REFERENCES users (id)
    )`);

    // User preferences table for favorites
    await executeSQL(`CREATE TABLE IF NOT EXISTS user_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      preference_type TEXT NOT NULL, -- 'favorite_workshop', 'favorite_workstation', 'favorite_route'
      preference_value INTEGER NOT NULL, -- ID of the workshop/workstation/route
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, preference_type, preference_value)
    )`);

    // User settings table for theme, language, and other preferences
    await executeSQL(`CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      setting_key TEXT NOT NULL, -- 'theme', 'language', 'colorBlindMode', 'sidebarCollapsed', etc.
      setting_value TEXT NOT NULL, -- JSON value for complex settings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id),
      UNIQUE(user_id, setting_key)
    )`);

    // Images table for storing uploaded images
    await executeSQL(`CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT UNIQUE NOT NULL,
      image_data TEXT NOT NULL, -- Base64 encoded image data
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Run schema migrations
    await this.runMigrations();

    logger.logDatabase('CREATE', 'All tables created successfully');
  }

  private async runMigrations(): Promise<void> {
    // Create schema version table if it doesn't exist
    try {
      await this.execute(`CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      // Check if we need to initialize schema version
      const versionResult = await this.queryOne('SELECT MAX(version) as version FROM schema_version');
      if (!versionResult || versionResult.version < this.SCHEMA_VERSION) {
        await this.execute('INSERT INTO schema_version (version) VALUES (?)', [this.SCHEMA_VERSION]);
        logger.logDatabase('MIGRATION', `Schema initialized to version ${this.SCHEMA_VERSION}`);
      }
    } catch (error) {
      logger.logDatabase('MIGRATION', `Schema version setup failed: ${error}`);
    }
  }


  async execute(sql: string, params: any[] = []): Promise<number> {
    await this.initialize();
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.dbExecute(sql, params);
        if (!result.success) {
          throw new Error(result.error || 'Database execution failed');
        }
        return result.result || 0;
      } else {
        // Use exec for database modifications
        // For exec, we need to substitute parameters manually
        let finalSql = sql;
        if (params && params.length > 0) {
          params.forEach((param, _index) => {
            const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
            finalSql = finalSql.replace('?', value);
          });
        }
        
        const result = this.db.exec(finalSql);
        this.saveToLocalStorage(); // Save database after modification
        return result.length > 0 ? 1 : 0; // Return 1 if successful, 0 if not
      }
    } catch (error) {
      console.error('Database execution error:', error);
      logger.logDatabase('ERROR', 'Database execution failed', { sql, params, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async queryAll(sql: string, params: any[] = []): Promise<any[]> {
    await this.initialize();
    
    try {
      if (window.electronAPI) {
        const result = await window.electronAPI.dbQuery(sql, params);
        if (!result.success) {
          throw new Error(result.error || 'Database query failed');
        }
        return result.result || [];
      } else {
        // Use exec for queries that return multiple rows
        // For exec, we need to substitute parameters manually
        let finalSql = sql;
        if (params && params.length > 0) {
          params.forEach((param, _index) => {
            const value = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param;
            finalSql = finalSql.replace('?', value);
          });
        }
        
        const result = this.db.exec(finalSql);
        if (result && result.length > 0 && result[0]) {
          return result[0].values.map((row: any[]) => {
            const obj: any = {};
            result[0].columns.forEach((col: string, index: number) => {
              obj[col] = row[index];
            });
            return obj;
          });
        }
        return [];
      }
    } catch (error) {
      console.error('Database query error:', error);
      logger.logDatabase('ERROR', 'Database query failed', { sql, params, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  async queryOne(sql: string, params: any[] = []): Promise<any> {
    const results = await this.queryAll(sql, params);
    return results[0] || null;
  }

  // Authentication methods
  async authenticateUser(username: string, password: string): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      const user = await this.queryOne(
        'SELECT * FROM users WHERE username = ? AND status = "active"',
        [username]
      );

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const isValidPassword = encryption.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return { success: false, error: 'Invalid password' };
      }

      const userDetails = await this.queryOne(`
        SELECT u.*, 
               g.name as group_name,
               w.name as workstation_name,
               ws.name as workshop_name
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN workstations w ON u.workstation_id = w.id
        LEFT JOIN workshops ws ON u.workshop_id = ws.id
        WHERE u.id = ?
      `, [user.id]);

      return { success: true, user: userDetails };
    } catch (error) {
      console.error('Authentication error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  async createUser(userData: {
    username: string;
    password: string;
    role: string;
    workstation_id?: number;
    workshop_id?: number;
    group_id?: number;
  }): Promise<{ success: boolean; userId?: number; error?: string }> {
    try {
      const passwordHash = await encryption.hashPassword(userData.password);
      
      const result = await this.execute(`
        INSERT INTO users (username, password_hash, role, workstation_id, workshop_id, group_id, status)
        VALUES (?, ?, ?, ?, ?, ?, 'active')
      `, [
        userData.username,
        passwordHash,
        userData.role,
        userData.workstation_id || null,
        userData.workshop_id || null,
        userData.group_id || null
      ]);

      return { success: true, userId: result };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, error: 'Failed to create user' };
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      return await this.queryAll(`
        SELECT u.*, 
               g.name as group_name,
               w.name as workstation_name,
               ws.name as workshop_name
        FROM users u
        LEFT JOIN groups g ON u.group_id = g.id
        LEFT JOIN workstations w ON u.workstation_id = w.id
        LEFT JOIN workshops ws ON u.workshop_id = ws.id
        ORDER BY u.created_at DESC
      `);
    } catch (error) {
      console.error('Get users error:', error);
      return [];
    }
  }

  // Image storage methods
  async saveImageToStorage(filename: string, imageData: string): Promise<boolean> {
    try {
      if (window.electronAPI) {
        // In Electron mode, save to database
        await this.execute(`
          INSERT OR REPLACE INTO images (filename, image_data, created_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `, [filename, imageData]);
        return true;
      } else {
        // In browser mode, use localStorage
        localStorage.setItem(`spc_image_${filename}`, imageData);
        return true;
      }
    } catch (error) {
      console.error('Error saving image:', error);
      return false;
    }
  }

  async getImageFromStorage(filename: string): Promise<string | null> {
    try {
      if (window.electronAPI) {
        // In Electron mode, get from database
        const result = await this.queryOne(
          'SELECT image_data FROM images WHERE filename = ?',
          [filename]
        );
        return result?.image_data || null;
      } else {
        // In browser mode, get from localStorage
        return localStorage.getItem(`spc_image_${filename}`);
      }
    } catch (error) {
      console.error('Error getting image:', error);
      return null;
    }
  }

  async deleteImageFromStorage(filename: string): Promise<boolean> {
    try {
      if (window.electronAPI) {
        // In Electron mode, delete from database
        await this.execute('DELETE FROM images WHERE filename = ?', [filename]);
        return true;
      } else {
        // In browser mode, delete from localStorage
        localStorage.removeItem(`spc_image_${filename}`);
        return true;
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      return false;
    }
  }

  // Database management methods
  async clearAllData(): Promise<{ success: boolean; error?: string }> {
    try {
      await this.initialize();
      
      if (window.electronAPI) {
        // For Electron, use a single transaction with multiple statements
        const clearOrder = [
          'measurements',           // References features, routes, products, gammas, workstations, workshops
          'features',              // References routes, products
          'routes',                // References products, workshops
          'gammas',                // References products
          'products',              // References families, workshops, workstations
          'families',              // References workshops
          'user_preferences',      // References users
          'user_validation_requests', // References users, workshops, workstations, groups
          'registration_codes',    // References users, workshops, workstations, groups
          'notifications',         // References users
          'workshop_methods',      // References users, workshops
          'users',                 // References workshops, groups
          'workstations',          // References workshops
          'workshops',             // No dependencies
          'groups'                 // No dependencies
          // Note: system_settings is NOT cleared to preserve admin settings
        ];

        // Build a single SQL statement with all operations
        let sql = `
          BEGIN TRANSACTION;
          PRAGMA foreign_keys = OFF;
        `;
        
        // Add DELETE statements for each table
        for (const table of clearOrder) {
          sql += `DELETE FROM ${table};\n`;
        }
        
        // Reset sequences and re-enable foreign keys
        sql += `
          DELETE FROM sqlite_sequence;
          PRAGMA foreign_keys = ON;
          COMMIT;
        `;

        // Execute the entire transaction as one statement
        const result = await window.electronAPI.dbExecute(sql, []);
        if (!result.success) {
          // If the transaction fails, try individual table deletions
          console.warn('Transaction failed, trying individual deletions:', result.error);
          
          // Disable foreign keys first
          await window.electronAPI.dbExecute('PRAGMA foreign_keys = OFF', []);
          
          // Clear each table individually
          for (const table of clearOrder) {
            try {
              await window.electronAPI.dbExecute(`DELETE FROM ${table}`, []);
            } catch (tableError) {
              console.warn(`Failed to clear table ${table}:`, tableError);
            }
          }
          
          // Reset sequences and re-enable foreign keys
          await window.electronAPI.dbExecute('DELETE FROM sqlite_sequence', []);
          await window.electronAPI.dbExecute('PRAGMA foreign_keys = ON', []);
        }
        
        logger.logDatabase('CLEAR', 'All data cleared successfully');
        return { success: true };
      } else {
        // For web mode, use the existing approach
        const clearOrder = [
          'measurements', 'features', 'routes', 'gammas', 'products', 'families',
          'user_preferences', 'user_validation_requests', 'registration_codes', 'notifications',
          'workshop_methods', 'users', 'workstations', 'workshops', 'groups'
          // Note: system_settings is NOT cleared to preserve admin settings
        ];

        // Disable foreign keys
        this.db.exec('PRAGMA foreign_keys = OFF');
        
        // Clear each table
        for (const table of clearOrder) {
          try {
            this.db.exec(`DELETE FROM ${table}`);
          } catch (tableError) {
            console.warn(`Failed to clear table ${table}:`, tableError);
          }
        }

        // Reset sequences and re-enable foreign keys
        this.db.exec('DELETE FROM sqlite_sequence');
        this.db.exec('PRAGMA foreign_keys = ON');
        this.saveToLocalStorage();
        
        logger.logDatabase('CLEAR', 'All data cleared successfully');
        return { success: true };
      }
    } catch (error) {
      console.error('Clear data error:', error);
      logger.logDatabase('ERROR', 'Failed to clear data', { error: error instanceof Error ? error.message : String(error) });
      return { success: false, error: 'Failed to clear data' };
    }
  }

  async getSchemaVersion(): Promise<number> {
    try {
      const result = await this.queryOne('SELECT MAX(version) as version FROM schema_version');
      return result?.version || 0;
    } catch (error) {
      return 0;
    }
  }

  async validateAdminPassword(password: string): Promise<boolean> {
    try {
      const admin = await this.queryOne(
        'SELECT id, password_hash FROM users WHERE role = ? LIMIT 1',
        ['admin']
      );
      
      if (!admin) {
        return false;
      }
      
      return await encryption.verifyPassword(password, admin.password_hash);
    } catch (error) {
      console.error('Error validating admin password:', error);
      return false;
    }
  }

  async validateBackupAdminPassword(backupPath: string, password: string): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    try {
      if (!window.electronAPI) {
        return { success: false, error: 'Electron API not available' };
      }
      
      const result = await window.electronAPI.validateBackupAdminPassword(backupPath, password);
      return result;
    } catch (error) {
      console.error('Error validating backup admin password:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getDatabaseStats(): Promise<{
    users: number;
    families: number;
    products: number;
    routes: number;
    features: number;
    measurements: number;
    workshops: number;
    workstations: number;
  }> {
    try {
      const stats = await Promise.all([
        this.queryOne('SELECT COUNT(*) as count FROM users'),
        this.queryOne('SELECT COUNT(*) as count FROM families'),
        this.queryOne('SELECT COUNT(*) as count FROM products'),
        this.queryOne('SELECT COUNT(*) as count FROM routes'),
        this.queryOne('SELECT COUNT(*) as count FROM features'),
        this.queryOne('SELECT COUNT(*) as count FROM measurements'),
        this.queryOne('SELECT COUNT(*) as count FROM workshops'),
        this.queryOne('SELECT COUNT(*) as count FROM workstations')
      ]);

      return {
        users: stats[0]?.count || 0,
        families: stats[1]?.count || 0,
        products: stats[2]?.count || 0,
        routes: stats[3]?.count || 0,
        features: stats[4]?.count || 0,
        measurements: stats[5]?.count || 0,
        workshops: stats[6]?.count || 0,
        workstations: stats[7]?.count || 0
      };
    } catch (error) {
      console.error('Get database stats error:', error);
      return {
        users: 0,
        families: 0,
        products: 0,
        routes: 0,
        features: 0,
        measurements: 0,
        workshops: 0,
        workstations: 0
      };
    }
  }

  // Save database to localStorage (browser only) - OLD VERSION REMOVED

  // Clear localStorage database (browser only)
  clearLocalStorage(): void {
    if (!window.electronAPI) {
      localStorage.removeItem('spc-database');
      console.log('Cleared database from localStorage');
    }
  }

  // User settings methods
  async getUserSetting(userId: number, key: string): Promise<string | null> {
    try {
      const result = await this.queryOne(
        'SELECT setting_value FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );
      return result?.setting_value || null;
    } catch (error) {
      console.error('Error getting user setting:', error);
      return null;
    }
  }

  async setUserSetting(userId: number, key: string, value: string): Promise<boolean> {
    try {
      await this.execute(`
        INSERT OR REPLACE INTO user_settings (user_id, setting_key, setting_value, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, key, value]);
      return true;
    } catch (error) {
      console.error('Error setting user setting:', error);
      return false;
    }
  }

  async getAllUserSettings(userId: number): Promise<Record<string, string>> {
    try {
      const settings = await this.queryAll(
        'SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?',
        [userId]
      );
      return settings.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value;
        return acc;
      }, {} as Record<string, string>);
    } catch (error) {
      console.error('Error getting user settings:', error);
      return {};
    }
  }

  async deleteUserSetting(userId: number, key: string): Promise<boolean> {
    try {
      await this.execute(
        'DELETE FROM user_settings WHERE user_id = ? AND setting_key = ?',
        [userId, key]
      );
      return true;
    } catch (error) {
      console.error('Error deleting user setting:', error);
      return false;
    }
  }

  // Login tracking methods
  async updateLastLogin(userId: number): Promise<boolean> {
    try {
      await this.execute(`
        UPDATE users 
        SET last_login_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [userId]);
      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    }
  }

  async getLastLoginUsers(limit: number = 5): Promise<any[]> {
    try {
      return await this.queryAll(`
        SELECT id, username, role, last_login_at
        FROM users 
        WHERE last_login_at IS NOT NULL 
        ORDER BY last_login_at DESC 
        LIMIT ?
      `, [limit]);
    } catch (error) {
      console.error('Error getting last login users:', error);
      return [];
    }
  }

  // Force reinitialize database (useful for fixing corrupted databases)
  async forceReinitialize(): Promise<void> {
    this.initialized = false;
    this.initializing = false;
    this.db = null;
    this.clearLocalStorage();
    await this.initialize();
  }
}

export const db = new DatabaseService();
