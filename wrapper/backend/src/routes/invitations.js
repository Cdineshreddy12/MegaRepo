import { db, dbManager } from '../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, tenantInvitations, organizationMemberships, entities } from '../db/schema/index.js';
import { eq, and, desc } from 'drizzle-orm';
import { kindeService } from '../features/auth/index.js';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';

// Enhanced function to ensure user is in correct Kinde organization
async function ensureUserInCorrectOrganization(kindeUserId, email, targetOrgCode, maxRetries = 5) {
  console.log(`🔗 Starting organization assignment for user:`, {
    kindeUserId,
    email,
    targetOrgCode,
    maxRetries
  });

  try {
    // Step 1: Get user's current organizations
    console.log(`📋 Checking current organizations for user: ${kindeUserId}`);
    const userOrgs = await kindeService.getUserOrganizations(kindeUserId);
    console.log(`📋 User is currently in organizations:`, userOrgs.organizations?.map(org => ({
      code: org.code,
      name: org.name
    })) || []);

    // Step 2: Check if user is already in target organization
    const isAlreadyInTarget = userOrgs.organizations?.some(org => org.code === targetOrgCode);
    console.log(`🎯 Is user already in target organization ${targetOrgCode}:`, isAlreadyInTarget);

    // Step 3: If not in target organization, add them with retry logic
    if (!isAlreadyInTarget) {
      console.log(`🔄 Adding user to target organization: ${targetOrgCode}`);
      
      let lastError = null;
      let success = false;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`🔄 Organization assignment attempt ${attempt}/${maxRetries}`);
          
          // Use the enhanced addUserToOrganization method with exclusive mode
          const result = await kindeService.addUserToOrganization(
            kindeUserId,
            targetOrgCode,
            { exclusive: true } // This ensures user is ONLY in the target organization
          );
          
          console.log(`✅ User assignment result (attempt ${attempt}):`, {
            userId: result.userId,
            method: result.method,
            success: result.success,
            message: result.message,
            error: result.error
          });
          
          // Check if the assignment was successful
          if (result.success && result.userId) {
            // Wait a moment for the assignment to propagate
            console.log(`⏳ Waiting for assignment to propagate...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify the assignment immediately
            const verifyResult = await kindeService.getUserOrganizations(kindeUserId);
            const isNowInTarget = verifyResult.organizations?.some(org => org.code === targetOrgCode);
            
            console.log(`🔍 Immediate verification result:`, {
              isNowInTarget,
              totalOrgs: verifyResult.organizations?.length || 0,
              orgCodes: verifyResult.organizations?.map(org => org.code) || []
            });
            
            if (isNowInTarget) {
              success = true;
              console.log(`✅ Assignment verified successfully on attempt ${attempt}`);
              break;
            } else {
              console.warn(`⚠️ Assignment reported success but verification failed on attempt ${attempt}`);
              lastError = new Error(`Assignment verification failed on attempt ${attempt}`);
            }
          } else {
            console.warn(`⚠️ User assignment reported failure on attempt ${attempt}:`, result.error || result.message);
            lastError = new Error(result.error || result.message || 'Unknown assignment error');
          }
          
        } catch (error) {
          console.log(`❌ Organization assignment attempt ${attempt} failed:`, error.message);
          lastError = error;
          
          // If it's the last attempt, don't wait
          if (attempt < maxRetries) {
            const waitTime = Math.min(attempt * 2000, 10000); // Exponential backoff, max 10 seconds
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
      }
      
      if (!success) {
        console.error('❌ Failed to add user to organization after all retries:', lastError?.message);
        return { 
          success: false, 
          error: lastError?.message || 'Unknown error',
          message: 'Failed to assign user to organization after multiple attempts',
          attempts: maxRetries,
          lastError: lastError?.message
        };
      }
      
    } else {
      console.log('✅ User already in target organization');
      
      // Still run exclusive mode to ensure they're not in other organizations
      try {
        console.log('🧹 Cleaning up user from other organizations...');
        const result = await kindeService.addUserToOrganization(
          kindeUserId,
          targetOrgCode,
          { exclusive: true }
        );
        console.log('✅ Organization cleanup completed:', result.method);
      } catch (cleanupError) {
        console.warn('⚠️ Organization cleanup failed but user is in target org:', cleanupError.message);
      }
    }

    // Step 4: Final verification with multiple attempts
    console.log('🔍 Performing final organization state verification...');
    let finalVerificationSuccess = false;
    let verificationAttempts = 0;
    const maxVerificationAttempts = 3;
    
    while (!finalVerificationSuccess && verificationAttempts < maxVerificationAttempts) {
      try {
        verificationAttempts++;
        console.log(`🔍 Final verification attempt ${verificationAttempts}/${maxVerificationAttempts}`);
        
        const finalOrgs = await kindeService.getUserOrganizations(kindeUserId);
        const finalOrgCodes = finalOrgs.organizations?.map(org => org.code) || [];
        
        console.log('📊 Final organization state:', {
          totalOrganizations: finalOrgCodes.length,
          organizations: finalOrgCodes,
          isInTargetOrg: finalOrgCodes.includes(targetOrgCode),
          isInOnlyTargetOrg: finalOrgCodes.length === 1 && finalOrgCodes[0] === targetOrgCode
        });
        
        if (finalOrgCodes.includes(targetOrgCode)) {
          finalVerificationSuccess = true;
          console.log('✅ Final verification successful');
        } else {
          console.warn(`⚠️ Final verification attempt ${verificationAttempts} failed - user not in target org`);
          if (verificationAttempts < maxVerificationAttempts) {
            console.log(`⏳ Waiting before next verification attempt...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
        
      } catch (verifyError) {
        console.warn(`⚠️ Final verification attempt ${verificationAttempts} error:`, verifyError.message);
        if (verificationAttempts < maxVerificationAttempts) {
          console.log(`⏳ Waiting before next verification attempt...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
    }
    
    if (!finalVerificationSuccess) {
      return {
        success: false,
        error: 'User not found in target organization after assignment',
        message: 'Assignment appeared to succeed but verification failed after multiple attempts',
        verificationAttempts,
        targetOrgCode
      };
    }

    return { 
      success: true, 
      message: 'User successfully assigned to organization',
      targetOrg: targetOrgCode,
      verificationAttempts
    };
    
  } catch (error) {
    console.error('❌ Error ensuring user in correct organization:', error);
    return { 
      success: false, 
      error: error.message,
      message: 'Organization assignment failed due to unexpected error',
      stack: error.stack
    };
  }
}

// Permission validation helper for multi-entity invitations
async function validateMultiEntityInvitationPermissions(inviterId, tenantId, targetEntities) {
  console.log('🔐 Validating permissions for multi-entity invitation:', {
    inviterId,
    tenantId,
    targetEntityCount: targetEntities.length
  });

  // Check if user is active and belongs to the tenant
  const [inviter] = await db
    .select()
    .from(tenantUsers)
    .where(and(
      eq(tenantUsers.userId, inviterId),
      eq(tenantUsers.tenantId, tenantId),
      eq(tenantUsers.isActive, true)
    ))
    .limit(1);

  if (!inviter) {
    throw new Error('Inviter not found or not active in this tenant');
  }

  // Check if user is a tenant admin (can invite to any entity)
  if (inviter.isTenantAdmin) {
    console.log('✅ Inviter is tenant admin - all permissions granted');
    return { canInvite: true, restrictions: [] };
  }

  const restrictions = [];
  const allowedEntities = [];

  // Get all entities the inviter has membership in with admin/manager access
  const inviterMemberships = await db
    .select({
      membership: organizationMemberships,
      entity: entities
    })
    .from(organizationMemberships)
    .leftJoin(entities, eq(organizationMemberships.entityId, entities.entityId))
    .where(and(
      eq(organizationMemberships.userId, inviterId),
      eq(organizationMemberships.membershipStatus, 'active'),
      eq(organizationMemberships.tenantId, tenantId)
    ));

  console.log('👤 Inviter memberships found:', inviterMemberships.length);

  // Check permissions for each target entity
  for (const targetEntity of targetEntities) {
    let canInviteToEntity = false;

    // Check if inviter has admin/manager access to this entity or its parents
    for (const membership of inviterMemberships) {
      if (membership.membership.accessLevel === 'admin' ||
          membership.membership.accessLevel === 'manager') {

        // Direct membership to the entity
        if (membership.membership.entityId === targetEntity.entityId) {
          canInviteToEntity = true;
          break;
        }

        // Check if membership is to a parent entity and canAccessSubEntities is true
        if (membership.membership.canAccessSubEntities && membership.entity) {
          // Check if target entity is under this entity's hierarchy
          // This is a simplified check - in production you'd want more sophisticated hierarchy checking
          const targetEntityRecord = await db
            .select()
            .from(entities)
            .where(eq(entities.entityId, targetEntity.entityId))
            .limit(1);

          if (targetEntityRecord[0] &&
              targetEntityRecord[0].hierarchyPath?.includes(membership.membership.entityId)) {
            canInviteToEntity = true;
            break;
          }
        }
      }
    }

    if (canInviteToEntity) {
      allowedEntities.push(targetEntity);
    } else {
      restrictions.push({
        entityId: targetEntity.entityId,
        reason: 'Insufficient permissions to invite to this entity'
      });
    }
  }

  const canInvite = restrictions.length === 0;

  console.log('🔐 Permission validation result:', {
    canInvite,
    allowedEntities: allowedEntities.length,
    restrictions: restrictions.length
  });

  return {
    canInvite,
    restrictions,
    allowedEntities
  };
}

// Helper function to generate proper invitation URLs
async function generateInvitationUrl(invitationToken, request, tenantId = null) {
  // Priority 1: Use tenant subdomain in production
  if (process.env.NODE_ENV === 'production' && tenantId) {
    try {
      const [tenant] = await db
        .select({
          subdomain: tenants.subdomain
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (tenant?.subdomain) {
        const baseDomain = process.env.BASE_DOMAIN || 'myapp.com';
        const protocol = process.env.PROTOCOL || 'https';
        const baseUrl = `${protocol}://${tenant.subdomain}.${baseDomain}`;
        const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
        console.log('🔗 Generated invitation URL using tenant subdomain:', invitationUrl);
        return invitationUrl;
      }
    } catch (error) {
      console.warn('⚠️ Failed to get tenant subdomain, falling back to other methods:', error.message);
    }
  }

  // Priority 2: Use INVITATION_BASE_URL if set (for production)
  let baseUrl = process.env.INVITATION_BASE_URL;
  
  // Priority 3: Use FRONTEND_URL if INVITATION_BASE_URL not set
  if (!baseUrl) {
    baseUrl = process.env.FRONTEND_URL;
  }
  
  // Priority 4: Use request origin if environment variables are localhost
  if (!baseUrl || baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    // Get the origin from the request headers
    const origin = request?.headers?.origin || request?.headers?.referer;
    if (origin) {
      // Extract the base URL from origin (remove path and query)
      const url = new URL(origin);
      baseUrl = `${url.protocol}//${url.host}`;
      console.log('🔗 Using request origin for invitation URL:', baseUrl);
    } else {
      // Priority 5: Use a sensible default based on environment
      if (process.env.NODE_ENV === 'production') {
        baseUrl = 'https://yourdomain.com'; // Replace with your actual domain
        console.log('⚠️ No origin found, using production default:', baseUrl);
      } else {
        baseUrl = 'http://localhost:3001';
        console.log('⚠️ No origin found, using localhost default:', baseUrl);
      }
    }
  }
  
  // Generate the full invitation URL
  const invitationUrl = `${baseUrl}/invite/accept?token=${invitationToken}`;
  console.log('🔗 Generated invitation URL:', invitationUrl);
  
  return invitationUrl;
}

export default async function invitationRoutes(fastify, options) {
  
  // Debug endpoint to test invitation URL generation
  fastify.get('/debug/url-generation', async (request, reply) => {
    try {
      const testToken = 'test-token-123';
      const tenantId = request.userContext?.tenantId || null;
      const generatedUrl = await generateInvitationUrl(testToken, request, tenantId);
      
      return {
        success: true,
        debug: {
          env: {
            INVITATION_BASE_URL: process.env.INVITATION_BASE_URL,
            FRONTEND_URL: process.env.FRONTEND_URL,
            BASE_DOMAIN: process.env.BASE_DOMAIN,
            NODE_ENV: process.env.NODE_ENV
          },
          request: {
            origin: request.headers.origin,
            referer: request.headers.referer,
            host: request.headers.host,
            tenantId: tenantId
          },
          generatedUrl,
          functionCalled: true
        }
      };
    } catch (error) {
      console.error('❌ Error in debug endpoint:', error);
      return reply.code(500).send({
        error: 'Debug endpoint failed',
        message: error.message
      });
    }
  });

  // Get invitation details for acceptance page - PUBLIC ENDPOINT
  fastify.get('/details', async (request, reply) => {
    try {
      const { org, email } = request.query;
      
      if (!org || !email) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'org and email parameters are required'
        });
      }

      console.log('🔍 Getting invitation details (public):', { org, email });
      console.log('🔍 Raw query params:', request.query);
      
      // Decode email in case it's URL encoded
      const decodedEmail = decodeURIComponent(email);
      console.log('🔍 Email comparison:', { 
        original: email, 
        decoded: decodedEmail,
        areDifferent: email !== decodedEmail 
      });

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, org))
        .limit(1);

      if (!tenant) {
        console.log('❌ Organization not found for org:', org);
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      console.log('✅ Found organization:', {
        tenantId: tenant.tenantId,
        companyName: tenant.companyName,
        kindeOrgId: tenant.kindeOrgId
      });

      // Get invited user details
      const [invitedUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.email, decodedEmail),
          eq(tenantUsers.tenantId, tenant.tenantId)
        ))
        .limit(1);

      if (!invitedUser) {
        console.log('❌ Invitation not found for email:', decodedEmail);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'No invitation found for this email address'
        });
      }

      // Check if user is already active
      if (invitedUser.isActive) {
        return reply.code(409).send({
          error: 'Invitation already accepted',
          message: 'This invitation has already been accepted'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitedUser.invitedBy))
        .limit(1);

      // Get user's assigned roles
      const userRoles = await db
        .select({
          roleName: customRoles.roleName
        })
        .from(userRoleAssignments)
        .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
        .where(eq(userRoleAssignments.userId, invitedUser.userId));

      return {
        success: true,
        invitation: {
          email: invitedUser.email,
          organizationName: tenant.companyName,
          inviterName: inviter?.name || 'Team Member',
          roles: userRoles.map(r => r.roleName),
          orgCode: tenant.kindeOrgId
        }
      };
    } catch (error) {
      console.error('❌ Error getting invitation details:', error);
      return reply.code(500).send({
        error: 'Failed to get invitation details',
        message: error.message
      });
    }
  });

  // Accept invitation (public endpoint)
  fastify.post('/accept', async (request, reply) => {
    try {
      const { token } = request.body;
      
      if (!token) {
        return reply.code(400).send({
          error: 'Missing required field',
          message: 'token is required'
        });
      }

      console.log('🔓 Accepting invitation with token:', token);

      // Find invitation by token
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
        });
      }

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, invitation.tenantId))
        .limit(1);

      if (!tenant) {
        console.log('❌ Organization not found for tenant:', invitation.tenantId);
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get role details
      let roleName = 'Team Member';
      if (invitation.roleId) {
        const [role] = await db
          .select()
          .from(customRoles)
          .where(eq(customRoles.roleId, invitation.roleId))
          .limit(1);
        if (role) {
          roleName = role.roleName;
        }
      }

      // Get inviter details
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      console.log('✅ Found invitation details:', {
        invitationId: invitation.invitationId,
        email: invitation.email,
        tenantId: invitation.tenantId,
        companyName: tenant.companyName,
        roleName: roleName
      });

      return {
        success: true,
        invitation: {
          email: invitation.email,
          name: invitation.email.split('@')[0],
          organizationName: tenant.companyName,
          orgCode: tenant.kindeOrgId,
          invitationToken: invitation.invitationToken,
          invitationUrl: invitation.invitationUrl,
          expiresAt: invitation.expiresAt,
          status: invitation.status,
          roleName: roleName,
          inviterName: inviter?.name || 'Team Administrator',
          tenantId: invitation.tenantId,
          invitationId: invitation.invitationId
        }
      };
    } catch (error) {
      console.error('❌ Error getting invitation details:', error);
      return reply.code(500).send({
        error: 'Internal server error',
        message: 'Failed to get invitation details'
      });
    }
  });

  // Admin endpoint to get all invitations for an organization
  fastify.get('/admin/:orgCode', async (request, reply) => {
    try {
      const { orgCode } = request.params;
      
      console.log('🔍 Admin getting invitations for organization:', orgCode);
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get all invitations for this organization
      const invitations = await db
        .select({
          invitation: tenantInvitations,
          role: customRoles,
          inviter: tenantUsers
        })
        .from(tenantInvitations)
        .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
        .leftJoin(tenantUsers, eq(tenantInvitations.invitedBy, tenantUsers.userId))
        .where(eq(tenantInvitations.tenantId, tenant.tenantId))
        .orderBy(desc(tenantInvitations.createdAt));

      // Format invitations with invitation URLs
      const formattedInvitations = await Promise.all(invitations.map(async ({ invitation, role, inviter }) => {
        const invitationUrl = await generateInvitationUrl(invitation.invitationToken, request, tenant.tenantId);
        
        return {
          invitationId: invitation.invitationId,
          email: invitation.email,
          roleName: role?.roleName || 'No role assigned',
          status: invitation.status,
          invitedBy: inviter?.name || 'Unknown',
          invitedAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          acceptedAt: invitation.acceptedAt,
          invitationUrl: invitationUrl,
          isExpired: invitation.expiresAt < new Date(),
          daysUntilExpiry: Math.ceil((new Date(invitation.expiresAt) - new Date()) / (1000 * 60 * 60 * 24))
        };
      }));

      console.log(`✅ Found ${formattedInvitations.length} invitations for organization ${tenant.companyName}`);

      return {
        success: true,
        organization: {
          tenantId: tenant.tenantId,
          companyName: tenant.companyName,
          kindeOrgId: tenant.kindeOrgId
        },
        invitations: formattedInvitations,
        summary: {
          total: formattedInvitations.length,
          pending: formattedInvitations.filter(inv => inv.status === 'pending' && !inv.isExpired).length,
          accepted: formattedInvitations.filter(inv => inv.status === 'accepted').length,
          expired: formattedInvitations.filter(inv => inv.isExpired).length
        }
      };
    } catch (error) {
      console.error('❌ Error getting admin invitations:', error);
      return reply.code(500).send({
        error: 'Failed to get invitations',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Admin endpoint to resend invitation email
  fastify.post('/admin/:orgCode/:invitationId/resend', async (request, reply) => {
    try {
      const { orgCode, invitationId } = request.params;
      
      console.log('📧 Admin resending invitation:', { orgCode, invitationId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get invitation details
      const [invitation] = await db
        .select({
          invitation: tenantInvitations,
          role: customRoles,
          inviter: tenantUsers
        })
        .from(tenantInvitations)
        .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
        .leftJoin(tenantUsers, eq(tenantInvitations.invitedBy, tenantUsers.userId))
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenant.tenantId)
        ))
        .limit(1);

      if (!invitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invitation not found in this organization'
        });
      }

      if (invitation.invitation.status === 'accepted') {
        return reply.code(400).send({
          error: 'Invitation already accepted',
          message: 'Cannot resend an accepted invitation'
        });
      }

      if (invitation.invitation.expiresAt < new Date()) {
        return reply.code(400).send({
          error: 'Invitation expired',
          message: 'Cannot resend an expired invitation'
        });
      }

      // Resend invitation email
      try {
        // Import EmailService dynamically to avoid circular dependencies
        const EmailService = (await import('../utils/email.js')).default;
        
        // Regenerate invitation URL to ensure it uses the correct subdomain
        const invitationUrl = await generateInvitationUrl(invitation.invitation.invitationToken, request, tenant.tenantId);
        
        // Extract organization and location names from invitation
        const organizations = [];
        const locations = [];
        let roleName = invitation.role?.roleName || 'Member';

        // Handle multi-entity invitations
        if (invitation.invitation.invitationScope === 'multi-entity' && invitation.invitation.targetEntities && invitation.invitation.targetEntities.length > 0) {
          const roleNames = [];
          for (const targetEntity of invitation.invitation.targetEntities) {
            // Get entity details
            const [entityRecord] = await db
              .select({
                entityId: entities.entityId,
                entityName: entities.entityName,
                entityType: entities.entityType
              })
              .from(entities)
              .where(eq(entities.entityId, targetEntity.entityId))
              .limit(1);

            // Get role details
            const [roleRecord] = await db
              .select({
                roleName: customRoles.roleName
              })
              .from(customRoles)
              .where(eq(customRoles.roleId, targetEntity.roleId))
              .limit(1);

            if (entityRecord) {
              const entityRoleName = roleRecord?.roleName || 'Member';
              roleNames.push(entityRoleName);

              if (entityRecord.entityType === 'organization') {
                organizations.push(entityRecord.entityName);
              } else if (entityRecord.entityType === 'location') {
                locations.push(entityRecord.entityName);
              }
            }
          }
          roleName = roleNames.length > 0 
            ? (roleNames.length === 1 ? roleNames[0] : `${roleNames[0]} (${roleNames.length} roles)`)
            : 'Team Member';
        } else if (invitation.invitation.primaryEntityId) {
          // Handle single-entity invitations
          const [entityRecord] = await db
            .select({
              entityName: entities.entityName,
              entityType: entities.entityType
            })
            .from(entities)
            .where(eq(entities.entityId, invitation.invitation.primaryEntityId))
            .limit(1);

          if (entityRecord) {
            if (entityRecord.entityType === 'organization') {
              organizations.push(entityRecord.entityName);
            } else if (entityRecord.entityType === 'location') {
              locations.push(entityRecord.entityName);
            }
          }
        }
        
        await EmailService.sendUserInvitation({
          email: invitation.invitation.email,
          tenantName: tenant.companyName,
          roleName,
          invitationToken: invitationUrl, // Pass full URL instead of token
          invitedByName: invitation.inviter?.name || 'Team Administrator',
          message: 'Your invitation has been resent by an administrator.',
          organizations: organizations.length > 0 ? organizations : undefined,
          locations: locations.length > 0 ? locations : undefined,
          invitedDate: invitation.invitation.createdAt,
          expiryDate: invitation.invitation.expiresAt
        });
        
        console.log(`✅ Invitation email resent successfully to ${invitation.invitation.email}`);
        
        return {
          success: true,
          message: 'Invitation email resent successfully',
          email: invitation.invitation.email
        };
      } catch (emailError) {
        console.error(`❌ Failed to resend invitation email to ${invitation.invitation.email}:`, emailError.message);
        
        const fallbackUrl = await generateInvitationUrl(invitation.invitation.invitationToken, request, tenant.tenantId);
        return reply.code(500).send({
          error: 'Failed to resend invitation email',
          message: emailError.message,
          invitationUrl: fallbackUrl
        });
      }
    } catch (error) {
      console.error('❌ Error resending invitation:', error);
      return reply.code(500).send({
        error: 'Failed to resend invitation',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Admin endpoint to cancel invitation
  fastify.delete('/admin/:orgCode/:invitationId', async (request, reply) => {
    try {
      const { orgCode, invitationId } = request.params;
      
      console.log('❌ Admin canceling invitation:', { orgCode, invitationId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Cancel invitation
      const [updatedInvitation] = await db
        .update(tenantInvitations)
        .set({ 
          status: 'cancelled',
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenant.tenantId)
        ))
        .returning();

      if (!updatedInvitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invitation not found in this organization'
        });
      }

      console.log(`✅ Invitation ${invitationId} cancelled successfully`);

      return {
        success: true,
        message: 'Invitation cancelled successfully',
        invitation: {
          invitationId: updatedInvitation.invitationId,
          email: updatedInvitation.email,
          status: updatedInvitation.status
        }
      };
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error);
      return reply.code(500).send({
        error: 'Failed to cancel invitation',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Create test invitation for testing purposes
  fastify.post('/create-test-invitation', async (request, reply) => {
    try {
      const { orgCode, email, roleName = 'Member' } = request.body;
      
      if (!orgCode || !email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'orgCode and email are required'
        });
      }
      
      console.log('🧪 Creating test invitation...', { orgCode, email, roleName });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Get a user to be the inviter (use the first admin user)
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenant.tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ))
        .limit(1);

      if (!inviter) {
        return reply.code(404).send({
          error: 'No admin user found',
          message: 'Cannot create invitation without an admin user in the organization'
        });
      }

      // Get or create a default role
      let [role] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenant.tenantId),
          eq(customRoles.roleName, roleName)
        ))
        .limit(1);

      if (!role) {
        // Create a default role if it doesn't exist
        const [newRole] = await db.insert(customRoles).values({
          tenantId: tenant.tenantId,
          roleName: roleName,
          description: `Default ${roleName} role`,
          permissions: { read: true, write: false, admin: false },
          restrictions: {},
          isSystemRole: false,
          isDefault: false,
          priority: 50
        }).returning();
        role = newRole;
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (existingInvitation) {
        return reply.code(409).send({
          error: 'Invitation already exists',
          message: `An invitation for ${email} already exists in this organization`,
          invitation: existingInvitation
        });
      }

      // Create the invitation
      const invitationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Generate the full invitation URL using tenant subdomain
      const invitationUrl = await generateInvitationUrl(invitationToken, request, tenant.tenantId);
      
      const [newInvitation] = await db.insert(tenantInvitations).values({
        tenantId: tenant.tenantId,
        email: email,
        invitationToken: invitationToken,
        invitationUrl: invitationUrl,
        status: 'pending',
        expiresAt: expiresAt,
        invitedBy: inviter.userId,
        roleId: role.roleId
      }).returning();

      console.log('✅ Test invitation created successfully:', {
        invitationId: newInvitation.invitationId,
        email: newInvitation.email,
        token: newInvitation.invitationToken,
        url: newInvitation.invitationUrl
      });

      return {
        success: true,
        message: 'Test invitation created successfully',
        invitation: {
          invitationId: newInvitation.invitationId,
          email: newInvitation.email,
          token: newInvitation.invitationToken,
          url: newInvitation.invitationUrl,
          expiresAt: newInvitation.expiresAt,
          roleName: role.roleName
        }
      };
    } catch (error) {
      console.error('❌ Error creating test invitation:', error);
      return reply.code(500).send({
        error: 'Failed to create test invitation',
        message: error.message
      });
    }
  });

  // Create invitation for current tenant (authenticated endpoint)
  fastify.post('/create', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const { email, roleName = 'Member' } = request.body;
      
      if (!email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'email is required'
        });
      }
      
      if (!request.userContext?.isAuthenticated) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const tenantId = request.userContext.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          error: 'Tenant context required',
          message: 'User must be associated with a tenant'
        });
      }
      
      console.log('📧 Creating invitation for current tenant...', { email, roleName, tenantId });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: 'Current user\'s organization not found'
        });
      }

      // Get the current user as inviter
      const inviter = request.userContext;

      // Get or create a default role
      let [role] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.tenantId, tenant.tenantId),
          eq(customRoles.roleName, roleName)
        ))
        .limit(1);

      if (!role) {
        // Create a default role if it doesn't exist
        const [newRole] = await db.insert(customRoles).values({
          tenantId: tenant.tenantId,
          roleName: roleName,
          description: `Default ${roleName} role`,
          permissions: { read: true, write: false, admin: false },
          restrictions: {},
          isSystemRole: false,
          isDefault: false,
          priority: 50
        }).returning();
        role = newRole;
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (existingInvitation) {
        return reply.code(409).send({
          error: 'Invitation already exists',
          message: `An invitation for ${email} already exists in this organization`,
          invitation: existingInvitation
        });
      }

      // Create the invitation
      const invitationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Generate the full invitation URL using tenant subdomain
      const invitationUrl = await generateInvitationUrl(invitationToken, request, tenant.tenantId);
      
      const [newInvitation] = await db.insert(tenantInvitations).values({
        tenantId: tenant.tenantId,
        email: email,
        invitationToken: invitationToken,
        invitationUrl: invitationUrl,
        status: 'pending',
        expiresAt: expiresAt,
        invitedBy: inviter.kindeUserId,
        roleId: role.roleId
      }).returning();

      console.log('✅ Invitation created successfully:', {
        invitationId: newInvitation.invitationId,
        email: newInvitation.email,
        token: newInvitation.invitationToken,
        url: newInvitation.invitationUrl
      });

      return {
        success: true,
        message: 'Invitation created successfully',
        invitation: {
          invitationId: newInvitation.invitationId,
          email: newInvitation.email,
          token: newInvitation.invitationToken,
          url: newInvitation.invitationUrl,
          expiresAt: newInvitation.expiresAt,
          roleName: role.roleName
        }
      };
    } catch (error) {
      console.error('❌ Error creating invitation:', error);
      return reply.code(500).send({
        error: 'Failed to create invitation',
        message: error.message
      });
    }
  });

  // Create multi-entity invitation (authenticated endpoint)
  fastify.post('/create-multi-entity', {
    // Authentication handled globally, no need for route-level auth
  }, async (request, reply) => {
    try {
      console.log('🔥 MULTI-ENTITY INVITATION ROUTE CALLED');
      const { email, entities: rawEntities, primaryEntityId, message } = request.body;
      const targetEntities = Array.isArray(rawEntities)
        ? rawEntities
        : rawEntities
          ? [rawEntities]
          : [];

      console.log('🔍 Request body destructured:', {
        email,
        entitiesType: Array.isArray(rawEntities) ? 'array' : typeof rawEntities,
        entitiesValue: targetEntities,
        primaryEntityId,
        message,
        fullBody: request.body
      });

      if (!email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'email is required'
        });
      }

      if (!targetEntities || targetEntities.length === 0) {
        console.log('🔍 Entities validation failed:', {
          entities: targetEntities,
          isArray: Array.isArray(targetEntities),
          length: targetEntities?.length
        });
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'entities array is required and cannot be empty'
        });
      }

      if (!request.userContext?.isAuthenticated) {
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Authentication required'
        });
      }

      const tenantId = request.userContext.tenantId;
      if (!tenantId) {
        return reply.code(400).send({
          error: 'Tenant context required',
          message: 'User must be associated with a tenant'
        });
      }

      console.log('🚀 NEW CODE RUNNING: Creating multi-entity invitation...', {
        email,
        entityCount: targetEntities?.length || 0,
        primaryEntityId,
        tenantId,
        entitiesType: Array.isArray(targetEntities) ? 'array' : typeof targetEntities,
        entitiesValue: targetEntities,
        requestBody: request.body
      });

      // Get tenant details
      console.log('🔍 Querying tenant with ID:', tenantId, typeof tenantId);
      let tenant;
      try {
        const query = db
          .select({
            tenantId: tenants.tenantId,
            companyName: tenants.companyName,
            kindeOrgId: tenants.kindeOrgId
          })
          .from(tenants)
          .where(eq(tenants.tenantId, tenantId))
          .limit(1);

        console.log('🔍 Executing tenant query...');
        const [tenantRecord] = await query;
        tenant = tenantRecord;
        console.log('✅ Tenant query successful:', tenant);

        if (!tenant) {
          return reply.code(404).send({
            error: 'Organization not found',
            message: 'Current user\'s organization not found'
          });
        }
      } catch (error) {
        console.error('❌ Tenant query failed:', error);
        throw error;
      }

      // Validate target entities and permissions
      const validatedEntities = [];
      for (const entity of targetEntities) {
        if (!entity.entityId || !entity.roleId) {
          return reply.code(400).send({
            error: 'Invalid entity specification',
            message: 'Each entity must have entityId and roleId'
          });
        }

        // Verify entity exists and belongs to the tenant
        console.log('🔍 Verifying entity:', { entityId: entity.entityId, tenantId });
        let entityRecord;
        try {
          const entityQuery = db
            .select()
            .from(entities)
            .where(and(
              eq(entities.entityId, entity.entityId),
              eq(entities.tenantId, tenantId)
            ))
            .limit(1);

          console.log('🔍 Executing entity verification query...');
          [entityRecord] = await entityQuery;
          console.log('✅ Entity verification successful:', entityRecord);

          if (!entityRecord) {
            return reply.code(404).send({
              error: 'Entity not found',
              message: `Entity ${entity.entityId} not found in this tenant`
            });
          }
        } catch (error) {
          console.error('❌ Entity verification failed:', error);
          console.error('❌ Entity ID:', entity.entityId);
          console.error('❌ Tenant ID:', tenantId);
          throw error;
        }

        // Verify role exists
        const [roleRecord] = await db
          .select()
          .from(customRoles)
          .where(eq(customRoles.roleId, entity.roleId))
          .limit(1);

        if (!roleRecord) {
          return reply.code(404).send({
            error: 'Role not found',
            message: `Role ${entity.roleId} not found`
          });
        }

        // Validate permissions for this entity
        const permissionCheck = await validateMultiEntityInvitationPermissions(
          request.userContext.internalUserId,
          tenant.tenantId,
          [{
            entityId: entity.entityId,
            roleId: entity.roleId,
            entityType: entityRecord.entityType
          }]
        );

        if (!permissionCheck.canInvite) {
          return reply.code(403).send({
            error: 'Insufficient permissions',
            message: `You don't have permission to invite users to ${entityRecord.entityName}`,
            restrictions: permissionCheck.restrictions
          });
        }

        validatedEntities.push({
          entityId: entity.entityId,
          roleId: entity.roleId,
          entityType: entityRecord.entityType,
          membershipType: entity.membershipType || 'direct'
        });
      }

      // Validate primary entity if specified
      if (primaryEntityId) {
        const isPrimaryValid = validatedEntities.some(e => e.entityId === primaryEntityId);
        if (!isPrimaryValid) {
          return reply.code(400).send({
            error: 'Invalid primary entity',
            message: 'Primary entity must be one of the target entities'
          });
        }
      }

      // Ensure we have at least one entity
      if (validatedEntities.length === 0) {
        return reply.code(400).send({
          error: 'No valid entities',
          message: 'At least one valid entity must be specified'
        });
      }

      // Check if invitation already exists
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (existingInvitation) {
        return reply.code(409).send({
          error: 'Invitation already exists',
          message: `An invitation for ${email} already exists in this organization`,
          invitation: existingInvitation
        });
      }

      // Create the invitation
      const invitationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Generate the full invitation URL using tenant subdomain
      const invitationUrl = await generateInvitationUrl(invitationToken, request, tenant.tenantId);

      // Try simple raw SQL with string interpolation (temporary workaround)
      // Ensure we have a valid primary entity ID
      const finalPrimaryEntityId = primaryEntityId || validatedEntities[0]?.entityId;
      if (!finalPrimaryEntityId) {
        return reply.code(400).send({
          error: 'Invalid primary entity',
          message: 'Unable to determine primary entity ID'
        });
      }

      // Try a two-step approach: insert without JSONB first, then update
      const dbConnection = dbManager.getAppConnection();

      // First insert without the JSONB field
      const insertQuery = `
        INSERT INTO tenant_invitations (
          tenant_id, email, invitation_scope, primary_entity_id,
          invited_by, invitation_token, invitation_url, status, expires_at, updated_at
        ) VALUES (
          '${tenant.tenantId}', '${email}', 'multi-entity',
          '${finalPrimaryEntityId}', '${request.userContext.internalUserId}', '${invitationToken}',
          '${invitationUrl}', 'pending', '${expiresAt.toISOString()}', '${new Date().toISOString()}'
        )
        RETURNING invitation_id
      `;

      console.log('🔍 Step 1 - Inserting base invitation:', insertQuery);

      const insertResult = await dbConnection.unsafe(insertQuery);
      const invitationId = insertResult[0].invitation_id;

      // Now update with JSONB
      const targetEntitiesJson = JSON.stringify(validatedEntities).replace(/'/g, "''");
      const updateQuery = `
        UPDATE tenant_invitations
        SET target_entities = '${targetEntitiesJson}'::jsonb
        WHERE invitation_id = '${invitationId}'
        RETURNING *
      `;

      console.log('🔍 Step 2 - Updating with JSONB:', updateQuery);

      const updateResult = await dbConnection.unsafe(updateQuery);
      const newInvitation = updateResult[0];

      console.log('✅ Multi-entity invitation created successfully:', {
        invitationId: newInvitation.invitation_id,
        email: newInvitation.email,
        token: newInvitation.invitation_token,
        url: newInvitation.invitation_url,
        targetEntities: validatedEntities.length
      });

      // Send invitation email
      console.log(`📧 Preparing to send multi-entity invitation email to ${newInvitation.email}`);
      try {
        // Import EmailService dynamically to avoid circular dependencies
        const EmailService = (await import('../utils/email.js')).default;

        // Extract organization names, locations, and role names from validated entities
        const organizations = [];
        const locations = [];
        const roleNames = [];

        for (const entity of validatedEntities) {
          // Get entity details
          const [entityRecord] = await db
            .select({
              entityId: entities.entityId,
              entityName: entities.entityName,
              entityType: entities.entityType
            })
            .from(entities)
            .where(eq(entities.entityId, entity.entityId))
            .limit(1);

          // Get role details
          const [roleRecord] = await db
            .select({
              roleName: customRoles.roleName
            })
            .from(customRoles)
            .where(eq(customRoles.roleId, entity.roleId))
            .limit(1);

          if (entityRecord) {
            const roleName = roleRecord?.roleName || 'Member';
            roleNames.push(roleName);

            if (entityRecord.entityType === 'organization') {
              organizations.push(entityRecord.entityName);
            } else if (entityRecord.entityType === 'location') {
              locations.push(entityRecord.entityName);
            }
          }
        }

        // Determine primary role name (use first role or most common)
        const primaryRoleName = roleNames.length > 0 
          ? (roleNames.length === 1 ? roleNames[0] : `${roleNames[0]} (${roleNames.length} roles)`)
          : 'Team Member';

        console.log(`📧 Email details:`, {
          email: newInvitation.email,
          tenantName: tenant.companyName,
          roleName: primaryRoleName,
          organizations: organizations.length,
          locations: locations.length,
          invitationToken: newInvitation.invitation_token.substring(0, 8) + '...',
          invitationUrl: invitationUrl,
          invitedByName: request.userContext.name || 'Team Administrator',
          entityCount: validatedEntities.length
        });

        const emailResult = await EmailService.sendUserInvitation({
          email: newInvitation.email,
          tenantName: tenant.companyName,
          roleName: primaryRoleName,
          invitationToken: invitationUrl, // Pass full URL instead of token
          invitedByName: request.userContext.name || 'Team Administrator',
          message: request.body.message || `You've been invited to join ${tenant.companyName} with access to ${validatedEntities.length} organization${validatedEntities.length > 1 ? 's' : ''}.`,
          organizations: organizations.length > 0 ? organizations : undefined,
          locations: locations.length > 0 ? locations : undefined,
          invitedDate: new Date(),
          expiryDate: expiresAt
        });

        console.log(`✅ Multi-entity invitation email sent successfully to ${newInvitation.email}:`, emailResult);
      } catch (emailError) {
        console.error(`❌ Failed to send multi-entity invitation email to ${newInvitation.email}:`, {
          error: emailError.message,
          stack: emailError.stack,
          response: emailError.response?.data
        });

        // Don't fail the entire invitation process if email fails
        console.log(`⚠️ Multi-entity invitation created but email failed. Token: ${newInvitation.invitation_token}`);
      }

      return {
        success: true,
        message: 'Multi-entity invitation created successfully',
        invitation: {
          invitationId: newInvitation.invitation_id,
          email: newInvitation.email,
          targetEntities: validatedEntities,
          primaryEntityId: newInvitation.primary_entity_id,
          invitationScope: newInvitation.invitation_scope,
          token: newInvitation.invitation_token,
          url: newInvitation.invitation_url,
          expiresAt: newInvitation.expires_at
        }
      };
    } catch (error) {
      console.error('❌ Error creating multi-entity invitation:', error);
      return reply.code(500).send({
        error: 'Failed to create multi-entity invitation',
        message: error.message
      });
    }
  });

  // Test email service
  fastify.post('/test-email', async (request, reply) => {
    try {
      console.log('🧪 Testing email service...');

      const { email } = request.body;
      if (!email) {
        return reply.code(400).send({
          error: 'Email required',
          message: 'Please provide an email address to test'
        });
      }

      // Import EmailService
      const EmailService = (await import('../utils/email.js')).default;

      console.log('📧 Testing email service with:', {
        provider: EmailService.emailProvider,
        testEmail: email
      });

      // Test connection first
      const connectionTest = await EmailService.testConnection();
      console.log('🔌 Connection test result:', connectionTest);

      // Try to send a test email
      const testResult = await EmailService.sendUserInvitation({
        email,
        tenantName: 'Wrapper Test',
        roleName: 'Test User',
        invitationToken: 'test-token-123',
        invitedByName: 'Test Administrator',
        message: 'This is a test email to verify the email service is working.'
      });

      return {
        success: true,
        message: 'Email test completed',
        connectionTest,
        emailResult: testResult
      };
    } catch (error) {
      console.error('❌ Email test failed:', error);
      return reply.code(500).send({
        error: 'Email test failed',
        message: error.message,
        details: error.response?.data
      });
    }
  });

  // Test endpoint to verify invitation system with working user assignment
  fastify.post('/test-invitation-flow', async (request, reply) => {
    try {
      const { orgCode, kindeUserId, email } = request.body;
      
      if (!orgCode || !kindeUserId || !email) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'orgCode, kindeUserId, and email are required'
        });
      }
      
      console.log('🧪 Testing invitation flow with user assignment...');
      
      // Test 1: Check if organization exists
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, orgCode))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found',
          message: `No organization found with orgCode: ${orgCode}`
        });
      }

      // Test 2: Check if invitation exists
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenant.tenantId),
          eq(tenantInvitations.email, email)
        ))
        .limit(1);

      if (!invitation) {
        return reply.code(404).send({
          error: 'Invitation not found',
          message: `No invitation found for email: ${email} in organization: ${tenant.companyName}`
        });
      }

      // Test 3: Test organization assignment
      console.log('🔗 Testing organization assignment...');
      const orgResult = await ensureUserInCorrectOrganization(
        kindeUserId,
        email,
        orgCode
      );

      // Test 4: Test invitation acceptance simulation
      let acceptanceResult = null;
      if (orgResult.success) {
        console.log('✅ Organization assignment successful, testing invitation acceptance...');
        
        try {
          // Simulate the invitation acceptance process
          const [updatedUser] = await db
            .update(tenantUsers)
            .set({
              kindeUserId: kindeUserId,
              isActive: true,
              onboardingCompleted: true,
              invitationAcceptedAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(tenantUsers.userId, invitation.invitedBy))
            .returning();

          acceptanceResult = {
            success: true,
            userId: updatedUser.userId,
            email: updatedUser.email,
            isActive: updatedUser.isActive
          };
        } catch (acceptanceError) {
          acceptanceResult = {
            success: false,
            error: acceptanceError.message
          };
        }
      }

      return {
        success: true,
        data: {
          test: 'Invitation Flow Test',
          orgCode,
          kindeUserId,
          email,
          organization: {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          invitation: {
            invitationId: invitation.invitationId,
            status: invitation.status,
            expiresAt: invitation.expiresAt
          },
          organizationAssignment: orgResult,
          invitationAcceptance: acceptanceResult,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error testing invitation flow:', error);
      return reply.code(500).send({
        error: 'Failed to test invitation flow',
        message: error.message,
        stack: error.stack
      });
    }
  });

  // Debug endpoint to troubleshoot invitation issues
  fastify.get('/debug/:org/:email', async (request, reply) => {
    try {
      const { org, email } = request.params;
      const decodedEmail = decodeURIComponent(email);
      
      console.log('🔍 Debug invitation lookup:', { org, email, decodedEmail });
      
      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.kindeOrgId, org))
        .limit(1);

      if (!tenant) {
        return reply.send({
          error: 'Organization not found',
          org,
          searched: 'tenants.kindeOrgId'
        });
      }

      // Get all users in organization
      const allUsers = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenant.tenantId));

      // Find exact matches
      const exactMatches = allUsers.filter(u => u.email === decodedEmail);
      const originalMatches = allUsers.filter(u => u.email === email);

      return reply.send({
        success: true,
        debug: {
          organization: {
            found: true,
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          email: {
            original: email,
            decoded: decodedEmail,
            isDifferent: email !== decodedEmail
          },
          users: {
            totalInOrg: allUsers.length,
            exactMatches: exactMatches.length,
            originalMatches: originalMatches.length,
            exactMatchUsers: exactMatches.map(u => ({
              userId: u.userId,
              email: u.email,
              isActive: u.isActive,
              invitedAt: u.invitedAt
            })),
            originalMatchUsers: originalMatches.map(u => ({
              userId: u.userId,
              email: u.email,
              isActive: u.isActive,
              invitedAt: u.invitedAt
            })),
            allEmails: allUsers.map(u => u.email)
          }
        }
      });
    } catch (error) {
      console.error('❌ Debug invitation error:', error);
      return reply.send({
        error: 'Debug failed',
        message: error.message
      });
    }
  });

  // Get invitation details by token - PUBLIC ENDPOINT
  fastify.get('/details-by-token', async (request, reply) => {
    try {
      const { token } = request.query;
      
      if (!token) {
        return reply.code(400).send({
          error: 'Missing required parameters',
          message: 'token parameter is required'
        });
      }

      console.log('🔍 Getting invitation details by token:', { token });

      // Find invitation by token
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
        });
      }

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId,
          subdomain: tenants.subdomain,
          logoUrl: tenants.logoUrl,
          primaryColor: tenants.primaryColor,
          brandingConfig: tenants.brandingConfig
        })
        .from(tenants)
        .where(eq(tenants.tenantId, invitation.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // Get inviter details
      const [inviter] = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      // Handle multi-entity vs single-entity invitation details
      let invitationDetails;
      if (invitation.invitationScope === 'multi-entity' && invitation.targetEntities && invitation.targetEntities.length > 0) {
        // Multi-entity invitation - get details for each target entity
        const targetEntityDetails = [];

        for (const targetEntity of invitation.targetEntities) {
          // Get entity details
          const [entity] = await db
            .select({
              entityId: entities.entityId,
              entityName: entities.entityName,
              entityType: entities.entityType,
              hierarchyPath: entities.hierarchyPath
            })
            .from(entities)
            .where(eq(entities.entityId, targetEntity.entityId))
            .limit(1);

          // Get role details for this entity
          const [role] = await db
            .select({
              roleName: customRoles.roleName,
              description: customRoles.description
            })
            .from(customRoles)
            .where(eq(customRoles.roleId, targetEntity.roleId))
            .limit(1);

          targetEntityDetails.push({
            entityId: targetEntity.entityId,
            entityName: entity?.entityName || 'Unknown Entity',
            entityType: targetEntity.entityType,
            roleName: role?.roleName || 'Member',
            roleDescription: role?.description,
            isPrimary: targetEntity.entityId === invitation.primaryEntityId
          });
        }

        invitationDetails = {
          email: invitation.email,
          organizationName: tenant.companyName,
          inviterName: inviter?.name || 'Team Member',
          invitationScope: 'multi-entity',
          targetEntities: targetEntityDetails,
          primaryEntityId: invitation.primaryEntityId,
          primaryEntityName: targetEntityDetails.find(e => e.isPrimary)?.entityName,
          orgCode: tenant.kindeOrgId,
          expiresAt: invitation.expiresAt
        };
      } else {
        // Legacy single-entity invitation
        const [role] = await db
          .select({
            roleName: customRoles.roleName,
            description: customRoles.description
          })
          .from(customRoles)
          .where(eq(customRoles.roleId, invitation.roleId))
          .limit(1);

        invitationDetails = {
          email: invitation.email,
          organizationName: tenant.companyName,
          inviterName: inviter?.name || 'Team Member',
          invitationScope: invitation.invitationScope || 'organization',
          roles: role ? [role.roleName] : ['Member'],
          orgCode: tenant.kindeOrgId,
          roleName: role?.roleName || 'Member',
          expiresAt: invitation.expiresAt
        };
      }

      return {
        success: true,
        invitation: invitationDetails
      };
    } catch (error) {
      console.error('❌ Error getting invitation details by token:', error);
      return reply.code(500).send({
        error: 'Failed to get invitation details',
        message: error.message
      });
    }
  });

  // Accept invitation by token - PUBLIC ENDPOINT
  fastify.post('/accept-by-token', async (request, reply) => {
    try {
      const { token, kindeUserId } = request.body;
      
      if (!token || !kindeUserId) {
        return reply.code(400).send({
          error: 'Missing required fields',
          message: 'token and kindeUserId are required'
        });
      }

      console.log('✅ Accepting invitation by token:', { token, kindeUserId });

      // Find invitation by token in tenantInvitations table
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationToken, token),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        console.log('❌ Invitation not found for token:', token);
        return reply.code(404).send({
          error: 'Invitation not found',
          message: 'Invalid or expired invitation token'
        });
      }

      // Check if invitation has expired
      if (invitation.expiresAt && new Date() > new Date(invitation.expiresAt)) {
        console.log('❌ Invitation expired for token:', token);
        return reply.code(410).send({
          error: 'Invitation expired',
          message: 'This invitation has expired'
        });
      }

      // Get organization details
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          kindeOrgId: tenants.kindeOrgId
        })
        .from(tenants)
        .where(eq(tenants.tenantId, invitation.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          error: 'Organization not found'
        });
      }

      // CRITICAL: Ensure user is in the correct organization(s)
      console.log('🔗 Ensuring user is in correct Kinde organizations for invitation...');

      // For multi-entity invitations, add user to each specified organization/location
      if (invitation.invitationScope === 'multi-entity' && invitation.targetEntities && invitation.targetEntities.length > 0) {
        console.log('🎯 Processing multi-entity invitation with', invitation.targetEntities.length, 'target entities');

        // Collect unique organization IDs from target entities
        const targetOrgIds = new Set();

        for (const entity of invitation.targetEntities) {
          if (entity.entityId) {
            // Get the organization that contains this entity (could be a location or organization)
            const [entityRecord] = await db
              .select({
                entityId: entities.entityId,
                entityType: entities.entityType,
                parentEntityId: entities.parentEntityId
              })
              .from(entities)
              .where(eq(entities.entityId, entity.entityId))
              .limit(1);

            if (entityRecord) {
              // If it's a location, get its parent organization
              // If it's already an organization, use it directly
              let orgEntityId = entity.entityId;

              if (entityRecord.entityType === 'location' && entityRecord.parentEntityId) {
                // For locations, we need the parent organization
                const [parentOrg] = await db
                  .select({
                    entityId: entities.entityId,
                    kindeOrgId: tenants.kindeOrgId
                  })
                  .from(entities)
                  .leftJoin(tenants, eq(entities.tenantId, tenants.tenantId))
                  .where(eq(entities.entityId, entityRecord.parentEntityId))
                  .limit(1);

                if (parentOrg?.kindeOrgId) {
                  targetOrgIds.add(parentOrg.kindeOrgId);
                  console.log('🏢 Added parent organization for location:', parentOrg.kindeOrgId);
                }
              } else if (entityRecord.entityType === 'organization') {
                // For organizations, get the tenant's Kinde org ID
                targetOrgIds.add(tenant.kindeOrgId);
                console.log('🏢 Added direct organization:', tenant.kindeOrgId);
              }
            }
          }
        }

        // Add user to each unique organization
        const uniqueOrgIds = Array.from(targetOrgIds);
        console.log('🎯 Adding user to', uniqueOrgIds.length, 'unique organizations:', uniqueOrgIds);

        for (const orgId of uniqueOrgIds) {
          try {
            console.log('🔗 Adding user to organization:', orgId);
            const orgResult = await ensureUserInCorrectOrganization(
              kindeUserId,
              invitation.email,
              orgId
            );

            if (orgResult.success) {
              console.log('✅ Successfully added user to organization:', orgId);
            } else {
              console.warn('⚠️ Failed to add user to organization:', orgId, orgResult);
            }
          } catch (orgError) {
            console.warn('⚠️ Error adding user to organization:', orgId, orgError.message);
          }
        }
      } else {
        // Single-entity or legacy invitation - add to tenant's default organization
        console.log('🏢 Processing single-entity invitation, adding to tenant organization:', tenant.kindeOrgId);

        try {
          // Try with the full org code first, then try without 'org_' prefix if it fails
          let orgResult = await ensureUserInCorrectOrganization(
            kindeUserId,
            invitation.email,
            tenant.kindeOrgId // Use the organization's Kinde org ID
          );

          // If the first attempt fails and the org code starts with 'org_', try without the prefix
          if (!orgResult.success && tenant.kindeOrgId.startsWith('org_')) {
            const orgCodeWithoutPrefix = tenant.kindeOrgId.replace('org_', '');
            console.log('🔄 Retrying with org code without prefix:', orgCodeWithoutPrefix);
            orgResult = await ensureUserInCorrectOrganization(
              kindeUserId,
              invitation.email,
              orgCodeWithoutPrefix
            );
          }

          if (orgResult.success) {
            console.log('✅ User organization assignment completed:', orgResult);
          } else {
            console.warn('⚠️ Kinde organization assignment failed, but continuing:', orgResult);
            console.log('ℹ️ This is expected if your M2M client lacks organization management permissions');
          }
        } catch (orgError) {
          console.warn('⚠️ Kinde organization assignment threw error, but continuing:', orgError.message);
          console.log('ℹ️ This is expected if your M2M client lacks organization management permissions');
        }
      }

      // Always continue with invitation acceptance regardless of Kinde org assignment status
      console.log('✅ Proceeding with invitation acceptance - user will be properly set up in internal system');

      // Check if user already exists (from legacy invitation system)
      const [existingUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.email, invitation.email),
          eq(tenantUsers.tenantId, invitation.tenantId)
        ))
        .limit(1);

      let newUser;
      if (existingUser) {
        // Update existing user record (from legacy invitation)
        console.log('✅ Updating existing user record:', existingUser.userId);
        [newUser] = await db
          .update(tenantUsers)
          .set({
            kindeUserId: kindeUserId,
            isActive: true,
            onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
            updatedAt: new Date()
          })
          .where(eq(tenantUsers.userId, existingUser.userId))
          .returning();
      } else {
        // Create new user record
        console.log('✅ Creating new user record');
        [newUser] = await db
          .insert(tenantUsers)
          .values({
            tenantId: invitation.tenantId,
            kindeUserId: kindeUserId,
            email: invitation.email,
            name: invitation.email.split('@')[0], // Use email prefix as name
            isActive: true,
            onboardingCompleted: true, // ✅ INVITED USERS SKIP ONBOARDING
            isTenantAdmin: false, // Invited users are never admins
            invitedBy: invitation.invitedBy,
            invitedAt: invitation.createdAt,
            updatedAt: new Date()
          })
          .returning();

        // Publish user creation event to Redis streams
        try {
          const { crmSyncStreams } = await import('../utils/redis.js');
          // Split name into firstName and lastName for CRM requirements
          const nameParts = (newUser.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await crmSyncStreams.publishUserEvent(invitation.tenantId, 'user_created', {
            userId: newUser.userId,
            email: newUser.email,
            firstName: firstName,
            lastName: lastName,
            name: newUser.name || `${firstName} ${lastName}`.trim(),
            isActive: newUser.isActive !== undefined ? newUser.isActive : true,
            createdAt: newUser.createdAt ? (typeof newUser.createdAt === 'string' ? newUser.createdAt : newUser.createdAt.toISOString()) : new Date().toISOString()
          });
          console.log('📡 Published user_created event to Redis streams');
        } catch (streamError) {
          console.warn('⚠️ Failed to publish user creation event to Redis streams:', streamError.message);
          // Don't fail the user creation if stream publishing fails
        }
      }

      // Handle role/entity assignments based on invitation type
      if (invitation.invitationScope === 'multi-entity' && invitation.targetEntities && invitation.targetEntities.length > 0) {
        // Multi-entity invitation - create memberships for each target entity
        console.log('🎯 Processing multi-entity invitation with', invitation.targetEntities.length, 'target entities');

        const memberships = [];
        for (const targetEntity of invitation.targetEntities) {
          // Create organization membership for each target entity
          const [membership] = await db
            .insert(organizationMemberships)
            .values({
              userId: newUser.userId,
              tenantId: invitation.tenantId,
              entityId: targetEntity.entityId,
              entityType: targetEntity.entityType,
              roleId: targetEntity.roleId,
              roleName: null, // Will be set by trigger or separate query
              membershipType: targetEntity.membershipType || 'direct',
              membershipStatus: 'active',
              isPrimary: targetEntity.entityId === invitation.primaryEntityId,
              canAccessSubEntities: true, // Default for invited users
              invitedBy: invitation.invitedBy,
              invitedAt: invitation.createdAt,
              joinedAt: new Date(),
              createdBy: invitation.invitedBy,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          memberships.push(membership);
          console.log('✅ Created membership for entity:', targetEntity.entityId);
        }

        // Update user's primary organization
        if (invitation.primaryEntityId) {
          await db
            .update(tenantUsers)
            .set({
              primaryOrganizationId: invitation.primaryEntityId,
              updatedAt: new Date()
            })
            .where(eq(tenantUsers.userId, newUser.userId));
          console.log('✅ Set primary organization to:', invitation.primaryEntityId);
        }

      } else {
        // Legacy single-entity invitation - assign role directly
        console.log('📋 Processing legacy single-entity invitation');

        if (invitation.roleId) {
          await db
            .insert(userRoleAssignments)
            .values({
              userId: newUser.userId,
              roleId: invitation.roleId,
              assignedBy: invitation.invitedBy,
              assignedAt: new Date()
            });
          console.log('✅ Assigned legacy role:', invitation.roleId);
        }

        // Create default organization membership if primaryEntityId exists
        if (invitation.primaryEntityId) {
          const [membership] = await db
            .insert(organizationMemberships)
            .values({
              userId: newUser.userId,
              tenantId: invitation.tenantId,
              entityId: invitation.primaryEntityId,
              entityType: 'organization', // Assume organization for legacy compatibility
              roleId: invitation.roleId,
              membershipType: 'direct',
              membershipStatus: 'active',
              isPrimary: true,
              canAccessSubEntities: true,
              invitedBy: invitation.invitedBy,
              invitedAt: invitation.createdAt,
              joinedAt: new Date(),
              createdBy: invitation.invitedBy,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          // Update user's primary organization
          await db
            .update(tenantUsers)
            .set({
              primaryOrganizationId: invitation.primaryEntityId,
              updatedAt: new Date()
            })
            .where(eq(tenantUsers.userId, newUser.userId));
        }
      }

      // Update invitation status to accepted
      await db
        .update(tenantInvitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(tenantInvitations.invitationId, invitation.invitationId));

      console.log('✅ Invitation accepted successfully by token:', {
        userId: newUser.userId,
        email: newUser.email,
        tenantId: newUser.tenantId,
        kindeUserId: newUser.kindeUserId,
        invitedOrg: tenant.kindeOrgId,
        invitationScope: invitation.invitationScope,
        targetEntities: invitation.invitationScope === 'multi-entity' ? invitation.targetEntities.length : 1,
        isActive: newUser.isActive,
        onboardingCompleted: newUser.onboardingCompleted,
        isTenantAdmin: newUser.isTenantAdmin
      });

      return {
        success: true,
        message: 'Invitation accepted successfully',
        user: {
          userId: newUser.userId,
          email: newUser.email,
          name: newUser.name,
          isActive: newUser.isActive,
          tenantId: newUser.tenantId,
          onboardingCompleted: newUser.onboardingCompleted,
          isTenantAdmin: newUser.isTenantAdmin
        },
        invitationDetails: {
          invitationScope: invitation.invitationScope,
          targetEntities: invitation.targetEntities || [],
          primaryEntityId: invitation.primaryEntityId
        }
      };
    } catch (error) {
      console.error('❌ Error accepting invitation by token:', error);
      return reply.code(500).send({
        error: 'Failed to accept invitation',
        message: error.message
      });
    }
  });
} 