// Configuration for environment variables
// Uses Vite's import.meta.env for client-side environment variables

interface Config {
  JWT_SECRET: string;
  WRAPPER_DOMAIN: string;
  NODE_ENV: string;
  API_BASE_URL: string;
  CRM_DOMAIN: string;
  CRM_CALLBACK_PATH: string;
}

// Get environment variables with fallbacks
const getEnvVar = (key: string, fallback: string): string => {
  // Try Vite's import.meta.env first (for client-side)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = import.meta.env[key];
    if (value) return value;
  }
  
  // Try process.env (for SSR/build time)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value) return value;
  }
  
  return fallback;
};

export const config: Config = {
  JWT_SECRET: getEnvVar('VITE_JWT_SECRET', 'your-super-secret-jwt-key-change-this-in-production'),
  WRAPPER_DOMAIN: getEnvVar('VITE_WRAPPER_DOMAIN', 'https://wrapper.zopkit.com'),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  API_BASE_URL: getEnvVar('VITE_API_BASE_URL', 'https://wrapper.zopkit.com'),
  CRM_DOMAIN: getEnvVar('VITE_CRM_DOMAIN', 'https://crm.zopkit.com'),
  CRM_CALLBACK_PATH: getEnvVar('VITE_CRM_CALLBACK_PATH', '/callback'),
};

// Export individual config values for convenience
export const { JWT_SECRET, WRAPPER_DOMAIN, NODE_ENV, API_BASE_URL, CRM_DOMAIN, CRM_CALLBACK_PATH } = config;

// Helper function to check if we're in development
export const isDevelopment = () => NODE_ENV === 'development';

// Helper function to check if we're in production
export const isProduction = () => NODE_ENV === 'production'; 