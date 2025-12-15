import Invoice from '../models/Invoice.js';
import SalesOrder from '../models/SalesOrder.js';
import { sanitizeObjectIdFields, populateUserFields } from '../utils/dataSanitizer.js';

export const createInvoice = async (req, res) => {
  try {
    const tenantId = req.tenantId || req.tenant?.id;
    const userId = req.user?.id || req.user?.userId;
    const { entityId } = req.query; // Selected organization from query params

    console.log('📝 Creating invoice - Request body:', JSON.stringify(req.body, null, 2));
    console.log('📝 Request body keys:', Object.keys(req.body));
    console.log(`📝 Creating invoice - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}`);

    // Check and deduct credits BEFORE creating the invoice
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

        console.log(`💰 Checking credits for invoice creation with orgCode: ${creditDeductionOrg}`);

        // Deduct credits for invoice creation BEFORE creating the invoice
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.invoices.create',
          'invoice',
          null, // resourceId will be set after creation
          {
            invoiceNumber: req.body.invoiceNumber,
            accountId: req.body.accountId,
            oem: req.body.oem,
            totalAmount: req.body.totalAmount || req.body.total
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/invoices',
              method: 'POST'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for invoice creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create invoice',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.invoices.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for invoice creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.invoices.create',
            error: creditError.message
          }
        });
      }
    }

    // Sanitize empty strings to null/undefined for ObjectId fields
    const sanitizedData = sanitizeObjectIdFields(req.body, ['accountId', 'salesOrderId', 'quotationId', 'contactId']);

    // Ensure items is an array
    const items = Array.isArray(sanitizedData.items) ? sanitizedData.items : [];

    // Calculate totals if not provided
    const subtotal = sanitizedData.subtotal || items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      return sum + (quantity * unitPrice);
    }, 0);

    const gstTotal = sanitizedData.gstTotal || sanitizedData.taxAmount || items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const subtotal = quantity * unitPrice;
      const gstPercentage = parseFloat(item.gst) || 0;
      return sum + (subtotal * (gstPercentage / 100));
    }, 0);

    const freightCharges = parseFloat(sanitizedData.freightCharges) || 0;
    const discounts = parseFloat(sanitizedData.discounts) || 0;
    const total = sanitizedData.total || sanitizedData.totalAmount || (subtotal + gstTotal + freightCharges - discounts);
    const amountPaid = parseFloat(sanitizedData.amountPaid) || 0;
    const balance = total - amountPaid;

    // Prepare invoice data
    const invoiceData = {
      ...sanitizedData,
      items: items,
      createdBy: userId,
      subtotal: subtotal,
      gstTotal: gstTotal,
      discounts: discounts,
      total: total,
      totalAmount: total, // Alias
      totalDue: total, // Alias
      amountPaid: amountPaid,
      balance: balance,
      freightCharges: freightCharges
    };

    console.log('📝 Saving Invoice with invoiceNumber:', invoiceData.invoiceNumber, 'type:', typeof invoiceData.invoiceNumber);

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Update activity log with the actual invoice ID if credits were deducted
    if (creditResult && creditResult.success && invoice._id) {
      try {
        const ActivityLog = (await import('../models/ActivityLog.js')).default;
        const activityLog = await ActivityLog.findOne({
          userId: userId,
          entityType: 'invoice',
          action: 'create',
          entityId: 'pending',
          orgCode: creditDeductionOrg || entityId,
          'details.accountId': invoiceData.accountId?.toString() || invoiceData.accountId,
          createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
        }).sort({ createdAt: -1 });

        if (activityLog) {
          activityLog.entityId = invoice._id.toString();
          if (activityLog.details) {
            activityLog.details.resourceIdPending = false;
          }
          await activityLog.save();
          console.log(`✅ Updated activity log with invoice ID: ${invoice._id}`);
        } else {
          // Fallback search without time constraint
          const fallbackLog = await ActivityLog.findOne({
            userId: userId,
            entityType: 'invoice',
            action: 'create',
            entityId: 'pending',
            'details.accountId': invoiceData.accountId?.toString() || invoiceData.accountId
          }).sort({ createdAt: -1 });
          if (fallbackLog) {
            fallbackLog.entityId = invoice._id.toString();
            if (fallbackLog.details) {
              fallbackLog.details.resourceIdPending = false;
            }
            await fallbackLog.save();
            console.log(`✅ Updated fallback activity log with invoice ID: ${invoice._id}`);
          }
        }
      } catch (updateError) {
        console.error('⚠️ Error updating activity log resource ID:', updateError);
      }
    }

    // Prepare response with credit deduction info
    const invoiceResponse = invoice.toObject();
    if (creditResult?.success) {
      invoiceResponse.creditDeduction = {
        operationCode: 'crm.invoices.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.status(201).json(invoiceResponse);
  } catch (err) {
    console.error('❌ Error creating invoice:', err);
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors || {}).map(key => ({
        field: key,
        message: err.errors[key].message,
        value: err.errors[key].value,
        kind: err.errors[key].kind
      }));
      return res.status(400).json({
        message: 'Validation error',
        errors: validationErrors,
        error: err.message
      });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getInvoices = async (req, res) => {
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
    const baseQuery = await getPermissionFilters(user, 'invoice', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Build query to filter invoices by accountId's orgCode
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
        console.log(`⚠️ No accounts found for orgCode: ${baseQuery.orgCode}, returning empty invoices`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for invoice filtering - returning empty results for security');
      return res.json([]);
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    let invoices = await Invoice.find(query)
      .populate('salesOrderId', 'orderNumber')
      .populate('accountId', 'companyName zone orgCode industry')
      .lean(); // Use lean() to get plain objects for custom population
    
    // Manual population for createdBy to handle UUID strings
    invoices = await populateUserFields(invoices, ['createdBy'], ['firstName', 'lastName', 'email']);
    
    // Format data for frontend compatibility
    const formattedInvoices = invoices.map(invoice => {
      const invoiceObj = { ...invoice };
      
      // Format createdBy name
      if (invoiceObj.createdBy) {
        invoiceObj.createdBy.name = `${invoiceObj.createdBy.firstName || ''} ${invoiceObj.createdBy.lastName || ''}`.trim() || invoiceObj.createdBy.email || '';
      }
      
      // Ensure id field is set for frontend compatibility
      if (!invoiceObj.id && invoiceObj._id) {
        invoiceObj.id = invoiceObj._id.toString();
      }
      
      return invoiceObj;
    });

    console.log(`✅ Found ${formattedInvoices.length} invoices after filtering`);
      
    res.json(formattedInvoices);
  } catch (err) {
    console.error('❌ Error getting invoices:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getInvoice = async (req, res) => {
  try {
    let invoice = await Invoice.findById(req.params.id)
      .populate('salesOrderId', 'orderNumber')
      .populate('accountId', 'companyName')
      .lean(); // Use lean() to get plain object for custom population
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }
    
    // Manual population for createdBy to handle UUID strings
    const invoicesArray = [invoice];
    const populatedInvoices = await populateUserFields(invoicesArray, ['createdBy'], ['firstName', 'lastName', 'email']);
    const populatedInvoice = populatedInvoices[0] || invoice;
    
    // Format data for frontend compatibility
    const invoiceObj = { ...populatedInvoice };
    
    // Format createdBy name
    if (invoiceObj.createdBy) {
      invoiceObj.createdBy.name = `${invoiceObj.createdBy.firstName || ''} ${invoiceObj.createdBy.lastName || ''}`.trim() || invoiceObj.createdBy.email || '';
    }
    
    // Ensure id field is set for frontend compatibility
    if (!invoiceObj.id && invoiceObj._id) {
      invoiceObj.id = invoiceObj._id.toString();
    }
    
    res.json(invoiceObj);
  } catch (err) {
    console.error('❌ Error getting invoice:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateInvoice = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Get existing invoice first
    const existingInvoice = await Invoice.findById(req.params.id);
    if (!existingInvoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.invoices.update', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE updating the invoice
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

        console.log(`💰 Checking credits for invoice update with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.invoices.update',
          'invoice',
          req.params.id,
          {
            invoiceNumber: req.body.invoiceNumber || existingInvoice.invoiceNumber,
            accountId: req.body.accountId || existingInvoice.accountId,
            oem: req.body.oem || existingInvoice.oem,
            totalAmount: req.body.totalAmount || req.body.total || existingInvoice.totalAmount
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/invoices',
              method: 'PUT'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for invoice update: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to update invoice',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.invoices.update'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for invoice update:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.invoices.update',
            error: creditError.message
          }
        });
      }
    }

    const invoiceData = {
      ...req.body,
      balance: (Number(req.body.totalAmount) || 0) - (Number(req.body.amountPaid) || 0),
      updatedBy: userId
    };

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      invoiceData,
      { new: true }
    );

    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const response = invoice.toObject ? invoice.toObject() : invoice;
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.invoices.update',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Error updating invoice:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const deleteInvoice = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Get invoice first before deleting
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.invoices.delete', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE deleting the invoice
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

        console.log(`💰 Checking credits for invoice deletion with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.invoices.delete',
          'invoice',
          req.params.id,
          {
            invoiceNumber: invoice.invoiceNumber,
            accountId: invoice.accountId,
            oem: invoice.oem,
            totalAmount: invoice.totalAmount
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/invoices',
              method: 'DELETE'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for invoice deletion: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to delete invoice',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.invoices.delete'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for invoice deletion:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.invoices.delete',
            error: creditError.message
          }
        });
      }
    }

    // Delete the invoice
    await Invoice.findByIdAndDelete(req.params.id);

    const response = { message: 'Invoice deleted successfully' };
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.invoices.delete',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Error deleting invoice:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const recordPayment = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const { amount, method, reference } = req.body;
    
    invoice.paymentHistory.push({
      amount,
      date: new Date(),
      method,
      reference
    });

    invoice.amountPaid += amount;
    invoice.balance = invoice.totalAmount - invoice.amountPaid;
    
    if (invoice.balance <= 0) {
      invoice.status = 'paid';
    }

    await invoice.save();
    res.json(invoice);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createInvoice, getInvoices, getInvoice, updateInvoice, deleteInvoice, recordPayment };