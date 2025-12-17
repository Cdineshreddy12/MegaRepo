import { eq, and, desc, count, ne } from 'drizzle-orm';
import { db } from '../db/index.js';
import {
  tenants,
  tenantInvitations,
  subscriptions,
  tenantUsers,
  customRoles,
  userRoleAssignments,
  organizationMemberships,
  entities
} from '../db/schema/index.js';
import { v4 as uuidv4 } from 'uuid';
import { kindeService as KindeService } from '../features/auth/index.js';
import EmailService from '../utils/email.js';
import { SubscriptionService } from '../features/subscriptions/index.js';
import { sql } from 'drizzle-orm';
import { inArray } from 'drizzle-orm';
import { crmSyncStreams } from '../utils/redis.js';

export class TenantService {
  // Create a new tenant
  static async createTenant(data) {
    const tenantId = uuidv4();
    const adminUserId = uuidv4();
    
    try {
      const result = await db.transaction(async (tx) => {
        // 1. Create tenant
        const [tenant] = await tx.insert(tenants).values({
          tenantId,
          companyName: data.companyName,
          subdomain: data.subdomain,
          kindeOrgId: data.kindeOrgId,
          adminEmail: data.adminEmail,
          companySize: data.companySize,
          industry: data.industry,
          timezone: data.timezone || 'UTC',
          country: data.country,
          onboardedAt: new Date(),
        }).returning();

        // 2. Create admin user with Kinde ID (must be provided)
        if (!data.kindeUserId) {
          throw new Error('kindeUserId is required for tenant creation');
        }

        const [adminUser] = await tx.insert(tenantUsers).values({
          userId: adminUserId,
          tenantId,
          kindeUserId: data.kindeUserId,
          email: data.adminEmail,
          name: `${data.adminFirstName} ${data.adminLastName}`,
          isVerified: true,
          isActive: true,
          isTenantAdmin: true,
          onboardingCompleted: false,
        }).returning();

        // 3. Create default admin role with proper createdBy reference
        const [adminRole] = await tx.insert(customRoles).values({
          tenantId,
          roleName: 'Administrator',
          description: 'Full access to all features and settings',
          permissions: this.getDefaultAdminPermissions(),
          restrictions: {},
          isSystemRole: true,
          isDefault: true,
          priority: 100,
          createdBy: adminUserId,
        }).returning();

        // 4. Assign admin role to admin user
        await tx.insert(userRoleAssignments).values({
          userId: adminUserId,
          roleId: adminRole.roleId,
          assignedBy: adminUserId, // Self-assigned during setup
        });

        return { tenant, adminRole, adminUser };
      });

      // 5. Create default subscription (trial) after transaction commits
      await SubscriptionService.createTrialSubscription(tenantId);

      return result;
    } catch (error) {
      console.error('Failed to create tenant:', error);
      throw new Error('Tenant creation failed');
    }
  }

  // Get tenant by subdomain
  static async getBySubdomain(subdomain) {
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        isActive: tenants.isActive,
        isVerified: tenants.isVerified,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);
    
