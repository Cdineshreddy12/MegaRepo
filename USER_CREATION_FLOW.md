# Complete User Creation Flow: Wrapper API → CRM

This document explains the end-to-end flow of user creation from the Wrapper API to CRM, including Redis streams, consumer groups, and all files involved.

## Overview

When a user is created in the Wrapper API (via invitation acceptance or direct creation), the system:
1. Creates the user in the Wrapper database
2. Publishes a `user_created` event to a Redis stream
3. CRM consumers read from the stream using consumer groups
4. CRM creates/updates the user profile in MongoDB

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    WRAPPER API (Entry Points)                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. POST /invitations/accept-by-token                         │
│     └─> wrapper/backend/src/routes/invitations.js              │
│                                                                 │
│  2. TenantService.acceptInvitation()                           │
│     └─> wrapper/backend/src/services/tenant-service.js        │
│                                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ User Created in Wrapper DB
                        │ (tenant_users table)
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              Redis Stream Publishing Layer                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  CrmSyncStreams.publishUserEvent()                             │
│  └─> wrapper/backend/src/utils/redis.js                        │
│                                                                 │
│  Stream: crm:sync:user:user_created                            │
│  Format: {                                                      │
│    streamId, messageId, timestamp,                             │
│    sourceApp: 'wrapper-api',                                    │
│    eventType: 'user_created',                                   │
│    entityType: 'user',                                          │
│    entityId: userId,                                            │
│    tenantId: tenantId,                                          │
│    data: JSON.stringify({ userId, email, firstName,            │
│                          lastName, name, isActive, createdAt }),│
│    metadata: JSON.stringify({ correlationId, version, ... })   │
│  }                                                              │
│                                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Redis XADD
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Redis Stream                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Stream Key: crm:sync:user:user_created                        │
│                                                                 │
│  Consumer Groups:                                               │
│  - crm-consumers:{tenantId} (per tenant)                       │
│                                                                 │
│  Example: crm-consumers:00000000-0000-0000-0000-000000000001  │
│                                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Consumer reads via XREADGROUP
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              CRM Consumer (RedisStreamsCRMConsumer)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Entry Point: crm/server/crm-consumer-runner.js                │
│                                                                 │
│  1. Creates consumer per tenant                                │
│  2. Listens to streams: ['crm:sync:user:user_created', ...]   │
│  3. Consumer Group: crm-consumers:{tenantId}                   │
│  4. Consumer Name: {consumerName}-{tenantId}                   │
│                                                                 │
│  Processing:                                                    │
│  └─> crm/server/services/redisStreamsConsumer.js               │
│      ├─> processNewMessages()                                  │
│      ├─> processMessages()                                     │
│      ├─> parseRedisMessage()                                   │
│      └─> processEvent()                                        │
│          └─> eventHandlers['user_created']                    │
│              └─> handleUserCreated()                           │
│                                                                 │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        │ Create/Update UserProfile
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRM MongoDB                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Model: UserProfile                                             │
│  └─> crm/server/models/UserProfile.js                          │
│                                                                 │
│  Document Created:                                              │
│  {                                                              │
│    tenantId,                                                    │
│    userId,                                                      │
│    userIdString,                                                │
│    personalInfo: { firstName, lastName, email },               │
│    status: { isActive: true, lastActivityAt },                │
│    lastSyncedAt                                                 │
│  }                                                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Detailed Step-by-Step Flow

### Step 1: User Creation Entry Points

#### Option A: Invitation Acceptance (Most Common)
**File:** `wrapper/backend/src/routes/invitations.js`

```2030:2265:wrapper/backend/src/routes/invitations.js
  fastify.post('/accept-by-token', async (request, reply) => {
    try {
      const { token, kindeUserId } = request.body;
      
      // ... validation and invitation lookup ...
      
      // Create new user record
      [newUser] = await db
        .insert(tenantUsers)
        .values({
          tenantId: invitation.tenantId,
          kindeUserId: kindeUserId,
          email: invitation.email,
          name: invitation.email.split('@')[0],
          isActive: true,
          onboardingCompleted: true,
          // ...
        })
        .returning();

      // Publish user creation event to Redis streams
      await crmSyncStreams.publishUserEvent(invitation.tenantId, 'user_created', {
        userId: newUser.userId,
        email: newUser.email,
        firstName: firstName,
        lastName: lastName,
        name: newUser.name,
        isActive: true,
        createdAt: newUser.createdAt
      });
    }
  });
```

