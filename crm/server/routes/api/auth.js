import express from 'express';
const router = express.Router();
import { check } from 'express-validator';
import { redirectAuth } from '../../controllers/authController.js';
import auth from '../../middleware/auth.js';
import { getEffectiveUser } from '../../utils/authHelpers.js';


// Redirect authentication for users from external applications
router.post('/redirect-auth', redirectAuth);

router.get(
  '/me',
  auth, // Use the auth middleware to validate wrapper JWT tokens
  async (req, res) => {
    try {
      console.log('🎯 /me endpoint called - fetching comprehensive data');

      // Import required models dynamically
      let models = {};
      try {
        const [
          UserProfile,
          Organization,
          CrmRole,
          CrmRoleAssignment,
          CrmCreditConfig,
          CrmEntityCredit,
          EmployeeOrgAssignment
        ] = await Promise.all([
          import('../../models/UserProfile.js'),
          import('../../models/Organization.js'),
          import('../../models/CrmRole.js'),
          import('../../models/CrmRoleAssignment.js'),
          import('../../models/CrmCreditConfig.js'),
          import('../../models/CrmEntityCredit.js'),
          import('../../models/EmployeeOrgAssignment.js')
        ]);

        models = {
          UserProfile: UserProfile.default,
          Organization: Organization.default,
          CrmRole: CrmRole.default,
          CrmRoleAssignment: CrmRoleAssignment.default,
          CrmCreditConfig: CrmCreditConfig.default,
          CrmEntityCredit: CrmEntityCredit.default,
          EmployeeOrgAssignment: EmployeeOrgAssignment.default
        };
        console.log('✅ Models loaded successfully');
      } catch (importError) {
        console.error('❌ Failed to import models:', importError.message);
        throw importError;
      }

      // Get real-time credit information from credit system
      let realTimeCreditData = null;
      try {
        const { getUserCredits } = await import('../../controllers/creditController.js');
        const mockReq = {
          user: { userId: req.user.userId },
          tenantId: req.user.tenantId
        };
        const mockRes = {
          json: (data) => data,
          status: (code) => ({ json: (data) => data })
        };

        const creditResult = await getUserCredits(mockReq, mockRes);
        if (creditResult && creditResult.success) {
          realTimeCreditData = creditResult.data;
        }
      } catch (creditError) {
        console.warn('Could not fetch real-time credit data for /me endpoint:', creditError.message);
      }

      // 1. Get comprehensive roles and permissions data
      let comprehensiveRoles = req.user.roles || [];
      let comprehensivePermissions = req.user.permissions || [];

      if ((!comprehensiveRoles || comprehensiveRoles.length === 0) && req.user.tenantId && req.user.userId) {
        try {
          console.log('🔍 Fetching role assignments for user:', req.user.userId);
          const roleAssignments = await models.CrmRoleAssignment.find({
            tenantId: req.user.tenantId,
            userIdString: req.user.userId, // Use userIdString, not userId (which is ObjectId)
            isActive: true // CRITICAL: Only fetch active role assignments
          }).lean();
          console.log('✅ Found active role assignments:', roleAssignments.length);

          if (roleAssignments.length > 0) {
            for (const assignment of roleAssignments) {
              // Skip inactive assignments (double check)
              if (!assignment.isActive) {
                console.log(`⏭️ Skipping inactive assignment: ${assignment.assignmentId}`);
                continue;
              }
              
              console.log('🔍 Fetching role details for:', assignment.roleIdString || assignment.roleId);
              const roleDetail = await models.CrmRole.findOne({
                tenantId: req.user.tenantId,
                roleId: assignment.roleIdString || assignment.roleId
              }).lean();

              if (roleDetail) {
                comprehensiveRoles.push({
                  roleId: roleDetail.roleId,
                  roleName: roleDetail.roleName,
                  permissions: roleDetail.permissions || [],
                  assignmentId: assignment.assignmentId,
                  assignedAt: assignment.assignedAt
                });
                if (roleDetail.permissions) {
                  comprehensivePermissions = [...new Set([...comprehensivePermissions, ...roleDetail.permissions])];
                }
              }
            }
          }
        } catch (roleError) {
          console.warn('Could not fetch comprehensive role data:', roleError.message);
        }
      }

      // 2. Get user profile information from database
      let userProfile = null;
      try {
        console.log('🔍 Fetching user profile for:', req.user.email);
        // Try multiple ways to find the user
        userProfile = await models.UserProfile.findOne({
          tenantId: req.user.tenantId,
          'personalInfo.email': req.user.email
        }).lean();

        if (!userProfile) {
          userProfile = await models.UserProfile.findOne({
            tenantId: req.user.tenantId,
            email: req.user.email
          }).lean();
        }

        if (!userProfile) {
          userProfile = await models.UserProfile.findOne({
            tenantId: req.user.tenantId,
            userId: req.user.userId
          }).lean();
        }
        console.log('✅ User profile found:', !!userProfile);
      } catch (profileError) {
        console.warn('Could not fetch user profile:', profileError.message);
      }

      // 3. Get credit configurations for the tenant
      let creditConfigs = [];
      try {
        creditConfigs = await models.CrmCreditConfig.find({
          tenantId: req.user.tenantId
        }).limit(10).lean(); // Limit to prevent response bloat
        console.log('✅ Found credit configs:', creditConfigs.length);
      } catch (configError) {
        console.warn('Could not fetch credit configurations:', configError.message);
      }

      // 4. Get user's organization assignments using relationship service
      let userOrgAssignments = [];
      let userAccessibleEntities = [];
      try {
        // Import relationship service
        const RelationshipService = (await import('../../services/relationshipService.js')).default;

        // Get both organization assignments and accessible entities
        [userOrgAssignments, userAccessibleEntities] = await Promise.all([
          RelationshipService.getUserOrganizationAssignments(
            req.user.tenantId,
            req.user.userId
          ),
          RelationshipService.getUserAccessibleEntities(
            req.user.tenantId,
            req.user.userId
          )
        ]);

        console.log('✅ Found user organization assignments via relationship service:', userOrgAssignments.length);
        console.log('✅ Found user accessible entities via relationship service:', userAccessibleEntities.length);
      } catch (assignmentError) {
        console.warn('Could not fetch user organization assignments:', assignmentError.message);
      }

      // 5. Get entity credits for user's assigned organizations using relationship service
      let availableEntityCredits = [];
      try {
        // Import relationship service
        const RelationshipService = (await import('../../services/relationshipService.js')).default;

        availableEntityCredits = await RelationshipService.getUserEntityCredits(
          req.user.tenantId,
          req.user.userId
        );

        console.log('✅ Found entity credits via relationship service:', availableEntityCredits.length);
      } catch (entityError) {
        console.warn('Could not fetch entity credits:', entityError.message);
      }

      // Build comprehensive response similar to fetch-user-comprehensive-data.cjs
      const response = {
        // Basic user info
        _id: req.user.id,
        id: req.user.id,
        userId: req.user.userId,
        firstName: req.user.firstName || userProfile?.personalInfo?.firstName,
        lastName: req.user.lastName || userProfile?.personalInfo?.lastName,
        email: req.user.email,
        role: req.user.role,
        zone: req.user.zone || [],
        isExternalUser: req.user.isExternalUser || false,
        tokenType: req.user.tokenType,

        // Enhanced profile data
        employeeCode: userProfile?.employeeCode,
        personalInfo: userProfile?.personalInfo,

        // Organization data
        tenantId: req.user.tenantId,
        // Use the primary organization from user assignments or database profile
        orgCode: (userOrgAssignments.length > 0 ? userOrgAssignments[0].entityId :
                 userProfile?.organization?.orgCode ||
                 req.user.primaryOrganizationId ||
                 req.user.entities?.[0]?.orgCode),

        // Roles and permissions
        roles: comprehensiveRoles,
        permissions: comprehensivePermissions,
        rolesCount: comprehensiveRoles.length,
        permissionsCount: comprehensivePermissions.length,

        // Credit information
        creditBreakdown: realTimeCreditData ? {
          breakdown: [],
          summary: {
            totalAllocated: realTimeCreditData.organizationCredits.allocated,
            totalUsed: realTimeCreditData.organizationCredits.used,
            totalAvailable: realTimeCreditData.organizationCredits.available
          },
          organizationCredits: realTimeCreditData.organizationCredits
          // Removed creditConfigs for cleaner frontend experience
        } : {
          breakdown: [],
          summary: { totalAllocated: 0, totalUsed: 0, totalAvailable: 0 },
          organizationCredits: null
        },

        // Entity credits info
        entityCredits: {
          availableEntityCredits: availableEntityCredits
        },

        // Organization assignments (from relationship service)
        organizationAssignments: userOrgAssignments.map(assignment => ({
          assignmentId: assignment.assignmentId,
          userId: assignment.userId,
          entityId: assignment.entityId,
          entityName: assignment.entityName,
          assignmentType: assignment.assignmentType,
          hierarchy: assignment.hierarchy,
          level: assignment.level,
          isActive: assignment.isActive,
          priority: assignment.priority,
          assignedAt: assignment.assignedAt,
          expiresAt: assignment.expiresAt
        })),

        // Use accessible entities (includes organization details) or fallback to assignments
        entities: (userAccessibleEntities && userAccessibleEntities.length > 0) ? 
                 userAccessibleEntities.map(entity => ({
                   ...entity,
                   id: entity._id || entity.orgCode, // Ensure id field is present
                   orgCode: entity.orgCode,
                   orgName: entity.orgName,
                   level: entity.hierarchy?.level || 0,
                   status: entity.status || 'active'
                 })) :
                 (req.user.entities && req.user.entities.length > 0) ? req.user.entities :
                 userOrgAssignments.map(assignment => ({
                   orgCode: assignment.entityId,
                   orgName: assignment.entityName,
                   level: assignment.level || assignment.hierarchy?.level || 0,
                   id: assignment.entityId // Add id for consistency
                 })),
        totalCredits: realTimeCreditData ? realTimeCreditData.organizationCredits.available : 0,
        primaryOrganizationId: (userOrgAssignments.length > 0 ? userOrgAssignments[0].entityId :
                              req.user.primaryOrganizationId),
        isTenantAdmin: req.user.isTenantAdmin || false,
        onboardingCompleted: req.user.onboardingCompleted || false,
        profile: req.user.profile || {}
      };

      console.log('✅ /me endpoint returning comprehensive user data');
      console.log('📊 Response summary:');
      console.log('  - Organization Assignments:', response.organizationAssignments?.length || 0);
      console.log('  - Entity Credits:', response.entityCredits?.availableEntityCredits?.length || 0);
      console.log('  - Entities:', response.entities?.length || 0);

      res.json(response);
    } catch (err) {
      console.error('❌ Error in /me endpoint:', err.message);
      console.error('Stack trace:', err.stack);
      res.status(500).json({ message: 'Server Error', error: err.message });
    }
  }
);

export default router;