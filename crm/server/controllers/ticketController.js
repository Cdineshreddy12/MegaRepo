import Ticket from '../models/Ticket.js';
import { getEffectiveUser, getPermissionFilters } from '../utils/authHelpers.js';

export const createTicket = async (req, res) => {
  try {
    const tenantId = req.tenant?.id || req.user?.tenantId;
    const userId = req.user?.userId || req.user?.id;
    const { entityId } = req.query; // Selected organization from query params
    
    console.log(`📝 Creating ticket - tenantId: ${tenantId}, userId: ${userId}, entityId: ${entityId}`);
    
    // Check and deduct credits BEFORE creating the ticket
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
        
        console.log(`💰 Checking credits for ticket creation with orgCode: ${creditDeductionOrg}`);
        
        // Deduct credits for ticket creation
        creditResult = await relationshipService.deductCreditsForOperation(
          tenantId,
          userId,
          'crm.tickets.create',
          'ticket',
          null, // resourceId will be set after creation
          {
            accountId: req.body.accountId,
            productName: req.body.productName,
            type: req.body.type,
            oem: req.body.oem
          },
          {
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            sessionId: req.session?.id,
            metadata: {
              endpoint: '/tickets',
              method: 'POST'
            }
          },
          creditDeductionOrg
        );
        
        if (creditResult.success) {
          console.log(`✅ Credits deducted for ticket creation: ${creditResult.creditsDeducted} credits`);
        } else {
          console.warn(`❌ Credit deduction failed: ${creditResult.message}`);
          return res.status(402).json({
            error: 'Payment Required',
            message: 'Insufficient credits to create ticket',
            details: {
              availableCredits: creditResult.availableCredits || 0,
              requiredCredits: creditResult.requiredCredits || 0,
              operation: 'crm.tickets.create'
            }
          });
        }
      } catch (creditError) {
        console.error('❌ Error in credit deduction for ticket creation:', creditError);
        return res.status(402).json({
          error: 'Payment Required',
          message: 'Credit system error occurred during operation',
          details: {
            operation: 'crm.tickets.create',
            error: creditError.message
          }
        });
      }
    }
    
    const ticketData = { ...req.body, createdBy: userId };
    const ticket = new Ticket(ticketData);
    await ticket.save();
    
    // Prepare response with credit deduction info
    const ticketResponse = ticket.toObject();
    if (creditResult?.success) {
      ticketResponse.creditDeduction = {
        operationCode: 'crm.tickets.create',
        creditsDeducted: creditResult.creditsDeducted || 0,
        availableCredits: creditResult.remainingCredits || creditResult.availableCredits || 0,
      };
    }
    
    res.status(201).json(ticketResponse);
  } catch (err) {
    console.error('❌ Error creating ticket:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getTickets = async (req, res) => {
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
    const baseQuery = await getPermissionFilters(user, 'ticket', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Build query to filter tickets by accountId's orgCode
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
        console.log(`⚠️ No accounts found for orgCode: ${baseQuery.orgCode}, returning empty tickets`);
        return res.json([]);
      }
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for ticket filtering - returning empty results for security');
      return res.json([]);
    }

    console.log('🔍 Final query filters:', JSON.stringify(query));

    // Execute the query with filters
    const tickets = await Ticket.find(query)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role')
      .populate('accountId', 'companyName zone orgCode industry')
      .populate('regionOwner', 'firstName lastName email role')
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${tickets.length} tickets after filtering`);

    res.json(tickets);
  } catch (err) {
    console.error('❌ Error getting tickets:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while fetching tickets'
    });
  }
};

export const getTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('createdBy', 'firstName lastName email role')
      .populate('accountId', 'companyName')
      .populate('regionOwner', 'firstName lastName email role')
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }
    
    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTicket = async (req, res) => {
  try {
    const ticket = await Ticket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
    .populate('assignedTo', 'firstName lastName email role')
    .populate('createdBy', 'firstName lastName email role')
    .populate('accountId', 'companyName')
    .populate('regionOwner', 'firstName lastName email role')

    if (!ticket) {
      return res.status(404).json({ message: 'ticket not found' });
    }

    res.json(ticket);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTicket = async (req, res) => {
  try {
    if (!req.params.id) {
      return res.status(404).json({ message: 'id is missing' });
    }
    const ticket = await Ticket.findByIdAndDelete(req.params.id);
    
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    res.json({ message: 'Ticket deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createTicket, getTickets, getTicket, updateTicket, deleteTicket };