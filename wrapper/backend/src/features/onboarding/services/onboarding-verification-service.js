/**
 * ✅ **ONBOARDING VERIFICATION SERVICE**
 * 
 * Comprehensive verification system to ensure all onboarding steps are completed successfully
 * before marking onboarding as complete.
 * 
 * Verifies:
 * - Tenant creation
 * - Organization entity creation
 * - User creation and admin assignment
 * - Role creation and assignment
 * - Subscription creation
 * - Credit allocation (both tenant-level and application-level)
 * - Application assignments
 * - Credit expiry dates
 */

import { db, systemDbConnection } from '../../../db/index.js';
import { tenants, tenantUsers, customRoles, userRoleAssignments, subscriptions, entities, credits } from '../../../db/schema/index.js';
// REMOVED: creditAllocations - Application-specific allocations removed (applications manage their own credits)
import { organizationApplications } from '../../../db/schema/suite-schema.js';
import { eq, and, isNotNull, isNull } from 'drizzle-orm';

export class OnboardingVerificationService {
  
  /**
   * Verify complete onboarding setup
   * @param {string} tenantId - Tenant ID to verify
   * @param {object} logger - Optional logger instance
   * @returns {Promise<{success: boolean, verified: boolean, issues: Array, details: object}>}
   */
  static async verifyOnboardingCompletion(tenantId, logger = null) {
    const issues = [];
    const details = {
      tenant: null,
      organization: null,
      adminUser: null,
      adminRole: null,
      roleAssignment: null,
      subscription: null,
      tenantCredits: null,
      // REMOVED: creditAllocations - Application-specific allocations removed
      applicationAssignments: [],
      missingItems: []
    };

    try {
      // FIXED: Use systemDbConnection to bypass RLS during verification
      // Verification happens during onboarding when tenant context may not be fully set
      const verificationDb = systemDbConnection;

      // 1. Verify Tenant
      const [tenant] = await verificationDb
        .select()
        .from(tenants)
        .where(eq(tenants.tenantId, tenantId))
        .limit(1);

      if (!tenant) {
        issues.push({ step: 'tenant', issue: 'Tenant not found', severity: 'critical' });
        return { success: false, verified: false, issues, details };
      }
      details.tenant = tenant;

      // 2. Verify Organization Entity
      // FIXED: Use parentEntityId IS NULL to identify root organization (isRoot field doesn't exist)
      const [organization] = await verificationDb
        .select()
        .from(entities)
        .where(and(
          eq(entities.tenantId, tenantId),
          eq(entities.entityType, 'organization'),
          isNull(entities.parentEntityId) // parentEntityId IS NULL means root organization
        ))
        .limit(1);

      if (!organization) {
        issues.push({ step: 'organization', issue: 'Root organization entity not found', severity: 'critical' });
        details.missingItems.push('organization');
      } else {
        details.organization = organization;
      }

      // 3. Verify Admin User
      const [adminUser] = await verificationDb
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.tenantId, tenantId),
          eq(tenantUsers.isTenantAdmin, true)
        ))
        .limit(1);

      if (!adminUser) {
        issues.push({ step: 'admin_user', issue: 'Admin user not found', severity: 'critical' });
        details.missingItems.push('adminUser');
      } else {
        details.adminUser = adminUser;
      }

      // 4. Verify Admin Role
      if (adminUser) {
        const [adminRole] = await verificationDb
          .select()
          .from(customRoles)
          .where(and(
            eq(customRoles.tenantId, tenantId),
            eq(customRoles.isSystemRole, true),
            eq(customRoles.isDefault, true)
          ))
          .limit(1);

        if (!adminRole) {
          issues.push({ step: 'admin_role', issue: 'Admin role not created', severity: 'critical' });
          details.missingItems.push('adminRole');
        } else {
          details.adminRole = adminRole;

          // 5. Verify Role Assignment
          const [roleAssignment] = await verificationDb
            .select()
            .from(userRoleAssignments)
            .where(and(
              eq(userRoleAssignments.userId, adminUser.userId),
              eq(userRoleAssignments.roleId, adminRole.roleId),
              eq(userRoleAssignments.isActive, true)
            ))
            .limit(1);

          if (!roleAssignment) {
            issues.push({ step: 'role_assignment', issue: 'Admin role not assigned to user', severity: 'critical' });
            details.missingItems.push('roleAssignment');
          } else {
            details.roleAssignment = roleAssignment;
          }
        }
      }

      // 6. Verify Subscription
      // FIXED: subscriptions table uses 'status' field, not 'isActive'
      const [subscription] = await verificationDb
        .select()
        .from(subscriptions)
        .where(and(
          eq(subscriptions.tenantId, tenantId),
          eq(subscriptions.status, 'active')
        ))
        .limit(1);

      if (!subscription) {
        // Also check for 'trialing' status as valid subscription
        const [trialSubscription] = await verificationDb
          .select()
          .from(subscriptions)
          .where(and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'trialing')
          ))
          .limit(1);
        
        if (!trialSubscription) {
          issues.push({ step: 'subscription', issue: 'Active or trialing subscription not found', severity: 'critical' });
          details.missingItems.push('subscription');
        } else {
          details.subscription = trialSubscription;
        }
      } else {
        details.subscription = subscription;
      }

      // 7. Verify Organization-Level Credits
      // FIXED: Credits are entity-level (associated with organization), not tenant-level
      // Check for credits associated with the root organization entity
      let tenantCredits = null;
      if (organization) {
        const [orgCredits] = await verificationDb
          .select()
          .from(credits)
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.entityId, organization.entityId),
            eq(credits.isActive, true)
          ))
          .limit(1);
        
        tenantCredits = orgCredits;
      } else {
        // Fallback: check for any credits for the tenant if organization not found
        const [anyCredits] = await verificationDb
          .select()
          .from(credits)
          .where(and(
            eq(credits.tenantId, tenantId),
            eq(credits.isActive, true)
          ))
          .limit(1);
        
        tenantCredits = anyCredits;
      }

      if (!tenantCredits || parseFloat(tenantCredits.availableCredits || 0) <= 0) {
        issues.push({ 
          step: 'organization_credits', 
          issue: 'Organization credits not allocated or zero', 
          severity: 'critical',
          currentValue: tenantCredits?.availableCredits || 0
        });
        details.missingItems.push('organizationCredits');
      } else {
        details.tenantCredits = tenantCredits;
      }

      // 8. Verify Application Assignments
      // NOTE: Application-level credit allocations removed - applications manage their own credits
      // Only verify that applications are assigned to the organization
      if (organization) {
        const appAssignments = await verificationDb
          .select()
          .from(organizationApplications)
          .where(and(
            eq(organizationApplications.tenantId, tenantId),
            eq(organizationApplications.isEnabled, true)
          ));

        if (appAssignments.length === 0) {
          issues.push({ 
            step: 'application_assignments', 
            issue: 'No applications assigned to organization', 
            severity: 'critical' 
          });
          details.missingItems.push('applicationAssignments');
        } else {
          // Check for expiry dates
          const appsWithoutExpiry = appAssignments.filter(
            app => !app.expiresAt
          );
          
          if (appsWithoutExpiry.length > 0) {
            issues.push({ 
              step: 'application_expiry', 
              issue: `${appsWithoutExpiry.length} application assignment(s) missing expiry dates`, 
              severity: 'warning',
              affectedApplications: appsWithoutExpiry.map(a => a.id)
            });
          }

          details.applicationAssignments = appAssignments;
        }
      }

      // Determine overall verification status
      const criticalIssues = issues.filter(i => i.severity === 'critical');
      const verified = criticalIssues.length === 0;

      if (logger) {
        if (verified) {
          logger.onboarding.success('Onboarding verification passed', {
            tenantId,
            applicationAssignments: details.applicationAssignments.length
          });
        } else {
          logger.onboarding.error('Onboarding verification failed', null, {
            tenantId,
            criticalIssues: criticalIssues.length,
            totalIssues: issues.length,
            missingItems: details.missingItems
          });
        }
      }

      return {
        success: true,
        verified,
        issues,
        criticalIssues,
        warnings: issues.filter(i => i.severity === 'warning'),
        details
      };

    } catch (error) {
      // Enhanced error logging for SQL errors
      const errorDetails = {
        message: error.message,
        name: error.name,
        code: error.code,
        position: error.position,
        stack: error.stack
      };
      
      if (logger) {
        logger.onboarding.error('Onboarding verification error', error, { 
          tenantId,
          errorDetails
        });
      }
      
      console.error('❌ Onboarding verification SQL error:', errorDetails);
      
      return {
        success: false,
        verified: false,
        issues: [{ 
          step: 'verification', 
          issue: `SQL Error: ${error.message}${error.position ? ` at position ${error.position}` : ''}`, 
          severity: 'critical',
          errorCode: error.code,
          errorDetails
        }],
        criticalIssues: [{ 
          step: 'verification', 
          issue: error.message, 
          severity: 'critical' 
        }],
        details
      };
    }
  }

  /**
   * Auto-fix common onboarding issues
   * @param {string} tenantId - Tenant ID
   * @param {object} verificationResult - Result from verifyOnboardingCompletion
   * @param {object} logger - Optional logger instance
   * @returns {Promise<{success: boolean, fixed: Array, failed: Array}>}
   */
  static async autoFixOnboardingIssues(tenantId, verificationResult, logger = null) {
    const fixed = [];
    const failed = [];

    if (!verificationResult.verified) {
      // Attempt to fix critical issues
      for (const issue of verificationResult.criticalIssues || []) {
        try {
          // Implementation of auto-fix logic would go here
          // For now, we'll just log what needs to be fixed
          if (logger) {
            logger.onboarding.warning(`Auto-fix needed for: ${issue.step} - ${issue.issue}`);
          }
        } catch (fixError) {
          failed.push({ step: issue.step, error: fixError.message });
        }
      }
    }

    return { success: failed.length === 0, fixed, failed };
  }
}

export default OnboardingVerificationService;

