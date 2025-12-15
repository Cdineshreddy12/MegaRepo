import express from 'express';
const router = express.Router();
import auth from '../../middleware/auth.js';
import { checkPermissions } from '../../middleware/checkPermissions.js';
import * as monitoringController from '../../controllers/monitoringController.js';

/**
 * @route   GET /api/monitoring/redis-streams
 * @desc    Get comprehensive Redis Streams monitoring data
 * @access  Private (admin/system permissions)
 */
router.get(
  '/redis-streams',
  auth,
  checkPermissions(
    'crm.system.monitoring_read',
    'crm.system.admin',
    'system.monitoring.read',
    'system.admin'
  ),
  monitoringController.getRedisStreamsMonitoring
);

/**
 * @route   GET /api/monitoring/redis-streams/summary
 * @desc    Get summary of Redis Streams health
 * @access  Private (admin/system permissions)
 */
router.get(
  '/redis-streams/summary',
  auth,
  checkPermissions(
    'crm.system.monitoring_read',
    'crm.system.admin',
    'system.monitoring.read',
    'system.admin'
  ),
  monitoringController.getMonitoringSummary
);

/**
 * @route   GET /api/monitoring/redis-streams/:streamName
 * @desc    Get monitoring data for a specific stream
 * @access  Private (admin/system permissions)
 */
router.get(
  '/redis-streams/:streamName',
  auth,
  checkPermissions(
    'crm.system.monitoring_read',
    'crm.system.admin',
    'system.monitoring.read',
    'system.admin'
  ),
  monitoringController.getStreamMonitoring
);

/**
 * @route   GET /api/monitoring/redis-streams/:streamName/groups/:groupName
 * @desc    Get monitoring data for a specific consumer group
 * @access  Private (admin/system permissions)
 */
router.get(
  '/redis-streams/:streamName/groups/:groupName',
  auth,
  checkPermissions(
    'crm.system.monitoring_read',
    'crm.system.admin',
    'system.monitoring.read',
    'system.admin'
  ),
  monitoringController.getConsumerGroupMonitoring
);

export default router;

