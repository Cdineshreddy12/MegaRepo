// =============================================================================
// PERMISSION ENFORCEMENT MIDDLEWARE
// Checks user permissions and consumes credits for operations
// =============================================================================

import RelationshipService from '../services/relationshipService.js';

/**
 * Middleware to enforce permissions for API operations
 * @param {string|string[]} requiredPermissions - Required permission(s)
 * @param {boolean} requireAll - If true, user must have ALL permissions; if false, ANY permission
 */
export const requirePermissions = (requiredPermissions, requireAll = false) => {
  return async (req, res, next) => {
    try {
      const { user } = req;

      if (!user || !user.tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userPermissions = user.permissions || [];

      // Helper function to check if user has permission (handles wildcards)
      const userHasPermission = (requiredPerm) => {
        // Check for exact match first
        if (userPermissions.includes(requiredPerm)) {
          return true;
        }

        // Check for wildcard permissions
        return userPermissions.some(userPerm => {
          if (userPerm === '*') return true; // Global wildcard
          if (userPerm.endsWith('.*')) {
            // Module wildcard (e.g., 'crm.*' matches 'crm.leads.read')
            const modulePrefix = userPerm.slice(0, -1); // Remove the '.*'
            return requiredPerm.startsWith(modulePrefix);
          }
          return false;
        });
      };

      // Check if user has required permissions
      const hasPermission = Array.isArray(requiredPermissions)
        ? requireAll
          ? requiredPermissions.every(perm => userHasPermission(perm))
          : requiredPermissions.some(perm => userHasPermission(perm))
        : userHasPermission(requiredPermissions);

      if (!hasPermission) {
        console.log('❌ Permission denied:', {
          userId: user.userId,
          required: requiredPermissions,
          userHas: userPermissions
        });

        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions',
          required: requiredPermissions,
          userPermissions: userPermissions
        });
      }

      console.log('✅ Permission granted:', {
        userId: user.userId,
        permission: requiredPermissions
      });

      next();
    } catch (error) {
      console.error('Error in permission middleware:', error);
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
        error: error.message
      });
    }
  };
};

/**
 * Middleware to check and consume credits for operations
 * @param {string} operationType - Operation type (e.g., 'crm.accounts.create')
 * @param {number} creditCost - Fixed credit cost
 * @param {boolean} skipIfNoCost - Skip credit consumption if no cost configured
 */
export const consumeCredits = (operationType, creditCost = null, skipIfNoCost = true) => {
  return async (req, res, next) => {
    try {
      const { user } = req;

      if (!user || !user.tenantId) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Get operation details for logging
      const operationDetails = {
        resourceType: operationType.split('.')[1] || 'unknown',
        resourceId: req.params.id || req.body.id || 'new',
        operationId: `${operationType}_${Date.now()}`,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip,
        method: req.method,
        path: req.path
      };

      // Check credit availability
      const creditCheck = await RelationshipService.checkCredits(
        user.tenantId,
        user.userId || user.externalId || user.employeeCode,
        operationType,
        creditCost || 1
      );

      if (!creditCheck.allowed) {
        console.log('❌ Insufficient credits:', {
          userId: user.userId,
          operation: operationType,
          available: creditCheck.availableCredits,
          required: creditCheck.requiredCredits
        });

        return res.status(402).json({
          success: false,
          message: 'Insufficient credits',
          availableCredits: creditCheck.availableCredits,
          requiredCredits: creditCheck.requiredCredits,
          operation: operationType
        });
      }

      // Store credit info for consumption after successful operation
      req.creditConsumption = {
        tenantId: user.tenantId,
        userId: user.userId || user.externalId || user.employeeCode,
        operationType,
        creditsUsed: creditCheck.requiredCredits,
        operationDetails
      };

      console.log('💰 Credits available for operation:', {
        userId: user.userId,
        operation: operationType,
        available: creditCheck.availableCredits,
        willConsume: creditCheck.requiredCredits
      });

      next();
    } catch (error) {
      console.error('Error in credit middleware:', error);

      // If skipIfNoCost is true and it's a configuration error, continue
      if (skipIfNoCost && error.message.includes('credit config')) {
        console.log('⏭️ Skipping credit consumption due to config error');
        next();
      } else {
        res.status(500).json({
          success: false,
          message: 'Credit check failed',
          error: error.message
        });
      }
    }
  };
};

/**
 * Middleware to finalize credit consumption after successful operation
 * Should be used after the main operation middleware
 */
export const finalizeCreditConsumption = () => {
  return async (req, res, next) => {
    // Override the response json method to consume credits after successful response
    const originalJson = res.json;
    res.json = async function(data) {
      try {
        // Only consume credits if the operation was successful
        if (req.creditConsumption && (data.success === true || res.statusCode < 400)) {
          console.log('💳 Consuming credits for successful operation...');

          const success = await RelationshipService.consumeCredits(
            req.creditConsumption.tenantId,
            req.creditConsumption.userId,
            req.creditConsumption.operationType,
            req.creditConsumption.creditsUsed,
            req.creditConsumption.operationDetails
          );

          if (success) {
            console.log('✅ Credits consumed successfully');
          } else {
            console.log('⚠️ Credit consumption failed, but operation succeeded');
          }
        }
      } catch (error) {
        console.error('Error consuming credits:', error);
        // Don't fail the operation if credit consumption fails
      }

      // Call original json method
      return originalJson.call(this, data);
    };

    next();
  };
};

/**
 * Combined middleware for operations requiring both permissions and credits
 * @param {string|string[]} permissions - Required permissions
 * @param {string} operationType - Operation type for credits
 * @param {number} creditCost - Credit cost (optional)
 */
export const requirePermissionAndCredits = (permissions, operationType, creditCost = null) => {
  return [
    requirePermissions(permissions),
    consumeCredits(operationType, creditCost),
    finalizeCreditConsumption()
  ];
};