#### Option B: Direct Invitation Acceptance via Service
**File:** `wrapper/backend/src/services/tenant-service.js`

```615:635:wrapper/backend/src/services/tenant-service.js
        // Publish user creation event to Redis streams for CRM sync
        try {
          // Split name into firstName and lastName for CRM requirements
          const nameParts = (user.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await crmSyncStreams.publishUserEvent(invitation.tenantId, 'user_created', {
            userId: user.userId,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            name: user.name || `${firstName} ${lastName}`.trim(),
            isActive: user.isActive !== undefined ? user.isActive : true,
            createdAt: user.createdAt ? (typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString()) : new Date().toISOString()
          });
          console.log('📡 Published user_created event to Redis streams');
        } catch (streamError) {
          console.warn('⚠️ Failed to publish user creation event to Redis streams:', streamError.message);
          // Don't fail the user creation if stream publishing fails
        }
```

---

### Step 2: Redis Stream Publishing

**File:** `wrapper/backend/src/utils/redis.js`

The `CrmSyncStreams` class handles publishing events to Redis streams:

```480:523:wrapper/backend/src/utils/redis.js
  async publishUserEvent(tenantId, eventType, userData, metadata = {}) {
    const streamKey = `${this.streamPrefix}:user:${eventType}`;

    // Prepare data according to CRM requirements
    // The data field should be a JSON string, not an object
    const eventData = {
      userId: userData.userId,
      email: userData.email,
      ...(userData.firstName && { firstName: userData.firstName }),
      ...(userData.lastName && { lastName: userData.lastName }),
      ...(userData.name && { name: userData.name }),
      ...(userData.isActive !== undefined && { isActive: userData.isActive }),
      ...(userData.createdAt && { createdAt: typeof userData.createdAt === 'string' ? userData.createdAt : userData.createdAt.toISOString() }),
      // For deactivation events
      ...(userData.deactivatedAt && { deactivatedAt: typeof userData.deactivatedAt === 'string' ? userData.deactivatedAt : userData.deactivatedAt.toISOString() }),
      ...(userData.deactivatedBy && { deactivatedBy: userData.deactivatedBy }),
      // For deletion events
      ...(userData.deletedAt && { deletedAt: typeof userData.deletedAt === 'string' ? userData.deletedAt : userData.deletedAt.toISOString() }),
      ...(userData.deletedBy && { deletedBy: userData.deletedBy }),
      ...(userData.reason && { reason: userData.reason })
    };

    const message = {
      streamId: streamKey,
      messageId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      sourceApp: 'wrapper-api',
      eventType,
      entityType: 'user',
      entityId: userData.userId,
      tenantId,
      action: eventType.replace('user_', ''),
      data: JSON.stringify(eventData), // Data must be a JSON string per CRM requirements
      metadata: JSON.stringify({
        correlationId: `user_${userData.userId}_${Date.now()}`,
        version: '1.0',
        retryCount: 0,
        sourceTimestamp: new Date().toISOString(),
        ...metadata
      })
    };

    return await this.publishToStream(streamKey, message);
  }
```

**Publishing Implementation:**

```710:746:wrapper/backend/src/utils/redis.js
  async publishToStream(streamKey, message) {
    if (!this.redis.isConnected) {
      console.warn('⚠️ Redis not connected, skipping stream publish');
      return null;
    }

    try {
      // Convert message to Redis stream format
      // If data/metadata are already JSON strings (per CRM requirements), don't double-stringify
      const streamData = {};
      Object.entries(message).forEach(([key, value]) => {
        // If value is already a string (like data and metadata fields), use it as-is
        // Otherwise, stringify it
        if (typeof value === 'string') {
          streamData[key] = value;
        } else {
          streamData[key] = JSON.stringify(value);
        }
      });

      // Use XADD to add to stream
      const result = await this.redis.client.xAdd(streamKey, '*', streamData);

      console.log(`📡 Published to Redis Stream: ${streamKey} (ID: ${result})`);
      console.log(`   Event: ${message.eventType}, Entity: ${message.entityId}`);

      return {
        streamKey,
        messageId: result,
        success: true
      };

    } catch (error) {
      console.error(`❌ Failed to publish to Redis Stream ${streamKey}:`, error);
      throw error;
    }
  }
```

**Stream Key Format:**
- Stream: `crm:sync:user:user_created`
- Prefix: `crm:sync` (defined in `CrmSyncStreams` constructor)

---

### Step 3: Consumer Group Setup

**File:** `crm/server/crm-consumer-runner.js`

