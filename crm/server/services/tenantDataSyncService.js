// =============================================================================
// TENANT DATA SYNC SERVICE
// Comprehensive service to fetch and sync complete tenant data from wrapper API
// =============================================================================

import axios from 'axios';
import mongoose from 'mongoose';

// Import all models that need data from wrapper
import Tenant from '../models/Tenant.js';
import UserProfile from '../models/UserProfile.js';
import Organization from '../models/Organization.js';
import CrmTenantUser from '../models/CrmTenantUser.js';
import CrmCreditConfig from '../models/CrmCreditConfig.js';
import CrmEntityCredit from '../models/CrmEntityCredit.js';
import EmployeeOrgAssignment from '../models/EmployeeOrgAssignment.js';
import CrmRoleAssignment from '../models/CrmRoleAssignment.js';
import CrmRole from '../models/CrmRole.js';

class TenantDataSyncService {
  constructor() {
    this.wrapperBaseUrl =  'http://localhost:3000';
    this.timeout = 30000; // 30 seconds for large data fetches
    this.batchSize = 50; // Process in batches to avoid memory issues

    // Data requirements based on API analysis - eliminating redundancy
    this.dataRequirements = {
      // Essential data (must be available immediately for user login)
      // Order: independent → dependent (no references to create)
      essential: {
        tenant: { endpoint: '/api/wrapper/tenants/{tenantId}', priority: 1, required: true },
        organizations: { endpoint: '/api/wrapper/tenants/{tenantId}/organizations', priority: 1, required: true }, // Independent
        roles: { endpoint: '/api/wrapper/tenants/{tenantId}/roles', priority: 2, required: true }, // Independent
        userProfiles: { endpoint: '/api/wrapper/tenants/{tenantId}/users', priority: 2, required: true } // Independent
      },

      // Reference data (relationships - need references created)
      // Order: dependent data (requires ObjectId references to be created)
      reference: {
        employeeAssignments: { endpoint: '/api/wrapper/tenants/{tenantId}/employee-assignments', priority: 1, required: true }, // Depends: users + orgs
        roleAssignments: { endpoint: '/api/wrapper/tenants/{tenantId}/role-assignments', priority: 1, required: true }, // Depends: users + roles + orgs
        creditConfigs: { endpoint: '/api/wrapper/tenants/{tenantId}/credit-configs', priority: 2, required: false }, // Depends: orgs
        entityCredits: { endpoint: '/api/wrapper/tenants/{tenantId}/entity-credits', priority: 2, required: true } // Depends: orgs + users
      }
    };
  }

  // Map API allocation types to valid schema values
  mapAllocationType(apiType) {
    const typeMap = {
      'manual': 'fixed',
      'automatic': 'fixed',
      'percentage': 'percentage',
      'unlimited': 'unlimited',
      'fixed': 'fixed'
    };
    return typeMap[apiType] || 'fixed';
  }

  /**
   * Main sync method - fetches and stores complete tenant data
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token for wrapper API
   * @param {Object} options - Sync options
   * @returns {Promise<Object>} Sync results
   */
  async syncTenantData(tenantId, authToken, options = {}) {
    const startTime = Date.now();
    console.log(`🚀 Starting complete tenant data sync for tenant: ${tenantId}`);

    const results = {
      tenantId,
      startedAt: new Date(),
      phases: {},
      errors: [],
      success: false
    };

    try {
      // Ensure database connection with optimized settings
      if (mongoose.connection.readyState !== 1) {
        console.log('🔌 Establishing database connection...');
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
          throw new Error('MONGODB_URI environment variable is required');
        }
        await mongoose.connect(mongoUri, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 10000,
          socketTimeoutMS: 60000,
          bufferMaxEntries: 0,
          bufferCommands: false
        });
        console.log('✅ Database connected with optimized settings');
      }
      // Phase 1: Essential Data (blocking)
      console.log('📋 Phase 1: Syncing essential data...');
      results.phases.essential = await this.syncEssentialData(tenantId, authToken);

      if (!results.phases.essential.success) {
        throw new Error('Essential data sync failed');
      }

      // Phase 2: Reference Data (non-blocking background sync)
      if (!options.skipReferenceData) {
        console.log('📋 Phase 2: Syncing reference data...');
        results.phases.reference = await this.syncReferenceData(tenantId, authToken);
      }

