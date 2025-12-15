import { db } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, entities, credits, creditAllocations } from '../db/schema/index.js';
import { eq, and, sql, desc } from 'drizzle-orm';

/**
 * Wrapper CRM Data Synchronization Service
 * Handles progressive sync of tenant data from Wrapper to CRM
 */
export class WrapperSyncService {

  /**
   * Trigger full tenant data synchronization
   * @param {string} tenantId - Tenant ID to sync
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  static async triggerTenantSync(tenantId, options = {}) {
    const { skipReferenceData = false, forceSync = false, requestedBy } = options;

    console.log(`🔄 Starting tenant sync for ${tenantId}`, {
      skipReferenceData,
      forceSync,
      requestedBy
    });

    const startTime = Date.now();
    const results = {
      tenantId,
      startedAt: new Date(),
      completedAt: null,
      duration: 0,
      success: false,
      phases: {
        essential: { success: false, data: {} },
        reference: { success: false, data: {} },
        validation: { success: false, validation: {} }
      }
    };

    try {
      // Phase 1: Essential Data (Blocking)
      console.log('📋 Phase 1: Syncing essential data...');
      results.phases.essential = await this.syncEssentialData(tenantId, requestedBy);
      console.log('✅ Phase 1 completed:', results.phases.essential);

      // Phase 2: Reference Data (Non-blocking)
      if (!skipReferenceData) {
        console.log('📋 Phase 2: Syncing reference data...');
        results.phases.reference = await this.syncReferenceData(tenantId, requestedBy);
        console.log('✅ Phase 2 completed:', results.phases.reference);
      } else {
        console.log('⏭️ Phase 2 skipped (skipReferenceData=true)');
        results.phases.reference = { success: true, data: {}, skipped: true };
      }

      // Phase 3: Validation
      console.log('📋 Phase 3: Validating sync...');
      results.phases.validation = await this.validateSync(tenantId);
      console.log('✅ Phase 3 completed:', results.phases.validation);

      // Calculate overall success
      results.success = results.phases.essential.success &&
                       (skipReferenceData || results.phases.reference.success) &&
                       results.phases.validation.success;

      results.completedAt = new Date();
      results.duration = results.completedAt - startTime;

      console.log(`🎉 Tenant sync completed for ${tenantId}`, {
        success: results.success,
        duration: `${results.duration}ms`,
        phases: Object.keys(results.phases).map(phase => ({
          phase,
          success: results.phases[phase].success
        }))
      });

      return results;

    } catch (error) {
      console.error(`❌ Tenant sync failed for ${tenantId}:`, error);
      results.completedAt = new Date();
      results.duration = results.completedAt - startTime;
      results.error = error.message;
      throw error;
    }
  }

  /**
   * Sync essential data (tenant info, user profiles, organizations)
   * @param {string} tenantId - Tenant ID
   * @param {string} requestedBy - User who requested the sync
   * @returns {Object} Sync results for essential data
   */
  static async syncEssentialData(tenantId, requestedBy) {
    const results = { success: false, data: {} };

    try {
      // 1. Sync tenant information
      console.log(`🏢 Syncing tenant info for ${tenantId}...`);
      results.data.tenant = await this.syncTenantInfo(tenantId);
      console.log(`✅ Tenant synced: ${results.data.tenant.success ? 'success' : 'failed'}`);

      // 2. Sync user profiles
      console.log(`👥 Syncing user profiles for ${tenantId}...`);
      results.data.userProfiles = await this.syncUserProfiles(tenantId);
      console.log(`✅ User profiles synced: ${results.data.userProfiles.count} records`);

      // 3. Sync organizations
      console.log(`🏛️ Syncing organizations for ${tenantId}...`);
      results.data.organizations = await this.syncOrganizations(tenantId);
      console.log(`✅ Organizations synced: ${results.data.organizations.count} records`);

      results.success = results.data.tenant.success &&
                       results.data.userProfiles.success &&
                       results.data.organizations.success;

      return results;

    } catch (error) {
      console.error(`❌ Essential data sync failed for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Sync reference data (detailed users, credits, assignments, etc.)
   * @param {string} tenantId - Tenant ID
   * @param {string} requestedBy - User who requested the sync
   * @returns {Object} Sync results for reference data
   */
  static async syncReferenceData(tenantId, requestedBy) {
    const results = { success: false, data: {} };

    try {
      // 1. Sync detailed tenant users
      console.log(`👤 Syncing detailed tenant users for ${tenantId}...`);
      results.data.tenantUsers = await this.syncTenantUsers(tenantId);
      console.log(`✅ Detailed users synced: ${results.data.tenantUsers.count} records`);

      // 2. Sync credit configurations
      console.log(`💳 Syncing credit configurations for ${tenantId}...`);
      results.data.creditConfigs = await this.syncCreditConfigs(tenantId);
      console.log(`✅ Credit configs synced: ${results.data.creditConfigs.count} records`);

      // 3. Sync entity credits
      console.log(`💰 Syncing entity credits for ${tenantId}...`);
      results.data.entityCredits = await this.syncEntityCredits(tenantId);
      console.log(`✅ Entity credits synced: ${results.data.entityCredits.count} records`);

      // 4. Sync employee assignments
      console.log(`👷 Syncing employee assignments for ${tenantId}...`);
      results.data.employeeAssignments = await this.syncEmployeeAssignments(tenantId);
      console.log(`✅ Employee assignments synced: ${results.data.employeeAssignments.count} records`);

      // 5. Sync role assignments
      console.log(`🎭 Syncing role assignments for ${tenantId}...`);
      results.data.roleAssignments = await this.syncRoleAssignments(tenantId);
      console.log(`✅ Role assignments synced: ${results.data.roleAssignments.count} records`);

      results.success = true; // Reference data sync is non-blocking

      return results;

    } catch (error) {
      console.error(`❌ Reference data sync failed for ${tenantId}:`, error);
      // Don't throw error for reference data - it's non-blocking
      results.error = error.message;
      return results;
    }
  }

  /**
   * Validate sync completeness and data integrity
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Validation results
   */
  static async validateSync(tenantId) {
    const validation = {
      success: false,
      validation: {
        completeness: 0,
        issues: []
      }
    };

    try {
      // Check essential data completeness
      const [tenantCount] = await db
        .select({ count: sql`count(*)` })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId));

      const [userCount] = await db
        .select({ count: sql`count(*)` })
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true)));

      const [orgCount] = await db
        .select({ count: sql`count(*)` })
        .from(entities)
        .where(and(eq(entities.tenantId, tenantId), eq(entities.isActive, true)));

      // Calculate completeness percentage
      const essentialChecks = [
        { name: 'tenant', required: true, count: tenantCount.count },
        { name: 'users', required: true, count: userCount.count },
        { name: 'organizations', required: true, count: orgCount.count }
      ];

      const requiredItems = essentialChecks.filter(check => check.required);
      const completedItems = requiredItems.filter(check => check.count > 0);

      validation.validation.completeness = Math.round((completedItems.length / requiredItems.length) * 100);

      // Check for issues
      if (tenantCount.count === 0) {
        validation.validation.issues.push('Missing tenant record');
      }
      if (userCount.count === 0) {
        validation.validation.issues.push('No active users found');
      }
      if (orgCount.count === 0) {
        validation.validation.issues.push('No organizations found');
      }

      validation.success = validation.validation.completeness === 100 && validation.validation.issues.length === 0;

      return validation;

    } catch (error) {
      console.error(`❌ Validation failed for ${tenantId}:`, error);
      validation.validation.issues.push('Validation error: ' + error.message);
      return validation;
    }
  }

  /**
   * Sync tenant information
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncTenantInfo(tenantId) {
    try {
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return { success: false, error: 'Tenant not found', count: 0 };
      }

      return { success: true, count: 1, data: tenant };
    } catch (error) {
      console.error(`❌ Error syncing tenant info for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync user profiles
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncUserProfiles(tenantId) {
    try {
      const users = await db
        .select({
          userId: tenantUsers.userId,
          employeeCode: sql`COALESCE(${tenantUsers.employeeCode}, ${tenantUsers.userId})`,
          personalInfo: sql`json_build_object(
            'firstName', ${tenantUsers.firstName},
            'lastName', ${tenantUsers.lastName},
            'email', ${tenantUsers.email}
          )`,
          organization: sql`json_build_object(
            'orgCode', COALESCE(${tenantUsers.organizationId}, ${tenantId}),
            'department', ${tenantUsers.department},
            'designation', ${tenantUsers.title}
          )`,
          status: sql`json_build_object(
            'isActive', ${tenantUsers.isActive},
            'lastActivityAt', ${tenantUsers.lastLoginAt}
          )`,
          roles: sql`(SELECT json_agg(json_build_object(
            'roleId', ${customRoles.roleId},
            'roleName', ${customRoles.roleName},
            'permissions', COALESCE(${customRoles.permissions}, '[]'::jsonb),
            'isActive', ${customRoles.isActive},
            'priority', COALESCE(${customRoles.priority}, 0)
          )) FROM ${customRoles}
          LEFT JOIN ${userRoleAssignments} ON ${customRoles.roleId} = ${userRoleAssignments.roleId}
          WHERE ${userRoleAssignments.userId} = ${tenantUsers.userId})`,
          permissions: sql`json_build_object(
            'effective', (SELECT array_agg(DISTINCT permission) FROM ${userRoleAssignments} ura
                         LEFT JOIN ${customRoles} cr ON ura.roleId = cr.roleId
                         WHERE ura.userId = ${tenantUsers.userId}
                         AND cr.permissions IS NOT NULL),
            'inherited', '[]'::jsonb
          )`
        })
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true)));

      return { success: true, count: users.length, data: users };
    } catch (error) {
      console.error(`❌ Error syncing user profiles for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync organizations
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncOrganizations(tenantId) {
    try {
      const organizations = await db
        .select({
          orgCode: entities.entityId,
          orgName: entities.entityName,
          parentId: entities.parentEntityId,
          status: sql`CASE WHEN ${entities.isActive} THEN 'active' ELSE 'inactive' END`,
          hierarchy: sql`json_build_object(
            'level', ${entities.entityLevel},
            'path', ${entities.hierarchyPath},
            'children', '[]'::jsonb
          )`,
          metadata: sql`json_build_object(
            'description', ${entities.description},
            'type', ${entities.entityType}
          )`
        })
        .from(entities)
        .where(and(eq(entities.tenantId, tenantId), eq(entities.isActive, true)));

      return { success: true, count: organizations.length, data: organizations };
    } catch (error) {
      console.error(`❌ Error syncing organizations for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync detailed tenant users
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncTenantUsers(tenantId) {
    try {
      const tenantUsersData = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          kindeId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          primaryOrganizationId: tenantUsers.organizationId,
          isResponsiblePerson: sql`CASE WHEN ${tenantUsers.isTenantAdmin} THEN true ELSE false END`,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          isVerified: sql`true`,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          lastLoginAt: tenantUsers.lastLoginAt,
          loginCount: sql`0`,
          preferences: sql`COALESCE(${tenantUsers.preferences}, '{}'::jsonb)`,
          profile: sql`json_build_object(
            'title', ${tenantUsers.title},
            'department', ${tenantUsers.department},
            'employeeCode', COALESCE(${tenantUsers.employeeCode}, ${tenantUsers.userId})
          )`,
          security: sql`json_build_object(
            'isActive', ${tenantUsers.isActive}
          )`,
          metadata: sql`json_build_object(
            'avatar', ${tenantUsers.avatar},
            'name', ${tenantUsers.name}
          )`
        })
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true)));

