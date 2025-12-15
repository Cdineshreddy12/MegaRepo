import DNSManagementService from '../services/dns-management-service.js';
import { db } from '../db/index.js';
import { tenants } from '../db/schema/index.js';
import { eq } from 'drizzle-orm';

export default async function dnsManagementRoutes(fastify, options) {

  // Create subdomain for tenant
  fastify.post('/api/dns/subdomains', {
    schema: {
      body: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' },
          customTarget: { type: 'string', description: 'Optional custom DNS target' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                subdomain: { type: 'string' },
                fullDomain: { type: 'string' },
                target: { type: 'string' },
                dnsChangeId: { type: 'string' },
                tenantId: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, customTarget } = request.body;

      console.log(`🏢 Creating subdomain for tenant: ${tenantId}`);

      const result = await DNSManagementService.createTenantSubdomain(tenantId, customTarget);

      console.log(`✅ Subdomain created successfully: ${result.fullDomain}`);

      return reply.send({
        success: true,
        message: 'Subdomain created successfully',
        data: result
      });

    } catch (error) {
      console.error('❌ Subdomain creation failed:', error);

      if (error.message.includes('already has a subdomain')) {
        return reply.code(409).send({
          success: false,
          error: 'Subdomain exists',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Subdomain creation failed',
        message: error.message
      });
    }
  });

  // Setup custom domain (Step 1: Create verification)
  fastify.post('/api/dns/custom-domains', {
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'customDomain'],
        properties: {
          tenantId: { type: 'string' },
          customDomain: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                customDomain: { type: 'string' },
                verificationDomain: { type: 'string' },
                verificationToken: { type: 'string' },
                instructions: { type: 'array', items: { type: 'string' } }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, customDomain } = request.body;

      console.log(`🔧 Setting up custom domain: ${customDomain} for tenant: ${tenantId}`);

      const result = await DNSManagementService.setupCustomDomain(tenantId, customDomain);

      return reply.send({
        success: true,
        status: result.status,
        message: 'Custom domain setup initiated. Please add the verification TXT record.',
        data: {
          customDomain: result.customDomain,
          verificationDomain: result.verificationDomain,
          verificationToken: result.verificationToken,
          instructions: result.instructions
        }
      });

    } catch (error) {
      console.error('❌ Custom domain setup failed:', error);

      if (error.message.includes('Invalid domain format')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid domain',
          message: error.message
        });
      }

      if (error.message.includes('already assigned')) {
        return reply.code(409).send({
          success: false,
          error: 'Domain in use',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Custom domain setup failed',
        message: error.message
      });
    }
  });

  // Verify custom domain (Step 2: Verify ownership)
  fastify.post('/api/dns/verify-domain', {
    schema: {
      body: {
        type: 'object',
        required: ['tenantId', 'customDomain'],
        properties: {
          tenantId: { type: 'string' },
          customDomain: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            verified: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                customDomain: { type: 'string' },
                cnameChangeId: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId, customDomain } = request.body;

      console.log(`🔍 Verifying domain ownership: ${customDomain} for tenant: ${tenantId}`);

      const result = await DNSManagementService.verifyDomainOwnership(tenantId, customDomain);

      if (!result.verified) {
        return reply.send({
          success: false,
          verified: false,
          message: result.message,
          data: {
            instructions: result.instructions
          }
        });
      }

      return reply.send({
        success: true,
        verified: true,
        message: result.message,
        data: {
          customDomain: result.customDomain,
          cnameChangeId: result.cnameChangeId
        }
      });

    } catch (error) {
      console.error('❌ Domain verification failed:', error);

      if (error.message.includes('No verification request found')) {
        return reply.code(404).send({
          success: false,
          error: 'Verification not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Domain verification failed',
        message: error.message
      });
    }
  });

  // Get tenant domains
  fastify.get('/api/dns/tenants/:tenantId/domains', {
    schema: {
      params: {
        type: 'object',
        required: ['tenantId'],
        properties: {
          tenantId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                tenantId: { type: 'string' },
                companyName: { type: 'string' },
                subdomain: { type: 'string' },
                customDomain: { type: 'string' },
                serverTarget: { type: 'string' },
                baseDomain: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { tenantId } = request.params;

      const domains = await DNSManagementService.getTenantDomains(tenantId);

      return reply.send({
        success: true,
        data: domains
      });

    } catch (error) {
      console.error('❌ Error fetching tenant domains:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found',
          message: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch tenant domains',
        message: error.message
      });
    }
  });

  // Check subdomain availability
  fastify.post('/api/dns/check-subdomain', {
    schema: {
      body: {
        type: 'object',
        required: ['subdomain'],
        properties: {
          subdomain: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            available: { type: 'boolean' },
            subdomain: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { subdomain } = request.body;

      // Clean and validate subdomain
      const cleanSubdomain = subdomain.toLowerCase().trim();

      if (!/^[a-z0-9-]+$/.test(cleanSubdomain)) {
        return reply.send({
          success: false,
          available: false,
          subdomain: cleanSubdomain,
          message: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.'
        });
      }

      // Check if subdomain exists
      const existing = await db
        .select({ tenantId: tenants.tenantId })
        .from(tenants)
        .where(eq(tenants.subdomain, cleanSubdomain))
        .limit(1);

      const available = existing.length === 0;

      return reply.send({
        success: true,
        available,
        subdomain: cleanSubdomain,
        message: available ? 'Subdomain is available' : 'Subdomain is already taken'
      });

    } catch (error) {
      console.error('❌ Subdomain check failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Subdomain check failed',
        message: error.message
      });
    }
  });

  // Validate custom domain format
  fastify.post('/api/dns/validate-domain', {
    schema: {
      body: {
        type: 'object',
        required: ['domain'],
        properties: {
          domain: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            valid: { type: 'boolean' },
            domain: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { domain } = request.body;

      const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      const isValid = domainRegex.test(domain);

      // Additional checks
      const parts = domain.split('.');
      const hasValidTLD = parts.length >= 2 && parts[parts.length - 1].length >= 2;
      const noConsecutiveHyphens = !domain.includes('--');
      const noLeadingTrailingHyphens = !domain.startsWith('-') && !domain.endsWith('-');

      const finalValid = isValid && hasValidTLD && noConsecutiveHyphens && noLeadingTrailingHyphens;

      return reply.send({
        success: true,
        valid: finalValid,
        domain,
        message: finalValid ? 'Domain format is valid' : 'Invalid domain format'
      });

    } catch (error) {
      console.error('❌ Domain validation failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Domain validation failed',
        message: error.message
      });
    }
  });

  // Get DNS change status
  fastify.get('/api/dns/changes/:changeId', {
    schema: {
      params: {
        type: 'object',
        required: ['changeId'],
        properties: {
          changeId: { type: 'string' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: {
              type: 'object',
              properties: {
                changeId: { type: 'string' },
                status: { type: 'string' },
                submittedAt: { type: 'string' },
                comment: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { changeId } = request.params;

      const changeStatus = await DNSManagementService.getChangeStatus(changeId);

      return reply.send({
        success: true,
        data: changeStatus
      });

    } catch (error) {
      console.error('❌ Error fetching DNS change status:', error);
      return reply.code(500).send({
        success: false,
        error: 'Failed to fetch DNS change status',
        message: error.message
      });
    }
  });

  // DNS service health check
  fastify.get('/api/dns/health', async (request, reply) => {
    try {
      const health = await DNSManagementService.healthCheck();

      return reply.send({
        success: true,
        ...health
      });

    } catch (error) {
      console.error('❌ DNS health check failed:', error);
      return reply.code(500).send({
        success: false,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Delete subdomain
  fastify.delete('/api/dns/subdomains/:tenantId', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log(`🗑️ Deleting subdomain for tenant: ${tenantId}`);

      // Get tenant details
      const tenant = await db
        .select({
          tenantId: tenants.tenantId,
          subdomain: tenants.subdomain
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (tenant.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found'
        });
      }

      if (!tenant[0].subdomain) {
        return reply.code(400).send({
          success: false,
          error: 'No subdomain to delete'
        });
      }

      const fullDomain = `${tenant[0].subdomain}.${DNSManagementService.baseDomain}`;

      // Delete DNS record
      const dnsResult = await DNSManagementService.deleteDNSRecord(
        fullDomain,
        DNSManagementService.recordTypes.SUBDOMAIN
      );

      // Update tenant record
      await db.update(tenants)
        .set({
          subdomain: null,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      console.log(`✅ Subdomain deleted: ${fullDomain}`);

      return reply.send({
        success: true,
        message: 'Subdomain deleted successfully',
        data: {
          deletedDomain: fullDomain,
          dnsDeleted: dnsResult.deleted
        }
      });

    } catch (error) {
      console.error('❌ Subdomain deletion failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Subdomain deletion failed',
        message: error.message
      });
    }
  });

  // Delete custom domain
  fastify.delete('/api/dns/custom-domains/:tenantId', async (request, reply) => {
    try {
      const { tenantId } = request.params;

      console.log(`🗑️ Deleting custom domain for tenant: ${tenantId}`);

      // Get tenant details
      const tenant = await db
        .select({
          tenantId: tenants.tenantId,
          customDomain: tenants.customDomain
        })
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (tenant.length === 0) {
        return reply.code(404).send({
          success: false,
          error: 'Tenant not found'
        });
      }

      if (!tenant[0].customDomain) {
        return reply.code(400).send({
          success: false,
          error: 'No custom domain to delete'
        });
      }

      // Delete DNS record
      const dnsResult = await DNSManagementService.deleteDNSRecord(
        tenant[0].customDomain,
        'CNAME'
      );

      // Update tenant record
      await db.update(tenants)
        .set({
          customDomain: null,
          updatedAt: new Date()
        })
        .where(eq(tenants.tenantId, tenantId));

      console.log(`✅ Custom domain deleted: ${tenant[0].customDomain}`);

      return reply.send({
        success: true,
        message: 'Custom domain deleted successfully',
        data: {
          deletedDomain: tenant[0].customDomain,
          dnsDeleted: dnsResult.deleted
        }
      });

    } catch (error) {
      console.error('❌ Custom domain deletion failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Custom domain deletion failed',
        message: error.message
      });
    }
  });
}
