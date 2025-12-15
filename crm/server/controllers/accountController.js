import { validationResult } from 'express-validator';
import mongoose from 'mongoose';
import Account from '../models/Account.js';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import wrapperApiService from '../services/wrapperApiService.js';
import { getEffectiveUser, getPermissionFilters } from '../utils/authHelpers.js';

// Define common fields for populate to avoid repetition
const commonPopulateFields = 'firstName lastName contactMobile email role';

/**
 * Helper: Get user's primary organization orgCode
 * This ensures accounts are always created with orgCode to prevent data isolation issues
 */
export async function getUserPrimaryOrgCode(userId, tenantId) {
  try {
    console.log(`🔍 Getting primary orgCode for user: ${userId}, tenant: ${tenantId}`);

    // Import EmployeeOrgAssignment dynamically to avoid circular imports
    const { default: EmployeeOrgAssignment } = await import('../models/EmployeeOrgAssignment.js');

    // Find the user's primary organization assignment
    const primaryAssignment = await EmployeeOrgAssignment.findOne({
      userIdString: userId,
      assignmentType: 'primary',
      isActive: true
    });

    if (primaryAssignment && primaryAssignment.entityIdString) {
      console.log(`✅ Found primary orgCode: ${primaryAssignment.entityIdString} for user: ${userId}`);
      return primaryAssignment.entityIdString;
    }

    // If no primary assignment found, try to find any active assignment
    const anyAssignment = await EmployeeOrgAssignment.findOne({
      userIdString: userId,
      isActive: true
    });

    if (anyAssignment && anyAssignment.entityIdString) {
      console.log(`⚠️ No primary assignment found, using first active orgCode: ${anyAssignment.entityIdString} for user: ${userId}`);
      return anyAssignment.entityIdString;
    }

    console.warn(`⚠️ No organization assignment found for user: ${userId}`);
    return null;
  } catch (error) {
    console.error(`❌ Error getting primary orgCode for user ${userId}:`, error.message);
    return null;
  }
}

/**
 * Normalize account data to ensure consistent response structure
 * Handles missing fields, ensures customFields is always an object, etc.
 */
function normalizeAccountData(account) {
  if (!account) return account;

  const normalized = { ...account };

  // Ensure customFields is always an object, never undefined/null
  if (!normalized.customFields || typeof normalized.customFields !== 'object') {
    normalized.customFields = {};
  }

  // Ensure formTemplateId is always present (even if null)
  if (!normalized.hasOwnProperty('formTemplateId')) {
    normalized.formTemplateId = null;
  }

  // Ensure standard fields have defaults
  const defaultFields = {
    status: 'active',
    accountType: 'Public',
    ownershipType: 'public',
    annualRevenue: 0,
    industry: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    segment: '',
    zone: '',
    employeesCount: 0,
    invoicing: 'email',
    creditTerm: '30_days',
    gstNo: ''
  };

  // Apply defaults for missing fields
  Object.keys(defaultFields).forEach(field => {
    if (!normalized.hasOwnProperty(field) || normalized[field] === null || normalized[field] === undefined || normalized[field] === '') {
      if (defaultFields[field] !== '' || !normalized[field]) {
        normalized[field] = defaultFields[field];
      }
    }
  });

  // Ensure createdAt and updatedAt are properly formatted
  if (normalized.createdAt && typeof normalized.createdAt === 'string') {
    normalized.createdAt = new Date(normalized.createdAt);
  }
  if (normalized.updatedAt && typeof normalized.updatedAt === 'string') {
    normalized.updatedAt = new Date(normalized.updatedAt);
  }

  return normalized;
}

