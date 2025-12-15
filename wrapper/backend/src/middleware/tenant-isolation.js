// Tenant Isolation Middleware for Drizzle ORM
import { eq, and } from 'drizzle-orm';
import { tenants } from '../db/schema/index.js';

export class TenantIsolationService {
  constructor(db) {
    this.db = db;
  }

  // Resolve tenant from subdomain
  async resolveTenant(subdomain) {
    try {
      const tenant = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.subdomain, subdomain))
        .limit(1);

      return tenant[0] || null;
    } catch (error) {
      console.error('Error resolving tenant:', error);
      return null;
    }
  }

  // Resolve tenant from custom domain
  async resolveTenantByDomain(domain) {
    try {
      // First check custom domain field
      let tenant = await this.db
        .select()
        .from(tenants)
        .where(eq(tenants.customDomain, domain))
        .limit(1);

      if (tenant[0]) return tenant[0];

      // If not found, check if domain matches subdomain pattern
      const subdomainMatch = domain.match(/^(.+)\.zopkit\.com$/);
      if (subdomainMatch) {
        return this.resolveTenant(subdomainMatch[1]);
      }

      return null;
    } catch (error) {
      console.error('Error resolving tenant by domain:', error);
      return null;
    }
  }

  // Create isolated query with multiple levels
  createIsolatedQuery(table, context, isolationLevel = 'tenant') {
    const { tenantId, organizationId, locationId, userId } = context;

    let conditions = [];

    // Always include tenant isolation
    conditions.push(eq(table.tenantId, tenantId));

    // Add additional isolation based on level
    switch (isolationLevel) {
      case 'organization':
        if (organizationId && table.organizationId) {
          conditions.push(eq(table.organizationId, organizationId));
        }
        break;

      case 'location':
        if (organizationId && table.organizationId) {
          conditions.push(eq(table.organizationId, organizationId));
        }
        if (locationId && table.locationId) {
          conditions.push(eq(table.locationId, locationId));
        }
        break;

      case 'user':
        if (organizationId && table.organizationId) {
          conditions.push(eq(table.organizationId, organizationId));
        }
        if (locationId && table.locationId) {
          conditions.push(eq(table.locationId, locationId));
        }
        if (userId && table.userId) {
          conditions.push(eq(table.userId, userId));
        }
        break;

      default: // tenant level
        break;
    }

    return {
      where: (additionalConditions) => and(...conditions, additionalConditions),
      findAll: (additionalConditions = {}) => this.db.select().from(table).where(and(...conditions, additionalConditions)),
      findOne: (additionalConditions = {}) => this.db.select().from(table).where(and(...conditions, additionalConditions)).limit(1),
      create: (data) => this.db.insert(table).values({ ...data, tenantId }),
      update: (additionalConditions, data) => this.db.update(table).set(data).where(and(...conditions, additionalConditions)),
      delete: (additionalConditions) => this.db.delete(table).where(and(...conditions, additionalConditions)),
      count: (additionalConditions = {}) => this.db.$count(table, and(...conditions, additionalConditions))
    };
  }

  // Validate resource ownership
  async validateResourceOwnership(resourceTable, resourceId, context, level = 'tenant') {
    try {
      const resource = await this.db
        .select()
        .from(resourceTable)
        .where(eq(resourceTable.id, resourceId))
        .limit(1);

      if (!resource[0]) {
        return { valid: false, reason: 'Resource not found' };
      }

      const resourceData = resource[0];
      const { tenantId, organizationId, locationId, userId } = context;

      // Check tenant ownership
      if (resourceData.tenantId !== tenantId) {
        return { valid: false, reason: 'Resource belongs to different tenant' };
      }

      // Check additional ownership based on level
      if (level === 'organization' && organizationId) {
        if (resourceData.organizationId && resourceData.organizationId !== organizationId) {
          return { valid: false, reason: 'Resource belongs to different organization' };
        }
      }

      if (level === 'location' && locationId) {
        if (resourceData.locationId && resourceData.locationId !== locationId) {
          return { valid: false, reason: 'Resource belongs to different location' };
        }
      }

      if (level === 'user' && userId) {
        if (resourceData.userId && resourceData.userId !== userId) {
          return { valid: false, reason: 'Resource belongs to different user' };
        }
      }

      return { valid: true, resource: resourceData };
    } catch (error) {
      console.error('Error validating resource ownership:', error);
      return { valid: false, reason: 'Validation failed', error };
    }
  }

  // Create tenant context for queries
  createTenantFilter(tenantId, additionalFilters = {}) {
    return {
      tenantId: eq(tenants.tenantId, tenantId),
      ...additionalFilters
    };
  }

  // Enhanced query builder with tenant isolation
  createTenantQuery(table, tenantId, additionalFilters = {}) {
    const baseFilter = eq(table.tenantId, tenantId);
    const filters = additionalFilters;

    return {
      where: (conditions) => and(baseFilter, conditions),
      findAll: (conditions = {}) => this.db.select().from(table).where(and(baseFilter, conditions)),
      findOne: (conditions = {}) => this.db.select().from(table).where(and(baseFilter, conditions)).limit(1),
      create: (data) => this.db.insert(table).values({ ...data, tenantId }),
      update: (conditions, data) => this.db.update(table).set(data).where(and(baseFilter, conditions)),
      delete: (conditions) => this.db.delete(table).where(and(baseFilter, conditions))
    };
  }
}

