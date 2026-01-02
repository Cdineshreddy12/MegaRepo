# CRM Consumer Root Cause Analysis

## Problem Statement

Redis stream events are **NOT being consumed** into the CRM MongoDB database. Specifically:
- Role creation event (`e2064fd3-533d-4b51-a25e-95500ef01eab`) published to `crm:sync:role:role_created` stream is missing from the database
- No event processing records found
- No consumer processes running

## Investigation Results

### 1. Consumer Process Status ❌

**Finding**: **NO CONSUMER PROCESSES ARE RUNNING**

```bash
# Checked for running consumer processes
ps aux | grep -i consumer  # Result: No processes found

# Checked PM2 status
pm2 list  # Result: PM2 not running or not available
```

**Root Cause**: The CRM Redis Streams Consumer is **NOT running as a background process**.

### 2. Consumer Configuration ✅

**Finding**: Consumer is **properly configured** to subscribe to `crm:sync:role:role_created`

From `crm-consumer-runner.js` (lines 87-101):
```javascript
const allStreams = [
  tenantStream,
  'crm:sync:user:user_created',
  'crm:sync:user:user_deactivated',
  'crm:sync:permissions:role_assigned',
  'crm:sync:permissions:role_unassigned',
  'crm:sync:role_permissions',
  'crm:sync:role:role_created', // ✅ SUBSCRIBED
  'crm:sync:role:role_updated',
  'crm:sync:role:role_deleted',
  'crm:sync:organization:org_created',
  'crm:sync:credits:credit_allocated',
  'crm:sync:credits:credit_config_updated',
  'crm:organization-assignments'
];
```

### 3. Event Handler Configuration ✅

**Finding**: Event handler **exists** for `role.created` events

From `redisStreamsConsumer.js` (lines 82-106):
```javascript
this.eventHandlers = {
  // ...
  'role.created': this.handleRoleCreated.bind(this), // ✅ HANDLER EXISTS
  'role.updated': this.handleRoleUpdated.bind(this),
  'role.deleted': this.handleRoleDeleted.bind(this),
  // ...
};
```

### 4. Consumer Startup Requirements

The consumer (`crm-consumer-runner.js`) requires:

1. **Environment Variables**:
   - `REDIS_URL` - Redis connection string
   - `MONGODB_URI` or `MONGO_URI` - MongoDB connection string

2. **Active Tenants**: Consumer queries database for active tenants and creates consumers for each tenant

3. **Manual Execution**: Consumer must be started manually:
   ```bash
   node crm-consumer-runner.js
   ```

### 5. Consumer Architecture

**Multi-Tenant Mode**:
- Consumer queries database for all active tenants
- Creates a separate consumer instance for each tenant
- Each consumer subscribes to both:
  - Tenant-specific streams (e.g., `credit-events:{tenantId}`)
  - Global CRM streams (e.g., `crm:sync:role:role_created`)

**Consumer Group Strategy**:
- Each tenant gets its own consumer group: `crm-consumers:{tenantId}`
- Consumer name: `{consumerName}-{tenantId}`

### 6. Event Processing Flow

1. **Stream Subscription**: Consumer subscribes to `crm:sync:role:role_created`
2. **Message Reading**: Uses `xReadGroup` to read messages from consumer group
3. **Message Parsing**: Parses Redis message format
4. **Event Type Detection**: Extracts `eventType` from message (should be `role.created`)
5. **Handler Dispatch**: Routes to `handleRoleCreated` handler
6. **Database Save**: Handler calls `roleProcessingService.processRoleCreate()`

### 7. Potential Issues

#### Issue 1: Consumer Not Running ⚠️ **PRIMARY ISSUE**

**Status**: Consumer process is not running

**Impact**: No events can be consumed if the consumer is not running

**Solution**: Start the consumer process:
```bash
cd crm/server
node crm-consumer-runner.js
```

Or run as a background service using PM2:
```bash
pm2 start crm-consumer-runner.js --name crm-consumer
pm2 save
pm2 startup
```

#### Issue 2: Tenant Status Check Required ⚠️

**Status**: Unknown - need to verify tenant is active in database

**Impact**: Consumer only creates consumers for active tenants. If tenant is inactive, no consumer will be created.

**Solution**: Verify tenant status in database:
```javascript
// Check if tenant exists and is active
Tenant.findOne({ 
  tenantId: '62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8',
  status: 'active'
})
```

#### Issue 3: Consumer Group May Not Exist ⚠️

**Status**: Unknown - need to check Redis consumer groups

**Impact**: If consumer group doesn't exist, messages cannot be read

**Solution**: Consumer should create consumer groups during initialization (line 167 in `redisStreamsConsumer.js`)

#### Issue 4: Event Type Mismatch ⚠️

**Status**: Possible mismatch

**Finding**: 
- Redis event has: `eventType: 'role.created'`
- Consumer handler expects: `'role.created'` ✅ (matches)

**Note**: Consumer also handles `'role_updated'` which might be a different event type format.

## Root Cause Summary

### PRIMARY ROOT CAUSE: Consumer Not Running ❌

**The CRM Redis Streams Consumer process is NOT running, which is why events are not being consumed.**

### Supporting Evidence:

1. ✅ No consumer processes found in system
2. ✅ No PM2 processes running
3. ✅ Consumer code is properly configured
4. ✅ Event handlers exist and are correct
5. ✅ Stream subscriptions are correct
6. ❌ Consumer must be manually started (not running as a service)

## Recommended Solutions

### Immediate Action:

1. **Start the Consumer**:
   ```bash
   cd /Users/chintadineshreddy/Desktop/MegaRepo/crm/server
   node crm-consumer-runner.js
   ```

2. **Or Set Up as a Service** (Recommended for Production):
   ```bash
   # Install PM2 if not installed
   npm install -g pm2
   
   # Start consumer with PM2
   cd /Users/chintadineshreddy/Desktop/MegaRepo/crm/server
   pm2 start crm-consumer-runner.js --name crm-consumer
   
   # Save PM2 configuration
   pm2 save
   
   # Set up PM2 to start on system boot
   pm2 startup
   ```

3. **Verify Consumer Started Successfully**:
   - Check console output for "✅ Consumer initialized for tenant"
   - Check for "🚀 Starting all consumers..."
   - Verify no errors during startup

### Verification Steps:

1. **Check if consumer is running**:
   ```bash
   ps aux | grep crm-consumer
   # or
   pm2 list
   ```

2. **Check Redis consumer groups** (using MCP or Redis CLI):
   ```bash
   # Check if consumer groups exist
   XINFO GROUPS crm:sync:role:role_created
   ```

3. **Monitor consumer logs**:
   ```bash
   # If using PM2
   pm2 logs crm-consumer
   ```

4. **Verify events are being processed**:
   - Check `crmeventprocessingrecords` collection in MongoDB
   - Check if role appears in `crmroles` collection after consumer starts

### Long-term Recommendations:

1. **Add Consumer to Startup Scripts**: Ensure consumer starts automatically on server reboot
2. **Add Health Checks**: Implement health check endpoints to monitor consumer status
3. **Add Monitoring**: Set up alerts for when consumer stops processing
4. **Add Logging**: Ensure consumer logs are persisted for debugging
5. **Add Graceful Shutdown**: Consumer already has this (lines 136-152)

## Conclusion

**ROOT CAUSE**: The CRM Redis Streams Consumer is not running. The consumer must be started manually or set up as a background service (PM2) to process events from Redis streams.

**NEXT STEPS**: Start the consumer process and verify it begins processing the pending events from Redis streams.

