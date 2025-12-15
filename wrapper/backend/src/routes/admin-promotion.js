import { AdminPromotionService } from '../services/admin-promotion-service.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { db } from '../db/index.js';
import { tenantUsers, customRoles, userRoleAssignments, auditLogs, tenants } from '../db/schema/index.js';
import { eq, and, desc, or } from 'drizzle-orm';

/**
 * Admin promotion routes for single System Administrator system
 */
export default async function adminPromotionRoutes(fastify, options) {
  
  // Get current System Administrator
  fastify.get('/current-admin', {
    preHandler: [authenticateToken, requirePermission(['admin.users.view'])],
    schema: {
      summary: 'Get current System Administrator',
      description: 'Returns the current System Administrator for the tenant',
      tags: ['System Admin'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                currentAdmin: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' },
                    roleId: { type: 'string' },
                    roleName: { type: 'string' },
                    assignedAt: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🔍 Getting current System Administrator');
      
      const tenantId = request.userContext.tenantId;
      
      const currentAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);
      
      return {
        success: true,
        data: {
          currentAdmin
        }
      };

    } catch (error) {
      console.error('Failed to get current System Administrator:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get current System Administrator',
        message: error.message
      });
    }
  });

  // Get eligible users for System Administrator promotion
  fastify.get('/eligible-users', {
    preHandler: [authenticateToken, requirePermission(['admin.users.view'])],
    schema: {
      summary: 'Get eligible users for System Administrator promotion',
      description: 'Returns users who can be promoted to System Administrator',
      tags: ['System Admin'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                eligibleUsers: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      userId: { type: 'string' },
                      name: { type: 'string' },
                      email: { type: 'string' },
                      firstName: { type: 'string' },
                      lastName: { type: 'string' },
                      isActive: { type: 'boolean' },
                      createdAt: { type: 'string' }
                    }
                  }
                },
                currentAdmin: {
                  type: 'object',
                  properties: {
                    userId: { type: 'string' },
                    name: { type: 'string' },
                    email: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('📋 Getting eligible users for System Administrator promotion');
      
      const tenantId = request.userContext.tenantId;
      const currentAdminId = request.userContext.internalUserId;
      
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied',
          message: 'Only System Administrators can view eligible users'
        });
      }

      const [eligibleUsers, currentAdmin] = await Promise.all([
        AdminPromotionService.getEligibleUsers(tenantId, currentAdminId),
        AdminPromotionService.getCurrentSystemAdmin(tenantId)
      ]);

      return {
        success: true,
        data: {
          eligibleUsers,
          currentAdmin,
          totalEligible: eligibleUsers.length
        }
      };

    } catch (error) {
      console.error('Failed to get eligible users:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get eligible users',
        message: error.message
      });
    }
  });

  // Preview System Administrator promotion impact
  fastify.post('/preview', {
    preHandler: [authenticateToken, requirePermission(['admin.users.promote'])],
    schema: {
      summary: 'Preview System Administrator promotion impact',
      description: 'Shows what will happen when promoting a user to System Administrator',
      tags: ['System Admin'],
      body: {
        type: 'object',
        required: ['targetUserId'],
        properties: {
          targetUserId: { 
            type: 'string',
            description: 'User ID to promote to System Administrator'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                impact: {
                  type: 'object',
                  properties: {
                    newAdmin: { type: 'object' },
                    currentAdmin: { type: 'object' },
                    willDemoteCurrentAdmin: { type: 'boolean' },
                    systemAdminRole: { type: 'object' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🔍 Previewing System Administrator promotion impact');
      
      const { targetUserId } = request.body;
      const tenantId = request.userContext.tenantId;
      
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied',
          message: 'Only System Administrators can preview promotions'
        });
      }

      // Get target user details
      const [targetUser] = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, targetUserId),
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);

      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          message: 'Target user not found or inactive'
        });
      }

      // Get current System Administrator
      const currentAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);

      // Check if target user is already System Administrator
      if (currentAdmin && currentAdmin.userId === targetUserId) {
        return reply.code(400).send({
          success: false,
          error: 'Already System Administrator',
          message: 'User is already the System Administrator'
        });
      }

      return {
        success: true,
        data: {
          impact: {
            newAdmin: {
              userId: targetUser.userId,
              name: targetUser.name,
              email: targetUser.email,
              willReceiveRole: 'System Administrator'
            },
            currentAdmin: currentAdmin ? {
              userId: currentAdmin.userId,
              name: currentAdmin.name,
              email: currentAdmin.email,
              willLoseRole: 'System Administrator'
            } : null,
            willDemoteCurrentAdmin: !!currentAdmin,
            systemAdminRole: {
              name: 'System Administrator',
              description: 'Single system administrator with complete organizational control',
              permissions: 'All permissions across all modules'
            },
            warnings: currentAdmin ? [
              `${currentAdmin.name} will lose System Administrator privileges`,
              'Only one System Administrator can exist at a time',
              'This action cannot be undone easily'
            ] : [
              'No current System Administrator - this will be the first admin'
            ]
          }
        }
      };

    } catch (error) {
      console.error('Failed to preview promotion impact:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to preview promotion impact',
        message: error.message
      });
    }
  });

  // Promote user to System Administrator (Enhanced Version)
  fastify.post('/promote-system-admin', {
    preHandler: [authenticateToken, requirePermission(['admin.users.promote'])],
    schema: {
      summary: 'Promote user to System Administrator (Enhanced)',
      description: 'Promotes a user to System Administrator with comprehensive validation and single-admin enforcement',
      tags: ['System Admin'],
      body: {
        type: 'object',
        required: ['targetUserId', 'reason'],
        properties: {
          targetUserId: { 
            type: 'string',
            description: 'User ID to promote to System Administrator'
          },
          reason: { 
            type: 'string',
            description: 'Reason for promotion'
          },
          forceTransfer: {
            type: 'boolean',
            description: 'Force transfer even if current admin exists (requires confirmation)',
            default: false
          },
          confirmationCode: {
            type: 'string',
            description: 'Confirmation code for high-impact operations'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transactionId: { type: 'string' },
                newAdmin: { type: 'object' },
                previousAdmin: { type: 'object' },
                processingTime: { type: 'number' },
                organizationInfo: { type: 'object' }
              }
            }
          }
        }
      }
    }
  },
  async (request, reply) => {
    const requestId = `enhanced-sys-admin-promote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log(`🔄 [${requestId}] Enhanced System Administrator promotion requested`);
      
      const { targetUserId, reason, forceTransfer = false, confirmationCode } = request.body;
      const tenantId = request.userContext.tenantId;
      const currentRequestorId = request.userContext.internalUserId;
      
      // Validation 1: Only current admins can promote users
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied',
          message: 'Only System Administrators can promote users',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Validation 2: Get current System Administrator
      const currentAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);
      console.log(`🔍 [${requestId}] Current System Administrator:`, currentAdmin ? {
        userId: currentAdmin.userId,
        name: currentAdmin.name,
        email: currentAdmin.email
      } : 'None');

      // Validation 3: Check if target user exists and is eligible
      const [targetUser] = await db
        .select({
          userId: tenantUsers.userId,
          name: tenantUsers.name,
          email: tenantUsers.email,
          firstName: tenantUsers.firstName,
          lastName: tenantUsers.lastName,
          isActive: tenantUsers.isActive,
          isTenantAdmin: tenantUsers.isTenantAdmin
        })
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, targetUserId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!targetUser) {
        return reply.code(404).send({
          success: false,
          error: 'User not found',
          message: 'Target user not found in this organization',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      if (!targetUser.isActive) {
        return reply.code(400).send({
          success: false,
          error: 'User inactive',
          message: 'Cannot promote inactive user to System Administrator',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Validation 4: Check if user is already System Administrator
      if (currentAdmin && currentAdmin.userId === targetUserId) {
        return reply.code(400).send({
          success: false,
          error: 'Already System Administrator',
          message: 'User is already the System Administrator',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Validation 5: Handle existing System Administrator
      if (currentAdmin && !forceTransfer) {
        return reply.code(409).send({
          success: false,
          error: 'Existing System Administrator',
          message: 'Another user is already System Administrator. Use forceTransfer=true to replace them.',
          requiresConfirmation: true,
          currentAdmin: {
            userId: currentAdmin.userId,
            name: currentAdmin.name,
            email: currentAdmin.email,
            assignedAt: currentAdmin.assignedAt
          },
          targetUser: {
            userId: targetUser.userId,
            name: targetUser.name,
            email: targetUser.email
          },
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Validation 6: Validate confirmation code for forced transfers
      if (currentAdmin && forceTransfer) {
        const expectedCode = `TRANSFER_${currentAdmin.userId.slice(-8).toUpperCase()}_TO_${targetUserId.slice(-8).toUpperCase()}`;
        
        if (!confirmationCode || confirmationCode !== expectedCode) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid confirmation code',
            message: 'Invalid or missing confirmation code for System Administrator transfer',
            requiredConfirmationCode: expectedCode,
            instructions: 'Use the exact confirmation code provided to complete this high-risk operation',
            requestId,
            processingTime: Date.now() - startTime
          });
        }
      }

      // Get organization info for context
      const [orgInfo] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      // Execute the promotion
      console.log(`🚀 [${requestId}] Executing System Administrator promotion...`);
      
      const result = await AdminPromotionService.promoteToSystemAdmin(
        tenantId,
        currentRequestorId,
        targetUserId,
        reason,
        {
          forceTransfer,
          previousAdmin: currentAdmin
        }
      );

      console.log(`✅ [${requestId}] System Administrator promotion completed successfully`);

      return {
        success: true,
        data: {
          ...result.data,
          organizationInfo: {
            name: orgInfo?.companyName,
            kindeOrgId: orgInfo?.kindeOrgId
          },
          promotionDetails: {
            wasForced: forceTransfer,
            hadPreviousAdmin: !!currentAdmin,
            promotedBy: {
              userId: currentRequestorId,
              isSelfPromotion: currentRequestorId === targetUserId
            }
          }
        },
        requestId,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`❌ [${requestId}] Enhanced System Administrator promotion failed:`, error);
      
      return reply.code(500).send({
        success: false,
        error: 'System Administrator promotion failed',
        message: error.message,
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  });

  // Promote user to System Administrator (Original - for backward compatibility)
  fastify.post('/promote', {
    preHandler: [authenticateToken, requirePermission(['admin.users.promote'])],
    schema: {
      summary: 'Promote user to System Administrator (Legacy)',
      description: 'Legacy endpoint for System Administrator promotion with confirmation',
      tags: ['System Admin'],
      body: {
        type: 'object',
        required: ['targetUserId', 'reason'],
        properties: {
          targetUserId: { 
            type: 'string',
            description: 'User ID to promote to System Administrator'
          },
          reason: { 
            type: 'string',
            description: 'Reason for promotion'
          },
          confirmationCode: {
            type: 'string',
            description: 'Confirmation code for high-impact operations'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                transactionId: { type: 'string' },
                newAdmin: { type: 'object' },
                previousAdmin: { type: 'object' },
                processingTime: { type: 'number' }
              }
            }
          }
        }
      }
    }
  },
  async (request, reply) => {
    const requestId = `legacy-sys-admin-promote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      console.log(`🔄 [${requestId}] Legacy System Administrator promotion requested`);
      
      const { targetUserId, reason, confirmationCode } = request.body;
      const tenantId = request.userContext.tenantId;
      const currentAdminId = request.userContext.internalUserId;
      
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied',
          message: 'Only System Administrators can promote users',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Check if there's a current admin (requiring confirmation)
      const currentAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);
      if (currentAdmin && !confirmationCode) {
        return reply.code(400).send({
          success: false,
          error: 'Confirmation required',
          message: 'Confirmation code required when demoting existing System Administrator',
          requiresConfirmation: true,
          currentAdmin: {
            name: currentAdmin.name,
            email: currentAdmin.email
          },
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Validate confirmation code if provided
      if (currentAdmin && confirmationCode !== 'TRANSFER_ADMIN_ROLE') {
        return reply.code(400).send({
          success: false,
          error: 'Invalid confirmation code',
          message: 'Invalid confirmation code for System Administrator transfer',
          requestId,
          processingTime: Date.now() - startTime
        });
      }

      // Perform the promotion using enhanced method with legacy compatibility
      const result = await AdminPromotionService.promoteToSystemAdmin(
        tenantId,
        currentAdminId,
        targetUserId,
        reason,
        {
          forceTransfer: !!currentAdmin,
          previousAdmin: currentAdmin
        }
      );

      console.log(`✅ [${requestId}] Legacy System Administrator promotion completed successfully`);

      return {
        success: true,
        data: result.data,
        requestId,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      console.error(`❌ [${requestId}] Legacy System Administrator promotion failed:`, error);
      
      return reply.code(500).send({
        success: false,
        error: 'System Administrator promotion failed',
        message: error.message,
        requestId,
        processingTime: Date.now() - startTime
      });
    }
  });

  // Get System Administrator status and promotion options
  fastify.get('/admin-status', {
    preHandler: [authenticateToken, requirePermission(['admin.users.view'])],
    schema: {
      summary: 'Get System Administrator status and options',
      description: 'Returns current admin status and available promotion options',
      tags: ['System Admin'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                currentAdmin: { type: 'object' },
                eligibleUsers: { type: 'array' },
                canPromote: { type: 'boolean' },
                organizationInfo: { type: 'object' }
              }
            }
          }
        }
      }
    }
  },
  async (request, reply) => {
    try {
      console.log('🔍 Getting comprehensive System Administrator status');
      
      const tenantId = request.userContext.tenantId;
      const requestorId = request.userContext.internalUserId;
      
      // Get current System Administrator
      const currentAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);
      
      // Get eligible users
      const eligibleUsers = await AdminPromotionService.getEligibleUsers(tenantId, requestorId);
      
      // Get organization info
      const [orgInfo] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      // Determine if current user can promote others
      const canPromote = request.userContext.isTenantAdmin;

      return {
        success: true,
        data: {
          currentAdmin,
          eligibleUsers: eligibleUsers.map(user => ({
            userId: user.userId,
            name: user.name,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt
          })),
          canPromote,
          organizationInfo: {
            name: orgInfo?.companyName,
            kindeOrgId: orgInfo?.kindeOrgId,
            totalEligibleUsers: eligibleUsers.length
          },
          policies: {
            singleAdminOnly: true,
            requiresConfirmationForTransfer: true,
            cannotDeleteOnlyAdmin: true
          }
        }
      };

    } catch (error) {
      console.error('Failed to get System Administrator status:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get System Administrator status',
        message: error.message
      });
    }
  });

  // Get System Administrator promotion history
  fastify.get('/history', {
    preHandler: [authenticateToken, requirePermission(['admin.audit.view'])],
    schema: {
      summary: 'Get System Administrator promotion history',
      description: 'Returns history of System Administrator promotions and demotions',
      tags: ['System Admin'],
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number', default: 50 },
          offset: { type: 'number', default: 0 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                history: { type: 'array' },
                pagination: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('📊 Getting System Administrator promotion history');
      
      const tenantId = request.userContext.tenantId;
      const { limit = 50, offset = 0 } = request.query;
      
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({
          success: false,
          error: 'Access denied',
          message: 'Only System Administrators can view promotion history'
        });
      }

      // Get promotion/demotion history from audit logs
      const history = await db
        .select({
          logId: auditLogs.logId,
          action: auditLogs.action,
          details: auditLogs.details,
          createdAt: auditLogs.createdAt,
          userId: auditLogs.userId
        })
        .from(auditLogs)
        .where(and(
          eq(auditLogs.tenantId, tenantId),
          or(
            eq(auditLogs.action, 'system_admin_promotion'),
            eq(auditLogs.action, 'system_admin_demotion')
          )
        ))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        success: true,
        data: {
          history,
          pagination: {
            limit,
            offset,
            total: history.length
          }
        }
      };

    } catch (error) {
      console.error('Failed to get promotion history:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to get promotion history',
        message: error.message
      });
    }
  });

  // Emergency System Administrator recovery
  fastify.post('/emergency-recovery', {
    preHandler: [authenticateToken],
    schema: {
      summary: 'Emergency System Administrator recovery',
      description: 'Emergency endpoint to recover System Administrator access when none exists',
      tags: ['System Admin'],
      body: {
        type: 'object',
        required: ['emergencyCode', 'newAdminId'],
        properties: {
          emergencyCode: { 
            type: 'string',
            description: 'Emergency recovery code'
          },
          newAdminId: { 
            type: 'string',
            description: 'User to promote to System Administrator'
          },
          reason: {
            type: 'string',
            description: 'Reason for emergency recovery'
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      console.log('🚨 Emergency System Administrator recovery requested');
      
      const { emergencyCode, newAdminId, reason } = request.body;
      const tenantId = request.userContext.tenantId;
      
      // Validate emergency code
      if (emergencyCode !== process.env.EMERGENCY_ADMIN_CODE) {
        return reply.code(403).send({
          success: false,
          error: 'Invalid emergency code',
          message: 'Emergency recovery requires valid authorization'
        });
      }

      // Check if there are any existing System Administrators
      const existingAdmin = await AdminPromotionService.getCurrentSystemAdmin(tenantId);

      if (existingAdmin) {
        return reply.code(400).send({
          success: false,
          error: 'System Administrator exists',
          message: 'Emergency recovery not needed - active System Administrator exists',
          currentAdmin: {
            name: existingAdmin.name,
            email: existingAdmin.email
          }
        });
      }

      // Perform emergency promotion
      const result = await AdminPromotionService.promoteToSystemAdmin(
        tenantId,
        null, // No current admin
        newAdminId,
        reason || 'Emergency System Administrator recovery'
      );

      // Log emergency recovery
      await db.insert(auditLogs).values({
        tenantId,
        userId: newAdminId,
        action: 'emergency_system_admin_recovery',
        resourceType: 'user',
        resourceId: newAdminId,
        details: {
          reason,
          emergencyCode: 'REDACTED',
          recoveredBy: request.userContext.email,
          timestamp: new Date().toISOString()
        }
      });

      return {
        success: true,
        data: result.data,
        message: 'Emergency System Administrator recovery completed'
      };

    } catch (error) {
      console.error('Emergency System Administrator recovery failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Emergency recovery failed',
        message: error.message
      });
    }
  });
} 