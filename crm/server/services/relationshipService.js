// =============================================================================
// RELATIONSHIP SERVICE
// High-level service for managing complex multi-tenant relationships
// =============================================================================

import mongoose from 'mongoose';

// Static imports for converted models
import User from '../models/User.js';
import CrmTenantUser from '../models/CrmTenantUser.js';
import creditService from './creditService.js';

// Dynamic imports for models that haven't been converted yet
let Tenant, Organization, Role, ActivityLog, CrmCreditConfig, CrmRoleAssignment;
let CrmCreditUsage, CrmEntityCredit, EmployeeOrgAssignment, CrmActivityLog;

// Import relationship functions directly
import { resolveUserPermissions, checkUserCredits } from '../models/relationships.js';

// Initialize dynamic model imports
const initializeModels = async () => {
  try {
    const [
      tenant, organization, crmRole, activityLog, crmCreditConfig, crmRoleAssignment,
      crmCreditUsage, crmEntityCredit, employeeOrgAssignment, crmActivityLog
    ] = await Promise.all([
      import('../models/Tenant.js'),
      import('../models/Organization.js'),
      import('../models/CrmRole.js'),
      import('../models/ActivityLog.js'),
      import('../models/CrmCreditConfig.js'),
      import('../models/CrmRoleAssignment.js'),
      import('../models/CrmCreditUsage.js'),
      import('../models/CrmEntityCredit.js'),
      import('../models/EmployeeOrgAssignment.js'),
      import('../models/CrmActivityLog.js')
    ]);

    Tenant = tenant.default;
    Organization = organization.default;
    Role = crmRole.default;
    ActivityLog = activityLog.default;
    CrmCreditConfig = crmCreditConfig.default;
    CrmRoleAssignment = crmRoleAssignment.default;
    CrmCreditUsage = crmCreditUsage.default;
    CrmEntityCredit = crmEntityCredit.default;
    EmployeeOrgAssignment = employeeOrgAssignment.default;
    CrmActivityLog = crmActivityLog.default;

    console.log('✅ Relationship service models initialized');
  } catch (error) {
    console.error('❌ Failed to initialize relationship service models:', error);
    throw error;
  }
};

class RelationshipService {
  constructor() {
    // Models will be set after dynamic imports in initializeModels()
    this.modelsInitialized = false;
  }

  // Initialize models after dynamic imports
  initializeModels(models) {
    this.Tenant = models.Tenant;
    this.Organization = models.Organization;
    this.User = models.User;
    this.Role = models.Role;
    this.ActivityLog = models.ActivityLog;
    this.CrmCreditConfig = models.CrmCreditConfig;
    this.CrmRoleAssignment = models.CrmRoleAssignment;
    this.CrmCreditUsage = models.CrmCreditUsage;
    this.CrmEntityCredit = models.CrmEntityCredit;
    this.EmployeeOrgAssignment = models.EmployeeOrgAssignment;
    this.CrmTenantUser = models.CrmTenantUser;
    this.CrmActivityLog = models.CrmActivityLog;
    this.modelsInitialized = true;
  }

  // =============================================================================
  // USER PERMISSION MANAGEMENT
  // =============================================================================

  /**
   * Resolve effective permissions for a user across all their entity memberships
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier (externalId or employeeCode)
   * @returns {Promise<string[]>} Array of permission strings
   */
  async getUserPermissions(tenantId, userId) {
    try {
      // Ensure models are initialized
      if (!this.modelsInitialized) {
        console.log('⏳ Waiting for relationship service models to initialize...');
        await initializationPromise;
      }

      // Try optimized method using UserProfile references first
      const permissions = await this.getUserPermissionsOptimized(tenantId, userId);
      if (permissions && permissions.length > 0) {
        return permissions;
      }

      // Fallback to aggregation method
      console.log('⚠️ Optimized permission resolution failed, using fallback method');
      const fallbackPermissions = await resolveUserPermissions(tenantId, userId);
      return fallbackPermissions;
    } catch (error) {
      console.error('Error resolving user permissions:', error);
      return [];
    }
  }

  /**
   * Get user permissions by directly querying assignments
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @returns {Promise<string[]>} Array of permission strings
   */
  async getUserPermissionsOptimized(tenantId, userId) {
    try {
      // Use raw MongoDB queries instead of Mongoose models for reliability
      const db = mongoose.connection.db || mongoose.connection.getClient()?.db();
      if (!db) {
        console.error('Database not connected, attempting direct connection...');
        // Try to establish connection if not available
        if (mongoose.connection.readyState !== 1) {
          console.error('Mongoose connection not ready');
          return [];
        }
        return [];
      }

      // Query role assignments using raw MongoDB
      const assignments = await db.collection('crmroleassignments').aggregate([
        { $match: { tenantId, userIdString: userId } },
        {
          $lookup: {
            from: 'crmroles',
            localField: 'roleIdString',
            foreignField: 'roleId',
            as: 'roleData'
          }
        },
        { $unwind: { path: '$roleData', preserveNullAndEmptyArrays: true } }
      ]).toArray();

      if (!assignments?.length) {
        console.log(`No role assignments found for user ${userId} in tenant ${tenantId}`);
        return [];
      }

      // Extract and flatten permissions from valid role assignments
      const permissions = assignments
        .filter(assignment => assignment.roleData) // Only assignments with valid roles
        .flatMap(assignment => assignment.roleData.permissions || [])
        .filter(permission => permission); // Remove any falsy values

      // Remove duplicates
      const uniquePermissions = [...new Set(permissions)];
      console.log(`Found ${uniquePermissions.length} permissions for user ${userId}`);
      return uniquePermissions;
    } catch (error) {
      console.error('Error in optimized permission resolution:', error);
      return null; // Return null to trigger fallback
    }
  }

