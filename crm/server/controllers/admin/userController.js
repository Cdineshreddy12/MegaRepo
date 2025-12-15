import UserProfile from '../../models/UserProfile.js';
import { getEffectiveUser } from '../../utils/authHelpers.js';
import { hasAnyPermission } from '../../middleware/checkPermissions.js';

// Get all users for the current tenant (admin view)
export const getUsers = async (req, res) => {
  try {
    console.log('🔍 getUsers called by admin user');

    // Check permissions
    const userPermissions = req.user?.permissions || [];
    const requiredPermissions = [
      'crm.system.users_read',
      'crm.system.users_read_all',
      'system.users.read',
      'system.users.read_all'
    ];

    const hasPermission = hasAnyPermission(userPermissions, requiredPermissions);
    if (!hasPermission) {
      console.log('❌ User lacks permission to view users');
      return res.status(403).json({
        message: "Access denied. Insufficient privileges.",
        requiredPermissions,
        userPermissions: userPermissions.slice(0, 10)
      });
    }

    // Get tenant ID (always required)
    const tenantId = req.user?.tenantId || req.tenantId;
    
    // Get selected organization ID from query parameter, header, or user context
    const selectedOrgId = req.query.selectedOrg || 
                         req.headers['x-tenant-id'] || 
                         req.userContext?.selectedOrgId;
    
    if (!tenantId) {
      console.log('❌ No tenant context found:', {
        userContext: req.userContext,
        userTenantId: req.user?.tenantId,
        reqTenantId: req.tenantId,
        selectedOrgId: selectedOrgId
      });
      return res.status(400).json({ message: 'Tenant context required' });
    }

    console.log('🔍 Fetching users for tenant:', tenantId, 'organization:', selectedOrgId);

    let userProfiles;

    if (selectedOrgId) {
      // If organization is selected, find users through EmployeeOrgAssignment
      const { default: EmployeeOrgAssignment } = await import('../../models/EmployeeOrgAssignment.js');
      
      // Find all active org assignments for this organization
      // Use entityIdString because selectedOrgId is a UUID string, not an ObjectId
      const orgAssignments = await EmployeeOrgAssignment.find({
        tenantId,
        entityIdString: selectedOrgId,
        isActive: true
      }).select('userId');

      console.log(`🔍 Found ${orgAssignments.length} organization assignments for org ${selectedOrgId}`);

      // Get userIds from assignments (these are UserProfile _id references)
      const userProfileIds = orgAssignments.map(assignment => assignment.userId);

      // Query UserProfiles by their _id
      userProfiles = await UserProfile.find({
        _id: { $in: userProfileIds },
        tenantId
      })
      .populate('roleAssignments', 'roleId isActive assignedAt')
      .populate('organizationAssignments', 'entityId isActive assignedAt')
      .sort({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });
    } else {
      // No organization filter - return all users in tenant
      userProfiles = await UserProfile.find({ tenantId })
        .populate('roleAssignments', 'roleId isActive assignedAt')
        .populate('organizationAssignments', 'entityId isActive assignedAt')
        .sort({ 'personalInfo.firstName': 1, 'personalInfo.lastName': 1 });
    }

    console.log(`✅ Found ${userProfiles.length} user profiles`);

    // Transform to match frontend expectations
    const users = userProfiles.map(profile => {
      // Transform roleAssignments if populated
      const roleDetails = profile.roleAssignments?.map(ra => {
        if (ra && typeof ra === 'object') {
          return {
            _id: ra._id?.toString(),
            roleId: ra.roleId || ra._id?.toString(),
            isActive: ra.isActive !== false,
            assignedAt: ra.assignedAt?.toISOString() || ra.createdAt?.toISOString()
          };
        }
        return ra;
      }) || [];

      // Extract role IDs (handling both populated and non-populated)
      const roles = profile.roleAssignments?.map(ra => {
        if (ra && typeof ra === 'object') {
          return ra.roleId || ra._id?.toString();
        }
        return ra?.toString();
      }).filter(Boolean) || [];

      return {
        _id: profile._id.toString(),
        id: profile._id.toString(),
        employeeCode: profile.employeeCode || '',
        firstName: profile.personalInfo?.firstName || 'Unknown',
        lastName: profile.personalInfo?.lastName || 'User',
        email: profile.personalInfo?.email || '',
        contactMobile: profile.personalInfo?.contactMobile || '',
        role: 'user', // Default role, could be enhanced based on roleDetails
        designation: 'user', // Default designation
        isActive: profile.status?.isActive !== false,
        authSource: profile.kindeUserId ? 'kinde' : 'local',
        orgCode: tenantId,
        externalId: profile.kindeUserId || profile.userId,
        lastSyncedAt: profile.lastSyncedAt?.toISOString(),
        createdAt: profile.createdAt?.toISOString(),
        updatedAt: profile.updatedAt?.toISOString(),
        // Enhanced fields
        roles,
        permissions: [], // Could be populated from roles if needed
        roleDetails,
        zone: [], // Could be populated from organization
        department: '', // Could be populated from organization
        countryCode: '',
        avatarUrl: '',
        createdBy: profile._id.toString(), // Self-referential for now
        updatedBy: profile._id.toString()
      };
    });

    console.log(`✅ Returning ${users.length} users to frontend`);

    // Return users array directly to match frontend expectations
    res.json(users);

  } catch (error) {
    console.error('❌ Error in getUsers:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching users',
      error: error.message
    });
  }
};

