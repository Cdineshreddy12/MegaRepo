/**
 * Data Isolation Service
 * Implements multi-level data isolation for organizations, sub-orgs, and locations
 */

import { db } from '../db/index.js';
import { entities } from '../db/schema/unified-entities.js';
import { tenantUsers } from '../db/schema/users.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, or, inArray } from 'drizzle-orm';

export class DataIsolationService {

  /**
   * Get user's accessible organizations based on their role and membership
   */
  async getUserAccessibleOrganizations(userContext) {
    const { userId, internalUserId, tenantId, roles = [] } = userContext;
    console.log('🔍 getUserAccessibleOrganizations - userId:', userId, 'internalUserId:', internalUserId, 'tenantId:', tenantId, 'roles:', roles);

    // Get user's direct organization memberships from organization_memberships table
    console.log('🔍 Querying organization_memberships for user memberships...');
    let userMemberships = [];
    try {
      userMemberships = await db
        .select({
          organizationId: organizationMemberships.entityId,
          membershipType: organizationMemberships.membershipType,
          membershipStatus: organizationMemberships.membershipStatus
        })
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.userId, internalUserId || userId), // Use internalUserId if available, fallback to userId
          eq(organizationMemberships.entityType, 'organization'),
          eq(organizationMemberships.membershipStatus, 'active')
        ));
      console.log('✅ User organization memberships query successful:', userMemberships.length, 'records');
    } catch (queryError) {
      console.error('❌ User organization memberships query failed:', queryError);
      console.error('❌ Query error details:', queryError.message);
      console.error('❌ Using userId:', internalUserId || userId);
      userMemberships = [];
    }

    const directOrgIds = userMemberships.map(m => m.entityId).filter(id => id != null);
    console.log('📋 Direct entity IDs:', directOrgIds);

    // If user is tenant admin, they can access all organizations
    if (roles && roles.includes && roles.includes('TENANT_ADMIN')) {
      console.log('👑 User is tenant admin, granting access to all organizations');
      const allOrgs = await db
        .select({ entityId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization')
        ));

      return allOrgs.map(org => org.entityId);
    }

    // For regular users, get their accessible orgs based on hierarchy
    const accessibleOrgs = new Set(directOrgIds);

    // If user has no direct organization memberships, return empty array
    if (directOrgIds.length === 0) {
      console.log('ℹ️ User has no direct organization memberships, returning empty array');
      return [];
    }

    // Add parent entities (users can see their entity's parent)
    for (const entityId of directOrgIds) {
      const entity = await db
        .select({ parentEntityId: entities.parentEntityId })
        .from(entities)
        .where(eq(entities.entityId, entityId))
        .limit(1);

      if (entity[0]?.parentEntityId) {
        accessibleOrgs.add(entity[0].parentEntityId);
      }
    }

    // Add child entities (users can see their entity's children)
    for (const entityId of directOrgIds) {
      const children = await db
        .select({ entityId: entities.entityId })
        .from(entities)
        .where(and(
          eq(entities.parentEntityId, entityId),
          eq(entities.entityType, 'organization')
        ));

      children.forEach(child => accessibleOrgs.add(child.entityId));
    }

    return Array.from(accessibleOrgs);
  }

  /**
   * Get user's accessible locations based on their organization access
   */
  async getUserAccessibleLocations(userContext, accessibleOrgs) {
    if (!accessibleOrgs || accessibleOrgs.length === 0) {
      return [];
    }

    // Get locations that belong to the tenant (using unified entities)
    // Since locations are now entities with entityType = 'location'
    const locationResults = await db
      .select({
        entityId: entities.entityId
      })
      .from(entities)
      .where(and(
        eq(entities.tenantId, userContext.tenantId),
        eq(entities.entityType, 'location')
      ));

    return locationResults.map(result => result.entityId);
  }

  /**
   * Filter data based on user's access permissions
   */
  async filterOrganizationsByAccess(organizations, userContext) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    return organizations.filter(org => accessibleOrgs.includes(org.entityId));
  }

  /**
   * Filter locations based on user's access permissions
   */
  async filterLocationsByAccess(locations, userContext) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);

    return locations.filter(loc => accessibleLocations.includes(loc.entityId));
  }

  /**
   * Check if user has access to specific entity (organization or location)
   */
  async canAccessEntity(userContext, entityId) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);

    return accessibleOrgs.includes(entityId) || accessibleLocations.includes(entityId);
  }

  /**
   * Check if user has access to specific organization
   * @deprecated Use canAccessEntity instead
   */
  async canAccessOrganization(userContext, organizationId) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    return accessibleOrgs.includes(organizationId);
  }

  /**
   * Check if user has access to specific location
   * @deprecated Use canAccessEntity instead
   */
  async canAccessLocation(userContext, locationId) {
    const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
    const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);

    return accessibleLocations.includes(locationId);
  }

  /**
   * Get user's data access scope
   */
  async getUserAccessScope(userContext) {
    try {
      console.log('🔍 getUserAccessScope - Starting with userContext:', {
        userId: userContext.userId,
        tenantId: userContext.tenantId,
        roles: userContext.roles
      });

      const accessibleOrgs = await this.getUserAccessibleOrganizations(userContext);
      console.log('📋 Accessible organizations:', accessibleOrgs);

      const accessibleLocations = await this.getUserAccessibleLocations(userContext, accessibleOrgs);
      console.log('📍 Accessible locations:', accessibleLocations);

      // Additional safety: filter out any null/undefined values
      const cleanOrgIds = (accessibleOrgs || []).filter(id => id != null);
      const cleanLocationIds = (accessibleLocations || []).filter(id => id != null);

      console.log('🧹 Clean org IDs:', cleanOrgIds);
      console.log('🧹 Clean location IDs:', cleanLocationIds);

      let orgDetails = [];
      let locationDetails = [];

      // Get entity details - only query if there are accessible entities
      if (cleanOrgIds.length > 0 || cleanLocationIds.length > 0) {
        console.log('🔍 Querying entity details...');
        try {
          const allEntityIds = [...cleanOrgIds, ...cleanLocationIds];
          const entityDetails = await db
            .select({
              entityId: entities.entityId,
              entityName: entities.entityName,
              entityType: entities.entityType,
              organizationType: entities.organizationType
            })
            .from(entities)
            .where(inArray(entities.entityId, allEntityIds));

          // Split back into organizations and locations
          orgDetails = entityDetails.filter(e => e.entityType === 'organization').map(e => ({
            organizationId: e.entityId,
            organizationName: e.entityName,
            organizationType: e.organizationType
          }));

          locationDetails = entityDetails.filter(e => e.entityType === 'location').map(e => ({
            locationId: e.entityId,
            locationName: e.entityName
          }));

          console.log('✅ Entity details retrieved:', entityDetails.length, '(orgs:', orgDetails.length, ', locs:', locationDetails.length, ')');
        } catch (entityError) {
          console.error('❌ Entity query failed:', entityError);
          orgDetails = [];
          locationDetails = [];
        }
      } else {
        console.log('ℹ️ No accessible entities, skipping query');
      }

      const result = {
        organizations: orgDetails || [],
        locations: locationDetails || [],
        scope: {
          orgCount: cleanOrgIds.length,
          locationCount: cleanLocationIds.length
        }
      };

      console.log('✅ getUserAccessScope - Success:', result.scope);
      return result;
    } catch (error) {
      console.error('❌ Error in getUserAccessScope:', error);
      console.error('❌ Error stack:', error.stack);
      // Return safe defaults on error
      return {
        organizations: [],
        locations: [],
        scope: {
          orgCount: 0,
          locationCount: 0
        }
      };
    }
  }
}

export default new DataIsolationService();
