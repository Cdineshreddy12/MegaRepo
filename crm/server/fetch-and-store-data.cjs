#!/usr/bin/env node

/**
 * 🚀 Fetch and Store Wrapper Data
 *
 * Fetches complete tenant data from wrapper API and stores it in CRM database
 */

const axios = require('axios');
const mongoose = require('mongoose');

// Configuration
const WRAPPER_BASE_URL = process.env.WRAPPER_API_BASE_URL || 'http://localhost:3000/api/wrapper';
const CRM_MONGO_URI = process.env.MONGODB_URI;
if (!CRM_MONGO_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}
// Get tenant ID from command line argument, environment variable, or default
const TEST_TENANT_ID = process.argv[2] || process.env.TENANT_ID || 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
const TEST_EMAIL = 'reddycdinesh41@gmail.com'; // Test user email
const AUTH_TOKEN = process.env.WRAPPER_AUTH_TOKEN || process.env.KINDE_TOKEN;
if (!AUTH_TOKEN) {
  console.warn('⚠️  WRAPPER_AUTH_TOKEN or KINDE_TOKEN environment variable not set. Some operations may fail.');
}
const CLEAR_EXISTING_DATA = process.argv.includes('--clear') || process.argv.includes('-c');

// Import CRM models dynamically
let Tenant, UserProfile, Organization, CrmCreditConfig, CrmEntityCredit, EmployeeOrgAssignment, CrmRoleAssignment, CrmRole;

async function loadModels() {
  const [
    tenantModule,
    userProfileModule,
    organizationModule,
    crmCreditConfigModule,
    crmEntityCreditModule,
    employeeOrgAssignmentModule,
    crmRoleAssignmentModule,
    crmRoleModule
  ] = await Promise.all([
    import('./models/Tenant.js'),
    import('./models/UserProfile.js'),
    import('./models/Organization.js'),
    import('./models/CrmCreditConfig.js'),
    import('./models/CrmEntityCredit.js'),
    import('./models/EmployeeOrgAssignment.js'),
    import('./models/CrmRoleAssignment.js'),
    import('./models/CrmRole.js')
  ]);

  Tenant = tenantModule.default;
  UserProfile = userProfileModule.default;
  Organization = organizationModule.default;
  CrmCreditConfig = crmCreditConfigModule.default;
  CrmEntityCredit = crmEntityCreditModule.default;
  EmployeeOrgAssignment = employeeOrgAssignmentModule.default;
  CrmRoleAssignment = crmRoleAssignmentModule.default;
  CrmRole = crmRoleModule.default;

  console.log('✅ Models loaded successfully');
}

