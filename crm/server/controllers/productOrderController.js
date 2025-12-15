import ProductOrder from '../models/ProductOrderModel.js';

// Helper functions for calculations
const calculateSubtotal = (items) => {
  return items.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    return sum + (quantity * unitPrice);
  }, 0);
};

const calculateTaxTotal = (items) => {
  return items.reduce((sum, item) => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unitPrice || 0;
    const gstPercent = item.gst || 0;
    const itemSubtotal = quantity * unitPrice;
    return sum + (itemSubtotal * gstPercent / 100);
  }, 0);
};

const calculateTotal = (items, freightCharges = 0) => {
  const subtotal = calculateSubtotal(items);
  const gstTotal = calculateTaxTotal(items);
  return subtotal + gstTotal + freightCharges;
};

export const createProductOrder = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || req.user?.userId;
    const { entityId } = req.query; // Selected organization from query params
    
    console.log(`📝 Creating product order - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}`);
    
    // Check and deduct credits BEFORE creating the product order
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
        
        console.log(`💰 Checking credits for product order creation with orgCode: ${creditDeductionOrg}`);
        
        // Deduct credits for product order creation
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.product_orders.create',
          'product_order',
          null, // resourceId will be set after creation
          {
            orderNumber: req.body.orderNumber,
            accountId: req.body.accountId,
            total: req.body.total || 0
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/product-orders',
              method: 'POST'
            }
          },
          creditDeductionOrg
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits deducted for product order creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create product order',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.product_orders.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for product order creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.product_orders.create',
            error: creditError.message
          }
        });
      }
    }
    
    const { items, ...restData } = req.body;
    
    // Ensure items have proper structure
    const itemsWithTotal = items.map(item => {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 0);
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
      const gst = typeof item.gst === 'string' ? parseFloat(item.gst) : (item.gst || 0);
      const itemSubtotal = quantity * unitPrice;
      const gstAmount = itemSubtotal * (gst / 100);
      
      return {
        ...item,
        quantity,
        unitPrice,
        gst,
        total: itemSubtotal + gstAmount
      };
    });
    
    // Convert expectedDeliveryDate string to Date if needed
    let expectedDeliveryDate = restData.expectedDeliveryDate;
    if (typeof expectedDeliveryDate === 'string') {
      expectedDeliveryDate = new Date(expectedDeliveryDate);
    }
    
    const productOrderData = {
      ...restData,
      expectedDeliveryDate,
      items: itemsWithTotal,
      createdBy: userId,
      subtotal: calculateSubtotal(itemsWithTotal),
      gstTotal: calculateTaxTotal(itemsWithTotal),
      total: calculateTotal(itemsWithTotal, restData.freightCharges || 0)
    };
    
    const productOrder = new ProductOrder(productOrderData);
    await productOrder.save();
    
    // Prepare response with credit deduction info
    const productOrderResponse = productOrder.toObject();
    if (creditResult?.success) {
      productOrderResponse.creditDeduction = {
        operationCode: 'crm.product_orders.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }
    
    res.status(201).json(productOrderResponse);
  } catch (err) {
    console.error('Error creating product order:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Product order number already exists', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getProductOrders = async (req, res) => {
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
    const baseQuery = await getPermissionFilters(user, 'product_order', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Build query to filter product orders by accountId's orgCode
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
        console.log(`⚠️ No accounts found for orgCode: ${baseQuery.orgCode}, returning empty product orders`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for product order filtering - returning empty results for security');
      return res.json([]);
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const productOrders = await ProductOrder.find(query)
      .populate("accountId", "companyName zone orgCode industry")
      .populate('contactId', 'firstName lastName email')
      .lean();
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    const populatedProductOrders = await Promise.all(productOrders.map(async (order) => {
      if (order.createdBy) {
        try {
          const UserProfile = (await import('../models/UserProfile.js')).default;
          const creatorProfile = await UserProfile.findOne({
            userId: order.createdBy.toString()
          }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');
          
          if (creatorProfile) {
            order.createdBy = {
              _id: creatorProfile.userId,
              firstName: creatorProfile.personalInfo?.firstName || '',
              lastName: creatorProfile.personalInfo?.lastName || '',
              email: creatorProfile.personalInfo?.email || '',
              userId: creatorProfile.userId
            };
          } else {
            order.createdBy = {
              _id: order.createdBy,
              firstName: '',
              lastName: '',
              email: '',
              userId: order.createdBy
            };
          }
        } catch (populateError) {
          console.error('Error populating createdBy:', populateError);
          order.createdBy = {
            _id: order.createdBy,
            firstName: '',
            lastName: '',
            email: '',
            userId: order.createdBy
          };
        }
      }
      
      return order;
    }));

    console.log(`✅ Found ${populatedProductOrders.length} product orders after filtering`);
    
    res.json(populatedProductOrders);
  } catch (err) {
    console.error('Error fetching product orders:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getProductOrder = async (req, res) => {
  try {
    const productOrder = await ProductOrder.findById(req.params.id)
      .populate('accountId', 'name companyName billingAddress shippingAddress email phone')
      .populate('contactId', 'firstName lastName email phone jobTitle')
      .lean();
    
    if (!productOrder) {
      return res.status(404).json({ message: 'Product order not found' });
    }
    
    // Custom populate for createdBy using UserProfile (handles UUID strings)
    if (productOrder.createdBy) {
      try {
        const UserProfile = (await import('../models/UserProfile.js')).default;
        const creatorProfile = await UserProfile.findOne({
          userId: productOrder.createdBy.toString()
        }).select('personalInfo.firstName personalInfo.lastName personalInfo.email userId');
        
        if (creatorProfile) {
          productOrder.createdBy = {
            _id: creatorProfile.userId,
            firstName: creatorProfile.personalInfo?.firstName || '',
            lastName: creatorProfile.personalInfo?.lastName || '',
            email: creatorProfile.personalInfo?.email || '',
            userId: creatorProfile.userId
          };
        } else {
          productOrder.createdBy = {
            _id: productOrder.createdBy,
            firstName: '',
            lastName: '',
            email: '',
            userId: productOrder.createdBy
          };
        }
      } catch (populateError) {
        console.error('Error populating createdBy:', populateError);
        productOrder.createdBy = {
          _id: productOrder.createdBy,
          firstName: '',
          lastName: '',
          email: '',
          userId: productOrder.createdBy
        };
      }
    }
    
    res.json(productOrder);
  } catch (err) {
    console.error('Error fetching product order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const updateProductOrder = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.id || req.user?.userId;
    
    const { items, ...restData } = req.body;
    
    // Ensure items have proper structure
    const itemsWithTotal = items ? items.map(item => {
      const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : (item.quantity || 0);
      const unitPrice = typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : (item.unitPrice || 0);
      const gst = typeof item.gst === 'string' ? parseFloat(item.gst) : (item.gst || 0);
      const itemSubtotal = quantity * unitPrice;
      const gstAmount = itemSubtotal * (gst / 100);
      
      return {
        ...item,
        quantity,
        unitPrice,
        gst,
        total: itemSubtotal + gstAmount
      };
    }) : undefined;
    
    // Convert expectedDeliveryDate string to Date if needed
    let expectedDeliveryDate = restData.expectedDeliveryDate;
    if (expectedDeliveryDate && typeof expectedDeliveryDate === 'string') {
      expectedDeliveryDate = new Date(expectedDeliveryDate);
    }
    
    const productOrderData = {
      ...restData,
      updatedBy: userId,
      subtotal: itemsWithTotal ? calculateSubtotal(itemsWithTotal) : undefined,
      gstTotal: itemsWithTotal ? calculateTaxTotal(itemsWithTotal) : undefined,
      total: itemsWithTotal ? calculateTotal(itemsWithTotal, restData.freightCharges || 0) : undefined
    };
    
    if (itemsWithTotal) {
      productOrderData.items = itemsWithTotal;
    }
    
    if (expectedDeliveryDate) {
      productOrderData.expectedDeliveryDate = expectedDeliveryDate;
    }
    
    // Remove undefined values
    Object.keys(productOrderData).forEach(key => {
      if (productOrderData[key] === undefined) {
        delete productOrderData[key];
      }
    });
    
    const productOrder = await ProductOrder.findByIdAndUpdate(
      req.params.id,
      productOrderData,
      { new: true, runValidators: true }
    );
    
    if (!productOrder) {
      return res.status(404).json({ message: 'Product order not found' });
    }
    
    res.json(productOrder);
  } catch (err) {
    console.error('Error updating product order:', err);
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Product order number already exists', error: err.message });
    }
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const deleteProductOrder = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }
    
    const productOrder = await ProductOrder.findById(req.params.id);
    if (!productOrder) {
      return res.status(404).json({ message: 'Product order not found' });
    }
    
    await ProductOrder.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product order deleted successfully' });
  } catch (err) {
    console.error('Error deleting product order:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export default {
  createProductOrder,
  getProductOrders,
  getProductOrder,
  updateProductOrder,
  deleteProductOrder
};

