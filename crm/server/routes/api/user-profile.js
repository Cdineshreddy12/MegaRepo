// =============================================================================
// USER PROFILE ENDPOINTS
// Complete user profile with all relationship data
// =============================================================================

import express from 'express';
import RelationshipService from '../../services/relationshipService.js';
import { requirePermissions } from '../../middleware/permissions.js';

const router = express.Router();

/**
 * Get complete user profile with all relationship data
 * GET /api/user-profile/me
 */
router.get('/me', requirePermissions(['*']), async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Get comprehensive user data using relationship service
    console.log('🔍 USER PROFILE API: Fetching data for user:', {
      userId: user.userId,
      tenantId: user.tenantId,
      hasOrgAssignments: !!RelationshipService.getUserOrganizationAssignments,
      hasEntityCredits: !!RelationshipService.getUserEntityCredits
    });

    const [
      userRoles,
      userOrgAssignments,
      userEntityCredits,
      staticCreditBreakdown,
      userPermissions,
      accessibleEntities
    ] = await Promise.all([
      RelationshipService.getUserRoles ?
        RelationshipService.getUserRoles(user.tenantId, user.userId) :
        Promise.resolve([]),
      RelationshipService.getUserOrganizationAssignments ?
        RelationshipService.getUserOrganizationAssignments(user.tenantId, user.userId) :
        Promise.resolve([]),
      RelationshipService.getUserEntityCredits ?
        RelationshipService.getUserEntityCredits(user.tenantId, user.userId) :
        Promise.resolve([]),
      RelationshipService.getCreditBreakdown ?
        RelationshipService.getCreditBreakdown(user.tenantId, user.userId) :
        Promise.resolve({ breakdown: [], summary: { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 } }),
      RelationshipService.getUserPermissions(user.tenantId, user.userId || user.externalId || user.employeeCode),
      RelationshipService.getUserAccessibleEntities(user.tenantId, user.userId || user.externalId || user.employeeCode)
    ]);

    console.log('🔍 USER PROFILE API: Fetched data:', {
      userRolesCount: userRoles?.length || 0,
      userOrgAssignmentsCount: userOrgAssignments?.length || 0,
      userEntityCreditsCount: userEntityCredits?.length || 0,
      userPermissionsCount: userPermissions?.length || 0
    });

    // Get real-time credit information from credit system
    let realTimeCreditData = null;
    try {
      // Import the credit controller functions
      const { getUserCredits } = await import('../../controllers/creditController.js');
      // Create a mock request/response to call the credit function
      const mockReq = {
        user: { userId: user.userId },
        tenantId: user.tenantId
      };
      const mockRes = {
        json: (data) => data,
        status: (code) => ({ json: (data) => data })
      };

      const creditResult = await getUserCredits(mockReq, mockRes);
      if (creditResult && creditResult.success) {
        realTimeCreditData = creditResult.data;
      }
    } catch (creditError) {
      console.warn('Could not fetch real-time credit data:', creditError.message);
    }

    // Use real-time credit data if available, otherwise fall back to static data
    const creditBreakdown = realTimeCreditData ? {
      breakdown: [],
      summary: {
        totalAllocated: realTimeCreditData.organizationCredits.allocated,
        totalUsed: realTimeCreditData.organizationCredits.used,
        totalAvailable: realTimeCreditData.organizationCredits.available
      },
      organizationCredits: realTimeCreditData.organizationCredits
      // Removed creditConfigs for cleaner frontend experience
    } : staticCreditBreakdown;

    // Build comprehensive profile
    const profile = {
      // Basic user info
      userId: user.userId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      tokenType: user.tokenType,
      isExternalUser: user.isExternalUser,

      // Tenant context
      tenantId: user.tenantId,
      orgCode: user.orgCode,
      primaryOrganizationId: user.primaryOrganizationId,
      isTenantAdmin: user.isTenantAdmin,

      // Permissions & Roles
      permissions: userPermissions,
      roles: userRoles.map(role => ({
        roleId: role.roleId,
        roleName: role.roleName,
        entityId: role.entityId,
        permissions: role.permissions,
        isActive: role.isActive
      })),
      permissionsCount: userPermissions.length,
      rolesCount: userRoles.length,

      // Organizations
      organizations: accessibleEntities.map(entity => ({
        orgCode: entity.orgCode,
        orgName: entity.orgName,
        level: entity.hierarchy?.level || 0,
        status: entity.status,
        parentId: entity.parentId
      })),
      organizationAssignments: userOrgAssignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        userId: assignment.userId,
        entityId: assignment.entityId,
        entityName: assignment.entityName,
        assignmentType: assignment.assignmentType,
        hierarchy: assignment.hierarchy,
        level: assignment.level,
        isActive: assignment.isActive,
        priority: assignment.priority,
        assignedAt: assignment.assignedAt,
        expiresAt: assignment.expiresAt
      })),
      organizationsCount: accessibleEntities.length,

      // Credit information
      credits: creditBreakdown.summary,
      creditBreakdown: creditBreakdown.breakdown.map(credit => ({
        entityId: credit.entityId,
        allocatedCredits: credit.allocatedCredits,
        usedCredits: credit.usedCredits,
        availableCredits: credit.availableCredits
      })),
      // Real-time credit system data
      organizationCredits: creditBreakdown.organizationCredits,
      // Removed creditConfigs for cleaner frontend experience
      entityCredits: {
        availableEntityCredits: userEntityCredits
      },

      // Profile & Preferences
      profile: user.profile || {},
      preferences: user.preferences || {},

      // Activity summary (last 30 days)
      activitySummary: await getUserActivitySummary(user.tenantId, user.userId || user.externalId || user.employeeCode),

      // System metadata
      lastLoginAt: user.lastLoginAt,
      loginCount: user.loginCount,
      onboardingCompleted: user.onboardingCompleted,
      security: {
        twoFactorEnabled: user.twoFactorEnabled || false,
        accountLocked: user.accountLocked || false
      }
    };

    res.json({
      success: true,
      data: profile,
      message: 'User profile retrieved successfully'
    });

  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
});