The consumer runner creates one consumer per active tenant:

```75:120:crm/server/crm-consumer-runner.js
  // Create consumers for each tenant
  const consumers = [];
  for (const tenant of tenantsToProcess) {
    try {
      const tenantStream = `credit-events:${tenant.tenantId}`;
      const tenantConsumerGroup = `crm-consumers:${tenant.tenantId}`;

      console.log(`🔄 Creating consumer for tenant: ${tenant.tenantId} (${tenant.tenantName})`);
      console.log(`   Stream: ${tenantStream}`);
      console.log(`   Consumer Group: ${tenantConsumerGroup}`);

      // Include both tenant-specific streams and global CRM streams
      const allStreams = [
        tenantStream, // Tenant-specific credit events
        'crm:sync:user:user_created',
        'crm:sync:user:user_deactivated',
        'crm:sync:permissions:role_assigned',
        'crm:sync:permissions:role_unassigned',
        'crm:sync:role_permissions', // Legacy role permissions updates
        'crm:sync:role:role_created', // New role CRUD events
        'crm:sync:role:role_updated',
        'crm:sync:role:role_deleted',
        'crm:sync:organization:org_created',
        'crm:sync:credits:credit_allocated',
        'crm:sync:credits:credit_config_updated',
        'crm:organization-assignments' // Organization assignment events (global stream)
      ];

      const consumer = new RedisStreamsCRMConsumer({
        redisUrl,
        consumerGroup: tenantConsumerGroup, // Tenant-specific consumer group
        consumerName: `${consumerName}-${tenant.tenantId}`, // Unique name per tenant
        tenantId: tenant.tenantId,
        streams: allStreams, // All streams including tenant-specific and global
        maxRetries,
        batchSize,
        blockTime
      });

      await consumer.initialize();
      consumers.push(consumer);
      console.log(`✅ Consumer initialized for tenant: ${tenant.tenantId}`);
    } catch (error) {
      console.error(`❌ Failed to create consumer for tenant ${tenant.tenantId}:`, error.message);
    }
  }
```

**Consumer Group Details:**
- **Format:** `crm-consumers:{tenantId}`
- **Example:** `crm-consumers:00000000-0000-0000-0000-000000000001`
- **Consumer Name:** `{baseConsumerName}-{tenantId}` (e.g., `multi-tenant-consumer_12345-00000000-0000-0000-0000-000000000001`)

**Consumer Group Creation:**

```321:341:crm/server/services/redisStreamsConsumer.js
  async createConsumerGroups() {
    console.log('👥 Creating consumer groups...');

    for (const stream of this.streams) {
      try {
        await this.redisClient.xGroupCreate(
          stream,
          this.options.consumerGroup,
          '0',
          { MKSTREAM: true }
        );
        console.log(`✅ Consumer group created: ${stream} -> ${this.options.consumerGroup}`);
      } catch (error) {
        if (error.message.includes('BUSYGROUP')) {
          console.log(`ℹ️ Consumer group already exists for: ${stream}`);
        } else {
          console.error(`❌ Failed to create consumer group for ${stream}:`, error);
        }
      }
    }
  }
```

---

### Step 4: Message Consumption

**File:** `crm/server/services/redisStreamsConsumer.js`

The consumer continuously reads messages from streams:

```568:624:crm/server/services/redisStreamsConsumer.js
  async processNewMessages() {
    try {
      // Check if Redis client is available
      if (!this.redisClient || !this.redisHealthy) {
        console.log('⚠️ Redis client not ready, skipping message processing');
        return;
      }

      // PRIORITY 1: Always try to read new messages first (use '>')
      const newReadConfigs = this.streams.map(stream => ({ key: stream, id: '>' }));

      const newResult = await this.redisClient.xReadGroup(
        this.options.consumerGroup,
        this.options.consumerName,
        newReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let newMessagesCount = 0;
      if (newResult && newResult.length > 0) {
        const totalMessages = newResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📨 Processing ${totalMessages} new message(s)...`);
        await this.processMessages(newResult, false); // false = not pending (new messages)
          newMessagesCount = totalMessages;
        }
      }

      // PRIORITY 2: Then process any pending messages assigned to this consumer
      const pendingReadConfigs = this.streams.map(stream => ({ key: stream, id: '0' }));

      const pendingResult = await this.redisClient.xReadGroup(
        this.options.consumerGroup,
        this.options.consumerName,
        pendingReadConfigs,
        { COUNT: this.options.batchSize, BLOCK: 100 }
      );

      let pendingMessagesCount = 0;
      if (pendingResult && pendingResult.length > 0) {
          const totalMessages = pendingResult.reduce((sum, stream) => sum + stream.messages.length, 0);
        if (totalMessages > 0) {
          console.log(`📋 Processing ${totalMessages} pending message(s)...`);
        await this.processMessages(pendingResult, true); // true = pending messages
          pendingMessagesCount = totalMessages;
        }
      }

      return newMessagesCount + pendingMessagesCount;
    } catch (error) {
      if (error.message !== 'Connection is closed' && error.message !== 'The client is closed') {
        console.error('❌ Error processing new messages:', error);
      } else {
        console.log('⚠️ Redis connection closed during message processing');
      }
    }
  }
