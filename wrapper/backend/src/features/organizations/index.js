/**
 * 🏢 **ORGANIZATIONS FEATURE**
 * Centralized organizations feature module
 * Exports all organization routes and services
 */

// Routes
export { default as organizationsRoutes } from './routes/organizations.js';
export { default as entitiesRoutes } from './routes/entities.js';
export { default as locationsRoutes } from './routes/locations.js';

// Services
export { default as organizationService } from './services/organization-service.js';
export { default as locationService } from './services/location-service.js';
export { OrganizationAssignmentService } from './services/organization-assignment-service.js';
