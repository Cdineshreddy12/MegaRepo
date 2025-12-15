import UserProfile from '../models/UserProfile.js';

/**
 * Get effective user from request (works for both external and local auth)
 * This function extracts user information from req.user which is set by auth middleware
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} User object with id, role, email, etc.
 */
async function getEffectiveUser(req) {
  try {
    if (!req.user) {
      console.log('⚠️ getEffectiveUser: No user found in request');
      return null;
    }

    const user = req.user;
    
    // Extract user information from req.user
    const effectiveUser = {
      id: user.id || user.userId || user._id,
      userId: user.userId || user.id || user._id,
      email: user.email,
      firstName: user.firstName || user.personalInfo?.firstName,
      lastName: user.lastName || user.personalInfo?.lastName,
      role: user.role,
      isExternalUser: user.isExternalUser || user.tokenType === 'kinde' || user.tokenType === 'wrapper',
      tokenType: user.tokenType,
      tenantId: user.tenantId,
      orgCode: user.orgCode,
      permissions: user.permissions || []
    };

    console.log('✅ Created effective user from token:', {
      id: effectiveUser.id,
      role: effectiveUser.role,
      tokenType: effectiveUser.tokenType,
      email: effectiveUser.email,
      isExternal: effectiveUser.isExternalUser,
      permissionsCount: effectiveUser.permissions?.length
    });

    return effectiveUser;
  } catch (error) {
    console.error('❌ Error in getEffectiveUser:', error);
    return null;
  }
}

/**
 * Check if user has access to specific data based on role and ownership
 * For external users, we use more permissive access rules
 */
function checkDataAccess(user, dataItem, accessType = 'read') {
  console.log('🔒 Checking data access:', {
    userRole: user.role,
    isExternal: user.isExternalUser,
    accessType,
    itemId: dataItem._id || dataItem.id
  });
  
  // External users (wrapper/Kinde) get broader access
  if (user.isExternalUser) {
    console.log('🎯 External user - granting broad access');
    
    // External users can access all data for now
    // In production, you might want to implement more specific rules
    return true;
  }
  
  // Legacy user access rules
  if (user.role === 'super_admin') {
    console.log('✅ Super admin - full access granted');
    return true;
  }
  
  if (user.role === 'admin') {
    console.log('🔍 Admin - checking zone access');
    
    // Check zone-based access for admins
    if (!user.zone || user.zone.length === 0) {
      console.log('❌ Admin has no zones assigned');
      return false;
    }
    
    // For data with zone property
    if (dataItem.zone) {
      const hasAccess = user.zone.includes(dataItem.zone) || dataItem.zone === 'n/a';
      console.log('🔍 Zone access check:', { hasAccess, userZones: user.zone, itemZone: dataItem.zone });
      return hasAccess;
    }
    
    return true; // Default allow for admin if no zone restrictions
  }
  
  // Regular user - check ownership
  if (user.role === 'user') {
    console.log('🔍 Regular user - checking ownership');
    
    const isCreator = dataItem.createdBy && dataItem.createdBy.toString() === user._id.toString();
    const isAssigned = dataItem.assignedTo && dataItem.assignedTo.toString() === user._id.toString();
    
    const hasAccess = isCreator || isAssigned;
    console.log('🔍 Ownership check:', { isCreator, isAssigned, hasAccess });
    
    return hasAccess;
  }
  
  console.log('❌ Unknown role or no access');
  return false;
}

/**
 * Get accessible organizations for a user based on their permissions
 * @param {Object} user - User object with permissions and other data
 * @returns {Array} Array of accessible organization codes
 */
async function getAccessibleOrganizations(user) {
  try {
    // If user has entities in their profile, use those
    if (user.entities && Array.isArray(user.entities) && user.entities.length > 0) {
      return user.entities.map(entity => entity.orgCode || entity.id).filter(Boolean);
    }

    // If user has organizationAssignments, extract orgCodes from there
    if (user.organizationAssignments && Array.isArray(user.organizationAssignments)) {
      return user.organizationAssignments
        .map(assignment => assignment.entityId || assignment.orgCode)
        .filter(Boolean);
    }

    // Fallback: return empty array (user needs explicit org assignment)
    console.log('⚠️ No accessible organizations found for user');
    return [];
  } catch (error) {
    console.error('❌ Error getting accessible organizations:', error);
    return [];
  }
}

/**
 * Get permission-based query filters for database queries
 * @param {Object} user - User object
 * @param {String} entityType - Type of entity (e.g., 'account', 'contact', 'lead')
 * @param {String} entityId - Optional organization ID for filtering
 * @returns {Promise<Object>} MongoDB query object
 */
async function getPermissionFilters(user, entityType = 'generic', entityId = null) {
  try {
    const query = {};

    // If entityId is provided, use it for orgCode filtering
    if (entityId) {
      // If entityId looks like an ObjectId, try to resolve it to orgCode
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode orgName').lean();
          if (orgData && orgData.orgCode) {
            query.orgCode = orgData.orgCode;
          } else {
            query.orgCode = entityId; // Fallback to using entityId as orgCode
          }
        } catch (error) {
          query.orgCode = entityId; // Fallback to using entityId as orgCode
        }
      } else {
        query.orgCode = entityId;
      }
    } else if (user.orgCode) {
      // Use user's default orgCode if no entityId provided
      query.orgCode = user.orgCode;
    }

    // For external users, we rely on orgCode filtering
    // For internal users, we might add additional role-based filters here

    return query;
  } catch (error) {
    console.error('❌ Error getting permission filters:', error);
    return {};
  }
}

export { getEffectiveUser, checkDataAccess, getAccessibleOrganizations, getPermissionFilters };
export default getEffectiveUser;

