import UserProfile from '../models/UserProfile.js';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import WrapperApiService from '../services/wrapperApiService.js';
import CrmTenantUser from '../models/CrmTenantUser.js';
import RelationshipService from '../services/relationshipService.js';

// Dynamic imports for services that haven't been converted yet
let TenantDataSyncService, Tenant;

// Initialize dynamic models and services
const initializeModels = async () => {
  try {
    const [tenant, tenantDataSync] = await Promise.all([
      import('../models/Tenant.js'),
      import('../services/tenantDataSyncService.js')
    ]);
    Tenant = tenant.default;
    TenantDataSyncService = tenantDataSync.default;
    console.log('✅ Auth controller models and services initialized');
  } catch (error) {
    console.error('❌ Failed to initialize auth controller models and services:', error);
    throw error;
  }
};

// Initialize models on module load
initializeModels();



/**
 * Verify if user has a tenant via wrapper API
 * @param {string} email - User's email
 * @returns {Promise<Object>} Tenant verification result
 */
async function verifyUserTenant(email) {
  try {
    console.log(`🔍 Verifying tenant for user: ${email}`);

    // Use the wrapper API service to verify user tenant
    const result = await WrapperApiService.verifyUserTenant(email);

    if (result.success && result.hasTenant) {
      return {
        hasTenant: true,
        tenantId: result.tenantId,
        userId: result.userId,
        orgCode: result.orgCode,
        tenantName: result.tenantName
      };
    } else {
      return {
        hasTenant: false,
        message: result.message || 'No tenant assigned'
      };
    }
  } catch (error) {
    console.error('❌ Tenant verification failed:', error);
    return { hasTenant: false, error: error.message };
  }
}

/**
 * Update or create CRM tenant user record
 * @param {string} tenantId - Tenant ID
 * @param {Object} userContext - User context from wrapper API
 * @param {string} email - User's email
 * @returns {Promise<Object>} CRM tenant user record
 */
// Moved to utils/userUtils.js


/**
 * Handle authentication for users redirected from external applications
 * Validates Kinde token, performs tenant sync, and returns enhanced JWT
 */
export const redirectAuth = async (req, res) => {
  // Set a longer timeout for this endpoint since it may trigger sync operations
  req.setTimeout(120000); // 2 minutes
  res.setTimeout(120000);

  try {
    console.log('🔄 Processing redirect authentication...');

    // Get token from Authorization header or request body
    let token = req.headers.authorization?.replace('Bearer ', '');
    if (!token && req.body && req.body.access_token) {
      token = req.body.access_token;
    }
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    console.log('🔑 Received token for redirect auth');

    // Use the comprehensive authentication service
    const authService = (await import('../services/authService.js')).default;
    const result = await authService.authenticateUser(token, req.body.email || req.query.email);

    console.log('✅ Redirect authentication successful');
    
    // Ensure response is sent
    if (!res.headersSent) {
      res.json(result);
    }

  } catch (err) {
    console.error('❌ Redirect authentication error:', err);
    
    // Ensure error response is sent
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Authentication failed',
        error: err.message,
        type: err.type || 'UNKNOWN_ERROR',
        retryable: err.retryable || false
      });
    }
  }
};
