/**
 * Enhanced Logging Utility
 * Provides structured logging for debugging onboarding, user management, roles, billing, and Stripe operations
 */

class Logger {
  constructor() {
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m'
    };
  }

  // Generate unique request ID
  generateRequestId(prefix = 'req') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Format timestamp
  getTimestamp() {
    return new Date().toISOString();
  }

  // Get formatted duration
  getDuration(startTime) {
    return `${Date.now() - startTime}ms`;
  }

  // Base logging method with context
  log(level, category, requestId, message, data = {}) {
    const timestamp = this.getTimestamp();
    const emoji = this.getEmoji(level, category);
    
    console.log(`\n${emoji} [${requestId}] ${category}: ${message}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    
    if (Object.keys(data).length > 0) {
      console.log(`📊 Data:`, JSON.stringify(data, null, 2));
    }
  }

  // Get emoji based on level and category
  getEmoji(level, category) {
    const emojiMap = {
      // Levels
      'info': '📋',
      'success': '✅',
      'warning': '⚠️',
      'error': '❌',
      'debug': '🔍',
      
      // Categories
      'onboarding': '🚀',
      'user': '👤',
      'role': '🔐',
      'billing': '💳',
      'stripe': '🟢',
      'database': '💾',
      'kinde': '🔑',
      'email': '📧',
      'validation': '✅',
      'transaction': '🔄'
    };
    
    return emojiMap[category] || emojiMap[level] || '📋';
  }

  // Onboarding specific logs
  onboarding = {
    start: (requestId, data) => {
      console.log('\n🚀 =================== ONBOARDING STARTED ===================');
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
      console.log('📦 Request Data:', JSON.stringify(data, null, 2));
    },

    step: (requestId, stepNumber, description, data = {}) => {
      console.log(`\n🔄 [${requestId}] Step ${stepNumber}: ${description}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      }
    },

    success: (requestId, message, data = {}) => {
      console.log(`✅ [${requestId}] ${message}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
      }
    },

    error: (requestId, message, error, startTime) => {
      console.error(`❌ [${requestId}] ${message}`);
      console.error(`📋 [${requestId}] Error:`, error.message);
      if (error.code) console.error(`🔢 [${requestId}] Error Code:`, error.code);
      if (error.statusCode) console.error(`🌐 [${requestId}] Status Code:`, error.statusCode);
      if (error.stack) console.error(`📋 [${requestId}] Stack:`, error.stack);
      console.log(`⏱️ [${requestId}] Failed after ${this.getDuration(startTime)}`);
    },

    complete: (requestId, startTime, data = {}) => {
      console.log(`\n🎉 [${requestId}] ONBOARDING COMPLETED SUCCESSFULLY!`);
      console.log(`⏱️ [${requestId}] Total Duration: ${this.getDuration(startTime)}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Final Result:`, JSON.stringify(data, null, 2));
      }
      console.log('🚀 =================== ONBOARDING ENDED ===================\n');
    }
  };

  // User management logs
  user = {
    invitation: {
      start: (requestId, data) => {
        console.log('\n👤 ================ USER INVITATION STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('📧 Invitation Data:', JSON.stringify(data, null, 2));
      },

      step: (requestId, step, description, data = {}) => {
        console.log(`\n📧 [${requestId}] ${step}: ${description}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId, startTime, data = {}) => {
        console.log(`\n✅ [${requestId}] USER INVITATION COMPLETED!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
        console.log('👤 ================ USER INVITATION ENDED ================\n');
      },

      error: (requestId, error, startTime) => {
        console.error(`\n❌ [${requestId}] USER INVITATION FAILED!`);
        console.error(`📋 [${requestId}] Error:`, error.message);
        console.log(`⏱️ [${requestId}] Failed after ${this.getDuration(startTime)}`);
        console.log('👤 ================ USER INVITATION ENDED ================\n');
      }
    }
  };

  // Role management logs
  role = {
    create: {
      start: (requestId, data) => {
        console.log('\n🔐 ================ ROLE CREATION STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('🔐 Role Data:', JSON.stringify(data, null, 2));
      },

      step: (requestId, step, description, data = {}) => {
        console.log(`\n🔐 [${requestId}] ${step}: ${description}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId, startTime, data = {}) => {
        console.log(`\n✅ [${requestId}] ROLE CREATED SUCCESSFULLY!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Role:`, JSON.stringify(data, null, 2));
        console.log('🔐 ================ ROLE CREATION ENDED ================\n');
      }
    },

    assign: {
      start: (requestId, data) => {
        console.log('\n👥 ================ ROLE ASSIGNMENT STARTED ================');
        console.log(`📋 Request ID: ${requestId}`);
        console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
        console.log('👥 Assignment Data:', JSON.stringify(data, null, 2));
      },

      success: (requestId, startTime, data = {}) => {
        console.log(`\n✅ [${requestId}] ROLE ASSIGNED SUCCESSFULLY!`);
        console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
        console.log(`📊 [${requestId}] Assignment:`, JSON.stringify(data, null, 2));
        console.log('👥 ================ ROLE ASSIGNMENT ENDED ================\n');
      }
    }
  };

  // Billing and Stripe logs
  billing = {
    start: (requestId, operation, data) => {
      console.log(`\n💳 ================ ${operation.toUpperCase()} STARTED ================`);
      console.log(`📋 Request ID: ${requestId}`);
      console.log(`⏰ Timestamp: ${this.getTimestamp()}`);
      console.log('💳 Billing Data:', JSON.stringify(data, null, 2));
    },

    stripe: {
      request: (requestId, method, endpoint, data = {}) => {
        console.log(`\n🟢 [${requestId}] Stripe API Request:`);
        console.log(`🌐 [${requestId}] Method: ${method}`);
        console.log(`🔗 [${requestId}] Endpoint: ${endpoint}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Payload:`, JSON.stringify(data, null, 2));
        }
      },

      response: (requestId, status, data = {}) => {
        console.log(`🟢 [${requestId}] Stripe API Response:`);
        console.log(`📊 [${requestId}] Status: ${status}`);
        console.log(`📄 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      },

      error: (requestId, error) => {
        console.error(`❌ [${requestId}] Stripe API Error:`);
        console.error(`📋 [${requestId}] Message:`, error.message);
        console.error(`🔢 [${requestId}] Code:`, error.code);
        console.error(`🌐 [${requestId}] Status:`, error.statusCode);
        if (error.decline_code) {
          console.error(`💳 [${requestId}] Decline Code:`, error.decline_code);
        }
      }
    },

    success: (requestId, operation, startTime, data = {}) => {
      console.log(`\n✅ [${requestId}] ${operation.toUpperCase()} COMPLETED!`);
      console.log(`⏱️ [${requestId}] Duration: ${this.getDuration(startTime)}`);
      console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
      console.log(`💳 ================ ${operation.toUpperCase()} ENDED ================\n`);
    }
  };

  // Database operation logs
  database = {
    transaction: {
      start: (requestId, description) => {
        console.log(`\n💾 [${requestId}] Database Transaction Started: ${description}`);
        console.log(`⏰ [${requestId}] Timestamp: ${this.getTimestamp()}`);
      },

      step: (requestId, operation, table, data = {}) => {
        console.log(`📝 [${requestId}] ${operation} → ${table}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
        }
      },

      success: (requestId, description, duration, data = {}) => {
        console.log(`✅ [${requestId}] Transaction Completed: ${description}`);
        console.log(`⏱️ [${requestId}] Duration: ${duration}`);
        if (Object.keys(data).length > 0) {
          console.log(`📊 [${requestId}] Result:`, JSON.stringify(data, null, 2));
        }
      },

      error: (requestId, error, duration) => {
        console.error(`❌ [${requestId}] Transaction Failed after ${duration}`);
        console.error(`📋 [${requestId}] Error:`, error.message);
        if (error.code) console.error(`🔢 [${requestId}] Error Code:`, error.code);
      }
    }
  };

  // Activity logs
  activity = {
    log: (requestId, action, resourceType, resourceId, data = {}) => {
      console.log(`📋 [${requestId}] Activity Logged:`);
      console.log(`🎯 [${requestId}] Action: ${action}`);
      console.log(`📦 [${requestId}] Resource: ${resourceType} (${resourceId})`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Details:`, JSON.stringify(data, null, 2));
      }
    }
  };

  // Email logs
  email = {
    send: (requestId, type, recipient, data = {}) => {
      console.log(`📧 [${requestId}] Sending Email:`);
      console.log(`📮 [${requestId}] Type: ${type}`);
      console.log(`👤 [${requestId}] To: ${recipient}`);
      if (Object.keys(data).length > 0) {
        console.log(`📊 [${requestId}] Data:`, JSON.stringify(data, null, 2));
      }
    },

    success: (requestId, type, recipient) => {
      console.log(`✅ [${requestId}] Email sent successfully: ${type} to ${recipient}`);
    },

    error: (requestId, type, recipient, error) => {
      console.error(`❌ [${requestId}] Email failed: ${type} to ${recipient}`);
      console.error(`📋 [${requestId}] Error:`, error.message);
    }
  };

  // Trial and subscription logs
  trial = {
    start: (requestId, tenantId, duration) => {
      console.log(`⏰ [${requestId}] Trial Started:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`⏱️ [${requestId}] Duration: ${duration}`);
    },

    expiry: (requestId, tenantId, expiredAt) => {
      console.log(`⏰ [${requestId}] Trial Expired:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`📅 [${requestId}] Expired at: ${expiredAt}`);
    },

    reminder: (requestId, tenantId, timeLeft) => {
      console.log(`⏰ [${requestId}] Trial Reminder:`);
      console.log(`🏢 [${requestId}] Tenant: ${tenantId}`);
      console.log(`⏱️ [${requestId}] Time left: ${timeLeft}`);
    }
  };
}

// Export singleton instance
export default new Logger(); 