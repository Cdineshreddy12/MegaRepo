import { createClient } from 'redis';
import mongoose from 'mongoose';

// Import models
import EmployeeOrgAssignment from '../models/EmployeeOrgAssignment.js';
import Organization from '../models/Organization.js';

/**
 * Organization Assignment Consumer
 * Consumes organization assignment events from Redis Streams
 * Updates the employeeorgassignments collection based on events
 */
class OrganizationAssignmentConsumer {
  constructor() {
    this.redisClient = null;
    this.consumerGroup = 'org-assignment-consumers';
    this.consumerName = `org-consumer-${Date.now()}`;
    this.streamName = 'crm:organization-assignments';
    this.isConnected = false;
  }

  /**
   * Initialize the consumer
   */
  async initialize() {
    try {
      console.log('🔄 Initializing Organization Assignment Consumer...');

      this.redisClient = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            console.error('❌ Redis connection refused');
            return new Error('Redis connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error('❌ Redis retry time exhausted');
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            console.error('❌ Max Redis reconnection attempts reached');
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        }
      });

      this.redisClient.on('error', (err) => {
        console.error('❌ Redis Client Error:', err);
      });

      await this.redisClient.connect();
      this.isConnected = true;

      // Create consumer group if it doesn't exist - use proper Redis command format
      try {
        console.log(`🔧 Creating consumer group: ${this.consumerGroup} for stream: ${this.streamName}`);
        await this.redisClient.sendCommand(['XGROUP', 'CREATE', this.streamName, this.consumerGroup, '0', 'MKSTREAM']);
        console.log(`✅ Consumer group ${this.consumerGroup} created successfully`);
      } catch (error) {
        if (error.message && error.message.includes('BUSYGROUP')) {
          console.log(`✅ Consumer group ${this.consumerGroup} already exists`);
        } else {
          console.error('❌ Failed to create consumer group:', error);
          throw error;
        }
      }

      console.log('✅ Organization Assignment Consumer initialized');
      console.log(`📊 Stream: ${this.streamName}`);
      console.log(`👥 Consumer Group: ${this.consumerGroup}`);
      console.log(`🏷️ Consumer Name: ${this.consumerName}`);

      // Check if stream exists
      try {
        const streamInfo = await this.redisClient.sendCommand(['XLEN', this.streamName]);
        console.log(`📈 Stream length: ${streamInfo} messages`);
      } catch (error) {
        console.log(`📈 Stream does not exist yet or error checking length: ${error.message}`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize Organization Assignment Consumer:', error);
      throw error;
    }
  }

