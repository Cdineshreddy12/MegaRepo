import express from 'express';
const router = express.Router();
import auth from '../../../middleware/auth.js';
import checkRole from '../../../middleware/checkRole.js';
import { checkPermissions } from '../../../middleware/checkPermissions.js';
import reportController from '../../../controllers/admin/reportController.js';

// @route   GET /api/admin/reports/users
// @desc    Get user activity reports
// @access  Users with user management permissions
router.get(
  '/users',
  [
    checkPermissions(
      'crm.system.users_read',
      'crm.system.users_read_all',
      'system.users.read',
      'system.users.read_all'
    )
  ],
  reportController.getUserActivityReport
);

// @route   GET /api/admin/reports/users/:id
// @desc    Get specific user activity report
// @access  Users with user management permissions
router.get(
  '/users/:id',
  [
    checkPermissions(
      'crm.system.users_read',
      'crm.system.users_read_all',
      'system.users.read',
      'system.users.read_all'
    )
  ],
  reportController.getUserActivityReportById
);

// @route   GET /api/admin/reports/system
// @desc    Get system usage reports
// @access  Users with system permissions
router.get(
  '/system',
  [
    checkPermissions(
      'crm.system.reports_read',
      'crm.system.reports_read_all',
      'system.reports.read',
      'system.reports.read_all'
    )
  ],
  reportController.getSystemUsageReport
);

// Custom middleware to allow users to view their own logs
const allowOwnLogsOrAuditPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'No token, authorization denied',
          error: 'USER_NOT_FOUND'
        });
      }

      const userPermissions = req.user?.permissions || [];
      const currentUserId = req.user?.id || req.user?.userId;
      const requestedUserId = req.query.userId;
      const isRequestingOwnLogs = requestedUserId === 'me' || requestedUserId === currentUserId;

      // Check if user has audit permissions
      const hasAuditPermission = requiredPermissions.some(requiredPermission => {
        if (userPermissions.includes(requiredPermission)) return true;
        if (requiredPermission.startsWith('system.') && 
            userPermissions.includes(`crm.${requiredPermission}`)) return true;
        if (requiredPermission.startsWith('crm.system.') && 
            userPermissions.includes(requiredPermission.replace('crm.', ''))) return true;
        return false;
      });

      // Allow access if user has audit permissions OR is requesting their own logs
      if (hasAuditPermission || isRequestingOwnLogs) {
        console.log('✅ Audit route access granted:', {
          hasAuditPermission,
          isRequestingOwnLogs,
          requestedUserId,
          currentUserId
        });
        return next();
      }

      console.log('❌ Audit route access denied:', {
        hasAuditPermission,
        isRequestingOwnLogs,
        requestedUserId,
        currentUserId
      });

      return res.status(403).json({
        message: "Access denied. Insufficient privileges. You can only view your own activity logs.",
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10),
        error: 'INSUFFICIENT_PERMISSIONS'
      });

    } catch (error) {
      console.error('❌ Permission middleware error:', error);
      return res.status(500).json({
        message: "Internal server error in permission check",
        error: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// @route   GET /api/admin/reports/audit
// @desc    Get audit logs
// @access  Users with audit/activity_logs permissions OR users viewing their own logs
router.get(
  '/audit',
  [
    allowOwnLogsOrAuditPermissions(
      'crm.system.audit_read',
      'crm.system.audit_read_all',
      'crm.system.activity_logs_read',
      'crm.system.activity_logs_read_all',
      'system.audit.read',
      'system.audit.read_all'
    )
  ],
  reportController.getAuditLogs
);

// @route   GET /api/admin/reports/audit/:id
// @desc    Get specific audit log
// @access  Users with audit or activity_logs permissions
router.get(
  '/audit/:id',
  [
    checkPermissions(
      'crm.system.audit_read',
      'crm.system.audit_read_all',
      'crm.system.activity_logs_read',
      'crm.system.activity_logs_read_all',
      'crm.system.activity_logs_view_details',
      'system.audit.read',
      'system.audit.read_all'
    )
  ],
  reportController.getUserActivityReportByLogId
);

// @route   POST /api/admin/reports/activity-logs
// @desc    create activity logs
// @access  Authenticated user (removed admin role check as these logs have to be added on every user action)
router.post('/activity-logs', [], reportController.createUserActivityLog)

// @route   GET /api/admin/reports/my-activity
// @desc    Get current user's activity logs
// @access  Authenticated user
router.get(
  '/my-activity',
  [],
  reportController.getMyActivityLogs
);

// @route   GET /api/admin/reports/user-activity/:userId
// @desc    Get activity logs for a specific user
// @access  Users with user_activity_read permissions
router.get(
  '/user-activity/:userId',
  [
    checkPermissions(
      'crm.system.user_activity_read',
      'crm.system.user_activity_read_all',
      'crm.system.activity_logs_read',
      'crm.system.activity_logs_read_all',
      'system.user_activity.read',
      'system.user_activity.read_all'
    )
  ],
  reportController.getUserActivityLogs
);

// @route   GET /api/admin/reports/test-permissions
// @desc    Test route to verify permissions are working
// @access  Authenticated user
router.get(
  '/test-permissions',
  [],
  (req, res) => {
    try {
      const userInfo = {
        id: req.user?.id,
        role: req.user?.role,
        tokenType: req.user?.tokenType,
        permissionsCount: req.user?.permissions?.length || 0,
        permissions: req.user?.permissions || [],
        permissionsSample: req.user?.permissions?.slice(0, 10) || []
      };

      console.log('🔍 Test permissions route called:', userInfo);

      res.json({
        success: true,
        message: 'Permissions test route working',
        user: userInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Test permissions route error:', error);
      res.status(500).json({
        success: false,
        message: 'Error in test permissions route',
        error: error.message
      });
    }
  }
);

// @route   GET /api/admin/reports/debug-activity-logs
// @desc    Debug endpoint to check activity logs in database
// @access  Authenticated user
router.get(
  '/debug-activity-logs',
  [],
  async (req, res) => {
    try {
      console.log('🔍 Debug activity logs endpoint called');

      const ActivityLog = (await import('../../../models/ActivityLog.js')).default;
      const totalLogs = await ActivityLog.countDocuments();
      console.log('📊 Total activity logs in database:', totalLogs);

      let response = {
        totalLogs,
        message: 'No activity logs found'
      };

      if (totalLogs > 0) {
        // Get recent logs
        const recentLogs = await ActivityLog.find()
          .sort({ createdAt: -1 })
          .limit(5)
          .select('orgCode userId action entityType entityId createdAt');

        // Get logs by orgCode
        const orgCodeCounts = await ActivityLog.aggregate([
          { $group: { _id: '$orgCode', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);

        // Check specific orgCode from query
        const { orgCode } = req.query;
        let specificOrgLogs = [];
        if (orgCode) {
          specificOrgLogs = await ActivityLog.find({ orgCode })
            .sort({ createdAt: -1 })
            .limit(3)
            .select('orgCode userId action entityType entityId createdAt');
        }

        response = {
          totalLogs,
          recentLogs: recentLogs.map(log => log.toObject()),
          orgCodeCounts,
          specificOrgLogs: specificOrgLogs.map(log => log.toObject()),
          message: 'Activity logs found'
        };

        console.log('📋 Debug response:', JSON.stringify(response, null, 2));
      }

      res.json(response);
    } catch (error) {
      console.error('❌ Debug activity logs error:', error);
      res.status(500).json({
        success: false,
        message: 'Error in debug activity logs',
        error: error.message
      });
    }
  }
);

export default router;