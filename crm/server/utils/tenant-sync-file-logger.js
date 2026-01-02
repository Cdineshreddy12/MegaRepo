/**
 * 📝 **TENANT SYNC FILE LOGGER**
 * 
 * Specialized logger for tenant sync operations that writes to files
 * for easy debugging and bug tracking.
 * 
 * Features:
 * - Creates separate log file per tenant sync operation
 * - Structured JSON logs with timestamps
 * - Log levels: INFO, SUCCESS, WARNING, ERROR, DEBUG
 * - Automatic log rotation and cleanup
 * - Easy to parse and review
 * - Captures all console output during sync
 * 
 * Usage:
 *   const logger = new TenantSyncFileLogger(tenantId, { processId: '...' });
 *   logger.info('Starting sync', { tenantId });
 *   logger.error('Sync failed', error);
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logs directory relative to server root
const LOGS_DIR = path.join(__dirname, '../../logs/tenant-sync');

// Ensure logs directory exists
async function ensureLogsDirectory() {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create logs directory:', error.message);
  }
}

// Initialize logs directory on module load
ensureLogsDirectory();

// Global console interception state (for handling concurrent syncs)
let globalConsoleIntercepted = false;
let activeLoggers = new Set();
const originalConsoleMethods = {
  log: console.log.bind(console),
  error: console.error.bind(console),
  warn: console.warn.bind(console),
  info: console.info.bind(console),
  debug: console.debug.bind(console)
};

export class TenantSyncFileLogger {
  constructor(tenantId, metadata = {}) {
    this.tenantId = tenantId;
    this.metadata = {
      startTime: new Date().toISOString(),
      processId: metadata.processId || `sync-${process.pid}-${Date.now()}`,
      ...metadata
    };
    this.logFile = null;
    this.logBuffer = [];
    this.flushInterval = null;
    this.initialized = false;
    this.consoleIntercepted = false;
    
    // Initialize log file (async)
    this.initializeLogFile().then(() => {
      // Intercept console methods to capture ALL logs after initialization
      if (!this.consoleIntercepted) {
        this.interceptConsole();
        this.consoleIntercepted = true;
      }
    });
    
    // Also intercept immediately (will work once initialized)
    this.interceptConsole();
    this.consoleIntercepted = true;
  }

  /**
   * Initialize log file
   */
  async initializeLogFile() {
    try {
      await ensureLogsDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `tenant-sync_${this.tenantId}_${timestamp}.log`;
      this.logFile = path.join(LOGS_DIR, filename);
      
      // Write initial metadata
      const header = {
        type: 'TENANT_SYNC_LOG_HEADER',
        tenantId: this.tenantId,
        metadata: this.metadata,
        timestamp: new Date().toISOString()
      };
      
      await fs.appendFile(this.logFile, JSON.stringify(header) + '\n');
      
      // Start periodic flush
      this.flushInterval = setInterval(() => this.flush(), 2000); // Flush every 2 seconds
      
      this.initialized = true;
      this.info('Logger initialized', { logFile: this.logFile });
    } catch (error) {
      console.error('Failed to initialize log file:', error);
      // Fallback to console logging
      this.initialized = false;
    }
  }

  /**
   * Intercept console methods to capture ALL console output
   * Uses a global interception approach to handle concurrent syncs
   */
  interceptConsole() {
    // Only intercept once per instance
    if (this._consoleIntercepted) {
      return;
    }
    this._consoleIntercepted = true;
    activeLoggers.add(this);
    
    // Only set up global interception once
    if (!globalConsoleIntercepted) {
      globalConsoleIntercepted = true;
      
      // Intercept console.log
      console.log = (...args) => {
        activeLoggers.forEach(logger => {
          if (logger.initialized) {
            logger.captureConsoleOutput('info', 'console', args);
          }
        });
        originalConsoleMethods.log(...args);
      };
      
      // Intercept console.error
      console.error = (...args) => {
        activeLoggers.forEach(logger => {
          if (logger.initialized) {
            logger.captureConsoleOutput('error', 'console', args);
          }
        });
        originalConsoleMethods.error(...args);
      };
      
      // Intercept console.warn
      console.warn = (...args) => {
        activeLoggers.forEach(logger => {
          if (logger.initialized) {
            logger.captureConsoleOutput('warning', 'console', args);
          }
        });
        originalConsoleMethods.warn(...args);
      };
      
      // Intercept console.info
      console.info = (...args) => {
        activeLoggers.forEach(logger => {
          if (logger.initialized) {
            logger.captureConsoleOutput('info', 'console', args);
          }
        });
        originalConsoleMethods.info(...args);
      };
      
      // Intercept console.debug
      console.debug = (...args) => {
        activeLoggers.forEach(logger => {
          if (logger.initialized) {
            logger.captureConsoleOutput('debug', 'console', args);
          }
        });
        originalConsoleMethods.debug(...args);
      };
    }
  }

  /**
   * Restore original console methods
   * Only restores if this is the last active logger
   */
  restoreConsole() {
    if (this._consoleIntercepted) {
      activeLoggers.delete(this);
      
      // Only restore if no other loggers are active
      if (activeLoggers.size === 0 && globalConsoleIntercepted) {
        console.log = originalConsoleMethods.log;
        console.error = originalConsoleMethods.error;
        console.warn = originalConsoleMethods.warn;
        console.info = originalConsoleMethods.info;
        console.debug = originalConsoleMethods.debug;
        globalConsoleIntercepted = false;
      }
      
      this._consoleIntercepted = false;
    }
  }

  /**
   * Capture console output and write to file
   */
  captureConsoleOutput(level, category, args) {
    if (!this.initialized) return;
    
    // Convert all args to string
    const message = args
      .map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(' ');
    
    this.writeLog(level, category, message, { capturedFromConsole: true });
  }

  /**
   * Write log entry
   */
  async writeLog(level, category, message, data = {}, error = null) {
    if (!this.initialized) {
      // Fallback to console if not initialized
      this.originalConsole[level === 'error' ? 'error' : 'log'](message, data, error);
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      category,
      message,
      tenantId: this.tenantId,
      ...(Object.keys(data).length > 0 && { data }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          name: error.name
        }
      })
    };

    this.logBuffer.push(entry);

    // Flush if buffer is full
    if (this.logBuffer.length >= 10) {
      await this.flush();
    }
  }

  /**
   * Flush buffer to file
   */
  async flush() {
    if (!this.initialized || this.logBuffer.length === 0) {
      return;
    }

    try {
      const entries = this.logBuffer.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.appendFile(this.logFile, entries);
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    this.writeLog('info', 'sync', message, data);
  }

  /**
   * Log success message
   */
  success(message, data = {}) {
    this.writeLog('success', 'sync', message, data);
  }

  /**
   * Log warning message
   */
  warning(message, data = {}) {
    this.writeLog('warning', 'sync', message, data);
  }

  /**
   * Log error message
   */
  error(message, error = null, data = {}) {
    this.writeLog('error', 'sync', message, data, error);
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    this.writeLog('debug', 'sync', message, data);
  }

  /**
   * Finalize log file and restore console
   */
  async finalize(result = {}) {
    // Flush any remaining logs
    await this.flush();
    
    // Write footer
    const footer = {
      type: 'TENANT_SYNC_LOG_FOOTER',
      tenantId: this.tenantId,
      result,
      endTime: new Date().toISOString(),
      duration: result.duration || null,
      timestamp: new Date().toISOString()
    };
    
    try {
      await fs.appendFile(this.logFile, JSON.stringify(footer) + '\n');
    } catch (error) {
      console.error('Failed to write footer to log file:', error);
    }
    
    // Clear flush interval
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Restore console
    this.restoreConsole();
    
    this.info('Logger finalized', { logFile: this.logFile });
    
    return this.logFile;
  }

  /**
   * Get log file path
   */
  getLogFilePath() {
    return this.logFile;
  }
}

