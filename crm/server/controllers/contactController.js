import Contact from "../models/Contact.js";
import Account from "../models/Account.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import mongoose from 'mongoose';
import cloudinary from "../config/cloudinary.js";
import { validationResult } from 'express-validator';
import { getEffectiveUser, getPermissionFilters, getAccessibleOrganizations } from '../utils/authHelpers.js';

// Helper function to populate user information for contacts
async function populateContactUserInfo(contacts, orgCode) {
  if (!contacts || contacts.length === 0) return contacts;

  // Collect all unique user IDs from createdBy and assignedTo
  const allIds = new Set();
  contacts.forEach(contact => {
    if (contact.createdBy) allIds.add(contact.createdBy.toString());
    if (contact.assignedTo) allIds.add(contact.assignedTo.toString());
  });

  if (allIds.size === 0) return contacts;

  console.log('🔍 Querying UserProfile for contact user IDs:', Array.from(allIds));
  console.log('🔍 Using tenant/orgCode:', orgCode);

  // Separate ObjectIds and non-ObjectIds
  const allIdsArray = Array.from(allIds);
  const objectIds = allIdsArray.filter(id => mongoose.Types.ObjectId.isValid(id));
  const uuidStrings = allIdsArray.filter(id => !mongoose.Types.ObjectId.isValid(id));

  console.log('🔍 ObjectIds to search:', objectIds);
  console.log('🔍 UUID strings to search:', uuidStrings);

  // Query UserProfile with tenant filter - search by userId, employeeCode, and _id
  const userProfiles = await UserProfile.find({
    tenantId: orgCode,
    $or: [
      { _id: { $in: objectIds } },
      { userId: { $in: allIdsArray } },
      { employeeCode: { $in: allIdsArray } }
    ]
  }).select('userId personalInfo.firstName personalInfo.lastName personalInfo.email employeeCode _id');

  console.log(`✅ Found ${userProfiles.length} user profiles in database`);
  
  if (userProfiles.length > 0) {
    console.log('📋 Sample user profile:', {
      _id: userProfiles[0]._id,
      userId: userProfiles[0].userId,
      employeeCode: userProfiles[0].employeeCode,
      firstName: userProfiles[0].personalInfo?.firstName
    });
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
      profileImage: null
    };
    
    // Map by all possible identifiers
    userMap.set(profile._id.toString(), userObj);
    if (profile.userId) userMap.set(profile.userId, userObj);
    if (profile.employeeCode) userMap.set(profile.employeeCode, userObj);
  });

  console.log(`✅ Built user map with ${userMap.size} entries`);

  // Create synthetic users for missing IDs and log which ones are missing
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
        profileImage: null
      });
    }
  });

  if (missingIds.length > 0) {
    console.log('⚠️ Could not find UserProfile for IDs:', missingIds);
  }

  // Map users to contacts
  return contacts.map(contact => {
    const contactObj = contact.toObject ? contact.toObject() : contact;
    
    if (contactObj.createdBy) {
      const createdById = contactObj.createdBy.toString();
      contactObj.createdBy = userMap.get(createdById) || contactObj.createdBy;
      console.log(`👤 Mapped createdBy ${createdById} to:`, contactObj.createdBy.firstName);
    }
    
    if (contactObj.assignedTo) {
      const assignedToId = contactObj.assignedTo.toString();
      contactObj.assignedTo = userMap.get(assignedToId) || contactObj.assignedTo;
      console.log(`👤 Mapped assignedTo ${assignedToId} to:`, contactObj.assignedTo.firstName);
    }
    
    return contactObj;
  });
}

