import { v4 as uuidv4 } from 'uuid';

/**
 * Event Validator Utility
 * 
 * Validates Redis stream events according to the unified event format specification.
 * Provides comprehensive validation for event structure, format, and event-specific data.
 */
class EventValidator {
  constructor() {
    // Validation regex patterns
    this.UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    this.ISO8601_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;
    
    // Whitelist of allowed event types
    this.ALLOWED_EVENT_TYPES = [
      'role.created',
      'role.updated', 
      'role.deleted',
      'role.permissions_changed',
      'user.created',
      'user.deactivated',
      'user.deleted',
      'organization.created',
      'organization.updated',
      'organization.deleted',
      'credit.allocated',
      'credit.consumed',
      'credit.config_updated',
      'role_assigned',
      'role_unassigned',
      'org_created'
    ];
    
    // Stream type mapping for consumer group management
    this.STREAM_TYPE_MAP = {
      'crm:sync:user': 'user-events',
      'crm:sync:role': 'role-events', 
      'crm:sync:organization': 'org-events',
      'crm:sync:credits': 'credit-events',
      'crm:sync:permissions': 'permission-events',
      'credit-events': 'credit-events',
      'crm:organization-assignments': 'assignment-events'
    };
  }

  /**
   * Validate a Redis stream event
   * @param {Object} event - The event object to validate
   * @returns {Object} - Validation result with valid flag and errors array
   */
  validateEvent(event) {
    const errors = [];

    // 1. Required Fields Validation
    this.validateRequiredFields(event, errors);
    
    // 2. Format Validation
    this.validateFormats(event, errors);
    
    // 3. Data Format Validation
    this.validateDataFormat(event, errors);
    
    // 4. Event-Specific Validation
    this.validateEventSpecificData(event, errors);

    return {
      valid: errors.length === 0,
      errors,
      warnings: this.generateWarnings(event)
    };
  }

