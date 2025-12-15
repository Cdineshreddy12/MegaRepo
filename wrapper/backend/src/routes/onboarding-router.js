// Import from new feature-based location
import onboardingRoutes from '../features/onboarding/index.js';

/**
 * Main Onboarding Routes
 * Modularized onboarding system with separate concerns
 *
 * This replaces the monolithic onboarding.js file with smaller, focused modules:
 * - subdomain-management.js: Subdomain validation endpoints
 * - core-onboarding.js: Main onboarding flow (/onboard endpoint)
 * - status-management.js: Status checking, completion, and team invitations
 * - data-management.js: Data retrieval, organization info, and step tracking
 * - admin-management.js: Debug and admin endpoints
 */

export default onboardingRoutes;
