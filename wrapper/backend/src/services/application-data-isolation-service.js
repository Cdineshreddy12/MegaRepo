/**
 * Application-Level Data Isolation Service
 * Extends multi-level isolation to include application-specific data segregation
 */

import { db } from '../db/index.js';
import { entities } from '../db/schema/unified-entities.js';
import { tenantUsers } from '../db/schema/users.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, or, inArray } from 'drizzle-orm';

export class ApplicationDataIsolationService {

  /**
   * Application definitions for the business suite
   */
  static APPLICATIONS = {
    CRM: 'crm',
    HR: 'hr',
    FINANCE: 'finance',
    SALES: 'sales',
    MARKETING: 'marketing',
    INVENTORY: 'inventory',
    PROJECTS: 'projects',
    ANALYTICS: 'analytics'
  };

  /**
   * Application-specific permission levels
   */
  static PERMISSION_LEVELS = {
    NONE: 0,
    VIEWER: 1,
    EDITOR: 2,
    ADMIN: 3,
    SUPER_ADMIN: 4
  };

  /**
   * Get user's accessible data for a specific application
   */
  async getUserApplicationAccess(userContext, application) {
    const { userId, internalUserId, tenantId } = userContext;

    // Get user's application-specific permissions
    const appPermissions = await this.getUserApplicationPermissions(internalUserId || userId, application);

    if (!appPermissions || appPermissions.permissionLevel === ApplicationDataIsolationService.PERMISSION_LEVELS.NONE) {
      return {
        hasAccess: false,
        entities: [],
        permissions: ApplicationDataIsolationService.PERMISSION_LEVELS.NONE
      };
    }

    // Get application-specific accessible organizations
    const accessibleOrgs = await this.getUserAccessibleOrganizationsForApp(
      userContext,
      application,
      appPermissions
    );

    // Get application-specific accessible locations
    const accessibleLocations = await this.getUserAccessibleLocationsForApp(
      userContext,
      application,
      accessibleOrgs,
      appPermissions
    );

    return {
      hasAccess: true,
      entities: [...accessibleOrgs, ...accessibleLocations],
      permissions: appPermissions.permissionLevel,
      application: application,
      scope: {
        entityCount: accessibleOrgs.length + accessibleLocations.length,
        orgCount: accessibleOrgs.length,
        locationCount: accessibleLocations.length
      }
    };
  }

  /**
   * Get user's permissions for a specific application
   */
  async getUserApplicationPermissions(userId, application) {
    // In a real implementation, this would query an application_permissions table
    // For now, we'll simulate based on user roles and application

    // userId here should already be the internal user ID
    const userInfo = await db
      .select({ isTenantAdmin: tenantUsers.isTenantAdmin })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .limit(1);

    // Simulate application-specific permissions based on user admin status
    if (userInfo[0]?.isTenantAdmin) {
      return {
        permissionLevel: ApplicationDataIsolationService.PERMISSION_LEVELS.SUPER_ADMIN,
        canAccessAllData: true,
        canManageUsers: true,
        canConfigureApp: true
      };
    }

    // Default permissions for regular users (in production, this would be stored in DB)
    return {
      permissionLevel: ApplicationDataIsolationService.PERMISSION_LEVELS.EDITOR,
      canAccessAllData: false,
      canManageUsers: false,
      canConfigureApp: false
    };
  }