// Simplified user population for accounts (similar to contacts)
async function populateUserInfo(accounts, orgCode, req = null) {
  if (!accounts) return accounts;

  const list = Array.isArray(accounts) ? accounts : [accounts];

  // Collect all unique user IDs from createdBy and assignedTo
  const allIds = new Set();
  list.forEach(acc => {
    if (acc.createdBy) allIds.add(acc.createdBy.toString());
    if (acc.assignedTo) allIds.add(acc.assignedTo.toString());
  });

  if (allIds.size === 0) return Array.isArray(accounts) ? list : list[0];

  console.log('🔍 populateUserInfo - Processing accounts:', list.length);
  console.log('🔍 User IDs to resolve:', Array.from(allIds));
  console.log('🔍 Using tenant/orgCode:', orgCode);

  // Separate ObjectIds and non-ObjectIds
  const allIdsArray = Array.from(allIds);
  const objectIds = allIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id));
  const uuidStrings = allIdsArray.filter(id => !mongoose.Types.ObjectId.isValid(id));

  console.log('🔍 ObjectIds to search:', objectIds);
  console.log('🔍 UUID strings to search:', uuidStrings);

  // Query UserProfile first with tenant filter, then without if needed
  let userProfiles = await UserProfile.find({
    tenantId: orgCode,
    $or: [
      { _id: { $in: objectIds } },
      { userId: { $in: allIdsArray } },
      { employeeCode: { $in: allIdsArray } }
    ]
  }).select('userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id');

  // If we didn't find all users, try without tenant filter
  if (userProfiles.length < allIds.size) {
    console.log(`🔄 Found ${userProfiles.length}/${allIds.size} users with tenant filter, trying without tenant filter...`);
    const remainingIds = allIdsArray.filter(id => !userProfiles.some(p => p._id.toString() === id || p.userId === id || p.employeeCode === id));

    if (remainingIds.length > 0) {
      const additionalProfiles = await UserProfile.find({
        $or: [
          { _id: { $in: remainingIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
          { userId: { $in: remainingIds } },
          { employeeCode: { $in: remainingIds } }
        ]
      }).select('userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id');

      console.log(`✅ Found ${additionalProfiles.length} additional profiles without tenant filter`);
      userProfiles = userProfiles.concat(additionalProfiles);
    }
  }

  // If still missing users, try User collection
  if (userProfiles.length < allIds.size) {
    console.log(`🔄 Still missing users, trying User collection...`);
    const remainingIds = allIdsArray.filter(id => !userProfiles.some(p => p._id.toString() === id || p.userId === id || p.employeeCode === id));

    if (remainingIds.length > 0) {
      const { default: User } = await import('../models/User.js');
      const users = await User.find({
        $or: [
          { _id: { $in: remainingIds.filter(id => mongoose.Types.ObjectId.isValid(id)) } },
          { externalId: { $in: remainingIds } },
          { employeeCode: { $in: remainingIds } }
        ]
      }).select('firstName lastName email employeeCode externalId _id');

      console.log(`✅ Found ${users.length} users in User collection`);

      if (users.length > 0) {
        // Convert User documents to UserProfile-like format
        const convertedUsers = users.map(user => ({
          _id: user._id,
          userId: user.externalId,
          employeeCode: user.employeeCode,
          personalInfo: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email
          }
        }));
        userProfiles = userProfiles.concat(convertedUsers);
        console.log('📋 Converted User documents to profile format');
      }
    }
  }

  console.log(`✅ Found ${userProfiles.length} user profiles in database for tenant ${orgCode}`);
  console.log('🔍 Searching for IDs:', allIdsArray);
  console.log('🔍 ObjectIds found:', objectIds);

  if (userProfiles.length > 0) {
    console.log('📋 All user data found:', userProfiles.map(p => ({
      _id: p._id.toString(),
      userId: p.userId,
      employeeCode: p.employeeCode,
      firstName: p.personalInfo?.firstName,
      lastName: p.personalInfo?.lastName,
      email: p.personalInfo?.email,
      source: p.constructor.modelName || 'Converted'
    })));
  } else {
    console.log('⚠️ No user data found. Checking what exists...');
    const allProfilesForTenant = await UserProfile.find({ tenantId: orgCode }).limit(3);
    console.log(`📊 UserProfile count for tenant ${orgCode}: ${allProfilesForTenant.length}`);

    const { default: User } = await import('../models/User.js');
    const allUsers = await User.find({}).limit(3);
    console.log(`📊 Total User count: ${allUsers.length}`);

    if (allProfilesForTenant.length > 0) {
      console.log('📋 Sample UserProfiles:', allProfilesForTenant.map(p => ({
        _id: p._id.toString(),
        userId: p.userId,
        employeeCode: p.employeeCode
      })));
    }
    if (allUsers.length > 0) {
      console.log('📋 Sample Users:', allUsers.map(u => ({
        _id: u._id.toString(),
        externalId: u.externalId,
        employeeCode: u.employeeCode,
        firstName: u.firstName
      })));
    }
  }

  // Build user map
  const userMap = new Map();
  userProfiles.forEach(profile => {
    const userObj = {
      _id: profile._id,
      id: profile._id.toString(),
      firstName: profile.personalInfo?.firstName || 'Unknown',
      lastName: profile.personalInfo?.lastName || 'User',
      email: profile.personalInfo?.email || '',
      contactMobile: '',
      role: 'user'
    };

    console.log(`🗺️ Mapping user ${profile._id.toString()}: ${userObj.firstName} ${userObj.lastName} (${userObj.email})`);

    // Map by all possible identifiers
    userMap.set(profile._id.toString(), userObj);
    if (profile.userId) {
      userMap.set(profile.userId, userObj);
      console.log(`  ↳ Also mapped by userId: ${profile.userId}`);
    }
    if (profile.employeeCode) {
      userMap.set(profile.employeeCode, userObj);
      console.log(`  ↳ Also mapped by employeeCode: ${profile.employeeCode}`);
    }
  });

  console.log(`✅ Built user map with ${userMap.size} entries and keys:`, Array.from(userMap.keys()));

  // Create synthetic users for missing IDs
  const missingIds = [];
  allIds.forEach(id => {
    if (!userMap.has(id)) {
      missingIds.push(id);
      userMap.set(id, {
        _id: id,
        id: id,
        firstName: 'Unknown',
        lastName: 'User',
        email: '',
        contactMobile: '',
        role: 'user'
      });
    }
  });

  if (missingIds.length > 0) {
    console.log('⚠️ Could not find UserProfile for IDs:', missingIds);
  }

  // Map users to accounts
  list.forEach(account => {
    if (account.createdBy) {
      const createdById = account.createdBy.toString();
      const foundUser = userMap.get(createdById);
      console.log(`👤 Looking for createdBy ${createdById}:`, foundUser ? `Found ${foundUser.firstName}` : 'NOT FOUND');
      if (foundUser) {
        account.createdBy = foundUser;
        console.log(`✅ Mapped account createdBy to: ${foundUser.firstName} ${foundUser.lastName}`);
      } else {
        console.log(`❌ Could not find createdBy ${createdById}, keeping original`);
      }
    }

    if (account.assignedTo) {
      const assignedToId = account.assignedTo.toString();
      const foundUser = userMap.get(assignedToId);
      console.log(`👤 Looking for assignedTo ${assignedToId}:`, foundUser ? `Found ${foundUser.firstName}` : 'NOT FOUND');
      if (foundUser) {
        account.assignedTo = foundUser;
        console.log(`✅ Mapped account assignedTo to: ${foundUser.firstName} ${foundUser.lastName}`);
      } else {
        console.log(`❌ Could not find assignedTo ${assignedToId}, keeping original`);
      }
    }
  });

  console.log('✅ populateUserInfo completed for accounts');
  return Array.isArray(accounts) ? list : list[0];
}

