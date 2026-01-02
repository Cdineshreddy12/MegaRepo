import { db } from '../../../db/index.js';
import { eq, and, inArray, or, isNull, like } from 'drizzle-orm';
import { applications, applicationModules, organizationApplications, userApplicationPermissions } from '../../../db/schema/suite-schema.js';
import { customRoles } from '../../../db/schema/permissions.js';
import { creditConfigurations } from '../../../db/schema/credit_configurations.js';
import { PERMISSION_TIERS, getAccessibleModules, isModuleAccessible } from '../../../config/permission-tiers.js';
import { BUSINESS_SUITE_MATRIX } from '../../../data/permission-matrix.js';
import { crmSpecificSync } from '../../../services/crm-specific-sync.js';
import { v4 as uuidv4 } from 'uuid';

// Import the role event publishing function
import { publishRoleEventToApplications } from '../routes/roles.js';

/**
 * Convert flat permission array to hierarchical object format
 * @param {string[]} permissionsArray - Array of permission strings like ['crm.leads.read', 'crm.leads.create']
 * @returns {object} Hierarchical permission object like { crm: { leads: ['read', 'create'] } }
 */
function convertPermissionsToHierarchical(permissionsArray) {
  if (!Array.isArray(permissionsArray)) {
    return permissionsArray; // Return as-is if already in correct format
  }

  const hierarchical = {};

  permissionsArray.forEach(permission => {
    const parts = permission.split('.');
    if (parts.length >= 3) {
      const [app, module, operation] = parts;

      if (!hierarchical[app]) {
        hierarchical[app] = {};
      }
      if (!hierarchical[app][module]) {
        hierarchical[app][module] = [];
      }
      if (!hierarchical[app][module].includes(operation)) {
        hierarchical[app][module].push(operation);
      }
    }
  });

  return hierarchical;
}

/**
 * 🏗️ **CUSTOM ROLE SERVICE**
 * Demonstrates how to use applications/modules tables to create custom roles
 * and why we need organization_applications and user_application_permissions
 */

/**
 * Format permissions for UI compatibility using permission matrix definitions
 * Includes credit consumption information from tenant-specific or global configs
 */
