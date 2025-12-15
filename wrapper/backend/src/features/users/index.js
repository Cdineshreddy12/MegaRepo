/**
 * 👥 **USERS FEATURE**
 * Centralized users feature module
 * Exports all user routes and services
 */

// Routes
export { default as usersRoutes } from './routes/users.js';
export { default as userRoutes } from './routes/user-routes.js';
export { default as userSyncRoutes } from './routes/user-sync.js';
export { default as userVerificationRoutes } from './routes/user-verification-routes.js';

// Services
export { UserSyncService } from './services/user-sync-service.js';
export { UserClassificationService } from './services/user-classification-service.js';