  /**
   * Get user organization assignments
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} Array of organization assignment objects
   */
  async getUserOrganizationAssignments(tenantId, userId) {
    try {
      // Validate inputs
      if (!tenantId || typeof tenantId !== 'string') {
        console.error('❌ Invalid tenantId provided to getUserOrganizationAssignments:', tenantId);
        return [];
      }
      if (!userId || typeof userId !== 'string') {
        console.error('❌ Invalid userId provided to getUserOrganizationAssignments:', userId);
        return [];
      }

      // Clean inputs to prevent string concatenation issues
      const cleanTenantId = String(tenantId).trim();
      const cleanUserId = String(userId).trim();

      console.log(`🔍 RELATIONSHIP SERVICE: getUserOrganizationAssignments called for user: ${cleanUserId}, tenant: ${cleanTenantId}`);

      // Use raw MongoDB queries instead of Mongoose models for reliability
      const db = mongoose.connection.db || mongoose.connection.getClient()?.db();
      if (!db) {
        console.error('❌ Database not connected, attempting direct connection...');
        // Try to establish connection if not available
        if (mongoose.connection.readyState !== 1) {
          console.error('❌ Mongoose connection not ready');
          return [];
        }
        return [];
      }
      console.log('✅ RELATIONSHIP SERVICE: Database connection available');

      console.log(`DEBUG: Searching for org assignments with userIdString: "${cleanUserId}" in tenant: "${cleanTenantId}"`);

      // Query organization assignments for this user using raw MongoDB
      const assignments = await db.collection('employeeorgassignments').aggregate([
        { $match: { tenantId: cleanTenantId, userIdString: cleanUserId } },
        {
          $lookup: {
            from: 'organizations',
            localField: 'entityIdString',
            foreignField: 'orgCode',
            as: 'orgData'
          }
        },
        { $unwind: { path: '$orgData', preserveNullAndEmptyArrays: true } }
      ]).toArray();

      console.log(`DEBUG: Raw MongoDB query returned ${assignments.length} results`);

      if (!assignments?.length) {
        console.log(`ℹ️ No organization assignments found for user ${cleanUserId} in tenant ${cleanTenantId}`);
        return [];
      }

      // Format assignments for response
      const formattedAssignments = assignments.map(assignment => ({
        assignmentId: assignment.assignmentId,
        userId: assignment.userIdString,
        entityId: assignment.orgData?.orgCode || assignment.entityIdString,
        entityName: assignment.orgData?.orgName || 'Unknown Organization',
        assignmentType: assignment.assignmentType,
        hierarchy: assignment.orgData?.hierarchy,
        level: assignment.orgData?.level,
        isActive: assignment.isActive,
        priority: assignment.priority,
        assignedAt: assignment.assignedAt,
        expiresAt: assignment.expiresAt
      }));

      console.log(`✅ Found ${formattedAssignments.length} organization assignments for user ${cleanUserId}`);
      console.log(`🔍 RELATIONSHIP SERVICE: getUserOrganizationAssignments returning: ${formattedAssignments.length} items`);
      return formattedAssignments;
    } catch (error) {
      console.error('❌ Error getting user organization assignments:', error.message);
      console.error('❌ Error stack:', error.stack);
      return [];
    }
  }

  /**
   * Get available entity credits for user's organizations
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} Array of entity credit objects
   */
  async getUserEntityCredits(tenantId, userId) {
    try {
      console.log(`🔍 RELATIONSHIP SERVICE: getUserEntityCredits called for user: ${userId}, tenant: ${tenantId}`);

      // Use raw MongoDB queries instead of Mongoose models for reliability
      const db = mongoose.connection.db || mongoose.connection.getClient()?.db();
      if (!db) {
        console.error('Database not connected, attempting direct connection...');
        // Try to establish connection if not available
        if (mongoose.connection.readyState !== 1) {
          console.error('Mongoose connection not ready');
          return [];
        }
        return [];
      }
      console.log('✅ RELATIONSHIP SERVICE: Database connection available for entity credits');

      // First get user's organization assignments to find org codes
      const orgAssignments = await db.collection('employeeorgassignments').find({
        tenantId,
        userIdString: userId
      }).project({ entityIdString: 1 }).toArray();

      console.log(`DEBUG: Found ${orgAssignments.length} org assignments for entity credits query`);

      if (!orgAssignments?.length) {
        console.log(`No organization assignments found for user ${userId}, cannot get entity credits`);
        return [];
      }

      // Get org codes from assignments
      const orgCodes = orgAssignments
        .filter(assignment => assignment.entityIdString)
        .map(assignment => assignment.entityIdString);

      console.log(`DEBUG: Org codes found:`, orgCodes);

      if (!orgCodes.length) {
        console.log(`No valid org codes found for user ${userId}`);
        return [];
      }

      // Query entity credits for these organizations using raw MongoDB
      const entityCredits = await db.collection('crmentitycredits').aggregate([
        { $match: { tenantId, entityIdString: { $in: orgCodes } } },
        {
          $lookup: {
            from: 'organizations',
            localField: 'entityIdString',
            foreignField: 'orgCode',
            as: 'orgData'
          }
        },
        { $unwind: { path: '$orgData', preserveNullAndEmptyArrays: true } }
      ]).toArray();

      console.log(`DEBUG: Entity credits raw query found ${entityCredits.length} results`);

      // Format for response
      const formattedCredits = entityCredits.map(credit => ({
        entityId: credit.orgData?.orgCode || credit.entityIdString,
        entityName: credit.orgData?.orgName || 'Unknown Organization',
        allocatedCredits: credit.allocatedCredits,
        usedCredits: credit.usedCredits,
        availableCredits: credit.availableCredits,
        allocationType: credit.allocationType,
        allocationPurpose: credit.allocationPurpose
      }));

      console.log(`Found ${formattedCredits.length} entity credits for user ${userId}`);
      console.log(`🔍 RELATIONSHIP SERVICE: getUserEntityCredits returning:`, formattedCredits.length, 'items');
      return formattedCredits;
    } catch (error) {
      console.error('Error getting user entity credits:', error);
      return [];
    }
  }