async function connectToMongoDB() {
  try {
    await mongoose.connect(CRM_MONGO_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

async function clearExistingTenantData(tenantId) {
  console.log('🧹 Clearing existing tenant data...');

  try {
    // First, check what data exists
    const tenantCount = await Tenant.countDocuments({ tenantId });
    const userCount = await UserProfile.countDocuments({ tenantId });
    console.log(`   📊 Found ${tenantCount} tenant, ${userCount} user records before clearing`);

    // Clear ALL data for this tenant across all collections
    // Use more aggressive clearing to handle any schema mismatches

    // Clear tenant data
    const tenantDeleted = await Tenant.deleteMany({ tenantId });
    console.log(`   🏢 Cleared ${tenantDeleted.deletedCount} tenant records`);

    // Clear user profiles
    const userDeleted = await UserProfile.deleteMany({ tenantId });
    console.log(`   👤 Cleared ${userDeleted.deletedCount} user profile records`);

    // Clear organizations
    const orgDeleted = await Organization.deleteMany({ tenantId });
    console.log(`   🏢 Cleared ${orgDeleted.deletedCount} organization records`);

    // Clear credit configs
    const creditDeleted = await CrmCreditConfig.deleteMany({ tenantId });
    console.log(`   💰 Cleared ${creditDeleted.deletedCount} credit config records`);

    // Clear entity credits (drop collection to remove old indexes)
    try {
      await CrmEntityCredit.collection.drop();
      console.log(`   💵 Dropped entity credit collection (removed old indexes)`);
    } catch (dropError) {
      // Collection might not exist, that's ok
      const entityCreditDeleted = await CrmEntityCredit.deleteMany({ tenantId });
      console.log(`   💵 Cleared ${entityCreditDeleted.deletedCount} entity credit records`);
    }

    // Clear employee assignments
    const empAssignDeleted = await EmployeeOrgAssignment.deleteMany({ tenantId });
    console.log(`   🔗 Cleared ${empAssignDeleted.deletedCount} employee assignment records`);

    // Clear role assignments (drop collection to remove old indexes)
    try {
      await CrmRoleAssignment.collection.drop();
      console.log(`   🎭 Dropped role assignment collection (removed old indexes)`);
    } catch (dropError) {
      // Collection might not exist, that's ok
      const roleAssignDeleted = await CrmRoleAssignment.deleteMany({ tenantId });
      console.log(`   🎭 Cleared ${roleAssignDeleted.deletedCount} role assignment records`);
    }

    // Clear roles
    const roleDeleted = await CrmRole.deleteMany({ tenantId });
    console.log(`   👥 Cleared ${roleDeleted.deletedCount} role records`);

    console.log('✅ Existing tenant data cleared');

  } catch (error) {
    console.error('❌ Error clearing existing data:', error);
    throw error;
  }
}

async function fetchFromWrapper(endpoint) {
  try {
    console.log(`📡 Fetching: ${WRAPPER_BASE_URL}${endpoint}`);

    const response = await axios.get(`${WRAPPER_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (response.status === 200 && response.data.success) {
      console.log(`✅ Fetched ${response.data.data.length} records`);
      return response.data.data;
    } else {
      throw new Error(`Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.error(`❌ Failed to fetch ${endpoint}:`, error.message);
    throw error;
  }
}

async function storeData() {
  console.log('🚀 Starting Wrapper Data Fetch and Store Process');
  console.log('='.repeat(60));

  if (CLEAR_EXISTING_DATA) {
    console.log('⚠️  CLEAR_EXISTING_DATA flag is set - will clear existing tenant data first');
  }

  try {
    // Load models first
    await loadModels();

    // Connect to MongoDB
    await connectToMongoDB();

    let totalRecords = 0;
    const tenantId = TEST_TENANT_ID;

    // Clear existing data if requested
    if (CLEAR_EXISTING_DATA) {
      await clearExistingTenantData(tenantId);
    }

    // 1. Create tenant record (using known tenant name from wrapper API)
    console.log('\n🏢 Step 1: Creating tenant record...');
    const storedTenant = await Tenant.findOneAndUpdate(
      { tenantId },
      {
        tenantId,
        tenantName: 'dinesh', // Known tenant name from wrapper API
        status: 'active',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      { upsert: true, new: true }
    );
    console.log(`✅ Stored tenant: ${storedTenant.tenantName} (${tenantId})`);
    totalRecords++;

    // 2. Fetch and store organizations
    console.log('\n🏢 Step 2: Fetching organizations from wrapper API...');
    const organizationsData = await fetchFromWrapper(`/tenants/${tenantId}/organizations`);
    console.log(`   📡 Fetched ${organizationsData.length} organizations`);

    // Phase 1: Store organizations with string parentId first
    for (const orgData of organizationsData) {
      const organization = await Organization.findOneAndUpdate(
        { tenantId, orgCode: orgData.orgCode },
        {
          tenantId,
          orgCode: orgData.orgCode,
          orgName: orgData.orgName,
          status: orgData.status || 'active',
          hierarchy: orgData.hierarchy || { level: 0 },
          parentIdString: orgData.parentId || null, // Store as string first
          metadata: orgData.metadata || {},
          createdAt: orgData.createdAt ? new Date(orgData.createdAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored organization: ${organization.orgName} (${organization.orgCode})`);
    }

    // Phase 2: Resolve parentId references
    console.log('   🔗 Resolving parent organization references...');
    for (const orgData of organizationsData) {
      if (orgData.parentId) {
        // Find parent organization by orgCode
        const parentOrg = await Organization.findOne({ tenantId, orgCode: orgData.parentId });
        if (parentOrg) {
          await Organization.findOneAndUpdate(
            { tenantId, orgCode: orgData.orgCode },
            { parentId: parentOrg._id },
            { new: true }
          );
          console.log(`   ✅ Resolved parent for ${orgData.orgCode} -> ${parentOrg.orgCode}`);
        }
      }
    }
    totalRecords += organizationsData.length;

    // 3. Fetch and store user profiles
    console.log('\n👤 Step 3: Fetching users from wrapper API...');
    const usersData = await fetchFromWrapper(`/tenants/${tenantId}/users`);
    console.log(`   📡 Fetched ${usersData.length} users`);

    for (const userData of usersData) {
      const userProfile = await UserProfile.findOneAndUpdate(
        { tenantId, userId: userData.userId },
        {
          tenantId,
          userId: userData.userId,
          employeeCode: userData.employeeCode || userData.userId,
          personalInfo: {
            firstName: userData.personalInfo?.firstName || 'Unknown',
            lastName: userData.personalInfo?.lastName || '',
            email: userData.personalInfo?.email || 'unknown@example.com'
          },
          status: {
            isActive: userData.status?.isActive !== false,
            lastActivityAt: userData.status?.lastActivityAt ? new Date(userData.status.lastActivityAt) : new Date()
          },
          lastSyncedAt: userData.updatedAt ? new Date(userData.updatedAt) : new Date(),
          createdAt: userData.createdAt ? new Date(userData.createdAt) : new Date(),
          updatedAt: new Date()
          // organization, roles removed - now derived from relationships
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored user profile: ${userProfile.personalInfo.firstName} ${userProfile.personalInfo.lastName} (${userProfile.personalInfo.email})`);
    }
    totalRecords += usersData.length;

    // 4. Fetch and store roles
    console.log('\n👥 Step 4: Fetching roles from wrapper API...');
    const rolesData = await fetchFromWrapper(`/tenants/${tenantId}/roles`);
    console.log(`   📡 Fetched ${rolesData.length} roles`);

    for (const roleData of rolesData) {
      const role = await CrmRole.findOneAndUpdate(
        { tenantId, roleId: roleData.roleId },
        {
          tenantId,
          roleId: roleData.roleId,
          roleName: roleData.roleName,
          permissions: roleData.permissions || [],
          priority: roleData.priority || 1,
          isActive: roleData.isActive !== false,
          description: roleData.description || '',
          createdAt: roleData.createdAt ? new Date(roleData.createdAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored role: ${role.roleName} (${role.roleId})`);
    }
    totalRecords += rolesData.length;

    // 5. Fetch and store credit configurations
    console.log('\n💰 Step 5: Fetching credit configurations from wrapper API...');
    const creditConfigsData = await fetchFromWrapper(`/tenants/${tenantId}/credit-configs`);
    console.log(`   📡 Fetched ${creditConfigsData.length} credit configurations`);

    for (const configData of creditConfigsData) {
      const creditConfig = await CrmCreditConfig.findOneAndUpdate(
        { tenantId, configId: configData.configId },
        {
          tenantId,
          configId: configData.configId,
          entityIdString: configData.entityId || tenantId, // Use entityId from wrapper API or fallback to tenantId
          configName: configData.configName || configData.operationName || configData.operationCode,
          operationCode: configData.operationCode,
          creditCost: configData.creditCost || 1,
          description: configData.description || `Credit config for ${configData.operationCode}`,
          metadata: {
            riskLevel: configData.riskLevel,
            category: configData.category
          },
          createdAt: configData.updatedAt ? new Date(configData.updatedAt) : new Date(),
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored credit config: ${creditConfig.operationCode} (${creditConfig.creditCost} credits)`);
    }
    totalRecords += creditConfigsData.length;

    // 6. Fetch and store entity credits
    console.log('\n💳 Step 6: Fetching entity credits from wrapper API...');
    const entityCreditsData = await fetchFromWrapper(`/tenants/${tenantId}/entity-credits`);
    console.log(`   📡 Fetched ${entityCreditsData.length} entity credits`);

    // Phase 1: Store with string IDs first
    for (const creditData of entityCreditsData) {
      const allocatedCredits = creditData.allocatedCredits || 1000;
      const usedCredits = creditData.usedCredits || 0;
      const availableCredits = creditData.availableCredits || Math.max(0, allocatedCredits - usedCredits);

      // Check if entity credit already exists
      const existingCredit = await CrmEntityCredit.findOne({ tenantId, entityIdString: creditData.entityId });

      let entityCredit;
      if (existingCredit) {
        // Update existing record
        entityCredit = await CrmEntityCredit.findOneAndUpdate(
          { tenantId, entityIdString: creditData.entityId },
          {
            allocatedCredits,
            availableCredits,
            usedCredits,
            allocationType: creditData.allocationType || 'organization',
            allocationPurpose: creditData.allocationPurpose || 'general_operations',
            status: creditData.status || 'active',
            isActive: creditData.isActive !== false,
            allocationSource: creditData.allocationSource || 'system',
            allocatedByString: creditData.allocatedBy,
            allocatedAt: creditData.allocatedAt ? new Date(creditData.allocatedAt) : new Date(),
            updatedAt: new Date()
          },
          { new: true }
        );
      } else {
        // Create new record
        entityCredit = new CrmEntityCredit({
          tenantId,
          entityIdString: creditData.entityId,
          allocatedCredits,
          availableCredits,
          usedCredits,
          targetApplication: 'crm',
          allocationType: creditData.allocationType || 'organization',
          allocationPurpose: creditData.allocationPurpose || 'general_operations',
          status: creditData.status || 'active',
          isActive: creditData.isActive !== false,
          allocationSource: creditData.allocationSource || 'system',
          allocatedByString: creditData.allocatedBy,
          allocatedAt: creditData.allocatedAt ? new Date(creditData.allocatedAt) : new Date(),
          createdAt: creditData.createdAt ? new Date(creditData.createdAt) : new Date(),
          updatedAt: new Date()
        });
        await entityCredit.save();
      }
      console.log(`   ✅ Stored entity credits: ${entityCredit.entityIdString} (${entityCredit.allocatedCredits} credits)`);
    }

    // Phase 2: Resolve ObjectId references
    console.log('   🔗 Resolving entity credit references...');
    for (const creditData of entityCreditsData) {
      // Find organization by orgCode
      const organization = await Organization.findOne({ tenantId, orgCode: creditData.entityId });
      const allocatedByUser = creditData.allocatedBy ? await UserProfile.findOne({ tenantId, userId: creditData.allocatedBy }) : null;

      if (organization) {
        const updateData = { entityId: organization._id };
        if (allocatedByUser) {
          updateData.allocatedBy = allocatedByUser._id;
        }

        await CrmEntityCredit.findOneAndUpdate(
          { tenantId, entityIdString: creditData.entityId },
          updateData,
          { new: true }
        );
        console.log(`   ✅ Resolved references for entity credit ${creditData.entityId}`);
      }
    }
    totalRecords += entityCreditsData.length;

    // 7. Fetch and store employee assignments
    console.log('\n👔 Step 7: Fetching employee assignments from wrapper API...');
    const employeeAssignmentsData = await fetchFromWrapper(`/tenants/${tenantId}/employee-assignments`);
    console.log(`   📡 Fetched ${employeeAssignmentsData.length} employee assignments`);

    // Phase 1: Store with string IDs first
    for (const assignmentData of employeeAssignmentsData) {
      const empAssignment = await EmployeeOrgAssignment.findOneAndUpdate(
        { tenantId, assignmentId: assignmentData.assignmentId },
        {
          tenantId,
          assignmentId: assignmentData.assignmentId,
          userIdString: assignmentData.userId,
          entityIdString: assignmentData.entityId,
          assignmentType: assignmentData.assignmentType || 'primary',
          priority: assignmentData.priority || 1,
          isActive: assignmentData.isActive !== false,
          assignedAt: assignmentData.assignedAt ? new Date(assignmentData.assignedAt) : new Date(),
          expiresAt: assignmentData.expiresAt ? new Date(assignmentData.expiresAt) : null,
          metadata: assignmentData.metadata || {}
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored employee assignment: ${empAssignment.assignmentId}`);
    }

    // Phase 2: Resolve ObjectId references
    console.log('   🔗 Resolving employee assignment references...');
    for (const assignmentData of employeeAssignmentsData) {
      // Find user and organization by their string IDs
      const user = await UserProfile.findOne({ tenantId, userId: assignmentData.userId });
      const organization = await Organization.findOne({ tenantId, orgCode: assignmentData.entityId });

      console.log(`   🔍 Resolving assignment ${assignmentData.assignmentId}:`);
      console.log(`      User ${assignmentData.userId}: ${user ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`      Org ${assignmentData.entityId}: ${organization ? 'FOUND' : 'NOT FOUND'}`);

      if (user && organization) {
        await EmployeeOrgAssignment.findOneAndUpdate(
          { tenantId, assignmentId: assignmentData.assignmentId },
          {
            userId: user._id,
            entityId: organization._id
          },
          { new: true }
        );
        console.log(`   ✅ Resolved references for assignment ${assignmentData.assignmentId}`);
      } else {
        console.log(`   ⚠️ Could not resolve references for assignment ${assignmentData.assignmentId}`);
      }
    }
    totalRecords += employeeAssignmentsData.length;

    // 8. Fetch and store role assignments
    console.log('\n🔐 Step 8: Fetching role assignments from wrapper API...');
    const roleAssignmentsData = await fetchFromWrapper(`/tenants/${tenantId}/role-assignments`);
    console.log(`   📡 Fetched ${roleAssignmentsData.length} role assignments`);

    // Phase 1: Store with string IDs first
    for (const assignmentData of roleAssignmentsData) {
      const roleAssignment = await CrmRoleAssignment.findOneAndUpdate(
        { tenantId, assignmentId: assignmentData.assignmentId },
        {
          tenantId,
          assignmentId: assignmentData.assignmentId,
          userIdString: assignmentData.userId,
          roleIdString: assignmentData.roleId,
          entityIdString: assignmentData.entityId,
          isActive: assignmentData.isActive !== false,
          assignedAt: assignmentData.assignedAt ? new Date(assignmentData.assignedAt) : new Date(),
          expiresAt: assignmentData.expiresAt ? new Date(assignmentData.expiresAt) : null,
          metadata: assignmentData.metadata || {}
        },
        { upsert: true, new: true }
      );
      console.log(`   ✅ Stored role assignment: ${roleAssignment.assignmentId}`);
    }

    // Phase 2: Resolve ObjectId references
    console.log('   🔗 Resolving role assignment references...');
    for (const assignmentData of roleAssignmentsData) {
      // Find user, role, and organization by their string IDs
      const user = await UserProfile.findOne({ tenantId, userId: assignmentData.userId });
      const role = await CrmRole.findOne({ tenantId, roleId: assignmentData.roleId });
      const organization = await Organization.findOne({ tenantId, orgCode: assignmentData.entityId });

      console.log(`   🔍 Resolving role assignment ${assignmentData.assignmentId}:`);
      console.log(`      User ${assignmentData.userId}: ${user ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`      Role ${assignmentData.roleId}: ${role ? 'FOUND' : 'NOT FOUND'}`);
      console.log(`      Org ${assignmentData.entityId}: ${organization ? 'FOUND' : 'NOT FOUND'}`);

      if (user && role && organization) {
        await CrmRoleAssignment.findOneAndUpdate(
          { tenantId, assignmentId: assignmentData.assignmentId },
          {
            userId: user._id,
            roleId: role._id,
            entityId: organization._id
          },
          { new: true }
        );
        console.log(`   ✅ Resolved references for role assignment ${assignmentData.assignmentId}`);
      } else {
        console.log(`   ⚠️ Could not resolve references for role assignment ${assignmentData.assignmentId}`);
      }
    }
    totalRecords += roleAssignmentsData.length;

    // 9. Update user profiles with assignment references
    console.log('\n👤 Step 9: Updating user profiles with assignment references...');

    // Get all users for this tenant
    const allUsers = await UserProfile.find({ tenantId }).select('userId').lean();

    for (const user of allUsers) {
      // Find role assignments for this user (use userIdString since ObjectId may not be resolved)
      const userRoleAssignments = await CrmRoleAssignment.find({
        tenantId,
        userIdString: user.userId
      }).select('_id').lean();

      // Find organization assignments for this user (use userIdString since ObjectId may not be resolved)
      const userOrgAssignments = await EmployeeOrgAssignment.find({
        tenantId,
        userIdString: user.userId
      }).select('_id').lean();

      // Update user profile with references
      await UserProfile.findOneAndUpdate(
        { tenantId, userId: user.userId },
        {
          roleAssignments: userRoleAssignments.map(ra => ra._id),
          organizationAssignments: userOrgAssignments.map(oa => oa._id)
        },
        { new: true }
      );

      console.log(`   ✅ Updated user ${user.userId}: ${userRoleAssignments.length} role assignments, ${userOrgAssignments.length} org assignments`);
    }

    console.log('\n🎉 Data fetch and store completed successfully!');
    console.log(`📊 Total records processed: ${totalRecords}`);
    console.log(`🏢 Tenant: ${tenantId}`);
    console.log(`👤 Users: ${usersData.length}`);
    console.log(`🏢 Organizations: ${organizationsData.length}`);
    console.log(`👥 Roles: ${rolesData.length}`);
    console.log(`💰 Credit Configs: ${creditConfigsData.length}`);
    console.log(`💳 Entity Credits: ${entityCreditsData.length}`);
    console.log(`👔 Employee Assignments: ${employeeAssignmentsData.length}`);
    console.log(`🔐 Role Assignments: ${roleAssignmentsData.length}`);

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('📪 Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Data fetch and store failed:', error);
    throw error;
  }
}

// Main function
async function main() {
  console.log('🚀 Wrapper Data Fetch and Store');
  console.log('='.repeat(50));

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Wrapper Data Fetch and Store

Fetches user tenant data from wrapper API and creates demo data in CRM database.

Configuration:
  - Wrapper API: ${WRAPPER_BASE_URL}
  - MongoDB: ${CRM_MONGO_URI.split('@')[1]?.split('?')[0] || 'configured'}
  - Test Email: ${TEST_EMAIL}

Options:
  --clear, -c    Clear existing tenant data before storing new data
  --help, -h     Show this help message

Usage:
  node fetch-and-store-data.cjs                    # Store data (skip if exists)
  node fetch-and-store-data.cjs --clear           # Clear existing data first
  node fetch-and-store-data.cjs --help            # Show help

Data Flow:
1. Fetch user tenant info from wrapper API
2. Create tenant record
3. Create user profile
4. Create demo organization (if entityId provided)
5. Create employee organization assignment
6. Create demo role and role assignment
7. Create credit configuration and entity credits

⚠️  WARNING: --clear will delete ALL existing tenant data permanently
    `);
    return;
  }

  await storeData();
}

// Run the fetch and store process
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { storeData };