// Helper function to check if a user has access to an account based on their role and the account's properties
function hasAccountAccess(user, account) {
  if (!user || !account) return false;
  if (user.role === 'super_admin') return true;
  if (user.role === 'admin') {
    return Array.isArray(user.zone) && (user.zone.includes(account.zone) || account.zone === 'n/a');
  }
  // For regular users or fallback, check if the user is the creator or assignee
  return (
    (account.createdBy && account.createdBy.toString() === user._id.toString()) ||
    (account.assignedTo && account.assignedTo.toString() === user._id.toString())
  );
}

// Create a new account
export const createAccount = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  try {
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);
    
    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    console.log('✅ Got effective user for account creation:', { 
      id: user.id, 
      role: user.role, 
      isExternal: user.isExternalUser 
    });
    
    // Use the user ID that was resolved by auth middleware (should be UserProfile userId)
    const createdByValue = req.user.id;

    // Get selected org from query params if provided (PRIORITY: selected org from org switcher)
    const { entityId } = req.query;

    console.log(`🏢 Account creation - entityId from query: ${entityId}`);
    console.log(`🏢 Account creation - orgCode from body: ${req.body.orgCode}`);
    console.log(`🏢 Account creation - tenant orgCode: ${req.tenant?.orgCode}`);
    console.log(`🏢 Account creation - user orgCode: ${req.user?.orgCode}`);

    // Determine orgCode with PRIORITY to selected organization from query params
    // This ensures credits are deducted from the organization the user selected
    let orgCode = null;
    let selectedOrgForCredits = null; // Track selected org separately for credit deduction

    // PRIORITY 1: Use selected organization from query params (org switcher)
    if (entityId) {
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        // entityId is an ObjectId, try to resolve it to orgCode
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            selectedOrgForCredits = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${selectedOrgForCredits} for credit deduction`);
          } else {
            console.warn(`⚠️ Could not find organization with _id: ${entityId}, using entityId as orgCode`);
            selectedOrgForCredits = entityId; // Fallback
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId}:`, lookupError.message);
          selectedOrgForCredits = entityId; // Fallback
        }
      } else {
        // entityId is already an orgCode
        selectedOrgForCredits = entityId;
      }
    }

    // PRIORITY 2: Use orgCode from body, tenant, or user (for account data)
    orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode || selectedOrgForCredits;

    // If we have selectedOrgForCredits but no orgCode yet, use it
    if (!orgCode && selectedOrgForCredits) {
      orgCode = selectedOrgForCredits;
    }

    // If still no orgCode, look up user's primary organization
    if (!orgCode) {
      const tenantId = req.tenant?.id || req.user?.tenantId;
      console.log(`🔍 No orgCode provided, looking up primary organization for user: ${createdByValue}, tenant: ${tenantId}`);
      orgCode = await getUserPrimaryOrgCode(createdByValue, tenantId);
    }

    // Final fallback - if we still don't have orgCode, this is an error condition
    if (!orgCode) {
      console.error('❌ CRITICAL: Cannot create account without orgCode. User has no organization assignment.');
      return res.status(400).json({
        message: 'Cannot create account: User is not assigned to any organization. Please contact your administrator.',
        error: 'MISSING_ORGANIZATION_ASSIGNMENT'
      });
    }

    // Get tenant information for credit checking
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || user.id;

    // Check credits BEFORE creating the account
    if (tenantId && userId) {
      try {
        // Import required models and services for credit checking
        const CrmCreditConfig = (await import('../models/CrmCreditConfig.js')).default;
        const { default: relationshipService } = await import('../services/relationshipService.js');

        console.log('🔍 Checking credits before account creation');

        // Get credit configuration to determine required credits
        const creditConfig = await CrmCreditConfig.getEffectiveConfig('crm.accounts.create', tenantId);

        if (!creditConfig) {
          console.log('⚠️ No credit config found for account creation - allowing operation without credit deduction');
          // Continue to create account - activity will be logged after account creation
        } else {
          const requiredCredits = creditConfig.creditCost || 0;

          if (requiredCredits > 0) {
            // Check if user has sufficient credits
            const creditCheck = await relationshipService.checkCredits(
              tenantId,
              userId,
              'crm.accounts.create',
              requiredCredits
            );

            if (!creditCheck.allowed) {
              console.warn(`❌ Insufficient credits for account creation: ${creditCheck.availableCredits} available, ${requiredCredits} required`);

              return res.status(402).json({
                error: 'Payment Required',
                message: 'Insufficient credits to create account',
                details: {
                  availableCredits: creditCheck.availableCredits,
                  requiredCredits: requiredCredits,
                  operation: 'crm.accounts.create'
                }
              });
            }

            console.log(`✅ Sufficient credits available: ${creditCheck.availableCredits} >= ${requiredCredits}`);
          } else {
            console.log('ℹ️ Account creation has zero credit cost');
          }
        }
      } catch (creditError) {
        console.error('❌ Error checking credits before account creation:', creditError);

        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.accounts.create',
            error: creditError.message
          }
        });
      }
    }

    const accountData = {
      ...req.body,
      createdBy: createdByValue,
      zone: req.body.zone || (user.zone && user.zone[0]) || undefined,
      orgCode: orgCode
    };

    console.log('🔧 Creating account with data:', {
      companyName: accountData.companyName,
      createdBy: accountData.createdBy,
      zone: accountData.zone,
      orgCode: accountData.orgCode,
      phone: accountData.phone,
      segment: accountData.segment,
      employeesCount: accountData.employeesCount,
      invoicing: accountData.invoicing,
      creditTerm: accountData.creditTerm,
      gstNo: accountData.gstNo,
      parentAccount: accountData.parentAccount,
      customFields: accountData.customFields,
      formTemplateId: accountData.formTemplateId,
      allKeys: Object.keys(accountData),
      customFieldsCount: accountData.customFields ? Object.keys(accountData.customFields).length : 0
    });

    console.log('🔍 orgCode resolution path:', {
      fromBody: req.body.orgCode,
      fromQuery: req.query.entityId,
      fromTenant: req.tenant?.orgCode,
      fromUser: req.user?.orgCode,
      fromLookup: !req.body.orgCode && !entityId && !req.tenant?.orgCode && !req.user?.orgCode ? orgCode : null,
      final: accountData.orgCode
    });

    let account;
    try {
      account = new Account(accountData);
      await account.save();
      console.log('✅ Account created successfully:', account._id);
    } catch (accountError) {
      console.error('❌ Error creating account:', accountError);
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to create account',
        details: {
          error: accountError.message
        }
      });
    }

    // Now deduct the credits after successful account creation
    if (tenantId && userId) {
      try {
        // Import relationship service for credit deduction
        const { default: relationshipService } = await import('../services/relationshipService.js');

        console.log('🔄 Deducting credits for account creation');

        // Resolve org to deduct from: prefer query entityId, resolve ObjectId -> orgCode, fallback to account orgCode
        let creditDeductionOrg = selectedOrgForCredits || orgCode;
        if (creditDeductionOrg && /^[a-f\d]{24}$/i.test(String(creditDeductionOrg))) {
          try {
            const Organization = (await import('../models/Organization.js')).default;
            const orgData = await Organization.findById(creditDeductionOrg).select('orgCode').lean();
            if (orgData?.orgCode) {
              creditDeductionOrg = orgData.orgCode;
              console.log(`✅ Resolved entityId ${selectedOrgForCredits} to orgCode: ${creditDeductionOrg}`);
            }
          } catch (resolveErr) {
            console.warn('⚠️ Failed to resolve entityId to orgCode for account creation:', resolveErr?.message);
          }
        }

        console.log(`💰 About to deduct credits for account creation:`);
        console.log(`   - Selected org for credits: ${selectedOrgForCredits || 'none'}`);
        console.log(`   - Account orgCode: ${orgCode}`);
        console.log(`   - Using for credit deduction: ${creditDeductionOrg}`);

        // Deduct credits for account creation
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.accounts.create',
          'account',
          account._id.toString(),
          {
            companyName: accountData.companyName,
            accountType: accountData.accountType,
            industry: accountData.industry
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/accounts',
              method: 'POST'
            }
          },
          creditDeductionOrg // Pass the selected/switched organization for credit deduction
        );

        if (creditResult.success) {
          console.log(`💰 Credits deducted for account creation: ${creditResult.creditsUsed || creditResult.creditsDeducted} credits`);
        console.log(`📝 Activity logging should have been triggered for account creation with orgCode: ${orgCode}`);

          // Add credit information to response (standardized format)
          const accountResponse = account.toObject();
          // Normalize credit fields for frontend
          const creditsDeducted =
            creditResult?.creditsUsed ??
            creditResult?.creditsDeducted ??
            creditResult?.creditCost ??
            0;

          const availableCredits =
            creditResult?.remainingCredits ??
            creditResult?.availableCredits ??
            creditResult?.creditRecord?.availableCredits ??
            0;

          accountResponse.creditDeduction = {
            operationCode: 'crm.accounts.create',
            creditsDeducted,
            availableCredits,
          };

          return res.status(201).json(accountResponse);
        } else {
          console.warn(`❌ Credit deduction failed after account creation: ${creditResult.message}`);

          // Credit deduction failed - delete the created account to maintain consistency
          try {
            await Account.findByIdAndDelete(account._id);
            console.log(`🗑️ Deleted account ${account._id} due to failed credit deduction`);
          } catch (deleteError) {
            console.error('❌ Failed to delete account after credit deduction failure:', deleteError);
          }

          // Return 402 Payment Required status for insufficient credits
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to perform this operation',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.accounts.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for account creation:', creditError);

        // Credit deduction error - delete the created account to maintain consistency
        // Only delete if account was successfully created
        if (account && account._id) {
          try {
            await Account.findByIdAndDelete(account._id);
            console.log(`🗑️ Deleted account ${account._id} due to credit deduction error`);
          } catch (deleteError) {
            console.error('❌ Failed to delete account after credit deduction error:', deleteError);
          }
        }

        // Return 402 Payment Required status for credit system errors
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.accounts.create',
            error: creditError.message
          }
        });
      }
    } else {
      console.warn('⚠️ Missing tenant or user information for credit deduction');
      
      // Log activity even without credit deduction if account was created
      if (account && account._id) {
        try {
          const { default: relationshipService } = await import('../services/relationshipService.js');
          await relationshipService.logActivity({
            tenantId: tenantId || null,
            userId: userId || null,
            entityId: orgCode,
            operationType: 'crm.accounts.create',
            resourceType: 'account',
            resourceId: account._id.toString(),
            operationDetails: {
              companyName: accountData.companyName,
              accountType: accountData.accountType,
              industry: accountData.industry
            },
            severity: 'low',
            status: 'success',
            creditsConsumed: 0
          });
        } catch (logError) {
          console.error('❌ Failed to log activity:', logError);
        }
      }
      
      res.status(201).json(account);
    }
  } catch (err) {
    console.error('❌ Error creating account:', err.message);
    res.status(500).send('Server Error');
  }
};

