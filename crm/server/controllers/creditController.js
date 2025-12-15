import mongoose from 'mongoose';
import CrmEntityCredit from '../models/CrmEntityCredit.js';
import CrmCreditConfig from '../models/CrmCreditConfig.js';
import UserProfile from '../models/UserProfile.js';
import ActivityLog from '../models/ActivityLog.js';

/**
 * Credit Controller
 * Handles credit-related operations including fetching user credits and consuming credits
 */

// Get user's available credits
export const getUserCredits = async (req, res) => {
  try {
    const { userId, email, tenantId: tenantId } = req.user; // From auth middleware
    const { tenantId: reqTenantId } = req;

    console.log('🔍 CREDIT CONTROLLER DEBUG:');
    console.log('  req.user.tenantId:', tenantId);
    console.log('  req.tenantId (from middleware):', reqTenantId);
    console.log('  userId:', userId);
    console.log('  email:', email);

    // Use tenantId from user object if available, otherwise from req
    const effectiveTenantId = tenantId || reqTenantId;

    console.log('  Using tenantId:', effectiveTenantId);

    // Step 1: Find user by email across all tenants to get the correct tenant
    let userProfile = null;

    // First try the user's session tenant
    userProfile = await UserProfile.findOne({
      tenantId: effectiveTenantId,
      $or: [
        { userId: userId },
        { 'personalInfo.email': email },
        { email: email }
      ]
    }).lean();

    // If not found, search across all tenants by email
    if (!userProfile) {
      const allUsers = await UserProfile.find({
        $or: [
          { 'personalInfo.email': email },
          { email: email }
        ]
      }).lean();

      if (allUsers.length > 0) {
        // Use the first match (should be the comprehensive data)
        userProfile = allUsers[0];
        tenantId = userProfile.tenantId;
        console.log(`Found user in tenant: ${tenantId}`);
      }
    }

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get user's organization code - try wrapper API assignments first
    let userOrgCode = null;

    // Step 2: Get user's assignments from wrapper API using the user's tenant
    const wrapperTenantId = tenantId; // Use the tenant where the user data actually exists
    try {
      const axios = (await import('axios')).default;
      const wrapperResponse = await axios.get(
        `http://localhost:3000/api/wrapper/tenants/${wrapperTenantId}/employee-assignments`,
        {
          headers: {
            'Authorization': `Bearer ${process.env.WRAPPER_AUTH_TOKEN || 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjNjOmUyOmI1OjQwOmRkOmM4OjQzOjg3OjcwOmM3OjViOjhiOjFiOjYyOjRiOmI3IiwidHlwIjoiSldUIn0.eyJhdWQiOltdLCJhenAiOiI2NzdjNWY2ODFkYzE0YzhmYTFkNDJmYmFiNTUwYWViNiIsImV4cCI6MTc1OTg2MzAyNSwiaWF0IjoxNzU5Nzc2NjI1LCJpc3MiOiJodHRwczovL2F1dGguem9wa2l0LmNvbSIsImp0aSI6ImFlMTU1ZjllLTZjYzMtNGY4Yi1hYTYyLWZmNDcxODA5YzhlOCIsIm9yZ19jb2RlIjoib3JnX2NiNTkzZDEzNjA5OTlhIiwicGVybWlzc2lvbnMiOltdLCJzY3AiOlsiZW1haWwiLCJwcm9maWxlIiwib3BlbmlkIiwib2ZmbGluZSJdLCJzdWIiOiJrcF9hZTcwZDM4MjQ0YjE0OWQwYWRiNWE3MzVmYzQ5YTNkMiJ9.Vi41TjTqzoU5TOxOP4WB5Qabv-tPzGqErxPUZhQF_xzb3lMEvUsF9ExETBpEsmdN6o_B8SGQ_8SAzzcz5f28-SWNWz5kDSrQMOYeYKmYhLTrqDkBokLLWvNWpfwz-_13LD7zFX6Oq-MaZs1ccsz0KVl5_MAYMxA5x97ue2IIXGCcdJNdsEsr_KW33Ciy1o9vdpp35dCtTaMMD2HoZl8bcvU1iHdFZlj8sE5uHsmIXm-wSs_-MaYHIe9kTCBoWUCkhe516hpy6Wu7pHVOef8Lo3-DoD1iYnUg0Vn1KfKfVga0RfgvZ1_Y4ASi1-XQAFYotUKKEJKzWRhDh_hVfyr-w'}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        }
      );

      if (wrapperResponse.data?.success && wrapperResponse.data?.data) {
        // Find user's assignment
        const userAssignments = wrapperResponse.data.data.filter(
          assignment => assignment.userId === userId
        );

        if (userAssignments.length > 0) {
          // Get the primary assignment (highest priority)
          const primaryAssignment = userAssignments.sort((a, b) => b.priority - a.priority)[0];
          userOrgCode = primaryAssignment.entityId;
          console.log(`Found user assignment from wrapper API: ${userOrgCode}`);
        }
      }
    } catch (wrapperError) {
      console.warn('Could not fetch assignments from wrapper API:', wrapperError.message);
    }

    // Fallback to user profile data if wrapper API fails
    if (!userOrgCode) {
      userOrgCode = userProfile.organization?.orgCode;

      // If orgCode is null, try primaryOrganizationId
      if (!userOrgCode && userProfile.primaryOrganizationId) {
        userOrgCode = userProfile.primaryOrganizationId;
      }

      // If still no orgCode, try entities array
      if (!userOrgCode && userProfile.entities && userProfile.entities.length > 0) {
        userOrgCode = userProfile.entities[0].orgCode;
      }
    }

    // Step 3: Get entity's credit allocation using organization assignments
    let entityCredit = null;

    if (userOrgCode) {
      // Try to find credit for the specific organization using entityIdString
      entityCredit = await CrmEntityCredit.findOne({
        tenantId: effectiveTenantId,
        entityIdString: userOrgCode,
        isActive: true
      }).lean();
    }

    if (!entityCredit) {
      // If no specific org credit found, try to get credits for user's assigned organizations
      try {
        // Import relationship service to get user's organization assignments
        const RelationshipService = (await import('../services/relationshipService.js')).default;

        const userOrgAssignments = await RelationshipService.getUserOrganizationAssignments(effectiveTenantId, userId);

        if (userOrgAssignments && userOrgAssignments.length > 0) {
          const assignedOrgCodes = userOrgAssignments.map(assignment => assignment.entityId);

          // Get all credits for user's assigned organizations using entityIdString
          const entityCredits = await CrmEntityCredit.find({
            tenantId: effectiveTenantId,
            entityIdString: { $in: assignedOrgCodes },
            isActive: true
          }).lean();

          if (entityCredits && entityCredits.length > 0) {
            // Aggregate credits from all assigned organizations
            const totalAllocated = entityCredits.reduce((sum, credit) => sum + (credit.allocatedCredits || 0), 0);
            const totalUsed = entityCredits.reduce((sum, credit) => sum + (credit.usedCredits || 0), 0);

            entityCredit = {
              allocatedCredits: totalAllocated,
              usedCredits: totalUsed,
              availableCredits: totalAllocated - totalUsed,
              entityId: assignedOrgCodes[0], // Use first org as primary
              allocationType: 'aggregated',
              allocationPurpose: 'Aggregated from user assignments'
            };
          }
        }
      } catch (relationshipError) {
        console.warn('Could not fetch user organization assignments for credits:', relationshipError.message);
      }
    }

    if (!entityCredit) {
      return res.json({
        success: true,
        data: {
          organizationCredits: {
            allocated: 0,
            used: 0,
            available: 0,
            entityId: userOrgCode
          },
          creditConfigs: []
        }
      });
    }

    // Get organization name for better UX
    let organizationName = 'Unknown Organization';
    try {
      if (entityCredit.entityId) {
        // Try to get organization name from entityIdString
        const orgDoc = await mongoose.connection.db.collection('organizations').findOne({
          orgCode: entityCredit.entityId,
          tenantId: effectiveTenantId
        });
        if (orgDoc) {
          organizationName = orgDoc.orgName || orgDoc.orgCode;
        }
      }
    } catch (orgError) {
      console.warn('Could not fetch organization name:', orgError.message);
    }

    res.json({
      success: true,
      data: {
        organizationCredits: {
          allocated: entityCredit.allocatedCredits,
          used: entityCredit.usedCredits,
          available: entityCredit.availableCredits,
          entityId: entityCredit.entityId,
          organizationName: organizationName,
          status: entityCredit.isActive ? 'active' : 'inactive'
        }
        // Removed creditConfigs for cleaner frontend experience
      }
    });

  } catch (error) {
    console.error('Error getting user credits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user credits',
      error: error.message
    });
  }
};

// Consume credits for an operation
export const consumeCredits = async (req, res) => {
  try {
    const { userId } = req.user; // From auth middleware
    const { tenantId } = req;
    const { operationCode, entityType, entityId, operationDetails } = req.body;

    if (!operationCode) {
      return res.status(400).json({
        success: false,
        message: 'Operation code is required'
      });
    }

    // Find user's organization
    const userProfile = await UserProfile.findOne({
      tenantId,
      userId: userId
    }).lean();

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Priority 1: Use selected organization from query params (if user switched orgs)
    let userOrgCode = req.query.entityId || null;

    // Priority 2: Get user's organization code - try multiple sources
    if (!userOrgCode) {
      userOrgCode = userProfile.organization?.orgCode;
    }

    // Priority 3: If orgCode is null, try primaryOrganizationId
    if (!userOrgCode && userProfile.primaryOrganizationId) {
      userOrgCode = userProfile.primaryOrganizationId;
    }

    // Priority 4: If still no orgCode, try entities array
    if (!userOrgCode && userProfile.entities && userProfile.entities.length > 0) {
      userOrgCode = userProfile.entities[0].orgCode;
    }

    // Priority 5: Fallback to tenant ID
    if (!userOrgCode) {
      // If no organization code found, the user might be assigned to tenant directly
      // Use tenant ID as the entity ID for credit lookup
      userOrgCode = tenantId;
      console.log(`Using tenant ID as entity ID for credit lookup: ${userOrgCode}`);
    }

    console.log(`💰 Consuming credits for organization: ${userOrgCode}`);

    // Get entity's credit allocation - use entityIdString for lookup
    // Check if userOrgCode is an ObjectId or string
    const isObjectId = mongoose.Types.ObjectId.isValid(userOrgCode);
    const query = {
      tenantId,
      isActive: true,
      $or: [
        { entityIdString: userOrgCode },
        ...(isObjectId ? [{ entityId: new mongoose.Types.ObjectId(userOrgCode) }] : [])
      ]
    };

    const entityCredit = await CrmEntityCredit.findOne(query);

    if (!entityCredit) {
      return res.status(400).json({
        success: false,
        message: 'No active credit allocation found for user\'s organization'
      });
    }

    // Get credit cost for the operation using hierarchical fallback
    // Priority: Tenant-specific → Global → Default
    const creditConfig = await CrmCreditConfig.getEffectiveConfig(operationCode, tenantId, userOrgCode);

    if (!creditConfig) {
      return res.status(400).json({
        success: false,
        message: `Credit configuration not found for operation: ${operationCode}. Please ensure global credit configs are synced.`
      });
    }

    const creditCost = creditConfig.creditCost;

    // Check if sufficient credits are available
    if (entityCredit.availableCredits < creditCost) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits available',
        data: {
          required: creditCost,
          available: entityCredit.availableCredits
        }
      });
    }

    // Consume credits atomically
    try {
      // Call consumeCredits method which returns the updated document
      const updatedCredit = await entityCredit.consumeCredits(creditCost, {
        operationCode,
        operationDetails: operationDetails || {},
        entityType: entityType || 'unknown',
        entityId: entityId || 'unknown',
        userId: userId,
        timestamp: new Date()
      });

      // Refresh the document to get the latest available credits
      const refreshedCredit = await CrmEntityCredit.findById(entityCredit._id);
      const remainingCredits = refreshedCredit ? refreshedCredit.availableCredits : updatedCredit.availableCredits;

      // Create activity log for credit consumption
      const activityLog = new ActivityLog({
        userId,
        action: 'CREDIT_CONSUMED',
        entityType: 'credit_transaction',
        entityId: entityCredit._id.toString(),
        orgCode: req.query.entityId || entityCredit.entityIdString || entityCredit.entityId || null, // Use selected org or entity org
        details: {
          operationCode,
          creditCost,
          entityId: entityCredit.entityIdString || entityCredit.entityId,
          operationDetails: operationDetails || {},
          remainingCredits: remainingCredits,
          transactionType: 'consumption'
        }
      });

      await activityLog.save();

      res.json({
        success: true,
        message: 'Credits consumed successfully',
        consumed: creditCost,
        remaining: remainingCredits,
        operationCode,
        transactionId: activityLog._id.toString()
      });

    } catch (consumeError) {
      console.error('Error consuming credits:', consumeError);
      return res.status(400).json({
        success: false,
        message: consumeError.message || 'Failed to consume credits'
      });
    }

  } catch (error) {
    console.error('Error in consumeCredits:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to consume credits',
      error: error.message
    });
  }
};

// Get credit consumption history for user
export const getCreditHistory = async (req, res) => {
  try {
    const { userId } = req.user;
    const { tenantId } = req;
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    // Find user's organization
    const userProfile = await UserProfile.findOne({
      tenantId,
      userId: userId
    }).lean();

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get user's organization code - try multiple sources
    let userOrgCode = userProfile.organization?.orgCode;

    // If orgCode is null, try primaryOrganizationId
    if (!userOrgCode && userProfile.primaryOrganizationId) {
      userOrgCode = userProfile.primaryOrganizationId;
    }

    // If still no orgCode, try entities array
    if (!userOrgCode && userProfile.entities && userProfile.entities.length > 0) {
      userOrgCode = userProfile.entities[0].orgCode;
    }

    if (!userOrgCode) {
      // If no organization code found, the user might be assigned to tenant directly
      // Use tenant ID as the entity ID for credit lookup
      userOrgCode = tenantId;
      console.log(`Using tenant ID as entity ID for credit lookup: ${userOrgCode}`);
    }

    // Build query for activity logs
    const query = {
      userId,
      action: 'CREDIT_CONSUMED',
      'details.entityId': userOrgCode
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, totalCount] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    // Format the logs
    const formattedLogs = logs.map(log => ({
      id: log._id,
      action: log.action,
      operationCode: log.details.operationCode,
      creditCost: log.details.creditCost,
      entityId: log.details.entityId,
      operationDetails: log.details.operationDetails,
      remainingCredits: log.details.remainingCredits,
      timestamp: log.createdAt,
      transactionId: log._id.toString()
    }));

    res.json({
      success: true,
      data: {
        logs: formattedLogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting credit history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit history',
      error: error.message
    });
  }
};

// Debug endpoint to fetch all credit configs for a tenant
export const debugCreditConfigs = async (req, res) => {
  try {
    const { tenantId } = req.query;

    console.log(`🔍 DEBUG: Fetching all credit configs for tenant: ${tenantId}`);

    // Get all configs for this tenant
    const configs = await CrmCreditConfig.find({ tenantId }).lean();
    console.log(`📊 Found ${configs.length} credit configs for tenant`);

    // Group by operationCode
    const configsByOperation = {};
    configs.forEach(config => {
      if (!configsByOperation[config.operationCode]) {
        configsByOperation[config.operationCode] = [];
      }
      configsByOperation[config.operationCode].push(config);
    });

    console.log('\n📋 Credit configs grouped by operationCode:');
    Object.keys(configsByOperation).forEach(operationCode => {
      console.log(`\n🔹 ${operationCode}:`);
      configsByOperation[operationCode].forEach(config => {
        console.log(`   - configId: ${config.configId}`);
        console.log(`   - tenantId: ${config.tenantId}`);
        console.log(`   - creditCost: ${config.creditCost}`);
        console.log(`   - isGlobal: ${config.isGlobal}`);
        console.log(`   - source: ${config.source}`);
        console.log(`   - overridesGlobal: ${config.overridesGlobal}`);
        console.log(`   - entityIdString: ${config.entityIdString || 'null'}`);
        console.log('');
      });
    });

    // Specifically check for crm.leads.create
    console.log('\n🎯 Specifically checking crm.leads.create configs:');
    const leadCreateConfigs = configs.filter(config => config.operationCode === 'crm.leads.create');
    console.log(`Found ${leadCreateConfigs.length} configs for crm.leads.create:`);

    leadCreateConfigs.forEach(config => {
      console.log(`   Config:`, {
        configId: config.configId,
        tenantId: config.tenantId,
        creditCost: config.creditCost,
        isGlobal: config.isGlobal,
        source: config.source,
        overridesGlobal: config.overridesGlobal,
        entityIdString: config.entityIdString,
        _id: config._id
      });
    });

    // Test the lookup queries that getEffectiveConfig uses
    console.log('\n🔍 Testing the lookup queries used by getEffectiveConfig:');

    // Query 1: Tenant-specific with overridesGlobal: true
    const query1 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create',
      tenantId,
      $or: [
        { source: 'tenant' },
        { source: { $exists: false } }
      ],
      overridesGlobal: true
    }).lean();

    console.log('Query 1 (tenant-specific with overridesGlobal: true):', query1 ? 'FOUND' : 'NOT FOUND');
    if (query1) console.log('   Result:', query1);

    // Query 2: Tenant-specific without overridesGlobal requirement
    const query2 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create',
      tenantId,
      $or: [
        { source: 'tenant' },
        { source: { $exists: false } },
        { isGlobal: false }
      ],
      isGlobal: { $ne: true }
    }).lean();

    console.log('Query 2 (tenant-specific without overridesGlobal):', query2 ? 'FOUND' : 'NOT FOUND');
    if (query2) console.log('   Result:', query2);

    // Query 3: Simplest tenant query
    const query3 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create',
      tenantId,
      isGlobal: { $ne: true }
    }).lean();

    console.log('Query 3 (simplest tenant query):', query3 ? 'FOUND' : 'NOT FOUND');
    if (query3) console.log('   Result:', query3);

    // Query 4: Any config with operationCode and tenantId
    const query4 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create',
      tenantId
    }).lean();

    console.log('Query 4 (any config with operationCode and tenantId):', query4 ? 'FOUND' : 'NOT FOUND');
    if (query4) console.log('   Result:', query4);

    // Query 5: Global configs
    const query5 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create',
      $or: [
        { isGlobal: true },
        { source: 'global' },
        { tenantId: null },
        { tenantId: { $exists: false } }
      ]
    }).lean();

    console.log('Query 5 (global configs):', query5 ? 'FOUND' : 'NOT FOUND');
    if (query5) console.log('   Result:', query5);

    // Query 6: Any config with operationCode (most permissive)
    const query6 = await CrmCreditConfig.findOne({
      operationCode: 'crm.leads.create'
    }).lean();

    console.log('Query 6 (any config with operationCode):', query6 ? 'FOUND' : 'NOT FOUND');
    if (query6) console.log('   Result:', query6);

    // Check if configs have the wrong tenantId
    console.log('\n🔍 Checking all configs with operationCode crm.leads.create:');
    const allLeadCreate = await CrmCreditConfig.find({ operationCode: 'crm.leads.create' }).lean();
    allLeadCreate.forEach(config => {
      console.log(`   - tenantId: ${config.tenantId}, isGlobal: ${config.isGlobal}, source: ${config.source}, creditCost: ${config.creditCost}`);
    });

    res.json({
      success: true,
      tenantId,
      totalConfigs: configs.length,
      configsByOperation,
      leadCreateConfigs,
      allLeadCreate,
      queries: {
        query1: query1 ? 'FOUND' : 'NOT FOUND',
        query2: query2 ? 'FOUND' : 'NOT FOUND',
        query3: query3 ? 'FOUND' : 'NOT FOUND',
        query4: query4 ? 'FOUND' : 'NOT FOUND',
        query5: query5 ? 'FOUND' : 'NOT FOUND',
        query6: query6 ? 'FOUND' : 'NOT FOUND'
      }
    });

  } catch (error) {
    console.error('❌ Error debugging credit configs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to debug credit configs',
      error: error.message
    });
  }
};

// Get credit statistics for user
export const getCreditStats = async (req, res) => {
  try {
    const { userId } = req.user;
    const { tenantId } = req;

    // Find user's organization
    const userProfile = await UserProfile.findOne({
      tenantId,
      userId: userId
    }).lean();

    if (!userProfile) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    // Get user's organization code - try multiple sources
    let userOrgCode = userProfile.organization?.orgCode;

    // If orgCode is null, try primaryOrganizationId
    if (!userOrgCode && userProfile.primaryOrganizationId) {
      userOrgCode = userProfile.primaryOrganizationId;
    }

    // If still no orgCode, try entities array
    if (!userOrgCode && userProfile.entities && userProfile.entities.length > 0) {
      userOrgCode = userProfile.entities[0].orgCode;
    }

    if (!userOrgCode) {
      // If no organization code found, the user might be assigned to tenant directly
      // Use tenant ID as the entity ID for credit lookup
      userOrgCode = tenantId;
      console.log(`Using tenant ID as entity ID for credit lookup: ${userOrgCode}`);
    }

    // Get entity's credit allocation
    const entityCredit = await CrmEntityCredit.findOne({
      tenantId,
      entityId: userOrgCode,
      isActive: true
    }).lean();

    // Get credit consumption stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const consumptionStats = await ActivityLog.aggregate([
      {
        $match: {
          userId,
          action: 'CREDIT_CONSUMED',
          'details.entityId': userOrgCode,
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          totalConsumed: { $sum: '$details.creditCost' },
          operations: { $sum: 1 }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        currentCredits: entityCredit ? {
          allocated: entityCredit.allocatedCredits,
          used: entityCredit.usedCredits,
          available: entityCredit.availableCredits,
          utilization: entityCredit.allocatedCredits > 0 ?
            ((entityCredit.usedCredits / entityCredit.allocatedCredits) * 100) : 0
        } : null,
        consumptionHistory: consumptionStats.map(stat => ({
          date: stat._id,
          consumed: stat.totalConsumed,
          operations: stat.operations
        }))
      }
    });

  } catch (error) {
    console.error('Error getting credit stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch credit statistics',
      error: error.message
    });
  }
};
