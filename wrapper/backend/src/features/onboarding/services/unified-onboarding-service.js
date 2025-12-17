/**
 * 🚀 **UNIFIED ONBOARDING SERVICE**
 * Single source of truth for all onboarding operations
 * Used by /onboard-frontend endpoint
 */

import { db, systemDbConnection } from '../../../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, entities, onboardingEvents } from '../../../db/schema/index.js';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Import existing services

import { kindeService } from '../../../features/auth/index.js';
import { CreditService } from '../../../features/credits/index.js';
import { OnboardingTrackingService } from './onboarding-tracking-service.js';
import { SubscriptionService } from '../../../features/subscriptions/index.js';
import OnboardingValidationService from './onboarding-validation-service.js';

export class UnifiedOnboardingService {

  /**
   * 🚀 **MAIN ONBOARDING WORKFLOW**
   * Single entry point for both frontend and enhanced onboarding
   */
  
  static async completeOnboardingWorkflow(onboardingData, request = null) {
    const {
      type, // 'frontend' or 'enhanced'
      companyName,
      adminEmail,
      subdomain,
      initialCredits, // Will be overridden by plan-based credits
      selectedPlan = 'free',
      // Frontend-specific fields
      companySize,
      businessType,
      firstName,
      lastName,
      hasGstin = false,
      gstin,
      country,
      timezone,
      currency,
      termsAccepted,
      // New fields from onboarding analysis
      taxRegistered = false,
      vatGstRegistered = false,
      billingEmail,
      contactJobTitle,
      preferredContactMethod,
      mailingAddressSameAsRegistered = true,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      mailingCountry,
      supportEmail,
      contactSalutation,
      contactMiddleName,
      contactDepartment,
      contactDirectPhone,
      contactMobilePhone,
      contactPreferredContactMethod,
      contactAuthorityLevel,
      taxRegistrationDetails = {},
      // Enhanced-specific fields
      planName = 'Trial Plan',
      planPrice = 0,
      maxUsers = 2,
      maxProjects = 5,
      teamEmails = []
    } = onboardingData;

    console.log(`🚀 Starting unified ${type} onboarding workflow for ${companyName}`);

    try {
      // 1. VALIDATE INPUT DATA
      const validationData = type === 'frontend' ? {
        legalCompanyName: companyName,
        companySize,
        businessType,
        firstName,
        lastName,
        email: adminEmail,
        hasGstin,
        gstin,
        country,
        timezone,
        currency,
        termsAccepted,
        // New validation fields
        taxRegistered,
        vatGstRegistered,
        billingEmail,
        contactJobTitle,
        preferredContactMethod,
        mailingAddressSameAsRegistered,
        mailingStreet,
        mailingCity,
        mailingState,
        mailingZip,
        mailingCountry,
        supportEmail,
        contactSalutation,
        contactMiddleName,
        contactDepartment,
        contactDirectPhone,
        contactMobilePhone,
        contactPreferredContactMethod,
        contactAuthorityLevel,
        taxRegistrationDetails
      } : {
        companyName,
        adminEmail,
        subdomain
      };

      const validation = await OnboardingValidationService.validateCompleteOnboarding(validationData, type);
      if (!validation.success) {
        const firstError = validation.errors?.[0];
        // Check if it's a duplicate email error
        if (firstError?.message?.includes('already associated') || firstError?.message?.includes('already registered')) {
          const duplicateError = new Error(firstError.message);
          duplicateError.name = 'DuplicateRegistrationError';
          duplicateError.errors = [{
            type: 'duplicate_email',
            message: firstError.message,
            field: 'email'
          }];
          throw duplicateError;
        }
        throw new Error(firstError?.message || 'Validation failed');
      }

      // Check if user is already onboarded (validation passed but user exists)
      if (validation.data?.alreadyOnboarded) {
        console.log('✅ User is already onboarded, returning redirect response');
        const alreadyOnboardedError = new Error('You have already completed onboarding. Redirecting to dashboard...');
        alreadyOnboardedError.name = 'AlreadyOnboardedError';
        alreadyOnboardedError.redirectTo = validation.data.redirectTo || '/dashboard';
        alreadyOnboardedError.tenantId = validation.data.tenantId;
        throw alreadyOnboardedError;
      }

      // 2. GENERATE/CONfirm SUBDOMAIN
      const finalSubdomain = validation.data.generatedSubdomain || subdomain ||
        await OnboardingValidationService.generateUniqueSubdomain(companyName);

      // 3. EXTRACT AND VALIDATE AUTHENTICATION (if request provided)
      const authResult = await this.extractAndValidateAuthentication(request);

      // 4. SETUP KINDE ORGANIZATION AND USER
      const kindeResult = await this.setupKindeIntegration({
        companyName,
        adminEmail,
        firstName,
        lastName,
        subdomain: finalSubdomain,
        existingUser: authResult.user
      });

      // 5. CREATE DATABASE RECORDS (TENANT, ORG, USER, ROLES)
      const dbResult = await this.createDatabaseRecords({
        type,
        companyName,
        subdomain: finalSubdomain,
        adminEmail,
        adminName: firstName && lastName ? `${firstName} ${lastName}`.trim() :
          kindeResult.userName || adminEmail.split('@')[0],
        firstName,
        lastName,
        termsAccepted,
        kindeUserId: kindeResult.userId,
        kindeOrgId: kindeResult.orgCode,
        selectedPlan,
        gstin: hasGstin ? gstin : null,
        hasGstin,
        companySize,
        businessType,
        country,
        timezone,
        currency,
        // New fields
        taxRegistered,
        vatGstRegistered,
        billingEmail,
        contactJobTitle,
        preferredContactMethod,
        mailingAddressSameAsRegistered,
        mailingStreet,
        mailingCity,
        mailingState,
        mailingZip,
        mailingCountry,
        supportEmail,
        contactSalutation,
        contactMiddleName,
        contactDepartment,
        contactDirectPhone,
        contactMobilePhone,
        contactPreferredContactMethod,
        contactAuthorityLevel,
        taxRegistrationDetails
      });

      // 6. CREATE SUBSCRIPTION
      let subscriptionResult;
      if (selectedPlan === 'free') {
        // Create free tier subscription
        subscriptionResult = await SubscriptionService.createFreeSubscription(
          dbResult.tenant.tenantId,
          { selectedPlan }
        );
      } else {
        // Create trial or paid subscription
        subscriptionResult = await this.createTrialSubscription({
          tenantId: dbResult.tenant.tenantId,
          selectedPlan,
          maxUsers,
          maxProjects,
          planName,
          planPrice
        });
      }

      // 7. ALLOCATE CREDITS (REQUIRED - onboarding fails if this fails)
      const creditResult = await this.allocateTrialCredits({
        tenantId: dbResult.tenant.tenantId,
        organizationId: dbResult.organization.organizationId,
        selectedPlan
      });

      // Ensure credits were allocated successfully
      if (!creditResult || creditResult.amount === 0 || creditResult.error) {
        console.error('❌ Credit allocation failed during onboarding:', creditResult?.error);
        throw new Error(`Failed to allocate initial credits: ${creditResult?.error || 'Unknown error'}`);
      }

      // 8. CONFIGURE SUBDOMAIN (SYSTEM CONNECTION)
      console.log('🌐 Configuring subdomain for new tenant...');
      await this.configureSubdomainSystem({
        tenantId: dbResult.tenant.tenantId,
        subdomain: finalSubdomain,
        customDomain: null
      });

      // 9. CONFIGURE APPLICATIONS FOR THE ORGANIZATION
      console.log('⚙️ Configuring applications for new organization...');
      const OnboardingOrganizationSetupService = (await import('./onboarding-organization-setup.js')).default;
      await OnboardingOrganizationSetupService.configureApplicationsForNewOrganization(dbResult.tenant.tenantId, selectedPlan);

      // 10. TRACK ONBOARDING COMPLETION
      await this.trackOnboardingCompletion({
        tenantId: dbResult.tenant.tenantId,
        type,
        companyName,
        adminEmail,
        subdomain: finalSubdomain,
        selectedPlan,
        creditAmount: initialCredits
      });

      console.log(`🎉 Unified ${type} onboarding completed successfully for ${companyName}`);

      return {
        success: true,
        tenant: dbResult.tenant,
        adminUser: dbResult.adminUser,
        organization: dbResult.organization,
        adminRole: dbResult.adminRole,
        subscription: subscriptionResult.subscription,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard`,
        onboardingType: type,
        creditAllocated: creditResult.amount
      };

    } catch (error) {
      console.error(`❌ Unified ${type} onboarding failed for ${companyName}:`, error);
      throw error;
    }
  }

  /**
   * 🔐 **EXTRACT AND VALIDATE AUTHENTICATION**
   * Centralized authentication handling
   */
  static async extractAndValidateAuthentication(request) {
    if (!request) {
      return { authenticated: false, user: null };
    }

    try {
      // Extract token from request headers
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { authenticated: false, user: null };
      }

      const token = authHeader.substring(7);
      if (!token || token.trim() === '' || token.length < 10) {
        return { authenticated: false, user: null };
      }

      // Validate token with Kinde
      const user = await kindeService.validateToken(token);

      return {
        authenticated: true,
        user: {
          kindeUserId: user.kindeUserId || user.userId,
          email: user.email,
          name: user.name || user.given_name
        }
      };

    } catch (error) {
      console.log('⚠️ Authentication validation failed:', error.message);
      return { authenticated: false, user: null };
    }
  }

  /**
   * 🏢 **SETUP KINDE INTEGRATION**
   * Create organization and user in Kinde
   */
  static async setupKindeIntegration({ companyName, adminEmail, firstName, lastName, subdomain, existingUser }) {
    console.log('🔧 Setting up Kinde integration for:', companyName);

    // Create Kinde organization with fallback
    let kindeOrg;
    let actualOrgCode;

    try {
      kindeOrg = await kindeService.createOrganization({
        name: companyName,
        external_id: `tenant_${uuidv4()}`,
        feature_flags: {
          theme: {
            button_text_color: '#ffffff'
          }
        }
      });

      actualOrgCode = kindeOrg.organization?.code;
      if (!actualOrgCode) {
        throw new Error('Failed to get organization code from Kinde response');
      }

      console.log('✅ Kinde organization created:', actualOrgCode);
    } catch (kindeError) {
      console.warn('⚠️ Kinde organization creation failed, using fallback:', kindeError.message);
      actualOrgCode = `org_${subdomain}_${Date.now()}`;
      kindeOrg = {
        organization: { code: actualOrgCode, name: companyName },
        created_with_fallback: true
      };
      console.log('🔄 Using fallback organization code:', actualOrgCode);
    }

    // Handle user creation/assignment
    let finalKindeUserId;
    let userName;

    if (existingUser) {
      // Use existing authenticated user and add them to the new organization
      finalKindeUserId = existingUser.kindeUserId;
      userName = existingUser.name || existingUser.email?.split('@')[0];
      console.log('✅ Using authenticated user:', finalKindeUserId);

      // Add the existing user to the newly created organization
      try {
        console.log(`🔗 Adding existing user ${finalKindeUserId} to organization ${actualOrgCode}`);
        await kindeService.addUserToOrganization(finalKindeUserId, actualOrgCode, {
          role_code: 'org:admin', // Give admin role in the organization
          is_admin: true,
          exclusive: true // Remove from other organizations first
        });
        console.log('✅ User successfully added to organization');
      } catch (addUserError) {
        console.error('⚠️ Failed to add user to organization:', addUserError.message);
        // Don't fail the entire onboarding process for this
      }
    } else {
      // Create new user in Kinde
      try {
        const kindeUser = await kindeService.createUser({
          profile: {
            given_name: firstName || '',
            family_name: lastName || ''
          },
          identities: [{
            type: 'email',
            details: { email: adminEmail }
          }],
          organization_code: actualOrgCode
        });

        finalKindeUserId = kindeUser?.id;
        userName = kindeUser ? `${kindeUser.given_name || ''} ${kindeUser.family_name || ''}`.trim() : adminEmail.split('@')[0];

        console.log('✅ New Kinde user created:', finalKindeUserId);
      } catch (error) {
        console.warn('⚠️ Kinde user creation failed, using fallback:', error.message);
        finalKindeUserId = `user_${adminEmail.replace('@', '_').replace('.', '_')}_${Date.now()}`;
        userName = firstName && lastName ? `${firstName} ${lastName}` : adminEmail.split('@')[0];
        console.log('🔄 Using fallback user ID:', finalKindeUserId);
      }
    }

    return {
      orgCode: actualOrgCode,
      userId: finalKindeUserId,
      userName,
      kindeOrg,
      kindeUser: existingUser ? null : { id: finalKindeUserId }
    };
  }

  /**
   * 🏗️ **CREATE DATABASE RECORDS**
   * Create tenant, organization, admin user, and roles
   */
  static async createDatabaseRecords({
    type,
    companyName,
    subdomain,
    adminEmail,
    adminName,
    firstName,
    lastName,
    termsAccepted,
    kindeUserId,
    kindeOrgId,
    selectedPlan,
    gstin,
    hasGstin,
    companySize,
    businessType,
    country,
    timezone,
    currency,
    // New fields
    taxRegistered,
    vatGstRegistered,
    billingEmail,
    contactJobTitle,
    preferredContactMethod,
    mailingAddressSameAsRegistered,
    mailingStreet,
    mailingCity,
    mailingState,
    mailingZip,
    mailingCountry,
    supportEmail,
    contactSalutation,
    contactMiddleName,
    contactDepartment,
    contactDirectPhone,
    contactMobilePhone,
    contactPreferredContactMethod,
    contactAuthorityLevel,
    taxRegistrationDetails
  }) {
    console.log('🏗️ Creating database records for tenant:', companyName);

    const currentTime = new Date();

    // Use system connection for critical operations (RLS bypassed)
    const result = await systemDbConnection.transaction(async (tx) => {
      // 1. Create tenant
       const [tenant] = await tx
         .insert(tenants)
         .values({
           tenantId: uuidv4(),
           companyName,
           subdomain,
           kindeOrgId,
           adminEmail,
           gstin: hasGstin && gstin ? gstin.toUpperCase() : null,
           subscriptionTier: selectedPlan,
           onboardingCompleted: true,
           onboardingStep: 'completed',
           onboardingProgress: {
             accountSetup: { completed: true, completedAt: currentTime },
             companyInfo: { completed: true, completedAt: currentTime },
             planSelection: { completed: true, completedAt: currentTime },
             teamInvites: { completed: false, completedAt: null }
           },
           onboardedAt: currentTime,
           onboardingStartedAt: currentTime,
           setupCompletionRate: 100,
           trialStartedAt: currentTime,
           trialStatus: 'active',
           subscriptionStatus: 'trial',
           featuresEnabled: {
             crm: true,
             users: true,
             roles: true,
             dashboard: true
           },
           firstLoginAt: currentTime,
           // New fields
           taxRegistered: taxRegistered || false,
           vatGstRegistered: vatGstRegistered || false,
           organizationSize: companySize || null,
           billingEmail: billingEmail || null,
           contactJobTitle: contactJobTitle || null,
           preferredContactMethod: preferredContactMethod || null,
           mailingAddressSameAsRegistered: mailingAddressSameAsRegistered !== undefined ? mailingAddressSameAsRegistered : true,
           mailingStreet: mailingStreet || null,
           mailingCity: mailingCity || null,
           mailingState: mailingState || null,
           mailingZip: mailingZip || null,
           mailingCountry: mailingCountry || null,
           supportEmail: supportEmail || null,
           contactSalutation: contactSalutation || null,
           contactMiddleName: contactMiddleName || null,
           contactDepartment: contactDepartment || null,
           contactDirectPhone: contactDirectPhone || null,
           contactMobilePhone: contactMobilePhone || null,
           contactPreferredContactMethod: contactPreferredContactMethod || null,
           contactAuthorityLevel: contactAuthorityLevel || null,
           taxRegistrationDetails: taxRegistrationDetails || {},
           initialSetupData: {
             selectedPlan,
             planName: selectedPlan === 'trial' ? 'Trial Plan' : (selectedPlan === 'free' ? 'Free Plan' : 'Professional Plan'),
             planPrice: selectedPlan === 'trial' ? 0 : (selectedPlan === 'free' ? 0 : 99),
             maxUsers: selectedPlan === 'trial' ? 2 : (selectedPlan === 'free' ? 5 : 50),
             maxProjects: selectedPlan === 'trial' ? 5 : (selectedPlan === 'free' ? 10 : 100),
             teamInviteCount: 0,
             onboardingCompletedAt: currentTime,
             businessType: businessType || null,
             companySize: companySize || null,
             country: country || null,
             timezone: timezone || null,
             currency: currency || null,
             hasGstin: hasGstin || false,
             gstinProvided: hasGstin && gstin ? true : false,
             // New fields in initial setup data
             taxRegistered: taxRegistered || false,
             vatGstRegistered: vatGstRegistered || false,
             billingEmail: billingEmail || null,
             contactJobTitle: contactJobTitle || null,
             preferredContactMethod: preferredContactMethod || null,
             mailingAddressSameAsRegistered: mailingAddressSameAsRegistered !== undefined ? mailingAddressSameAsRegistered : true,
             supportEmail: supportEmail || null,
             contactSalutation: contactSalutation || null,
             contactMiddleName: contactMiddleName || null,
             contactDepartment: contactDepartment || null,
             contactDirectPhone: contactDirectPhone || null,
             contactMobilePhone: contactMobilePhone || null,
             contactPreferredContactMethod: contactPreferredContactMethod || null,
             contactAuthorityLevel: contactAuthorityLevel || null,
             taxRegistrationDetails: taxRegistrationDetails || {}
           }
         })
        .returning({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain,
          kindeOrgId: tenants.kindeOrgId,
          adminEmail: tenants.adminEmail,
          onboardingCompleted: tenants.onboardingCompleted,
          onboardedAt: tenants.onboardedAt,
          trialStartedAt: tenants.trialStartedAt
        });

      // Set tenant context for RLS within transaction
      const { sql } = await import('drizzle-orm');
      await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenant.tenantId}, false)`);

      // 2. Create parent organization (root entity)
      const organizationEntityId = uuidv4();
      const [organization] = await tx
        .insert(entities)
        .values({
          entityId: organizationEntityId,
          tenantId: tenant.tenantId,
          parentEntityId: null, // Root entity has no parent - this is critical for hierarchy
          entityLevel: 1, // Root entities start at level 1
          // Note: hierarchyPath and fullHierarchyPath will be set by database triggers
          // For root entities, triggers will set hierarchyPath to the entity ID string
          hierarchyPath: organizationEntityId.toString(), // Set initial value (triggers will validate/update)
          fullHierarchyPath: companyName, // Full path is just the entity name for root
          entityName: companyName,
          entityCode: `org_${subdomain}_${Date.now()}`,
          description: `Root organization created during ${type} onboarding`,
          entityType: 'organization',
          organizationType: 'business_unit', // Parent organization - matches organization service expectations
          isActive: true,
          isDefault: true,
          isHeadquarters: true, // Root organization is the headquarters
          contactEmail: adminEmail,
          createdBy: null, // Will be updated after user creation
          updatedBy: null
        })
        .returning({
          organizationId: entities.entityId,
          organizationName: entities.entityName,
          organizationCode: entities.entityCode
        });
      
      // Verify root entity was created correctly
      if (!organization || !organization.organizationId) {
        throw new Error('Failed to create root organization entity');
      }
      
      console.log(`✅ Root organization entity created: ${organization.organizationId} (parentEntityId: null)`);

      // 3. Create admin user
      // Prepare form data for storage in user preferences
      const formData = {};

      // Store form data for any onboarding type that provides it
      if (companySize) formData.companySize = companySize;
      if (businessType) formData.businessType = businessType;
      if (hasGstin !== undefined) formData.hasGstin = hasGstin;
      if (gstin) formData.gstin = gstin;
      if (country) formData.country = country;
      if (timezone) formData.timezone = timezone;
      if (currency) formData.currency = currency;
      if (firstName) formData.firstName = firstName;
      if (lastName) formData.lastName = lastName;
      if (termsAccepted !== undefined) formData.termsAccepted = termsAccepted;

      // New contact fields
      if (contactSalutation) formData.contactSalutation = contactSalutation;
      if (contactMiddleName) formData.contactMiddleName = contactMiddleName;
      if (contactDepartment) formData.contactDepartment = contactDepartment;
      if (contactDirectPhone) formData.contactDirectPhone = contactDirectPhone;
      if (contactMobilePhone) formData.contactMobilePhone = contactMobilePhone;
      if (contactPreferredContactMethod) formData.contactPreferredContactMethod = contactPreferredContactMethod;
      if (contactAuthorityLevel) formData.contactAuthorityLevel = contactAuthorityLevel;

      const [adminUser] = await tx
        .insert(tenantUsers)
        .values({
          userId: uuidv4(),
          tenantId: tenant.tenantId,
          kindeUserId,
          email: adminEmail,
          name: adminName,
          phone: null,
          isActive: true,
          isVerified: true,
          isTenantAdmin: true,
          onboardingCompleted: true,
          preferences: Object.keys(formData).length > 0 ? {
            onboarding: {
              formData,
              completedAt: currentTime.toISOString(),
              onboardingType: type
            }
          } : undefined
        })
        .returning();

      // Update organization with correct user reference
      await tx
        .update(entities)
        .set({
          createdBy: adminUser.userId,
          updatedBy: adminUser.userId
        })
        .where(eq(entities.entityId, organization.organizationId));

      // 4. Create Super Admin role
      const { createSuperAdminRoleConfig } = await import('../utils/super-admin-permissions.js');
      const roleConfig = createSuperAdminRoleConfig(selectedPlan, tenant.tenantId, adminUser.userId);

      const [adminRole] = await tx
        .insert(customRoles)
        .values(roleConfig)
        .returning();

      // 5. Assign admin role to admin user
      const [roleAssignment] = await tx
        .insert(userRoleAssignments)
        .values({
          userId: adminUser.userId,
          roleId: adminRole.roleId,
          assignedBy: adminUser.userId,
          organizationId: tenant.tenantId
        })
        .returning();

      return {
        tenant,
        organization,
        adminUser,
        adminRole,
        roleAssignment
      };
    });

