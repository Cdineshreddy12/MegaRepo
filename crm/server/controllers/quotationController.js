import Quotation from '../models/Quotation.js';

// Helper function to normalize currency to uppercase
const normalizeCurrency = (currency) => {
  if (!currency) return 'INR'; // Default
  const upperCurrency = currency.toUpperCase();
  const validCurrencies = ['INR', 'USD', 'EUR', 'GBP'];
  return validCurrencies.includes(upperCurrency) ? upperCurrency : 'INR';
};

export const createQuotation = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || req.user?.userId;
    const { entityId } = req.query; // Selected organization from query params
    
    console.log(`📝 Creating quotation - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}`);
    
    // Normalize currency to uppercase
    const normalizedCurrency = normalizeCurrency(req.body.quoteCurrency);
    if (req.body.quoteCurrency && req.body.quoteCurrency !== normalizedCurrency) {
      console.log(`🔄 Normalized currency from '${req.body.quoteCurrency}' to '${normalizedCurrency}'`);
    }
    
    // Check and deduct credits BEFORE creating the quotation
    let creditDeductionOrg = null;
    let creditResult = null;
    
    if (tenantId && userId) {
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
        
        console.log(`💰 Checking credits for quotation creation with orgCode: ${creditDeductionOrg}`);
        
        // Deduct credits for quotation creation
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.quotations.create',
          'quotation',
          null, // resourceId will be set after creation
          {
            quotationNumber: req.body.quotationNumber,
            accountId: req.body.accountId,
            oem: req.body.oem
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/quotations',
              method: 'POST'
            }
          },
          creditDeductionOrg
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits deducted for quotation creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create quotation',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.quotations.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for quotation creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.quotations.create',
            error: creditError.message
          }
        });
      }
    }
    
    const { items, ...restData } = req.body;
    const itemsWithTotal = items.map(item => ({ 
      ...item, 
      total: item.quantity * item.unitPrice * (1 + (item.gst || 0) / 100)
    }));
    
    // Sanitize empty strings to null/undefined for ObjectId fields
    // This prevents Mongoose validation errors when empty strings are passed
    const sanitizedData = { ...restData };
    if (sanitizedData.contactId === '' || sanitizedData.contactId === null) {
      delete sanitizedData.contactId; // Remove empty contactId - field is optional
    }
    if (sanitizedData.accountId === '' || sanitizedData.accountId === null) {
      delete sanitizedData.accountId; // Remove empty accountId if somehow empty
    }
    
    const quotationData = {
      ...sanitizedData,
      quoteCurrency: normalizedCurrency, // Use normalized currency
      items: itemsWithTotal,
      createdBy: userId,
      subtotal: calculateSubtotal(itemsWithTotal),
      gstTotal: calculateTaxTotal(itemsWithTotal),
      total: calculateTotal(itemsWithTotal)
    };
    
    const quotation = new Quotation(quotationData);
    await quotation.save();
    
    // Note: deductCreditsForOperation already logs activity internally, so no need to log again here
    // The activity log will be created by deductCreditsForOperation with the correct orgCode
    
    // Prepare response with credit deduction info
    const quotationResponse = quotation.toObject();
    if (creditResult?.success) {
      quotationResponse.creditDeduction = {
        operationCode: 'crm.quotations.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }
    
    res.status(201).json(quotationResponse);
  } catch (err) {
    console.error('Error creating quotation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getQuotations = async (req, res) => {
  try {
    // Get effective user (handles both external and local auth)
    const { getEffectiveUser, getPermissionFilters } = await import('../utils/authHelpers.js');
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
    const baseQuery = await getPermissionFilters(user, 'quotation', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Build query to filter quotations by accountId's orgCode
    let query = {};
    
    if (baseQuery.orgCode) {
      // Find all accounts with this orgCode
      const Account = (await import('../models/Account.js')).default;
      const accounts = await Account.find({ orgCode: baseQuery.orgCode }).select('_id').lean();
      const accountIds = accounts.map(acc => acc._id);

      console.log(`🔍 Found ${accounts.length} accounts with orgCode: ${baseQuery.orgCode}`);
      
      if (accountIds.length > 0) {
        query.accountId = { $in: accountIds };
      } else {
        // No accounts found for this orgCode, return empty result
        console.log(`⚠️ No accounts found for orgCode: ${baseQuery.orgCode}, returning empty quotations`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for quotation filtering - returning empty results for security');
      return res.json([]);
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const quotations = await Quotation.find(query)
      .populate("accountId", "companyName zone orgCode industry")
      .populate('contactId', 'firstName lastName email')
      .lean(); // Use lean() to get plain objects for custom population
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    const populatedQuotations = await Promise.all(quotations.map(async (quotation) => {
      // Populate createdBy
      if (quotation.createdBy) {
        try {
          const UserProfile = (await import('../models/UserProfile.js')).default;
          const creatorProfile = await UserProfile.findOne({
            userId: quotation.createdBy.toString()
          }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');
          
          if (creatorProfile) {
            quotation.createdBy = {
              _id: creatorProfile.userId,
              firstName: creatorProfile.personalInfo?.firstName || '',
              lastName: creatorProfile.personalInfo?.lastName || '',
              email: creatorProfile.personalInfo?.email || '',
              userId: creatorProfile.userId
            };
          } else {
            // Fallback: keep the original value if not found
            quotation.createdBy = {
              _id: quotation.createdBy,
              firstName: '',
              lastName: '',
              email: '',
              userId: quotation.createdBy
            };
          }
        } catch (populateError) {
          console.error('Error populating createdBy:', populateError);
          quotation.createdBy = {
            _id: quotation.createdBy,
            firstName: '',
            lastName: '',
            email: '',
            userId: quotation.createdBy
          };
        }
      }
      
      return quotation;
    }));

    console.log(`✅ Found ${populatedQuotations.length} quotations after filtering`);
    
    res.json(populatedQuotations);
  } catch (err) {
    console.error('Error fetching quotations:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('accountId', 'name companyName billingAddress shippingAddress email phone')
      .populate('contactId', 'firstName lastName email phone jobTitle')
      .lean(); // Use lean() to get plain object for custom population
    
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    if (quotation.createdBy) {
      try {
        const UserProfile = (await import('../models/UserProfile.js')).default;
        const creatorProfile = await UserProfile.findOne({
          userId: quotation.createdBy.toString()
        }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');
        
        if (creatorProfile) {
          quotation.createdBy = {
            _id: creatorProfile.userId,
            firstName: creatorProfile.personalInfo?.firstName || '',
            lastName: creatorProfile.personalInfo?.lastName || '',
            email: creatorProfile.personalInfo?.email || '',
            userId: creatorProfile.userId
          };
        } else {
          // Fallback: keep the original value if not found
          quotation.createdBy = {
            _id: quotation.createdBy,
            firstName: '',
            lastName: '',
            email: '',
            userId: quotation.createdBy
          };
        }
      } catch (populateError) {
        console.error('Error populating createdBy:', populateError);
        quotation.createdBy = {
          _id: quotation.createdBy,
          firstName: '',
          lastName: '',
          email: '',
          userId: quotation.createdBy
        };
      }
    }
    
    res.json(quotation);
  } catch (err) {
    console.error('Error fetching quotation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateQuotation = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || req.user?.userId;
    const { entityId } = req.query; // Selected organization from query params
    
    // Check if quotation exists
    const existingQuotation = await Quotation.findById(req.params.id);
    if (!existingQuotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Normalize currency to uppercase if provided
    let normalizedCurrency = existingQuotation.quoteCurrency;
    if (req.body.quoteCurrency) {
      normalizedCurrency = normalizeCurrency(req.body.quoteCurrency);
      if (req.body.quoteCurrency !== normalizedCurrency) {
        console.log(`🔄 Normalized currency from '${req.body.quoteCurrency}' to '${normalizedCurrency}'`);
      }
    }
    
    // Check and deduct credits BEFORE updating the quotation
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
        
        console.log(`💰 Checking credits for quotation update with orgCode: ${creditDeductionOrg}`);
        
        // Deduct credits for quotation update
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.quotations.update',
          'quotation',
          req.params.id,
          {
            quotationNumber: req.body.quotationNumber || existingQuotation.quotationNumber,
            accountId: req.body.accountId || existingQuotation.accountId,
            oem: req.body.oem || existingQuotation.oem
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/quotations',
              method: 'PUT'
            }
          },
          creditDeductionOrg
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits deducted for quotation update: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to update quotation',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.quotations.update'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for quotation update:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.quotations.update',
            error: creditError.message
          }
        });
      }
    }
    
    // Sanitize empty strings to null/undefined for ObjectId fields
    // This prevents Mongoose validation errors when empty strings are passed
    const sanitizedData = { ...req.body };
    if (sanitizedData.contactId === '' || sanitizedData.contactId === null) {
      sanitizedData.contactId = null; // Set to null explicitly for update
    }
    if (sanitizedData.accountId === '' || sanitizedData.accountId === null) {
      // Don't update accountId if it's empty - keep existing value
      delete sanitizedData.accountId;
    }
    
    const quotationData = {
      ...sanitizedData,
      quoteCurrency: normalizedCurrency, // Use normalized currency
      updatedBy: userId,
      subtotal: calculateSubtotal(req.body.items),
      gstTotal: calculateTaxTotal(req.body.items),
      total: calculateTotal(req.body.items)
    };

    const quotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      quotationData,
      { new: true }
    );

    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    // Note: deductCreditsForOperation already logs activity internally when creditResult.success is true
    // Only log explicitly if credit deduction didn't happen or failed (for audit purposes)
    if (tenantId && userId && creditDeductionOrg && (!creditResult || !creditResult.success)) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logActivity({
          tenantId,
          userId,
          entityId: creditDeductionOrg,
          operationType: 'crm.quotations.update',
          resourceType: 'quotation',
          resourceId: quotation._id.toString(),
          operationDetails: {
            quotationNumber: quotation.quotationNumber,
            accountId: quotation.accountId,
            oem: quotation.oem,
            total: quotation.total,
            status: quotation.status,
            creditDeductionFailed: !creditResult || !creditResult.success
          },
          severity: 'medium',
          status: creditResult ? 'partial' : 'success',
          creditsConsumed: 0
        });
        console.log(`⚠️ Activity logged for quotation update (no credit deduction): ${quotation._id}`);
      } catch (logError) {
        console.error('❌ Failed to log activity for quotation update:', logError);
        // Don't fail the request if logging fails
      }
    }

    // Prepare response with credit deduction info
    const quotationResponse = quotation.toObject();
    if (creditResult?.success) {
      quotationResponse.creditDeduction = {
        operationCode: 'crm.quotations.update',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(quotationResponse);
  } catch (err) {
    console.error('Error updating quotation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const deleteQuotation = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }

    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || req.user?.userId;
    const { entityId } = req.query; // Selected organization from query params
    
    // Check if quotation exists before deletion
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({ message: 'Quotation not found' });
    }
    
    // Check and deduct credits BEFORE deleting the quotation
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
        
        console.log(`💰 Checking credits for quotation deletion with orgCode: ${creditDeductionOrg}`);
        
        // Deduct credits for quotation deletion
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.quotations.delete',
          'quotation',
          req.params.id,
          {
            quotationNumber: quotation.quotationNumber,
            accountId: quotation.accountId,
            oem: quotation.oem
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/quotations',
              method: 'DELETE'
            }
          },
          creditDeductionOrg
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits deducted for quotation deletion: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to delete quotation',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.quotations.delete'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for quotation deletion:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.quotations.delete',
            error: creditError.message
          }
        });
      }
    }
    
    // Note: deductCreditsForOperation already logs activity internally when creditResult.success is true
    // Only log explicitly if credit deduction didn't happen or failed (for audit purposes)
    if (tenantId && userId && creditDeductionOrg && (!creditResult || !creditResult.success)) {
      try {
        const { default: relationshipService } = await import('../services/relationshipService.js');
        await relationshipService.logActivity({
          tenantId,
          userId,
          entityId: creditDeductionOrg,
          operationType: 'crm.quotations.delete',
          resourceType: 'quotation',
          resourceId: quotation._id.toString(),
          operationDetails: {
            quotationNumber: quotation.quotationNumber,
            accountId: quotation.accountId,
            oem: quotation.oem,
            total: quotation.total,
            creditDeductionFailed: !creditResult || !creditResult.success
          },
          severity: 'medium',
          status: creditResult ? 'partial' : 'success',
          creditsConsumed: 0
        });
        console.log(`⚠️ Activity logged for quotation deletion (no credit deduction): ${quotation._id}`);
      } catch (logError) {
        console.error('❌ Failed to log activity for quotation deletion:', logError);
        // Don't fail the request if logging fails
      }
    }
    
    // Delete the quotation
    await Quotation.findByIdAndDelete(req.params.id);
    
    const response = { message: 'Quotation deleted successfully' };
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.quotations.delete',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }
    
    res.json(response);
  } catch (err) {
    console.error('Error deleting quotation:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Helper functions for calculations
const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
};

const calculateTaxTotal = (items) => {
  return items.reduce((sum, item) => 
    sum + (item.quantity * item.unitPrice * (item.gst / 100)), 0
  );
};

const calculateTotal = (items) => {
  return calculateSubtotal(items) + calculateTaxTotal(items);
};

export default { createQuotation, getQuotations, getQuotation, updateQuotation, deleteQuotation };