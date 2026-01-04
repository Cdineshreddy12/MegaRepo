# Redis Data Validation Script

## Overview

This script (`fetch-and-validate-redis-data.mjs`) fetches data from Redis streams and validates it against the CRM database to ensure data consistency.

## Features

- **Fetches Redis Stream Data**: Connects to Redis and reads messages from all configured streams
- **Validates Against CRM**: Checks if Redis data matches what's stored in the CRM MongoDB database
- **Shows Consumption Status**: Displays which streams have messages, consumer groups, and pending messages
- **Validates Event Types**: 
  - Credit allocation events
  - User events (created, deactivated, deleted)
  - Organization events
  - Role assignment events

## Prerequisites

1. Redis server running and accessible
2. MongoDB connection (optional, for validation)
3. Environment variables set:
   - `REDIS_URL` - Redis connection string
   - `MONGODB_URI` or `MONGO_URI` - MongoDB connection string (optional)
   - `CRM_TENANT_ID` or `TENANT_ID` - Tenant ID for validation (optional)

## Usage

```bash
# Make sure you're in the crm/server directory
cd crm/server

# Run the script
node fetch-and-validate-redis-data.mjs
```

Or make it executable and run directly:

```bash
chmod +x fetch-and-validate-redis-data.mjs
./fetch-and-validate-redis-data.mjs
```

## What It Does

1. **Connects to Redis**: Establishes connection using `REDIS_URL`
2. **Connects to MongoDB**: Establishes connection for validation (if `MONGODB_URI` is provided)
3. **Scans Streams**: Checks all configured Redis streams:
   - `credit-events` (and tenant-specific `credit-events:{tenantId}`)
   - `crm:sync:user:*` (user events)
   - `crm:sync:permissions:*` (role assignment events)
   - `crm:sync:role:*` (role CRUD events)
   - `crm:sync:organization:*` (organization events)
   - `crm:sync:credits:*` (credit events)
   - `crm:organization-assignments` (organization assignments)

4. **Reads Messages**: Reads recent messages from each stream
5. **Validates Data**: For each message:
   - Parses the Redis message format
   - Validates required fields
   - Checks if corresponding records exist in CRM database
   - Compares values (e.g., credit amounts)
   - Reports validation errors and warnings

6. **Shows Consumption Status**: 
   - Total messages in each stream
   - Consumer groups and their status
   - Pending messages count
   - Active consumers

## Output

The script provides detailed output including:

- Stream information (message count, consumer groups)
- Message details (ID, event type, data)
- Validation results (✅ passed, ⚠️ warnings, ❌ errors)
- CRM data comparison
- Consumption status summary

## Example Output

```
📡 Stream: credit-events:b0a6e370-c1e5-43d1-94e0-55ed792274c4
   Messages: 150
   Consumer Groups: 1

   📨 Message ID: 1704067200000-0
      Event Type: credit.allocated
      Tenant ID: b0a6e370-c1e5-43d1-94e0-55ed792274c4
      Data: {"id":"...","eventType":"credit.allocated","amount":1000}
      ✅ Validation: PASSED
      📋 CRM Data: {"allocatedCredits":1000,"availableCredits":850}
```

## Notes

- **MCP**: This script uses direct Redis connections (not MCP). The codebase uses direct Redis client connections, which is the standard approach here.
- **No Data Modification**: This script only reads and validates data - it does not modify Redis or MongoDB data
- **Performance**: Reading from streams uses `xRange` which may be slow for very large streams. Consider using `xRead` or consumer groups for production monitoring
- **Tenant-Specific**: The script can validate data for a specific tenant if `CRM_TENANT_ID` is provided

## Troubleshooting

### Redis Connection Error
- Check that `REDIS_URL` is set correctly
- Verify Redis server is running
- Check network connectivity

### MongoDB Connection Error
- Check that `MONGODB_URI` is set correctly
- Verify MongoDB server is running
- Validation will be skipped if MongoDB is unavailable

### No Streams Found
- Check that Redis has data in the expected streams
- Verify stream names match the configuration
- Check if consumer groups have been created

## Integration with Consumer

This script complements the `redisStreamsConsumer.js` by:
- Providing visibility into what's in Redis
- Validating data consistency
- Debugging synchronization issues
- Monitoring stream health



