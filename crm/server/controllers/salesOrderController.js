import SalesOrder from '../models/SalesOrder.js';
import { populateUserFields } from '../utils/dataSanitizer.js';

export const createSalesOrder = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Debug: Log the incoming request details
    console.log('📝 Creating sales order - Request details:');
    console.log('  - Method:', req.method);
    console.log('  - Content-Type:', req.get('Content-Type'));
    console.log('  - Body keys:', Object.keys(req.body));
    console.log('  - Body:', JSON.stringify(req.body, null, 2));
    console.log('  - Raw body exists:', !!req.body);
    console.log('  - orderNumber value:', req.body.orderNumber, 'type:', typeof req.body.orderNumber);
    console.log(`📝 Creating sales order - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}`);

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.sales_orders.create', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE creating the sales order
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

        if (!creditDeductionOrg) {
          creditDeductionOrg = req.tenant?.orgCode || req.user?.orgCode;
        }

        console.log(`💰 Checking credits for sales order creation with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.sales_orders.create',
          'sales_order',
          null, // resourceId will be set after creation
          {
            orderNumber: req.body.orderNumber,
            accountId: req.body.accountId,
            oem: req.body.oem,
            total: req.body.total || 0
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/sales-orders',
              method: 'POST'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for sales order creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create sales order',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.sales_orders.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for sales order creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.sales_orders.create',
            error: creditError.message
          }
        });
      }
    }
    
    // Ensure items is an array, default to empty array if not provided
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    
    // Sanitize empty strings to null/undefined for ObjectId fields
    // This prevents Mongoose validation errors when empty strings are passed
    const sanitizedData = { ...req.body };
    
    // Handle optional fields
    if (sanitizedData.opportunityId === '' || sanitizedData.opportunityId === null) {
      delete sanitizedData.opportunityId; // Remove empty opportunityId (optional field)
    }
    if (sanitizedData.quotationId === '' || sanitizedData.quotationId === null) {
      delete sanitizedData.quotationId; // Remove empty quotationId (optional field)
    }
    
    // Ensure orderNumber is a string and not empty (basic check before Mongoose validation)
    if (!sanitizedData.orderNumber || (typeof sanitizedData.orderNumber === 'string' && sanitizedData.orderNumber.trim() === '')) {
      console.log('❌ Pre-validation failed - orderNumber is missing or empty');
      return res.status(400).json({ 
        message: 'Validation error', 
        error: 'Order number is required',
        receivedValue: sanitizedData.orderNumber,
        receivedType: typeof sanitizedData.orderNumber
      });
    }
    
    // Calculate totals - match the model field names (gstTotal, total, not taxAmount, totalAmount)
    const subtotal = calculateSubtotal(items);
    const gstTotal = calculateGstTotal(items);
    const freightCharges = parseFloat(sanitizedData.freightCharges || 0);
    const total = subtotal + gstTotal + freightCharges;
    
    const orderData = {
      ...sanitizedData,
      items: items, // Ensure items is set
      createdBy: userId,
      subtotal: subtotal,
      gstTotal: gstTotal, // Match model field name
      freightCharges: freightCharges,
      total: total // Match model field name
    };

    console.log('📝 Order data being saved - orderNumber:', orderData.orderNumber);
    const salesOrder = new SalesOrder(orderData);
    await salesOrder.save();

    // Update activity log with the actual sales order ID if credits were deducted
    if (creditResult && creditResult.success && salesOrder._id) {
      try {
        const ActivityLog = (await import('../models/ActivityLog.js')).default;
        const activityLog = await ActivityLog.findOne({
          userId: userId,
          entityType: 'sales_order',
          action: 'create',
          entityId: 'pending',
          orgCode: creditDeductionOrg || entityId,
          'details.orderNumber': orderData.orderNumber,
          createdAt: { $gte: new Date(Date.now() - 60000) } // Within last minute
        }).sort({ createdAt: -1 });
        
        if (activityLog) {
          activityLog.entityId = salesOrder._id.toString();
          if (activityLog.details) {
            activityLog.details.resourceIdPending = false;
          }
          await activityLog.save();
          console.log(`✅ Activity log updated with sales order ID: ${salesOrder._id}`);
        }
      } catch (updateError) {
        console.error('⚠️ Error updating activity log resource ID:', updateError);
      }
    }

    const response = salesOrder.toObject ? salesOrder.toObject() : salesOrder;
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.sales_orders.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.status(201).json(response);
  } catch (err) {
    console.error('❌ Error creating sales order:', err);
    // Provide more detailed error messages
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors || {}).map(key => ({
        field: key,
        message: err.errors[key].message,
        value: err.errors[key].value
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

export const getSalesOrders = async (req, res) => {
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
    const baseQuery = await getPermissionFilters(user, 'sales_order', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Build query to filter sales orders by accountId's orgCode
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
        console.log(`⚠️ No accounts found for orgCode: ${baseQuery.orgCode}, returning empty sales orders`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for sales order filtering - returning empty results for security');
      return res.json([]);
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    let salesOrders = await SalesOrder.find(query)
      .populate('accountId', 'companyName zone orgCode industry')
      .populate('opportunityId', 'name')
      .populate('primaryContactId', 'firstName lastName email')
      .lean(); // Use lean() to get plain objects for custom population
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    salesOrders = await populateUserFields(salesOrders, ['createdBy'], ['firstName', 'lastName', 'email']);
    
    // Format names for consistency
    const formattedSalesOrders = salesOrders.map(order => {
      const orderObj = { ...order };
      
      // Format createdBy name
      if (orderObj.createdBy) {
        orderObj.createdBy.name = `${orderObj.createdBy.firstName || ''} ${orderObj.createdBy.lastName || ''}`.trim() || orderObj.createdBy.email || '';
      }
      
      // Format primaryContact name
      if (orderObj.primaryContactId) {
        orderObj.primaryContactId.name = `${orderObj.primaryContactId.firstName || ''} ${orderObj.primaryContactId.lastName || ''}`.trim();
      }
      
      // Ensure id field is set for frontend compatibility
      if (!orderObj.id && orderObj._id) {
        orderObj.id = orderObj._id.toString();
      }
      
      return orderObj;
    });

    console.log(`✅ Found ${formattedSalesOrders.length} sales orders after filtering`);
    
    res.json(formattedSalesOrders);
  } catch (err) {
    console.error('❌ Error getting sales orders:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getSalesOrder = async (req, res) => {
  try {
    let salesOrder = await SalesOrder.findById(req.params.id)
      .populate('accountId', 'companyName')
      .populate('opportunityId', 'name')
      .populate('primaryContactId', 'firstName lastName email')
      .lean(); // Use lean() to get plain object for custom population
    
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    const salesOrdersArray = [salesOrder];
    const populatedSalesOrders = await populateUserFields(salesOrdersArray, ['createdBy'], ['firstName', 'lastName', 'email']);
    const populatedSalesOrder = populatedSalesOrders[0] || salesOrder;
    
    // Format names for consistency
    const orderObj = { ...populatedSalesOrder };
    
    // Format createdBy name
    if (orderObj.createdBy) {
      orderObj.createdBy.name = `${orderObj.createdBy.firstName || ''} ${orderObj.createdBy.lastName || ''}`.trim() || orderObj.createdBy.email || '';
    }
    
    // Format primaryContact name
    if (orderObj.primaryContactId) {
      orderObj.primaryContactId.name = `${orderObj.primaryContactId.firstName || ''} ${orderObj.primaryContactId.lastName || ''}`.trim();
    }
    
    // Ensure id field is set for frontend compatibility
    if (!orderObj.id && orderObj._id) {
      orderObj.id = orderObj._id.toString();
    }
    
    res.json(orderObj);
  } catch (err) {
    console.error('❌ Error getting sales order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateSalesOrder = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Get existing sales order first
    const existingSalesOrder = await SalesOrder.findById(req.params.id);
    if (!existingSalesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.sales_orders.update', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE updating the sales order
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

        console.log(`💰 Checking credits for sales order update with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.sales_orders.update',
          'sales_order',
          req.params.id,
          {
            orderNumber: req.body.orderNumber || existingSalesOrder.orderNumber,
            accountId: req.body.accountId || existingSalesOrder.accountId,
            oem: req.body.oem || existingSalesOrder.oem,
            total: req.body.total || existingSalesOrder.total
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/sales-orders',
              method: 'PUT'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for sales order update: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to update sales order',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.sales_orders.update'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for sales order update:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.sales_orders.update',
            error: creditError.message
          }
        });
      }
    }

    // Ensure items is an array, default to empty array if not provided
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    
    // Sanitize empty strings to null/undefined for ObjectId fields
    // This prevents Mongoose validation errors when empty strings are passed
    const sanitizedData = { ...req.body };
    if (sanitizedData.opportunityId === '' || sanitizedData.opportunityId === null) {
      delete sanitizedData.opportunityId; // Remove empty opportunityId (optional field)
    }
    if (sanitizedData.quotationId === '' || sanitizedData.quotationId === null) {
      delete sanitizedData.quotationId; // Remove empty quotationId (optional field)
    }
    
    // Calculate totals - match the model field names (gstTotal, total, not taxAmount, totalAmount)
    const subtotal = calculateSubtotal(items);
    const gstTotal = calculateGstTotal(items);
    const freightCharges = parseFloat(sanitizedData.freightCharges || 0);
    const total = subtotal + gstTotal + freightCharges;
    
    const orderData = {
      ...sanitizedData,
      items: items, // Ensure items is set
      updatedBy: userId,
      subtotal: subtotal,
      gstTotal: gstTotal, // Match model field name
      freightCharges: freightCharges,
      total: total // Match model field name
    };

    const salesOrder = await SalesOrder.findByIdAndUpdate(
      req.params.id,
      orderData,
      { new: true }
    );

    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    const response = salesOrder.toObject ? salesOrder.toObject() : salesOrder;
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.sales_orders.update',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Error updating sales order:', err);
    // Provide more detailed error messages
    if (err.name === 'ValidationError') {
      const validationErrors = Object.keys(err.errors || {}).map(key => ({
        field: key,
        message: err.errors[key].message
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

export const deleteSalesOrder = async (req, res) => {
  try {
    const consumer = req.crmConsumer;
    const userId = req.user?.id || req.user?.userId;
    const tenantId = req.tenantId || req.tenant?.id;
    const { entityId } = req.query; // Selected organization from query params

    // Get sales order first before deleting
    const salesOrder = await SalesOrder.findById(req.params.id);
    if (!salesOrder) {
      return res.status(404).json({ message: 'Sales order not found' });
    }

    // Check permission
    const hasPermission = await consumer.checkUserPermission(userId, 'crm.sales_orders.delete', req.user.permissions);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check and deduct credits BEFORE deleting the sales order
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

        console.log(`💰 Checking credits for sales order deletion with orgCode: ${creditDeductionOrg}`);

        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.sales_orders.delete',
          'sales_order',
          req.params.id,
          {
            orderNumber: salesOrder.orderNumber,
            accountId: salesOrder.accountId,
            oem: salesOrder.oem,
            total: salesOrder.total
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/sales-orders',
              method: 'DELETE'
            }
          },
          creditDeductionOrg
        );

        if (creditResult.success) {
          console.log(`✅ Credits deducted for sales order deletion: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to delete sales order',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.sales_orders.delete'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for sales order deletion:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.sales_orders.delete',
            error: creditError.message
          }
        });
      }
    }

    // Delete the sales order
    await SalesOrder.findByIdAndDelete(req.params.id);

    const response = { message: 'Sales order deleted successfully' };
    if (creditResult?.success) {
      response.creditDeduction = {
        operationCode: 'crm.sales_orders.delete',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }

    res.json(response);
  } catch (err) {
    console.error('❌ Error deleting sales order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Helper functions for calculations
const calculateSubtotal = (items) => {
  if (!items || !Array.isArray(items)) {
    return 0;
  }
  return items.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    return sum + (quantity * unitPrice);
  }, 0);
};

const calculateGstTotal = (items) => {
  if (!items || !Array.isArray(items)) {
    return 0;
  }
  return items.reduce((sum, item) => {
    // GST is stored as percentage in the item schema (productOrder.js)
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const subtotal = quantity * unitPrice;
    
    // GST is a percentage, calculate the amount
    const gstPercentage = parseFloat(item.gst) || 0;
    const gstAmount = subtotal * (gstPercentage / 100);
    return sum + gstAmount;
  }, 0);
};

export default { createSalesOrder, getSalesOrders, getSalesOrder, updateSalesOrder, deleteSalesOrder };