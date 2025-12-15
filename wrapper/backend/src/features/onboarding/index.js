/**
 * 🚀 **ONBOARDING FEATURE**
 * Centralized onboarding feature module
 * Exports all onboarding routes and services
 */

// Routes
export { default as coreOnboardingRoutes } from './routes/core-onboarding.js';
export { default as statusManagementRoutes } from './routes/status-management.js';
export { default as dataManagementRoutes } from './routes/data-management.js';
export { default as subdomainManagementRoutes } from './routes/subdomain-management.js';
export { default as adminManagementRoutes } from './routes/admin-management.js';

// Services
export { default as UnifiedOnboardingService } from './services/unified-onboarding-service.js';
export { default as OnboardingValidationService } from './services/onboarding-validation-service.js';
export { default as OnboardingTrackingService } from './services/onboarding-tracking-service.js';
export { default as OnboardingOrganizationSetupService } from './services/onboarding-organization-setup.js';

// Main router (for backward compatibility)
import coreOnboardingRoutes from './routes/core-onboarding.js';
import statusManagementRoutes from './routes/status-management.js';
import dataManagementRoutes from './routes/data-management.js';
import subdomainManagementRoutes from './routes/subdomain-management.js';
import adminManagementRoutes from './routes/admin-management.js';

export default async function onboardingRoutes(fastify, options) {
  console.log('🔧 Registering onboarding feature routes...');

  // Register all onboarding sub-routes
  await subdomainManagementRoutes(fastify, options);
  await coreOnboardingRoutes(fastify, options);
  await statusManagementRoutes(fastify, options);
  await dataManagementRoutes(fastify, options);
  await adminManagementRoutes(fastify, options);

  console.log('✅ Onboarding feature routes registered successfully');
}

