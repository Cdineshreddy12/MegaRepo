/**
 * Enhanced Logger with Elasticsearch Integration
 * 
 * This logger extends the existing logger.js functionality while adding
 * Elasticsearch transport for centralized log management.
 * 
 * It maintains backward compatibility with the existing Logger API while
 * adding structured logging to Elasticsearch.
 */

import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';
import BaseLogger from './logger.js';

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

  esTransport.on('error', (error) => {
    console.error('Elasticsearch transport error:', error.message);
  });
} catch (error) {
  console.warn('Failed to initialize Elasticsearch transport:', error.message);
  console.warn('Logging will continue to console only');
}

// Create Winston logger
const winstonLogger = winston.createLogger({
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
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
          return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
        })
      )
    }),
    ...(esTransport ? [esTransport] : [])
  ],
  exitOnError: false
});

/**
 * Enhanced Logger
 * Wraps the existing Logger singleton and adds Elasticsearch logging
 */
const enhancedLogger = {
  // Copy all methods from BaseLogger
  ...BaseLogger,
  
  // Add Winston logger reference
  winstonLogger,
  serviceName: SERVICE_NAME,

  /**
   * Log to both console (via BaseLogger) and Elasticsearch (via Winston)
   */
  logToElasticsearch(level, category, requestId, message, data = {}) {
    // Call base logger's console logging
    BaseLogger.log(level, category, requestId, message, data);

    // Also log to Elasticsearch via Winston
    const logData = {
      level: level === 'success' ? 'info' : level,
      message: `${category}: ${message}`,
      requestId,
      category,
      ...data
    };

    switch (level) {
      case 'info':
      case 'success':
        winstonLogger.info(logData.message, logData);
        break;
      case 'warning':
        winstonLogger.warn(logData.message, logData);
        break;
      case 'error':
        winstonLogger.error(logData.message, logData);
        break;
      case 'debug':
        winstonLogger.debug(logData.message, logData);
        break;
      default:
        winstonLogger.info(logData.message, logData);
    }
  },

  // Wrap onboarding methods to also log to Elasticsearch
  onboarding: {
    start: (requestId, data) => {
      BaseLogger.onboarding.start(requestId, data);
      winstonLogger.info('Onboarding started', { requestId, category: 'onboarding', ...data });
    },

    step: (requestId, stepNumber, description, data = {}) => {
      BaseLogger.onboarding.step(requestId, stepNumber, description, data);
      winstonLogger.info('Onboarding step', { requestId, stepNumber, description, category: 'onboarding', ...data });
    },

    success: (requestId, message, data = {}) => {
      BaseLogger.onboarding.success(requestId, message, data);
      winstonLogger.info('Onboarding success', { requestId, message, category: 'onboarding', ...data });
    },

    error: (requestId, message, error, startTime) => {
      BaseLogger.onboarding.error(requestId, message, error, startTime);
      winstonLogger.error('Onboarding error', {
        requestId,
        message,
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code
        },
        category: 'onboarding',
        duration: BaseLogger.getDuration(startTime)
      });
    },

    complete: (requestId, startTime, data = {}) => {
      BaseLogger.onboarding.complete(requestId, startTime, data);
      winstonLogger.info('Onboarding completed', {
        requestId,
        category: 'onboarding',
        duration: BaseLogger.getDuration(startTime),
        ...data
      });
    }
  },

  // Wrap user methods
  user: {
    invitation: {
      start: (requestId, data) => {
        BaseLogger.user.invitation.start(requestId, data);
        winstonLogger.info('User invitation started', { requestId, category: 'user', ...data });
      },

      step: (requestId, step, description, data = {}) => {
        BaseLogger.user.invitation.step(requestId, step, description, data);
        winstonLogger.info('User invitation step', { requestId, step, description, category: 'user', ...data });
      },

      success: (requestId, startTime, data = {}) => {
        BaseLogger.user.invitation.success(requestId, startTime, data);
        winstonLogger.info('User invitation success', {
          requestId,
          category: 'user',
          duration: BaseLogger.getDuration(startTime),
          ...data
        });
      },

      error: (requestId, error, startTime) => {
        BaseLogger.user.invitation.error(requestId, error, startTime);
        winstonLogger.error('User invitation error', {
          requestId,
          error: {
            message: error.message,
            stack: error.stack
          },
          category: 'user',
          duration: BaseLogger.getDuration(startTime)
        });
      }
    }
  },

  // Wrap billing methods
  billing: {
    start: (requestId, operation, data) => {
      BaseLogger.billing.start(requestId, operation, data);
      winstonLogger.info('Billing operation started', { requestId, operation, category: 'billing', ...data });
    },

    stripe: {
      request: (requestId, method, endpoint, data = {}) => {
        BaseLogger.billing.stripe.request(requestId, method, endpoint, data);
        winstonLogger.info('Stripe API request', { requestId, method, endpoint, category: 'stripe', ...data });
      },

      response: (requestId, status, data = {}) => {
        BaseLogger.billing.stripe.response(requestId, status, data);
        winstonLogger.info('Stripe API response', { requestId, status, category: 'stripe', ...data });
      },

      error: (requestId, error) => {
        BaseLogger.billing.stripe.error(requestId, error);
        winstonLogger.error('Stripe API error', {
          requestId,
          error: {
            message: error.message,
            code: error.code,
            statusCode: error.statusCode
          },
          category: 'stripe'
        });
      }
    },

    success: (requestId, operation, startTime, data = {}) => {
      BaseLogger.billing.success(requestId, operation, startTime, data);
      winstonLogger.info('Billing operation success', {
        requestId,
        operation,
        category: 'billing',
        duration: BaseLogger.getDuration(startTime),
        ...data
      });
    }
  },

  // Wrap database methods
  database: {
    transaction: {
      start: (requestId, description) => {
        BaseLogger.database.transaction.start(requestId, description);
        winstonLogger.info('Database transaction started', { requestId, description, category: 'database' });
      },

      step: (requestId, operation, table, data = {}) => {
        BaseLogger.database.transaction.step(requestId, operation, table, data);
        winstonLogger.info('Database transaction step', { requestId, operation, table, category: 'database', ...data });
      },

      success: (requestId, description, duration, data = {}) => {
        BaseLogger.database.transaction.success(requestId, description, duration, data);
        winstonLogger.info('Database transaction success', {
          requestId,
          description,
          duration,
          category: 'database',
          ...data
        });
      },

      error: (requestId, error, duration) => {
        BaseLogger.database.transaction.error(requestId, error, duration);
        winstonLogger.error('Database transaction error', {
          requestId,
          error: {
            message: error.message,
            code: error.code
          },
          duration,
          category: 'database'
        });
      }
    }
  },

  // Wrap activity methods
  activity: {
    log: (requestId, action, resourceType, resourceId, data = {}) => {
      BaseLogger.activity.log(requestId, action, resourceType, resourceId, data);
      winstonLogger.info('Activity logged', {
        requestId,
        action,
        resourceType,
        resourceId,
        category: 'activity',
        ...data
      });
    }
  },

  // Wrap email methods
  email: {
    send: (requestId, type, recipient, data = {}) => {
      BaseLogger.email.send(requestId, type, recipient, data);
      winstonLogger.info('Email send', { requestId, type, recipient, category: 'email', ...data });
    },

    success: (requestId, type, recipient) => {
      BaseLogger.email.success(requestId, type, recipient);
      winstonLogger.info('Email success', { requestId, type, recipient, category: 'email' });
    },

    error: (requestId, type, recipient, error) => {
      BaseLogger.email.error(requestId, type, recipient, error);
      winstonLogger.error('Email error', {
        requestId,
        type,
        recipient,
        error: {
          message: error.message
        },
        category: 'email'
      });
    }
  }
};

// Export enhanced logger instance
export default enhancedLogger;

