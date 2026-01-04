import { v4 as uuidv4 } from 'uuid';
import { crmSyncStreams, getRedis } from '../../../utils/redis.js';

/**
 * Organization Assignment Redis Streams Service
 * Publishes real-time events for organization assignments to CRM
 *
 * Features:
 * - Dual publishing (Redis Streams + Pub/Sub)
 * - Comprehensive error handling and retry logic
 * - Event validation and enrichment
 * - Performance monitoring and metrics
 * - Batch operations with rate limiting
 */
export class OrganizationAssignmentService {

  // Configuration constants
  static STREAM_KEY = 'crm:organization-assignments';
  static EVENT_VERSION = '1.1';
  static MAX_RETRY_ATTEMPTS = 3;
  static RETRY_DELAY_MS = 1000;
  static BATCH_DELAY_MS = 50;

  /**
   * Validate assignment data before publishing
   */
  static validateAssignmentData(data) {
    const required = ['tenantId', 'userId', 'organizationId'];
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate UUIDs
    const uuidFields = ['tenantId', 'userId', 'organizationId', 'assignedBy'];
    for (const field of uuidFields) {
      if (data[field] && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data[field])) {
        throw new Error(`Invalid UUID format for field: ${field}`);
      }
    }

    return true;
  }

  /**
   * Enrich event data with additional context
   */
  static enrichEventData(assignmentData) {
    return {
      ...assignmentData,
      // Add computed fields
      eventTimestamp: new Date().toISOString(),
      organizationCode: assignmentData.organizationCode || assignmentData.organizationId,
      assignmentType: assignmentData.assignmentType || 'direct',
      isActive: assignmentData.isActive !== false,
      priority: assignmentData.priority || 1,
      // Add metadata defaults
      metadata: {
        source: 'organization-assignment-service',
        version: this.EVENT_VERSION,
        ...assignmentData.metadata
      }
    };
  }

  /**
   * Publish organization assignment created event with enhanced error handling
   */
  static async publishOrgAssignmentCreated(assignmentData, options = {}) {
    const startTime = Date.now();

    console.log(`📡 [ORG-ASSIGNMENT-CREATE] Publishing creation event:`, {
      assignmentId: assignmentData.assignmentId,
      userId: assignmentData.userId,
      organizationId: assignmentData.organizationId,
      tenantId: assignmentData.tenantId,
      assignedBy: assignmentData.assignedBy
    });

    try {
      // Validate input data
      this.validateAssignmentData(assignmentData);

      // Enrich event data
      const enrichedData = this.enrichEventData(assignmentData);

      // Create event payload
      const event = {
        eventId: uuidv4(),
        eventType: 'organization.assignment.created',
        source: 'wrapper-app',
        version: this.EVENT_VERSION,
        timestamp: new Date().toISOString(),
        tenantId: enrichedData.tenantId,
        data: {
          assignmentId: enrichedData.assignmentId || `assignment-${Date.now()}`,
          userId: enrichedData.userId,
          organizationId: enrichedData.organizationId,
          organizationCode: enrichedData.organizationCode,
          assignmentType: enrichedData.assignmentType,
          accessLevel: enrichedData.accessLevel || 'standard',
          isActive: enrichedData.isActive,
          isPrimary: enrichedData.isPrimary || false,
          assignedAt: enrichedData.assignedAt || enrichedData.eventTimestamp,
          priority: enrichedData.priority,
          assignedBy: enrichedData.assignedBy,
          metadata: enrichedData.metadata
        }
      };

      // Publish with retry logic
      const result = await this.publishWithRetry(event, enrichedData.tenantId);

      // Log success with performance metrics
      const duration = Date.now() - startTime;
      console.log(`✅ [ORG-ASSIGNMENT-CREATE] Successfully published creation event: ${event.data.assignmentId} (${duration}ms)`, {
        eventId: event.eventId,
        streamId: result.stream,
        pubsubSubscribers: result.pubsub
      });

      return {
        success: true,
        eventId: event.eventId,
        assignmentId: event.data.assignmentId,
        duration,
        result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [ORG-ASSIGNMENT-CREATE] Failed to publish creation event (${duration}ms):`, {
        error: error.message,
        stack: error.stack,
        assignmentData: { 
          assignmentId: assignmentData.assignmentId,
          userId: assignmentData.userId,
          organizationId: assignmentData.organizationId,
          tenantId: assignmentData.tenantId
        }
      });

      return {
        success: false,
        error: error.message,
        duration,
        assignmentData: assignmentData
      };
    }
  }

  /**
   * Core publishing logic with retry mechanism
   */
  static async publishWithRetry(event, tenantId) {
    let lastError;

    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
      // Publish to Redis Stream
      const streamResult = await crmSyncStreams.publishToStream(this.STREAM_KEY, event);
      console.log(`✅ [ORG-ASSIGNMENT] Published to Redis stream: ${this.STREAM_KEY}`, {
        streamId: streamResult,
        eventType: event.eventType,
        assignmentId: event.data?.assignmentId,
        attempt
      });

      // Publish to Pub/Sub channel
      const redis = getRedis();
      let pubsubResult = null;
      if (redis && redis.isConnected) {
        const channel = `crm:${tenantId}:organization-assignments`;
        pubsubResult = await redis.publish(channel, JSON.stringify(event));
        console.log(`✅ [ORG-ASSIGNMENT] Published to pub/sub channel: ${channel} (${pubsubResult} subscribers)`);
      } else {
        console.warn(`⚠️ [ORG-ASSIGNMENT] Redis not connected, skipping pub/sub publish`);
      }

      return {
        stream: streamResult,
        pubsub: pubsubResult,
        attempts: attempt
      };

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ Publish attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS} failed:`, error.message);

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY_MS * attempt));
        }
      }
    }

    throw new Error(`Failed to publish after ${this.MAX_RETRY_ATTEMPTS} attempts: ${lastError.message}`);
  }

  /**
   * Publish organization assignment updated event
   */
  static async publishOrgAssignmentUpdated(assignmentData, options = {}) {
    const startTime = Date.now();

    try {
      // Validate required fields for updates
      if (!assignmentData.assignmentId) {
        throw new Error('Missing required field: assignmentId');
      }
      this.validateAssignmentData(assignmentData);

      // Enrich event data
      const enrichedData = this.enrichEventData(assignmentData);

      // Create event payload
      const event = {
        eventId: uuidv4(),
        eventType: 'organization.assignment.updated',
        source: 'wrapper-app',
        version: this.EVENT_VERSION,
        timestamp: new Date().toISOString(),
        tenantId: enrichedData.tenantId,
        data: {
          assignmentId: enrichedData.assignmentId,
          userId: enrichedData.userId,
          organizationId: enrichedData.organizationId,
          organizationCode: enrichedData.organizationCode,
          assignmentType: enrichedData.assignmentType,
          accessLevel: enrichedData.accessLevel,
          isActive: enrichedData.isActive,
          isPrimary: enrichedData.isPrimary,
          assignedAt: enrichedData.assignedAt,
          priority: enrichedData.priority,
          assignedBy: enrichedData.assignedBy,
          updatedBy: enrichedData.updatedBy || enrichedData.assignedBy,
          changes: enrichedData.changes || {},
          updatedAt: enrichedData.eventTimestamp,
          metadata: enrichedData.metadata
        }
      };

      // Publish with retry logic
      const result = await this.publishWithRetry(event, enrichedData.tenantId);

      // Log success with performance metrics
      const duration = Date.now() - startTime;
      console.log(`✅ Published org assignment updated: ${event.data.assignmentId} (${duration}ms)`);

      return {
        success: true,
        eventId: event.eventId,
        assignmentId: event.data.assignmentId,
        duration,
        result
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Failed to publish org assignment updated (${duration}ms):`, {
        error: error.message,
        assignmentData: { ...assignmentData, metadata: undefined },
        stack: error.stack
      });

      return {
        success: false,
        error: error.message,
        duration,
        assignmentData: assignmentData
      };
    }
  }

  /**
   * Publish organization assignment deactivated event
   */
  static async publishOrgAssignmentDeactivated(assignmentData) {
    const eventId = uuidv4();

    const event = {
      eventId,
      eventType: 'organization.assignment.deactivated',
      source: 'wrapper-app',
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: assignmentData.tenantId,
      data: {
        assignmentId: assignmentData.assignmentId,
        userId: assignmentData.userId,
        organizationId: assignmentData.organizationId,
        deactivatedBy: assignmentData.deactivatedBy,
        reason: assignmentData.reason || 'user_request'
      }
    };

    try {
      // Publish to dedicated organization assignments Redis Stream
      const streamKey = `crm:organization-assignments`;
      const streamResult = await crmSyncStreams.publishToStream(streamKey, event);

      // Also publish to pub/sub channel for CRM consumer
      const redis = getRedis();
      if (redis && redis.isConnected) {
        const channel = `crm:${assignmentData.tenantId}:organization-assignments`;
        await redis.publish(channel, JSON.stringify(event));
        console.log(`📡 Published to pub/sub channel: ${channel}`);
      }

      console.log(`📡 Published organization assignment deactivated event: ${event.data.assignmentId}`);
      return streamResult;
    } catch (error) {
      console.error('❌ Failed to publish organization assignment deactivated event:', error);
      throw error;
    }
  }

  /**
   * Publish organization assignment activated event
   */
  static async publishOrgAssignmentActivated(assignmentData) {
    const eventId = uuidv4();

    const event = {
      eventId,
      eventType: 'organization.assignment.activated',
      source: 'wrapper-app',
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: assignmentData.tenantId,
      data: {
        assignmentId: assignmentData.assignmentId,
        userId: assignmentData.userId,
        organizationId: assignmentData.organizationId,
        activatedBy: assignmentData.activatedBy
      }
    };

    try {
      // Publish to dedicated organization assignments Redis Stream
      const streamKey = `crm:organization-assignments`;
      const streamResult = await crmSyncStreams.publishToStream(streamKey, event);

      // Also publish to pub/sub channel for CRM consumer
      const redis = getRedis();
      if (redis && redis.isConnected) {
        const channel = `crm:${assignmentData.tenantId}:organization-assignments`;
        await redis.publish(channel, JSON.stringify(event));
        console.log(`📡 Published to pub/sub channel: ${channel}`);
      }

      console.log(`📡 Published organization assignment activated event: ${event.data.assignmentId}`);
      return streamResult;
    } catch (error) {
      console.error('❌ Failed to publish organization assignment activated event:', error);
      throw error;
    }
  }

  /**
   * Publish organization assignment deleted event
   */
  static async publishOrgAssignmentDeleted(assignmentData) {
    const eventId = uuidv4();
    const startTime = Date.now();

    console.log(`📡 [ORG-ASSIGNMENT-DELETE] Publishing deletion event:`, {
      assignmentId: assignmentData.assignmentId,
      userId: assignmentData.userId,
      organizationId: assignmentData.organizationId,
      tenantId: assignmentData.tenantId,
      deletedBy: assignmentData.deletedBy,
      reason: assignmentData.reason || 'permanent_removal',
      eventId
    });

    const event = {
      eventId,
      eventType: 'organization.assignment.deleted',
      source: 'wrapper-app',
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId: assignmentData.tenantId,
      data: {
        assignmentId: assignmentData.assignmentId,
        userId: assignmentData.userId,
        organizationId: assignmentData.organizationId,
        deletedBy: assignmentData.deletedBy,
        reason: assignmentData.reason || 'permanent_removal'
      }
    };

    try {
      // Publish to dedicated organization assignments Redis Stream
      const streamKey = `crm:organization-assignments`;
      const streamResult = await crmSyncStreams.publishToStream(streamKey, event);
      console.log(`✅ [ORG-ASSIGNMENT-DELETE] Published to Redis stream: ${streamKey}`, {
        streamId: streamResult,
        assignmentId: assignmentData.assignmentId
      });

      // Also publish to pub/sub channel for CRM consumer
      const redis = getRedis();
      if (redis && redis.isConnected) {
        const channel = `crm:${assignmentData.tenantId}:organization-assignments`;
        const pubsubResult = await redis.publish(channel, JSON.stringify(event));
        console.log(`✅ [ORG-ASSIGNMENT-DELETE] Published to pub/sub channel: ${channel} (${pubsubResult} subscribers)`);
      } else {
        console.warn(`⚠️ [ORG-ASSIGNMENT-DELETE] Redis not connected, skipping pub/sub publish`);
      }

      const duration = Date.now() - startTime;
      console.log(`✅ [ORG-ASSIGNMENT-DELETE] Successfully published deletion event: ${event.data.assignmentId} (${duration}ms)`);
      return streamResult;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [ORG-ASSIGNMENT-DELETE] Failed to publish deletion event (${duration}ms):`, {
        error: error.message,
        stack: error.stack,
        assignmentId: assignmentData.assignmentId,
        tenantId: assignmentData.tenantId
      });
      throw error;
    }
  }

  /**
   * Helper method to create assignment ID
   */
  static generateAssignmentId(userId, organizationId) {
    return `${userId}_${organizationId}_${Date.now()}`;
  }

  /**
   * Bulk publish assignment events with enhanced error handling and rate limiting
   */
  static async publishBulkAssignments(assignments, eventType = 'created', options = {}) {
    const startTime = Date.now();
    const results = [];
    const batchSize = options.batchSize || 10;
    const delay = options.delay || this.BATCH_DELAY_MS;

    console.log(`📦 Starting bulk publish of ${assignments.length} ${eventType} events`);

    // Validate event type
    const validEventTypes = ['created', 'updated', 'deactivated', 'activated', 'deleted'];
    if (!validEventTypes.includes(eventType)) {
      throw new Error(`Invalid event type: ${eventType}. Must be one of: ${validEventTypes.join(', ')}`);
    }

    for (let i = 0; i < assignments.length; i++) {
      const assignment = assignments[i];

      try {
        let result;
        switch (eventType) {
          case 'created':
            result = await this.publishOrgAssignmentCreated(assignment, options);
            break;
          case 'updated':
            result = await this.publishOrgAssignmentUpdated(assignment, options);
            break;
          case 'deactivated':
            result = await this.publishOrgAssignmentDeactivated(assignment, options);
            break;
          case 'activated':
            result = await this.publishOrgAssignmentActivated(assignment, options);
            break;
          case 'deleted':
            result = await this.publishOrgAssignmentDeleted(assignment, options);
            break;
        }

        results.push({
          success: true,
          assignmentId: assignment.assignmentId || result.assignmentId,
          eventId: result.eventId,
          result,
          index: i
        });

        // Progress logging for large batches
        if ((i + 1) % batchSize === 0 || i === assignments.length - 1) {
          console.log(`📊 Bulk publish progress: ${i + 1}/${assignments.length} ${eventType} events`);
        }

        // Rate limiting - configurable delay between publishes
        if (i < assignments.length - 1 && delay > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`❌ Failed to publish ${eventType} event for assignment ${assignment.assignmentId || `index-${i}`}:`, error.message);
        results.push({
          success: false,
          assignmentId: assignment.assignmentId || `index-${i}`,
          error: error.message,
          index: i,
          assignment: assignment
        });
      }
    }

    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`✅ Bulk publish completed: ${successCount} success, ${failureCount} failed (${totalDuration}ms total)`);

    return {
      total: assignments.length,
      successful: successCount,
      failed: failureCount,
      duration: totalDuration,
      results
    };
  }
}
