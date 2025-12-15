const { validationResult } = require('express-validator');
const Communication = require('../models/Communication');
const { getEffectiveUser, getAccessibleOrganizations } = require('../utils/authHelpers.js');
const Account = require('../models/Account.js');

exports.createCommunication = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const communicationData = {
      ...req.body,
      createdBy: req.user.id
    };

    const communication = new Communication(communicationData);
    await communication.save();

    res.status(201).json(communication);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.getCommunications = async (req, res) => {
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

    // Get accessible organizations
    const accessibleOrgs = await getAccessibleOrganizations(user);

    if (accessibleOrgs.length === 0) {
      console.log('❌ No accessible organizations found for user');
      return res.json([]); // Return empty array instead of error for better UX
    }

    // If entityId provided, validate and use it
    const { entityId } = req.query;
    let targetOrgs = accessibleOrgs;
    if (entityId) {
      if (!accessibleOrgs.includes(entityId)) {
        console.log(`❌ Selected org ${entityId} not accessible to user. Accessible: ${accessibleOrgs.join(', ')}`);
        return res.json([]); // Return empty array for security
      }
      targetOrgs = [entityId];
      console.log(`✅ Org switcher: User selected org ${entityId}`);
    } else {
      // No entityId provided - require explicit selection for security
      console.log('⚠️ No entityId provided for external user - returning empty results');
      return res.json([]);
    }

    // Build query to filter communications by their related entity's organization
    const query = {
      $or: [
        // Communications related to accounts directly
        {
          relatedToType: 'account',
          relatedToId: {
            $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
          }
        },
        // Communications related to contacts (filter by contact's account org)
        {
          relatedToType: 'contact',
          relatedToId: {
            $in: await require('../models/Contact.js').find({
              accountId: {
                $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
              }
            }).select('_id').lean().then(contacts => contacts.map(c => c._id))
          }
        },
        // Communications related to opportunities (filter by opportunity's account org)
        {
          relatedToType: 'opportunity',
          relatedToId: {
            $in: await require('../models/Opportunity.js').find({
              accountId: {
                $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
              }
            }).select('_id').lean().then(opportunities => opportunities.map(o => o._id))
          }
        }
      ]
    };

    console.log('🔍 Communication query filters:', JSON.stringify(query, null, 2));

    // Execute the query with filters
    const communications = await Communication.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .sort({ startTime: -1 });

    console.log(`✅ Found ${communications.length} communications after filtering`);

    res.json(communications);
  } catch (err) {
    console.error('❌ Error getting communications:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while fetching communications'
    });
  }
};

exports.getCommunication = async (req, res) => {
  try {
  // Note: createdBy and assignedTo are ObjectIds in Communication model, so populate should work
  const communication = await Communication.findById(req.params.id)
    .populate('createdBy', 'firstName lastName')
    .populate('assignedTo', 'firstName lastName');

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(communication);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.updateCommunication = async (req, res) => {
  try {
    const communication = await Communication.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    res.json(communication);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.deleteCommunication = async (req, res) => {
  try {
    const communication = await Communication.findById(req.params.id);

    if (!communication) {
      return res.status(404).json({ message: 'Communication not found' });
    }

    await communication.remove();
    res.json({ message: 'Communication deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};