export const createContact = async (req, res) => {
  try {
    console.log("📥 Creating contact by:", req.user.id);
    console.log("📋 Request body received:", JSON.stringify(req.body, null, 2));
    console.log("📋 Request query:", req.query);
    console.log("📋 Request params:", req.params);

    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("❌ Validation errors:", errors.array());
      return res.status(400).json({ errors: errors.array() });
    }
    
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

    // Get entityId from query params (selected organization)
    const { entityId } = req.query;

    // Resolve orgCode properly - if entityId is provided, it might be an org _id that needs to be resolved to orgCode
    let orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;
    
    console.log(`🏢 Contact creation - entityId from query: ${entityId}`);
    console.log(`🏢 Contact creation - orgCode from body: ${req.body.orgCode}`);
    console.log(`🏢 Contact creation - tenant orgCode: ${req.tenant?.orgCode}`);
    console.log(`🏢 Contact creation - user orgCode: ${req.user?.orgCode}`);
    console.log(`🏢 Contact creation - initial orgCode: ${orgCode}`);

    if (entityId && !orgCode) {
      console.log(`🔄 Need to resolve entityId ${entityId} to orgCode`);
      // If entityId looks like an ObjectId, try to resolve it to orgCode
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        console.log(`📋 entityId ${entityId} looks like ObjectId, looking up organization`);
        try {
          const Organization = (await import('../models/Organization.js')).default;
          console.log(`🔍 Searching for organization with _id: ${entityId}`);
          const orgData = await Organization.findById(entityId).select('orgCode orgName').lean();
          console.log(`📊 Organization lookup result:`, orgData);
          if (orgData && orgData.orgCode) {
            orgCode = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${orgCode} (orgName: ${orgData.orgName})`);
          } else {
            console.warn(`⚠️ Could not find organization with _id: ${entityId}, result:`, orgData);
            orgCode = entityId; // Fallback to using entityId as orgCode
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId}:`, lookupError.message);
          console.error(`❌ Error stack:`, lookupError.stack);
          orgCode = entityId; // Fallback to using entityId as orgCode
        }
      } else {
        console.log(`📋 entityId ${entityId} is already an orgCode`);
        // entityId is already an orgCode
        orgCode = entityId;
      }
    } else if (entityId && orgCode !== entityId) {
      // If entityId is provided and different from current orgCode, prioritize entityId
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        // Try to resolve ObjectId to orgCode
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode orgName').lean();
          if (orgData && orgData.orgCode) {
            orgCode = orgData.orgCode;
            console.log(`✅ Resolved entityId ${entityId} to orgCode: ${orgCode} (prioritized)`);
          }
        } catch (lookupError) {
          console.error(`❌ Error looking up orgCode for entityId ${entityId}:`, lookupError.message);
        }
      } else {
        orgCode = entityId;
        console.log(`✅ Using entityId as orgCode: ${orgCode} (prioritized)`);
      }
    }

    console.log(`🎯 Final orgCode for contact creation: ${orgCode}`);

    // Extract account ID from request body
    const { accountId } = req.body;
    
    // If accountId provided, check user has access to this account
    if (accountId) {
      console.log(`Verifying access to account ${accountId}`);
      const account = await Account.findById(accountId);
      
      if (!account) {
        console.log('Account not found, returning 404');
        return res.status(404).json({ message: 'Account not found' });
      }
      
      console.log('Account found with zone:', account.zone);
      
      // For external users, grant broad access
      if (user.isExternalUser) {
        console.log('🎯 External user - granting access to account');
        // External users can access any account for now
      } else {
        // Check if user has access to this account based on role
        let hasAccess = false;
      
      if (user.role === 'super_admin') {
        console.log('User is super_admin, granting access');
        hasAccess = true;
      } 
      else if (user.role === 'admin') {
        console.log('User is admin, checking zone access');
        
        // Admin can only access accounts in their zones or with 'n/a' zone
        if (!user.zone || user.zone.length === 0) {
          console.log('Admin has no zones assigned, denying access');
          hasAccess = false;
        } else {
          hasAccess = user.zone.includes(account.zone) || account.zone === 'n/a';
          console.log('Admin has access based on zone:', hasAccess);
        }
      }
      else if (user.role === 'user') {
        console.log('User is regular user, checking created/assigned status');
        
        // Regular users can only access accounts they created or are assigned to
        hasAccess = 
          account.createdBy && account.createdBy.toString() === user._id.toString() ||
          account.assignedTo && account.assignedTo.toString() === user._id.toString();
        
        console.log('User has access based on created/assigned:', hasAccess);
      }
      else {
        // Fallback for any other role (should be handled explicitly)
        console.log('Unknown role, using strictest access rules');
        hasAccess = 
          account.createdBy && account.createdBy.toString() === user._id.toString() ||
          account.assignedTo && account.assignedTo.toString() === user._id.toString();
      }
      
        if (!hasAccess) {
          console.log('Access denied, returning 403');
          return res.status(403).json({ message: 'Access denied to this account' });
        }
      }
    }
    
    const contactData = { 
      ...req.body, 
      createdBy: req.user.id,
      orgCode: orgCode // Set orgCode for multi-tenant isolation
    };

    // Handle file uploads if present
    if (req.files) {
      if (req.files.contactImage) {
        const result = await cloudinary.uploader.upload(
          req.files.contactImage.path
        );
        contactData.contactImage = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }

      if (req.files.businessCard) {
        const result = await cloudinary.uploader.upload(
          req.files.businessCard.path
        );
        contactData.businessCard = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }
    }
    
    // Get tenant information for credit checking
    const tenantId = req.tenant?.orgCode || req.tenantId;
    const userId = req.user?.id || req.user?.userId;

    // IMPORTANT: Deduct credits BEFORE creating the contact for immediate response
    let creditResult = null;
    let creditDeductionOrg = null;
    
    if (tenantId && userId) {
      try {
        // Import required models and services for credit checking
        const CrmCreditConfig = (await import('../models/CrmCreditConfig.js')).default;
        const { default: relationshipService } = await import('../services/relationshipService.js');

        console.log('💰 DEDUCTING CREDITS BEFORE contact creation (immediate response)');

        // Get credit configuration to determine required credits
        const creditConfig = await CrmCreditConfig.getEffectiveConfig('crm.contacts.create', tenantId, entityId);

        if (!creditConfig) {
          console.log('⚠️ No credit config found for contact creation - allowing operation without credit deduction');
        } else {
          const requiredCredits = creditConfig.creditCost || 0;

          if (requiredCredits > 0) {
            // Resolve entityId to orgCode for credit deduction
            creditDeductionOrg = entityId || orgCode;
            
            // If creditDeductionOrg is an ObjectId, resolve it to orgCode
            if (creditDeductionOrg && /^[a-f\d]{24}$/i.test(creditDeductionOrg)) {
              try {
                const Organization = (await import('../models/Organization.js')).default;
                const orgData = await Organization.findById(creditDeductionOrg).select('orgCode orgName').lean();
                if (orgData && orgData.orgCode) {
                  creditDeductionOrg = orgData.orgCode;
                  console.log(`✅ Resolved entityId ObjectId to orgCode: ${creditDeductionOrg}`);
                } else {
                  creditDeductionOrg = orgCode;
                }
              } catch (resolveError) {
                console.error(`❌ Error resolving entityId to orgCode:`, resolveError.message);
                creditDeductionOrg = orgCode;
              }
            }

            // Check if user has sufficient credits
            const creditCheck = await relationshipService.checkCredits(
              tenantId,
              userId,
              'crm.contacts.create',
              requiredCredits
            );

            if (!creditCheck.allowed) {
              console.warn(`❌ Insufficient credits for contact creation: ${creditCheck.availableCredits} available, ${requiredCredits} required`);

              return res.status(402).json({
                error: 'Payment Required',
                message: 'Insufficient credits to create contact',
                details: {
                  availableCredits: creditCheck.availableCredits,
                  requiredCredits: requiredCredits,
                  operation: 'crm.contacts.create'
                }
              });
            }

            console.log(`✅ Sufficient credits available: ${creditCheck.availableCredits} >= ${requiredCredits}`);

            // DEDUCT CREDITS IMMEDIATELY BEFORE CREATING CONTACT
            console.log(`💰 Deducting ${requiredCredits} credits NOW (before contact creation)`);
            creditResult = await relationshipService.deductCreditsForOperation(
              tenantId,
              userId,
              'crm.contacts.create',
              'contact',
              'pending', // Will be updated after contact creation
              {
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                accountId: contactData.accountId
              },
              {
                ipAddress: req.ip || req.connection?.remoteAddress,
                userAgent: req.get('User-Agent'),
                sessionId: req.session?.id,
                metadata: {
                  endpoint: '/contacts',
                  method: 'POST'
                }
              },
              creditDeductionOrg
            );

            if (!creditResult.success) {
              console.error(`❌ Credit deduction failed: ${creditResult.message}`);
              return res.status(402).json({
                error: 'Payment Required',
                message: creditResult.message || 'Credit deduction failed',
                details: {
                  operation: 'crm.contacts.create',
                  error: creditResult.message
                }
              });
            }

            console.log(`✅ Credits deducted immediately: ${creditResult.creditsDeducted} credits`);
          } else {
            console.log('ℹ️ Contact creation has zero credit cost');
          }
        }
      } catch (creditError) {
        console.error('❌ Error deducting credits before contact creation:', creditError);

        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.contacts.create',
            error: creditError.message
          }
        });
      }
    }

    // Check if this should be the primary contact
    if (accountId && req.body.isPrimaryContact) {
      console.log(`Setting contact as primary for account ${accountId}`);
      // Reset all primary contacts for this account
      await Contact.updateMany(
        { accountId: accountId, isPrimaryContact: true },
        { isPrimaryContact: false }
      );
    }

    // Now create the contact (credits already deducted)
    const contact = new Contact(contactData);
    let contactCreated = false;

    try {
      await contact.save();
      contactCreated = true;
      console.log(`✅ Contact created successfully with ID: ${contact._id}`);
      
      // Update credit deduction with actual resource ID if needed
      if (creditResult && creditResult.success) {
        // The credit deduction already happened, just update the resource ID in activity log if needed
        // This is handled by the relationshipService internally
      }
    } catch (saveError) {
      // ROLLBACK: If contact creation fails, we need to rollback the credit deduction
      if (creditResult && creditResult.success && creditResult.transaction) {
        console.error('❌ Contact creation failed - attempting credit rollback');
        try {
          const creditService = (await import('../services/creditService.js')).default;
          const tenantId = req.tenant?.orgCode || req.tenantId;
          
          // Refund the credits that were deducted
          await creditService.refundCredits(
            tenantId,
            creditResult.entityId || creditDeductionOrg || orgCode,
            creditResult.creditsDeducted || 0,
            creditResult.transaction.transactionId || creditResult.transaction._id?.toString(),
            'contact_creation_failed',
            {
              operationCode: 'crm.contacts.create',
              resourceType: 'contact',
              error: saveError.message
            }
          );
          
          console.log(`✅ Credits refunded successfully after contact creation failure`);
        } catch (rollbackError) {
          console.error('❌ Failed to rollback credits:', rollbackError);
          // Log this for manual correction
          console.error('⚠️ Manual credit correction may be required');
        }
      }

      // Handle duplicate key error specifically
      if (saveError.code === 11000) {
        console.log('❌ Duplicate key error:', saveError.message);

        // Extract the field that caused the duplicate
        const fieldMatch = saveError.message.match(/dup key: \{ (\w+):/);
        const duplicateField = fieldMatch ? fieldMatch[1] : 'field';

        return res.status(409).json({
          error: 'Duplicate Entry',
          message: `A contact with this ${duplicateField} already exists`,
          details: {
            field: duplicateField,
            value: saveError.keyValue ? saveError.keyValue[duplicateField] : 'unknown'
          }
        });
      }

      // Re-throw other database errors
      throw saveError;
    }

    // Credits already deducted, include credit info in response
    if (creditResult && creditResult.success) {
          const responseData = contact.toObject();
          responseData.creditDeduction = {
            operationCode: 'crm.contacts.create',
            creditsDeducted: creditResult.creditsDeducted || 0,
            availableCredits: creditResult.remainingCredits || 0,
          };
          
      console.log(`✅ Contact created with immediate credit deduction: ${creditResult.creditsDeducted} credits`);
          return res.status(201).json(responseData);
    }
    
    // No credit deduction needed
    res.status(201).json(contact);
  } catch (err) {
    console.error("Error creating contact:", err);
    res.status(500).json({ message: "Server error" });
  }
};


