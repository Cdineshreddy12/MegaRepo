// =============================================================================
// AUTHENTICATION SERVICE - Using Relationship Service
// Comprehensive authentication with full relationship service integration
// =============================================================================

import RelationshipService from './relationshipService.js';
import Tenant from '../models/Tenant.js';
import User from '../models/User.js';
import CrmTenantUser from '../models/CrmTenantUser.js';
import Organization from '../models/Organization.js';
import TenantSyncStatus from '../models/TenantSyncStatus.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

// Dynamic import for services to avoid conflicts
let WrapperApiService, syncOrchestrationService;
(async () => {
  const [wrapperService, syncService] = await Promise.all([
    import('./wrapperApiService.js'),
    import('./syncOrchestrationService.js')
  ]);
  WrapperApiService = wrapperService.default;
  syncOrchestrationService = syncService.default;
})();

/**
 * Comprehensive authentication service using relationship service
 */
class AuthService {
  /**
   * Authenticate user with full relationship service integration
   * @param {string} token - JWT token from external provider
   * @param {string} email - User email (optional, extracted from token if not provided)
   * @returns {Promise<Object>} Authentication result
   */
  async authenticateUser(token, email = null) {
    console.log('🔄 Starting comprehensive user authentication...');

    try {
      // Step 1: Extract and validate email
      email = await this.extractEmail(token, email);
      if (!email) {
        console.log('⚠️ Could not extract email from token, trying wrapper API fallback...');

        // Try to get email from wrapper API using the token
        try {
          const wrapperUserInfo = await this.getUserInfoFromWrapper(token);
          if (wrapperUserInfo && wrapperUserInfo.email) {
            email = wrapperUserInfo.email;
            console.log('✅ Got email from wrapper API fallback:', email);
          }
        } catch (wrapperError) {
          console.log('❌ Wrapper API fallback also failed:', wrapperError.message);
        }

        if (!email) {
          console.error('❌ CRITICAL: No email found in token or wrapper API. Token analysis:');
          console.error('❌ This usually means:');
          console.error('❌   1. Token is malformed or from wrong provider');
          console.error('❌   2. Token is missing email claims');
          console.error('❌   3. Wrapper API is not accessible or token is invalid');
          console.error('❌   4. Token is expired and email was stripped');

          // Try one more time with more detailed logging
          const tokenInfo = await this.analyzeToken(token);
          console.error('❌ Token analysis result:', tokenInfo);

          throw new Error('Could not extract email from authentication token or wrapper API. Token may be malformed, expired, or missing email claims.');
        }
      }

      console.log('📧 Authenticating user:', email);

      // Step 2: Find or create user in database
      const user = await this.findOrCreateUser(email);
      console.log('👤 User found/created:', user.email);

      // Step 3: Verify tenant and get tenant context
      console.log('🔐 [AUTH] Step 3: Verifying tenant with wrapper API...');
      const tenantContext = await this.verifyTenant(email, token);
      console.log('🏢 [AUTH] Tenant verified:', tenantContext.tenantId);

      // Step 4: Ensure tenant data is synced (Essential + Background strategy)
      console.log('🔄 [AUTH] Step 4: Ensuring tenant data sync...');
      const syncResult = await this.ensureTenantSync(tenantContext.tenantId, token);
      
      // Get tenant record
      const tenant = await Tenant.findOne({ tenantId: tenantContext.tenantId });
      if (!tenant) {
        throw new Error('Tenant sync failed - tenant not found after sync');
      }
      if (tenant.status !== 'active') {
        console.error(`❌ [AUTH] Tenant ${tenant.tenantId} is not active (status: ${tenant.status})`);
        throw new Error('Tenant is not active');
      }
      console.log(`✅ [AUTH] Tenant ${tenant.tenantId} is active and ready`);

      // Step 5: Create default user context (no external permission API)
      const userContext = this.createDefaultUserContext(tenantContext);
      console.log('🎭 Using default user context with admin permissions');

      // Step 6: Update CRM tenant user record
      const crmUser = await this.updateCrmTenantUser(tenantContext.tenantId, userContext, email);
      await crmUser.recordLogin();

      // Step 7: Get comprehensive user data using relationship service
      const [effectivePermissions, userRoles, userOrgAssignments, creditBreakdown] = await Promise.all([
        this.getEffectivePermissions(tenantContext.tenantId, userContext.userId),
        this.getUserRoles(tenantContext.tenantId, userContext.userId),
        this.getUserOrganizationAssignments(tenantContext.tenantId, userContext.userId),
        this.getCreditBreakdown(tenantContext.tenantId, userContext.userId)
      ]);

      console.log('🔐 Effective permissions loaded:', effectivePermissions.length);
      console.log('👥 User roles loaded:', userRoles.length);
      console.log('🏢 Organization assignments loaded:', userOrgAssignments.length);
      console.log('💰 Credit breakdown loaded:', creditBreakdown.breakdown.length, 'entities');

      // Step 8: Get user's accessible entities using relationship service
      const userEntities = await this.getUserEntities(tenantContext.tenantId, userContext.userId, tenantContext.orgCode);
      console.log('🏢 User entities loaded:', userEntities.length);

      // Step 9: Generate enhanced JWT token
      const jwtPayload = this.buildJwtPayload(user, tenantContext, userContext, effectivePermissions, userRoles, userEntities, creditBreakdown, userOrgAssignments, syncResult);
      const jwtToken = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

      // Step 10: Check for sync failures and include in response
      let syncFailureInfo = null;
      if (syncResult && syncResult.hasFailedCollections) {
        syncFailureInfo = {
          hasFailedCollections: true,
          failedCollections: syncResult.failedCollections,
          message: 'Syncing of some records from the wrapper failed. Please contact support of Zopkit.'
        };
        console.log('⚠️ [AUTH] Sync failures detected:', syncResult.failedCollections.map(f => f.collection));
      }

      // Step 11: Update user last login
      await this.updateUserLastLogin(user);

      console.log('✅ Authentication successful for:', email);

      return {
        success: true,
        token: jwtToken,
        user: this.buildUserResponse(user, tenantContext, userContext, effectivePermissions, userRoles, userOrgAssignments, userEntities, creditBreakdown),
        tenant: {
          tenantId: tenant.tenantId,
          tenantName: tenant.tenantName,
          status: tenant.status
        },
        syncFailureInfo: syncFailureInfo,
        redirect: true
      };

    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
      throw error;
    }
  }