async function formatPermissionsForUI(permissionCodes, appCode, moduleCode, tenantId) {
  if (!Array.isArray(permissionCodes)) return [];

  const formattedPermissions = [];

  // Get permission definitions from the business suite matrix
  const appMatrix = BUSINESS_SUITE_MATRIX[appCode];
  const moduleMatrix = appMatrix?.modules?.[moduleCode];

  // Get credit configurations for this tenant (tenant-specific first, then global fallback)
  // First, get tenant-specific configs
  const tenantConfigs = await db
    .select({
      operationCode: creditConfigurations.operationCode,
      creditCost: creditConfigurations.creditCost,
      unit: creditConfigurations.unit,
      unitMultiplier: creditConfigurations.unitMultiplier,
      isGlobal: creditConfigurations.isGlobal
    })
    .from(creditConfigurations)
    .where(and(
      eq(creditConfigurations.tenantId, tenantId), // Tenant-specific configs only
      eq(creditConfigurations.isActive, true),
      like(creditConfigurations.operationCode, `${appCode}.${moduleCode}.%`)
    ));

  // Then, get global configs for operations not covered by tenant-specific configs
  const tenantOperationCodes = new Set(tenantConfigs.map(c => c.operationCode));
  const globalConfigs = await db
    .select({
      operationCode: creditConfigurations.operationCode,
      creditCost: creditConfigurations.creditCost,
      unit: creditConfigurations.unit,
      unitMultiplier: creditConfigurations.unitMultiplier,
      isGlobal: creditConfigurations.isGlobal
    })
    .from(creditConfigurations)
    .where(and(
      isNull(creditConfigurations.tenantId), // Global configs only
      eq(creditConfigurations.isActive, true),
      like(creditConfigurations.operationCode, `${appCode}.${moduleCode}.%`)
    ));

  // Create a map of operation codes to credit costs
  // Tenant-specific configs take priority
  const creditCostMap = new Map();
  
  // First, add tenant-specific configs
  tenantConfigs.forEach(config => {
    const operationCode = config.operationCode;
    creditCostMap.set(operationCode, {
      creditCost: parseFloat(config.creditCost),
      unit: config.unit,
      unitMultiplier: parseFloat(config.unitMultiplier),
      isGlobal: config.isGlobal
    });
  });

  // Then, add global configs only for operations not covered by tenant-specific configs
  globalConfigs.forEach(config => {
    const operationCode = config.operationCode;
    if (!creditCostMap.has(operationCode)) {
      creditCostMap.set(operationCode, {
        creditCost: parseFloat(config.creditCost),
        unit: config.unit,
        unitMultiplier: parseFloat(config.unitMultiplier),
        isGlobal: config.isGlobal
      });
    }
  });

  if (moduleMatrix?.permissions) {
    // Use matrix definitions for proper names and descriptions
    const matrixPermissions = moduleMatrix.permissions;

    for (const code of permissionCodes) {
      // Handle both string codes and permission objects
      const permissionCode = typeof code === 'string' ? code : (code.code || code);

      // Find the permission in the matrix
      const matrixPerm = matrixPermissions.find(p => p.code === permissionCode);
      if (matrixPerm) {
        const operationCode = `${appCode}.${moduleCode}.${permissionCode}`;
        const creditConfig = creditCostMap.get(operationCode);

        formattedPermissions.push({
          code: matrixPerm.code,
          name: matrixPerm.name,
          description: matrixPerm.description,
          creditCost: creditConfig ? {
            cost: creditConfig.creditCost,
            unit: creditConfig.unit,
            unitMultiplier: creditConfig.unitMultiplier,
            isGlobal: creditConfig.isGlobal
          } : null
        });
      } else {
        // Fallback for permissions not in matrix
        const operationCode = `${appCode}.${moduleCode}.${permissionCode}`;
        const creditConfig = creditCostMap.get(operationCode);

        formattedPermissions.push({
          code: permissionCode,
          name: typeof permissionCode === 'string' ? permissionCode.charAt(0).toUpperCase() + permissionCode.slice(1).replace(/_/g, ' ') : permissionCode,
          description: typeof permissionCode === 'string' ? `${permissionCode.charAt(0).toUpperCase() + permissionCode.slice(1).replace(/_/g, ' ')} access` : `${permissionCode} access`,
          creditCost: creditConfig ? {
            cost: creditConfig.creditCost,
            unit: creditConfig.unit,
            unitMultiplier: creditConfig.unitMultiplier,
            isGlobal: creditConfig.isGlobal
          } : null
        });
      }
    }
  } else {
    // Fallback if no matrix definitions found
    for (const code of permissionCodes) {
      // Handle both string codes and permission objects
      const permissionCode = typeof code === 'string' ? code : (code.code || code);
      const operationCode = `${appCode}.${moduleCode}.${permissionCode}`;
      const creditConfig = creditCostMap.get(operationCode);

      formattedPermissions.push({
        code: permissionCode,
        name: typeof permissionCode === 'string' ? permissionCode.charAt(0).toUpperCase() + permissionCode.slice(1).replace(/_/g, ' ') : permissionCode,
        description: typeof permissionCode === 'string' ? `${permissionCode.charAt(0).toUpperCase() + permissionCode.slice(1).replace(/_/g, ' ')} access` : `${permissionCode} access`,
        creditCost: creditConfig ? {
          cost: creditConfig.creditCost,
          unit: creditConfig.unit,
          unitMultiplier: creditConfig.unitMultiplier,
          isGlobal: creditConfig.isGlobal
        } : null
      });
    }
  }

  return formattedPermissions;
}
export class CustomRoleService {

