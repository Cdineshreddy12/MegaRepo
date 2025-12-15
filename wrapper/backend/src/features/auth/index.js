/**
 * 🔐 **AUTH FEATURE**
 * Centralized authentication feature module
 * Exports all auth routes and services
 */

// Routes
export { default as authRoutes } from './routes/auth.js';
export { default as simplifiedAuthRoutes } from './routes/simplified-auth.js';

// Services
export { default as kindeService } from './services/kinde-service.js';
