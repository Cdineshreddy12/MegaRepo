import { db } from '../db/index.js';
import { tenants } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

class DomainVerificationService {

  constructor() {
    this.serverTarget = process.env.SERVER_TARGET || process.env.BASE_DOMAIN;
    this.verificationTimeout = 30000; // 30 seconds
    this.maxRetries = 3;
  }

  /**
   * Verify if a domain is pointing to our server
   */
  async verifyDomainPointing(domain, expectedTarget = null) {
    const target = expectedTarget || this.serverTarget;

    console.log(`🔍 Verifying if ${domain} points to ${target}`);

    try {
      const dns = require('dns').promises;
      const http = require('http');
      const https = require('https');

      // Step 1: DNS lookup
      console.log(`📡 Performing DNS lookup for ${domain}...`);
      let addresses;

      try {
        addresses = await dns.lookup(domain);
        console.log(`✅ DNS lookup successful: ${domain} → ${addresses.join(', ')}`);
      } catch (dnsError) {
        return {
          success: false,
          verified: false,
          step: 'dns_lookup',
          error: 'DNS lookup failed',
          message: `Unable to resolve domain ${domain}: ${dnsError.message}`,
          details: {
            domain,
            target,
            dnsError: dnsError.message
          }
        };
      }

      // Step 2: Check if resolved IP matches our server
      const resolvedIPs = addresses.map(addr => addr.address);
      const expectedIPs = await this.getServerIPs(target);

      const hasMatchingIP = resolvedIPs.some(ip => expectedIPs.includes(ip));

      if (!hasMatchingIP) {
        return {
          success: false,
          verified: false,
          step: 'ip_matching',
          error: 'IP mismatch',
          message: `Domain ${domain} points to ${resolvedIPs.join(', ')} but should point to ${expectedIPs.join(', ')}`,
          details: {
            domain,
            target,
            resolvedIPs,
            expectedIPs
          }
        };
      }

      console.log(`✅ IP verification successful: ${domain} → ${resolvedIPs.join(', ')}`);

      // Step 3: HTTP connectivity test (optional)
      const httpTest = await this.testHTTPConnectivity(domain);

      if (!httpTest.success) {
        console.warn(`⚠️ HTTP connectivity test failed for ${domain}: ${httpTest.message}`);
      }

      return {
        success: true,
        verified: true,
        domain,
        target,
        resolvedIPs,
        expectedIPs,
        httpTest: httpTest.success,
        message: `Domain ${domain} is correctly pointing to ${target}`,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error(`❌ Domain verification failed for ${domain}:`, error);
      return {
        success: false,
        verified: false,
        error: 'verification_failed',
        message: `Domain verification failed: ${error.message}`,
        details: {
          domain,
          target,
          error: error.message
        }
      };
    }
  }

  /**
   * Get server IP addresses
   */
  async getServerIPs(domain) {
    try {
      const dns = require('dns').promises;
      const addresses = await dns.lookup(domain);
      return addresses.map(addr => addr.address);
    } catch (error) {
      console.error(`❌ Failed to get IPs for ${domain}:`, error);
      // Return common server IPs or empty array
      return [];
    }
  }

  /**
   * Test HTTP connectivity to domain
   */
  async testHTTPConnectivity(domain) {
    return new Promise((resolve) => {
      const httpModule = domain.startsWith('https://') ? require('https') : require('http');
      const cleanDomain = domain.replace(/^https?:\/\//, '');

      const options = {
        hostname: cleanDomain,
        port: domain.startsWith('https://') ? 443 : 80,
        path: '/health',
        method: 'GET',
        timeout: 5000
      };

      const req = httpModule.request(options, (res) => {
        resolve({
          success: true,
          statusCode: res.statusCode,
          message: `HTTP ${res.statusCode} response received`
        });
      });

      req.on('error', (error) => {
        resolve({
          success: false,
          error: error.code,
          message: `HTTP request failed: ${error.message}`
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          success: false,
          error: 'timeout',
          message: 'HTTP request timed out'
        });
      });

      req.setTimeout(5000);
      req.end();
    });
  }

  /**
   * Verify tenant domains (both subdomain and custom domain)
   */
  async verifyTenantDomains(tenantId) {
    try {
      const tenant = await db
        .select({
          tenantId: tenants.tenantId,
          organizationName: tenants.organizationName,
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
      const results = {
        tenantId,
        organizationName: tenantData.organizationName,
        timestamp: new Date().toISOString(),
        domains: {}
      };

      // Verify subdomain
      if (tenantData.subdomain) {
        const subdomain = `${tenantData.subdomain}.${process.env.BASE_DOMAIN}`;
        results.domains.subdomain = await this.verifyDomainPointing(subdomain);
      }

      // Verify custom domain
      if (tenantData.customDomain) {
        results.domains.customDomain = await this.verifyDomainPointing(tenantData.customDomain);
      }

      // Overall status
      const subdomainVerified = results.domains.subdomain?.verified || false;
      const customDomainVerified = results.domains.customDomain?.verified || false;

      results.overallStatus = (subdomainVerified || customDomainVerified) ? 'verified' : 'unverified';
      results.hasAnyVerified = subdomainVerified || customDomainVerified;

      return results;

    } catch (error) {
      console.error('❌ Tenant domain verification failed:', error);
      throw new Error(`Tenant domain verification failed: ${error.message}`);
    }
  }

  /**
   * Bulk verify domains for multiple tenants
   */
  async bulkVerifyDomains(tenantIds) {
    console.log(`🔍 Starting bulk verification for ${tenantIds.length} tenants`);

    const results = {
      total: tenantIds.length,
      verified: 0,
      unverified: 0,
      errors: 0,
      details: [],
      timestamp: new Date().toISOString()
    };

    for (const tenantId of tenantIds) {
      try {
        const verification = await this.verifyTenantDomains(tenantId);

        if (verification.hasAnyVerified) {
          results.verified++;
        } else {
          results.unverified++;
        }

        results.details.push({
          tenantId,
          status: verification.overallStatus,
          domains: verification.domains
        });

      } catch (error) {
        results.errors++;
        results.details.push({
          tenantId,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`✅ Bulk verification completed: ${results.verified}/${results.total} verified`);

    return results;
  }

  /**
   * Check domain health status
   */
  async checkDomainHealth(domain) {
    try {
      const verification = await this.verifyDomainPointing(domain);

      const health = {
        domain,
        status: verification.verified ? 'healthy' : 'unhealthy',
        lastChecked: new Date().toISOString(),
        checks: {}
      };

      // DNS health
      health.checks.dns = {
        status: verification.step !== 'dns_lookup' ? 'passed' : 'failed',
        message: verification.verified ? 'DNS resolution successful' : verification.message
      };

      // IP matching health
      health.checks.ipMatching = {
        status: verification.step !== 'ip_matching' ? 'passed' : 'failed',
        message: verification.verified ? 'IP addresses match' : verification.message
      };

      // HTTP connectivity health
      health.checks.httpConnectivity = {
        status: verification.httpTest ? 'passed' : 'warning',
        message: verification.httpTest ? 'HTTP connection successful' : 'HTTP connection failed (may still work)'
      };

      return health;

    } catch (error) {
      return {
        domain,
        status: 'error',
        lastChecked: new Date().toISOString(),
        error: error.message,
        checks: {
          general: {
            status: 'error',
            message: error.message
          }
        }
      };
    }
  }

  /**
   * Get domain verification instructions
   */
  getVerificationInstructions(domain, target = null) {
    const serverTarget = target || this.serverTarget;

    return {
      domain,
      target: serverTarget,
      instructions: {
        type: 'CNAME',
        steps: [
          `Log in to your domain registrar or DNS provider`,
          `Navigate to DNS settings for ${domain}`,
          `Add a CNAME record:`,
          `  Name/Host: ${domain}`,
          `  Type: CNAME`,
          `  Value/Target: ${serverTarget}`,
          `  TTL: 300 (5 minutes)`,
          `Save the changes and wait for DNS propagation (5-30 minutes)`
        ],
        verificationSteps: [
          `After adding the CNAME record, click "Verify Domain"`,
          `Our system will check if ${domain} points to ${serverTarget}`,
          `If verification fails, double-check the CNAME record and wait longer`
        ],
        troubleshooting: {
          'DNS propagation taking too long': 'Wait up to 24 hours for full propagation',
          'CNAME record not saving': 'Check with your DNS provider for correct format',
          'Still not working': 'Contact our support team with your domain name'
        }
      }
    };
  }

  /**
   * Get domain setup status
   */
  async getDomainSetupStatus(tenantId) {
    try {
      const tenant = await db
        .select({
          tenantId: tenants.tenantId,
          organizationName: tenants.organizationName,
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
      const status = {
        tenantId,
        organizationName: tenantData.organizationName,
        setupComplete: false,
        domains: {},
        recommendations: []
      };

      // Check subdomain status
      if (tenantData.subdomain) {
        const subdomain = `${tenantData.subdomain}.${process.env.BASE_DOMAIN}`;
        const subdomainCheck = await this.checkDomainHealth(subdomain);

        status.domains.subdomain = {
          domain: subdomain,
          status: subdomainCheck.status,
          lastChecked: subdomainCheck.lastChecked,
          type: 'subdomain'
        };

        if (subdomainCheck.status === 'healthy') {
          status.setupComplete = true;
        } else {
          status.recommendations.push(`Subdomain ${subdomain} is not properly configured`);
        }
      } else {
        status.recommendations.push('Consider setting up a subdomain for easier access');
      }

      // Check custom domain status
      if (tenantData.customDomain) {
        const customDomainCheck = await this.checkDomainHealth(tenantData.customDomain);

        status.domains.customDomain = {
          domain: tenantData.customDomain,
          status: customDomainCheck.status,
          lastChecked: customDomainCheck.lastChecked,
          type: 'custom_domain'
        };

        if (customDomainCheck.status === 'healthy') {
          status.setupComplete = true;
        } else {
          status.recommendations.push(`Custom domain ${tenantData.customDomain} is not properly configured`);
        }
      }

      // Overall status
      status.overallStatus = status.setupComplete ? 'ready' : 'needs_attention';

      return status;

    } catch (error) {
      console.error('❌ Error getting domain setup status:', error);
      throw new Error(`Failed to get domain setup status: ${error.message}`);
    }
  }
}

export default new DomainVerificationService();