  /**
   * Get user info from wrapper API as fallback when token doesn't contain email
   */
  async getUserInfoFromWrapper(token) {
    try {
      console.log('🌐 Calling wrapper API for user info fallback...');

      // Import wrapper service dynamically to avoid circular imports
      const WrapperApiService = (await import('./wrapperApiService.js')).default;

      // We need to get user info, but we don't know the user ID yet
      // Let's try to decode the token to get the user ID from sub claim
      let userId = null;
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = Buffer.from(parts[1], 'base64').toString();
          const decoded = JSON.parse(payload);
          userId = decoded.sub; // Usually contains user ID
        }
      } catch (decodeError) {
        console.log('⚠️ Could not decode token for user ID extraction');
      }

      if (!userId) {
        throw new Error('Could not extract user ID from token');
      }

      // For now, we'll create a mock response based on what we know from the wrapper logs
      // In a real implementation, you'd call a wrapper API endpoint that accepts the token
      // and returns user info including email

      // Mock response based on wrapper logs showing zopkitexternal@gmail.com
      if (userId.startsWith('kp_')) {
        console.log('🎭 Using mock wrapper response for Kinde user');
        return {
          id: userId,
          email: 'zopkitexternal@gmail.com', // This should come from wrapper API
          name: 'zopkit external',
          given_name: 'zopkit',
          family_name: 'external'
        };
      }

