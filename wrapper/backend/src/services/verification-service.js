/**
 * 🔐 **VERIFICATION SERVICE**
 * Handles PAN and GSTIN verification using sandbox.co.in APIs
 * Provides business verification services for onboarding
 */

import axios from 'axios';

class VerificationService {
  constructor() {
    // Get credentials from environment variables
    const getEnvVar = (primaryName, ...alternateNames) => {
      let value = process.env[primaryName];
      if (value) return value.trim();
      
      for (const altName of alternateNames) {
        value = process.env[altName];
        if (value) return value.trim();
      }
      
      return '';
    };
    
    this.apiKey = getEnvVar(
      'VERIFICATION_API_KEY',
      'VERIFICATION_APIKEY',
      'API_KEY'
    );
    
    this.apiSecret = getEnvVar(
      'VERIFICATION_API_SECRET',
      'VERIFICATION_APISECRET',
      'API_SECRET'
    );
    
    this.apiVersion = getEnvVar(
      'VERIFICATION_API_VERSION',
      'API_VERSION',
      'VERSION'
    ) || '1.0.0';
    
    // Check for explicit production mode override
    const forceProduction = process.env.VERIFICATION_USE_PRODUCTION === 'true' || 
                            process.env.VERIFICATION_USE_LIVE === 'true';
    
    // Detect if live credentials are being used (key_live_ or secret_live_)
    const hasLiveCredentials = (this.apiKey && this.apiKey.includes('key_live_')) || 
                                (this.apiSecret && this.apiSecret.includes('secret_live_'));
    
    // Use production API if:
    // 1. Explicitly forced via env var, OR
    // 2. NODE_ENV is production, OR
    // 3. Live credentials are detected
    this.isProduction = forceProduction || 
                        process.env.NODE_ENV === 'production' || 
                        hasLiveCredentials;
    
    // Determine base URL based on environment
    // Use api.sandbox.co.in for both sandbox and production (live credentials work on sandbox endpoint)
    this.baseUrl = this.isProduction 
      ? 'https://api.sandbox.co.in'  // Production credentials work on sandbox endpoint
      : 'https://api.sandbox.co.in';

    // Cache for access token
    this.accessToken = null;
    this.tokenExpiry = null;

    // Log configuration status (without exposing secrets)
    if (!this.isConfigured()) {
      console.warn('⚠️ Verification service not configured.');
      console.warn('   Required: VERIFICATION_API_KEY and VERIFICATION_API_SECRET');
      console.warn('   Current status:', {
        apiKey: this.apiKey ? `${this.apiKey.substring(0, 4)}...` : 'NOT SET',
        apiSecret: this.apiSecret ? 'SET' : 'NOT SET'
      });
    } else {
      console.log('✅ Verification service configured');
      console.log(`🔧 API Environment: ${this.isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    }
  }

  /**
   * Verify if credentials are configured
   */
  isConfigured() {
    return !!(this.apiKey && this.apiSecret && 
              this.apiKey.length > 0 && this.apiSecret.length > 0);
  }

  /**
   * Authenticate and get access token
   * @returns {Promise<string>} Access token
   */
  async authenticate() {
    // Return cached token if still valid (with 5 minute buffer)
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 300000) {
      return this.accessToken;
    }

    try {
      console.log('🔐 Authenticating with verification API...');
      
      const url = `${this.baseUrl}/authenticate`;
      // Use plain axios without custom agents - Sandbox requires standard TLS negotiation
      const response = await axios({
        method: 'POST',
        url: url,
        headers: {
          'x-api-key': this.apiKey,
          'x-api-secret': this.apiSecret,
          'x-api-version': this.apiVersion,
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30 seconds timeout
      });
      const result = response.data;
      
      if (result.code === 200 && result.data?.access_token) {
        this.accessToken = result.data.access_token;
        // Set expiry to 1 hour from now (tokens typically last 1 hour)
        this.tokenExpiry = Date.now() + (60 * 60 * 1000);
        console.log('✅ Authentication successful');
        return this.accessToken;
      } else {
        throw new Error('Invalid authentication response');
      }
    } catch (error) {
      console.error('❌ Authentication error:', error);
      if (error.response) {
        console.error(`❌ Authentication failed: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        throw new Error(`Authentication failed: ${error.response.status}`);
      }
      throw new Error(`Failed to authenticate: ${error.message}`);
    }
  }

  /**
   * Get request headers for API (with authentication)
   */
  async getHeaders(includeApiVersion = false) {
    if (!this.isConfigured()) {
      throw new Error('Verification credentials are not configured. Please set VERIFICATION_API_KEY and VERIFICATION_API_SECRET environment variables.');
    }

    // Get access token
    const accessToken = await this.authenticate();

    const headers = {
      'Authorization': accessToken,  // Use token directly without Bearer prefix (Sandbox API format)
      'x-api-key': this.apiKey,  // Required: API key must be included with access token
      'Content-Type': 'application/json',
      'x-accept-cache': 'true'  // Enable caching as per Sandbox API requirements
    };

    if (includeApiVersion) {
      headers['x-api-version'] = this.apiVersion;
    }

    return headers;
  }

