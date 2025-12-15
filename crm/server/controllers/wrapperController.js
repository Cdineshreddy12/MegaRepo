import Tenant from '../models/Tenant.js';
import UserProfile from '../models/UserProfile.js';
import Organization from '../models/Organization.js';
import Activity from '../models/Activity.js';
import { getConsumerManager } from '../services/CRMConsumerManager.js';
import tenantDataSyncService from '../services/tenantDataSyncService.js';
import redisStreamsService from '../services/redisStreamsService.js';

/**
 * Wrapper API Controller
 * Provides data to CRM consumers via REST API
 */
class WrapperController {
  constructor() {
    this.consumerManager = getConsumerManager();
  }

  /**
   * Get comprehensive user profile
   */
  async getComprehensiveUserProfile(req, res) {
    try {
      const { userId } = req.params;
      const { tenantId } = req.headers;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Get user profile from database
      const userProfile = await UserProfile.findOne({
        tenantId,
        userId
      }).lean();

      if (!userProfile) {
        return res.status(404).json({ error: 'User profile not found' });
      }

      // Get organization hierarchy
      const organization = await Organization.findOne({
        tenantId,
        orgCode: userProfile.organization.orgCode
      }).lean();

      // Get role definitions
      const roleDefinitions = await this.getRoleDefinitions(tenantId, userProfile.roles);

      // Build comprehensive profile
      const comprehensiveProfile = {
        ...userProfile,
        organization: {
          ...userProfile.organization,
          hierarchy: organization?.hierarchy || userProfile.organization.hierarchy
        },
        roleDefinitions,
        lastSyncedAt: new Date().toISOString()
      };

      res.json(comprehensiveProfile);
    } catch (error) {
      console.error('❌ Error getting comprehensive user profile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organization hierarchy
   */
  async getOrganizationHierarchy(req, res) {
    try {
      const { orgCode } = req.params;
      const { tenantId } = req.headers;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const organization = await Organization.findOne({
        tenantId,
        orgCode
      }).lean();

      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      // Get full hierarchy tree
      const hierarchy = await this.buildHierarchyTree(tenantId, organization);

      res.json(hierarchy);
    } catch (error) {
      console.error('❌ Error getting organization hierarchy:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tenant settings
   */
  async getTenantSettings(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId }).lean();

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Get root organization info dynamically
      const rootOrg = await tenant.getRootOrganization();

      res.json({
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
        status: tenant.status,
        settings: tenant.settings,
        subscription: tenant.subscription,
        organization: rootOrg ? {
          orgCode: rootOrg.orgCode,
          orgName: rootOrg.orgName
        } : null,
        hierarchy: rootOrg ? {
          level: rootOrg.hierarchy?.level || 0,
          path: rootOrg.hierarchy?.path || [rootOrg.orgCode]
        } : { level: 0, path: [tenant.tenantId] }
      });
    } catch (error) {
      console.error('❌ Error getting tenant settings:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get credit configurations
   */
  async getCreditConfigurations(req, res) {
    try {
      const { tenantId } = req.params;

      // This would typically come from a credit configuration service
      // For now, return default configurations
      const creditConfigs = [
        {
          operationCode: 'crm.leads.create',
          operationName: 'Create Lead',
          creditCost: 1,
          category: 'lead_management',
          riskLevel: 'low',
          updatedAt: new Date().toISOString()
        },
        {
          operationCode: 'crm.leads.update',
          operationName: 'Update Lead',
          creditCost: 1,
          category: 'lead_management',
          riskLevel: 'low',
          updatedAt: new Date().toISOString()
        },
        {
          operationCode: 'crm.opportunities.create',
          operationName: 'Create Opportunity',
          creditCost: 2,
          category: 'opportunity_management',
          riskLevel: 'medium',
          updatedAt: new Date().toISOString()
        },
        {
          operationCode: 'crm.accounts.create',
          operationName: 'Create Account',
          creditCost: 1,
          category: 'account_management',
          riskLevel: 'low',
          updatedAt: new Date().toISOString()
        },
        {
          operationCode: 'crm.activities.log',
          operationName: 'Log Activity',
          creditCost: 0.5,
          category: 'activity_tracking',
          riskLevel: 'low',
          updatedAt: new Date().toISOString()
        }
      ];

      res.json(creditConfigs);
    } catch (error) {
      console.error('❌ Error getting credit configurations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get active users
   */
  async getActiveUsers(req, res) {
    try {
      const { tenantId } = req.params;

      const activeUsers = await UserProfile.find({
        tenantId,
        'status.isActive': true
      }).select('userId employeeCode personalInfo organization status lastSyncedAt').lean();

      const users = activeUsers.map(user => ({
        userId: user.userId,
        employeeCode: user.employeeCode,
        personalInfo: user.personalInfo,
        organization: {
          orgCode: 'b0a6e370-c1e5-43d1-94e0-55ed792274c4', // Default to tenant org for now
          department: '',
          designation: ''
        },
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));

      res.json(users);
    } catch (error) {
      console.error('❌ Error getting active users:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(req, res) {
    try {
      const { tenantId } = req.params;

      const userProfiles = await UserProfile.find({
        tenantId,
        'status.isActive': true
      }).select('userId permissions roles').lean();

      const userPermissions = userProfiles.map(user => ({
        userId: user.userId,
        permissions: user.permissions?.effective || [],
        roles: user.roles?.filter(role => role.isActive).map(role => ({
          roleId: role.roleId,
          roleName: role.roleName,
          permissions: role.permissions
        })) || []
      }));

      res.json(userPermissions);
    } catch (error) {
      console.error('❌ Error getting user permissions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get tenant info
   */
  async getTenantInfo(req, res) {
    try {
      const { tenantId } = req.params;

      const tenant = await Tenant.findOne({ tenantId }).lean();

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json(tenant);
    } catch (error) {
      console.error('❌ Error getting tenant info:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get organizations
   */
  async getOrganizations(req, res) {
    try {
      const { tenantId } = req.params;

      const organizations = await Organization.find({
        tenantId,
        status: 'active'
      }).lean();

      res.json(organizations);
    } catch (error) {
      console.error('❌ Error getting organizations:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get roles
   */
  async getRoles(req, res) {
    try {
      const { tenantId } = req.params;

      // This would typically come from a role management service
      // For now, return default roles
      const roles = [
        {
          roleId: 'admin',
          roleName: 'Administrator',
          description: 'Full system access',
          permissions: [
            'crm.*',
            'admin.*',
            'reports.*'
          ],
          priority: 100,
          isActive: true
        },
        {
          roleId: 'manager',
          roleName: 'Manager',
          description: 'Management access',
          permissions: [
            'crm.leads.*',
            'crm.opportunities.*',
            'crm.accounts.*',
            'reports.basic'
          ],
          priority: 80,
          isActive: true
        },
        {
          roleId: 'user',
          roleName: 'User',
          description: 'Basic user access',
          permissions: [
            'crm.leads.read',
            'crm.leads.create',
            'crm.opportunities.read',
            'crm.accounts.read'
          ],
          priority: 50,
          isActive: true
        }
      ];

      res.json(roles);
    } catch (error) {
      console.error('❌ Error getting roles:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get operation configuration
   */
  async getOperationConfig(req, res) {
    try {
      const { operationCode } = req.params;
      const { tenantId } = req.headers;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // This would typically come from a configuration service
      const config = {
        operationCode,
        operationName: this.getOperationName(operationCode),
        creditCost: this.getCreditCost(operationCode),
        category: this.getOperationCategory(operationCode),
        subcategory: this.getOperationSubcategory(operationCode),
        riskLevel: this.getRiskLevel(operationCode),
        permissions: this.getRequiredPermissions(operationCode),
        metadata: {
          description: this.getOperationDescription(operationCode),
          tags: this.getOperationTags(operationCode)
        },
        updatedAt: new Date().toISOString()
      };

      res.json(config);
    } catch (error) {
      console.error('❌ Error getting operation config:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Publish activity to Redis
   */
  async publishActivity(req, res) {
    try {
      const { tenantId } = req.headers;
      const activityData = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      // Get consumer for tenant
      const consumer = await this.consumerManager.getConsumer(tenantId);
      
      // Publish to Redis
      await consumer.redisClient.publish(
        `crm:${tenantId}:activities`,
        JSON.stringify({
          eventType: 'activity-logged',
          data: activityData
        })
      );

      res.json({ success: true, message: 'Activity published' });
    } catch (error) {
      console.error('❌ Error publishing activity:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get consumer metrics
   */
  async getConsumerMetrics(req, res) {
    try {
      const metrics = this.consumerManager.getMetrics();
      res.json(metrics);
    } catch (error) {
      console.error('❌ Error getting consumer metrics:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Sync complete tenant data from wrapper API
   */
  async syncTenantData(req, res) {
    try {
      const { tenantId } = req.params;
      const { skipReferenceData, forceSync } = req.query;
      const authToken = req.headers.authorization?.replace('Bearer ', '');

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      if (!authToken) {
        return res.status(401).json({ error: 'Authentication token required' });
      }

      console.log(`🚀 Starting tenant data sync for ${tenantId}`);

      // Check if sync is already in progress or recently completed
      if (!forceSync) {
        const status = await tenantDataSyncService.getSyncStatus(tenantId);
        if (status.isComplete && status.lastSync) {
          const timeSinceLastSync = Date.now() - new Date(status.lastSync).getTime();
          const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds

          if (timeSinceLastSync < oneHour) {
            return res.json({
              message: 'Tenant data is already synced and up to date',
              status,
              skipped: true
            });
          }
        }
      }

      // Start the sync process
      const options = {
        skipReferenceData: skipReferenceData === 'true'
      };

      const results = await tenantDataSyncService.syncTenantData(tenantId, authToken, options);

      if (results.success) {
        res.json({
          message: 'Tenant data sync completed successfully',
          results
        });
      } else {
        res.status(207).json({ // 207 Multi-Status for partial success
          message: 'Tenant data sync completed with some issues',
          results
        });
      }

    } catch (error) {
      console.error('❌ Error syncing tenant data:', error);
      res.status(500).json({
        error: 'Internal server error during tenant sync',
        details: error.message
      });
    }
  }

  /**
   * Get tenant sync status
   */
  async getTenantSyncStatus(req, res) {
    try {
      const { tenantId } = req.params;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID is required' });
      }

      const status = await tenantDataSyncService.getSyncStatus(tenantId);

      res.json({
        tenantId,
        status
      });

    } catch (error) {
      console.error('❌ Error getting tenant sync status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get data requirements specification
   */
  async getDataRequirements(req, res) {
    try {
      const requirements = tenantDataSyncService.getDataRequirements();

      res.json({
        message: 'CRM data requirements for wrapper API integration',
        requirements
      });

    } catch (error) {
      console.error('❌ Error getting data requirements:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods

  async getRoleDefinitions(tenantId, userRoles) {
    // This would typically fetch from a role service
    const roleDefinitions = {};
    
    for (const role of userRoles || []) {
      if (role.isActive) {
        roleDefinitions[role.roleId] = {
          roleId: role.roleId,
          roleName: role.roleName,
          permissions: role.permissions,
          priority: role.priority
        };
      }
    }

    return roleDefinitions;
  }

  async buildHierarchyTree(tenantId, organization) {
    // Get all organizations in the hierarchy
    const allOrgs = await Organization.find({
      tenantId,
      $or: [
        { orgCode: organization.orgCode },
        { 'hierarchy.path': organization.orgCode }
      ]
    }).lean();

    // Build tree structure
    const orgMap = new Map();
    allOrgs.forEach(org => {
      orgMap.set(org.orgCode, { ...org, children: [] });
    });

    const root = orgMap.get(organization.orgCode);
    if (!root) return organization;

    // Build parent-child relationships
    allOrgs.forEach(org => {
      if (org.parentId && orgMap.has(org.parentId)) {
        const parent = orgMap.get(org.parentId);
        parent.children.push(orgMap.get(org.orgCode));
      }
    });

    return root;
  }

  getOperationName(operationCode) {
    const names = {
      'crm.leads.create': 'Create Lead',
      'crm.leads.update': 'Update Lead',
      'crm.leads.delete': 'Delete Lead',
      'crm.opportunities.create': 'Create Opportunity',
      'crm.opportunities.update': 'Update Opportunity',
      'crm.accounts.create': 'Create Account',
      'crm.accounts.update': 'Update Account',
      'crm.activities.log': 'Log Activity'
    };
    return names[operationCode] || operationCode;
  }

  getCreditCost(operationCode) {
    const costs = {
      'crm.leads.create': 1,
      'crm.leads.update': 1,
      'crm.leads.delete': 0.5,
      'crm.opportunities.create': 2,
      'crm.opportunities.update': 1,
      'crm.accounts.create': 1,
      'crm.accounts.update': 1,
      'crm.activities.log': 0.5
    };
    return costs[operationCode] || 1;
  }

  getOperationCategory(operationCode) {
    if (operationCode.startsWith('crm.leads')) return 'lead_management';
    if (operationCode.startsWith('crm.opportunities')) return 'opportunity_management';
    if (operationCode.startsWith('crm.accounts')) return 'account_management';
    if (operationCode.startsWith('crm.activities')) return 'activity_tracking';
    return 'general';
  }

  getOperationSubcategory(operationCode) {
    if (operationCode.includes('.create')) return 'create';
    if (operationCode.includes('.update')) return 'update';
    if (operationCode.includes('.delete')) return 'delete';
    if (operationCode.includes('.read')) return 'read';
    return 'operation';
  }

  getRiskLevel(operationCode) {
    if (operationCode.includes('.delete')) return 'high';
    if (operationCode.includes('.create') || operationCode.includes('.update')) return 'medium';
    return 'low';
  }

  getRequiredPermissions(operationCode) {
    return [operationCode];
  }

  getOperationDescription(operationCode) {
    return `Perform ${this.getOperationName(operationCode)} operation`;
  }

  getOperationTags(operationCode) {
    return [
      this.getOperationCategory(operationCode),
      this.getOperationSubcategory(operationCode),
      'crm'
    ];
  }

  /**
   * Webhook for organization assignment events
   */
  async handleOrganizationAssignmentWebhook(req, res) {
    try {
      const { event, tenantId, data } = req.body;

      console.log(`🔗 Webhook called with:`, { event, tenantId, dataKeys: data ? Object.keys(data) : 'no data' });

      if (!event || !tenantId || !data) {
        console.error(`❌ Missing required fields: event=${!!event}, tenantId=${!!tenantId}, data=${!!data}`);
        return res.status(400).json({ error: 'Missing required fields: event, tenantId, data' });
      }

      console.log(`🔗 Received organization assignment webhook: ${event} for tenant ${tenantId}`);
      console.log(`📋 Event data:`, JSON.stringify(data, null, 2));

      // Check if Redis Streams service is connected
      if (!redisStreamsService.isConnected) {
        console.error(`❌ Redis Streams service not connected`);
        console.log(`🔄 Attempting to connect Redis Streams service...`);
        await redisStreamsService.connect();
      }

      if (!redisStreamsService.isConnected) {
        console.error(`❌ Failed to connect Redis Streams service`);
        return res.status(500).json({ error: 'Redis Streams service not connected' });
      }

      // Publish to Redis stream for organization assignment consumer
      const eventId = `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const eventData = {
        eventId: eventId,
        eventType: event,
        tenantId: tenantId,
        data: JSON.stringify(data), // Stringify the data object for Redis storage
        timestamp: new Date().toISOString()
      };

      console.log(`📨 Publishing to Redis stream: crm:organization-assignments`);
      console.log(`📨 Event data:`, JSON.stringify(eventData, null, 2));

      const result = await redisStreamsService.publisher.xAdd('crm:organization-assignments', '*', eventData);
      console.log(`✅ Published organization assignment event to Redis stream: ${event} (ID: ${result})`);

      res.json({ success: true, message: 'Organization assignment event published', eventId: eventId });

    } catch (error) {
      console.error('❌ Error handling organization assignment webhook:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default new WrapperController();
