import { db } from '../db/index.js';
import { 
  tenants, 
  tenantUsers, 
  customRoles, 
  userRoleAssignments,
  subscriptions,
  payments,
  auditLogs,
  organizationApplications,
  userApplicationPermissions,
  userSessions
} from '../db/schema/index.js';
import { eq, and, like, count, or } from 'drizzle-orm';

/**
 * Delete all data related to a tenant
 * Deletes in correct order to respect foreign key constraints
 */
export const deleteTenantData = async (tenantId) => {
  console.log(`🗑️ Starting cleanup for tenant: ${tenantId}`);
  
  const deletionResults = {
    tenantId,
    deletedRecords: {},
    startTime: new Date(),
    endTime: null,
    success: false,
    errors: []
  };

  try {
    // Start transaction to ensure atomicity
    await db.transaction(async (tx) => {
      
      // 1. Delete user role assignments first (has FKs to both tenantUsers and customRoles)
      console.log('🔄 Deleting user role assignments...');
      
      // Get all user IDs for this tenant
      const tenantUserIds = await tx
        .select({ userId: tenantUsers.userId })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));
      
      let userRoleAssignmentsResult = [];
      if (tenantUserIds.length > 0) {
        const userIds = tenantUserIds.map(row => row.userId);
        // Delete user role assignments for all users in this tenant
        userRoleAssignmentsResult = await tx
          .delete(userRoleAssignments)
          .where(
            or(
              ...userIds.map(userId => eq(userRoleAssignments.userId, userId))
            )
          )
          .returning({ id: userRoleAssignments.id });
      }
      deletionResults.deletedRecords.userRoleAssignments = userRoleAssignmentsResult.length;
      console.log(`✅ Deleted ${userRoleAssignmentsResult.length} user role assignments`);

      // 2. Delete user application permissions (has FK to tenantUsers)
      console.log('🔄 Deleting user application permissions...');
      let userAppPermsResult = [];
      if (tenantUserIds.length > 0) {
        const userIds = tenantUserIds.map(row => row.userId);
        userAppPermsResult = await tx
          .delete(userApplicationPermissions)
          .where(
            or(
              ...userIds.map(userId => eq(userApplicationPermissions.userId, userId))
            )
          )
          .returning({ id: userApplicationPermissions.id });
      }
      deletionResults.deletedRecords.userApplicationPermissions = userAppPermsResult.length;
      console.log(`✅ Deleted ${userAppPermsResult.length} user application permissions`);

      // 3. Delete user sessions (has FK to tenantUsers)
      console.log('🔄 Deleting user sessions...');
      const userSessionsResult = await tx
        .delete(userSessions)
        .where(eq(userSessions.tenantId, tenantId))
        .returning({ id: userSessions.sessionId });
      deletionResults.deletedRecords.userSessions = userSessionsResult.length;
      console.log(`✅ Deleted ${userSessionsResult.length} user sessions`);

      // 4. Delete audit logs (has FK to tenantUsers - must delete before tenant users)
      console.log('🔄 Deleting audit logs...');
      const auditLogsResult = await tx
        .delete(auditLogs)
        .where(eq(auditLogs.tenantId, tenantId))
        .returning({ id: auditLogs.logId });
      deletionResults.deletedRecords.auditLogs = auditLogsResult.length;
      console.log(`✅ Deleted ${auditLogsResult.length} audit logs`);

      // 5. Delete custom roles (has FK to tenants and created_by FK to tenant_users)
      console.log('🔄 Deleting custom roles...');
      const customRolesResult = await tx
        .delete(customRoles)
        .where(eq(customRoles.tenantId, tenantId))
        .returning({ id: customRoles.roleId });
      deletionResults.deletedRecords.customRoles = customRolesResult.length;
      console.log(`✅ Deleted ${customRolesResult.length} custom roles`);

      // 6. Delete tenant users (has FK to tenants)
      console.log('🔄 Deleting tenant users...');
      const tenantUsersResult = await tx
        .delete(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .returning({ id: tenantUsers.userId });
      deletionResults.deletedRecords.tenantUsers = tenantUsersResult.length;
      console.log(`✅ Deleted ${tenantUsersResult.length} tenant users`);

      // 7. Delete payments (has FK to subscriptions)
      console.log('🔄 Deleting payments...');
      const paymentsResult = await tx
        .delete(payments)
        .where(eq(payments.tenantId, tenantId))
        .returning({ id: payments.paymentId });
      deletionResults.deletedRecords.payments = paymentsResult.length;
      console.log(`✅ Deleted ${paymentsResult.length} payments`);

      // 8. Delete subscriptions (has FK to tenants)
      console.log('🔄 Deleting subscriptions...');
      const subscriptionsResult = await tx
        .delete(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId))
        .returning({ id: subscriptions.subscriptionId });
      deletionResults.deletedRecords.subscriptions = subscriptionsResult.length;
      console.log(`✅ Deleted ${subscriptionsResult.length} subscriptions`);

      // 9. Delete organization applications (has FK to tenants)
      console.log('🔄 Deleting organization applications...');
      const orgAppsResult = await tx
        .delete(organizationApplications)
        .where(eq(organizationApplications.tenantId, tenantId))
        .returning({ id: organizationApplications.id });
      deletionResults.deletedRecords.organizationApplications = orgAppsResult.length;
      console.log(`✅ Deleted ${orgAppsResult.length} organization applications`);

      // 10. Finally, delete the tenant itself
      console.log('🔄 Deleting tenant...');
      const tenantResult = await tx
        .delete(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .returning({ id: tenants.tenantId });
      deletionResults.deletedRecords.tenants = tenantResult.length;
      console.log(`✅ Deleted ${tenantResult.length} tenant record`);

      if (tenantResult.length === 0) {
        throw new Error(`Tenant ${tenantId} not found`);
      }
    });

    deletionResults.success = true;
    deletionResults.endTime = new Date();
    
    console.log('🎉 Tenant cleanup completed successfully!');
    console.log('📊 Summary:', {
      tenantId,
      totalTime: `${deletionResults.endTime - deletionResults.startTime}ms`,
      deletedRecords: deletionResults.deletedRecords
    });

    return deletionResults;

  } catch (error) {
    deletionResults.success = false;
    deletionResults.endTime = new Date();
    deletionResults.errors.push(error.message);
    
    console.error('🚨 Tenant cleanup failed:', error);
    throw error;
  }
};

