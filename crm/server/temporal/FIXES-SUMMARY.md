# CRM Temporal Integration Fixes Summary

## Date: January 2, 2026

This document summarizes all the fixes applied to resolve CRM event consumption issues and Temporal worker configuration problems.

---

## ✅ Issues Fixed

### 1. **Module Import Path Error**
**Error:** `ERR_MODULE_NOT_FOUND: Cannot find module '/Users/chintadineshreddy/Desktop/MegaRepo/crm/temporal-shared/client.js'`

**File:** `crm/server/routes/api/sync.js`

**Fix:** Corrected the import path from:
```javascript
// ❌ BEFORE (incorrect)
import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../temporal-shared/client.js';

// ✅ AFTER (correct)
import { getTemporalClient, getTaskQueue, TEMPORAL_CONFIG } from '../../../../temporal-shared/client.js';
```

**Reason:** The file is in `crm/server/routes/api/`, so it needs to go up 4 levels to reach the root `temporal-shared/` directory.

---

### 2. **Missing Required Fields Error**
**Error:** `workflowExecutionFailedEventAttributes: Missing required fields: tenantId, roleId`

**Root Cause:** Event data was not being properly merged when passed from Temporal activities to CRM handlers. The handlers were using `event.data || event`, which could lose top-level fields like `tenantId` that exist on the event object itself.

**Files Modified:**
- `crm/server/services/redisStreamsConsumer.js`

**Fix Applied:** Changed event data merging in all role event handlers:

```javascript
// ❌ BEFORE (incorrect - loses top-level fields)
const eventData = event.data || event;

// ✅ AFTER (correct - merges both event and event.data)
const eventData = {
  ...event,
  ...(event.data || {}),
};
```

**Handlers Fixed:**
- `handleRoleCreated` (line ~1524)
- `handleRoleUpdated` (line ~1678)
- `handleRoleDeleted` (line ~1723)
- `handleRoleAssigned` (line ~1783)
- `handleRoleUnassigned` (similar pattern)

**Why This Works:** 
- The event object from Temporal contains `tenantId` at the top level
- The `event.data` object contains `roleId`, `roleName`, and other role-specific fields
- By spreading both, we ensure all fields are available in `eventData`

---

### 3. **Temporal Worker Workflow Registration**
**Error:** `WARN No workflows registered, not polling for workflow tasks`

**Root Cause:** Temporal's webpack bundler requires a specific path format for workflow registration. Multiple attempts with different path formats failed.

**Files Modified:**
- `crm/server/temporal/worker.js`
- `crm/server/temporal/workflows/index.js` (created)

**Solution:** Created a single entry point file that re-exports all workflows, then used an absolute path to that file.

**Step 1:** Created `crm/server/temporal/workflows/index.js`:
```javascript
/**
 * Workflows index file
 * Exports all CRM workflows for Temporal worker registration
 */

export { crmSyncWorkflow } from './crm-sync-workflow.js';
export { tenantSyncWorkflow } from './tenant-sync-workflow.js';
export { dlqHandlerWorkflow } from './dlq-handler-workflow.js';
```

**Step 2:** Updated `crm/server/temporal/worker.js`:
```javascript
// ✅ FINAL WORKING CONFIGURATION
const workflowsPath = join(__dirname, 'workflows', 'index.js');

worker = await Worker.create({
  connection,
  namespace: TEMPORAL_CONFIG.namespace,
  taskQueue: getTaskQueue('CRM'),
  workflowsPath,  // Single entry point file
  activities: allActivities,
});
```

**Why This Works:**
- Single entry point simplifies webpack bundling
- Absolute path ensures correct resolution
- Re-exports allow webpack to trace all dependencies
- Matches the pattern used successfully in the wrapper worker

**Attempts That Failed:**
- ❌ Array of absolute paths: `[join(__dirname, 'workflows', 'crm-sync-workflow.js'), ...]`
- ❌ Single directory path: `join(__dirname, 'workflows')`
- ❌ Array of relative paths: `['./workflows/crm-sync-workflow.js', ...]`
- ❌ Glob pattern: `'./workflows/*.js'`
- ❌ Direct imports with `workflows` object (not supported by Temporal SDK)

---

### 4. **Environment Variable Loading in Retry Scripts**
**Error:** `⚠️ Temporal is disabled. Set TEMPORAL_ENABLED=true to enable.`

**File:** `crm/server/temporal/retry-failed-events.js`

**Fix:** Added explicit dotenv configuration to load `.env` from parent directory:
```javascript
import dotenv from 'dotenv';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from crm/server directory
dotenv.config({ path: join(__dirname, '..', '.env') });
```

---

## 🔍 Debug Logging Added

To trace data flow and identify issues, debug logging was added to:

1. **`crm/server/temporal/activities/crm-activities.js`**
   - Logs event data keys and values before passing to handlers
   - Shows `tenantId`, `roleId`, `roleName` values

2. **`crm/server/services/redisStreamsConsumer.js`**
   - Logs event keys, `event.data` keys, and merged `eventData` keys
   - Logs `tenantId`, `roleId`, `roleName` after merging

3. **`crm/server/services/roleProcessingService.js`**
   - Logs `roleData` and `normalizedData` to trace field transformations

**Example Debug Output:**
```
🔍 [createRoleInCRM] Received eventData keys: ['tenantId', 'roleId', 'roleName', ...]
🔍 [createRoleInCRM] eventData.tenantId: 62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8
🔍 [createRoleInCRM] eventData.roleId: e2064fd3-533d-4b51-a25e-95500ef01eab
🔍 [createRoleInCRM] eventData.roleName: all apps
```

---

## 🛠️ Utility Scripts Created

### 1. `extract-failed-workflows.js`
**Purpose:** Extract event data from failed Temporal workflows for debugging and retry.

**Usage:**
```bash
cd crm/server/temporal
node extract-failed-workflows.js <workflow-id>
```

**Features:**
- Fetches workflow description and history
- Parses input payloads to extract original event data
- Displays formatted output with retry command
- Can automatically retry workflows

### 2. `retry-failed-events.js`
**Purpose:** Retry failed events from Redis streams or start new workflows with event data.

**Usage:**
```bash
cd crm/server/temporal
node retry-failed-events.js --workflow <event-data-json>
node retry-failed-events.js --redis <stream-name> <group-name>
```

**Features:**
- Retry specific workflows with event data
- Claim and reprocess pending Redis messages
- Proper error handling and logging

### 3. `README-RETRY-SCRIPTS.md`
**Purpose:** Documentation for using the retry and extraction scripts.

---

## ✅ Verification

**Current Status:** ✅ **WORKING**

**Evidence from Terminal Output:**
```
✅ CRM Temporal Worker started
📋 Listening on task queue: crm-workflows
📋 Registered workflows: crmSyncWorkflow, tenantSyncWorkflow, dlqHandlerWorkflow
📋 Registered activities: 17 activities
```

**Successful Workflow Execution:**
```
[crmSyncWorkflow(...)] [CRM Workflow] Processing event: role.created for tenant 62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8
🔍 [createRoleInCRM] eventData.tenantId: 62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8
🔍 [createRoleInCRM] eventData.roleId: e2064fd3-533d-4b51-a25e-95500ef01eab
🔍 [createRoleInCRM] eventData.roleName: all apps
✅ Role all apps created successfully
✅ Role created successfully: e2064fd3-533d-4b51-a25e-95500ef01eab
[crmSyncWorkflow(...)] [CRM Workflow] Completed successfully in 13958ms
```

**Key Observations:**
- ✅ Worker starts and registers workflows correctly
- ✅ Events are being consumed from Redis streams
- ✅ `tenantId`, `roleId`, and `roleName` are preserved throughout the flow
- ✅ Workflows complete successfully
- ✅ Debug logging shows correct data at each step

---

## 📝 Key Learnings

1. **Event Data Structure:** When events come from Temporal, they may have fields at both the top level (`event.tenantId`) and nested in `event.data` (`event.data.roleId`). Always merge both when processing.

2. **Temporal Workflow Registration:** Temporal's webpack bundler works best with a single entry point file that re-exports all workflows, using an absolute path.

3. **Path Resolution:** In ES modules, always use `fileURLToPath` and `dirname` to get `__dirname`, then use `join()` for path construction.

4. **Environment Variables:** When running scripts from subdirectories, explicitly load `.env` files with absolute paths to ensure configuration is loaded.

---

## 🚀 Next Steps (Optional)

1. **Remove Debug Logging:** Once confident the system is stable, consider removing or gating debug logs behind an environment variable.

2. **Retry Failed Workflows:** Use `extract-failed-workflows.js` to retry any workflows that failed before these fixes were applied.

3. **Monitor Metrics:** The worker includes built-in metrics and health checks. Monitor these for any anomalies.

4. **Documentation:** Update main README with Temporal setup and troubleshooting information.

---

## 📚 Related Files

- `crm/server/routes/api/sync.js` - Temporal client usage
- `crm/server/temporal/worker.js` - Worker configuration
- `crm/server/temporal/workflows/index.js` - Workflow exports
- `crm/server/services/redisStreamsConsumer.js` - Event handlers
- `crm/server/services/roleProcessingService.js` - Business logic
- `crm/server/temporal/activities/crm-activities.js` - Temporal activities
- `temporal-shared/client.js` - Shared Temporal configuration

---

**Status:** All critical issues resolved. System is operational and processing events successfully. ✅


