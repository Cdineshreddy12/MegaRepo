# Retry Scripts for Failed Temporal Workflows

This directory contains scripts to help retry failed Temporal workflows, especially those that failed due to the `tenantId`/`roleId` extraction issue.

## Scripts

### 1. `extract-failed-workflows.js`
Extracts event data from failed workflows and optionally retries them.

### 2. `retry-failed-events.js`
Retries pending messages from Redis streams or manually retries workflows with event data.

## Usage

### Extract Event Data from Failed Workflows

**Step 1: Get Workflow IDs from Temporal UI**
1. Open Temporal UI: http://localhost:8081
2. Navigate to "Workflows" → Filter by "Failed"
3. Copy the workflow IDs (e.g., `crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg`)

**Step 2: Extract Event Data**
```bash
cd /Users/chintadineshreddy/Desktop/MegaRepo/crm/server/temporal

# Extract data from one or more workflows
node extract-failed-workflows.js extract \
  crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg \
  crm-role.created-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346082549-Ir61k5tve
```

This will:
- Extract the event data from each workflow
- Display the event data in JSON format
- Show a retry command you can use

**Step 3: Retry Workflows**
```bash
# Option A: Extract and retry automatically
node extract-failed-workflows.js retry \
  crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg

# Option B: Use the retry command shown in the extract output
node retry-failed-events.js workflow '{"eventType":"role.deleted","tenantId":"...","roleId":"..."}'
```

### Retry Pending Redis Messages

If messages are still pending in Redis streams (not yet acknowledged):

```bash
cd /Users/chintadineshreddy/Desktop/MegaRepo/crm/server/temporal
node retry-failed-events.js pending
```

This will:
- Check all role-related Redis streams for pending messages
- Claim and retry them with the fixed code
- Automatically acknowledge successful retries

## Example Output

When extracting workflow data, you'll see:

```
================================================================================
Workflow ID: crm-role.deleted-62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8-1767346576006-ulgtb4mzg
Run ID: 019b...
Status: FAILED
Type: crmSyncWorkflow
Start Time: 2026-01-02T09:36:16.001Z
Close Time: 2026-01-02T09:36:19.120Z

❌ Error:
   Message: Activity task failed
   Type: Error

📦 Event Data:
{
  "eventType": "role.deleted",
  "tenantId": "62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8",
  "roleId": "e2064fd3-533d-4b51-a25e-95500ef01eab",
  ...
}

🔄 Retry Command:
node retry-failed-events.js workflow '{"eventType":"role.deleted","tenantId":"62fd1ba9-0ed1-46c9-882a-b4783c8fdfa8","roleId":"e2064fd3-533d-4b51-a25e-95500ef01eab"}'
================================================================================
```

## Troubleshooting

### "Temporal is disabled"
Make sure `TEMPORAL_ENABLED=true` is set in `crm/server/.env`

### "Could not parse input"
The workflow input might be in a different format. You can:
1. Check the Temporal UI → Workflow Details → Input tab
2. Manually copy the input data and use `retry-failed-events.js workflow`

### "No pending messages"
This means the Redis messages were already acknowledged. Use `extract-failed-workflows.js` to retry from Temporal workflows instead.

## What Was Fixed

The root cause was in the event handlers (`handleRoleDeleted`, `handleRoleCreated`, etc.) which were using `event.data || event` instead of merging both. This caused `tenantId` to be lost when events came from Temporal activities.

**Fixed handlers:**
- `handleRoleDeleted`
- `handleRoleCreated`
- `handleRoleUpdated`
- `handleRoleAssigned`
- `handleRoleUnassigned`

All handlers now use:
```javascript
const eventData = {
  ...event,
  ...(event.data || {}),
};
```

This ensures all fields (including `tenantId` and `roleId`) are preserved.