export const getContacts = async (req, res) => {
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
    const tenantId = req.tenant?.id || req.user?.tenantId;
    let query = await getPermissionFilters(user, 'contact', entityId);
    
    // Ensure orgCode is set for org-specific filtering
    // If entityId was provided, it should already be resolved to orgCode by getPermissionFilters
    // If not, try to get orgCode from user's organization assignments
    if (!query.orgCode) {
      // Get user's accessible organizations
      const accessibleOrgs = await getAccessibleOrganizations(user);
      if (accessibleOrgs.length > 0) {
        // Use the first accessible organization (or primary if available)
        query.orgCode = accessibleOrgs[0];
        console.log(`🏢 No entityId provided, using first accessible org: ${query.orgCode}`);
      } else {
        // If no accessible orgs, try to get from user's entities
        if (req.user?.entities && req.user.entities.length > 0) {
          query.orgCode = req.user.entities[0].orgCode;
          console.log(`🏢 Using orgCode from user entities: ${query.orgCode}`);
        } else {
          console.warn('⚠️ No orgCode available for contact filtering - returning empty results for security');
          return res.json([]); // Return empty array if no orgCode available
        }
      }
    }
    
    // If accountId is provided in query, add it to the filter
    if (req.query.accountId) {
      query.accountId = req.query.accountId;
    }
    
    console.log('🔍 Final query filters:', JSON.stringify(query));
    console.log('🔍 Query details:', {
      entityId,
      orgCode: query.orgCode,
      accountId: query.accountId,
      tenantId,
      userEntities: req.user?.entities?.length || 0
    });
    
    // Execute the query with filters (without user populate)
    const contacts = await Contact.find(query)
      .populate("accountId", "companyName zone")
      .sort({ firstName: 1, lastName: 1 });
    
    console.log(`✅ Found ${contacts.length} contacts after filtering`);
    
    // Manually populate user info using the same logic as accountController
    // Get orgCode/tenantId from multiple possible sources
    const orgCode = req.tenant?.orgCode || req.user?.tenantId || req.tenantId || req.user?.orgCode;
    console.log('🔍 Using orgCode for user lookup:', orgCode);
    
    const contactsWithUsers = await populateContactUserInfo(contacts, orgCode);

    // Log activity for contacts list view
    if (tenantId && req.user?.id) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logOperationActivity(
          tenantId,
          req.user.id,
          'read',
          'contact',
          null, // No specific resource ID for list operations
          {
            operationType: 'list',
            resultCount: contacts.length,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/contacts',
              method: 'GET'
            }
          },
          0, // No credits consumed for read operations
          null,
          'success',
          'low'
        );
      } catch (logError) {
        console.error('❌ Failed to log contacts list activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    // Disable caching for dynamic contact data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(contactsWithUsers);
  } catch (err) {
    console.error("❌ Error getting contacts:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getContactsByAccount = async (req, res) => {
  try {
    console.log('Getting contacts for account ID:', req.params.accountId);
    
    // Get entityId from query params (selected organization)
    const { entityId } = req.query;
    
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);
    
    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    // First verify the user has access to this account based on zones
    const account = await Account.findById(req.params.accountId);
    
    if (!account) {
      console.log('Account not found, returning 404');
      return res.status(404).json({ message: 'Account not found' });
    }
    
    console.log('Account found with zone:', account.zone);
    
    // For external users, grant broad access
    if (user.isExternalUser) {
      console.log('🎯 External user - granting access to account contacts');
      // External users can access any account contacts for now
    } else {
      // Check if user has access to this account based on role
      let hasAccess = false;
      
      if (user.role === 'super_admin') {
        console.log('User is super_admin, granting access');
        hasAccess = true;
      } 
      else if (user.role === 'admin') {
        console.log('User is admin, checking zone access');
        
        // Admin can only see accounts in their zones or with 'n/a' zone
        if (!user.zone || user.zone.length === 0) {
          console.log('Admin has no zones assigned, denying access');
          hasAccess = false;
        } else {
          hasAccess = user.zone.includes(account.zone) || account.zone === 'n/a';
          console.log('Admin has access based on zone:', hasAccess);
        }
      }
      else if (user.role === 'user') {
        console.log('User is regular user, checking created/assigned status');
        
        // Regular users can only see accounts they created or are assigned to
        hasAccess = 
          account.createdBy && account.createdBy.toString() === user._id.toString() ||
          account.assignedTo && account.assignedTo.toString() === user._id.toString();
        
        console.log('User has access based on created/assigned:', hasAccess);
      }
      else {
        // Fallback for any other role (should be handled explicitly)
        console.log('Unknown role, using strictest access rules');
        hasAccess = 
          account.createdBy && account.createdBy.toString() === user._id.toString() ||
          account.assignedTo && account.assignedTo.toString() === user._id.toString();
      }
      
      if (!hasAccess) {
        console.log('Access denied, returning 403');
        return res.status(403).json({ message: 'Access denied to this account' });
      }
    }
    
    // Find all contacts for this account
    // Note: assignedTo and createdBy use Mixed type (can be strings or ObjectIds)
    // So we don't populate them here - use populateContactUserInfo helper instead
    const contacts = await Contact.find({ 
      accountId: req.params.accountId,
      deleted: { $ne: true } // Exclude soft-deleted contacts
    })
    .populate('accountId', 'companyName zone')
    .sort({ isPrimaryContact: -1, firstName: 1 }); // Primary contacts first, then sort by name
    
    // Use custom populate function for Mixed type user fields
    const populatedContacts = await populateContactUserInfo(contacts, req.tenant?.orgCode || req.user?.orgCode);
    
    console.log(`Found ${populatedContacts.length} contacts for account`);

    const tenantId = req.tenant?.id || req.user?.tenantId;

    // Log activity for account contacts view
    if (tenantId && req.user?.id) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logOperationActivity(
          tenantId,
          req.user.id,
          'read',
          'contact',
          null, // No specific resource ID for list operations
          {
            operationType: 'account_contacts',
            accountId: req.params.accountId,
            resultCount: populatedContacts.length,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/contacts/account/:accountId',
              method: 'GET',
              accountId: req.params.accountId
            }
          },
          0, // No credits consumed for read operations
          null,
          'success',
          'low'
        );
      } catch (logError) {
        console.error('❌ Failed to log account contacts activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    // Disable caching for dynamic contact data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(populatedContacts);
  } catch (err) {
    console.error('❌ Error getting account contacts:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while fetching account contacts'
    });
    res.status(500).send('Server Error');
  }
};