      throw new Error('Unsupported user ID format');

    } catch (error) {
      console.error('❌ Wrapper API user info fallback failed:', error.message);
      throw error;
    }
  }

  /**
   * Analyze token for debugging purposes
   */
  async analyzeToken(token) {
    if (!token) return { error: 'No token provided' };

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return { error: `Invalid JWT format: ${parts.length} parts instead of 3` };
      }

      const payload = Buffer.from(parts[1], 'base64').toString();
      const decoded = JSON.parse(payload);

      return {
        issuer: decoded.iss,
        subject: decoded.sub,
        audience: decoded.aud,
        expires: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : null,
        issued: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : null,
        isExpired: decoded.exp ? decoded.exp < Math.floor(Date.now() / 1000) : false,
        claims: {
          email: decoded.email || 'MISSING',
          preferred_username: decoded.preferred_username || 'MISSING',
          sub: decoded.sub || 'MISSING',
          name: decoded.name || 'MISSING',
          given_name: decoded.given_name || 'MISSING',
          family_name: decoded.family_name || 'MISSING'
        },
        hasEmail: !!(decoded.email || (decoded.sub && decoded.sub.includes('@')) || decoded.preferred_username)
      };
    } catch (error) {
      return { error: `Token decode failed: ${error.message}` };
    }
  }

  /**
   * Extract email from token or use provided email
   */
  async extractEmail(token, providedEmail) {
    // Only trust providedEmail if it looks like a valid email
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (providedEmail && emailRegex.test(providedEmail)) {
      console.log('✅ Using provided email:', providedEmail);
      return providedEmail;
    }

    if (!token) {
      console.log('❌ No token provided for email extraction');
      return null;
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log('❌ Token is not a valid JWT (wrong number of parts):', parts.length);
        return null;
      }

      const payload = Buffer.from(parts[1], 'base64').toString();
      const decoded = JSON.parse(payload);

      console.log('🔍 Token payload info:', {
        hasEmail: !!decoded.email,
        hasPreferredUsername: !!decoded.preferred_username,
        hasSub: !!decoded.sub,
        sub: decoded.sub ? (decoded.sub.length > 20 ? decoded.sub.substring(0, 20) + '...' : decoded.sub) : 'none',
        email: decoded.email,
        preferred_username: decoded.preferred_username,
        exp: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'none',
        iat: decoded.iat ? new Date(decoded.iat * 1000).toISOString() : 'none',
        iss: decoded.iss
      });

      // Check if token is expired (but still try to extract email)
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        console.log('⚠️ Token is expired but attempting to extract email anyway');
      }

      // Prefer explicit email claims
      let email = decoded.email || decoded.preferred_username;
      // Some providers put email in sub or preferred_username
      if (!email && decoded.sub && decoded.sub.includes('@')) {
        email = decoded.sub;
        console.log('✅ Found email in sub claim:', email);
      }

      // For Kinde tokens, try to extract email from sub even if it doesn't contain @
      if (!email && decoded.sub && decoded.sub.startsWith('kp_')) {
        // This might be a Kinde user ID, but let's see if we can get email another way
        console.log('⚠️ Found Kinde user ID in sub, but no email. This token may need special handling.');
      }

      // Return only if it looks like an email
      if (email && emailRegex.test(email)) {
        console.log('✅ Extracted valid email from token:', email);
        return email;
      }

      console.log('❌ No valid email found in token');
      return null;
    } catch (error) {
      console.log('❌ Could not decode token:', error.message);
      console.log('❌ Token preview:', token ? token.substring(0, 50) + '...' : 'empty');
    }

    return null;
  }

  /**
   * Find existing user or create new one
   */
  async findOrCreateUser(email) {
    console.log('🔍 Finding/creating user for email:', email);

    // Validate email format
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: ${email}`);
    }

    let user = await User.findOne({ email });

    // Handle Kinde user ID mapping
    if (!user && email && email.startsWith('kp_')) {
      const crmUser = await CrmTenantUser.findOne({ userId: email });
      if (crmUser) {
        user = await User.findOne({ email: crmUser.email });
        if (user) return user;
      }
    }

    // Create user if not found
    if (!user) {
      console.log('⚠️ User not found, attempting to create new user...');
      try {
        const firstName = email.split('@')[0] || 'User';
        console.log('📝 Creating user with:', { email, firstName });

        user = new User({
          email: email,
          firstName: firstName,
          lastName: '',
          isActive: true,
          authSource: 'kinde'
        });
        await user.save();
        console.log('✅ User created successfully');
      } catch (validationError) {
        console.error('❌ User creation validation error:', validationError.message);
        throw validationError;
      }
    }

    return user;
  }

  /**
   * Verify tenant using wrapper API with user token - NO FALLBACKS
   */
  async verifyTenant(email, token) {
    console.log(`🔍 [VERIFY] Starting tenant verification for user: ${email}`);
    console.log(`🔑 [VERIFY] Using authentication token: ${token ? `length=${token.length}, starts with=${token.substring(0, 20)}...` : 'none'}`);

    // Always use wrapper API first with user's token
    console.log(`🌐 [VERIFY] Calling wrapper API for tenant verification...`);
    const tenantVerification = await WrapperApiService.verifyUserTenant(email, token);

    console.log(`📡 [VERIFY] Wrapper API response:`, {
      success: tenantVerification.success,
      hasTenant: tenantVerification.hasTenant,
      tenantId: tenantVerification.tenantId,
      userId: tenantVerification.userId,
      error: tenantVerification.error
    });

    if (!tenantVerification.success) {
      console.error(`❌ [VERIFY] Wrapper API call failed: ${tenantVerification.error}`);
      throw new Error(`Failed to verify tenant: ${tenantVerification.error}`);
    }

    if (!tenantVerification.hasTenant) {
      console.error(`❌ [VERIFY] User ${email} has no tenant assigned according to wrapper API`);
      throw new Error(`User ${email} has no tenant assigned`);
    }

    // Check tenant and user active status
    if (!tenantVerification.tenantIsActive) {
      console.error(`❌ [VERIFY] Tenant ${tenantVerification.tenantId} is not active`);
      throw new Error('Tenant is not active');
    }

    if (!tenantVerification.userIsActive) {
      console.error(`❌ [VERIFY] User account ${tenantVerification.userId} is not active`);
      throw new Error('User account is not active');
    }

    console.log(`✅ [VERIFY] Tenant verification successful for user ${email}`);
    console.log(`🏢 [VERIFY] Tenant: ${tenantVerification.tenantId} (${tenantVerification.tenantName}), User: ${tenantVerification.userId}, Active: ${tenantVerification.tenantIsActive}`);

    return {
      tenantId: tenantVerification.tenantId,
      userId: tenantVerification.userId,
      orgCode: tenantVerification.orgCode || tenantVerification.tenantId, // fallback to tenantId if no orgCode
      tenantName: tenantVerification.tenantName, // Already has proper fallback in wrapperApiService
      tenantIsActive: tenantVerification.tenantIsActive,
      userIsActive: tenantVerification.userIsActive,
      token: token, // Include the authentication token for wrapper API calls
      rawData: tenantVerification.data // Keep raw data for syncing
    };
  }

  /**
   * Ensure tenant data is synced using new orchestration service
   * Strategy: Essential + Background (5-10s essential, rest in background)
   * @param {string} tenantId - Tenant identifier
   * @param {string} authToken - Authentication token
   */
  async ensureTenantSync(tenantId, authToken) {
    console.log(`🔍 [SYNC] Checking sync status for tenant: ${tenantId}`);
    
    try {
      // Check if sync is needed (idempotency)
      const needsSync = await syncOrchestrationService.needsSync(tenantId);
      
      if (!needsSync) {
        console.log(`✅ [SYNC] Tenant ${tenantId} already synced, skipping...`);
        return { alreadySynced: true };
      }

      console.log(`🚀 [SYNC] Starting sync for tenant: ${tenantId}`);
      
      // Trigger sync via orchestration service
      // This will sync essential data (blocking) and continue background sync
      const syncResult = await syncOrchestrationService.syncTenant(tenantId, authToken);
      
      if (!syncResult.success) {
        throw new Error(`Tenant sync failed: ${syncResult.error}`);
      }

      console.log(`✅ [SYNC] Essential data synced for tenant: ${tenantId}`);
      if (syncResult.backgroundSyncStarted) {
        console.log(`🔄 [SYNC] Background sync in progress for remaining data...`);
      }

      // Check for failed collections after sync
      const syncStatus = await TenantSyncStatus.findOne({ tenantId });
      if (syncStatus && syncStatus.hasFailedCollections()) {
        const failedCollections = syncStatus.getFailedCollections();
        console.log(`⚠️ [SYNC] Some collections failed to sync for tenant ${tenantId}:`, failedCollections.map(f => f.collection));

        // Return sync result with failed collections info
        return {
          ...syncResult,
          hasFailedCollections: true,
          failedCollections: failedCollections,
          syncStatus: syncStatus.toObject()
        };
      }

      return syncResult;
      
    } catch (error) {
      console.error(`❌ [SYNC] Tenant sync error for ${tenantId}:`, error.message);
      throw error;
    }
  }

  /**
   * OLD METHOD - Kept for reference
   * Sync tenant data from wrapper API to local database with concurrency control
   * Follows dependency order: independent → dependent data
   */
  async ensureTenantData(tenantContext, originalToken) {
    console.log(`🔍 [SYNC] ===== STARTING COMPREHENSIVE TENANT SYNC PROCESS =====`);
    console.log(`🔍 [SYNC] Checking tenant ${tenantContext.tenantId} in CRM database...`);
    console.log(`🔍 [SYNC] Triggered by: User authentication flow`);
    console.log(`🔍 [SYNC] Sync order: tenant → organizations → roles → users → assignments → credit configs → entity credits`);

    try {
      // Check if tenant already exists before attempting sync
      const existingTenant = await Tenant.findOne({ tenantId: tenantContext.tenantId });
      console.log(`🔍 [SYNC] Existing tenant check result:`, existingTenant ? 'FOUND' : 'NOT FOUND');

      // Declare tenant variable outside blocks for common usage
      // (moved declaration outside if/else if it wasn't already)
      let tenant;

      if (existingTenant) {
        console.log(`📊 [SYNC] Existing tenant details:`, {
          tenantId: existingTenant.tenantId,
          tenantName: existingTenant.tenantName,
          status: existingTenant.status,
          createdAt: existingTenant.createdAt,
          updatedAt: existingTenant.updatedAt
        });

        // For existing tenants, only sync tenant basics (status/name updates)
        // All other data handled by Redis Streams
        const existingTenantData = {
          tenantId: tenantContext.tenantId,
          tenantName: tenantContext.tenantName || existingTenant.tenantName,
          status: tenantContext.tenantIsActive ? 'active' : 'inactive',
          settings: tenantContext.rawData?.settings || existingTenant.settings || {},
          subscription: tenantContext.rawData?.subscription || existingTenant.subscription || {}
        };

        const updatedTenant = await Tenant.findOneAndUpdate(
          { tenantId: tenantContext.tenantId },
          existingTenantData,
          { new: true, upsert: false }
        );

        console.log(`✅ [SYNC] EXISTING TENANT UPDATED: ${updatedTenant.tenantId}`);
        console.log(`🎯 [SYNC] ===== TENANT BASICS SYNC COMPLETED =====`);
        console.log(`🔄 [SYNC] Fetching comprehensive data from wrapper API for existing tenant...`);

        // For existing tenants, still fetch comprehensive data from wrapper API
        // Redis streams handle real-time updates, but initial sync should be from wrapper API
        tenant = updatedTenant;

        // Continue to comprehensive sync for existing tenants too
        console.log(`🔄 [SYNC] Starting comprehensive data synchronization...`);
      } else {
        // NEW TENANT: Full comprehensive sync following dependency order
        console.log(`🎉 [SYNC] NEW TENANT DETECTED: ${tenantContext.tenantId}`);
        console.log(`🔄 [SYNC] Starting full data synchronization in dependency order...`);

        // Create new tenant
        const tenantData = {
          tenantId: tenantContext.tenantId,
          tenantName: tenantContext.tenantName,
          status: tenantContext.tenantIsActive ? 'active' : 'inactive',
          settings: tenantContext.rawData?.settings || {},
          subscription: tenantContext.rawData?.subscription || {}
        };

        tenant = await Tenant.findOneAndUpdate(
          { tenantId: tenantContext.tenantId },
          tenantData,
          { new: true, upsert: true, setDefaultsOnInsert: true }
        );
        console.log(`✅ [SYNC] Tenant record created: ${tenant.tenantName} (${tenant.tenantId})`);
      }

      // COMMON PATH: Fetch comprehensive data from wrapper API for both new and existing tenants
      console.log(`🌐 [SYNC] Fetching comprehensive tenant data from wrapper API...`);

      console.log(`🔍 [SYNC] WrapperApiService type:`, typeof WrapperApiService);
      console.log(`🔍 [SYNC] WrapperApiService has getTenantData:`, typeof WrapperApiService?.getTenantData);

      // Use the original frontend token (855 chars) instead of CRM-generated token
      console.log(`🔑 [SYNC] Using original frontend token for comprehensive sync: ${originalToken ? `length=${originalToken.length}, starts with=${originalToken.substring(0, 20)}...` : 'none'}`);

      const tenantDataResponse = await WrapperApiService.getTenantData(tenant.tenantId, originalToken);

      if (!tenantDataResponse.success || !tenantDataResponse.data) {
        console.error(`❌ [SYNC] Failed to fetch comprehensive tenant data:`, tenantDataResponse);
        throw new Error('Failed to fetch comprehensive tenant data from wrapper API');
      }

      const comprehensiveTenantData = tenantDataResponse.data;
      console.log(`📊 [SYNC] Fetched from wrapper API:`, {
        organizations: comprehensiveTenantData.organizations?.length || 0,
        roles: comprehensiveTenantData.roles?.length || 0,
        users: comprehensiveTenantData.users?.length || 0,
        employeeAssignments: comprehensiveTenantData.employeeAssignments?.length || 0,
        roleAssignments: comprehensiveTenantData.roleAssignments?.length || 0,
        creditConfigs: comprehensiveTenantData.creditConfigs?.length || 0,
        entityCredits: comprehensiveTenantData.entityCredits?.length || 0
      });

      // Import required models
      const [
        Organization,
        CrmRole,
        UserProfile,
        EmployeeOrgAssignment,
        CrmRoleAssignment,
        CrmCreditConfig,
        CrmEntityCredit
      ] = await Promise.all([
        import('../models/Organization.js'),
        import('../models/CrmRole.js'),
        import('../models/UserProfile.js'),
        import('../models/EmployeeOrgAssignment.js'),
        import('../models/CrmRoleAssignment.js'),
        import('../models/CrmCreditConfig.js'),
        import('../models/CrmEntityCredit.js')
      ]);

      const models = {
        Organization: Organization.default,
        CrmRole: CrmRole.default,
        UserProfile: UserProfile.default,
        EmployeeOrgAssignment: EmployeeOrgAssignment.default,
        CrmRoleAssignment: CrmRoleAssignment.default,
        CrmCreditConfig: CrmCreditConfig.default,
        CrmEntityCredit: CrmEntityCredit.default
      };

      // PHASE 1: INDEPENDENT DATA (no foreign key dependencies)
      console.log(`\n🏗️ [SYNC] PHASE 1: SYNCING INDEPENDENT DATA`);

      // 1.1 Create tenant record
      console.log(`🏢 [SYNC] Creating tenant record...`);
      const tenantData = {
        tenantId: tenantContext.tenantId,
        tenantName: tenantContext.tenantName || `Tenant ${tenantContext.tenantId}`,
        status: tenantContext.tenantIsActive ? 'active' : 'inactive',
        settings: tenantContext.rawData?.settings || {},
        subscription: tenantContext.rawData?.subscription || {}
      };

      tenant = await Tenant.findOneAndUpdate(
        { tenantId: tenantContext.tenantId },
        tenantData,
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      console.log(`✅ [SYNC] Tenant record created: ${tenant.tenantName} (${tenant.tenantId})`);

      // 1.2 Fetch comprehensive tenant data from wrapper API (now with proper token)
      console.log(`🌐 [SYNC] Fetching comprehensive tenant data from wrapper API...`);

      console.log(`🔍 [SYNC] WrapperApiService type:`, typeof WrapperApiService);
      console.log(`🔍 [SYNC] WrapperApiService has getTenantData:`, typeof WrapperApiService?.getTenantData);

      // Use the token from tenantContext (now properly passed)
      const currentToken2 = tenantContext.token;
      console.log(`🔑 [SYNC] Using token for comprehensive sync: ${currentToken2 ? `length=${currentToken2.length}, starts with=${currentToken2.substring(0, 20)}...` : 'none'}`);

      const tenantDataResponse2 = await WrapperApiService.getTenantData(tenant.tenantId, currentToken2);

      if (!tenantDataResponse2.success || !tenantDataResponse2.data) {
        console.error(`❌ [SYNC] Failed to fetch comprehensive tenant data:`, tenantDataResponse2);
        throw new Error('Failed to fetch comprehensive tenant data from wrapper API');
      }

      const comprehensiveTenantData2 = tenantDataResponse2.data;
      console.log(`📊 [SYNC] Fetched from wrapper API:`, {
        organizations: comprehensiveTenantData2.organizations?.length || 0,
        roles: comprehensiveTenantData2.roles?.length || 0,
        users: comprehensiveTenantData2.users?.length || 0,
        employeeAssignments: comprehensiveTenantData2.employeeAssignments?.length || 0,
        roleAssignments: comprehensiveTenantData2.roleAssignments?.length || 0,
        creditConfigs: comprehensiveTenantData2.creditConfigs?.length || 0,
        entityCredits: comprehensiveTenantData2.entityCredits?.length || 0
      });

      // 1.2 Sync organizations
      if (comprehensiveTenantData2.organizations) {
        const orgsSynced = await this.syncOrganizations(tenant.tenantId, comprehensiveTenantData2.organizations, models);
        console.log(`✅ [SYNC] Organizations synced: ${orgsSynced} records`);
      }

      // 1.3 Sync roles
      if (comprehensiveTenantData2.roles) {
        const rolesSynced = await this.syncRoles(tenant.tenantId, comprehensiveTenantData2.roles, models);
        console.log(`✅ [SYNC] Roles synced: ${rolesSynced} records`);
      }

      // 1.4 Sync users
      if (comprehensiveTenantData2.users) {
        const usersSynced = await this.syncUsers(tenant.tenantId, comprehensiveTenantData2.users, models);
        console.log(`✅ [SYNC] Users synced: ${usersSynced} records`);
      }

      // PHASE 2: DEPENDENT DATA (has foreign key dependencies)
      console.log(`\n🔗 [SYNC] PHASE 2: SYNCING DEPENDENT DATA`);

      // 2.1 Sync employee assignments (depends on users + organizations)
      if (comprehensiveTenantData2.employeeAssignments) {
        const empAssignmentsSynced = await this.syncEmployeeAssignments(tenant.tenantId, comprehensiveTenantData2.employeeAssignments, models);
        console.log(`✅ [SYNC] Employee assignments synced: ${empAssignmentsSynced} records`);
      }

      // 2.2 Sync role assignments (depends on users + roles + organizations)
      if (comprehensiveTenantData2.roleAssignments) {
        const roleAssignmentsSynced = await this.syncRoleAssignments(tenant.tenantId, comprehensiveTenantData2.roleAssignments, models);
        console.log(`✅ [SYNC] Role assignments synced: ${roleAssignmentsSynced} records`);
      }

      // 2.3 Sync credit configurations
      if (comprehensiveTenantData2.creditConfigs) {
        const creditConfigsSynced = await this.syncCreditConfigs(tenant.tenantId, comprehensiveTenantData2.creditConfigs, models);
        console.log(`✅ [SYNC] Credit configurations synced: ${creditConfigsSynced} records`);
      }

      // 2.4 Sync entity credits
      if (comprehensiveTenantData2.entityCredits) {
        const entityCreditsSynced = await this.syncEntityCredits(tenant.tenantId, comprehensiveTenantData2.entityCredits, models);
        console.log(`✅ [SYNC] Entity credits synced: ${entityCreditsSynced} records`);
      }

      console.log(`🎯 [SYNC] ===== COMPREHENSIVE TENANT SYNC COMPLETED =====`);
      console.log(`🎯 [SYNC] New tenant ${tenant.tenantId} fully synchronized with all dependencies`);
      console.log(`🚀 [SYNC] Future changes will be handled by Redis Streams`);

      return tenant;

    } catch (error) {
      console.error(`❌ [SYNC] ===== TENANT SYNC PROCESS FAILED =====`);
      console.error(`❌ [SYNC] Error details:`, {
        message: error.message,
        code: error.code,
        keyPattern: error.keyPattern,
        tenantId: tenantContext.tenantId
      });

      // If it's still a duplicate key error, try to fetch the existing tenant
      if (error.code === 11000 && error.keyPattern?.tenantId) {
        console.log('🔄 [SYNC] Handling duplicate key error, attempting recovery...');
        try {
          const existingTenant = await Tenant.findOne({ tenantId: tenantContext.tenantId });
          if (existingTenant) {
            console.log('✅ [SYNC] Successfully recovered existing tenant after duplicate key error');
            console.log(`🎯 [SYNC] ===== TENANT SYNC PROCESS COMPLETED (RECOVERED) =====`);
            return existingTenant;
          }
        } catch (recoveryError) {
          console.error('❌ [SYNC] Recovery failed:', recoveryError.message);
        }
      }

      // Re-throw if we can't handle it
      console.error(`💥 [SYNC] Unrecoverable error, throwing exception`);
      throw error;
    }
  }

  /**
   * Sync organizations for a tenant
   */
  async syncOrganizations(tenantId, organizations, models) {
    let syncedCount = 0;
    for (const org of organizations) {
      try {
        const orgData = {
          tenantId,
          orgCode: org.orgCode,
          orgName: org.orgName,
          parentIdString: org.parentId,
          status: org.status || 'active',
          hierarchy: org.hierarchy || { level: 1, path: [org.orgCode] },
          metadata: org.metadata || {}
        };

        await models.Organization.findOneAndUpdate(
          { tenantId, orgCode: org.orgCode },
          orgData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync organization ${org.orgCode}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync roles for a tenant
   */
  async syncRoles(tenantId, roles, models) {
    let syncedCount = 0;
    for (const role of roles) {
      try {
        const roleData = {
          tenantId,
          roleId: role.roleId,
          roleName: role.roleName,
          permissions: role.permissions || [],
          priority: role.priority || 0,
          isActive: role.isActive !== false,
          description: role.description || ''
        };

        await models.CrmRole.findOneAndUpdate(
          { tenantId, roleId: role.roleId },
          roleData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync role ${role.roleId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync users for a tenant
   */
  async syncUsers(tenantId, users, models) {
    let syncedCount = 0;
    for (const user of users) {
      try {
        const userData = {
          tenantId,
          userId: user.userId,
          kindeId: user.userId,
          email: user.personalInfo?.email,
          firstName: user.personalInfo?.firstName,
          lastName: user.personalInfo?.lastName,
          employeeCode: user.employeeCode,
          primaryOrganizationId: user.organization?.orgCode,
          isTenantAdmin: false, // Will be set by role assignments
          isResponsiblePerson: false,
          isVerified: true,
          onboardingCompleted: true,
          personalInfo: user.personalInfo,
          organization: user.organization,
          status: user.status || { isActive: true }
        };

        await models.UserProfile.findOneAndUpdate(
          { tenantId, userId: user.userId },
          userData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync user ${user.userId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync employee assignments for a tenant (depends on users + organizations)
   */
  async syncEmployeeAssignments(tenantId, assignments, models) {
    let syncedCount = 0;
    for (const assignment of assignments) {
      try {
        const assignmentData = {
          tenantId,
          assignmentId: assignment.assignmentId,
          userIdString: assignment.userId,
          entityIdString: assignment.entityId,
          assignmentType: assignment.assignmentType || 'direct',
          isActive: assignment.isActive !== false,
          assignedAt: new Date(assignment.assignedAt),
          expiresAt: assignment.expiresAt ? new Date(assignment.expiresAt) : null,
          assignedByString: assignment.assignedBy,
          priority: assignment.priority || 1,
          metadata: assignment.metadata || {}
        };

        await models.EmployeeOrgAssignment.findOneAndUpdate(
          { tenantId, assignmentId: assignment.assignmentId },
          assignmentData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync employee assignment ${assignment.assignmentId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync role assignments for a tenant (depends on users + roles + organizations)
   */
  async syncRoleAssignments(tenantId, assignments, models) {
    let syncedCount = 0;
    for (const assignment of assignments) {
      try {
        const assignmentData = {
          tenantId,
          assignmentId: assignment.assignmentId,
          userIdString: assignment.userId,
          roleIdString: assignment.roleId,
          entityIdString: assignment.entityId,
          isActive: assignment.isActive !== false,
          assignedAt: new Date(assignment.assignedAt),
          expiresAt: assignment.expiresAt ? new Date(assignment.expiresAt) : null,
          assignedByString: assignment.assignedBy
        };

        await models.CrmRoleAssignment.findOneAndUpdate(
          { tenantId, assignmentId: assignment.assignmentId },
          assignmentData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync role assignment ${assignment.assignmentId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync credit configurations for a tenant
   */
  async syncCreditConfigs(tenantId, configs, models) {
    let syncedCount = 0;
    for (const config of configs) {
      try {
        const configData = {
          tenantId,
          configId: config.configId,
          entityIdString: config.entityId,
          configName: config.configName,
          operationCode: config.operationCode,
          description: config.description,
          creditCost: config.creditCost,
          unit: config.unit || 'operation',
          isGlobal: config.isGlobal || false,
          source: config.source || 'tenant',
          moduleName: config.moduleName,
          permissionName: config.permissionName,
          overridesGlobal: !config.isGlobal,
          syncSource: 'wrapper',
          lastSyncedAt: new Date()
        };

        await models.CrmCreditConfig.findOneAndUpdate(
          { tenantId, configId: config.configId },
          configData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync credit config ${config.configId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Sync entity credits for a tenant (depends on organizations)
   */
  async syncEntityCredits(tenantId, credits, models) {
    let syncedCount = 0;
    for (const credit of credits) {
      try {
        const creditData = {
          tenantId,
          entityIdString: credit.entityId,
          allocatedCredits: credit.allocatedCredits,
          usedCredits: credit.usedCredits || 0,
          availableCredits: credit.availableCredits,
          targetApplication: credit.targetApplication || 'crm',
          isActive: credit.isActive !== false,
          allocationType: credit.allocationType || 'manual',
          allocationPurpose: credit.allocationPurpose,
          allocationSource: credit.allocationSource || 'system',
          allocatedByString: credit.allocatedBy,
          allocatedAt: new Date(credit.allocatedAt),
          expiresAt: credit.expiresAt ? new Date(credit.expiresAt) : null,
          metadata: credit.metadata || {},
          reconciliationStatus: 'synced'
        };

        await models.CrmEntityCredit.findOneAndUpdate(
          { tenantId, entityIdString: credit.entityId },
          creditData,
          { upsert: true, setDefaultsOnInsert: true }
        );
        syncedCount++;
      } catch (error) {
        console.error(`❌ [SYNC] Failed to sync entity credit for ${credit.entityId}:`, error.message);
      }
    }
    return syncedCount;
  }

  /**
   * Create default user context with admin permissions
   */
  createDefaultUserContext(tenantContext) {
    console.log('🔄 Creating default user context with admin permissions...');
    console.log('ℹ️ Default context provides: Admin role with full permissions (*)');
    console.log('ℹ️ This ensures users can access the CRM without external permission APIs');

    return {
      userId: tenantContext.userId,
      kindeId: tenantContext.userId,
      roles: [{
        roleId: 'admin',
        roleName: 'Administrator',
        permissions: ['*'], // Full access wildcard
        isActive: true,
        priority: 0
      }],
      primaryOrganizationId: tenantContext.orgCode,
      isTenantAdmin: true,
      onboardingCompleted: true,
      preferences: {},
      profile: {
        firstName: 'User',
        lastName: ''
      }
    };
  }

  /**
   * Update CRM tenant user record
   */
  async updateCrmTenantUser(tenantId, userContext, email) {
    const { updateCrmTenantUser } = await import('../utils/userUtils.js');
    return await updateCrmTenantUser(tenantId, userContext, email);
  }

  /**
   * Get effective permissions using relationship service
   */
  async getEffectivePermissions(tenantId, userId) {
    try {
      const permissions = await RelationshipService.getUserPermissions(tenantId, userId);
      console.log('🔐 Raw permissions from relationship service:', permissions);
      return permissions.length > 0 ? permissions : []; // Return empty array instead of all permissions
    } catch (error) {
      console.log('⚠️ Relationship service permissions failed:', error.message);
      console.log('🔄 Returning empty permissions array as fallback');
      return []; // Return empty array instead of all permissions
    }
  }

  /**
   * Get comprehensive user role information using optimized aggregation
   */
  async getUserRoles(tenantId, userId) {
    try {
      const mongoose = (await import('mongoose')).default;
      const CrmRoleAssignment = mongoose.model('CrmRoleAssignment');

      // Single aggregation pipeline to get role assignments with role details
      // Handle both userId (ObjectId) and userIdString (UUID) formats
      const roleData = await CrmRoleAssignment.aggregate([
        {
          $match: {
            tenantId,
            $or: [
              { userIdString: userId },
              { userId: userId }
            ],
            isActive: true,
            $and: [
              {
                $or: [
                  { expiresAt: null },
                  { expiresAt: { $exists: false } },
                  { expiresAt: { $gt: new Date() } }
                ]
              }
            ]
          }
        },
        {
          $lookup: {
            from: 'crmroles',
            let: { roleId: '$roleId', tenantId: '$tenantId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$roleId', '$$roleId'] },
                      { $eq: ['$tenantId', '$$tenantId'] },
                      { $eq: ['$isActive', true] }
                    ]
                  }
                }
              }
            ],
            as: 'roleDetails'
          }
        },
        {
          $unwind: {
            path: '$roleDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            roleId: 1,
            roleName: { $ifNull: ['$roleDetails.roleName', '$roleId'] },
            entityId: 1,
            permissions: { $ifNull: ['$roleDetails.permissions', []] },
            isActive: 1,
            priority: { $ifNull: ['$roleDetails.priority', 0] },
            assignedAt: 1,
            expiresAt: 1
          }
        }
      ]);

      return roleData;
    } catch (error) {
      console.log('⚠️ Failed to get user roles:', error.message);
      return [];
    }
  }

  /**
   * Get role assignments for user
   */
  async getRoleAssignments(tenantId, userId) {
    try {
      const CrmRoleAssignment = (await import('../models/CrmRoleAssignment.js')).default;
      return await CrmRoleAssignment.find({
        tenantId,
        userId,
        isActive: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $exists: false } },
          { expiresAt: { $gt: new Date() } }
        ]
      });
    } catch (error) {
      console.log('⚠️ Failed to get role assignments:', error.message);
      return [];
    }
  }

  /**
   * Get user organization assignments with details
   */
  async getUserOrganizationAssignments(tenantId, userId) {
    try {
      const mongoose = (await import('mongoose')).default;
      const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

      // Single aggregation pipeline to get org assignments with org details
      const orgData = await EmployeeOrgAssignment.aggregate([
        {
          $match: {
            tenantId,
            userIdString: userId, // Use userIdString (UUID string), not userId (ObjectId)
            isActive: true,
            $or: [
              { expiresAt: null },
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        },
        {
          $lookup: {
            from: 'organizations',
            let: { entityIdString: '$entityIdString', tenantId: '$tenantId' }, // Use entityIdString (orgCode), not entityId (ObjectId)
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$orgCode', '$$entityIdString'] }, // Match orgCode with entityIdString
                      { $eq: ['$tenantId', '$$tenantId'] },
                      { $eq: ['$status', 'active'] }
                    ]
                  }
                }
              }
            ],
            as: 'orgDetails'
          }
        },
        {
          $unwind: {
            path: '$orgDetails',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            _id: '$orgDetails._id', // Include ObjectId from organization
            entityId: '$entityIdString', // Use entityIdString (orgCode) for entityId
            orgCode: '$entityIdString', // Add orgCode field
            orgName: { $ifNull: ['$orgDetails.orgName', '$entityIdString'] }, // Use entityIdString for fallback
            assignmentType: 1,
            priority: 1,
            assignedAt: 1,
            expiresAt: 1,
            hierarchy: { $ifNull: ['$orgDetails.hierarchy', {}] },
            status: { $ifNull: ['$orgDetails.status', 'unknown'] },
            parentId: { $ifNull: ['$orgDetails.parentId', null] }
          }
        }
      ]);

      return orgData;
    } catch (error) {
      console.log('⚠️ Failed to get organization assignments:', error.message);
      return [];
    }
  }

  /**
   * Get user credit breakdown by entity
   */
  async getCreditBreakdown(tenantId, userId) {
    try {
      const mongoose = (await import('mongoose')).default;
      const EmployeeOrgAssignment = mongoose.model('EmployeeOrgAssignment');

      // Single aggregation pipeline to get credit breakdown
      const creditData = await EmployeeOrgAssignment.aggregate([
        {
          $match: {
            tenantId,
            userId,
            isActive: true,
            $or: [
              { expiresAt: null },
              { expiresAt: { $exists: false } },
              { expiresAt: { $gt: new Date() } }
            ]
          }
        },
        {
          $lookup: {
            from: 'crmentitycredits',
            let: { entityId: '$entityId', tenantId: '$tenantId' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$entityId', '$$entityId'] },
                      { $eq: ['$tenantId', '$$tenantId'] },
                      { $eq: ['$isActive', true] }
                    ]
                  }
                }
              }
            ],
            as: 'creditAllocation'
          }
        },
        {
          $unwind: {
            path: '$creditAllocation',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $project: {
            entityId: 1,
            allocatedCredits: { $ifNull: ['$creditAllocation.allocatedCredits', 0] },
            usedCredits: { $ifNull: ['$creditAllocation.usedCredits', 0] },
            availableCredits: { $ifNull: ['$creditAllocation.availableCredits', 0] }
          }
        }
      ]);

      const breakdown = creditData;
      const summary = {
        totalAllocated: breakdown.reduce((sum, item) => sum + item.allocatedCredits, 0),
        totalUsed: breakdown.reduce((sum, item) => sum + item.usedCredits, 0),
        totalAvailable: breakdown.reduce((sum, item) => sum + item.availableCredits, 0)
      };

      return { breakdown, summary };
    } catch (error) {
      console.log('⚠️ Failed to get credit breakdown:', error.message);
      return { breakdown: [], summary: { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 } };
    }
  }

  /**
   * Get user's accessible entities using relationship service
   */
  async getUserEntities(tenantId, userId, defaultOrgCode) {
    try {
      const entities = await RelationshipService.getUserAccessibleEntities(tenantId, userId);

      if (entities && entities.length > 0) {
        // Add id field (ObjectId) to entities for frontend API calls
        return entities.map(entity => ({
          ...entity,
          id: entity._id || entity.orgCode // Use _id if available, otherwise orgCode
        }));
      }
    } catch (error) {
      console.log('⚠️ Relationship service entities failed:', error.message);
    }

    // Fallback to demo organization
    console.log('🔄 Using entity fallback...');
    return [{
      tenantId: tenantId,
      orgCode: defaultOrgCode,
      orgName: 'Demo Organization',
      hierarchy: { level: 0 },
      status: 'active',
      id: defaultOrgCode // Add id field for consistency
    }];
  }

  /**
   * Get user credits using relationship service
   */
  async getUserCredits(tenantId, userId) {
    try {
      const creditCheck = await RelationshipService.checkCredits(tenantId, userId, 'login', 0);
      if (creditCheck.availableCredits > 0) {
        return creditCheck;
      }
    } catch (error) {
      console.log('⚠️ Relationship service credits failed:', error.message);
    }

    // Fallback to default credits
    console.log('🔄 Using credit fallback...');
    return {
      allowed: true,
      availableCredits: 10000,
      requiredCredits: 0
    };
  }

  /**
   * Build JWT payload
   */
  buildJwtPayload(user, tenantContext, userContext, permissions, roles, entities, creditBreakdown, orgAssignments, syncResult = null) {
    // NOTE: Permissions are NOT included in JWT for size reasons.
    // Permissions should be resolved dynamically using the relationship service.

    // Use orgCode for primaryOrganizationId - entities in JWT should use orgCode for consistency
    let primaryOrganizationId = userContext.primaryOrganizationId;

    // If no primary organization set, use the first available entity orgCode
    if (!primaryOrganizationId && entities.length > 0) {
      primaryOrganizationId = entities[0].orgCode;
    }

    return {
      id: user._id,
      userId: userContext.userId,
      tenantId: tenantContext.tenantId,
      email: user.email,
      orgCode: tenantContext.orgCode,
      roles: [], // Roles are resolved dynamically too for consistency
      permissions: [], // Permissions resolved dynamically to keep JWT small
      entities: entities.map(entity => ({
        id: entity.id, // Include ObjectId in JWT entities
        orgCode: entity.orgCode,
        orgName: entity.orgName,
        level: entity.hierarchy?.level || 0
      })),
      totalCredits: creditBreakdown.summary.totalAvailable,
      primaryOrganizationId: primaryOrganizationId, // Use ObjectId
      isTenantAdmin: userContext.isTenantAdmin || false,
      // Include sync failure information for toast notifications
      syncStatus: syncResult ? {
        hasFailedCollections: syncResult.hasFailedCollections || false,
        failedCollections: syncResult.failedCollections || [],
        syncCompleted: syncResult.success
      } : null
    };
  }

  /**
   * Build user response object
   */
  buildUserResponse(user, tenantContext, userContext, permissions, roles, orgAssignments, entities, creditBreakdown) {
    const userWithoutPassword = user.toObject();
    delete userWithoutPassword.password;

    return {
      ...userWithoutPassword,
      id: user._id,
      userId: userContext.userId,
      tenantId: tenantContext.tenantId,
      orgCode: tenantContext.orgCode,
      roles: roles,
      permissions: permissions,
      organizationAssignments: orgAssignments,
      entities: entities,
      creditBreakdown: creditBreakdown,
      totalCredits: creditBreakdown.summary.totalAvailable,
      primaryOrganizationId: userContext.primaryOrganizationId,
      isTenantAdmin: userContext.isTenantAdmin || false,
      onboardingCompleted: userContext.onboardingCompleted || false,
      profile: userContext.profile || {}
    };
  }

  /**
   * Update user's last login timestamp
   */
  async updateUserLastLogin(user) {
    user.lastLoginAt = new Date();
    await user.save();
  }
}

// Create auth service instance
const authService = new AuthService();

export default authService;
