/**
 * Temporal Monitoring and Metrics
 * Tracks workflow and activity metrics for monitoring and alerting
 */

class TemporalMonitoring {
  constructor() {
    this.metrics = {
      workflows: {
        started: 0,
        completed: 0,
        failed: 0,
        byType: {},
      },
      activities: {
        executed: 0,
        failed: 0,
        retried: 0,
        byType: {},
      },
      bridge: {
        messagesProcessed: 0,
        messagesFailed: 0,
        pendingClaimed: 0,
      },
      sync: {
        started: 0,
        completed: 0,
        failed: 0,
        averageDuration: 0,
      },
      startTime: Date.now(),
    };

    this.alerts = [];
  }

  /**
   * Record workflow start
   */
  recordWorkflowStart(workflowType, tenantId = null) {
    this.metrics.workflows.started++;
    
    if (!this.metrics.workflows.byType[workflowType]) {
      this.metrics.workflows.byType[workflowType] = {
        started: 0,
        completed: 0,
        failed: 0,
      };
    }
    
    this.metrics.workflows.byType[workflowType].started++;

    if (workflowType === 'tenantSyncWorkflow') {
      this.metrics.sync.started++;
    }
  }

  /**
   * Record workflow completion
   */
  recordWorkflowCompletion(workflowType, success, durationMs = 0, tenantId = null) {
    if (success) {
      this.metrics.workflows.completed++;
      
      if (this.metrics.workflows.byType[workflowType]) {
        this.metrics.workflows.byType[workflowType].completed++;
      }

      if (workflowType === 'tenantSyncWorkflow') {
        this.metrics.sync.completed++;
        this.updateAverageDuration(durationMs);
      }
    } else {
      this.metrics.workflows.failed++;
      
      if (this.metrics.workflows.byType[workflowType]) {
        this.metrics.workflows.byType[workflowType].failed++;
      }

      if (workflowType === 'tenantSyncWorkflow') {
        this.metrics.sync.failed++;
      }
    }
  }

  /**
   * Record activity execution
   */
  recordActivityExecution(activityType, success, retried = false) {
    this.metrics.activities.executed++;
    
    if (!this.metrics.activities.byType[activityType]) {
      this.metrics.activities.byType[activityType] = {
        executed: 0,
        failed: 0,
        retried: 0,
      };
    }
    
    this.metrics.activities.byType[activityType].executed++;

    if (!success) {
      this.metrics.activities.failed++;
      this.metrics.activities.byType[activityType].failed++;
    }

    if (retried) {
      this.metrics.activities.retried++;
      this.metrics.activities.byType[activityType].retried++;
    }
  }

  /**
   * Record bridge metrics
   */
  recordBridgeMetrics({ messagesProcessed = 0, messagesFailed = 0, pendingClaimed = 0 }) {
    this.metrics.bridge.messagesProcessed += messagesProcessed;
    this.metrics.bridge.messagesFailed += messagesFailed;
    this.metrics.bridge.pendingClaimed += pendingClaimed;
  }

  /**
   * Update average sync duration
   */
  updateAverageDuration(durationMs) {
    const completed = this.metrics.sync.completed;
    if (completed === 0) {
      this.metrics.sync.averageDuration = durationMs;
    } else {
      this.metrics.sync.averageDuration = 
        (this.metrics.sync.averageDuration * (completed - 1) + durationMs) / completed;
    }
  }

  /**
   * Check for alerts
   */
  checkAlerts() {
    const alerts = [];

    // Check failure rate
    const totalWorkflows = this.metrics.workflows.started;
    if (totalWorkflows > 0) {
      const failureRate = (this.metrics.workflows.failed / totalWorkflows) * 100;
      if (failureRate > 5) {
        alerts.push({
          type: 'high_failure_rate',
          severity: 'warning',
          message: `Workflow failure rate is ${failureRate.toFixed(2)}% (threshold: 5%)`,
          value: failureRate,
        });
      }
    }

    // Check activity failure rate
    const totalActivities = this.metrics.activities.executed;
    if (totalActivities > 0) {
      const activityFailureRate = (this.metrics.activities.failed / totalActivities) * 100;
      if (activityFailureRate > 5) {
        alerts.push({
          type: 'high_activity_failure_rate',
          severity: 'warning',
          message: `Activity failure rate is ${activityFailureRate.toFixed(2)}% (threshold: 5%)`,
          value: activityFailureRate,
        });
      }
    }

    // Check bridge message failure rate
    const totalBridgeMessages = this.metrics.bridge.messagesProcessed;
    if (totalBridgeMessages > 0) {
      const bridgeFailureRate = (this.metrics.bridge.messagesFailed / totalBridgeMessages) * 100;
      if (bridgeFailureRate > 5) {
        alerts.push({
          type: 'high_bridge_failure_rate',
          severity: 'warning',
          message: `Bridge message failure rate is ${bridgeFailureRate.toFixed(2)}% (threshold: 5%)`,
          value: bridgeFailureRate,
        });
      }
    }

    // Check for long-running syncs
    if (this.metrics.sync.averageDuration > 60 * 60 * 1000) { // 1 hour
      alerts.push({
        type: 'long_running_syncs',
        severity: 'info',
        message: `Average sync duration is ${(this.metrics.sync.averageDuration / 60000).toFixed(2)} minutes`,
        value: this.metrics.sync.averageDuration,
      });
    }

    this.alerts = alerts;
    return alerts;
  }

  /**
   * Get metrics summary
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    
    return {
      ...this.metrics,
      uptime: {
        ms: uptime,
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000),
      },
      failureRates: {
        workflows: this.metrics.workflows.started > 0
          ? ((this.metrics.workflows.failed / this.metrics.workflows.started) * 100).toFixed(2) + '%'
          : '0%',
        activities: this.metrics.activities.executed > 0
          ? ((this.metrics.activities.failed / this.metrics.activities.executed) * 100).toFixed(2) + '%'
          : '0%',
        bridge: this.metrics.bridge.messagesProcessed > 0
          ? ((this.metrics.bridge.messagesFailed / this.metrics.bridge.messagesProcessed) * 100).toFixed(2) + '%'
          : '0%',
      },
      alerts: this.checkAlerts(),
    };
  }

  /**
   * Reset metrics (for testing)
   */
  reset() {
    this.metrics = {
      workflows: {
        started: 0,
        completed: 0,
        failed: 0,
        byType: {},
      },
      activities: {
        executed: 0,
        failed: 0,
        retried: 0,
        byType: {},
      },
      bridge: {
        messagesProcessed: 0,
        messagesFailed: 0,
        pendingClaimed: 0,
      },
      sync: {
        started: 0,
        completed: 0,
        failed: 0,
        averageDuration: 0,
      },
      startTime: Date.now(),
    };
    this.alerts = [];
  }
}

// Export singleton instance
export default new TemporalMonitoring();


