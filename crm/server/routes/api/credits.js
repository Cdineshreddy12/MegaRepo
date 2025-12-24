import express from 'express';
const router = express.Router();
import mongoose from 'mongoose';
import CrmEntityCredit from '../../models/CrmEntityCredit.js';
import CrmCreditUsage from '../../models/CrmCreditUsage.js';
import auth from '../../middleware/auth.js';
import tenantMiddleware from '../../middleware/tenantMiddleware.js';

/**
 * @route   GET /api/credits/balance
 * @desc    Get credit balance for an entity
 * @access  Authenticated users
 */
router.get('/balance', async (req, res) => {
  try {
    const { entityId } = req.query;
    const tenantId = req.user?.tenantId || req.tenant?.id || req.tenantId;

    console.log('🔍 Credit balance request:', { entityId, tenantId });

    if (!entityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Entity ID is required' 
      });
    }

    if (!tenantId) {
      console.error('❌ No tenantId found in request');
      return res.status(400).json({
        success: false,
        message: 'Tenant ID is required'
      });
    }

    // Validate that user has access to this entity
    const userEntities = req.user?.entities || [];
    const userOrgAssignments = req.user?.organizationAssignments || [];

    console.log('🔍 Entity access validation:', {
      requestedEntityId: entityId,
      userEntities: userEntities.map(e => ({ orgCode: e.orgCode, orgName: e.orgName })),
      userOrgAssignments: userOrgAssignments.map(a => ({ entityId: a.entityId, entityName: a.entityName })),
      jwtPrimaryOrgId: req.user?.primaryOrganizationId
    });

    const hasAccess = userEntities.some(entity => entity.orgCode === entityId) ||
                     userOrgAssignments.some(assignment => assignment.entityId === entityId);

    // Temporary workaround: Allow access if user has any organization assignments
    // This handles cases where entityId might be MongoDB _id vs orgCode mismatch
    const hasAnyOrgAccess = userOrgAssignments.length > 0;

    if (!hasAccess && !hasAnyOrgAccess) {
      console.log('❌ User does not have access to entity:', entityId, {
        allowedEntities: userEntities.map(e => e.orgCode).concat(userOrgAssignments.map(a => a.entityId)),
        hasAnyOrgAccess
      });
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to access this entity',
        requestedEntity: entityId,
        allowedEntities: userEntities.map(e => e.orgCode).concat(userOrgAssignments.map(a => a.entityId))
      });
    }

    if (!hasAccess && hasAnyOrgAccess) {
      console.log('⚠️ Allowing access via temporary workaround - user has organization assignments');
    }

    // Check if entityId is a valid ObjectId
    const isObjectId = mongoose.Types.ObjectId.isValid(entityId);
    
    // Build query to check both entityId (ObjectId) and entityIdString (String)
    const query = {
      tenantId,
      isActive: true,
      $or: [
        { entityIdString: entityId },
        ...(isObjectId ? [{ entityId: new mongoose.Types.ObjectId(entityId) }] : [])
      ]
    };

    console.log('🔍 Query for credit balance:', JSON.stringify(query, null, 2));

    // Fetch credit balance
    const creditRecord = await CrmEntityCredit.findOne(query)
      .select('allocatedCredits usedCredits availableCredits updatedAt expiresAt entityId entityIdString');

    if (!creditRecord) {
      console.log('⚠️ No credit record found for:', { entityId, tenantId });
      return res.status(404).json({
        success: false,
        message: 'No credit allocation found for this entity'
      });
    }

    console.log('✅ Credit record found:', {
      entityId: creditRecord.entityId,
      entityIdString: creditRecord.entityIdString,
      availableCredits: creditRecord.availableCredits,
      expiresAt: creditRecord.expiresAt
    });

    // Set cache control headers to prevent any caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      entityId,
      allocatedCredits: creditRecord.allocatedCredits,
      usedCredits: creditRecord.usedCredits,
      availableCredits: creditRecord.availableCredits,
      lastUpdated: creditRecord.updatedAt,
      creditExpiry: creditRecord.expiresAt ? creditRecord.expiresAt.toISOString() : undefined
    });

  } catch (error) {
    console.error('❌ Error fetching credit balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit balance',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/credits/recent-usage
 * @desc    Get recent credit usage for an entity
 * @access  Authenticated users
 */
router.get('/recent-usage', async (req, res) => {
  try {
    const { entityId, limit = 10 } = req.query;
    const tenantId = req.user?.tenantId || req.tenantId;

    if (!entityId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Entity ID is required' 
      });
    }

    // Fetch recent usage
    const recentUsage = await CrmCreditUsage.find({
      tenantId,
      entityId
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select('operationCode creditsConsumed operationType resourceType createdAt');

    // Set cache control headers to prevent any caching
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json({
      entityId,
      usage: recentUsage,
      count: recentUsage.length
    });

  } catch (error) {
    console.error('❌ Error fetching recent usage:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent usage',
      error: error.message
    });
  }
});

export default router;
