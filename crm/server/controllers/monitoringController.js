import RedisStreamsMonitor from '../services/redisStreamsMonitor.js';

let monitorInstance = null;

/**
 * Get or create monitor instance (singleton)
 */
async function getMonitor() {
  if (!monitorInstance) {
    monitorInstance = new RedisStreamsMonitor();
    await monitorInstance.initialize();
  }
  return monitorInstance;
}

/**
 * @route   GET /api/monitoring/redis-streams
 * @desc    Get comprehensive Redis Streams monitoring data
 * @access  Private (admin)
 */
export const getRedisStreamsMonitoring = async (req, res) => {
  try {
    const monitor = await getMonitor();
    const streamNames = req.query.streams ? req.query.streams.split(',') : null;
    
    const monitoring = await monitor.getComprehensiveMonitoring(streamNames);
    
    res.json({
      success: true,
      data: monitoring
    });
  } catch (error) {
    console.error('❌ Redis Streams monitoring error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Redis Streams monitoring data',
      error: error.message
    });
  }
};

/**
 * @route   GET /api/monitoring/redis-streams/:streamName
 * @desc    Get monitoring data for a specific stream
 * @access  Private (admin)
 */
export const getStreamMonitoring = async (req, res) => {
  try {
    const monitor = await getMonitor();
    const { streamName } = req.params;
    
    const streamData = await monitor.getStreamMonitoring(streamName);
    
    res.json({
      success: true,
      data: streamData
    });
  } catch (error) {
    console.error('❌ Stream monitoring error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to monitor stream: ${req.params.streamName}`,
      error: error.message
    });
  }
};

/**
 * @route   GET /api/monitoring/redis-streams/:streamName/groups/:groupName
 * @desc    Get monitoring data for a specific consumer group
 * @access  Private (admin)
 */
export const getConsumerGroupMonitoring = async (req, res) => {
  try {
    const monitor = await getMonitor();
    const { streamName, groupName } = req.params;
    
    const groupData = await monitor.getConsumerGroupMonitoring(streamName, groupName);
    
    res.json({
      success: true,
      data: groupData
    });
  } catch (error) {
    console.error('❌ Consumer group monitoring error:', error);
    res.status(500).json({
      success: false,
      message: `Failed to monitor consumer group: ${groupName}`,
      error: error.message
    });
  }
};

/**
 * @route   GET /api/monitoring/redis-streams/summary
 * @desc    Get summary of Redis Streams health
 * @access  Private (admin)
 */
export const getMonitoringSummary = async (req, res) => {
  try {
    const monitor = await getMonitor();
    const monitoring = await monitor.getComprehensiveMonitoring();
    
    // Extract summary and health status
    const summary = {
      timestamp: monitoring.timestamp,
      streams: monitoring.summary.totalStreams,
      consumerGroups: monitoring.summary.totalConsumerGroups,
      consumers: monitoring.summary.totalConsumers,
      pendingMessages: monitoring.summary.totalPendingMessages,
      totalMessages: monitoring.summary.totalStreamLength,
      health: {
        status: 'healthy',
        criticalIssues: 0,
        warnings: 0
      },
      streamsHealth: monitoring.streams.map(stream => ({
        name: stream.name,
        status: stream.status,
        health: stream.health?.status || 'unknown',
        pending: stream.totalPendingMessages || 0,
        length: stream.length || 0
      }))
    };

    // Calculate overall health
    for (const stream of monitoring.streams) {
      if (stream.health) {
        if (stream.health.status === 'critical') {
          summary.health.status = 'critical';
          summary.health.criticalIssues += stream.health.critical.length;
        } else if (stream.health.status === 'warning' && summary.health.status !== 'critical') {
          summary.health.status = 'warning';
        }
        summary.health.warnings += stream.health.warnings.length;
      }
    }

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('❌ Monitoring summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monitoring summary',
      error: error.message
    });
  }
};