  /**
   * Get user roles by directly querying assignments
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Object[]>} Array of role objects
   */
  async getUserRoles(tenantId, userId) {
    try {
      // Use raw MongoDB queries instead of Mongoose models for reliability
      const db = mongoose.connection.db || mongoose.connection.getClient()?.db();
      if (!db) {
        console.error('Database not connected, attempting direct connection...');
        // Try to establish connection if not available
        if (mongoose.connection.readyState !== 1) {
          console.error('Mongoose connection not ready');
          return [];
        }
        return [];
      }

      console.log(`DEBUG: Searching for role assignments with userIdString: "${userId}" in tenant: "${tenantId}"`);

      // Query role assignments using raw MongoDB - ONLY active assignments
      const assignments = await db.collection('crmroleassignments').aggregate([
        { $match: { tenantId, userIdString: userId, isActive: true } },
        {
          $lookup: {
            from: 'crmroles',
            localField: 'roleIdString',
            foreignField: 'roleId',
            as: 'roleData'
          }
        },
        { $unwind: { path: '$roleData', preserveNullAndEmptyArrays: true } }
      ]).toArray();

      console.log(`DEBUG: Raw MongoDB role assignment query returned ${assignments.length} results`);

      if (!assignments?.length) {
        console.log(`No role assignments found for user ${userId} in tenant ${tenantId}`);
        return [];
      }

      // Extract unique roles
      const roleMap = new Map();
      assignments
        .filter(assignment => assignment.roleData)
        .forEach(assignment => {
          const role = assignment.roleData;
          if (!roleMap.has(role.roleId)) {
            roleMap.set(role.roleId, {
              roleId: role.roleId,
              roleName: role.roleName,
              permissions: role.permissions || [],
              priority: role.priority || 0
            });
          }
        });

      console.log(`Found ${roleMap.size} roles for user ${userId}`);
      return Array.from(roleMap.values());
    } catch (error) {
      console.error('Error getting user roles:', error);
      return [];
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} permission - Permission to check (e.g., "entity:org1:role:admin")
   * @returns {Promise<boolean>} Whether user has permission
   */
  async hasPermission(tenantId, userId, permission) {
    try {
      const permissions = await this.getUserPermissions(tenantId, userId);
      return permissions.includes(permission);
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Check if user has role in specific entity
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} entityId - Entity identifier
   * @param {string} roleId - Role identifier
   * @returns {Promise<boolean>} Whether user has role in entity
   */
  async hasRoleInEntity(tenantId, userId, entityId, roleId) {
    try {
      // Directly check if user has the specified role assignment in the entity
      const roleAssignment = await this.CrmRoleAssignment.findOne({
        tenantId,
        userId,
        entityId,
        roleId,
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      return !!roleAssignment;
    } catch (error) {
      console.error('Error checking role in entity:', error);
      return false;
    }
  }

  /**
   * Check if user is member of specific entity
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} entityId - Entity identifier
   * @returns {Promise<boolean>} Whether user is member of entity
   */
  async isMemberOfEntity(tenantId, userId, entityId) {
    try {
      const permission = `entity:${entityId}:member`;
      return await this.hasPermission(tenantId, userId, permission);
    } catch (error) {
      console.error('Error checking entity membership:', error);
      return false;
    }
  }

  // =============================================================================
  // CREDIT MANAGEMENT
  // =============================================================================

  /**
   * Check if user can perform operation based on credit availability
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} operationType - Operation type (e.g., 'crm.accounts.create')
   * @param {number} requiredCredits - Credits required for operation
   * @returns {Promise<{allowed: boolean, availableCredits: number, requiredCredits: number}>}
   */
  async checkCredits(tenantId, userId, operationType, requiredCredits = 1) {
    try {
      // Ensure models are initialized
      if (!this.modelsInitialized) {
        console.log('⏳ Waiting for relationship service models to initialize...');
        await initializationPromise;
      }

      const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

      // Single aggregation pipeline to check total available credits
      const creditData = await EmployeeOrgAssignment.aggregate([
        {
          $match: {
            tenantId,
            userIdString: userId,
            isActive: true,
            $or: [
              { expiresAt: null },
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        },
        {
          $lookup: {
            from: 'crmentitycredits',
            let: { entityIdString: '$entityIdString', tenantId: '$tenantId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$entityIdString', '$$entityIdString'] },
                      { $eq: ['$tenantId', '$$tenantId'] },
                      { $eq: ['$isActive', true] }
                    ]
                  }
                }
              }
            ],
            as: 'creditInfo'
          }
        },
        {
          $unwind: {
            path: '$creditInfo',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: null,
            totalAvailableCredits: {
              $sum: {
                $ifNull: ['$creditInfo.availableCredits', 0]
              }
            }
          }
        }
      ]);

      const totalAvailableCredits = creditData.length > 0 ? creditData[0].totalAvailableCredits : 0;

      return {
        allowed: totalAvailableCredits >= requiredCredits,
        availableCredits: totalAvailableCredits,
        requiredCredits
      };
    } catch (error) {
      console.error('Error checking credits:', error);
      return { allowed: false, availableCredits: 0, requiredCredits };
    }
  }