// Get all accounts based on user role and access
export const getAccounts = async (req, res) => {
  try {
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);
    
    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    console.log('✅ Got effective user:', { 
      id: user.id, 
      role: user.role, 
      isExternal: user.isExternalUser 
    });
    
    // Get permission-based query filters with org switcher support
    const { entityId } = req.query;
    const query = await getPermissionFilters(user, 'account', entityId);

    console.log('🔍 Final query filters:', JSON.stringify(query));

    // Use lean objects so we can safely replace fields for response
    const accounts = await Account.find(query).sort({ companyName: 1 }).lean();
    console.log('🔍 About to call populateUserInfo with entityId:', entityId);

    // Define effective org code for user resolution
    const effectiveOrgCode = req.tenant?.orgCode || req.user?.orgCode || entityId || null;
    console.log('🔍 Using effectiveOrgCode for user resolution:', effectiveOrgCode);

    console.log('🔍 Sample account createdBy:', accounts[0]?.createdBy);
    console.log('🔍 Sample account assignedTo:', accounts[0]?.assignedTo);
    console.log('🔍 All account user IDs:', accounts.slice(0, 5).map(acc => ({
      _id: acc._id,
      companyName: acc.companyName,
      createdBy: acc.createdBy,
      assignedTo: acc.assignedTo,
      createdByType: typeof acc.createdBy,
      assignedToType: typeof acc.assignedTo
    })));
    console.log('🔍 DEBUG: About to call populateUserInfo function');

    try {
      const populatedAccounts = await populateUserInfo(accounts, effectiveOrgCode, req);
      console.log('🔍 populateUserInfo completed, sample populated createdBy:', populatedAccounts[0]?.createdBy);
      console.log('🔍 DEBUG: populateUserInfo function completed successfully');

      // Normalize account data for consistent response structure
      const normalizedAccounts = populatedAccounts.map(normalizeAccountData);

      console.log(`✅ Found ${accounts.length} accounts after filtering and normalization`);
      return res.json(normalizedAccounts);
    } catch (populateError) {
      console.error('❌ Error in populateUserInfo:', populateError.message);
      console.error('❌ populateUserInfo stack:', populateError.stack);
      console.log(`✅ Found ${accounts.length} accounts after filtering (unpopulated fallback)`);

      // Normalize even the fallback accounts
      const normalizedAccounts = accounts.map(normalizeAccountData);

      // Fallback: return accounts without population but with normalization
      return res.json(normalizedAccounts);
    }
  } catch (err) {
    console.error('❌ Error getting accounts:', err.message);
    res.status(500).send('Server Error');
  }
};

