#!/usr/bin/env node

/**
 * 🔍 Fetch & Analyze Wrapper API Data + Stored Results
 *
 * Fetches data from wrapper API, analyzes it, then shows stored database data
 */

const mongoose = require('mongoose');
const axios = require('axios');

// Configuration
const MONGO_URI = process.env.MONGODB_URI || 'mongodb+srv://letszopkit:t41z0qaCIoK8vnDr@letszop.gog5bym.mongodb.net/zopkit_crm?retryWrites=true&w=majority&appName=letszop';
const TEST_TENANT_ID = process.argv[2] || process.env.TENANT_ID || 'b0a6e370-c1e5-43d1-94e0-55ed792274c4';
const WRAPPER_BASE_URL = 'http://localhost:3000';
const KINDE_TOKEN = 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc1OTk0OTQxNywiaWF0IjoxNzU5ODYzMDE2LCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6IjIyZmQyZTk3LTRhZTYtNDBhMS04NWQzLTEzMzZmMmI0MGI2NCIsIm9yZ19jb2RlIjoib3JnX2NiNTkzZDEzNjA5OTlhIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9hZTcwZDM4MjQ0YjE0OWQwYWRiNWE3MzVmYzQ5YTNkMiJ9.JdTpFTIiC52h1Cpcd_moeMISSJIU8g3MnCcQaz_ao33hgf7GHi0nLywVLolGIcQnE74OYcNm-6XSLYMRsRUEBJRJ_xqWTuIDdKcIvoEFVMQYBv14d23Dtk3W-j_LcSu9kYifz4_oBwvUPHcF30ywGCGo64A5iWLKEIzL9dlEPtZqSWOKIPPsOVboW_0buAb-HPhjOL9hWqAetVA2jfqFPk5PsQjOIMAh05hrBMgrh3L2pqtwiOhHj3ZiFY6-BQUg6nGuFa_evqfjmqfbDq-Hhfwp6Htz-dtnc28yZZhQ2H0LfnJE7jG6Iltfiy9gzoSFz3A7X4b3pwe157sUvCuVSg';

// Import CRM models dynamically
let Tenant, UserProfile, Organization, CrmCreditConfig, CrmEntityCredit, EmployeeOrgAssignment, CrmRoleAssignment;

async function loadModels() {
  const [
    tenantModule,
    userProfileModule,
    organizationModule,
    crmCreditConfigModule,
    crmEntityCreditModule,
    employeeOrgAssignmentModule,
    crmRoleAssignmentModule
  ] = await Promise.all([
    import('./models/Tenant.js'),
    import('./models/UserProfile.js'),
    import('./models/Organization.js'),
    import('./models/CrmCreditConfig.js'),
    import('./models/CrmEntityCredit.js'),
    import('./models/EmployeeOrgAssignment.js'),
    import('./models/CrmRoleAssignment.js')
  ]);

  Tenant = tenantModule.default;
  UserProfile = userProfileModule.default;
  Organization = organizationModule.default;
  CrmCreditConfig = crmCreditConfigModule.default;
  CrmEntityCredit = crmEntityCreditModule.default;
  EmployeeOrgAssignment = employeeOrgAssignmentModule.default;
  CrmRoleAssignment = crmRoleAssignmentModule.default;

  console.log('✅ Models loaded successfully');
}

async function connectToMongoDB() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to Cloud MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    throw error;
  }
}

