import Opportunity from '../models/Opportunity.js';
import User from "../models/User.js";
import Account from "../models/Account.js";
import FormSubmission from '../models/FormSubmission.js';
import FormTemplate from '../models/FormTemplate.js';
import { getEffectiveUser, getPermissionFilters } from '../utils/authHelpers.js';
import { sanitizeObjectIdFields, COMMON_OBJECT_ID_FIELDS, populateUserFields, populateCustomFieldsEntities } from '../utils/dataSanitizer.js';
import tenantMiddleware from '../middleware/tenantMiddleware.js';

// Handle opportunity creation from form submissions
const handleFormSubmissionOpportunity = async (req, res, sanitizedBody, consumer, userId, tenantId, entityId) => {
  try {
    const { formSubmissionId, formTemplateId, formData } = sanitizedBody;

    if (!formSubmissionId || !formTemplateId) {
      return res.status(400).json({
        error: 'Form submission ID and template ID are required for form submissions'
      });
    }

    // Verify form submission exists and belongs to user
    const formSubmission = await FormSubmission.findOne({
      _id: formSubmissionId,
      submittedBy: userId,
      tenantId: tenantId
    });

    if (!formSubmission) {
      return res.status(404).json({
        error: 'Form submission not found or access denied'
      });
    }

    // Verify form template
    const formTemplate = await FormTemplate.findOne({
      _id: formTemplateId,
      tenantId: tenantId,
      isActive: true
    });

    if (!formTemplate) {
      return res.status(404).json({
        error: 'Form template not found or inactive'
      });
    }

    // Create opportunity from form submission
    const opportunity = await Opportunity.createFromFormSubmission(formSubmission, userId);

    // Ensure customFields is always an object in the response
    if (!opportunity.customFields || typeof opportunity.customFields !== 'object') {
      opportunity.customFields = {};
    }

    // Log activity
    await consumer.logActivity({
      userId,
      operation: 'crm.opportunities.create',
      entityType: 'opportunity',
      entityId: opportunity._id,
      entityName: opportunity.name,
      entityStatus: opportunity.stage,
      creditCost: 0, // Form submissions may have different credit rules
      creditsUsed: 0,
      sessionId: req.sessionID,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      metadata: {
        formSubmissionId: formSubmissionId,
        formTemplateId: formTemplateId,
        isFormSubmission: true
      }
    });

    // Populate related data
    await opportunity.populate([
      { path: 'accountId', select: 'companyName' },
      { path: 'primaryContactId', select: 'firstName lastName' },
      { path: 'assignedTo', select: 'firstName lastName' },
      { path: 'createdBy', select: 'firstName lastName' },
      { path: 'updatedBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      data: opportunity,
      message: 'Opportunity created successfully from form submission'
    });

  } catch (error) {
    console.error('Error handling form submission opportunity:', error);
    res.status(500).json({
      error: 'Failed to create opportunity from form submission',
      message: error.message
    });
  }
};
export const createOpportunity = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId;
    const { entityId } = req.query; // Selected organization from query params
    const { isFormSubmission, formSubmissionId, formTemplateId } = req.body;

    console.log(`📝 Creating opportunity - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}, isFormSubmission: ${isFormSubmission}`);

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.opportunities.create', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get user context
    const userContext = await consumer.getUserOrganizationContext(userId);

    // Sanitize request data - convert empty strings to undefined for ObjectId fields
    const sanitizedBody = sanitizeObjectIdFields(req.body, ['primaryContactId', 'accountId', 'assignedTo']);

    // Handle form submissions differently
    if (isFormSubmission) {
      return await handleFormSubmissionOpportunity(req, res, sanitizedBody, consumer, userId, tenantId, entityId);
    }

    // Check if this is a form-based creation (has formTemplateId)
    const hasFormTemplate = sanitizedBody.formTemplateId || req.body.formTemplateId;
    if (hasFormTemplate) {
      console.log('📝 Detected form-based opportunity creation with formTemplateId:', hasFormTemplate);
      sanitizedBody.isFormSubmission = true;
      sanitizedBody.formTemplateId = hasFormTemplate;

      // For form-based creations, separate custom fields automatically
      console.log('🔧 Processing form-based opportunity creation');

      // Standard opportunity fields that are always considered standard
      const standardOpportunityFields = new Set([
        'name', 'accountId', 'primaryContactId', 'oem', 'stage', 'status', 'type',
        'revenue', 'profitability', 'expectedProfit', 'expense', 'services',
        'expectedCloseDate', 'actualCloseDate', 'description', 'nextStep',
        'competition', 'decisionCriteria', 'assignedTo', 'formTemplateId',
        'isFormSubmission', 'createdBy'
      ]);

      // Initialize customFields
      sanitizedBody.customFields = sanitizedBody.customFields || {};

      // Any field not in standard opportunity fields gets moved to customFields
      // This mimics how accounts work - any extra fields become custom fields
      for (const [key, value] of Object.entries(sanitizedBody)) {
        if (!standardOpportunityFields.has(key) && key !== 'customFields') {
          sanitizedBody.customFields[key] = value;
          delete sanitizedBody[key];
        }
      }

      console.log(`📊 Form-based separation: ${Object.keys(sanitizedBody.customFields).length} custom fields identified`);
      console.log('📋 Custom fields:', Object.keys(sanitizedBody.customFields));
    }

    // Check and deduct credits BEFORE creating the opportunity (skip for form submissions)
    let creditDeductionOrg = null;
    let creditResult = null;

    if (tenantId && userId && !isFormSubmission) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Resolve entityId to orgCode if needed
        if (entityId) {
          if (/^[a-f\d]{24}$/i.test(entityId)) {
            // entityId is an ObjectId, try to resolve it to orgCode
            try {
              const Organization = (await import('../models/Organization.js')).default;
              const orgData = await Organization.findById(entityId).select('orgCode').lean();
              if (orgData) {
                creditDeductionOrg = orgData.orgCode;
                console.log(`✅ Resolved entityId ${entityId} to orgCode: ${creditDeductionOrg}`);
              } else {
                creditDeductionOrg = entityId;
              }
            } catch (lookupError) {
              creditDeductionOrg = entityId;
            }
          } else {
            creditDeductionOrg = entityId;
          }
        }

        // Use tenant orgCode as fallback
        if (!creditDeductionOrg) {
          creditDeductionOrg = req.tenant?.orgCode || req.user?.orgCode;
        }

        console.log(`💰 Checking credits for opportunity creation with orgCode: ${creditDeductionOrg}`);

        // Deduct credits for opportunity creation BEFORE creating the opportunity
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.opportunities.create',
          'opportunity',
          null, // resourceId will be set after creation
          {
            opportunityName: sanitizedBody.name,
            accountId: sanitizedBody.accountId,
            stage: sanitizedBody.stage,
            revenue: sanitizedBody.revenue
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/opportunities',
              method: 'POST',
              isFormSubmission: false
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for opportunity creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create opportunity',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.opportunities.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for opportunity creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.opportunities.create',
            error: creditError.message
          }
        });
      }
    }

    // Create opportunity with tenant isolation
    // Set tenantId for proper multi-tenant filtering
    const opportunityData = {
      ...sanitizedBody,
      tenantId: tenantId,
      createdBy: userId
    };

    // Provide sensible defaults for missing required fields to make the system more flexible
    if (!opportunityData.name || opportunityData.name.trim() === '') {
      opportunityData.name = `Opportunity ${new Date().toISOString().split('T')[0]}`;
    }

    if (!opportunityData.stage) {
      opportunityData.stage = 'prospecting';
    }

    if (!opportunityData.status) {
      opportunityData.status = 'prospect';
    }

    if (!opportunityData.revenue) {
      opportunityData.revenue = 0;
    }

    if (!opportunityData.profitability) {
      opportunityData.profitability = 0;
    }

    if (!opportunityData.expectedCloseDate) {
      // Set default close date to 90 days from now
      opportunityData.expectedCloseDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    }

    // Handle accountId - if not provided, we can still create the opportunity
    // The account can be assigned later through updates
    if (!opportunityData.accountId) {
      console.log('⚠️ No accountId provided for opportunity - allowing creation for flexibility');
      // We don't set a default accountId, allowing the opportunity to be created without one
    }


    console.log(`📝 Creating opportunity with data:`, {
      name: opportunityData.name,
      accountId: opportunityData.accountId,
      accountIdType: typeof opportunityData.accountId,
      expectedCloseDate: opportunityData.expectedCloseDate,
      createdBy: opportunityData.createdBy,
      stage: opportunityData.stage,
      status: opportunityData.status,
      revenue: opportunityData.revenue,
      profitability: opportunityData.profitability
    });
    
    // Verify the accountId exists and belongs to the correct orgCode
    if (opportunityData.accountId) {
      const Account = (await import('../models/Account.js')).default;
      const account = await Account.findById(opportunityData.accountId).select('orgCode companyName').lean();
      if (account) {
        console.log(`✅ Account found for opportunity:`, {
          accountId: account._id.toString(),
          companyName: account.companyName,
          orgCode: account.orgCode,
          matchesEntityId: account.orgCode === creditDeductionOrg || account.orgCode === entityId
        });
      } else {
        console.warn(`⚠️ Account not found for accountId: ${opportunityData.accountId}`);
      }
    }
    
    const opportunity = new Opportunity(opportunityData);
    await opportunity.save();

    console.log(`✅ Opportunity created successfully:`, {
      id: opportunity._id.toString(),
      accountId: opportunity.accountId?.toString(),
      accountIdType: typeof opportunity.accountId,
      name: opportunity.name
    });

    // Update activity log with the actual opportunity ID if credits were deducted
    if (creditResult && creditResult.success && opportunity._id) {
      try {
        const ActivityLog = (await import('../models/ActivityLog.js')).default;
        // Find the most recent activity log for this user/operation with 'pending' entityId
        // Match by userId, entityType, action, and accountId in details to ensure we get the right one
        const activityLog = await ActivityLog.findOne({
          userId: userId,
          entityType: 'opportunity',
          action: 'create',
          entityId: 'pending',
          orgCode: creditDeductionOrg || entityId,
          'details.accountId': opportunityData.accountId?.toString() || opportunityData.accountId,
          createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
        }).sort({ createdAt: -1 });
        
        if (activityLog) {
          activityLog.entityId = opportunity._id.toString();
          // Update details to remove resourceIdPending flag
          if (activityLog.details) {
            activityLog.details.resourceIdPending = false;
          }
          await activityLog.save();
          console.log(`✅ Updated activity log ${activityLog._id} with opportunity ID: ${opportunity._id.toString()}`);
        } else {
          console.warn(`⚠️ Could not find activity log to update for opportunity ${opportunity._id}`);
          // Try a broader search without time constraint
          const fallbackLog = await ActivityLog.findOne({
            userId: userId,
            entityType: 'opportunity',
            action: 'create',
            entityId: 'pending',
            'details.accountId': opportunityData.accountId?.toString() || opportunityData.accountId
          }).sort({ createdAt: -1 });
          
          if (fallbackLog) {
            fallbackLog.entityId = opportunity._id.toString();
            if (fallbackLog.details) {
              fallbackLog.details.resourceIdPending = false;
            }
            await fallbackLog.save();
            console.log(`✅ Updated fallback activity log ${fallbackLog._id} with opportunity ID: ${opportunity._id.toString()}`);
          }
        }
      } catch (updateError) {
        console.error('⚠️ Error updating activity log resource ID:', updateError);
        // Don't fail the request if this update fails
      }
    }

    // Populate the opportunity for response
    const populatedOpportunity = await Opportunity.findById(opportunity._id)
      .populate('accountId', 'companyName zone')
      .populate('primaryContactId', 'firstName lastName email contactMobile role')
      .lean();

    // Manual population for assignedTo and createdBy
    const opportunitiesArray = [populatedOpportunity];
    const populatedOpportunities = await populateUserFields(opportunitiesArray, ['assignedTo', 'createdBy'], ['firstName', 'lastName', 'email', 'contactMobile', 'role']);
    const formattedOpportunity = populatedOpportunities[0] || populatedOpportunity;

    // Helper function to convert Decimal128 or MongoDB number objects to regular numbers
    const convertDecimal128 = (value) => {
      if (value === null || value === undefined) return value;
      // Handle MongoDB Decimal128 format: {$numberDecimal: "123.45"}
      if (typeof value === 'object' && value.$numberDecimal !== undefined) {
        return parseFloat(value.$numberDecimal);
      }
      // Handle regular Decimal128 objects (if they have toString method)
      if (typeof value === 'object' && typeof value.toString === 'function') {
        return parseFloat(value.toString());
      }
      // Already a number or string
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    };

    // Ensure customFields is always an object
    if (!formattedOpportunity.customFields || typeof formattedOpportunity.customFields !== 'object') {
      formattedOpportunity.customFields = {};
    }

    // Add custom fields count for debugging
    formattedOpportunity.customFieldsCount = Object.keys(formattedOpportunity.customFields).length;

    // Convert Decimal128 fields to numbers
    if (formattedOpportunity.revenue !== undefined) {
      formattedOpportunity.revenue = convertDecimal128(formattedOpportunity.revenue);
    }
    if (formattedOpportunity.profitability !== undefined) {
      formattedOpportunity.profitability = convertDecimal128(formattedOpportunity.profitability);
    }
    if (formattedOpportunity.expectedProfit !== undefined) {
      formattedOpportunity.expectedProfit = convertDecimal128(formattedOpportunity.expectedProfit);
    }
    if (formattedOpportunity.expense !== undefined) {
      formattedOpportunity.expense = convertDecimal128(formattedOpportunity.expense);
    }

    // Format names
    if (formattedOpportunity.assignedTo) {
      formattedOpportunity.assignedTo.name = `${formattedOpportunity.assignedTo.firstName || ''} ${formattedOpportunity.assignedTo.lastName || ''}`.trim() || formattedOpportunity.assignedTo.email;
    }
    if (formattedOpportunity.createdBy) {
      formattedOpportunity.createdBy.name = `${formattedOpportunity.createdBy.firstName || ''} ${formattedOpportunity.createdBy.lastName || ''}`.trim() || formattedOpportunity.createdBy.email;
    }
    if (formattedOpportunity.primaryContactId) {
      formattedOpportunity.primaryContactId.name = `${formattedOpportunity.primaryContactId.firstName || ''} ${formattedOpportunity.primaryContactId.lastName || ''}`.trim();
    }

    // Add credit deduction data to response if credits were deducted
    if (creditResult?.success) {
      formattedOpportunity.creditDeduction = {
        operationCode: 'crm.opportunities.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    // Return the opportunity directly (not wrapped in success object) to match frontend expectations
    res.status(201).json(formattedOpportunity);
  } catch (err) {
    console.error('❌ Error creating opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getOpportunities = async (req, res) => {
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
    const baseQuery = await getPermissionFilters(user, 'opportunity', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Opportunities can be filtered through accountId (for opportunities linked to accounts)
    // or through tenantId (for form submissions that don't have accountIds)
    let query = {};

    if (baseQuery.orgCode) {
      // For orgCode filtering, we need to check both:
      // 1. Opportunities linked to accounts in this orgCode
      // 2. Opportunities created from form submissions in this tenant/orgCode

      const Account = (await import('../models/Account.js')).default;
      const accounts = await Account.find({ orgCode: baseQuery.orgCode }).select('_id').lean();
      const accountIds = accounts.map(acc => acc._id);

      console.log(`🔍 Found ${accounts.length} accounts with orgCode: ${baseQuery.orgCode}`);
      console.log(`🔍 Account IDs:`, accountIds.map(id => id.toString()));

      // Build OR query to include both account-linked opportunities and tenant-based opportunities
      const orConditions = [];

      if (accountIds.length > 0) {
        orConditions.push({ accountId: { $in: accountIds } });
      }

      // Also include opportunities that belong to this tenant directly (for form submissions)
      // We need to get the tenantId that corresponds to this orgCode
      const Organization = (await import('../models/Organization.js')).default;
      const orgData = await Organization.findOne({ orgCode: baseQuery.orgCode }).select('tenantId').lean();

      if (orgData && orgData.tenantId) {
        orConditions.push({ tenantId: orgData.tenantId });
        console.log(`🔍 Also filtering by tenantId: ${orgData.tenantId} for orgCode: ${baseQuery.orgCode}`);
      }

      if (orConditions.length > 0) {
        query.$or = orConditions;
        console.log(`🔍 Filtering opportunities with OR conditions:`, JSON.stringify(orConditions, null, 2));
      } else {
        // No accounts or tenant found for this orgCode, return empty result
        console.log(`⚠️ No accounts or tenant found for orgCode: ${baseQuery.orgCode}, returning empty opportunities`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - get user's accessible organizations and filter by those
      const { getAccessibleOrganizations } = await import('../utils/authHelpers.js');
      const accessibleOrgs = await getAccessibleOrganizations(user);

      if (accessibleOrgs.length > 0) {
        const Account = (await import('../models/Account.js')).default;
        const accounts = await Account.find({ orgCode: { $in: accessibleOrgs } }).select('_id').lean();
        const accountIds = accounts.map(acc => acc._id);

        // Build OR query for accessible organizations
        const orConditions = [];

        if (accountIds.length > 0) {
          orConditions.push({ accountId: { $in: accountIds } });
        }

        // Also include opportunities from accessible tenants
        const Organization = (await import('../models/Organization.js')).default;
        const orgs = await Organization.find({ orgCode: { $in: accessibleOrgs } }).select('tenantId').lean();
        const tenantIds = orgs.map(org => org.tenantId).filter(Boolean);

        if (tenantIds.length > 0) {
          orConditions.push({ tenantId: { $in: tenantIds } });
        }

        if (orConditions.length > 0) {
          query.$or = orConditions;
          console.log(`🔍 Filtering opportunities by accessible organizations with OR conditions`);
        } else {
          console.log(`⚠️ No accounts or tenants found for accessible organizations, returning empty opportunities`);
          return res.json([]);
        }
      } else {
        console.log('⚠️ No orgCode filter and no accessible organizations, returning empty opportunities');
        return res.json([]);
      }
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    // Execute the query with filters
    // Convert accountIds to strings for comparison debugging
    if (query.accountId && query.accountId.$in) {
      const accountIdStrings = query.accountId.$in.map(id => id.toString());
      console.log(`🔍 Query accountIds (as strings for comparison):`, accountIdStrings);
    }
    
    // Use lean() to get plain objects for better performance and to avoid toObject() issues
    let opportunities = await Opportunity.find(query)
      .populate('accountId', 'companyName zone orgCode industry')
      .populate('primaryContactId', 'firstName lastName email contactMobile role')
      .lean()
      .sort({ createdAt: -1 });
    
    // For opportunities with accountName in customFields, populate it from accountId
    opportunities = opportunities.map(opp => {
      if (opp.customFields && opp.customFields.accountName && opp.accountId) {
        // If accountName is an ID string and matches accountId, replace it with account object
        const accountNameValue = opp.customFields.accountName;
        if (typeof accountNameValue === 'string' && accountNameValue.length === 24) {
          const accountIdStr = opp.accountId._id?.toString() || opp.accountId.toString();
          if (accountIdStr === accountNameValue && typeof opp.accountId === 'object') {
            // Replace accountName ID with populated account object for display
            opp.customFields.accountName = opp.accountId;
          }
        }
      }
      return opp;
    });

    // Debug: Log opportunity accountIds to verify they match
    if (opportunities.length > 0) {
      console.log(`🔍 Found ${opportunities.length} opportunities, sample accountIds:`, 
        opportunities.slice(0, 3).map(opp => ({
          oppId: opp._id.toString(),
          accountId: opp.accountId?._id?.toString() || opp.accountId?.toString(),
          accountIdString: (opp.accountId?._id || opp.accountId)?.toString(),
          accountOrgCode: opp.accountId?.orgCode
        }))
      );
    } else {
      // Check if there are any opportunities at all (without filters)
      const totalCount = await Opportunity.countDocuments({});
      console.log(`🔍 Total opportunities in DB: ${totalCount}`);
      
      if (totalCount > 0 && query.accountId && query.accountId.$in) {
        const allOpportunities = await Opportunity.find({}).select('accountId').limit(10).lean();
        console.log(`🔍 Sample opportunity accountIds (unfiltered):`, allOpportunities.map(opp => ({
          accountId: opp.accountId?.toString(),
          accountIdType: typeof opp.accountId
        })));
        
        // Check if any of these accountIds match our filter
        const filterAccountIdStrings = query.accountId.$in.map(id => id.toString());
        const matchingAccountIds = allOpportunities
          .map(opp => opp.accountId?.toString())
          .filter(id => id && filterAccountIdStrings.includes(id));
        console.log(`🔍 Matching accountIds found:`, matchingAccountIds);
        console.log(`🔍 Filter accountIds (as strings):`, filterAccountIdStrings);
        console.log(`🔍 All opportunity accountIds (as strings):`, allOpportunities.map(opp => opp.accountId?.toString()));
        
        // Also check the specific accountId from activity logs
        const testAccountId = '68e7fdc0a9749aa5a48b34a4';
        const testAccountInFilter = filterAccountIdStrings.includes(testAccountId);
        console.log(`🔍 Test accountId ${testAccountId} in filter: ${testAccountInFilter}`);
        const testAccountInOpportunities = allOpportunities.some(opp => opp.accountId?.toString() === testAccountId);
        console.log(`🔍 Test accountId ${testAccountId} in opportunities: ${testAccountInOpportunities}`);
      }
    }

    // Manual population for assignedTo and createdBy to handle UUID strings
    opportunities = await populateUserFields(opportunities, ['assignedTo', 'createdBy'], ['firstName', 'lastName', 'email', 'contactMobile', 'role']);
    
    // Populate entity/user fields in customFields
    // Load templates for opportunities that have formTemplateId
    const opportunitiesWithPopulatedCustomFields = await Promise.all(
      opportunities.map(async (opp) => {
        if (opp.formTemplateId && opp.customFields) {
          try {
            const template = await FormTemplate.findById(opp.formTemplateId).lean();
            return await populateCustomFieldsEntities(opp, template);
          } catch (err) {
            console.warn(`Failed to load template for opportunity ${opp._id}:`, err.message);
            return await populateCustomFieldsEntities(opp, null);
          }
        }
        return await populateCustomFieldsEntities(opp, null);
      })
    );
    opportunities = opportunitiesWithPopulatedCustomFields;

    console.log(`✅ Found ${opportunities.length} opportunities after filtering`);

    // Helper function to convert Decimal128 or MongoDB number objects to regular numbers
    const convertDecimal128 = (value) => {
      if (value === null || value === undefined) return value;
      // Handle MongoDB Decimal128 format: {$numberDecimal: "123.45"}
      if (typeof value === 'object' && value.$numberDecimal !== undefined) {
        return parseFloat(value.$numberDecimal);
      }
      // Handle regular Decimal128 objects (if they have toString method)
      if (typeof value === 'object' && typeof value.toString === 'function') {
        return parseFloat(value.toString());
      }
      // Already a number or string
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    };

    // Transform data to include formatted names
    // Note: opportunities might be plain objects after populateUserFields, so handle both cases
    const formattedOpportunities = opportunities.map(opp => {
      // Handle both Mongoose documents and plain objects
      const oppObj = typeof opp.toObject === 'function' ? opp.toObject() : { ...opp };

      // Ensure customFields is always an object
      if (!oppObj.customFields || typeof oppObj.customFields !== 'object') {
        oppObj.customFields = {};
      }

      // Add custom fields count for debugging
      oppObj.customFieldsCount = Object.keys(oppObj.customFields).length;

      // Convert Decimal128 fields to numbers
      if (oppObj.revenue !== undefined) {
        oppObj.revenue = convertDecimal128(oppObj.revenue);
      }
      if (oppObj.profitability !== undefined) {
        oppObj.profitability = convertDecimal128(oppObj.profitability);
      }
      if (oppObj.expectedProfit !== undefined) {
        oppObj.expectedProfit = convertDecimal128(oppObj.expectedProfit);
      }
      if (oppObj.expense !== undefined) {
        oppObj.expense = convertDecimal128(oppObj.expense);
      }

      // Format assignedTo name
      if (oppObj.assignedTo) {
        oppObj.assignedTo.name = `${oppObj.assignedTo.firstName || ''} ${oppObj.assignedTo.lastName || ''}`.trim() || oppObj.assignedTo.email;
      }

      // Format createdBy name
      if (oppObj.createdBy) {
        oppObj.createdBy.name = `${oppObj.createdBy.firstName || ''} ${oppObj.createdBy.lastName || ''}`.trim() || oppObj.createdBy.email;
      }

      // Format primaryContact name
      if (oppObj.primaryContactId) {
        oppObj.primaryContactId.name = `${oppObj.primaryContactId.firstName || ''} ${oppObj.primaryContactId.lastName || ''}`.trim();
      }

      // Ensure id field is set for frontend compatibility
      if (!oppObj.id && oppObj._id) {
        oppObj.id = oppObj._id.toString();
      }

      return oppObj;
    });

    res.json(formattedOpportunities);
  } catch (err) {
    console.error('❌ Error getting opportunities:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getOpportunity = async (req, res) => {
  try {
    let opportunity = await Opportunity.findById(req.params.id)
      .populate('accountId', 'companyName zone orgCode industry')
      .populate('primaryContactId', 'firstName lastName email contactMobile role');
      // Note: createdBy and assignedTo use Mixed type (can be strings or ObjectIds)
      // So we populate them separately below using populateUserFields
    
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }
    
    // Helper function to convert Decimal128 or MongoDB number objects to regular numbers
    const convertDecimal128 = (value) => {
      if (value === null || value === undefined) return value;
      // Handle MongoDB Decimal128 format: {$numberDecimal: "123.45"}
      if (typeof value === 'object' && value.$numberDecimal !== undefined) {
        return parseFloat(value.$numberDecimal);
      }
      // Handle regular Decimal128 objects (if they have toString method)
      if (typeof value === 'object' && typeof value.toString === 'function') {
        return parseFloat(value.toString());
      }
      // Already a number or string
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    };

    // Populate user fields (assignedTo, createdBy)
    const opportunitiesArray = [opportunity];
    const populatedOpportunities = await populateUserFields(opportunitiesArray, ['assignedTo', 'createdBy'], ['firstName', 'lastName', 'email', 'contactMobile', 'role']);
    opportunity = populatedOpportunities[0] || opportunity;
    
    // Populate entity/user fields in customFields
    if (opportunity.formTemplateId && opportunity.customFields) {
      try {
        const template = await FormTemplate.findById(opportunity.formTemplateId).lean();
        opportunity = await populateCustomFieldsEntities(opportunity, template);
      } catch (err) {
        console.warn(`Failed to load template for opportunity ${opportunity._id}:`, err.message);
        opportunity = await populateCustomFieldsEntities(opportunity, null);
      }
    } else if (opportunity.customFields) {
      opportunity = await populateCustomFieldsEntities(opportunity, null);
    }
    
    // Transform the opportunity data to include formatted names
    let oppObj = opportunity.toObject ? opportunity.toObject() : opportunity;
    
    // Convert Decimal128 fields to numbers
    if (oppObj.revenue !== undefined) {
      oppObj.revenue = convertDecimal128(oppObj.revenue);
    }
    if (oppObj.profitability !== undefined) {
      oppObj.profitability = convertDecimal128(oppObj.profitability);
    }
    if (oppObj.expectedProfit !== undefined) {
      oppObj.expectedProfit = convertDecimal128(oppObj.expectedProfit);
    }
    if (oppObj.expense !== undefined) {
      oppObj.expense = convertDecimal128(oppObj.expense);
    }
    
    // Handle assignedTo - could be ObjectId, String, or populated object
    if (oppObj.assignedTo) {
      if (typeof oppObj.assignedTo === 'object' && oppObj.assignedTo !== null && oppObj.assignedTo.firstName !== undefined) {
        // Already populated or is an object with user data
        oppObj.assignedTo.name = `${oppObj.assignedTo.firstName || ''} ${oppObj.assignedTo.lastName || ''}`.trim() || oppObj.assignedTo.email;
      } else {
        // It's a string or ObjectId, keep as is
        oppObj.assignedTo = oppObj.assignedTo.toString();
      }
    }
    
    // Handle createdBy - could be ObjectId, String, or populated object
    if (oppObj.createdBy) {
      if (typeof oppObj.createdBy === 'object' && oppObj.createdBy !== null && oppObj.createdBy.firstName !== undefined) {
        // Already populated or is an object with user data
        oppObj.createdBy.name = `${oppObj.createdBy.firstName || ''} ${oppObj.createdBy.lastName || ''}`.trim() || oppObj.createdBy.email;
      } else {
        // It's a string or ObjectId, keep as is
        oppObj.createdBy = oppObj.createdBy.toString();
      }
    }
    
    // Format primaryContact name
    if (oppObj.primaryContactId) {
      oppObj.primaryContactId.name = `${oppObj.primaryContactId.firstName || ''} ${oppObj.primaryContactId.lastName || ''}`.trim();
    }
    
    res.json(oppObj);
  } catch (err) {
    console.error('❌ Error getting opportunity:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while fetching the opportunity'
    });
  }
};

export const updateOpportunity = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Get existing opportunity first
    const existingOpportunity = await Opportunity.findById(req.params.id);
    if (!existingOpportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.opportunities.update', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE updating the opportunity
    let creditDeductionOrg = null;
    let creditResult = null;

    if (tenantId && userId) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Resolve entityId to orgCode if needed
        if (entityId) {
          if (/^[a-f\d]{24}$/i.test(entityId)) {
            try {
              const Organization = (await import('../models/Organization.js')).default;
              const orgData = await Organization.findById(entityId).select('orgCode').lean();
              if (orgData) {
                creditDeductionOrg = orgData.orgCode;
              } else {
                creditDeductionOrg = entityId;
              }
            } catch (lookupError) {
              creditDeductionOrg = entityId;
            }
          } else {
            creditDeductionOrg = entityId;
          }
        }

        if (!creditDeductionOrg) {
          creditDeductionOrg = req.tenant?.orgCode || req.user?.orgCode;
        }

        console.log(`💰 Checking credits for opportunity update with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.opportunities.update',
          'opportunity',
          req.params.id,
          {
            opportunityName: req.body.name || existingOpportunity.name,
            accountId: req.body.accountId || existingOpportunity.accountId,
            stage: req.body.stage || existingOpportunity.stage,
            revenue: req.body.revenue || existingOpportunity.revenue
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/opportunities',
              method: 'PUT'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for opportunity update: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to update opportunity',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.opportunities.update'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for opportunity update:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.opportunities.update',
            error: creditError.message
          }
        });
      }
    }

    const opportunity = await Opportunity.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('accountId', 'companyName')
    .populate('primaryContactId', 'firstName lastName');
    // Note: createdBy and assignedTo use Mixed type (can be strings or ObjectIds)
    // So we don't populate them here - handle them separately below

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Helper function to convert Decimal128 or MongoDB number objects to regular numbers
    const convertDecimal128 = (value) => {
      if (value === null || value === undefined) return value;
      // Handle MongoDB Decimal128 format: {$numberDecimal: "123.45"}
      if (typeof value === 'object' && value.$numberDecimal !== undefined) {
        return parseFloat(value.$numberDecimal);
      }
      // Handle regular Decimal128 objects (if they have toString method)
      if (typeof value === 'object' && typeof value.toString === 'function') {
        return parseFloat(value.toString());
      }
      // Already a number or string
      return typeof value === 'number' ? value : parseFloat(value) || 0;
    };

    // Format names for the returned object
    const oppObj = opportunity.toObject();
    
    // Convert Decimal128 fields to numbers
    if (oppObj.revenue !== undefined) {
      oppObj.revenue = convertDecimal128(oppObj.revenue);
    }
    if (oppObj.profitability !== undefined) {
      oppObj.profitability = convertDecimal128(oppObj.profitability);
    }
    if (oppObj.expectedProfit !== undefined) {
      oppObj.expectedProfit = convertDecimal128(oppObj.expectedProfit);
    }
    if (oppObj.expense !== undefined) {
      oppObj.expense = convertDecimal128(oppObj.expense);
    }
    
    // Handle assignedTo - could be ObjectId, String, or populated object
    if (oppObj.assignedTo) {
      if (typeof oppObj.assignedTo === 'object' && oppObj.assignedTo !== null && oppObj.assignedTo.firstName !== undefined) {
        // Already populated or is an object with user data
        oppObj.assignedTo.name = `${oppObj.assignedTo.firstName || ''} ${oppObj.assignedTo.lastName || ''}`.trim() || oppObj.assignedTo.email;
      } else {
        // It's a string or ObjectId, keep as is
        oppObj.assignedTo = oppObj.assignedTo.toString();
      }
    }
    
    // Handle createdBy - could be ObjectId, String, or populated object
    if (oppObj.createdBy) {
      if (typeof oppObj.createdBy === 'object' && oppObj.createdBy !== null && oppObj.createdBy.firstName !== undefined) {
        // Already populated or is an object with user data
        oppObj.createdBy.name = `${oppObj.createdBy.firstName || ''} ${oppObj.createdBy.lastName || ''}`.trim() || oppObj.createdBy.email;
      } else {
        // It's a string or ObjectId, keep as is
        oppObj.createdBy = oppObj.createdBy.toString();
      }
    }

    if (creditResult?.success) {
      oppObj.creditDeduction = {
        operationCode: 'crm.opportunities.update',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(oppObj);
  } catch (err) {
    console.error('❌ Error updating opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const deleteOpportunity = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params
    
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }

    // Get opportunity first before deleting
    const opportunity = await Opportunity.findById(req.params.id);
    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.opportunities.delete', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE deleting the opportunity
    let creditDeductionOrg = null;
    let creditResult = null;

    if (tenantId && userId) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Resolve entityId to orgCode if needed
        if (entityId) {
          if (/^[a-f\d]{24}$/i.test(entityId)) {
            try {
              const Organization = (await import('../models/Organization.js')).default;
              const orgData = await Organization.findById(entityId).select('orgCode').lean();
              if (orgData) {
                creditDeductionOrg = orgData.orgCode;
              } else {
                creditDeductionOrg = entityId;
              }
            } catch (lookupError) {
              creditDeductionOrg = entityId;
            }
          } else {
            creditDeductionOrg = entityId;
          }
        }

        if (!creditDeductionOrg) {
          creditDeductionOrg = req.tenant?.orgCode || req.user?.orgCode;
        }

        console.log(`💰 Checking credits for opportunity deletion with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.opportunities.delete',
          'opportunity',
          req.params.id,
          {
            opportunityName: opportunity.name,
            accountId: opportunity.accountId,
            stage: opportunity.stage,
            revenue: opportunity.revenue
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/opportunities',
              method: 'DELETE'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for opportunity deletion: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to delete opportunity',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.opportunities.delete'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for opportunity deletion:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.opportunities.delete',
            error: creditError.message
          }
        });
      }
    }

    // Delete the opportunity
    await Opportunity.findByIdAndDelete(req.params.id);

    const response = { message: 'Opportunity deleted successfully' };
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.opportunities.delete',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Error deleting opportunity:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};


export const updateOpportunityStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage, previousStage } = req.body;

    if (!stage) {
      return res.status(400).json({ message: 'Stage is required' });
    }

    const opportunity = await Opportunity.findById(id);

    if (!opportunity) {
      return res.status(404).json({ message: 'Opportunity not found' });
    }

    // Update the stageHistory array
    const stageHistoryEntry = {
      fromStage: previousStage || opportunity.stage,
      toStage: stage,
      updatedBy: req.user.userId || req.user.id
    };

    opportunity.stage = stage;
    opportunity.stageHistory = [...(opportunity.stageHistory || []), stageHistoryEntry];

    await opportunity.save();
    res.status(200).json({ message: 'Opportunity stage updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createOpportunity, getOpportunities, getOpportunity, updateOpportunity, deleteOpportunity, updateOpportunityStage };