// Get a specific account by ID
export const getAccount = async (req, res) => {
  try {
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Get selected org from query params if provided (PRIORITY: selected org from org switcher)
    const { entityId } = req.query;

    // Determine effective orgCode - prioritize selected organization from query params
    let effectiveOrgCode = null;
    let selectedOrgForCredits = null;

    if (entityId) {
      // entityId from query params is the selected organization
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        // Try to resolve ObjectId to orgCode
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            selectedOrgForCredits = orgData.orgCode;
          } else {
            selectedOrgForCredits = entityId;
          }
        } catch (lookupError) {
          selectedOrgForCredits = entityId;
        }
      } else {
        selectedOrgForCredits = entityId;
      }
    }

    effectiveOrgCode = selectedOrgForCredits || req.tenant?.orgCode || req.user?.orgCode || null;
    const account = await Account.findOne({
      _id: req.params.id,
      ...(effectiveOrgCode
        ? {
            $or: [
              { orgCode: effectiveOrgCode },
              { orgCode: { $exists: false } },
              { orgCode: null },
              { orgCode: '' }
            ]
          }
        : {})
    }).lean();
      
    if (!account) return res.status(404).json({ message: 'Account not found' });
    
    // Use custom populate function that handles both ObjectIds and external IDs
    console.log('🔍 About to call populateUserInfo for account:', {
      accountId: account._id,
      createdBy: account.createdBy,
      assignedTo: account.assignedTo,
      orgCode: effectiveOrgCode
    });
    const populatedAccount = await populateUserInfo(account, effectiveOrgCode, req);
    console.log('✅ populateUserInfo completed, populatedAccount:', {
      accountId: populatedAccount._id,
      createdBy: populatedAccount.createdBy,
      assignedTo: populatedAccount.assignedTo
    });
    
    // For external users, grant broad access
    if (user.isExternalUser) {
      console.log('🎯 External user - granting access to account');
      // External users can access any account for now
    } else {
      if (!hasAccountAccess(user, populatedAccount)) {
        return res.status(403).json({ message: 'Access denied to this account' });
      }
    }
    
    res.json(populatedAccount);
  } catch (err) {
    console.error('❌ Error getting account:', err.message);
    res.status(500).send('Server Error');
  }
};