// Express middleware for tenant isolation
export function tenantIsolationMiddleware(db) {
  const tenantService = new TenantIsolationService(db);

  return async (req, res, next) => {
    try {
      // Extract subdomain from Nginx headers
      const subdomain = req.headers['x-subdomain'] || req.headers['x-tenant'];
      const tenantDomain = req.headers['x-tenant-domain'];

      if (!subdomain && !tenantDomain) {
        return res.status(400).json({
          error: 'Tenant identification missing',
          message: 'Request must include subdomain or tenant domain'
        });
      }

      // Resolve tenant
      let tenant;
      if (subdomain) {
        tenant = await tenantService.resolveTenant(subdomain);
      } else if (tenantDomain) {
        // Handle custom domains (you can implement this logic)
        tenant = await tenantService.resolveTenantByDomain(tenantDomain);
      }

      if (!tenant) {
        return res.status(404).json({
          error: 'Tenant not found',
          message: `No tenant found for subdomain: ${subdomain || tenantDomain}`
        });
      }

      // Set tenant context
      req.tenant = tenant;
      req.tenantId = tenant.id || tenant.tenantId;
      req.tenantService = tenantService;

      // Add tenant-aware query methods
      req.tenantQuery = (table) => tenantService.createTenantQuery(table, req.tenantId);

      next();

    } catch (error) {
      console.error('Tenant isolation middleware error:', error);
      res.status(500).json({
        error: 'Tenant isolation failed',
        message: 'Failed to establish tenant context'
      });
    }
  };
}

// Multi-level isolation middleware (Tenant -> Organization -> Location -> User)
export function multiLevelIsolationMiddleware(db) {
  const tenantService = new TenantIsolationService(db);

  return async (req, res, next) => {
    try {
      // First establish tenant context
      const subdomain = req.headers['x-subdomain'] || req.headers['x-tenant'];
      const tenantDomain = req.headers['x-tenant-domain'];

      if (!subdomain && !tenantDomain) {
        return res.status(400).json({ error: 'Tenant identification missing' });
      }

      // Resolve tenant
      let tenant;
      if (subdomain) {
        tenant = await tenantService.resolveTenant(subdomain);
      } else {
        tenant = await tenantService.resolveTenantByDomain(tenantDomain);
      }

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      // Set tenant context
      req.tenant = tenant;
      req.tenantId = tenant.id || tenant.tenantId;

      // Extract additional context from request
      const orgId = req.headers['x-organization-id'] || req.params.organizationId;
      const locationId = req.headers['x-location-id'] || req.params.locationId;
      const userId = req.user?.id || req.headers['x-user-id'];

      // Build hierarchical context
      req.isolationContext = {
        tenantId: req.tenantId,
        organizationId: orgId,
        locationId: locationId,
        userId: userId
      };

      // Create context-aware query builder
      req.isolatedQuery = (table, level = 'tenant') => {
        return tenantService.createIsolatedQuery(table, req.isolationContext, level);
      };

      next();

    } catch (error) {
      console.error('Multi-level isolation middleware error:', error);
      res.status(500).json({ error: 'Isolation context failed' });
    }
  };
}