```

**Event Handler Mapping:**

```82:106:crm/server/services/redisStreamsConsumer.js
    // Event handlers mapping
    this.eventHandlers = {
      'user_created': this.handleUserCreated.bind(this),
      'user_deactivated': this.handleUserDeactivated.bind(this),
      'user_deleted': this.handleUserDeleted.bind(this), // User permanent deletion
      'role_assigned': this.handleRoleAssigned.bind(this),
      'role_unassigned': this.handleRoleUnassigned.bind(this),
      'role_permissions_changed': this.handleRolePermissionsChanged.bind(this),
      'role_updated': this.handleRoleUpdated.bind(this), // Wrapper publishes as 'role_updated'
      'role.created': this.handleRoleCreated.bind(this), // New role CRUD handlers
      'role.updated': this.handleRoleUpdated.bind(this), // Alternative event type
      'role.deleted': this.handleRoleDeleted.bind(this),
      'org_created': this.handleOrgCreated.bind(this),
      'credit_allocated': this.handleCreditAllocated.bind(this),
      'credit_config_updated': this.handleCreditConfigUpdated.bind(this),
      // New credit event handlers for real-time synchronization
      // NOTE: Only credit.allocated events are consumed from credit-events stream
      // Credit consumption/transaction events are NOT published to streams (internal CRM operations only)
      'credit.allocated': this.handleCreditAllocated.bind(this),
      // Organization assignment event handlers
      'organization.assignment.created': this.handleOrganizationAssignmentCreated.bind(this),
      'organization.assignment.updated': this.handleOrganizationAssignmentUpdated.bind(this),
      'organization.assignment.deleted': this.handleOrganizationAssignmentDeleted.bind(this),
      'organization.assignment.deactivated': this.handleOrganizationAssignmentDeactivated.bind(this),
      'organization.assignment.activated': this.handleOrganizationAssignmentActivated.bind(this)
    };
```

**Event Processing:**

```844:870:crm/server/services/redisStreamsConsumer.js
  async processEvent(event) {
    console.log(`🔄 Processing event: ${event.eventType} for tenant ${event.tenantId}`);
    
    // Log event structure for debugging (truncated to avoid log spam)
    const eventPreview = {
      id: event.id,
      eventType: event.eventType,
      tenantId: event.tenantId,
      entityId: event.entityId,
      hasData: !!event.data,
      keys: Object.keys(event).slice(0, 10) // First 10 keys
    };
    console.log(`📋 Event preview: ${JSON.stringify(eventPreview)}`);
    
    const handler = this.eventHandlers[event.eventType];

    if (handler) {
      console.log(`✅ Found handler for ${event.eventType}`);
      const result = await handler(event);
      console.log(`📋 Handler result: ${JSON.stringify(result)}`);
      return result; // Return handler result for processing logic
    } else {
      console.log(`⚠️ No handler for event type: ${event.eventType}`);
      console.log(`Available handlers: ${Object.keys(this.eventHandlers).join(', ')}`);
      return { success: false, reason: 'no_handler' };
    }
  }
