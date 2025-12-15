import { SubscriptionService } from '../features/subscriptions/index.js';
import { db } from '../db/index.js';
import { eq, count } from 'drizzle-orm';
import { tenantUsers, customRoles } from '../db/schema/index.js';

// Plan application + module access control based on your B2B architecture
const PLAN_APPLICATION_ACCESS = {
  'trial': {
    applications: ['crm'],
    modules: {
      crm: ['leads', 'contacts', 'dashboard'] // Basic CRM only during trial - no advanced features
    }
  },
  'starter': {
    applications: ['crm', 'hr'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'tickets', 'communications', 'dashboard', 'users'],
      hr: ['employees', 'payroll', 'leave', 'documents']
    }
  },
  'professional': {
    applications: ['crm', 'hr', 'affiliate'],
    modules: {
      crm: ['leads', 'contacts', 'accounts', 'opportunities', 'quotations', 'tickets', 'communications', 'invoices', 'dashboard', 'users', 'roles', 'bulk_operations'],
      hr: ['employees', 'payroll', 'leave', 'documents', 'performance', 'recruitment'],
      affiliate: ['partners', 'commissions']
    }
  },
  'enterprise': {
    applications: ['crm', 'hr', 'affiliate', 'accounting', 'inventory'],
    modules: {
      crm: '*', // All CRM modules
      hr: '*',  // All HR modules  
      affiliate: '*', // All affiliate modules
      accounting: '*', // All accounting modules (when built)
      inventory: '*'  // All inventory modules (when built)
    }
  }
};

// Plan limits
const PLAN_LIMITS = {
  'trial': { users: 2, roles: 2 },
  'starter': { users: 10, roles: 10 },
  'professional': { users: 50, roles: 25 },
  'enterprise': { users: -1, roles: -1 } // -1 means unlimited
};

// Middleware to check application access
export const checkApplicationAccess = (requiredApplication) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get current subscription
      const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
      
      if (!subscription) {
        return res.status(403).json({ 
          success: false, 
          error: 'No active subscription found' 
        });
      }

      // Check if application is allowed for current plan
      const planAccess = PLAN_APPLICATION_ACCESS[subscription.plan] || { applications: [] };
      
      if (!planAccess.applications.includes(requiredApplication)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access to ${requiredApplication.toUpperCase()} application requires ${getMinimumPlanForApplication(requiredApplication)} plan or higher`,
          currentPlan: subscription.plan,
          requiredApplication,
          upgradeRequired: true
        });
      }

      // Add subscription info to request for further use
      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Application access check error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify application access' 
      });
    }
  };
};

// Middleware to check specific module access within an application  
export const checkModuleAccess = (requiredApplication, requiredModule) => {
  return async (req, res, next) => {
    try {
      const tenantId = req.user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Authentication required' 
        });
      }

      // Get current subscription
      const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
      
      if (!subscription) {
        return res.status(403).json({ 
          success: false, 
          error: 'No active subscription found' 
        });
      }

      const planAccess = PLAN_APPLICATION_ACCESS[subscription.plan] || { applications: [], modules: {} };
      
      // First check if application is allowed
      if (!planAccess.applications.includes(requiredApplication)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access to ${requiredApplication.toUpperCase()} application requires upgrade`,
          currentPlan: subscription.plan,
          requiredApplication,
          upgradeRequired: true
        });
      }

      // Then check if specific module is allowed within the application
      const allowedModules = planAccess.modules[requiredApplication] || [];
      
      // Check for wildcard access (enterprise plan)
      if (allowedModules !== '*' && !allowedModules.includes(requiredModule)) {
        return res.status(403).json({ 
          success: false, 
          error: `Access to ${requiredModule} module in ${requiredApplication.toUpperCase()} requires ${getMinimumPlanForModule(requiredApplication, requiredModule)} plan or higher`,
          currentPlan: subscription.plan,
          requiredApplication,
          requiredModule,
          upgradeRequired: true
        });
      }

      // Add subscription info to request for further use
      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Module access check error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to verify module access' 
      });
    }
  };
};

