import express from 'express';
const router = express.Router();
import wrapperController from '../controllers/wrapperController.js';

/**
 * Wrapper API Routes
 * Provides REST endpoints for CRM consumers
 */

// User profile and organization routes
router.get('/users/:userId/profile', wrapperController.getComprehensiveUserProfile);
router.get('/organizations/:orgCode/hierarchy', wrapperController.getOrganizationHierarchy);

// Tenant routes
router.get('/tenants/:tenantId/settings', wrapperController.getTenantSettings);
router.get('/tenants/:tenantId/info', wrapperController.getTenantInfo);
router.get('/tenants/:tenantId/organizations', wrapperController.getOrganizations);
router.get('/tenants/:tenantId/roles', wrapperController.getRoles);

// Tenant data synchronization routes
router.post('/tenants/:tenantId/sync', wrapperController.syncTenantData);
router.get('/tenants/:tenantId/sync/status', wrapperController.getTenantSyncStatus);
router.get('/data-requirements', wrapperController.getDataRequirements);

// User management routes
router.get('/tenants/:tenantId/users/active', wrapperController.getActiveUsers);
router.get('/tenants/:tenantId/users/permissions', wrapperController.getUserPermissions);

// Credit and operation configuration routes
router.get('/credits/configurations', wrapperController.getCreditConfigurations);
router.get('/operations/:operationCode/config', wrapperController.getOperationConfig);

// Activity publishing route
router.post('/activities/publish', wrapperController.publishActivity);

// Organization assignment webhook
router.post('/webhooks/organization-assignments', wrapperController.handleOrganizationAssignmentWebhook);

// Test endpoint to publish a test event
router.post('/test/organization-assignment-event', async (req, res) => {
  try {
    console.log('🧪 Publishing test organization assignment event...');

    const testEvent = {
      assignmentId: `test_${Date.now()}`,
      userId: 'test-user-123',
      organizationId: 'test-org-456',
      assignmentType: 'test',
      isActive: true,
      priority: 1,
      assignedBy: 'test-admin'
    };

    // Use the webhook handler directly
    await wrapperController.handleOrganizationAssignmentWebhook({
      body: {
        event: 'organization.assignment.created',
        tenantId: 'test-tenant',
        data: testEvent
      }
    }, res);

  } catch (error) {
    console.error('❌ Error in test endpoint:', error);
    res.status(500).json({ error: 'Test failed' });
  }
});

// Consumer metrics route
router.get('/metrics/consumers', wrapperController.getConsumerMetrics);

export default router;
