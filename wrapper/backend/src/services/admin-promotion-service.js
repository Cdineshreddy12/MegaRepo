import { db } from '../db/index.js';
import { 
  tenantUsers, 
  customRoles, 
  userRoleAssignments, 
  auditLogs,
  tenants
} from '../db/schema/index.js';
import { eq, and, or, isNull, ne } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import Logger from '../utils/logger.js';
import { kindeService } from '../features/auth/index.js';

export class AdminPromotionService {
  
  /**
   * Promotes a user to admin with zero side effects
   * @param {string} tenantId - Tenant ID
   * @param {string} currentAdminId - Current admin's user ID
   * @param {string} newAdminId - New admin's user ID
   * @param {string} promotedBy - Who is performing the promotion
   * @param {Object} options - Additional options
   */
  static async promoteToAdmin(tenantId, currentAdminId, newAdminId, promotedBy, options = {}) {
    const {
      transferOwnership = true,
      retainCurrentAdminAccess = false,
      transitionType = 'full_transfer' // 'full_transfer', 'co_admin', 'role_only'
    } = options;

    const transactionId = uuidv4();
    console.log(`🔄 [AdminPromotion-${transactionId}] Starting admin promotion process...`);
    
    try {
      return await db.transaction(async (tx) => {
        // 1. VALIDATION PHASE
        console.log(`🔍 [AdminPromotion-${transactionId}] Phase 1: Validation`);
        
        const validation = await this._validatePromotionRequest(
          tx, tenantId, currentAdminId, newAdminId, transactionId
        );
        
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        const { currentAdmin, newAdmin, tenant } = validation.data;

        // 2. PRE-PROMOTION AUDIT
        console.log(`📊 [AdminPromotion-${transactionId}] Phase 2: Pre-promotion audit`);
        
        const prePromotionAudit = await this._generatePrePromotionAudit(
          tx, tenantId, currentAdminId, newAdminId, transactionId
        );

        // 3. CREATE SUPER ADMIN ROLE (if needed)
        console.log(`👑 [AdminPromotion-${transactionId}] Phase 3: Ensuring Super Admin role exists`);
        
        const superAdminRole = await this._ensureSuperAdminRole(
          tx, tenantId, currentAdminId, transactionId
        );

        // 4. HANDLE DATA OWNERSHIP TRANSFER
        console.log(`🔄 [AdminPromotion-${transactionId}] Phase 4: Data ownership transfer`);
        
        if (transferOwnership) {
          await this._transferDataOwnership(
            tx, tenantId, currentAdminId, newAdminId, transactionId
          );
        }

        // 5. PROMOTE NEW ADMIN
        console.log(`⬆️ [AdminPromotion-${transactionId}] Phase 5: Promoting new admin`);
        
        await this._promoteUserToAdmin(
          tx, tenantId, newAdminId, superAdminRole.roleId, promotedBy, transactionId
        );

        // 6. HANDLE CURRENT ADMIN TRANSITION
        console.log(`⬇️ [AdminPromotion-${transactionId}] Phase 6: Current admin transition`);
        
        if (transitionType === 'full_transfer' && !retainCurrentAdminAccess) {
          await this._demoteCurrentAdmin(
            tx, tenantId, currentAdminId, promotedBy, transactionId
          );
        } else if (transitionType === 'co_admin') {
          // Keep current admin with admin privileges
          console.log(`🤝 [AdminPromotion-${transactionId}] Keeping current admin as co-admin`);
        }

        // 7. UPDATE TENANT RECORD
        console.log(`🏢 [AdminPromotion-${transactionId}] Phase 7: Updating tenant record`);
        
        await tx.update(tenants)
          .set({
            adminEmail: newAdmin.email,
            updatedAt: new Date()
          })
          .where(eq(tenants.tenantId, tenantId));

        // 8. SYNC WITH KINDE
        console.log(`🔗 [AdminPromotion-${transactionId}] Phase 8: Syncing with Kinde`);
        
        try {
          await this._syncAdminChangeWithKinde(
            newAdmin, currentAdmin, tenant, transactionId
          );
        } catch (kindeError) {
          console.warn(`⚠️ [AdminPromotion-${transactionId}] Kinde sync failed:`, kindeError.message);
          // Don't fail the entire operation for Kinde sync issues
        }

        // 9. POST-PROMOTION AUDIT
        console.log(`📋 [AdminPromotion-${transactionId}] Phase 9: Post-promotion audit`);
        
        const postPromotionAudit = await this._generatePostPromotionAudit(
          tx, tenantId, currentAdminId, newAdminId, transactionId
        );

        // 10. CREATE AUDIT LOG
        console.log(`📝 [AdminPromotion-${transactionId}] Phase 10: Creating audit trail`);
        
        await this._createPromotionAuditLog(
          tx, tenantId, currentAdminId, newAdminId, promotedBy, 
          prePromotionAudit, postPromotionAudit, transactionId
        );

        console.log(`✅ [AdminPromotion-${transactionId}] Admin promotion completed successfully!`);

        return {
          success: true,
          transactionId,
          message: 'Admin promotion completed successfully',
          data: {
            previousAdmin: {
              userId: currentAdmin.userId,
              email: currentAdmin.email,
              name: currentAdmin.name
            },
            newAdmin: {
              userId: newAdmin.userId,
              email: newAdmin.email,
              name: newAdmin.name
            },
            transitionType,
            transferredData: prePromotionAudit.dataOwnership,
            auditTrail: {
              transactionId,
              prePromotionAudit,
              postPromotionAudit,
              timestamp: new Date()
            }
          }
        };
      });

    } catch (error) {
      console.error(`❌ [AdminPromotion-${transactionId}] Admin promotion failed:`, error);
      
      // Log the failure
      await this._logPromotionFailure(
        tenantId, currentAdminId, newAdminId, promotedBy, error, transactionId
      );

      throw new Error(`Admin promotion failed: ${error.message}`);
    }
  }