      // Phase 3: Validate and complete
      console.log('📋 Phase 3: Validating sync completion...');
      results.phases.validation = await this.validateSyncCompletion(tenantId);

      results.success = true;
      results.completedAt = new Date();
      results.duration = Date.now() - startTime;

      console.log(`✅ Tenant data sync completed successfully in ${results.duration}ms`);

    } catch (error) {
      console.error('❌ Tenant data sync failed:', error);
      results.errors.push({
        phase: 'sync',
        error: error.message,
        timestamp: new Date()
      });
    }

    return results;
  }

  /**
   * Sync essential data that users need immediately
   */
  async syncEssentialData(tenantId, authToken) {
    const results = { success: false, data: {}, errors: [] };

    try {
      // Phase 1a: Sync Tenant Info (Independent)
      console.log('🏢 Syncing tenant info...');
      const tenantData = await this.fetchFromWrapper(
        this.dataRequirements.essential.tenant.endpoint.replace('{tenantId}', tenantId),
        authToken
      );

      if (tenantData) {
        await this.storeTenantData(tenantData);
        results.data.tenant = { success: true, count: 1 };
      }

      // Phase 1b: Sync Organizations (Independent - needed for references)
      console.log('🏢 Syncing organizations...');
      const organizationsData = await this.fetchFromWrapper(
        this.dataRequirements.essential.organizations.endpoint.replace('{tenantId}', tenantId),
        authToken
      );

      if (organizationsData && organizationsData.organizations) {
        const stored = await this.storeOrganizations(tenantId, organizationsData.organizations);
        results.data.organizations = { success: true, count: stored };
      }

      // Phase 1c: Sync Roles (Independent - needed for role assignments)
      console.log('🎭 Syncing roles...');
      const rolesData = await this.fetchFromWrapper(
        this.dataRequirements.essential.roles.endpoint.replace('{tenantId}', tenantId),
        authToken
      );

      if (rolesData && rolesData.roles) {
        const stored = await this.storeRoles(tenantId, rolesData.roles);
        results.data.roles = { success: true, count: stored };
      }

      // Phase 1d: Sync User Profiles (Independent - needed for assignments)
      console.log('👤 Syncing user profiles...');
      let userProfilesData = null;
      try {
        userProfilesData = await this.fetchFromWrapper(
          this.dataRequirements.essential.userProfiles.endpoint.replace('{tenantId}', tenantId),
          authToken
        );
      } catch (fetchError) {
        console.error('❌ Error fetching user profiles from wrapper API:', fetchError.message);
        results.data.userProfiles = { success: false, error: fetchError.message };
        results.errors.push(`userProfiles fetch: ${fetchError.message}`);
        userProfilesData = null;
      }

      if (userProfilesData && userProfilesData.data) {
        try {
          const stored = await this.storeUserProfiles(tenantId, userProfilesData.data);
          results.data.userProfiles = { success: true, count: stored };
        } catch (userProfilesError) {
          console.error('❌ Error storing user profiles:', userProfilesError.message);
          results.data.userProfiles = { success: false, error: userProfilesError.message };
          results.errors.push(`userProfiles: ${userProfilesError.message}`);
        }
      } else {
        console.log('⚠️ No user profiles data from wrapper API, skipping');
        results.data.userProfiles = { success: true, count: 0, message: 'No data from wrapper API' };
      }

      results.success = true;

    } catch (error) {
      console.error('❌ Essential data sync failed:', error);
      results.errors.push(error.message);
    }

    return results;
  }

  /**
   * Sync reference data in background
   */
  async syncReferenceData(tenantId, authToken) {
    const results = { success: true, data: {}, errors: [] };

    const referenceTasks = Object.entries(this.dataRequirements.reference).map(async ([key, config]) => {
      try {
        console.log(`🔄 Syncing ${key}...`);
        const data = await this.fetchFromWrapper(
          config.endpoint.replace('{tenantId}', tenantId),
          authToken
        );

        if (data) {
          const count = await this.storeReferenceData(key, tenantId, data);
          results.data[key] = { success: true, count };
        }
      } catch (error) {
        console.error(`❌ Failed to sync ${key}:`, error);
        results.data[key] = { success: false, error: error.message };
        results.errors.push(`${key}: ${error.message}`);
      }
    });

    await Promise.allSettled(referenceTasks);

    // Reference data sync doesn't fail the whole process
    return results;
  }

  /**
   * Fetch data from wrapper API with pagination support
   */
  async fetchFromWrapper(endpoint, authToken, options = {}) {
    try {
      let allData = [];
      let currentPage = 1;
      let totalPages = 1;
      const pageSize = options.pageSize || 100; // Max page size from API

      console.log(`📡 Fetching from wrapper: ${this.wrapperBaseUrl}${endpoint}`);

      do {
        const url = `${this.wrapperBaseUrl}${endpoint}`;
        const queryParams = new URLSearchParams({
          page: currentPage,
          limit: pageSize,
          ...options.queryParams
        });

        const fullUrl = `${url}?${queryParams}`;
        console.log(`📄 Fetching page ${currentPage}/${totalPages} from ${fullUrl}`);

        const response = await axios.get(fullUrl, {
          timeout: this.timeout,
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
            'X-Request-Source': 'crm-tenant-sync',
            'Accept': 'application/json'
          }
        });

        if (response.status === 200 && response.data.success) {
          const pageData = response.data.data || [];
          allData = allData.concat(pageData);

          // Update pagination info
          const pagination = response.data.pagination || {};
          totalPages = parseInt(pagination.totalPages) || 1;
          currentPage++;

          console.log(`✅ Fetched page ${currentPage - 1}: ${pageData.length} records (${allData.length} total so far)`);
        } else {
          console.warn(`⚠️ Wrapper API returned unsuccessful response for ${endpoint}:`, response.data);
          break;
        }

        // Safety check to prevent infinite loops
        if (currentPage > 1000) {
          console.warn('⚠️ Reached maximum page limit (1000), stopping pagination');
          break;
        }

      } while (currentPage <= totalPages);

      console.log(`✅ Successfully fetched ${allData.length} total records from ${endpoint}`);
      return { data: allData, totalCount: allData.length };

    } catch (error) {
      console.error(`❌ Error fetching from wrapper ${endpoint}:`, error.message);

      if (error.response) {
        console.error('❌ Response details:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
      }

      throw error;
    }
  }

  /**
   * Store tenant data
   */
  async storeTenantData(response) {
    try {
      // Handle both direct data and wrapped response formats
      const tenantData = response.data || response;

      const tenant = {
        tenantId: tenantData.tenantId,
        tenantName: tenantData.companyName || tenantData.tenantName || tenantData.name,
        status: tenantData.isActive !== false ? 'active' : 'inactive',
        settings: tenantData.settings || {},
        subscription: tenantData.subscription || {}
        // organization and hierarchy removed - derived from Organization collection
      };

      await Tenant.findOneAndUpdate(
        { tenantId: tenant.tenantId },
        tenant,
        { upsert: true, new: true }
      );

      console.log(`✅ Stored tenant data for ${tenant.tenantId}`);
      return 1;
    } catch (error) {
      console.error('❌ Error storing tenant data:', error);
      throw error;
    }
  }

  /**
   * Store user profiles
   */
  async storeUserProfiles(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const users = response.data || response;
      if (!Array.isArray(users)) {
        throw new Error('Expected array of users');
      }

      console.log(`👤 Processing ${users.length} user profiles...`);

      // Process in batches
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        const bulkOps = batch.map(user => ({
          updateOne: {
            filter: { tenantId, userId: user.userId },
            update: {
              tenantId,
              userId: user.userId,
              employeeCode: user.employeeCode,
              personalInfo: user.personalInfo || {
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email
              },
              status: user.status || { isActive: true },
              lastSyncedAt: new Date()
              // organization, permissions, roles removed - now derived from relationships
            },
            upsert: true
          }
        }));

        try {
          const result = await UserProfile.bulkWrite(bulkOps, { maxTimeMS: 60000 });
          stored += result.upsertedCount + result.modifiedCount;
        } catch (bulkError) {
          console.log(`⚠️ Bulk user operation failed, falling back to individual operations...`);
          for (const op of bulkOps) {
            try {
              const result = await UserProfile.bulkWrite([op], { maxTimeMS: 30000 });
              stored += result.upsertedCount + result.modifiedCount;
            } catch (individualError) {
              console.error(`❌ Failed to store user profile:`, individualError.message);
            }
          }
        }
      }

      console.log(`✅ Stored ${stored} user profiles`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing user profiles:', error);
      throw error;
    }
  }

  /**
   * Store organizations
   */
  async storeOrganizations(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const organizations = response.data || response;
      if (!Array.isArray(organizations)) {
        throw new Error('Expected array of organizations');
      }

      console.log(`🏢 Processing ${organizations.length} organizations and building hierarchy...`);

      // Phase 1: Store organizations with basic data
      const orgMap = new Map(); // orgCode → _id mapping

      for (let i = 0; i < organizations.length; i += this.batchSize) {
        const batch = organizations.slice(i, i + this.batchSize);
        const bulkOps = batch.map(org => ({
          updateOne: {
            filter: { tenantId, orgCode: org.orgCode },
            update: {
              tenantId,
              orgCode: org.orgCode,
              orgName: org.orgName,
              parentIdString: org.parentId, // Store parent as string initially
              status: org.status || 'active',
              hierarchy: org.hierarchy || {
                level: 0,
                path: [org.orgCode],
                children: []
              },
              metadata: org.metadata || {}
            },
            upsert: true
          }
        }));

        try {
          const result = await Organization.bulkWrite(bulkOps, { maxTimeMS: 60000 });
          stored += result.upsertedCount + result.modifiedCount;
        } catch (bulkError) {
          console.log(`⚠️ Bulk organization operation failed, falling back to individual operations...`);
          for (const op of bulkOps) {
            try {
              const result = await Organization.bulkWrite([op], { maxTimeMS: 30000 });
              stored += result.upsertedCount + result.modifiedCount;
            } catch (individualError) {
              console.error(`❌ Failed to store organization:`, individualError.message);
            }
          }
        }
      }

      // Build orgCode to _id mapping
      const allOrgs = await Organization.find({ tenantId }).select('_id orgCode');
      allOrgs.forEach(org => orgMap.set(org.orgCode, org._id));

      // Phase 2: Update parent ObjectId references
      console.log('🔄 Updating parent ObjectId references...');
      const parentUpdateOps = [];

      for (const org of organizations) {
        if (org.parentId && orgMap.has(org.parentId)) {
          parentUpdateOps.push({
            updateOne: {
              filter: { tenantId, orgCode: org.orgCode },
              update: {
                parentId: orgMap.get(org.parentId) // Set ObjectId reference
              }
            }
          });
        }
      }

      if (parentUpdateOps.length > 0) {
        try {
          const result = await Organization.bulkWrite(parentUpdateOps, { maxTimeMS: 30000 });
          console.log(`✅ Updated ${result.modifiedCount} parent references`);
        } catch (error) {
          console.error('❌ Failed to update parent references:', error.message);
        }
      }

      console.log(`✅ Stored ${stored} organizations`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing organizations:', error);
      throw error;
    }
  }

  /**
   * Store reference data based on type
   */
  async storeReferenceData(dataType, tenantId, response) {
    switch (dataType) {
      case 'roles':
        return await this.storeRoles(tenantId, response);
      case 'creditConfigs':
        return await this.storeCreditConfigs(tenantId, response);
      case 'entityCredits':
        return await this.storeEntityCredits(tenantId, response);
      case 'employeeAssignments':
        return await this.storeEmployeeAssignments(tenantId, response);
      case 'roleAssignments':
        return await this.storeRoleAssignments(tenantId, response);
      default:
        console.warn(`⚠️ Unknown data type: ${dataType}`);
        return 0;
    }
  }

  /**
   * Store tenant users (CrmTenantUser)
   */
  async storeTenantUsers(tenantId, users) {
    let stored = 0;

    try {
      for (let i = 0; i < users.length; i += this.batchSize) {
        const batch = users.slice(i, i + this.batchSize);
        const bulkOps = batch.map(user => ({
          updateOne: {
            filter: { tenantId, userId: user.userId },
            update: {
              userId: user.userId,
              tenantId,
              kindeId: user.kindeId,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              primaryOrganizationId: user.primaryOrganizationId,
              isResponsiblePerson: user.isResponsiblePerson || false,
              isTenantAdmin: user.isTenantAdmin || false,
              isVerified: user.isVerified || false,
              onboardingCompleted: user.onboardingCompleted || false,
              lastLoginAt: user.lastLoginAt,
              loginCount: user.loginCount || 0,
              preferences: user.preferences || {},
              profile: user.profile || {},
              security: user.security || {},
              metadata: user.metadata || {}
            },
            upsert: true
          }
        }));

        const result = await CrmTenantUser.bulkWrite(bulkOps);
        stored += result.upsertedCount + result.modifiedCount;
      }

      console.log(`✅ Stored ${stored} tenant users`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing tenant users:', error);
      throw error;
    }
  }

  /**
   * Store roles with permissions
   */
  async storeRoles(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const roles = response.data || response;
      if (!Array.isArray(roles)) {
        throw new Error('Expected array of roles');
      }

      console.log(`🎭 Processing ${roles.length} role definitions...`);

      for (let i = 0; i < roles.length; i += this.batchSize) {
        const batch = roles.slice(i, i + this.batchSize);
        const bulkOps = batch.map(role => ({
          updateOne: {
            filter: { tenantId, roleId: role.roleId },
            update: {
              roleId: role.roleId,
              tenantId,
              roleName: role.roleName,
              permissions: role.permissions || [],
              priority: role.priority || 0,
              isActive: role.isActive !== false,
              description: role.description || ''
            },
            upsert: true
          }
        }));

        const result = await CrmRole.bulkWrite(bulkOps);
        stored += result.upsertedCount + result.modifiedCount;
      }

      console.log(`✅ Stored ${stored} role definitions with permissions`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing roles:', error);
      throw error;
    }
  }

  /**
   * Store credit configurations
   */
  async storeCreditConfigs(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const configs = response.data || response;
      if (!Array.isArray(configs)) {
        throw new Error('Expected array of credit configurations');
      }

      console.log(`💰 Processing ${configs.length} credit configurations...`);

      for (let i = 0; i < configs.length; i += this.batchSize) {
        const batch = configs.slice(i, i + this.batchSize);
        const bulkOps = batch.map(config => ({
          updateOne: {
            filter: { tenantId, configId: config.configId },
            update: {
              configId: config.configId,
              tenantId,
              entityIdString: config.entityId || tenantId, // Use entityId from wrapper API or fallback to tenantId
              configName: config.configName,
              operationCode: config.operationCode || config.metadata?.operationCode,
              description: config.description || config.metadata?.description,
              creditCost: config.creditCost || config.metadata?.creditCost
            },
            upsert: true
          }
        }));

        try {
          const result = await CrmCreditConfig.bulkWrite(bulkOps, { maxTimeMS: 60000 });
          stored += result.upsertedCount + result.modifiedCount;
        } catch (bulkError) {
          console.log(`⚠️ Bulk operation failed, falling back to individual operations...`);
          // Fallback to individual operations
          for (const op of bulkOps) {
            try {
              const result = await CrmCreditConfig.bulkWrite([op], { maxTimeMS: 30000 });
              stored += result.upsertedCount + result.modifiedCount;
            } catch (individualError) {
              console.error(`❌ Failed to store credit config:`, individualError.message);
            }
          }
        }
      }

      console.log(`✅ Stored ${stored} credit configurations`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing credit configs:', error);
      throw error;
    }
  }

  /**
   * Store entity credits
   */
  async storeEntityCredits(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const credits = response.data || response;
      if (!Array.isArray(credits)) {
        throw new Error('Expected array of entity credits');
      }

      console.log(`💵 Processing ${credits.length} entity credits...`);

      // Phase 1: Store entity credits with string entityId initially
      for (let i = 0; i < credits.length; i += this.batchSize) {
        const batch = credits.slice(i, i + this.batchSize);
        const bulkOps = batch.map(credit => ({
          updateOne: {
            filter: { tenantId, entityIdString: credit.entityId },
            update: {
              tenantId,
              entityIdString: credit.entityId, // Store as string initially
              allocatedCredits: Number(credit.allocatedCredits) || 0,
              targetApplication: credit.targetApplication || 'crm',
              usedCredits: Number(credit.usedCredits) || 0,
              availableCredits: 0, // Temporary value, will be recalculated by pre-save middleware
              allocationType: mapAllocationType(credit.allocationType) || 'manual',
              allocationPurpose: credit.allocationPurpose || 'Entity credit allocation',
              allocationSource: credit.allocationSource || 'system',
              allocatedByString: credit.allocatedBy, // Store as string initially
              allocatedAt: credit.allocatedAt,
              metadata: credit.metadata || {}
            },
            upsert: true
          }
        }));

        try {
          const result = await CrmEntityCredit.bulkWrite(bulkOps, { maxTimeMS: 60000 });
          stored += result.upsertedCount + result.modifiedCount;
        } catch (bulkError) {
          console.log(`⚠️ Bulk entity credit operation failed, falling back to individual operations...`);
          for (const op of bulkOps) {
            try {
              const result = await CrmEntityCredit.bulkWrite([op], { maxTimeMS: 30000 });
              stored += result.upsertedCount + result.modifiedCount;
            } catch (individualError) {
              console.error(`❌ Failed to store entity credit:`, individualError.message);
            }
          }
        }
      }

      // Phase 2: Update ObjectId references
      console.log('🔄 Updating entity credit ObjectId references...');
      const allOrgs = await Organization.find({ tenantId }).select('_id orgCode');
      const orgMap = new Map(allOrgs.map(org => [org.orgCode, org._id]));

      const creditUpdateOps = [];
      for (const credit of credits) {
        if (orgMap.has(credit.entityId)) {
          creditUpdateOps.push({
            updateOne: {
              filter: { tenantId, entityIdString: credit.entityId },
              update: {
                entityId: orgMap.get(credit.entityId) // Set ObjectId reference
              }
            }
          });
        }
      }

      if (creditUpdateOps.length > 0) {
        try {
          const result = await CrmEntityCredit.bulkWrite(creditUpdateOps, { maxTimeMS: 30000 });
          console.log(`✅ Updated ${result.modifiedCount} entity credit references`);
        } catch (error) {
          console.error('❌ Failed to update entity credit references:', error.message);
        }
      }

      // Phase 3: Update allocatedBy ObjectId references
      console.log('🔄 Updating allocatedBy ObjectId references...');
      const userMap = new Map();
      const allUsers = await UserProfile.find({ tenantId }).select('_id userId');
      allUsers.forEach(user => userMap.set(user.userId, user._id));

      const allocatedByUpdateOps = [];
      for (const credit of credits) {
        if (credit.allocatedBy && userMap.has(credit.allocatedBy)) {
          allocatedByUpdateOps.push({
            updateOne: {
              filter: { tenantId, entityIdString: credit.entityId },
              update: {
                allocatedBy: userMap.get(credit.allocatedBy) // Set ObjectId reference
              }
            }
          });
        }
      }

      if (allocatedByUpdateOps.length > 0) {
        try {
          const result = await CrmEntityCredit.bulkWrite(allocatedByUpdateOps, { maxTimeMS: 30000 });
          console.log(`✅ Updated ${result.modifiedCount} allocatedBy references`);
        } catch (error) {
          console.error('❌ Failed to update allocatedBy references:', error.message);
        }
      }

      console.log(`✅ Stored ${stored} entity credits`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing entity credits:', error);
      throw error;
    }
  }

  /**
   * Store employee organization assignments (referential data only)
   */
  async storeEmployeeAssignments(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const assignments = response.data || response;
      if (!Array.isArray(assignments)) {
        throw new Error('Expected array of employee assignments');
      }

      console.log(`🔗 Processing ${assignments.length} employee assignments...`);

      for (let i = 0; i < assignments.length; i += this.batchSize) {
        const batch = assignments.slice(i, i + this.batchSize);
        const bulkOps = batch.map(assignment => ({
          updateOne: {
            filter: { tenantId, assignmentId: assignment.assignmentId },
            update: {
              assignmentId: assignment.assignmentId,
              tenantId,
              userId: assignment.userId,        // Referential - primary user data from /users endpoint
              entityId: assignment.entityId,     // Referential - primary org data from /organizations endpoint
              assignmentType: assignment.assignmentType || 'primary',
              isActive: assignment.isActive !== false,
              assignedAt: assignment.assignedAt,
              expiresAt: assignment.expiresAt,
              assignedBy: assignment.assignedBy,
              deactivatedAt: assignment.deactivatedAt,
              deactivatedBy: assignment.deactivatedBy,
              priority: assignment.priority || 1,
              // Note: Ignoring redundant user/org data in metadata - we get primary data from dedicated endpoints
              metadata: {
                // Only keep assignment-specific metadata, remove redundant user/org details
                department: assignment.metadata?.department,
                designation: assignment.metadata?.designation,
                employeeCode: assignment.metadata?.employeeCode
              }
            },
            upsert: true
          }
        }));

        const result = await EmployeeOrgAssignment.bulkWrite(bulkOps);
        stored += result.upsertedCount + result.modifiedCount;
      }

      console.log(`✅ Stored ${stored} employee assignments (referential data only)`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing employee assignments:', error);
      throw error;
    }
  }

  /**
   * Store role assignments (referential data only)
   */
  async storeRoleAssignments(tenantId, response) {
    let stored = 0;

    try {
      // Handle both direct array and wrapped response formats
      const assignments = response.data || response;
      if (!Array.isArray(assignments)) {
        throw new Error('Expected array of role assignments');
      }

      console.log(`🎭 Processing ${assignments.length} role assignments...`);

      for (let i = 0; i < assignments.length; i += this.batchSize) {
        const batch = assignments.slice(i, i + this.batchSize);
        const bulkOps = batch.map(assignment => ({
          updateOne: {
            filter: { tenantId, assignmentId: assignment.assignmentId },
            update: {
              assignmentId: assignment.assignmentId,
              tenantId,
              userId: assignment.userId,        // Referential - primary user data from /users endpoint
              roleId: assignment.roleId,        // Referential - primary role data from /roles endpoint
              entityId: assignment.entityId,     // Referential - primary org data from /organizations endpoint
              assignedBy: assignment.assignedBy,
              assignedAt: assignment.assignedAt,
              expiresAt: assignment.expiresAt,
              isActive: assignment.isActive !== false,
              // Note: Ignoring redundant user/role/org data in metadata - we get primary data from dedicated endpoints
              metadata: {
                // Only keep assignment-specific metadata, remove redundant user/role/org details
                isTemporary: assignment.metadata?.isTemporary,
                scope: assignment.metadata?.scope
              }
            },
            upsert: true
          }
        }));

        const result = await CrmRoleAssignment.bulkWrite(bulkOps);
        stored += result.upsertedCount + result.modifiedCount;
      }

      console.log(`✅ Stored ${stored} role assignments (referential data only)`);
      return stored;
    } catch (error) {
      console.error('❌ Error storing role assignments:', error);
      throw error;
    }
  }

  /**
   * Validate that sync completed successfully
   */
  async validateSyncCompletion(tenantId) {
    try {
      const validation = {
        tenant: false,
        users: false,
        organizations: false,
        completeness: 0
      };

      // Check tenant exists
      const tenant = await Tenant.findOne({ tenantId });
      validation.tenant = !!tenant;

      // Check users exist
      const userCount = await UserProfile.countDocuments({ tenantId });
      validation.users = userCount > 0;

      // Check organizations exist
      const orgCount = await Organization.countDocuments({ tenantId });
      validation.organizations = orgCount > 0;

      // Calculate completeness percentage
      const checks = Object.values(validation);
      validation.completeness = (checks.filter(Boolean).length / checks.length) * 100;

      console.log(`✅ Sync validation: ${validation.completeness}% complete`);

      return {
        success: validation.completeness >= 80, // 80% completeness threshold
        validation
      };
    } catch (error) {
      console.error('❌ Error validating sync completion:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status for a tenant
   */
  async getSyncStatus(tenantId) {
    try {
      const status = {
        tenantId,
        lastSync: null,
        dataCounts: {},
        isComplete: false
      };

      // Get tenant info
      const tenant = await Tenant.findOne({ tenantId });
      if (tenant) {
        status.lastSync = tenant.updatedAt;
      }

      // Get data counts
      status.dataCounts = {
        users: await UserProfile.countDocuments({ tenantId }),
        organizations: await Organization.countDocuments({ tenantId }),
        tenantUsers: await CrmTenantUser.countDocuments({ tenantId }),
        creditConfigs: await CrmCreditConfig.countDocuments({ tenantId }),
        entityCredits: await CrmEntityCredit.countDocuments({ tenantId }),
        employeeAssignments: await EmployeeOrgAssignment.countDocuments({ tenantId }),
        roleAssignments: await CrmRoleAssignment.countDocuments({ tenantId })
      };

      // Determine if sync is complete (has essential data)
      status.isComplete = status.dataCounts.users > 0 &&
                         status.dataCounts.organizations > 0 &&
                         !!tenant;

      return status;
    } catch (error) {
      console.error('❌ Error getting sync status:', error);
      throw error;
    }
  }

  /**
   * Get data requirements specification for wrapper API
   */
  getDataRequirements() {
    return {
      description: 'Complete tenant data specification for CRM integration - eliminating redundancy',
      baseUrl: 'http://localhost:3000/api/wrapper',
      authentication: 'Bearer token required in Authorization header',
      essentialData: {
        tenant: {
          endpoint: '/tenants/{tenantId}',
          responseFormat: {
            success: true,
            data: {
              tenantId: 'string',
              tenantName: 'string',
              status: 'active|inactive|suspended',
              settings: 'object',
              subscription: 'object',
              organization: 'object',
              hierarchy: 'object'
            }
          },
          description: 'Basic tenant information and configuration'
        },
        userProfiles: {
          endpoint: '/tenants/{tenantId}/users',
          queryParams: {
            page: 'integer (default: 1)',
            limit: 'integer (default: 50, max: 100)',
            entityId: 'string (optional)',
            includeInactive: 'boolean (default: false)'
          },
          responseFormat: {
            success: true,
            data: ['array of user objects'],
            pagination: {
              page: 'integer',
              limit: 'integer',
              total: 'string',
              totalPages: 'integer'
            }
          },
          description: 'User profiles with personal and organizational info'
        },
        organizations: {
          endpoint: '/tenants/{tenantId}/organizations',
          queryParams: {
            page: 'integer (default: 1)',
            limit: 'integer (default: 50, max: 100)',
            includeInactive: 'boolean (default: false)'
          },
          responseFormat: {
            success: true,
            data: ['array of organization objects'],
            pagination: 'same as users'
          },
          description: 'Organization hierarchy and structure'
        }
      },
      referenceData: {
        roles: {
          endpoint: '/tenants/{tenantId}/roles',
          responseFormat: {
            success: true,
            data: ['array of role objects with permissions'],
            pagination: 'same as users'
          },
          description: 'Role definitions with associated permissions'
        },
        creditConfigs: {
          endpoint: '/tenants/{tenantId}/credit-configs',
          responseFormat: {
            success: true,
            data: ['array of credit configuration objects'],
            pagination: 'same as users'
          },
          description: 'Credit costs for different CRM operations'
        },
        entityCredits: {
          endpoint: '/tenants/{tenantId}/entity-credits',
          responseFormat: {
            success: true,
            data: ['array of entity credit allocation objects'],
            pagination: 'same as users'
          },
          description: 'Credit allocations per organization/entity'
        },
        employeeAssignments: {
          endpoint: '/tenants/{tenantId}/employee-assignments',
          queryParams: {
            page: 'integer (default: 1)',
            limit: 'integer (default: 50, max: 100)',
            userId: 'string (optional)',
            entityId: 'string (optional)',
            includeInactive: 'boolean (default: false)'
          },
          responseFormat: {
            success: true,
            data: ['array of employee assignment objects'],
            pagination: 'same as users'
          },
          description: 'User-to-organization assignments (referential only)'
        },
        roleAssignments: {
          endpoint: '/tenants/{tenantId}/role-assignments',
          queryParams: {
            page: 'integer (default: 1)',
            limit: 'integer (default: 50, max: 100)',
            userId: 'string (optional)',
            roleId: 'string (optional)',
            includeInactive: 'boolean (default: false)'
          },
          responseFormat: {
            success: true,
            data: ['array of role assignment objects'],
            pagination: 'same as users'
          },
          description: 'User-to-role assignments (referential only)'
        }
      },
      dataRelationships: {
        users: 'Primary source for user data',
        organizations: 'Primary source for organization data',
        roles: 'Primary source for role definitions',
        employeeAssignments: 'References users and organizations by IDs',
        roleAssignments: 'References users and roles by IDs',
        creditConfigs: 'Standalone credit operation costs',
        entityCredits: 'Standalone credit allocations'
      },
      redundancyElimination: [
        'User details in assignments metadata are ignored - use /users endpoint',
        'Organization details in assignments are ignored - use /organizations endpoint',
        'Role details in assignments are ignored - use /roles endpoint',
        'Only referential IDs are used from assignment endpoints'
      ],
      notes: [
        'Essential data must be available immediately for user login',
        'Reference data can be synced progressively in background',
        'All list endpoints support pagination with consistent format',
        'All responses include success flag and error handling',
        'Authentication required via Bearer token in Authorization header',
        'Data redundancy eliminated - assignments contain only referential data'
      ]
    };
  }
}

export default new TenantDataSyncService();
