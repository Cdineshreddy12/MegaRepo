/**
 * 📝 **ONBOARDING FILE LOGGER**
 * 
 * Specialized logger for onboarding flow that writes to files
 * for easy debugging and bug tracking.
 * 
 * Features:
 * - Creates separate log file per onboarding session
 * - Structured JSON logs with timestamps
 * - Log levels: INFO, SUCCESS, WARNING, ERROR, DEBUG
 * - Automatic log rotation and cleanup
 * - Easy to parse and review
 * 
 * Usage:
 *   const logger = new OnboardingFileLogger('onboarding-session-id');
 *   logger.info('Step 1: Creating tenant', { tenantId: '...' });
 *   logger.error('Failed to create organization', error);
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Logs directory relative to backend root
const LOGS_DIR = path.join(__dirname, '../../logs/onboarding');

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

export class OnboardingFileLogger {
  constructor(sessionId = null, metadata = {}) {
    this.sessionId = sessionId || this.generateSessionId();
    this.metadata = {
      startTime: new Date().toISOString(),
      ...metadata
    };
    this.logFile = null;
    this.logBuffer = [];
    this.flushInterval = null;
    this.initialized = false;
    this.consoleIntercepted = false;
    
    // Store original console methods for restoration (must be done FIRST)
    this.originalConsole = {
      log: console.log.bind(console),
      error: console.error.bind(console),
      warn: console.warn.bind(console),
      info: console.info.bind(console),
      debug: console.debug.bind(console)
    };
    
    // Initialize log file (async, but we'll intercept console after)
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
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `onboarding_${timestamp}_${random}`;
  }

  /**
   * Initialize log file
   */
  async initializeLogFile() {
    try {
      await ensureLogsDirectory();
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `onboarding_${this.sessionId}_${timestamp}.log`;
      this.logFile = path.join(LOGS_DIR, filename);
      
      // Write initial metadata
      const header = {
        type: 'ONBOARDING_LOG_HEADER',
        sessionId: this.sessionId,
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
   */
  interceptConsole() {
    // Only intercept once per instance
    if (this._consoleIntercepted) {
      return;
    }
    this._consoleIntercepted = true;
    
    const self = this;
    let isCapturing = false; // Prevent infinite loops
    
    // Intercept console.log
    const originalLog = console.log;
    console.log = (...args) => {
      if (!isCapturing && self.initialized) {
        isCapturing = true;
        self.captureConsoleOutput('info', 'console', args);
        isCapturing = false;
      }
      originalLog(...args);
    };
    
    // Intercept console.error
    const originalError = console.error;
    console.error = (...args) => {
      if (!isCapturing && self.initialized) {
        isCapturing = true;
        self.captureConsoleOutput('error', 'console', args);
        isCapturing = false;
      }
      originalError(...args);
    };
    
    // Intercept console.warn
    const originalWarn = console.warn;
    console.warn = (...args) => {
      if (!isCapturing && self.initialized) {
        isCapturing = true;
        self.captureConsoleOutput('warning', 'console', args);
        isCapturing = false;
      }
      originalWarn(...args);
    };
    
    // Intercept console.info
    const originalInfo = console.info;
    console.info = (...args) => {
      if (!isCapturing && self.initialized) {
        isCapturing = true;
        self.captureConsoleOutput('info', 'console', args);
        isCapturing = false;
      }
      originalInfo(...args);
    };
    
    // Intercept console.debug
    const originalDebug = console.debug;
    console.debug = (...args) => {
      if (!isCapturing && self.initialized) {
        isCapturing = true;
        self.captureConsoleOutput('debug', 'console', args);
        isCapturing = false;
      }
      originalDebug(...args);
    };
  }

  /**
   * Capture console output and convert to log entry
   */
  captureConsoleOutput(level, category, args) {
    try {
      // Convert console arguments to string message
      let message = '';
      let data = {};
      
      args.forEach((arg, index) => {
        if (typeof arg === 'string') {
          message += (message ? ' ' : '') + arg;
        } else if (arg instanceof Error) {
          message += (message ? ' ' : '') + arg.message;
          data.error = {
            message: arg.message,
            stack: arg.stack,
            name: arg.name,
            code: arg.code
          };
        } else if (typeof arg === 'object' && arg !== null) {
          // If it's the first object and message is empty, try to extract message
          if (!message && index === 0 && arg.message) {
            message = arg.message;
          }
          // Merge object data
          data = { ...data, ...arg };
        } else {
          message += (message ? ' ' : '') + String(arg);
        }
      });
      
      // If no message extracted, create one from data
      if (!message && Object.keys(data).length > 0) {
        message = JSON.stringify(data);
      } else if (!message) {
        message = args.map(a => String(a)).join(' ');
      }
      
      // Determine category from message content
      let detectedCategory = category;
      const messageLower = message.toLowerCase();
      
      if (messageLower.includes('kinde') || messageLower.includes('🔑')) {
        detectedCategory = 'kinde';
      } else if (messageLower.includes('database') || messageLower.includes('db') || messageLower.includes('💾')) {
        detectedCategory = 'database';
      } else if (messageLower.includes('credit') || messageLower.includes('💰')) {
        detectedCategory = 'credit';
      } else if (messageLower.includes('subscription') || messageLower.includes('💳')) {
        detectedCategory = 'subscription';
      } else if (messageLower.includes('role') || messageLower.includes('🔐')) {
        detectedCategory = 'role';
      } else if (messageLower.includes('user') || messageLower.includes('👤')) {
        detectedCategory = 'user';
      } else if (messageLower.includes('onboarding') || messageLower.includes('🚀')) {
        detectedCategory = 'onboarding';
      } else if (messageLower.includes('validation') || messageLower.includes('✅')) {
        detectedCategory = 'validation';
      } else if (messageLower.includes('api') || messageLower.includes('🌐')) {
        detectedCategory = 'api';
      }
      
      // Create log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: level.toUpperCase(),
        category: detectedCategory,
        sessionId: this.sessionId,
        message: message,
        source: 'console',
        ...(Object.keys(data).length > 0 && { data })
      };
      
      // Add to buffer
      this.logBuffer.push(logEntry);
      
      // Flush if buffer is large
      if (this.logBuffer.length >= 10) {
        this.flush();
      }
    } catch (captureError) {
      // Don't break console if capture fails
      this.originalConsole.error('Failed to capture console output:', captureError);
    }
  }

  /**
   * Restore original console methods
   */
  restoreConsole() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  /**
   * Write log entry
   */
  async writeLog(level, category, message, data = {}, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level.toUpperCase(),
      category,
      sessionId: this.sessionId,
      message,
      ...(Object.keys(data).length > 0 && { data }),
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
          code: error.code,
          ...(error.response && {
            response: {
              status: error.response.status,
              statusText: error.response.statusText,
              data: error.response.data
            }
          })
        }
      })
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Also log to console with emoji (use original console to avoid recursion)
    const emoji = this.getEmoji(level, category);
    const consoleMessage = `${emoji} [${this.sessionId}] ${category}: ${message}`;
    
    if (level === 'error') {
      this.originalConsole.error(consoleMessage);
      if (error) {
        this.originalConsole.error('Error details:', error);
      }
    } else if (level === 'warning') {
      this.originalConsole.warn(consoleMessage);
    } else {
      this.originalConsole.log(consoleMessage);
    }

    // If buffer is large, flush immediately
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
   * Get emoji for log level/category
   */
  getEmoji(level, category) {
    const emojiMap = {
      info: '📋',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍',
      onboarding: '🚀',
      kinde: '🔑',
      database: '💾',
      credit: '💰',
      subscription: '💳',
      role: '🔐',
      user: '👤',
      validation: '✅',
      api: '🌐'
    };
    
    return emojiMap[category] || emojiMap[level] || '📋';
  }

  /**
   * Log levels
   */
  info(category, message, data = {}) {
    return this.writeLog('info', category, message, data);
  }

  success(category, message, data = {}) {
    return this.writeLog('success', category, message, data);
  }

  warning(category, message, data = {}) {
    return this.writeLog('warning', category, message, data);
  }

  error(category, message, error = null, data = {}) {
    return this.writeLog('error', category, message, data, error);
  }

  debug(category, message, data = {}) {
    return this.writeLog('debug', category, message, data);
  }

  /**
   * Specialized onboarding methods
   */
  onboarding = {
    start: (data) => {
      return this.writeLog('info', 'onboarding', '🚀 ONBOARDING STARTED', data);
    },

    step: (stepNumber, stepName, description, data = {}) => {
      return this.writeLog('info', 'onboarding', `Step ${stepNumber}: ${stepName} - ${description}`, {
        stepNumber,
        stepName,
        ...data
      });
    },

    success: (message, data = {}) => {
      return this.writeLog('success', 'onboarding', message, data);
    },

    error: (message, error = null, data = {}) => {
      return this.writeLog('error', 'onboarding', message, data, error);
    },

    warning: (message, data = {}) => {
      return this.writeLog('warning', 'onboarding', message, data);
    }
  };

  /**
   * Kinde operations
   */
  kinde = {
    start: (operation, data = {}) => {
      return this.writeLog('info', 'kinde', `Kinde: ${operation}`, data);
    },

    success: (operation, data = {}) => {
      return this.writeLog('success', 'kinde', `Kinde: ${operation} - Success`, data);
    },

    error: (operation, error, data = {}) => {
      return this.writeLog('error', 'kinde', `Kinde: ${operation} - Failed`, data, error);
    }
  };

  /**
   * Database operations
   */
  database = {
    query: (operation, table, data = {}) => {
      return this.writeLog('debug', 'database', `DB Query: ${operation} on ${table}`, data);
    },

    success: (operation, table, data = {}) => {
      return this.writeLog('success', 'database', `DB Success: ${operation} on ${table}`, data);
    },

    error: (operation, table, error, data = {}) => {
      return this.writeLog('error', 'database', `DB Error: ${operation} on ${table}`, data, error);
    }
  };

  /**
   * Credit operations
   */
  credit = {
    allocation: (message, data = {}) => {
      return this.writeLog('info', 'credit', `Credit Allocation: ${message}`, data);
    },

    success: (message, data = {}) => {
      return this.writeLog('success', 'credit', `Credit Success: ${message}`, data);
    },

    error: (message, error, data = {}) => {
      return this.writeLog('error', 'credit', `Credit Error: ${message}`, data, error);
    }
  };

  /**
   * Finalize logging session
   */
  async finalize(result = {}) {
    // Restore original console methods
    this.restoreConsole();
    
    // Flush remaining buffer
    await this.flush();

    // Write footer
    const footer = {
      type: 'ONBOARDING_LOG_FOOTER',
      sessionId: this.sessionId,
      endTime: new Date().toISOString(),
      result,
      duration: this.getDuration()
    };

    try {
      await fs.appendFile(this.logFile, JSON.stringify(footer) + '\n');
      
      // Clear flush interval
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }

      // Use original console for final message
      this.originalConsole.log(`✅ [${this.sessionId}] Logger finalized - Log file: ${this.logFile}`);
      
      return {
        sessionId: this.sessionId,
        logFile: this.logFile
      };
    } catch (error) {
      this.originalConsole.error('Failed to finalize log file:', error);
      return { sessionId: this.sessionId, logFile: null };
    }
  }

  /**
   * Get duration since start
   */
  getDuration() {
    const start = new Date(this.metadata.startTime);
    const end = new Date();
    return `${end - start}ms`;
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
        
        if (entry.type === 'ONBOARDING_LOG_HEADER') {
          header = entry;
        } else if (entry.type === 'ONBOARDING_LOG_FOOTER') {
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
        successes: logs.filter(l => l.level === 'SUCCESS').length
      }
    };
  } catch (error) {
    throw new Error(`Failed to parse log file: ${error.message}`);
  }
}

/**
 * Utility function to list all onboarding log files
 */
export async function listLogFiles(limit = 50) {
  try {
    await ensureLogsDirectory();
    const files = await fs.readdir(LOGS_DIR);
    
    const logFiles = files
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        filename: file,
        path: path.join(LOGS_DIR, file)
      }))
      .sort((a, b) => b.filename.localeCompare(a.filename)) // Most recent first
      .slice(0, limit);

    return logFiles;
  } catch (error) {
    console.error('Failed to list log files:', error);
    return [];
  }
}

/**
 * Utility function to get latest log file
 */
export async function getLatestLogFile() {
  const files = await listLogFiles(1);
  return files.length > 0 ? files[0] : null;
}

export default OnboardingFileLogger;

