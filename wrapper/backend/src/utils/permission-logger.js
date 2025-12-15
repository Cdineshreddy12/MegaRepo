/**
 * Permission Logging Utility
 * Provides comprehensive logging for user permissions and access patterns
 */

class PermissionLogger {
  static logUserContext(userContext, action = 'access') {
    console.log(`🔑 [PermissionLogger] User context (${action}):`, {
      userId: userContext?.userId,
      internalUserId: userContext?.internalUserId,
      tenantId: userContext?.tenantId,
      email: userContext?.email,
      name: userContext?.name,
      isAuthenticated: userContext?.isAuthenticated,
      needsOnboarding: userContext?.needsOnboarding,
      onboardingCompleted: userContext?.onboardingCompleted,
      isActive: userContext?.isActive,
      adminStatus: {
        isAdmin: userContext?.isAdmin,
        isTenantAdmin: userContext?.isTenantAdmin
      },
      organizations: {
        kindeOrgId: userContext?.kindeOrgId,
        hasMultiple: userContext?.hasMultipleOrganizations
      }
    });
  }

  static logPermissionCheck(requiredPermissions, userContext, result) {
    console.log('🔐 [PermissionLogger] Permission check:', {
      action: 'permission_check',
      userId: userContext?.internalUserId,
      tenantId: userContext?.tenantId,
      email: userContext?.email,
      requiredPermissions: Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions],
      result: result ? 'GRANTED' : 'DENIED',
      isAdmin: userContext?.isAdmin || userContext?.isTenantAdmin,
      timestamp: new Date().toISOString()
    });
  }

  static logRoleAssignment(assignmentData, result = 'started') {
    console.log('🔒 [PermissionLogger] Role assignment:', {
      action: 'role_assignment',
      userId: assignmentData.userId,
      roleId: assignmentData.roleId,
      tenantId: assignmentData.tenantId,
      assignedBy: assignmentData.assignedBy,
      hasExpiration: !!assignmentData.expiresAt,
      result,
      timestamp: new Date().toISOString()
    });
  }

  static logRoleCreation(roleData, result = 'started') {
    console.log('➕ [PermissionLogger] Role creation:', {
      action: 'role_creation',
      roleName: roleData.name,
      tenantId: roleData.tenantId,
      createdBy: roleData.createdBy,
      hasPermissions: !!roleData.permissions,
      hasRestrictions: !!roleData.restrictions,
      hasInheritance: !!(roleData.inheritance?.parentRoles?.length),
      permissionCount: roleData.permissions ? Object.keys(roleData.permissions).length : 0,
      result,
      timestamp: new Date().toISOString()
    });
  }

  static logRoleUpdate(roleId, updateData, tenantId, userId, result = 'started') {
    console.log('🔄 [PermissionLogger] Role update:', {
      action: 'role_update',
      roleId,
      tenantId,
      updatedBy: userId,
      updatedFields: Object.keys(updateData),
      hasPermissionChanges: !!updateData.permissions,
      hasRestrictionChanges: !!updateData.restrictions,
      result,
      timestamp: new Date().toISOString()
    });
  }

  static logPermissionLookup(userId, tenantId, rolesFound, permissionsFound) {
    console.log('🔍 [PermissionLogger] Permission lookup:', {
      action: 'permission_lookup',
      userId,
      tenantId,
      rolesFound: rolesFound || 0,
      permissionsFound: permissionsFound || 0,
      roles: Array.isArray(rolesFound) ? rolesFound.map(r => r.roleName || r.name) : [],
      timestamp: new Date().toISOString()
    });
  }

  static logAuthStatus(userContext, responseData) {
    console.log('📤 [PermissionLogger] Auth status response:', {
      action: 'auth_status',
      userId: userContext?.internalUserId,
      email: userContext?.email,
      tenantId: userContext?.tenantId,
      hasUser: !!responseData.user,
      hasTenant: !!responseData.tenant,
      permissionCount: responseData.permissions?.length || 0,
      roleCount: responseData.roles?.length || 0,
      isAuthenticated: responseData.authStatus?.isAuthenticated,
      permissions: responseData.permissions?.map(p => p.name) || [],
      roles: responseData.roles?.map(r => r.roleName) || [],
      timestamp: new Date().toISOString()
    });
  }

  static logPermissionError(error, context = {}) {
    console.error('❌ [PermissionLogger] Permission error:', {
      action: 'permission_error',
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    });
  }

  static logDatabaseOperation(operation, table, filters = {}, result = {}) {
    console.log(`🗄️ [PermissionLogger] Database operation:`, {
      action: 'database_operation',
      operation,
      table,
      filters,
      resultCount: result.length || (result.count !== undefined ? result.count : 'unknown'),
      timestamp: new Date().toISOString()
    });
  }

  static logSecurityEvent(eventType, userContext, details = {}) {
    console.log(`🚨 [PermissionLogger] Security event:`, {
      action: 'security_event',
      eventType,
      userId: userContext?.internalUserId,
      email: userContext?.email,
      tenantId: userContext?.tenantId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  static logAccessAttempt(resource, action, userContext, result) {
    console.log(`🎯 [PermissionLogger] Access attempt:`, {
      action: 'access_attempt',
      resource,
      resourceAction: action,
      userId: userContext?.internalUserId,
      email: userContext?.email,
      tenantId: userContext?.tenantId,
      result: result ? 'ALLOWED' : 'DENIED',
      isAdmin: userContext?.isAdmin || userContext?.isTenantAdmin,
      timestamp: new Date().toISOString()
    });
  }

  static logPerformanceMetric(operation, duration, userContext = null) {
    console.log(`⏱️ [PermissionLogger] Performance metric:`, {
      action: 'performance_metric',
      operation,
      duration: `${duration}ms`,
      userId: userContext?.internalUserId,
      tenantId: userContext?.tenantId,
      timestamp: new Date().toISOString()
    });
  }

  // Helper method to safely extract user info for logging
  static extractUserInfo(userContext) {
    if (!userContext) return { userId: null, email: null, tenantId: null };
    
    return {
      userId: userContext.internalUserId || userContext.userId,
      email: userContext.email,
      tenantId: userContext.tenantId,
      isAdmin: userContext.isAdmin || userContext.isTenantAdmin
    };
  }

  // Method to log permission aggregation details
  static logPermissionAggregation(userId, tenantId, roles, aggregatedPermissions) {
    console.log('🧮 [PermissionLogger] Permission aggregation:', {
      action: 'permission_aggregation',
      userId,
      tenantId,
      inputRoles: roles.map(r => ({
        roleId: r.roleId,
        roleName: r.roleName,
        hasPermissions: !!r.permissions
      })),
      outputPermissions: {
        resourceCount: Object.keys(aggregatedPermissions).length,
        resources: Object.keys(aggregatedPermissions),
        totalOperations: Object.values(aggregatedPermissions).reduce((total, resource) => {
          return total + (resource.operations?.length || 0);
        }, 0)
      },
      timestamp: new Date().toISOString()
    });
  }
}

export default PermissionLogger; 