  /**
   * 1️⃣ **CREATE ROLE FROM APPLICATIONS & MODULES**
   * Shows how applications and modules tables are used for role creation
   */
  static async createRoleFromAppsAndModules({
    tenantId,
    roleName,
    description,
    selectedApps, // ['crm', 'hr']
    selectedModules, // { crm: ['leads', 'contacts'], hr: ['employees'] }
    selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
    restrictions = {},
    metadata = {},
    createdBy = null // Will get a default user if not provided
  }) {

    console.log('🏗️ Creating custom role from apps and modules...');
    console.log('📥 Received parameters:', {
      roleName,
      selectedApps,
      selectedModules,
      selectedPermissions: JSON.stringify(selectedPermissions, null, 2)
    });


    // 0. Get a default user for createdBy if not provided
    if (!createdBy) {
      const { tenantUsers } = await import('../../../db/schema/users.js');
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .limit(1);

      if (!user) {
        throw new Error(`No users found for tenant ${tenantId}. Cannot create role without a creator.`);
      }
      createdBy = user.userId;
      console.log(`📤 Using user ${user.email} as role creator`);
    }

    // 1. Get applications from database
    if (!selectedApps || selectedApps.length === 0) {
      throw new Error('No applications selected. Please select at least one application.');
    }

    const apps = await db
      .select()
      .from(applications)
      .where(inArray(applications.appCode, selectedApps));

    console.log(`📱 Found ${apps.length} applications:`, apps.map(a => a.appCode));

    // 2. Build permission list by iterating through apps and modules
    const permissions = [];
    const roleMetadata = {
      ...metadata,
      selectedApps,
      selectedModules,
      selectedPermissions,
      createdFrom: 'applications_modules',
      createdAt: new Date().toISOString()
    };

    for (const app of apps) {
      const appSelectedModules = selectedModules[app.appCode] || [];

      // Skip this app if no modules are selected
      if (appSelectedModules.length === 0) {
        console.log(`⚠️ App ${app.appCode} has no selected modules, skipping`);
        continue;
      }

      const appModules = await db
        .select()
        .from(applicationModules)
        .where(and(
          eq(applicationModules.appId, app.appId),
          inArray(applicationModules.moduleCode, appSelectedModules)
        ));

      console.log(`🧩 App ${app.appCode} has ${appModules.length} selected modules`);


      for (const module of appModules) {
        const moduleKey = `${app.appCode}.${module.moduleCode}`;
        const allowedPermissions = selectedPermissions[moduleKey] || [];

        console.log(`  📋 Module ${moduleKey}:`);
        console.log(`    - Allowed permissions from request:`, allowedPermissions);
        console.log(`    - Module permissions from DB:`, module.permissions);

        // Add permissions for this module
        // Handle both string permissions and object permissions
        if (allowedPermissions.length > 0) {
          allowedPermissions.forEach(permCode => {
            const fullCode = `${app.appCode}.${module.moduleCode}.${permCode}`;
            permissions.push(fullCode);
            console.log(`  ✅ Added permission: ${fullCode}`);
          });
        } else {
          console.log(`  ⚠️ No permissions selected for ${moduleKey}`);
        }
      }
    }

    // 3. Create custom role
    console.log('� Total permissions collected:', permissions.length);
    console.log('📋 Permissions array:', permissions);

    console.log('�🔧 Processing restrictions for database (create):', {
      restrictionsType: typeof restrictions,
      restrictionsValue: restrictions,
      isString: typeof restrictions === 'string',
      isObject: typeof restrictions === 'object'
    });

    // Convert permissions to hierarchical format (consistent with Super Administrator)
    const hierarchicalPermissions = convertPermissionsToHierarchical(permissions);
    console.log('🌳 Hierarchical permissions:', JSON.stringify(hierarchicalPermissions, null, 2));

    // Handle restrictions properly - avoid double-stringification
    let processedRestrictions;
    if (typeof restrictions === 'string') {
      console.log('🚨 Restrictions already a string, using as-is');
      processedRestrictions = restrictions;
    } else {
      console.log('📦 Restrictions is object, stringifying');
      processedRestrictions = JSON.stringify(restrictions);
    }

    const [role] = await db.insert(customRoles).values({
      tenantId,
      roleName,
      description,
      permissions: JSON.stringify(hierarchicalPermissions), // Store in hierarchical format
      restrictions: processedRestrictions, // Handle restrictions properly
      isSystemRole: false, // This is a custom role
      createdBy,
      lastModifiedBy: createdBy
    }).returning();

    console.log(`🎉 Created role "${roleName}" with hierarchical permissions structure`);

    // Publish role creation event to relevant applications (only apps with permissions)
    console.log('🎯 About to publish role creation event for custom role:', role.roleId);
    try {
      await publishRoleEventToApplications(
        'role.created',
        tenantId,
        role.roleId,
        {
          roleName: roleName,
          description: description,
          permissions: JSON.stringify(hierarchicalPermissions), // Pass as JSON string like the database stores it
          restrictions: processedRestrictions,
          metadata: metadata,
          createdBy: createdBy,
          createdAt: role.createdAt
        }
      );
      console.log('✅ Role creation event publishing completed for custom role');
    } catch (publishError) {
      console.warn('⚠️ Failed to publish role creation event:', publishError.message);
      console.error('Full error:', publishError);
      // Don't fail the role creation if event publishing fails
    }

    return role;
  }

