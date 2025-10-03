export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogCategory = 'auth' | 'database' | 'ui' | 'api' | 'system' | 'user_action' | 'security';

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  details?: any;
  userId?: string;
  userRole?: string;
  module?: string;
  action?: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  metadata?: Record<string, any>;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private isInitialized = false;

  initialize(): void {
    if (this.isInitialized) return;
    
    // Load existing logs from localStorage
    this.loadLogsFromStorage();
    
    // Set up global error handlers
    this.setupGlobalErrorHandlers();
    
    this.isInitialized = true;
    this.log('info', 'system', 'Logger service initialized');
  }

  private setupGlobalErrorHandlers(): void {
    // Catch unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      this.log('error', 'system', 'Unhandled JavaScript error', {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        message: event.message
      }, {
        error: {
          name: 'JavaScriptError',
          message: event.message,
          stack: event.error?.stack
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'system', 'Unhandled promise rejection', {
        reason: event.reason
      }, {
        error: {
          name: 'PromiseRejection',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack
        }
      });
    });
  }

  private loadLogsFromStorage(): void {
    try {
      const stored = localStorage.getItem('spc-logs');
      if (stored) {
        this.logs = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load logs from storage:', error);
      this.logs = [];
    }
  }

  private saveLogsToStorage(): void {
    try {
      localStorage.setItem('spc-logs', JSON.stringify(this.logs));
    } catch (error) {
      console.error('Failed to save logs to storage:', error);
    }
  }

  private generateLogId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  log(
    level: LogLevel,
    category: LogCategory,
    message: string,
    details?: any,
    metadata?: Partial<LogEntry>
  ): void {
    const logEntry: LogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details,
      ...metadata
    };

    // Add to logs array
    this.logs.unshift(logEntry); // Add to beginning for newest first

    // Keep only the last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Save to storage
    this.saveLogsToStorage();

    // Also log to console for development
    const consoleMethod = level === 'error' ? 'error' : 
                         level === 'warn' ? 'warn' : 
                         level === 'info' ? 'info' : 'log';
    
    console[consoleMethod](`[${category.toUpperCase()}] ${message}`, details || '');
  }

  // Convenience methods for different log levels
  error(category: LogCategory, message: string, details?: any, metadata?: Partial<LogEntry>): void {
    this.log('error', category, message, details, metadata);
  }

  warn(category: LogCategory, message: string, details?: any, metadata?: Partial<LogEntry>): void {
    this.log('warn', category, message, details, metadata);
  }

  info(category: LogCategory, message: string, details?: any, metadata?: Partial<LogEntry>): void {
    this.log('info', category, message, details, metadata);
  }

  debug(category: LogCategory, message: string, details?: any, metadata?: Partial<LogEntry>): void {
    this.log('debug', category, message, details, metadata);
  }

  // User action logging
  logUserAction(
    action: string,
    module: string,
    details?: any,
    userId?: string,
    userRole?: string
  ): void {
    this.log('info', 'user_action', `User action: ${action}`, details, {
      userId,
      userRole,
      module,
      action
    });
  }

  // Authentication logging
  logAuth(action: string, details?: any, userId?: string, userRole?: string): void {
    this.log('info', 'auth', `Auth: ${action}`, details, {
      userId,
      userRole,
      action
    });
  }

  // Database operation logging
  logDatabase(operation: string, table: string, details?: any): void {
    this.log('info', 'database', `Database ${operation}: ${table}`, details, {
      action: operation,
      module: 'database'
    });
  }

  // Security logging
  logSecurity(event: string, details?: any, userId?: string): void {
    this.log('warn', 'security', `Security: ${event}`, details, {
      userId,
      action: event
    });
  }

  // Get all logs
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }

  // Get logs filtered by criteria
  getLogs(filters: {
    level?: LogLevel;
    category?: LogCategory;
    userId?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filters.level) {
      filteredLogs = filteredLogs.filter(log => log.level === filters.level);
    }

    if (filters.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filters.category);
    }

    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }

    if (filters.module) {
      filteredLogs = filteredLogs.filter(log => log.module === filters.module);
    }

    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
    }

    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchLower) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchLower))
      );
    }

    return filteredLogs;
  }

  // Clear all logs
  clearLogs(): void {
    this.logs = [];
    this.saveLogsToStorage();
    this.log('info', 'system', 'All logs cleared');
  }

  // Export logs
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  // Get log statistics
  getLogStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byCategory: Record<LogCategory, number>;
    recentErrors: number;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {
        error: 0,
        warn: 0,
        info: 0,
        debug: 0
      } as Record<LogLevel, number>,
      byCategory: {
        auth: 0,
        database: 0,
        ui: 0,
        api: 0,
        system: 0,
        user_action: 0,
        security: 0
      } as Record<LogCategory, number>,
      recentErrors: 0
    };

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    this.logs.forEach(log => {
      stats.byLevel[log.level]++;
      stats.byCategory[log.category]++;
      
      if (log.level === 'error' && log.timestamp >= oneHourAgo) {
        stats.recentErrors++;
      }
    });

    return stats;
  }
}

export const logger = new LoggerService();