# Fix Organization Assignment Sync Issue

## Problem Analysis

An organization assignment was created in the wrapper (Supabase) but is not appearing in CRM (MongoDB), even though:
- ✅ Event was published to Redis stream `crm:organization-assignments`
- ✅ Membership exists in Supabase with ID `1e065e08-0001-4f42-8c99-9e71ccbdf806`
- ✅ Organization exists in MongoDB with orgCode `2c45bd81-6266-4c2a-9095-af64b97b987c`
- ❌ Assignment is missing in MongoDB

## Root Cause

The Redis Streams consumer is likely not running, so events in the stream are not being processed.

## Solution

### 1. Verify Consumer Status
- Check if `crm-consumer-runner.js` is running
- Check consumer group status in Redis
- Check for pending messages in the consumer group

### 2. Manually Process the Pending Event
- Create a script to manually process the unprocessed event from Redis
- Insert the missing assignment into MongoDB

### 3. Ensure Consumer is Running
- Verify consumer startup process
- Add health check endpoint for consumer status
- Ensure consumer auto-restarts on failure

### 4. Improve Error Handling
- Add better logging when organization/user lookups fail
- Add retry mechanism for failed events
- Add dead letter queue for permanently failed events

## Implementation Steps

1. **Check Consumer Status**
   - Verify if consumer process is running
   - Check Redis consumer group status
   - List pending messages

2. **Manually Process Event**
   - Extract event data from Redis stream
   - Process it through the handler
   - Insert assignment into MongoDB if processing succeeds

3. **Fix Consumer Startup**
   - Ensure consumer is started with the application
   - Add process manager (PM2) configuration if needed
   - Add monitoring/alerting for consumer health

4. **Add Health Checks**
   - Create endpoint to check consumer status
   - Add metrics for processed/failed events
   - Add alerting for consumer downtime

## Files to Modify

- `crm/server/crm-consumer-runner.js` - Ensure proper startup
- `crm/server/services/redisStreamsConsumer.js` - Improve error handling
- `crm/server/routes/api/sync.js` - Add consumer health check endpoint
- Create: `crm/server/scripts/process-pending-assignment-events.js` - Manual processing script

## Testing

1. Verify consumer is running
2. Manually process the pending event
3. Verify assignment appears in MongoDB
4. Test creating a new assignment to ensure real-time sync works