// Get a specific user by ID
export const getUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.userContext?.selectedOrgId || 
                     req.user?.tenantId || 
                     req.tenantId ||
                     req.tenant?.orgCode;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    console.log('🔍 Fetching user:', id, 'for tenant:', tenantId);

    const userProfile = await UserProfile.findOne({
      _id: id,
      tenantId
    })
    .populate('roleAssignments', 'roleId isActive assignedAt')
    .populate('organizationAssignments', 'entityId isActive assignedAt');

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Transform to match frontend expectations
    const user = {
      _id: userProfile._id.toString(),
      id: userProfile._id.toString(),
      employeeCode: userProfile.employeeCode || '',
      firstName: userProfile.personalInfo?.firstName || 'Unknown',
      lastName: userProfile.personalInfo?.lastName || 'User',
      email: userProfile.personalInfo?.email || '',
      contactMobile: userProfile.personalInfo?.contactMobile || '',
      role: 'user',
      designation: 'user',
      isActive: userProfile.status?.isActive !== false,
      authSource: userProfile.kindeUserId ? 'kinde' : 'local',
      orgCode: tenantId,
      externalId: userProfile.kindeUserId || userProfile.userId,
      lastSyncedAt: userProfile.lastSyncedAt?.toISOString(),
      createdAt: userProfile.createdAt?.toISOString(),
      updatedAt: userProfile.updatedAt?.toISOString(),
      roles: userProfile.roleAssignments?.map(ra => ra.roleId) || [],
      permissions: [],
      roleDetails: userProfile.roleAssignments || [],
      zone: [],
      department: '',
      countryCode: '',
      avatarUrl: '',
      createdBy: userProfile._id.toString(),
      updatedBy: userProfile._id.toString()
    };

    // Return user object directly to match frontend expectations
    res.json(user);

  } catch (error) {
    console.error('❌ Error in getUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching user',
      error: error.message
    });
  }
};

// Create a new user
export const createUser = async (req, res) => {
  try {
    const tenantId = req.userContext?.selectedOrgId || 
                     req.user?.tenantId || 
                     req.tenantId ||
                     req.tenant?.orgCode;
    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    const userData = req.body;

    // Create new UserProfile
    const userProfile = new UserProfile({
      tenantId,
      userId: userData.externalId || userData.userId || userData._id,
      kindeUserId: userData.authSource === 'kinde' ? userData.externalId : undefined,
      employeeCode: userData.employeeCode,
      personalInfo: {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        contactMobile: userData.contactMobile
      },
      status: {
        isActive: userData.isActive !== false
      }
    });

    await userProfile.save();

    console.log('✅ Created new user profile:', userProfile._id);

    // Return in the expected format
    const responseUser = {
      _id: userProfile._id.toString(),
      id: userProfile._id.toString(),
      employeeCode: userProfile.employeeCode || '',
      firstName: userProfile.personalInfo?.firstName || '',
      lastName: userProfile.personalInfo?.lastName || '',
      email: userProfile.personalInfo?.email || '',
      contactMobile: userProfile.personalInfo?.contactMobile || '',
      role: 'user',
      designation: 'user',
      isActive: userProfile.status?.isActive !== false,
      authSource: userProfile.kindeUserId ? 'kinde' : 'local',
      orgCode: tenantId,
      externalId: userProfile.kindeUserId || userProfile.userId,
      createdAt: userProfile.createdAt?.toISOString(),
      updatedAt: userProfile.updatedAt?.toISOString(),
      roles: [],
      permissions: [],
      roleDetails: [],
      zone: [],
      department: '',
      countryCode: '',
      avatarUrl: '',
      createdBy: req.user?.id || userProfile._id.toString(),
      updatedBy: req.user?.id || userProfile._id.toString()
    };

    // Return user object directly to match frontend expectations
    res.status(201).json(responseUser);

  } catch (error) {
    console.error('❌ Error in createUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while creating user',
      error: error.message
    });
  }
};

