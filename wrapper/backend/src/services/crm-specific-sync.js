import { dbManager } from '../db/connection-manager.js';
import { v4 as uuidv4 } from 'uuid';
import sql from '../utils/sql-template.js';

class CRMSpecificSyncService {
  constructor() {
    this.appDb = dbManager.getAppDb();
    this.systemDb = dbManager.getSystemDb();
    this.applicationMappings = {
      // Credit config routing - CRM operations
      'crm.leads.create': 'crm',
      'crm.leads.update': 'crm',
      'crm.leads.delete': 'crm',
      'crm.contacts.create': 'crm',
      'crm.contacts.update': 'crm',
      'crm.contacts.import': 'crm',
      'crm.opportunities.create': 'crm',
      'crm.opportunities.update': 'crm',
      'crm.reports.generate': 'crm',
      'crm.dashboard.access': 'crm',

      // Shared data routing
      'user-management': ['crm', 'hrms'], // Users go to CRM and HRMS
      'role-management': ['crm', 'hrms', 'finance'], // Roles to relevant apps
      'tenant-hierarchy': ['crm', 'hrms', 'finance'], // Hierarchy to all apps
      'audit-logging': ['crm', 'hrms', 'finance'] // Audit to all apps
    };

    this.crmOperations = new Set([
      'crm.leads.create', 'crm.leads.update', 'crm.leads.delete',
      'crm.contacts.create', 'crm.contacts.update', 'crm.contacts.import',
      'crm.opportunities.create', 'crm.opportunities.update',
      'crm.reports.generate', 'crm.dashboard.access'
    ]);
  }

  /**
   * Determine which application this credit config belongs to
   */
  getApplicationFromOperationCode(operationCode) {
    // Check if it's a CRM-specific operation
    if (this.crmOperations.has(operationCode)) {
      return 'crm';
    }

    // For other patterns, we could extend this logic
    if (operationCode.startsWith('hrms.')) return 'hrms';
    if (operationCode.startsWith('finance.')) return 'finance';

    return null;
  }

  /**
   * Determine which applications need this role
   */
  getAppsForRole(role) {
    const apps = [];

    if (role.permissions.some(p => this.crmOperations.has(p))) {
      apps.push('crm');
    }
    if (role.permissions.some(p => p.startsWith('hrms.'))) {
      apps.push('hrms');
    }
    if (role.permissions.some(p => p.startsWith('finance.'))) {
      apps.push('finance');
    }

    // Default to all apps if no specific mapping found
    if (apps.length === 0) {
      apps.push('crm', 'hrms', 'finance');
    }

    return apps;
  }

