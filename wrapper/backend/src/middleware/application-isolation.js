/**
 * Application-Level Isolation Middleware
 * Enforces data isolation across different applications in the business suite
 */

import { ApplicationDataIsolationService } from '../services/application-data-isolation-service.js';

// Create service instance for instance methods
const applicationDataIsolationService = new ApplicationDataIsolationService();

// Public routes that bypass application isolation
const PUBLIC_APPLICATION_ROUTES = [
  'GET /api/organizations/hierarchy',
  'GET /api/organizations/parent',
  'POST /api/organizations/parent',
  'POST /api/organizations/sub',
  'POST /api/organizations/bulk',
  'POST /api/locations',
  // New unified entities routes
  'GET /api/entities/hierarchy',
  'GET /api/entities/parent',
  'GET /api/entities/tenant',
  'POST /api/entities/organization',
  'POST /api/entities/location'
];

export class ApplicationIsolationMiddleware {

  /**
   * Middleware to enforce application-level data isolation
   */
  static enforceApplicationAccess(requiredApps = null) {
    return async (request, reply) => {
      try {
        // Check if this is a public route that bypasses application isolation

        // Simple check for entity routes - bypass application isolation
        if (request.url.includes('/api/entities/')) {
          return; // Skip application isolation for entity routes
        }

        const isPublicRoute = PUBLIC_APPLICATION_ROUTES.some(route => {
          const routeParts = route.split(' ');
          const method = routeParts[0];
          const path = routeParts[1];
          return request.method === method && request.url.includes(path);
        });

        if (isPublicRoute) {
          return; // Skip application isolation for public routes
        }

        const { userContext } = request;

        if (!userContext) {
          console.warn('🚨 Application isolation middleware: Missing userContext', {
            url: request.url,
            method: request.method,
            hasAuthHeader: !!request.headers?.authorization,
            hasCookies: !!request.headers?.cookie,
            cookies: Object.keys(request.cookies || {}),
            headers: {
              authorization: request.headers?.authorization ? 'present' : 'missing',
              cookie: request.headers?.cookie ? 'present' : 'missing'
            }
          });

          return reply.code(401).send({
            success: false,
            error: 'Unauthorized',
            message: 'User context not found. Please ensure authentication middleware runs before application isolation middleware.',
            debug: {
              hasAuthHeader: !!request.headers?.authorization,
              hasCookies: !!request.headers?.cookie
            }
          });
        }

        // Extract application from request headers, query params, or route
        const application = ApplicationIsolationMiddleware.extractApplicationFromRequest(request);

        if (!application) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Application context is required'
          });
        }

