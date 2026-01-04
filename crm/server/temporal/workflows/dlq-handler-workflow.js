import { workflowInfo } from '@temporalio/workflow';

/**
 * Dead Letter Queue Handler Workflow
 * Handles permanently failed workflows by logging to DLQ stream and alerting
 * 
 * This workflow is triggered when a workflow fails permanently after all retries
 */
export async function dlqHandlerWorkflow(failedWorkflowInfo) {
  const { workflowId, runId, workflowType, error, eventData, tenantId } = failedWorkflowInfo;

  console.log(`[DLQ Handler] Processing failed workflow: ${workflowId}`);
  console.log(`[DLQ Handler] Workflow Type: ${workflowType}`);
  console.log(`[DLQ Handler] Run ID: ${runId}`);
  console.log(`[DLQ Handler] Tenant ID: ${tenantId || 'unknown'}`);
  console.log(`[DLQ Handler] Error: ${error?.message || 'Unknown error'}`);

  // Structure DLQ entry
  const dlqEntry = {
    workflowId,
    runId,
    workflowType,
    tenantId: tenantId || 'unknown',
    eventData: eventData || {},
    error: {
      message: error?.message || 'Unknown error',
      type: error?.type || 'Error',
      stack: error?.stack || null,
    },
    timestamp: new Date().toISOString(),
    handlerWorkflowId: workflowInfo().workflowId,
    handlerRunId: workflowInfo().runId,
  };

  // Return DLQ entry for external processing (e.g., publish to Redis DLQ stream)
  // The activity that calls this workflow should handle publishing to DLQ
  return {
    success: true,
    dlqEntry,
    message: 'Failed workflow logged to DLQ',
  };
}


