/**
 * Validation Middleware - Enhanced input validation for API requests
 * Provides comprehensive validation for organizations and locations
 */

import { db } from '../db/index.js';
import { tenants, entities, tenantUsers } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';

// GSTIN validation regex
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (Indian format)
const PHONE_REGEX = /^(\+91|91|0)?[6-9]\d{9}$/;

/**
 * Validate GSTIN format
 */
export function validateGSTIN(gstin) {
  if (!gstin) return { valid: true, message: 'GSTIN is optional' };

  if (!GSTIN_REGEX.test(gstin)) {
    return {
      valid: false,
      message: 'Invalid GSTIN format. Must be 15 characters: 2 digits, 5 letters, 4 digits, 1 letter, 1 digit, 1 letter, 1 digit'
    };
  }

  return { valid: true, message: 'Valid GSTIN' };
}

/**
 * Validate email format
 */
export function validateEmail(email) {
  if (!email) return { valid: true, message: 'Email is optional' };

  if (!EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      message: 'Invalid email format'
    };
  }

  return { valid: true, message: 'Valid email' };
}

/**
 * Validate phone number
 */
export function validatePhone(phone) {
  if (!phone) return { valid: true, message: 'Phone is optional' };

  if (!PHONE_REGEX.test(phone)) {
    return {
      valid: false,
      message: 'Invalid phone number format. Must be 10 digits (Indian format supported)'
    };
  }

  return { valid: true, message: 'Valid phone number' };
}

/**
 * Validate organization name uniqueness within tenant
 */
export async function validateOrganizationNameUniqueness(name, tenantId, excludeOrgId = null) {
  if (!name || !tenantId) return { valid: true, message: 'Name and tenant ID required for uniqueness check' };

  const existingOrg = await db
    .select()
    .from(entities)
    .where(and(
      eq(entities.entityName, name.trim()),
      eq(entities.tenantId, tenantId),
      eq(entities.entityType, 'organization'),
      excludeOrgId ? `entities.entity_id != '${excludeOrgId}'` : undefined
    ))
    .limit(1);

  if (existingOrg.length > 0) {
    return {
      valid: false,
      message: 'Organization name already exists in this tenant'
    };
  }

  return { valid: true, message: 'Organization name is unique' };
}

/**
 * Validate tenant exists
 */
export async function validateTenantExists(tenantId) {
  if (!tenantId) {
    return { valid: false, message: 'Tenant ID is required' };
  }

  const tenant = await db
    .select()
    .from(tenants)
    .where(eq(tenants.tenantId, tenantId))
    .limit(1);

  if (tenant.length === 0) {
    return { valid: false, message: 'Tenant not found' };
  }

  return { valid: true, message: 'Tenant exists' };
}

/**
 * Validate organization exists
 */
export async function validateOrganizationExists(organizationId) {
  if (!organizationId) {
    return { valid: false, message: 'Organization ID is required' };
  }

  const organization = await db
    .select()
    .from(entities)
    .where(and(
      eq(entities.entityId, organizationId),
      eq(entities.entityType, 'organization')
    ))
    .limit(1);

  if (organization.length === 0) {
    return { valid: false, message: 'Organization not found' };
  }

  return { valid: true, message: 'Organization exists' };
}

/**
 * Validate user exists
 */
export async function validateUserExists(userId) {
  if (!userId) {
    return { valid: false, message: 'User ID is required' };
  }

  const user = await db
    .select()
    .from(tenantUsers)
    .where(eq(tenantUsers.userId, userId))
    .limit(1);

  if (user.length === 0) {
    return { valid: false, message: 'User not found' };
  }

  return { valid: true, message: 'User exists' };
}

/**
 * Validate organization hierarchy (prevent circular references)
 */
export async function validateHierarchyIntegrity(parentOrgId, childOrgId = null) {
  if (!parentOrgId) return { valid: true, message: 'No parent organization to validate' };

  // If we're creating a new org, just validate parent exists
  if (!childOrgId) {
    return await validateOrganizationExists(parentOrgId);
  }

  // For existing org moves, check for circular references
  const parentOrg = await db
    .select({ hierarchyPath: entities.hierarchyPath })
    .from(entities)
    .where(and(
      eq(entities.entityId, parentOrgId),
      eq(entities.entityType, 'organization')
    ))
    .limit(1);

  if (parentOrg.length === 0) {
    return { valid: false, message: 'Parent organization not found' };
  }

  // Check if moving to a descendant would create a circular reference
  if (parentOrg[0].hierarchyPath.includes(childOrgId)) {
    return {
      valid: false,
      message: 'Cannot move organization to its own descendant (circular reference)'
    };
  }

  return { valid: true, message: 'Hierarchy integrity validated' };
}

/**
 * Validate location data
 */