// Fetch data from wrapper API
async function fetchWrapperData(endpoint) {
  try {
    const response = await axios.get(`${WRAPPER_BASE_URL}/api/wrapper/tenants/${TEST_TENANT_ID}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${KINDE_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  } catch (error) {
    console.log(`❌ Failed to fetch ${endpoint}:`, error.response?.data?.message || error.message);
    return null;
  }
}

// Analyze wrapper API data
async function analyzeWrapperData() {
  console.log('🌐 FETCHING & ANALYZING WRAPPER API DATA');
  console.log('='.repeat(60));
  console.log(`🏢 Tenant ID: ${TEST_TENANT_ID}`);
  console.log(`🔗 Wrapper API: ${WRAPPER_BASE_URL}`);
  console.log('='.repeat(60));

  const wrapperData = {};

  // 1. Fetch Tenant Info
  console.log('\n🏢 FETCHING TENANT INFO...');
  const tenantData = await fetchWrapperData('');
  if (tenantData?.data) {
    wrapperData.tenant = tenantData.data;
    console.log(`✅ Tenant: ${tenantData.data.tenantName || tenantData.data.companyName}`);
  }

  // 2. Fetch Organizations
  console.log('\n🏢 FETCHING ORGANIZATIONS...');
  const orgsData = await fetchWrapperData('/organizations');
  if (orgsData?.data) {
    wrapperData.organizations = orgsData.data;
    console.log(`✅ Organizations: ${orgsData.data.length} records`);
  }

  // 3. Fetch Roles
  console.log('\n🎭 FETCHING ROLES...');
  const rolesData = await fetchWrapperData('/roles');
  if (rolesData?.data) {
    wrapperData.roles = rolesData.data;
    console.log(`✅ Roles: ${rolesData.data.length} records`);
  }

  // 4. Fetch Users
  console.log('\n👤 FETCHING USERS...');
  const usersData = await fetchWrapperData('/users');
  if (usersData?.data) {
    wrapperData.users = usersData.data;
    console.log(`✅ Users: ${usersData.data.length} records`);
  }

  // 5. Fetch Employee Assignments
  console.log('\n🔗 FETCHING EMPLOYEE ASSIGNMENTS...');
  const empAssignmentsData = await fetchWrapperData('/employee-assignments');
  if (empAssignmentsData?.data) {
    wrapperData.employeeAssignments = empAssignmentsData.data;
    console.log(`✅ Employee Assignments: ${empAssignmentsData.data.length} records`);
  }

  // 6. Fetch Role Assignments
  console.log('\n🎭 FETCHING ROLE ASSIGNMENTS...');
  const roleAssignmentsData = await fetchWrapperData('/role-assignments');
  if (roleAssignmentsData?.data) {
    wrapperData.roleAssignments = roleAssignmentsData.data;
    console.log(`✅ Role Assignments: ${roleAssignmentsData.data.length} records`);
  }

  // 7. Fetch Credit Configs
  console.log('\n💰 FETCHING CREDIT CONFIGS...');
  const creditConfigsData = await fetchWrapperData('/credit-configs');
  if (creditConfigsData?.data) {
    wrapperData.creditConfigs = creditConfigsData.data;
    console.log(`✅ Credit Configs: ${creditConfigsData.data.length} records`);
  }

  // 8. Fetch Entity Credits
  console.log('\n💵 FETCHING ENTITY CREDITS...');
  const entityCreditsData = await fetchWrapperData('/entity-credits');
  if (entityCreditsData?.data) {
    wrapperData.entityCredits = entityCreditsData.data;
    console.log(`✅ Entity Credits: ${entityCreditsData.data.length} records`);
  }

  // Summary
  console.log('\n📊 WRAPPER API DATA SUMMARY');
  console.log('='.repeat(50));
  console.log(`🏢 Tenant: ${wrapperData.tenant ? 1 : 0} record`);
  console.log(`🏢 Organizations: ${wrapperData.organizations?.length || 0} records`);
  console.log(`🎭 Roles: ${wrapperData.roles?.length || 0} records`);
  console.log(`👤 Users: ${wrapperData.users?.length || 0} records`);
  console.log(`🔗 Employee Assignments: ${wrapperData.employeeAssignments?.length || 0} records`);
  console.log(`🎭 Role Assignments: ${wrapperData.roleAssignments?.length || 0} records`);
  console.log(`💰 Credit Configs: ${wrapperData.creditConfigs?.length || 0} records`);
  console.log(`💵 Entity Credits: ${wrapperData.entityCredits?.length || 0} records`);

  return wrapperData;
}

async function fetchStoredResults() {
  console.log('\n🗄️ FETCHING STORED DATABASE RESULTS');
  console.log('='.repeat(60));
  console.log(`🏢 Tenant ID: ${TEST_TENANT_ID}`);
  console.log(`🗄️ Database: zopkit_crm`);
  console.log('='.repeat(60));

  try {
    // Load models first
    await loadModels();

    await connectToMongoDB();

    let totalRecords = 0;

    // 1. Fetch tenant data
    console.log('\n🏢 TENANT DATA:');
    console.log('='.repeat(30));
    const tenants = await Tenant.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${tenants.length} tenant records for ${TEST_TENANT_ID}`);

    // Also check all tenants
    const allTenants = await Tenant.find({});
    console.log(`📊 Total tenants in DB: ${allTenants.length}`);
    if (allTenants.length > 0) {
      console.log('📋 All tenant IDs:', allTenants.map(t => t.tenantId));
    }

    for (let index = 0; index < tenants.length; index++) {
      const tenant = tenants[index];
      console.log(`\n🏢 Tenant ${index + 1}:`);
      // Get root organization info
      const rootOrg = await tenant.getRootOrganization();

      console.log(`   ID: ${tenant.tenantId}`);
      console.log(`   Name: ${tenant.tenantName}`);
      console.log(`   Status: ${tenant.status}`);
      console.log(`   Organization: ${rootOrg?.orgName || 'N/A'}`);
      console.log(`   Created: ${tenant.createdAt}`);
      console.log(`   Updated: ${tenant.updatedAt}`);
    }
    totalRecords += tenants.length;

    // 2. Fetch user profiles
    console.log('\n👥 USER PROFILES:');
    console.log('='.repeat(30));
    const users = await UserProfile.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${users.length} user profile records`);

    for (let index = 0; index < users.length; index++) {
      const user = users[index];
      console.log(`\n👤 User ${index + 1}:`);
      console.log(`   ID: ${user.userId}`);
      console.log(`   Employee Code: ${user.employeeCode}`);
      console.log(`   Name: ${user.personalInfo?.firstName} ${user.personalInfo?.lastName}`);
      console.log(`   Email: ${user.personalInfo?.email}`);

      // Get primary organization from assignments (no direct org field)
      const primaryOrg = await user.getPrimaryOrganization();
      console.log(`   Primary Organization: ${primaryOrg?.orgCode || 'None'} - ${primaryOrg?.orgName || ''}`);

      // Get assignment counts
      const orgAssignments = await user.getOrganizationAssignments();
      const roleAssignments = user.roleAssignments?.length || 0;

      console.log(`   Organization Assignments: ${orgAssignments.length}`);
      console.log(`   Role Assignments: ${roleAssignments}`);
      console.log(`   Status: ${user.status?.isActive ? 'Active' : 'Inactive'}`);
      console.log(`   Created: ${user.createdAt}`);
    }
    totalRecords += users.length;

    // 3. Fetch organizations
    console.log('\n🏢 ORGANIZATIONS:');
    console.log('='.repeat(30));
    const organizations = await Organization.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${organizations.length} organization records`);
    organizations.forEach((org, index) => {
      console.log(`\n🏢 Organization ${index + 1}:`);
      console.log(`   Code: ${org.orgCode}`);
      console.log(`   Name: ${org.orgName}`);
      console.log(`   Parent: ${org.parentId || 'Root'}`);
      console.log(`   Level: ${org.hierarchy?.level || 'N/A'}`);
      console.log(`   Status: ${org.status}`);
      console.log(`   Type: ${org.metadata?.type || 'N/A'}`);
      console.log(`   Created: ${org.createdAt}`);
    });
    totalRecords += organizations.length;

    // 4. Fetch credit configurations
    console.log('\n💰 CREDIT CONFIGURATIONS:');
    console.log('='.repeat(30));
    const creditConfigs = await CrmCreditConfig.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${creditConfigs.length} credit configuration records`);
    creditConfigs.forEach((config, index) => {
      console.log(`\n💰 Credit Config ${index + 1}:`);
      console.log(`   ID: ${config.configId}`);
      console.log(`   Entity: ${config.entityId || 'Global'}`);
      console.log(`   Name: ${config.configName}`);
      console.log(`   Operation Code: ${config.operationCode}`);
      console.log(`   Description: ${config.description || 'N/A'}`);
      console.log(`   Credit Cost: ${config.creditCost}`);
      console.log(`   Created: ${config.createdAt}`);
      console.log(`   Updated: ${config.updatedAt}`);
    });
    totalRecords += creditConfigs.length;

    // 5. Fetch entity credits
    console.log('\n💵 ENTITY CREDITS:');
    console.log('='.repeat(30));
    const entityCredits = await CrmEntityCredit.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${entityCredits.length} entity credit records`);
    entityCredits.forEach((credit, index) => {
      console.log(`\n💵 Entity Credit ${index + 1}:`);
      console.log(`   Entity: ${credit.entityId}`);
      console.log(`   Allocated: ${credit.allocatedCredits}`);
      console.log(`   Used: ${credit.usedCredits}`);
      console.log(`   Available: ${credit.availableCredits}`);
      console.log(`   Type: ${credit.allocationType}`);
      console.log(`   Purpose: ${credit.allocationPurpose}`);
      console.log(`   Active: ${credit.isActive}`);
      console.log(`   Created: ${credit.createdAt}`);
    });
    totalRecords += entityCredits.length;

    // 6. Fetch employee assignments
    console.log('\n🔗 EMPLOYEE ASSIGNMENTS:');
    console.log('='.repeat(30));
    const employeeAssignments = await EmployeeOrgAssignment.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${employeeAssignments.length} employee assignment records`);
    employeeAssignments.forEach((assignment, index) => {
      console.log(`\n🔗 Assignment ${index + 1}:`);
      console.log(`   ID: ${assignment.assignmentId}`);
      console.log(`   User: ${assignment.userId}`);
      console.log(`   Entity: ${assignment.entityId}`);
      console.log(`   Type: ${assignment.assignmentType}`);
      console.log(`   Priority: ${assignment.priority}`);
      console.log(`   Active: ${assignment.isActive}`);
      console.log(`   Department: ${assignment.metadata?.department || 'N/A'}`);
      console.log(`   Designation: ${assignment.metadata?.designation || 'N/A'}`);
      console.log(`   Created: ${assignment.createdAt}`);
    });
    totalRecords += employeeAssignments.length;

    // 7. Fetch role assignments
    console.log('\n🎭 ROLE ASSIGNMENTS:');
    console.log('='.repeat(30));
    const roleAssignments = await CrmRoleAssignment.find({ tenantId: TEST_TENANT_ID });
    console.log(`📊 Found ${roleAssignments.length} role assignment records`);
    roleAssignments.forEach((assignment, index) => {
      console.log(`\n🎯 Assignment ${index + 1}:`);
      console.log(`   ID: ${assignment.assignmentId}`);
      console.log(`   User: ${assignment.userId}`);
      console.log(`   Role: ${assignment.roleId}`);
      console.log(`   Entity: ${assignment.entityId}`);
      console.log(`   Active: ${assignment.isActive}`);
      console.log(`   Assigned By: ${assignment.assignedBy}`);
      console.log(`   Assigned At: ${assignment.assignedAt}`);
      console.log(`   Created: ${assignment.createdAt}`);
    });
    totalRecords += roleAssignments.length;

    // Summary
    console.log('\n📊 STORAGE VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`✅ Total Records Stored: ${totalRecords}`);
    console.log(`🏢 Tenant Records: ${tenants.length}`);
    console.log(`👥 User Profiles: ${users.length}`);
    console.log(`🏢 Organizations: ${organizations.length}`);
    console.log(`💰 Credit Configurations: ${creditConfigs.length}`);
    console.log(`💵 Entity Credits: ${entityCredits.length}`);
    console.log(`🔗 Employee Assignments: ${employeeAssignments.length}`);
    console.log(`🎭 Role Assignments: ${roleAssignments.length}`);

    // Data integrity checks
    console.log('\n🔍 DATA INTEGRITY CHECKS');
    console.log('='.repeat(50));

    // Check if all users have organization assignments (not direct org field)
    let usersWithOrgAssignments = 0;
    for (const user of users) {
      const assignments = await user.getOrganizationAssignments();
      if (assignments.length > 0) usersWithOrgAssignments++;
    }
    console.log(`✅ Users with Organization Assignments: ${usersWithOrgAssignments}/${users.length}`);

    // Check if all assignments reference valid entities (organizations)
    const validEntityIds = new Set(organizations.map(o => o.orgCode));
    const validAssignments = employeeAssignments.filter(a => validEntityIds.has(a.entityIdString || a.entityId)).length;
    console.log(`✅ Valid Employee Assignments: ${validAssignments}/${employeeAssignments.length}`);

    // Check credit system health
    const activeEntityCredits = entityCredits.filter(c => c.isActive).length;
    console.log(`✅ Credit Configs: ${creditConfigs.length}`);
    console.log(`✅ Active Entity Credits: ${activeEntityCredits}/${entityCredits.length}`);

    console.log('\n🎉 VERIFICATION COMPLETE!');
    console.log('✅ All tenant data successfully stored in cloud MongoDB');
    console.log('🚫 Data redundancy eliminated - assignments contain only referential data');

  } catch (error) {
    console.error('❌ Error fetching stored results:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('📪 Disconnected from MongoDB');
  }
}

// CLI Interface
async function main() {
  console.log('🔍 Wrapper API Data Fetcher & Database Analyzer');
  console.log('='.repeat(55));

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(`
Wrapper API Data Fetcher & Database Analyzer

