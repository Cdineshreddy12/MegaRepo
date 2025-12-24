/**
 * 🚀 **UNIFIED ONBOARDING SERVICE**
 * Single source of truth for all onboarding operations
 * Used by /onboard-frontend endpoint
 */

import { db, systemDbConnection } from '../../../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, entities, onboardingEvents, onboardingFormData, credits, creditTransactions } from '../../../db/schema/index.js';
import { eq, and, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

// Import existing services

import { kindeService } from '../../../features/auth/index.js';
import { CreditService } from '../../../features/credits/index.js';
import { OnboardingTrackingService } from './onboarding-tracking-service.js';
import { SubscriptionService } from '../../../features/subscriptions/index.js';
import OnboardingValidationService from './onboarding-validation-service.js';
import { OnboardingFileLogger } from '../../../utils/onboarding-file-logger.js';

export class UnifiedOnboardingService {

  /**
   * 🚀 **MAIN ONBOARDING WORKFLOW**
   * Single entry point for both frontend and enhanced onboarding
   */
  
  static async completeOnboardingWorkflow(onboardingData, request = null) {
    // Initialize file logger for this onboarding session
    const sessionId = `onboarding_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const logger = new OnboardingFileLogger(sessionId, {
      type: onboardingData.type || 'frontend',
      companyName: onboardingData.companyName,
      adminEmail: onboardingData.adminEmail,
      subdomain: onboardingData.subdomain,
      selectedPlan: onboardingData.selectedPlan || 'free'
    });

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

    logger.onboarding.start({
      type,
      companyName,
      adminEmail,
      subdomain,
      selectedPlan,
      timestamp: new Date().toISOString()
    });

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
        panNumber: onboardingData.panNumber || taxRegistrationDetails?.pan,
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
        // Throw validation error with errors array for proper formatting
        const validationError = new Error('Validation failed');
        validationError.name = 'ValidationError';
        validationError.errors = validation.errors || [{
          field: 'unknown',
          message: firstError?.message || 'Validation failed'
        }];
        throw validationError;
      }

      // Check if user is already onboarded (validation passed but user exists)
      if (validation.data?.alreadyOnboarded) {
        logger.onboarding.warning('User is already onboarded, returning redirect response', {
          tenantId: validation.data.tenantId,
          redirectTo: validation.data.redirectTo
        });
        const alreadyOnboardedError = new Error('You have already completed onboarding. Redirecting to dashboard...');
        alreadyOnboardedError.name = 'AlreadyOnboardedError';
        alreadyOnboardedError.redirectTo = validation.data.redirectTo || '/dashboard';
        alreadyOnboardedError.tenantId = validation.data.tenantId;
        await logger.finalize({ success: false, reason: 'already_onboarded' });
        throw alreadyOnboardedError;
      }

      // 2. GENERATE/CONfirm SUBDOMAIN
      logger.onboarding.step(2, 'SUBDOMAIN_GENERATION', 'Generating/confirming subdomain');
      const finalSubdomain = validation.data.generatedSubdomain || subdomain ||
        await OnboardingValidationService.generateUniqueSubdomain(companyName);
      logger.onboarding.success('Subdomain generated', { subdomain: finalSubdomain });

      // 3. EXTRACT AND VALIDATE AUTHENTICATION (if request provided)
      logger.onboarding.step(3, 'AUTHENTICATION', 'Extracting and validating authentication');
      const authResult = await this.extractAndValidateAuthentication(request, logger);
      logger.onboarding.success('Authentication validated', { userId: authResult.user?.kindeUserId });

      // 4. SETUP KINDE ORGANIZATION AND USER
      logger.onboarding.step(4, 'KINDE_SETUP', 'Setting up Kinde organization and user');
      const kindeResult = await this.setupKindeIntegration({
        companyName,
        adminEmail,
        firstName,
        lastName,
        subdomain: finalSubdomain,
        existingUser: authResult.user
      }, logger);

      // 5. CREATE ALL DATABASE RECORDS IN SINGLE TRANSACTION
      // This ensures atomicity - if any step fails, everything rolls back
      logger.onboarding.step(5, 'TRANSACTIONAL_DATABASE_CREATION', 'Creating all database records in single transaction');
      let dbResult;
      let kindeOrgIdForCleanup = kindeResult.orgCode; // Store for potential cleanup
      
      try {
        dbResult = await this.createCompleteOnboardingInTransaction({
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
          taxRegistrationDetails,
          maxUsers,
          maxProjects,
          planName,
          planPrice
        }, logger);

        logger.onboarding.success('All database records created successfully in transaction', {
          tenantId: dbResult.tenant.tenantId,
          organizationId: dbResult.organization.organizationId,
          userId: dbResult.adminUser.userId,
          subscriptionId: dbResult.subscription?.subscriptionId,
          creditsAllocated: dbResult.creditResult?.amount
        });
      } catch (transactionError) {
        // Transaction failed - everything rolled back automatically
        console.error('❌ Transaction failed, all changes rolled back:', transactionError);
        
        // Store form data for retry
        const authResult = await this.extractAndValidateAuthentication(request, logger);
        const kindeUserId = authResult.user?.kindeUserId || kindeResult.userId;
        
        if (kindeUserId && adminEmail) {
          await this.storeOnboardingFormDataForRetry({
            kindeUserId,
            email: adminEmail,
            formData: onboardingData,
            error: {
              message: transactionError.message,
              name: transactionError.name,
              step: 'database_transaction_failed'
            }
          });
        }

        // Note: Kinde organization was created but DB transaction failed
        // We could optionally clean up Kinde org here, but leaving it for now
        // as it doesn't cause issues and user can retry
        
        throw transactionError;
      }

      // 6. VERIFY ONBOARDING COMPLETION (CRITICAL STEP)
      logger.onboarding.step(6, 'VERIFICATION', 'Verifying all onboarding steps completed successfully');
      const { OnboardingVerificationService } = await import('./onboarding-verification-service.js');
      const verificationResult = await OnboardingVerificationService.verifyOnboardingCompletion(
        dbResult.tenant.tenantId,
        logger
      );

      if (!verificationResult.verified) {
        const criticalIssues = verificationResult.criticalIssues || [];
        const missingItems = verificationResult.details?.missingItems || [];
        
        logger.onboarding.error('Onboarding verification failed', null, {
          criticalIssues: criticalIssues.map(i => `${i.step}: ${i.issue}`),
          missingItems
        });

        // Attempt to fix issues automatically
        const fixResult = await OnboardingVerificationService.autoFixOnboardingIssues(
          dbResult.tenant.tenantId,
          verificationResult,
          logger
        );

        if (!fixResult.success) {
          // If auto-fix fails, throw error with details
          const errorMessage = `Onboarding incomplete. Missing: ${missingItems.join(', ')}. Issues: ${criticalIssues.map(i => i.issue).join('; ')}`;
          throw new Error(errorMessage);
        }

        // Re-verify after auto-fix
        const reVerificationResult = await OnboardingVerificationService.verifyOnboardingCompletion(
          dbResult.tenant.tenantId,
          logger
        );

        if (!reVerificationResult.verified) {
          const missingItems = reVerificationResult.details?.missingItems || [];
          const criticalIssues = reVerificationResult.criticalIssues || [];
          const missingItemsStr = missingItems.length > 0 
            ? missingItems.join(', ') 
            : criticalIssues.map(i => `${i.step}: ${i.issue}`).join('; ') || 'Unknown verification issues';
          const errorMessage = `Onboarding verification failed after auto-fix. Missing: ${missingItemsStr}`;
          throw new Error(errorMessage);
        }
      }

      logger.onboarding.success('Onboarding verification passed - all components verified', {
        applicationAssignments: verificationResult.details.applicationAssignments.length
      });

      // 7. MARK ONBOARDING AS COMPLETE IN DATABASE (only after verification passes)
      logger.onboarding.step(7, 'MARKING_COMPLETE', 'Marking onboarding as complete in database');
      await db
        .update(tenants)
        .set({
          onboardingCompleted: true,
          onboardingStep: 'completed',
          setupCompletionRate: 100,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, dbResult.tenant.tenantId));
      
      logger.onboarding.success('Onboarding marked as complete in database');

      // 8. DELETE STORED FORM DATA (if exists) since onboarding succeeded
      try {
        const authResult = await this.extractAndValidateAuthentication(request, logger);
        const kindeUserId = authResult.user?.kindeUserId || kindeResult.userId;
        if (kindeUserId && adminEmail) {
          await this.deleteStoredOnboardingFormData(kindeUserId, adminEmail);
        }
      } catch (deleteError) {
        console.warn('⚠️ Failed to delete stored form data (non-critical):', deleteError.message);
      }

      // 8. TRACK ONBOARDING COMPLETION
      logger.onboarding.step(8, 'TRACKING', 'Tracking onboarding completion');
      await this.trackOnboardingCompletion({
        tenantId: dbResult.tenant.tenantId,
        type,
        companyName,
        adminEmail,
        subdomain: finalSubdomain,
        selectedPlan,
        creditAmount: dbResult.creditResult.amount
      });

      logger.onboarding.success(`Unified ${type} onboarding completed successfully`, {
        tenantId: dbResult.tenant.tenantId,
        organizationId: dbResult.organization.organizationId,
        userId: dbResult.adminUser.userId,
        verified: true
      });

      // Finalize logger with success
      const logResult = await logger.finalize({
        success: true,
        verified: true,
        tenantId: dbResult.tenant.tenantId,
        organizationId: dbResult.organization.organizationId,
        userId: dbResult.adminUser.userId,
        verificationDetails: {
          applicationAssignments: verificationResult.details.applicationAssignments.length
        }
      });

      return {
        success: true,
        verified: true,
        tenant: dbResult.tenant,
        adminUser: dbResult.adminUser,
        organization: dbResult.organization,
        adminRole: dbResult.adminRole,
        subscription: dbResult.subscription,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard`,
        logFile: logResult.logFile, // Include log file path in response
        onboardingType: type,
        creditAllocated: dbResult.creditResult.amount,
        verification: {
          verified: true,
          applicationAssignments: verificationResult.details.applicationAssignments.length
        }
      };

    } catch (error) {
      logger.onboarding.error(`Unified ${type} onboarding failed`, error, {
        companyName,
        adminEmail,
        type
      });

      // Store form data for retry if we got past validation
      try {
        const authResult = await this.extractAndValidateAuthentication(request, logger);
        const kindeUserId = authResult.user?.kindeUserId || null;
        
        if (kindeUserId && adminEmail) {
          await this.storeOnboardingFormDataForRetry({
            kindeUserId,
            email: adminEmail,
            formData: onboardingData,
            error: {
              message: error.message,
              name: error.name,
              step: 'onboarding_failed'
            }
          });
        }
      } catch (storeError) {
        console.error('⚠️ Failed to store form data for retry:', storeError.message);
        // Don't fail on storage error
      }
      
      // Finalize logger with error
      await logger.finalize({
        success: false,
        error: {
          message: error.message,
          name: error.name,
          stack: error.stack
        }
      });
      
      throw error;
    }
  }

  /**
   * 💾 **STORE ONBOARDING FORM DATA FOR RETRY**
   * Stores form data when onboarding fails so user can retry
   */
  static async storeOnboardingFormDataForRetry({ kindeUserId, email, formData, error }) {
    try {
      console.log('💾 Storing onboarding form data for retry:', { kindeUserId, email });

      // Check if form data already exists
      const existing = await systemDbConnection
        .select()
        .from(onboardingFormData)
        .where(and(
          eq(onboardingFormData.kindeUserId, kindeUserId),
          eq(onboardingFormData.email, email)
        ))
        .limit(1);

      if (existing.length > 0) {
        // Update existing record
        await systemDbConnection
          .update(onboardingFormData)
          .set({
            formData: formData,
            stepData: {
              error: error,
              lastAttempt: new Date().toISOString()
            },
            lastSaved: new Date(),
            updatedAt: new Date()
          })
          .where(eq(onboardingFormData.id, existing[0].id));
        console.log('✅ Updated existing onboarding form data for retry');
      } else {
        // Create new record
        await systemDbConnection
          .insert(onboardingFormData)
          .values({
            kindeUserId,
            email,
            flowType: formData.type || 'frontend',
            formData: formData,
            stepData: {
              error: error,
              lastAttempt: new Date().toISOString()
            },
            currentStep: error?.step || 'failed',
            lastSaved: new Date(),
            createdAt: new Date(),
            updatedAt: new Date()
          });
        console.log('✅ Stored onboarding form data for retry');
      }
    } catch (storeError) {
      console.error('❌ Failed to store onboarding form data:', storeError);
      throw storeError;
    }
  }

  /**
   * 📥 **GET STORED ONBOARDING FORM DATA**
   * Retrieves stored form data for retry
   */
  static async getStoredOnboardingFormData(kindeUserId, email) {
    try {
      const [stored] = await systemDbConnection
        .select()
        .from(onboardingFormData)
        .where(and(
          eq(onboardingFormData.kindeUserId, kindeUserId),
          eq(onboardingFormData.email, email)
        ))
        .limit(1);

      if (!stored) {
        return null;
      }

      return {
        id: stored.id,
        formData: stored.formData,
        stepData: stored.stepData,
        currentStep: stored.currentStep,
        flowType: stored.flowType,
        lastSaved: stored.lastSaved
      };
    } catch (error) {
      console.error('❌ Failed to get stored onboarding form data:', error);
      throw error;
    }
  }

  /**
   * 🗑️ **DELETE STORED ONBOARDING FORM DATA**
   * Deletes stored form data after successful retry
   */
  static async deleteStoredOnboardingFormData(kindeUserId, email) {
    try {
      await systemDbConnection
        .delete(onboardingFormData)
        .where(and(
          eq(onboardingFormData.kindeUserId, kindeUserId),
          eq(onboardingFormData.email, email)
        ));
      console.log('✅ Deleted stored onboarding form data');
    } catch (error) {
      console.error('❌ Failed to delete stored onboarding form data:', error);
      throw error;
    }
  }

  /**
   * 🔐 **EXTRACT AND VALIDATE AUTHENTICATION**
   * Centralized authentication handling
   */
  static async extractAndValidateAuthentication(request, logger = null) {
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
  static async setupKindeIntegration({ companyName, adminEmail, firstName, lastName, subdomain, existingUser }, logger = null) {
    if (logger) logger.kinde.start('Setting up Kinde integration', { companyName, adminEmail });

    // Create Kinde organization with fallback
    let kindeOrg;
    let actualOrgCode;
    let orgCreatedWithFallback = false;

    try {
      const externalId = `tenant_${uuidv4()}`;
      if (logger) logger.kinde.start('Creating Kinde organization', { companyName, externalId });
      
      kindeOrg = await kindeService.createOrganization({
        name: companyName,
        external_id: externalId,
        feature_flags: {
          theme: {
            button_text_color: '#ffffff'
          }
        }
      });

      // Store the actual Kinde organization code and external_id
      actualOrgCode = kindeOrg?.organization?.code || kindeOrg?.code;
      const kindeExternalId = kindeOrg?.organization?.external_id || externalId;
      
      if (!actualOrgCode) {
        if (logger) logger.kinde.error('Kinde response missing organization code', null, { kindeOrg });
        throw new Error('Failed to get organization code from Kinde response');
      }

      if (logger) logger.kinde.success('Kinde organization created', { 
        orgCode: actualOrgCode,
        externalId: kindeExternalId 
      });
    } catch (kindeError) {
      if (logger) logger.kinde.error('Kinde organization creation failed', kindeError, {
        status: kindeError.response?.status,
        data: kindeError.response?.data
      });
      
      // Use fallback organization code
      actualOrgCode = `org_${subdomain}_${Date.now()}`;
      orgCreatedWithFallback = true;
      kindeOrg = {
        organization: { code: actualOrgCode, name: companyName },
        created_with_fallback: true
      };
      if (logger) logger.kinde.warning('Using fallback organization code', { orgCode: actualOrgCode });
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
        
        // Only try to add if organization was actually created in Kinde (not fallback)
        if (!orgCreatedWithFallback) {
          const addResult = await kindeService.addUserToOrganization(finalKindeUserId, actualOrgCode, {
          role_code: 'org:admin', // Give admin role in the organization
          is_admin: true,
          exclusive: true // Remove from other organizations first
        });
          
          if (addResult?.success) {
            console.log('✅ User successfully added to Kinde organization');
          } else {
            console.warn('⚠️ User addition returned non-success result:', addResult);
          }
        } else {
          console.log('ℹ️ Skipping Kinde user addition (organization created with fallback)');
          console.log('ℹ️ User will need to be added manually via Kinde dashboard or invitation');
        }
      } catch (addUserError) {
        console.error('❌ Failed to add user to Kinde organization:', addUserError.message);
        console.error('❌ Error details:', {
          status: addUserError.response?.status,
          data: addUserError.response?.data,
          message: addUserError.message
        });
        
        // Provide helpful guidance
        if (addUserError.message?.includes('No users added') || addUserError.response?.status === 400) {
          console.log(`
🔧 KINDE ORGANIZATION MANAGEMENT SETUP REQUIRED:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Your M2M client needs organization management permissions.

In your Kinde dashboard:
1. Go to Settings → Applications
2. Find your M2M application
3. Add these scopes: 'admin', 'organizations:read', 'organizations:write'
4. Ensure the M2M client has 'Organization Admin' role
5. The organization must allow M2M management

The user can still access the system - Kinde org assignment is optional.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          `);
        }
        
        // Don't fail the entire onboarding process for this - user can still use the system
        console.log('ℹ️ Continuing onboarding despite Kinde user addition failure');
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
      externalId: kindeOrg?.organization?.external_id || externalId,
      userId: finalKindeUserId,
      userName,
      kindeOrg,
      kindeUser: existingUser ? null : { id: finalKindeUserId }
    };
  }

  /**
   * 🏗️ **CREATE COMPLETE ONBOARDING IN SINGLE TRANSACTION**
   * Wraps ALL database operations in one transaction for atomicity
   * If any step fails, everything rolls back automatically
   */
  static async createCompleteOnboardingInTransaction({
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
    taxRegistrationDetails,
    maxUsers,
    maxProjects,
    planName,
    planPrice
  }, logger = null) {
    console.log('🏗️ Creating complete onboarding in single transaction:', companyName);

    const currentTime = new Date();

    // Wrap ALL database operations in a single transaction
    const result = await systemDbConnection.transaction(async (tx) => {
      // ============================================
      // STEP 1: CREATE TENANT
      // ============================================
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
          industry: businessType || null,
          organizationSize: companySize || null,
          country: country || null,
          defaultTimeZone: timezone || 'UTC',
          defaultCurrency: currency || 'USD',
          phone: contactDirectPhone || contactMobilePhone || null,
          onboardingCompleted: false,
          onboardingStep: 'in_progress',
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
          taxRegistered: taxRegistered || false,
          vatGstRegistered: vatGstRegistered || false,
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

      // ============================================
      // STEP 2: CREATE PRIMARY ORGANIZATION
      // ============================================
      const organizationEntityId = uuidv4();
      const [organization] = await tx
        .insert(entities)
        .values({
          entityId: organizationEntityId,
          tenantId: tenant.tenantId,
          parentEntityId: null,
          entityLevel: 1,
          hierarchyPath: organizationEntityId.toString(),
          fullHierarchyPath: companyName,
          entityName: companyName,
          entityCode: `org_${subdomain}_${Date.now()}`,
          description: `Root organization created during ${type} onboarding`,
          entityType: 'organization',
          organizationType: 'business_unit',
          isActive: true,
          isDefault: true,
          isHeadquarters: true,
          contactEmail: adminEmail,
          createdBy: null,
          updatedBy: null
        })
        .returning({
          organizationId: entities.entityId,
          organizationName: entities.entityName,
          organizationCode: entities.entityCode
        });

      if (!organization || !organization.organizationId) {
        throw new Error('Failed to create root organization entity');
      }

      // ============================================
      // STEP 3: CREATE ADMIN USER
      // ============================================
      const formData = {};
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

      // Update organization with user reference
      await tx
        .update(entities)
        .set({
          createdBy: adminUser.userId,
          updatedBy: adminUser.userId
        })
        .where(eq(entities.entityId, organization.organizationId));

      // ============================================
      // STEP 4: CREATE SUPER ADMIN ROLE
      // ============================================
      // FIXED: Import from permission-matrix.js instead of utils folder
      const { createSuperAdminRoleConfig } = await import('../../../data/permission-matrix.js');
      const roleConfig = createSuperAdminRoleConfig(selectedPlan, tenant.tenantId, adminUser.userId);
      roleConfig.organizationId = tenant.tenantId;

      const [adminRole] = await tx
        .insert(customRoles)
        .values(roleConfig)
        .returning();

      // ============================================
      // STEP 5: ASSIGN ROLE TO ADMIN USER
      // ============================================
      const [roleAssignment] = await tx
        .insert(userRoleAssignments)
        .values({
          userId: adminUser.userId,
          roleId: adminRole.roleId,
          assignedBy: adminUser.userId,
          organizationId: tenant.tenantId
        })
        .returning();

      // ============================================
      // STEP 6: CREATE ORGANIZATION MEMBERSHIP
      // ============================================
      const { organizationMemberships } = await import('../../../db/schema/organization_memberships.js');
      const [orgMembership] = await tx
        .insert(organizationMemberships)
        .values({
          userId: adminUser.userId,
          tenantId: tenant.tenantId,
          entityId: organization.organizationId,
          entityType: 'organization',
          roleId: adminRole.roleId,
          membershipType: 'direct',
          membershipStatus: 'active',
          accessLevel: 'admin',
          isPrimary: true,
          canAccessSubEntities: true,
          createdBy: adminUser.userId,
          joinedAt: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime
        })
        .returning();

      // Update tenantUsers with primary organization reference
      await tx
        .update(tenantUsers)
        .set({
          primaryOrganizationId: organization.organizationId
        })
        .where(eq(tenantUsers.userId, adminUser.userId));

      // ============================================
      // STEP 7: ASSIGN RESPONSIBLE PERSON
      // ============================================
      const { responsiblePersons } = await import('../../../db/schema/responsible_persons.js');
      const [responsiblePerson] = await tx
        .insert(responsiblePersons)
        .values({
          tenantId: tenant.tenantId,
          entityType: 'organization',
          entityId: organization.organizationId,
          userId: adminUser.userId,
          responsibilityLevel: 'primary',
          scope: {
            creditManagement: true,
            userManagement: true,
            auditAccess: true,
            configurationManagement: true,
            reportingAccess: true
          },
          autoPermissions: {
            canApproveTransfers: true,
            canPurchaseCredits: true,
            canManageUsers: true,
            canViewAllAuditLogs: true,
            canConfigureEntity: true,
            canGenerateReports: true
          },
          notificationPreferences: {
            creditAlerts: true,
            userActivities: true,
            systemAlerts: true,
            weeklyReports: true,
            monthlyReports: true
          },
          assignedBy: adminUser.userId,
          assignedAt: currentTime,
          assignmentReason: 'Initial assignment during onboarding - admin user is responsible for primary organization',
          isActive: true,
          isConfirmed: true,
          confirmedAt: currentTime,
          isTemporary: false,
          canDelegate: true
        })
        .returning();

      // Update organization entity with responsible person reference
      await tx
        .update(entities)
        .set({
          responsiblePersonId: adminUser.userId
        })
        .where(eq(entities.entityId, organization.organizationId));

      // ============================================
      // STEP 8: CREATE SUBSCRIPTION
      // ============================================
      let subscription;
      if (selectedPlan === 'free') {
        // For free plan, create subscription record
        const trialDurationMs = 3 * 30 * 24 * 60 * 60 * 1000; // 3 months
        const trialStartDate = new Date();
        const trialEndDate = new Date(Date.now() + trialDurationMs);

        const subscriptionData = {
          subscriptionId: uuidv4(),
          tenantId: tenant.tenantId,
          plan: 'free',
          status: 'active',
          subscribedTools: ['crm'],
          usageLimits: {
            apiCalls: 10000,
            storage: 5000000000, // 5GB
            users: 5,
            roles: 2,
            projects: 10
          },
          monthlyPrice: '0.00',
          yearlyPrice: '0.00',
          billingCycle: 'prepaid',
          trialStart: trialStartDate,
          trialEnd: trialEndDate,
          currentPeriodStart: trialStartDate,
          currentPeriodEnd: trialEndDate,
          addOns: []
        };

        [subscription] = await tx
          .insert(subscriptions)
          .values(subscriptionData)
          .returning();
      } else {
        // Create trial or paid subscription
        const trialDurationMs = process.env.NODE_ENV === 'production' ? 14 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000;
        const trialStartDate = new Date();
        const trialEndDate = new Date(Date.now() + trialDurationMs);

        const subscriptionData = {
          subscriptionId: uuidv4(),
          tenantId: tenant.tenantId,
          plan: selectedPlan,
          status: 'trialing',
          subscribedTools: ['crm'],
          usageLimits: {
            apiCalls: 10000,
            storage: 1000000000, // 1GB
            users: maxUsers || 2,
            roles: 2,
            projects: maxProjects || 5
          },
          monthlyPrice: (planPrice || 0).toString(),
          yearlyPrice: '0.00',
          billingCycle: 'monthly',
          trialStart: trialStartDate,
          trialEnd: trialEndDate,
          currentPeriodStart: trialStartDate,
          currentPeriodEnd: trialEndDate,
          addOns: []
        };

        [subscription] = await tx
          .insert(subscriptions)
          .values(subscriptionData)
          .returning();
      }

      // ============================================
      // STEP 9: ALLOCATE CREDITS TO ORGANIZATION
      // ============================================
      const { PermissionMatrixUtils } = await import('../../../data/permission-matrix.js');
      const planCredits = PermissionMatrixUtils.getPlanCredits(selectedPlan);
      const actualCreditAmount = selectedPlan === 'free' ? 1000 : (planCredits.free || 1000);

      // Check if credit record exists
      const existingCredits = await tx
        .select()
        .from(credits)
        .where(and(
          eq(credits.tenantId, tenant.tenantId),
          eq(credits.entityId, organization.organizationId)
        ))
        .limit(1);

      const previousBalance = existingCredits.length > 0 ? parseFloat(existingCredits[0].availableCredits || '0') : 0;
      const newBalance = previousBalance + actualCreditAmount;

      if (existingCredits.length > 0) {
        // Update existing credit record
        await tx
          .update(credits)
          .set({
            availableCredits: newBalance.toString(),
            lastUpdatedAt: currentTime
          })
          .where(eq(credits.creditId, existingCredits[0].creditId));
      } else {
        // Create new credit record
        await tx
          .insert(credits)
          .values({
            creditId: uuidv4(),
            tenantId: tenant.tenantId,
            entityId: organization.organizationId,
            availableCredits: actualCreditAmount.toString(),
            isActive: true,
            lastUpdatedAt: currentTime
          });
      }

      // Create credit transaction record
      await tx
        .insert(creditTransactions)
        .values({
          transactionId: uuidv4(),
          tenantId: tenant.tenantId,
          entityId: organization.organizationId,
          transactionType: 'allocation',
          amount: actualCreditAmount.toString(),
          previousBalance: previousBalance.toString(),
          newBalance: newBalance.toString(),
          operationCode: 'onboarding',
          initiatedBy: null // System-initiated, no user ID
        });

      // ============================================
      // STEP 10: CONFIGURE APPLICATIONS WITH MODULES
      // ============================================
      const { PLAN_ACCESS_MATRIX } = await import('../../../data/permission-matrix.js');
      const planAccess = PLAN_ACCESS_MATRIX[selectedPlan];
      
      if (!planAccess) {
        throw new Error(`Plan ${selectedPlan} not found in PLAN_ACCESS_MATRIX`);
      }

      const appCodes = planAccess.applications || [];
      const modulesByApp = planAccess.modules || {};

      const { applications, organizationApplications, applicationModules } = await import('../../../db/schema/suite-schema.js');

      // Get application IDs from app codes
      const appRecords = await tx
        .select({ appId: applications.appId, appCode: applications.appCode })
        .from(applications)
        .where(eq(applications.status, 'active'));

      const appCodeToIdMap = {};
      appRecords.forEach(app => {
        appCodeToIdMap[app.appCode] = app.appId;
      });

      // Calculate expiry date
      const expiryDate = new Date();
      const expiryMonths = selectedPlan === 'free' ? 12 : (selectedPlan === 'enterprise' ? 24 : 12);
      expiryDate.setMonth(expiryDate.getMonth() + expiryMonths);

      // Insert organization applications with enabled modules
      const applicationsToInsert = [];
      for (const appCode of appCodes) {
        const normalizeAppCode = (code) => {
          const codeMap = {
            'affiliateconnect': 'affiliateConnect',
            'affiliate': 'affiliateConnect'
          };
          return codeMap[code.toLowerCase()] || code;
        };

        const normalizedCode = normalizeAppCode(appCode);
        const appId = appCodeToIdMap[normalizedCode];
        
        if (appId) {
          const enabledModules = modulesByApp[appCode] || [];
          let finalEnabledModules = enabledModules;
          
          if (enabledModules === '*') {
            // Get all modules for this application
            const allModules = await tx
              .select({ moduleCode: applicationModules.moduleCode })
              .from(applicationModules)
              .where(eq(applicationModules.appId, appId));
            finalEnabledModules = allModules.map(m => m.moduleCode);
          }

          applicationsToInsert.push({
            id: uuidv4(),
            tenantId: tenant.tenantId,
            appId,
            subscriptionTier: selectedPlan,
            isEnabled: true,
            enabledModules: finalEnabledModules,
            customPermissions: {},
            expiresAt: expiryDate
          });
        }
      }

      if (applicationsToInsert.length > 0) {
        await tx
          .insert(organizationApplications)
          .values(applicationsToInsert);
      }

      // Return all created records
      return {
        tenant,
        organization,
        adminUser,
        adminRole,
        roleAssignment,
        orgMembership,
        responsiblePerson,
        subscription,
        creditResult: {
          amount: actualCreditAmount,
          creditType: 'free',
          planId: selectedPlan
        },
        applicationsConfigured: applicationsToInsert.length
      };
    });

    console.log('✅ Complete onboarding transaction committed successfully');
    return result;
  }

  /**
   * 🏗️ **CREATE DATABASE RECORDS** (LEGACY - DEPRECATED)
   * Use createCompleteOnboardingInTransaction instead
   * Kept for backward compatibility
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
    }, logger = null) {
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
           kindeOrgId, // Store actual Kinde organization code
           adminEmail,
           gstin: hasGstin && gstin ? gstin.toUpperCase() : null,
           subscriptionTier: selectedPlan,
           // Store all form data fields
           industry: businessType || null,
           organizationSize: companySize || null,
           country: country || null,
           defaultTimeZone: timezone || 'UTC',
           defaultCurrency: currency || 'USD',
           phone: contactDirectPhone || contactMobilePhone || null,
          onboardingCompleted: false, // Will be set to true after verification
          onboardingStep: 'in_progress',
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
      // FIXED: Import from permission-matrix.js instead of utils folder
      const { createSuperAdminRoleConfig } = await import('../../../data/permission-matrix.js');
      const roleConfig = createSuperAdminRoleConfig(selectedPlan, tenant.tenantId, adminUser.userId);
      
      // IMPORTANT: organizationId must reference tenants.tenant_id (not entities.entity_id)
      // For root organization admin role, use tenantId as organizationId
      // The schema constraint requires organizationId to reference tenants.tenant_id
      roleConfig.organizationId = tenant.tenantId;

      const [adminRole] = await tx
        .insert(customRoles)
        .values(roleConfig)
        .returning();

      // 5. Assign admin role to admin user
      // IMPORTANT: userRoleAssignments.organizationId also references tenants.tenant_id (not entities.entity_id)
      const [roleAssignment] = await tx
        .insert(userRoleAssignments)
        .values({
          userId: adminUser.userId,
          roleId: adminRole.roleId,
          assignedBy: adminUser.userId,
          organizationId: tenant.tenantId // Must reference tenants.tenant_id per schema constraint
        })
        .returning();

      // 6. Create organization membership for admin user (CRITICAL FIX)
      const { organizationMemberships } = await import('../../../db/schema/organization_memberships.js');
      const [orgMembership] = await tx
        .insert(organizationMemberships)
        .values({
          userId: adminUser.userId,
          tenantId: tenant.tenantId,
          entityId: organization.organizationId, // Reference to entities table
          entityType: 'organization',
          roleId: adminRole.roleId,
          membershipType: 'direct',
          membershipStatus: 'active',
          accessLevel: 'admin',
          isPrimary: true, // This is the primary organization
          canAccessSubEntities: true,
          createdBy: adminUser.userId,
          joinedAt: currentTime,
          createdAt: currentTime,
          updatedAt: currentTime
        })
        .returning();

      // 7. Update tenantUsers with primary organization reference
      await tx
        .update(tenantUsers)
        .set({
          primaryOrganizationId: organization.organizationId
        })
        .where(eq(tenantUsers.userId, adminUser.userId));

      console.log(`✅ Organization membership created for admin user: ${orgMembership.membershipId}`);

      // 8. Assign admin as responsible person for the organization
      const { responsiblePersons } = await import('../../../db/schema/responsible_persons.js');
      const [responsiblePerson] = await tx
        .insert(responsiblePersons)
        .values({
          tenantId: tenant.tenantId,
          entityType: 'organization',
          entityId: organization.organizationId,
          userId: adminUser.userId,
          responsibilityLevel: 'primary',
          scope: {
            creditManagement: true,
            userManagement: true,
            auditAccess: true,
            configurationManagement: true,
            reportingAccess: true
          },
          autoPermissions: {
            canApproveTransfers: true,
            canPurchaseCredits: true,
            canManageUsers: true,
            canViewAllAuditLogs: true,
            canConfigureEntity: true,
            canGenerateReports: true
          },
          notificationPreferences: {
            creditAlerts: true,
            userActivities: true,
            systemAlerts: true,
            weeklyReports: true,
            monthlyReports: true
          },
          assignedBy: adminUser.userId,
          assignedAt: currentTime,
          assignmentReason: 'Initial assignment during onboarding - admin user is responsible for primary organization',
          isActive: true,
          isConfirmed: true,
          confirmedAt: currentTime,
          isTemporary: false,
          canDelegate: true
        })
        .returning();

      // 9. Update organization entity with responsible person reference
      await tx
        .update(entities)
        .set({
          responsiblePersonId: adminUser.userId
        })
        .where(eq(entities.entityId, organization.organizationId));

      console.log(`✅ Admin assigned as responsible person for organization: ${responsiblePerson.assignmentId}`);

      return {
        tenant,
        organization,
        adminUser,
        adminRole,
        roleAssignment,
        orgMembership,
        responsiblePerson
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
      const { PermissionMatrixUtils } = await import('../../../data/permission-matrix.js');
      const planCredits = PermissionMatrixUtils.getPlanCredits(selectedPlan);
      // Free plan gets 1000 credits as per requirements
      const actualCreditAmount = selectedPlan === 'free' ? 1000 : (planCredits.free || 1000);

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
  static async configureSubdomainSystem(subdomainData, logger = null) {
    if (logger) logger.info('api', 'Configuring subdomain system', {
      subdomain: subdomainData.subdomain,
      tenantId: subdomainData.tenantId
    });

    // Get system database connection
    const { systemDbConnection } = await import('../../../db/index.js');
    const systemDb = systemDbConnection;

    // Update tenant with subdomain information
    const { tenants } = await import('../../../db/schema/index.js');
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

