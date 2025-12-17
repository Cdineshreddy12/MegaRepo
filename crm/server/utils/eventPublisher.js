import { v4 as uuidv4 } from 'uuid';
import EventValidator from './eventValidator.js';

/**
 * Standardized Event Publisher
 * 
 * Wraps Redis stream publishing with unified event format and validation.
 * Ensures all published events follow the standardized schema and are properly validated.
 */
class EventPublisher {
  constructor(redisClient, options = {}) {
    this.redisClient = redisClient;
    this.validator = new EventValidator();
    this.options = {
      enableValidation: true,
      sendToDLQOnError: true,
      defaultSourceApp: 'crm',
      defaultVersion: '1.0',
      ...options
    };
  }

  /**
   * Publish a standardized event to Redis stream
   * @param {string} streamKey - Redis stream key
   * @param {string} eventType - Type of event (e.g., 'role.permissions_changed')
   * @param {string} entityId - ID of the entity affected
   * @param {string} tenantId - Tenant identifier
   * @param {Object} data - Event-specific data
   * @param {Object} metadata - Additional metadata
   * @returns {Object} - Publication result
   */
  async publishEvent(streamKey, eventType, entityId, tenantId, data, metadata = {}) {
    try {
      // Create standardized event
      const event = this.createStandardEvent(eventType, entityId, tenantId, data, metadata);
      
      // Validate event if enabled
      if (this.options.enableValidation) {
        const validation = this.validator.validateEvent(event);
        if (!validation.valid) {
          const errorMsg = `Event validation failed: ${validation.errors.join(', ')}`;
          console.error(`❌ ${errorMsg}`, event);
          
          if (this.options.sendToDLQOnError) {
            await this.validator.sendToDeadLetterStream(event, validation.errors, this.redisClient);
          }
          
          throw new Error(errorMsg);
        }
        
        // Log warnings if any
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Event warnings for ${event.eventId}:`, validation.warnings);
        }
      }

      // Serialize event for Redis
      const serializedEvent = this.validator.serializeEvent(event);

      // Publish to stream
      const messageId = await this.redisClient.xAdd(streamKey, '*', serializedEvent);

      console.log(`📤 Published event: ${eventType} to ${streamKey} (${messageId})`);
      
      return {
        success: true,
        eventId: event.eventId,
        messageId,
        streamKey,
        eventType,
        entityId,
        tenantId
      };

    } catch (error) {
      console.error(`❌ Failed to publish event to ${streamKey}:`, error);
      throw error;
    }
  }

  /**
   * Create standardized event object
   */
  createStandardEvent(eventType, entityId, tenantId, data, metadata = {}) {
    const entityType = this.validator.getEntityTypeFromEventType(eventType);
    
    return {
      // Core identification
      eventId: uuidv4(),
      eventType,
      entityType,
      entityId,
      tenantId,
      
      // Timestamps
      timestamp: new Date().toISOString(),
      
      // Source information
      sourceApp: metadata.sourceApp || this.options.defaultSourceApp,
      version: metadata.version || this.options.defaultVersion,
      
      // Event payload
      data,
      
      // Processing metadata
      metadata: {
        correlationId: `${eventType}_${entityId}_${Date.now()}`,
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        publishedBy: metadata.publishedBy || 'system',
        ...metadata
      }
    };
  }

  /**
   * Publish role permissions changed event
   */
  async publishRolePermissionsChanged(tenantId, roleId, roleData, metadata = {}) {
    const streamKey = 'crm:sync:role:role_permissions_changed';
    
    const eventData = {
      roleId: roleData.roleId || roleId,
      roleName: roleData.roleName,
      permissions: roleData.permissions, // Nested permissions structure
      flatPermissions: roleData.flatPermissions, // Flat array for backward compatibility
      description: roleData.description,
      isActive: roleData.isActive !== undefined ? roleData.isActive : true,
      scope: roleData.scope,
      priority: roleData.priority,
      updatedBy: roleData.updatedBy,
      updatedAt: roleData.updatedAt || new Date().toISOString(),
      restrictions: roleData.restrictions,
      metadata: roleData.metadata,
      ...roleData
    };

    return await this.publishEvent(
      streamKey,
      'role.permissions_changed',
      roleId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish user created event
   */
  async publishUserCreated(tenantId, userData, metadata = {}) {
    const streamKey = 'crm:sync:user:user_created';
    
    const eventData = {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatar: userData.avatar,
      isVerified: userData.isVerified,
      createdAt: userData.createdAt || new Date().toISOString(),
      kindeUserId: userData.kindeUserId,
      ...userData
    };

    return await this.publishEvent(
      streamKey,
      'user.created',
      userData.userId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish user deactivated event
   */
  async publishUserDeactivated(tenantId, userData, metadata = {}) {
    const streamKey = 'crm:sync:user:user_deactivated';
    
    const eventData = {
      userId: userData.userId,
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      deactivatedAt: userData.deactivatedAt || new Date().toISOString(),
      deactivatedBy: userData.deactivatedBy,
      reason: userData.reason,
      ...userData
    };

    return await this.publishEvent(
      streamKey,
      'user.deactivated',
      userData.userId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish role created event
   */
  async publishRoleCreated(tenantId, roleData, metadata = {}) {
    const streamKey = 'crm:sync:role:role_created';
    
    const eventData = {
      roleId: roleData.roleId,
      roleName: roleData.roleName,
      description: roleData.description,
      permissions: roleData.permissions,
      isActive: roleData.isActive !== undefined ? roleData.isActive : true,
      scope: roleData.scope,
      priority: roleData.priority,
      createdBy: roleData.createdBy,
      createdAt: roleData.createdAt || new Date().toISOString(),
      ...roleData
    };

    return await this.publishEvent(
      streamKey,
      'role.created',
      roleData.roleId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish role updated event
   */
  async publishRoleUpdated(tenantId, roleData, metadata = {}) {
    const streamKey = 'crm:sync:role:role_updated';
    
    const eventData = {
      roleId: roleData.roleId,
      roleName: roleData.roleName,
      description: roleData.description,
      permissions: roleData.permissions,
      isActive: roleData.isActive,
      scope: roleData.scope,
      priority: roleData.priority,
      updatedBy: roleData.updatedBy,
      updatedAt: roleData.updatedAt || new Date().toISOString(),
      ...roleData
    };

    return await this.publishEvent(
      streamKey,
      'role.updated',
      roleData.roleId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish organization created event
   */
  async publishOrganizationCreated(tenantId, orgData, metadata = {}) {
    const streamKey = 'crm:sync:organization:org_created';
    
    const eventData = {
      orgCode: orgData.orgCode,
      orgName: orgData.orgName,
      orgType: orgData.orgType,
      organizationType: orgData.organizationType,
      description: orgData.description,
      parentId: orgData.parentId,
      entityLevel: orgData.entityLevel,
      isActive: orgData.isActive !== undefined ? orgData.isActive : true,
      createdBy: orgData.createdBy,
      createdAt: orgData.createdAt || new Date().toISOString(),
      ...orgData
    };

    return await this.publishEvent(
      streamKey,
      'organization.created',
      orgData.orgCode,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish credit allocated event
   */
  async publishCreditAllocated(tenantId, creditData, metadata = {}) {
    const streamKey = 'credit-events';
    
    const eventData = {
      entityId: creditData.entityId,
      entityType: creditData.entityType,
      allocatedCredits: creditData.allocatedCredits,
      previousBalance: creditData.previousBalance,
      newBalance: creditData.newBalance,
      source: creditData.source,
      sourceId: creditData.sourceId,
      description: creditData.description,
      allocatedBy: creditData.allocatedBy,
      allocatedAt: creditData.allocatedAt || new Date().toISOString(),
      ...creditData
    };

    return await this.publishEvent(
      streamKey,
      'credit.allocated',
      creditData.entityId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Publish role assigned event (for backward compatibility)
   */
  async publishRoleAssigned(tenantId, assignmentData, metadata = {}) {
    const streamKey = 'crm:sync:permissions:role_assigned';
    
    const eventData = {
      assignmentId: assignmentData.assignmentId,
      userId: assignmentData.userId,
      roleId: assignmentData.roleId,
      assignedAt: assignmentData.assignedAt || new Date().toISOString(),
      reason: assignmentData.reason,
      ...assignmentData
    };

    return await this.publishEvent(
      streamKey,
      'role_assigned',
      assignmentData.assignmentId,
      tenantId,
      eventData,
      { 
        sourceApp: 'crm',
        ...metadata 
      }
    );
  }

  /**
   * Generic publish method for custom events
   */
  async publishCustomEvent(streamKey, eventType, entityId, tenantId, data, metadata = {}) {
    return await this.publishEvent(streamKey, eventType, entityId, tenantId, data, metadata);
  }

  /**
   * Get publisher metrics
   */
  getMetrics() {
    return {
      validationEnabled: this.options.enableValidation,
      dlqEnabled: this.options.sendToDLQOnError,
      defaultSourceApp: this.options.defaultSourceApp,
      defaultVersion: this.options.defaultVersion
    };
  }
}

export default EventPublisher;