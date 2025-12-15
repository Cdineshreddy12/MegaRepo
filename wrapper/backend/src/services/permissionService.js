import { db } from '../db/index.js';
import { customRoles, userRoleAssignments } from '../db/schema/permissions.js';
import { tenantUsers, auditLogs } from '../db/schema/users.js';
import { organizationMemberships } from '../db/schema/organization_memberships.js';
import { eq, and, like, desc, count, or, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
// Role templates removed - using application/module based role creation

class PermissionService {
  // Get all available permissions organized by application → module → operation
  async getAvailablePermissions() {
    // Import realistic CRM permissions
    const { CRM_PERMISSION_MATRIX, CRM_SPECIAL_PERMISSIONS } = await import('../data/comprehensive-crm-permissions.js');
    
    // Convert realistic permissions to frontend format
    const crmModules = {};
    
    Object.entries(CRM_PERMISSION_MATRIX).forEach(([moduleKey, modulePermissions]) => {
      const moduleKeyUpper = moduleKey.toUpperCase();
      
      crmModules[moduleKeyUpper] = {
        name: this.getModuleDisplayName(moduleKey),
        description: this.getModuleDescription(moduleKey),
        operations: Object.entries(modulePermissions).map(([permissionKey, description]) => ({
          id: permissionKey,
          name: this.getOperationDisplayName(permissionKey),
          description: description,
          level: this.getPermissionLevel(permissionKey)
        }))
      };
    });
    
    // Add special permissions module
    crmModules.SPECIAL = {
      name: 'Special Permissions',
      description: 'Cross-module administrative permissions',
      operations: Object.entries(CRM_SPECIAL_PERMISSIONS).map(([permissionKey, description]) => ({
        id: permissionKey,
        name: this.getOperationDisplayName(permissionKey),
        description: description,
        level: 'advanced'
      }))
    };

    const applicationStructure = {
      CRM: {
        name: 'Customer Relationship Management',
        description: 'Realistic B2B CRM with 16 modules and 107 permissions',
        icon: '💼',
        color: '#3B82F6',
        modules: crmModules
      }
    };

    // Transform to expected frontend format
    const applications = Object.entries(applicationStructure).map(([key, app]) => ({
      key: key.toLowerCase(),
      appId: key.toLowerCase(),
      appCode: key.toLowerCase(),
      appName: app.name,
      name: app.name,
      description: app.description,
      icon: app.icon,
      color: app.color,
      moduleCount: Object.keys(app.modules).length,
      operationCount: Object.values(app.modules).reduce((total, module) => total + module.operations.length, 0),
      modules: Object.entries(app.modules).map(([moduleKey, module]) => ({
        key: moduleKey.toLowerCase(),
        moduleId: moduleKey.toLowerCase(),
        moduleCode: moduleKey.toLowerCase(),
        moduleName: module.name,
        name: module.name,
        description: module.description,
        isCore: true,
        permissions: module.operations.map(op => op.id.split('.').pop()),
        operations: module.operations
      }))
    }));

    // Calculate summary data
    const summary = {
      applicationCount: applications.length,
      moduleCount: applications.reduce((total, app) => total + app.moduleCount, 0),
      operationCount: applications.reduce((total, app) => total + app.operationCount, 0)
    };

    console.log('📊 Permission Structure Summary:');
    console.log(`🏢 Total Applications: ${summary.applicationCount}`);
    console.log(`📦 Total Modules: ${summary.moduleCount}`);
    console.log(`⚡ Total Operations: ${summary.operationCount}`);
    
    applications.forEach(app => {
      console.log(`  📱 ${app.name}: ${app.moduleCount} modules, ${app.operationCount} operations`);
    });

    return { 
      applications,
      summary,
      structure: applicationStructure
    };
  }

  // Helper methods for display names
  getModuleDisplayName(moduleKey) {
    const displayNames = {
      'leads': 'Lead Management', 'accounts': 'Account Management', 'contacts': 'Contact Management',
      'opportunities': 'Opportunity Management', 'quotations': 'Quotation Management', 'tickets': 'Ticket Management',
      'communications': 'Communication Management', 'invoices': 'Invoice Management', 'sales_orders': 'Sales Order Management',
      'documents': 'Document Management', 'bulk_operations': 'Bulk Operations', 'pdf': 'PDF Generation',
      'dashboard': 'Dashboard', 'users': 'User Management', 'roles': 'Role Management', 'audit': 'Audit & Logging'
    };
    return displayNames[moduleKey] || moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1);
  }

  getModuleDescription(moduleKey) {
    const descriptions = {
      'leads': 'Manage sales leads and prospects', 'accounts': 'Manage customer accounts and company information',
      'contacts': 'Manage individual contacts and relationships', 'opportunities': 'Manage sales opportunities and deals',
      'quotations': 'Create and manage quotations', 'tickets': 'Manage support tickets and requests',
      'communications': 'Track communications and interactions', 'invoices': 'Create and manage invoices',
      'sales_orders': 'Process and manage sales orders', 'documents': 'Upload and manage documents',
      'bulk_operations': 'Import/export data in bulk', 'pdf': 'Generate and download PDFs',
      'dashboard': 'Access dashboard and analytics', 'users': 'Manage user accounts and profiles',
      'roles': 'Manage roles and permissions', 'audit': 'View audit logs and system activity'
    };
    return descriptions[moduleKey] || `Manage ${moduleKey} functionality`;
  }

  getOperationDisplayName(permissionKey) {
    const operation = permissionKey.split('.').pop();
    const displayNames = {
      'create': 'Create', 'read': 'View', 'read_all': 'View All', 'update': 'Edit', 'delete': 'Delete',
      'export': 'Export', 'import': 'Import', 'generate_pdf': 'Generate PDF', 'view_contacts': 'View Contacts',
      'upload': 'Upload', 'download': 'Download', 'view': 'View', 'stats': 'Statistics',
      'change_status': 'Change Status', 'change_role': 'Change Role', 'change_password': 'Change Password',
      'bulk_upload': 'Bulk Upload', 'view_own': 'View Own', 'view_all': 'View All', 'search': 'Search',
      'template': 'Template', 'generate': 'Generate'
    };
    return displayNames[operation] || operation.charAt(0).toUpperCase() + operation.slice(1);
  }

  getPermissionLevel(permissionKey) {
    const operation = permissionKey.split('.').pop();
    if (['read', 'view', 'view_own'].includes(operation)) return 'basic';
    if (['create', 'update', 'export', 'generate_pdf', 'upload', 'download', 'template'].includes(operation)) return 'standard';
    if (['delete', 'import', 'read_all', 'view_all', 'change_status', 'change_role', 'change_password', 'bulk_upload'].includes(operation)) return 'advanced';
    return 'standard';
  }

  // Get tenant roles with optional filtering
  async getTenantRoles(tenantId, options = {}) {
    const { page = 1, limit = 20, search, type } = options;
    
    console.log('🔍 getTenantRoles called with:', { tenantId, options });
    
    let query = db
      .select({
        roleId: customRoles.roleId,
        roleName: customRoles.roleName,
        description: customRoles.description,
        color: customRoles.color,
        permissions: customRoles.permissions,
        restrictions: customRoles.restrictions,
        isSystemRole: customRoles.isSystemRole,
        isDefault: customRoles.isDefault,
        priority: customRoles.priority,
        // createdBy: customRoles.createdBy, // Temporarily removed
        createdAt: customRoles.createdAt,
        updatedAt: customRoles.updatedAt,
        userCount: count(userRoleAssignments.id)
      })
      .from(customRoles)
      .leftJoin(userRoleAssignments, eq(customRoles.roleId, userRoleAssignments.roleId))
      .where(eq(customRoles.tenantId, tenantId))
      .groupBy(customRoles.roleId);

    console.log('🔍 Query built, checking for roles with tenantId:', tenantId);
    
    // Apply filters
    if (search) {
      query = query.where(
        and(
          eq(customRoles.tenantId, tenantId),
          or(
            like(customRoles.roleName, `%${search}%`),
            like(customRoles.description, `%${search}%`)
          )
        )
      );
    }

    if (type === 'system') {
      query = query.where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.isSystemRole, true)
        )
      );
    } else if (type === 'custom') {
      query = query.where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.isSystemRole, false)
        )
      );
    }

    // Get total count
    const countQuery = db
      .select({ count: count() })
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    console.log('🔍 Executing queries...');
    
    const [roleResults, countResult] = await Promise.all([
      query
        .orderBy(desc(customRoles.priority), desc(customRoles.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      countQuery
    ]);

    console.log('🔍 Query results:', {
      roleResultsCount: roleResults.length,
      countResult: countResult[0]?.count,
      firstRole: roleResults[0] || 'No roles found'
    });

    return {
      data: roleResults,
      total: countResult[0].count,
      page,
      limit,
      totalPages: Math.ceil(countResult[0].count / limit)
    };
  }

  // Create a new role
  async createRole(roleData) {
    const { tenantId, name, description, permissions, restrictions } = roleData; // removed createdBy
    
    // Check if role name already exists
    const existingRole = await db
      .select({ roleId: customRoles.roleId })
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleName, name)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      throw new Error(`Role with name "${name}" already exists`);
    }

    const roleId = uuidv4();
    const now = new Date();

    // Convert permissions to tool-specific format if needed
    const formattedPermissions = this.formatPermissionsForStorage(permissions);

    const newRole = await db
      .insert(customRoles)
      .values({
        roleId,
        tenantId,
        roleName: name,
        description,
        permissions: JSON.stringify(formattedPermissions),
        restrictions: restrictions ? JSON.stringify(restrictions) : null,
        isSystemRole: false,
        isDefault: false,
        priority: 0,
        // createdBy, // Temporarily removed
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Log the creation
    await this.logAuditEvent({
      tenantId,
      userId: 'system', // Use 'system' as fallback since createdBy is not available
      action: 'role_created',
      resourceType: 'role',
      resourceId: roleId,
      newValues: { name, permissions: formattedPermissions, restrictions }
    });

    return newRole[0];
  }

  // Update an existing role
  async updateRole(tenantId, roleId, updateData) {
    const { name, description, permissions, restrictions, updatedBy } = updateData;
    
    // Get existing role
    const existingRole = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    if (!existingRole.length) {
      throw new Error('Role not found');
    }

    if (existingRole[0].isSystemRole) {
      throw new Error('Cannot modify system roles');
    }

    // Check name uniqueness if name is being changed
    if (name && name !== existingRole[0].roleName) {
      const nameExists = await db
        .select({ roleId: customRoles.roleId })
        .from(customRoles)
        .where(
          and(
            eq(customRoles.tenantId, tenantId),
            eq(customRoles.roleName, name),
            ne(customRoles.roleId, roleId)
          )
        )
        .limit(1);

      if (nameExists.length > 0) {
        throw new Error(`Role with name "${name}" already exists`);
      }
    }

    const updates = {
      updatedAt: new Date()
    };

    if (name) updates.roleName = name;
    if (description !== undefined) updates.description = description;
    if (permissions) {
      const formattedPermissions = this.formatPermissionsForStorage(permissions);
      updates.permissions = JSON.stringify(formattedPermissions);
    }
    if (restrictions !== undefined) {
      updates.restrictions = restrictions ? JSON.stringify(restrictions) : null;
    }

    const updatedRole = await db
      .update(customRoles)
      .set(updates)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .returning();

    // Log the update
    await this.logAuditEvent({
      tenantId,
      userId: updatedBy,
      action: 'role_updated',
      resourceType: 'role',
      resourceId: roleId,
      oldValues: existingRole[0],
      newValues: updates
    });

    // Publish role change event to Redis streams for real-time sync
    try {
      const { crmSyncStreams } = await import('../utils/redis.js');
      
      // Publish using standard publishRoleEvent method for consistency
      await crmSyncStreams.publishRoleEvent(tenantId, 'role_updated', {
        roleId: updatedRole[0].roleId,
        roleName: updatedRole[0].roleName,
        description: updatedRole[0].description,
        permissions: JSON.parse(updatedRole[0].permissions || '{}'),
        restrictions: updatedRole[0].restrictions 
          ? (typeof updatedRole[0].restrictions === 'string' 
              ? JSON.parse(updatedRole[0].restrictions) 
              : updatedRole[0].restrictions)
          : null,
        updatedBy: updatedBy,
        updatedAt: updatedRole[0].updatedAt || new Date().toISOString()
      });
      
      console.log('📡 Published role_updated event to Redis streams');
      
      // Also publish to custom stream for backward compatibility
      const { v4: uuidv4 } = await import('uuid');
      const eventData = {
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
        eventType: 'role_permissions_changed',
        tenantId: tenantId,
        entityType: 'role',
        entityId: updatedRole[0].roleId,
        action: 'permissions_updated',
        data: {
          roleId: updatedRole[0].roleId,
          roleName: updatedRole[0].roleName,
          permissions: JSON.parse(updatedRole[0].permissions || '{}'),
          isActive: updatedRole[0].isActive !== false,
          description: updatedRole[0].description,
          scope: updatedRole[0].scope || 'organization'
        },
        metadata: {
          correlationId: `role_permissions_${updatedRole[0].roleId}_${Date.now()}`,
          version: '1.0',
          sourceTimestamp: new Date().toISOString(),
          sourceApp: 'wrapper'
        }
      };

      // Publish to Redis stream
      const streamKey = `crm:sync:role_permissions`;
      const result = await crmSyncStreams.publishToStream(streamKey, eventData);

      console.log(`📡 Published role permissions change event for role "${roleId}" to Redis stream: ${streamKey}`);
      console.log(`   Stream ID: ${result?.messageId}`);
    } catch (publishError) {
      console.error('⚠️ Failed to publish role change event:', publishError.message);
      // Don't fail the role update if event publishing fails
    }

    return updatedRole[0];
  }

  // Delete a role with options
  async deleteRole(tenantId, roleId, options = {}) {
    const { force = false, transferUsersTo, deletedBy } = options;
    
    const existingRole = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    if (!existingRole.length) {
      throw new Error('Role not found');
    }

    if (existingRole[0].isSystemRole) {
      throw new Error('Cannot delete system roles');
    }

    // Special protection for Super Administrator role
    if (existingRole[0].roleName === 'Super Administrator' || existingRole[0].priority >= 1000) {
      throw new Error('Cannot delete Super Administrator role - this is the primary admin role for the organization');
    }

    // Check if role is assigned to users (direct assignments)
    const userAssignments = await db
      .select({ count: count() })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.roleId, roleId));

    // Check if role is assigned via organization memberships
    const orgAssignments = await db
      .select({ count: count() })
      .from(organizationMemberships)
      .where(eq(organizationMemberships.roleId, roleId));

    const totalAssignments = userAssignments[0].count + orgAssignments[0].count;

    if (totalAssignments > 0) {
      if (!force && !transferUsersTo) {
        throw new Error(`Cannot delete role that is assigned to ${totalAssignments} user(s)`);
      }

      if (transferUsersTo) {
        // Transfer users to another role (only for direct assignments)
        await db
          .update(userRoleAssignments)
          .set({ roleId: transferUsersTo })
          .where(eq(userRoleAssignments.roleId, roleId));
        // Note: Organization memberships cannot be transferred, only removed
      } else if (force) {
        // Force delete - remove all assignments
        await db
          .delete(userRoleAssignments)
          .where(eq(userRoleAssignments.roleId, roleId));

        // Also remove organization memberships that reference this role
        await db
          .delete(organizationMemberships)
          .where(eq(organizationMemberships.roleId, roleId));
      }
    }

    // Delete the role
    await db
      .delete(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      );

    // Log the deletion
    if (deletedBy) {
      await this.logAuditEvent({
        tenantId,
        userId: deletedBy,
        action: 'role_deleted',
        resourceType: 'role',
        resourceId: roleId,
        oldValues: existingRole[0],
        details: {
          force,
          transferUsersTo,
          usersAffected: totalAssignments
        }
      });
    }

    return {
      deleted: true,
      usersAffected: totalAssignments,
      transferredTo: transferUsersTo
    };
  }

  // Format permissions for storage (convert array to tool-specific object)
  formatPermissionsForStorage(permissions) {
    if (Array.isArray(permissions)) {
      // Convert flat permission array to tool-specific structure
      const toolPermissions = {};
      
      permissions.forEach(permissionId => {
        const parts = permissionId.split('.');
        if (parts.length >= 3) {
          const [tool, resource, action] = parts;
          
          if (!toolPermissions[tool]) {
            toolPermissions[tool] = {};
          }
          if (!toolPermissions[tool][resource]) {
            toolPermissions[tool][resource] = [];
          }
          
          if (!toolPermissions[tool][resource].includes(action)) {
            toolPermissions[tool][resource].push(action);
          }
        }
      });
      
      return toolPermissions;
    }
    
    return permissions; // Already in correct format
  }

  // Role assignment methods
  async assignRole(assignmentData) {
    const { userId, roleId, expiresAt, assignedBy, tenantId } = assignmentData;
    
    console.log('🔒 [PermissionService] Role assignment request:', {
      userId,
      roleId,
      assignedBy,
      tenantId,
      hasExpiration: !!expiresAt
    });
    
    console.log('🔒 [PermissionService] Role assignment request:', {
      userId,
      roleId,
      assignedBy,
      tenantId,
      hasExpiration: !!expiresAt
    });
    
    // Check if assignment already exists
    const existing = await db
      .select()
      .from(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.roleId, roleId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      console.log('🔄 [PermissionService] Updating existing role assignment:', {
        existingAssignmentId: existing[0].id,
        wasActive: existing[0].isActive
      });
      
      // Update existing assignment
      const updated = await db
        .update(userRoleAssignments)
        .set({
          isActive: true,
          expiresAt: expiresAt ? new Date(expiresAt) : null,
          assignedBy,
          assignedAt: new Date()
        })
        .where(eq(userRoleAssignments.id, existing[0].id))
        .returning();

      console.log('✅ [PermissionService] Role assignment updated successfully');
      
      // Publish role assignment event (reassignment)
      try {
        const { crmSyncStreams } = await import('../utils/redis.js');
        await crmSyncStreams.publishRoleEvent(tenantId, 'role_assigned', {
          assignmentId: updated[0].id,
          userId: userId,
          roleId: roleId,
          assignedAt: new Date().toISOString(),
          assignedBy: assignedBy,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          isReassignment: true
        });
        console.log('📡 Published role reassignment event successfully');
      } catch (publishError) {
        console.warn('⚠️ Failed to publish role reassignment event:', publishError.message);
        // Don't fail the assignment if event publishing fails
      }
      
      return updated[0];
    }

    // Create new assignment - 'id' is auto-generated by schema
    console.log('➕ [PermissionService] Creating new role assignment');
    
    const assignment = await db
      .insert(userRoleAssignments)
      .values({
        userId,
        roleId,
        isActive: true,
        isTemporary: !!expiresAt,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        assignedBy,
        assignedAt: new Date()
      })
      .returning();

    console.log('✅ [PermissionService] New role assignment created successfully');
    
    // Publish role assignment event
    try {
      const { crmSyncStreams } = await import('../utils/redis.js');
      await crmSyncStreams.publishRoleEvent(tenantId, 'role_assigned', {
        assignmentId: assignment[0].id,
        userId: userId,
        roleId: roleId,
        assignedAt: new Date().toISOString(),
        assignedBy: assignedBy,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null
      });
      console.log('📡 Published role assignment event successfully');
    } catch (publishError) {
      console.warn('⚠️ Failed to publish role assignment event:', publishError.message);
      // Don't fail the assignment if event publishing fails
    }
    
    return assignment[0];
  }

  // Remove role assignment
  async removeRoleAssignment(tenantId, userId, roleId, removedBy) {
    console.log('🔒 [PermissionService] Role removal request:', {
      userId,
      roleId,
      removedBy,
      tenantId
    });
    
    // Find the assignment
    const existing = await db
      .select()
      .from(userRoleAssignments)
      .where(
        and(
          eq(userRoleAssignments.userId, userId),
          eq(userRoleAssignments.roleId, roleId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Role assignment not found');
    }

    const assignment = existing[0];
    
    // Delete the assignment - use 'id' field from schema, not 'assignmentId'
    await db
      .delete(userRoleAssignments)
      .where(eq(userRoleAssignments.id, assignment.id));

    console.log('✅ [PermissionService] Role assignment removed successfully');
    
    // Publish role unassignment event
    try {
      const { crmSyncStreams } = await import('../utils/redis.js');
      await crmSyncStreams.publishRoleEvent(tenantId, 'role_unassigned', {
        assignmentId: assignment.id, // Use 'id' as assignmentId in event
        userId: userId,
        roleId: roleId,
        unassignedAt: new Date().toISOString(),
        unassignedBy: removedBy,
        reason: 'Manual removal'
      });
      console.log('📡 Published role unassignment event successfully');
    } catch (publishError) {
      console.warn('⚠️ Failed to publish role unassignment event:', publishError.message);
      // Don't fail the removal if event publishing fails
    }
    
    return { success: true, assignmentId: assignment.id };
  }

  // Remove role assignment by assignmentId
  async removeRoleAssignmentById(tenantId, assignmentId, removedBy) {
    console.log('🔒 [PermissionService] Role removal by assignmentId request:', {
      assignmentId,
      removedBy,
      tenantId
    });
    
    // Find the assignment - use 'id' field from schema
    const existing = await db
      .select()
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.id, assignmentId))
      .limit(1);

    if (existing.length === 0) {
      throw new Error('Role assignment not found');
    }

    const assignment = existing[0];
    
    // Delete the assignment - use 'id' field from schema
    await db
      .delete(userRoleAssignments)
      .where(eq(userRoleAssignments.id, assignmentId));

    console.log('✅ [PermissionService] Role assignment removed successfully');
    
    // Publish role unassignment event
    try {
      const { crmSyncStreams } = await import('../utils/redis.js');
      await crmSyncStreams.publishRoleEvent(tenantId, 'role_unassigned', {
        assignmentId: assignment.id, // Use 'id' as assignmentId in event
        userId: assignment.userId,
        roleId: assignment.roleId,
        unassignedAt: new Date().toISOString(),
        unassignedBy: removedBy,
        reason: 'Manual removal'
      });
      console.log('📡 Published role unassignment event successfully');
    } catch (publishError) {
      console.warn('⚠️ Failed to publish role unassignment event:', publishError.message);
      // Don't fail the removal if event publishing fails
    }
    
    return { success: true, assignmentId: assignment.id };
  }

  // Log audit events
  async logAuditEvent(eventData) {
    const { tenantId, userId, action, resourceType, resourceId, oldValues, newValues, details } = eventData;
    
    await db.insert(auditLogs).values({
      logId: uuidv4(),
      tenantId,
      userId,
      action,
      resourceType,
      resourceId,
      oldValues: oldValues ? JSON.stringify(oldValues) : null,
      newValues: newValues ? JSON.stringify(newValues) : null,
      details: details ? JSON.stringify(details) : null,
      createdAt: new Date()
    });
  }

  // Additional methods for role templates, assignments, etc.
  async getRoleTemplates(options = {}) {
    const { category, includeInactive = false } = options;
    
    // Use the static template data (can be cached or loaded from DB)
    let templates = templateData.filter(template => includeInactive || template.isActive);
    
    if (category) {
      templates = templates.filter(template => template.category === category);
    }
    
    // Sort by sortOrder
    templates.sort((a, b) => a.sortOrder - b.sortOrder);
    
    return templates;
  }

  async getRoleAssignments(filters = {}) {
    // Implementation for getting role assignments
    return { data: [], total: 0 };
  }

  async getAuditLog(filters = {}) {
    // Implementation for getting audit log
    return { data: [], total: 0 };
  }

  // Enhanced role creation with advanced features
  async createAdvancedRole(roleData) {
    const { 
      tenantId, 
      name, 
      description, 
      color = '#6b7280',
      icon = '👤',
      category,
      permissions, 
      restrictions = {}, 
      inheritance = {},
      metadata = {},
      // createdBy removed
    } = roleData;
    
    // Check if role name already exists
    const existingRole = await db
      .select({ roleId: customRoles.roleId })
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleName, name)
        )
      )
      .limit(1);

    if (existingRole.length > 0) {
      throw new Error(`Role with name "${name}" already exists`);
    }

    const roleId = uuidv4();
    const now = new Date();

    // Process inheritance if specified
    let effectivePermissions = permissions;
    if (inheritance.parentRoles && inheritance.parentRoles.length > 0) {
      effectivePermissions = await this.processRoleInheritance(
        tenantId, 
        permissions, 
        inheritance
      );
    }

    // Validate permissions structure
    const validatedPermissions = await this.validatePermissionStructure(effectivePermissions);

    // Process and validate restrictions
    const validatedRestrictions = await this.validateRestrictions(restrictions);

    const newRole = await db
      .insert(customRoles)
      .values({
        roleId,
        tenantId,
        roleName: name,
        description,
        color,
        permissions: JSON.stringify({
          ...validatedPermissions,
          metadata: {
            icon,
            category,
            inheritance,
            ...metadata
          }
        }),
        restrictions: JSON.stringify(validatedRestrictions),
        isSystemRole: false,
        isDefault: metadata.isDefault || false,
        priority: inheritance.priority || 0,
        // createdBy, // Temporarily removed
        createdAt: now,
        updatedAt: now
      })
      .returning();

    // Log the creation
    await this.logAuditEvent({
      tenantId,
      userId: 'system', // Use 'system' as fallback since createdBy is not available
      action: 'advanced_role_created',
      resourceType: 'role',
      resourceId: roleId,
      newValues: { 
        name, 
        permissions: validatedPermissions, 
        restrictions: validatedRestrictions,
        inheritance,
        metadata
      }
    });

    return newRole[0];
  }

  // Process role inheritance
  async processRoleInheritance(tenantId, basePermissions, inheritance) {
    console.log('🧬 processRoleInheritance called with:', {
      tenantId,
      hasBasePermissions: !!basePermissions,
      inheritance
    });

    const { parentRoles, inheritanceMode = 'additive', priority = 0 } = inheritance;
    
    if (!parentRoles || !Array.isArray(parentRoles) || parentRoles.length === 0) {
      console.log('⚠️ No parent roles specified, returning base permissions');
      return basePermissions || {};
    }

    console.log('🔍 Fetching parent roles:', parentRoles);

    try {
    // Get parent roles
    const parents = await db
      .select({
        roleId: customRoles.roleId,
          roleName: customRoles.roleName,
        permissions: customRoles.permissions,
        priority: customRoles.priority
      })
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          or(...parentRoles.map(roleId => eq(customRoles.roleId, roleId)))
        )
      );

      console.log(`📋 Found ${parents.length} parent roles out of ${parentRoles.length} requested`);

      if (parents.length === 0) {
        console.log('⚠️ No parent roles found, returning base permissions');
        return basePermissions || {};
      }

    if (parents.length !== parentRoles.length) {
        const foundRoleIds = parents.map(p => p.roleId);
        const missingRoleIds = parentRoles.filter(id => !foundRoleIds.includes(id));
        console.log('⚠️ Some parent roles not found:', missingRoleIds);
        // Don't throw error, just continue with found roles
    }

    // Sort by priority (higher priority = more important)
    parents.sort((a, b) => (b.priority || 0) - (a.priority || 0));
      console.log('📊 Parent roles sorted by priority:', parents.map(p => ({ name: p.roleName, priority: p.priority })));

      let effectivePermissions = basePermissions ? { ...basePermissions } : {};
      console.log('🏁 Starting inheritance processing with mode:', inheritanceMode);

      parents.forEach((parent, index) => {
        try {
          console.log(`🔄 Processing parent role ${index + 1}/${parents.length}: ${parent.roleName}`);
          
          let parentPermissions = {};
          if (parent.permissions) {
            try {
              parentPermissions = JSON.parse(parent.permissions);
              // Remove metadata from parent permissions for inheritance
              if (parentPermissions.metadata) {
                delete parentPermissions.metadata;
              }
              console.log(`📝 Parsed permissions for ${parent.roleName}:`, Object.keys(parentPermissions));
            } catch (parseError) {
              console.error(`❌ Failed to parse permissions for parent role ${parent.roleName}:`, parseError);
              return; // Skip this parent role
            }
          }
      
      switch (inheritanceMode) {
        case 'additive':
              console.log(`➕ Applying additive inheritance from ${parent.roleName}`);
          effectivePermissions = this.mergePermissions(effectivePermissions, parentPermissions);
          break;
        case 'restrictive':
              console.log(`🔒 Applying restrictive inheritance from ${parent.roleName}`);
          effectivePermissions = this.intersectPermissions(effectivePermissions, parentPermissions);
          break;
        case 'override':
              console.log(`🔄 Applying override inheritance from ${parent.roleName}`);
          effectivePermissions = { ...parentPermissions, ...effectivePermissions };
          break;
            default:
              console.log(`⚠️ Unknown inheritance mode: ${inheritanceMode}, using additive`);
              effectivePermissions = this.mergePermissions(effectivePermissions, parentPermissions);
          }
          
          console.log(`✅ Processed inheritance from ${parent.roleName}, current permissions:`, Object.keys(effectivePermissions));
        } catch (parentError) {
          console.error(`❌ Error processing parent role ${parent.roleName}:`, parentError);
          // Continue with other parent roles
        }
      });

      console.log('🎉 Role inheritance processing completed successfully');
      console.log('📊 Final effective permissions:', Object.keys(effectivePermissions));
    return effectivePermissions;
    } catch (error) {
      console.error('🚨 Error in processRoleInheritance:', error);
      console.log('🔄 Falling back to base permissions');
      return basePermissions || {};
    }
  }

  // Helper method to merge permissions (additive inheritance)
  mergePermissions(basePermissions, parentPermissions) {
    console.log('🔀 Merging permissions - base keys:', Object.keys(basePermissions || {}));
    console.log('🔀 Merging permissions - parent keys:', Object.keys(parentPermissions || {}));
    
    const merged = { ...basePermissions };
    
    Object.keys(parentPermissions || {}).forEach(resource => {
      const parentPerm = parentPermissions[resource];
        const basePerm = merged[resource];
      
      if (!basePerm) {
        // Resource doesn't exist in base, add it from parent
        merged[resource] = { ...parentPerm };
        console.log(`➕ Added new resource from parent: ${resource}`);
      } else {
        // Resource exists in both, merge them
        const mergedOps = new Set([
          ...(basePerm.operations || []),
          ...(parentPerm.operations || [])
        ]);
        
        // Use the higher permission level
        const levelHierarchy = { 'none': 0, 'read': 1, 'write': 2, 'admin': 3 };
        const baseLevel = levelHierarchy[basePerm.level] || 0;
        const parentLevel = levelHierarchy[parentPerm.level] || 0;
        const higherLevel = baseLevel >= parentLevel ? basePerm.level : parentPerm.level;
        
        // Use the broader scope
        const scopeHierarchy = { 'own': 0, 'team': 1, 'department': 2, 'zone': 3, 'all': 4 };
        const baseScope = scopeHierarchy[basePerm.scope] || 0;
        const parentScope = scopeHierarchy[parentPerm.scope] || 0;
        const broaderScope = baseScope >= parentScope ? basePerm.scope : parentPerm.scope;
        
        merged[resource] = {
          level: higherLevel,
          operations: Array.from(mergedOps),
          scope: broaderScope,
          conditions: { ...(parentPerm.conditions || {}), ...(basePerm.conditions || {}) }
        };
        
        console.log(`🔀 Merged resource: ${resource}, level: ${higherLevel}, scope: ${broaderScope}`);
      }
    });
    
    console.log('✅ Permissions merged successfully - final keys:', Object.keys(merged));
    return merged;
  }

  // Helper method to intersect permissions (restrictive inheritance)
  intersectPermissions(basePermissions, parentPermissions) {
    console.log('🔒 Intersecting permissions - base keys:', Object.keys(basePermissions || {}));
    console.log('🔒 Intersecting permissions - parent keys:', Object.keys(parentPermissions || {}));
    
    const intersected = {};
    
    Object.keys(basePermissions || {}).forEach(resource => {
      const basePerm = basePermissions[resource];
      const parentPerm = parentPermissions[resource];
      
      if (!parentPerm) {
        // Resource doesn't exist in parent, exclude it
        console.log(`❌ Excluded resource not in parent: ${resource}`);
        return;
      }
      
      // Resource exists in both, intersect them
      const baseOps = new Set(basePerm.operations || []);
      const parentOps = new Set(parentPerm.operations || []);
      const commonOps = Array.from(baseOps).filter(op => parentOps.has(op));
      
      // Use the lower permission level
      const levelHierarchy = { 'none': 0, 'read': 1, 'write': 2, 'admin': 3 };
      const baseLevel = levelHierarchy[basePerm.level] || 0;
      const parentLevel = levelHierarchy[parentPerm.level] || 0;
      const lowerLevel = baseLevel <= parentLevel ? basePerm.level : parentPerm.level;
      
      // Use the narrower scope
      const scopeHierarchy = { 'own': 0, 'team': 1, 'department': 2, 'zone': 3, 'all': 4 };
      const baseScope = scopeHierarchy[basePerm.scope] || 0;
      const parentScope = scopeHierarchy[parentPerm.scope] || 0;
      const narrowerScope = baseScope <= parentScope ? basePerm.scope : parentPerm.scope;
        
        intersected[resource] = {
        level: lowerLevel,
        operations: commonOps,
        scope: narrowerScope,
        conditions: { ...(basePerm.conditions || {}), ...(parentPerm.conditions || {}) }
      };
      
      console.log(`🔒 Intersected resource: ${resource}, level: ${lowerLevel}, scope: ${narrowerScope}, ops: ${commonOps.length}`);
    });
    
    console.log('✅ Permissions intersected successfully - final keys:', Object.keys(intersected));
    return intersected;
  }

  // Validate permission structure
  async validatePermissionStructure(permissions) {
    console.log('🔍 validatePermissionStructure called with type:', typeof permissions, 'keys:', Array.isArray(permissions) ? permissions.length + ' items' : Object.keys(permissions || {}));
    
    if (!permissions) {
      console.log('⚠️ No permissions provided');
      return {};
    }

    // Handle array format (from role builder/custom role service)
    if (Array.isArray(permissions)) {
      console.log('🔄 Converting array permissions to structured format');
      return this.convertArrayPermissionsToStructured(permissions);
    }

    // Handle object format (advanced role structure)
    if (typeof permissions !== 'object') {
      console.log('⚠️ Invalid permissions type');
      return {};
    }

    // Check if this is a mis-formatted array (array converted to object with numeric keys)
    const keys = Object.keys(permissions);
    const isArrayAsObject = keys.length > 0 && keys.every(key => /^\d+$/.test(key)) && keys.every(key => Array.isArray(permissions[key]));
    
    if (isArrayAsObject) {
      console.log('🔄 Detected array-as-object format, converting back to array...');
      const arrayPermissions = [];
      keys.forEach(key => {
        arrayPermissions.push(...permissions[key]);
      });
      return this.convertArrayPermissionsToStructured(arrayPermissions);
    }

    // Get available permissions for validation
    const availablePermissionIds = await this.getAvailablePermissionIds();
    console.log('📋 Available permission IDs count:', availablePermissionIds.size);

    const validatedPermissions = {};

    Object.keys(permissions).forEach(resource => {
      const permission = permissions[resource];
      
      // Skip metadata and other non-permission objects
      if (resource === 'metadata' || resource === 'inheritance' || resource === 'restrictions') {
        console.log(`⏭️ Skipping non-permission object: ${resource}`);
        return;
      }
      
      console.log(`🔍 Validating resource: ${resource}`, permission);

      if (!permission || typeof permission !== 'object') {
        console.log(`⚠️ Skipping invalid permission for resource: ${resource}`);
        return;
      }
      
      // Validate level
      const validLevels = ['none', 'read', 'write', 'admin'];
      if (!permission.level || !validLevels.includes(permission.level)) {
        console.log(`❌ Invalid permission level: ${permission.level} for resource: ${resource}`);
        throw new Error(`Invalid permission level: ${permission.level} for resource: ${resource}`);
      }

      // Validate operations exist (only if we have available permissions)
      if (permission.operations && Array.isArray(permission.operations) && availablePermissionIds.size > 0) {
        const invalidOps = permission.operations.filter(op => !availablePermissionIds.has(op));
        if (invalidOps.length > 0) {
          console.log(`⚠️ Some operations not in available permissions for ${resource}:`, invalidOps);
          // Don't throw error, just log warning for now
          // throw new Error(`Invalid operations for ${resource}: ${invalidOps.join(', ')}`);
        }
      }

      // Validate scope
      const validScopes = ['own', 'team', 'department', 'zone', 'all'];
      if (permission.scope && !validScopes.includes(permission.scope)) {
        console.log(`❌ Invalid permission scope: ${permission.scope} for resource: ${resource}`);
        throw new Error(`Invalid permission scope: ${permission.scope} for resource: ${resource}`);
      }

      validatedPermissions[resource] = {
        level: permission.level,
        operations: Array.isArray(permission.operations) ? permission.operations : [],
        scope: permission.scope || 'own',
        conditions: permission.conditions || {}
      };

      console.log(`✅ Validated permission for ${resource}:`, validatedPermissions[resource]);
    });

    console.log('✅ All permissions validated successfully. Final count:', Object.keys(validatedPermissions).length);
    return validatedPermissions;
  }

  // Convert array permissions to structured format
  convertArrayPermissionsToStructured(permissionArray) {
    console.log('🔄 Converting permission array to structured format:', permissionArray.length, 'permissions');
    
    const structured = {};
    const groupedPermissions = {};

    // Group permissions by app.module
    permissionArray.forEach(permission => {
      if (typeof permission === 'string') {
        const parts = permission.split('.');
        if (parts.length >= 3) {
          const [app, module, ...actionParts] = parts;
          const action = actionParts.join('.');
          const resourceKey = `${app}.${module}`;
          
          if (!groupedPermissions[resourceKey]) {
            groupedPermissions[resourceKey] = [];
          }
          groupedPermissions[resourceKey].push(permission);
        }
      }
    });

    // Convert to structured format
    Object.keys(groupedPermissions).forEach(resourceKey => {
      const operations = groupedPermissions[resourceKey];
      
      // Determine permission level based on operations
      let level = 'read';
      const hasAdmin = operations.some(op => op.includes('delete') || op.includes('manage') || op.includes('admin'));
      const hasWrite = operations.some(op => op.includes('create') || op.includes('update') || op.includes('edit'));
      
      if (hasAdmin) {
        level = 'admin';
      } else if (hasWrite) {
        level = 'write';
      }

      structured[resourceKey] = {
        level: level,
        operations: operations,
        scope: 'all',
        conditions: {}
      };

      console.log(`✅ Converted ${resourceKey}: ${operations.length} operations, level: ${level}`);
    });

    console.log('🎉 Array to structured conversion completed:', Object.keys(structured).length, 'resources');
    return structured;
  }

  // Validate restrictions
  async validateRestrictions(restrictions) {
    console.log('🔍 validateRestrictions called with:', restrictions);
    
    if (!restrictions || typeof restrictions !== 'object') {
      console.log('⚠️ No restrictions provided or invalid type, returning default structure');
      return {
        timeRestrictions: {},
        ipRestrictions: {},
        dataRestrictions: {},
        featureRestrictions: {}
      };
    }

    const validated = {
      timeRestrictions: {},
      ipRestrictions: {},
      dataRestrictions: {},
      featureRestrictions: {}
    };

    // Validate time restrictions
    if (restrictions.timeRestrictions && typeof restrictions.timeRestrictions === 'object') {
      console.log('🕐 Validating time restrictions...');
      const { allowedHours, allowedDays, timezone, blockWeekends, blockHolidays } = restrictions.timeRestrictions;
      
      if (allowedHours) {
        if (!Array.isArray(allowedHours) || allowedHours.some(h => typeof h !== 'number' || h < 0 || h > 23)) {
          console.log('❌ Invalid allowed hours:', allowedHours);
          throw new Error('Invalid allowed hours. Must be array of integers 0-23');
        }
        validated.timeRestrictions.allowedHours = allowedHours;
        console.log('✅ Allowed hours validated:', allowedHours);
      }

      if (allowedDays) {
        if (!Array.isArray(allowedDays) || allowedDays.some(d => typeof d !== 'number' || d < 0 || d > 6)) {
          console.log('❌ Invalid allowed days:', allowedDays);
          throw new Error('Invalid allowed days. Must be array of integers 0-6');
        }
        validated.timeRestrictions.allowedDays = allowedDays;
        console.log('✅ Allowed days validated:', allowedDays);
      }

      if (timezone && typeof timezone === 'string') {
        validated.timeRestrictions.timezone = timezone;
        console.log('✅ Timezone validated:', timezone);
      }
      if (typeof blockWeekends === 'boolean') {
        validated.timeRestrictions.blockWeekends = blockWeekends;
        console.log('✅ Block weekends validated:', blockWeekends);
      }
      if (typeof blockHolidays === 'boolean') {
        validated.timeRestrictions.blockHolidays = blockHolidays;
        console.log('✅ Block holidays validated:', blockHolidays);
      }
    }

    // Validate IP restrictions
    if (restrictions.ipRestrictions && typeof restrictions.ipRestrictions === 'object') {
      console.log('🌐 Validating IP restrictions...');
      const { allowedIPs, blockedIPs, allowVPN } = restrictions.ipRestrictions;
      
      if (allowedIPs && Array.isArray(allowedIPs)) {
        // Basic IP validation - could be enhanced with proper IP regex
        const validIPs = allowedIPs.filter(ip => typeof ip === 'string' && ip.length > 0);
        if (validIPs.length === allowedIPs.length) {
        validated.ipRestrictions.allowedIPs = allowedIPs;
          console.log('✅ Allowed IPs validated:', allowedIPs.length);
        } else {
          console.log('⚠️ Some invalid IPs in allowedIPs list');
        }
      }
      if (blockedIPs && Array.isArray(blockedIPs)) {
        const validIPs = blockedIPs.filter(ip => typeof ip === 'string' && ip.length > 0);
        if (validIPs.length === blockedIPs.length) {
        validated.ipRestrictions.blockedIPs = blockedIPs;
          console.log('✅ Blocked IPs validated:', blockedIPs.length);
        } else {
          console.log('⚠️ Some invalid IPs in blockedIPs list');
        }
      }
      if (typeof allowVPN === 'boolean') {
        validated.ipRestrictions.allowVPN = allowVPN;
        console.log('✅ Allow VPN validated:', allowVPN);
      }
    }

    // Validate data restrictions
    if (restrictions.dataRestrictions && typeof restrictions.dataRestrictions === 'object') {
      console.log('📊 Validating data restrictions...');
      const { 
        maxRecordsPerDay, 
        maxExportsPerMonth, 
        allowedFileTypes, 
        maxFileSize, 
        dataRetentionDays,
        customRules 
      } = restrictions.dataRestrictions;
      
      if (typeof maxRecordsPerDay === 'number' && maxRecordsPerDay >= 0) {
        validated.dataRestrictions.maxRecordsPerDay = maxRecordsPerDay;
        console.log('✅ Max records per day validated:', maxRecordsPerDay);
      }
      if (typeof maxExportsPerMonth === 'number' && maxExportsPerMonth >= 0) {
        validated.dataRestrictions.maxExportsPerMonth = maxExportsPerMonth;
        console.log('✅ Max exports per month validated:', maxExportsPerMonth);
      }
      if (allowedFileTypes && Array.isArray(allowedFileTypes)) {
        validated.dataRestrictions.allowedFileTypes = allowedFileTypes.filter(type => typeof type === 'string');
        console.log('✅ Allowed file types validated:', validated.dataRestrictions.allowedFileTypes.length);
      }
      if (typeof maxFileSize === 'number' && maxFileSize >= 0) {
        validated.dataRestrictions.maxFileSize = maxFileSize;
        console.log('✅ Max file size validated:', maxFileSize);
      }
      if (typeof dataRetentionDays === 'number' && dataRetentionDays >= 0) {
        validated.dataRestrictions.dataRetentionDays = dataRetentionDays;
        console.log('✅ Data retention days validated:', dataRetentionDays);
      }
      if (customRules && typeof customRules === 'object') {
        validated.dataRestrictions.customRules = customRules;
        console.log('✅ Custom rules validated');
      }
    }

    // Validate feature restrictions
    if (restrictions.featureRestrictions && typeof restrictions.featureRestrictions === 'object') {
      console.log('⚙️ Validating feature restrictions...');
      const { 
        allowBulkOperations, 
        allowAPIAccess, 
        allowIntegrations, 
        maxApiCalls 
      } = restrictions.featureRestrictions;
      
      if (typeof allowBulkOperations === 'boolean') {
        validated.featureRestrictions.allowBulkOperations = allowBulkOperations;
        console.log('✅ Allow bulk operations validated:', allowBulkOperations);
      }
      if (typeof allowAPIAccess === 'boolean') {
        validated.featureRestrictions.allowAPIAccess = allowAPIAccess;
        console.log('✅ Allow API access validated:', allowAPIAccess);
      }
      if (typeof allowIntegrations === 'boolean') {
        validated.featureRestrictions.allowIntegrations = allowIntegrations;
        console.log('✅ Allow integrations validated:', allowIntegrations);
      }
      if (typeof maxApiCalls === 'number' && maxApiCalls >= 0) {
        validated.featureRestrictions.maxApiCalls = maxApiCalls;
        console.log('✅ Max API calls validated:', maxApiCalls);
      }
    }

    console.log('✅ All restrictions validated successfully');
    return validated;
  }

  // Create role from template with customizations
  async createRoleFromTemplate(templateData) {
    const { 
      templateId, 
      name, 
      description, 
      color,
      customizations = {},
      tenantId
      // createdBy removed
    } = templateData;

    // Get template
    const template = await db
      .select()
      .from(roleTemplates)
      .where(eq(roleTemplates.templateId, templateId))
      .limit(1);

    if (!template.length) {
      throw new Error('Template not found');
    }

    const templateData_ = template[0];
    let permissions = JSON.parse(templateData_.permissions);
    let restrictions = JSON.parse(templateData_.restrictions);

    // Apply customizations
    if (customizations.addPermissions) {
      permissions = this.mergePermissions(permissions, customizations.addPermissions);
    }

    if (customizations.removePermissions) {
      customizations.removePermissions.forEach(resource => {
        delete permissions[resource];
      });
    }

    if (customizations.restrictions) {
      restrictions = { ...restrictions, ...customizations.restrictions };
    }

    // Create role
    return await this.createAdvancedRole({
      tenantId,
      name,
      description: description || templateData_.description,
      color: color || '#3B82F6',
      permissions,
      restrictions,
      inheritance: customizations.inheritance || {},
      metadata: {
        category: templateData_.category,
        createdFromTemplate: templateId,
        templateName: templateData_.templateName
      }
      // createdBy removed
    });
  }

  // Validate role access with context
  async validateRoleAccess(tenantId, roleId, context = {}) {
    const { userId, ipAddress, timeOfAccess, requestedResource, requestedAction } = context;

    // Get role with permissions and restrictions
    const role = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    if (!role.length) {
      return { allowed: false, reason: 'Role not found' };
    }

    const roleData = role[0];
    const permissions = JSON.parse(roleData.permissions);
    const restrictions = JSON.parse(roleData.restrictions);

    // Check time restrictions
    if (restrictions.timeRestrictions && timeOfAccess) {
      const timeCheck = this.validateTimeRestrictions(restrictions.timeRestrictions, new Date(timeOfAccess));
      if (!timeCheck.allowed) {
        return { allowed: false, reason: timeCheck.reason };
      }
    }

    // Check IP restrictions
    if (restrictions.ipRestrictions && ipAddress) {
      const ipCheck = this.validateIPRestrictions(restrictions.ipRestrictions, ipAddress);
      if (!ipCheck.allowed) {
        return { allowed: false, reason: ipCheck.reason };
      }
    }

    // Check permission for requested resource and action
    if (requestedResource && requestedAction) {
      const permissionCheck = this.validateResourcePermission(permissions, requestedResource, requestedAction);
      if (!permissionCheck.allowed) {
        return { allowed: false, reason: permissionCheck.reason };
      }
    }

    return { 
      allowed: true, 
      roleData: {
        name: roleData.roleName,
        permissions,
        restrictions,
        metadata: permissions.metadata || {}
      }
    };
  }

  // Validate time restrictions
  validateTimeRestrictions(timeRestrictions, accessTime) {
    const { allowedHours, allowedDays, blockWeekends, blockHolidays } = timeRestrictions;
    
    const hour = accessTime.getHours();
    const day = accessTime.getDay(); // 0 = Sunday, 6 = Saturday

    if (allowedHours && !allowedHours.includes(hour)) {
      return { allowed: false, reason: `Access not allowed at hour ${hour}` };
    }

    if (allowedDays && !allowedDays.includes(day)) {
      return { allowed: false, reason: `Access not allowed on day ${day}` };
    }

    if (blockWeekends && (day === 0 || day === 6)) {
      return { allowed: false, reason: 'Access blocked on weekends' };
    }

    // TODO: Implement holiday checking
    if (blockHolidays) {
      // This would require a holiday calendar service
    }

    return { allowed: true };
  }

  // Validate IP restrictions
  validateIPRestrictions(ipRestrictions, ipAddress) {
    const { allowedIPs, blockedIPs } = ipRestrictions;

    if (blockedIPs && blockedIPs.includes(ipAddress)) {
      return { allowed: false, reason: 'IP address is blocked' };
    }

    if (allowedIPs && allowedIPs.length > 0 && !allowedIPs.includes(ipAddress)) {
      return { allowed: false, reason: 'IP address not in allowed list' };
    }

    return { allowed: true };
  }

  // Validate resource permission
  validateResourcePermission(permissions, resource, action) {
    if (!permissions[resource]) {
      return { allowed: false, reason: `No permissions for resource: ${resource}` };
    }

    const resourcePermission = permissions[resource];
    
    // Check if action is in allowed operations
    if (resourcePermission.operations && !resourcePermission.operations.includes(action)) {
      return { allowed: false, reason: `Action '${action}' not allowed for resource '${resource}'` };
    }

    // Check permission level
    const actionRequirements = {
      'view': 'read',
      'read': 'read', 
      'create': 'write',
      'edit': 'write',
      'update': 'write',
      'delete': 'admin',
      'manage': 'admin',
      'admin': 'admin'
    };

    const requiredLevel = actionRequirements[action] || 'read';
    const hierarchy = { 'none': 0, 'read': 1, 'write': 2, 'admin': 3 };
    
    if ((hierarchy[resourcePermission.level] || 0) < (hierarchy[requiredLevel] || 0)) {
      return { allowed: false, reason: `Insufficient permission level for action '${action}'` };
    }

    return { allowed: true, resourcePermission };
  }

  // Clone role with modifications
  async cloneRole(sourceRoleId, cloneData) {
    const { name, description, modifications = {}, tenantId } = cloneData; // createdBy removed

    // Get source role
    const sourceRole = await db
      .select()
      .from(customRoles)
      .where(eq(customRoles.roleId, sourceRoleId))
      .limit(1);

    if (!sourceRole.length) {
      throw new Error('Source role not found');
    }

    const source = sourceRole[0];
    let permissions = JSON.parse(source.permissions);
    let restrictions = JSON.parse(source.restrictions);

    // Apply modifications
    if (modifications.addPermissions) {
      permissions = this.mergePermissions(permissions, modifications.addPermissions);
    }

    if (modifications.removePermissions) {
      modifications.removePermissions.forEach(resource => {
        delete permissions[resource];
      });
    }

    if (modifications.updateRestrictions) {
      restrictions = { ...restrictions, ...modifications.updateRestrictions };
    }

    // Create cloned role
    return await this.createAdvancedRole({
      tenantId,
      name,
      description: description || `${source.roleName} (Copy)`,
      color: source.color,
      permissions,
      restrictions,
      metadata: {
        clonedFrom: sourceRoleId,
        clonedFromName: source.roleName,
        category: permissions.metadata?.category
      }
    });
  }

  // Get role analytics
  async getRoleAnalytics(tenantId, roleId, options = {}) {
    const { period = 'month', includeAudit = false } = options;

    // Get role usage statistics
    const roleUsage = await db
      .select({
        totalUsers: count(userRoleAssignments.id),
        activeUsers: count(userRoleAssignments.id).where(eq(userRoleAssignments.isActive, true))
      })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.roleId, roleId));

    // Get permission usage if audit logs are available
    let permissionUsage = [];
    if (includeAudit) {
      // This would require audit log analysis
      // Implementation depends on your audit log structure
    }

    return {
      usage: roleUsage[0] || { totalUsers: 0, activeUsers: 0 },
      permissionUsage,
      period,
      generatedAt: new Date().toISOString()
    };
  }

  // Bulk role operations
  async bulkRoleOperation(tenantId, operation, roleIds, options = {}, userId) {
    const results = {
      successful: [],
      failed: [],
      summary: {
        total: roleIds.length,
        success: 0,
        failure: 0
      }
    };

    for (const roleId of roleIds) {
      try {
        let result;
        
        switch (operation) {
          case 'delete':
            result = await this.deleteRole(tenantId, roleId, { 
              force: options.force,
              transferUsersTo: options.transferUsersTo,
              deletedBy: userId 
            });
            break;
          case 'activate':
          case 'deactivate':
            result = await this.updateAdvancedRole(tenantId, roleId, {
              isActive: operation === 'activate',
              updatedBy: userId
            });
            break;
          case 'export':
            result = await this.exportRole(tenantId, roleId);
            break;
          default:
            throw new Error(`Unknown operation: ${operation}`);
        }

        results.successful.push({ roleId, result });
        results.summary.success++;
      } catch (error) {
        results.failed.push({ roleId, error: error.message });
        results.summary.failure++;
      }
    }

    return results;
  }

  // Export role configuration
  async exportRole(tenantId, roleId) {
    const role = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    if (!role.length) {
      throw new Error('Role not found');
    }

    const roleData = role[0];
    
    return {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      role: {
        name: roleData.roleName,
        description: roleData.description,
        color: roleData.color,
        permissions: JSON.parse(roleData.permissions),
        restrictions: JSON.parse(roleData.restrictions),
        metadata: {
          isSystemRole: roleData.isSystemRole,
          priority: roleData.priority
        }
      }
    };
  }

  // Update advanced role
  async updateAdvancedRole(tenantId, roleId, updateData) {
    const { 
      name, 
      description, 
      color, 
      icon,
      permissions, 
      restrictions, 
      inheritance,
      metadata,
      updatedBy,
      allowAdvancedUpdate = false // Flag to explicitly allow advanced updates on custom roles
    } = updateData;
    
    try {
      console.log('🔄 updateAdvancedRole called with:', {
        tenantId,
        roleId,
        updateData: {
          name,
          description,
          color,
          hasPermissions: !!permissions,
          hasRestrictions: !!restrictions,
          hasInheritance: !!inheritance,
          hasMetadata: !!metadata,
          updatedBy,
          allowAdvancedUpdate
        }
      });
    
    // Get existing role
    const existingRole = await db
      .select()
      .from(customRoles)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .limit(1);

    if (!existingRole.length) {
        console.log('❌ Role not found:', roleId);
      throw new Error('Role not found');
    }

      console.log('✅ Found existing role:', {
        roleId: existingRole[0].roleId,
        name: existingRole[0].roleName,
        isSystemRole: existingRole[0].isSystemRole
      });

    if (existingRole[0].isSystemRole) {
        console.log('❌ Attempted to modify system role:', roleId);
      throw new Error('Cannot modify system roles');
    }

    // Check if this role was created by CustomRoleService (array permissions) 
    // and prevent accidental corruption unless explicitly allowed
    if (permissions && !allowAdvancedUpdate) {
      try {
        const existingPermissions = JSON.parse(existingRole[0].permissions || '[]');
        const isArrayBasedRole = Array.isArray(existingPermissions);
        
        if (isArrayBasedRole) {
          console.log('⚠️ Detected role created by CustomRoleService (array permissions)');
          console.log('🛡️ Preventing advanced update to avoid permission corruption');
          console.log('💡 Use CustomRoleService.updateRoleFromAppsAndModules() or set allowAdvancedUpdate=true');
          throw new Error('This role was created using the application/module builder. Use the custom role update API or set allowAdvancedUpdate=true to override this protection.');
        }
      } catch (parseError) {
        console.log('⚠️ Could not parse existing permissions, proceeding with update');
      }
    }

    // Check name uniqueness if name is being changed
    if (name && name !== existingRole[0].roleName) {
        console.log('🔍 Checking name uniqueness for:', name);
      const nameExists = await db
        .select({ roleId: customRoles.roleId })
        .from(customRoles)
        .where(
          and(
            eq(customRoles.tenantId, tenantId),
            eq(customRoles.roleName, name),
            ne(customRoles.roleId, roleId)
          )
        )
        .limit(1);

      if (nameExists.length > 0) {
          console.log('❌ Role name already exists:', name);
        throw new Error(`Role with name "${name}" already exists`);
      }
        console.log('✅ Role name is unique');
    }

    const updates = {
      updatedAt: new Date()
    };

      if (name) {
        updates.roleName = name;
        console.log('📝 Updating role name to:', name);
      }
      if (description !== undefined) {
        updates.description = description;
        console.log('📝 Updating description');
      }
      if (color) {
        updates.color = color;
        console.log('📝 Updating color to:', color);
      }
    
    if (permissions) {
        console.log('🔐 Processing permissions update...');
        try {
      // Process inheritance if specified
      let effectivePermissions = permissions;
      if (inheritance && inheritance.parentRoles && inheritance.parentRoles.length > 0) {
            console.log('🧬 Processing inheritance for parent roles:', inheritance.parentRoles);
        effectivePermissions = await this.processRoleInheritance(
          tenantId, 
          permissions, 
          inheritance
        );
            console.log('✅ Inheritance processed successfully');
      }

          console.log('🔍 Validating permission structure...');
      const validatedPermissions = await this.validatePermissionStructure(effectivePermissions);
          console.log('✅ Permissions validated successfully');

          // Check if validatedPermissions is empty (potential conversion failure)
          if (!validatedPermissions || Object.keys(validatedPermissions).length === 0) {
            console.error('⚠️ validatePermissionStructure returned empty result');
            console.error('Original permissions:', effectivePermissions);
            console.error('Validated permissions:', validatedPermissions);
            throw new Error('Permission validation resulted in empty permissions. This would corrupt the role.');
          }

          const existingPermissions = JSON.parse(existingRole[0].permissions || '{}');
      
      updates.permissions = JSON.stringify({
        ...validatedPermissions,
        metadata: {
          ...(existingPermissions.metadata || {}),
          icon: icon || existingPermissions.metadata?.icon,
          inheritance: inheritance || existingPermissions.metadata?.inheritance,
          ...(metadata || {})
        }
      });
          console.log('📝 Permissions formatted for storage');
        } catch (permissionError) {
          console.error('❌ Permission processing failed:', permissionError);
          throw new Error(`Permission validation failed: ${permissionError.message}`);
        }
    }
    
    if (restrictions !== undefined) {
        console.log('🚫 Processing restrictions update...');
        try {
      const validatedRestrictions = await this.validateRestrictions(restrictions);
      updates.restrictions = JSON.stringify(validatedRestrictions);
          console.log('✅ Restrictions validated and formatted');
        } catch (restrictionError) {
          console.error('❌ Restriction processing failed:', restrictionError);
          throw new Error(`Restriction validation failed: ${restrictionError.message}`);
        }
    }

      console.log('💾 Updating role in database...');
    const updatedRole = await db
      .update(customRoles)
      .set(updates)
      .where(
        and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleId, roleId)
        )
      )
      .returning();

      if (!updatedRole.length) {
        console.log('❌ No rows updated in database');
        throw new Error('Failed to update role - no rows affected');
      }

      console.log('✅ Role updated successfully in database');

    // Log the update
      try {
    await this.logAuditEvent({
      tenantId,
      userId: updatedBy,
      action: 'advanced_role_updated',
      resourceType: 'role',
      resourceId: roleId,
      oldValues: existingRole[0],
      newValues: updates
    });
        console.log('✅ Audit event logged');
      } catch (auditError) {
        console.error('⚠️ Failed to log audit event:', auditError);
        // Don't fail the entire operation for audit logging
      }

      // Publish role update event to Redis streams
      try {
        const { crmSyncStreams } = await import('../utils/redis.js');
        await crmSyncStreams.publishRoleEvent(tenantId, 'role_updated', {
          roleId: updatedRole[0].roleId,
          roleName: updatedRole[0].roleName,
          description: updatedRole[0].description,
          permissions: typeof updatedRole[0].permissions === 'string'
            ? JSON.parse(updatedRole[0].permissions)
            : updatedRole[0].permissions,
          restrictions: typeof updatedRole[0].restrictions === 'string'
            ? JSON.parse(updatedRole[0].restrictions)
            : updatedRole[0].restrictions,
          updatedBy: updatedBy,
          updatedAt: updatedRole[0].updatedAt || new Date().toISOString()
        });
        console.log('📡 Published role_updated event to Redis streams');
      } catch (publishError) {
        console.warn('⚠️ Failed to publish role_updated event:', publishError.message);
        // Don't fail the operation if event publishing fails
      }

      console.log('🎉 updateAdvancedRole completed successfully');
    return updatedRole[0];
    } catch (error) {
      console.error('🚨 updateAdvancedRole failed:', {
        error: error.message,
        stack: error.stack,
        tenantId,
        roleId,
        updateData: {
          name,
          description,
          color,
          hasPermissions: !!permissions,
          hasRestrictions: !!restrictions,
          hasInheritance: !!inheritance
        }
      });
      throw error;
    }
  }

  // Helper method to get available permission IDs
  async getAvailablePermissionIds() {
    let availablePermissionIds = new Set();
    try {
      const availablePermissionsResponse = await this.getAvailablePermissions();
      
      // Handle the new structured response
      if (availablePermissionsResponse && availablePermissionsResponse.applications) {
        availablePermissionsResponse.applications.forEach(app => {
          app.modules.forEach(module => {
            module.operations.forEach(operation => {
              availablePermissionIds.add(operation.id);
            });
          });
        });
      }
    } catch (error) {
      console.log('⚠️ Could not load available permissions for validation:', error.message);
      // Continue without strict validation
    }
    
    return availablePermissionIds;
  }

  // Additional methods as needed...
}

export default new PermissionService(); 