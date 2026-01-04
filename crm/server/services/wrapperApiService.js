import axios from 'axios';

/**
 * Service to interact with wrapper application APIs
 * Uses user tokens when available, falls back gracefully when not
 */
class WrapperApiService {
  constructor() {
    // Ensure we use localhost:3000 for local development, not production URLs
    const envUrl = process.env.WRAPPER_API_URL;
    if (envUrl && (envUrl.includes('zopkit.com') || envUrl.includes('production') || envUrl.includes('prod'))) {
      console.warn('⚠️ [WrapperAPI] Production URL detected in WRAPPER_API_URL, using localhost:3000 instead');
      this.baseUrl = 'http://localhost:3000';
    } else {
      this.baseUrl = envUrl || 'http://localhost:3000';
    }
    this.timeout = 30000; // 30 seconds (increased for local development)
    
    // Log the wrapper API URL being used
    console.log(`🔗 [WrapperAPI] Using wrapper API URL: ${this.baseUrl}`);
  }

  /**
   * Verify if user has a tenant and get tenant information
   * @param {string} email - User's email address
   * @param {string} authToken - Authentication token (optional for basic tenant check)
   * @returns {Promise<Object>} Tenant verification result
   */
  async verifyUserTenant(email, authToken = null) {
    try {
      console.log('🔍 Verifying user tenant via wrapper API:', email);

      const headers = {
        'Content-Type': 'application/json',
        'X-Request-Source': 'crm-backend'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Build candidate endpoints (allow override via env)
      const overridePath = process.env.WRAPPER_TENANT_VERIFY_PATH; // e.g. /api/user/tenant/:email
      const candidates = [];
      const emailEnc = encodeURIComponent(email);

      if (overridePath) {
        const path = overridePath.replace(':email', emailEnc);
        candidates.push(`${this.baseUrl}${path}`);
      }

      // Default and common variants
      candidates.push(
        `${this.baseUrl}/api/user/tenant/${emailEnc}`,
        `${this.baseUrl}/api/user/tenant?email=${emailEnc}`,
        `${this.baseUrl}/api/users/tenant/${emailEnc}`,
        `${this.baseUrl}/api/users/tenant?email=${emailEnc}`,
        `${this.baseUrl}/api/wrapper/user/tenant/${emailEnc}`,
        `${this.baseUrl}/api/wrapper/user/tenant?email=${emailEnc}`
      );

      let lastError = null;
      for (const url of candidates) {
        try {
          console.log('🌐 [Wrapper] Trying tenant verification URL:', url);
          const response = await axios.get(url, { timeout: this.timeout, headers });

          if (response.status === 200 && response.data?.success) {
            console.log('✅ User tenant verified successfully');
            const tenantData = response.data.data;

            // Check if tenant and user are active
            if (!tenantData.tenantIsActive) {
              console.log('⚠️ Tenant is not active');
              return { success: true, hasTenant: false, message: 'Tenant is not active' };
            }
            if (!tenantData.userIsActive) {
              console.log('⚠️ User is not active');
              return { success: true, hasTenant: false, message: 'User account is not active' };
            }

            return {
              success: true,
              hasTenant: true,
              tenantId: tenantData.tenantId,
              userId: tenantData.userId,
              orgCode: tenantData.entityId || tenantData.tenantId,
              tenantName: tenantData.tenantName || tenantData.organization?.orgName || `Tenant ${tenantData.tenantId}`,
              tenantIsActive: tenantData.tenantIsActive,
              userIsActive: tenantData.userIsActive,
              data: tenantData
            };
          }

          // Non-success but 200
          lastError = { status: response.status, message: response.data?.message };
        } catch (err) {
          // Capture detailed error information
          const status = err.response?.status;
          const errorCode = err.code; // ECONNREFUSED, ETIMEDOUT, ENOTFOUND, etc.
          const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
          const errorDetails = {
            status,
            code: errorCode,
            message: errorMessage,
            url,
            isConnectionError: !err.response // No response means connection error
          };
          
          // Log detailed error information
          if (errorCode) {
            console.log(`⚠️ [Wrapper] URL failed - Connection Error (${errorCode}): ${url} -> ${errorMessage}`);
          } else if (status) {
            console.log(`⚠️ [Wrapper] URL failed - HTTP ${status}: ${url} -> ${errorMessage}`);
          } else {
            console.log(`⚠️ [Wrapper] URL failed - Unknown error: ${url} -> ${errorMessage}`);
            console.log(`   Error details:`, {
              code: errorCode,
              status,
              message: errorMessage,
              response: err.response ? 'present' : 'none',
              stack: err.stack?.split('\n')[0]
            });
          }
          
          // Stop trying for auth errors; bubble up so caller can handle
          if (status === 401) {
            return { success: false, hasTenant: false, error: errorMessage, statusCode: 401 };
          }
          
          // If connection error (ECONNREFUSED, ENOTFOUND, ETIMEDOUT), don't try other URLs
          if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
            console.error(`❌ [Wrapper] Connection error (${errorCode}): Wrapper API at ${this.baseUrl} is not accessible`);
            return { 
              success: false, 
              hasTenant: false, 
              error: `Wrapper API connection failed: ${errorMessage} (${errorCode})`,
              errorCode,
              isConnectionError: true
            };
          }
          
          // If 404, try next candidate
          lastError = { status, message: errorMessage, code: errorCode };
          continue;
        }
      }

      // Exhausted candidates
      if (lastError?.status === 404) {
        return { success: true, hasTenant: false, message: 'No tenant assigned' };
      }
      
      const finalError = lastError?.message || 'Unknown error';
      const finalErrorCode = lastError?.code;
      console.error(`❌ [Wrapper] All tenant verification URLs failed. Last error: ${finalError}${finalErrorCode ? ` (${finalErrorCode})` : ''}`);
      
      return { 
        success: false, 
        hasTenant: false, 
        error: finalError,
        errorCode: finalErrorCode
      };
    } catch (error) {
      // Capture detailed error information
      const errorCode = error.code;
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      const statusCode = error.response?.status;
      
      console.error('❌ [Wrapper] Error verifying user tenant:', {
        message: errorMessage,
        code: errorCode,
        status: statusCode,
        url: this.baseUrl,
        isConnectionError: !error.response
      });

      if (error.response) {
        // If 404, user doesn't have a tenant
        if (error.response.status === 404) {
          return {
            success: true,
            hasTenant: false,
            message: 'User has no tenant assigned'
          };
        }

        return {
          success: false,
          hasTenant: false,
          error: errorMessage,
          statusCode: statusCode,
          errorCode
        };
      }

      // Connection error
      if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorCode === 'ETIMEDOUT') {
        console.error(`❌ [Wrapper] Connection error (${errorCode}): Wrapper API at ${this.baseUrl} is not accessible`);
        return {
          success: false,
          hasTenant: false,
          error: `Wrapper API connection failed: ${errorMessage} (${errorCode})`,
          errorCode,
          isConnectionError: true
        };
      }

      return {
        success: false,
        hasTenant: false,
        error: errorMessage,
        errorCode
      };
    }
  }

  /**
   * Fetch user roles and permissions from wrapper API
   * @param {string} externalId - User's external ID from wrapper
   * @param {string} orgCode - Organization code
   * @param {string} authToken - Authentication token (JWT from Kinde or wrapper)
   * @returns {Promise<Object>} User context with roles and permissions
   */
  async getUserContext(externalId, orgCode, authToken = null) {
    try {
      console.log('🔍 Fetching user context from wrapper API:', { externalId, orgCode });

      if (!authToken) {
        console.warn('⚠️ No auth token provided, cannot authenticate with wrapper API');
        return {
          success: false,
          error: 'Authentication token required for wrapper API access',
          statusCode: 401,
          externalId
        };
      }

      const response = await axios.get(`${this.baseUrl}/api/permission-matrix/user-context`, {
        timeout: this.timeout,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'X-User-Id': externalId,
          'X-Org-Code': orgCode
        }
      });

      if (response.status === 200) {
        console.log('✅ Successfully fetched user context from wrapper API');
        return {
          success: true,
          data: response.data,
          externalId
        };
      } else {
        console.warn('⚠️ Wrapper API returned non-200 status:', response.status);
        return {
          success: false,
          error: `HTTP ${response.status}`,
          statusCode: response.status,
          externalId
        };
      }
    } catch (error) {
      console.error('❌ Error fetching user context from wrapper:', error.message);
      
      if (error.response) {
        console.error('❌ Wrapper API error response:', {
          status: error.response.status,
          data: error.response.data,
          headers: error.response.headers
        });
        
        return {
          success: false,
          error: error.response.data?.message || error.message,
          statusCode: error.response.status,
          externalId
        };
      }
      
      return {
        success: false,
        error: error.message,
        externalId
      };
    }
  }

  /**
   * Batch fetch user contexts from wrapper API
   * @param {Array} batch - Array of {externalId, orgCode} objects
   * @param {string} authToken - Authentication token (required for wrapper API access)
   * @returns {Promise<Array>} Array of user context results
   */
  async getBatchUserContext(batch, authToken = null) {
    try {
      console.log('🔍 Batch fetching user contexts from wrapper API:', batch.length, 'users');

      if (!authToken) {
        console.warn('⚠️ No auth token provided, cannot authenticate with wrapper API');
        // Return failed results for all users
        return batch.map(({ externalId }) => ({
          success: false,
          error: 'Authentication token required for wrapper API access',
          statusCode: 401,
          externalId
        }));
      }

      const promises = batch.map(async ({ externalId, orgCode }) => {
        try {
          const response = await axios.get(`${this.baseUrl}/api/permission-matrix/user-context`, {
            timeout: this.timeout,
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
              'X-User-Id': externalId,
              'X-Org-Code': orgCode
            }
          });

          if (response.status === 200) {
            return {
              success: true,
              data: response.data,
              externalId
            };
          } else {
            return {
              success: false,
              error: `HTTP ${response.status}`,
              statusCode: response.status,
              externalId
            };
          }
        } catch (error) {
          console.error(`❌ Error fetching context for user ${externalId}:`, error.message);
          
          if (error.response) {
            return {
              success: false,
              error: error.response.data?.message || error.message,
              statusCode: error.response.status,
              externalId
            };
          }
          
          return {
            success: false,
            error: error.message,
            externalId
          };
        }
      });

      const results = await Promise.all(promises);
      console.log('✅ Batch user context fetch completed:', {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      console.error('❌ Error in batch user context fetch:', error.message);
      throw error;
    }
  }

  /**
   * Test connection to wrapper API
   * @param {string} authToken - Optional authentication token for testing
   * @returns {Promise<Object>} Connection test result
   */
  async testConnection(authToken = null) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Request-Source': 'crm-backend'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      console.log(`🔍 Testing wrapper API connection: ${this.baseUrl}/api/health`);
      
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 5000,
        headers: headers
      });
      
      return {
        success: true,
        message: 'Wrapper API connection successful',
        statusCode: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };
    } catch (error) {
      console.error('❌ Wrapper API connection test failed:', error.message);
      return {
        success: false,
        error: error.message,
        statusCode: error.response?.status || 0
      };
    }
  }

  /**
   * Get comprehensive tenant data for syncing
   * @param {string} tenantId - Tenant ID
   * @param {string} authToken - Authentication token
   * @returns {Promise<Object>} Comprehensive tenant data
   */
  async getTenantData(tenantId, authToken) {
    try {
      console.log('🔍 Fetching comprehensive tenant data from wrapper API:', tenantId);
      console.log('🔑 Kinde token received:', authToken ? `${authToken.substring(0, 50)}... (length: ${authToken.length})` : 'NO TOKEN');

      // Use the Kinde token directly for Wrapper API authentication
      const headers = {
        'Content-Type': 'application/json',
        'X-Request-Source': 'crm-backend'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
        console.log('✅ Using Kinde token directly for Wrapper API authentication');
      } else {
        console.log('❌ No Kinde token available for Wrapper API');
        return {
          success: false,
          message: 'No Kinde token available for Wrapper API authentication'
        };
      }

      // Define endpoints being called
      const endpoints = [
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/organizations`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/roles`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/users`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/employee-assignments`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/role-assignments`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/credit-configs`,
        `${this.baseUrl}/api/wrapper/tenants/${tenantId}/entity-credits`
      ];

      console.log('🌐 Calling wrapper endpoints:');
      endpoints.forEach((endpoint, index) => {
        const endpointName = endpoint.split('/').pop();
        console.log(`  ${index + 1}. ${endpointName}: ${endpoint}`);
      });

      // Fetch all data in parallel
      const [orgsRes, rolesRes, usersRes, empAssignmentsRes, roleAssignmentsRes, creditConfigsRes, entityCreditsRes] = await Promise.allSettled([
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/organizations`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/roles`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/users`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/employee-assignments`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/role-assignments`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/credit-configs`, { timeout: this.timeout, headers }),
        axios.get(`${this.baseUrl}/api/wrapper/tenants/${tenantId}/entity-credits`, { timeout: this.timeout, headers })
      ]);

      const result = {
        success: true,
        data: {}
      };

      // Extract successful responses
      if (orgsRes.status === 'fulfilled' && orgsRes.value.data.success) {
        result.data.organizations = orgsRes.value.data.data;
        console.log(`✅ Organizations fetched: ${orgsRes.value.data.data.length} records`);
      }

      if (rolesRes.status === 'fulfilled' && rolesRes.value.data.success) {
        result.data.roles = rolesRes.value.data.data;
        console.log(`✅ Roles fetched: ${rolesRes.value.data.data.length} records`);
      }

      if (usersRes.status === 'fulfilled' && usersRes.value.data.success) {
        result.data.users = usersRes.value.data.data;
        console.log(`✅ Users fetched: ${usersRes.value.data.data.length} records`);
      }

      if (empAssignmentsRes.status === 'fulfilled' && empAssignmentsRes.value.data.success) {
        result.data.employeeAssignments = empAssignmentsRes.value.data.data;
        console.log(`✅ Employee assignments fetched: ${empAssignmentsRes.value.data.data.length} records`);
      }

      if (roleAssignmentsRes.status === 'fulfilled' && roleAssignmentsRes.value.data.success) {
        result.data.roleAssignments = roleAssignmentsRes.value.data.data;
        console.log(`✅ Role assignments fetched: ${roleAssignmentsRes.value.data.data.length} records`);
      }

      if (creditConfigsRes.status === 'fulfilled' && creditConfigsRes.value.data.success) {
        result.data.creditConfigs = creditConfigsRes.value.data.data;
        console.log(`✅ Credit configs fetched: ${creditConfigsRes.value.data.data.length} records`);
      }

      if (entityCreditsRes.status === 'fulfilled' && entityCreditsRes.value.data.success) {
        result.data.entityCredits = entityCreditsRes.value.data.data;
        console.log(`✅ Entity credits fetched: ${entityCreditsRes.value.data.data.length} records`);
      }

      // Log results for each endpoint
      const endpointNames = ['organizations', 'roles', 'users', 'employee-assignments', 'role-assignments', 'credit-configs', 'entity-credits'];
      const responses = [orgsRes, rolesRes, usersRes, empAssignmentsRes, roleAssignmentsRes, creditConfigsRes, entityCreditsRes];

      console.log('📊 Wrapper API call results:');
      responses.forEach((res, index) => {
        const endpointName = endpointNames[index];
        if (res.status === 'fulfilled') {
          const status = res.value.status;
          const success = res.value.data?.success;
          console.log(`  ✅ ${endpointName}: HTTP ${status}, success=${success}`);
          if (status === 401) {
            console.log(`    🔐 401 Unauthorized for ${endpointName} - token rejected by wrapper`);
          }
        } else {
          console.log(`  ❌ ${endpointName}: Failed - ${res.reason.message}`);
          if (res.reason.response?.status === 401) {
            console.log(`    🔐 401 Unauthorized for ${endpointName} - token rejected by wrapper`);
          }
        }
      });

      console.log('✅ Comprehensive tenant data fetched successfully');
      return result;

    } catch (error) {
      console.error('❌ Error fetching comprehensive tenant data:', error.response?.data?.message || error.message);
      return {
        success: false,
        message: error.response?.data?.message || error.message
      };
    }
  }

  /**
   * Authenticate as a service to get a valid Wrapper API token
   * @param {string} tenantId - Tenant ID for the service authentication
   * @returns {Promise<string|null>} Service token or null if failed
   */
  async authenticateAsService(tenantId) {
    try {
      console.log('🔐 Authenticating CRM as service with Wrapper API');

      const internalApiKey = process.env.INTERNAL_API_KEY || process.env.WRAPPER_API_KEY;

      if (!internalApiKey) {
        console.log('❌ No internal API key available for service authentication');
        return null;
      }

      const response = await axios.post(`${this.baseUrl}/api/internal/service-auth`, {
        service: 'crm',
        tenant_id: tenantId,
        permissions: ['read', 'sync']
      }, {
        timeout: this.timeout,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': internalApiKey,
          'X-Request-Source': 'crm-backend'
        }
      });

      if (response.status === 200 && response.data.success) {
        console.log('✅ Service authentication successful');
        return response.data.data.token;
      } else {
        console.log('❌ Service authentication failed:', response.data);
        return null;
      }

    } catch (error) {
      console.error('❌ Service authentication error:', error.message);

      if (error.response) {
        console.error('❌ Wrapper API error response:', {
          status: error.response.status,
          data: error.response.data
        });
      }

      return null;
    }
  }
}

export default new WrapperApiService();
