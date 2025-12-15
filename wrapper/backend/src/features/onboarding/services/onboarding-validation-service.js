/**
 * 🚀 **ONBOARDING VALIDATION SERVICE**
 * Handles validation checks during onboarding process
 * Ensures no duplicate emails or other conflicts exist
 */

import { systemDbConnection } from '../../../db/index.js';
import { tenants, tenantUsers } from '../../../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

class OnboardingValidationService {

  /**
   * Check for duplicate emails during onboarding
   * @param {Object} data - Validation data
   * @param {string} data.adminEmail - Admin email to check
   * @returns {Object} Result with available status and onboarding status
   * @throws {Error} If duplicate email is found (only for non-onboarded users)
   */
  static async checkForDuplicates(data) {
    const { adminEmail } = data;

    if (!adminEmail) {
      throw new Error('Email is required for duplicate checking');
    }

    console.log('🔍 Checking for duplicate email:', adminEmail);

    // Check if email already exists as adminEmail in tenants table
    const existingTenant = await systemDbConnection
      .select({ 
        tenantId: tenants.tenantId,
        onboardingCompleted: tenants.onboardingCompleted,
        companyName: tenants.companyName
      })
      .from(tenants)
      .where(eq(tenants.adminEmail, adminEmail))
      .limit(1);

    if (existingTenant.length > 0) {
      const tenant = existingTenant[0];
      // If onboarding is already completed, this is not an error - user should be redirected
      if (tenant.onboardingCompleted === true) {
        console.log('✅ Email found with completed onboarding - user should be redirected to dashboard');
        return { 
          available: false, 
          alreadyOnboarded: true,
          tenantId: tenant.tenantId,
          companyName: tenant.companyName
        };
      }
      // If onboarding is not completed, treat as duplicate
      console.log('❌ Duplicate email found in tenants table with incomplete onboarding:', adminEmail);
      throw new Error('This email is already associated with an organization');
    }

    // Also check if email exists in tenantUsers table (as a user)
    const existingUser = await systemDbConnection
      .select({ 
        userId: tenantUsers.userId, 
        tenantId: tenantUsers.tenantId,
        onboardingCompleted: tenantUsers.onboardingCompleted
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.email, adminEmail))
      .limit(1);

    if (existingUser.length > 0) {
      const user = existingUser[0];
      // If user is already onboarded, this is not an error - user should be redirected
      if (user.onboardingCompleted === true) {
        console.log('✅ Email found as user with completed onboarding - user should be redirected to dashboard');
        return { 
          available: false, 
          alreadyOnboarded: true,
          tenantId: user.tenantId,
          userId: user.userId
        };
      }
      // If onboarding is not completed, treat as duplicate
      console.log('❌ Duplicate email found in tenantUsers table with incomplete onboarding:', adminEmail);
      throw new Error('This email is already registered as a user');
    }

    console.log('✅ No duplicates found for email:', adminEmail);
    return { available: true };
  }

  /**
   * Check if subdomain is available
   * @param {string} subdomain - Subdomain to check
   * @returns {boolean} True if available, false otherwise
   */
  static async checkSubdomainAvailability(subdomain) {
    if (!subdomain) {
      throw new Error('Subdomain is required');
    }

    console.log('🔍 Checking subdomain availability:', subdomain);

    const existingTenant = await systemDbConnection
      .select({ tenantId: tenants.tenantId })
      .from(tenants)
      .where(eq(tenants.subdomain, subdomain))
      .limit(1);

    const isAvailable = existingTenant.length === 0;
    console.log(isAvailable ? '✅ Subdomain available' : '❌ Subdomain taken:', subdomain);

    return isAvailable;
  }

  /**
   * Validate complete onboarding data
   * @param {Object} data - Onboarding data to validate
   * @param {string} type - Type of onboarding ('frontend' or 'enhanced')
   * @returns {Object} Validation result with success status and data
   */
  static async validateCompleteOnboarding(data, type) {
    console.log('🔍 Validating complete onboarding data for type:', type);

    const errors = [];

    // Common validations
    if (!data.email && !data.adminEmail) {
      errors.push({ field: 'email', message: 'Email is required' });
    }

    const email = data.email || data.adminEmail;

    // Email format validation
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Type-specific validations
    if (type === 'frontend') {
      if (!data.legalCompanyName) {
        errors.push({ field: 'legalCompanyName', message: 'Company name is required' });
      }
      if (!data.firstName) {
        errors.push({ field: 'firstName', message: 'First name is required' });
      }
      if (!data.lastName) {
        errors.push({ field: 'lastName', message: 'Last name is required' });
      }
      if (data.termsAccepted !== true) {
        errors.push({ field: 'termsAccepted', message: 'You must accept the terms and conditions' });
      }
      if (data.hasGstin && !data.gstin) {
        errors.push({ field: 'gstin', message: 'GSTIN is required when hasGstin is true' });
      }
    } else if (type === 'enhanced') {
      if (!data.companyName) {
        errors.push({ field: 'companyName', message: 'Company name is required' });
      }
      if (!data.subdomain) {
        errors.push({ field: 'subdomain', message: 'Subdomain is required' });
      }
    }

    // Check for duplicate email
    if (email && errors.length === 0) {
      try {
        const duplicateCheck = await this.checkForDuplicates({ adminEmail: email });
        // If user is already onboarded, return success with redirect flag
        if (duplicateCheck.alreadyOnboarded) {
          return {
            success: true,
            data: {
              generatedSubdomain: null,
              alreadyOnboarded: true,
              tenantId: duplicateCheck.tenantId,
              redirectTo: '/dashboard'
            }
          };
        }
      } catch (duplicateError) {
        errors.push({ field: 'email', message: duplicateError.message });
      }
    }

    // Generate subdomain if needed (for frontend type)
    let generatedSubdomain = null;
    if (type === 'frontend' && data.legalCompanyName && errors.length === 0) {
      generatedSubdomain = await this.generateUniqueSubdomain(data.legalCompanyName);
    }

    if (errors.length > 0) {
      console.log('❌ Validation failed:', errors);
      return {
        success: false,
        errors
      };
    }

    console.log('✅ Validation successful');
    return {
      success: true,
      data: {
        generatedSubdomain
      }
    };
  }

  /**
   * Generate a unique subdomain from company name
   * @param {string} companyName - Company name to generate subdomain from
   * @returns {string} Unique subdomain
   */
  static async generateUniqueSubdomain(companyName) {
    if (!companyName) {
      throw new Error('Company name is required to generate subdomain');
    }

    console.log('🔧 Generating unique subdomain for:', companyName);

    // Convert company name to subdomain-friendly format
    let baseSubdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
      .substring(0, 30); // Limit length

    // Ensure it doesn't start with a number
    if (/^\d/.test(baseSubdomain)) {
      baseSubdomain = 'org-' + baseSubdomain;
    }

    // Check availability and add suffix if needed
    let subdomain = baseSubdomain;
    let suffix = 1;
    let isAvailable = await this.checkSubdomainAvailability(subdomain);

    while (!isAvailable) {
      subdomain = `${baseSubdomain}-${suffix}`;
      isAvailable = await this.checkSubdomainAvailability(subdomain);
      suffix++;

      // Safety check to prevent infinite loop
      if (suffix > 100) {
        subdomain = `${baseSubdomain}-${Date.now()}`;
        break;
      }
    }

    console.log('✅ Generated unique subdomain:', subdomain);
    return subdomain;
  }
}

export default OnboardingValidationService;