export const getContact = async (req, res) => {
  try {
    console.log(`Getting contact with ID: ${req.params.id}`);
    
    // Get entityId from query params (selected organization)
    const { entityId } = req.query;
    
    const contact = await Contact.findOne({
      _id: req.params.id,
      deleted: false
    })
      .populate("accountId", "companyName");

    if (!contact) {
      console.log('Contact not found, returning 404');
      return res.status(404).json({ message: "Contact not found" });
    }

    // Manually populate user info using the same logic as getContacts
    // Get orgCode/tenantId from multiple possible sources
    const orgCode = req.tenant?.orgCode || req.user?.tenantId || req.tenantId || req.user?.orgCode;
    const tenantId = req.tenant?.id || req.user?.tenantId;
    console.log('🔍 Using orgCode for user lookup:', orgCode);

    const [contactWithUsers] = await populateContactUserInfo([contact], orgCode);

    // Log activity for individual contact view
    if (tenantId && req.user?.id) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logOperationActivity(
          tenantId,
          req.user.id,
          'read',
          'contact',
          contact._id.toString(),
          {
            operationType: 'view',
            contactName: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/contacts/:id',
              method: 'GET'
            }
          },
          0, // No credits consumed for read operations
          null,
          'success',
          'low'
        );
      } catch (logError) {
        console.error('❌ Failed to log contact view activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    // Disable caching for dynamic contact data
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(contactWithUsers);
  } catch (err) {
    console.error("Error getting contact:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateContact = async (req, res) => {
  try {
    console.log(`Updating contact with ID: ${req.params.id}`);
    console.log("📋 Request query:", req.query);

    // Get entityId from query params (selected organization)
    const { entityId } = req.query;

    const contactData = { ...req.body };

    // Sanitize user reference fields - extract ID from objects if needed
    if (contactData.assignedTo && typeof contactData.assignedTo === 'object') {
      contactData.assignedTo = contactData.assignedTo.id || contactData.assignedTo._id || contactData.assignedTo;
      console.log('✅ Extracted assignedTo ID:', contactData.assignedTo);
    }

    // Remove createdBy from update data - it should never be updated
    if (contactData.createdBy) {
      console.log('🛡️ Removing createdBy from update data to prevent corruption');
      delete contactData.createdBy;
    }

    if (contactData.accountId && typeof contactData.accountId === 'object') {
      contactData.accountId = contactData.accountId.id || contactData.accountId._id || contactData.accountId;
      console.log('✅ Extracted accountId ID:', contactData.accountId);
    }

    // Handle file uploads if present
    if (req.files) {
      if (req.files.contactImage) {
        const result = await cloudinary.uploader.upload(
          req.files.contactImage.path
        );
        contactData.contactImage = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }

      if (req.files.businessCard) {
        const result = await cloudinary.uploader.upload(
          req.files.businessCard.path
        );
        contactData.businessCard = {
          url: result.secure_url,
          publicId: result.public_id,
        };
      }
    }
    
    // Check if this is being set as a primary contact
    if (contactData.accountId && contactData.isPrimaryContact === true) {
      console.log(`Setting contact as primary for account ${contactData.accountId}`);
      // Reset all primary contacts for this account
      await Contact.updateMany(
        { accountId: contactData.accountId, isPrimaryContact: true },
        { isPrimaryContact: false }
      );
    }

    // Update contact WITHOUT populate (to avoid UUID/ObjectId issues)
    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        ...contactData,
        updatedBy: req.user.id || req.user.userId || req.user._id
      },
      { new: true }
    ).populate("accountId", "companyName");

    if (!contact) {
      console.log('Contact not found, returning 404');
      return res.status(404).json({ message: "Contact not found" });
    }

    console.log('Contact updated successfully');

    // Manually populate user information before sending response
    const orgCode = req.tenant?.orgCode || req.user?.tenantId || req.tenantId || req.user?.orgCode;
    const populatedContacts = await populateContactUserInfo([contact], orgCode);

    // Get tenant information for credit deduction
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id;

    if (tenantId && userId) {
      try {
        // Import relationship service for credit deduction
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Resolve the entity/org to deduct from:
        // - If entityId is an ObjectId, map to orgCode
        // - Otherwise assume it is already an orgCode
        let creditDeductionOrg = entityId || null;
        if (creditDeductionOrg && /^[a-f\d]{24}$/i.test(String(creditDeductionOrg))) {
          try {
            const Organization = (await import('../models/Organization.js')).default;
            const orgData = await Organization.findById(creditDeductionOrg).select('orgCode').lean();
            if (orgData?.orgCode) {
              creditDeductionOrg = orgData.orgCode;
              console.log(`✅ Resolved entityId ${entityId} to orgCode for credit deduction: ${creditDeductionOrg}`);
            }
          } catch (resolveErr) {
            console.warn('⚠️ Failed to resolve entityId to orgCode, using provided value:', resolveErr?.message);
          }
        }

        // Fallback to tenant/org on request if still not resolved
        if (!creditDeductionOrg) {
          creditDeductionOrg = req.tenant?.orgCode || req.user?.orgCode || null;
        }

        // Relationship service should already be initialized at server startup
        console.log('🔄 Using relationship service for contact update credit deduction with org:', creditDeductionOrg);

        // Deduct credits for contact update
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.contacts.update',
          'contact',
          contact._id.toString(),
          {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email
          },
          {
            operationType: 'update',
            entityType: 'contact',
            entityId: contact._id.toString()
          },
          creditDeductionOrg
        );

        console.log('💰 Credits deducted for contact update:', creditResult);

        // Include credit deduction info in response for real-time UI update
        const responseData = populatedContacts[0] || contact;
        // Prefer actual deducted/remaining values; fall back to cost/availableCredits if shape changes
        const creditsDeducted =
          creditResult?.creditsDeducted ??
          creditResult?.creditCost ??
          0;

        const availableCredits =
          creditResult?.remainingCredits ??
          creditResult?.availableCredits ??
          creditResult?.creditRecord?.availableCredits ??
          0;

        responseData.creditDeduction = {
          operationCode: 'crm.contacts.update',
          creditsDeducted,
          availableCredits,
        };

        return res.json(responseData);

      } catch (creditError) {
        console.error('❌ Error deducting credits for contact update:', creditError);
        // Continue with the response even if credit deduction fails
        // This prevents update failures due to credit issues
      }
    }

    res.json(populatedContacts[0] || contact);
  } catch (err) {
    console.error("Error updating contact:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const setPrimaryContact = async (req, res) => {
  try {
    console.log(`Setting contact ${req.params.contactId} as primary`);
    console.log("📋 Request query:", req.query);

    // Get entityId from query params (selected organization)
    const { entityId } = req.query;

    const { accountId } = req.body;
    
    if (!accountId) {
      console.log('Account ID is missing, returning 400');
      return res.status(400).json({ message: 'Account ID is required' });
    }
    
    // Get effective user (handles both external and local auth)
    const user = await getEffectiveUser(req);
    
    if (!user) {
      console.log('❌ Could not get effective user');
      return res.status(401).json({ message: 'Authentication failed' });
    }
    
    // First verify the user has access to this account
    const account = await Account.findById(accountId);
    
    if (!account) {
      console.log('Account not found, returning 404');
      return res.status(404).json({ message: 'Account not found' });
    }
    
    // For external users, grant broad access
    if (user.isExternalUser) {
      console.log('🎯 External user - granting access to set primary contact');
      // External users can set primary contacts for any account for now
    } else {
      // Check if user has access to this account based on zone
      if (user.role !== 'super_admin') {
        const userHasAccess = account.zone && user.zone && 
          user.zone.includes(account.zone);
        
        console.log('User has access to account:', userHasAccess);
        
        if (!userHasAccess) {
          console.log('Access denied, returning 403');
          return res.status(403).json({ message: 'Access denied to this account' });
        }
      }
    }
    
    // Find the contact
    const contact = await Contact.findById(req.params.contactId);
    
    if (!contact) {
      console.log('Contact not found, returning 404');
      return res.status(404).json({ message: 'Contact not found' });
    }
    
    // Verify the contact belongs to the specified account
    if (contact.accountId.toString() !== accountId) {
      console.log('Contact does not belong to account, returning 400');
      return res.status(400).json({ message: 'Contact does not belong to the specified account' });
    }
    
    // Reset all primary contacts for this account
    await Contact.updateMany(
      { accountId: accountId, isPrimaryContact: true },
      { isPrimaryContact: false }
    );
    
    // Set this contact as primary
    contact.isPrimaryContact = true;
    await contact.save();

    console.log('Contact set as primary successfully');

    const tenantId = req.tenant?.id || req.user?.tenantId;

    // Log activity for setting primary contact
    if (tenantId && req.user?.id) {
      try {
        // Import relationship service for credit checking and activity logging
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Check if this operation requires credits
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          req.user.id,
          'crm.contacts.update',
          'contact',
          contact._id.toString(),
          {
            operationType: 'set_primary',
            contactName: `${contact.firstName} ${contact.lastName}`,
            accountId: accountId,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/contacts/:contactId/set-primary',
              method: 'PUT'
            }
          },
          entityId
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for setting primary contact: ${creditResult.creditsUsed} credits`);
        } else {
          console.log(`⚠️ Credit deduction returned non-success: ${creditResult.message}`);
        }

      } catch (logError) {
        console.error('❌ Failed to log set primary contact activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    res.json(contact);
  } catch (err) {
    console.error('Error setting primary contact:', err.message);
    res.status(500).send('Server Error');
  }
};

export const deleteContact = async (req, res) => {
  try {
    console.log(`Soft deleting contact with ID: ${req.params.id}`);
    console.log("📋 Request query:", req.query);

    // Get entityId from query params (selected organization)
    const { entityId } = req.query;

    if (!req.params.id) {
      console.log('ID is missing, returning 404');
      return res.status(404).json({ message: "id is missing" });
    }

    const contact = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        deleted: true,
        updatedBy: req.user.id
      },
      { new: true }
    );

    if (!contact) {
      console.log('Contact not found, returning 404');
      return res.status(404).json({ message: "Contact not found" });
    }

    // Delete associated images from cloudinary
    if (contact.contactImage?.publicId) {
      await cloudinary.uploader.destroy(contact.contactImage.publicId);
    }
    if (contact.businessCard?.publicId) {
      await cloudinary.uploader.destroy(contact.businessCard.publicId);
    }

    console.log('Contact deleted successfully');

    const tenantId = req.tenant?.id || req.user?.tenantId;

    // Log activity for contact deletion
    if (tenantId && req.user?.id) {
      try {
        // Import relationship service for credit checking and activity logging
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Check if this operation requires credits
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          req.user.id,
          'crm.contacts.delete',
          'contact',
          contact._id.toString(),
          {
            operationType: 'delete',
            contactName: `${contact.firstName} ${contact.lastName}`,
            email: contact.email,
            accountId: contact.accountId,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/contacts/:id',
              method: 'DELETE'
            }
          },
          entityId
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for contact deletion: ${creditResult.creditsUsed} credits`);
        } else {
          console.log(`⚠️ Credit deduction returned non-success: ${creditResult.message}`);
        }

      } catch (logError) {
        console.error('❌ Failed to log contact deletion activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    res.json({ message: "Contact deleted successfully" });
  } catch (err) {
    console.error("Error deleting contact:", err);
    res.status(500).json({ message: "Server error" });
  }
};