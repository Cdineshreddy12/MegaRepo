/**
 * Elasticsearch Logger Utility
 * 
 * Shared logger pattern that can be used across all applications.
 * Logs to both console and Elasticsearch for centralized log management.
 * 
 * Usage:
 *   const logger = require('./elasticsearch-logger');
 *   logger.info('User logged in', { userId: '123', tenantId: 'tenant-1' });
 * 
 * Environment Variables:
 *   SERVICE_NAME - Name of the service (e.g., 'wrapper-backend', 'auth-service')
 *   ELASTICSEARCH_URL - Elasticsearch endpoint (default: http://localhost:9200)
 *   NODE_ENV - Environment (default: 'local')
 *   LOG_LEVEL - Log level (default: 'info')
 */

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const SERVICE_NAME = process.env.SERVICE_NAME || 'wrapper-backend';
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const NODE_ENV = process.env.NODE_ENV || 'local';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create Elasticsearch transport
let esTransport = null;

try {
  esTransport = new ElasticsearchTransport({
    level: LOG_LEVEL,
    clientOpts: {
      node: ELASTICSEARCH_URL,
      // Disable SSL verification for local development
      ssl: {
        rejectUnauthorized: false
      }
    },
    indexPrefix: 'app-logs',
    indexTemplate: {
      index_patterns: ['app-logs-*'],
      settings: {
        number_of_shards: 1,
        number_of_replicas: 0
      },
      mappings: {
        properties: {
          '@timestamp': { type: 'date' },
          level: { type: 'keyword' },
          message: { type: 'text' },
          service: { type: 'keyword' },
          env: { type: 'keyword' },
          tenantId: { type: 'keyword' },
          userId: { type: 'keyword' },
          requestId: { type: 'keyword' },
          category: { type: 'keyword' },
          error: { type: 'object' }
        }
      }
    },
    transformer: (logData) => {
      // Transform log data to include service name and environment
      return {
        '@timestamp': logData['@timestamp'] || new Date().toISOString(),
        level: logData.level,
        message: logData.message,
        service: SERVICE_NAME,
        env: NODE_ENV,
        ...logData.meta
      };
    }
  });

  // Handle Elasticsearch transport errors gracefully
  esTransport.on('error', (error) => {
    console.error('Elasticsearch transport error:', error.message);
    // Don't crash the app if Elasticsearch is unavailable
  });
} catch (error) {
  console.warn('Failed to initialize Elasticsearch transport:', error.message);
  console.warn('Logging will continue to console only');
}

// Create Winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: {
    service: SERVICE_NAME,
    env: NODE_ENV
  },
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.metadata()
  ),
  transports: [
    // Console transport with pretty formatting for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    // Elasticsearch transport (if initialized)
    ...(esTransport ? [esTransport] : [])
  ],
  // Don't exit on handled exceptions
  exitOnError: false
});

// Add helper methods for common logging patterns
logger.logRequest = (requestId, method, url, statusCode, duration, meta = {}) => {
  logger.info('HTTP Request', {
    requestId,
    method,
    url,
    statusCode,
    duration: `${duration}ms`,
    category: 'http',
    ...meta
  });
};

logger.logError = (requestId, error, context = {}) => {
  logger.error('Error occurred', {
    requestId,
    error: {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    },
    category: 'error',
    ...context
  });
};

logger.logDatabase = (requestId, operation, table, duration, meta = {}) => {
  logger.info('Database operation', {
    requestId,
    operation,
    table,
    duration: `${duration}ms`,
    category: 'database',
    ...meta
  });
};

logger.logActivity = (requestId, action, resourceType, resourceId, meta = {}) => {
  logger.info('Activity logged', {
    requestId,
    action,
    resourceType,
    resourceId,
    category: 'activity',
    ...meta
  });
};

logger.logAuth = (requestId, action, userId, tenantId, meta = {}) => {
  logger.info('Authentication event', {
    requestId,
    action,
    userId,
    tenantId,
    category: 'auth',
    ...meta
  });
};

logger.logBilling = (requestId, operation, tenantId, amount, meta = {}) => {
  logger.info('Billing operation', {
    requestId,
    operation,
    tenantId,
    amount,
    category: 'billing',
    ...meta
  });
};

// Export logger instance
export default logger;



