# Event-Driven Architecture with Redis Streams

## ✅ **YES, This is Achievable!**

Your architecture of using Redis Streams to publish events from one application and update local databases in other applications is **absolutely achievable** and is a proven pattern for microservices architectures.

## 🏗️ Architecture Overview

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│ Application │         │ Redis Streams│         │ Application │
│      A      │────────▶│              │────────▶│      B      │
│  (Publisher)│  Event  │  (Message    │  Event  │ (Consumer)  │
│             │         │   Broker)    │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                              │
                              │ Event
                              ▼
                        ┌─────────────┐
                        │ Application │
                        │      C      │
                        │ (Consumer)  │
                        └─────────────┘
```

## 📋 How It Works

### 1. **Event Publishing** (When Something Happens)

When an event occurs in any application (e.g., user created, credit allocated, employee updated):

```javascript
// Example: Publishing an event from Application A
import { crmSyncStreams } from './utils/redis.js';

// When a user is created in Application A
await crmSyncStreams.publishInterAppEvent(
  'user.created',           // eventType
  'crm',                     // sourceApplication
  'hr',                      // targetApplication
  tenantId,                  // tenantId
  userId,                    // entityId
  {                          // eventData
    userId,
    email,
    name,
    department
  },
  'system'                   // publishedBy
);
```

### 2. **Event Consumption** (Updating Local Databases)

Each application runs a consumer that:
- Reads events from Redis Streams
- Routes events to the appropriate handler
- Updates its local database
- Acknowledges successful processing

```javascript
// Consumer automatically processes events
// When event arrives, it updates HR database:
await appDatabaseAdapter.updateHrDatabase(
  tenantId,
  userId,
  'user.created',
  eventData
);
```

## 🔧 Components

### 1. **Redis Streams Manager** (`backend/src/utils/redis.js`)

Handles all Redis Stream operations:
- `publishToStream()` - Publishes events to streams
- `xGroupCreate()` - Creates consumer groups
- `xReadGroup()` - Reads messages from streams
- `xAck()` - Acknowledges processed messages

### 2. **Event Publishers** (`CrmSyncStreams` class)

Specialized methods for publishing different event types:
- `publishUserEvent()` - User lifecycle events
- `publishRoleEvent()` - Role/permission events
- `publishOrgEvent()` - Organization events
- `publishCreditEvent()` - Credit/billing events
- `publishInterAppEvent()` - Generic inter-app events

### 3. **Event Consumers** (`backend/src/services/inter-app-consumer.js`)

Consumes events and routes them to appropriate handlers:
- `InterAppEventConsumer` - Main consumer for inter-app events
- `OrganizationAssignmentConsumer` - Organization-specific events
- `AcknowledgmentConsumer` - Processes acknowledgments

### 4. **Database Adapter** (`backend/src/services/app-database-adapter.js`)

Provides unified interface for updating application databases:
- `updateCrmDatabase()` - Updates CRM database
- `updateHrDatabase()` - Updates HR database
- `updateAffiliateDatabase()` - Updates Affiliate database
- `updateSystemDatabase()` - Updates System database

## 🚀 Setup & Usage

### Step 1: Start Redis

```bash
# Using Docker
docker-compose up redis

# Or ensure Redis is running locally
redis-server
```

### Step 2: Start Consumers

Each application should run its consumer:

```bash
# Start inter-app event consumer
node backend/src/services/inter-app-consumer.js

# Start organization assignment consumer
node backend/src/services/organization-assignment-consumer.js

# Start acknowledgment consumer
node backend/src/services/acknowledgment-consumer.js
```

### Step 3: Publish Events

In your application code, publish events when something happens:

```javascript
import { crmSyncStreams } from './utils/redis.js';

// Example: When a user is created in CRM
async function createUser(userData) {
  // 1. Create user in CRM database
  const user = await db.insert(users).values(userData);
  
  // 2. Publish event to notify other applications
  await crmSyncStreams.publishInterAppEvent(
    'user.created',
    'crm',
    'hr',  // Notify HR application
    tenantId,
    user.id,
    userData
  );
  
  return user;
}
```

### Step 4: Handle Events in Consumers

The consumer automatically:
1. Reads events from Redis Streams
2. Routes to appropriate handler (`handleCrmEvent`, `handleHrEvent`, etc.)
3. Updates local database via `appDatabaseAdapter`
4. Acknowledges successful processing

## 📊 Event Flow Example

### Scenario: User Created in CRM → Update HR Database

```
1. CRM Application:
   └─ User created in CRM database
   └─ Event published: "user.created" → Redis Stream

2. Redis Streams:
   └─ Event stored in "inter-app-events" stream
   └─ Event available for all consumers

