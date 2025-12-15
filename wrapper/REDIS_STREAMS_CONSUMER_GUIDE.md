# Redis Streams Consumer Implementation Guide

This document provides comprehensive information about the Redis Streams implementation used in the Wrapper API, enabling other applications to implement consumers for real-time event synchronization.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Stream Naming Conventions](#stream-naming-conventions)
4. [Message Structure](#message-structure)
5. [Consumer Groups](#consumer-groups)
6. [Implementing Consumers](#implementing-consumers)
7. [Event Types and Schemas](#event-types-and-schemas)
8. [Error Handling and Acknowledgments](#error-handling-and-acknowledgments)
9. [Monitoring and Debugging](#monitoring-and-debugging)
10. [Examples](#examples)
11. [Best Practices](#best-practices)

---

## Overview

The Wrapper API uses **Redis Streams** to publish events for real-time synchronization across multiple applications. Redis Streams provide:

- **Reliable message delivery** with consumer groups
- **At-least-once delivery** semantics
- **Message persistence** until acknowledged
- **Scalability** with multiple consumers per group
- **Ordering** guarantees within streams

### Key Concepts

- **Stream**: A log-like data structure that stores messages
- **Consumer Group**: A group of consumers that share work
- **Consumer**: An application instance that reads messages
- **Message ID**: Unique identifier for each message (auto-generated)
- **Acknowledgment (ACK)**: Confirmation that a message was processed

---

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Wrapper API    │────────▶│  Redis Streams    │────────▶│  Your Consumer   │
│   (Publisher)   │  Events  │   (Message Bus)   │  Events  │   Application    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                      │
                                      │ Multiple Streams
                                      ▼
                            ┌──────────────────┐
                            │ Consumer Groups  │
                            │  (Load Sharing)  │
                            └──────────────────┘
```

### Stream Types

1. **CRM Sync Streams** (`crm:sync:*`) - User, role, and permission events
2. **Organization Assignment Streams** (`crm:organization-assignments`) - Organization membership events
3. **Credit Events Stream** (`credit-events`) - Credit allocation and consumption
4. **Inter-App Events Stream** (`inter-app-events`) - Generic application-to-application events
5. **Acknowledgments Stream** (`acknowledgments`) - Event processing confirmations

---

## Stream Naming Conventions

### Pattern: `{prefix}:{entityType}:{eventType}`

**CRM Sync Streams:**
- `crm:sync:user:user_created`
- `crm:sync:user:user_deactivated`
- `crm:sync:user:user_deleted`
- `crm:sync:permissions:role_updated`
- `crm:sync:organization:org_created`
- `crm:sync:credits:credit_allocated`
- `crm:sync:credits:credit_consumed`

**Other Streams:**
- `crm:organization-assignments` - Organization assignment events
- `credit-events` - Credit-related events
- `inter-app-events` - Inter-application events
- `acknowledgments` - Event acknowledgments

---

## Message Structure

### Standard Message Format

All messages in Redis Streams follow this structure:

```json
{
  "streamId": "crm:sync:user:user_created",
  "messageId": "1735987200000-0",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "sourceApp": "wrapper-api",
  "eventType": "user_created",
  "entityType": "user",
  "entityId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "tenantId": "00000000-0000-0000-0000-000000000001",
  "action": "created",
  "data": "{\"userId\":\"...\",\"email\":\"...\"}",
  "metadata": "{\"correlationId\":\"...\",\"version\":\"1.0\"}"
}
```

### Field Descriptions

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `streamId` | string | Full stream key | Yes |
| `messageId` | string | Redis-generated message ID | Yes |
| `timestamp` | string (ISO 8601) | Event timestamp | Yes |
| `sourceApp` | string | Source application identifier | Yes |
| `eventType` | string | Type of event (e.g., `user_created`) | Yes |
| `entityType` | string | Entity type (e.g., `user`, `role`) | Yes |
| `entityId` | string (UUID) | Entity identifier | Yes |
| `tenantId` | string (UUID) | Tenant identifier | Yes |
| `action` | string | Action performed | Yes |
| `data` | string (JSON) | Event-specific data as JSON string | Yes |
| `metadata` | string (JSON) | Additional metadata as JSON string | Yes |

**Important Notes:**
- `data` and `metadata` fields are **JSON strings**, not objects
- All timestamps are in ISO 8601 format
- All IDs are UUIDs (36-character strings with hyphens)

---

## Consumer Groups

### Consumer Group Setup

Consumer groups allow multiple consumers to share the workload. Each consumer group:
- Reads messages independently
- Tracks progress per consumer
- Handles message acknowledgments
- Supports multiple consumers for load balancing

### Creating a Consumer Group

```javascript
// Using Redis client
await redis.xGroupCreate(
  streamKey,           // Stream name
  consumerGroup,      // Group name (e.g., 'crm-consumers')
  '0',                // Start from beginning ('0') or latest ('$')
  { MKSTREAM: true }  // Create stream if it doesn't exist
);
```

**Common Consumer Group Names:**
- `crm-consumers` - For CRM sync events
- `organization-assignment-consumers` - For organization events
- `inter-app-consumers` - For inter-app events
- `wrapper-consumers` - For acknowledgments

### Consumer Name

Each consumer instance should have a unique name:
```javascript
const consumerName = `consumer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
```

---

## Implementing Consumers

### Basic Consumer Pattern

```javascript
class StreamConsumer {
  constructor(streamKey, consumerGroup, consumerName) {
    this.streamKey = streamKey;
    this.consumerGroup = consumerGroup;
    this.consumerName = consumerName;
    this.isRunning = false;
  }

  async connect() {
    // Connect to Redis
    await this.redis.connect();
  }

  async setupConsumerGroup() {
    try {
      await this.redis.xGroupCreate(
        this.streamKey,
        this.consumerGroup,
        '0', // Start from beginning
        { MKSTREAM: true }
      );
    } catch (error) {
      if (error.message.includes('BUSYGROUP')) {
        // Group already exists, continue
      } else {
        throw error;
      }
    }
  }

  async start() {
    await this.connect();
    await this.setupConsumerGroup();
    this.isRunning = true;

    while (this.isRunning) {
      try {
        // 1. Process pending messages first
        await this.processPendingMessages();

        // 2. Then process new messages
        await this.processNewMessages();

      } catch (error) {
        console.error('Error in consumer loop:', error);
        await this.sleep(5000); // Wait before retry
      }
    }
  }

  async processPendingMessages() {
    const pendingMessages = await this.redis.xReadGroup(
      this.streamKey,
      this.consumerGroup,
      this.consumerName,
      { COUNT: 10, BLOCK: 1000 },
      '0' // Read pending messages
    );

    if (pendingMessages && pendingMessages.length > 0) {
      for (const stream of pendingMessages) {
        for (const message of stream.messages) {
          await this.processMessage(message);
          await this.acknowledgeMessage(message.id);
        }
      }
    }
  }

  async processNewMessages() {
    const newMessages = await this.redis.xReadGroup(
      this.streamKey,
      this.consumerGroup,
      this.consumerName,
      { COUNT: 10, BLOCK: 2000 },
      '>' // Read new messages
    );

    if (newMessages && newMessages.length > 0) {
      for (const stream of newMessages) {
        for (const message of stream.messages) {
          await this.processMessage(message);
          await this.acknowledgeMessage(message.id);
        }
      }
    }
  }

  async processMessage(message) {
    // Parse message data
    const eventData = message.message;
    const data = JSON.parse(eventData.data || '{}');
    const metadata = JSON.parse(eventData.metadata || '{}');

    // Handle based on event type
    switch (eventData.eventType) {
      case 'user_created':
        await this.handleUserCreated(data, metadata);
        break;
      // ... other event types
    }
  }

  async acknowledgeMessage(messageId) {
    await this.redis.xAck(
      this.streamKey,
      this.consumerGroup,
      messageId
    );
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async stop() {
    this.isRunning = false;
    await this.redis.disconnect();
  }
}
```

### Reading Messages

**XREADGROUP Command:**
```javascript
// Read new messages
const messages = await redis.xReadGroup(
  streamKey,
  consumerGroup,
  consumerName,
  {
    COUNT: 10,      // Maximum messages to read
    BLOCK: 2000     // Block for 2 seconds if no messages
  },
  '>'               // '>' = new messages, '0' = pending messages
);
```

**Response Format:**
```javascript
[
  {
    name: 'crm:sync:user:user_created',
    messages: [
      {
        id: '1735987200000-0',
        message: {
          streamId: 'crm:sync:user:user_created',
          eventType: 'user_created',
          data: '{"userId":"..."}',
          // ... other fields
        }
      }
    ]
  }
]
```

### Acknowledging Messages

**XACK Command:**
```javascript
await redis.xAck(
  streamKey,
  consumerGroup,
  messageId
);
```

**Important:** Always acknowledge messages after successful processing to prevent reprocessing.

---

## Event Types and Schemas

### User Events

#### 1. User Created (`user_created`)

**Stream:** `crm:sync:user:user_created`

**Data Schema:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "name": "John Doe",
  "isActive": true,
  "createdAt": "2025-12-04T10:00:00.000Z"
}
```

**Required Fields:**
- `userId` (UUID)
- `email` (string)
- `createdAt` (ISO 8601 timestamp)

**Optional Fields:**
- `firstName`, `lastName`, `name`
- `isActive` (boolean, default: true)

#### 2. User Deactivated (`user_deactivated`)

**Stream:** `crm:sync:user:user_deactivated`

**Data Schema:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "deactivatedAt": "2025-12-04T10:00:00.000Z",
  "deactivatedBy": "admin-user-id",
  "reason": "manual_deactivation"
}
```

**Reason Values:**
- `"manual_deactivation"` - User deactivated via UI
- `"user_deactivated"` - System-initiated deactivation

#### 3. User Deleted (`user_deleted`)

**Stream:** `crm:sync:user:user_deleted`

**Data Schema:**
```json
{
  "userId": "c8e9f140-be15-4656-9046-bfee3eae7a38",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "deletedAt": "2025-12-04T10:00:00.000Z",
  "deletedBy": "admin-user-id",
  "reason": "user_deleted_permanently"
}
```

**Reason Values:**
- `"user_deleted_permanently"` - User deleted via admin endpoint
- `"user_removed_from_tenant"` - User removed via tenant service

### Role Events

#### 4. Role Updated (`role_updated`)

**Stream:** `crm:sync:permissions:role_updated`

**Data Schema:**
```json
{
  "roleId": "135ab564-542b-412a-8fa1-9a7d02ec92cf",
  "roleName": "Updated Role Name",
  "description": "Role description",
  "permissions": {
    "crm": {
      "leads": ["read", "create", "update"],
      "accounts": ["read", "read_all"]
    }
  },
  "restrictions": {},
  "updatedBy": "admin-user-id",
  "updatedAt": "2025-12-04T10:00:00.000Z"
}
```

**Permissions Structure:**
```json
{
  "{application}": {
    "{module}": ["permission1", "permission2"]
  }
}
```

### Organization Assignment Events

#### 5. Assignment Created (`organization.assignment.created`)

**Stream:** `crm:organization-assignments`

**Data Schema:**
```json
{
  "eventId": "uuid",
  "eventType": "organization.assignment.created",
  "source": "wrapper-app",
  "version": "1.1",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "tenantId": "tenant-uuid",
  "data": {
    "assignmentId": "assignment-id",
    "userId": "user-uuid",
    "organizationId": "org-uuid",
    "organizationCode": "ORG001",
    "assignmentType": "direct",
    "accessLevel": "standard",
    "isActive": true,
    "isPrimary": false,
    "assignedAt": "2025-12-04T10:00:00.000Z",
    "priority": 1,
    "assignedBy": "admin-uuid",
    "metadata": {}
  }
}
```

**Other Assignment Event Types:**
- `organization.assignment.updated`
- `organization.assignment.deactivated`
- `organization.assignment.activated`
- `organization.assignment.deleted`

### Credit Events

#### 6. Credit Allocated (`credit.allocated`)

**Stream:** `credit-events`

**Data Schema:**
```json
{
  "eventId": "evt_1735987200000_abc123",
  "eventType": "credit.allocated",
  "tenantId": "tenant-uuid",
  "entityId": "entity-uuid",
  "amount": 1000,
  "timestamp": "2025-12-04T10:00:00.000Z",
  "source": "wrapper",
  "metadata": "{\"allocationId\":\"...\",\"reason\":\"credit_allocation\"}"
}
```

#### 7. Credit Consumed (`credit.consumed`)

**Stream:** `credit-events`

**Data Schema:**
```json
{
  "eventId": "evt_1735987200000_abc123",
  "eventType": "credit.consumed",
  "tenantId": "tenant-uuid",
  "entityId": "entity-uuid",
  "userId": "user-uuid",
  "amount": 50,
  "operationType": "api_call",
  "operationId": "operation-uuid",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "source": "crm",
  "metadata": "{\"resourceType\":\"...\",\"resourceId\":\"...\"}"
}
```

### Inter-App Events

#### 8. Inter-Application Event

**Stream:** `inter-app-events`

**Data Schema:**
```json
{
  "eventId": "inter_1735987200000_abc123",
  "eventType": "user.created",
  "sourceApplication": "wrapper",
  "targetApplication": "crm",
  "tenantId": "tenant-uuid",
  "entityId": "entity-uuid",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "eventData": "{\"userId\":\"...\",\"email\":\"...\"}",
  "publishedBy": "system"
}
```

**Common Event Types:**
- `user.created`, `user.updated`, `user.deleted`
- `employee.updated`, `benefits.updated`
- `partner.created`, `partner.registered`
- `commission.updated`, `referral.completed`
- `config.updated`, `maintenance.scheduled`, `security.alert`

### Acknowledgments

#### 9. Event Acknowledgment

**Stream:** `acknowledgments`

**Data Schema:**
```json
{
  "acknowledgmentId": "ack_1735987200000_abc123",
  "originalEventId": "evt_1735987200000_xyz789",
  "status": "processed",
  "timestamp": "2025-12-04T10:00:00.000Z",
  "source": "crm",
  "acknowledgmentData": "{\"processedBy\":\"crm\",\"eventType\":\"user_created\"}"
}
```

**Status Values:**
- `"processed"` - Event successfully processed
- `"failed"` - Event processing failed
- `"timeout"` - Acknowledgment timeout

---

## Error Handling and Acknowledgments

### Processing Strategy

1. **Read pending messages first** - Handle messages that failed previously
2. **Process new messages** - Handle incoming messages
3. **Acknowledge after success** - Only ACK after successful processing
4. **Handle errors gracefully** - Log errors, don't crash the consumer

### Error Handling Pattern

```javascript
async processMessage(message) {
  try {
    const eventData = message.message;
    const data = JSON.parse(eventData.data || '{}');

    // Process the event
    await this.handleEvent(eventData.eventType, data);

    // Acknowledge only after successful processing
    await this.acknowledgeMessage(message.id);

  } catch (error) {
    console.error(`Failed to process message ${message.id}:`, error);

    // Option 1: Retry later (don't ACK, message will be pending)
    // Option 2: Send to dead letter queue
    // Option 3: ACK and log error (if error is non-recoverable)
    
    // For non-recoverable errors, still ACK to prevent infinite retries
    if (this.isNonRecoverableError(error)) {
      await this.acknowledgeMessage(message.id);
      await this.logError(message, error);
    }
  }
}
```

### Publishing Acknowledgments

If your consumer needs to send acknowledgments back:

```javascript
async publishAcknowledgment(originalEventId, status, acknowledgmentData) {
  const message = {
    acknowledgmentId: `ack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    originalEventId,
    status, // 'processed', 'failed', 'timeout'
    timestamp: new Date().toISOString(),
    source: 'your-app-name',
    acknowledgmentData: JSON.stringify(acknowledgmentData)
  };

  await redis.xAdd('acknowledgments', '*', message);
}
```

---

## Monitoring and Debugging

### Stream Information

**Get Stream Info:**
```javascript
const info = await redis.xInfoStream(streamKey);
// Returns: length, first-entry, last-entry, etc.
```

**Get Consumer Groups:**
```javascript
const groups = await redis.xInfoGroups(streamKey);
// Returns: consumer groups and their status
```

**Get Pending Messages:**
```javascript
const pending = await redis.xPending(streamKey, consumerGroup);
// Returns: pending messages count and details
```

### Monitoring Commands

**Using Redis CLI:**
```bash
# View stream length
XINFO STREAM crm:sync:user:user_created

# View consumer groups
XINFO GROUPS crm:sync:user:user_created

# View pending messages
XPENDING crm:sync:user:user_created crm-consumers

# Read messages (for debugging)
XREAD STREAMS crm:sync:user:user_created 0
```

### Health Checks

```javascript
async healthCheck() {
  try {
    // Check Redis connection
    await redis.ping();

    // Check stream exists
    const info = await redis.xInfoStream(this.streamKey);
    
    // Check pending messages
    const pending = await redis.xPending(
      this.streamKey,
      this.consumerGroup
    );

    return {
      healthy: true,
      streamLength: info.length,
      pendingMessages: pending.length,
      consumerGroup: this.consumerGroup
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}
```

---

## Examples

### Example 1: Node.js Consumer (using `redis` package)

```javascript
import Redis from 'redis';

const redis = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

await redis.connect();

const streamKey = 'crm:sync:user:user_created';
const consumerGroup = 'crm-consumers';
const consumerName = `consumer-${Date.now()}`;

// Setup consumer group
try {
  await redis.xGroupCreate(streamKey, consumerGroup, '0', { MKSTREAM: true });
} catch (error) {
  if (!error.message.includes('BUSYGROUP')) throw error;
}

// Consume messages
while (true) {
  const messages = await redis.xReadGroup(
    streamKey,
    consumerGroup,
    consumerName,
    { COUNT: 10, BLOCK: 2000 },
    '>'
  );

  if (messages && messages.length > 0) {
    for (const stream of messages) {
      for (const message of stream.messages) {
        const eventData = message.message;
        const data = JSON.parse(eventData.data || '{}');

        console.log('Processing:', eventData.eventType, data);

        // Process the event
        await processUserCreated(data);

        // Acknowledge
        await redis.xAck(streamKey, consumerGroup, message.id);
      }
    }
  }
}
```

### Example 2: Python Consumer (using `redis-py`)

```python
import redis
import json
import time

r = redis.Redis.from_url('redis://localhost:6379')

stream_key = 'crm:sync:user:user_created'
consumer_group = 'crm-consumers'
consumer_name = f'consumer-{int(time.time())}'

# Setup consumer group
try:
    r.xgroup_create(stream_key, consumer_group, id='0', mkstream=True)
except redis.exceptions.ResponseError as e:
    if 'BUSYGROUP' not in str(e):
        raise

# Consume messages
while True:
    messages = r.xreadgroup(
        consumer_group,
        consumer_name,
        {stream_key: '>'},
        count=10,
        block=2000
    )

    if messages:
        for stream, message_list in messages:
            for message_id, message_data in message_list:
                event_data = {k.decode(): v.decode() for k, v in message_data.items()}
                data = json.loads(event_data.get('data', '{}'))

                print(f'Processing: {event_data.get("eventType")}')

                # Process the event
                process_user_created(data)

                # Acknowledge
                r.xack(stream_key, consumer_group, message_id)
```

### Example 3: Java Consumer (using `Jedis`)

```java
import redis.clients.jedis.Jedis;
import redis.clients.jedis.StreamEntryID;
import redis.clients.jedis.params.XReadGroupParams;

Jedis jedis = new Jedis("localhost", 6379);

String streamKey = "crm:sync:user:user_created";
String consumerGroup = "crm-consumers";
String consumerName = "consumer-" + System.currentTimeMillis();

// Setup consumer group
try {
    jedis.xgroupCreate(streamKey, consumerGroup, StreamEntryID.LAST_ENTRY, true);
} catch (Exception e) {
    if (!e.getMessage().contains("BUSYGROUP")) {
        throw e;
    }
}

// Consume messages
while (true) {
    Map<String, StreamEntryID> streams = new HashMap<>();
    streams.put(streamKey, StreamEntryID.UNRECEIVED_ENTRY);

    List<Entry<String, List<StreamEntry>>> messages = jedis.xreadGroup(
        consumerGroup,
        consumerName,
        XReadGroupParams.xReadGroupParams().count(10).block(2000),
        streams
    );

    if (messages != null && !messages.isEmpty()) {
        for (Entry<String, List<StreamEntry>> entry : messages) {
            for (StreamEntry streamEntry : entry.getValue()) {
                Map<String, String> eventData = streamEntry.getFields();
                String dataJson = eventData.get("data");
                
                // Process the event
                processUserCreated(dataJson);

                // Acknowledge
                jedis.xack(streamKey, consumerGroup, streamEntry.getID());
            }
        }
    }
}
```

### Example 4: Go Consumer (using `go-redis`)

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "time"

    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    streamKey := "crm:sync:user:user_created"
    consumerGroup := "crm-consumers"
    consumerName := fmt.Sprintf("consumer-%d", time.Now().Unix())

    ctx := context.Background()

    // Setup consumer group
    err := rdb.XGroupCreateMkStream(ctx, streamKey, consumerGroup, "0").Err()
    if err != nil && err.Error() != "BUSYGROUP Consumer Group name already exists" {
        panic(err)
    }

    // Consume messages
    for {
        streams, err := rdb.XReadGroup(ctx, &redis.XReadGroupArgs{
            Group:    consumerGroup,
            Consumer: consumerName,
            Streams:  []string{streamKey, ">"},
            Count:    10,
            Block:    2 * time.Second,
        }).Result()

        if err != nil {
            time.Sleep(5 * time.Second)
            continue
        }

        for _, stream := range streams {
            for _, message := range stream.Messages {
                eventData := message.Values
                dataJson := eventData["data"].(string)

                var data map[string]interface{}
                json.Unmarshal([]byte(dataJson), &data)

                // Process the event
                processUserCreated(data)

                // Acknowledge
                rdb.XAck(ctx, streamKey, consumerGroup, message.ID)
            }
        }
    }
}
```

---

## Best Practices

### 1. Consumer Design

- **Always process pending messages first** - Handle failed messages before new ones
- **Use unique consumer names** - Include timestamp or UUID
- **Handle errors gracefully** - Don't crash on individual message failures
- **Implement graceful shutdown** - Handle SIGINT/SIGTERM signals

### 2. Message Processing

- **Parse JSON safely** - Handle malformed JSON gracefully
- **Validate required fields** - Check for required data before processing
- **Idempotent operations** - Make operations safe to retry
- **Acknowledge after success** - Only ACK after successful processing

### 3. Performance

- **Batch processing** - Process multiple messages when possible
- **Tune COUNT parameter** - Balance between latency and throughput
- **Monitor pending messages** - Alert if pending count grows
- **Use appropriate BLOCK time** - Balance between responsiveness and CPU usage

### 4. Reliability

- **Retry logic** - Implement exponential backoff for transient errors
- **Dead letter queue** - Store messages that fail repeatedly
- **Monitoring** - Track processing rates, errors, and latency
- **Health checks** - Monitor consumer health and Redis connectivity

### 5. Security

- **Secure Redis connection** - Use TLS/SSL in production
- **Authentication** - Use Redis AUTH or ACLs
- **Tenant isolation** - Filter messages by tenantId
- **Input validation** - Validate all incoming data

### 6. Scalability

- **Multiple consumers** - Run multiple consumer instances per group
- **Consumer groups** - Use separate groups for different applications
- **Stream partitioning** - Consider multiple streams for high volume
- **Load balancing** - Distribute consumers across instances

---

## Troubleshooting

### Common Issues

**1. Messages not being consumed**
- Check consumer group exists
- Verify consumer name is unique
- Check Redis connection
- Verify stream has messages: `XINFO STREAM <stream-key>`

**2. Pending messages accumulating**
- Check for processing errors
- Verify ACK is being called
- Check consumer is running
- Review error logs

**3. Duplicate processing**
- Ensure ACK is called after processing
- Check for multiple consumers with same name
- Verify idempotency in processing logic

**4. Connection issues**
- Check Redis server status
- Verify network connectivity
- Check Redis URL configuration
- Review connection pool settings

### Debug Commands

```bash
# Check stream length
redis-cli XLEN crm:sync:user:user_created

# View recent messages
redis-cli XREAD STREAMS crm:sync:user:user_created 0 COUNT 10

# Check consumer groups
redis-cli XINFO GROUPS crm:sync:user:user_created

# Check pending messages
redis-cli XPENDING crm:sync:user:user_created crm-consumers

# View consumer details
redis-cli XINFO CONSUMERS crm:sync:user:user_created crm-consumers
```

---

## Additional Resources

- [Redis Streams Documentation](https://redis.io/docs/data-types/streams/)
- [Consumer Groups Guide](https://redis.io/docs/data-types/streams-tutorial/#consumer-groups)
- [XREADGROUP Command](https://redis.io/commands/xreadgroup/)
- [XACK Command](https://redis.io/commands/xack/)

---

## Support

For questions or issues related to Redis Streams implementation:
- Check existing consumer implementations in `/backend/src/services/`
- Review event publishing code in `/backend/src/utils/redis.js`
- Monitor streams using `/backend/redis-stream-monitor.js`

---

**Last Updated:** December 2025  
**Version:** 1.0