      return { success: true, count: tenantUsersData.length, data: tenantUsersData };
    } catch (error) {
      console.error(`❌ Error syncing detailed tenant users for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync credit configurations
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncCreditConfigs(tenantId) {
    try {
      // For now, return default credit configurations
      const creditConfigs = [{
        configId: `default_${tenantId}`,
        tenantId: tenantId,
        entityId: tenantId,
        configName: 'Default Credit Configuration',
        creditLimit: 1000,
        resetPeriod: 'monthly',
        resetDay: 1,
        lastResetAt: null,
        isActive: true,
        metadata: {
          description: 'Default credit configuration for tenant',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }];

      return { success: true, count: creditConfigs.length, data: creditConfigs };
    } catch (error) {
      console.error(`❌ Error syncing credit configs for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync entity credits
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncEntityCredits(tenantId) {
    try {
      const entityCredits = await db
        .select({
          tenantId: creditAllocations.tenantId,
          entityId: creditAllocations.entityId,
          allocatedCredits: creditAllocations.allocatedCredits,
          targetApplication: creditAllocations.targetApplication,
          usedCredits: creditAllocations.usedCredits,
          availableCredits: sql`${creditAllocations.allocatedCredits} - ${creditAllocations.usedCredits}`,
          allocationType: creditAllocations.allocationType,
          allocationPurpose: creditAllocations.allocationPurpose,
          expiresAt: creditAllocations.expiresAt,
          isActive: creditAllocations.isActive,
          allocationSource: creditAllocations.allocationSource,
          allocatedBy: creditAllocations.allocatedBy,
          allocatedAt: creditAllocations.allocatedAt,
          metadata: creditAllocations.metadata
        })
        .from(creditAllocations)
        .where(eq(creditAllocations.tenantId, tenantId));

      return { success: true, count: entityCredits.length, data: entityCredits };
    } catch (error) {
      console.error(`❌ Error syncing entity credits for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync employee assignments
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncEmployeeAssignments(tenantId) {
    try {
      const assignments = await db
        .select({
          assignmentId: sql`${tenantUsers.userId} || '_' || COALESCE(${tenantUsers.organizationId}, ${tenantId})`,
          tenantId: tenantUsers.tenantId,
          userId: tenantUsers.userId,
          entityId: sql`COALESCE(${tenantUsers.organizationId}, ${tenantId})`,
          assignmentType: sql`'primary'`,
          isActive: tenantUsers.isActive,
          assignedAt: tenantUsers.createdAt,
          expiresAt: sql`NULL`,
          assignedBy: sql`NULL`,
          deactivatedAt: sql`NULL`,
          deactivatedBy: sql`NULL`,
          priority: sql`1`,
          metadata: sql`json_build_object(
            'department', ${tenantUsers.department},
            'designation', ${tenantUsers.title},
            'employeeCode', COALESCE(${tenantUsers.employeeCode}, ${tenantUsers.userId})
          )`
        })
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true)));

      return { success: true, count: assignments.length, data: assignments };
    } catch (error) {
      console.error(`❌ Error syncing employee assignments for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Sync role assignments
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync result
   */
  static async syncRoleAssignments(tenantId) {
    try {
      const roleAssignments = await db
        .select({
          assignmentId: sql`${userRoleAssignments.userId} || '_' || ${userRoleAssignments.roleId}`,
          tenantId: userRoleAssignments.tenantId,
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          entityId: sql`COALESCE(${tenantUsers.organizationId}, ${tenantId})`,
          assignedBy: userRoleAssignments.assignedBy,
          assignedAt: userRoleAssignments.assignedAt,
          expiresAt: sql`NULL`,
          isActive: userRoleAssignments.isActive,
          metadata: sql`json_build_object(
            'userEmail', ${tenantUsers.email},
            'userName', ${tenantUsers.name},
            'roleName', ${customRoles.roleName}
          )`
        })
        .from(userRoleAssignments)
        .innerJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .innerJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(userRoleAssignments.tenantId, tenantId),
          eq(userRoleAssignments.isActive, true)
        ));

      return { success: true, count: roleAssignments.length, data: roleAssignments };
    } catch (error) {
      console.error(`❌ Error syncing role assignments for ${tenantId}:`, error);
      return { success: false, error: error.message, count: 0 };
    }
  }

  /**
   * Get sync status for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Sync status
   */
  static async getSyncStatus(tenantId) {
    try {
      // Check last sync timestamp and data counts
      const [tenantCount] = await db
        .select({ count: sql`count(*)` })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId));

      const [userCount] = await db
        .select({ count: sql`count(*)` })
        .from(tenantUsers)
        .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.isActive, true)));

      const [orgCount] = await db
        .select({ count: sql`count(*)` })
        .from(entities)
        .where(and(eq(entities.tenantId, tenantId), eq(entities.isActive, true)));

      const [creditConfigCount] = await db
        .select({ count: sql`count(*)` })
        .from(creditAllocations)
        .where(eq(creditAllocations.tenantId, tenantId));

      return {
        lastSync: new Date(), // Would be stored in a sync log table
        isComplete: tenantCount.count > 0 && userCount.count > 0 && orgCount.count > 0,
        dataCounts: {
          users: userCount.count,
          organizations: orgCount.count,
          tenantUsers: userCount.count, // Same as users for now
          creditConfigs: 1, // Default config
          entityCredits: creditConfigCount.count,
          employeeAssignments: userCount.count,
          roleAssignments: await this.getRoleAssignmentCount(tenantId)
        }
      };
    } catch (error) {
      console.error(`❌ Error getting sync status for ${tenantId}:`, error);
      throw error;
    }
  }

  /**
   * Get role assignment count for tenant
   * @param {string} tenantId - Tenant ID
   * @returns {number} Count of role assignments
   */
  static async getRoleAssignmentCount(tenantId) {
    try {
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(userRoleAssignments)
        .where(and(eq(userRoleAssignments.tenantId, tenantId), eq(userRoleAssignments.isActive, true)));

      return count;
    } catch (error) {
      console.error(`❌ Error getting role assignment count for ${tenantId}:`, error);
      return 0;
    }
  }

  /**
   * Get data requirements specification
   * @returns {Object} Complete data requirements specification
   */
  static getDataRequirements() {
    return {
      essentialData: {
        tenant: {
          required: true,
          description: 'Basic tenant information',
          fields: [
            'tenantId', 'tenantName', 'status', 'settings', 'subscription',
            'organization', 'hierarchy'
          ]
        },
        userProfiles: {
          required: true,
          description: 'User profiles with permissions',
          fields: [
            'userId', 'employeeCode', 'personalInfo', 'organization',
            'status', 'permissions', 'roles'
          ]
        },
        organizations: {
          required: true,
          description: 'Organization hierarchy',
          fields: [
            'orgCode', 'orgName', 'parentId', 'status', 'hierarchy', 'metadata'
          ]
        }
      },
      referenceData: {
        tenantUsers: {
          required: false,
          description: 'Detailed user information',
          fields: [
            'userId', 'tenantId', 'kindeId', 'email', 'firstName', 'lastName',
            'primaryOrganizationId', 'isResponsiblePerson', 'isTenantAdmin',
            'isVerified', 'onboardingCompleted', 'lastLoginAt', 'loginCount',
            'preferences', 'profile', 'security', 'metadata'
          ]
        },
        roles: {
          required: false,
          description: 'Role definitions',
          fields: [
            'roleId', 'roleName', 'permissions', 'priority', 'isActive', 'description'
          ]
        },
        creditConfigs: {
          required: false,
          description: 'Credit operation configurations',
          fields: [
            'configId', 'tenantId', 'entityId', 'configName', 'creditLimit',
            'resetPeriod', 'resetDay', 'lastResetAt', 'isActive', 'metadata'
          ]
        },
        entityCredits: {
          required: false,
          description: 'Entity credit allocations',
          fields: [
            'tenantId', 'entityId', 'allocatedCredits', 'targetApplication',
            'usedCredits', 'availableCredits', 'allocationType', 'allocationPurpose',
            'expiresAt', 'isActive', 'allocationSource', 'allocatedBy',
            'allocatedAt', 'metadata'
          ]
        },
        employeeAssignments: {
          required: false,
          description: 'User-organization relationships',
          fields: [
            'assignmentId', 'tenantId', 'userId', 'entityId', 'assignmentType',
            'isActive', 'assignedAt', 'expiresAt', 'assignedBy', 'deactivatedAt',
            'deactivatedBy', 'priority', 'metadata'
          ]
        },
        roleAssignments: {
          required: false,
          description: 'User role assignments',
          fields: [
            'assignmentId', 'tenantId', 'userId', 'roleId', 'entityId',
            'assignedBy', 'assignedAt', 'expiresAt', 'isActive', 'metadata'
          ]
        }
      },
      syncConfiguration: {
        batchSize: 50,
        timeout: 30000,
        progressiveSync: true,
        errorHandling: 'continue',
        validation: true
      }
    };
  }
}