  /**
   * Verify PAN number using API
   * @param {string} pan - PAN number to verify
   * @param {string} name - Name as per PAN (optional, for verification)
   * @param {string} dateOfBirth - Date of birth (optional, for verification)
   * @returns {Promise<Object>} Verification result
   */
  async verifyPAN(pan, name = null, dateOfBirth = null) {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Verification credentials not configured, skipping PAN verification');
        return {
          verified: false,
          error: 'Verification service not configured. Please contact support or check your environment variables.',
          details: null,
          configurationError: true
        };
      }

      // Basic PAN format validation
      if (!this.isValidPANFormat(pan)) {
        return {
          verified: false,
          error: 'Invalid PAN format. PAN should be 10 characters: 5 letters, 4 digits, 1 letter',
          details: null
        };
      }

      console.log(`🔍 Verifying PAN: ${pan}${name ? ` with name: ${name}` : ''}`);
      console.log(`🔗 Using API URL: ${this.baseUrl}`);

      const url = `${this.baseUrl}/kyc/pan/verify`;
      const body = {
        pan: pan.toUpperCase(),
        consent: 'Y',
        reason: 'Business verification for onboarding',
        ...(name && { name_as_per_pan: name }),
        ...(dateOfBirth && { date_of_birth: dateOfBirth })
      };
      
      console.log(`📤 Request URL: ${url}`);

      // Use plain axios without custom agents - Sandbox requires standard TLS negotiation
      const response = await axios({
        method: 'POST',
        url: url,
        headers: await this.getHeaders(),
        data: body,
        timeout: 30000, // 30 seconds timeout
      });
      const result = response.data;
      
