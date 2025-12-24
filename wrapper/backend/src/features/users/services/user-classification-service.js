import { db } from '../../../db/index.js';
import { eq, and, inArray } from 'drizzle-orm';
import { 
  tenantUsers, 
  customRoles, 
  userRoleAssignments,
  subscriptions,
  tenants,
  // Include application-level schemas to read direct user permissions
  userApplicationPermissions,
  applications,
  applicationModules
} from '../../../db/schema/index.js';
import { PermissionMatrixUtils, PLAN_ACCESS_MATRIX } from '../../../data/permission-matrix.js';

/**
 * 🎯 User Classification Service
 * 
 * This service classifies users based on their application access and provides
 * methods for synchronizing users to different applications.
 */
export class UserClassificationService {

  /**
   * Get all users classified by their application access
   * @param {string} tenantId - The tenant ID to filter users
   * @returns {Object} Users grouped by applications they can access
   */
  static async classifyUsersByApplication(tenantId) {
    try {
      console.log('🔍 Starting user classification for tenant:', tenantId);

      // Get all users with their subscription and role information
      const users = await db
        .select({
          // User data
          userId: tenantUsers.userId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          department: tenantUsers.department,
          title: tenantUsers.title,
          lastActiveAt: tenantUsers.lastActiveAt,
          
          // Subscription data
          subscriptionTier: subscriptions.plan,
          subscriptionStatus: subscriptions.status,
          subscribedFeatures: subscriptions.subscribedTools,
          
          // Tenant data
          companyName: tenants.companyName,
          subdomain: tenants.subdomain
        })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.tenantId))
        .leftJoin(subscriptions, eq(tenants.tenantId, subscriptions.tenantId))
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true)
        ));

      console.log(`📊 Found ${users.length} active users for classification`);

      // Get user roles and permissions for all users
      const userRoles = await this.getUserRolesWithPermissions(users.map(u => u.userId), tenantId);
      
      console.log('🔍 User roles and permissions:', {
        userIds: users.map(u => u.userId),
        userRolesKeys: Object.keys(userRoles),
        sampleUserRole: userRoles[users[0]?.userId] || 'No roles found'
      });

      // Create user classification map
      const classifiedUsers = {
        summary: {
          totalUsers: users.length,
          applicationBreakdown: {},
          subscriptionBreakdown: {}
        },
        byApplication: {},
        byUser: {}
      };

      // Initialize application groups based on actual permission data
      const applications = ['crm', 'hr', 'affiliate', 'system'];
      applications.forEach(appCode => {
        classifiedUsers.byApplication[appCode] = {
          appInfo: {
            appCode,
            appName: this.getAppName(appCode),
            description: this.getAppDescription(appCode),
            icon: this.getAppIcon(appCode),
            baseUrl: this.getAppUrl(appCode)
          },
          users: [],
          totalUsers: 0
        };
      });

      // Classify each user
      for (const user of users) {
        const userPermissions = userRoles[user.userId] || { modules: {}, roles: [] };
        const allowedApps = this.determineUserAppAccess(user, userPermissions);
        
        // Create user classification entry
        const userClassification = {
          ...user,
          allowedApplications: allowedApps,
          roles: userPermissions.roles,
          permissions: userPermissions.modules,
          classificationReason: this.getClassificationReason(user, userPermissions, allowedApps)
        };

        // Add user to appropriate application groups
        allowedApps.forEach(appCode => {
          if (classifiedUsers.byApplication[appCode]) {
            classifiedUsers.byApplication[appCode].users.push(userClassification);
            classifiedUsers.byApplication[appCode].totalUsers++;
          }
        });

        // Add to by-user classification
        classifiedUsers.byUser[user.userId] = userClassification;

        // Update summary counts
        allowedApps.forEach(appCode => {
          classifiedUsers.summary.applicationBreakdown[appCode] = 
            (classifiedUsers.summary.applicationBreakdown[appCode] || 0) + 1;
        });

        const tier = user.subscriptionTier || 'free';
        classifiedUsers.summary.subscriptionBreakdown[tier] = 
          (classifiedUsers.summary.subscriptionBreakdown[tier] || 0) + 1;
      }

      console.log('✅ User classification completed');
      console.log('📊 Summary:', classifiedUsers.summary);

      return classifiedUsers;

    } catch (error) {
      console.error('❌ Error classifying users by application:', error);
      throw error;
    }
  }

  /**
   * Get users for a specific application
   * @param {string} tenantId - The tenant ID
   * @param {string} appCode - The application code (crm, hr, affiliate, etc.)
   * @returns {Array} Users who have access to the specified application
   */
  static async getUsersForApplication(tenantId, appCode) {
    try {
      const classification = await this.classifyUsersByApplication(tenantId);
      return classification.byApplication[appCode] || { appInfo: null, users: [], totalUsers: 0 };
    } catch (error) {
      console.error(`❌ Error getting users for application ${appCode}:`, error);
      throw error;
    }
  }

  /**
   * Get application access for a specific user
   * @param {string} userId - The user ID
   * @param {string} tenantId - The tenant ID
   * @returns {Object} User's application access information
   */
  static async getUserApplicationAccess(userId, tenantId) {
    try {
      const classification = await this.classifyUsersByApplication(tenantId);
      return classification.byUser[userId] || null;
    } catch (error) {
      console.error(`❌ Error getting user application access:`, error);
      throw error;
    }
  }

  /**
   * Determine which applications a user can access based on their role permissions
   * @param {Object} user - User data including subscription info
   * @param {Object} userPermissions - User's role permissions
   * @returns {Array} Array of application codes the user can access
   */
  static determineUserAppAccess(user, userPermissions) {
    console.log('🔍 Determining app access for user:', {
      userId: user.userId,
      isTenantAdmin: user.isTenantAdmin,
      rolesCount: userPermissions.roles?.length || 0,
      appsInModules: Object.keys(userPermissions.modules || {}),
      flatPermissionsCount: userPermissions.flatPermissions?.length || 0
    });
    
    const allowedApps = [];
    
    // Admin users get access to all applications that exist in the system
    if (user.isTenantAdmin) {
      console.log('✅ User is tenant admin, granting access to all apps');
      // Tenant admins can access all applications available in the business suite
      return ['crm', 'hr', 'affiliate', 'system'];
    }

    // Super admin users get access to everything
    if (userPermissions.isSuperAdmin || userPermissions.modules === '*') {
      return ['crm', 'hr', 'affiliate', 'system'];
    }

    // For regular users, check which applications they have actual permissions for
    const allApps = ['crm', 'hr', 'affiliate', 'system'];
    
    console.log('🔍 Checking permissions for apps:', allApps);
    
    allApps.forEach(appCode => {
      const hasPermissions = this.userHasAppPermissions(appCode, userPermissions);
      console.log(`🔍 App ${appCode}: ${hasPermissions ? '✅ Has permissions' : '❌ No permissions'}`);
      if (hasPermissions) {
        allowedApps.push(appCode);
      }
    });
    
    console.log('✅ Final allowed apps for user:', { userId: user.userId, allowedApps, roles: userPermissions.roles?.map(r => r.roleName) });
    return allowedApps;
  }

  /**
   * Get applications available for a subscription tier
   * @param {string} tier - Subscription tier
   * @returns {Array} Available applications for the tier
   */
  static getAppsForSubscriptionTier(tier) {
    const tierAccess = PLAN_ACCESS_MATRIX[tier] || PLAN_ACCESS_MATRIX.free;
    return tierAccess.applications || ['crm'];
  }

  /**
   * Check if user has permissions for a specific application
   * @param {string} appCode - Application code
   * @param {Object} userPermissions - User's permissions
   * @returns {boolean} Whether user has permissions for the app
   */
  static userHasAppPermissions(appCode, userPermissions) {
    console.log(`🔍 Checking permissions for app ${appCode}:`, {
      modules: userPermissions.modules,
      isSuperAdmin: userPermissions.isSuperAdmin,
      hasAppModules: !!userPermissions.modules[appCode],
      appModules: userPermissions.modules[appCode],
      flatPermissionsPreview: (userPermissions.flatPermissions || []).filter(p => p.startsWith(`${appCode}.`)).slice(0, 5)
    });
    
    // Super admin check
    if (userPermissions.modules === '*' || userPermissions.isSuperAdmin) {
      console.log(`✅ User has super admin access for ${appCode}`);
      return true;
    }

    // Primary: module map has any entries for this app
    let hasPermissions = userPermissions.modules[appCode] && 
           Object.keys(userPermissions.modules[appCode]).length > 0;

    // Fallback: if module map is empty, but flatPermissions contains any permission prefixed with `${appCode}.`
    if (!hasPermissions && Array.isArray(userPermissions.flatPermissions)) {
      hasPermissions = userPermissions.flatPermissions.some(p => typeof p === 'string' && p.startsWith(`${appCode}.`));
      if (hasPermissions) {
        console.log(`✅ Flat permission detected for app ${appCode}`);
      }
    }
    
    console.log(`🔍 App ${appCode} permission check result:`, hasPermissions);
    return hasPermissions;
  }

  /**
   * Get detailed user roles with permissions
   * @param {Array} userIds - Array of user IDs
   * @param {string} tenantId - Tenant ID
   * @returns {Object} User roles and permissions mapped by user ID
   */
  static async getUserRolesWithPermissions(userIds, tenantId) {
    if (userIds.length === 0) return {};

    try {
      console.log('🔎 getUserRolesWithPermissions: start', { tenantId, userCount: userIds.length, userIds });
      // Get user-role assignments joined with role definitions
      const assignmentsWithRoles = await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          isActive: userRoleAssignments.isActive,
          roleName: customRoles.roleName,
          rolePermissions: customRoles.permissions,
          roleRestrictions: customRoles.restrictions,
          rolePriority: customRoles.priority
        })
        .from(userRoleAssignments)
        .innerJoin(customRoles, and(
          eq(userRoleAssignments.roleId, customRoles.roleId),
          eq(customRoles.tenantId, tenantId)
        ))
        .where(and(
          inArray(userRoleAssignments.userId, userIds),
          eq(userRoleAssignments.isActive, true)
        ));

      console.log('🔎 getUserRolesWithPermissions: assignments fetched', {
        count: assignmentsWithRoles.length,
        sample: assignmentsWithRoles[0] || null
      });

      // Group by user and aggregate permissions
      const userPermissionsMap = {};
      
      userIds.forEach(userId => {
        userPermissionsMap[userId] = {
          modules: {},
          roles: [],
          isSuperAdmin: false,
          flatPermissions: []
        };
      });

      assignmentsWithRoles.forEach(assignment => {
        const userId = assignment.userId;
        
        // Add role to user
        userPermissionsMap[userId].roles.push({
          roleId: assignment.roleId,
          roleName: assignment.roleName,
          priority: assignment.rolePriority || 100
        });

        console.log('🔎 Processing role assignment', {
          userId,
          roleId: assignment.roleId,
          roleName: assignment.roleName,
          priority: assignment.rolePriority,
          permissionsType: typeof assignment.rolePermissions,
          permissionsPreview: typeof assignment.rolePermissions === 'string' ? assignment.rolePermissions.slice(0, 100) : assignment.rolePermissions
        });

        // Check for super admin
        if (assignment.roleName === 'Super Administrator' || assignment.rolePriority >= 1000) {
          userPermissionsMap[userId].isSuperAdmin = true;
          userPermissionsMap[userId].modules = '*';
          return;
        }

        // Aggregate permissions
        if (userPermissionsMap[userId].modules !== '*') {
          let rolePermissions;
          
          // Handle different permission formats
          if (typeof assignment.rolePermissions === 'string') {
            try {
              const parsed = JSON.parse(assignment.rolePermissions);
              // Normalize if parsed is an array form
              if (Array.isArray(parsed)) {
                rolePermissions = {};
                parsed.forEach(entry => {
                  // Support both array-of-strings and array-of-objects
                  if (typeof entry === 'string' && entry.includes('.')) {
                    const parts = entry.split('.');
                    const appCodeN = parts[0];
                    const moduleCodeN = parts[1];
                    const actionN = parts[2];
                    if (!rolePermissions[appCodeN]) rolePermissions[appCodeN] = {};
                    if (!rolePermissions[appCodeN][moduleCodeN]) rolePermissions[appCodeN][moduleCodeN] = [];
                    rolePermissions[appCodeN][moduleCodeN].push(actionN);
                  } else if (entry && typeof entry === 'object') {
                    const appCodeN = entry.appCode;
                    const moduleCodeN = entry.moduleCode || '__app__';
                    const actionsN = Array.isArray(entry.permissions) ? entry.permissions : [];
                    if (!appCodeN) return;
                    if (!rolePermissions[appCodeN]) rolePermissions[appCodeN] = {};
                    if (!rolePermissions[appCodeN][moduleCodeN]) rolePermissions[appCodeN][moduleCodeN] = [];
                    rolePermissions[appCodeN][moduleCodeN].push(...actionsN);
                  }
                });
              } else {
                rolePermissions = parsed || {};
              }
            } catch (e) {
              rolePermissions = {};
            }
          } else if (Array.isArray(assignment.rolePermissions)) {
            // Handle array format: ["crm.leads.read", "hr.employees.read"]
            rolePermissions = {};
            assignment.rolePermissions.forEach(permission => {
              if (typeof permission === 'string' && permission.includes('.')) {
                const parts = permission.split('.');
                const appCode = parts[0];
                const moduleCode = parts[1];
                const action = parts[2];
                
                if (!rolePermissions[appCode]) {
                  rolePermissions[appCode] = {};
                }
                if (!rolePermissions[appCode][moduleCode]) {
                  rolePermissions[appCode][moduleCode] = [];
                }
                rolePermissions[appCode][moduleCode].push(action);
              } else if (permission && typeof permission === 'object') {
                // Handle array-of-objects: { appCode, moduleCode, permissions: [] }
                const appCode = permission.appCode;
                const moduleCode = permission.moduleCode || '__app__';
                const actions = Array.isArray(permission.permissions) ? permission.permissions : [];
                if (!appCode) return;
                if (!rolePermissions[appCode]) rolePermissions[appCode] = {};
                if (!rolePermissions[appCode][moduleCode]) rolePermissions[appCode][moduleCode] = [];
                rolePermissions[appCode][moduleCode].push(...actions);
              }
            });
          } else {
            rolePermissions = assignment.rolePermissions || {};
          }

          console.log('🔎 Normalized rolePermissions map', rolePermissions);

          // Normalize object form where keys are like 'crm.contacts': ['read']
          if (rolePermissions && !Array.isArray(rolePermissions) && typeof rolePermissions === 'object') {
            const hasFlattenedKeys = Object.keys(rolePermissions).some(key => key.includes('.'));
            if (hasFlattenedKeys) {
              const normalized = {};
              Object.entries(rolePermissions).forEach(([compoundKey, actions]) => {
                if (typeof compoundKey === 'string' && compoundKey.includes('.')) {
                  const [appCodeN, moduleCodeN] = compoundKey.split('.');
                  if (!normalized[appCodeN]) normalized[appCodeN] = {};
                  if (!normalized[appCodeN][moduleCodeN]) normalized[appCodeN][moduleCodeN] = [];
                  const actionsArr = Array.isArray(actions) ? actions : [];
                  normalized[appCodeN][moduleCodeN].push(...actionsArr);
                }
              });
              rolePermissions = normalized;
            }
          }

          // Merge permissions into user's module permissions
          Object.keys(rolePermissions).forEach(appCode => {
            if (!userPermissionsMap[userId].modules[appCode]) {
              userPermissionsMap[userId].modules[appCode] = {};
            }
            
            const appModules = rolePermissions[appCode];
            if (typeof appModules === 'object') {
              Object.keys(appModules).forEach(moduleCode => {
                if (!userPermissionsMap[userId].modules[appCode][moduleCode]) {
                  userPermissionsMap[userId].modules[appCode][moduleCode] = [];
                }
                
                const modulePermissions = appModules[moduleCode];
                if (Array.isArray(modulePermissions)) {
                  userPermissionsMap[userId].modules[appCode][moduleCode] = [
                    ...new Set([
                      ...userPermissionsMap[userId].modules[appCode][moduleCode],
                      ...modulePermissions
                    ])
                  ];

                  // Also add to flat permissions for robust prefix checks
                  modulePermissions.forEach(action => {
                    const fullCode = `${appCode}.${moduleCode}.${action}`;
                    if (!userPermissionsMap[userId].flatPermissions.includes(fullCode)) {
                      userPermissionsMap[userId].flatPermissions.push(fullCode);
                    }
                  });
                }
              });
            }
          });

          console.log('🔎 Aggregated user permissions so far', {
            userId,
            rolesCount: userPermissionsMap[userId].roles.length,
            appsWithModules: Object.keys(userPermissionsMap[userId].modules),
            flatCount: userPermissionsMap[userId].flatPermissions.length
          });
        }
      });

      // Merge direct user_application_permissions into the user's permission map
      // This ensures users granted module access without a role are classified correctly
      let directGrants = [];
      try {
        // Preferred query: scoped by tenantId
        directGrants = await db
          .select({
            userId: userApplicationPermissions.userId,
            permissions: userApplicationPermissions.permissions,
            appCode: applications.appCode,
            moduleCode: applicationModules.moduleCode
          })
          .from(userApplicationPermissions)
          .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
          .leftJoin(applicationModules, eq(userApplicationPermissions.moduleId, applicationModules.moduleId))
          .where(and(
            inArray(userApplicationPermissions.userId, userIds),
            eq(userApplicationPermissions.tenantId, tenantId),
            eq(userApplicationPermissions.isActive, true)
          ));
        console.log('🔎 Direct grants fetched (scoped by tenantId)', { count: directGrants.length, sample: directGrants[0] || null });
      } catch (err) {
        // If tenant_id column is missing in the DB, fall back without tenant filter
        if (err && err.code === '42703') {
          console.warn('⚠️ user_application_permissions.tenant_id missing in DB. Falling back to query without tenant filter.');
          try {
            directGrants = await db
              .select({
                userId: userApplicationPermissions.userId,
                permissions: userApplicationPermissions.permissions,
                appCode: applications.appCode,
                moduleCode: applicationModules.moduleCode
              })
              .from(userApplicationPermissions)
              .innerJoin(applications, eq(userApplicationPermissions.appId, applications.appId))
              .leftJoin(applicationModules, eq(userApplicationPermissions.moduleId, applicationModules.moduleId))
              .where(and(
                inArray(userApplicationPermissions.userId, userIds),
                eq(userApplicationPermissions.isActive, true)
              ));
            console.log('🔎 Direct grants fetched (no tenant filter)', { count: directGrants.length, sample: directGrants[0] || null });
          } catch (fallbackErr) {
            console.error('❌ Direct grants fallback query failed:', fallbackErr);
            directGrants = [];
          }
        } else {
          console.error('❌ Direct grants query failed:', err);
          directGrants = [];
        }
      }

      directGrants.forEach(grant => {
        const { userId, appCode } = grant;
        // Skip if user already has wildcard access via super admin
        if (!userPermissionsMap[userId] || userPermissionsMap[userId].modules === '*') return;

        if (!userPermissionsMap[userId].modules[appCode]) {
          userPermissionsMap[userId].modules[appCode] = {};
        }

        // Use module code if present, otherwise attach at app level placeholder
        const targetModuleCode = grant.moduleCode || '__app__';
        const actions = Array.isArray(grant.permissions) ? grant.permissions : [];

        if (!userPermissionsMap[userId].modules[appCode][targetModuleCode]) {
          userPermissionsMap[userId].modules[appCode][targetModuleCode] = [];
        }

        userPermissionsMap[userId].modules[appCode][targetModuleCode] = [
          ...new Set([
            ...userPermissionsMap[userId].modules[appCode][targetModuleCode],
            ...actions
          ])
        ];

        // Track in flat permissions as well
        actions.forEach(action => {
          const fullCode = `${appCode}.${targetModuleCode}.${action}`;
          if (!userPermissionsMap[userId].flatPermissions.includes(fullCode)) {
            userPermissionsMap[userId].flatPermissions.push(fullCode);
          }
        });
      });

      console.log('🔎 getUserRolesWithPermissions: final map summary', Object.entries(userPermissionsMap).map(([uid, ctx]) => ({
        userId: uid,
        roles: ctx.roles.map(r => r.roleName),
        apps: Object.keys(ctx.modules),
        flatPermissions: ctx.flatPermissions.slice(0, 5)
      })));

      return userPermissionsMap;

    } catch (error) {
      console.error('❌ Error getting user roles with permissions:', error);
      return {};
    }
  }

  /**
   * Get classification reason for a user
   * @param {Object} user - User data
   * @param {Object} userPermissions - User permissions
   * @param {Array} allowedApps - Allowed applications
   * @returns {Object} Classification reason details
   */
  static getClassificationReason(user, userPermissions, allowedApps) {
    const reasons = [];
    
    if (user.isTenantAdmin) {
      reasons.push('Tenant Administrator - Full access to all applications');
    }

    if (userPermissions.isSuperAdmin) {
      reasons.push('Super Administrator - Full system access');
    }

    if (userPermissions.roles.length > 0) {
      reasons.push(`Roles: ${userPermissions.roles.map(r => r.roleName).join(', ')}`);
    }

    if (allowedApps.length > 0 && !user.isTenantAdmin && !userPermissions.isSuperAdmin) {
      reasons.push(`Permission-based access to: ${allowedApps.join(', ')}`);
    }

    const subscriptionTier = user.subscriptionTier || 'free';
    if (allowedApps.length === 0 && userPermissions.roles.length === 0) {
      reasons.push(`No application access - missing role assignments`);
    }

    return {
      primary: reasons[0] || 'No application access',
      details: reasons,
      subscriptionTier,
      roleCount: userPermissions.roles.length,
      hasCustomPermissions: Object.keys(userPermissions.modules).length > 0,
      allowedAppCount: allowedApps.length,
      accessMethod: user.isTenantAdmin ? 'admin' : userPermissions.isSuperAdmin ? 'super_admin' : userPermissions.roles.length > 0 ? 'role_based' : 'none'
    };
  }

  /**
   * Update user's application access based on role changes
   * @param {string} userId - User ID
   * @param {string} tenantId - Tenant ID
   * @returns {Object} Updated user classification
   */
  static async refreshUserClassification(userId, tenantId) {
    try {
      console.log('🔄 Refreshing user classification:', { userId, tenantId });
      
      const classification = await this.classifyUsersByApplication(tenantId);
      const userClassification = classification.byUser[userId];
      
      if (userClassification) {
        console.log('✅ User classification refreshed:', {
          userId,
          allowedApps: userClassification.allowedApplications
        });
      }
      
      return userClassification;
    } catch (error) {
      console.error('❌ Error refreshing user classification:', error);
      throw error;
    }
  }

  /**
   * Get application name by app code
   * @param {string} appCode - Application code
   * @returns {string} Application name
   */
  static getAppName(appCode) {
    const appNames = {
      'crm': 'Customer Relationship Management',
      'hr': 'Human Resources Management',
      'affiliate': 'Affiliate Management',
      'system': 'System Administration'
    };
    return appNames[appCode] || appCode.toUpperCase();
  }

  /**
   * Get application description by app code
   * @param {string} appCode - Application code
   * @returns {string} Application description
   */
  static getAppDescription(appCode) {
    const appDescriptions = {
      'crm': 'Complete CRM solution for managing customers, deals, and sales pipeline',
      'hr': 'Complete HR solution for employee management and payroll',
      'affiliate': 'Manage affiliate partners and commission tracking',
      'system': 'System administration and user management'
    };
    return appDescriptions[appCode] || `${appCode.toUpperCase()} Application`;
  }

  /**
   * Get application icon by app code
   * @param {string} appCode - Application code
   * @returns {string} Application icon
   */
  static getAppIcon(appCode) {
    const appIcons = {
      'crm': '🎫',
      'hr': '👥',
      'affiliate': '🤝',
      'system': '⚙️'
    };
    return appIcons[appCode] || '🔧';
  }

  /**
   * Get application URL by app code
   * @param {string} appCode - Application code
   * @returns {string} Application URL
   */
  static getAppUrl(appCode) {
    const appUrls = {
      'crm': 'https://crm.zopkit.com',
      'hr': 'http://localhost:3003',
      'affiliate': 'http://localhost:3004',
      'system': 'http://localhost:3000'
    };
    return appUrls[appCode] || '';
  }
}
