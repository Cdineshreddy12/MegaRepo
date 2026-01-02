# Redis Data vs CRM Database Validation

## Summary

This document compares the data published to Redis streams with what's actually consumed and stored in the CRM MongoDB database.

## Published Data (Redis Streams)

### Role Creation Event (NOT Found in Database)

**Redis Stream**: `crm:sync:role:role_created`  
**Message ID**: `1767290905749-0`  
**Timestamp**: `2026-01-01T18:08:25.747Z`

**Event Details**:
- **Event Type**: `role.created`
- **Tenant ID**: `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
- **Entity ID (Role ID)**: `e2064fd3-533d-4b51-a25e-95500ef01eab`
- **Role Name**: "all apps"
- **Created By**: `4f015f05-d42d-446c-a6e6-4d4322e3afdd`
- **Created At**: `2026-01-01T18:08:25.000Z`

**Permissions Structure** (from Redis):
```json
{
  "crm": {
    "form_builder": ["read", "read_all", "create", "update", "delete", "export", "import", "publish", "duplicate", "view_analytics", "manage_layout"],
    "leads": ["read", "read_all", "create", "update", "delete", "export", "import", "assign", "convert"],
    "analytics": ["read", "read_all", "create", "update", "delete", "export", "calculate", "generate_formula", "validate_formula", "suggest_metrics", "generate_insights", "manage_dashboards", "view_dashboards"]
  }
}
```

### Role Deletion Event (NOT Found in Database)

**Redis Stream**: `affiliateConnect:sync:role:role_deleted`  
**Message ID**: `1767289704734-0`  
**Timestamp**: `2026-01-01T17:48:24.732Z`

**Event Details**:
- **Event Type**: `role.deleted`
- **Tenant ID**: `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
- **Entity ID (Role ID)**: `711f157d-078f-4cea-971d-a55acd921f40`
- **Role Name**: "Affiliate "
- **Deleted By**: `554f15c5-adfb-44e7-99f6-a0529088b026`
- **Deleted At**: `2026-01-01T17:48:24.732Z`
- **Affected Users Count**: 2

## Consumed Data (CRM Database)

### Database: `zopkit_crm`
### Collection: `crmroles`

### Total Roles for Tenant: 1

**Role Found in Database**:
- **Role ID**: `bf54eab6-4743-4537-8f2b-777c1fdd8f2b` (DIFFERENT from Redis)
- **Role Name**: "Organization Admin"
- **Tenant ID**: `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`
- **Created At**: `2025-12-21T20:02:54.110Z` (OLDER than Redis event)
- **Updated At**: `2025-12-21T20:02:54.110Z`
- **Is Active**: `true`
- **Description**: ""
- **Permissions**: Array format (not structured)
  - `crm.leads.read`, `crm.leads.create`, `crm.leads.update`, `crm.leads.delete`
  - `crm.contacts.read`, `crm.contacts.create`, `crm.contacts.update`, `crm.contacts.delete`
  - `crm.dashboard.read`
- **Permissions Structure**: Empty object `{}`
- **Restrictions**: Empty object `{}`

## Key Findings

### ❌ MISSING DATA - Role Not Consumed

The role published to Redis (`e2064fd3-533d-4b51-a25e-95500ef01eab` - "all apps") was **NOT found** in the CRM database.

**Possible Reasons**:
1. **Consumer Not Running**: The CRM Redis Streams Consumer may not be running
2. **Consumer Not Processing This Stream**: The consumer may not be subscribed to `crm:sync:role:role_created`
3. **Processing Failed**: The event was consumed but failed to be saved to the database
4. **Different Tenant**: The event might be for a different tenant (but tenant ID matches)
5. **Event Too Recent**: The event was published but hasn't been consumed yet (timestamp is recent: 2026-01-01)

### ❌ MISSING DATA - Deleted Role Not Found

The deleted role (`711f157d-078f-4cea-971d-a55acd921f40` - "Affiliate ") was also **NOT found** in the database, which could mean:
- It was never created in CRM (only existed in AffiliateConnect)
- It was deleted before being synced
- The deletion event wasn't consumed

### ✅ DATA FOUND - Different Role Exists

Only 1 role exists in the database for this tenant:
- Role ID: `bf54eab6-4743-4537-8f2b-777c1fdd8f2b`
- Name: "Organization Admin"
- Created on: 2025-12-21 (11 days before the Redis event)

### 📊 Data Structure Differences

**Redis Event Structure**:
- Permissions stored as nested object with application-specific permissions
- Full permissions structure with detailed actions
- Restrictions as JSON string

**Database Structure**:
- Permissions stored as flat array (`crm.leads.read`, etc.)
- `permissionsStructure` field is empty
- Restrictions as empty object

**This suggests**:
- The consumer may be transforming the data structure
- Or the database schema expects a different format
- The role in the database may have been created manually, not from Redis

## Validation Results

| Redis Event | Found in DB? | Status |
|------------|--------------|--------|
| Role Created (`e2064fd3-533d-4b51-a25e-95500ef01eab`) | ❌ NO | **NOT CONSUMED** |
| Role Deleted (`711f157d-078f-4cea-971d-a55acd921f40`) | ❌ NO | **NOT FOUND** |
| Role "Organization Admin" (`bf54eab6-4743-4537-8f2b-777c1fdd8f2b`) | ✅ YES | **EXISTS** (different role) |

## Recommendations

1. **Check Consumer Status**: Verify if the CRM Redis Streams Consumer is running
2. **Check Consumer Logs**: Look for errors processing `crm:sync:role:role_created` events
3. **Verify Stream Subscription**: Ensure the consumer is subscribed to the correct streams
4. **Check Event Processing Records**: Review `crmeventprocessingrecords` collection for processing history
5. **Monitor Pending Messages**: Check if messages are stuck in pending state
6. **Compare Timestamps**: The Redis event is from 2026-01-01, check if consumer was running at that time

## Next Steps

1. Check consumer process status
2. Review consumer logs for errors
3. Verify stream subscriptions
4. Check if there are any pending messages in Redis consumer groups
5. Validate the consumer is processing events for tenant `62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8`

