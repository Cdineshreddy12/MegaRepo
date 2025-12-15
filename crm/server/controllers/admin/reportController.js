import { validationResult } from "express-validator";
import mongoose from "mongoose";
import ActivityLog from "../../models/ActivityLog.js";
import UserProfile from "../../models/UserProfile.js";
import { getEffectiveUser } from "../../utils/authHelpers.js";
import { hasAnyPermission } from "../../middleware/checkPermissions.js";

export const getUserActivityReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Enforce tenant scoping unless super_admin with explicit override
    if (req.tenant?.orgCode) {
      query.orgCode = req.tenant.orgCode;
    }

    const activities = await ActivityLog.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    const report = activities.reduce((acc, activity) => {
      const userId = activity.userId._id.toString();
      if (!acc[userId]) {
        acc[userId] = {
          userId,
          userName: `${activity.userId.firstName} ${activity.userId.lastName}`,
          activities: [],
          totalActions: 0,
        };
      }
      acc[userId].activities.push(activity);
      acc[userId].totalActions++;
      return acc;
    }, {});

    res.json(Object.values(report));
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getUserActivityReportById = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    const query = { userId: id };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Enforce tenant scoping
    if (req.tenant?.orgCode) {
      query.orgCode = req.tenant.orgCode;
    }

    const activities = await ActivityLog.find(query)
      .populate("userId", "firstName lastName email")
      .sort({ createdAt: -1 });

    res.json(activities);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getSystemUsageReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    // Enforce tenant scoping
    if (req.tenant?.orgCode) {
      query.orgCode = req.tenant.orgCode;
    }

    const activities = await ActivityLog.find(query).sort({ createdAt: -1 });

    const report = {
      totalActivities: activities.length,
      activitiesByType: {},
      activitiesByAction: {},
      activitiesByUser: {},
    };

    activities.forEach((activity) => {
      // Count by entity type
      report.activitiesByType[activity.entityType] =
        (report.activitiesByType[activity.entityType] || 0) + 1;

      // Count by action
      report.activitiesByAction[activity.action] =
        (report.activitiesByAction[activity.action] || 0) + 1;

      // Count by user
      report.activitiesByUser[activity.userId] =
        (report.activitiesByUser[activity.userId] || 0) + 1;
    });

    res.json(report);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    console.log('🔍 getAuditLogs called by user:', {
      userId: req.user?.id,
      userRole: req.user?.role,
      permissionsCount: req.user?.permissions?.length || 0,
      requestedUserId: req.query.userId
    });

    const userPermissions = req.user?.permissions || [];
    const currentUserId = req.user?.id || req.user?.userId;
    const requestedUserId = req.query.userId;
    const isRequestingOwnLogs = requestedUserId === 'me' || requestedUserId === currentUserId;

    // Check for audit or activity_logs permissions
    const requiredPermissions = [
      'crm.system.audit_read',
      'crm.system.audit_read_all',
      'crm.system.activity_logs_read',
      'crm.system.activity_logs_read_all',
      'system.audit.read',
      'system.audit.read_all'
    ];

    const hasAuditAccess = hasAnyPermission(userPermissions, requiredPermissions);
    
    // Allow users to view their own logs even without audit permissions
    if (!hasAuditAccess && !isRequestingOwnLogs) {
      console.log('❌ Audit/Activity logs access denied for user:', {
        userId: req.user?.id,
        userRole: req.user?.role,
        requestedUserId,
        isRequestingOwnLogs,
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10)
      });

      return res.status(403).json({
        message: "Access denied. Insufficient privileges. You can only view your own activity logs.",
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10),
        error: 'INSUFFICIENT_AUDIT_PERMISSIONS'
      });
    }

    if (isRequestingOwnLogs) {
      console.log('✅ User requesting own logs - allowing access without audit permissions');
    } else {
      console.log('✅ Audit access granted for user:', req.user?.id);
    }

    const { startDate, endDate, entityType, userId, entityId } = req.query;
    const query = {};

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (entityType) {
      query.entityType = entityType;
    }

    // Check if user has read_all permission or restrict to their own logs
    const hasReadAllPermission = hasAnyPermission(userPermissions, [
      'crm.system.audit_read_all',
      'crm.system.activity_logs_read_all',
      'system.audit.read_all'
    ]);

    console.log('🔐 Permission check for audit logs:');
    console.log('  hasReadAllPermission:', hasReadAllPermission);
    console.log('  userRole:', req.user?.role);
    console.log('  currentUserId:', currentUserId);
    console.log('  requestedUserId:', requestedUserId);
    console.log('  isRequestingOwnLogs:', isRequestingOwnLogs);

    // Handle userId filter - users can always see their own logs
    if (userId) {
      if (userId === 'me') {
        // User requesting their own logs
        query.userId = currentUserId;
        console.log('🔒 User requested own logs (me), filtering by userId:', currentUserId);
      } else if (hasReadAllPermission) {
        // Admin with read_all permission - allow viewing any user's logs
        query.userId = userId;
        console.log('✅ Admin user, allowing userId filter:', userId);
      } else if (userId === currentUserId) {
        // User viewing their own logs by userId
        query.userId = currentUserId;
        console.log('✅ User viewing own logs by userId:', currentUserId);
      } else {
        // Non-admin user trying to view someone else's logs - restrict to own logs
        query.userId = currentUserId;
        console.log('🔒 Non-admin user cannot view other users logs, restricting to own:', currentUserId);
      }
    } else if (!hasReadAllPermission) {
      // No userId specified and user doesn't have read_all - restrict to own logs
      const role = (req.user?.role || '').toLowerCase();
      if (role !== 'admin' && role !== 'super_admin') {
        query.userId = currentUserId;
        console.log('🔒 Restricting audit logs to user own logs:', currentUserId);
      } else {
        console.log('✅ User has admin/super_admin role, not restricting to own logs');
      }
    } else {
      console.log('✅ User has read_all permission, can see all logs');
    }

    // Organization filtering - prioritize entityId over tenant orgCode
    let effectiveOrgCode = entityId || req.tenant?.orgCode || req.user?.orgCode;
    
    // If entityId looks like an ObjectId, try to resolve it to orgCode
    if (effectiveOrgCode && /^[a-f\d]{24}$/i.test(effectiveOrgCode)) {
      console.log(`📋 entityId ${effectiveOrgCode} looks like ObjectId, looking up organization`);
      try {
        const Organization = (await import('../../models/Organization.js')).default;
        const mongoose = (await import('mongoose')).default;
        const orgData = await Organization.findById(effectiveOrgCode).select('orgCode orgName').lean();
        if (orgData && orgData.orgCode) {
          effectiveOrgCode = orgData.orgCode;
          console.log(`✅ Resolved entityId to orgCode: ${effectiveOrgCode}`);
        } else {
          console.warn(`⚠️ Could not find organization with _id: ${effectiveOrgCode}, using as-is`);
        }
      } catch (lookupError) {
        console.error(`❌ Error looking up orgCode for entityId ${effectiveOrgCode}:`, lookupError.message);
        // Keep original entityId as fallback
      }
    }
    
    if (effectiveOrgCode) {
      query.orgCode = effectiveOrgCode;
      console.log('🏢 Filtering audit logs by organization:', effectiveOrgCode, entityId ? '(switched)' : '(tenant default)');
    }

    console.log('🔍 Audit logs query parameters:');
    console.log('  entityId:', entityId);
    console.log('  tenant.orgCode:', req.tenant?.orgCode);
    console.log('  effectiveOrgCode:', effectiveOrgCode);
    console.log('🔍 Final audit logs query:', JSON.stringify(query, null, 2));

    let logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${logs.length} activity logs matching the query`);

    // If no logs found with orgCode filter, try without it for debugging
    if (logs.length === 0 && query.orgCode) {
      console.log('⚠️ No logs found with orgCode filter, trying without orgCode filter for debugging...');
      const queryWithoutOrgCode = { ...query };
      delete queryWithoutOrgCode.orgCode;

      const logsWithoutOrgFilter = await ActivityLog.find(queryWithoutOrgCode)
        .sort({ createdAt: -1 })
        .limit(5); // Just get a few for debugging

      console.log(`📊 Found ${logsWithoutOrgFilter.length} logs without orgCode filter`);
      if (logsWithoutOrgFilter.length > 0) {
        console.log('📋 Sample logs without orgCode filter:');
        logsWithoutOrgFilter.forEach((log, i) => {
          console.log(`  ${i+1}. orgCode: ${log.orgCode}, userId: ${log.userId}, action: ${log.action}, entityType: ${log.entityType}`);
        });
      }
    }

    // If still no logs found, try to find any logs for this user at all
    if (logs.length === 0 && query.userId) {
      console.log('⚠️ No logs found for user, checking if user has any logs at all...');
      const anyUserLogs = await ActivityLog.find({ userId: query.userId })
        .sort({ createdAt: -1 })
        .limit(3);

      console.log(`📊 User ${query.userId} has ${anyUserLogs.length} total logs in database`);
      if (anyUserLogs.length > 0) {
        console.log('📋 User logs (any org):');
        anyUserLogs.forEach((log, i) => {
          console.log(`  ${i+1}. orgCode: ${log.orgCode}, userId: ${log.userId}, action: ${log.action}, entityType: ${log.entityType}`);
        });
      }
    }

    if (logs.length > 0) {
      console.log('📋 Sample log details:');
      logs.slice(0, 3).forEach((log, i) => {
        console.log(`  ${i+1}. orgCode: ${log.orgCode}, userId: ${log.userId}, action: ${log.action}, entityType: ${log.entityType}`);
      });
    }

    // Manually populate user data since userId is stored as string, not ObjectId reference
    const userIds = [...new Set(logs.map(log => log.userId).filter(id => id))];
    
    // Get orgCode/tenantId from multiple possible sources
    const orgCode = req.tenant?.orgCode || req.user?.tenantId || req.tenantId || req.user?.orgCode;
    console.log('🔍 Using orgCode for audit log user lookup:', orgCode);
    console.log('🔍 Looking up user IDs:', userIds);
    
    const userProfiles = await UserProfile.find({
      tenantId: orgCode, // Filter by tenant/organization
      $or: [
        { _id: { $in: userIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
        { userId: { $in: userIds } },
        { employeeCode: { $in: userIds } }
      ]
    }).select('userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id');
    
    console.log(`✅ Found ${userProfiles.length} user profiles for ${userIds.length} user IDs`);

    // Create user map for quick lookup
    const userMap = new Map();
    userProfiles.forEach(profile => {
      // Create user object compatible with expected format
      const userObj = {
        _id: profile._id,
        firstName: profile.personalInfo?.firstName || 'Unknown',
        lastName: profile.personalInfo?.lastName || 'User',
        email: profile.personalInfo?.email || '',
        role: 'user', // Default role, could be enhanced later
        userId: profile.userId,
        employeeCode: profile.employeeCode
      };

      userMap.set(profile._id.toString(), userObj);
      if (profile.userId) userMap.set(profile.userId, userObj);
      if (profile.employeeCode) userMap.set(profile.employeeCode, userObj);
      if (profile.personalInfo?.email) userMap.set(String(profile.personalInfo.email).toLowerCase(), userObj);
    });

    // Populate user data in logs
    const populatedLogs = logs.map(log => {
      const userData = userMap.get(log.userId);
      const logObj = log.toObject();

      if (userData) {
        logObj.user = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role
        };
      } else {
        // Create synthetic user data if user not found
        logObj.user = {
          firstName: 'Unknown',
          lastName: 'User',
          email: '',
          role: 'unknown'
        };
      }

      return logObj;
    });

    console.log(`✅ Audit logs retrieved successfully: ${populatedLogs.length} logs`);

    // Return the data array directly to match frontend expectations
    res.json(populatedLogs);

  } catch (err) {
    console.error('❌ Error in getAuditLogs:', err);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching audit logs",
      error: err.message
    });
  }
};

// Authenticated users can view their own activity logs
export const getMyActivityLogs = async (req, res) => {
  try {
    const { startDate, endDate, entityType, selectedOrg } = req.query;
    const currentUserId = req.user?.userId || req.user?.id;

    if (!currentUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const query = { userId: String(currentUserId) };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (entityType) {
      query.entityType = entityType;
    }

    // Organization filtering - prioritize selectedOrg/entityId over tenant orgCode for my activity logs
    let effectiveOrgCode = selectedOrg || req.query.entityId || req.tenant?.orgCode || req.user?.orgCode;
    
    // If entityId looks like an ObjectId, try to resolve it to orgCode
    if (effectiveOrgCode && /^[a-f\d]{24}$/i.test(effectiveOrgCode)) {
      console.log(`📋 entityId ${effectiveOrgCode} looks like ObjectId, looking up organization`);
      try {
        const Organization = (await import('../../models/Organization.js')).default;
        const mongoose = (await import('mongoose')).default;
        const orgData = await Organization.findById(effectiveOrgCode).select('orgCode orgName').lean();
        if (orgData && orgData.orgCode) {
          effectiveOrgCode = orgData.orgCode;
          console.log(`✅ Resolved entityId to orgCode: ${effectiveOrgCode}`);
        } else {
          console.warn(`⚠️ Could not find organization with _id: ${effectiveOrgCode}, using as-is`);
        }
      } catch (lookupError) {
        console.error(`❌ Error looking up orgCode for entityId ${effectiveOrgCode}:`, lookupError.message);
        // Keep original entityId as fallback
      }
    }
    
    if (effectiveOrgCode) {
      query.orgCode = effectiveOrgCode;
      console.log('🏢 Filtering my activity logs by organization:', effectiveOrgCode, selectedOrg ? '(switched)' : '(tenant default)');
    }

    console.log('🔍 My activity logs query parameters:');
    console.log('  currentUserId:', currentUserId);
    console.log('  selectedOrg:', selectedOrg);
    console.log('  tenant.orgCode:', req.tenant?.orgCode);
    console.log('  effectiveOrgCode:', effectiveOrgCode);
    console.log('🔍 Final my activity logs query:', JSON.stringify(query, null, 2));

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 });

    console.log(`📊 Found ${logs.length} my activity logs matching the query`);

    if (logs.length > 0) {
      console.log('📋 Sample my log details:');
      logs.slice(0, 3).forEach((log, i) => {
        console.log(`  ${i+1}. orgCode: ${log.orgCode}, userId: ${log.userId}, action: ${log.action}, entityType: ${log.entityType}`);
      });
    }

    // Disable caching for dynamic audit data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching my activity logs",
      error: err.message
    });
  }
};

export const getUserActivityReportByLogId = async (req, res) => {
  try {
    const { id } = req.params;
    const log = await ActivityLog.findById(id);
    if (!log) {
      return res.status(404).json({ message: "Activity log not found" });
    }
    res.json(log);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
};

export const createUserActivityLog = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Use authHelpers to get user info (works for both external and local auth)
    const user = await getEffectiveUser(req);

    if (!user) {
      return res.status(401).json({ message: "User not found or unauthorized" });
    }

    // Get the current entityId from query params (set by API interceptor) or tenant/user
    let orgCode = req.query.entityId || req.tenant?.orgCode || req.user?.orgCode;

    // If entityId looks like an ObjectId, try to resolve it to orgCode
    if (orgCode && /^[a-f\d]{24}$/i.test(orgCode)) {
      console.log(`📋 entityId ${orgCode} looks like ObjectId, looking up organization`);
      try {
        const Organization = (await import('../../models/Organization.js')).default;
        const mongoose = (await import('mongoose')).default;
        const orgData = await Organization.findById(orgCode).select('orgCode orgName').lean();
        if (orgData && orgData.orgCode) {
          orgCode = orgData.orgCode;
          console.log(`✅ Resolved entityId to orgCode: ${orgCode}`);
        } else {
          console.warn(`⚠️ Could not find organization with _id: ${orgCode}, using as-is`);
        }
      } catch (lookupError) {
        console.error(`❌ Error looking up orgCode for entityId ${orgCode}:`, lookupError.message);
        // Keep original entityId as fallback
      }
    }

    console.log(`📝 Creating activity log with orgCode: ${orgCode || 'null'}`);

    const activityLogData = {
      ...req.body,
      userId: req.user.id || req.user.userId,
      // Use resolved orgCode for organization context
      orgCode: orgCode || null,
      ...(user
        ? {
            user: {
              firstName: user?.firstName || 'External',
              lastName: user?.lastName || 'User',
              email: user?.email || 'external@user.com',
              role: user?.role || 'user',
            },
          }
        : {}),
    };

    const activityLog = new ActivityLog(activityLogData);
    await activityLog.save();

    console.log(`✅ Activity log created successfully with id: ${activityLog._id}, orgCode: ${activityLog.orgCode}`);

    res.status(201).json(activityLog);
  } catch (err) {
    console.error('❌ Error creating activity log:', err);
    res.status(500).json({ 
      message: "Server Error",
      error: err.message 
    });
  }
};

// Get activity logs for a specific user
export const getUserActivityLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate, action, entityType, limit = 50, page = 1 } = req.query;

    console.log('🔍 getUserActivityLogs called:', {
      userId,
      requestedBy: req.user?.id,
      permissionsCount: req.user?.permissions?.length
    });

    // Permission check
    const userPermissions = req.user?.permissions || [];
    const hasReadAllPermission = hasAnyPermission(userPermissions, [
      'crm.system.user_activity_read_all',
      'crm.system.activity_logs_read_all',
      'system.user_activity.read_all'
    ]);

    const hasReadOwnPermission = hasAnyPermission(userPermissions, [
      'crm.system.user_activity_read',
      'crm.system.activity_logs_read',
      'system.user_activity.read'
    ]);

    // Check if user can access this userId's logs
    const isOwnLogs = userId === req.user?.id;
    
    if (!isOwnLogs && !hasReadAllPermission) {
      console.log('❌ User lacks permission to view other users\' activity logs');
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view this user\'s activity logs',
        requiredPermission: 'crm.system.user_activity_read_all'
      });
    }

    if (isOwnLogs && !hasReadOwnPermission && !hasReadAllPermission) {
      console.log('❌ User lacks permission to view their own activity logs');
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions to view activity logs',
        requiredPermission: 'crm.system.user_activity_read'
      });
    }

    console.log('✅ Permission check passed:', { isOwnLogs, hasReadAllPermission, hasReadOwnPermission });

    // Build query
    const query = { userId };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (action) {
      query.action = action;
    }

    if (entityType) {
      query.entityType = entityType;
    }

    // Tenant scope
    if (req.tenant?.orgCode) {
      query.orgCode = req.tenant.orgCode;
    }

    console.log('🔍 User activity query:', query);

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await ActivityLog.countDocuments(query);

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Populate user data
    const userProfile = await UserProfile.findOne({
      tenantId: req.tenant?.orgCode,
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(userId) ? userId : null },
        { userId: userId }
      ]
    }).select('userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id');

    const userData = userProfile ? {
      _id: userProfile._id,
      id: userProfile._id.toString(),
      firstName: userProfile.personalInfo?.firstName || 'Unknown',
      lastName: userProfile.personalInfo?.lastName || 'User',
      email: userProfile.personalInfo?.email || '',
      userId: userProfile.userId,
      employeeCode: userProfile.employeeCode
    } : {
      firstName: 'Unknown',
      lastName: 'User',
      email: '',
      role: 'unknown'
    };

    // Add user data to each log
    const populatedLogs = logs.map(log => ({
      ...log.toObject(),
      user: userData
    }));

    console.log(`✅ Found ${logs.length} activity logs for user ${userId}`);

    res.json({
      success: true,
      data: populatedLogs,
      user: userData,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit))
    });

  } catch (error) {
    console.error('❌ Error fetching user activity logs:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user activity logs',
      error: error.message
    });
  }
};

export default {
  getUserActivityReport,
  getUserActivityReportById,
  getSystemUsageReport,
  getAuditLogs,
  getMyActivityLogs,
  getUserActivityReportByLogId,
  createUserActivityLog,
  getUserActivityLogs
};