// Middleware to check user limit before creating users
export const checkUserLimit = async (request, reply) => {
  try {
    const tenantId = request.userContext?.tenantId;
    
    if (!tenantId) {
      return reply.code(401).send({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get current subscription
    const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
    
    if (!subscription) {
      return reply.code(403).send({ 
        success: false, 
        error: 'No active subscription found' 
      });
    }

    const planLimits = PLAN_LIMITS[subscription.plan];
    
    if (!planLimits) {
      return reply.code(403).send({ 
        success: false, 
        error: 'Invalid subscription plan' 
      });
    }

    // Check if plan has unlimited users
    if (planLimits.users === -1) {
      request.subscription = subscription;
      return;
    }

    // Count current users
    const [userCount] = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    if (userCount.count >= planLimits.users) {
      return reply.code(403).send({ 
        success: false, 
        error: `Your ${subscription.plan} plan allows maximum ${planLimits.users} users. Current: ${userCount.count}`,
        currentPlan: subscription.plan,
        currentUsers: userCount.count,
        maxUsers: planLimits.users,
        upgradeRequired: true
      });
    }

    request.subscription = subscription;
  } catch (error) {
    console.error('User limit check error:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to verify user limits' 
    });
  }
};

// Middleware to check role limit before creating roles
export const checkRoleLimit = async (request, reply) => {
  try {
    const tenantId = request.userContext?.tenantId;
    
    if (!tenantId) {
      return reply.code(401).send({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    // Get current subscription
    const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
    
    if (!subscription) {
      return reply.code(403).send({ 
        success: false, 
        error: 'No active subscription found' 
      });
    }

    const planLimits = PLAN_LIMITS[subscription.plan];
    
    if (!planLimits) {
      return reply.code(403).send({ 
        success: false, 
        error: 'Invalid subscription plan' 
      });
    }

    // Check if plan has unlimited roles
    if (planLimits.roles === -1) {
      request.subscription = subscription;
      return;
    }

    // Count current roles (excluding default admin role)
    const [roleCount] = await db
      .select({ count: count() })
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    // Account for default admin role - subtract 1 from limit comparison
    const customRolesCount = Math.max(0, roleCount.count - 1);
    const allowedCustomRoles = Math.max(0, planLimits.roles - 1);

    if (customRolesCount >= allowedCustomRoles) {
      return reply.code(403).send({ 
        success: false, 
        error: `Your ${subscription.plan} plan allows maximum ${planLimits.roles} roles (including admin). Current custom roles: ${customRolesCount}`,
        currentPlan: subscription.plan,
        currentRoles: roleCount.count,
        maxRoles: planLimits.roles,
        upgradeRequired: true
      });
    }

    request.subscription = subscription;
  } catch (error) {
    console.error('Role limit check error:', error);
    return reply.code(500).send({ 
      success: false, 
      error: 'Failed to verify role limits' 
    });
  }
};

// Helper function to get minimum plan required for an application
function getMinimumPlanForApplication(application) {
  for (const [plan, planAccess] of Object.entries(PLAN_APPLICATION_ACCESS)) {
    if (planAccess.applications.includes(application)) {
      return plan;
    }
  }
  return 'enterprise'; // Default to highest plan if not found
}

// Helper function to get minimum plan required for a specific module
function getMinimumPlanForModule(application, module) {
  for (const [plan, planAccess] of Object.entries(PLAN_APPLICATION_ACCESS)) {
    const allowedModules = planAccess.modules[application] || [];
    if (allowedModules === '*' || allowedModules.includes(module)) {
      return plan;
    }
  }
  return 'enterprise'; // Default to highest plan if not found
}

// Utility function to get plan limits for frontend
export const getPlanLimits = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId;
    
    if (!tenantId) {
      return res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
    }

    const subscription = await SubscriptionService.getCurrentSubscription(tenantId);
    
    if (!subscription) {
      return res.status(403).json({ 
        success: false, 
        error: 'No active subscription found' 
      });
    }

    // Get current usage
    const [userCount] = await db
      .select({ count: count() })
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId));

    const [roleCount] = await db
      .select({ count: count() })
      .from(customRoles)
      .where(eq(customRoles.tenantId, tenantId));

    const planLimits = PLAN_LIMITS[subscription.plan] || {};
    const planAccess = PLAN_APPLICATION_ACCESS[subscription.plan] || { applications: [], modules: {} };

    res.json({
      success: true,
      data: {
        currentPlan: subscription.plan,
        limits: planLimits,
        allowedApplications: planAccess.applications,
        allowedModules: planAccess.modules,
        currentUsage: {
          users: userCount.count,
          roles: roleCount.count
        },
        restrictions: {
          canCreateUsers: planLimits.users === -1 || userCount.count < planLimits.users,
          canCreateRoles: planLimits.roles === -1 || roleCount.count < planLimits.roles,
          availableUserSlots: planLimits.users === -1 ? -1 : Math.max(0, planLimits.users - userCount.count),
          availableRoleSlots: planLimits.roles === -1 ? -1 : Math.max(0, planLimits.roles - roleCount.count)
        }
      }
    });
  } catch (error) {
    console.error('Error getting plan limits:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get plan limits' 
    });
  }
};

export default {
  checkApplicationAccess,
  checkModuleAccess,
  checkUserLimit,
  checkRoleLimit,
  getPlanLimits
}; 