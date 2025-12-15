/**
 * Organization Service - Handles Parent and Sub-Organization Management
 * Follows SOLID principles with single responsibility for organization operations
 */

import { db } from '../../../db/index.js';
import { tenants } from '../../../db/schema/tenants.js';
import { entities } from '../../../db/schema/unified-entities.js';
import { organizationMemberships } from '../../../db/schema/organization_memberships.js';
import { eq, and, or, sql, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import DataIsolationService from '../../../services/data-isolation-service.js';
import ApplicationDataIsolationService from '../../../services/application-data-isolation-service.js';
import HierarchyManager from '../../../utils/hierarchy-manager.js';
import { crmSyncStreams } from '../../../utils/redis.js';

export class OrganizationService {

  /**
   * Create a new parent organization (at most 1 per tenant)
   */
  async createParentOrganization(data, createdBy) {
    const { name, description, gstin, parentTenantId } = data;

    // Validate input
    this.validateOrganizationData(data);

    // Check if parent tenant exists
    const parentTenant = await db
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, parentTenantId))
      .limit(1);

    if (parentTenant.length === 0) {
      throw new Error('Parent tenant not found');
    }

    // Check if a parent organization already exists for this tenant
    const existingParentOrg = await db
      .select()
      .from(entities)
      .where(and(
        eq(entities.tenantId, parentTenantId),
        eq(entities.entityType, 'organization'),
        eq(entities.organizationType, 'business_unit'), // Parent org
        eq(entities.isActive, true)
      ))
      .limit(1);

    if (existingParentOrg.length > 0) {
      throw new Error('A parent organization already exists for this tenant. Only one parent organization is allowed per tenant.');
    }

    const organizationId = uuidv4();

    // Create organization entity
    const organization = await db.insert(entities).values({
      entityId: organizationId,
      tenantId: parentTenantId,
      entityType: 'organization',
      entityName: name,
      entityCode: `ORG_${organizationId.substring(0, 8)}`, // Generate code
      description,
      organizationType: 'business_unit', // Parent organization
      entityLevel: 1,
      hierarchyPath: name, // Will be updated by trigger
      responsiblePersonId: createdBy,
      isActive: true,
      isDefault: true,
      createdBy,
      createdAt: new Date()
    }).returning();

    // Publish organization creation event to Redis streams
    try {
      await crmSyncStreams.publishOrgEvent(parentTenantId, 'org_created', {
        orgCode: organization[0].entityId,
        orgName: organization[0].entityName,
        orgType: 'organization',
        organizationType: 'business_unit',
        description: organization[0].description,
        parentId: null,
        entityLevel: organization[0].entityLevel,
        isActive: organization[0].isActive,
        createdBy: organization[0].createdBy,
        createdAt: organization[0].createdAt
      });
    } catch (streamError) {
      console.warn('⚠️ Failed to publish organization creation event:', streamError.message);
    }

    return {
      success: true,
      organization: organization[0],
      message: 'Parent organization created successfully'
    };
  }

  /**
   * Get the parent organization for a tenant
   */
  async getParentOrganization(tenantId) {
    const parentOrg = await db
      .select()
      .from(entities)
      .where(and(
        eq(entities.tenantId, tenantId),
        eq(entities.entityType, 'organization'),
        eq(entities.organizationType, 'business_unit'), // Parent org
        eq(entities.isActive, true),
        eq(entities.isDefault, true)
      ))
      .limit(1);

    return parentOrg.length > 0 ? parentOrg[0] : null;
  }

  /**
   * Check if tenant has a parent organization
   */
  async hasParentOrganization(tenantId) {
    const parentOrg = await this.getParentOrganization(tenantId);
    return parentOrg !== null;
  }

  /**
   * Create a sub-organization under a parent organization
   */
  async createSubOrganization(data, createdBy) {
    const { name, description, gstin, parentOrganizationId, organizationType, tenantId } = data;

    console.log('🏗️ OrganizationService.createSubOrganization called with:', {
      name,
      description,
      parentOrganizationId,
      organizationType,
      tenantId,
      createdBy
    });

    // Validate input
    console.log('🔍 Validating organization data...');
    this.validateOrganizationData(data);
    console.log('✅ Organization data validation passed');

    const organizationId = uuidv4();
    let tenantIdToUse, parentEntityId;

    if (parentOrganizationId) {
      // Get parent organization details for sub-organization
      const parentOrg = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, parentOrganizationId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      if (parentOrg.length === 0) {
        throw new Error('Parent organization not found');
      }

      tenantIdToUse = parentOrg[0].tenantId;
      parentEntityId = parentOrganizationId;
    } else {
      // Create top-level organization - need tenantId from somewhere else
      console.log('🏢 Creating top-level organization, checking tenantId...');
      if (!tenantId) {
        console.log('❌ No tenantId provided for top-level organization');
        throw new Error('Tenant ID is required for top-level organization creation');
      }

      console.log('✅ Using tenantId for top-level organization:', tenantId);
      tenantIdToUse = tenantId;
      parentEntityId = null;
    }

    // Create organization
    console.log('💾 Inserting organization into database...');
    const organization = await db.insert(entities).values({
      entityId: organizationId,
      tenantId: tenantIdToUse,
      entityType: 'organization',
      parentEntityId: parentEntityId,
      entityName: name,
      entityCode: organizationType === 'parent' ? `PARENT_${organizationId.substring(0, 8)}` : `ORG_${organizationId.substring(0, 8)}`,
      description,
      organizationType: organizationType || 'department',
      responsiblePersonId: createdBy,
      isActive: true,
      createdBy,
      createdAt: new Date()
    }).returning();

    console.log('✅ Organization inserted successfully:', organization[0]);
    // Note: Hierarchy paths are automatically maintained by database triggers

    // Publish organization creation event to Redis streams
    try {
      await crmSyncStreams.publishOrgEvent(tenantIdToUse, 'org_created', {
        orgCode: organization[0].entityId,
        orgName: organization[0].entityName,
        orgType: organization[0].entityType,
        organizationType: organization[0].organizationType,
        description: organization[0].description,
        parentId: organization[0].parentEntityId,
        entityLevel: organization[0].entityLevel,
        isActive: organization[0].isActive,
        createdBy: organization[0].createdBy,
        createdAt: organization[0].createdAt
      });
    } catch (streamError) {
      console.warn('⚠️ Failed to publish organization creation event:', streamError.message);
    }

    return {
      success: true,
      organization: organization[0],
      message: 'Organization created successfully'
    };
  }

  /**
   * Get organization details with hierarchy
   */
  async getOrganizationDetails(organizationId) {
    try {
      console.log('🔍 Getting organization details for:', organizationId);

      // First, check if organization exists with a simple query
      const orgCheck = await db
        .select({
          organizationId: entities.entityId,
          organizationName: entities.entityName
        })
        .from(entities)
        .where(and(
          eq(entities.entityId, organizationId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      if (!orgCheck || orgCheck.length === 0) {
        throw new Error('Organization not found');
      }

      console.log('✅ Organization exists:', orgCheck[0]);

      // Now get full details
      const organization = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, organizationId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      console.log('📊 Full organization query result:', organization);

      if (!organization || organization.length === 0) {
        throw new Error('Organization not found');
      }

      const orgData = organization[0];
      console.log('🏢 Organization data:', orgData);

      // Get parent organization details if exists
      let parentOrganization = null;
      if (orgData.parentEntityId) {
        console.log('👨‍👩‍👧‍👦 Getting parent organization:', orgData.parentEntityId);
        try {
          const parent = await db
            .select({
              organizationId: entities.entityId,
              organizationName: entities.entityName
            })
            .from(entities)
            .where(and(
              eq(entities.entityId, orgData.parentEntityId),
              eq(entities.entityType, 'organization')
            ))
            .limit(1);

          if (parent && parent.length > 0) {
            parentOrganization = parent[0];
            console.log('👨‍👩‍👧‍👦 Parent organization found:', parentOrganization);
          }
        } catch (parentError) {
          console.log('⚠️ Could not get parent organization:', parentError.message);
          // Continue without parent organization
        }
      }

      return {
        success: true,
        organization: orgData,
        parentOrganization,
        message: 'Organization details retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Error in getOrganizationDetails:', error);
      throw new Error(`Failed to get organization details: ${error.message}`);
    }
  }

  /**
   * Get all sub-organizations for a parent organization
   */
  async getSubOrganizations(parentOrganizationId) {
    const subOrgs = await db
      .select({
        organizationId: entities.entityId,
        organizationName: entities.entityName,
        description: entities.description,
        organizationType: entities.organizationType,
        organizationLevel: entities.entityLevel,
        isActive: entities.isActive,
        createdAt: entities.createdAt
      })
      .from(entities)
      .where(and(
        eq(entities.parentEntityId, parentOrganizationId),
        eq(entities.entityType, 'organization')
      ))
      .orderBy(entities.createdAt);

    return {
      success: true,
      subOrganizations: subOrgs,
      count: subOrgs.length,
      message: 'Sub-organizations retrieved successfully'
    };
  }

  /**
   * Get organization hierarchy tree
   */
  async getOrganizationHierarchy(tenantId, userContext = null, applicationContext = null) {
    try {
      // Get all entities first to filter organizations
      const { db } = await import('../db/index.js');
      const { entities } = await import('../db/schema/index.js');
      const { eq, and } = await import('drizzle-orm');

      const allEntities = await db
        .select({
          entityId: entities.entityId,
          entityName: entities.entityName,
          entityType: entities.entityType,
          entityCode: entities.entityCode,
          entityLevel: entities.entityLevel,
          hierarchyPath: entities.hierarchyPath,
          fullHierarchyPath: entities.fullHierarchyPath,
          parentEntityId: entities.parentEntityId,
          organizationType: entities.organizationType,
          locationType: entities.locationType,
          address: entities.address,
          description: entities.description,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .orderBy(entities.entityLevel, entities.entityName);

      console.log(`📊 Found ${allEntities.length} total entities, including both organizations and locations...`);

      // Include both organizations and locations in hierarchy
      let hierarchy = allEntities.filter(entity =>
        entity.entityType === 'organization' || entity.entityType === 'location'
      );

      console.log(`🏢 Found ${hierarchy.length} entities before access control filtering (${hierarchy.filter(e => e.entityType === 'organization').length} organizations, ${hierarchy.filter(e => e.entityType === 'location').length} locations)`);

      if (userContext) {
        // Check if user is a tenant admin or super admin - they should have access to all organizations
        const isAdmin = userContext.isTenantAdmin || userContext.isSuperAdmin || userContext.isAdmin;
        console.log('🔍 User access check - isAdmin:', isAdmin, 'isTenantAdmin:', userContext.isTenantAdmin, 'isSuperAdmin:', userContext.isSuperAdmin);

        if (isAdmin) {
          console.log('👑 User is admin, granting access to all organizations and locations');
          // Admin users can access all organizations and locations, no filtering needed
        } else {
          let accessibleEntities = [];

          // If application context is provided, use application-specific filtering
          if (applicationContext?.application) {
            const appAccess = await ApplicationDataIsolationService.getUserApplicationAccess(
              userContext,
              applicationContext.application
            );

            if (!appAccess.hasAccess) {
              return {
                success: true,
                hierarchy: [],
                totalOrganizations: 0,
                message: `User does not have access to ${applicationContext.application} application`
              };
            }

            accessibleEntities = appAccess.organizations;
          } else {
            // Use regular organizational access
            accessibleEntities = await DataIsolationService.getUserAccessibleOrganizations(userContext);
          }

          if (accessibleEntities.length > 0) {
            // Filter hierarchy to only include accessible organizations and locations
            hierarchy = hierarchy.filter(entity => accessibleEntities.includes(entity.entityId));
          } else {
            // User has no access to any organizations or locations
            return { success: true, hierarchy: [], totalOrganizations: 0 };
          }
        }
      }

      console.log(`✅ Final entities after filtering: ${hierarchy.length} (${hierarchy.filter(e => e.entityType === 'organization').length} organizations, ${hierarchy.filter(e => e.entityType === 'location').length} locations)`);

      // Build hierarchy tree from flat list
      const orgMap = new Map();
      const rootOrgs = [];

      // First pass: create all nodes
      hierarchy.forEach(org => {
        const node = {
          organizationId: org.entityId,
          organizationName: org.entityName,
          organizationType: org.organizationType,
          organizationLevel: org.entityLevel,
          hierarchyPath: org.hierarchyPath,
          fullHierarchyPath: org.fullHierarchyPath,
          description: org.description,
          isActive: org.isActive,
          createdAt: org.createdAt,
          updatedAt: org.updatedAt,
          parentOrganizationId: org.parentEntityId,
          children: []
        };
        orgMap.set(org.entityId, node);
      });

      // Second pass: build tree structure
      hierarchy.forEach(org => {
        const node = orgMap.get(org.entityId);

        if (org.parentEntityId && orgMap.has(org.parentEntityId)) {
          // Add as child to parent
          const parent = orgMap.get(org.parentEntityId);
          parent.children.push(node);
        } else {
          // Add as root organization
          rootOrgs.push(node);
        }
      });

      return {
        success: true,
        hierarchy: rootOrgs,
        totalOrganizations: hierarchy.length,
        message: 'Entity hierarchy retrieved successfully'
      };
    } catch (error) {
      console.error('Error in getOrganizationHierarchy:', error);

      // Fallback to simple query if hierarchy manager fails
      console.log('Falling back to simple hierarchy query...');
      const allEntities = await db
        .select({
          organizationId: entities.entityId,
          parentOrganizationId: entities.parentEntityId,
          organizationName: entities.entityName,
          organizationType: entities.organizationType,
          organizationLevel: entities.entityLevel,
          hierarchyPath: entities.hierarchyPath,
          description: entities.description,
          isActive: entities.isActive,
          createdAt: entities.createdAt,
          updatedAt: entities.updatedAt,
          entityType: entities.entityType
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .orderBy(entities.entityLevel, entities.createdAt);

      // Filter to include both organizations and locations
      const filteredEntities = allEntities.filter(entity =>
        entity.entityType === 'organization' || entity.entityType === 'location'
      );

      return {
        success: true,
        hierarchy: filteredEntities.map(entity => ({
          ...entity,
          children: [] // Simple fallback doesn't build tree structure
        })),
        totalOrganizations: filteredEntities.length,
        message: 'Entity hierarchy retrieved (fallback mode)'
      };
    }
  }

  /**
   * Move organization to new parent (hierarchy reorganization)
   */
  async moveOrganization(organizationId, newParentId, movedBy) {
    // Validate organization exists
    const organization = await db
      .select()
      .from(entities)
      .where(and(
        eq(entities.entityId, organizationId),
        eq(entities.entityType, 'organization')
      ))
      .limit(1);

    if (organization.length === 0) {
      throw new Error('Organization not found');
    }

    // Validate new parent exists (if provided)
    if (newParentId) {
      const parentCheck = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, newParentId),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      if (parentCheck.length === 0) {
        throw new Error('New parent organization not found');
      }

      // Validate hierarchy integrity (prevent circular references)
      const validation = await HierarchyManager.validateHierarchyIntegrity(organizationId, newParentId);
      if (!validation.valid) {
        throw new Error(validation.message);
      }
    }

    // Update the organization
    const updatedOrg = await db
      .update(entities)
      .set({
        parentEntityId: newParentId,
        updatedBy: movedBy,
        updatedAt: new Date()
      })
      .where(and(
        eq(entities.entityId, organizationId),
        eq(entities.entityType, 'organization')
      ))
      .returning();

    // Update hierarchy paths for the moved organization and all its descendants
    await HierarchyManager.updateEntityHierarchyPaths(organizationId);

    return {
      success: true,
      organization: updatedOrg[0],
      message: 'Organization moved successfully'
    };
  }


  /**
   * Update organization details
   */
  async updateOrganization(organizationId, updateData, updatedBy) {
    const allowedFields = ['entityName', 'organizationName', 'description', 'responsiblePersonId'];

    const updateFields = {};
    Object.keys(updateData).forEach(key => {
      if (allowedFields.includes(key)) {
        // Map old field names to new ones
        if (key === 'organizationName') {
          updateFields.entityName = updateData[key];
        } else {
          updateFields[key] = updateData[key];
        }
      }
    });

    if (Object.keys(updateFields).length === 0) {
      throw new Error('No valid fields to update');
    }

    updateFields.updatedAt = new Date();
    updateFields.updatedBy = updatedBy;

    const updatedOrg = await db
      .update(entities)
      .set(updateFields)
      .where(and(
        eq(entities.entityId, organizationId),
        eq(entities.entityType, 'organization')
      ))
      .returning();

    if (updatedOrg.length === 0) {
      throw new Error('Organization not found or update failed');
    }

    return {
      success: true,
      organization: updatedOrg[0],
      message: 'Organization updated successfully'
    };
  }

  /**
   * Delete organization (soft delete)
   */
  async deleteOrganization(organizationId, deletedBy) {
    // Check if organization has sub-organizations
    const subOrgs = await db
      .select({ organizationId: entities.entityId })
      .from(entities)
      .where(and(
        eq(entities.parentEntityId, organizationId),
        eq(entities.entityType, 'organization'),
        eq(entities.isActive, true)
      ))
      .limit(1);

    if (subOrgs.length > 0) {
      throw new Error('Cannot delete organization with active sub-organizations');
    }

    const deletedOrg = await db
      .update(entities)
      .set({
        isActive: false,
        updatedAt: new Date(),
        updatedBy: deletedBy
      })
      .where(and(
        eq(entities.entityId, organizationId),
        eq(entities.entityType, 'organization')
      ))
      .returning();

    if (deletedOrg.length === 0) {
      throw new Error('Organization not found');
    }

    return {
      success: true,
      organization: deletedOrg[0],
      message: 'Organization deactivated successfully'
    };
  }

  /**
   * Bulk create organizations
   */
  async bulkCreateOrganizations(organizationData, createdBy) {
    const results = [];
    const errors = [];

    for (const [index, data] of organizationData.entries()) {
      try {
        // Validate data
        this.validateOrganizationData(data);

        const result = await this.createParentOrganization(data, createdBy);
        results.push({
          index,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          success: false,
          error: error.message,
          data
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: organizationData.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk creation completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Bulk update organizations
   */
  async bulkUpdateOrganizations(updateData, updatedBy) {
    const results = [];
    const errors = [];

    for (const [index, item] of updateData.entries()) {
      try {
        const { organizationId, ...updateFields } = item;

        if (!organizationId) {
          throw new Error('Organization ID is required');
        }

        const result = await this.updateOrganization(organizationId, updateFields, updatedBy);
        results.push({
          index,
          organizationId,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          organizationId: item.organizationId,
          success: false,
          error: error.message,
          data: item
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: updateData.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk update completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Bulk delete organizations
   */
  async bulkDeleteOrganizations(organizationIds, deletedBy) {
    const results = [];
    const errors = [];

    for (const [index, organizationId] of organizationIds.entries()) {
      try {
        const result = await this.deleteOrganization(organizationId, deletedBy);
        results.push({
          index,
          organizationId,
          success: true,
          data: result.organization
        });
      } catch (error) {
        errors.push({
          index,
          organizationId,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors,
      totalProcessed: organizationIds.length,
      successful: results.length,
      failed: errors.length,
      message: `Bulk deletion completed: ${results.length} successful, ${errors.length} failed`
    };
  }

  /**
   * Validate organization data
   */
  validateOrganizationData(data) {
    const { name, gstin } = data;

    if (!name || name.trim().length < 2) {
      throw new Error('Organization name must be at least 2 characters');
    }

    if (gstin) {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstinRegex.test(gstin)) {
        throw new Error('Invalid GSTIN format');
      }
    }
  }
}

export default new OrganizationService();
