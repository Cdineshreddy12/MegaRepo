import { dbManager } from '../db/connection-manager.js';

class CRMConsumer {
  constructor(tenantId) {
    this.appDb = dbManager.getAppDb();
    this.systemDb = dbManager.getSystemDb();
    this.tenantId = tenantId;
    this.localCreditConfigs = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize CRM consumer for specific tenant
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚠️ CRM consumer already initialized');
      return;
    }

    try {
      console.log(`🎯 Initializing CRM consumer for tenant ${this.tenantId}`);

      // Subscribe only to CRM-specific channels for this tenant
      await this.subscribeToChannels();

      // Load existing data
      await this.loadInitialData();

      this.isInitialized = true;
      console.log('✅ CRM consumer initialized successfully');

    } catch (error) {
      console.error('❌ Failed to initialize CRM consumer:', error);
      throw error;
    }
  }

  /**
   * Subscribe to Redis channels for this tenant
   */
  async subscribeToChannels() {
    try {
      const { redis } = await import('../utils/redis.js');

      const channels = [
        `crm:${this.tenantId}:credit-configs`,
        `crm:${this.tenantId}:roles`,
        `crm:${this.tenantId}:users`,
        `crm:${this.tenantId}:hierarchy`,
        `crm:${this.tenantId}:organization-assignments`
      ];

      console.log(`📡 Subscribing to channels: ${channels.join(', ')}`);

      // Subscribe to all channels
      for (const channel of channels) {
        await redis.subscribe(channel);
      }

      // Handle incoming messages
      redis.on('message', async (channel, message) => {
        try {
          const event = JSON.parse(message);
          await this.handleMessage(channel, event);
        } catch (error) {
          console.error('❌ Failed to process message:', error);
        }
      });

      console.log('✅ CRM consumer subscribed to channels');

    } catch (error) {
      console.error('❌ Failed to subscribe to Redis channels:', error);
      throw error;
    }
  }

  /**
   * Load initial data for this tenant
   */
  async loadInitialData() {
    try {
      console.log(`📋 Loading initial data for tenant ${this.tenantId}`);

      // Load credit configurations
      const creditConfigs = await this.systemDb.execute(sql`
        SELECT * FROM credit_configurations
        WHERE tenant_id = ${this.tenantId}
          AND is_active = true
      `);

      for (const config of creditConfigs.rows) {
        this.localCreditConfigs.set(config.operation_code, config.credit_cost);
      }

      console.log(`📋 Loaded ${creditConfigs.rows.length} credit configurations`);

    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
    }
  }

  /**
   * Handle incoming messages from Redis
   */
  async handleMessage(channel, event) {
    const [app, tenantId, dataType] = channel.split(':');

    // Verify this message is for our tenant
    if (tenantId !== this.tenantId) {
      return;
    }

    console.log(`📨 CRM received ${dataType} event: ${event.eventType}`);

    switch(dataType) {
      case 'credit-configs':
        await this.handleCreditConfigChange(event);
        break;
      case 'roles':
        await this.handleRoleChange(event);
        break;
      case 'users':
        await this.handleUserChange(event);
        break;
      case 'hierarchy':
        await this.handleHierarchyChange(event);
        break;
      case 'organization-assignments':
        await this.handleOrganizationAssignmentChange(event);
        break;
      default:
        console.log(`⚠️ Unknown data type: ${dataType}`);
    }
  }

  /**
   * Handle credit configuration changes
   */
  async handleCreditConfigChange(event) {
    try {
      console.log(`💰 CRM: Processing credit config change: ${event.data.operationCode}`);

      const configData = event.data;

      // Update local database
      await this.appDb.execute(sql`
        INSERT INTO local_credit_configs (
          config_id, tenant_id, operation_code, credit_cost, is_active,
          operation_name, category, unit, scope, created_at, updated_at
        ) VALUES (
          ${configData.configId}, ${event.tenantId}, ${configData.operationCode},
          ${configData.creditCost}, ${configData.isActive}, ${configData.operationName},
          ${configData.category}, ${configData.unit}, ${configData.scope},
          NOW(), NOW()
        )
        ON CONFLICT (config_id)
        DO UPDATE SET
          credit_cost = EXCLUDED.credit_cost,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `);

      // Update in-memory cache for fast access
      this.localCreditConfigs.set(configData.operationCode, configData.creditCost);

      // Update UI if needed
      await this.refreshCreditDisplay();

      console.log(`✅ CRM credit config updated: ${configData.operationCode} = ${configData.creditCost} credits`);

    } catch (error) {
      console.error('❌ Failed to handle credit config change:', error);
    }
  }

  /**
   * Handle role changes
   */
  async handleRoleChange(event) {
    try {
      console.log(`🔐 CRM: Processing role change: ${event.data.roleName}`);

      const roleData = event.data;

      // Update local database
      await this.appDb.execute(sql`
        INSERT INTO local_roles (
          role_id, tenant_id, role_name, permissions, is_active,
          description, scope, created_at, updated_at
        ) VALUES (
          ${roleData.roleId}, ${event.tenantId}, ${roleData.roleName},
          ${JSON.stringify(roleData.permissions)}, ${roleData.isActive},
          ${roleData.description}, ${roleData.scope}, NOW(), NOW()
        )
        ON CONFLICT (role_id)
        DO UPDATE SET
          permissions = EXCLUDED.permissions,
          is_active = EXCLUDED.is_active,
          updated_at = NOW()
      `);

      console.log(`✅ CRM role updated: ${roleData.roleName}`);

    } catch (error) {
      console.error('❌ Failed to handle role change:', error);
    }
  }

  /**
   * Handle user changes
   */
  async handleUserChange(event) {
    try {
      console.log(`👤 CRM: Processing user change: ${event.data.email}`);

      const userData = event.data;

      // Update local database
      await this.appDb.execute(sql`
        INSERT INTO local_users (
          user_id, tenant_id, email, name, first_name, last_name,
          title, department, is_active, is_tenant_admin,
          primary_organization_id, created_at, updated_at
        ) VALUES (
          ${userData.userId}, ${event.tenantId}, ${userData.email},
          ${userData.name}, ${userData.firstName}, ${userData.lastName},
          ${userData.title}, ${userData.department}, ${userData.isActive},
          ${userData.isTenantAdmin}, ${userData.primaryOrganizationId},
          NOW(), NOW()
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          title = EXCLUDED.title,
          department = EXCLUDED.department,
          is_active = EXCLUDED.is_active,
          is_tenant_admin = EXCLUDED.is_tenant_admin,
          primary_organization_id = EXCLUDED.primary_organization_id,
          updated_at = NOW()
      `);

      console.log(`✅ CRM user updated: ${userData.email}`);

    } catch (error) {
      console.error('❌ Failed to handle user change:', error);
    }
  }

  /**
   * Handle hierarchy changes
   */
  async handleHierarchyChange(event) {
    try {
      console.log(`🏢 CRM: Processing hierarchy change: ${event.data.entityName}`);

      const hierarchyData = event.data;

      // Update local hierarchy cache
      await this.appDb.execute(sql`
        INSERT INTO local_hierarchy (
          entity_id, tenant_id, entity_name, entity_type,
          parent_entity_id, hierarchy_path, full_hierarchy_path,
          is_active, responsible_person_id, created_at, updated_at
        ) VALUES (
          ${hierarchyData.entityId}, ${event.tenantId}, ${hierarchyData.entityName},
          ${hierarchyData.entityType}, ${hierarchyData.parentEntityId},
          ${hierarchyData.hierarchyPath}, ${hierarchyData.fullHierarchyPath},
          ${hierarchyData.isActive}, ${hierarchyData.responsiblePersonId},
          NOW(), NOW()
        )
        ON CONFLICT (entity_id)
        DO UPDATE SET
          entity_name = EXCLUDED.entity_name,
          entity_type = EXCLUDED.entity_type,
          parent_entity_id = EXCLUDED.parent_entity_id,
          hierarchy_path = EXCLUDED.hierarchy_path,
          full_hierarchy_path = EXCLUDED.full_hierarchy_path,
          is_active = EXCLUDED.is_active,
          responsible_person_id = EXCLUDED.responsible_person_id,
          updated_at = NOW()
      `);

      console.log(`✅ CRM hierarchy updated: ${hierarchyData.entityName}`);

    } catch (error) {
      console.error('❌ Failed to handle hierarchy change:', error);
    }
  }

  /**
   * Check credits for operation
   */
  async checkCreditsForOperation(operationCode) {
    const creditCost = this.localCreditConfigs.get(operationCode);

    if (!creditCost) {
      console.warn(`⚠️ No credit config found for ${operationCode}`);
      return { available: false, reason: 'No credit configuration found' };
    }

    // Get tenant credits from wrapper
    const availableCredits = await this.getTenantCredits();

    return {
      available: availableCredits >= creditCost,
      creditCost,
      availableCredits,
      operationCode
    };
  }

  /**
   * Get tenant credits from wrapper
   */
  async getTenantCredits() {
    try {
      const response = await fetch(`/api/tenants/${this.tenantId}/credits/balance`);
      const result = await response.json();
      return result.balance || 0;
    } catch (error) {
      console.error('❌ Failed to get tenant credits:', error);
      return 0;
    }
  }

  /**
   * Refresh credit display in UI
   */
  async refreshCreditDisplay() {
    try {
      // Notify UI to refresh credit configurations
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('credit-config-updated'));
      }
    } catch (error) {
      console.error('❌ Failed to refresh credit display:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const creditConfigCount = this.localCreditConfigs.size;

      return {
        status: 'healthy',
        tenantId: this.tenantId,
        creditConfigs: creditConfigCount,
        isInitialized: this.isInitialized,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Handle organization assignment changes
   */
  async handleOrganizationAssignmentChange(event) {
    try {
      console.log(`👥 CRM: Processing organization assignment change: ${event.eventType}`);

      const assignmentData = event.data;

      // Update local organization assignments tracking
      // This could be used for local caching or business logic
      console.log(`✅ CRM: Processed organization assignment for user ${assignmentData.userId} to org ${assignmentData.organizationId}`);

      // Here you could implement local caching, business logic, or forwarding to CRM system
      // For now, we just acknowledge receipt of the event

    } catch (error) {
      console.error('❌ Failed to handle organization assignment change:', error);
      throw error;
    }
  }

  /**
   * Get credit config for operation
   */
  getCreditConfig(operationCode) {
    return this.localCreditConfigs.get(operationCode);
  }

  /**
   * Shutdown consumer
   */
  async shutdown() {
    try {
      const { redis } = await import('../utils/redis.js');

      await redis.unsubscribe();
      await redis.quit();

      console.log('🛑 CRM consumer shutdown successfully');

    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

export { CRMConsumer };
export default CRMConsumer;
