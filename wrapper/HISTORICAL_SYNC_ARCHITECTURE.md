# Historical Sync Architecture

## 📋 Overview

This document describes the **hybrid synchronization architecture** that solves the problem of syncing historical data when tenants opt into applications after initial setup. The solution combines **Redis Streams** for real-time events with **Historical Backfill** for complete state synchronization.

## 🎯 Problem Statement

When tenants opt into applications (CRM, HR, Affiliate, etc.) at different times:
- **Redis Streams** only send events going forward (real-time)
- Historical data (credit allocations, org changes, assignments) that occurred before opt-in is **not synced**
- Applications miss critical historical state when they're enabled later

## ✅ Solution: Hybrid Approach

### Architecture Components

```
┌─────────────────────────────────────────────────────────────┐
│                    WRAPPER APPLICATION                       │
│                                                              │
│  ┌──────────────────┐         ┌──────────────────────┐    │
│  │  Credit Service  │────────▶│  Redis Streams       │    │
│  │  Org Service     │         │  (Real-time Events)   │    │
│  │  Assignment Svc  │         └──────────────────────┘    │
│  └──────────────────┘                    │                 │
│           │                                │                 │
│           │                                ▼                 │
│           │                    ┌──────────────────────┐    │
│           │                    │  Application DBs     │    │
│           │                    │  (CRM, HR, etc.)     │    │
│           │                    └──────────────────────┘    │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────────┐                                  │
│  │ Historical Sync Svc  │                                  │
│  │ (Backfill on Enable) │                                  │
│  └──────────────────────┘                                  │
│           │                                                 │
│           │ (Queries Wrapper DB)                           │
│           ▼                                                 │
│  ┌──────────────────────┐                                  │
│  │  Wrapper Database    │                                  │
│  │  (Source of Truth)   │                                  │
│  └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘
```

### 1. **Redis Streams (Real-time Sync)**
- **Purpose**: Ongoing synchronization of events as they happen
- **When**: Continuously, for all enabled applications
- **What**: Credit allocations, org changes, assignments, etc.
- **Advantages**: 
  - Low latency
  - Event-driven architecture
  - Automatic delivery to consumers
  - Reliable with consumer groups

### 2. **Historical Backfill (Initial State Sync)**
- **Purpose**: Sync historical data when application is enabled
- **When**: Once, when application is enabled for the first time
- **What**: All historical credit allocations, organizations, assignments
- **Advantages**:
  - Complete state synchronization
  - No data loss
  - Can be retried if needed

## 🔄 How It Works

### Automatic Sync on Application Enablement

When a tenant enables an application:

1. **Application Enablement** (`POST /admin/organizations/:orgId/applications/:appId/toggle`)
   - Application record is created/updated in `organization_applications`
   - If enabling for the first time (or re-enabling), historical sync is triggered

2. **Historical Sync Trigger** (automatic, non-blocking)
   - Queries Wrapper database for:
     - All active credit allocations for the application
     - All organizations (entities) for the tenant
     - All active organization memberships
   - Publishes each historical record to Redis streams
   - Events are marked with `isHistoricalSync: true` flag

3. **Application Consumer Processing**
   - Application consumers (CRM, HR, etc.) receive events
   - They process both real-time and historical events
   - Historical events are identified by the `isHistoricalSync` flag

### Manual Sync

If automatic sync fails or needs to be retried:

```bash
POST /admin/organizations/:orgId/applications/:appCode/sync-historical
{
  "syncCredits": true,
  "syncOrganizations": true,
  "syncAssignments": true,
  "dryRun": false,
  "sinceDate": "2024-01-01T00:00:00Z"  // Optional: only sync data after this date
}
```

### Check Sync Status

```bash
GET /admin/organizations/:orgId/applications/:appCode/sync-status
```

Returns:
- Active credit allocations count
- Total organizations count
- Total memberships count
- Whether sync is needed

## 📊 Data Synced

### 1. Credit Allocations
- All active credit allocations for the target application
- Includes: allocation ID, amount, available credits, expiry dates
- Published as `credit.allocated` events

### 2. Organizations (Entities)
- All organizations (entities with `entityType = 'organization'`)
- Includes: org ID, code, name, description, industry, website
- Published as `org.created` events

### 3. Organization Memberships (Assignments)
- All active organization memberships
- Includes: membership ID, user ID, organization ID, role ID
- Published as `org.assignment.created` events

## 🎨 Event Format

Historical events include a special flag to distinguish them from real-time events:

```json
{
  "eventType": "credit.allocated",
  "tenantId": "tenant-uuid",
  "entityId": "entity-uuid",
  "amount": 1000,
  "metadata": {
    "allocationId": "allocation-uuid",
    "targetApplication": "crm",
    "isHistoricalSync": true,
    "originalAllocatedAt": "2024-01-15T10:30:00Z"
  }
}
```

## 🔧 Implementation Details

### Service: `HistoricalSyncService`

Location: `backend/src/services/historical-sync-service.js`

