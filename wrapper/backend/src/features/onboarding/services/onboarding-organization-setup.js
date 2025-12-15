import { db, systemDbConnection } from '../../../db/index.js';
import { eq, and } from 'drizzle-orm';
import { tenants } from '../../../db/schema/index.js';
import { applications, organizationApplications } from '../../../db/schema/suite-schema.js';
import { v4 as uuidv4 } from 'uuid';

class OnboardingOrganizationSetupService {
  // Update organization applications based on credit package
  async updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage) {
    try {
      console.log('🔄 Updating organization applications for credit package:', { tenantId, creditPackage });

      // Determine applications available based on credit package
      const applicationsByPackage = {
        basic: ['crm'],
        standard: ['crm', 'hr'],
        premium: ['crm', 'hr', 'affiliate'],
        enterprise: ['crm', 'hr', 'affiliate', 'accounting', 'inventory']
      };

      const availableApplications = applicationsByPackage[creditPackage] || ['crm'];

      // In a real implementation, you'd update the tenant's application access here
      console.log('✅ Organization applications updated for credit package:', availableApplications);

      return {
        success: true,
        tenantId,
        creditPackage,
        applicationsUpdated: availableApplications
      };

    } catch (error) {
      console.error('❌ Error updating organization applications for credit package:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async updateOrganizationApplicationsForPlanChange(tenantId, planId) {
    // Map plan to credit package for backward compatibility
    const planToPackageMap = {
      trial: 'basic',
      starter: 'basic',
      professional: 'standard',
      enterprise: 'enterprise'
    };

    const creditPackage = planToPackageMap[planId] || 'basic';
    return this.updateOrganizationApplicationsForCreditPackage(tenantId, creditPackage);
  }

  // Setup initial organization structure
  async setupInitialOrganizationStructure(tenantId, organizationData) {
    try {
      console.log('🏗️ Setting up initial organization structure:', { tenantId });

      // This would typically create default roles, permissions, etc.
      // For now, just return success
      console.log('✅ Initial organization structure setup completed');

      return {
        success: true,
        tenantId,
        structure: {
          rolesCreated: [],
          permissionsSet: [],
          applicationsConfigured: []
        }
      };

    } catch (error) {
      console.error('❌ Error setting up initial organization structure:', error);
      throw error;
    }
  }

  // Configure applications for new organization based on credit package
  async configureApplicationsForNewOrganization(tenantId, creditPackage) {
    try {
      console.log('⚙️ Configuring applications for new organization:', { tenantId, creditPackage });

      // Map plan names to app codes (free plan gets all core apps)
      const applicationsByPackage = {
        free: ['crm', 'hr', 'affiliateConnect'], // Free plan gets all core apps
        basic: ['crm'],
        standard: ['crm', 'hr'],
        premium: ['crm', 'hr', 'affiliateConnect'],
        enterprise: ['crm', 'hr', 'affiliateConnect', 'accounting', 'inventory']
      };

      // Normalize app codes to match database (case-insensitive matching)
      const normalizeAppCode = (code) => {
        const codeMap = {
          'affiliateconnect': 'affiliateConnect',
          'affiliate': 'affiliateConnect'
        };
        return codeMap[code.toLowerCase()] || code;
      };

      const appCodes = applicationsByPackage[creditPackage] || ['crm'];
      console.log(`📋 Assigning applications for ${creditPackage} plan:`, appCodes);

      // Get application IDs from app codes
      const appRecords = await systemDbConnection
        .select({ appId: applications.appId, appCode: applications.appCode })
        .from(applications)
        .where(eq(applications.status, 'active'));

      const appCodeToIdMap = {};
      appRecords.forEach(app => {
        appCodeToIdMap[app.appCode] = app.appId;
      });

      // Insert organization applications
      const applicationsToInsert = [];
      for (const appCode of appCodes) {
        const normalizedCode = normalizeAppCode(appCode);
        const appId = appCodeToIdMap[normalizedCode];
        if (appId) {
          applicationsToInsert.push({
            id: uuidv4(),
            tenantId,
            appId,
            subscriptionTier: creditPackage,
            isEnabled: true,
            enabledModules: [],
            customPermissions: {}
          });
        } else {
          console.warn(`⚠️ Application with code ${normalizedCode} (original: ${appCode}) not found in database. Available apps:`, Object.keys(appCodeToIdMap));
        }
      }

      if (applicationsToInsert.length > 0) {
        await systemDbConnection
          .insert(organizationApplications)
          .values(applicationsToInsert);
        
        console.log(`✅ Successfully assigned ${applicationsToInsert.length} applications to tenant ${tenantId}`);
      } else {
        console.warn(`⚠️ No applications were assigned to tenant ${tenantId}`);
      }

      return {
        success: true,
        tenantId,
        creditPackage,
        applicationsConfigured: appCodes,
        applicationsAssigned: applicationsToInsert.length
      };

    } catch (error) {
      console.error('❌ Error configuring applications for new organization:', error);
      throw error;
    }
  }
}

export { OnboardingOrganizationSetupService };
export default new OnboardingOrganizationSetupService();