  /**
   * 1.5️⃣ **UPDATE ROLE FROM APPLICATIONS & MODULES**
   * Updates existing role using applications and modules selection
   */
  static async updateRoleFromAppsAndModules({
    tenantId,
    roleId,
    roleName,
    description,
    selectedApps, // ['crm', 'hr']
    selectedModules, // { crm: ['leads', 'contacts'], hr: ['employees'] }
    selectedPermissions, // { 'crm.leads': ['read', 'create'], 'hr.employees': ['read'] }
    restrictions = {},
    metadata = {},
    updatedBy = null // Will get a default user if not provided
  }) {

    console.log('🔄 Updating custom role from apps and modules...');

    // 0. Check if role exists and is not a system role
    const [existingRole] = await db
      .select()
      .from(customRoles)
      .where(and(
        eq(customRoles.roleId, roleId),
        eq(customRoles.tenantId, tenantId)
      ));

    if (!existingRole) {
      throw new Error('Role not found');
    }

    if (existingRole.isSystemRole) {
      throw new Error('Cannot modify system roles');
    }

    // 1. Get a default user for updatedBy if not provided
    if (!updatedBy) {
      const { tenantUsers } = await import('../../../db/schema/users.js');
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .limit(1);

      if (!user) {
        throw new Error(`No users found for tenant ${tenantId}. Cannot update role without an updater.`);
      }
      updatedBy = user.userId;
      console.log(`📤 Using user ${user.email} as role updater`);
    }

    // 2. Get applications from database
    if (!selectedApps || selectedApps.length === 0) {
      throw new Error('No applications selected. Please select at least one application.');
    }

    const apps = await db
      .select()
      .from(applications)
      .where(inArray(applications.appCode, selectedApps));

    console.log(`📱 Found ${apps.length} applications:`, apps.map(a => a.appCode));

    // 3. Build permission list by iterating through apps and modules
    const permissions = [];
    const roleMetadata = {
      ...metadata,
      selectedApps,
      selectedModules,
      selectedPermissions,
      updatedFrom: 'applications_modules',
      updatedAt: new Date().toISOString()
    };

    for (const app of apps) {
      const appSelectedModules = selectedModules[app.appCode] || [];

      // Skip this app if no modules are selected
      if (appSelectedModules.length === 0) {
        console.log(`⚠️ App ${app.appCode} has no selected modules, skipping`);
        continue;
      }

      const appModules = await db
        .select()
        .from(applicationModules)
        .where(and(
          eq(applicationModules.appId, app.appId),
          inArray(applicationModules.moduleCode, appSelectedModules)
        ));

      console.log(`🧩 App ${app.appCode} has ${appModules.length} selected modules`);

      for (const module of appModules) {
        const moduleKey = `${app.appCode}.${module.moduleCode}`;
        const allowedPermissions = selectedPermissions[moduleKey] || [];

        // Add permissions for this module
        (module.permissions || []).forEach(permission => {
          if (allowedPermissions.includes(permission.code)) {
            const fullCode = `${app.appCode}.${module.moduleCode}.${permission.code}`;
            permissions.push(fullCode);
            console.log(`  ✅ Updated permission: ${fullCode}`);
          }
        });
      }
    }

    // 4. Update custom role
    console.log('🔧 Processing restrictions for database:', {
      restrictionsType: typeof restrictions,
      restrictionsValue: restrictions,
      isString: typeof restrictions === 'string',
      isObject: typeof restrictions === 'object'
    });

    // Convert permissions to hierarchical format (consistent with Super Administrator)
    const hierarchicalPermissions = convertPermissionsToHierarchical(permissions);

    // Handle restrictions properly - avoid double-stringification
    let processedRestrictions;
    if (typeof restrictions === 'string') {
      console.log('🚨 Restrictions already a string, using as-is');
      processedRestrictions = restrictions;
    } else {
      console.log('📦 Restrictions is object, stringifying');
      processedRestrictions = JSON.stringify(restrictions);
    }

    const [updatedRole] = await db
      .update(customRoles)
      .set({
        roleName,
        description,
        permissions: JSON.stringify(hierarchicalPermissions), // Store in hierarchical format
        restrictions: processedRestrictions, // Handle restrictions properly
        lastModifiedBy: updatedBy,
        updatedAt: new Date()
      })
      .where(and(
        eq(customRoles.roleId, roleId),
        eq(customRoles.tenantId, tenantId)
      ))
      .returning();

    console.log(`🎉 Updated role "${roleName}" with hierarchical permissions structure`);

    // Publish role change event to Redis streams for real-time sync
    console.log(`🔄 Attempting to publish role change event for "${roleName}"...`);
    try {
      const { crmSyncStreams } = await import('../../../utils/redis.js');

      // Publish using standard publishRoleEvent method for consistency
      await crmSyncStreams.publishRoleEvent(tenantId, 'role_updated', {
        roleId: updatedRole.roleId,
        roleName: updatedRole.roleName,
        description: updatedRole.description,
        permissions: typeof updatedRole.permissions === 'string'
          ? JSON.parse(updatedRole.permissions)
          : updatedRole.permissions,
        restrictions: typeof updatedRole.restrictions === 'string'
          ? JSON.parse(updatedRole.restrictions)
          : updatedRole.restrictions,
        updatedBy: updatedBy,
        updatedAt: updatedRole.updatedAt || new Date().toISOString(),
        isSystemRole: updatedRole.isSystemRole || false
      });

      console.log(`📡 Published role_updated event for "${roleName}" to Redis streams`);

      // Also publish to custom stream for backward compatibility
      const eventData = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'role_permissions_changed',
        tenantId: tenantId,
        entityType: 'role',
        entityId: updatedRole.roleId,
        action: 'permissions_updated',
        data: {
          roleId: updatedRole.roleId,
          roleName: updatedRole.roleName,
          permissions: JSON.parse(updatedRole.permissions || '{}'),
          isActive: updatedRole.isActive !== false, // Default to true if not set
          description: updatedRole.description,
          scope: updatedRole.scope || 'organization'
        },
        metadata: {
          correlationId: `role_permissions_${updatedRole.roleId}_${Date.now()}`,
          version: '1.0',
          sourceTimestamp: new Date().toISOString(),
          sourceApp: 'wrapper'
        }
      };

      // Publish to Redis stream
      const streamKey = `crm:sync:role_permissions`;
      const result = await crmSyncStreams.publishToStream(streamKey, eventData);

      console.log(`📡 Published role permissions change event for "${roleName}" to Redis stream: ${streamKey}`);
      console.log(`   Stream ID: ${result?.messageId}`);
    } catch (publishError) {
      console.error('⚠️ Failed to publish role change event:', publishError.message);
      console.error('⚠️ Full error:', publishError);
      // Don't fail the role update if event publishing fails
    }

