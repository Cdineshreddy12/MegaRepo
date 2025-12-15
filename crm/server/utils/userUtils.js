import CrmTenantUser from '../models/CrmTenantUser.js';

/**
 * Update or create CRM tenant user record
 * @param {string} tenantId - The tenant identifier
 * @param {Object} userContext - User context object containing user details
 * @param {string} email - User email address
 * @returns {Promise<Object>} The updated or created CRM tenant user document
 */
export async function updateCrmTenantUser(tenantId, userContext, email) {
  try {
    console.log('🔄 Updating CRM tenant user record...');
    console.log('📧 Email:', email);
    console.log('🏢 Tenant ID:', tenantId);
    console.log('👤 User ID:', userContext.userId);

    // Prepare the data for upsert
    const userData = {
      userId: userContext.userId,
      tenantId: tenantId,
      kindeId: userContext.kindeId || userContext.userId,
      email: email,
      firstName: userContext.profile?.firstName || userContext.firstName || '',
      lastName: userContext.profile?.lastName || userContext.lastName || '',
      primaryOrganizationId: userContext.primaryOrganizationId,
      isTenantAdmin: userContext.isTenantAdmin || false,
      onboardingCompleted: userContext.onboardingCompleted || false,
      preferences: userContext.preferences || {
        theme: 'auto',
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'YYYY-MM-DD',
        notifications: {
          email: true,
          inApp: true,
          marketing: false
        }
      },
      profile: userContext.profile || {},
      isVerified: true, // Set as verified during authentication
      security: {
        twoFactorEnabled: false,
        accountLocked: false
      }
    };

    // Use findOneAndUpdate with upsert to create or update the user
    const crmUser = await CrmTenantUser.findOneAndUpdate(
      {
        tenantId: tenantId,
        userId: userContext.userId
      },
      userData,
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true
      }
    );

    console.log('✅ CRM tenant user record updated successfully');
    console.log('👤 User ID:', crmUser.userId);
    console.log('📧 Email:', crmUser.email);
    console.log('🏢 Tenant ID:', crmUser.tenantId);

    return crmUser;

  } catch (error) {
    console.error('❌ Failed to update CRM tenant user record:', error.message);
    console.error('📧 Email:', email);
    console.error('🏢 Tenant ID:', tenantId);
    console.error('👤 User ID:', userContext.userId);
    throw error;
  }
}
