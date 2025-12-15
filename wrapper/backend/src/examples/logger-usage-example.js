/**
 * Logger Usage Examples
 * 
 * This file demonstrates how to use the Elasticsearch logger in your application.
 */

import Logger from '../utils/logger-enhanced.js';
import logger from '../utils/elasticsearch-logger.js';

// Example 1: Using Enhanced Logger (maintains backward compatibility)
async function exampleEnhancedLogger() {
  const requestId = Logger.generateRequestId('onboarding');
  const startTime = Date.now();

  try {
    // Log onboarding start
    Logger.onboarding.start(requestId, {
      tenantId: 'tenant-123',
      email: 'user@example.com'
    });

    // Log onboarding steps
    Logger.onboarding.step(requestId, 1, 'Creating tenant', {
      tenantId: 'tenant-123'
    });

    Logger.onboarding.step(requestId, 2, 'Creating user', {
      userId: 'user-456'
    });

    // Log success
    Logger.onboarding.success(requestId, 'Onboarding completed', {
      tenantId: 'tenant-123',
      userId: 'user-456'
    });

    Logger.onboarding.complete(requestId, startTime, {
      tenantId: 'tenant-123',
      userId: 'user-456'
    });
  } catch (error) {
    Logger.onboarding.error(requestId, 'Onboarding failed', error, startTime);
  }
}

// Example 2: Using Direct Elasticsearch Logger
async function exampleDirectLogger() {
  const requestId = 'req-' + Date.now();

  // Simple info log
  logger.info('User logged in', {
    requestId,
    userId: 'user-123',
    tenantId: 'tenant-456',
    ipAddress: '192.168.1.1'
  });

  // Log HTTP request
  logger.logRequest(
    requestId,
    'POST',
    '/api/users',
    200,
    150,
    {
      userId: 'user-123',
      tenantId: 'tenant-456'
    }
  );

  // Log database operation
  logger.logDatabase(
    requestId,
    'INSERT',
    'users',
    50,
    {
      userId: 'user-123',
      tenantId: 'tenant-456'
    }
  );

  // Log activity
  logger.logActivity(
    requestId,
    'create',
    'user',
    'user-123',
    {
      tenantId: 'tenant-456',
      email: 'user@example.com'
    }
  );

  // Log authentication
  logger.logAuth(
    requestId,
    'login',
    'user-123',
    'tenant-456',
    {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0...'
    }
  );

  // Log billing
  logger.logBilling(
    requestId,
    'create_subscription',
    'tenant-456',
    29.99,
    {
      plan: 'pro',
      userId: 'user-123'
    }
  );

  // Log error
  try {
    throw new Error('Something went wrong');
  } catch (error) {
    logger.logError(requestId, error, {
      tenantId: 'tenant-456',
      userId: 'user-123',
      operation: 'process_payment'
    });
  }
}

// Example 3: Using in Express/Fastify middleware
function exampleMiddleware() {
  return async (request, reply) => {
    const requestId = Logger.generateRequestId('http');
    const startTime = Date.now();

    // Attach request ID to request object
    request.requestId = requestId;

    // Log request start
    logger.info('HTTP Request started', {
      requestId,
      method: request.method,
      url: request.url,
      tenantId: request.tenantId,
      userId: request.userId
    });

    // Process request...
    // (your request handling code here)

    // Log request completion
    const duration = Date.now() - startTime;
    logger.logRequest(
      requestId,
      request.method,
      request.url,
      reply.statusCode || 200,
      duration,
      {
        tenantId: request.tenantId,
        userId: request.userId
      }
    );
  };
}

// Example 4: Using in service layer
class UserService {
  async createUser(tenantId, userData) {
    const requestId = Logger.generateRequestId('user-service');
    const startTime = Date.now();

    try {
      Logger.database.transaction.start(requestId, 'Create user');

      // Database operations...
      Logger.database.transaction.step(requestId, 'INSERT', 'users', userData);

      const userId = 'user-123'; // from database

      Logger.database.transaction.success(
        requestId,
        'Create user',
        Date.now() - startTime,
        { userId, tenantId }
      );

      logger.logActivity(
        requestId,
        'create',
        'user',
        userId,
        { tenantId, email: userData.email }
      );

      return { userId };
    } catch (error) {
      Logger.database.transaction.error(requestId, error, Date.now() - startTime);
      throw error;
    }
  }
}

// Example 5: Using with error handling
async function exampleWithErrorHandling() {
  const requestId = Logger.generateRequestId('payment');
  const startTime = Date.now();

  try {
    Logger.billing.start(requestId, 'process_payment', {
      tenantId: 'tenant-123',
      amount: 29.99
    });

    // Stripe API call
    Logger.billing.stripe.request(
      requestId,
      'POST',
      '/charges',
      { amount: 2999, currency: 'usd' }
    );

    // Simulate success
    Logger.billing.stripe.response(requestId, 200, {
      chargeId: 'ch_1234567890'
    });

    Logger.billing.success(requestId, 'process_payment', Date.now() - startTime, {
      chargeId: 'ch_1234567890'
    });
  } catch (error) {
    Logger.billing.stripe.error(requestId, error);
    Logger.billing.error(requestId, 'process_payment', error, startTime);
  }
}

// Export examples
export {
  exampleEnhancedLogger,
  exampleDirectLogger,
  exampleMiddleware,
  exampleWithErrorHandling,
  UserService
};

// Run examples (uncomment to test)
// exampleEnhancedLogger();
// exampleDirectLogger();
// exampleWithErrorHandling();



