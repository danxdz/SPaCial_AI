import { db } from './database';
import toast from 'react-hot-toast';

// interface SchemaChange {
//   type: 'ADD_TABLE' | 'ADD_COLUMN' | 'MODIFY_COLUMN' | 'DROP_COLUMN' | 'DROP_TABLE';
//   table: string;
//   column?: string;
//   newType?: string;
//   defaultValue?: any;
// }

class AutoDatabaseUpdate {
  private readonly LATEST_SCHEMA_VERSION = 7;
  // private readonly BACKUP_PREFIX = 'auto_backup_';

  // Schema changes that are safe to apply automatically
  // private readonly SAFE_CHANGES: SchemaChange[] = [
  //   { type: 'ADD_TABLE', table: 'images' },
  //   { type: 'ADD_COLUMN', table: 'users', column: 'last_login_at' },
  //   { type: 'ADD_COLUMN', table: 'users', column: 'selected_workshop_id' },
  //   { type: 'ADD_COLUMN', table: 'users', column: 'selected_workstation_id' },
  //   { type: 'ADD_COLUMN', table: 'workshops', column: 'manager_user_id' },
  //   { type: 'ADD_COLUMN', table: 'features', column: 'workshop_id' },
  // ];

  async checkAndUpdate(): Promise<{ updated: boolean; message: string }> {
    try {
      const currentVersion = await this.getCurrentVersion();
      
      if (currentVersion >= this.LATEST_SCHEMA_VERSION) {
        return { updated: false, message: 'Database is up to date' };
      }

      // Create automatic backup
      const backupCreated = await this.createAutoBackup();
      if (!backupCreated) {
        return { updated: false, message: 'Failed to create backup' };
      }

      // Apply safe schema changes
      const changesApplied = await this.applySafeChanges(currentVersion);
      
      if (changesApplied) {
        // Update schema version
        await this.updateSchemaVersion();
        
        return { 
          updated: true, 
          message: `Database updated from v${currentVersion} to v${this.LATEST_SCHEMA_VERSION}` 
        };
      } else {
        return { updated: false, message: 'No safe changes to apply' };
      }

    } catch (error) {
      console.error('Auto database update error:', error);
      return { updated: false, message: `Update failed: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  private async getCurrentVersion(): Promise<number> {
    try {
      const result = await db.queryOne('SELECT version FROM schema_version ORDER BY id DESC LIMIT 1');
      return result?.version || 0;
    } catch (error) {
      return 0;
    }
  }

  private async createAutoBackup(): Promise<boolean> {
    try {
      // const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // const backupName = `${this.BACKUP_PREFIX}${timestamp}`;
      
      // Create backup using Electron API if available
      if (window.electronAPI) {
        const result = await window.electronAPI.backupDatabase();
        return result.success;
      } else {
        // In browser mode, we can't create file backups, but we can create a data export
        console.log('Auto backup: Browser mode - skipping file backup');
        return true; // Allow updates to proceed without file backup in browser mode
      }
    } catch (error) {
      console.error('Auto backup creation failed:', error);
      return false;
    }
  }

  private async applySafeChanges(currentVersion: number): Promise<boolean> {
    try {
      let changesApplied = false;

      // Apply changes based on current version
      if (currentVersion < 1) {
        // Initial schema setup
        await this.applyInitialSchema();
        changesApplied = true;
      }

      if (currentVersion < 2) {
        // Add new tables and columns
        await this.applyVersion2Changes();
        changesApplied = true;
      }

      if (currentVersion < 3) {
        // Add many-to-many family-workshop relationship
        await this.applyVersion3Changes();
        changesApplied = true;
      }
      
      if (currentVersion < 4) {
        // Add image_filename column to features table
        await this.applyVersion4Changes();
        changesApplied = true;
      }
      
      if (currentVersion < 5) {
        // Add gamma_id column to features table
        await this.applyVersion5Changes();
        changesApplied = true;
      }

      if (currentVersion < 6) {
        // Add permission columns to groups table
        await this.applyVersion6Changes();
        changesApplied = true;
      }

      if (currentVersion < 7) {
        // Add workshop_id column to gammas table
        await this.applyVersion7Changes();
        changesApplied = true;
      }

      return changesApplied;
    } catch (error) {
      console.error('Error applying schema changes:', error);
      return false;
    }
  }

  private async applyInitialSchema(): Promise<void> {
    // Create schema_version table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS schema_version (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Insert initial version if table is empty
    const existingVersion = await db.queryOne('SELECT COUNT(*) as count FROM schema_version');
    if (existingVersion?.count === 0) {
      await db.execute('INSERT INTO schema_version (version) VALUES (1)');
    }
  }

  private async applyVersion2Changes(): Promise<void> {
    // Add images table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS images (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT UNIQUE NOT NULL,
        image_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add user_settings table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS user_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(user_id, setting_key)
      )
    `);

    // Add columns to users table if they don't exist
    await this.addColumnIfNotExists('users', 'last_login_at', 'DATETIME');
    await this.addColumnIfNotExists('users', 'selected_workshop_id', 'INTEGER');
    await this.addColumnIfNotExists('users', 'selected_workstation_id', 'INTEGER');

    // Add columns to workshops table if they don't exist
    await this.addColumnIfNotExists('workshops', 'manager_user_id', 'INTEGER');

    // Add columns to features table if they don't exist
    await this.addColumnIfNotExists('features', 'workshop_id', 'INTEGER');

    // Add location column to workstations table if it doesn't exist
    await this.addColumnIfNotExists('workstations', 'location', 'TEXT');

    // Create system_settings table if it doesn't exist
    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        setting_key TEXT UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default system settings if they don't exist
    await this.insertDefaultSystemSetting('password_optional_for_production', 'true', 'Allow production users to have optional passwords');
    await this.insertDefaultSystemSetting('password_required_for_all', 'false', 'Force all users to have passwords');
    await this.insertDefaultSystemSetting('sidebar_always_visible', 'false', 'Keep sidebar always visible on desktop');
  }

  private async applyVersion3Changes(): Promise<void> {
    console.log('Applying version 3 changes: Many-to-many family-workshop relationship...');
    
    // Step 1: Create family_workshops junction table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS family_workshops (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        family_id INTEGER NOT NULL,
        workshop_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
        FOREIGN KEY (workshop_id) REFERENCES workshops(id) ON DELETE CASCADE,
        UNIQUE(family_id, workshop_id)
      )
    `);
    
    // Step 2: Migrate existing relationships
    await this.migrateFamilyWorkshopRelationships();
    
    // Step 3: Remove workshop_id from families table (after migration)
    await this.removeWorkshopIdFromFamilies();
    
    console.log('Version 3 changes applied successfully');
  }

  private async applyVersion4Changes(): Promise<void> {
    console.log('Applying version 4 changes: Adding image_filename column to features table...');
    
    // Add image_filename column to features table
    try {
      await db.execute(`
        ALTER TABLE features ADD COLUMN image_filename TEXT
      `);
      console.log('image_filename column added to features table successfully');
    } catch (error) {
      // Column might already exist, check if it's a different error
      if (error instanceof Error && error.message.includes('duplicate column name')) {
        console.log('image_filename column already exists in features table');
      } else {
        throw error;
      }
    }
    
    console.log('Version 4 changes applied successfully');
  }

  private async applyVersion5Changes(): Promise<void> {
    console.log('Applying version 5 changes: Adding gamma_id column to features table...');
    
    // Add gamma_id column to features table
    try {
      await db.execute(`
        ALTER TABLE features ADD COLUMN gamma_id INTEGER REFERENCES gammas(id)
      `);
      console.log('gamma_id column added to features table successfully');
    } catch (error) {
      // Column might already exist, check if it's a different error
      if (error instanceof Error && error.message.includes('duplicate column name')) {
        console.log('gamma_id column already exists in features table');
      } else {
        throw error;
      }
    }
    
    console.log('Version 5 changes applied successfully');
  }

  private async applyVersion6Changes(): Promise<void> {
    console.log('Applying version 6 changes: Adding permission columns to groups table...');
    try {
      const permissionColumns = [
        'permissions_families TEXT DEFAULT "read"',
        'permissions_products TEXT DEFAULT "read"',
        'permissions_features TEXT DEFAULT "read"',
        'permissions_gammas TEXT DEFAULT "read"',
        'permissions_measurements TEXT DEFAULT "read"',
        'permissions_sections TEXT DEFAULT "read"',
        'permissions_users TEXT DEFAULT "read"',
        'permissions_database TEXT DEFAULT "read"',
        'permissions_storage TEXT DEFAULT "read"',
        'permissions_logs TEXT DEFAULT "read"'
      ];

      for (const column of permissionColumns) {
        try {
          await db.execute(`ALTER TABLE groups ADD COLUMN ${column}`);
          console.log(`Added column: ${column.split(' ')[0]}`);
        } catch (error) {
          if (error instanceof Error && error.message.includes('duplicate column name')) {
            console.log(`Column ${column.split(' ')[0]} already exists`);
          } else {
            throw error;
          }
        }
      }
      console.log('Version 6 changes applied successfully');
    } catch (error) {
      console.error('Error applying version 6 changes:', error);
      throw error;
    }
  }

  private async applyVersion7Changes(): Promise<void> {
    console.log('Applying version 7 changes: Adding workshop_id column to gammas table...');
    try {
      await db.execute(`
        ALTER TABLE gammas ADD COLUMN workshop_id INTEGER REFERENCES workshops(id)
      `);
      console.log('workshop_id column added to gammas table successfully');
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate column name')) {
        console.log('workshop_id column already exists in gammas table');
      } else {
        throw error;
      }
    }
    console.log('Version 7 changes applied successfully');
  }

  private async migrateFamilyWorkshopRelationships(): Promise<void> {
    try {
      // Get all families with workshop_id
      const familiesWithWorkshops = await db.queryAll(`
        SELECT id, workshop_id FROM families 
        WHERE workshop_id IS NOT NULL
      `);
      
      console.log(`Found ${familiesWithWorkshops.length} families with workshop assignments to migrate`);
      
      // Insert relationships into junction table
      for (const family of familiesWithWorkshops) {
        await db.execute(`
          INSERT OR IGNORE INTO family_workshops (family_id, workshop_id)
          VALUES (?, ?)
        `, [family.id, family.workshop_id]);
      }
      
      console.log('Family-workshop relationships migrated successfully');
    } catch (error) {
      console.error('Error migrating family-workshop relationships:', error);
    }
  }

  private async removeWorkshopIdFromFamilies(): Promise<void> {
    try {
      // SQLite doesn't support DROP COLUMN directly, so we need to recreate the table
      console.log('Removing workshop_id column from families table...');
      
      // Create new families table without workshop_id
      await db.execute(`
        CREATE TABLE families_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          image_filename TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Copy data from old table to new table (excluding workshop_id)
      await db.execute(`
        INSERT INTO families_new (id, name, description, image_filename, created_at, updated_at)
        SELECT id, name, description, image_filename, created_at, updated_at
        FROM families
      `);
      
      // Drop old table
      await db.execute('DROP TABLE families');
      
      // Rename new table
      await db.execute('ALTER TABLE families_new RENAME TO families');
      
      console.log('Successfully removed workshop_id column from families table');
    } catch (error) {
      console.error('Error removing workshop_id from families table:', error);
    }
  }

  private async addColumnIfNotExists(table: string, column: string, type: string): Promise<void> {
    try {
      // Check if column exists
      const tableInfo = await db.queryAll(`PRAGMA table_info(${table})`);
      const columnExists = tableInfo.some((col: any) => col.name === column);
      
      if (!columnExists) {
        await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
        console.log(`Added column ${column} to table ${table}`);
      }
    } catch (error) {
      console.error(`Error adding column ${column} to table ${table}:`, error);
    }
  }

  private async insertDefaultSystemSetting(key: string, value: string, description: string): Promise<void> {
    try {
      // Check if setting already exists
      const existingSetting = await db.queryOne('SELECT id FROM system_settings WHERE setting_key = ?', [key]);
      
      if (!existingSetting) {
        await db.execute(
          'INSERT INTO system_settings (setting_key, setting_value, description) VALUES (?, ?, ?)',
          [key, value, description]
        );
        console.log(`Added default system setting: ${key} = ${value}`);
      }
    } catch (error) {
      console.error(`Error inserting default system setting ${key}:`, error);
    }
  }

  private async updateSchemaVersion(): Promise<void> {
    await db.execute(
      'INSERT INTO schema_version (version) VALUES (?)',
      [this.LATEST_SCHEMA_VERSION]
    );
  }

  // Public method to manually trigger update
  async manualUpdate(): Promise<void> {
    toast.loading('Checking for database updates...', { id: 'auto-db-update' });
    
    const result = await this.checkAndUpdate();
    
    if (result.updated) {
      toast.success(result.message, { id: 'auto-db-update' });
      // Reload page to ensure all components use new schema
      setTimeout(() => window.location.reload(), 1000);
    } else {
      toast.success(result.message, { id: 'auto-db-update' });
    }
  }

  // Method to restore from auto backup
  async restoreFromAutoBackup(): Promise<boolean> {
    try {
      if (window.electronAPI) {
        // In Electron mode, show file dialog to select backup
        const dialogResult = await window.electronAPI.showOpenDialog();
        if (!dialogResult.success || !dialogResult.filePath) {
          toast.error('No backup file selected');
          return false;
        }

        const result = await window.electronAPI.restoreDatabase(dialogResult.filePath);
        
        if (result.success) {
          toast.success('Database restored from backup');
          setTimeout(() => window.location.reload(), 1000);
          return true;
        } else {
          toast.error('Failed to restore database');
          return false;
        }
      } else {
        // In browser mode, we can't restore from file backups
        toast.error('Database restore not available in browser mode');
        return false;
      }
    } catch (error) {
      console.error('Error restoring from auto backup:', error);
      toast.error('Failed to restore database');
      return false;
    }
  }
}

export const autoDatabaseUpdate = new AutoDatabaseUpdate();