export function validateLocationData(data) {
  const { name, address, city, country } = data;

  if (!name || name.trim().length < 2) {
    return { valid: false, message: 'Location name must be at least 2 characters' };
  }

  if (!address || address.trim().length < 5) {
    return { valid: false, message: 'Address must be at least 5 characters' };
  }

  if (!city || city.trim().length < 2) {
    return { valid: false, message: 'City must be at least 2 characters' };
  }

  if (!country || country.trim().length < 2) {
    return { valid: false, message: 'Country must be at least 2 characters' };
  }

  return { valid: true, message: 'Location data is valid' };
}

/**
 * Comprehensive organization validation
 */
export async function validateOrganizationData(data, isUpdate = false, existingOrgId = null) {
  const { name, organizationName, entityName, description, gstin, parentTenantId, parentOrganizationId, parentEntityId } = data;
  const orgName = name || organizationName || entityName; // Handle both field names
  const tenantId = parentTenantId; // Use the tenant ID sent by frontend
  const parentOrgId = parentOrganizationId || parentEntityId; // Handle both parent field names
  const errors = [];

  // Required field validation - only check if name is provided during update
  if (!isUpdate && (!orgName || orgName.trim().length < 2)) {
    errors.push('Organization name must be at least 2 characters');
  }

  // For updates, only validate name if it's provided
  if (isUpdate && orgName !== undefined && orgName.trim().length < 2) {
    errors.push('Organization name must be at least 2 characters');
  }

  // For sub-organizations, parent tenant ID is required
  if (!isUpdate && !tenantId && parentOrgId) {
    errors.push('Parent tenant ID is required for new organizations');
  }

  // Length validations
  if (orgName && orgName.length > 255) {
    errors.push('Organization name cannot exceed 255 characters');
  }

  if (description && description.length > 1000) {
    errors.push('Description cannot exceed 1000 characters');
  }

  // GSTIN validation
  if (gstin) {
    const gstinValidation = validateGSTIN(gstin);
    if (!gstinValidation.valid) {
      errors.push(gstinValidation.message);
    }
  }

  // Business logic validations
  if (orgName && tenantId) {
    const uniquenessCheck = await validateOrganizationNameUniqueness(orgName, tenantId, existingOrgId);
    if (!uniquenessCheck.valid) {
      errors.push(uniquenessCheck.message);
    }
  }

  // Parent organization validation
  if (parentOrgId) {
    const parentValidation = await validateOrganizationExists(parentOrgId);
    if (!parentValidation.valid) {
      errors.push(parentValidation.message);
    }

    const hierarchyValidation = await validateHierarchyIntegrity(parentOrgId, existingOrgId);
    if (!hierarchyValidation.valid) {
      errors.push(hierarchyValidation.message);
    }
  }

  // Tenant validation (only validate tenant if provided)
  if (tenantId) {
    const tenantValidation = await validateTenantExists(tenantId);
    if (!tenantValidation.valid) {
      errors.push(tenantValidation.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    message: errors.length === 0 ? 'All validations passed' : `Validation failed: ${errors.join(', ')}`
  };
}

/**
 * Validation middleware for organization creation
 */
export async function validateOrganizationCreation(request, reply) {
  const validation = await validateOrganizationData(request.body);

  if (!validation.valid) {
    return reply.code(400).send({
      success: false,
      error: 'Validation failed',
      message: validation.message,
      errors: validation.errors
    });
  }
}

/**
 * Validation middleware for organization updates
 */
export async function validateOrganizationUpdate(request, reply) {
  const { organizationId } = request.params;
  const validation = await validateOrganizationData(request.body, true, organizationId);

  if (!validation.valid) {
    return reply.code(400).send({
      success: false,
      error: 'Validation failed',
      message: validation.message,
      errors: validation.errors
    });
  }
}

/**
 * Validation middleware for location creation
 */
export async function validateLocationCreation(request, reply) {
  const locationValidation = validateLocationData(request.body);

  if (!locationValidation.valid) {
    return reply.code(400).send({
      success: false,
      error: 'Validation failed',
      message: locationValidation.message
    });
  }

  // Validate organization exists
  const { organizationId } = request.body;
  if (organizationId) {
    const orgValidation = await validateOrganizationExists(organizationId);
    if (!orgValidation.valid) {
      return reply.code(400).send({
        success: false,
        error: 'Validation failed',
        message: orgValidation.message
      });
    }
  }
}

/**
 * Sanitize input data
 */
export function sanitizeInput(data) {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Trim whitespace and escape HTML
      sanitized[key] = value.trim().replace(/[<>]/g, '');
    } else if (value !== null && value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Middleware to sanitize request input
 */
export function sanitizeInputMiddleware() {
  return async (request, reply) => {
    try {
      // Sanitize request body if it exists
      if (request.body && typeof request.body === 'object') {
        request.body = sanitizeInput(request.body);
      }

      // Sanitize query parameters
      if (request.query && typeof request.query === 'object') {
        request.query = sanitizeInput(request.query);
      }

      // Sanitize route parameters
      if (request.params && typeof request.params === 'object') {
        request.params = sanitizeInput(request.params);
      }
    } catch (error) {
      console.error('❌ Input sanitization error:', error);
      // Don't fail the request for sanitization errors, just log them
    }
  };
}
