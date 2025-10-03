import { db } from './database';
import { logger } from './logger';

export interface TableInfo {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  indexes: IndexInfo[];
  foreignKeys: ForeignKeyInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: any;
  primaryKey: boolean;
  unique: boolean;
}

export interface IndexInfo {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKeyInfo {
  column: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

export interface QueryResult {
  success: boolean;
  data?: any[];
  columns?: string[];
  rowCount?: number;
  error?: string;
  executionTime?: number;
}

export interface TableData {
  data: any[];
  columns: string[];
  totalRows: number;
  page: number;
  pageSize: number;
}

class CrudService {
  private readonly ADMIN_TABLES = [
    'users', 'workshops', 'workstations', 'groups', 'families', 'products', 
    'routes', 'features', 'gammas', 'measurements', 'registration_codes',
    'user_validation_requests', 'notifications', 'system_settings',
    'user_preferences', 'user_settings', 'images', 'workshop_methods',
    'family_workshops', 'schema_version'
  ];

  private readonly READONLY_TABLES = [
    'schema_version', 'sqlite_sequence'
  ];

  private readonly DANGEROUS_TABLES = [
    'users', 'system_settings', 'schema_version'
  ];

  // Get all available tables for CRUD operations
  async getAvailableTables(): Promise<string[]> {
    try {
      const tables = await db.queryAll(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `);
      return tables.map(t => t.name).filter(name => this.ADMIN_TABLES.includes(name));
    } catch (error) {
      console.error('Error getting available tables:', error);
      return [];
    }
  }

  // Get detailed table information
  async getTableInfo(tableName: string): Promise<TableInfo | null> {
    try {
      // Get column information
      const columns = await db.queryAll(`PRAGMA table_info(${tableName})`);
      
      // Get row count
      const rowCountResult = await db.queryOne(`SELECT COUNT(*) as count FROM ${tableName}`);
      const rowCount = rowCountResult?.count || 0;

      // Get indexes
      const indexes = await db.queryAll(`PRAGMA index_list(${tableName})`);
      const indexDetails = await Promise.all(
        indexes.map(async (index) => {
          const indexColumns = await db.queryAll(`PRAGMA index_info(${index.name})`);
          return {
            name: index.name,
            columns: indexColumns.map(col => col.name),
            unique: index.unique === 1
          };
        })
      );

      // Get foreign keys
      const foreignKeys = await db.queryAll(`PRAGMA foreign_key_list(${tableName})`);

      return {
        name: tableName,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: col.notnull === 0,
          defaultValue: col.dflt_value,
          primaryKey: col.pk === 1,
          unique: false // SQLite doesn't expose this directly
        })),
        rowCount,
        indexes: indexDetails,
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.from,
          referencedTable: fk.table,
          referencedColumn: fk.to,
          onDelete: fk.on_delete || 'NO ACTION',
          onUpdate: fk.on_update || 'NO ACTION'
        }))
      };
    } catch (error) {
      console.error(`Error getting table info for ${tableName}:`, error);
      return null;
    }
  }

  // Get table data with pagination
  async getTableData(
    tableName: string, 
    page: number = 1, 
    pageSize: number = 50,
    searchTerm?: string,
    sortColumn?: string,
    sortDirection: 'ASC' | 'DESC' = 'ASC'
  ): Promise<TableData> {
    try {
      const offset = (page - 1) * pageSize;
      
      // Build WHERE clause for search
      let whereClause = '';
      let params: any[] = [];
      
      if (searchTerm) {
        const tableInfo = await this.getTableInfo(tableName);
        if (tableInfo) {
          const searchableColumns = tableInfo.columns
            .filter(col => col.type === 'TEXT' || col.type === 'VARCHAR')
            .map(col => col.name);
          
          if (searchableColumns.length > 0) {
            const searchConditions = searchableColumns.map(col => `${col} LIKE ?`);
            whereClause = `WHERE ${searchConditions.join(' OR ')}`;
            params = searchableColumns.map(() => `%${searchTerm}%`);
          }
        }
      }

      // Build ORDER BY clause
      const orderClause = sortColumn ? `ORDER BY ${sortColumn} ${sortDirection}` : '';

      // Get total count
      const countSql = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause}`;
      const totalResult = await db.queryOne(countSql, params);
      const totalRows = totalResult?.count || 0;

      // Get paginated data
      const dataSql = `
        SELECT * FROM ${tableName} 
        ${whereClause} 
        ${orderClause} 
        LIMIT ${pageSize} OFFSET ${offset}
      `;
      
      const data = await db.queryAll(dataSql, params);
      
      // Get column names
      const tableInfo = await this.getTableInfo(tableName);
      const columns = tableInfo?.columns.map(col => col.name) || [];

      return {
        data,
        columns,
        totalRows,
        page,
        pageSize
      };
    } catch (error) {
      console.error(`Error getting table data for ${tableName}:`, error);
      throw error;
    }
  }

  // Create new record
  async createRecord(tableName: string, data: Record<string, any>): Promise<{ success: boolean; id?: number; error?: string }> {
    try {
      if (this.READONLY_TABLES.includes(tableName)) {
        return { success: false, error: 'Cannot modify readonly table' };
      }

      const tableInfo = await this.getTableInfo(tableName);
      if (!tableInfo) {
        return { success: false, error: 'Table not found' };
      }

      // Filter out auto-generated columns
      const insertableColumns = tableInfo.columns
        .filter(col => !col.primaryKey || col.type !== 'INTEGER')
        .map(col => col.name);

      const values = insertableColumns.map(col => data[col] || null);
      const placeholders = insertableColumns.map(() => '?').join(', ');

      const sql = `INSERT INTO ${tableName} (${insertableColumns.join(', ')}) VALUES (${placeholders})`;
      
      const result = await db.execute(sql, values);
      
      // Get the inserted ID
      const lastIdResult = await db.queryOne('SELECT last_insert_rowid() as id');
      
      logger.logDatabase('CREATE', `Created record in ${tableName}`, { id: lastIdResult?.id, data });
      
      return { success: true, id: lastIdResult?.id };
    } catch (error) {
      console.error(`Error creating record in ${tableName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Update record
  async updateRecord(tableName: string, id: number, data: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.READONLY_TABLES.includes(tableName)) {
        return { success: false, error: 'Cannot modify readonly table' };
      }

      const tableInfo = await this.getTableInfo(tableName);
      if (!tableInfo) {
        return { success: false, error: 'Table not found' };
      }

      // Filter out auto-generated columns and get primary key
      const primaryKeyColumn = tableInfo.columns.find(col => col.primaryKey);
      if (!primaryKeyColumn) {
        return { success: false, error: 'No primary key found' };
      }

      const updateableColumns = tableInfo.columns
        .filter(col => !col.primaryKey)
        .map(col => col.name);

      const setClause = updateableColumns
        .filter(col => data.hasOwnProperty(col))
        .map(col => `${col} = ?`)
        .join(', ');

      if (!setClause) {
        return { success: false, error: 'No fields to update' };
      }

      const values = updateableColumns
        .filter(col => data.hasOwnProperty(col))
        .map(col => data[col]);

      const sql = `UPDATE ${tableName} SET ${setClause} WHERE ${primaryKeyColumn.name} = ?`;
      
      await db.execute(sql, [...values, id]);
      
      logger.logDatabase('UPDATE', `Updated record in ${tableName}`, { id, data });
      
      return { success: true };
    } catch (error) {
      console.error(`Error updating record in ${tableName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Delete record
  async deleteRecord(tableName: string, id: number): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.READONLY_TABLES.includes(tableName)) {
        return { success: false, error: 'Cannot modify readonly table' };
      }

      if (this.DANGEROUS_TABLES.includes(tableName)) {
        return { success: false, error: 'Cannot delete from dangerous table. Use specialized functions.' };
      }

      const tableInfo = await this.getTableInfo(tableName);
      if (!tableInfo) {
        return { success: false, error: 'Table not found' };
      }

      const primaryKeyColumn = tableInfo.columns.find(col => col.primaryKey);
      if (!primaryKeyColumn) {
        return { success: false, error: 'No primary key found' };
      }

      const sql = `DELETE FROM ${tableName} WHERE ${primaryKeyColumn.name} = ?`;
      
      await db.execute(sql, [id]);
      
      logger.logDatabase('DELETE', `Deleted record from ${tableName}`, { id });
      
      return { success: true };
    } catch (error) {
      console.error(`Error deleting record from ${tableName}:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Execute custom SQL query
  async executeQuery(sql: string, params: any[] = []): Promise<QueryResult> {
    try {
      const startTime = Date.now();
      
      // Basic SQL injection protection
      const dangerousKeywords = ['DROP', 'ALTER', 'CREATE', 'DELETE', 'UPDATE', 'INSERT'];
      const upperSql = sql.toUpperCase().trim();
      
      if (dangerousKeywords.some(keyword => upperSql.includes(keyword))) {
        return { 
          success: false, 
          error: 'Dangerous SQL operations are not allowed. Use the CRUD operations instead.' 
        };
      }

      const result = await db.queryAll(sql, params);
      const executionTime = Date.now() - startTime;

      // Get column names from first row
      const columns = result.length > 0 ? Object.keys(result[0]) : [];

      return {
        success: true,
        data: result,
        columns,
        rowCount: result.length,
        executionTime
      };
    } catch (error) {
      console.error('Error executing query:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Export table data to CSV format
  async exportTableToCSV(tableName: string): Promise<{ success: boolean; csv?: string; error?: string }> {
    try {
      const tableData = await this.getTableData(tableName, 1, 10000); // Get all data
      
      if (tableData.data.length === 0) {
        return { success: true, csv: '' };
      }

      // Create CSV header
      const headers = tableData.columns.join(',');
      
      // Create CSV rows
      const rows = tableData.data.map(row => 
        tableData.columns.map(col => {
          const value = row[col];
          // Escape CSV values
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      );

      const csv = [headers, ...rows].join('\n');
      
      logger.logDatabase('EXPORT', `Exported ${tableName} to CSV`, { rowCount: tableData.data.length });
      
      return { success: true, csv };
    } catch (error) {
      console.error(`Error exporting ${tableName} to CSV:`, error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Get table relationships
  async getTableRelationships(tableName: string): Promise<{
    referencedBy: string[];
    references: string[];
  }> {
    try {
      // Get tables that reference this table
      const referencedBy = await db.queryAll(`
        SELECT DISTINCT m.name as table_name
        FROM sqlite_master m
        JOIN pragma_foreign_key_list(m.name) fk ON fk.table = ?
        WHERE m.type = 'table'
      `, [tableName]);

      // Get tables that this table references
      const references = await db.queryAll(`
        SELECT DISTINCT fk.table as referenced_table
        FROM pragma_foreign_key_list(?)
      `, [tableName]);

      return {
        referencedBy: referencedBy.map(r => r.table_name),
        references: references.map(r => r.referenced_table)
      };
    } catch (error) {
      console.error(`Error getting relationships for ${tableName}:`, error);
      return { referencedBy: [], references: [] };
    }
  }

  // Validate table name
  isValidTableName(tableName: string): boolean {
    return this.ADMIN_TABLES.includes(tableName);
  }

  // Check if table is readonly
  isReadonlyTable(tableName: string): boolean {
    return this.READONLY_TABLES.includes(tableName);
  }

  // Check if table is dangerous
  isDangerousTable(tableName: string): boolean {
    return this.DANGEROUS_TABLES.includes(tableName);
  }
}

export const crudService = new CrudService();