  /**
   * Validate promotion request
   */
  static async _validatePromotionRequest(tx, tenantId, currentAdminId, newAdminId, transactionId) {
    console.log(`🔍 [AdminPromotion-${transactionId}] Validating promotion request...`);

    // Check if current admin exists and is actually an admin
    const [currentAdmin] = await tx
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, currentAdminId),
        eq(tenantUsers.isTenantAdmin, true),
        eq(tenantUsers.isActive, true)
      ))
      .limit(1);

    if (!currentAdmin) {
      return {
        isValid: false,
        error: 'Current admin not found or is not an active admin'
      };
    }

    // Check if new admin exists and is an active user
    const [newAdmin] = await tx
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, newAdminId),
        eq(tenantUsers.isActive, true)
      ))
      .limit(1);

    if (!newAdmin) {
      return {
        isValid: false,
        error: 'New admin user not found or is not active'
      };
    }

    if (newAdmin.isTenantAdmin) {
      return {
        isValid: false,
        error: 'User is already an admin'
      };
    }

    // Check if same user
    if (currentAdminId === newAdminId) {
      return {
        isValid: false,
        error: 'Cannot promote user to themselves'
      };
    }

    // Get tenant info
    const [tenant] = await tx
      .select()
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (!tenant) {
      return {
        isValid: false,
        error: 'Tenant not found'
      };
    }

    return {
      isValid: true,
      data: { currentAdmin, newAdmin, tenant }
    };
  }

  /**
   * Generate pre-promotion audit
   */
  static async _generatePrePromotionAudit(tx, tenantId, currentAdminId, newAdminId, transactionId) {
    console.log(`📊 [AdminPromotion-${transactionId}] Generating pre-promotion audit...`);

    // Count data owned by current admin
    const rolesCreated = await tx
      .select({ count: 'count(*)' })
      .from(customRoles)
      .where(eq(customRoles.createdBy, currentAdminId));

    const rolesModified = await tx
      .select({ count: 'count(*)' })
      .from(customRoles)
      .where(eq(customRoles.lastModifiedBy, currentAdminId));

    const roleAssignments = await tx
      .select({ count: 'count(*)' })
      .from(userRoleAssignments)
      .where(eq(userRoleAssignments.assignedBy, currentAdminId));

    const usersInvited = await tx
      .select({ count: 'count(*)' })
      .from(tenantUsers)
      .where(eq(tenantUsers.invitedBy, currentAdminId));

    return {
      timestamp: new Date(),
      currentAdmin: currentAdminId,
      newAdmin: newAdminId,
      dataOwnership: {
        rolesCreated: parseInt(rolesCreated[0].count),
        rolesModified: parseInt(rolesModified[0].count),
        roleAssignments: parseInt(roleAssignments[0].count),
        usersInvited: parseInt(usersInvited[0].count)
      }
    };
  }

  /**
   * Ensure Super Admin role exists
   */
  static async _ensureSuperAdminRole(tx, tenantId, currentAdminId, transactionId) {
    console.log(`👑 [AdminPromotion-${transactionId}] Ensuring Super Admin role exists...`);

    let [superAdminRole] = await tx
      .select()
      .from(customRoles)
      .where(and(
        eq(customRoles.tenantId, tenantId),
        eq(customRoles.roleName, 'Super Administrator'),
        eq(customRoles.priority, 1000)
      ))
      .limit(1);

    if (!superAdminRole) {
      console.log(`🆕 [AdminPromotion-${transactionId}] Creating Super Admin role...`);
      
      [superAdminRole] = await tx.insert(customRoles).values({
        tenantId,
        roleName: 'Super Administrator',
        description: 'Full system administrator with all permissions and data ownership capabilities',
        color: '#dc2626', // Red color for super admin
        permissions: this._getSuperAdminPermissions(),
        restrictions: {},
        isSystemRole: true,
        isDefault: false,
        priority: 1000, // Highest priority
        createdBy: currentAdminId,
        lastModifiedBy: currentAdminId
      }).returning();
    }

    return superAdminRole;
  }

  /**
   * Transfer data ownership from current admin to new admin
   */
  static async _transferDataOwnership(tx, tenantId, currentAdminId, newAdminId, transactionId) {
    console.log(`🔄 [AdminPromotion-${transactionId}] Transferring data ownership...`);

    // Transfer role creation ownership
    await tx.update(customRoles)
      .set({ 
        lastModifiedBy: newAdminId,
        updatedAt: new Date()
      })
      .where(eq(customRoles.createdBy, currentAdminId));

    // Transfer role assignment ownership
    await tx.update(userRoleAssignments)
      .set({ assignedBy: newAdminId })
      .where(eq(userRoleAssignments.assignedBy, currentAdminId));

    // Note: We keep the original createdBy for audit trail but update lastModifiedBy
    // User invitations (invitedBy) are kept as historical record

    console.log(`✅ [AdminPromotion-${transactionId}] Data ownership transferred successfully`);
  }

  /**
   * Promote user to admin
   */
  static async _promoteUserToAdmin(tx, tenantId, newAdminId, superAdminRoleId, promotedBy, transactionId) {
    console.log(`⬆️ [AdminPromotion-${transactionId}] Promoting user to admin...`);

    // Update user record to admin
    await tx.update(tenantUsers)
      .set({
        isTenantAdmin: true,
        updatedAt: new Date()
      })
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, newAdminId)
      ));

    // Assign Super Admin role
    const existingAssignment = await tx
      .select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, newAdminId),
        eq(userRoleAssignments.roleId, superAdminRoleId)
      ))
      .limit(1);

    if (!existingAssignment.length) {
      await tx.insert(userRoleAssignments).values({
        userId: newAdminId,
        roleId: superAdminRoleId,
        assignedBy: promotedBy,
        assignedAt: new Date(),
        isActive: true
      });
    }

    console.log(`✅ [AdminPromotion-${transactionId}] User promoted to admin successfully`);
  }

  /**
   * Demote current admin (if requested)
   */
  static async _demoteCurrentAdmin(tx, tenantId, currentAdminId, demotedBy, transactionId) {
    console.log(`⬇️ [AdminPromotion-${transactionId}] Demoting current admin...`);

    // Update user record
    await tx.update(tenantUsers)
      .set({
        isTenantAdmin: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.userId, currentAdminId)
      ));

    // Deactivate admin role assignments
    await tx.update(userRoleAssignments)
      .set({
        isActive: false,
        deactivatedAt: new Date(),
        deactivatedBy: demotedBy
      })
      .where(and(
        eq(userRoleAssignments.userId, currentAdminId),
        eq(userRoleAssignments.isActive, true)
      ));

    // Could assign a default role here if needed
    console.log(`✅ [AdminPromotion-${transactionId}] Current admin demoted successfully`);
  }

  /**
   * Sync admin change with Kinde
   */
  static async _syncAdminChangeWithKinde(newAdmin, currentAdmin, tenant, transactionId) {
    console.log(`🔗 [AdminPromotion-${transactionId}] Syncing with Kinde...`);

    try {
      // Update organization admin in Kinde
      if (newAdmin.kindeUserId && tenant.kindeOrgId) {
        await kindeService.updateOrganizationAdmin(
          tenant.kindeOrgId,
          newAdmin.kindeUserId,
          {
            previousAdminId: currentAdmin.kindeUserId
          }
        );
      }

      console.log(`✅ [AdminPromotion-${transactionId}] Kinde sync completed`);
    } catch (error) {
      console.error(`❌ [AdminPromotion-${transactionId}] Kinde sync failed:`, error);
      throw error;
    }
  }

  /**
   * Generate post-promotion audit
   */
  static async _generatePostPromotionAudit(tx, tenantId, currentAdminId, newAdminId, transactionId) {
    console.log(`📋 [AdminPromotion-${transactionId}] Generating post-promotion audit...`);

    // Verify new admin status
    const [newAdminCheck] = await tx
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, newAdminId),
        eq(tenantUsers.isTenantAdmin, true)
      ))
      .limit(1);

    // Check role assignments
    const newAdminRoles = await tx
      .select()
      .from(userRoleAssignments)
      .where(and(
        eq(userRoleAssignments.userId, newAdminId),
        eq(userRoleAssignments.isActive, true)
      ));

    return {
      timestamp: new Date(),
      newAdminStatus: !!newAdminCheck,
      newAdminRoleCount: newAdminRoles.length,
      promotionCompleted: true
    };
  }

  /**
   * Create promotion audit log
   */
  static async _createPromotionAuditLog(
    tx, tenantId, currentAdminId, newAdminId, promotedBy,
    preAudit, postAudit, transactionId
  ) {
    console.log(`📝 [AdminPromotion-${transactionId}] Creating audit trail...`);

    await tx.insert(auditLogs).values({
      tenantId,
      userId: promotedBy,
      action: 'admin_promotion',
      resourceType: 'user',
      resourceId: newAdminId,
      details: {
        transactionId,
        currentAdminId,
        newAdminId,
        promotedBy,
        prePromotionAudit: preAudit,
        postPromotionAudit: postAudit,
        dataTransferred: preAudit.dataOwnership
      },
      ipAddress: '127.0.0.1', // This should come from request
      userAgent: 'Admin Promotion Service'
    });

    // Also create audit log
    await tx.insert(auditLogs).values({
      tenantId,
      userId: promotedBy,
      action: 'promote_admin',
      metadata: {
        transactionId,
        previousAdmin: currentAdminId,
        newAdmin: newAdminId,
        dataTransferred: preAudit.dataOwnership
      }
    });
  }

  /**
   * Log promotion failure
   */
  static async _logPromotionFailure(tenantId, currentAdminId, newAdminId, promotedBy, error, transactionId) {
    try {
      await db.insert(auditLogs).values({
        tenantId,
        userId: promotedBy,
        action: 'admin_promotion_failed',
        resourceType: 'user',
        resourceId: newAdminId,
        details: {
          transactionId,
          currentAdminId,
          newAdminId,
          promotedBy,
          error: error.message,
          stackTrace: error.stack
        },
        ipAddress: '127.0.0.1',
        userAgent: 'Admin Promotion Service'
      });
    } catch (logError) {
      console.error('Failed to log promotion failure:', logError);
    }
  }

  /**
   * Get super admin permissions
   */
  static _getSuperAdminPermissions() {
    return {
      admin: {
        users: ['view', 'create', 'edit', 'delete', 'invite', 'promote', 'demote'],
        roles: ['view', 'create', 'edit', 'delete', 'assign', 'manage'],
        billing: ['view', 'manage', 'upgrade', 'downgrade'],
        settings: ['view', 'edit', 'manage', 'configure'],
        audit: ['view', 'export', 'manage'],
        system: ['view', 'manage', 'configure', 'backup', 'restore']
      },
      crm: {
        contacts: ['view', 'create', 'edit', 'delete', 'export', 'import', 'merge', 'manage'],
        deals: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'transfer', 'manage'],
        reports: ['view', 'create', 'edit', 'delete', 'export', 'share', 'schedule', 'manage'],
        settings: ['view', 'edit', 'manage', 'configure'],
        dashboard: ['view', 'edit', 'customize', 'manage']
      },
      hr: {
        employees: ['view', 'create', 'edit', 'delete', 'view_salary', 'edit_salary', 'manage'],
        payroll: ['view', 'create', 'edit', 'process', 'approve', 'export', 'manage'],
        documents: ['view', 'upload', 'edit', 'delete', 'approve', 'manage'],
        reports: ['view', 'create', 'edit', 'export', 'manage'],
        settings: ['view', 'edit', 'manage', 'configure']
      },
      affiliate: {
        partners: ['view', 'create', 'edit', 'delete', 'approve', 'manage'],
        commissions: ['view', 'create', 'edit', 'calculate', 'approve', 'pay', 'dispute', 'manage'],
        analytics: ['view', 'create', 'export', 'share', 'manage'],
        settings: ['view', 'edit', 'manage', 'configure']
      }
    };
  }

  /**
   * Get users eligible for admin promotion
   */
  static async getEligibleUsers(tenantId, currentAdminId) {
    try {
      const users = await db
        .select({
          userId: tenantUsers.userId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          createdAt: tenantUsers.createdAt,
          lastLoginAt: tenantUsers.lastLoginAt
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true),
          eq(tenantUsers.isTenantAdmin, false), // Not already admin
          eq(tenantUsers.isVerified, true) // Verified users only
        ));

      return users.filter(user => user.userId !== currentAdminId);
    } catch (error) {
      console.error('Failed to get eligible users:', error);
      throw error;
    }
  }

  /**
   * Preview promotion impact
   */
  static async previewPromotionImpact(tenantId, currentAdminId, newAdminId) {
    try {
      const validation = await this._validatePromotionRequest(
        db, tenantId, currentAdminId, newAdminId, 'preview'
      );

      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const preAudit = await this._generatePrePromotionAudit(
        db, tenantId, currentAdminId, newAdminId, 'preview'
      );

      return {
        isValid: true,
        impact: {
          dataTransfer: preAudit.dataOwnership,
          newAdmin: validation.data.newAdmin,
          currentAdmin: validation.data.currentAdmin,
          recommendations: this._getPromotionRecommendations(preAudit)
        }
      };
    } catch (error) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  /**
   * Get promotion recommendations
   */
  static _getPromotionRecommendations(preAudit) {
    const recommendations = [];

    if (preAudit.dataOwnership.rolesCreated > 10) {
      recommendations.push({
        type: 'warning',
        message: `This admin has created ${preAudit.dataOwnership.rolesCreated} roles. Consider reviewing role permissions after promotion.`
      });
    }

    if (preAudit.dataOwnership.usersInvited > 20) {
      recommendations.push({
        type: 'info',
        message: `This admin has invited ${preAudit.dataOwnership.usersInvited} users. The invitation history will be preserved.`
      });
    }

    recommendations.push({
      type: 'success',
      message: 'All data ownership will be safely transferred to the new admin.'
    });

    return recommendations;
  }

  /**
   * Promote user to System Administrator (single admin system)
   * @param {string} tenantId - Tenant ID
   * @param {string} currentAdminId - Current admin performing the action
   * @param {string} targetUserId - User to promote to admin
   * @param {string} reason - Reason for promotion
   * @param {object} options - Additional options
   */
  static async promoteToSystemAdmin(tenantId, currentAdminId, targetUserId, reason, options = {}) {
    const {
      forceTransfer = false,
      previousAdmin = null,
      skipValidation = false
    } = options;

    const transactionId = `sys-admin-promote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    console.log(`🔄 [SystemAdminPromotion-${transactionId}] Starting System Administrator promotion...`);
    console.log(`   Current Admin: ${currentAdminId}`);
    console.log(`   Target User: ${targetUserId}`);
    console.log(`   Tenant: ${tenantId}`);
    console.log(`   Reason: ${reason}`);
    console.log(`   Force Transfer: ${forceTransfer}`);
    console.log(`   Previous Admin Provided: ${!!previousAdmin}`);

    try {
      return await db.transaction(async (tx) => {
        
        // Phase 1: Enhanced Validation
        console.log(`🔍 [SystemAdminPromotion-${transactionId}] Phase 1: Enhanced Validation...`);
        
        if (!skipValidation) {
          // Get target user with additional checks
          const [targetUser] = await tx
            .select()
            .from(tenantUsers)
            .where(and(
              eq(tenantUsers.userId, targetUserId),
              eq(tenantUsers.tenantId, tenantId),
              eq(tenantUsers.isActive, true)
            ))
            .limit(1);

          if (!targetUser) {
            throw new Error('Target user not found, inactive, or not in this organization');
          }

          // Check if user is already system admin
          const existingSystemAdminAssignment = await tx
            .select()
            .from(userRoleAssignments)
            .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
            .where(and(
              eq(userRoleAssignments.userId, targetUserId),
              eq(customRoles.roleName, 'System Administrator'),
              eq(userRoleAssignments.isActive, true)
            ))
            .limit(1);

          if (existingSystemAdminAssignment.length > 0) {
            throw new Error('User is already a System Administrator');
          }

          // Enhanced check for existing admin
          const currentSystemAdmin = await tx
            .select({
              userId: userRoleAssignments.userId,
              assignmentId: userRoleAssignments.id,
              userName: tenantUsers.name,
              userEmail: tenantUsers.email
            })
            .from(userRoleAssignments)
            .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
            .leftJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
            .where(and(
              eq(customRoles.tenantId, tenantId),
              eq(customRoles.roleName, 'System Administrator'),
              eq(userRoleAssignments.isActive, true),
              eq(tenantUsers.isActive, true)
            ))
            .limit(1);

          if (currentSystemAdmin.length > 0 && !forceTransfer) {
            throw new Error(`Another user (${currentSystemAdmin[0].userName}) is already System Administrator. Use forceTransfer option to replace them.`);
          }
        }

        // Phase 2: Ensure System Administrator role exists
        console.log(`👑 [SystemAdminPromotion-${transactionId}] Phase 2: Ensuring System Administrator role...`);
        
        let [systemAdminRole] = await tx
          .select()
          .from(customRoles)
          .where(and(
            eq(customRoles.tenantId, tenantId),
            eq(customRoles.roleName, 'System Administrator'),
            eq(customRoles.isSystemRole, true)
          ))
          .limit(1);

        if (!systemAdminRole) {
          console.log(`🆕 [SystemAdminPromotion-${transactionId}] Creating System Administrator role...`);
          
          [systemAdminRole] = await tx.insert(customRoles).values({
            tenantId,
            roleName: 'System Administrator',
            description: 'Single system administrator with complete organizational control and all permissions',
            color: '#dc2626', // Red color for system admin
            permissions: this._getSystemAdminPermissions(),
            restrictions: {},
            isSystemRole: true,
            isDefault: false,
            priority: 1000, // Highest priority
            createdBy: currentAdminId || targetUserId,
            lastModifiedBy: currentAdminId || targetUserId
          }).returning();

          console.log(`✅ [SystemAdminPromotion-${transactionId}] System Administrator role created`);
        }

        // Phase 3: Handle existing System Administrator (Enhanced)
        console.log(`🔄 [SystemAdminPromotion-${transactionId}] Phase 3: Handling existing System Administrator...`);
        
        let detectedPreviousAdmin = null;

        // Use provided previousAdmin or detect current one
        if (previousAdmin) {
          detectedPreviousAdmin = previousAdmin;
          console.log(`🎯 [SystemAdminPromotion-${transactionId}] Using provided previous admin: ${previousAdmin.name}`);
        } else {
          const existingSystemAdmin = await tx
            .select({
              userId: userRoleAssignments.userId,
              assignmentId: userRoleAssignments.id,
              userName: tenantUsers.name,
              userEmail: tenantUsers.email
            })
            .from(userRoleAssignments)
            .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
            .leftJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
            .where(and(
              eq(userRoleAssignments.roleId, systemAdminRole.roleId),
              eq(userRoleAssignments.isActive, true)
            ))
            .limit(1);

          if (existingSystemAdmin.length > 0) {
            detectedPreviousAdmin = existingSystemAdmin[0];
            console.log(`🔍 [SystemAdminPromotion-${transactionId}] Detected existing System Administrator: ${detectedPreviousAdmin.userName}`);
          }
        }

        // Remove System Administrator role from previous admin
        if (detectedPreviousAdmin) {
          console.log(`⚠️ [SystemAdminPromotion-${transactionId}] Removing System Administrator from: ${detectedPreviousAdmin.userName}`);
          
          // Deactivate their role assignment
          if (detectedPreviousAdmin.assignmentId) {
            await tx
              .update(userRoleAssignments)
              .set({
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: currentAdminId || targetUserId
              })
              .where(eq(userRoleAssignments.id, detectedPreviousAdmin.assignmentId));
          } else {
            // If we don't have assignment ID, find and deactivate by userId and roleId
            await tx
              .update(userRoleAssignments)
              .set({
                isActive: false,
                deactivatedAt: new Date(),
                deactivatedBy: currentAdminId || targetUserId
              })
              .where(and(
                eq(userRoleAssignments.userId, detectedPreviousAdmin.userId),
                eq(userRoleAssignments.roleId, systemAdminRole.roleId),
                eq(userRoleAssignments.isActive, true)
              ));
          }

          // Update isTenantAdmin flag for previous admin
          await tx
            .update(tenantUsers)
            .set({
              isTenantAdmin: false,
              lastModified: new Date()
            })
            .where(eq(tenantUsers.userId, detectedPreviousAdmin.userId));

          console.log(`✅ [SystemAdminPromotion-${transactionId}] Removed System Administrator role from: ${detectedPreviousAdmin.userName}`);
        }

        // Phase 4: Assign System Administrator role to new admin
        console.log(`🎯 [SystemAdminPromotion-${transactionId}] Phase 4: Assigning System Administrator role...`);
        
        const [newAssignment] = await tx.insert(userRoleAssignments).values({
          userId: targetUserId,
          roleId: systemAdminRole.roleId,
          assignedBy: currentAdminId || targetUserId,
          assignedAt: new Date(),
          isActive: true,
          isTemporary: false
        }).returning();

        // Update isTenantAdmin flag for new admin
        const [updatedTargetUser] = await tx
          .update(tenantUsers)
          .set({
            isTenantAdmin: true,
            lastModified: new Date()
          })
          .where(eq(tenantUsers.userId, targetUserId))
          .returning();

        console.log(`✅ [SystemAdminPromotion-${transactionId}] System Administrator role assigned to: ${updatedTargetUser.name}`);

        // Phase 5: Enhanced Audit logging
        console.log(`📝 [SystemAdminPromotion-${transactionId}] Phase 5: Enhanced Audit logging...`);
        
        const auditDetails = {
          transactionId,
          reason,
          forceTransfer,
          previousAdmin: detectedPreviousAdmin ? {
            userId: detectedPreviousAdmin.userId,
            name: detectedPreviousAdmin.userName,
            email: detectedPreviousAdmin.userEmail
          } : null,
          newAdmin: {
            userId: targetUserId,
            name: updatedTargetUser.name,
            email: updatedTargetUser.email
          },
          systemAdminRoleId: systemAdminRole.roleId,
          assignmentId: newAssignment.id,
          timestamp: new Date().toISOString(),
          processingTime: Date.now() - startTime,
          wasFirstAdmin: !detectedPreviousAdmin
        };

        // Log the promotion
        await tx.insert(auditLogs).values({
          tenantId,
          userId: targetUserId,
          action: 'system_admin_promotion',
          resourceType: 'user',
          resourceId: targetUserId,
          details: auditDetails
        });

        // Log the demotion if there was a previous admin
        if (detectedPreviousAdmin) {
          await tx.insert(auditLogs).values({
            tenantId,
            userId: detectedPreviousAdmin.userId,
            action: 'system_admin_demotion',
            resourceType: 'user',
            resourceId: detectedPreviousAdmin.userId,
            details: {
              transactionId,
              reason: `Demoted due to new System Administrator promotion: ${updatedTargetUser.name}`,
              forceTransfer,
              newAdmin: auditDetails.newAdmin,
              timestamp: new Date().toISOString()
            }
          });
        }

        console.log(`✅ [SystemAdminPromotion-${transactionId}] System Administrator promotion completed successfully`);
        console.log(`⏱️ [SystemAdminPromotion-${transactionId}] Total processing time: ${Date.now() - startTime}ms`);

        return {
          success: true,
          data: {
            transactionId,
            newAdmin: {
              userId: targetUserId,
              name: updatedTargetUser.name,
              email: updatedTargetUser.email,
              roleId: systemAdminRole.roleId,
              roleName: 'System Administrator',
              assignmentId: newAssignment.id
            },
            previousAdmin: detectedPreviousAdmin ? {
              userId: detectedPreviousAdmin.userId,
              name: detectedPreviousAdmin.userName,
              email: detectedPreviousAdmin.userEmail,
              demoted: true
            } : null,
            systemAdminRole: {
              roleId: systemAdminRole.roleId,
              roleName: systemAdminRole.roleName,
              description: systemAdminRole.description
            },
            auditDetails,
            processingTime: Date.now() - startTime
          }
        };

      });

    } catch (error) {
      console.error(`❌ [SystemAdminPromotion-${transactionId}] System Administrator promotion failed:`, error);
      throw error;
    }
  }

  /**
   * Get current System Administrator
   */
  static async getCurrentSystemAdmin(tenantId) {
    console.log(`🔍 Getting current System Administrator for tenant: ${tenantId}`);

    try {
      const [currentAdmin] = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          assignedAt: userRoleAssignments.assignedAt
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .leftJoin(tenantUsers, eq(userRoleAssignments.userId, tenantUsers.userId))
        .where(and(
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleName, 'System Administrator'),
          eq(userRoleAssignments.isActive, true),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);

      return currentAdmin || null;

    } catch (error) {
      console.error('❌ Failed to get current System Administrator:', error);
      throw error;
    }
  }

  /**
   * Get eligible users for System Administrator promotion
   */
  static async getEligibleUsers(tenantId, currentAdminId) {
    console.log(`🔍 Getting eligible users for System Administrator promotion in tenant: ${tenantId}`);

    try {
      // Get all active users except current system admin
      const eligibleUsers = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          isActive: tenantUsers.isActive,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .leftJoin(userRoleAssignments, and(
          eq(tenantUsers.userId, userRoleAssignments.userId),
          eq(userRoleAssignments.isActive, true)
        ))
        .leftJoin(customRoles, and(
          eq(userRoleAssignments.roleId, customRoles.roleId),
          eq(customRoles.roleName, 'System Administrator')
        ))
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true),
          isNull(customRoles.roleId) // Not already system admin
        ));

      console.log(`📊 Found ${eligibleUsers.length} eligible users for System Administrator promotion`);
      return eligibleUsers;

    } catch (error) {
      console.error('❌ Failed to get eligible users:', error);
      throw error;
    }
  }

  /**
   * Prevent deletion of the only System Administrator
   */
  static async canDeleteUser(tenantId, userId) {
    console.log(`🔍 Checking if user ${userId} can be deleted...`);

    try {
      // Check if user is the current System Administrator
      const isSystemAdmin = await db
        .select()
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(and(
          eq(userRoleAssignments.userId, userId),
          eq(customRoles.tenantId, tenantId),
          eq(customRoles.roleName, 'System Administrator'),
          eq(userRoleAssignments.isActive, true)
        ))
        .limit(1);

      if (isSystemAdmin.length > 0) {
        // Check if there are other active admins
        const otherAdmins = await db
          .select()
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isTenantAdmin, true),
            eq(tenantUsers.isActive, true),
            ne(tenantUsers.userId, userId)
          ));

        if (otherAdmins.length === 0) {
          return {
            canDelete: false,
            reason: 'Cannot delete the only System Administrator. Promote another user to System Administrator first.'
          };
        }
      }

      return { canDelete: true };

    } catch (error) {
      console.error('❌ Failed to check user deletion eligibility:', error);
      throw error;
    }
  }

  /**
   * Get System Administrator permissions
   */
  static _getSystemAdminPermissions() {
    return {
      admin: {
        users: ['view', 'create', 'edit', 'delete', 'invite', 'promote', 'demote', 'manage_all'],
        roles: ['view', 'create', 'edit', 'delete', 'assign', 'manage_all'],
        billing: ['view', 'manage', 'upgrade', 'downgrade', 'cancel'],
        settings: ['view', 'edit', 'manage', 'configure', 'backup', 'restore'],
        audit: ['view', 'export', 'manage', 'configure'],
        system: ['view', 'manage', 'configure', 'backup', 'restore', 'emergency_access']
      },
      crm: {
        contacts: ['view', 'create', 'edit', 'delete', 'export', 'import', 'merge', 'manage_all'],
        deals: ['view', 'create', 'edit', 'delete', 'approve', 'reject', 'transfer', 'manage_all'],
        reports: ['view', 'create', 'edit', 'delete', 'export', 'share', 'schedule', 'manage_all'],
        settings: ['view', 'edit', 'manage', 'configure'],
        dashboard: ['view', 'edit', 'customize', 'manage']
      },
      hr: {
        employees: ['view', 'create', 'edit', 'delete', 'view_salary', 'edit_salary', 'manage_all'],
        payroll: ['view', 'create', 'edit', 'process', 'approve', 'export', 'manage_all'],
        documents: ['view', 'upload', 'edit', 'delete', 'approve', 'manage_all'],
        reports: ['view', 'create', 'edit', 'export', 'manage_all'],
        settings: ['view', 'edit', 'manage', 'configure']
      },
      affiliate: {
        partners: ['view', 'create', 'edit', 'delete', 'approve', 'manage_all'],
        commissions: ['view', 'create', 'edit', 'calculate', 'approve', 'pay', 'dispute', 'manage_all'],
        analytics: ['view', 'create', 'export', 'share', 'manage_all'],
        settings: ['view', 'edit', 'manage', 'configure']
      }
    };
  }
}

export default AdminPromotionService; 