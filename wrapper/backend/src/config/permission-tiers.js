/**
 * 🎯 **PERMISSION TIER CONFIGURATION**
 * Defines what modules are accessible for each subscription tier
 * This file provides the permanent solution for dynamic permission management
 */

export const PERMISSION_TIERS = {
  starter: {
    description: 'Basic starter plan with essential features',
    max_users: 5,
    max_storage: '1GB',
    apps: {
      crm: ['leads', 'contacts', 'dashboard'],
      hr: ['employees', 'dashboard'],
      // No affiliate access on starter
    }
  },
  
  professional: {
    description: 'Professional plan with advanced features',
    max_users: 25,
    max_storage: '10GB',
    apps: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'dashboard', 'system'],
      hr: ['employees', 'payroll', 'leave', 'dashboard'],
      affiliate: ['partners', 'commissions']
    }
  },
  
  enterprise: {
    description: 'Enterprise plan with all features and unlimited access',
    max_users: 'unlimited',
    max_storage: 'unlimited',
    apps: {
      crm: '*', // All modules
      hr: '*',  // All modules
      affiliate: '*', // All modules
      // Future apps will automatically be included
    }
  },

  // Custom tier for special cases
  custom: {
    description: 'Custom tier - modules defined per organization',
    max_users: 'variable',
    max_storage: 'variable',
    apps: {
      // Will be determined by organization_applications table
    }
  }
};

/**
 * Core modules that should always be included regardless of tier
 * These are essential for basic functionality
 */
export const CORE_MODULES = {
  crm: ['dashboard'],
  hr: ['dashboard'],
  affiliate: []
};

/**
 * Module categories for easier management
 */
export const MODULE_CATEGORIES = {
  crm: {
    core: ['leads', 'contacts', 'dashboard'],
    sales: ['opportunities', 'quotations'],
    management: ['accounts', 'system'],
    operations: ['invoices', 'inventory', 'product_orders'],
    support: ['tickets', 'communications'],
    advanced: ['calendar', 'ai_insights']
  },
  hr: {
    core: ['employees', 'dashboard'],
    payroll: ['payroll'],
    management: ['leave'],
    advanced: [] // Future HR modules
  },
  affiliate: {
    core: ['partners', 'commissions'],
    advanced: [] // Future affiliate modules
  }
};

/**
 * Gets accessible modules for a given subscription tier and app
 */
export function getAccessibleModules(appCode, subscriptionTier, fallbackToTier = 'starter') {
  const tier = PERMISSION_TIERS[subscriptionTier] || PERMISSION_TIERS[fallbackToTier];
  const appModules = tier.apps[appCode];
  
  if (appModules === '*') {
    // Enterprise gets all modules - return all available modules for this app
    return 'all';
  }
  
  if (Array.isArray(appModules)) {
    // Specific modules defined
    return appModules;
  }
  
  // No access to this app
  return [];
}

/**
 * Checks if a module is accessible for a given tier
 */
export function isModuleAccessible(appCode, moduleCode, subscriptionTier) {
  const accessibleModules = getAccessibleModules(appCode, subscriptionTier);
  
  if (accessibleModules === 'all') {
    return true;
  }
  
  return Array.isArray(accessibleModules) && accessibleModules.includes(moduleCode);
}

/**
 * Gets all tiers that have access to a specific module
 */
export function getTiersWithModuleAccess(appCode, moduleCode) {
  const accessibleTiers = [];
  
  for (const [tierName, tierConfig] of Object.entries(PERMISSION_TIERS)) {
    if (isModuleAccessible(appCode, moduleCode, tierName)) {
      accessibleTiers.push(tierName);
    }
  }
  
  return accessibleTiers;
}

/**
 * Validates if a subscription upgrade/downgrade is allowed
 */
export function validateTierChange(fromTier, toTier, currentModules) {
  const fromAccess = PERMISSION_TIERS[fromTier];
  const toAccess = PERMISSION_TIERS[toTier];
  
  if (!fromAccess || !toAccess) {
    throw new Error(`Invalid subscription tier: ${fromTier} -> ${toTier}`);
  }
  
  // Check if downgrade would remove access to currently used modules
  const warnings = [];
  const errors = [];
  
  for (const [appCode, modules] of Object.entries(currentModules)) {
    const newAccessibleModules = getAccessibleModules(appCode, toTier);
    
    if (newAccessibleModules !== 'all') {
      const removedModules = modules.filter(module => 
        !newAccessibleModules.includes(module)
      );
      
      if (removedModules.length > 0) {
        warnings.push({
          app: appCode,
          removedModules,
          message: `Access to ${removedModules.join(', ')} will be removed`
        });
      }
    }
  }
  
  return { warnings, errors, allowed: errors.length === 0 };
}

export default PERMISSION_TIERS;