/**
 * Get user's role assignments
 * GET /api/user-profile/roles
 */
router.get('/roles', requirePermissions(['*']), async (req, res) => {
  try {
    const { user } = req;

    // This would use the auth service method we created
    const authService = (await import('../../services/authService.js')).default;
    const roles = await authService.getUserRoles(user.tenantId, user.userId);

    res.json({
      success: true,
      data: roles,
      count: roles.length
    });
  } catch (error) {
    console.error('Error getting user roles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user roles',
      error: error.message
    });
  }
});

/**
 * Get user's organization assignments
 * GET /api/user-profile/organizations
 */
router.get('/organizations', requirePermissions(['*']), async (req, res) => {
  try {
    const { user } = req;

    const authService = (await import('../../services/authService.js')).default;
    const assignments = await authService.getUserOrganizationAssignments(user.tenantId, user.userId);

    res.json({
      success: true,
      data: assignments,
      count: assignments.length
    });
  } catch (error) {
    console.error('Error getting user organizations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user organizations',
      error: error.message
    });
  }
});

/**
 * Get user's credit information
 * GET /api/user-profile/credits
 */
router.get('/credits', requirePermissions(['*']), async (req, res) => {
  try {
    const { user } = req;

    const authService = (await import('../../services/authService.js')).default;
    const creditBreakdown = await authService.getCreditBreakdown(user.tenantId, user.userId);

    res.json({
      success: true,
      data: creditBreakdown
    });
  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user credits',
      error: error.message
    });
  }
});

/**
 * Get user's accessible entities with hierarchy
 * GET /api/user-profile/entities
 */
router.get('/entities', requirePermissions(['*']), async (req, res) => {
  try {
    const { user } = req;

    const entities = await RelationshipService.getUserAccessibleEntities(
      user.tenantId,
      user.userId || user.externalId || user.employeeCode
    );

    // Enhance with hierarchy information
    const entitiesWithHierarchy = await Promise.all(
      entities.map(async (entity) => {
        const hierarchy = await RelationshipService.getEntityHierarchyPath(user.tenantId, entity.orgCode);
        return {
          ...entity.toObject(),
          hierarchy: {
            path: hierarchy.map(h => ({ orgCode: h.orgCode, orgName: h.orgName })),
            level: entity.hierarchy?.level || 0,
            isRoot: !entity.parentId
          }
        };
      })
    );

    res.json({
      success: true,
      data: entitiesWithHierarchy,
      count: entitiesWithHierarchy.length
    });
  } catch (error) {
    console.error('Error getting user entities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user entities',
      error: error.message
    });
  }
});

/**
 * Helper function to get user activity summary
 */
async function getUserActivitySummary(tenantId, userId) {
  try {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const endDate = new Date();

    const activities = await RelationshipService.getUserActivitySummary(tenantId, userId, startDate, endDate);

    // Group by operation type
    const summary = activities.reduce((acc, activity) => {
      const type = activity.operationType || 'unknown';
      if (!acc[type]) {
        acc[type] = { count: 0, totalCredits: 0 };
      }
      acc[type].count++;
      acc[type].totalCredits += activity.creditsConsumed || 0;
      return acc;
    }, {});

    return {
      totalActivities: activities.length,
      period: { start: startDate, end: endDate },
      byOperationType: summary
    };
  } catch (error) {
    console.log('Error getting activity summary:', error.message);
    return {
      totalActivities: 0,
      period: null,
      byOperationType: {}
    };
  }
}

export default router;