  /**
   * Start consuming messages
   */
  async startConsuming() {
    if (!this.isConnected) {
      await this.initialize();
    }

    console.log(`🚀 Starting Organization Assignment Consumer: ${this.consumerName}`);
    console.log(`🔄 Starting message consumption loop...`);

    while (true) {
      try {
        console.log(`⏳ Waiting for messages on stream: ${this.streamName}...`);
        let events;

        // Use the correct Redis v5 API format
        try {
          events = await this.redisClient.sendCommand([
            'XREADGROUP',
            'GROUP', this.consumerGroup,
            this.consumerName,
            'COUNT', '10',
            'BLOCK', '5000',
            'STREAMS', this.streamName, '>'
          ]);
          console.log(`📨 XREADGROUP command executed successfully`);
        } catch (error) {
          console.error(`❌ XREADGROUP command failed:`, error);
          throw error;
        }

        console.log(`📨 Raw events received:`, events);

        if (events) {
          // Handle different response formats from Redis clients
          let streamEvents = [];

          if (Array.isArray(events)) {
            // Raw XREADGROUP format: [[streamName, [[messageId, messageData], ...]], ...]
            streamEvents = events;
          } else if (events && typeof events === 'object' && events[this.streamName]) {
            // New Redis client format: { streamName: [[messageId, messageData], ...] }
            streamEvents = [[this.streamName, events[this.streamName]]];
          } else {
            console.log('⚠️ No events received or unexpected format:', typeof events, Object.keys(events || {}));
            continue;
          }

          console.log(`📨 Received ${streamEvents.length} stream events`);

          for (const [stream, messages] of streamEvents) {
            if (!messages || messages.length === 0) {
              console.log(`⚠️ No messages in stream ${stream}`);
              continue;
            }

            console.log(`📊 Processing stream: ${stream}, messages count: ${messages.length}`);
            for (const [messageId, messageData] of messages) {
              console.log(`🔍 Processing message: ${messageId}`);
              console.log(`📋 Message data:`, messageData);
              try {
                await this.processMessage(messageData);

                // Acknowledge successful processing
                if (this.redisClient.xAck) {
                  await this.redisClient.xAck(this.streamName, this.consumerGroup, messageId);
                } else {
                  await this.redisClient.sendCommand(['XACK', this.streamName, this.consumerGroup, messageId]);
                }
                console.log(`✅ Acknowledged message: ${messageId}`);

              } catch (error) {
                console.error(`❌ Error processing message ${messageId}:`, error);

                // For critical errors, we might want to nack and retry later
                // For now, we'll still acknowledge to avoid infinite loops
                try {
                  if (this.redisClient.xAck) {
                    await this.redisClient.xAck(this.streamName, this.consumerGroup, messageId);
                  } else {
                    await this.redisClient.sendCommand(['XACK', this.streamName, this.consumerGroup, messageId]);
                  }
                } catch (ackError) {
                  console.error(`❌ Failed to acknowledge message ${messageId}:`, ackError);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('❌ Consumer error:', error);

        // Wait before retrying
        console.log('⏳ Waiting 5 seconds before retrying...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Process a single message
   */
  async processMessage(messageData) {
    try {
      // Convert Redis stream format to object and clean values
      const eventObj = {};
      for (let i = 0; i < messageData.length; i += 2) {
        let value = messageData[i + 1];
        // Remove quotes if present (Redis sometimes adds them)
        if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        eventObj[messageData[i]] = value;
      }

      const eventId = eventObj.eventId;
      const eventType = eventObj.eventType;
      let tenantId = eventObj.tenantId;

      // Clean tenantId (remove quotes if present)
      if (tenantId && typeof tenantId === 'string') {
        if (tenantId.startsWith('"') && tenantId.endsWith('"')) {
          tenantId = tenantId.slice(1, -1);
        }
      }

      console.log(`📋 Parsed event - ID: ${eventId}, Type: ${eventType}, Tenant: "${tenantId}"`);

      let eventData;
      try {
        // Handle Redis stream data format - parse the data field
        const dataStr = eventObj.data;
        console.log(`📋 Raw data string: "${dataStr}"`);

        if (dataStr && typeof dataStr === 'string') {
          // Remove surrounding quotes if present (Redis format)
          let cleanDataStr = dataStr;
          if (cleanDataStr.startsWith('"') && cleanDataStr.endsWith('"')) {
            cleanDataStr = cleanDataStr.slice(1, -1);
          }

          console.log(`📋 Cleaned data string: "${cleanDataStr}"`);

          // Parse the JSON data
          eventData = JSON.parse(cleanDataStr);
          console.log(`✅ Successfully parsed event data`);
        } else {
          eventData = dataStr;
        }
      } catch (parseError) {
        console.error('❌ Failed to parse event data JSON:', parseError);
        console.error('❌ Raw data string:', eventObj.data);
        console.error('❌ Cleaned data string:', cleanDataStr);
        return;
      }

      console.log(`🔄 Processing ${eventType} event: ${eventId}`);
      console.log('📋 Event data:', JSON.stringify(eventData, null, 2));

      // Validate required fields
      if (!eventData.assignmentId || !eventData.userId || !eventData.organizationId) {
        console.error('❌ Invalid event data - missing required fields:', {
          assignmentId: !!eventData.assignmentId,
          userId: !!eventData.userId,
          organizationId: !!eventData.organizationId
        });
        return;
      }

      // Check if organization exists in database
      const organizationExists = await this.checkOrganizationExists(tenantId, eventData);

      if (!organizationExists) {
        return;
      }

      // Process based on event type
      switch (eventType) {
        case 'organization.assignment.created':
          await this.handleAssignmentCreated(tenantId, eventData);
          break;

        case 'organization.assignment.updated':
          await this.handleAssignmentUpdated(tenantId, eventData);
          break;

        case 'organization.assignment.deleted':
          await this.handleAssignmentDeleted(tenantId, eventData);
          break;

        case 'organization.assignment.deactivated':
          await this.handleAssignmentDeactivated(tenantId, eventData);
          break;

        case 'organization.assignment.activated':
          await this.handleAssignmentActivated(tenantId, eventData);
          break;

        default:
          console.warn(`⚠️ Unknown event type: ${eventType}`);
      }

      console.log(`✅ Successfully processed ${eventType} event`);

    } catch (error) {
      console.error('❌ Error processing message:', error);
      throw error;
    }
  }

  /**
   * Check if organization exists in database
   */
  async checkOrganizationExists(tenantId, eventData) {
    try {
      // Use organizationId as the orgCode for this CRM application
      // The organizationId field contains the orgCode that should exist in this system
      const orgCode = eventData.organizationId;

      console.log(`🔍 Checking organization existence - orgCode: "${orgCode}", tenant: "${tenantId}"`);

      // First try exact match (force fresh lookup)
      let organization = await Organization.findOne({
        tenantId,
        orgCode: orgCode
      }).lean();

      // If not found, wait a moment and try again (in case of timing issues)
      if (!organization) {
        console.log(`⏳ Organization not found immediately, waiting 1 second and retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        organization = await Organization.findOne({
          tenantId,
          orgCode: orgCode
        }).lean();
      }

      if (!organization) {
        console.log(`⚠️ Exact match failed, trying case-insensitive search...`);
        // Try case-insensitive match
        organization = await Organization.findOne({
          tenantId,
          orgCode: { $regex: `^${orgCode}$`, $options: 'i' }
        }).lean();

        if (organization) {
          console.log(`✅ Found with case-insensitive match: ${organization.orgCode}`);
        }
      }

      if (!organization) {
        console.log(`⚠️ Organization not found in tenant ${tenantId}, checking DB-wide...`);
        // Check if this organization exists at all (for debugging)
        const orgInDB = await Organization.findOne({ orgCode: orgCode }).lean();
        if (orgInDB) {
          console.log(`✅ Organization exists in DB but tenant mismatch:`);
          console.log(`  - DB tenantId: ${orgInDB.tenantId}`);
          console.log(`  - Lookup tenantId: ${tenantId}`);
        } else {
          console.log(`❌ Organization with orgCode ${orgCode} does not exist in DB at all`);
        }

        console.log(`📋 Available orgCodes in tenant ${tenantId}:`);
        const availableOrgs = await Organization.find({ tenantId }).select('orgCode orgName').limit(5).lean();
        console.log(availableOrgs.map(org => `  - ${org.orgCode}: ${org.orgName}`));
      }

      return !!organization;
    } catch (error) {
      console.error('❌ Error checking organization existence:', error);
      return false;
    }
  }

  /**
   * Handle assignment creation
   */
  async handleAssignmentCreated(tenantId, eventData) {
    try {
      // Check if assignment already exists
      const existingAssignment = await EmployeeOrgAssignment.findOne({
        tenantId,
        assignmentId: eventData.assignmentId
      });

      if (existingAssignment) {
        console.log(`ℹ️ Assignment ${eventData.assignmentId} already exists, skipping creation`);
        return;
      }

      // Use organizationId as the orgCode for this CRM application
      // The organizationId field contains the orgCode that should exist in this system
      const orgCode = eventData.organizationId;

      console.log(`🔍 Looking up organization with orgCode: "${orgCode}" in tenant: "${tenantId}"`);

      // First try exact match (force fresh lookup)
      let organization = await Organization.findOne({
        tenantId,
        orgCode: orgCode
      }).lean();

      // If not found, wait a moment and try again (in case of timing issues)
      if (!organization) {
        console.log(`⏳ Organization not found immediately, waiting 1 second and retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));

        organization = await Organization.findOne({
          tenantId,
          orgCode: orgCode
        }).lean();
      }

      if (!organization) {
        console.log(`⚠️ Exact match failed, trying case-insensitive search...`);
        // Try case-insensitive match
        organization = await Organization.findOne({
          tenantId,
          orgCode: { $regex: `^${orgCode}$`, $options: 'i' }
        }).lean();

        if (organization) {
          console.log(`✅ Found with case-insensitive match: ${organization.orgCode}`);
        }
      }

      if (!organization) {
        console.log(`⚠️ Still not found, checking if organization exists in DB...`);
        // Check if this organization exists at all (for debugging)
        const orgInDB = await Organization.findOne({ orgCode: orgCode }).lean();
        if (orgInDB) {
          console.log(`✅ Organization exists in DB but tenant mismatch:`);
          console.log(`  - DB tenantId: ${orgInDB.tenantId}`);
          console.log(`  - Lookup tenantId: ${tenantId}`);
        } else {
          console.log(`❌ Organization with orgCode ${orgCode} does not exist in DB at all`);
        }
      }

      if (!organization) {
        console.log(`⚠️ Organization not found with orgCode: ${orgCode} in tenant ${tenantId}`);
        console.log(`📋 Available orgCodes in tenant ${tenantId}:`);
        // Debug: List available organizations
        const availableOrgs = await Organization.find({ tenantId }).select('orgCode orgName').limit(10).lean();
        console.log(availableOrgs.map(org => `  - ${org.orgCode}: ${org.orgName}`));

        console.log(`🔍 Event data - organizationId: "${eventData.organizationId}"`);
        console.log(`🔍 Event data - organizationCode: "${eventData.organizationCode}"`);
        return;
      }

      console.log(`✅ Found organization: ${organization.orgName} (${organization.orgCode})`);

      // Check if assignment already exists before creating
      // Try multiple lookup strategies due to inconsistent assignment ID formats
      let duplicateAssignment = await EmployeeOrgAssignment.findOne({
        tenantId,
        assignmentId: eventData.assignmentId
      });

      // If not found by exact ID, try userId + orgId combination
      if (!duplicateAssignment) {
        console.log(`⚠️ Assignment not found by exact ID, trying userId+orgId lookup...`);
        duplicateAssignment = await EmployeeOrgAssignment.findOne({
          tenantId,
          userIdString: eventData.userId,
          entityIdString: eventData.organizationId
        });

        if (duplicateAssignment) {
          console.log(`✅ Found existing assignment by userId+orgId: ${duplicateAssignment.assignmentId}`);
          console.log(`📋 Event assignmentId: ${eventData.assignmentId}`);
          console.log(`📋 DB assignmentId: ${duplicateAssignment.assignmentId}`);
        }
      }

      if (duplicateAssignment) {
        console.log(`ℹ️ Assignment ${eventData.assignmentId} already exists, skipping creation`);
        return;
      }

      console.log(`🔄 Creating new assignment: ${eventData.assignmentId}`);
      console.log(`📋 Assignment details - User: ${eventData.userId}, Org: ${organization.orgCode}, Type: ${eventData.assignmentType}`);

      // Find the actual ObjectIds for user and organization
      const UserProfile = mongoose.model('UserProfile');
      const userProfile = await UserProfile.findOne({
        tenantId,
        userId: eventData.userId
      }).lean();

      if (!userProfile) {
        console.error(`❌ User profile not found for userId: ${eventData.userId} in tenant ${tenantId}`);
        return;
      }

      // Create new assignment with both ObjectId and string references
      const newAssignment = new EmployeeOrgAssignment({
        assignmentId: eventData.assignmentId, // Use the assignmentId from the event
        tenantId,
        userId: userProfile._id, // ObjectId reference to UserProfile
        userIdString: eventData.userId,
        entityId: organization._id, // ObjectId reference to Organization
        entityIdString: organization.orgCode, // Use the resolved orgCode
        assignmentType: eventData.assignmentType || 'direct',
        isActive: eventData.isActive !== false,
        assignedAt: new Date(eventData.assignedAt || Date.now()),
        priority: eventData.priority || 1,
        assignedBy: eventData.assignedBy,
        metadata: eventData.metadata || {}
      });

      // Handle isPrimary field if present in event data
      if (eventData.isPrimary !== undefined) {
        newAssignment.isPrimary = eventData.isPrimary;
      }

      try {
        await newAssignment.save();
        console.log(`✅ Created organization assignment: ${eventData.assignmentId} for orgCode: ${organization.orgCode}`);
      } catch (saveError) {
        console.error(`❌ Failed to save assignment ${eventData.assignmentId}:`, saveError);
        throw saveError;
      }

    } catch (error) {
      console.error('❌ Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Handle assignment updates
   */
  async handleAssignmentUpdated(tenantId, eventData) {
    try {
      const updateData = {};

      // Map event changes to database fields
      if (eventData.changes) {
        if (eventData.changes.assignmentType) {
          updateData.assignmentType = eventData.changes.assignmentType;
        }
        if (eventData.changes.isActive !== undefined) {
          updateData.isActive = eventData.changes.isActive;
        }
        if (eventData.changes.priority !== undefined) {
          updateData.priority = eventData.changes.priority;
        }
      }

      updateData.updatedAt = new Date();

      // First try to update by exact assignmentId
      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId, assignmentId: eventData.assignmentId },
        { $set: updateData }
      );

      // If not found by exact ID, try to find and update by userId and organizationId combination
      if (result.matchedCount === 0) {
        console.log(`⚠️ Assignment not found by exact ID, trying userId+orgId lookup for update...`);

        // Extract userId and orgId from the assignmentId (format: userId_orgId_timestamp)
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          const userId = parts[0];
          const orgId = parts[1];

          console.log(`🔍 Looking for assignment with userId: ${userId}, orgId: ${orgId} for update`);

          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId,
              userIdString: userId,
              entityIdString: orgId
            },
            { $set: updateData }
          );

          if (result.matchedCount > 0) {
            console.log(`✅ Updated assignment by userId+orgId combination`);
          } else {
            console.log(`⚠️ No assignment found for update with userId: ${userId}, orgId: ${orgId}`);
          }
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for update`);
        return;
      }

      console.log(`✅ Updated organization assignment: ${eventData.assignmentId}`);

    } catch (error) {
      console.error('❌ Error updating assignment:', error);
      throw error;
    }
  }

  /**
   * Handle assignment deletion
   */
  async handleAssignmentDeleted(tenantId, eventData) {
    try {
      console.log(`🔄 Attempting to delete assignment: ${eventData.assignmentId}`);

      // First try to find by exact assignmentId
      let assignmentToDelete = await EmployeeOrgAssignment.findOne({
        tenantId,
        assignmentId: eventData.assignmentId
      });

      // If not found by exact ID, try to find by userId and organizationId combination
      if (!assignmentToDelete) {
        console.log(`⚠️ Assignment not found by exact ID, trying userId+orgId lookup...`);

        // Extract userId and orgId from the assignmentId (format: userId_orgId_timestamp)
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          const userId = parts[0];
          const orgId = parts[1];

          console.log(`🔍 Looking for assignment with userId: ${userId}, orgId: ${orgId}`);

          // First try to find by userIdString and entityIdString
          assignmentToDelete = await EmployeeOrgAssignment.findOne({
            tenantId,
            userIdString: userId,
            entityIdString: orgId
          });

          if (assignmentToDelete) {
            console.log(`✅ Found assignment by userId+orgId: ${assignmentToDelete.assignmentId}`);
            console.log(`📋 Event assignmentId: ${eventData.assignmentId}`);
            console.log(`📋 DB assignmentId: ${assignmentToDelete.assignmentId}`);
          } else {
            console.log(`❌ No assignment found for user ${userId} and org ${orgId}`);
          }
        }
      }

      if (!assignmentToDelete) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for deletion`);
        console.log(`📋 Assignment details - ID: ${eventData.assignmentId}, User: ${eventData.userId}, Org: ${eventData.organizationId}`);

        // List existing assignments for this user to help debugging
        const userAssignments = await EmployeeOrgAssignment.find({
          tenantId,
          userIdString: eventData.userId
        }).select('assignmentId entityIdString isActive').lean();

        console.log(`📋 Existing assignments for user ${eventData.userId}:`);
        userAssignments.forEach(assignment => {
          console.log(`  - ${assignment.assignmentId} (Org: ${assignment.entityIdString}, Active: ${assignment.isActive})`);
        });
        return;
      }

      console.log(`✅ Found existing assignment for deletion: ${assignmentToDelete._id}`);

      // Delete using the _id of the found record, not the event's assignmentId
      const result = await EmployeeOrgAssignment.deleteOne({
        _id: assignmentToDelete._id
      });

      if (result.deletedCount === 0) {
        console.warn(`⚠️ Assignment ${assignmentToDelete._id} not deleted (already deleted?)`);
        return;
      }

      console.log(`✅ Deleted organization assignment: ${eventData.assignmentId} (DB ID: ${assignmentToDelete._id})`);

    } catch (error) {
      console.error('❌ Error deleting assignment:', error);
      throw error;
    }
  }

  /**
   * Handle assignment deactivation
   */
  async handleAssignmentDeactivated(tenantId, eventData) {
    try {
      console.log(`🔄 Attempting to deactivate assignment: ${eventData.assignmentId}`);

      // First try to update by exact assignmentId
      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId, assignmentId: eventData.assignmentId },
        {
          $set: {
            isActive: false,
            deactivatedAt: new Date(),
            deactivatedBy: eventData.deactivatedBy
          }
        }
      );

      // If not found by exact ID, try to find and update by userId and organizationId combination
      if (result.matchedCount === 0) {
        console.log(`⚠️ Assignment not found by exact ID, trying userId+orgId lookup for deactivation...`);

        // Extract userId and orgId from the assignmentId (format: userId_orgId_timestamp)
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          const userId = parts[0];
          const orgId = parts[1];

          console.log(`🔍 Looking for assignment with userId: ${userId}, orgId: ${orgId} for deactivation`);

          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId,
              userIdString: userId,
              entityIdString: orgId
            },
            {
              $set: {
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: eventData.deactivatedBy
              }
            }
          );

          if (result.matchedCount > 0) {
            console.log(`✅ Deactivated assignment by userId+orgId combination`);
          } else {
            console.log(`⚠️ No assignment found for deactivation with userId: ${userId}, orgId: ${orgId}`);
          }
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for deactivation`);
        return;
      }

      console.log(`✅ Deactivated organization assignment: ${eventData.assignmentId}`);

    } catch (error) {
      console.error('❌ Error deactivating assignment:', error);
      throw error;
    }
  }

  /**
   * Handle assignment activation
   */
  async handleAssignmentActivated(tenantId, eventData) {
    try {
      console.log(`🔄 Attempting to activate assignment: ${eventData.assignmentId}`);

      // First try to update by exact assignmentId
      let result = await EmployeeOrgAssignment.updateOne(
        { tenantId, assignmentId: eventData.assignmentId },
        {
          $set: {
            isActive: true,
            activatedAt: new Date(),
            activatedBy: eventData.activatedBy
          },
          $unset: {
            deactivatedAt: "",
            deactivatedBy: ""
          }
        }
      );

      // If not found by exact ID, try to find and update by userId and organizationId combination
      if (result.matchedCount === 0) {
        console.log(`⚠️ Assignment not found by exact ID, trying userId+orgId lookup for activation...`);

        // Extract userId and orgId from the assignmentId (format: userId_orgId_timestamp)
        const parts = eventData.assignmentId.split('_');
        if (parts.length >= 2) {
          const userId = parts[0];
          const orgId = parts[1];

          console.log(`🔍 Looking for assignment with userId: ${userId}, orgId: ${orgId} for activation`);

          result = await EmployeeOrgAssignment.updateOne(
            {
              tenantId,
              userIdString: userId,
              entityIdString: orgId
            },
            {
              $set: {
                isActive: true,
                activatedAt: new Date(),
                activatedBy: eventData.activatedBy
              },
              $unset: {
                deactivatedAt: "",
                deactivatedBy: ""
              }
            }
          );

          if (result.matchedCount > 0) {
            console.log(`✅ Activated assignment by userId+orgId combination`);
          } else {
            console.log(`⚠️ No assignment found for activation with userId: ${userId}, orgId: ${orgId}`);
          }
        }
      }

      if (result.matchedCount === 0) {
        console.warn(`⚠️ Assignment ${eventData.assignmentId} not found for activation`);
        return;
      }

      console.log(`✅ Activated organization assignment: ${eventData.assignmentId}`);

    } catch (error) {
      console.error('❌ Error activating assignment:', error);
      throw error;
    }
  }

  /**
   * Disconnect and cleanup
   */
  async disconnect() {
    try {
      if (this.redisClient && this.isConnected) {
        await this.redisClient.disconnect();
        this.isConnected = false;
        console.log('🔌 Organization Assignment Consumer disconnected');
      }
    } catch (error) {
      console.error('❌ Error disconnecting Organization Assignment Consumer:', error);
    }
  }
}

// Export singleton instance
let consumerInstance = null;

export const getOrganizationAssignmentConsumer = () => {
  if (!consumerInstance) {
    consumerInstance = new OrganizationAssignmentConsumer();
  }
  return consumerInstance;
};

export default OrganizationAssignmentConsumer;