        // Check if specific applications are required
        if (requiredApps && !requiredApps.includes(application)) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: `Access to application '${application}' is not allowed for this endpoint`
          });
        }

        // Check if user has access to this application
        const appAccess = await applicationDataIsolationService.getUserApplicationAccess(
          userContext,
          application
        );

        if (!appAccess.hasAccess) {
          return reply.code(403).send({
            success: false,
            error: 'Forbidden',
            message: `You do not have access to the ${application} application`
          });
        }

        // Add application context to request
        request.applicationContext = {
          application: application,
          permissions: appAccess.permissions,
          accessibleOrganizations: appAccess.organizations,
          accessibleLocations: appAccess.locations,
          scope: appAccess.scope
        };

        // Add combined isolation context
        request.isolationContext = {
          tenantId: userContext.tenantId,
          application: application,
          userId: userContext.userId,
          organizations: appAccess.organizations,
          locations: appAccess.locations,
          permissions: appAccess.permissions
        };

      } catch (error) {
        console.error('❌ Application isolation middleware error:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify application access permissions'
        });
      }
    };
  }

  /**
   * Middleware for cross-application data sharing
   */
  static enforceCrossApplicationSharing() {
    return async (request, reply) => {
      try {
        const { userContext, applicationContext } = request;
        const { sourceApp, targetApp, dataType, dataId } = request.body || request.query || {};

        if (sourceApp && targetApp && sourceApp !== targetApp) {
          const canShare = await applicationDataIsolationService.canShareDataBetweenApplications(
            userContext,
            sourceApp,
            targetApp,
            dataType,
            dataId
          );

          if (!canShare) {
            return reply.code(403).send({
              success: false,
              error: 'Forbidden',
              message: `You are not authorized to share ${dataType} data from ${sourceApp} to ${targetApp}`
            });
          }

          request.crossAppSharing = {
            sourceApp,
            targetApp,
            dataType,
            dataId,
            approved: true
          };
        }

      } catch (error) {
        console.error('❌ Cross-application sharing middleware error:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to verify cross-application sharing permissions'
        });
      }
    };
  }

  /**
   * Middleware to add application-specific data filtering
   */
  static addApplicationDataFiltering() {
    return async (request, reply) => {
      try {
        const { userContext, applicationContext } = request;

        if (userContext && applicationContext) {
          // Add filtering functions to request with error handling
          request.filterByApplication = async (data, dataType = 'organization') => {
            try {
              return await applicationDataIsolationService.filterDataByApplication(
                data,
                userContext,
                applicationContext.application,
                dataType
              );
            } catch (error) {
              console.error('❌ Error in filterByApplication:', error);
              return Array.isArray(data) ? [] : null;
            }
          };

          request.canAccessInApplication = async (dataType, dataId) => {
            try {
              return await applicationDataIsolationService.canAccessDataInApplication(
                userContext,
                applicationContext.application,
                dataType,
                dataId
              );
            } catch (error) {
              console.error('❌ Error in canAccessInApplication:', error);
              return false;
            }
          };
        }

        // Always continue to next middleware
        return;
      } catch (error) {
        console.error('❌ Application data filtering middleware error:', error);
        // Don't fail the request for filtering errors, just log and continue
        return;
      }
    };
  }

  /**
   * Extract application context from request
   */
  static extractApplicationFromRequest(request) {
    // Priority order: headers > query params > route params > inferred from path

    // Check headers
    if (request.headers['x-application']) {
      return request.headers['x-application'];
    }

    // Check query parameters
    if (request.query?.application) {
      return request.query.application;
    }

    // Check route parameters
    if (request.params?.application) {
      return request.params.application;
    }

    // Infer from URL path
    const path = request.url;
    if (!path) {
      return null;
    }
    const appMatches = path.match(/^\/api\/([^\/]+)/);

    if (appMatches && appMatches[1]) {
      const inferredApp = appMatches[1];

      // Map common path segments to applications
      const pathToAppMap = {
        'crm': 'crm',
        'hr': 'hr',
        'finance': 'finance',
        'sales': 'sales',
        'marketing': 'marketing',
        'inventory': 'inventory',
        'projects': 'projects',
        'analytics': 'analytics',
        // Add more mappings as needed
        'employees': 'hr',
        'customers': 'crm',
        'financial': 'finance',
        'leads': 'sales'
      };

      return pathToAppMap[inferredApp] || inferredApp;
    }

    return null;
  }

  /**
   * Validate application exists
   */
  static validateApplicationExists() {
    return async (request, reply) => {
      try {
        // Check if this is a public route that bypasses application isolation
        const routeKey = `${request.method} ${request.url}`;
        const isPublicRoute = PUBLIC_APPLICATION_ROUTES.some(route => {
          const routeParts = route.split(' ');
          const method = routeParts[0];
          const path = routeParts[1];
          return request.method === method && request.url.includes(path);
        });

        if (isPublicRoute) {
          return; // Skip application validation for public routes
        }

        const application = ApplicationIsolationMiddleware.extractApplicationFromRequest(request);

        // If application is provided but not in the valid list, return error
        if (application && !Object.values(ApplicationDataIsolationService.APPLICATIONS).includes(application)) {
          return reply.code(400).send({
            success: false,
            error: 'Bad Request',
            message: `Invalid application: ${application}`,
            validApplications: Object.values(ApplicationDataIsolationService.APPLICATIONS)
          });
        }
        // If validation passes, continue to next middleware
        return;
      } catch (error) {
        console.error('❌ Application validation middleware error:', error);
        return reply.code(500).send({
          success: false,
          error: 'Internal Server Error',
          message: 'Failed to validate application'
        });
      }
    };
  }

  /**
   * Helper function to get user's application access summary
   */
  static async getUserApplicationSummary(userContext) {
    return await applicationDataIsolationService.getUserCompleteAccessProfile(userContext);
  }
}

// Export middleware functions
export const enforceApplicationAccess = ApplicationIsolationMiddleware.enforceApplicationAccess;
export const enforceCrossApplicationSharing = ApplicationIsolationMiddleware.enforceCrossApplicationSharing;
export const addApplicationDataFiltering = ApplicationIsolationMiddleware.addApplicationDataFiltering;
export const validateApplicationExists = ApplicationIsolationMiddleware.validateApplicationExists;
export const getUserApplicationSummary = ApplicationIsolationMiddleware.getUserApplicationSummary;

// Export utility functions
export const extractApplicationFromRequest = ApplicationIsolationMiddleware.extractApplicationFromRequest;
