# Sync Feature Flag Documentation

## Overview

The sync system now supports both direct sync and Temporal workflow-based sync for tenant data synchronization during authentication. This document describes how to configure and use the feature flag system.

## Feature Flag Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```bash
# Enable Temporal for authentication sync (default: false)
USE_TEMPORAL_FOR_AUTH=false

# Timeout for Temporal auth sync in milliseconds (default: 60000 = 60 seconds)
TEMPORAL_AUTH_TIMEOUT_MS=60000

# Optional: Comma-separated list of tenant IDs to use Temporal for
# If not set, Temporal will be used for all tenants when USE_TEMPORAL_FOR_AUTH=true
TEMPORAL_TENANTS=tenant-1,tenant-2,tenant-3

# General Temporal configuration (required if using Temporal)
TEMPORAL_ENABLED=true
TEMPORAL_ADDRESS=localhost:7233
TEMPORAL_NAMESPACE=default
```

### Configuration Options

1. **USE_TEMPORAL_FOR_AUTH**: Master switch for using Temporal in auth flow
   - `false` (default): Uses direct sync (current implementation)
   - `true`: Uses Temporal workflows with fallback to direct sync

2. **TEMPORAL_AUTH_TIMEOUT_MS**: Maximum wait time for essential data sync
   - Default: 60000ms (60 seconds)
   - If timeout is reached, system falls back to direct sync

3. **TEMPORAL_TENANTS**: Optional tenant-based routing
   - Empty (default): Use Temporal for all tenants when enabled
   - Comma-separated list: Only use Temporal for specified tenants

## Sync Methods

### Direct Sync (Default)

- **Method**: Synchronous execution via `syncOrchestrationService`
- **Pros**: Fast, proven, low latency
- **Cons**: No crash recovery, limited observability
- **Use Case**: Default for all tenants

### Temporal Sync (Optional)

- **Method**: Temporal workflow execution with polling
- **Pros**: Crash recovery, better observability, built-in retries
- **Cons**: Additional latency (~100-500ms overhead)
- **Use Case**: Large tenants, better reliability requirements

## How It Works

### Sync Flow Decision

```
User Login
  ↓
ensureTenantSync()
  ↓
Check Feature Flag
  ├─ USE_TEMPORAL_FOR_AUTH=false → Direct Sync
  └─ USE_TEMPORAL_FOR_AUTH=true
      ├─ Check TEMPORAL_TENANTS
      │   ├─ Empty → Use Temporal for all
      │   └─ Has values → Use Temporal only for listed tenants
      └─ Start Temporal Workflow
          ├─ Poll for essential data completion
          ├─ Timeout → Fallback to Direct Sync
          └─ Error → Fallback to Direct Sync
```

### Fallback Mechanism

If Temporal sync fails or times out, the system automatically falls back to direct sync:

1. Temporal workflow starts
2. System polls for essential data completion
3. If timeout or error occurs:
   - Logs error with correlation ID
   - Automatically falls back to direct sync
   - Returns result with `fallbackUsed: true` flag

## Monitoring and Metrics

### Metrics Endpoints

#### Get Comprehensive Metrics
```bash
GET /api/sync/metrics
```

Returns:
- Orchestration metrics (success rate, durations, error types)
- Database metrics (tenant counts, average durations)
- Collection-level metrics (per-collection success rates)

#### Get Health Status
```bash
GET /api/sync/health
```

Returns:
- Overall health status (healthy/degraded/unhealthy)
- Success/failure rates
- Stuck sync count
- Active sync count

#### Get Sync Method Statistics
```bash
GET /api/sync/method-stats
```

Returns:
- Total syncs by method (direct vs Temporal)
- Success rates per method

### Enhanced Status Endpoint

The status endpoint now includes additional information:

```bash
GET /api/sync/tenants/:tenantId/status
```

Enhanced response includes:
- `syncMethod`: 'direct' or 'temporal'
- `hasFailedCollections`: Boolean
- `failedCollections`: Array of failed collection details

## Correlation IDs

All sync operations now include correlation IDs for tracking:

- Format: `sync-{tenantId}-{timestamp}-{random}`
- Used in logs, file logs, and error messages
- Helps track sync operations across services

## Error Handling

### Error Classification

Errors are classified into types:
- **AUTH_ERROR**: Authentication failures (non-retryable)
- **VALIDATION_ERROR**: Data validation errors (non-retryable)
- **NETWORK_ERROR**: Network timeouts/connection issues (retryable)
- **DATABASE_ERROR**: Database transaction errors (retryable)
- **TIMEOUT_ERROR**: Sync timeout errors (retryable)
- **UNKNOWN_ERROR**: Unclassified errors (retryable)

### Error Context

All errors include:
- Correlation ID
- Tenant ID
- Error type
- Retryable flag
- Actionable error message
- Duration information

## Troubleshooting

### Sync Taking Too Long

1. Check `TEMPORAL_AUTH_TIMEOUT_MS` setting
2. Review sync logs with correlation ID
3. Check sync status endpoint for stuck syncs
4. Review metrics for average durations

### Temporal Sync Failing

1. Verify `TEMPORAL_ENABLED=true`
2. Check Temporal server connectivity
3. Review Temporal worker logs
4. Check fallback logs (should show direct sync used)

### Feature Flag Not Working

1. Verify environment variables are set correctly
2. Restart application after changing env vars
3. Check logs for sync method being used
4. Verify TEMPORAL_CONFIG is loaded correctly

## Migration Guide

### Phase 1: Test with Feature Flag Disabled

1. Deploy enhanced direct sync (default)
2. Monitor metrics and logs
3. Verify no regressions

### Phase 2: Enable for Specific Tenants

1. Set `USE_TEMPORAL_FOR_AUTH=true`
2. Set `TEMPORAL_TENANTS=test-tenant-1,test-tenant-2`
3. Monitor Temporal sync performance
4. Compare with direct sync metrics

### Phase 3: Gradual Rollout

1. Add more tenants to `TEMPORAL_TENANTS`
2. Monitor success rates and latencies
3. Adjust timeout if needed

### Phase 4: Full Migration (Optional)

1. Remove `TEMPORAL_TENANTS` (use for all)
2. Monitor overall system performance
3. Keep feature flag for easy rollback

## Best Practices

1. **Start Small**: Test with specific tenants first
2. **Monitor Metrics**: Use `/api/sync/metrics` regularly
3. **Set Appropriate Timeouts**: Balance user experience vs reliability
4. **Keep Fallback**: Always have fallback mechanism enabled
5. **Log Everything**: Use correlation IDs for debugging
6. **Review Health**: Check `/api/sync/health` regularly

## Rollback Procedure

If issues occur, instantly rollback:

1. Set `USE_TEMPORAL_FOR_AUTH=false`
2. Restart application
3. All syncs will use direct method
4. No code changes needed

## Support

For issues or questions:
1. Check logs with correlation ID
2. Review sync status endpoint
3. Check metrics endpoint for patterns
4. Review Temporal UI (if Temporal enabled)

