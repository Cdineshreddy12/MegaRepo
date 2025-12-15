import jwt from 'jsonwebtoken';
import UserProfile from '../models/UserProfile.js';
const auth = async (req, res, next) => {
  try {
    console.log('🔒 Auth middleware executing for path:', req.path);

    // Get token from Authorization header (Bearer token from frontend)
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Store extracted user data from database
    let extractedUserData = null;
    console.log('🔍 Token present:', token ? 'Yes' : 'No');
    console.log('🔍 Token type detection:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      startsWithEyJ: token ? token.startsWith('eyJ') : false,
      containsDots: token ? token.includes('.') : false,
      tokenPreview: token ? `${token.substring(0, 30)}...` : 'null'
    });

    // Check if token exists
    if (!token) {
      console.log('❌ No token found, returning 401');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Add detailed token analysis
    console.log('🔍 Detailed token analysis:');
    console.log('  - Raw token length:', token.length);
    console.log('  - Token starts with:', token.substring(0, 10));
    console.log('  - Token ends with:', token.substring(token.length - 10));
    console.log('  - Contains spaces:', token.includes(' '));
    console.log('  - Contains newlines:', token.includes('\n'));
    console.log('  - Contains quotes:', token.includes('"') || token.includes("'"));
    
    // Log more token content for debugging
    console.log('  - First 50 chars:', token.substring(0, 50));
    console.log('  - Last 50 chars:', token.substring(token.length - 50));
    console.log('  - Middle section:', token.substring(200, 250));
    
    // Check for common JWT patterns
    const jwtParts = token.split('.');
    console.log('  - JWT parts count:', jwtParts.length);
    if (jwtParts.length === 3) {
      console.log('  - Header part length:', jwtParts[0].length);
      console.log('  - Payload part length:', jwtParts[1].length);
      console.log('  - Signature part length:', jwtParts[2].length);
    }
    
    // Clean the token - remove any extra whitespace or quotes
    const cleanToken = token.trim().replace(/^["']|["']$/g, '');
    console.log('🔍 Cleaned token length:', cleanToken.length);
    console.log('🔍 Cleaned token preview:', cleanToken.substring(0, 30) + '...');

    let decoded = null;
    let tokenType = 'unknown';

    // Try to determine if this is a Kinde token, wrapper JWT, or legacy JWT
    try {
      // First, try to decode without verification to check the structure
      const unverifiedDecoded = jwt.decode(cleanToken, { complete: true });
      console.log('🔍 Unverified token decode result:', unverifiedDecoded);
      
      // If jwt.decode fails, try manual base64 decoding for wrapper tokens
      let decodedPayload = null;
      if (!unverifiedDecoded && cleanToken.includes('.')) {
        try {
          const parts = cleanToken.split('.');
          if (parts.length === 3) {
            // Manual base64 decode of payload
            const payloadBase64 = parts[1];
            // Add padding if needed
            const paddedPayload = payloadBase64 + '='.repeat((4 - payloadBase64.length % 4) % 4);
            const payloadJson = Buffer.from(paddedPayload, 'base64').toString('utf8');
            decodedPayload = JSON.parse(payloadJson);
            console.log('🔧 Manual decode successful:', {
              iss: decodedPayload.iss,
              sub: decodedPayload.sub,
              source: decodedPayload.source
            });
          }
        } catch (manualDecodeErr) {
          console.log('🔧 Manual decode failed:', manualDecodeErr.message);
        }
      }
      
      const tokenData = unverifiedDecoded?.payload || decodedPayload;
      
      console.log('🔍 Unverified token decode:', {
        iss: tokenData?.iss,
        aud: tokenData?.aud,
        sub: tokenData?.sub,
        typ: tokenData?.typ,
        hasKindeIssuer: tokenData?.iss?.includes('kinde') || tokenData?.iss?.includes('auth.zopkit.com'),
        hasWrapperIssuer: tokenData?.iss?.includes('wrapper.zopkit.com') || tokenData?.iss === 'wrapper',
        tokenLength: cleanToken.length
      });
      
      // Log all available fields for debugging org code issues
      console.log('🔍 Available token fields for org code:', {
        org_code: tokenData?.org_code,
        orgCode: tokenData?.orgCode,
        organization_code: tokenData?.organization_code,
        organizationCode: tokenData?.organizationCode,
        org: tokenData?.org,
        organization: tokenData?.organization,
        tenant: tokenData?.tenant,
        tenant_id: tokenData?.tenant_id,
        tenantId: tokenData?.tenantId
      });

      // Check token type - support Kinde and custom tokens
      if (tokenData?.email) {
        // Treat tokens with email field as Kinde tokens
        console.log('🎯 Detected Kinde token (has email field), accepting...');
        tokenType = 'kinde';

        try {
          decoded = tokenData;
          console.log('✅ Kinde token accepted:', {
            email: decoded.email,
            id: decoded.id,
            userId: decoded.userId,
            tenantId: decoded.tenantId
          });
        } catch (kindeErr) {
          console.error('❌ Kinde token processing failed:', kindeErr.message);
          throw new Error('Invalid Kinde token');
        }
      } else if (tokenData?.userId && tokenData?.tenantId) {
        // Support custom tokens with userId and tenantId (for demo/dev)
        console.log('🎯 Detected custom token with userId/tenantId, accepting...');
        tokenType = 'custom';

        try {
          decoded = tokenData;
          console.log('✅ Custom token accepted:', {
            userId: decoded.userId,
            tenantId: decoded.tenantId,
            orgCode: decoded.orgCode,
            permissions: decoded.permissions
          });
        } catch (customErr) {
          console.error('❌ Custom token processing failed:', customErr.message);
          throw new Error('Invalid custom token');
        }
      } else {
        console.log('❌ Unrecognized token type, rejecting');
        console.log('   Token fields:', Object.keys(tokenData || {}));
        throw new Error('Unsupported token issuer');
      }
      
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError.message);
      
      if (tokenError.name === 'TokenExpiredError') {
        console.log('🕐 Token has expired, returning 401');
        return res.status(401).json({ message: 'Token has expired' });
      }
      
      console.log('🚫 Token is invalid, returning 401');
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Extract user info based on token type
    let userId = null;
    let userRole = null;
    let userOrgCode = null;
    let userTenantId = null;

    if (tokenType === 'kinde') {
      // Kinde token structure - extract email and look up user profile
      const userEmail = decoded.email;

      if (!userEmail) {
        console.log('❌ Kinde token missing email field');
        return res.status(401).json({ message: 'Token missing email' });
      }

      console.log('🎯 Extracted email from Kinde token:', userEmail);

      // Import UserProfile model dynamically
      const UserProfile = (await import('../models/UserProfile.js')).default;

      // Look up user profile by email
      let userProfile = await UserProfile.findOne({
        'personalInfo.email': userEmail
      }).lean();

      if (!userProfile) {
        console.log('❌ User profile not found for email:', userEmail);
        // Return 410 Gone to indicate user was deleted/removed
        return res.status(410).json({ 
          message: 'User account has been removed from the system',
          code: 'USER_DELETED',
          error: 'User account no longer exists'
        });
      }

      // Extract user data from the found profile
      userId = userProfile.userId;
      userTenantId = userProfile.tenantId;
      userOrgCode = userProfile.organization?.orgCode || null;

      console.log('✅ Found user profile by email:', {
        userId,
        tenantId: userTenantId,
        orgCode: userOrgCode,
        email: userEmail
      });
    } else if (tokenType === 'custom') {
      // Custom token structure - use data directly from token
      userId = decoded.userId; // Custom token has userId directly
      userRole = decoded.role || decoded.roles?.[0] || 'user';
      userOrgCode = decoded.orgCode || decoded.org_code || null;
      userTenantId = decoded.tenantId; // Custom token has tenantId directly

      console.log('🎯 Extracted from custom token:', {
        userId,
        userRole,
        orgCode: userOrgCode,
        tenantId: userTenantId,
        email: decoded.email,
        permissions: decoded.permissions
      });

      // For custom tokens, we can look up user directly by userId
      try {
        console.log('🔍 Looking up user by userId:', userId);

        // Import UserProfile model dynamically
        const UserProfile = (await import('../models/UserProfile.js')).default;

        let userProfile = await UserProfile.findOne({
          userId: userId,
          tenantId: userTenantId
        }).lean();

        if (!userProfile) {
          console.log('⚠️ User profile not found for userId:', userId, 'in tenant:', userTenantId);
          // For custom tokens, we might need to create or accept the token data
        }
      } catch (kindeLookupError) {
        console.log('⚠️ Error looking up user by Kinde ID:', kindeLookupError.message);
      }
    }

    // Determine tenant ID and user profile based on token type
    let userProfile = null;
    if (userId) {
      try {
        console.log('🔍 Looking up user profile for user:', userId);

        // Import UserProfile model dynamically
        const UserProfile = (await import('../models/UserProfile.js')).default;

        if (tokenType === 'kinde') {
          // For Kinde tokens, we already looked up the user by email above
          // Just verify we still have the user profile
          userProfile = await UserProfile.findOne({
            userId: userId
          }).lean();
        } else if (tokenType === 'custom') {
          // For custom tokens, look up by userId and tenantId
          userProfile = await UserProfile.findOne({
            userId: userId,
            tenantId: userTenantId
          }).lean();
        }

        if (userProfile) {
          // Update tenantId from database (for Kinde tokens that might not have it)
          userTenantId = userProfile.tenantId;
          // Use internal CRM user ID (in case it differs)
          userId = userProfile.userId;

          // Extract additional organizational information from UserProfile
          const orgCode = userProfile.organization?.orgCode;
          const hierarchy = userProfile.organization?.hierarchy || {};
          const parentOrgId = hierarchy.parentOrgId || hierarchy.parentId;

          // Initialize variables with default values
          let userRoles = [];
          let userPermissions = [];
          let organizationAssignments = [];
          let entityCredits = [];
          let creditConfigs = [];

          if (tokenType === 'kinde') {
            // For Kinde tokens, fetch from database using relationship service
            console.log('🔐 Fetching roles and permissions from database for Kinde user:', userId);

            // Import relationship service
            const relationshipService = (await import('../services/relationshipService.js')).default;

            try {
              const results = await Promise.all([
                relationshipService.getUserRoles(userTenantId, userId),
                relationshipService.getUserPermissions(userTenantId, userId),
                relationshipService.getUserOrganizationAssignments(userTenantId, userId),
                relationshipService.getUserEntityCredits(userTenantId, userId),
                relationshipService.getCreditConfigs(userTenantId)
              ]);

              userRoles = results[0] || [];
              userPermissions = results[1] || [];
              organizationAssignments = results[2] || [];
              entityCredits = results[3] || [];
              creditConfigs = results[4] || [];

              console.log(`🎭 Found ${userRoles.length} roles, ${userPermissions.length} permissions, ${organizationAssignments.length} org assignments, ${entityCredits.length} entity credits, ${creditConfigs.length} credit configs`);
              console.log('DEBUG: organizationAssignments content:', JSON.stringify(organizationAssignments.slice(0, 2), null, 2));
              console.log('DEBUG: entityCredits content:', JSON.stringify(entityCredits.slice(0, 2), null, 2));
            } catch (relationshipError) {
              console.error('❌ Error fetching relationships:', relationshipError.message);
              // Variables already initialized with empty arrays above
            }
          } else if (tokenType === 'custom') {
            // For custom tokens, use permissions directly from token
            console.log('🔐 Using permissions from custom token');
            userRoles = decoded.roles || [];
            userPermissions = decoded.permissions || [];

            console.log(`🎭 Found ${userRoles.length} roles with ${userPermissions.length} permissions from token`);
          }

          console.log('✅ Resolved complete user data:', {
            tokenType,
            userId: userId,
            tenantId: userTenantId,
            orgCode: orgCode,
            parentOrgId: parentOrgId,
            rolesCount: userRoles.length,
            permissionsCount: userPermissions.length,
            hierarchyLevel: hierarchy?.level
          });

          console.log('DEBUG: Before extractedUserData assignment:');
          console.log('  userRoles length:', userRoles?.length || 0);
          console.log('  organizationAssignments length:', organizationAssignments?.length || 0);
          console.log('  entityCredits length:', entityCredits?.length || 0);

          // Store extracted data for later use
          extractedUserData = {
            tenantId: userTenantId,
            userId: userId,
            orgCode: orgCode,
            parentOrgId: parentOrgId,
            hierarchy: hierarchy,
            personalInfo: userProfile.personalInfo,
            employeeCode: userProfile.employeeCode,
            roles: userRoles,
            permissions: userPermissions,
            organizationAssignments,
            entityCredits,
            creditConfigs
          };

          console.log('DEBUG: extractedUserData.organizationAssignments length:', extractedUserData.organizationAssignments?.length || 0);
          console.log('DEBUG: extractedUserData.entityCredits length:', extractedUserData.entityCredits?.length || 0);
        } else {
          // Handle case where user profile is not found
          if (tokenType === 'kinde') {
            console.log('⚠️ Kinde user not found in any tenant, cannot proceed');
            return res.status(403).json({ message: 'User not authorized for any tenant' });
          } else if (tokenType === 'custom') {
            // For custom tokens, we can accept the token data even if user not in DB
            console.log('⚠️ Custom token user not found in database, using token data directly');
            extractedUserData = {
              tenantId: userTenantId,
              userId: userId,
              orgCode: userOrgCode,
              parentOrgId: null,
              hierarchy: {},
              personalInfo: {
                firstName: 'Unknown',
                lastName: '',
                email: decoded.email || 'unknown@example.com'
              },
              employeeCode: userId,
              roles: decoded.roles || [],
              permissions: decoded.permissions || [],
              organizationAssignments: [], // No DB data for custom tokens
              entityCredits: [] // No DB data for custom tokens
            };
          }
        }

      } catch (dbError) {
        console.error('❌ Database error during tenant lookup:', dbError.message);
        return res.status(500).json({ message: 'Database error during authentication' });
      }
    }

    // Set comprehensive user info in request
    req.user = {
      _id: userId,
      id: userId,
      userId: userId,
      firstName: extractedUserData?.personalInfo?.firstName || null,
      lastName: extractedUserData?.personalInfo?.lastName || null,
      email: extractedUserData?.personalInfo?.email || decoded.email,
      role: null, // Not used in new system
      zone: [], // Not used in new system
      isExternalUser: false,
      tokenType: tokenType,
      employeeCode: extractedUserData?.employeeCode || userId,

      // Database-resolved data
      tenantId: userTenantId,
      orgCode: extractedUserData?.orgCode || null,
      roles: extractedUserData?.roles || [],
      permissions: extractedUserData?.permissions || [],
      rolesCount: (extractedUserData?.roles || []).length,
      permissionsCount: (extractedUserData?.permissions || []).length,

      // Organization assignments from database
      organizationAssignments: extractedUserData?.organizationAssignments || [],

      // Credit information
      creditBreakdown: {
        breakdown: [],
        summary: { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 },
        organizationCredits: null,
        creditConfigs: extractedUserData?.creditConfigs || []
      },
      entityCredits: {
        availableEntityCredits: extractedUserData?.entityCredits || []
      },
      totalCredits: 0,

      // Additional fields - use actual organization assignments instead of hardcoded values
      entities: (extractedUserData?.organizationAssignments || []).map(assignment => ({
        orgCode: assignment.entityId,
        orgName: assignment.entityName,
        level: assignment.level || assignment.hierarchy?.level || 0
      })).filter(entity => entity.orgCode), // Filter out any invalid assignments
      primaryOrganizationId: extractedUserData?.orgCode || null,
      isTenantAdmin: decoded.isTenantAdmin || true,
      onboardingCompleted: decoded.onboardingCompleted || false,
      profile: decoded.profile || {},

      // Legacy fields for compatibility
      parentOrgId: extractedUserData?.parentOrgId || null,
      hierarchy: extractedUserData?.hierarchy || {},
      kindeUserId: decoded.sub || null
    };
    
    console.log('🔧 Set basic user info from token:', req.user);

    // Set the JWT token on the CRM consumer for API authentication
    if (req.crmConsumer && token) {
      req.crmConsumer.setCurrentToken(token);
      console.log('🔑 Set JWT token on CRM consumer for API authentication');
    }

    console.log('✅ Auth middleware completed successfully');
    next();
    
  } catch (err) {
    console.error('💥 Middleware error:', err.message);
    return res.status(500).json({ message: 'Server error in auth middleware' });
  }
};

export default auth;