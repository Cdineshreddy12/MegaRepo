/**
 * Payment Upgrade Routes - Handle plan upgrades and additional setup
 */

import { authenticateToken } from '../../../middleware/auth.js';
import { db } from '../../../db/index.js';
import { tenants, tenantUsers, subscriptions, entities } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import EmailService from '../../../utils/email.js';
import { OnboardingTrackingService } from '../../../features/onboarding/index.js';

export default async function paymentUpgradeRoutes(fastify, options) {

  // Check if profile is already completed
  fastify.get('/profile-status', {
    preHandler: [authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            profileCompleted: { type: 'boolean' },
            setupCompletionRate: { type: 'number' },
            onboardingCompleted: { type: 'boolean' },
            gstin: { type: 'string' },
            hasRequiredFields: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has all required fields for upgrade
      const hasRequiredFields = !!(
        tenant.gstin &&
        tenant.legalCompanyName &&
        tenant.industry &&
        tenant.billingStreet &&
        tenant.billingCity &&
        tenant.billingCountry
      );

      const profileCompleted = tenant.onboardingCompleted && tenant.setupCompletionRate >= 100;

      console.log('📋 Profile status check:', {
        profileCompleted,
        setupCompletionRate: tenant.setupCompletionRate,
        onboardingCompleted: tenant.onboardingCompleted,
        gstin: tenant.gstin ? 'present' : 'missing',
        hasRequiredFields
      });

      return {
        success: true,
        profileCompleted,
        setupCompletionRate: tenant.setupCompletionRate || 0,
        onboardingCompleted: tenant.onboardingCompleted || false,
        gstin: tenant.gstin,
        hasRequiredFields
      };

    } catch (error) {
      console.error('❌ Profile status check failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to check profile status',
        error: error.message
      });
    }
  });

  // Complete comprehensive profile data (separate from payment)
  fastify.post('/complete-profile', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['gstin'],
        properties: {
          gstin: { type: 'string', minLength: 15, maxLength: 15 },

          // Company Profile
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companyType: { type: 'string' },
          ownership: { type: 'string' },
          annualRevenue: { type: 'number' },
          numberOfEmployees: { type: 'number' },
          tickerSymbol: { type: 'string' },
          website: { type: 'string' },
          description: { type: 'string' },
          foundedDate: { type: 'string' },

          // Contact & Address
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          shippingStreet: { type: 'string' },
          shippingCity: { type: 'string' },
          shippingState: { type: 'string' },
          shippingZip: { type: 'string' },
          shippingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },

          // Localization
          defaultLanguage: { type: 'string' },
          defaultLocale: { type: 'string' },
          defaultCurrency: { type: 'string' },
          multiCurrencyEnabled: { type: 'boolean' },
          advancedCurrencyManagement: { type: 'boolean' },
          defaultTimeZone: { type: 'string' },
          firstDayOfWeek: { type: 'number' },

          // Credit purchase options
          creditPackage: { type: 'string', enum: ['basic', 'standard', 'premium', 'enterprise'] },
          credits: { type: 'number', minimum: 100, maximum: 50000 }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            profileCompleted: { type: 'boolean' },
            readyForPayment: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const {
        gstin,
        // Company Profile
        legalCompanyName,
        industry,
        companyType,
        ownership,
        annualRevenue,
        numberOfEmployees,
        tickerSymbol,
        website,
        description,
        foundedDate,
        // Contact & Address
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,
        phone,
        fax,
        // Localization
        defaultLanguage,
        defaultLocale,
        defaultCurrency,
        multiCurrencyEnabled,
        advancedCurrencyManagement,
        defaultTimeZone,
        firstDayOfWeek,
        // Credit purchase options
        creditPackage,
        credits
      } = request.body;

      console.log('📝 Completing comprehensive profile for tenant:', userContext.tenantId);

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has already been completed during upgrade
      let profileCompleted = false;

      console.log('🔍 Tenant status check:', {
        onboardingCompleted: tenant.onboardingCompleted,
        setupCompletionRate: tenant.setupCompletionRate,
        condition: !tenant.onboardingCompleted || tenant.setupCompletionRate < 100
      });

      if (!tenant.onboardingCompleted || tenant.setupCompletionRate < 100) {
        console.log('📝 Completing comprehensive profile...');

        // Prepare profile update data - only include defined values
        const profileUpdateData = {};

        // GSTIN is required for upgrade
        if (gstin) profileUpdateData.gstin = gstin;

        // Company Profile
        if (legalCompanyName || tenant.companyName) profileUpdateData.legalCompanyName = legalCompanyName || tenant.companyName;
        if (industry || tenant.industry) profileUpdateData.industry = industry || tenant.industry;
        if (companyType) profileUpdateData.companyType = companyType;
        if (ownership) profileUpdateData.ownership = ownership;
        if (annualRevenue) profileUpdateData.annualRevenue = parseFloat(annualRevenue);
        if (numberOfEmployees) profileUpdateData.numberOfEmployees = parseInt(numberOfEmployees);
        if (tickerSymbol) profileUpdateData.tickerSymbol = tickerSymbol;
        if (website) profileUpdateData.website = website;
        if (description) profileUpdateData.companyDescription = description;
        if (foundedDate) profileUpdateData.foundedDate = new Date(foundedDate);

        // Contact & Address
        if (billingStreet) profileUpdateData.billingStreet = billingStreet;
        if (billingCity) profileUpdateData.billingCity = billingCity;
        if (billingState) profileUpdateData.billingState = billingState;
        if (billingZip) profileUpdateData.billingZip = billingZip;
        if (billingCountry) profileUpdateData.billingCountry = billingCountry;
        if (shippingStreet) profileUpdateData.shippingStreet = shippingStreet;
        if (shippingCity) profileUpdateData.shippingCity = shippingCity;
        if (shippingState) profileUpdateData.shippingState = shippingState;
        if (shippingZip) profileUpdateData.shippingZip = shippingZip;
        if (shippingCountry) profileUpdateData.shippingCountry = shippingCountry;
        if (phone) profileUpdateData.phone = phone;
        if (fax) profileUpdateData.fax = fax;

        // Localization
        profileUpdateData.defaultLanguage = defaultLanguage || 'en';
        profileUpdateData.defaultLocale = defaultLocale || 'en-US';
        profileUpdateData.defaultCurrency = defaultCurrency || 'INR';
        profileUpdateData.multiCurrencyEnabled = multiCurrencyEnabled || false;
        profileUpdateData.advancedCurrencyManagement = advancedCurrencyManagement || false;
        profileUpdateData.defaultTimeZone = defaultTimeZone || 'Asia/Kolkata';
        profileUpdateData.firstDayOfWeek = firstDayOfWeek || 1;

        // Mark profile as completed
        profileUpdateData.onboardingCompleted = true;
        profileUpdateData.onboardingStep = 'completed';
        profileUpdateData.setupCompletionRate = 100;
        profileUpdateData.onboardedAt = new Date();

        console.log('🔧 Attempting to update tenant with data:', Object.keys(profileUpdateData));

        // Only update if we have data to update
        if (Object.keys(profileUpdateData).length > 0) {
          // Update tenant with comprehensive profile
          await db
            .update(tenants)
            .set(profileUpdateData)
            .where(eq(tenants.tenantId, userContext.tenantId));

          profileCompleted = true;
          console.log('✅ Comprehensive profile completed');
        } else {
          console.log('⚠️ No profile data to update');
          profileCompleted = false;
        }

        // Track profile onboarding completion only if profile was actually completed
        if (profileCompleted) {
          try {
            await OnboardingTrackingService.trackOnboardingPhase(
              userContext.tenantId,
              'profile',
              'completed',
              {
                userId: userContext.userId,
                sessionId: request.headers['x-session-id'] || null,
                ipAddress: request.ip,
                userAgent: request.headers['user-agent'],
                eventData: {
                  creditPackage: creditPackage,
                  credits: credits,
                  fieldsCompleted: Object.keys(profileUpdateData).length,
                  hasBillingInfo: !!(billingStreet && billingCity),
                  hasCompanyInfo: !!(legalCompanyName && industry),
                  hasLocalization: !!(defaultLanguage && defaultCurrency)
                },
                metadata: {
                  source: 'complete_profile',
                  version: '1.0'
                },
                completionRate: 100,
                stepNumber: 3,
                totalSteps: 3
              }
            );
          } catch (trackingError) {
            console.warn('⚠️ Profile onboarding tracking failed, but profile completed:', trackingError.message);
          }
        }
      } else {
        console.log('ℹ️ Profile already completed previously');
        console.log('📋 Current tenant GSTIN:', tenant.gstin);

        // Still update GSTIN if not already set
        if (!tenant.gstin) {
          console.log('🔧 Updating GSTIN for existing profile...');
          await db
            .update(tenants)
            .set({ gstin: gstin })
            .where(eq(tenants.tenantId, userContext.tenantId));
          console.log('✅ GSTIN updated');
        } else {
          console.log('✅ GSTIN already set, skipping update');
        }
      }

      // Update organization metadata (GSTIN is stored in tenants table, not organizations)
      let organizationUpdateResult = [];
      try {
        organizationUpdateResult = await db
          .update(entities)
          .set({
            updatedBy: userContext.userId,
            updatedAt: new Date()
          })
          .where(and(
            eq(entities.tenantId, userContext.tenantId),
            eq(entities.organizationType, 'parent'),
            eq(entities.entityType, 'organization')
          ))
          .returning();
        console.log('✅ Organization metadata updated');
      } catch (orgError) {
        console.warn('⚠️ Organization update failed (may not exist):', orgError.message);
        // This is not a critical error - organizations table might not have a record for this tenant yet
      }

      console.log('✅ Profile completion successful');

      return {
        success: true,
        message: profileCompleted
          ? 'Profile completed successfully. Ready for payment.'
          : 'Profile was already completed.',
        profileCompleted: profileCompleted,
        readyForPayment: true,
        organizationUpdated: !!organizationUpdateResult.length
      };

    } catch (error) {
      console.error('❌ Profile completion failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to complete profile',
        error: error.message
      });
    }
  });

  // Purchase additional credits with profile completion
  fastify.post('/purchase-credits', {
    preHandler: [authenticateToken],
    schema: {
      body: {
        type: 'object',
        required: ['creditPackage', 'gstin'],
        properties: {
          creditPackage: { type: 'string', enum: ['basic', 'standard', 'premium', 'enterprise'] },
          credits: { type: 'number', minimum: 100, maximum: 50000 },
          gstin: { type: 'string', minLength: 15, maxLength: 15 },
          maxUsers: { type: 'number', minimum: 1, maximum: 1000 },
          maxProjects: { type: 'number', minimum: 1, maximum: 1000 },

          // Company Profile
          legalCompanyName: { type: 'string' },
          industry: { type: 'string' },
          companyType: { type: 'string' },
          ownership: { type: 'string' },
          annualRevenue: { type: 'number' },
          numberOfEmployees: { type: 'number' },
          tickerSymbol: { type: 'string' },
          website: { type: 'string' },
          description: { type: 'string' },
          foundedDate: { type: 'string' },

          // Contact & Address
          billingStreet: { type: 'string' },
          billingCity: { type: 'string' },
          billingState: { type: 'string' },
          billingZip: { type: 'string' },
          billingCountry: { type: 'string' },
          shippingStreet: { type: 'string' },
          shippingCity: { type: 'string' },
          shippingState: { type: 'string' },
          shippingZip: { type: 'string' },
          shippingCountry: { type: 'string' },
          phone: { type: 'string' },
          fax: { type: 'string' },

          // Localization
          defaultLanguage: { type: 'string' },
          defaultLocale: { type: 'string' },
          defaultCurrency: { type: 'string' },
          multiCurrencyEnabled: { type: 'boolean' },
          advancedCurrencyManagement: { type: 'boolean' },
          defaultTimeZone: { type: 'string' },
          firstDayOfWeek: { type: 'number' },


        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            subscription: { type: 'object' },
            organizationUpdated: { type: 'boolean' },
            profileCompleted: { type: 'boolean' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;
      const {
        creditPackage,
        credits,
        gstin,
        maxUsers,
        maxProjects,

        // Company Profile
        legalCompanyName,
        industry,
        companyType,
        ownership,
        annualRevenue,
        numberOfEmployees,
        tickerSymbol,
        website,
        description,
        foundedDate,

        // Contact & Address
        billingStreet,
        billingCity,
        billingState,
        billingZip,
        billingCountry,
        shippingStreet,
        shippingCity,
        shippingState,
        shippingZip,
        shippingCountry,
        phone,
        fax,

        // Localization
        defaultLanguage,
        defaultLocale,
        defaultCurrency,
        multiCurrencyEnabled,
        advancedCurrencyManagement,
        defaultTimeZone,
        firstDayOfWeek
      } = request.body;

      console.log('💰 Processing credit purchase:', {
        userId: userContext.userId,
        creditPackage,
        credits,
        gstin: gstin ? 'provided' : 'not provided'
      });

      // Get current tenant
      const [tenant] = await db
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, userContext.tenantId))
        .limit(1);

      if (!tenant) {
        return reply.code(404).send({
          success: false,
          message: 'Tenant not found'
        });
      }

      // Check if profile has already been completed during upgrade
      let profileCompleted = false;
      if (!tenant.onboardingCompleted || tenant.setupCompletionRate < 100) {
        console.log('📝 Completing comprehensive profile during upgrade...');

        // Prepare profile update data
        const profileUpdateData = {
          // GSTIN is required for upgrade
          gstin: gstin,

          // Company Profile
          legalCompanyName: legalCompanyName || tenant.companyName,
          industry: industry || tenant.industry,
          companyType: companyType,
          ownership: ownership,
          annualRevenue: annualRevenue ? parseFloat(annualRevenue) : null,
          numberOfEmployees: numberOfEmployees ? parseInt(numberOfEmployees) : null,
          tickerSymbol: tickerSymbol,
          website: website,
          companyDescription: description,
          foundedDate: foundedDate ? new Date(foundedDate) : null,

          // Contact & Address
          billingStreet: billingStreet,
          billingCity: billingCity,
          billingState: billingState,
          billingZip: billingZip,
          billingCountry: billingCountry,
          shippingStreet: shippingStreet,
          shippingCity: shippingCity,
          shippingState: shippingState,
          shippingZip: shippingZip,
          shippingCountry: shippingCountry,
          phone: phone,
          fax: fax,

          // Localization
          defaultLanguage: defaultLanguage || 'en',
          defaultLocale: defaultLocale || 'en-US',
          defaultCurrency: defaultCurrency || 'INR',
          multiCurrencyEnabled: multiCurrencyEnabled || false,
          advancedCurrencyManagement: advancedCurrencyManagement || false,
          defaultTimeZone: defaultTimeZone || 'Asia/Kolkata',
          firstDayOfWeek: firstDayOfWeek || 1,

          // Mark profile as completed
          onboardingCompleted: true,
          onboardingStep: 'completed',
          setupCompletionRate: 100,
          onboardedAt: new Date()
        };

        // Update tenant with comprehensive profile
        await db
          .update(tenants)
          .set(profileUpdateData)
          .where(eq(tenants.tenantId, userContext.tenantId));

        profileCompleted = true;
        console.log('✅ Comprehensive profile completed during upgrade');

        // Track profile onboarding completion
        try {
          await OnboardingTrackingService.trackOnboardingPhase(
            userContext.tenantId,
            'profile',
            'completed',
            {
              userId: userContext.userId,
              sessionId: request.headers['x-session-id'] || null,
              ipAddress: request.ip,
              userAgent: request.headers['user-agent'],
              eventData: {
                creditPackage,
                credits,
                fieldsCompleted: Object.keys(profileUpdateData).length,
                hasBillingInfo: !!(billingStreet && billingCity),
                hasCompanyInfo: !!(legalCompanyName && industry),
                hasLocalization: !!(defaultLanguage && defaultCurrency)
              },
              metadata: {
                source: 'payment_upgrade',
                version: '1.0'
              },
              completionRate: 100,
              stepNumber: 3,
              totalSteps: 3
            }
          );
        } catch (trackingError) {
          console.warn('⚠️ Profile onboarding tracking failed, but upgrade completed:', trackingError.message);
        }
      } else {
        console.log('ℹ️ Profile already completed previously, skipping profile completion');
        // Still update GSTIN if not already set
        if (!tenant.gstin) {
          await db
            .update(tenants)
            .set({ gstin: gstin })
            .where(eq(tenants.tenantId, userContext.tenantId));
        }
      }

      // Update organization metadata (GSTIN is stored in tenants table, not organizations)
      let organizationUpdateResult = [];
      try {
        organizationUpdateResult = await db
          .update(entities)
          .set({
            updatedBy: userContext.userId,
            updatedAt: new Date()
          })
          .where(and(
            eq(entities.tenantId, userContext.tenantId),
            eq(entities.organizationType, 'parent'),
            eq(entities.entityType, 'organization')
          ))
          .returning();
        console.log('✅ Organization metadata updated');
      } catch (orgError) {
        console.warn('⚠️ Organization update failed (may not exist):', orgError.message);
        // This is not a critical error - organizations table might not have a record for this tenant yet
      }

      // Create new subscription for paid plan
      const subscriptionId = uuidv4();

      // Set credit package limits based on credit package
      const creditPackageLimits = {
        basic: {
          tools: ['crm'],
          apiCalls: Math.min(credits * 10, 50000), // 10 API calls per credit, max 50k
          storage: Math.min(credits * 1000000, 10000000000), // 1MB per credit, max 10GB
          users: Math.min(Math.floor(credits / 50), 25), // 50 credits per user, max 25 users
          roles: Math.min(Math.floor(credits / 100), 10), // 100 credits per role, max 10 roles
          projects: Math.min(Math.floor(credits / 20), 100) // 20 credits per project, max 100 projects
        },
        standard: {
          tools: ['crm', 'hr'],
          apiCalls: Math.min(credits * 15, 100000), // 15 API calls per credit, max 100k
          storage: Math.min(credits * 2000000, 50000000000), // 2MB per credit, max 50GB
          users: Math.min(Math.floor(credits / 40), 50), // 40 credits per user, max 50 users
          roles: Math.min(Math.floor(credits / 80), 15), // 80 credits per role, max 15 roles
          projects: Math.min(Math.floor(credits / 15), 200) // 15 credits per project, max 200 projects
        },
        premium: {
          tools: ['crm', 'hr', 'affiliate'],
          apiCalls: Math.min(credits * 20, 200000), // 20 API calls per credit, max 200k
          storage: Math.min(credits * 3000000, 100000000000), // 3MB per credit, max 100GB
          users: Math.min(Math.floor(credits / 30), 100), // 30 credits per user, max 100 users
          roles: Math.min(Math.floor(credits / 60), 20), // 60 credits per role, max 20 roles
          projects: Math.min(Math.floor(credits / 10), 500) // 10 credits per project, max 500 projects
        },
        enterprise: {
          tools: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
          apiCalls: Math.min(credits * 25, 500000), // 25 API calls per credit, max 500k
          storage: Math.min(credits * 5000000, 500000000000), // 5MB per credit, max 500GB
          users: Math.min(Math.floor(credits / 20), 500), // 20 credits per user, max 500 users
          roles: Math.min(Math.floor(credits / 40), 50), // 40 credits per role, max 50 roles
          projects: Math.min(Math.floor(credits / 5), 1000) // 5 credits per project, max 1000 projects
        }
      };

      const planConfig = creditPackageLimits[creditPackage];
      // Calculate price based on credits and package
      const creditPrices = {
        basic: credits * 0.10, // $0.10 per credit for basic
        standard: credits * 0.15, // $0.15 per credit for standard
        premium: credits * 0.20, // $0.20 per credit for premium
        enterprise: credits * 0.25 // $0.25 per credit for enterprise
      };

      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          subscriptionId,
          tenantId: userContext.tenantId,
          plan: 'credit-based',
          status: 'active',
          subscribedTools: planConfig.tools,
          usageLimits: planConfig,
          monthlyPrice: creditPrices[creditPackage].toString(),
          yearlyPrice: (creditPrices[creditPackage] * 12).toString(), // Monthly pricing for annual
          billingCycle: 'monthly',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          addOns: [{
            type: 'credits',
            package: creditPackage,
            amount: credits,
            price: creditPrices[creditPackage]
          }],
          upgradedFromTrial: true,
          upgradeDate: new Date()
        })
        .returning();

      // Update tenant with upgrade information
      await db
        .update(tenants)
        .set({
          subscriptionStatus: 'active',
          planUpgradedAt: new Date(),
          upgradedPlan: `credit-${creditPackage}`,
          gstin: gstin,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, userContext.tenantId));

      // No team invites to send (removed as requested)

      // Track upgrade onboarding completion
      try {
        await OnboardingTrackingService.trackOnboardingPhase(
          userContext.tenantId,
          'upgrade',
          'completed',
          {
            userId: userContext.userId,
            sessionId: request.headers['x-session-id'] || null,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
            eventData: {
              creditPackage,
              credits,
              subscriptionId,
              gstinUpdated: !!organizationUpdateResult.length,
              profileCompleted,
              teamEmailsCount: teamEmails?.length || 0,
              planLimits: planConfig
            },
            metadata: {
              source: 'payment_upgrade',
              version: '1.0'
            },
            completionRate: 100,
            stepNumber: 1,
            totalSteps: 1
          }
        );
      } catch (trackingError) {
        console.warn('⚠️ Upgrade onboarding tracking failed, but upgrade completed:', trackingError.message);
      }

      console.log('✅ Credit purchase completed:', {
        subscriptionId,
        creditPackage,
        credits,
        gstinUpdated: !!organizationUpdateResult.length
      });

      return {
        success: true,
        message: `Successfully purchased ${credits} credits (${creditPackage} package)${profileCompleted ? ' with profile completion' : ''}`,
        subscription: {
          subscriptionId,
          plan: 'credit-based',
          creditPackage,
          credits,
          status: 'active',
          tools: planConfig.tools,
          limits: planConfig
        },
        organizationUpdated: !!organizationUpdateResult.length,
        profileCompleted: profileCompleted
      };

    } catch (error) {
      console.error('❌ Payment upgrade failed:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to process payment upgrade',
        error: error.message
      });
    }
  });

  // Get upgrade options for current tenant
  fastify.get('/upgrade-options', {
    preHandler: [authenticateToken],
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            currentPlan: { type: 'string' },
            availableUpgrades: { type: 'array' },
            organizationSetup: { type: 'object' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { userContext } = request;

      // Get current subscription
      const [currentSubscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, userContext.tenantId))
        .limit(1);

      // Get organization info
      const [organization] = await db
        .select({
          organizationId: entities.entityId,
          organizationName: entities.entityName,
          gstin: entities.gstin
        })
        .from(entities)
        .where(and(
          eq(entities.tenantId, userContext.tenantId),
          eq(entities.organizationType, 'parent'),
          eq(entities.entityType, 'organization')
        ))
        .limit(1);

      const availableUpgrades = [
        {
          plan: 'starter',
          name: 'Starter Plan',
          price: 29,
          features: ['CRM', 'HR Management', 'Up to 10 users', '25 projects', '10GB storage'],
          recommended: currentSubscription?.plan === 'trial'
        },
        {
          plan: 'professional',
          name: 'Professional Plan',
          price: 79,
          features: ['Everything in Starter', 'Affiliate Management', 'Up to 25 users', '100 projects', '50GB storage'],
          recommended: currentSubscription?.plan === 'starter'
        },
        {
          plan: 'enterprise',
          name: 'Enterprise Plan',
          price: 199,
          features: ['Everything in Professional', 'Accounting', 'Inventory', 'Up to 100 users', '500 projects', '100GB storage'],
          recommended: currentSubscription?.plan === 'professional'
        }
      ];

      return {
        success: true,
        currentPlan: currentSubscription?.plan || 'trial',
        availableUpgrades,
        organizationSetup: {
          hasGSTIN: !!organization?.gstin,
          organizationName: organization?.organizationName || 'Not set'
        }
      };

    } catch (error) {
      console.error('❌ Failed to get upgrade options:', error);
      return reply.code(500).send({
        success: false,
        message: 'Failed to get upgrade options'
      });
    }
  });
}