    return updatedRole;
  }

  /**
   * 2️⃣ **GET ROLE CREATION OPTIONS (CREDIT-BASED)**
   * Shows all enabled applications and modules for the tenant
   * Uses organization_applications table for access control
   */
  static async getRoleCreationOptions(tenantId) {
    console.log(`🔍 Getting role creation options for tenant: ${tenantId}`);

    // Get organization's available applications
    const orgApps = await db
      .select({
        appId: applications.appId,
        appCode: applications.appCode,
        appName: applications.appName,
        description: applications.description,
        subscriptionTier: organizationApplications.subscriptionTier,
        isEnabled: organizationApplications.isEnabled,
        enabledModules: organizationApplications.enabledModules,
        customPermissions: organizationApplications.customPermissions
      })
      .from(applications)
      .innerJoin(organizationApplications, and(
        eq(organizationApplications.appId, applications.appId),
        eq(organizationApplications.tenantId, tenantId),
        eq(organizationApplications.isEnabled, true)
      ));

    console.log(`🏢 Organization has access to ${orgApps.length} applications`);

    // Get modules for each app based on credit-based access control
    const appsWithModules = await Promise.all(
      orgApps.map(async (app) => {
        const allModules = await db
          .select()
          .from(applicationModules)
          .where(eq(applicationModules.appId, app.appId));

        // Filter modules based on enabledModules from organization_applications
        let accessibleModules = allModules;

        if (app.enabledModules && Array.isArray(app.enabledModules) && app.enabledModules.length > 0) {
          // Filter to only enabled modules
          accessibleModules = allModules.filter(module =>
            app.enabledModules.includes(module.moduleCode)
          );
          console.log(`  📦 ${app.appCode}: ${accessibleModules.length}/${allModules.length} modules enabled via credit system`);
        } else {
          // If no specific modules enabled, allow all modules (backward compatibility)
          console.log(`  📦 ${app.appCode}: ${accessibleModules.length}/${allModules.length} modules accessible (all enabled)`);
        }

        // Process modules with permissions formatting
        const processedModules = await Promise.all(
          accessibleModules.map(async (module) => {
            // Use custom permissions from organization_applications if available
            let modulePermissions = module.permissions || [];

            if (app.customPermissions && typeof app.customPermissions === 'object') {
              const customModulePermissions = app.customPermissions[module.moduleCode];
              if (customModulePermissions && Array.isArray(customModulePermissions)) {
                // Check if custom permissions are already formatted objects or just codes
                if (customModulePermissions.length > 0) {
                  // Check if the first non-null element is a string
                  const firstValidElement = customModulePermissions.find(perm => perm != null);
                  if (firstValidElement && typeof firstValidElement === 'string') {
                    // Convert string codes to formatted objects using permission matrix
                    modulePermissions = await formatPermissionsForUI(customModulePermissions, app.appCode, module.moduleCode, tenantId);
                  } else {
                    // Already formatted objects, use as-is
                    modulePermissions = customModulePermissions;
                  }
                } else {
                  // Empty array, use default permissions
                  modulePermissions = await formatPermissionsForUI(module.permissions || [], app.appCode, module.moduleCode, tenantId);
                }
                console.log(`    🔧 ${module.moduleCode}: Using ${modulePermissions.length} custom permissions`);
              } else {
                // No custom permissions, format default permissions using matrix
                modulePermissions = await formatPermissionsForUI(module.permissions || [], app.appCode, module.moduleCode, tenantId);
              }
            } else {
              // No custom permissions defined, format default permissions using matrix
              modulePermissions = await formatPermissionsForUI(module.permissions || [], app.appCode, module.moduleCode, tenantId);
            }

            return {
              moduleId: module.moduleId,
              moduleCode: module.moduleCode,
              moduleName: module.moduleName,
              description: module.description,
              isCore: module.isCore,
              permissions: modulePermissions
            };
          })
        );

        return {
          appId: app.appId,
          appCode: app.appCode,
          appName: app.appName,
          description: app.description,
          subscriptionTier: app.subscriptionTier,
          modules: processedModules
        };
      })
    );

    return appsWithModules;
  }

  /**
   * 🎯 **DYNAMIC MODULE ACCESS CONTROL**
   * Determines which modules are accessible based on subscription tier
   */
  static async getAccessibleModulesForApp(appCode, subscriptionTier, allModules, fallbackEnabledModules = null) {
    console.log(`🔍 Determining accessible modules for ${appCode} on ${subscriptionTier} tier`);

    // Get tier-based accessible modules
    const tierModules = getAccessibleModules(appCode, subscriptionTier);

    if (tierModules === 'all') {
      // Enterprise tier gets all modules
      console.log(`  🌟 Enterprise tier: All ${allModules.length} modules accessible`);
      return allModules;
    }

    if (Array.isArray(tierModules) && tierModules.length > 0) {
      // Filter modules based on tier configuration
      const accessibleModules = allModules.filter(module =>
        tierModules.includes(module.moduleCode)
      );
      console.log(`  📋 Tier-based access: ${accessibleModules.length} modules`);
      return accessibleModules;
    }

    // Fallback to organization-specific enabled modules
    if (fallbackEnabledModules && Array.isArray(fallbackEnabledModules)) {
      const fallbackModules = allModules.filter(module =>
        fallbackEnabledModules.includes(module.moduleCode)
      );
      console.log(`  🔄 Fallback to org-specific: ${fallbackModules.length} modules`);
      return fallbackModules;
    }

    // No access or invalid configuration
    console.log(`  ❌ No access configured for ${appCode} on ${subscriptionTier}`);
    return [];
  }

  /**
   * 🚀 **AUTO-UPDATE ORGANIZATION ACCESS**
   * Automatically updates organization_applications based on subscription changes
   */
  static async updateOrganizationAccess(tenantId, subscriptionTier) {
    console.log(`🔄 Auto-updating organization access for tenant ${tenantId} to ${subscriptionTier}`);

    // Get all applications
    const allApps = await db.select().from(applications);

    for (const app of allApps) {
      // Get accessible modules for this app and tier
      const accessibleModuleCodes = getAccessibleModules(app.appCode, subscriptionTier);

      if (accessibleModuleCodes === 'all') {
        // Enterprise: Get all actual modules for this app
        const allModules = await db
          .select()
          .from(applicationModules)
          .where(eq(applicationModules.appId, app.appId));

        const allModuleCodes = allModules.map(m => m.moduleCode);

        await this.upsertOrganizationApplication(tenantId, app.appId, {
          subscriptionTier,
          enabledModules: allModuleCodes,
          isEnabled: true
        });

        console.log(`  ✅ ${app.appCode}: All ${allModuleCodes.length} modules enabled`);

      } else if (Array.isArray(accessibleModuleCodes) && accessibleModuleCodes.length > 0) {
        // Specific modules
        await this.upsertOrganizationApplication(tenantId, app.appId, {
          subscriptionTier,
          enabledModules: accessibleModuleCodes,
          isEnabled: true
        });

        console.log(`  ✅ ${app.appCode}: ${accessibleModuleCodes.length} modules enabled`);

      } else {
        // No access - disable the app
        await this.upsertOrganizationApplication(tenantId, app.appId, {
          subscriptionTier,
          enabledModules: [],
          isEnabled: false
        });

        console.log(`  ❌ ${app.appCode}: Access disabled`);
      }
    }

    console.log(`🎉 Organization access updated successfully for ${subscriptionTier} tier`);
  }

  /**
   * Helper method to upsert organization application record
   */
  static async upsertOrganizationApplication(tenantId, appId, config) {
    const existing = await db
      .select()
      .from(organizationApplications)
      .where(and(
        eq(organizationApplications.tenantId, tenantId),
        eq(organizationApplications.appId, appId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(organizationApplications)
        .set({
          subscriptionTier: config.subscriptionTier,
          enabledModules: config.enabledModules,
          isEnabled: config.isEnabled,
          updatedAt: new Date()
        })
        .where(and(
          eq(organizationApplications.tenantId, tenantId),
          eq(organizationApplications.appId, appId)
        ));
    } else {
      // Insert new
      await db.insert(organizationApplications).values({
        tenantId,
        appId,
        subscriptionTier: config.subscriptionTier,
        enabledModules: config.enabledModules,
        isEnabled: config.isEnabled
      });
    }
  }

  /**
   * 3️⃣ **ASSIGN USER-SPECIFIC PERMISSIONS**
   * Shows why user_application_permissions table is needed - granular user-level control
   */
  static async assignUserSpecificPermissions({
    userId,
    tenantId,
    appCode,
    moduleCode,
    permissions, // ['delete', 'bulk_import'] - extra permissions beyond role
    reason = 'Custom access granted',
    expiresAt = null
  }) {
    console.log(`👤 Assigning user-specific permissions to user ${userId}`);

    // Get app and module IDs
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.appCode, appCode));

    const [module] = await db
      .select()
      .from(applicationModules)
      .where(and(
        eq(applicationModules.appId, app.appId),
        eq(applicationModules.moduleCode, moduleCode)
      ));

    // Create or update user-specific permissions
    const [userPerm] = await db.insert(userApplicationPermissions).values({
      userId,
      tenantId,
      appId: app.appId,
      moduleId: module.moduleId,
      permissions,
      isActive: true,
      metadata: {
        reason,
        grantedAt: new Date().toISOString(),
        expiresAt
      }
    }).returning();

    console.log(`✅ Granted ${permissions.length} extra permissions to user`);
    return userPerm;
  }

  /**
   * 4️⃣ **COMPLETE PERMISSION RESOLUTION**
   * Shows how all tables work together to resolve final permissions
   */
  static async resolveUserPermissions({ userId, tenantId }) {
    console.log(`🔍 Resolving complete permissions for user ${userId}`);

    const allPermissions = new Set();
    const permissionSources = [];

    // 1. Get user's roles and their permissions
    const userRoles = await db
      .select()
      .from(customRoles)
      .where(and(
        eq(customRoles.tenantId, tenantId),
        eq(customRoles.isActive, true)
      ));

    userRoles.forEach(role => {
      if (role.permissions) {
        role.permissions.forEach(permission => {
          allPermissions.add(permission);
          permissionSources.push({
            source: 'role',
            roleName: role.roleName,
            permission
          });
        });
      }
    });

    // 2. Get organization applications (filter what's available)
    const orgApps = await db
      .select()
      .from(organizationApplications)
      .where(and(
        eq(organizationApplications.tenantId, tenantId),
        eq(organizationApplications.isEnabled, true)
      ));

    // 3. Get user-specific permissions (overrides)
    const userPerms = await db
      .select({
        permissions: userApplicationPermissions.permissions,
        appCode: applications.appCode,
        moduleCode: applicationModules.moduleCode,
        metadata: userApplicationPermissions.metadata
      })
      .from(userApplicationPermissions)
      .innerJoin(applications, eq(applications.appId, userApplicationPermissions.appId))
      .innerJoin(applicationModules, eq(applicationModules.moduleId, userApplicationPermissions.moduleId))
      .where(and(
        eq(userApplicationPermissions.userId, userId),
        eq(userApplicationPermissions.tenantId, tenantId),
        eq(userApplicationPermissions.isActive, true)
      ));

    userPerms.forEach(userPerm => {
      if (userPerm.permissions) {
        userPerm.permissions.forEach(permission => {
          const fullCode = `${userPerm.appCode}.${userPerm.moduleCode}.${permission}`;
          allPermissions.add(fullCode);
          permissionSources.push({
            source: 'user_override',
            reason: userPerm.metadata?.reason || 'Individual access',
            permission: fullCode
          });
        });
      }
    });

    console.log(`🎯 Resolved ${allPermissions.size} total permissions from ${permissionSources.length} sources`);

    return {
      permissions: Array.from(allPermissions),
      sources: permissionSources,
      summary: {
        totalPermissions: allPermissions.size,
        rolePermissions: permissionSources.filter(s => s.source === 'role').length,
        userOverrides: permissionSources.filter(s => s.source === 'user_override').length,
        organizationApps: orgApps.length
      }
    };
  }

  /**
   * 5️⃣ **PRACTICAL EXAMPLES - Why We Need Each Table**
   */
  static async demonstrateTableUsage() {
    console.log('\n🎯 **DEMONSTRATING WHY WE NEED EACH TABLE**\n');

    console.log('1️⃣ **APPLICATIONS & MODULES TABLES**');
    console.log('   → Define what exists in the system');
    console.log('   → Used to build role creation interfaces');
    console.log('   → Single source of truth for features\n');

    console.log('2️⃣ **ORGANIZATION_APPLICATIONS TABLE**');
    console.log('   → Controls what each tenant can access');
    console.log('   → Enables custom packages beyond standard plans');
    console.log('   → Example: Org A gets CRM+HR, Org B gets CRM+HR+Affiliate\n');

    console.log('3️⃣ **USER_APPLICATION_PERMISSIONS TABLE**');
    console.log('   → Individual user-level overrides');
    console.log('   → Temporary access for projects');
    console.log('   → Training restrictions for new users');
    console.log('   → Example: Senior manager gets extra "delete" permission\n');

    console.log('🔥 **TOGETHER THEY ENABLE:**');
    console.log('   ✅ Standard Plans (Starter, Pro, Enterprise)');
    console.log('   ✅ Custom Packages (Extra modules for specific orgs)');
    console.log('   ✅ Role-Based Access (Sales Manager, HR Specialist)');
    console.log('   ✅ Individual Overrides (Power users, temporary access)');
    console.log('   ✅ Compliance & Security (Restrictions and denials)');
  }
}

// Export helper functions for API routes
export default CustomRoleService; 