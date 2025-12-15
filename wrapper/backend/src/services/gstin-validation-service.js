import fetch from 'node-fetch';

class GSTINValidationService {
  constructor() {
    this.apiKey = process.env.GSTIN_API_KEY || '5188c9293e0f4056bde1df9f18dc6b12';
    this.baseUrl = 'https://sheet.gstincheck.co.in/check';
  }

  /**
   * Validate GSTIN number using external API
   * @param {string} gstin - GSTIN number to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateGSTIN(gstin) {
    try {
      // Basic GSTIN format validation
      if (!this.isValidGSTINFormat(gstin)) {
        return {
          isValid: false,
          error: 'Invalid GSTIN format. GSTIN should be 15 characters long and follow the pattern: 2 digits + 10 characters + 1 digit + 1 character.',
          details: null
        };
      }

      // Call external API for validation
      const url = `${this.baseUrl}/${this.apiKey}/${gstin}`;
      
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Onboarding-System/1.0'
        }
      });

      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }

      const result = await response.json();

      // Check if GSTIN was found
      if (result.flag === true && result.data) {
        return {
          isValid: true,
          error: null,
          details: {
            gstin: result.data.gstin,
            tradeName: result.data.tradeNam,
            legalName: result.data.lgnm,
            status: result.data.sts,
            registrationDate: result.data.rgdt,
            lastUpdate: result.data.lstupdt,
            businessType: result.data.ctb,
            taxType: result.data.ctj,
            frequency: result.data.frequencyType,
            nature: result.data.nba,
            address: result.data.pradr?.addr || {},
            state: result.data.stj,
            stateCode: result.data.stjCd
          }
        };
      } else {
        return {
          isValid: false,
          error: result.message || 'GSTIN not found or invalid',
          details: null
        };
      }

    } catch (error) {
      console.error('GSTIN validation error:', error);
      return {
        isValid: false,
        error: `Validation failed: ${error.message}`,
        details: null
      };
    }
  }

  /**
   * Basic GSTIN format validation
   * @param {string} gstin - GSTIN to validate
   * @returns {boolean} True if format is valid
   */
  isValidGSTINFormat(gstin) {
    if (!gstin || typeof gstin !== 'string') {
      return false;
    }

    // GSTIN should be exactly 15 characters
    if (gstin.length !== 15) {
      return false;
    }

    // Convert to uppercase for validation
    const upperGstin = gstin.toUpperCase();
    
    // Pattern: 2 digits + 10 alphanumeric + 1 digit + 1-2 alphanumeric
    // Example: 27AACCA8432H2ZP (valid GSTIN)
    // The pattern allows for the actual GSTIN format used in India
    const gstinPattern = /^[0-9]{2}[A-Z0-9]{10}[0-9][A-Z0-9]{1,2}$/;
    
    return gstinPattern.test(upperGstin);
  }

  /**
   * Extract company information from GSTIN validation result
   * @param {Object} validationResult - Result from validateGSTIN
   * @returns {Object} Extracted company information
   */
  extractCompanyInfo(validationResult) {
    if (!validationResult.isValid || !validationResult.details) {
      return null;
    }

    const details = validationResult.details;
    
    return {
      companyName: details.tradeName,
      legalCompanyName: details.legalName,
      gstin: details.gstin,
      businessType: details.businessType,
      registrationDate: details.registrationDate,
      status: details.status,
      address: {
        street: details.address.st || '',
        city: details.address.city || details.address.dst || '',
        state: details.address.stcd || details.state || '',
        pincode: details.address.pncd || '',
        building: details.address.bnm || '',
        floor: details.address.flno || ''
      },
      stateCode: details.stateCode,
      nature: details.nature || []
    };
  }

  /**
   * Auto-fill company details based on GSTIN validation
   * @param {string} gstin - GSTIN number
   * @returns {Promise<Object>} Auto-filled company details
   */
  async autoFillCompanyDetails(gstin) {
    const validationResult = await this.validateGSTIN(gstin);
    
    if (validationResult.isValid) {
      return this.extractCompanyInfo(validationResult);
    }
    
    return null;
  }
}

export default new GSTINValidationService();