/**
 * Delete multiple tenants by email domain (useful for cleaning up test accounts)
 */
export const deleteTenantsByDomain = async (emailDomain) => {
  console.log(`🗑️ Starting cleanup for tenants with email domain: ${emailDomain}`);
  
  try {
    // Find all tenants with matching email domain
    const tenantsToDelete = await db
      .select({ tenantId: tenants.tenantId, adminEmail: tenants.adminEmail })
      .from(tenants)
      .where(like(tenants.adminEmail, `%@${emailDomain}`));

    console.log(`Found ${tenantsToDelete.length} tenants to delete`);

    const results = [];
    
    for (const tenant of tenantsToDelete) {
      console.log(`\n--- Deleting tenant: ${tenant.adminEmail} ---`);
      try {
        const result = await deleteTenantData(tenant.tenantId);
        results.push(result);
      } catch (error) {
        console.error(`Failed to delete tenant ${tenant.tenantId}:`, error);
        results.push({
          tenantId: tenant.tenantId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      domain: emailDomain,
      totalTenants: tenantsToDelete.length,
      results
    };

  } catch (error) {
    console.error('🚨 Domain cleanup failed:', error);
    throw error;
  }
};

/**
 * Get tenant data summary (useful before deletion)
 */
export const getTenantDataSummary = async (tenantId) => {
  try {
    const [tenantInfo] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId));

    if (!tenantInfo) {
      throw new Error(`Tenant ${tenantId} not found`);
    }

    // Count records in each related table
    // First get all tenant user IDs
    const tenantUserIds = await db
      .select({ userId: tenantUsers.userId })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));
    
    let userRoleAssignmentsCount = { count: 0 };
    if (tenantUserIds.length > 0) {
      const userIds = tenantUserIds.map(row => row.userId);
      [userRoleAssignmentsCount] = await db
        .select({ count: count() })
        .from(userRoleAssignments)
        .where(
          or(
            ...userIds.map(userId => eq(userRoleAssignments.userId, userId))
          )
        );
    }

    let userAppPermsCount = { count: 0 };
    if (tenantUserIds.length > 0) {
      const userIds = tenantUserIds.map(row => row.userId);
      [userAppPermsCount] = await db
        .select({ count: count() })
        .from(userApplicationPermissions)
        .where(
          or(
            ...userIds.map(userId => eq(userApplicationPermissions.userId, userId))
          )
        );
    }

    const [userSessionsCount] = await db
      .select({ count: count() })
      .from(userSessions)
      .where(eq(userSessions.tenantId, tenantId));

    const [tenantUsersCount] = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    const [customRolesCount] = await db
      .select({ count: count() })
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    const [subscriptionsCount] = await db
      .select({ count: count() })
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId));

    const [paymentsCount] = await db
      .select({ count: count() })
      .from(payments)
      .where(eq(payments.tenantId, tenantId));

    const [orgAppsCount] = await db
      .select({ count: count() })
      .from(organizationApplications)
      .where(eq(organizationApplications.tenantId, tenantId));

    const [auditLogsCount] = await db
      .select({ count: count() })
      .from(auditLogs)
      .where(eq(auditLogs.tenantId, tenantId));

    return {
      tenant: tenantInfo,
      recordCounts: {
        userRoleAssignments: userRoleAssignmentsCount.count,
        userApplicationPermissions: userAppPermsCount.count,
        userSessions: userSessionsCount.count,
        tenantUsers: tenantUsersCount.count,
        customRoles: customRolesCount.count,
        subscriptions: subscriptionsCount.count,
        payments: paymentsCount.count,
        organizationApplications: orgAppsCount.count,
        auditLogs: auditLogsCount.count
      }
    };

  } catch (error) {
    console.error('🚨 Failed to get tenant summary:', error);
    throw error;
  }
}; 