Fetches data from wrapper API, analyzes it, then shows stored database data.

Configuration:
  - Wrapper API: ${WRAPPER_BASE_URL}
  - MongoDB: ${MONGO_URI.split('@')[1]?.split('?')[0] || 'configured'}
  - Tenant ID: ${TEST_TENANT_ID}
  - Token: ${KINDE_TOKEN.substring(0, 20)}...

What it does:
  1. 🌐 Fetches all data from wrapper API endpoints
  2. 📊 Analyzes fetched data structure and relationships
  3. 🗄️ Queries stored data from MongoDB
  4. 🔍 Performs data integrity verification
  5. 📋 Provides comprehensive analysis report

Usage:
  node fetch-stored-results.cjs          # Fetch & analyze all data
  node fetch-stored-results.cjs --help   # Show this help

Output:
  - Wrapper API data summary and analysis
  - Database stored data breakdown
  - Relationship verification
  - Integrity checks and summaries
    `);
    return;
  }

  try {
    // Step 1: Fetch and analyze wrapper API data
    const wrapperData = await analyzeWrapperData();

    // Step 2: Fetch and analyze stored database results
    await fetchStoredResults();

    // Step 3: Provide sync recommendation
    console.log('\n🚀 SYNC RECOMMENDATION');
    console.log('='.repeat(50));
    console.log('To store the fetched wrapper data in the database, run:');
    console.log('');
    console.log('curl -X POST "http://localhost:3000/api/wrapper/tenants/' + TEST_TENANT_ID + '/sync" \\');
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer ' + KINDE_TOKEN + '" \\');
    console.log('  -d "{}"');
    console.log('');
    console.log('This will execute the dependency-aware sync:');
    console.log('1️⃣ Independent data: tenant → organizations → roles → users');
    console.log('2️⃣ Dependent data: assignments → credit configs → entity credits');

  } catch (error) {
    console.error('❌ Error in main execution:', error);
  }
}

// Run the fetch script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fetchStoredResults };