    console.log('✅ Database records created successfully');
    return result;
  }

  /**
   * 📝 **CREATE TRIAL SUBSCRIPTION**
   * Create subscription record for the tenant
   */
  static async createTrialSubscription({ tenantId, selectedPlan, maxUsers, maxProjects, planName, planPrice }) {
    console.log('📝 Creating trial subscription for tenant:', tenantId);

    const trialDurationMs = process.env.NODE_ENV === 'production' ? 14 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
    const trialStartDate = new Date();
    const trialEndDate = new Date(Date.now() + trialDurationMs);

    const subscriptionData = {
      subscriptionId: uuidv4(),
      tenantId,
      plan: selectedPlan,
      status: 'trialing',
      subscribedTools: ['crm'],
      usageLimits: {
        apiCalls: 10000,
        storage: 1000000000, // 1GB
        users: maxUsers,
        roles: 2,
        projects: maxProjects
      },
      monthlyPrice: planPrice.toString(),
      yearlyPrice: '0.00',
      billingCycle: 'monthly',
      trialStart: trialStartDate,
      trialEnd: trialEndDate,
      currentPeriodStart: trialStartDate,
      currentPeriodEnd: trialEndDate,
      addOns: []
    };

    const [subscription] = await systemDbConnection
      .insert(subscriptions)
      .values(subscriptionData)
      .returning();

    console.log('✅ Trial subscription created:', subscription.subscriptionId);
    return { subscription };
  }

  /**
   * 💰 **ALLOCATE TRIAL CREDITS**
   * Allocate initial credits to the tenant
   */
  static async allocateTrialCredits({ tenantId, organizationId, creditAmount, selectedPlan = 'free' }) {
    console.log('💰 Allocating initial free credits:', { tenantId, selectedPlan });

    try {
      // Get plan-based credit amount instead of using parameter
      const { PermissionMatrixUtils } = await import('../data/permission-matrix.js');
      const planCredits = PermissionMatrixUtils.getPlanCredits(selectedPlan);
      const actualCreditAmount = planCredits.free || 1000; // Fallback to 1000 if not configured

      console.log(`📊 Plan ${selectedPlan} provides ${actualCreditAmount} free credits`);

      // Use CreditService to add credits directly to the organization entity
      const creditResult = await CreditService.addCreditsToEntity({
        tenantId,
        entityType: 'organization',
        entityId: organizationId,
        creditAmount: actualCreditAmount,
        source: 'onboarding',
        sourceId: uuidv4(),
        description: `${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan initial free credits`,
        initiatedBy: 'system'
      });

      console.log('✅ Initial free credits allocated:', actualCreditAmount);
      return {
        amount: actualCreditAmount,
        creditType: 'free',
        planId: selectedPlan,
        creditId: creditResult?.creditId
      };
    } catch (creditError) {
      console.error('❌ Credit allocation failed:', creditError.message);
      // Credit allocation is now required for onboarding to succeed
      throw new Error(`Credit allocation failed: ${creditError.message}`);
    }
  }

  /**
   * 🌐 **CONFIGURE SUBDOMAIN SYSTEM**
   * Configure subdomain with system connection (bypasses RLS)
   */
  static async configureSubdomainSystem(subdomainData) {
    console.log('🌐 Configuring subdomain with system connection:', {
      subdomain: subdomainData.subdomain,
      tenantId: subdomainData.tenantId
    });

    // Get system database connection
    const { systemDbConnection } = await import('../db/index.js');
    const systemDb = systemDbConnection;

    // Update tenant with subdomain information
    const { tenants } = await import('../db/schema/tenants.js');
    const { eq } = await import('drizzle-orm');

    const [updatedTenant] = await systemDb
      .update(tenants)
      .set({
        subdomain: subdomainData.subdomain,
        customDomain: subdomainData.customDomain,
        updatedAt: new Date()
      })
      .where(eq(tenants.tenantId, subdomainData.tenantId))
      .returning();

    console.log('✅ Subdomain configuration completed:', updatedTenant.subdomain);
    return updatedTenant;
  }

  /**
   * 📊 **TRACK ONBOARDING COMPLETION**
   * Track the completion of onboarding process
   */
  static async trackOnboardingCompletion({ tenantId, type, companyName, adminEmail, subdomain, selectedPlan, creditAmount }) {
    console.log('📊 Tracking onboarding completion for tenant:', tenantId);

    try {
      await OnboardingTrackingService.trackOnboardingPhase(
        tenantId,
        'trial',
        'completed',
        {
          sessionId: null,
          ipAddress: null,
          userAgent: null,
          eventData: {
            onboardingType: type,
            companyName,
            adminEmail,
            subdomain,
            selectedPlan,
            creditAmount,
            completedAt: new Date().toISOString()
          },
          metadata: {
            source: `unified_${type}_onboarding`,
            version: '2.0'
          },
          completionRate: 100,
          stepNumber: 4,
          totalSteps: 4
        }
      );

      console.log('✅ Onboarding completion tracked');
    } catch (trackingError) {
      console.warn('⚠️ Onboarding tracking failed, but onboarding completed:', trackingError.message);
      // Don't fail onboarding for tracking issues
    }
  }
}

export default UnifiedOnboardingService;

