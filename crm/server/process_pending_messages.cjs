const mongoose = require('mongoose');
import dotenv from 'dotenv';
dotenv.config();
const { createClient } = require('redis');

const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://letszopkit:t41z0qaCIoK8vnDr@letszop.gog5bymongodb.net/zopkit_crm?retryWrites=true&w=majority&appName=letszop';
const redisUrl = process.env.REDIS_URL || 'redis://default:k9PVaIlCi1uWh5v6bS7zomT6vYJfnbWU@redis-18875.crce182.ap-south-1-1.ec2.redns.redis-cloud.com:18875';

async function processPendingMessages() {
  console.log('🚀 FORCE PROCESSING ALL PENDING MESSAGES...\n');

  let mongoClient, redisClient;

  try {
    // Connect to MongoDB
    mongoClient = await mongoose.connect(mongoUri,
        {
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
        }
    );
    console.log('✅ Connected to MongoDB');

    // Connect to Redis
    redisClient = createClient({ url: redisUrl });
    await redisClient.connect();
    console.log('✅ Connected to Redis\n');

    // Import required models
    const { default: CrmEventProcessingRecord } = await import('./models/CrmEventProcessingRecord.js');
    const { default: CreditTransaction } = await import('./models/CreditTransaction.js');
    const { default: CrmEntityCredit } = await import('./models/CrmEntityCredit.js');

    // Define streams to check
    const streams = [
      'credit-events',
      'crm:sync:credits:credit_config_updated',
      'crm:sync:role_permissions',
      'crm:sync:organization:org_created'
    ];

    let totalProcessed = 0;
    let totalClaimed = 0;

    for (const stream of streams) {
      console.log(`🔍 Processing stream: ${stream}`);

      try {
        // Get consumer groups for this stream
        const groups = await redisClient.xInfoGroups(stream);
        console.log(`   Found ${groups.length} consumer groups`);

        for (const group of groups) {
          if (group.pending === 0) continue;

          console.log(`   📋 Processing group: ${group.name} (${group.pending} pending messages)`);

          // Get all pending messages for this group
          const pendingMessages = await redisClient.xPendingRange(
            stream,
            group.name,
            '-', // min
            '+', // max
            group.pending // get all pending
          );

          console.log(`   Found ${pendingMessages.length} pending messages to claim`);

          // Claim each pending message
          for (const msg of pendingMessages) {
            try {
              console.log(`      🎯 Claiming message ${msg.id} from consumer ${msg.consumer || 'unassigned'}`);

              // Claim the message
              const claimed = await redisClient.xClaim(
                stream,
                group.name,
                'force-processor', // Use a special consumer name
                3600000, // 1 hour visibility timeout
                msg.id
              );

              if (claimed && claimed.length > 0) {
                totalClaimed++;
                console.log(`      ✅ Claimed message ${msg.id}`);

                // Now read and process the message
                const messageData = claimed[0];
                console.log(`      📨 Processing message ${msg.id}...`);

                // Parse the message
                const event = parseRedisMessage(messageData);

                // Route to appropriate handler based on event type
                const processed = await processEvent(event, { mongoClient, CrmEventProcessingRecord, CreditTransaction, CrmEntityCredit });

                if (processed) {
                  // Acknowledge the message
                  await redisClient.xAck(stream, group.name, msg.id);
                  totalProcessed++;
                  console.log(`      ✅ Processed and acknowledged message ${msg.id}`);
                } else {
                  console.log(`      ❌ Failed to process message ${msg.id}`);
                }

              } else {
                console.log(`      ❌ Failed to claim message ${msg.id}`);
              }

            } catch (claimError) {
              console.error(`      💥 Error claiming message ${msg.id}:`, claimError.message);
            }
          }
        }

      } catch (streamError) {
        if (streamError.message.includes('NOGROUP')) {
          console.log(`   Stream ${stream} has no consumer groups`);
        } else {
          console.error(`   💥 Error processing stream ${stream}:`, streamError.message);
        }
      }

      console.log('');
    }

    console.log(`\n🎉 FORCE PROCESSING COMPLETE!`);
    console.log(`   📊 Total messages claimed: ${totalClaimed}`);
    console.log(`   ✅ Total messages processed: ${totalProcessed}`);

  } catch (error) {
    console.error('💥 CRITICAL ERROR:', error);
  } finally {
    // Cleanup
    if (mongoClient) {
      await mongoose.disconnect();
      console.log('🔌 Disconnected from MongoDB');
    }
    if (redisClient && redisClient.status === 'ready') {
      await redisClient.disconnect();
      console.log('🔌 Disconnected from Redis');
    }
  }
}

