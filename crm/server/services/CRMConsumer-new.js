import axios from 'axios';

/**
 * Simplified Multi-Tenant CRM Consumer
 * Direct API coordination without complex caching
 */
class SimplifiedCRMConsumer {
  constructor(tenantId, options = {}) {
    this.tenantId = tenantId;
    this.options = {
      wrapperApiUrl: process.env.WRAPPER_API_URL || 'http://localhost:3000',
      ...options
    };

    this.currentToken = null; // For API authentication
    this.wrapperApi = this.createWrapperApiClient();
  }

  /**
   * Set the current JWT token for API authentication
   */
  setCurrentToken(token) {
    this.currentToken = token;
  }

  /**
   * Initialize the consumer
   */
  async initialize() {
    // Simple initialization - no Redis connection or caching setup needed
    console.log(`✅ Simplified CRM Consumer initialized for tenant: ${this.tenantId}`);
    return true;
  }

  /**
   * Create wrapper API client
   */
  createWrapperApiClient() {
    const client = axios.create({
      baseURL: this.options.wrapperApiUrl,
      timeout: 30000, // 30 seconds
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-ID': this.tenantId
      }
    });

    return client;
  }

  /**
   * Get credit cost for operation - direct API call
   */
  async getCreditCost(operationCode) {
    try {
      console.log(`💰 Fetching credit cost for operation: ${operationCode}`);
      const config = await this.fetchCreditConfiguration(operationCode);
      return config ? config.creditCost : 0;
    } catch (error) {
      console.error(`❌ Failed to fetch credit cost for ${operationCode}:`, error.message);
      return 0; // Default to 0 credits if API fails
    }
  }

  /**
   * Check user permission
   */
  async checkUserPermission(userId, permission) {
    try {
      const userContext = await this.getUserOrganizationContext(userId);
      if (!userContext?.permissions) return false;

      return userContext.permissions.has(permission) || userContext.permissions.includes('*');
    } catch (error) {
      console.error(`❌ Failed to check permission for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get user profile with organizational context
   */
  async getUserProfile(userId) {
    try {
      console.log(`👤 Fetching user profile for: ${userId} in tenant: ${this.tenantId}`);
      return await this.fetchUserProfile(userId);
    } catch (error) {
      console.error(`❌ Failed to fetch user profile for ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Get user organization context
   */
  async getUserOrganizationContext(userId) {
    try {
      console.log(`🏢 Getting organization context for user: ${userId}`);
      const profile = await this.getUserProfile(userId);
      if (!profile) {
        console.log(`❌ No profile found for user: ${userId}`);
        return null;
      }

      return {
        user: {
          id: profile.userId,
          name: profile.personalInfo?.firstName + ' ' + (profile.personalInfo?.lastName || ''),
          email: profile.personalInfo?.email,
          employeeCode: profile.employeeCode
        },
        organization: {
          orgCode: profile.organization?.orgCode,
          department: profile.organization?.department,
          designation: profile.organization?.designation,
          hierarchy: profile.organization?.hierarchy
        },
        roles: profile.roles?.filter(role => role.isActive) || [],
        permissions: profile.permissions?.effective || [],
        entityPath: this.buildEntityPath(profile, null)
      };
    } catch (error) {
      console.error(`❌ Failed to get organization context for ${userId}:`, error.message);
      return null;
    }
  }

  /**
   * Fetch user profile from database
   */
  async fetchUserProfile(userId) {
    try {
      const UserProfile = (await import('../models/UserProfile.js')).default;
      const profile = await UserProfile.findOne({
        tenantId: this.tenantId,
        userId: userId
      }).lean();

      if (!profile) {
        console.log(`❌ User profile not found for userId: ${userId} in tenant: ${this.tenantId}`);
        return null;
      }

      return {
        userId: profile.userId,
        employeeCode: profile.employeeCode,
        personalInfo: profile.personalInfo,
        organization: profile.organization,
        roles: profile.roles || [],
        permissions: profile.permissions || { effective: [] },
        status: profile.status,
        lastSyncedAt: profile.lastSyncedAt
      };
    } catch (error) {
      console.error(`❌ Failed to fetch user profile from database: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Fetch credit configuration from wrapper API
   */
  async fetchCreditConfiguration(operationCode) {
    try {
      if (!this.currentToken) {
        console.log(`⚠️ [CRM] Cannot fetch credit config ${operationCode} - no auth token`);
        return null;
      }

      const client = axios.create({
        baseURL: this.options.wrapperApiUrl,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': this.tenantId,
          'Authorization': `Bearer ${this.currentToken}`
        }
      });

      console.log(`🌐 [CRM] Fetching credit config for ${operationCode}...`);
      const response = await client.get(`/api/operations/${operationCode}/config`);
      console.log(`✅ [CRM] Credit config fetched for ${operationCode}`);
      return response.data;
    } catch (error) {
      console.error(`❌ [CRM] Failed to fetch credit configuration ${operationCode}:`, error.message);
      return null;
    }
  }

  /**
   * Log activity with comprehensive context
   */
  async logActivity(activityData) {
    const activityId = `activity:${Date.now()}:${activityData.userId}:${Math.random().toString(36).substr(2, 9)}`;

    try {
      const userContext = await this.getUserOrganizationContext(activityData.userId);
      const creditCost = await this.getCreditCost(activityData.operation);

      const activity = {
        tenantId: this.tenantId,
        activityId,
        userId: activityData.userId,
        operation: activityData.operation,
        entityType: activityData.entityType,
        entityId: activityData.entityId,
        creditCost,
        creditsUsed: activityData.creditsUsed || creditCost,
        userContext: userContext || {},
        operationDetails: {
          operationCode: activityData.operation,
          operationName: activityData.operationName || activityData.operation,
          category: activityData.category || 'general',
          subcategory: activityData.subcategory || 'operation',
          riskLevel: activityData.riskLevel || 'low'
        },
        entityDetails: {
          entityName: activityData.entityName,
          entityStatus: activityData.entityStatus,
          entityMetadata: activityData.entityMetadata || {}
        },
        session: {
          sessionId: activityData.sessionId,
          ipAddress: activityData.ipAddress,
          userAgent: activityData.userAgent,
          deviceType: activityData.deviceType
        },
        metadata: {
          timestamp: new Date().toISOString(),
          source: activityData.source || 'crm',
          version: activityData.version || '1.0',
          environment: activityData.environment || 'production'
        },
        tags: activityData.tags || [activityData.operation, activityData.entityType],
        priority: activityData.priority || 'normal',
        status: activityData.status || 'completed'
      };

      const ActivityLog = (await import('../models/ActivityLog.js')).default;
      await ActivityLog.create(activity);

      console.log(`📝 Activity logged: ${activityId} - ${activityData.operation}`);
      return activityId;
    } catch (error) {
      console.error('❌ Failed to log activity:', error);
      throw error;
    }
  }

  /**
   * Update permission data (used by middleware for compatibility)
   */
  async updatePermissionData(permissionData) {
    // This method is called by middleware but we don't cache permissions anymore
    // It's kept for compatibility but doesn't store anything
    console.log(`🔐 Permission update received for user: ${permissionData.userId}`);
  }

  /**
   * Build entity path for user (simplified)
   */
  buildEntityPath(profile, hierarchy) {
    if (!profile.organization?.orgCode) return '';
    return profile.organization.orgCode;
  }

  /**
   * Shutdown consumer
   */
  async shutdown() {
    console.log(`🛑 Shutdown complete for tenant: ${this.tenantId}`);
  }
}

export default SimplifiedCRMConsumer;
