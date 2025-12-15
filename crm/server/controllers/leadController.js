import { validationResult } from 'express-validator';
import Lead from '../models/Lead.js';
import User from "../models/User.js";
import { getEffectiveUser, getPermissionFilters } from '../utils/authHelpers.js';


export const createLead = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Get selected org from query params if provided
    const { entityId } = req.query;

    // Resolve orgCode properly - if entityId is provided, it might be an org _id that needs to be resolved to orgCode
    let orgCode = req.body.orgCode || req.tenant?.orgCode || req.user?.orgCode;

    console.log(`🔍 Lead creation - entityId: ${entityId}, initial orgCode: ${orgCode}`);

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
    }

    console.log(`🎯 Final orgCode for lead creation: ${orgCode}`);

    const leadData = {
      ...req.body,
      createdBy: req.user.userId || req.user.id,
      orgCode: orgCode
    };

    // Get tenant information for credit checking
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.userId || req.user?.id;

    // Check credits BEFORE creating the lead
    if (tenantId && userId) {
      try {
        // Import required models and services for credit checking
        const CrmCreditConfig = (await import('../models/CrmCreditConfig.js')).default;
        const { default: relationshipService } = await import('../services/relationshipService.js');

        console.log('🔍 Checking credits before lead creation');

        // Get credit configuration to determine required credits
        // Pass entityId if available to check for entity-specific configs
        const selectedOrgForCredits = entityId || orgCode;
        const creditConfig = await CrmCreditConfig.getEffectiveConfig('crm.leads.create', tenantId, selectedOrgForCredits);

        if (!creditConfig) {
          console.log('⚠️ No credit config found for lead creation - allowing operation');
        } else {
          const requiredCredits = creditConfig.creditCost || 0;

          if (requiredCredits > 0) {
            // Check if user has sufficient credits
            const creditCheck = await relationshipService.checkCredits(
              tenantId,
              userId,
              'crm.leads.create',
              requiredCredits
            );

            if (!creditCheck.allowed) {
              console.warn(`❌ Insufficient credits for lead creation: ${creditCheck.availableCredits} available, ${requiredCredits} required`);

              return res.status(402).json({
                error: 'Payment Required',
                message: 'Insufficient credits to create lead',
                details: {
                  availableCredits: creditCheck.availableCredits,
                  requiredCredits: requiredCredits,
                  operation: 'crm.leads.create'
                }
              });
            }

            console.log(`✅ Sufficient credits available: ${creditCheck.availableCredits} >= ${requiredCredits}`);
          } else {
            console.log('ℹ️ Lead creation has zero credit cost');
          }
        }
      } catch (creditError) {
        console.error('❌ Error checking credits before lead creation:', creditError);

        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.leads.create',
            error: creditError.message
          }
        });
      }
    }

    // Check for existing lead based on unique identifiers
    const existingLead = await Lead.findOne({
      $or: [
        { email: leadData.email },
      ]
    });

    if (existingLead) {
      // Determine which field caused the duplicate
      const duplicateFields = [];
      if (existingLead.email === leadData.email) {
        duplicateFields.push('email');
      }
      if (existingLead.phone === leadData.phone) {
        duplicateFields.push('phone');
      }

      return res.status(409).json({
        message: 'Lead already exists',
        duplicateFields: duplicateFields
      });
    }

    const lead = new Lead(leadData);
    await lead.save();

    console.log('✅ Lead created successfully:', lead._id);

    // Now deduct the credits after successful lead creation
    if (tenantId && userId) {
      try {
        // Import relationship service for credit deduction
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Relationship service should already be initialized at server startup
        console.log('🔄 Using relationship service for lead creation credit deduction');

        // Resolve entityId to orgCode if needed (entityId might be ObjectId, need to convert to orgCode UUID)
        let creditDeductionOrg = null;
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
            // entityId is already a UUID string (orgCode)
            creditDeductionOrg = entityId;
          }
        }
        
        // Fall back to the orgCode used for lead creation if no entityId provided
        if (!creditDeductionOrg) {
          creditDeductionOrg = orgCode;
        }
        
        console.log(`💰 About to deduct credits for lead creation:`);
        console.log(`   - Selected org from query (entityId): ${entityId || 'none'}`);
        console.log(`   - Lead orgCode: ${orgCode}`);
        console.log(`   - Using for credit deduction: ${creditDeductionOrg}`);

        // Deduct credits for lead creation
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.leads.create',
          'lead',
          lead._id.toString(),
          {
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            email: leadData.email,
            company: leadData.company,
            leadSource: leadData.leadSource
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/leads',
              method: 'POST'
            }
          },
          creditDeductionOrg // Pass the selected/switched organization for credit deduction
        );

        if (creditResult.success) {
          console.log(`💰 Credits deducted for lead creation: ${creditResult.creditsDeducted} credits`);

          // Add credit deduction info to response (standardized format for frontend)
          const leadResponse = lead.toObject();
          leadResponse.creditDeduction = {
            operationCode: 'crm.leads.create',
            creditsDeducted: creditResult.creditsDeducted || 0,
            availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
          };

          return res.status(201).json(leadResponse);
        } else {
          console.warn(`❌ Credit deduction failed for lead creation: ${creditResult.message}`);

          // Credit deduction failed - delete the created lead to maintain consistency
          try {
            await Lead.findByIdAndDelete(lead._id);
            console.log(`🗑️ Deleted lead ${lead._id} due to failed credit deduction`);
          } catch (deleteError) {
            console.error('❌ Failed to delete lead after credit deduction failure:', deleteError);
          }

          // Return 402 Payment Required status for insufficient credits
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to perform this operation',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              entityId: creditDeductionOrg || orgCode,
              operation: 'crm.leads.create',
              message: creditResult.message || 'Credit deduction failed'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for lead creation:', creditError);

        // Credit deduction error - delete the created lead to maintain consistency
        try {
          await Lead.findByIdAndDelete(lead._id);
          console.log(`🗑️ Deleted lead ${lead._id} due to credit deduction error`);
        } catch (deleteError) {
          console.error('❌ Failed to delete lead after credit deduction error:', deleteError);
        }

        // Return 402 Payment Required status for credit system errors
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'create_lead',
            error: creditError.message
          }
        });
      }
    } else {
      console.warn('⚠️ Missing tenant or user information for credit deduction');
      // Still return lead without credit deduction
      res.status(201).json(lead.toObject());
    }
  } catch (err) {
    // Handle mongoose unique constraint errors
    if (err.code === 11000) {
      const duplicateFields = Object.keys(err.keyPattern || {});
      return res.status(409).json({ 
        message: 'Duplicate key error',
        duplicateFields: duplicateFields
      });
    }

    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getLeads = async (req, res) => {
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
    const query = await getPermissionFilters(user, 'lead', entityId);
    
    console.log('🔍 Final query filters:', JSON.stringify(query));
    
    // Execute the query with filters
    // Use the permission filters as-is - they should properly filter by orgCode
    const finalQuery = query;
    console.log('🔍 Using query filters:', JSON.stringify(finalQuery));

    const leads = await Lead.find(finalQuery)
      .sort({ createdAt: -1 });

    // Custom populate for createdBy and assignedTo using UserProfile
    // This handles string user IDs that don't match User model ObjectIds
    const populatedLeads = await Promise.all(leads.map(async (lead) => {
      const leadObj = lead.toObject();

      // Populate createdBy
      if (lead.createdBy) {
        const UserProfile = (await import('../models/UserProfile.js')).default;
        const creatorProfile = await UserProfile.findOne({
          userId: lead.createdBy.toString()
        }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');

        if (creatorProfile) {
          leadObj.createdBy = {
            _id: creatorProfile.userId,
            firstName: creatorProfile.personalInfo?.firstName || '',
            lastName: creatorProfile.personalInfo?.lastName || '',
            email: creatorProfile.personalInfo?.email || '',
            userId: creatorProfile.userId
          };
        }
      }

      // Populate assignedTo
      if (lead.assignedTo) {
        const UserProfile = (await import('../models/UserProfile.js')).default;
        const assigneeProfile = await UserProfile.findOne({
          userId: lead.assignedTo.toString()
        }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');

        if (assigneeProfile) {
          leadObj.assignedTo = {
            _id: assigneeProfile.userId,
            firstName: assigneeProfile.personalInfo?.firstName || '',
            lastName: assigneeProfile.personalInfo?.lastName || '',
            email: assigneeProfile.personalInfo?.email || '',
            userId: assigneeProfile.userId
          };
        }
      }

      return leadObj;
    }));
    
    console.log(`Found ${populatedLeads.length} leads after filtering and population`);

    // Transform data to include formatted creator names
    const formattedLeads = populatedLeads.map(lead => {
      lead.id = lead._id;

      // Add formatted creator name
      if (lead.createdBy && typeof lead.createdBy === 'object') {
        lead.createdBy.name = `${lead.createdBy.firstName || ''} ${lead.createdBy.lastName || ''}`.trim() ||
          lead.createdBy.email || '';
      } else if (typeof lead.createdBy === 'string') {
        // If population failed and it's still a string, create a minimal object
        lead.createdBy = {
          _id: lead.createdBy,
          firstName: '',
          lastName: '',
          email: '',
          name: lead.createdBy // Use the string as name
        };
      }

      // Add formatted assignee name
      if (lead.assignedTo && typeof lead.assignedTo === 'object') {
        lead.assignedTo.name = `${lead.assignedTo.firstName || ''} ${lead.assignedTo.lastName || ''}`.trim() ||
          lead.assignedTo.email || '';
      } else if (typeof lead.assignedTo === 'string') {
        // If population failed and it's still a string, create a minimal object
        lead.assignedTo = {
          _id: lead.assignedTo,
          firstName: '',
          lastName: '',
          email: '',
          name: lead.assignedTo // Use the string as name
        };
      }

      return lead;
    });

    // Log activity for leads list view
    const tenantId = req.tenant?.id || req.user?.tenantId;
    if (tenantId && req.user?.id) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logOperationActivity(
          tenantId,
          req.user.id,
          'read',
          'lead',
          null, // No specific resource ID for list operations
          {
            operationType: 'list',
            resultCount: leads.length,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/leads',
              method: 'GET'
            }
          },
          0, // No credits consumed for read operations
          null,
          'success',
          'low'
        );
      } catch (logError) {
        console.error('❌ Failed to log leads list activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    res.json(formattedLeads);
  } catch (err) {
    console.error('Error getting leads:', err);
    res.status(500).json({ message: 'Server Error' });
  }
};

export const getLead = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Custom populate for createdBy and assignedTo using UserProfile
    const leadObj = lead.toObject();

    // Populate createdBy
    if (lead.createdBy) {
      const UserProfile = (await import('../models/UserProfile.js')).default;
      const creatorProfile = await UserProfile.findOne({
        userId: lead.createdBy.toString()
      }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');

      if (creatorProfile) {
        leadObj.createdBy = {
          _id: creatorProfile.userId,
          firstName: creatorProfile.personalInfo?.firstName || '',
          lastName: creatorProfile.personalInfo?.lastName || '',
          email: creatorProfile.personalInfo?.email || '',
          userId: creatorProfile.userId
        };
      }
    }

    // Populate assignedTo
    if (lead.assignedTo) {
      const UserProfile = (await import('../models/UserProfile.js')).default;
      const assigneeProfile = await UserProfile.findOne({
        userId: lead.assignedTo.toString()
      }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');

      if (assigneeProfile) {
        leadObj.assignedTo = {
          _id: assigneeProfile.userId,
          firstName: assigneeProfile.personalInfo?.firstName || '',
          lastName: assigneeProfile.personalInfo?.lastName || '',
          email: assigneeProfile.personalInfo?.email || '',
          userId: assigneeProfile.userId
        };
      }
    }

    // Format creator and assignee names
    if (leadObj.createdBy && typeof leadObj.createdBy === 'object') {
      leadObj.createdBy.name = `${leadObj.createdBy.firstName || ''} ${leadObj.createdBy.lastName || ''}`.trim() ||
        leadObj.createdBy.email || '';
    } else if (typeof leadObj.createdBy === 'string') {
      // If population failed and it's still a string, create a minimal object
      leadObj.createdBy = {
        _id: leadObj.createdBy,
        firstName: '',
        lastName: '',
        email: '',
        name: leadObj.createdBy // Use the string as name
      };
    }

    if (leadObj.assignedTo && typeof leadObj.assignedTo === 'object') {
      leadObj.assignedTo.name = `${leadObj.assignedTo.firstName || ''} ${leadObj.assignedTo.lastName || ''}`.trim() ||
        leadObj.assignedTo.email || '';
    } else if (typeof leadObj.assignedTo === 'string') {
      // If population failed and it's still a string, create a minimal object
      leadObj.assignedTo = {
        _id: leadObj.assignedTo,
        firstName: '',
        lastName: '',
        email: '',
        name: leadObj.assignedTo // Use the string as name
      };
    }

    // Log activity for individual lead view
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const { entityId } = req.query;
    if (tenantId && req.user?.id) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logOperationActivity(
          tenantId,
          req.user.id,
          'read',
          'lead',
          lead._id.toString(),
          {
            operationType: 'view',
            leadName: lead.name,
            status: lead.status,
            entityId: entityId
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/leads/:id',
              method: 'GET'
            }
          },
          0, // No credits consumed for read operations
          null,
          'success',
          'low'
        );
      } catch (logError) {
        console.error('❌ Failed to log lead view activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    res.json(leadObj);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const updateLead = async (req, res) => {
  try {
    // First, get the current lead to compare values
    const currentLead = await Lead.findById(req.params.id);
    
    if (!currentLead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Check for duplicate leads during update
    // Only check fields that are actually being CHANGED (different from current values)
    const duplicateConditions = [];
    
    // Check email only if it's being changed and is not empty
    if (req.body.email !== undefined && req.body.email !== null) {
      const newEmail = typeof req.body.email === 'string' ? req.body.email.trim() : req.body.email;
      const currentEmail = currentLead.email ? currentLead.email.trim() : '';
      
      // Only check for duplicates if email is actually changing and is not empty
      if (newEmail !== '' && newEmail !== currentEmail) {
        duplicateConditions.push({ email: newEmail });
      }
    }
    
    // Check phone only if it's being changed and is not empty
    if (req.body.phone !== undefined && req.body.phone !== null) {
      const newPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
      const currentPhone = currentLead.phone ? currentLead.phone.trim() : '';
      
      // Only check for duplicates if phone is actually changing and is not empty
      if (newPhone !== '' && newPhone !== currentPhone) {
        duplicateConditions.push({ phone: newPhone });
      }
    }

    // Only check for duplicates if there are fields that are actually changing
    if (duplicateConditions.length > 0) {
      const existingLead = await Lead.findOne({
        $or: duplicateConditions,
        _id: { $ne: req.params.id } // Exclude current lead
      });

      if (existingLead) {
        const duplicateFields = [];
        
        // Check which fields actually match
        if (req.body.email !== undefined && req.body.email !== null) {
          const newEmail = typeof req.body.email === 'string' ? req.body.email.trim() : req.body.email;
          const currentEmail = currentLead.email ? currentLead.email.trim() : '';
          
          if (newEmail !== '' && newEmail !== currentEmail && existingLead.email && existingLead.email.trim() === newEmail) {
            duplicateFields.push('email');
          }
        }
        
        if (req.body.phone !== undefined && req.body.phone !== null) {
          const newPhone = typeof req.body.phone === 'string' ? req.body.phone.trim() : req.body.phone;
          const currentPhone = currentLead.phone ? currentLead.phone.trim() : '';
          
          if (newPhone !== '' && newPhone !== currentPhone && existingLead.phone && existingLead.phone.trim() === newPhone) {
            duplicateFields.push('phone');
          }
        }

        // Only return error if we actually found duplicate fields
        if (duplicateFields.length > 0) {
          return res.status(409).json({ 
            message: 'Update would create a duplicate lead',
            duplicateFields: duplicateFields
          });
        }
      }
    }

    // Remove createdBy from update data if it exists
    // This prevents changing the creator
    if (req.body.createdBy) {
      delete req.body.createdBy;
    }

    const lead = await Lead.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Format names for the response
    const leadObj = lead.toObject();
    
    // Handle createdBy - could be ObjectId, String, or populated object
    if (leadObj.createdBy) {
      if (typeof leadObj.createdBy === 'object' && leadObj.createdBy !== null) {
        // Already populated or is an object
        leadObj.createdBy.name = `${leadObj.createdBy.firstName || ''} ${leadObj.createdBy.lastName || ''}`.trim() || 
          leadObj.createdBy.email || '';
      } else {
        // It's a string or ObjectId, keep as is
        leadObj.createdBy = leadObj.createdBy.toString();
      }
    }
    
    // Handle assignedTo - could be ObjectId, String, null, or populated object
    if (leadObj.assignedTo) {
      if (typeof leadObj.assignedTo === 'object' && leadObj.assignedTo !== null) {
        // Already populated or is an object
        leadObj.assignedTo.name = `${leadObj.assignedTo.firstName || ''} ${leadObj.assignedTo.lastName || ''}`.trim() || 
          leadObj.assignedTo.email || '';
      } else {
        // It's a string or ObjectId, keep as is
        leadObj.assignedTo = leadObj.assignedTo.toString();
      }
    }

    // Get tenant information for credit deduction
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id;
    const { entityId } = req.query;

    if (tenantId && userId) {
      try {
        // Import relationship service for credit deduction
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Relationship service should already be initialized at server startup
        console.log('🔄 Using relationship service for lead update credit deduction');

        // Resolve entityId to orgCode if needed (for organization switching)
        let creditDeductionOrg = null;
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
            // entityId is already a UUID string (orgCode)
            creditDeductionOrg = entityId;
          }
        }
        
        // Fall back to the lead's orgCode if no entityId provided
        if (!creditDeductionOrg) {
          creditDeductionOrg = lead.orgCode;
        }

        console.log(`💰 About to deduct credits for lead update:`);
        console.log(`   - Selected org from query (entityId): ${entityId || 'none'}`);
        console.log(`   - Lead orgCode: ${lead.orgCode}`);
        console.log(`   - Using for credit deduction: ${creditDeductionOrg}`);

        // Deduct credits for lead update
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.leads.update',
          'lead',
          lead._id.toString(),
          {
            firstName: lead.firstName,
            lastName: lead.lastName,
            email: lead.email
          },
          {
            operationType: 'update',
            entityType: 'lead',
            entityId: lead._id.toString()
          },
          creditDeductionOrg // Pass the selected/switched organization for credit deduction
        );

        console.log('💰 Credits deducted for lead update:', creditResult);

        // Add credit deduction info to response (standardized format for frontend)
        if (creditResult?.success) {
          leadObj.creditDeduction = {
            operationCode: 'crm.leads.update',
            creditsDeducted: creditResult.creditsDeducted || 0,
            availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
          };
        }

      } catch (creditError) {
        console.error('❌ Error deducting credits for lead update:', creditError);
        // Continue with the response even if credit deduction fails
        // This prevents update failures due to credit issues
      }
    }

    res.json(leadObj);
  } catch (err) {
    // Handle mongoose unique constraint errors
    if (err.code === 11000) {
      const duplicateFields = Object.keys(err.keyPattern || {});
      return res.status(409).json({ 
        message: 'Duplicate key error',
        duplicateFields: duplicateFields
      });
    }

    // Log full error details for debugging
    console.error('❌ Error updating lead:', err.message);
    console.error('❌ Error stack:', err.stack);
    console.error('❌ Error details:', {
      leadId: req.params.id,
      body: req.body,
      errorName: err.name,
      errorCode: err.code
    });

    // Return more detailed error response
    res.status(500).json({ 
      message: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while updating the lead'
    });
  }
};

export const deleteLead = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Log activity for lead deletion
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const { entityId } = req.query;
    if (tenantId && req.user?.id) {
      try {
        // Import relationship service for credit checking and activity logging
        const { default: relationshipService } = await import('../services/relationshipService.js');

        // Resolve entityId to orgCode if needed (entityId might be ObjectId, need to convert to orgCode UUID)
        let creditDeductionOrg = entityId || null;
        if (creditDeductionOrg && /^[a-f\d]{24}$/i.test(String(creditDeductionOrg))) {
          try {
            const Organization = (await import('../models/Organization.js')).default;
            const orgData = await Organization.findById(creditDeductionOrg).select('orgCode').lean();
            if (orgData?.orgCode) {
              creditDeductionOrg = orgData.orgCode;
              console.log(`✅ Resolved entityId ${entityId} to orgCode for lead deletion: ${creditDeductionOrg}`);
            }
          } catch (resolveErr) {
            console.warn('⚠️ Failed to resolve entityId to orgCode for lead deletion:', resolveErr?.message);
          }
        }

        if (!creditDeductionOrg) {
          creditDeductionOrg = lead.orgCode || req.tenant?.orgCode || req.user?.orgCode || entityId || null;
        }

        // Check if this operation requires credits
        const creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          req.user.id,
          'crm.leads.delete',
          'lead',
          lead._id.toString(),
          {
            operationType: 'delete',
            leadName: lead.name,
            status: lead.status,
            entityId: creditDeductionOrg
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/leads/:id',
              method: 'DELETE'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for lead deletion: ${creditResult.creditsUsed} credits`);
        } else {
          console.log(`⚠️ Credit deduction returned non-success: ${creditResult.message}`);
        }

      } catch (logError) {
        console.error('❌ Failed to log lead deletion activity:', logError);
        // Don't fail the operation if logging fails
      }
    }

    res.json({ message: 'Lead deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const updateLeadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, previousStatus } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const lead = await Lead.findById(id);

    if (!lead) {
      return res.status(404).json({ message: 'Lead not found' });
    }

    // Update the stageHistory array
    const statusHistoryEntry = {
      fromStatus: previousStatus || lead.status,
      toStatus: status,
      updatedBy: req.user.userId || req.user.id
    };

    lead.status = status;
    lead.statusHistory = [...(lead.statusHistory || []), statusHistoryEntry];

    await lead.save();
    res.status(200).json({ message: 'Lead status updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createLead, getLeads, getLead, updateLead, deleteLead, updateLeadStatus };