// Get all contacts for a specific account
export const getAccountContacts = async (req, res) => {
  try {
    console.log(`🔍 getAccountContacts called for accountId: ${req.params.accountId}`);

    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Get selected org from query params if provided
    const { entityId } = req.query;
    const effectiveOrgCode = req.tenant?.orgCode || req.user?.orgCode || req.user?.tenantId || req.tenantId || entityId || null;
    console.log(`🔍 Effective orgCode: ${effectiveOrgCode}`);

    // First find the account by ID only (without org filtering)
    const account = await Account.findById(req.params.accountId);
    if (!account) {
      console.log(`❌ Account not found: ${req.params.accountId}`);
      return res.status(404).json({ message: 'Account not found' });
    }
    console.log(`✅ Found account: ${account.companyName} (orgCode: ${account.orgCode})`);

    // Access check is already done above

    // Query for contacts - accountId is defined as ObjectId in schema
    let contacts;
    try {
      // Convert accountId to ObjectId since that's what the schema expects
      if (mongoose.Types.ObjectId.isValid(req.params.accountId)) {
        const accountObjectId = new mongoose.Types.ObjectId(req.params.accountId);
        contacts = await Contact.find({
          accountId: accountObjectId,
          deleted: { $ne: true }
        });
        console.log(`🔍 Queried contacts with ObjectId: ${accountObjectId}, found: ${contacts.length}`);

        // Also check total contacts in system for debugging
        const totalContacts = await Contact.countDocuments({ deleted: { $ne: true } });
        console.log(`🔍 Total contacts in system: ${totalContacts}`);

        // Check if there are any contacts with this accountId (debug)
        if (contacts.length === 0) {
          const allContactsWithAccountId = await Contact.find({
            accountId: accountObjectId
          });
          console.log(`🔍 Contacts with this accountId (including deleted): ${allContactsWithAccountId.length}`);
        }
      } else {
        console.error(`❌ Invalid accountId format: ${req.params.accountId}`);
        return res.status(400).json({ message: 'Invalid account ID format' });
      }
    } catch (error) {
      console.error('Error querying contacts:', error);
      return res.status(500).json({ message: 'Error fetching contacts' });
    }

    // Sort contacts (create a new sorted array to avoid mutation issues)
    const sortedContacts = [...contacts].sort((a, b) => {
      if (a.isPrimaryContact && !b.isPrimaryContact) return -1;
      if (!a.isPrimaryContact && b.isPrimaryContact) return 1;
      return a.firstName.localeCompare(b.firstName);
    });

    console.log(`✅ Returning ${sortedContacts.length} contacts for account ${req.params.accountId}`);
    console.log(`📋 Contact details:`, sortedContacts.map(c => ({
      id: c._id,
      name: `${c.firstName} ${c.lastName}`,
      email: c.email,
      isPrimary: c.isPrimaryContact
    })));

    res.json(sortedContacts);
  } catch (err) {
    console.error('❌ Error getting account contacts:', err.message);
    console.error('Stack trace:', err.stack);
    res.status(500).send('Server Error');
  }
};

