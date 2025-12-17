import { TenantService } from '../services/tenant-service.js';
import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { trackUsage } from '../middleware/usage.js';
import { db } from '../db/index.js';
import { tenants, tenantUsers, userRoleAssignments, customRoles, tenantInvitations, entities, organizationMemberships } from '../db/schema/index.js';
import { and, eq, sql, inArray } from 'drizzle-orm';
import ErrorResponses from '../utils/error-responses.js';
import { randomUUID } from 'crypto';
import ActivityLogger, { ACTIVITY_TYPES, RESOURCE_TYPES } from '../services/activityLogger.js';
import { OrganizationAssignmentService } from '../features/organizations/index.js';

export default async function tenantRoutes(fastify, options) {
  // List all tenants (Authenticated users only)
  fastify.get('/', {
    preHandler: [authenticateToken]
  }, async (request, reply) => {
    try {
      const tenantsList = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          isActive: tenants.isActive,
          createdAt: tenants.createdAt,
          adminEmail: tenants.adminEmail,
          trialStatus: tenants.trialStatus,
          subscriptionStatus: tenants.subscriptionStatus
        })
        .from(tenants)
        .orderBy(tenants.createdAt);

      return {
        success: true,
        tenants: tenantsList
      };
    } catch (error) {
      request.log.error('Error fetching tenants:', error);
      return reply.code(500).send({ error: 'Failed to fetch tenants' });
    }
  });

  // Get current tenant info
  fastify.get('/current', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Use tenantId directly from userContext
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }
      
      const details = await TenantService.getTenantDetails(tenantId);
      
      return {
        success: true,
        data: details
      };
    } catch (error) {
      request.log.error('Error fetching current tenant:', error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Update tenant settings (full update)
  fastify.put('/current/settings', {
    schema: {
      body: {
        type: 'object',
        properties: {
          companyName: { type: 'string', minLength: 1, maxLength: 255 },
          primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          logoUrl: { type: 'string', format: 'uri' },
          timezone: { type: 'string' },
          country: { type: 'string' },
          settings: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const updatedTenant = await TenantService.updateTenant(
        tenantId,
        request.body
      );

      // Log tenant settings update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.TENANT_SETTINGS_UPDATED,
        {
          updatedFields: Object.keys(request.body),
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedTenant,
        message: 'Tenant settings updated successfully'
      };
    } catch (error) {
      request.log.error('Error updating tenant settings:', error);
      return reply.code(500).send({ error: 'Failed to update tenant settings' });
    }
  });

  // Update tenant account details (partial update - PATCH)
  fastify.patch('/current', {
    schema: {
      body: {
        type: 'object',
        properties: {
          // Company Information
          legalCompanyName: { type: 'string', maxLength: 255 },
          logoUrl: { type: 'string' },
          
          // Contact Details
          billingEmail: { type: 'string', format: 'email' },
          supportEmail: { type: 'string', format: 'email' },
          contactSalutation: { type: 'string', maxLength: 20 },
          contactMiddleName: { type: 'string', maxLength: 100 },
          contactDepartment: { type: 'string', maxLength: 100 },
          contactJobTitle: { type: 'string', maxLength: 150 },
          contactDirectPhone: { type: 'string', maxLength: 50 },
          contactMobilePhone: { type: 'string', maxLength: 50 },
          contactPreferredContactMethod: { type: 'string', maxLength: 20 },
          contactAuthorityLevel: { type: 'string', maxLength: 50 },
          preferredContactMethod: { type: 'string', maxLength: 20 },
          
          // Mailing Address
          mailingAddressSameAsRegistered: { type: 'boolean' },
          mailingStreet: { type: 'string', maxLength: 255 },
          mailingCity: { type: 'string', maxLength: 100 },
          mailingState: { type: 'string', maxLength: 100 },
          mailingZip: { type: 'string', maxLength: 20 },
          mailingCountry: { type: 'string', maxLength: 100 },
          
          // Banking & Financial Information
          bankName: { type: 'string', maxLength: 255 },
          bankBranch: { type: 'string', maxLength: 255 },
          accountHolderName: { type: 'string', maxLength: 255 },
          accountNumber: { type: 'string', maxLength: 50 },
          accountType: { type: 'string', maxLength: 50 },
          bankAccountCurrency: { type: 'string', maxLength: 3 },
          swiftBicCode: { type: 'string', maxLength: 11 },
          iban: { type: 'string', maxLength: 34 },
          routingNumberUs: { type: 'string', maxLength: 9 },
          sortCodeUk: { type: 'string', maxLength: 6 },
          ifscCodeIndia: { type: 'string', maxLength: 11 },
          bsbNumberAustralia: { type: 'string', maxLength: 6 },
          paymentTerms: { type: 'string', maxLength: 50 },
          creditLimit: { type: 'number' },
          preferredPaymentMethod: { type: 'string', maxLength: 50 },
          
          // Tax & Compliance
          taxRegistrationDetails: { type: 'object' },
          taxResidenceCountry: { type: 'string', maxLength: 100 },
          taxExemptStatus: { type: 'boolean' },
          taxExemptionCertificateNumber: { type: 'string', maxLength: 50 },
          taxExemptionExpiryDate: { type: 'string', format: 'date' },
          withholdingTaxApplicable: { type: 'boolean' },
          withholdingTaxRate: { type: 'number' },
          taxTreatyCountry: { type: 'string', maxLength: 100 },
          w9StatusUs: { type: 'string', maxLength: 50 },
          w8FormTypeUs: { type: 'string', maxLength: 50 },
          reverseChargeMechanism: { type: 'boolean' },
          vatGstRateApplicable: { type: 'string', maxLength: 50 },
          regulatoryComplianceStatus: { type: 'string', maxLength: 50 },
          industrySpecificLicenses: { type: 'string' },
          dataProtectionRegistration: { type: 'string', maxLength: 50 },
          professionalIndemnityInsurance: { type: 'boolean' },
          insurancePolicyNumber: { type: 'string', maxLength: 50 },
          insuranceExpiryDate: { type: 'string', format: 'date' },
          
          // Localization
          defaultLanguage: { type: 'string', maxLength: 10 },
          defaultLocale: { type: 'string', maxLength: 20 },
          defaultCurrency: { type: 'string', maxLength: 3 },
          defaultTimeZone: { type: 'string', maxLength: 50 },
          fiscalYearStartMonth: { type: 'integer' },
          fiscalYearEndMonth: { type: 'integer' },
          fiscalYearStartDay: { type: 'integer' },
          fiscalYearEndDay: { type: 'integer' },
          
          // Branding
          primaryColor: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
          customDomain: { type: 'string', maxLength: 255 },
          brandingConfig: { type: 'object' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Prepare update data - only include fields that are provided
      const updateData = {};
      const allowedFields = [
        'legalCompanyName', 'logoUrl', 'billingEmail', 'supportEmail',
        'contactSalutation', 'contactMiddleName', 'contactDepartment',
        'contactJobTitle', 'contactDirectPhone', 'contactMobilePhone',
        'contactPreferredContactMethod', 'contactAuthorityLevel',
        'preferredContactMethod', 'mailingAddressSameAsRegistered',
        'mailingStreet', 'mailingCity', 'mailingState', 'mailingZip',
        'mailingCountry', 'taxRegistrationDetails', 'primaryColor',
        'customDomain', 'brandingConfig',
        // Banking fields
        'bankName', 'bankBranch', 'accountHolderName', 'accountNumber',
        'accountType', 'bankAccountCurrency', 'swiftBicCode', 'iban',
        'routingNumberUs', 'sortCodeUk', 'ifscCodeIndia', 'bsbNumberAustralia',
        'paymentTerms', 'creditLimit', 'preferredPaymentMethod',
        // Tax & Compliance fields
        'taxResidenceCountry', 'taxExemptStatus', 'taxExemptionCertificateNumber',
        'taxExemptionExpiryDate', 'withholdingTaxApplicable', 'withholdingTaxRate',
        'taxTreatyCountry', 'w9StatusUs', 'w8FormTypeUs', 'reverseChargeMechanism',
        'vatGstRateApplicable', 'regulatoryComplianceStatus', 'industrySpecificLicenses',
        'dataProtectionRegistration', 'professionalIndemnityInsurance',
        'insurancePolicyNumber', 'insuranceExpiryDate',
        // Localization fields
        'defaultLanguage', 'defaultLocale', 'defaultCurrency', 'defaultTimeZone',
        'fiscalYearStartMonth', 'fiscalYearEndMonth', 'fiscalYearStartDay', 'fiscalYearEndDay'
      ];

      // Only include fields that are present in request body
      allowedFields.forEach(field => {
        if (request.body[field] !== undefined) {
          updateData[field] = request.body[field];
        }
      });

      // Add updatedAt timestamp
      updateData.updatedAt = new Date();

      const updatedTenant = await TenantService.updateTenant(
        tenantId,
        updateData
      );

      // Log tenant account update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.TENANT_SETTINGS_UPDATED,
        {
          updatedFields: Object.keys(updateData),
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: updatedTenant,
        message: 'Account settings updated successfully'
      };
    } catch (error) {
      request.log.error('Error updating account settings:', error);
      return reply.code(500).send({ 
        error: 'Failed to update account settings',
        message: error.message 
      });
    }
  });

  // Get tenant users
  fastify.get('/current/users', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      // Use tenantId directly from userContext since auth middleware already resolved it
      const tenantId = request.userContext.tenantId;
      const { entityId } = request.query;

      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // If entityId is provided, filter users by entity
      const users = entityId
        ? await TenantService.getTenantUsersByEntity(tenantId, entityId)
        : await TenantService.getTenantUsers(tenantId);

      return {
        success: true,
        data: users,
        filteredByEntity: !!entityId,
        entityId: entityId || null
      };
    } catch (error) {
      request.log.error('Error fetching tenant users:', error);
      return reply.code(500).send({ error: 'Failed to fetch users' });
    }
  });

  // Invite user to tenant
  fastify.post('/current/users/invite', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'roleId'],
        properties: {
          email: { type: 'string', format: 'email' },
          roleId: { type: 'string' },
          message: { type: 'string', maxLength: 500 },
          organizationId: { type: 'string', format: 'uuid' },
          assignmentType: { type: 'string', enum: ['primary', 'secondary', 'temporary', 'guest'], default: 'primary' },
          priority: { type: 'integer', default: 1 }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const { email, roleId, message, organizationId, assignmentType = 'primary', priority = 1 } = request.body;

      // Validate organization if provided
      if (organizationId) {
        const organization = await db
          .select()
          .from(entities)
          .where(and(
            eq(entities.entityId, organizationId),
            eq(entities.tenantId, tenantId),
            eq(entities.isActive, true)
          ))
          .limit(1);

        if (organization.length === 0) {
          return reply.code(404).send({
            success: false,
            message: 'Organization not found in this tenant'
          });
        }
      }

      const invitation = await TenantService.inviteUser({
        tenantId: tenantId,
        email,
        roleId,
        invitedBy: request.userContext.internalUserId,
        message,
        primaryEntityId: organizationId,
        assignmentType,
        priority
      });

      // Log user invitation activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.TENANT_USER_INVITED,
        {
          invitedEmail: email,
          roleId: roleId,
          invitationId: invitation?.invitationId,
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        data: invitation,
        message: 'User invitation sent successfully'
      };
    } catch (error) {
      request.log.error('Error inviting user:', error);
      if (error.message.includes('already exists')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to send invitation' });
    }
  });

  // Accept invitation
  fastify.post('/invite/:token/accept', {
    schema: {
      params: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { token } = request.params;
      
      const result = await TenantService.acceptInvitation(
        token,
        request.userContext.kindeUserId,
        {
          email: request.userContext.email,
          name: request.userContext.name,
          avatar: request.userContext.avatar
        }
      );
      
      return {
        success: true,
        data: result,
        message: 'Invitation accepted successfully'
      };
    } catch (error) {
      request.log.error('Error accepting invitation:', error);
      if (error.message.includes('Invalid') || error.message.includes('expired')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to accept invitation' });
    }
  });

  // Get pending invitations
  fastify.get('/current/invitations', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const invitations = await TenantService.getPendingInvitations(tenantId);
      
      return {
        success: true,
        data: invitations
      };
    } catch (error) {
      request.log.error('Error fetching invitations:', error);
      return reply.code(500).send({ error: 'Failed to fetch invitations' });
    }
  });

  // Cancel invitation
  fastify.delete('/current/invitations/:invitationId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { invitationId } = request.params;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Check if user has permission to cancel invitations
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: 'Only tenant administrators can cancel invitations'
        });
      }

      const result = await TenantService.cancelInvitation(
        tenantId, 
        invitationId, 
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      request.log.error('Error cancelling invitation:', error);
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({ 
          error: 'Invitation not found',
          message: error.message
        });
      }
      
      if (error.message.includes('pending')) {
        return reply.code(400).send({ 
          error: 'Invalid invitation status',
          message: error.message
        });
      }
      
      return reply.code(500).send({ error: 'Failed to cancel invitation' });
    }
  });

  // Resend invitation email
  fastify.post('/current/invitations/:id/resend', {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      const result = await TenantService.resendInvitationEmail(request.params.id, tenantId);
      
      return {
        success: true,
        data: result,
        message: 'Invitation email resent successfully'
      };
    } catch (error) {
      request.log.error('Error resending invitation:', error);
      if (error.message.includes('not found') || error.message.includes('expired')) {
        return reply.code(400).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to resend invitation' });
    }
  });

  // Update user role/permissions
  fastify.put('/current/users/:userId/role', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      const { role } = request.body;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      if (!role) {
        return reply.code(400).send({ error: 'Role is required' });
      }

      // Get role ID from role name
      const [roleRecord] = await db
        .select()
        .from(customRoles)
        .where(and(
          eq(customRoles.roleName, role),
          eq(customRoles.tenantId, tenantId)
        ))
        .limit(1);

      if (!roleRecord) {
        return reply.code(404).send({ error: 'Role not found' });
      }

      const result = await TenantService.updateUserRole(userId, roleRecord.roleId, tenantId);

      // Log user role update activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.USER_PROMOTED,
        {
          targetUserId: userId,
          newRoleId: roleRecord.roleId,
          newRoleName: role,
          tenantId: tenantId,
          userEmail: request.userContext.email
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: result.message,
        data: result.data
      };
    } catch (error) {
      request.log.error('Error updating user role:', error);
      if (error.message.includes('not found')) {
        return reply.code(404).send({ error: error.message });
      }
      return reply.code(500).send({ error: 'Failed to update user role' });
    }
  });

  // Test Kinde organization assignment
  fastify.post('/test/kinde-organization', {
    preHandler: [authenticateToken, requirePermission('users:read'), trackUsage]
  }, async (request, reply) => {
    try {
      const tenantId = request.userContext.tenantId;

      console.log('🧪 Testing Kinde organization assignment for tenant:', tenantId);

      // Get a test user
      const [testUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isActive, true)
        ))
        .limit(1);

      if (!testUser) {
        return reply.code(404).send({
          success: false,
          message: 'No active users found for testing'
        });
      }

      // Get tenant info
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Test M2M token
      let m2mTokenTest = { success: false, error: 'Not tested' };
      try {
        const kindeServiceModule = await import('../services/kinde-service.js');
        const kindeService = kindeServiceModule.default || kindeServiceModule;
        const token = await kindeService.getM2MToken();
        m2mTokenTest = { success: true, tokenLength: token.length };
      } catch (error) {
        m2mTokenTest = { success: false, error: error.message };
      }

      // Test organization assignment
      let orgAssignmentTest = { success: false, error: 'Not tested' };
      try {
        const kindeServiceModule = await import('../services/kinde-service.js');
        const kindeService = kindeServiceModule.default || kindeServiceModule;
        const result = await kindeService.addUserToOrganization(
          testUser.kindeUserId || testUser.userId,
          tenant.kindeOrgId,
          { exclusive: false }
        );
        orgAssignmentTest = result;
      } catch (error) {
        orgAssignmentTest = { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Kinde organization assignment test completed',
        data: {
          tenant: {
            tenantId: tenant.tenantId,
            companyName: tenant.companyName,
            kindeOrgId: tenant.kindeOrgId
          },
          testUser: {
            userId: testUser.userId,
            email: testUser.email,
            kindeUserId: testUser.kindeUserId
          },
          m2mTokenTest,
          orgAssignmentTest,
          recommendations: {
            m2mConfigured: m2mTokenTest.success,
            orgAssignmentWorking: orgAssignmentTest.success,
            nextSteps: m2mTokenTest.success && orgAssignmentTest.success
              ? ['✅ All tests passed! Kinde organization assignment is working correctly.']
              : [
                  m2mTokenTest.success ? null : 'Configure M2M client with proper scopes (admin, organizations:read, organizations:write)',
                  orgAssignmentTest.success ? null : 'Ensure organization allows M2M management and M2M client has Organization Admin role'
                ].filter(Boolean)
          }
        }
      };

    } catch (error) {
      console.error('Error testing Kinde organization:', error);
      return reply.code(500).send({
        success: false,
        message: 'Test failed',
        error: error.message
      });
    }
  });

  // Remove user from tenant
  fastify.delete('/current/users/:userId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      
      if (!tenantId) {
        return ErrorResponses.notFound(reply, 'Tenant', 'Tenant not found');
      }

      // Check if user has permission to remove users
      if (!request.userContext.isTenantAdmin) {
        return reply.code(403).send({ 
          error: 'Forbidden',
          message: 'Only tenant administrators can remove users'
        });
      }

      const result = await TenantService.removeUser(
        tenantId, 
        userId, 
        request.userContext.internalUserId
      );
      
      return {
        success: true,
        message: result.message
      };
    } catch (error) {
      request.log.error('Error removing user:', error);
      
      if (error.message.includes('last admin')) {
        return reply.code(400).send({ 
          error: 'Cannot remove last admin',
          message: error.message
        });
      }
      
      if (error.message.includes('not found')) {
        return reply.code(404).send({ 
          error: 'User not found',
          message: error.message
        });
      }
      
      return reply.code(500).send({ error: 'Failed to remove user' });
    }
  });

  // Get tenant usage statistics
  fastify.get('/usage', {
    preHandler: [authenticateToken, requirePermission('analytics:read'), trackUsage],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['day', 'week', 'month', 'year'], default: 'month' },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { period, startDate, endDate } = request.query;
      const usage = await TenantService.getTenantUsage(request.user.tenantId, {
        period,
        startDate,
        endDate
      });
      
      return {
        success: true,
        data: usage
      };
    } catch (error) {
      fastify.log.error('Error fetching tenant usage:', error);
      return reply.code(500).send({ error: 'Failed to fetch usage statistics' });
    }
  });

  // Promote user to admin
  fastify.post('/current/users/:userId/promote', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can promote users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Update user to admin
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isTenantAdmin: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User promoted to admin successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error promoting user:', error);
      return reply.code(500).send({ error: 'Failed to promote user' });
    }
  });

  // Deactivate user
  fastify.post('/current/users/:userId/deactivate', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can deactivate users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Prevent self-deactivation
      if (userId === request.userContext.internalUserId) {
        return reply.code(400).send({ error: 'Cannot deactivate yourself' });
      }

      // Update user to inactive
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Publish user deactivation event to Redis streams
      try {
        const { crmSyncStreams } = await import('../utils/redis.js');
        await crmSyncStreams.publishUserEvent(tenantId, 'user_deactivated', {
          userId: updatedUser.userId,
          email: updatedUser.email,
          firstName: updatedUser.name?.split(' ')[0],
          lastName: updatedUser.name?.split(' ').slice(1).join(' ') || '',
          name: updatedUser.name,
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: request.userContext.internalUserId,
          reason: 'manual_deactivation'
        });
        console.log('📡 Published user_deactivated event to Redis streams');
      } catch (publishError) {
        console.warn('⚠️ Failed to publish user_deactivated event:', publishError.message);
        // Don't fail the request if event publishing fails
      }

      return {
        success: true,
        message: 'User deactivated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error deactivating user:', error);
      return reply.code(500).send({ error: 'Failed to deactivate user' });
    }
  });

  // Reactivate user
  fastify.post('/current/users/:userId/reactivate', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can reactivate users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Update user to active
      const [updatedUser] = await db
        .update(tenantUsers)
        .set({ 
          isActive: true,
          updatedAt: new Date()
        })
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User reactivated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error reactivating user:', error);
      return reply.code(500).send({ error: 'Failed to reactivate user' });
    }
  });

  // Update user details
  fastify.put('/current/users/:userId', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can update other users, users can update themselves
    const { userId } = request.params;
    const isUpdatingSelf = userId === request.userContext.internalUserId;
    const isAdmin = request.userContext?.isAdmin || request.userContext?.isTenantAdmin;

    if (!isUpdatingSelf && !isAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { name, email, title, department, isActive, isTenantAdmin } = request.body;

      // Build update object - only include provided fields
      const updateData = {
        updatedAt: new Date()
      };

      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (title !== undefined) updateData.title = title;
      if (department !== undefined) updateData.department = department;
      
      // Only admins can change these fields
      if (isAdmin && !isUpdatingSelf) {
        if (isActive !== undefined) updateData.isActive = isActive;
        if (isTenantAdmin !== undefined) updateData.isTenantAdmin = isTenantAdmin;
      }

      // Update user
      const [updatedUser] = await db
        .update(tenantUsers)
        .set(updateData)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (!updatedUser) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      return {
        success: true,
        message: 'User updated successfully',
        data: updatedUser
      };
    } catch (error) {
      request.log.error('Error updating user:', error);
      return reply.code(500).send({ error: 'Failed to update user' });
    }
  });

  // Note: User deletion is now handled by the unified TenantService.deleteUser() method above

  // Resend invitation
  fastify.post('/current/users/:userId/resend-invite', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const { userId } = request.params;
      const tenantId = request.userContext.tenantId;

      // Get user details
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Check if user has already completed onboarding
      if (user.onboardingCompleted) {
        return reply.code(400).send({ 
          error: 'User has already completed onboarding',
          message: 'Cannot resend invitation to users who have already joined'
        });
      }

      // Import EmailService
      const { default: EmailService } = await import('../utils/email.js');
      
      // Get tenant details for email
      const tenantDetails = await TenantService.getTenantDetails(tenantId);
      
      // Check for existing pending invitation
      const [existingInvitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.email, user.email),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      let invitationToken;
      let invitationId;

      if (existingInvitation) {
        // Use existing invitation
        invitationToken = existingInvitation.invitationToken;
        invitationId = existingInvitation.invitationId;
        
        // Update expiry to 7 days from now
        await db
          .update(tenantInvitations)
          .set({ 
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          })
          .where(eq(tenantInvitations.invitationId, invitationId));
          
        console.log(`🔄 Resending existing invitation ${invitationId} to ${user.email}`);
      } else {
        // Create new invitation
        invitationToken = randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const [newInvitation] = await db
          .insert(tenantInvitations)
          .values({
            tenantId,
            email: user.email,
            invitedBy: request.userContext.internalUserId,
            invitationToken,
            expiresAt,
            status: 'pending'
          })
          .returning();
          
        invitationId = newInvitation.invitationId;
        console.log(`📧 Created new invitation ${invitationId} for ${user.email}`);
      }

      // Get inviter's name
      const inviterName = request.userContext.name || request.userContext.email || 'Team Administrator';
      
      // Send invitation email
      try {
        const emailResult = await EmailService.sendUserInvitation({
          email: user.email,
          tenantName: tenantDetails.companyName,
          roleName: 'Team Member', // Default role for invited users
          invitationToken,
          invitedByName: inviterName,
          message: `You're invited to join ${tenantDetails.companyName} on Wrapper. Please accept this invitation to get started.`
        });

        if (emailResult.success) {
          console.log(`✅ Invitation email sent successfully to ${user.email}`);
          
          return {
            success: true,
            message: `Invitation resent to ${user.email}`,
            data: { 
              email: user.email,
              invitationId,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          };
        } else {
          console.error(`❌ Failed to send invitation email to ${user.email}:`, emailResult.error);
          return reply.code(500).send({ 
            error: 'Failed to send invitation email',
            message: 'Email service error occurred'
          });
        }
      } catch (emailError) {
        console.error(`❌ Error sending invitation email to ${user.email}:`, emailError);
        return reply.code(500).send({ 
          error: 'Failed to send invitation email',
          message: 'Email service error occurred'
        });
      }
    } catch (error) {
      request.log.error('Error resending invitation:', error);
      return reply.code(500).send({ error: 'Failed to resend invitation' });
    }
  });

  // Assign roles to user
  fastify.post('/current/users/:userId/assign-roles', {
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['roleIds'],
        properties: {
          roleIds: { 
            type: 'array', 
            items: { type: 'string' },
            description: 'Array of role IDs to assign to the user'
          }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can assign roles
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const { userId } = request.params;
      const { roleIds } = request.body;
      const tenantId = request.userContext.tenantId;

      console.log(`🔄 Role assignment request:`, {
        userId,
        roleIds,
        tenantId,
        assignedBy: request.userContext.internalUserId
      });

      if (!Array.isArray(roleIds)) {
        return reply.code(400).send({ error: 'roleIds must be an array' });
      }

      // Verify user exists in this tenant
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        return ErrorResponses.notFound(reply, 'User', 'User not found');
      }

      // Verify all roles exist and belong to this tenant
      if (roleIds.length > 0) {
        const roles = await db
          .select()
          .from(customRoles)
          .where(and(
            eq(customRoles.tenantId, tenantId),
            inArray(customRoles.roleId, roleIds)
          ));

        if (roles.length !== roleIds.length) {
          const foundRoleIds = roles.map(r => r.roleId);
          const missingRoleIds = roleIds.filter(id => !foundRoleIds.includes(id));
          console.log(`❌ Missing roles: ${missingRoleIds.join(', ')}`);
          return reply.code(400).send({ 
            error: 'One or more roles not found',
            missingRoles: missingRoleIds
          });
        }
      }

      // Get existing assignments before removal for event publishing
      const existingAssignments = await db
        .select({
          id: userRoleAssignments.id,
          roleId: userRoleAssignments.roleId
        })
        .from(userRoleAssignments)
        .where(eq(userRoleAssignments.userId, userId));

      // Use transaction for atomic operation
      const newAssignments = await db.transaction(async (tx) => {
        console.log(`🔄 Removing existing role assignments for user ${userId}`);
        // Remove existing role assignments for this user
        await tx
          .delete(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, userId));

        // Add new role assignments
        let insertedAssignments = [];
        if (roleIds.length > 0) {
          console.log(`➕ Adding ${roleIds.length} new role assignments for user ${userId}`);
          const assignments = roleIds.map(roleId => ({
            userId,
            roleId,
            assignedBy: request.userContext.internalUserId,
            assignedAt: new Date(),
            isActive: true
          }));

          console.log(`📝 Assignment data:`, assignments);
          insertedAssignments = await tx
            .insert(userRoleAssignments)
            .values(assignments)
            .returning();
          console.log(`✅ Successfully inserted role assignments`);
        }
        return insertedAssignments;
      });

      // Publish role unassignment events for removed roles
      const removedRoleIds = existingAssignments
        .map(a => a.roleId)
        .filter(roleId => !roleIds.includes(roleId));
      
      if (removedRoleIds.length > 0) {
        try {
          const { crmSyncStreams } = await import('../utils/redis.js');
          for (const assignment of existingAssignments.filter(a => removedRoleIds.includes(a.roleId))) {
            try {
              await crmSyncStreams.publishRoleEvent(tenantId, 'role_unassigned', {
                assignmentId: assignment.id,
                userId: userId,
                roleId: assignment.roleId,
                unassignedAt: new Date().toISOString(),
                unassignedBy: request.userContext.internalUserId,
                reason: 'Roles updated'
              });
            } catch (streamError) {
              console.warn('⚠️ Failed to publish role unassignment event:', streamError.message);
            }
          }
          console.log(`📡 Published ${removedRoleIds.length} role unassignment events`);
        } catch (publishError) {
          console.warn('⚠️ Failed to publish some role unassignment events:', publishError.message);
        }
      }

      // Publish role assignment events for new roles
      const newRoleIds = roleIds.filter(roleId => 
        !existingAssignments.some(a => a.roleId === roleId)
      );
      
      if (newRoleIds.length > 0 && newAssignments.length > 0) {
        try {
          const { crmSyncStreams } = await import('../utils/redis.js');
          for (const assignment of newAssignments.filter(a => newRoleIds.includes(a.roleId))) {
            try {
              await crmSyncStreams.publishRoleEvent(tenantId, 'role_assigned', {
                assignmentId: assignment.id,
                userId: userId,
                roleId: assignment.roleId,
                assignedAt: assignment.assignedAt ? (typeof assignment.assignedAt === 'string' ? assignment.assignedAt : assignment.assignedAt.toISOString()) : new Date().toISOString(),
                assignedBy: assignment.assignedBy || request.userContext.internalUserId
              });
              console.log(`📡 Published role assignment event for role ${assignment.roleId}`);
            } catch (streamError) {
              console.warn('⚠️ Failed to publish role assignment event:', streamError.message);
            }
          }
          console.log(`📡 Published ${newRoleIds.length} role assignment events`);
        } catch (publishError) {
          console.warn('⚠️ Failed to publish some role assignment events:', publishError.message);
        }
      }

      return {
        success: true,
        message: `Roles updated successfully for user`,
        data: { userId, assignedRoles: roleIds.length }
      };
    } catch (error) {
      console.error('❌ Error assigning roles:', error);
      request.log.error('Error assigning roles:', error);
      return reply.code(500).send({ 
        success: false,
        error: 'Failed to assign roles',
        message: error.message || 'Unknown error occurred',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });

  // Organization Assignment Routes

  /**
   * GET /current/organization-assignments
   * Get all organization assignments for the current tenant
   */
  fastify.get('/current/organization-assignments', {
    schema: {
      description: 'Get all organization assignments for the current tenant',
      tags: ['Tenant', 'Organization Assignment'],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  assignmentId: { type: 'string' },
                  userId: { type: 'string' },
                  userName: { type: 'string' },
                  userEmail: { type: 'string' },
                  organizationId: { type: 'string' },
                  organizationName: { type: 'string' },
                  organizationCode: { type: 'string' },
                  assignmentType: { type: 'string', enum: ['primary', 'secondary', 'temporary', 'guest'] },
                  isActive: { type: 'boolean' },
                  assignedAt: { type: 'string', format: 'date-time' },
                  priority: { type: 'integer' }
                }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      console.log('🔍 Organization assignments requested for tenant:', tenantId);

      // Get all organization memberships for this tenant
      const memberships = await db
        .select({
          membershipId: organizationMemberships.membershipId,
          userId: organizationMemberships.userId,
          userName: tenantUsers.name,
          userEmail: tenantUsers.email,
          entityId: organizationMemberships.entityId,
          entityType: entities.entityType,
          membershipType: organizationMemberships.membershipType,
          membershipStatus: organizationMemberships.membershipStatus,
          accessLevel: organizationMemberships.accessLevel,
          isPrimary: organizationMemberships.isPrimary,
          assignedAt: organizationMemberships.createdAt,
          entityName: entities.entityName,
          entityCode: entities.entityCode
        })
        .from(organizationMemberships)
        .innerJoin(tenantUsers, eq(organizationMemberships.userId, tenantUsers.userId))
        .innerJoin(entities, eq(organizationMemberships.entityId, entities.entityId))
        .where(and(
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.membershipStatus, 'active'),
          eq(tenantUsers.isActive, true),
          eq(entities.isActive, true)
        ));

      // Transform to the expected format
      const enrichedAssignments = memberships.map(membership => ({
        assignmentId: membership.membershipId,
        userId: membership.userId,
        userName: membership.userName,
        userEmail: membership.userEmail,
        organizationId: membership.entityId, // Keep for backward compatibility
        entityId: membership.entityId,
        entityType: membership.entityType, // Include entity type (organization or location)
        organizationName: membership.entityName, // Keep for backward compatibility
        entityName: membership.entityName,
        organizationCode: membership.entityCode, // Keep for backward compatibility
        entityCode: membership.entityCode,
        assignmentType: membership.membershipType,
        accessLevel: membership.accessLevel,
        isPrimary: membership.isPrimary,
        isActive: membership.membershipStatus === 'active',
        assignedAt: membership.assignedAt?.toISOString(),
        priority: membership.isPrimary ? 1 : 2 // Primary gets higher priority
      }));

      console.log('🔍 Returning enriched assignments:', enrichedAssignments.length);
      return {
        success: true,
        data: enrichedAssignments
      };
    } catch (error) {
      console.error('❌ Error fetching organization assignments:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to fetch organization assignments',
        error: error.message
      });
    }
  });

  /**
   * POST /current/users/:userId/assign-organization
   * Assign a user to an organization
   */
  fastify.post('/current/users/:userId/assign-organization', {
    schema: {
      description: 'Assign a user to an organization within the tenant',
      tags: ['Tenant', 'Organization Assignment'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string', format: 'uuid' },
          assignmentType: { type: 'string', enum: ['primary', 'secondary', 'temporary', 'guest'], default: 'primary' },
          priority: { type: 'integer', default: 1 },
          metadata: { type: 'object' }
        },
        required: ['organizationId']
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      const {
        organizationId,
        assignmentType = 'primary',
        priority = 1,
        metadata = {}
      } = request.body;

      // Validate that user exists and belongs to this tenant
      const user = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (user.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found in this tenant'
        });
      }

      // Validate that organization exists and belongs to this tenant
      const organization = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, organizationId),
          eq(entities.tenantId, tenantId),
          eq(entities.isActive, true)
        ))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Organization not found in this tenant'
        });
      }

      // Check if user is already assigned to this organization
      const existingMembership = await db
        .select()
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.entityId, organizationId),
          eq(organizationMemberships.membershipStatus, 'active')
        ))
        .limit(1);

      if (existingMembership.length > 0) {
        return reply.code(200).send({
          success: true,
          message: 'User is already assigned to this organization',
          data: {
            membershipId: existingMembership[0].membershipId,
            userId,
            organizationId,
            organizationName: organization[0].entityName,
            membershipType: existingMembership[0].membershipType,
            accessLevel: existingMembership[0].accessLevel,
            assignedAt: existingMembership[0].createdAt?.toISOString()
          }
        });
      }

      // Create new organization membership
      const membershipId = randomUUID();
      const newMembership = await db
        .insert(organizationMemberships)
        .values({
          membershipId,
          userId,
          tenantId,
          entityId: organizationId,
          entityType: 'organization',
          membershipType: assignmentType || 'direct',
          membershipStatus: 'active',
          accessLevel: 'standard',
          isPrimary: !user[0].primaryOrganizationId, // Set as primary if user has no primary org
          createdBy: request.userContext.internalUserId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // If this is the user's first organization assignment, update their primary organization
      if (!user[0].primaryOrganizationId) {
        await db
          .update(tenantUsers)
          .set({
            primaryOrganizationId: organizationId,
            updatedAt: new Date()
          })
          .where(and(
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.tenantId, tenantId)
          ));
      }

      if (newMembership.length === 0) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to create organization membership'
        });
      }

      // Publish organization assignment created event
      const assignmentData = {
        assignmentId: membershipId,
        tenantId,
        userId,
        organizationId,
        organizationCode: organization[0].entityCode,
        assignmentType,
        isActive: true,
        assignedAt: new Date().toISOString(),
        priority,
        assignedBy: request.userContext.internalUserId,
        metadata
      };

      try {
        await OrganizationAssignmentService.publishOrgAssignmentCreated(assignmentData);
      } catch (publishError) {
        console.error('❌ Failed to publish assignment event:', publishError);
        // Don't fail the assignment if event publishing fails
      }

      // Log activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        organizationId,
        ACTIVITY_TYPES.USER_ORGANIZATION_ASSIGNED,
        {
          userId,
          userEmail: user[0].email,
          organizationId,
          organizationName: organization[0].entityName,
          assignmentType,
          assignedBy: request.userContext.internalUserId,
          tenantId
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: 'User successfully assigned to organization',
        data: {
          membershipId: newMembership[0].membershipId,
          userId,
          organizationId,
          organizationName: organization[0].entityName,
          membershipType: newMembership[0].membershipType,
          accessLevel: newMembership[0].accessLevel,
          isPrimary: newMembership[0].isPrimary,
          assignedAt: newMembership[0].createdAt?.toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error assigning user to organization:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to assign user to organization',
        error: error.message
      });
    }
  });

  /**
   * PUT /current/users/:userId/update-organization
   * Update a user's organization assignment
   */
  fastify.put('/current/users/:userId/update-organization', {
    schema: {
      description: 'Update a user\'s organization assignment within the tenant',
      tags: ['Tenant', 'Organization Assignment'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string', format: 'uuid' },
          changes: {
            type: 'object',
            properties: {
              assignmentType: { type: 'string', enum: ['primary', 'secondary', 'temporary', 'guest'] },
              isActive: { type: 'boolean' },
              priority: { type: 'integer' }
            }
          }
        },
        required: ['organizationId', 'changes']
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      const { organizationId, changes, assignmentId } = request.body;

      // Validate user and organization belong to tenant
      const user = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (user.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found in this tenant'
        });
      }

      const organization = await db
        .select()
        .from(entities)
        .where(and(
          eq(entities.entityId, organizationId),
          eq(entities.tenantId, tenantId)
        ))
        .limit(1);

      if (organization.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'Organization not found in this tenant'
        });
      }

      // Update the user record
      const updateData = {
        updatedAt: new Date()
      };

      // Handle different types of changes
      if (changes.isActive !== undefined) {
        updateData.isActive = changes.isActive;
      }

      // If organization is changing, update it
      if (changes.organizationId) {
        updateData.primaryOrganizationId = changes.organizationId;
      }

      const updatedUser = await db
        .update(tenantUsers)
        .set(updateData)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .returning();

      if (updatedUser.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found'
        });
      }

      // Publish organization assignment updated event
      const assignmentData = {
        assignmentId: assignmentId || `${userId}_${organizationId}_${Date.now()}`,
        tenantId,
        userId,
        organizationId,
        changes,
        updatedBy: request.userContext.internalUserId
      };

      try {
        await OrganizationAssignmentService.publishOrgAssignmentUpdated(assignmentData);
        console.log(`📡 Published organization assignment updated event for user ${userId}`);
      } catch (publishError) {
        console.warn('⚠️ Failed to publish assignment update event:', publishError.message);
      }

      // Log activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        organizationId,
        ACTIVITY_TYPES.USER_ORGANIZATION_UPDATED,
        {
          userId,
          userEmail: user[0].email,
          organizationId,
          changes,
          updatedBy: request.userContext.internalUserId,
          tenantId
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: 'Organization assignment updated successfully',
        data: {
          userId,
          organizationId,
          changes,
          updatedAt: updateData.updatedAt.toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error updating organization assignment:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to update organization assignment',
        error: error.message
      });
    }
  });

  /**
   * DELETE /current/users/:userId/remove-organization
   * Remove a user from an organization
   */
  fastify.delete('/current/users/:userId/remove-organization', {
    schema: {
      description: 'Remove a user from an organization within the tenant',
      tags: ['Tenant', 'Organization Assignment'],
      params: {
        type: 'object',
        properties: {
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['userId']
      },
      body: {
        type: 'object',
        properties: {
          organizationId: { type: 'string', format: 'uuid' },
          reason: { type: 'string', default: 'permanent_removal' }
        },
        required: ['organizationId']
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { userId } = request.params;
      const { organizationId, reason = 'permanent_removal' } = request.body;

      // Validate that user exists and belongs to this tenant
      const user = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (user.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User not found in this tenant'
        });
      }

      // Find the organization membership to remove
      const membership = await db
        .select()
        .from(organizationMemberships)
        .where(and(
          eq(organizationMemberships.userId, userId),
          eq(organizationMemberships.tenantId, tenantId),
          eq(organizationMemberships.entityId, organizationId),
          eq(organizationMemberships.membershipStatus, 'active')
        ))
        .limit(1);

      if (membership.length === 0) {
        return reply.code(404).send({
          success: false,
          message: 'User organization membership not found'
        });
      }

      // Deactivate the membership
      const updatedMembership = await db
        .update(organizationMemberships)
        .set({
          membershipStatus: 'inactive',
          updatedBy: request.userContext.internalUserId,
          updatedAt: new Date()
        })
        .where(eq(organizationMemberships.membershipId, membership[0].membershipId))
        .returning();

      if (updatedMembership.length === 0) {
        return reply.code(500).send({
          success: false,
          message: 'Failed to remove organization membership'
        });
      }

      // If this was the primary organization, update user's primary organization
      if (membership[0].isPrimary) {
        // Find another active membership to set as primary
        const otherMemberships = await db
          .select()
          .from(organizationMemberships)
          .where(and(
            eq(organizationMemberships.userId, userId),
            eq(organizationMemberships.tenantId, tenantId),
            eq(organizationMemberships.membershipStatus, 'active')
          ));

        if (otherMemberships.length > 0) {
          // Set the first remaining membership as primary
          await db
            .update(organizationMemberships)
            .set({
              isPrimary: true,
              updatedBy: request.userContext.internalUserId,
              updatedAt: new Date()
            })
            .where(eq(organizationMemberships.membershipId, otherMemberships[0].membershipId));

          // Update user's primary organization
          await db
            .update(tenantUsers)
            .set({
              primaryOrganizationId: otherMemberships[0].entityId,
              updatedAt: new Date()
            })
            .where(and(
              eq(tenantUsers.userId, userId),
              eq(tenantUsers.tenantId, tenantId)
            ));
        } else {
          // No more memberships, clear primary organization
          await db
            .update(tenantUsers)
            .set({
              primaryOrganizationId: null,
              updatedAt: new Date()
            })
            .where(and(
              eq(tenantUsers.userId, userId),
              eq(tenantUsers.tenantId, tenantId)
            ));
        }
      }

      // Publish organization assignment deleted event
      const assignmentData = {
        assignmentId: `${userId}_${organizationId}_${Date.now()}`,
        tenantId,
        userId,
        organizationId,
        deletedBy: request.userContext.internalUserId,
        reason
      };

      try {
        await OrganizationAssignmentService.publishOrgAssignmentDeleted(assignmentData);
        console.log(`📡 Published organization assignment deleted event for user ${userId}`);
      } catch (publishError) {
        console.warn('⚠️ Failed to publish assignment deletion event:', publishError.message);
      }

      // Log activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        organizationId,
        ACTIVITY_TYPES.USER_ORGANIZATION_REMOVED,
        {
          userId,
          userEmail: user[0].email,
          organizationId,
          reason,
          removedBy: request.userContext.internalUserId,
          tenantId
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: 'User successfully removed from organization',
        data: {
          userId,
          organizationId,
          removedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Error removing user from organization:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to remove user from organization',
        error: error.message
      });
    }
  });

  /**
   * POST /current/users/bulk-assign-organizations
   * Bulk assign multiple users to organizations
   */
  fastify.post('/current/users/bulk-assign-organizations', {
    schema: {
      description: 'Bulk assign multiple users to organizations within the tenant',
      tags: ['Tenant', 'Organization Assignment'],
      body: {
        type: 'object',
        properties: {
          assignments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                userId: { type: 'string', format: 'uuid' },
                organizationId: { type: 'string', format: 'uuid' },
                assignmentType: { type: 'string', enum: ['primary', 'secondary', 'temporary', 'guest'], default: 'primary' },
                priority: { type: 'integer', default: 1 }
              },
              required: ['userId', 'organizationId']
            }
          }
        },
        required: ['assignments']
      }
    }
  }, async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const tenantId = request.userContext.tenantId;
      const { assignments } = request.body;

      const results = [];
      const events = [];

      for (const assignment of assignments) {
        try {
          // Update user organization assignment
          await db
            .update(tenantUsers)
            .set({
              primaryOrganizationId: assignment.organizationId,
              updatedAt: new Date()
            })
            .where(and(
              eq(tenantUsers.userId, assignment.userId),
              eq(tenantUsers.tenantId, tenantId)
            ));

          // Prepare event data
          const eventData = {
            assignmentId: `${assignment.userId}_${assignment.organizationId}_${Date.now()}`,
            tenantId,
            userId: assignment.userId,
            organizationId: assignment.organizationId,
            assignmentType: assignment.assignmentType || 'primary',
            isActive: true,
            assignedAt: new Date().toISOString(),
            priority: assignment.priority || 1,
            assignedBy: request.userContext.internalUserId
          };

          events.push(eventData);
          results.push({ success: true, userId: assignment.userId, assignmentId: eventData.assignmentId });

        } catch (error) {
          console.error(`❌ Failed to assign user ${assignment.userId}:`, error);
          results.push({ success: false, userId: assignment.userId, error: error.message });
        }
      }

      // Publish events in bulk
      try {
        const publishResults = await OrganizationAssignmentService.publishBulkAssignments(events, 'created');
        console.log(`📡 Published ${events.length} organization assignment events`);
      } catch (publishError) {
        console.warn('⚠️ Failed to publish some assignment events:', publishError.message);
      }

      const successCount = results.filter(r => r.success).length;
      const failureCount = results.filter(r => !r.success).length;

      // Log bulk activity
      await ActivityLogger.logActivity(
        request.userContext.internalUserId,
        tenantId,
        null,
        ACTIVITY_TYPES.BULK_USER_ORGANIZATION_ASSIGNED,
        {
          totalAssignments: assignments.length,
          successful: successCount,
          failed: failureCount,
          assignments: results,
          tenantId
        },
        ActivityLogger.createRequestContext(request)
      );

      return {
        success: true,
        message: `Bulk assignment completed: ${successCount} successful, ${failureCount} failed`,
        data: {
          total: assignments.length,
          successful: successCount,
          failed: failureCount,
          results
        }
      };
    } catch (error) {
      console.error('❌ Error in bulk organization assignment:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to complete bulk organization assignment',
        error: error.message
      });
    }
  });

  // Export users
  fastify.get('/current/users/export', async (request, reply) => {
    if (!request.userContext?.isAuthenticated) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    // Only admins can export users
    if (!request.userContext?.isAdmin && !request.userContext?.isTenantAdmin) {
      return reply.code(403).send({ error: 'Insufficient permissions' });
    }

    try {
      const tenantId = request.userContext.tenantId;

      const users = await db
        .select({
          name: tenantUsers.name,
          email: tenantUsers.email,
          role: sql`CASE WHEN ${tenantUsers.isTenantAdmin} THEN 'Admin' ELSE 'User' END`,
          status: sql`CASE WHEN ${tenantUsers.isActive} THEN 'Active' ELSE 'Inactive' END`,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          createdAt: tenantUsers.createdAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Generate CSV content
      const headers = ['Name', 'Email', 'Role', 'Status', 'Onboarding Completed', 'Created At'];
      const csvContent = [
        headers.join(','),
        ...users.map(user => [
          user.name || '',
          user.email,
          user.role,
          user.status,
          user.onboardingCompleted ? 'Yes' : 'No',
          user.createdAt.toISOString().split('T')[0]
        ].join(','))
      ].join('\n');

      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', 'attachment; filename="users-export.csv"');
      
      return csvContent;
    } catch (error) {
      request.log.error('Error exporting users:', error);
      return reply.code(500).send({ error: 'Failed to export users' });
    }
  });
} 