/**
 * Utility function to read and parse log file
 */
export async function parseLogFile(logFilePath) {
  try {
    const content = await fs.readFile(logFilePath, 'utf-8');
    const lines = content.trim().split('\n');
    
    const logs = [];
    let header = null;
    let footer = null;

    for (const line of lines) {
      if (!line.trim()) continue;
      
      try {
        const entry = JSON.parse(line);
        
        if (entry.type === 'TENANT_SYNC_LOG_HEADER') {
          header = entry;
        } else if (entry.type === 'TENANT_SYNC_LOG_FOOTER') {
          footer = entry;
        } else {
          logs.push(entry);
        }
      } catch (parseError) {
        // Skip invalid JSON lines
        console.warn('Failed to parse log line:', line);
      }
    }

    return {
      header,
      logs,
      footer,
      summary: {
        totalLogs: logs.length,
        errors: logs.filter(l => l.level === 'ERROR').length,
        warnings: logs.filter(l => l.level === 'WARNING').length,
        successes: logs.filter(l => l.level === 'SUCCESS').length,
        infos: logs.filter(l => l.level === 'INFO').length
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse log file: ${error.message}`);
  }
}

/**
 * Utility function to list all tenant sync log files
 */
export async function listLogFiles(limit = 50) {
  try {
    await ensureLogsDirectory();
    const files = await fs.readdir(LOGS_DIR);
    
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        filename: file,
        path: path.join(LOGS_DIR, file),
        tenantId: file.match(/tenant-sync_([^_]+)_/)?.[1] || 'unknown'
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename)) // Most recent first
      .slice(0, limit);
    
    return logFiles;
  } catch (error) {
    throw new Error(`Failed to list log files: ${error.message}`);
  }
}

/**
 * Utility function to get latest log file for a tenant
 */
export async function getLatestLogFile(tenantId) {
  try {
    const logFiles = await listLogFiles(100);
    const tenantLogs = logFiles.filter(file => file.tenantId === tenantId);
    return tenantLogs.length > 0 ? tenantLogs[0] : null;
  } catch (error) {
    throw new Error(`Failed to get latest log file: ${error.message}`);
  }
}