// Update an existing account
export const updateAccount = async (req, res) => {
  try {
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);

    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }

    // Get selected org from query params if provided (PRIORITY: selected org from org switcher)
    const { entityId } = req.query;
    
    // Determine effective orgCode - prioritize selected organization from query params
    let effectiveOrgCode = null;
    let selectedOrgForCredits = null;
    
    if (entityId) {
      // entityId from query params is the selected organization
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        // Try to resolve ObjectId to orgCode
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData) {
            selectedOrgForCredits = orgData.orgCode;
          } else {
            selectedOrgForCredits = entityId;
          }
        } catch (lookupError) {
          selectedOrgForCredits = entityId;
        }
      } else {
        selectedOrgForCredits = entityId;
      }
    }
    
    effectiveOrgCode = selectedOrgForCredits || req.tenant?.orgCode || req.user?.orgCode || null;
    const account = await Account.findOne({
      _id: req.params.id,
      ...(effectiveOrgCode
        ? {
            $or: [
              { orgCode: effectiveOrgCode },
              { orgCode: { $exists: false } },
              { orgCode: null },
              { orgCode: '' }
            ]
          }
        : {})
    });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    
    // For external users, grant broad access
    if (user.isExternalUser) {
      console.log('🎯 External user - granting access to update account');
      // External users can update any account for now
    } else {
      if (!hasAccountAccess(user, account)) {
        return res.status(403).json({ message: 'Access denied to this account' });
      }
    }
    
    // Check if assignedTo is being changed
    let isAssigneeChanged = false;
    if (req.body.hasOwnProperty('assignedTo')) {
      const oldAssignee = account.assignedTo ? account.assignedTo.toString() : null;
      const newAssignee = req.body.assignedTo ? req.body.assignedTo.toString() : null;
      isAssigneeChanged = oldAssignee !== newAssignee;
    }
    
    const updatedAccount = await Account.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now(), updatedBy: req.user.id },
      { new: true }
    );
    
    // If assignee changed, update all associated contacts
    if (isAssigneeChanged) {
      let updateObj = { updatedAt: Date.now(), updatedBy: req.user.id };
      if (req.body.assignedTo) {
        updateObj.assignedTo = req.body.assignedTo;
      } else if (account.createdBy) {
        updateObj.assignedTo = account.createdBy;
      }
      if (updateObj.assignedTo) {
        await Contact.updateMany(
          { accountId: req.params.id, deleted: { $ne: true } },
          updateObj
        );
      }
    }
    
    console.log('✅ Account updated successfully');

    // Get tenant information for credit deduction
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || user.id;

    if (tenantId && userId) {
      try {
        // Import relationship service for credit deduction
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Relationship service should already be initialized at server startup
        console.log('🔄 Using relationship service for account update credit deduction');

        // Resolve org to deduct from: prefer query entityId, resolve ObjectId -> orgCode, fallback to effective orgCode
        let creditDeductionOrg = selectedOrgForCredits || effectiveOrgCode;
        if (creditDeductionOrg && /^[a-f\d]{24}$/i.test(String(creditDeductionOrg))) {
          try {
            const Organization = (await import('../models/Organization.js')).default;
            const orgData = await Organization.findById(creditDeductionOrg).select('orgCode').lean();
            if (orgData?.orgCode) {
              creditDeductionOrg = orgData.orgCode;
              console.log(`✅ Resolved entityId ${selectedOrgForCredits} to orgCode: ${creditDeductionOrg}`);
            }
          } catch (resolveErr) {
            console.warn('⚠️ Failed to resolve entityId to orgCode for account update:', resolveErr?.message);
          }
        }

        console.log(`💰 About to deduct credits for account update:`);
        console.log(`   - Selected org for credits: ${selectedOrgForCredits || 'none'}`);
        console.log(`   - Effective orgCode: ${effectiveOrgCode}`);
        console.log(`   - Using for credit deduction: ${creditDeductionOrg}`);

        // Deduct credits for account update
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.accounts.update',
          'account',
          updatedAccount._id.toString(),
          {
            companyName: updatedAccount.companyName,
            accountType: updatedAccount.accountType,
            industry: updatedAccount.industry,
            isAssigneeChanged
          },
          {
            operationType: 'update',
            entityType: 'account',
            entityId: updatedAccount._id.toString()
          },
          creditDeductionOrg // Pass the selected/switched organization for credit deduction
        );

        if (creditResult.success) {
          console.log(`💰 Credits deducted for account update: ${creditResult.creditsDeducted || creditResult.creditsUsed} credits`);

          // Populate user information before returning response
          const populatedAccount = await populateUserInfo(updatedAccount, effectiveOrgCode, req);

          // Add credit information to response (standardized format)
          const creditsDeducted =
            creditResult?.creditsDeducted ??
            creditResult?.creditsUsed ??
            creditResult?.creditCost ??
            0;

          const availableCredits =
            creditResult?.remainingCredits ??
            creditResult?.availableCredits ??
            creditResult?.creditRecord?.availableCredits ??
            0;

          populatedAccount.creditDeduction = {
            operationCode: 'crm.accounts.update',
            creditsDeducted,
            availableCredits,
          };

          return res.json(populatedAccount);
        } else {
          console.warn(`❌ Credit deduction failed for account update: ${creditResult.message}`);

          // Return 402 Payment Required status for insufficient credits
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to update account',
            creditInfo: {
              operation: 'crm.accounts.update',
              availableCredits: creditResult.availableCredits,
              requiredCredits: creditResult.requiredCredits,
              message: creditResult.message
            }
          });
        }

      } catch (creditError) {
        console.error('❌ Error in credit deduction for account update:', creditError);

        // Return 402 Payment Required status for credit system errors
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error during account update',
          creditInfo: {
            operation: 'crm.accounts.update',
            error: creditError.message
          }
        });
      }
    } else {
      console.warn('⚠️ Missing tenant or user information for credit deduction');
      // Still populate user information even without credit deduction
      const populatedAccount = await populateUserInfo(updatedAccount, effectiveOrgCode, req);
      return res.json(populatedAccount);
    }
  } catch (err) {
    console.error('❌ Error updating account:', err.message);
    res.status(500).send('Server Error');
  }
};

// Delete an account
export const deleteAccount = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }
    
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);
    
    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    const account = await Account.findOne({ _id: req.params.id, ...(req.tenant?.orgCode ? { orgCode: req.tenant.orgCode } : {}) });
    if (!account) return res.status(404).json({ message: 'Account not found' });
    
    // For external users, grant broad access
    if (user.isExternalUser) {
      console.log('🎯 External user - granting access to delete account');
      // External users can delete any account for now
    } else {
      if (user.role !== 'super_admin') {
        if (!account.zone || !user.zone || !user.zone.includes(account.zone)) {
          return res.status(403).json({ message: 'Access denied to delete this account' });
        }
      }
    }
    
    await Account.findByIdAndDelete(req.params.id);
    console.log('✅ Account deleted successfully');
    res.json({ message: 'Account deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting account:', err.message);
    res.status(500).send('Server Error');
  }
};