function parseRedisMessage(message) {
  const event = { id: message.id };

  Object.entries(message.message).forEach(([key, value]) => {
    try {
      event[key] = JSON.parse(value);
    } catch {
      event[key] = value;
    }
  });

  // Handle wrapper API format where event is in 'data' field as JSON string
  if (event.data && typeof event.data === 'object') {
    Object.assign(event, event.data);
    delete event.data;
  }

  if (!event.eventType) {
    if (event.reason === 'application_allocation') {
      event.eventType = 'credit.allocated';
      event.amount = event.availableCredits;
    } else if (event.reason === 'credit_consumption') {
      event.eventType = 'credit.consumed';
    } else {
      event.eventType = 'unknown';
    }
  }

  return event;
}

async function processEvent(event, deps) {
  const { CrmEventProcessingRecord, CreditTransaction, CrmEntityCredit } = deps;

  try {
    console.log(`         Event type: ${event.eventType}, Tenant: ${event.tenantId}`);

    switch (event.eventType) {
      case 'credit.allocated':
        return await processCreditAllocation(event, deps);

      case 'credit_config.updated':
        return await processCreditConfigUpdate(event, deps);

      case 'org_created':
        return await processOrgCreated(event, deps);

      case 'role.created':
      case 'role.updated':
      case 'role.deleted':
      case 'role_permissions.updated':
        return await processRolePermissions(event, deps);

      default:
        console.log(`         ⚠️ Unknown event type: ${event.eventType}, skipping`);
        return true; // Don't retry unknown events
    }
  } catch (error) {
    console.error(`         💥 Error processing event:`, error.message);
    return false;
  }
}

async function processCreditAllocation(event, deps) {
  const { CreditTransaction, CrmEntityCredit, CrmEventProcessingRecord } = deps;

  try {
    // Check if already processed
    const existingRecord = await CrmEventProcessingRecord.findOne({
      eventId: event.eventId || event.id,
      eventType: 'credit.allocated'
    });

    if (existingRecord) {
      console.log(`         ⏭️ Credit allocation already processed`);
      return true;
    }

    // Determine target entity
    let targetEntityId = event.entityId || event.targetEntityId;
    if (!targetEntityId && event.reason === 'application_allocation') {
      // Try to find by orgCode
      const { default: Organization } = await import('./models/Organization.js');
      const org = await Organization.findOne({
        tenantId: event.tenantId,
        orgCode: 'cae02c60-ef89-4a0c-af66-955deb6f5623' // Known org
      });
      if (org) {
        targetEntityId = org._id.toString();
        console.log(`         🎯 Using fallback entity: ${targetEntityId}`);
      }
    }

    if (!targetEntityId) {
      console.error(`         ❌ No entityId found for credit allocation`);
      return false;
    }

    // Import credit service
    const { default: creditService } = await import('./services/creditService.js');

    // Allocate credits
    const result = await creditService.allocateCredits(
      event.tenantId,
      targetEntityId,
      event.amount || event.availableCredits || 0,
      'wrapper',
      {
        sourceEventId: event.eventId || event.id,
        allocationSource: 'redis-stream-recovery',
        eventTimestamp: event.timestamp || new Date().toISOString(),
        source: 'force-processor'
      }
    );

    // Store processing record
    await new CrmEventProcessingRecord({
      eventId: event.eventId || event.id,
      eventType: 'credit.allocated',
      tenantId: event.tenantId,
      entityId: targetEntityId,
      processedAt: new Date(),
      status: 'completed',
      result: result
    }).save();

    console.log(`         ✅ Credit allocation processed: ${event.amount || event.availableCredits} credits`);
    return true;

  } catch (error) {
    console.error(`         ❌ Credit allocation failed:`, error.message);
    return false;
  }
}

async function processCreditConfigUpdate(event, deps) {
  const { CrmEventProcessingRecord } = deps;

  try {
    // Check if already processed
    const existingRecord = await CrmEventProcessingRecord.findOne({
      eventId: event.eventId || event.id,
      eventType: 'credit_config.updated'
    });

    if (existingRecord) {
      console.log(`         ⏭️ Credit config update already processed`);
      return true;
    }

    // Import credit service
    const { default: creditService } = await import('./services/creditService.js');

    // Update credit config
    await creditService.updateCreditConfig(event);

    // Store processing record
    await new CrmEventProcessingRecord({
      eventId: event.eventId || event.id,
      eventType: 'credit_config.updated',
      tenantId: event.tenantId,
      processedAt: new Date(),
      status: 'completed'
    }).save();

    console.log(`         ✅ Credit config update processed`);
    return true;

  } catch (error) {
    console.error(`         ❌ Credit config update failed:`, error.message);
    return false;
  }
}

