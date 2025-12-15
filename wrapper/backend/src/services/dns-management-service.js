// AWS SDK will be imported conditionally in constructor
import { db } from '../db/index.js';
import { tenants } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

class DNSManagementService {

  constructor() {
    this.route53 = null;
    this.hostedZoneId = process.env.AWS_HOSTED_ZONE_ID;
    this.baseDomain = process.env.BASE_DOMAIN || 'myapp.com';
    this.serverTarget = process.env.SERVER_TARGET || this.baseDomain; // What tenants should point their domains to

    // DNS record types
    this.recordTypes = {
      SUBDOMAIN: 'A',
      CUSTOM_DOMAIN: 'CNAME',
      VERIFICATION: 'TXT'
    };

    // Initialize AWS SDK if credentials are available
    this.initializeAWS();
  }

  async initializeAWS() {
    try {
      const AWS = await import('aws-sdk');
      
      // Check if AWS credentials are available
      if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        this.route53 = new AWS.default.Route53({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        });
        console.log('✅ AWS Route 53 initialized successfully');
      } else {
        console.log('⚠️ AWS credentials not configured, using mock DNS service');
      }
    } catch (error) {
      console.warn('⚠️ AWS SDK not available, using mock DNS service:', error.message);
    }
  }

  /**
   * Create subdomain for tenant
   */
  async createTenantSubdomain(tenantId, customTarget = null) {
    try {
      console.log(`🏢 Creating subdomain for tenant: ${tenantId}`);

      // Get tenant details
      const tenant = await db
        .select({
          tenantId: tenants.tenantId,
          companyName: tenants.companyName,
          subdomain: tenants.subdomain
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (tenant.length === 0) {
        throw new Error('Tenant not found');
      }

      let subdomain = tenant[0].subdomain;
      let isExisting = false;

      if (subdomain) {
        // Tenant already has a subdomain in database
        console.log(`📋 Tenant already has subdomain in database: ${subdomain}`);
        isExisting = true;
      } else {
        // Generate new unique subdomain
        subdomain = await this.generateUniqueSubdomain(tenant[0].companyName);
        console.log(`🔧 Generated new subdomain: ${subdomain}`);
      }

      // Create DNS record (this will handle existing records gracefully)
      const targetValue = "35.171.71.112" ;
      const dnsResult = await this.createDNSRecord(
        `${subdomain}.${this.baseDomain}`,
        this.recordTypes.SUBDOMAIN,
        targetValue
      );

      // Update tenant record with subdomain if not already set
      if (!tenant[0].subdomain) {
        await db.update(tenants)
          .set({
            subdomain,
            updatedAt: new Date()
          })
          .where(eq(tenants.tenantId, tenantId));

        console.log(`✅ Subdomain set in database: ${subdomain}.${this.baseDomain} → ${targetValue}`);
      } else {
        console.log(`✅ Subdomain already exists: ${subdomain}.${this.baseDomain} → ${targetValue}`);
      }

      return {
        success: true,
        subdomain,
        fullDomain: `${subdomain}.${this.baseDomain}`,
        target: targetValue,
        dnsChangeId: dnsResult.changeId,
        tenantId,
        isExisting
      };

    } catch (error) {
      console.error('❌ Subdomain creation failed:', error);
      throw new Error(`Subdomain creation failed: ${error.message}`);
    }
  }

  /**
   * Setup custom domain for tenant
   */
  async setupCustomDomain(tenantId, customDomain) {
    try {
      console.log(`🔧 Setting up custom domain: ${customDomain} for tenant: ${tenantId}`);

      // Validate domain format
      if (!this.isValidDomain(customDomain)) {
        throw new Error('Invalid domain format');
      }

      // Check if domain is already in use
      const existingTenant = await db
        .select({ tenantId: tenants.tenantId, companyName: tenants.companyName })
        .from(tenants)
        .where(eq(tenants.customDomain, customDomain))
        .limit(1);

      if (existingTenant.length > 0) {
        throw new Error(`Domain already assigned to ${existingTenant[0].companyName}`);
      }

      // Generate verification token
      const verificationToken = this.generateVerificationToken();

      // Create verification TXT record
      const verificationDomain = `_verify.${customDomain}`;
      await this.createDNSRecord(
        verificationDomain,
        this.recordTypes.VERIFICATION,
        `"${verificationToken}"`
      );

      // Store verification request (you might want to add a verification_requests table)
      const verificationRequest = {
        tenantId,
        customDomain,
        verificationToken,
        verificationDomain,
        status: 'pending',
        createdAt: new Date()
      };

      console.log(`✅ Verification setup complete for: ${customDomain}`);
      console.log(`📝 TXT Record: ${verificationDomain} = "${verificationToken}"`);

      return {
        success: true,
        status: 'verification_required',
        customDomain,
        verificationDomain,
        verificationToken,
        instructions: [
          `Add TXT record: ${verificationDomain}`,
          `Value: "${verificationToken}"`,
          `TTL: 300`,
          'Then call the verification endpoint'
        ]
      };

    } catch (error) {
      console.error('❌ Custom domain setup failed:', error);
      throw new Error(`Custom domain setup failed: ${error.message}`);
    }
  }

  /**
   * Verify domain ownership
   */
  async verifyDomainOwnership(tenantId, customDomain) {
    try {
      console.log(`🔍 Verifying domain ownership: ${customDomain}`);

      // Get stored verification data (from your verification_requests table)
      const verificationData = await this.getVerificationData(tenantId, customDomain);

      if (!verificationData) {
        throw new Error('No verification request found for this domain');
      }

      // Check if TXT record exists with correct value
      const isVerified = await this.checkTXTRecord(
        verificationData.verificationDomain,
        verificationData.verificationToken
      );

      if (!isVerified) {
        return {
          success: false,
          verified: false,
          message: 'TXT record not found or incorrect value',
          instructions: verificationData.instructions
        };
      }

      // Create CNAME record for the domain
      const cnameResult = await this.createDNSRecord(
        customDomain,
        this.recordTypes.CUSTOM_DOMAIN,
        this.serverTarget
      );

      // Update tenant record
      await db.update(tenants)
        .set({
          customDomain,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      // Clean up verification record
      await this.deleteDNSRecord(verificationData.verificationDomain, this.recordTypes.VERIFICATION);

      console.log(`✅ Domain verified and configured: ${customDomain}`);

      return {
        success: true,
        verified: true,
        customDomain,
        cnameChangeId: cnameResult.changeId,
        message: 'Domain successfully verified and configured'
      };

    } catch (error) {
      console.error('❌ Domain verification failed:', error);
      throw new Error(`Domain verification failed: ${error.message}`);
    }
  }

  /**
   * Check if TXT record exists with correct value
   */
  async checkTXTRecord(domain, expectedValue) {
    try {
      console.log(`🔍 Checking TXT record: ${domain} = "${expectedValue}"`);

      // Use DNS lookup to check TXT record
      const dns = require('dns').promises;

      try {
        const records = await dns.resolveTxt(domain);

        // Flatten the records array and check for our value
        const txtValues = records.flat();

        // Remove quotes from expected value for comparison
        const cleanExpectedValue = expectedValue.replace(/"/g, '');

        const hasCorrectValue = txtValues.some(value =>
          value.replace(/"/g, '') === cleanExpectedValue
        );

        console.log(`📋 Found TXT values:`, txtValues);
        console.log(`✅ TXT record ${hasCorrectValue ? 'verified' : 'not found'}`);

        return hasCorrectValue;

      } catch (dnsError) {
        console.log(`❌ DNS lookup failed for ${domain}:`, dnsError.message);
        return false;
      }

    } catch (error) {
      console.error('❌ TXT record check failed:', error);
      return false;
    }
  }

  /**
   * Create DNS record in Route 53
   */
  async createDNSRecord(domain, type, value) {
    // Ensure AWS is initialized
    if (!this.route53) {
      await this.initializeAWS();
    }

    // If AWS SDK is not available, return mock response
    if (!this.route53) {
      console.log(`🔄 Mock DNS record creation: ${domain} (${type}) → ${value}`);
      return {
        changeId: 'mock-change-id-' + Date.now(),
        status: 'INSYNC',
        domain,
        type,
        value,
        isMock: true
      };
    }

    const params = {
      HostedZoneId: this.hostedZoneId,
      ChangeBatch: {
        Comment: `DNS record for domain: ${domain}`,
        Changes: [{
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: domain,
            Type: type,
            TTL: 300,
            ResourceRecords: [{
              Value: value
            }]
          }
        }]
      }
    };

    try {
      const result = await this.route53.changeResourceRecordSets(params).promise();

      console.log(`✅ DNS record upserted: ${domain} (${type}) → ${value}`);
      console.log(`   Change ID: ${result.ChangeInfo.Id}`);

      return {
        changeId: result.ChangeInfo.Id,
        status: result.ChangeInfo.Status,
        domain,
        type,
        value
      };

    } catch (error) {
      console.error('❌ DNS record creation failed:', error);
      throw new Error(`DNS record creation failed: ${error.message}`);
    }
  }

  /**
   * Delete DNS record from Route 53
   */
  async deleteDNSRecord(domain, type) {
    try {
      console.log(`🗑️ Deleting DNS record: ${domain} (${type})`);

      // Get current record first
      const currentRecord = await this.getDNSRecord(domain, type);

      if (!currentRecord) {
        console.warn(`⚠️ DNS record not found: ${domain}`);
        return { deleted: false, reason: 'Record not found' };
      }

      const params = {
        HostedZoneId: this.hostedZoneId,
        ChangeBatch: {
          Comment: `Delete DNS record: ${domain}`,
          Changes: [{
            Action: 'DELETE',
            ResourceRecordSet: {
              Name: domain,
              Type: type,
              TTL: currentRecord.TTL,
              ResourceRecords: currentRecord.ResourceRecords
            }
          }]
        }
      };

      const result = await this.route53.changeResourceRecordSets(params).promise();

      console.log(`✅ DNS record deleted: ${domain}`);

      return {
        deleted: true,
        changeId: result.ChangeInfo.Id,
        domain,
        type
      };

    } catch (error) {
      console.error('❌ DNS record deletion failed:', error);
      throw new Error(`DNS record deletion failed: ${error.message}`);
    }
  }

  /**
   * Get DNS record from Route 53
   */
  async getDNSRecord(domain, type) {
    const params = {
      HostedZoneId: this.hostedZoneId,
      StartRecordName: domain,
      StartRecordType: type,
      MaxItems: '1'
    };

    try {
      const result = await this.route53.listResourceRecordSets(params).promise();

      const record = result.ResourceRecordSets.find(
        r => r.Name === `${domain}.` && r.Type === type
      );

      return record || null;

    } catch (error) {
      console.error('❌ Error getting DNS record:', error);
      return null;
    }
  }

  /**
   * Generate unique subdomain
   */
  async generateUniqueSubdomain(companyName) {
    const baseSubdomain = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 15);

    let subdomain = baseSubdomain;
    let counter = 0;
    let isUnique = false;

    while (!isUnique && counter < 100) {
      const existing = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);

      if (existing.length === 0) {
        isUnique = true;
      } else {
        counter++;
        subdomain = `${baseSubdomain}${counter}`;
      }
    }

    if (!isUnique) {
      // Fallback to UUID-based subdomain
      subdomain = `tenant-${crypto.randomBytes(4).toString('hex')}`;
    }

    return subdomain;
  }

  /**
   * Generate verification token
   */
  generateVerificationToken() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Validate domain format
   */
  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return domainRegex.test(domain);
  }

  /**
   * Get verification data (placeholder - implement based on your storage)
   */
  async getVerificationData(tenantId, customDomain) {
    // This should retrieve from your verification_requests table
    // For now, return a placeholder structure
    return {
      tenantId,
      customDomain,
      verificationToken: 'placeholder-token',
      verificationDomain: `_verify.${customDomain}`,
      instructions: [
        'Add TXT record to your DNS',
        'Wait for propagation (may take up to 24 hours)',
        'Call verification endpoint'
      ]
    };
  }

  /**
   * Get DNS change status
   */
  async getChangeStatus(changeId) {
    try {
      const params = {
        Id: changeId
      };

      const result = await this.route53.getChange(params).promise();

      return {
        changeId,
        status: result.ChangeInfo.Status,
        submittedAt: result.ChangeInfo.SubmittedAt,
        comment: result.ChangeInfo.Comment || ''
      };

    } catch (error) {
      console.error('❌ Error getting change status:', error);
      throw new Error(`Failed to get change status: ${error.message}`);
    }
  }

  /**
   * Health check for DNS service
   */
  async healthCheck() {
    try {
      // Ensure AWS is initialized
      if (!this.route53) {
        await this.initializeAWS();
      }

      // If AWS SDK is not available, return mock health status
      if (!this.route53) {
        return {
          status: 'healthy',
          service: 'Mock DNS Service',
          hostedZoneId: this.hostedZoneId || 'mock-zone-id',
          baseDomain: this.baseDomain,
          serverTarget: this.serverTarget,
          zonesAvailable: 1,
          isMock: true,
          timestamp: new Date().toISOString()
        };
      }

      // Test connectivity by listing hosted zones
      const zones = await this.route53.listHostedZones({ MaxItems: '1' }).promise();

      return {
        status: 'healthy',
        service: 'Route53',
        hostedZoneId: this.hostedZoneId,
        baseDomain: this.baseDomain,
        serverTarget: this.serverTarget,
        zonesAvailable: zones.HostedZones?.length || 0,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'Route53',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get tenant domains
   */
  async getTenantDomains(tenantId) {
    const tenant = await db
      .select({
        tenantId: tenants.tenantId,
        companyName: tenants.companyName,
        subdomain: tenants.subdomain,
        customDomain: tenants.customDomain
      })
      .from(tenants)
      .where(eq(tenants.tenantId, tenantId))
      .limit(1);

    if (tenant.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenantData = tenant[0];

    return {
      tenantId: tenantData.tenantId,
      companyName: tenantData.companyName,
      subdomain: tenantData.subdomain
        ? `${tenantData.subdomain}.${this.baseDomain}`
        : null,
      customDomain: tenantData.customDomain,
      serverTarget: this.serverTarget,
      baseDomain: this.baseDomain
    };
  }
}

export default new DNSManagementService();