**Key Methods:**
- `syncHistoricalDataForApplication(tenantId, appCode, options)` - Main sync method
- `syncHistoricalCreditAllocations(tenantId, appCode, options)` - Sync credits
- `syncHistoricalOrganizations(tenantId, appCode, options)` - Sync orgs
- `syncHistoricalAssignments(tenantId, appCode, options)` - Sync memberships
- `getSyncStatus(tenantId, appCode)` - Get sync status

### Integration Points

1. **Application Enablement** (`backend/src/routes/suite.js`)
   - Automatically triggers historical sync when app is enabled
   - Non-blocking (runs in background)
   - Doesn't fail enablement if sync fails

2. **Manual Sync Endpoint** (`backend/src/routes/suite.js`)
   - Allows manual trigger for retries
   - Supports dry-run mode
   - Supports date filtering

## ⚙️ Configuration Options

### Sync Options

```javascript
{
  syncCredits: true,        // Sync credit allocations
  syncOrganizations: true,  // Sync organizations
  syncAssignments: true,    // Sync memberships
  dryRun: false,            // Preview without publishing
  sinceDate: null           // Only sync data after this date
}
```

### Skip Automatic Sync

When enabling an application, you can skip automatic sync:

```json
POST /admin/organizations/:orgId/applications/:appId/toggle
{
  "isEnabled": true,
  "skipHistoricalSync": true
}
```

## 🚀 Best Practices

1. **Automatic Sync**: Let the system handle it automatically on enablement
2. **Manual Retry**: Use manual sync endpoint if automatic sync fails
3. **Dry Run**: Test sync with `dryRun: true` before actual sync
4. **Date Filtering**: Use `sinceDate` to sync only recent data if needed
5. **Monitoring**: Check sync status regularly to ensure completeness

## 🔍 Monitoring & Debugging

### Check Sync Status

```bash
GET /admin/organizations/:orgId/applications/:appCode/sync-status
```

### View Historical Events in Redis

```bash
# Connect to Redis
redis-cli

# View credit events
XREAD STREAMS credit-events 0

# View organization events
XREAD STREAMS crm:sync:organization:org_created 0
```

### Logs

Historical sync operations are logged with:
- `🔄 Starting historical sync for...`
- `✅ Historical sync completed...`
- `❌ Historical sync failed...`

## 📈 Performance Considerations

1. **Non-blocking**: Automatic sync runs in background, doesn't block enablement
2. **Batch Processing**: Events are published one by one (can be optimized for batching)
3. **Selective Sync**: Use `sinceDate` to limit sync scope
4. **Dry Run**: Test before actual sync to estimate scope

## 🔐 Security

- Historical sync requires application to be enabled
- Only syncs data for the specified tenant
- Events are published to same Redis streams as real-time events
- Consumers can identify historical events via `isHistoricalSync` flag

## 🎯 Why This Approach is Optimal

### ✅ Advantages

1. **Complete State**: Applications get full historical context
2. **Real-time + Historical**: Best of both worlds
3. **Non-intrusive**: Doesn't block application enablement
4. **Retryable**: Can be manually triggered if needed
5. **Flexible**: Supports date filtering and selective sync
6. **Consistent**: Uses same Redis streams as real-time events

### ⚠️ Alternatives Considered

1. **Store all events in DB and replay**: Too much storage overhead
2. **Always publish to all apps**: Wasteful, apps filter anyway
3. **Only use historical sync**: No real-time updates
4. **Only use Redis streams**: Missing historical data

### 🏆 Winner: Hybrid Approach

The hybrid approach (Redis Streams + Historical Backfill) provides:
- ✅ Real-time sync for ongoing operations
- ✅ Complete historical state on enablement
- ✅ Optimal resource usage
- ✅ Flexible and retryable

## 📝 Example Flow

1. **Tenant Setup** (Day 1)
   - Tenant creates organization
   - Allocates 1000 credits to system
   - Creates 5 organizations
   - Assigns 10 users to organizations
   - **CRM is NOT enabled yet**

2. **CRM Opt-in** (Day 30)
   - Tenant enables CRM application
   - Historical sync automatically triggers
   - Syncs:
     - 1 credit allocation (if any allocated to CRM)
     - 5 organizations
     - 10 organization memberships
   - All published to Redis streams with `isHistoricalSync: true`

3. **Ongoing Operations** (Day 31+)
   - New credit allocations → Real-time via Redis streams
   - New organizations → Real-time via Redis streams
   - New assignments → Real-time via Redis streams
   - CRM has complete state from Day 1 onwards

## 🔗 Related Documentation

- `ORGANIZATION_ASSIGNMENT_REDIS_INTEGRATION.md` - Organization assignment events
- `BUSINESS_SUITE_ARCHITECTURE_README.md` - Overall architecture
- `WRAPPER_API_README.md` - API documentation

## 🐛 Troubleshooting

### Sync Not Triggering
- Check if application is actually being enabled (not just updated)
- Verify `skipHistoricalSync` is not set to `true`
- Check logs for sync initiation messages

### Sync Failing
- Check Redis connection
- Verify database queries are working
- Check application consumer is running
- Use manual sync endpoint to retry

### Missing Data
- Run manual sync with appropriate date range
- Check sync status to see what's missing
- Verify application consumer is processing events

---

**Last Updated**: 2024-01-XX  
**Maintained By**: Wrapper Backend Team