    return tenant || null;
  }

  // Get tenant by Kinde org ID
  static async getByKindeOrgId(kindeOrgId) {
    const [tenant] = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        kindeOrgId: tenants.kindeOrgId,
        adminEmail: tenants.adminEmail,
        isActive: tenants.isActive,
        isVerified: tenants.isVerified,
        createdAt: tenants.createdAt,
        updatedAt: tenants.updatedAt
      })
      .from(tenants)
      .where(eq(tenants.kindeOrgId, kindeOrgId))
      .limit(1);
    
    return tenant || null;
  }

  // Get tenant details with subscription info
  static async getTenantDetails(tenantId) {
    try {
      const [tenant] = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          kindeOrgId: tenants.kindeOrgId,
          adminEmail: tenants.adminEmail,
          isActive: tenants.isActive,
          isVerified: tenants.isVerified,
          createdAt: tenants.createdAt,
          updatedAt: tenants.updatedAt,
          // Company Information
          legalCompanyName: tenants.legalCompanyName,
          logoUrl: tenants.logoUrl,
          companyType: tenants.companyType,
          industry: tenants.industry,
          website: tenants.website,
          organizationSize: tenants.organizationSize,
          // Contact Details
          billingEmail: tenants.billingEmail,
          supportEmail: tenants.supportEmail,
          contactSalutation: tenants.contactSalutation,
          contactMiddleName: tenants.contactMiddleName,
          contactDepartment: tenants.contactDepartment,
          contactJobTitle: tenants.contactJobTitle,
          contactDirectPhone: tenants.contactDirectPhone,
          contactMobilePhone: tenants.contactMobilePhone,
          contactPreferredContactMethod: tenants.contactPreferredContactMethod,
          contactAuthorityLevel: tenants.contactAuthorityLevel,
          preferredContactMethod: tenants.preferredContactMethod,
          phone: tenants.phone,
          // Mailing Address
          mailingAddressSameAsRegistered: tenants.mailingAddressSameAsRegistered,
          mailingStreet: tenants.mailingStreet,
          mailingCity: tenants.mailingCity,
          mailingState: tenants.mailingState,
          mailingZip: tenants.mailingZip,
          mailingCountry: tenants.mailingCountry,
          // Billing Address
          billingStreet: tenants.billingStreet,
          billingCity: tenants.billingCity,
          billingState: tenants.billingState,
          billingZip: tenants.billingZip,
          billingCountry: tenants.billingCountry,
          // Banking & Financial Information
          bankName: tenants.bankName,
          bankBranch: tenants.bankBranch,
          accountHolderName: tenants.accountHolderName,
          accountNumber: tenants.accountNumber,
          accountType: tenants.accountType,
          bankAccountCurrency: tenants.bankAccountCurrency,
          swiftBicCode: tenants.swiftBicCode,
          iban: tenants.iban,
          routingNumberUs: tenants.routingNumberUs,
          sortCodeUk: tenants.sortCodeUk,
          ifscCodeIndia: tenants.ifscCodeIndia,
          bsbNumberAustralia: tenants.bsbNumberAustralia,
          paymentTerms: tenants.paymentTerms,
          creditLimit: tenants.creditLimit,
          preferredPaymentMethod: tenants.preferredPaymentMethod,
          // Tax & Compliance
          taxRegistered: tenants.taxRegistered,
          vatGstRegistered: tenants.vatGstRegistered,
          gstin: tenants.gstin,
          taxRegistrationDetails: tenants.taxRegistrationDetails,
          taxResidenceCountry: tenants.taxResidenceCountry,
          taxExemptStatus: tenants.taxExemptStatus,
          taxExemptionCertificateNumber: tenants.taxExemptionCertificateNumber,
          taxExemptionExpiryDate: tenants.taxExemptionExpiryDate,
          withholdingTaxApplicable: tenants.withholdingTaxApplicable,
          withholdingTaxRate: tenants.withholdingTaxRate,
          taxTreatyCountry: tenants.taxTreatyCountry,
          w9StatusUs: tenants.w9StatusUs,
          w8FormTypeUs: tenants.w8FormTypeUs,
          reverseChargeMechanism: tenants.reverseChargeMechanism,
          vatGstRateApplicable: tenants.vatGstRateApplicable,
          regulatoryComplianceStatus: tenants.regulatoryComplianceStatus,
          industrySpecificLicenses: tenants.industrySpecificLicenses,
          dataProtectionRegistration: tenants.dataProtectionRegistration,
          professionalIndemnityInsurance: tenants.professionalIndemnityInsurance,
          insurancePolicyNumber: tenants.insurancePolicyNumber,
          insuranceExpiryDate: tenants.insuranceExpiryDate,
          // Localization
          defaultLanguage: tenants.defaultLanguage,
          defaultLocale: tenants.defaultLocale,
          defaultCurrency: tenants.defaultCurrency,
          defaultTimeZone: tenants.defaultTimeZone,
          fiscalYearStartMonth: tenants.fiscalYearStartMonth,
          fiscalYearEndMonth: tenants.fiscalYearEndMonth,
          fiscalYearStartDay: tenants.fiscalYearStartDay,
          fiscalYearEndDay: tenants.fiscalYearEndDay,
          // Branding
          primaryColor: tenants.primaryColor,
          customDomain: tenants.customDomain,
          brandingConfig: tenants.brandingConfig,
          // Settings
          settings: tenants.settings
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Get subscription info
      let subscription = null;
      try {
        subscription = await SubscriptionService.getCurrentSubscription(tenantId);
      } catch (error) {
        console.warn('Could not fetch subscription for tenant:', tenantId);
      }

      // Get user count
      const userCount = await db
        .select({ count: count() })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId));

      // Get admin user
      const [adminUser] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ))
        .limit(1);

      return {
        ...tenant,
        subscription,
        userCount: userCount[0]?.count || 0,
        adminUser: adminUser || null,
        isFullyOnboarded: tenant.onboardedAt && adminUser?.onboardingCompleted,
        subscriptionStatus: subscription?.status || 'none'
      };
    } catch (error) {
      console.error('Error getting tenant details:', error);
      throw error;
    }
  }

  // Check if organization needs onboarding completion
  static async getOnboardingStatus(tenantId) {
    try {
      const tenant = await this.getTenantDetails(tenantId);
      
      const needsOnboarding = !tenant.isFullyOnboarded;
      const hasSubscription = tenant.subscription && tenant.subscription.status !== 'none';
      
      return {
        needsOnboarding,
        hasSubscription,
        onboardedAt: tenant.onboardedAt,
        subscriptionStatus: tenant.subscriptionStatus,
        currentPlan: tenant.subscription?.plan || 'none',
        userCount: tenant.userCount,
        canCreateSubscription: !needsOnboarding,
        adminUser: tenant.adminUser
      };
    } catch (error) {
      console.error('Error getting onboarding status:', error);
      throw error;
    }
  }

  // Update tenant onboarding completion
  static async markOnboardingComplete(tenantId, userId) {
    try {
      // Mark tenant as onboarded
      await db
        .update(tenants)
        .set({
          onboardedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Mark user onboarding as complete
      await db
        .update(tenantUsers)
        .set({
          onboardingCompleted: true,
          onboardingStep: 'completed',
          updatedAt: new Date()
        })
        .where(eq(tenantUsers.userId, userId));

      return {
        success: true,
        completedAt: new Date(),
        message: 'Onboarding completed successfully'
      };
    } catch (error) {
      console.error('Error marking onboarding complete:', error);
      throw error;
    }
  }

  // Update tenant settings
  static async updateTenant(tenantId, updates) {
    const [updated] = await db
      .update(tenants)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    return updated;
  }

  // Invite user to tenant
  static async inviteUser(data) {
    const invitationToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
      // Check if user already exists
      const existingUser = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, data.tenantId),
          eq(tenantUsers.email, data.email)
        ))
        .limit(1);

      if (existingUser.length > 0) {
        throw new Error('User is already a member of this organization');
      }

      // Normalize multi-entity payload if present
      let invitationScope = 'tenant';
      let targetEntities = [];
      let primaryEntityId = null;

      if (Array.isArray(data.entities) && data.entities.length > 0) {
        invitationScope = 'multi-entity';
        targetEntities = data.entities
          .filter(entity => entity?.entityId)
          .map(entity => ({
            entityId: entity.entityId,
            roleId: entity.roleId || null,
            entityType: entity.entityType || null,
            membershipType: entity.membershipType || 'direct'
          }));

        primaryEntityId = data.primaryEntityId || targetEntities[0]?.entityId || null;
      } else if (data.primaryEntityId) {
        invitationScope = 'organization';
        primaryEntityId = data.primaryEntityId;
      } else if (data.roleId) {
        invitationScope = 'tenant';
      }

      // Create invitation
      const [invitation] = await db.insert(tenantInvitations).values({
        tenantId: data.tenantId,
        email: data.email,
        roleId: data.roleId,
        invitedBy: data.invitedBy,
        invitationToken,
        expiresAt,
        invitationScope,
        primaryEntityId,
        targetEntities,
        updatedAt: new Date()
      }).returning();

      // Get tenant and role details for email
      const tenant = await this.getTenantDetails(data.tenantId);
      const [role] = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.roleId, data.roleId))
        .limit(1);

      // Get inviter's name
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, data.invitedBy))
        .limit(1);

      // Send invitation email
      console.log(`📧 Preparing to send invitation email to ${data.email}`);
      try {
        const roleName = Array.isArray(targetEntities) && targetEntities.length > 0
          ? 'Multi-entity Member'
          : role?.roleName || 'Team Member';

        // Get organization and location names for the email
        let organizations = [];
        let locations = [];

        if (Array.isArray(targetEntities) && targetEntities.length > 0) {
          for (const entity of targetEntities) {
            if (entity.entityId) {
              const [entityRecord] = await db
                .select({
                  entityId: entities.entityId,
                  entityName: entities.entityName,
                  entityType: entities.entityType
                })
                .from(entities)
                .where(eq(entities.entityId, entity.entityId))
                .limit(1);

              if (entityRecord) {
                if (entityRecord.entityType === 'organization') {
                  organizations.push(entityRecord.entityName);
                } else if (entityRecord.entityType === 'location') {
                  locations.push(entityRecord.entityName);
                }
              }
            }
          }
        } else if (primaryEntityId) {
          // For single-entity invitations, get the entity name
          const [entityRecord] = await db
            .select({
              entityName: entities.entityName,
              entityType: entities.entityType
            })
            .from(entities)
            .where(eq(entities.entityId, primaryEntityId))
            .limit(1);

          if (entityRecord) {
            if (entityRecord.entityType === 'organization') {
              organizations.push(entityRecord.entityName);
            } else if (entityRecord.entityType === 'location') {
              locations.push(entityRecord.entityName);
            }
          }
        }

        console.log(`📧 Email details:`, {
          email: data.email,
          tenantName: tenant.companyName,
          roleName,
          invitationToken: invitationToken.substring(0, 8) + '...',
          invitedByName: inviter?.name || 'Team Administrator',
          hasMessage: !!data.message,
          organizations: organizations.length,
          locations: locations.length,
          invitedDate: invitation.createdAt,
          expiryDate: invitation.expiresAt
        });

        const emailResult = await EmailService.sendUserInvitation({
          email: data.email,
          tenantName: tenant.companyName,
          roleName,
          invitationToken,
          invitedByName: inviter?.name || 'Team Administrator',
          message: data.message,
          invitedDate: invitation.createdAt,
          expiryDate: invitation.expiresAt,
          organizations: organizations.length > 0 ? organizations : undefined,
          locations: locations.length > 0 ? locations : undefined,
        });

        console.log(`✅ Invitation email sent successfully to ${data.email}:`, emailResult);
      } catch (emailError) {
        console.error(`❌ Failed to send invitation email to ${data.email}:`, {
          error: emailError.message,
          stack: emailError.stack,
          response: emailError.response?.data
        });

        // Don't fail the entire invitation process if email fails
        // The invitation is still created and can be resent later
        console.log(`⚠️ Invitation created but email failed. Token: ${invitationToken}`);

        // You might want to queue this for retry or notify admins
        // For now, we'll continue with the invitation creation
      }

      return invitation;
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  }

  // Accept invitation
  static async acceptInvitation(invitationToken, kindeUserId, userData) {
    try {
      return await db.transaction(async (tx) => {
        // Get invitation
        const [invitation] = await tx
          .select()
          .from(tenantInvitations)
          .where(and(
            eq(tenantInvitations.invitationToken, invitationToken),
            eq(tenantInvitations.status, 'pending')
          ))
          .limit(1);

        if (!invitation) {
          throw new Error('Invalid or expired invitation');
        }

        if (invitation.expiresAt < new Date()) {
          throw new Error('Invitation has expired');
        }

        // Create user
        const [user] = await tx.insert(tenantUsers).values({
          tenantId: invitation.tenantId,
          kindeUserId,
          email: userData.email,
          name: userData.name,
          avatar: userData.avatar,
          isVerified: true,
        }).returning();

        // Assign role if available
        if (invitation.roleId) {
          await tx.insert(userRoleAssignments).values({
            userId: user.userId,
            roleId: invitation.roleId,
            assignedBy: invitation.invitedBy,
          });
        }

        // Handle multi-entity or scoped invitations
        if (invitation.targetEntities && invitation.targetEntities.length > 0) {
          for (const entity of invitation.targetEntities) {
            if (!entity.entityId) continue;

            await tx.insert(organizationMemberships).values({
              userId: user.userId,
              tenantId: invitation.tenantId,
              entityId: entity.entityId,
              entityType: entity.entityType || 'organization',
              roleId: entity.roleId || invitation.roleId,
              membershipType: entity.membershipType || 'direct',
              membershipStatus: 'active',
              isPrimary: invitation.primaryEntityId === entity.entityId,
              canAccessSubEntities: true,
              invitedBy: invitation.invitedBy,
              invitedAt: invitation.createdAt,
              joinedAt: new Date(),
              createdBy: invitation.invitedBy,
              createdAt: new Date(),
              updatedAt: new Date()
            });

            // Assign scoped role if provided
            if (entity.roleId) {
              await tx.insert(userRoleAssignments).values({
                userId: user.userId,
                roleId: entity.roleId,
                assignedBy: invitation.invitedBy,
                organizationId: entity.entityType === 'organization' ? entity.entityId : null,
                locationId: entity.entityType === 'location' ? entity.entityId : null,
                scope: entity.entityType === 'location' ? 'location' : 'organization'
              });
            }
          }
        } else if (invitation.primaryEntityId) {
          // Legacy single-entity invitation - create membership and scoped role
          await tx.insert(organizationMemberships).values({
            userId: user.userId,
            tenantId: invitation.tenantId,
            entityId: invitation.primaryEntityId,
            entityType: 'organization',
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
          });
        }

        // Update user's primary organization if specified
        if (invitation.primaryEntityId) {
          await tx
            .update(tenantUsers)
            .set({
              primaryOrganizationId: invitation.primaryEntityId,
              updatedAt: new Date()
            })
            .where(eq(tenantUsers.userId, user.userId));

          // Publish organization assignment created event (async, don't wait)
          setImmediate(async () => {
            try {
              const { OrganizationAssignmentService } = await import('../services/organization-assignment-service.js');

              // Get organization details for event
              const [organization] = await db
                .select({
                  entityId: entities.entityId,
                  entityName: entities.entityName,
                  entityCode: entities.entityCode
                })
                .from(entities)
                .where(and(
                  eq(entities.entityId, invitation.primaryEntityId),
                  eq(entities.tenantId, invitation.tenantId)
                ))
                .limit(1);

              if (organization) {
                const assignmentData = {
                  assignmentId: `${user.userId}_${invitation.primaryEntityId}_${Date.now()}`,
                  tenantId: invitation.tenantId,
                  userId: user.userId,
                  organizationId: invitation.primaryEntityId,
                  organizationCode: organization.entityCode,
                  assignmentType: 'primary',
                  isActive: true,
                  assignedAt: new Date().toISOString(),
                  priority: 1,
                  assignedBy: invitation.invitedBy,
                  metadata: {
                    source: 'invitation_acceptance',
                    invitationId: invitation.invitationId
                  }
                };

                await OrganizationAssignmentService.publishOrgAssignmentCreated(assignmentData);
                console.log(`📡 Published organization assignment created event for user ${user.email} via invitation`);
              }
            } catch (publishError) {
              console.warn('⚠️ Failed to publish organization assignment event during invitation acceptance:', publishError.message);
            }
          });
        }

        // Update invitation status
        await tx
          .update(tenantInvitations)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
          })
          .where(eq(tenantInvitations.invitationId, invitation.invitationId));

        // Trigger Kinde organization assignment asynchronously (best effort)
        const tenant = await this.getTenantDetails(invitation.tenantId);
        if (tenant?.kindeOrgId && kindeService?.addUserToOrganization) {
          kindeService.addUserToOrganization(kindeUserId, tenant.kindeOrgId, { exclusive: true })
            .then(result => {
              if (!result?.success) {
                console.warn('⚠️ Kinde org assignment reported failure:', result?.error || result?.message);
              }
            })
            .catch(err => {
              console.warn('⚠️ Failed to assign user to Kinde organization:', err.message);
            });
        }

        // Publish user creation event to Redis streams for CRM sync
        try {
          // Split name into firstName and lastName for CRM requirements
          const nameParts = (user.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await crmSyncStreams.publishUserEvent(invitation.tenantId, 'user_created', {
            userId: user.userId,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            name: user.name || `${firstName} ${lastName}`.trim(),
            isActive: user.isActive !== undefined ? user.isActive : true,
            createdAt: user.createdAt ? (typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString()) : new Date().toISOString()
          });
          console.log('📡 Published user_created event to Redis streams');
        } catch (streamError) {
          console.warn('⚠️ Failed to publish user creation event to Redis streams:', streamError.message);
          // Don't fail the user creation if stream publishing fails
        }

        return user;
      });
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }

  // Get pending invitations
  static async getPendingInvitations(tenantId) {
    return await db
      .select({
        invitation: tenantInvitations,
        role: customRoles,
      })
      .from(tenantInvitations)
      .leftJoin(customRoles, eq(tenantInvitations.roleId, customRoles.roleId))
      .where(and(
        eq(tenantInvitations.tenantId, tenantId),
        eq(tenantInvitations.status, 'pending')
      ))
      .orderBy(desc(tenantInvitations.createdAt));
  }

  // Cancel invitation
  static async cancelInvitation(invitationId, tenantId) {
    const [updated] = await db
      .update(tenantInvitations)
      .set({ status: 'cancelled' })
      .where(and(
        eq(tenantInvitations.invitationId, invitationId),
        eq(tenantInvitations.tenantId, tenantId)
      ))
      .returning();

    return updated;
  }

  // Resend invitation email
  static async resendInvitationEmail(invitationId, tenantId) {
    try {
      // Get invitation details
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.status, 'pending')
        ))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found or not pending');
      }

      // Check if invitation has expired
      if (invitation.expiresAt < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Get tenant and role details
      const tenant = await this.getTenantDetails(tenantId);
      const [role] = await db
        .select()
        .from(customRoles)
        .where(eq(customRoles.roleId, invitation.roleId))
        .limit(1);

      // Get inviter's name
      const [inviter] = await db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, invitation.invitedBy))
        .limit(1);

      // Send invitation email
      await EmailService.sendUserInvitation({
        email: invitation.email,
        tenantName: tenant.companyName,
        roleName: role.roleName,
        invitationToken: invitation.invitationToken,
        invitedByName: inviter?.name || 'Team Administrator',
        message: invitation.message || '',
      });

      // Update invitation with new expiry (extend by 7 days)
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      await db
        .update(tenantInvitations)
        .set({ 
          expiresAt: newExpiresAt,
          updatedAt: new Date()
        })
        .where(eq(tenantInvitations.invitationId, invitationId));

      console.log(`✅ Invitation email resent successfully to ${invitation.email}`);
      return { success: true, message: 'Invitation email resent successfully' };

    } catch (error) {
      console.error('Failed to resend invitation email:', error);
      throw error;
    }
  }

  // Get default admin permissions
  static getDefaultAdminPermissions() {
    return {
      crm: {
        contacts: ['view', 'create', 'edit', 'delete', 'export', 'import'],
        deals: ['view', 'create', 'edit', 'delete', 'approve', 'reject'],
        reports: ['view', 'create', 'export', 'share', 'schedule'],
        settings: ['view', 'edit', 'manage_users'],
        dashboard: ['view', 'customize']
      },
      hr: {
        employees: ['view', 'create', 'edit', 'delete', 'view_salary'],
        payroll: ['view', 'process', 'approve', 'export'],
        documents: ['view', 'upload', 'delete', 'approve'],
        reports: ['view', 'create', 'export'],
        settings: ['view', 'edit']
      },
      affiliate: {
        partners: ['view', 'create', 'edit', 'delete', 'approve'],
        commissions: ['view', 'calculate', 'approve', 'pay', 'dispute'],
        analytics: ['view', 'export', 'create_reports'],
        settings: ['view', 'edit']
      },
      admin: {
        users: ['view', 'create', 'edit', 'delete', 'invite'],
        roles: ['view', 'create', 'edit', 'delete'],
        billing: ['view', 'manage'],
        settings: ['view', 'edit'],
        audit: ['view', 'export']
      }
    };
  }

  // Deactivate tenant
  static async deactivateTenant(tenantId, reason) {
    const [updated] = await db
      .update(tenants)
      .set({
        isActive: false,
        updatedAt: new Date(),
        settings: { deactivationReason: reason }
      })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    // Also deactivate all users
    await db
      .update(tenantUsers)
      .set({ isActive: false })
      .where(eq(tenantUsers.tenantId, tenantId));

    return updated;
  }

  // Reactivate tenant
  static async reactivateTenant(tenantId) {
    const [updated] = await db
      .update(tenants)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(tenants.tenantId, tenantId))
      .returning();

    return updated;
  }

  // Get tenant users with consolidated invitation data
  static async getTenantUsers(tenantId) {
    try {
      console.log('🔍 Getting users for tenant:', tenantId);
      
      // Get active users
      const activeUsers = await db
        .select({
          userId: tenantUsers.userId,
          tenantId: tenantUsers.tenantId,
          kindeUserId: tenantUsers.kindeUserId,
          email: tenantUsers.email,
          name: tenantUsers.name,
          avatar: tenantUsers.avatar,
          title: tenantUsers.title,
          department: tenantUsers.department,
          isActive: tenantUsers.isActive,
          isVerified: tenantUsers.isVerified,
          isTenantAdmin: tenantUsers.isTenantAdmin,
          invitedAt: tenantUsers.invitedAt,
          lastActiveAt: tenantUsers.lastActiveAt,
          lastLoginAt: tenantUsers.lastLoginAt,
          loginCount: tenantUsers.loginCount,
          preferences: tenantUsers.preferences,
          onboardingCompleted: tenantUsers.onboardingCompleted,
          onboardingStep: tenantUsers.onboardingStep,
          createdAt: tenantUsers.createdAt,
          updatedAt: tenantUsers.updatedAt
        })
        .from(tenantUsers)
        .where(eq(tenantUsers.tenantId, tenantId))
        .orderBy(desc(tenantUsers.createdAt));

      // Get pending invitations
      const pendingInvitations = await db
        .select({
          invitationId: tenantInvitations.invitationId,
          tenantId: tenantInvitations.tenantId,
          email: tenantInvitations.email,
          roleId: tenantInvitations.roleId,
          invitedBy: tenantInvitations.invitedBy,
          invitationToken: tenantInvitations.invitationToken,
          invitationUrl: tenantInvitations.invitationUrl,
          status: tenantInvitations.status,
          expiresAt: tenantInvitations.expiresAt,
          acceptedAt: tenantInvitations.acceptedAt,
          cancelledAt: tenantInvitations.cancelledAt,
          cancelledBy: tenantInvitations.cancelledBy,
          createdAt: tenantInvitations.createdAt,
          updatedAt: tenantInvitations.updatedAt
        })
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.tenantId, tenantId),
          eq(tenantInvitations.status, 'pending')
        ))
        .orderBy(desc(tenantInvitations.createdAt));

      // Get user role assignments
      const userIds = activeUsers.map(u => u.userId).filter(Boolean);
      const userRoleData = userIds.length > 0 ? await db
        .select({
          userId: userRoleAssignments.userId,
          roleId: userRoleAssignments.roleId,
          assignedAt: userRoleAssignments.assignedAt
        })
        .from(userRoleAssignments)
        .where(and(
          inArray(userRoleAssignments.userId, userIds),
          eq(userRoleAssignments.isActive, true)
        )) : [];

      // Get roles for users and invitations
      const roleIds = [
        ...(userRoleData || []).filter(ur => ur && ur.roleId).map(ur => ur.roleId),
        ...(pendingInvitations || []).filter(i => i && i.roleId).map(i => i.roleId)
      ].filter(Boolean);

      const roles = roleIds.length > 0 ? await db
        .select({
          roleId: customRoles.roleId,
          roleName: customRoles.roleName,
          description: customRoles.description,
          color: customRoles.color
        })
        .from(customRoles)
        .where(inArray(customRoles.roleId, roleIds)) : [];

      const roleMap = new Map((roles || []).filter(r => r && r.roleId).map(r => [r.roleId, r]));
      const userRoleMap = new Map((userRoleData || []).filter(ur => ur && ur.userId && ur.roleId).map(ur => [ur.userId, ur.roleId]));

      // Format active users
      const formattedUsers = activeUsers.map(user => {
        if (!user || !user.userId || !user.email) {
          return null;
        }

        const userRoleId = userRoleMap.get(user.userId);
        const role = userRoleId ? roleMap.get(userRoleId) : null;
        return {
          id: user.userId,
          email: user.email,
          firstName: user.name?.split(' ')[0] || user.email.split('@')[0],
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          role: role?.roleName || 'No role assigned',
          isActive: user.isActive !== false, // Default to true if undefined
          invitationStatus: 'active',
          invitedAt: user.invitedAt || user.createdAt,
          expiresAt: null,
          lastActiveAt: user.lastActiveAt,
          invitationId: null,
          status: 'active',
          userType: 'active',
          originalData: {
            user: {
              userId: user.userId,
              tenantId: user.tenantId,
              kindeUserId: user.kindeUserId,
              email: user.email,
              name: user.name,
              avatar: user.avatar,
              title: user.title,
              department: user.department,
              isActive: user.isActive,
              isVerified: user.isVerified,
              isTenantAdmin: user.isTenantAdmin,
              invitedAt: user.invitedAt,
              lastActiveAt: user.lastActiveAt,
              lastLoginAt: user.lastLoginAt,
              loginCount: user.loginCount,
              preferences: user.preferences,
              onboardingCompleted: user.onboardingCompleted,
              onboardingStep: user.onboardingStep,
              createdAt: user.createdAt,
              updatedAt: user.updatedAt
            },
            role: role
          }
        };
      }).filter(user => user !== null);

      // Format pending invitations
      const formattedInvitations = pendingInvitations.map(invitation => {
        if (!invitation || !invitation.invitationId || !invitation.email) {
          return null;
        }

        const role = invitation.roleId ? roleMap.get(invitation.roleId) : null;
        return {
          id: `inv_${invitation.invitationId}`,
          email: invitation.email,
          firstName: invitation.email.split('@')[0],
          lastName: '',
          role: role?.roleName || 'No role assigned',
          isActive: false,
          invitationStatus: 'pending',
          invitedAt: invitation.createdAt,
          expiresAt: invitation.expiresAt,
          lastActiveAt: null,
          invitationId: invitation.invitationId,
          status: 'pending',
          userType: 'invited',
          originalData: {
            user: {
              invitationId: invitation.invitationId,
              tenantId: invitation.tenantId,
              email: invitation.email,
              roleId: invitation.roleId,
              invitedBy: invitation.invitedBy,
              invitationToken: invitation.invitationToken,
              invitationUrl: invitation.invitationUrl,
              status: invitation.status,
              expiresAt: invitation.expiresAt,
              acceptedAt: invitation.acceptedAt,
              cancelledAt: invitation.cancelledAt,
              cancelledBy: invitation.cancelledBy,
              createdAt: invitation.createdAt,
              updatedAt: invitation.updatedAt
            },
            role: role
          }
        };
      }).filter(invitation => invitation !== null);

      // Combine and return
      const allUsers = [...formattedUsers, ...formattedInvitations];
      
      console.log(`✅ Found ${formattedUsers.length} active users and ${formattedInvitations.length} pending invitations`);
      
      return allUsers;
    } catch (error) {
      console.error('❌ Error getting tenant users:', error);
      throw error;
    }
  }

  // Get users filtered by entity (organization/location/department)
  static async getTenantUsersByEntity(tenantId, entityId) {
    try {
      console.log('🔍 Getting users for tenant and entity:', { tenantId, entityId });

      // If no entityId provided, return all users
      if (!entityId) {
        console.log('📋 No entityId provided, returning all tenant users');
        return await this.getTenantUsers(tenantId);
      }

      // Get all child entities for hierarchical filtering
      const childEntities = await this.getEntityChildren(entityId);
      const allRelevantEntities = new Set([entityId, ...childEntities]);

      console.log('📋 Entity hierarchy:', {
        entityId,
        childEntities: Array.from(childEntities),
        totalRelevantEntities: allRelevantEntities.size
      });

      // Try to get users through organization memberships
      let entityUserIds = new Set();

      try {
        const memberships = await db
          .select({
            userId: organizationMemberships.userId,
            entityId: organizationMemberships.entityId,
            membershipStatus: organizationMemberships.membershipStatus,
            canAccessSubEntities: organizationMemberships.canAccessSubEntities
          })
          .from(organizationMemberships)
          .where(and(
            eq(organizationMemberships.tenantId, tenantId),
            eq(organizationMemberships.membershipStatus, 'active'),
            inArray(organizationMemberships.entityId, Array.from(allRelevantEntities))
          ));

        console.log(`📋 Found ${memberships.length} organization memberships for entity hierarchy`);

        // Collect user IDs from memberships
        memberships.forEach(membership => {
          entityUserIds.add(membership.userId);
        });

      } catch (membershipError) {
        console.warn('⚠️ Could not query organization memberships:', membershipError.message);
        console.log('🔄 Falling back to alternative entity-user association methods');
      }

      // If no users found through memberships, try alternative approaches
      if (entityUserIds.size === 0) {
        console.log('📋 No users found through organization memberships, trying alternative methods');

        // Method 1: Check if users have this entity as their primary organization
        try {
          const primaryOrgUsers = await db
            .select({ userId: tenantUsers.userId })
            .from(tenantUsers)
            .where(and(
              eq(tenantUsers.tenantId, tenantId),
              eq(tenantUsers.primaryOrganizationId, entityId)
            ));

          primaryOrgUsers.forEach(user => entityUserIds.add(user.userId));
          console.log(`📋 Found ${primaryOrgUsers.length} users with this entity as primary organization`);
        } catch (primaryError) {
          console.warn('⚠️ Could not check primary organizations:', primaryError.message);
        }

        // Method 2: Check tenant invitations that target this entity
        try {
          const invitationUsers = await db
            .select({ invitedBy: tenantInvitations.invitedBy })
            .from(tenantInvitations)
            .where(and(
              eq(tenantInvitations.tenantId, tenantId),
              sql`${tenantInvitations.targetEntities}::jsonb ? ${entityId}`
            ));

          // Add the users who were invited to this entity
          for (const invitation of invitationUsers) {
            if (invitation.invitedBy) {
              // Also add the invited users by finding them through the invitation
              const invitedUsers = await db
                .select({ userId: tenantUsers.userId })
                .from(tenantUsers)
                .where(and(
                  eq(tenantUsers.tenantId, tenantId),
                  eq(tenantUsers.email, invitation.invitedBy) // This might not be correct, but it's a fallback
                ));

              invitedUsers.forEach(user => entityUserIds.add(user.userId));
            }
          }
        } catch (invitationError) {
          console.warn('⚠️ Could not check tenant invitations:', invitationError.message);
        }
      }

      // If we still have no users, return all users as fallback
      if (entityUserIds.size === 0) {
        console.log('⚠️ No users found for entity, returning all tenant users as fallback');
        return await this.getTenantUsers(tenantId);
      }

      console.log(`📊 Found ${entityUserIds.size} users associated with entity ${entityId}`);

      // Ensure we have valid user IDs before querying
      const validUserIds = Array.from(entityUserIds).filter(id => id && typeof id === 'string');
      if (validUserIds.length === 0) {
        console.log('⚠️ No valid user IDs found for entity, returning all tenant users as fallback');
        return await this.getTenantUsers(tenantId);
      }

      console.log(`📋 Querying ${validUserIds.length} valid user IDs`);

      // Get the actual user data for these users
      let users = [];
      try {
        users = await db
          .select({
            userId: tenantUsers.userId,
            tenantId: tenantUsers.tenantId,
            kindeUserId: tenantUsers.kindeUserId,
            email: tenantUsers.email,
            name: tenantUsers.name,
            avatar: tenantUsers.avatar,
            title: tenantUsers.title,
            department: tenantUsers.department,
            isActive: tenantUsers.isActive,
            isVerified: tenantUsers.isVerified,
            isTenantAdmin: tenantUsers.isTenantAdmin,
            invitedAt: tenantUsers.invitedAt,
            lastActiveAt: tenantUsers.lastActiveAt,
            lastLoginAt: tenantUsers.lastLoginAt,
            loginCount: tenantUsers.loginCount,
            preferences: tenantUsers.preferences,
            onboardingCompleted: tenantUsers.onboardingCompleted,
            onboardingStep: tenantUsers.onboardingStep,
            createdAt: tenantUsers.createdAt,
            updatedAt: tenantUsers.updatedAt,
            primaryOrganizationId: tenantUsers.primaryOrganizationId
          })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            inArray(tenantUsers.userId, validUserIds)
          ))
          .orderBy(desc(tenantUsers.createdAt));

        console.log(`✅ Successfully retrieved ${users.length} users from database`);
      } catch (userQueryError) {
        console.error('❌ Error querying users from database:', userQueryError);
        console.log('🔄 Falling back to all tenant users');
        return await this.getTenantUsers(tenantId);
      }

      // Get roles for these users (only if we have users)
      let userRoles = [];
      if (users.length > 0) {
        const userIdsForRoles = users.map(u => u.userId).filter(id => id && typeof id === 'string');
        if (userIdsForRoles.length > 0) {
          try {
            userRoles = await db
              .select({
                userId: userRoleAssignments.userId,
                roleId: userRoleAssignments.roleId,
                roleName: customRoles.roleName,
                roleDescription: customRoles.description,
                roleColor: customRoles.color,
                roleIcon: customRoles.icon,
                rolePermissions: customRoles.permissions
              })
              .from(userRoleAssignments)
              .leftJoin(customRoles, eq(userRoleAssignments.roleId, customRoles.roleId))
              .where(inArray(userRoleAssignments.userId, userIdsForRoles));

            console.log(`✅ Successfully retrieved ${userRoles.length} role assignments from database`);
          } catch (roleQueryError) {
            console.error('❌ Error querying user roles from database:', roleQueryError);
            userRoles = [];
          }
        }
      }

      // Get pending invitations for this entity
      let pendingInvitations = [];
      try {
        pendingInvitations = await db
          .select()
          .from(tenantInvitations)
          .where(and(
            eq(tenantInvitations.tenantId, tenantId),
            eq(tenantInvitations.status, 'pending'),
            sql`${tenantInvitations.targetEntities}::jsonb ? ${entityId}`
          ));

        console.log(`✅ Successfully retrieved ${pendingInvitations.length} pending invitations from database`);
      } catch (invitationQueryError) {
        console.error('❌ Error querying pending invitations from database:', invitationQueryError);
        pendingInvitations = [];
      }

      // Create role map
      const roleMap = new Map();
      try {
        (userRoles || []).forEach(ur => {
          if (ur && ur.roleId) {
            roleMap.set(ur.roleId, {
              roleId: ur.roleId,
              roleName: ur.roleName || 'Unknown Role',
              description: ur.roleDescription || '',
              color: ur.roleColor || '#6b7280',
              icon: ur.roleIcon || 'User',
              permissions: ur.rolePermissions || {}
            });
          }
        });
        console.log(`✅ Successfully created role map with ${roleMap.size} roles`);
      } catch (roleMapError) {
        console.error('❌ Error creating role map:', roleMapError);
      }

      // Create user-role map
      const userRoleIdMap = new Map();
      try {
        (userRoles || []).forEach(ur => {
          if (ur && ur.userId && ur.roleId) {
            userRoleIdMap.set(ur.userId, ur.roleId);
          }
        });
        console.log(`✅ Successfully created user-role map with ${userRoleIdMap.size} mappings`);
      } catch (userRoleMapError) {
        console.error('❌ Error creating user-role map:', userRoleMapError);
      }

      // Format users
      const formattedUsers = users.map(user => {
        if (!user || !user.userId || !user.email) {
          return null;
        }

        const userRoleId = userRoleIdMap.get(user.userId);
        const role = userRoleId ? roleMap.get(userRoleId) : null;

        return {
          id: user.userId,
          email: user.email,
          firstName: user.name?.split(' ')[0] || user.email.split('@')[0],
          lastName: user.name?.split(' ').slice(1).join(' ') || '',
          role: role?.roleName || '',
          isActive: user.isActive !== false, // Default to true if undefined
          invitationStatus: 'active',
          invitedAt: user.invitedAt,
          expiresAt: null,
          lastActiveAt: user.lastActiveAt,
          invitationId: null,
          status: 'active',
          userType: 'active',
          originalData: {
            user: user,
            role: role
          }
        };
      }).filter(user => user !== null);

      // Format pending invitations
      let formattedInvitations = [];
      try {
        formattedInvitations = pendingInvitations.map(invitation => {
          if (!invitation || !invitation.invitationId || !invitation.email) {
            return null;
          }

          const role = invitation.roleId ? roleMap.get(invitation.roleId) : null;
          return {
            id: `inv_${invitation.invitationId}`,
            email: invitation.email,
            firstName: invitation.email.split('@')[0],
            lastName: '',
            role: role?.roleName || 'Member',
            isActive: false,
            invitationStatus: 'pending',
            invitedAt: invitation.createdAt,
            expiresAt: invitation.expiresAt,
            lastActiveAt: null,
            invitationId: invitation.invitationId,
            status: 'pending',
            userType: 'invited',
            originalData: {
              invitation: invitation,
              role: role
            }
          };
        }).filter(invitation => invitation !== null);

        console.log(`✅ Successfully formatted ${formattedInvitations.length} invitations`);
      } catch (invitationFormatError) {
        console.error('❌ Error formatting invitations:', invitationFormatError);
        formattedInvitations = [];
      }

      // Combine and return
      let allUsers = [];
      try {
        allUsers = [...formattedUsers, ...formattedInvitations];
        console.log(`✅ Found ${formattedUsers.length} active users and ${formattedInvitations.length} pending invitations for entity ${entityId}`);
        console.log(`✅ Successfully combined all users: ${allUsers.length} total`);
      } catch (combineError) {
        console.error('❌ Error combining formatted users and invitations:', combineError);
        // Return just the formatted users if combining fails
        allUsers = formattedUsers;
      }

      return allUsers;
    } catch (error) {
      console.error('❌ Error getting tenant users by entity:', error);
      throw error;
    }
  }

  // Helper method to get child entities
  static async getEntityChildren(entityId) {
    try {
      const children = new Set();

      // Get direct children
      const directChildren = await db
        .select({ entityId: entities.entityId })
        .from(entities)
        .where(eq(entities.parentEntityId, entityId));

      // Add direct children
      directChildren.forEach(child => children.add(child.entityId));

      // Recursively get children of children (simplified - only one level deep for now)
      for (const child of directChildren) {
        const grandChildren = await db
          .select({ entityId: entities.entityId })
          .from(entities)
          .where(eq(entities.parentEntityId, child.entityId));

        grandChildren.forEach(gc => children.add(gc.entityId));
      }

      return children;
    } catch (error) {
      console.error('❌ Error getting entity children:', error);
      return new Set();
    }
  }

  // Unified user operations
  static async deleteUser(userId, tenantId) {
    // Check if this is an invited user (starts with 'inv_')
    if (userId.startsWith('inv_')) {
      const invitationId = userId.replace('inv_', '');
      return await this.cancelInvitation(tenantId, invitationId);
    } else {
      return await this.removeActiveUser(userId, tenantId);
    }
  }

  // Remove user from tenant (including invitation cancellation)
  static async removeUser(tenantId, userId, removedBy) {
    try {
      console.log('🗑️ Removing user from tenant:', { tenantId, userId, removedBy });
      
      // Check if this is an invitation ID (prefixed with 'inv_')
      if (typeof userId === 'string' && userId.startsWith('inv_')) {
        // This is an invitation ID, check if we should cancel or handle accepted invitation
        const invitationId = userId.substring(4); // Remove 'inv_' prefix
        console.log('📧 Detected invitation ID:', invitationId);

        // Check invitation status
        const [invitation] = await db
          .select()
          .from(tenantInvitations)
          .where(and(
            eq(tenantInvitations.invitationId, invitationId),
            eq(tenantInvitations.tenantId, tenantId)
          ))
          .limit(1);

        if (invitation) {
          if (invitation.status === 'pending') {
            // Cancel pending invitation
            console.log('📧 Cancelling pending invitation');
            return await this.cancelInvitation(tenantId, invitationId, removedBy);
          } else if (invitation.status === 'accepted') {
            // Invitation was already accepted - remove the user instead
            console.log('📧 Invitation already accepted, removing user instead');

            // Find the user that was created from this invitation
            // We can match by email since invitations are unique per email
            const [user] = await db
              .select()
              .from(tenantUsers)
              .where(and(
                eq(tenantUsers.tenantId, tenantId),
                eq(tenantUsers.email, invitation.email)
              ))
              .limit(1);

            if (user) {
              console.log('👤 Found user from accepted invitation, removing user:', user.userId);
              // Remove the user (this will be handled by the regular user removal logic below)
              userId = user.userId;
            } else {
              throw new Error('User from accepted invitation not found');
            }
          } else {
            throw new Error(`Cannot remove user from invitation with status: ${invitation.status}`);
          }
        } else {
          throw new Error('Invitation not found');
        }
      }
      
      // Check if user exists in tenant
      const [user] = await db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1);

      if (!user) {
        throw new Error('User not found in this tenant');
      }

      // Check if user is the last admin
      if (user.isTenantAdmin) {
        const adminCount = await db
          .select({ count: count() })
          .from(tenantUsers)
          .where(and(
            eq(tenantUsers.tenantId, tenantId),
            eq(tenantUsers.isTenantAdmin, true),
            eq(tenantUsers.isActive, true)
          ));
        
        if (adminCount[0].count <= 1) {
          throw new Error('Cannot remove the last admin user from the tenant');
        }
      }

      // Start transaction
      const result = await db.transaction(async (tx) => {
        // 1. Remove user role assignments
        await tx
          .delete(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, userId));

        // 2. Remove responsible person assignments (where user is the responsible person)
        try {
          const { responsiblePersons } = await import('../db/schema/responsible_persons.js');
          const deletedAssignments = await tx
            .delete(responsiblePersons)
            .where(eq(responsiblePersons.userId, userId))
            .returning();
          console.log(`✅ Removed ${deletedAssignments.length} responsible person assignments`);
        } catch (rpError) {
          console.warn('⚠️ Error removing responsible person assignments:', rpError.message);
          // Continue even if this fails - might not exist
        }

        // 3. Handle responsible person assignments where user is the assigner (assignedBy)
        // Set assignedBy to another admin user if possible, otherwise delete the assignments
        try {
          const { responsiblePersons, responsibilityHistory } = await import('../db/schema/responsible_persons.js');
          // Find another admin user in the tenant to reassign
          const [replacementAdmin] = await tx
            .select({ userId: tenantUsers.userId })
            .from(tenantUsers)
            .where(and(
              eq(tenantUsers.tenantId, tenantId),
              eq(tenantUsers.isTenantAdmin, true),
              eq(tenantUsers.isActive, true),
              ne(tenantUsers.userId, userId) // Not the user being deleted
            ))
            .limit(1);

          if (replacementAdmin) {
            const updatedAssignments = await tx
              .update(responsiblePersons)
              .set({ assignedBy: replacementAdmin.userId })
              .where(eq(responsiblePersons.assignedBy, userId))
              .returning();
            console.log(`✅ Reassigned ${updatedAssignments.length} responsible person assignments to admin`);
            
            // Also update responsibility history where user is the changer
            const updatedHistory = await tx
              .update(responsibilityHistory)
              .set({ changedBy: replacementAdmin.userId })
              .where(eq(responsibilityHistory.changedBy, userId))
              .returning();
            console.log(`✅ Reassigned ${updatedHistory.length} responsibility history records to admin`);
          } else {
            // If no replacement admin, delete these assignments
            const deletedAssignments = await tx
              .delete(responsiblePersons)
              .where(eq(responsiblePersons.assignedBy, userId))
              .returning();
            console.log(`✅ Deleted ${deletedAssignments.length} responsible person assignments (no replacement admin)`);
            
            // Delete responsibility history records where user is the changer
            const deletedHistory = await tx
              .delete(responsibilityHistory)
              .where(eq(responsibilityHistory.changedBy, userId))
              .returning();
            console.log(`✅ Deleted ${deletedHistory.length} responsibility history records`);
          }
        } catch (rpError) {
          console.warn('⚠️ Error handling responsible person assignments:', rpError.message);
          // Continue even if this fails
        }

        // 4. Cancel any pending invitations for this user
        await tx
          .update(tenantInvitations)
          .set({
            status: 'cancelled',
            cancelledAt: new Date(),
            cancelledBy: removedBy
          })
          .where(and(
            eq(tenantInvitations.tenantId, tenantId),
            eq(tenantInvitations.email, user.email),
            eq(tenantInvitations.status, 'pending')
          ));

        // 5. Publish user deletion event to Redis streams before deletion
        try {
          // Split name into firstName and lastName for CRM requirements
          const nameParts = (user.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          await crmSyncStreams.publishUserEvent(tenantId, 'user_deleted', {
            userId: user.userId,
            email: user.email,
            firstName: firstName,
            lastName: lastName,
            name: user.name || `${firstName} ${lastName}`.trim(),
            deletedAt: new Date().toISOString(),
            deletedBy: removedBy,
            reason: 'user_removed_from_tenant'
          });
          console.log('📡 Published user_deleted event to Redis streams');
        } catch (streamError) {
          console.warn('⚠️ Failed to publish user deletion event to Redis streams:', streamError.message);
          // Continue with user deletion even if stream publishing fails
        }

        // 6. Remove the user from tenant_users
        await tx
          .delete(tenantUsers)
          .where(and(
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.tenantId, tenantId)
          ));

        return { success: true, message: 'User removed successfully' };
      });

      console.log('✅ User removed successfully:', { userId, tenantId });
      return result;
    } catch (error) {
      console.error('❌ Error removing user:', error);
      throw error;
    }
  }

  // Cancel invitation
  static async cancelInvitation(tenantId, invitationId, cancelledBy) {
    try {
      console.log('❌ Cancelling invitation:', { tenantId, invitationId, cancelledBy });
      
      // Check if invitation exists and belongs to tenant
      const [invitation] = await db
        .select()
        .from(tenantInvitations)
        .where(and(
          eq(tenantInvitations.invitationId, invitationId),
          eq(tenantInvitations.tenantId, tenantId)
        ))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error('Can only cancel pending invitations');
      }

      // Cancel the invitation
      await db
        .update(tenantInvitations)
        .set({
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: cancelledBy
        })
        .where(eq(tenantInvitations.invitationId, invitationId));

      console.log('✅ Invitation cancelled successfully:', { invitationId, tenantId });
      return { success: true, message: 'Invitation cancelled successfully' };
    } catch (error) {
      console.error('❌ Error cancelling invitation:', error);
      throw error;
    }
  }

  // Remove active user
  static async removeActiveUser(userId, tenantId) {
    try {
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
        throw new Error('User not found');
      }

      // Publish user deactivation event to Redis streams
      try {
        const { crmSyncStreams } = await import('../utils/redis.js');
        // Split name into firstName and lastName for CRM requirements
        const nameParts = (updatedUser.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        await crmSyncStreams.publishUserEvent(tenantId, 'user_deactivated', {
          userId: updatedUser.userId,
          email: updatedUser.email,
          firstName: firstName,
          lastName: lastName,
          name: updatedUser.name || `${firstName} ${lastName}`.trim(),
          deactivatedAt: new Date().toISOString(),
          deactivatedBy: null, // System-initiated deactivation
          reason: 'user_deactivated'
        });
        console.log('📡 Published user_deactivated event to Redis streams');
      } catch (publishError) {
        console.warn('⚠️ Failed to publish user_deactivated event:', publishError.message);
        // Don't fail the operation if event publishing fails
      }

      return {
        success: true,
        message: 'User removed successfully',
        data: updatedUser
      };
    } catch (error) {
      console.error('Error removing user:', error);
      throw error;
    }
  }

  // Update user role (works for both user types)
  static async updateUserRole(userId, roleId, tenantId) {
    try {
      if (userId.startsWith('inv_')) {
        // Update invitation role
        const invitationId = userId.replace('inv_', '');
        const [updatedInvitation] = await db
          .update(tenantInvitations)
          .set({ 
            roleId: roleId,
            updatedAt: new Date()
          })
          .where(and(
            eq(tenantInvitations.invitationId, invitationId),
            eq(tenantInvitations.tenantId, tenantId)
          ))
          .returning();

        if (!updatedInvitation) {
          throw new Error('Invitation not found');
        }

        return {
          success: true,
          message: 'Invitation role updated successfully',
          data: updatedInvitation
        };
      } else {
        // Update active user role
        // First remove existing role assignments and publish unassignment events
        const existingAssignments = await db
          .select({
            id: userRoleAssignments.id,
            roleId: userRoleAssignments.roleId,
            assignedAt: userRoleAssignments.assignedAt
          })
          .from(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, userId));

        // Publish role unassignment events for removed roles
        for (const assignment of existingAssignments) {
          try {
            await crmSyncStreams.publishRoleEvent(tenantId, 'role_unassigned', {
              assignmentId: assignment.id,
              userId: userId,
              roleId: assignment.roleId,
              unassignedAt: new Date().toISOString(),
              unassignedBy: null, // Will be set by caller if available
              reason: 'Role updated to new assignment'
            });
            console.log('📡 Published role unassignment event successfully');
          } catch (streamError) {
            console.warn('⚠️ Failed to publish role unassignment event:', streamError.message);
          }
        }

        // Remove existing role assignments
        await db
          .delete(userRoleAssignments)
          .where(eq(userRoleAssignments.userId, userId));

        // Add new role assignment
        const [newRoleAssignment] = await db
          .insert(userRoleAssignments)
          .values({
            userId: userId,
            roleId: roleId,
            assignedBy: null, // Will be set by caller if available
            assignedAt: new Date(),
            isActive: true
          })
          .returning();

        // Publish role assignment event for new role
        try {
          await crmSyncStreams.publishRoleEvent(tenantId, 'role_assigned', {
            assignmentId: newRoleAssignment.id,
            userId: userId,
            roleId: roleId,
            assignedAt: newRoleAssignment.assignedAt ? (typeof newRoleAssignment.assignedAt === 'string' ? newRoleAssignment.assignedAt : newRoleAssignment.assignedAt.toISOString()) : new Date().toISOString(),
            assignedBy: null, // Will be set by caller if available
            reason: 'Role assigned via update'
          });
          console.log('📡 Published role assignment event successfully');
        } catch (streamError) {
          console.warn('⚠️ Failed to publish role assignment event:', streamError.message);
        }

        return {
          success: true,
          message: 'User role updated successfully',
          data: newRoleAssignment
        };
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      throw error;
    }
  }

  // Check subdomain availability
  static async checkSubdomainAvailability(subdomain) {
    const existing = await this.getBySubdomain(subdomain);
    return !existing;
  }

  // Get user by email in tenant - includes both active and invited users
  static async getUserByEmailInTenant(tenantId, email) {
    const [user] = await db
      .select()
      .from(tenantUsers)
      .where(and(
        eq(tenantUsers.tenantId, tenantId),
        eq(tenantUsers.email, email)
      ))
      .limit(1);
    
    return user;
  }
}

export default TenantService; 