  /**
   * Consume credits for an operation
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} operationType - Operation type (e.g., 'crm.accounts.create')
   * @param {number} creditsUsed - Credits to consume
   * @param {Object} operationDetails - Additional operation details
   * @returns {Promise<boolean>} Success status
   */
  async consumeCredits(tenantId, userId, operationType, creditsUsed, operationDetails = {}) {
    try {
      // Use imported credit service

      // Get user's organization assignments
      const orgAssignments = await this.EmployeeOrgAssignment.find({
        tenantId,
        userIdString: userId,
        isActive: true,
        $or: [
          { expiresAt: null }, // Handle null values
          { expiresAt: { $exists: false } }, // Handle missing field
          { expiresAt: { $gt: new Date() } } // Handle future dates
        ]
      });

      if (orgAssignments.length === 0) {
        return false;
      }

      // Try to consume from each entity's credit pool
      for (const assignment of orgAssignments) {
        try {
          const result = await creditService.consumeCredits(
            tenantId,
            assignment.entityId,
            creditsUsed,
            operationType,
            operationDetails.resourceId || operationDetails.operationId,
            'crm',
            userId, // Pass userId for Redis streams
            operationDetails
          );

          if (result.success) {
            // Log the credit usage for backward compatibility
            // Map complex operation types to simple ones for enum compatibility
            const simpleOperationType = this.mapOperationType(operationType);
            const simpleResourceType = this.mapResourceType(operationDetails.resourceType || operationType);

            await this.CrmCreditUsage.create({
              usageId: `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              tenantId,
              userId,
              entityId: assignment.entityId,
              operationType: simpleOperationType,
              resourceType: simpleResourceType,
              operationCode: operationType // Reference to crmcreditconfigs operationCode
            });

            // Log the activity
            try {
              await this.logActivity({
                tenantId,
                userId,
                entityId: assignment.entityId,
                operationType,
                resourceType: operationDetails.resourceType || simpleResourceType,
                resourceId: operationDetails.resourceId,
                operationDetails: {
                  ...operationDetails,
                  creditsConsumed: creditsUsed,
                  creditConsumption: {
                    entityId: assignment.entityId,
                    creditsUsed,
                    remainingCredits: result.creditRecord.availableCredits
                  }
                },
                severity: 'low',
                status: 'success',
                creditsConsumed: creditsUsed
              });
            } catch (logError) {
              console.error('Failed to log activity:', logError);
              // Don't fail the operation if logging fails
            }

            return true; // Successfully consumed credits
          }
        } catch (error) {
          // Try next entity if this one fails
          console.log(`Failed to consume from entity ${assignment.entityId}:`, error.message);
          continue;
        }
      }

      return false; // No entity had sufficient credits
    } catch (error) {
      console.error('Error consuming credits:', error);
      return false;
    }
  }

  // =============================================================================
  // ORGANIZATION HIERARCHY MANAGEMENT
  // =============================================================================

  /**
   * Get user's accessible entities (all entities they have access to)
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @returns {Promise<Array>} Array of entity objects
   */
  async getUserAccessibleEntities(tenantId, userId) {
    try {
      // Ensure models are initialized
      if (!this.modelsInitialized) {
        console.log('⏳ Waiting for relationship service models to initialize...');
        await initializationPromise;
      }

      const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

      // Single aggregation pipeline to get user entities with organization details
      const entityData = await EmployeeOrgAssignment.aggregate([
        {
          $match: {
            tenantId,
            userIdString: userId, // Use userIdString to match the string userId parameter
            isActive: true,
            $or: [
              { expiresAt: null },
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        },
        {
          $lookup: {
            from: 'organizations',
            let: { entityIdString: '$entityIdString', tenantId: '$tenantId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$orgCode', '$$entityIdString'] }, // Match orgCode with entityIdString
                      { $eq: ['$tenantId', '$$tenantId'] },
                      { $eq: ['$status', 'active'] }
                    ]
                  }
                }
              }
            ],
            as: 'orgDetails'
          }
        },
        {
          $unwind: {
            path: '$orgDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: '$orgDetails._id', // Include ObjectId from organization
            orgCode: '$entityIdString', // Use entityIdString (orgCode), not entityId (ObjectId)
            orgName: { $ifNull: ['$orgDetails.orgName', '$entityIdString'] }, // Use entityIdString for fallback
            assignmentType: 1,
            priority: 1,
            hierarchy: { $ifNull: ['$orgDetails.hierarchy', {}] },
            status: { $ifNull: ['$orgDetails.status', 'unknown'] },
            parentId: { $ifNull: ['$orgDetails.parentId', null] },
            assignedAt: 1,
            expiresAt: 1
          }
        }
      ]);

      return entityData;
    } catch (error) {
      console.error('Error getting user accessible entities:', error);
      return [];
    }
  }

  /**
   * Get entity hierarchy path (breadcrumb)
   * @param {string} tenantId - Tenant identifier
   * @param {string} entityId - Entity identifier
   * @returns {Promise<Array>} Array of entities in hierarchy path
   */
  async getEntityHierarchyPath(tenantId, entityId) {
    try {
      const entities = [];
      let currentEntity = await this.Organization.findOne({
        tenantId,
        orgCode: entityId
      });

      while (currentEntity) {
        entities.unshift(currentEntity);
        if (currentEntity.parentId) {
          currentEntity = await this.Organization.findOne({
            tenantId,
            orgCode: currentEntity.parentId
          });
        } else {
          break;
        }
      }

      return entities;
    } catch (error) {
      console.error('Error getting entity hierarchy path:', error);
      return [];
    }
  }

  /**
   * Get all entities in hierarchy (recursive)
   * @param {string} tenantId - Tenant identifier
   * @param {string} rootEntityId - Root entity identifier
   * @returns {Promise<Array>} Array of all descendant entities
   */
  async getEntityTree(tenantId, rootEntityId) {
    try {
      const rootEntity = await this.Organization.findOne({
        tenantId,
        orgCode: rootEntityId
      });

      if (!rootEntity) return [];

      return await rootEntity.getDescendants();
    } catch (error) {
      console.error('Error getting entity tree:', error);
      return [];
    }
  }

  // =============================================================================
  // AUDIT & LOGGING
  // =============================================================================

  /**
   * Log user activity
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} Created activity log
   */
  async logActivity(activityData) {
    try {
      console.log(`📝 logActivity called with data:`, {
        tenantId: activityData.tenantId,
        userId: activityData.userId,
        entityId: activityData.entityId,
        operationType: activityData.operationType,
        resourceType: activityData.resourceType,
        resourceId: activityData.resourceId
      });

      // Map operation types and resource types to enum-compatible values
      const simpleOperationType = this.mapOperationType(activityData.operationType);
      const simpleResourceType = this.mapResourceType(activityData.resourceType || activityData.operationType);

      // Create legacy activity log (more flexible, can store raw values)
      // Only create if resourceId is available (entityId is now optional but we should still have resourceId for proper tracking)
      const legacyLog = await this.ActivityLog.create({
        orgCode: activityData.entityId, // Use entityId (organization code) instead of tenantId
        userId: activityData.userId,
        action: simpleOperationType, // Use simple operation type for consistency
        entityType: simpleResourceType, // Use simple resource type for consistency
        entityId: activityData.resourceId || 'pending', // Use 'pending' placeholder if resourceId is not yet available
        details: {
          ...activityData.operationDetails,
          simpleOperationType, // Include mapped values for reference
          simpleResourceType,
          originalOperationType: activityData.operationType,
          resourceIdPending: !activityData.resourceId // Flag to indicate if resourceId was pending
        }
      });

      console.log(`✅ Legacy activity log created with orgCode: ${legacyLog.orgCode}, id: ${legacyLog._id}`);

      // Create CRM activity log with enum-compatible values
      const crmLog = await this.CrmActivityLog.create({
        logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId: activityData.tenantId,
        userId: activityData.userId,
        entityId: activityData.entityId,
        operationType: simpleOperationType,
        resourceType: simpleResourceType,
        resourceId: activityData.resourceId,
        operationDetails: {
          ...activityData.operationDetails,
          originalOperationType: activityData.operationType // Preserve original
        },
        severity: activityData.severity || 'low',
        status: activityData.status || 'success',
        creditsConsumed: activityData.creditsConsumed || 0
      });

      console.log(`✅ CRM activity log created with entityId: ${crmLog.entityId}, logId: ${crmLog.logId}`);

      return crmLog;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Get user's activity summary
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activity summary
   */
  async getUserActivitySummary(tenantId, userId, startDate, endDate) {
    try {
      return await this.CrmActivityLog.getUserActivitySummary(tenantId, userId, startDate, endDate);
    } catch (error) {
      console.error('Error getting user activity summary:', error);
      return [];
    }
  }

  /**
   * Get tenant activity summary
   * @param {string} tenantId - Tenant identifier
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Activity summary
   */
  async getTenantActivitySummary(tenantId, startDate, endDate) {
    try {
      return await this.CrmActivityLog.getTenantActivitySummary(tenantId, startDate, endDate);
    } catch (error) {
      console.error('Error getting tenant activity summary:', error);
      return [];
    }
  }

  /**
   * Display organization hierarchy for a tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object>} Hierarchy display result
   */
  async displayOrganizationHierarchy(tenantId) {
    try {
      console.log('🌳 ORGANIZATION HIERARCHY DISPLAY');
      console.log('=====================================');
      console.log(`🏢 Tenant ID: ${tenantId}`);
      console.log('=====================================\n');

      // Check if mongoose is connected
      if (mongoose.connection.readyState !== 1) {
        console.log('❌ Database not connected. Please ensure mongoose is connected before calling this method.');
        return { success: false, error: 'Database not connected' };
      }

      // Fetch all organizations for the tenant
      const organizations = await this.Organization.find({ tenantId }).sort({ 'hierarchy.level': 1, orgName: 1 });

      console.log(`📊 Found ${organizations.length} organizations\n`);

      if (organizations.length === 0) {
        console.log('❌ No organizations found for this tenant');
        return { success: false, message: 'No organizations found' };
      }

      // Display table format
      this.displayHierarchyTable(organizations);

      // Build and display tree structure
      console.log('\n🌳 ORGANIZATION HIERARCHY TREE');
      console.log('='.repeat(50));

      const rootOrgs = this.buildHierarchyTree(organizations);
      this.printHierarchyTree(rootOrgs);

      // Summary statistics
      const stats = this.getHierarchyStatistics(organizations, rootOrgs);
      this.displayHierarchyStatistics(stats);

      return {
        success: true,
        totalOrganizations: organizations.length,
        rootOrganizations: rootOrgs.length,
        maxDepth: stats.maxLevel,
        organizations: organizations
      };

    } catch (error) {
      console.error('❌ Error displaying organization hierarchy:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Build hierarchy tree structure
   * @param {Array} organizations - Array of organization documents
   * @returns {Array} Root organizations with children
   */
  buildHierarchyTree(organizations) {
    const orgMap = new Map();
    const rootOrgs = [];

    // Create a map of orgCode -> organization
    organizations.forEach(org => {
      orgMap.set(org.orgCode, {
        ...org.toObject(),
        children: []
      });
    });

    // Build the tree structure
    organizations.forEach(org => {
      const orgNode = orgMap.get(org.orgCode);

      if (org.parentId && orgMap.has(org.parentId)) {
        // Has parent, add to parent's children
        const parent = orgMap.get(org.parentId);
        parent.children.push(orgNode);
      } else {
        // Root organization
        rootOrgs.push(orgNode);
      }
    });

    return rootOrgs;
  }

  /**
   * Display hierarchy in table format
   * @param {Array} organizations - Array of organization documents
   */
  displayHierarchyTable(organizations) {
    console.log('📊 ORGANIZATION HIERARCHY TABLE');
    console.log('='.repeat(100));
    console.log('Level | Code                          | Name                          | Parent');
    console.log('------|-------------------------------|-------------------------------|--------');

    // Sort by level and name for better display
    const sortedOrgs = organizations.sort((a, b) => {
      if (a.hierarchy?.level !== b.hierarchy?.level) {
        return (a.hierarchy?.level || 0) - (b.hierarchy?.level || 0);
      }
      return (a.orgName || a.orgCode).localeCompare(b.orgName || b.orgCode);
    });

    sortedOrgs.forEach(org => {
      const level = '  '.repeat(org.hierarchy?.level || 0) + (org.hierarchy?.level || 0);
      const code = (org.orgCode || '').padEnd(30);
      const name = (org.orgName || org.orgCode || '').padEnd(30);
      const parent = org.parentId || 'Root';

      console.log(`${level} | ${code} | ${name} | ${parent}`);
    });
  }

  /**
   * Print hierarchy tree
   * @param {Array} nodes - Array of organization nodes
   * @param {string} prefix - Tree prefix string
   * @param {boolean} isLast - Whether this is the last node
   */
  printHierarchyTree(nodes, prefix = '', isLast = true) {
    nodes.forEach((node, index) => {
      const isLastChild = index === nodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const nextPrefix = prefix + (isLast ? '    ' : '│   ');

      // Print current node
      console.log(`${prefix}${connector}${node.orgName || node.orgCode}`);
      console.log(`${nextPrefix}    📋 Code: ${node.orgCode}`);
      console.log(`${nextPrefix}    📊 Level: ${node.hierarchy?.level || 0}`);
      console.log(`${nextPrefix}    📍 Parent: ${node.parentId || 'Root'}`);
      console.log(`${nextPrefix}    📈 Children: ${node.children.length}`);

      // Print children recursively
      if (node.children && node.children.length > 0) {
        this.printHierarchyTree(node.children, nextPrefix, false);
      }
    });
  }

  /**
   * Get hierarchy statistics
   * @param {Array} organizations - Array of organization documents
   * @param {Array} rootOrgs - Array of root organizations
   * @returns {Object} Statistics object
   */
  getHierarchyStatistics(organizations, rootOrgs) {
    const levels = organizations.map(org => org.hierarchy?.level || 0);
    const maxLevel = Math.max(...levels);
    const levelCounts = {};

    // Count organizations by level
    for (let level = 0; level <= maxLevel; level++) {
      levelCounts[level] = organizations.filter(org => (org.hierarchy?.level || 0) === level).length;
    }

    return {
      rootOrganizations: rootOrgs.length,
      maxLevel,
      totalOrganizations: organizations.length,
      levelCounts
    };
  }

  /**
   * Display hierarchy statistics
   * @param {Object} stats - Statistics object
   */
  displayHierarchyStatistics(stats) {
    console.log('\n📈 HIERARCHY STATISTICS');
    console.log('='.repeat(30));
    console.log(`🏠 Root Organizations: ${stats.rootOrganizations}`);
    console.log(`📊 Maximum Depth: ${stats.maxLevel} levels`);
    console.log(`🏢 Total Organizations: ${stats.totalOrganizations}`);

    // Display level distribution
    for (let level = 0; level <= stats.maxLevel; level++) {
      console.log(`   Level ${level}: ${stats.levelCounts[level]} organizations`);
    }
  }

  // Helper methods for mapping operation types to enum values
  mapOperationType(operationType) {
    // Map complex operation types to simple enum values
    // Valid enum values: 'create', 'read', 'update', 'delete', 'import', 'export', 'bulk_operation', 'login', 'logout', 'permission_change', 'role_assignment', 'credit_usage'
    const operationMap = {
      // Accounts
      'crm.accounts.create': 'create',
      'crm.accounts.read': 'read',
      'crm.accounts.update': 'update',
      'crm.accounts.delete': 'delete',
      'crm.accounts.read_all': 'read',
      'crm.accounts.assign': 'update',
      'crm.accounts.view_contacts': 'read',
      'crm.accounts.export': 'export',
      'crm.accounts.import': 'import',
      // Contacts
      'crm.contacts.create': 'create',
      'crm.contacts.read': 'read',
      'crm.contacts.update': 'update',
      'crm.contacts.delete': 'delete',
      'crm.contacts.export': 'export',
      'crm.contacts.import': 'import',
      // Leads
      'crm.leads.create': 'create',
      'crm.leads.read': 'read',
      'crm.leads.update': 'update',
      'crm.leads.delete': 'delete',
      'crm.leads.export': 'export',
      'crm.leads.import': 'import',
      // Opportunities
      'crm.opportunities.create': 'create',
      'crm.opportunities.read': 'read',
      'crm.opportunities.update': 'update',
      'crm.opportunities.delete': 'delete',
      // Quotations
      'crm.quotations.create': 'create',
      'crm.quotations.read': 'read',
      'crm.quotations.update': 'update',
      'crm.quotations.delete': 'delete',
      'crm.quotations.generate_pdf': 'export',
      'crm.quotations.send': 'update',
      'crm.quotations.approve': 'update',
      // Invoices
      'crm.invoices.create': 'create',
      'crm.invoices.read': 'read',
      'crm.invoices.update': 'update',
      'crm.invoices.delete': 'delete',
      'crm.invoices.export': 'export',
      'crm.invoices.send': 'update',
      'crm.invoices.mark_paid': 'update',
      'crm.invoices.generate_pdf': 'export',
      // Sales Orders
      'crm.sales_orders.create': 'create',
      'crm.sales_orders.read': 'read',
      'crm.sales_orders.update': 'update',
      'crm.sales_orders.delete': 'delete',
      'crm.sales_orders.export': 'export',
      'crm.sales_orders.import': 'import',
      'crm.sales_orders.approve': 'update',
      // Tasks
      'crm.tasks.create': 'create',
      'crm.tasks.read': 'read',
      'crm.tasks.update': 'update',
      'crm.tasks.delete': 'delete',
      // Tickets
      'crm.tickets.create': 'create',
      'crm.tickets.read': 'read',
      'crm.tickets.update': 'update',
      'crm.tickets.delete': 'delete',
      'crm.tickets.assign': 'update',
      'crm.tickets.resolve': 'update',
      'crm.tickets.escalate': 'update',
      'crm.tickets.export': 'export',
      'crm.tickets.import': 'import',
      // Product Orders
      'crm.product_orders.create': 'create',
      'crm.product_orders.read': 'read',
      'crm.product_orders.update': 'update',
      'crm.product_orders.delete': 'delete',
      'crm.product_orders.export': 'export',
      'crm.product_orders.import': 'import',
      'crm.product_orders.process': 'update',
      // Inventory
      'crm.inventory.create': 'create',
      'crm.inventory.read': 'read',
      'crm.inventory.update': 'update',
      'crm.inventory.delete': 'delete',
      'crm.inventory.export': 'export',
      'crm.inventory.import': 'import',
      'crm.inventory.adjust': 'update',
      'crm.inventory.movement': 'update',
      // System operations
      'crm.system.users.create': 'create',
      'crm.system.users.update': 'update',
      'crm.system.users.delete': 'delete',
      'crm.system.roles.create': 'create',
      'crm.system.roles.update': 'update',
      'crm.system.roles.delete': 'delete',
      'crm.system.roles.assign': 'role_assignment',
      'crm.system.credit_config': 'credit_usage',
      'crm.system.audit_read': 'read',
      'crm.system.audit_read_all': 'read',
      'crm.system.activity_logs_read': 'read',
      'crm.system.activity_logs_read_all': 'read',
    };

    // If exact match found, return it
    if (operationMap[operationType]) {
      return operationMap[operationType];
    }

    // Try to extract operation type from pattern like 'crm.quotations.create'
    if (operationType && operationType.includes('.')) {
      const parts = operationType.split('.');
      if (parts.length >= 3) {
        const lastPart = parts[parts.length - 1];
        // Map common operation suffixes
        if (lastPart === 'create' || lastPart === 'add' || lastPart === 'new') {
          return 'create';
        }
        if (lastPart === 'read' || lastPart === 'view' || lastPart === 'get' || lastPart === 'list') {
          return 'read';
        }
        if (lastPart === 'update' || lastPart === 'edit' || lastPart === 'modify' || lastPart === 'change' || lastPart === 'assign' || lastPart === 'approve' || lastPart === 'send' || lastPart === 'mark_paid' || lastPart === 'resolve' || lastPart === 'escalate' || lastPart === 'process' || lastPart === 'adjust' || lastPart === 'movement') {
          return 'update';
        }
        if (lastPart === 'delete' || lastPart === 'remove') {
          return 'delete';
        }
        if (lastPart === 'export' || lastPart === 'generate_pdf' || lastPart === 'download') {
          return 'export';
        }
        if (lastPart === 'import' || lastPart === 'upload') {
          return 'import';
        }
      }
    }

    // Default fallback to 'create' (valid enum value) instead of 'api_call'
    return 'create';
  }

  mapResourceType(resourceType) {
    // Map resource types to enum values
    const resourceMap = {
      'account': 'account',
      'contact': 'contact',
      'lead': 'lead',
      'opportunity': 'opportunity',
      'task': 'task',
      'activity': 'activity',
      'file': 'file',
      'report': 'report',
      'user': 'user',
      'role': 'role',
      'permission': 'permission',
      'organization': 'organization',
      'credit': 'credit',
      'quotation': 'quotation',
      'invoice': 'invoice',
      'sales_order': 'sales_order'
    };

    // If resourceType is an operation like 'crm.accounts.create', extract 'account'
    if (resourceType && resourceType.includes('.')) {
      const parts = resourceType.split('.');
      if (parts.length >= 2) {
        return resourceMap[parts[1]] || 'system'; // Extract resource type from operation
      }
    }

    return resourceMap[resourceType] || 'system'; // Default fallback
  }

  /**
   * Get credit configurations for tenant
   * @param {string} tenantId - Tenant identifier
   * @returns {Promise<Object[]>} Array of credit config objects
   */
  async getCreditConfigs(tenantId) {
    try {
      // Import model
      const CrmCreditConfig = (await import('../models/CrmCreditConfig.js')).default;

      // Debug: Check total credit configs in tenant
      const totalConfigs = await CrmCreditConfig.countDocuments({ tenantId });
      console.log(`DEBUG: Total credit configs in tenant ${tenantId}: ${totalConfigs}`);

      // Get all credit configs for tenant (remove active filter temporarily)
      const creditConfigs = await CrmCreditConfig.find({
        tenantId
        // Temporarily remove active filter to debug
        // isActive: true
      }).select('operationCode creditCost description');

      // Format for response
      const formattedConfigs = creditConfigs.map(config => ({
        operationCode: config.operationCode,
        creditCost: config.creditCost,
        description: config.description
      }));

      console.log(`Found ${formattedConfigs.length} credit configs for tenant ${tenantId}`);
      return formattedConfigs;
    } catch (error) {
      console.error('Error getting credit configs:', error);
      return [];
    }
  }

  /**
   * Deduct credits for an operation and log activity
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} operationCode - Operation code (e.g., 'create_lead', 'update_account')
   * @param {string} resourceType - Type of resource being operated on
   * @param {string} resourceId - ID of the resource being operated on
   * @param {Object} operationDetails - Details about the operation
   * @param {Object} requestContext - Request context (ip, userAgent, sessionId)
   * @param {string} entityId - Optional: Specific entity ID to deduct credits from (for org switching support)
   * @returns {Promise<Object>} Credit deduction result
   */
  async deductCreditsForOperation(tenantId, userId, operationCode, resourceType, resourceId, operationDetails = {}, requestContext = {}, entityId = null) {
    const startTime = Date.now();

    try {
      console.log(`💰 CREDIT DEDUCTION: Starting for operation ${operationCode} by user ${userId}`);

      // Import required models and services
      const CrmCreditConfig = (await import('../models/CrmCreditConfig.js')).default;
      const CrmCreditUsage = (await import('../models/CrmCreditUsage.js')).default;
      const CrmActivityLog = (await import('../models/CrmActivityLog.js')).default;
      const creditService = (await import('./creditService.js')).default;

      // Step 1: Get effective credit configuration using hierarchical resolution
      // This will check: Entity-specific → Tenant-specific → Global → Default
      // Pass entityId if available to check for entity-specific configs
      const creditConfig = await CrmCreditConfig.getEffectiveConfig(operationCode, tenantId, entityId);

      if (!creditConfig) {
        console.log(`⚠️ No credit config found for operation ${operationCode} in tenant ${tenantId} (checked tenant-specific and global)`);
        // Log the operation without credit deduction
        await this.logOperationActivity(tenantId, userId, 'create', resourceType, resourceId, operationDetails, requestContext, 0, null, 'success', 'low', 0);
        return { success: true, creditsDeducted: 0, message: 'No credit configuration found - operation logged without deduction' };
      }

      const creditCost = creditConfig.creditCost || 0;
      const configSource = creditConfig.isGlobal ? 'global' : 'tenant-specific';

      console.log(`💰 Using ${configSource} credit config ${creditConfig.configId} for ${operationCode} with cost ${creditCost}`);

      if (creditCost === 0) {
        console.log(`ℹ️ Operation ${operationCode} has zero credit cost - logging without deduction`);
        await this.logOperationActivity(tenantId, userId, 'create', resourceType, resourceId, operationDetails, requestContext, 0, null, 'success', 'low', 0);
        return { success: true, creditsDeducted: 0, message: 'Zero credit cost - operation logged without deduction' };
      }

      console.log(`💰 Credit cost for ${operationCode}: ${creditCost}`);

      // Step 2: Determine entity for credit deduction
      let entityIdForDeduction = entityId; // Use provided entityId if available
      let entityName = 'Unknown Organization';

      if (!entityIdForDeduction) {
        // Fall back to user's organization assignments if no specific entityId provided
        const orgAssignments = await this.getUserOrganizationAssignments(tenantId, userId);

        if (!orgAssignments || orgAssignments.length === 0) {
          console.warn(`⚠️ User ${userId} has no organization assignments - cannot deduct credits`);
          await this.logOperationActivity(tenantId, userId, 'create', resourceType, resourceId, operationDetails, requestContext, 0, 'User has no organization assignments');
          return { success: false, creditsDeducted: 0, message: 'User has no organization assignments' };
        }

        // Use the first (primary) organization assignment for credit deduction
        const primaryOrg = orgAssignments[0];
        entityIdForDeduction = primaryOrg.entityId;
        entityName = primaryOrg.entityName;

        console.log(`🏢 Using primary entity ${entityIdForDeduction} for credit deduction from org ${entityName}`);
      } else {
        // Verify that the user has access to the specified entity
        const orgAssignments = await this.getUserOrganizationAssignments(tenantId, userId);
        const hasAccessToEntity = orgAssignments.some(assignment => assignment.entityId === entityIdForDeduction);

        if (!hasAccessToEntity) {
          console.warn(`⚠️ User ${userId} does not have access to entity ${entityIdForDeduction} - cannot deduct credits`);
          await this.logOperationActivity(tenantId, userId, 'create', resourceType, resourceId, operationDetails, requestContext, 0, `User does not have access to entity ${entityIdForDeduction}`);
          return { success: false, creditsDeducted: 0, message: `User does not have access to specified entity` };
        }

        // Get entity name for logging
        const entityAssignment = orgAssignments.find(assignment => assignment.entityId === entityIdForDeduction);
        entityName = entityAssignment?.entityName || 'Switched Organization';

        console.log(`🏢 Using switched entity ${entityIdForDeduction} for credit deduction from org ${entityName}`);
      }

      // Step 3: Check available credits before deduction
      const availableCredits = await creditService.getAvailableCredits(tenantId, entityIdForDeduction);
      console.log(`💰 Available credits for entity ${entityIdForDeduction}: ${availableCredits.availableCredits}`);

      if (availableCredits.availableCredits < creditCost) {
        console.warn(`❌ Insufficient credits: ${availableCredits.availableCredits} available, ${creditCost} required`);

        // Log failed attempt
        await this.logOperationActivity(tenantId, userId, 'create', resourceType, resourceId, operationDetails, requestContext, 0, 'Insufficient credits', 'failure', 'high', 0);

        return {
          success: false,
          creditsDeducted: 0,
          message: `Insufficient credits: ${availableCredits.availableCredits} available, ${creditCost} required`,
          availableCredits: availableCredits.availableCredits,
          requiredCredits: creditCost
        };
      }

      // Step 4: Deduct credits using the credit service
      const deductionResult = await creditService.consumeCredits(
        tenantId,
        entityIdForDeduction,
        creditCost,
        operationCode.split('_')[0] || 'create', // Extract operation type (create, update, delete, etc.)
        resourceId,
        'crm',
        userId,
        {
          operationCode,
          resourceType,
          resourceId,
          ...operationDetails
        }
      );

      if (!deductionResult.success) {
        throw new Error('Credit deduction failed');
      }

      console.log(`✅ Credits deducted: ${creditCost} from entity ${entityIdForDeduction}`);

      // Step 5: Log credit usage
      await this.logCreditUsage(tenantId, userId, entityIdForDeduction, operationCode, resourceType, resourceId, creditCost, {
        ...operationDetails,
        configId: creditConfig.configId // Include the configId used for this operation
      });

      // Step 6: Log activity using the correct entityId
      console.log(`📝 Logging activity for operation ${operationCode} with entityId: ${entityIdForDeduction}`);
      await this.logActivity({
        tenantId,
        userId,
        entityId: entityIdForDeduction, // Use the entity where credits were actually deducted
        operationType: operationCode,
        resourceType,
        resourceId,
        operationDetails: {
          ...operationDetails,
          creditsDeducted: creditCost,
          entityName: entityName
        },
        severity: 'low',
        status: 'success',
        creditsConsumed: creditCost
      });

      // Step 7: Log operation activity for CRM system
      const processingTime = Date.now() - startTime;
      await this.logOperationActivity(
        tenantId,
        userId,
        'create', // Use simple operation type for activity log
        resourceType,
        resourceId,
        {
          ...operationDetails,
          creditsDeducted: creditCost,
          entityId: entityIdForDeduction,
          entityName: entityName,
          operationCode: operationCode // Include operationCode in details for credit history
        },
        requestContext,
        creditCost,
        null,
        'success',
        'medium',
        processingTime
      );

      console.log(`✅ CREDIT DEDUCTION COMPLETE: ${creditCost} credits deducted for ${operationCode}`);

      return {
        success: true,
        creditsDeducted: creditCost,
        entityId: entityIdForDeduction,
        entityName: entityName,
        remainingCredits: deductionResult.creditRecord.availableCredits,
        transaction: deductionResult.transaction
      };

    } catch (error) {
      console.error('❌ Error in credit deduction:', error);

      // Log failed operation
      const processingTime = Date.now() - startTime;
      await this.logOperationActivity(
        tenantId,
        userId,
        'create',
        resourceType,
        resourceId,
        operationDetails,
        requestContext,
        0,
        error.message,
        'failure',
        'high',
        processingTime
      );

      return {
        success: false,
        creditsDeducted: 0,
        message: error.message
      };
    }
  }

  /**
   * Log credit usage for an operation
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} entityId - Entity identifier
   * @param {string} operationCode - Operation code
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {number} creditsConsumed - Credits consumed
   * @param {Object} operationDetails - Operation details
   */
  async logCreditUsage(tenantId, userId, entityId, operationCode, resourceType, resourceId, creditsConsumed, operationDetails = {}) {
    try {
      const CrmCreditUsage = (await import('../models/CrmCreditUsage.js')).default;

      // Map resourceType to valid enum value
      const mappedResourceType = this.mapResourceType(resourceType);
      
      // Ensure mappedResourceType is a valid enum value, fallback to 'activity' if not
      const validResourceTypes = [
        'lead', 'contact', 'account', 'opportunity',
        'task', 'activity', 'file', 'report', 'api',
        'quotation', 'invoice', 'sales_order', 'product_order',
        'ticket', 'communication', 'form_builder', 'analytics'
      ];
      
      const finalResourceType = validResourceTypes.includes(mappedResourceType) 
        ? mappedResourceType 
        : 'activity'; // Fallback to 'activity' if not in enum

      // Generate usageId explicitly to ensure it's set before validation
      const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const usageRecord = await CrmCreditUsage.create({
        usageId, // Explicitly set usageId to ensure it's available
        tenantId,
        userId,
        entityId,
        operationType: operationCode.split('.').pop().split('_')[0] || 'create',
        resourceType: finalResourceType, // Use mapped and validated resource type
        operationCode,
        creditsConsumed,
        configId: operationDetails.configId || null // Include configId from operation details
      });

      console.log(`📊 Credit usage logged: ${usageRecord.usageId} (config: ${operationDetails.configId || 'N/A'})`);
      return usageRecord;
    } catch (error) {
      console.error('❌ Error logging credit usage:', error);
      // Don't throw - credit deduction was successful, just logging failed
    }
  }

  /**
   * Log operation activity with credit information
   * @param {string} tenantId - Tenant identifier
   * @param {string} userId - User identifier
   * @param {string} operationType - Operation type (create, update, delete, etc.)
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @param {Object} operationDetails - Operation details
   * @param {Object} requestContext - Request context
   * @param {number} creditsConsumed - Credits consumed
   * @param {string} errorMessage - Error message if any
   * @param {string} status - Operation status
   * @param {string} severity - Log severity
   * @param {number} processingTime - Processing time in milliseconds
   */
  async logOperationActivity(tenantId, userId, operationType, resourceType, resourceId, operationDetails, requestContext = {}, creditsConsumed = 0, errorMessage = null, status = 'success', severity = 'low', processingTime = null) {
    try {
      // Ensure models are initialized before using them
      if (!this.modelsInitialized) {
        console.log('⏳ Waiting for relationship service models to initialize for activity logging...');
        await initializationPromise;
      }

      const CrmActivityLog = this.CrmActivityLog;

      // Get user's primary organization for entity context
      const orgAssignments = await this.getUserOrganizationAssignments(tenantId, userId);
      const primaryOrg = orgAssignments && orgAssignments.length > 0 ? orgAssignments[0] : null;

      // Use entityId from operationDetails if provided, otherwise use primary org
      const entityId = operationDetails?.entityId || primaryOrg?.entityId;
      const entityName = operationDetails?.entityName || primaryOrg?.entityName;

      const activityLog = await CrmActivityLog.create({
        logId: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tenantId,
        userId,
        entityId: entityId,
        operationType,
        resourceType,
        resourceId,
        operationDetails: {
          ...operationDetails,
          creditsConsumed,
          entityName: entityName
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        sessionId: requestContext.sessionId,
        severity,
        status,
        errorMessage,
        processingTime,
        creditsConsumed,
        metadata: {
          ...requestContext.metadata,
          creditOperation: creditsConsumed > 0,
          organizationContext: primaryOrg
        }
      });

      console.log(`📝 Activity logged: ${activityLog.logId} (${status})`);
      return activityLog;
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      // Don't throw - operation was successful, just logging failed
    }
  }
}

// Create and export the service instance (will be initialized asynchronously)
const relationshipService = new RelationshipService();

// Initialize the service with models
const initializeService = async () => {
  try {
    await initializeModels();

    // Initialize the service instance with loaded models
    relationshipService.initializeModels({
      Tenant, Organization, User, Role, ActivityLog, CrmCreditConfig,
      CrmRoleAssignment, CrmCreditUsage, CrmEntityCredit, EmployeeOrgAssignment,
      CrmTenantUser, CrmActivityLog
    });

    console.log('✅ Relationship service fully initialized');
  } catch (error) {
    console.error('❌ Failed to initialize relationship service:', error);
    throw error;
  }
};

// Initialize on module load and export the initialization promise
const initializationPromise = initializeService();

// Export both the service and the initialization promise
export { initializationPromise };

export default relationshipService;