async function processOrgCreated(event, deps) {
  const { CrmEventProcessingRecord } = deps;

  try {
    // Check if already processed
    const existingRecord = await CrmEventProcessingRecord.findOne({
      eventId: event.eventId || event.id,
      eventType: 'org_created'
    });

    if (existingRecord) {
      console.log(`         ⏭️ Organization creation already processed`);
      return true;
    }

    // Import organization model
    const { default: Organization } = await import('./models/Organization.js');

    // Check if organization already exists
    const existingOrg = await Organization.findOne({
      tenantId: event.tenantId,
      orgCode: event.orgCode || event.data?.orgCode
    });

    if (existingOrg) {
      console.log(`         ⏭️ Organization ${event.orgCode || event.data?.orgCode} already exists`);
      return true;
    }

    // Create organization
    const organization = new Organization({
      tenantId: event.tenantId,
      orgCode: event.orgCode || event.data?.orgCode,
      name: event.orgName || event.name || event.data?.orgName,
      type: event.orgType || event.type || 'organization',
      organizationType: event.organizationType || event.data?.organizationType,
      description: event.description || event.data?.description,
      parentId: null, // Will resolve later
      entityLevel: event.entityLevel || event.data?.entityLevel,
      isActive: event.isActive !== false,
      lastSyncedAt: new Date()
    });

    await organization.save();

    // Store processing record
    await new CrmEventProcessingRecord({
      eventId: event.eventId || event.id,
      eventType: 'org_created',
      tenantId: event.tenantId,
      entityId: organization._id,
      processedAt: new Date(),
      status: 'completed'
    }).save();

    console.log(`         ✅ Organization created: ${event.orgCode || event.data?.orgCode}`);
    return true;

  } catch (error) {
    console.error(`         ❌ Organization creation failed:`, error.message);
    return false;
  }
}

async function processRolePermissions(event, deps) {
  const { CrmEventProcessingRecord } = deps;

  try {
    // Check if already processed
    const existingRecord = await CrmEventProcessingRecord.findOne({
      eventId: event.eventId || event.id,
      eventType: event.eventType || 'role_permissions.updated'
    });

    if (existingRecord) {
      console.log(`         ⏭️ Role event already processed: ${event.eventType}`);
      return true;
    }

    // Import role processing service
    const roleProcessingService = (await import('./services/roleProcessingService.js')).default;

    // Initialize with models
    await roleProcessingService.initialize({
      CrmRole: (await import('./models/CrmRole.js')).default,
      CrmRoleAssignment: (await import('./models/CrmRoleAssignment.js')).default,
      UserProfile: (await import('./models/UserProfile.js')).default,
      ActivityLog: (await import('./models/ActivityLog.js')).default
    });

    let result;

    // Process based on event type
    switch (event.eventType) {
      case 'role.created':
        console.log(`         📝 Processing role creation: ${event.data?.roleName || event.data?.roleId}`);
        result = await roleProcessingService.processRoleCreate(event.data, {
          eventId: event.eventId || event.id,
          source: 'event_stream'
        });
        break;

      case 'role.updated':
        console.log(`         📝 Processing role update: ${event.data?.roleId}`);
        result = await roleProcessingService.processRoleUpdate(event.data, {
          eventId: event.eventId || event.id,
          source: 'event_stream'
        });
        break;

      case 'role.deleted':
        console.log(`         📝 Processing role deletion: ${event.data?.roleId}`);
        result = await roleProcessingService.processRoleDelete(event.data, {
          eventId: event.eventId || event.id,
          source: 'event_stream'
        });
        break;

      default:
        console.log(`         ⚠️ Unknown role event type: ${event.eventType}`);
        // Mark as processed but with warning
        await new CrmEventProcessingRecord({
          eventId: event.eventId || event.id,
          eventType: event.eventType,
          tenantId: event.tenantId,
          processedAt: new Date(),
          status: 'completed',
          notes: `Unknown role event type: ${event.eventType}`
        }).save();
        return true;
    }

    // Record successful processing
    await new CrmEventProcessingRecord({
      eventId: event.eventId || event.id,
      eventType: event.eventType,
      tenantId: event.tenantId,
      processedAt: new Date(),
      status: 'completed',
      notes: `Role ${result.action}: ${result.roleId}${result.affectedUsersCount ? ` (${result.affectedUsersCount} users affected)` : ''}`,
      metadata: {
        result,
        eventData: event.data
      }
    }).save();

    console.log(`         ✅ Role event processed successfully: ${event.eventType} - ${result.action}`);
    return true;

  } catch (error) {
    console.error(`         ❌ Role event processing failed:`, error.message);

    // Record failed processing
    try {
      await new CrmEventProcessingRecord({
        eventId: event.eventId || event.id,
        eventType: event.eventType || 'role_permissions.updated',
        tenantId: event.tenantId,
        processedAt: new Date(),
        status: 'failed',
        notes: `Processing failed: ${error.message}`,
        error: error.message,
        metadata: {
          eventData: event.data,
          stack: error.stack
        }
      }).save();
    } catch (recordError) {
      console.error(`         ❌ Failed to record error:`, recordError.message);
    }

    return false;
  }
}

// Run the processor
processPendingMessages().catch(console.error);