```

---

### Step 5: User Creation Handler

**File:** `crm/server/services/redisStreamsConsumer.js`

The `handleUserCreated` method processes the user creation event:

```1045:1135:crm/server/services/redisStreamsConsumer.js
  async handleUserCreated(event) {
    // Handle both nested data structure and flattened structure
    const eventData = event.data || event;

    // Parse data if it's a JSON string
    let parsedData = eventData;
    if (typeof eventData === 'string') {
      try {
        parsedData = JSON.parse(eventData);
      } catch (e) {
        parsedData = eventData;
      }
    }

    // Validate required fields
    if (!parsedData.userId) {
      console.error(`❌ Missing userId in user_created event. Event keys: ${Object.keys(event).join(', ')}`);
      throw new Error(`Missing required field 'userId' in user_created event`);
    }

    try {
      // Import CRM models
      const { default: UserProfile } = await import('../models/UserProfile.js');

      // Check if user already exists (by userId or userIdString)
      const existingUser = await UserProfile.findOne({
        tenantId: event.tenantId,
        $or: [
          { userId: parsedData.userId },
          { userIdString: parsedData.userId },
          { 'personalInfo.email': parsedData.email }
        ]
      });

      if (existingUser) {
        console.log(`⏭️ User ${parsedData.userId} already exists, updating instead of creating`);
        
        // Update existing user with latest data
        await UserProfile.findOneAndUpdate(
          { _id: existingUser._id },
          {
            userId: parsedData.userId,
            userIdString: parsedData.userId,
            personalInfo: {
              firstName: parsedData.firstName || parsedData.name?.split(' ')[0] || '',
              lastName: parsedData.lastName || parsedData.name?.split(' ').slice(1).join(' ') || '',
              email: parsedData.email
            },
            'status.isActive': true,
            'status.lastActivityAt': parsedData.createdAt ? new Date(parsedData.createdAt) : new Date(),
            lastSyncedAt: new Date()
          }
        );
        
        return { success: true, action: 'updated', userId: parsedData.userId };
      }

      // Create user profile in CRM
      const userProfile = new UserProfile({
        tenantId: event.tenantId,
        userId: parsedData.userId,
        userIdString: parsedData.userId,
        personalInfo: {
          firstName: parsedData.firstName || parsedData.name?.split(' ')[0] || 'User',
          lastName: parsedData.lastName || parsedData.name?.split(' ').slice(1).join(' ') || '',
          email: parsedData.email
        },
        status: {
          isActive: true,
          lastActivityAt: parsedData.createdAt ? new Date(parsedData.createdAt) : new Date()
        },
        lastSyncedAt: new Date()
      });

      await userProfile.save();
      console.log(`👤 Created CRM user profile: ${parsedData.userId} (${parsedData.email})`);
      return { success: true, action: 'created', userId: parsedData.userId };

    } catch (error) {
      console.error('❌ Failed to create user in CRM:', error);

      // Handle duplicate key error gracefully - acknowledge to prevent infinite retries
      if (error.code === 11000 && error.message.includes('duplicate key error')) {
        console.log(`⚠️ User ${parsedData.userId} already exists (duplicate key), acknowledging event`);
        return { acknowledged: true, reason: 'duplicate_key_error' };
      }

      // For other errors, re-throw to allow retries
      throw error;
    }
  }
```

---

### Step 6: UserProfile Model

**File:** `crm/server/models/UserProfile.js`

The UserProfile schema defines the structure:

```1:100:crm/server/models/UserProfile.js
import mongoose from 'mongoose';

const userProfileSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  kindeUserId: {
    type: String,
    index: true,
    sparse: true // Optional field for Kinde integration
  },
  employeeCode: {
    type: String,
    trim: true,
    index: true
  },
  personalInfo: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    }
  },
  // Organization data is now derived from organizationAssignments references
  // Removed direct organization storage to avoid redundancy
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastActivityAt: {
      type: Date,
      default: null
    }
  },
  // References to separate collections
  roleAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CrmRoleAssignment'
  }],

  // References to organization assignments
  organizationAssignments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'EmployeeOrgAssignment'
  }],
  lastSyncedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
userProfileSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
userProfileSchema.index({ tenantId: 1, 'status.isActive': 1 });
userProfileSchema.index({ tenantId: 1, employeeCode: 1 });