  /**
   * Get user's accessible organizations for a specific application
   */
  async getUserAccessibleOrganizationsForApp(userContext, application, appPermissions) {
    const { userId, internalUserId, tenantId } = userContext;

    // If user has super admin permissions for this app, they can access all organizations
    if (appPermissions.permissionLevel >= ApplicationDataIsolationService.PERMISSION_LEVELS.SUPER_ADMIN) {
      const allOrgs = await db
        .select({ organizationId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization')
        ));

      return allOrgs.map(org => org.organizationId);
    }

    // Get user's direct organization memberships from organization_memberships table
    const userMemberships = await db
      .select({
        organizationId: organizationMemberships.entityId,
        membershipType: organizationMemberships.membershipType,
        membershipStatus: organizationMemberships.membershipStatus
      })
      .from(organizationMemberships)
      .where(and(
        eq(organizationMemberships.userId, internalUserId || userId), // Use internalUserId if available
        eq(organizationMemberships.entityType, 'organization'),
        eq(organizationMemberships.membershipStatus, 'active')
      ));

    const directOrgIds = userMemberships.map(m => m.organizationId).filter(id => id != null);

    // For application-specific access, we might have different permissions per org per app
    // For now, we'll use the same hierarchy logic but could be extended

    const accessibleOrgs = new Set(directOrgIds);

    // Add parent organizations (users can see their org's parent)
    for (const orgId of directOrgIds) {
      const org = await db
        .select({ parentEntityId: entities.parentEntityId })
        .from(entities)
        .where(and(
          eq(entities.entityId, orgId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      if (org[0]?.parentEntityId) {
        accessibleOrgs.add(org[0].parentEntityId);
      }
    }

    // Add child organizations (users can see their org's children)
    for (const orgId of directOrgIds) {
      const children = await db
        .select({ organizationId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.parentEntityId, orgId),
          eq(entities.entityType, 'organization')
        ));

      children.forEach(child => accessibleOrgs.add(child.organizationId));
    }

    return Array.from(accessibleOrgs);
  }

  /**
   * Get user's accessible locations for a specific application
   */
  async getUserAccessibleLocationsForApp(userContext, application, accessibleOrgs, appPermissions) {
    if (!accessibleOrgs || accessibleOrgs.length === 0) {
      return [];
    }

    // For application-specific location access, we might have different rules
    // For example, HR app might have access to all employee locations
    // while Finance app might only have access to HQ locations

    // Get locations for the tenant (simplified without locationAssignments)
    let locationQuery = db
      .select({
        locationId: entities.entityId
      })
      .from(entities)
      .where(and(
        eq(entities.tenantId, userContext.tenantId),
        eq(entities.entityType, 'location')
      ));

    // Apply application-specific filtering
    if (application === ApplicationDataIsolationService.APPLICATIONS.HR) {
      // HR can access all locations (for employee management)
      // No additional filtering needed
    } else if (application === ApplicationDataIsolationService.APPLICATIONS.FINANCE) {
      // Finance might only need access to HQ and regional offices
      // This could be extended with location types or tags
    } else if (application === ApplicationDataIsolationService.APPLICATIONS.CRM) {
      // CRM might need access to customer-facing locations
    }

    const locationResults = await locationQuery;
    return locationResults.map(result => result.locationId);
  }

  /**
   * Check if user has access to specific data in an application
   */
  async canAccessDataInApplication(userContext, application, dataType, dataId) {
    try {
      const appAccess = await this.getUserApplicationAccess(userContext, application);

      if (!appAccess.hasAccess) {
        return false;
      }

      // Check data type specific access
      switch (dataType) {
        case 'organization':
        case 'location':
          return appAccess.entities.includes(dataId);
        case 'user':
          // Users can typically access other users in their accessible organizations
          return true; // This could be more restrictive
        default:
          return false;
      }
    } catch (error) {
      console.error('❌ Error in canAccessDataInApplication:', error);
      // Return false on error to be secure
      return false;
    }
  }

  /**
   * Filter data based on application and user context
   */
  async filterDataByApplication(data, userContext, application, dataType = 'organization') {
    try {
      const appAccess = await this.getUserApplicationAccess(userContext, application);

      if (!appAccess.hasAccess) {
        return [];
      }

      if (Array.isArray(data)) {
        return data.filter(item => {
          const itemId = item.organizationId || item.locationId || item.userId;
          return appAccess.entities.includes(itemId);
        });
      }

      // For single items
      const itemId = data.organizationId || data.locationId || data.userId;
      const canAccess = appAccess.entities.includes(itemId);

      return canAccess ? data : null;
    } catch (error) {
      console.error('❌ Error in filterDataByApplication:', error);
      // Return empty array or null on error to be safe
      return Array.isArray(data) ? [] : null;
    }
  }

  /**
   * Get user's complete access profile across all applications
   */
  async getUserCompleteAccessProfile(userContext) {
    const profile = {
      userId: userContext.userId,
      tenantId: userContext.tenantId,
      applications: {}
    };

    // Check access for each application
    for (const [appName, appCode] of Object.entries(ApplicationDataIsolationService.APPLICATIONS)) {
      try {
        const appAccess = await this.getUserApplicationAccess(userContext, appCode);
        profile.applications[appCode] = {
          name: appName,
          hasAccess: appAccess.hasAccess,
          permissionLevel: appAccess.permissions,
          organizationCount: appAccess.scope?.orgCount || 0,
          locationCount: appAccess.scope?.locationCount || 0
        };
      } catch (error) {
        profile.applications[appCode] = {
          name: appName,
          hasAccess: false,
          error: error.message
        };
      }
    }

    return profile;
  }

  /**
   * Validate cross-application data sharing
   */
  async canShareDataBetweenApplications(userContext, sourceApp, targetApp, dataType, dataId) {
    // Check if user has access to the data in source application
    const sourceAccess = await this.canAccessDataInApplication(userContext, sourceApp, dataType, dataId);
    if (!sourceAccess) {
      return false;
    }

    // Check if user has appropriate permissions in target application
    const targetAccess = await this.getUserApplicationAccess(userContext, targetApp);
    if (!targetAccess.hasAccess) {
      return false;
    }

    // Define cross-application sharing rules
    const sharingRules = {
      'hr-finance': ['user', 'organization'], // HR can share employee data with Finance
      'hr-crm': ['user'], // HR can share basic user data with CRM
      'finance-sales': ['organization'], // Finance can share org data with Sales
      'crm-sales': ['user', 'organization'], // CRM and Sales can share customer data
    };

    const ruleKey = `${sourceApp}-${targetApp}`;
    const allowedDataTypes = sharingRules[ruleKey] || [];

    return allowedDataTypes.includes(dataType);
  }
}

// Export default instance (class is already exported above)
export default new ApplicationDataIsolationService();
