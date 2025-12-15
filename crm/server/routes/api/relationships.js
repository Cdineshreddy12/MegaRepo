// =============================================================================
// RELATIONSHIP SERVICE API ROUTES
// Exposes relationship service methods as REST endpoints
// =============================================================================

import express from 'express';
import RelationshipService from '../../services/relationshipService.js';

const router = express.Router();

// =============================================================================
// USER RELATIONSHIP ENDPOINTS
// =============================================================================

/**
 * Get user's effective permissions
 * GET /api/relationships/permissions?userId=xxx&tenantId=yyy
 */
router.get('/permissions', async (req, res) => {
  try {
    const { userId, tenantId } = req.query;

    if (!userId || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'userId and tenantId are required'
      });
    }

    const permissions = await RelationshipService.getUserPermissions(tenantId, userId);

    res.json({
      success: true,
      data: permissions,
      count: permissions.length
    });
  } catch (error) {
    console.error('Error getting user permissions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user permissions',
      error: error.message
    });
  }
});

/**
 * Check if user has specific permission
 * GET /api/relationships/has-permission?userId=xxx&tenantId=yyy&permission=zzz
 */
router.get('/has-permission', async (req, res) => {
  try {
    const { userId, tenantId, permission } = req.query;

    if (!userId || !tenantId || !permission) {
      return res.status(400).json({
        success: false,
        message: 'userId, tenantId, and permission are required'
      });
    }

    const hasPermission = await RelationshipService.hasPermission(tenantId, userId, permission);

    res.json({
      success: true,
      data: { hasPermission }
    });
  } catch (error) {
    console.error('Error checking permission:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check permission',
      error: error.message
    });
  }
});

/**
 * Check if user has role in entity
 * GET /api/relationships/has-role?userId=xxx&tenantId=yyy&entityId=zzz&roleId=aaa
 */
router.get('/has-role', async (req, res) => {
  try {
    const { userId, tenantId, entityId, roleId } = req.query;

    if (!userId || !tenantId || !entityId || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'userId, tenantId, entityId, and roleId are required'
      });
    }

    const hasRole = await RelationshipService.hasRoleInEntity(tenantId, userId, entityId, roleId);

    res.json({
      success: true,
      data: { hasRole }
    });
  } catch (error) {
    console.error('Error checking role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check role',
      error: error.message
    });
  }
});

/**
 * Check if user is member of entity
 * GET /api/relationships/is-member?userId=xxx&tenantId=yyy&entityId=zzz
 */
router.get('/is-member', async (req, res) => {
  try {
    const { userId, tenantId, entityId } = req.query;

    if (!userId || !tenantId || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'userId, tenantId, and entityId are required'
      });
    }

    const isMember = await RelationshipService.isMemberOfEntity(tenantId, userId, entityId);

    res.json({
      success: true,
      data: { isMember }
    });
  } catch (error) {
    console.error('Error checking membership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check membership',
      error: error.message
    });
  }
});

// =============================================================================
// ORGANIZATION HIERARCHY ENDPOINTS
// =============================================================================

/**
 * Get user's accessible entities
 * GET /api/relationships/entities?userId=xxx&tenantId=yyy
 */
router.get('/entities', async (req, res) => {
  try {
    const { userId, tenantId } = req.query;

    if (!userId || !tenantId) {
      return res.status(400).json({
        success: false,
        message: 'userId and tenantId are required'
      });
    }

    const entities = await RelationshipService.getUserAccessibleEntities(tenantId, userId);

    res.json({
      success: true,
      data: entities,
      count: entities.length
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
 * Get entity hierarchy path
 * GET /api/relationships/entity-hierarchy?tenantId=xxx&entityId=yyy
 */
router.get('/entity-hierarchy', async (req, res) => {
  try {
    const { tenantId, entityId } = req.query;

    if (!tenantId || !entityId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and entityId are required'
      });
    }

    const hierarchy = await RelationshipService.getEntityHierarchyPath(tenantId, entityId);

    res.json({
      success: true,
      data: hierarchy,
      count: hierarchy.length
    });
  } catch (error) {
    console.error('Error getting entity hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get entity hierarchy',
      error: error.message
    });
  }
});

/**
 * Get entity tree (recursive descendants)
 * GET /api/relationships/entity-tree?tenantId=xxx&rootEntityId=yyy
 */
router.get('/entity-tree', async (req, res) => {
  try {
    const { tenantId, rootEntityId } = req.query;

    if (!tenantId || !rootEntityId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and rootEntityId are required'
      });
    }

    const tree = await RelationshipService.getEntityTree(tenantId, rootEntityId);

    res.json({
      success: true,
      data: tree,
      count: tree.length
    });
  } catch (error) {
    console.error('Error getting entity tree:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get entity tree',
      error: error.message
    });
  }
});