// Instance method to get primary organization assignment
userProfileSchema.methods.getPrimaryOrganization = async function() {
  const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

  // Try resolved assignments first
  let assignment = await EmployeeOrgAssignment.findOne({
    userId: this._id,
    isActive: true,
    assignmentType: 'primary'
  }).populate('entityId', 'orgCode orgName hierarchy');

  if (!assignment) {
    // Fallback to string-based search for unresolved assignments
    assignment = await EmployeeOrgAssignment.findOne({
      userIdString: this.userId,
      isActive: true,
      assignmentType: 'primary'
    });

    // For unresolved assignments, try to find the organization by orgCode
    if (assignment && assignment.entityIdString) {
      const Organization = mongoose.model('Organization');
      assignment.entityId = await Organization.findOne({
        tenantId: this.tenantId,
        orgCode: assignment.entityIdString
      }).select('orgCode orgName hierarchy');
    }
  }

  return assignment?.entityId || null;
};
```

---

## Files Involved

### Wrapper API Side

1. **`wrapper/backend/src/routes/invitations.js`**
   - Entry point: `POST /invitations/accept-by-token`
   - Creates user and publishes event

2. **`wrapper/backend/src/services/tenant-service.js`**
   - `TenantService.acceptInvitation()` method
   - Alternative entry point for user creation

3. **`wrapper/backend/src/utils/redis.js`**
   - `CrmSyncStreams` class
   - `publishUserEvent()` method
   - `publishToStream()` method (Redis XADD)

### CRM Side

4. **`crm/server/crm-consumer-runner.js`**
   - Main entry point for consumers
   - Creates consumer per tenant
   - Sets up consumer groups

5. **`crm/server/services/redisStreamsConsumer.js`**
   - `RedisStreamsCRMConsumer` class
   - `processNewMessages()` - reads from streams
   - `processMessages()` - processes batches
   - `processEvent()` - routes to handlers
   - `handleUserCreated()` - creates UserProfile

6. **`crm/server/models/UserProfile.js`**
   - Mongoose schema for UserProfile
   - Defines user structure in CRM

### Supporting Files

7. **`crm/server/utils/consumerGroupManager.js`**
   - Consumer group management utilities
   - Stream configuration mapping

8. **`crm/server/utils/eventValidator.js`**
   - Event validation (if enabled)

9. **`crm/server/utils/circuitBreaker.js`**
   - Circuit breaker for fault tolerance

---

## Redis Stream Details

### Stream Key
```
crm:sync:user:user_created
```

### Message Format
```json
{
  "streamId": "crm:sync:user:user_created",
  "messageId": "1234567890-abc123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "sourceApp": "wrapper-api",
  "eventType": "user_created",
  "entityType": "user",
  "entityId": "user-uuid-here",
  "tenantId": "tenant-uuid-here",
  "action": "created",
  "data": "{\"userId\":\"...\",\"email\":\"...\",\"firstName\":\"...\",\"lastName\":\"...\",\"name\":\"...\",\"isActive\":true,\"createdAt\":\"...\"}",
  "metadata": "{\"correlationId\":\"user_..._1234567890\",\"version\":\"1.0\",\"retryCount\":0,\"sourceTimestamp\":\"...\"}"
}
```

### Consumer Group
- **Format:** `crm-consumers:{tenantId}`
- **Example:** `crm-consumers:00000000-0000-0000-0000-000000000001`
- **Consumer Name:** `{baseName}-{tenantId}`

---

## Error Handling

1. **Stream Publishing Failures**
   - Logged but don't fail user creation
   - User is created in Wrapper DB even if stream publish fails

2. **Consumer Processing Failures**
   - Messages remain in pending state
   - Retry mechanism via `maxRetries` option
   - Circuit breaker prevents cascading failures

3. **Duplicate User Handling**
   - Checks for existing user before creation
   - Updates existing user if found
   - Handles duplicate key errors gracefully

---

## Monitoring & Observability

- **Logs:** Console logs at each step
- **Metrics:** Tracked in `consumer.metrics` object
- **Health Checks:** Redis health monitoring
- **Circuit Breakers:** Prevent cascading failures

---

## Running the Consumer

```bash
# Start CRM consumer
cd crm/server
node crm-consumer-runner.js

# Environment variables:
# - REDIS_URL: Redis connection string
# - MONGO_URI: MongoDB connection string
# - CONSUMER_NAME: Base consumer name (optional)
# - CONSUMER_GROUP: Consumer group prefix (optional)
# - MAX_RETRIES: Max retry attempts (default: 3)
# - BATCH_SIZE: Messages per batch (default: 10)
# - BLOCK_TIME: Block time in ms (default: 5000)
```

---

## Summary

The user creation flow follows this pattern:

1. **Wrapper API** creates user → Publishes to Redis stream `crm:sync:user:user_created`
2. **CRM Consumer** reads from stream using consumer group `crm-consumers:{tenantId}`
3. **Event Handler** processes `user_created` event → Creates/updates `UserProfile` in MongoDB
4. **Acknowledgment** removes message from pending state

The system is designed for:
- **Multi-tenancy:** Separate consumer groups per tenant
- **Fault tolerance:** Circuit breakers, retries, graceful error handling
- **Idempotency:** Duplicate detection and update logic
- **Scalability:** Consumer groups allow horizontal scaling