// Update an existing user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const tenantId = req.userContext?.selectedOrgId || 
                     req.user?.tenantId || 
                     req.tenantId ||
                     req.tenant?.orgCode;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    console.log('🔄 Updating user:', id, 'with data:', updateData);

    const userProfile = await UserProfile.findOneAndUpdate(
      { _id: id, tenantId },
      {
        employeeCode: updateData.employeeCode,
        'personalInfo.firstName': updateData.firstName,
        'personalInfo.lastName': updateData.lastName,
        'personalInfo.email': updateData.email,
        'personalInfo.contactMobile': updateData.contactMobile,
        'status.isActive': updateData.isActive,
        kindeUserId: updateData.authSource === 'kinde' ? updateData.externalId : undefined
      },
      { new: true }
    );

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return updated user in expected format
    const responseUser = {
      _id: userProfile._id.toString(),
      id: userProfile._id.toString(),
      employeeCode: userProfile.employeeCode || '',
      firstName: userProfile.personalInfo?.firstName || '',
      lastName: userProfile.personalInfo?.lastName || '',
      email: userProfile.personalInfo?.email || '',
      contactMobile: userProfile.personalInfo?.contactMobile || '',
      role: 'user',
      designation: 'user',
      isActive: userProfile.status?.isActive !== false,
      authSource: userProfile.kindeUserId ? 'kinde' : 'local',
      orgCode: tenantId,
      externalId: userProfile.kindeUserId || userProfile.userId,
      updatedAt: userProfile.updatedAt?.toISOString(),
      roles: [],
      permissions: [],
      roleDetails: [],
      zone: [],
      department: '',
      countryCode: '',
      avatarUrl: '',
      updatedBy: req.user?.id || userProfile._id.toString()
    };

    // Return user object directly to match frontend expectations
    res.json(responseUser);

  } catch (error) {
    console.error('❌ Error in updateUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating user',
      error: error.message
    });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.userContext?.selectedOrgId || 
                     req.user?.tenantId || 
                     req.tenantId ||
                     req.tenant?.orgCode;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    console.log('🗑️ Deleting user:', id, 'from tenant:', tenantId);

    const userProfile = await UserProfile.findOneAndDelete({
      _id: id,
      tenantId
    });

    if (!userProfile) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error in deleteUser:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while deleting user',
      error: error.message
    });
  }
};

// Bulk refresh permissions for external users
export const refreshPermissions = async (req, res) => {
  try {
    const { userIds, orgCode } = req.body;
    const tenantId = req.userContext?.selectedOrgId || 
                     req.user?.tenantId || 
                     req.tenantId ||
                     req.tenant?.orgCode ||
                     orgCode;

    if (!tenantId) {
      return res.status(400).json({ message: 'Tenant context required' });
    }

    console.log('🔄 Bulk refreshing permissions for users:', userIds);

    // For now, just mark users as synced
    // In a real implementation, this would sync with external systems
    const updatedUsers = await UserProfile.updateMany(
      {
        tenantId,
        $or: [
          { _id: { $in: userIds } },
          { userId: { $in: userIds } }
        ]
      },
      {
        lastSyncedAt: new Date(),
        'status.isActive': true
      }
    );

    console.log(`✅ Updated ${updatedUsers.modifiedCount} user profiles`);

    res.json({
      success: true,
      message: `Successfully refreshed permissions for ${updatedUsers.modifiedCount} users`,
      updatedCount: updatedUsers.modifiedCount
    });

  } catch (error) {
    console.error('❌ Error in refreshPermissions:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while refreshing permissions',
      error: error.message
    });
  }
};

// Default export for the router
export default {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  refreshPermissions
};