3. HR Consumer:
   └─ Reads event from stream
   └─ Routes to handleHrEvent()
   └─ Calls appDatabaseAdapter.updateHrDatabase()
   └─ Updates HR database with user info
   └─ Acknowledges event

4. Other Consumers:
   └─ Can also process the same event
   └─ Each updates its own database
```

## 🔒 Reliability Features

### 1. **Consumer Groups**
- Multiple consumers can process events in parallel
- Each consumer gets unique messages (no duplicates)
- Supports horizontal scaling

### 2. **Acknowledgment System**
- Events are only removed after acknowledgment
- Failed events remain in pending state
- Can retry failed events

### 3. **Pending Message Handling**
- Consumers check pending messages first
- Ensures no events are lost
- Handles consumer failures gracefully

### 4. **Event Tracking**
- All events tracked in `event_tracking` table
- Status: `pending`, `processed`, `failed`
- Full audit trail

## 🎯 Best Practices

### 1. **Idempotency**
Make your database updates idempotent:

```javascript
async updateHrDatabase(tenantId, entityId, eventType, eventData) {
  // Use upsert instead of insert
  await db.insert(employees)
    .values({ ...eventData, tenantId, entityId })
    .onConflictDoUpdate({ ... });
}
```

### 2. **Error Handling**
Always handle errors gracefully:

```javascript
try {
  await appDatabaseAdapter.updateCrmDatabase(...);
  await redis.client.xAck(...); // Acknowledge success
} catch (error) {
  // Log error, send to dead letter queue, etc.
  // Don't acknowledge - will retry later
}
```

### 3. **Event Schema Versioning**
Include version in event metadata:

```javascript
{
  eventType: 'user.created',
  version: '1.0',
  data: { ... },
  metadata: {
    version: '1.0',
    timestamp: '2024-01-01T00:00:00Z'
  }
}
```

### 4. **Monitoring**
Monitor your streams:

```bash
# Check stream info
node backend/redis-stream-monitor.js inter-app-events 10

# Watch streams in real-time
node backend/redis-stream-monitor.js --watch
```

## 🔍 Monitoring & Debugging

### Check Stream Status

```javascript
import { crmSyncStreams } from './utils/redis.js';

const info = await crmSyncStreams.getStreamInfo('inter-app-events');
console.log('Stream length:', info.length);
console.log('Consumer groups:', info.groups);
```

### View Recent Events

```bash
# View last 10 events
node backend/redis-stream-monitor.js inter-app-events 10

# View all streams
node backend/redis-stream-monitor.js 'crm:sync:*' 5
```

### Check Consumer Status

```javascript
const consumer = new InterAppEventConsumer();
const info = await consumer.getStreamInfo();
console.log('Pending messages:', info.pendingMessages);
```

## ⚠️ Common Issues & Solutions

### Issue 1: Events Not Being Consumed

**Solution:**
- Check if consumer is running
- Verify consumer group exists
- Check Redis connection
- Review consumer logs

### Issue 2: Duplicate Processing

**Solution:**
- Ensure idempotent database operations
- Use unique constraints in database
- Check event IDs before processing

### Issue 3: Events Stuck in Pending

**Solution:**
- Check consumer health
- Review error logs
- Manually acknowledge if needed
- Implement dead letter queue

### Issue 4: High Memory Usage

**Solution:**
- Trim old stream entries:
  ```javascript
  await crmSyncStreams.trimStream('inter-app-events', 10000);
  ```
- Set appropriate TTL on streams
- Monitor stream length

## 📈 Scaling Considerations

### Horizontal Scaling
- Run multiple consumer instances
- Each instance processes different messages
- Consumer groups handle load balancing

### Vertical Scaling
- Increase Redis memory
- Optimize consumer batch sizes
- Use connection pooling

### Performance Optimization
- Batch database updates
- Use transactions for related updates
- Implement caching where appropriate

## 🎓 Summary

**Your architecture is:**
- ✅ **Achievable** - Redis Streams is perfect for this
- ✅ **Reliable** - Consumer groups ensure delivery
- ✅ **Scalable** - Can handle high throughput
- ✅ **Fault-tolerant** - Pending messages prevent data loss
- ✅ **Production-ready** - Used by many large-scale systems

**Key Points:**
1. Events are published when something happens
2. Consumers read events and update local databases
3. Each application maintains its own database
4. Redis Streams ensures reliable delivery
5. Consumer groups enable parallel processing

## 📚 Additional Resources

- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/)
- [Consumer Groups Guide](https://redis.io/docs/data-types/streams-tutorial/#consumer-groups)
- [Event-Driven Architecture Patterns](https://martinfowler.com/articles/201701-event-driven.html)

---

**You're on the right track!** This architecture will scale well and provide reliable event-driven synchronization across your applications.