      // Handle successful response
      if (result.code === 200 && result.data) {
        const verificationData = result.data;
        const isVerified = verificationData.status === 'valid' || verificationData.status === 'active';
        
        if (isVerified) {
          console.log(`✅ PAN verified successfully: ${pan}`);
          return {
            verified: true,
            error: null,
            details: {
              pan: verificationData.pan || pan.toUpperCase(),
              category: verificationData.category || null,
              status: verificationData.status,
              nameMatch: verificationData.name_as_per_pan_match || null,
              dateOfBirthMatch: verificationData.date_of_birth_match || null,
              aadhaarSeedingStatus: verificationData.aadhaar_seeding_status || null,
              remarks: verificationData.remarks || null
            },
            nameMatchScore: verificationData.name_as_per_pan_match ? 1.0 : 0.0,
            type: verificationData.category || verificationData.type
          };
        } else {
          console.log(`❌ PAN verification failed: ${pan} - Status: ${verificationData.status}`);
          return {
            verified: false,
            error: verificationData.remarks || `PAN verification failed. Status: ${verificationData.status}`,
            details: verificationData
          };
        }
      } else {
        console.log(`❌ PAN verification failed: ${pan} - ${result.message || 'Invalid response'}`);
        return {
          verified: false,
          error: result.message || 'PAN verification failed. Please check the PAN number.',
          details: result
        };
      }
    } catch (error) {
      console.error('❌ PAN verification error:', error);
      
      // Handle axios errors
      if (error.response) {
        const status = error.response.status;
        const errorData = error.response.data || {};
        
        if (status === 403) {
          return {
            verified: false,
            error: errorData.message || 'Access denied. Please check your API permissions.',
            details: errorData,
            retryable: false,
            requiresWhitelist: true
          };
        }
        
        if (status === 401) {
          return {
            verified: false,
            error: 'Invalid API credentials. Please check your API Key and Authorization.',
            details: errorData,
            retryable: false
          };
        }
        
        if (status === 429) {
          return {
            verified: false,
            error: 'Rate limit exceeded. Please try again in a moment.',
            details: null,
            retryable: true
          };
        }

        if (status === 404) {
          return {
            verified: false,
            error: errorData.message || 'Verification endpoint not found. Please check API documentation.',
            details: {
              ...errorData,
              endpoint: url
            },
            retryable: false,
            endpointError: true
          };
        }

        return {
          verified: false,
          error: errorData.message || `Verification failed: API error (${status})`,
          details: errorData,
          retryable: status >= 500
        };
      }
      
      // Network or SSL errors
      return {
        verified: false,
        error: error.message || 'An error occurred during PAN verification',
        details: null,
        retryable: true
      };
    }
  }

  /**
   * Verify GSTIN number using API
   * @param {string} gstin - GSTIN number to verify
   * @param {string} businessName - Business name (optional, for verification)
   * @returns {Promise<Object>} Verification result
   */
  async verifyGSTIN(gstin, businessName = null) {
    try {
      if (!this.isConfigured()) {
        console.warn('⚠️ Verification credentials not configured, skipping GSTIN verification');
        return {
          verified: false,
          error: 'Verification service not configured. Please contact support or check your environment variables.',
          details: null,
          configurationError: true
        };
      }

      // Basic GSTIN format validation
      if (!this.isValidGSTINFormat(gstin)) {
        return {
          verified: false,
          error: 'Invalid GSTIN format. GSTIN should be 15 characters.',
          details: null
        };
      }

      console.log(`🔍 Verifying GSTIN: ${gstin}${businessName ? ` for business: ${businessName}` : ''}`);
      console.log(`🔗 Using API URL: ${this.baseUrl}`);

      const url = `${this.baseUrl}/gst/compliance/public/gstin/search`;
      const body = {
        gstin: gstin.toUpperCase()
      };
      
      console.log(`📤 Request URL: ${url}`);

      // Use plain axios without custom agents - Sandbox requires standard TLS negotiation
      try {
        const response = await axios({
        method: 'POST',
          url: url,
        headers: await this.getHeaders(true), // Include x-api-version for GST endpoints
          data: body,
          timeout: 30000,
        });
        const result = response.data;
        
        if (result.code === 200 && result.data?.data) {
          const gstinData = result.data.data;
          const isActive = gstinData.sts === 'Active' || gstinData.sts === 'active';
          
          console.log(`✅ GSTIN verified successfully: ${gstin}`);
          return {
            verified: isActive,
            error: isActive ? null : `GSTIN status is ${gstinData.sts}. Only active GSTINs are allowed.`,
            details: {
              gstin: gstinData.gstin || gstin.toUpperCase(),
              legalName: gstinData.lgnm || null,
              tradeName: gstinData.tradeNam || null,
              status: gstinData.sts || null,
              constitution: gstinData.ctb || null,
              registrationDate: gstinData.rgdt || null,
              address: gstinData.pradr?.addr || null,
              isActive: isActive
            }
          };
        } else {
          return {
            verified: false,
            error: result.message || 'GSTIN verification returned unexpected response',
            details: result.data
          };
        }
      } catch (error) {
        if (error.response) {
          const status = error.response.status;
          const errorData = error.response.data || {};
          
          console.error(`❌ GSTIN verification failed: ${status}`, errorData);
          
          if (status === 403) {
            return {
              verified: false,
              error: 'Access denied. Please check your API permissions.',
              details: errorData,
              retryable: false,
              requiresWhitelist: true
            };
          }
          
          if (status === 401) {
          return {
            verified: false,
              error: 'Invalid API credentials.',
            details: errorData,
            retryable: false
          };
        }
        
          if (status === 429) {
          return {
            verified: false,
            error: 'Rate limit exceeded. Please try again in a moment.',
            details: null,
            retryable: true
          };
        }

          return {
            verified: false,
            error: errorData.message || `GSTIN verification failed: API error (${status})`,
          details: errorData,
            retryable: status >= 500
          };
        } else {
          console.error('❌ GSTIN verification network error:', error.message);
          return {
            verified: false,
            error: `Network error: ${error.message}`,
            details: null,
            retryable: true
          };
        }
      }
    } catch (error) {
      console.error('❌ GSTIN verification error:', error);
      return {
        verified: false,
        error: error.message || 'An error occurred during GSTIN verification',
        details: null,
        retryable: true
      };
    }
  }

  /**
   * Get GSTINs associated with a PAN number
   * @param {string} pan - PAN number
   * @returns {Promise<Object>} Result with GSTINs list
   */
  async getGSTINsByPAN(pan) {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          error: 'Verification service not configured',
          gstins: []
        };
      }

      if (!this.isValidPANFormat(pan)) {
        return {
          success: false,
          error: 'Invalid PAN format',
          gstins: []
        };
      }

      console.log(`🔍 Fetching GSTINs for PAN: ${pan}`);

      const url = `${this.baseUrl}/gst/compliance/public/pan/search`;
      const body = {
        pan: pan.toUpperCase()
      };

      // Use plain axios without custom agents - Sandbox requires standard TLS negotiation
      const response = await axios({
        method: 'POST',
        url: url,
        headers: await this.getHeaders(true), // Include x-api-version for GST endpoints
        data: body,
        timeout: 30000,
      });
      const result = response.data;

      if (result.code === 200 && Array.isArray(result.data)) {
        return {
          success: true,
          gstins: result.data.map(item => ({
            gstin: item.gstin,
            legalName: item.data?.lgnm,
            tradeName: item.data?.tradeNam,
            status: item.data?.sts
          })),
          error: null
        };
      } else {
      return {
        success: false,
          error: result.message || 'Unexpected response format',
        gstins: []
      };
      }
    } catch (error) {
      console.error('❌ Error fetching GSTINs by PAN:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch GSTINs',
        gstins: []
      };
    }
  }

  /**
   * Basic PAN format validation
   * @param {string} pan - PAN to validate
   * @returns {boolean} True if format is valid
   */
  isValidPANFormat(pan) {
    if (!pan || typeof pan !== 'string') return false;
    // PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase());
  }

  /**
   * Basic GSTIN format validation
   * @param {string} gstin - GSTIN to validate
   * @returns {boolean} True if format is valid
   */
  isValidGSTINFormat(gstin) {
    if (!gstin || typeof gstin !== 'string') return false;
    // GSTIN format: 2 digits + 10 characters (PAN) + 1 digit + 1 character + Z + 1 alphanumeric
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return gstinRegex.test(gstin.toUpperCase());
  }
}

export default new VerificationService();