/**
 * Display organization hierarchy (for debugging)
 * GET /api/relationships/hierarchy-display?tenantId=xxx
 */
router.get('/hierarchy-display', async (req, res) => {
  try {
    const { tenantId } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId is required'
      });
    }

    const result = await RelationshipService.displayOrganizationHierarchy(tenantId);

    res.json({
      success: result.success,
      data: result,
      message: result.success ? 'Hierarchy displayed successfully' : result.error
    });
  } catch (error) {
    console.error('Error displaying hierarchy:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to display hierarchy',
      error: error.message
    });
  }
});

// =============================================================================
// CREDIT MANAGEMENT ENDPOINTS
// =============================================================================

/**
 * Check credit availability for operation
 * GET /api/relationships/check-credits?userId=xxx&tenantId=yyy&operationType=zzz&requiredCredits=123
 */
router.get('/check-credits', async (req, res) => {
  try {
    const { userId, tenantId, operationType, requiredCredits = 1 } = req.query;

    if (!userId || !tenantId || !operationType) {
      return res.status(400).json({
        success: false,
        message: 'userId, tenantId, and operationType are required'
      });
    }

    const creditCheck = await RelationshipService.checkCredits(
      tenantId,
      userId,
      operationType,
      parseInt(requiredCredits)
    );

    res.json({
      success: true,
      data: creditCheck
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check credits',
      error: error.message
    });
  }
});

/**
 * Consume credits for operation
 * POST /api/relationships/consume-credits
 */
router.post('/consume-credits', async (req, res) => {
  try {
    const {
      userId,
      tenantId,
      operationType,
      creditsUsed,
      operationDetails = {}
    } = req.body;

    if (!userId || !tenantId || !operationType || creditsUsed === undefined) {
      return res.status(400).json({
        success: false,
        message: 'userId, tenantId, operationType, and creditsUsed are required'
      });
    }

    const success = await RelationshipService.consumeCredits(
      tenantId,
      userId,
      operationType,
      parseInt(creditsUsed),
      operationDetails
    );

    res.json({
      success: success,
      message: success ? 'Credits consumed successfully' : 'Failed to consume credits'
    });
  } catch (error) {
    console.error('Error consuming credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to consume credits',
      error: error.message
    });
  }
});

// =============================================================================
// ACTIVITY LOGGING ENDPOINTS
// =============================================================================

/**
 * Get user activity summary
 * GET /api/relationships/user-activity?tenantId=xxx&userId=yyy&startDate=zzz&endDate=aaa
 */
router.get('/user-activity', async (req, res) => {
  try {
    const { tenantId, userId, startDate, endDate } = req.query;

    if (!tenantId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId and userId are required'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const activities = await RelationshipService.getUserActivitySummary(tenantId, userId, start, end);

    res.json({
      success: true,
      data: activities,
      count: activities.length,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error getting user activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user activity',
      error: error.message
    });
  }
});

/**
 * Get tenant activity summary
 * GET /api/relationships/tenant-activity?tenantId=xxx&startDate=yyy&endDate=zzz
 */
router.get('/tenant-activity', async (req, res) => {
  try {
    const { tenantId, startDate, endDate } = req.query;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId is required'
      });
    }

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const activities = await RelationshipService.getTenantActivitySummary(tenantId, start, end);

    res.json({
      success: true,
      data: activities,
      count: activities.length,
      period: { start, end }
    });
  } catch (error) {
    console.error('Error getting tenant activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tenant activity',
      error: error.message
    });
  }
});

export default router;