  /**
   * Validate required fields
   */
  validateRequiredFields(event, errors) {
    const requiredFields = ['eventId', 'eventType', 'tenantId', 'entityId', 'timestamp', 'data'];
    
    for (const field of requiredFields) {
      if (!event[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate field formats
   */
  validateFormats(event, errors) {
    // Event ID validation (UUID v4)
    if (event.eventId && !this.UUID_V4_REGEX.test(event.eventId)) {
      errors.push('Invalid eventId format: must be UUID v4');
    }

    // Tenant ID validation (UUID)
    if (event.tenantId && !this.UUID_V4_REGEX.test(event.tenantId)) {
      errors.push('Invalid tenantId format: must be UUID');
    }

    // Timestamp validation (ISO8601)
    if (event.timestamp && !this.ISO8601_REGEX.test(event.timestamp)) {
      errors.push('Invalid timestamp format: must be ISO8601');
    }

    // Event type whitelist validation
    if (event.eventType && !this.ALLOWED_EVENT_TYPES.includes(event.eventType)) {
      errors.push(`Invalid eventType: ${event.eventType} not in allowed whitelist`);
    }

    // Source app validation
    if (event.sourceApp && !['wrapper-api', 'crm', 'hrms', 'wrapper'].includes(event.sourceApp)) {
      errors.push(`Invalid sourceApp: ${event.sourceApp} not in allowed list`);
    }
  }

  /**
   * Validate data format
   */
  validateDataFormat(event, errors) {
    if (!event.data) return;

    try {
      if (typeof event.data === 'string') {
        // Try to parse JSON string
        JSON.parse(event.data);
      } else if (typeof event.data !== 'object') {
        errors.push('Invalid data format: must be object or JSON string');
      }
    } catch (e) {
      errors.push('Invalid data format: must be valid JSON string');
    }
  }

  /**
   * Validate event-specific data structure
   */
  validateEventSpecificData(event, errors) {
    const eventType = event.eventType;
    let parsedData = event.data;

    // Parse data if it's a string
    if (typeof event.data === 'string') {
      try {
        parsedData = JSON.parse(event.data);
      } catch (e) {
        errors.push('Invalid data JSON format');
        return;
      }
    }

    // Event-specific validation rules
    switch (eventType) {
      case 'role.permissions_changed':
      case 'role_permissions_changed':
        this.validateRolePermissionsChanged(parsedData, errors);
        break;
        
      case 'user.created':
      case 'user_created':
        this.validateUserCreated(parsedData, errors);
        break;
        
      case 'user.deactivated':
      case 'user_deactivated':
        this.validateUserDeactivated(parsedData, errors);
        break;
        
      case 'role.created':
      case 'role_created':
        this.validateRoleCreated(parsedData, errors);
        break;
        
      case 'organization.created':
      case 'org_created':
        this.validateOrganizationCreated(parsedData, errors);
        break;
        
      case 'credit.allocated':
        this.validateCreditAllocated(parsedData, errors);
        break;
        
      default:
        // For unknown event types, just check basic structure
        if (!parsedData || typeof parsedData !== 'object') {
          errors.push(`Event type ${eventType}: data must be an object`);
        }
    }
  }

  /**
   * Validate role permissions changed event data
   */
  validateRolePermissionsChanged(data, errors) {
    if (!data.roleId) {
      errors.push('role.permissions_changed: missing roleId');
    }
    
    if (!data.roleName) {
      errors.push('role.permissions_changed: missing roleName');
    }
    
    if (!data.permissions && !data.flatPermissions) {
      errors.push('role.permissions_changed: missing permissions or flatPermissions');
    }
    
    // Validate permissions structure if provided
    if (data.permissions) {
      if (typeof data.permissions !== 'object') {
        errors.push('role.permissions_changed: permissions must be an object');
      }
    }
    
    // Validate flat permissions array if provided
    if (data.flatPermissions) {
      if (!Array.isArray(data.flatPermissions)) {
        errors.push('role.permissions_changed: flatPermissions must be an array');
      } else {
        // Validate permission format (e.g., "crm.leads.read")
        for (const permission of data.flatPermissions) {
          if (typeof permission !== 'string' || !permission.includes('.')) {
            errors.push(`role.permissions_changed: invalid permission format: ${permission}`);
            break;
          }
        }
      }
    }
  }

  /**
   * Validate user created event data
   */
  validateUserCreated(data, errors) {
    if (!data.userId) {
      errors.push('user.created: missing userId');
    }
    
    if (!data.email) {
      errors.push('user.created: missing email');
    } else {
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        errors.push('user.created: invalid email format');
      }
    }
  }

  /**
   * Validate user deactivated event data
   */
  validateUserDeactivated(data, errors) {
    if (!data.userId) {
      errors.push('user.deactivated: missing userId');
    }
  }

  /**
   * Validate role created event data
   */
  validateRoleCreated(data, errors) {
    if (!data.roleId) {
      errors.push('role.created: missing roleId');
    }
    
    if (!data.roleName) {
      errors.push('role.created: missing roleName');
    }
  }

  /**
   * Validate organization created event data
   */
  validateOrganizationCreated(data, errors) {
    if (!data.orgCode) {
      errors.push('organization.created: missing orgCode');
    }
    
    if (!data.orgName) {
      errors.push('organization.created: missing orgName');
    }
  }

  /**
   * Validate credit allocated event data
   */
  validateCreditAllocated(data, errors) {
    if (!data.entityId) {
      errors.push('credit.allocated: missing entityId');
    }
    
    if (!data.amount && !data.allocatedCredits) {
      errors.push('credit.allocated: missing amount or allocatedCredits');
    } else {
      const amount = parseInt(data.amount || data.allocatedCredits);
      if (isNaN(amount) || amount < 0) {
        errors.push('credit.allocated: amount must be a positive number');
      }
    }
  }

  /**
   * Generate warnings for non-critical issues
   */
  generateWarnings(event) {
    const warnings = [];
    
    // Check for missing metadata
    if (!event.metadata) {
      warnings.push('Missing metadata field');
    }
    
    // Check for missing version
    if (!event.version) {
      warnings.push('Missing version field');
    }
    
    // Check for deprecated event types
    if (event.eventType && event.eventType.includes('_')) {
      warnings.push(`Consider using dot notation instead of underscore: ${event.eventType} -> ${event.eventType.replace('_', '.')}`);
    }
    
    return warnings;
  }

  /**
   * Get stream type from stream key for consumer group management
   */
  getStreamType(streamKey) {
    for (const [pattern, streamType] of Object.entries(this.STREAM_TYPE_MAP)) {
      if (streamKey.includes(pattern)) {
        return streamType;
      }
    }
    return 'unknown-events';
  }

  /**
   * Generate consumer group name from stream key and tenant ID
   */
  generateConsumerGroupName(streamKey, tenantId) {
    const streamType = this.getStreamType(streamKey);
    return `crm-consumers:${streamType}:${tenantId}`;
  }

  /**
   * Generate consumer name from stream type, tenant ID, and instance ID
   */
  generateConsumerName(streamType, tenantId, instanceId = '001') {
    return `crm-${streamType}-${tenantId}-${instanceId}`;
  }

  /**
   * Create a standardized event object
   */
  createStandardEvent(eventType, entityId, tenantId, data, metadata = {}) {
    return {
      eventId: uuidv4(),
      eventType,
      entityType: this.getEntityTypeFromEventType(eventType),
      entityId,
      tenantId,
      timestamp: new Date().toISOString(),
      sourceApp: metadata.sourceApp || 'crm',
      version: '1.0',
      data,
      metadata: {
        correlationId: `${eventType}_${entityId}_${Date.now()}`,
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      }
    };
  }

  /**
   * Get entity type from event type
   */
  getEntityTypeFromEventType(eventType) {
    const mapping = {
      'role.': 'role',
      'user.': 'user',
      'organization.': 'organization',
      'credit.': 'credit',
      'role_': 'role',
      'user_': 'user',
      'org_': 'organization'
    };
    
    for (const [prefix, entityType] of Object.entries(mapping)) {
      if (eventType.startsWith(prefix)) {
        return entityType;
      }
    }
    
    return 'unknown';
  }

  /**
   * Send event to dead-letter queue
   */
  async sendToDeadLetterStream(event, errors, redisClient) {
    const dlqEvent = {
      ...event,
      originalEventId: event.eventId,
      dlqTimestamp: new Date().toISOString(),
      validationErrors: errors,
      eventType: 'event.validation_failed'
    };
    
    const dlqKey = `${event.eventType}:dlq`;
    
    try {
      await redisClient.xAdd(dlqKey, '*', this.serializeEvent(dlqEvent));
      console.log(`📮 Sent invalid event to DLQ: ${event.eventId}`);
    } catch (error) {
      console.error(`❌ Failed to send event to DLQ: ${error.message}`);
    }
  }

  /**
   * Serialize event for Redis storage
   */
  serializeEvent(event) {
    const serialized = {};
    Object.entries(event).forEach(([key, value]) => {
      if (typeof value === 'object') {
        serialized[key] = JSON.stringify(value);
      } else {
        serialized[key] = String(value);
      }
    });
    return serialized;
  }
}

export default EventValidator;