  /**
   * Publish credit configuration change to CRM only
   */
  async publishCreditConfigChange(change) {
    try {
      const config = await this.getCreditConfig(change.record_id);

      if (!config) {
        console.log(`⚠️ Credit config ${change.record_id} not found`);
        return;
      }

      // Determine which application this config belongs to
      const targetApp = this.getApplicationFromOperationCode(config.operation_code);

      if (!targetApp) {
        console.log(`⚠️ Unknown operation code: ${config.operation_code}, skipping`);
        return;
      }

      // For now, only handle CRM
      if (targetApp !== 'crm') {
        console.log(`📋 ${targetApp} config change, CRM sync will handle later`);
        return;
      }

      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'credit-config-changed',
        tenantId: config.tenant_id,
        data: {
          configId: config.config_id,
          operationCode: config.operation_code,
          creditCost: config.credit_cost,
          isActive: config.is_active,
          isGlobal: config.is_global,
          unit: config.unit,
          operationName: config.operation_name,
          category: config.category,
          scope: config.scope
        }
      };

      // Send only to CRM application
      const channel = `${targetApp}:${config.tenant_id}:credit-configs`;
      await this.publishToRedis(channel, event);

      console.log(`💰 Published credit config to CRM for tenant ${config.tenant_id}: ${config.operation_code}`);

    } catch (error) {
      console.error('❌ Failed to publish credit config change:', error);
    }
  }

  /**
   * Publish role change to relevant applications
   */
  async publishRoleChange(change) {
    try {
      const role = await this.getRole(change.record_id);

      if (!role) {
        console.log(`⚠️ Role ${change.record_id} not found`);
        return;
      }

      // Determine which applications need this role
      const targetApps = this.getAppsForRole(role);

      // For now, only handle CRM
      const crmTargetApps = targetApps.filter(app => app === 'crm');

      if (crmTargetApps.length === 0) {
        console.log(`📋 Role ${role.role_name} not needed by CRM`);
        return;
      }

      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'role-changed',
        tenantId: role.tenant_id,
        data: {
          roleId: role.role_id,
          roleName: role.role_name,
          permissions: role.permissions,
          isActive: role.is_active,
          description: role.description,
          scope: role.scope
        }
      };

      // Send to CRM application
      const channel = `crm:${role.tenant_id}:roles`;
      await this.publishToRedis(channel, event);

      console.log(`🔐 Published role ${role.role_name} to CRM for tenant ${role.tenant_id}`);

    } catch (error) {
      console.error('❌ Failed to publish role change:', error);
    }
  }

  /**
   * Publish user change to relevant applications
   */
  async publishUserChange(change) {
    try {
      const user = await this.getUser(change.record_id);

      if (!user) {
        console.log(`⚠️ User ${change.record_id} not found`);
        return;
      }

      // Users typically go to CRM and HRMS, not Finance
      const targetApps = ['crm', 'hrms'];

      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'user-changed',
        tenantId: user.tenant_id,
        data: {
          userId: user.user_id,
          email: user.email,
          name: user.name,
          firstName: user.first_name,
          lastName: user.last_name,
          title: user.title,
          department: user.department,
          isActive: user.is_active,
          isTenantAdmin: user.is_tenant_admin,
          primaryOrganizationId: user.primary_organization_id
        }
      };

      // Send to CRM application
      const channel = `crm:${user.tenant_id}:users`;
      await this.publishToRedis(channel, event);

      console.log(`👤 Published user ${user.email} to CRM for tenant ${user.tenant_id}`);

    } catch (error) {
      console.error('❌ Failed to publish user change:', error);
    }
  }

  /**
   * Publish hierarchy change to all applications
   */
  async publishHierarchyChange(change) {
    try {
      const entity = await this.getEntity(change.record_id);

      if (!entity) {
        console.log(`⚠️ Entity ${change.record_id} not found`);
        return;
      }

      const event = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'hierarchy-changed',
        tenantId: entity.tenant_id,
        data: {
          entityId: entity.entity_id,
          entityName: entity.entity_name,
          entityType: entity.entity_type,
          parentEntityId: entity.parent_entity_id,
          hierarchyPath: entity.hierarchy_path,
          fullHierarchyPath: entity.full_hierarchy_path,
          isActive: entity.is_active,
          responsiblePersonId: entity.responsible_person_id
        }
      };

      // Send to all applications (hierarchy is shared)
      const applications = ['crm', 'hrms', 'finance'];
      for (const app of applications) {
        const channel = `${app}:${entity.tenant_id}:hierarchy`;
        await this.publishToRedis(channel, event);
      }

      console.log(`🏢 Published hierarchy change to all apps for tenant ${entity.tenant_id}`);

    } catch (error) {
      console.error('❌ Failed to publish hierarchy change:', error);
    }
  }

  /**
   * Publish to Redis (with error handling)
   */
  async publishToRedis(channel, event) {
    try {
      const { redis } = await import('../utils/redis.js');

      await redis.publish(channel, JSON.stringify(event));

      console.log(`📡 Published to Redis channel: ${channel}`);

    } catch (error) {
      console.error('❌ Failed to publish to Redis:', error);

      // Fallback: Log for manual processing
      console.log('📝 Event logged for manual processing:', { channel, event });
    }
  }

  /**
   * Get credit configuration data
   */
  async getCreditConfig(configId) {
    try {
      const result = await this.systemDb.execute(sql`
        SELECT * FROM credit_configurations WHERE config_id = ${configId}
      `);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get credit config:', error);
      return null;
    }
  }

  /**
   * Get role data
   */
  async getRole(roleId) {
    try {
      const result = await this.systemDb.execute(sql`
        SELECT * FROM custom_roles WHERE role_id = ${roleId}
      `);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get role:', error);
      return null;
    }
  }

  /**
   * Get user data
   */
  async getUser(userId) {
    try {
      const result = await this.systemDb.execute(sql`
        SELECT * FROM tenant_users WHERE user_id = ${userId}
      `);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get user:', error);
      return null;
    }
  }

  /**
   * Get entity data
   */
  async getEntity(entityId) {
    try {
      const result = await this.systemDb.execute(sql`
        SELECT * FROM entities WHERE entity_id = ${entityId}
      `);

      return result.rows[0];
    } catch (error) {
      console.error('❌ Failed to get entity:', error);
      return null;
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    return {
      status: 'healthy',
      applicationMappings: Object.keys(this.applicationMappings),
      crmOperations: Array.from(this.crmOperations),
      timestamp: new Date().toISOString()
    };
  }
}

export const crmSpecificSync = new CRMSpecificSyncService();
export default CRMSpecificSyncService;
