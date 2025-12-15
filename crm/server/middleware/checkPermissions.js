/**
 * Permission-based middleware for checking user permissions
 * Supports both crm.system.* and system.* permission formats
 */

const checkPermissions = (...requiredPermissions) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'No token, authorization denied',
          error: 'USER_NOT_FOUND'
        });
      }

      const userPermissions = req.user?.permissions || [];
      console.log('🔍 Permission check for:', {
        path: req.path,
        method: req.method,
        requiredPermissions,
        userPermissionsCount: userPermissions.length,
        userPermissionsSample: userPermissions.slice(0, 5)
      });

      // Check if user has any of the required permissions
      const hasPermission = requiredPermissions.some(requiredPermission => {
        // Check for exact match
        if (userPermissions.includes(requiredPermission)) {
          console.log(`✅ Permission granted: ${requiredPermission}`);
          return true;
        }

        // Check for crm.system.* format if required permission is system.*
        if (requiredPermission.startsWith('system.') && 
            userPermissions.includes(`crm.${requiredPermission}`)) {
          console.log(`✅ Permission granted (CRM format): crm.${requiredPermission}`);
          return true;
        }

        // Check for system.* format if required permission is crm.system.*
        if (requiredPermission.startsWith('crm.system.') && 
            userPermissions.includes(requiredPermission.replace('crm.', ''))) {
          console.log(`✅ Permission granted (System format): ${requiredPermission.replace('crm.', '')}`);
          return true;
        }

        return false;
      });

      if (hasPermission) {
        console.log('✅ Permission check passed');
        return next();
      }

      // Log failed permission check for debugging
      console.log('❌ Permission check failed:', {
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10),
        userId: req.user.id,
        userRole: req.user.role
      });

      return res.status(403).json({
        message: "Access denied. Insufficient privileges.",
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10),
        error: 'INSUFFICIENT_PERMISSIONS'
      });

    } catch (error) {
      console.error('❌ Permission middleware error:', error);
      return res.status(500).json({
        message: "Internal server error in permission check",
        error: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

/**
 * Check if user has any of the specified permissions
 */
const hasAnyPermission = (userPermissions, requiredPermissions) => {
  if (!Array.isArray(userPermissions) || !Array.isArray(requiredPermissions)) {
    return false;
  }

  return requiredPermissions.some(requiredPermission => {
    // Exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // CRM format check
    if (requiredPermission.startsWith('system.') && 
        userPermissions.includes(`crm.${requiredPermission}`)) {
      return true;
    }

    // System format check
    if (requiredPermission.startsWith('crm.system.') && 
        userPermissions.includes(requiredPermission.replace('crm.', ''))) {
      return true;
    }

    return false;
  });
};

/**
 * Check if user has all of the specified permissions
 */
const hasAllPermissions = (userPermissions, requiredPermissions) => {
  if (!Array.isArray(userPermissions) || !Array.isArray(requiredPermissions)) {
    return false;
  }

  return requiredPermissions.every(requiredPermission => {
    // Exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // CRM format check
    if (requiredPermission.startsWith('system.') && 
        userPermissions.includes(`crm.${requiredPermission}`)) {
      return true;
    }

    // System format check
    if (requiredPermission.startsWith('crm.system.') && 
        userPermissions.includes(requiredPermission.replace('crm.', ''))) {
      return true;
    }

    return false;
  });
};

export { checkPermissions, hasAnyPermission, hasAllPermissions };
export default checkPermissions;
