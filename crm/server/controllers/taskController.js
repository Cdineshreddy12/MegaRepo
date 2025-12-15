import Task from '../models/Task.js';
import { getEffectiveUser, getPermissionFilters, getAccessibleOrganizations } from '../utils/authHelpers.js';
import { sanitizeObjectIdFields } from '../utils/dataSanitizer.js';
import Account from '../models/Account.js';
export const createTask = async (req, res) => {
  try {
    // Sanitize request data - convert empty strings to undefined for ObjectId fields
    const sanitizedBody = sanitizeObjectIdFields(req.body, ['assignedTo', 'relatedTo.id']);

    const taskData = { ...sanitizedBody, createdBy: req.user.id };
    const task = new Task(taskData);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTasks = async (req, res) => {
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

    // For tasks, we need special handling because they can be related to different entity types
    // We'll filter tasks based on their related entity's organization
    const accessibleOrgs = await getAccessibleOrganizations(user);

    if (accessibleOrgs.length === 0) {
      console.log('❌ No accessible organizations found for user');
      return res.json([]); // Return empty array instead of error for better UX
    }

    // If entityId provided, validate and use it
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

    // Build query to filter tasks by their related entity's organization
    const query = {
      $or: [
        // Tasks related to accounts directly
        {
          'relatedTo.type': 'account',
          'relatedTo.id': {
            $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
          }
        },
        // Tasks related to contacts (filter by contact's account org)
        {
          'relatedTo.type': 'contact',
          'relatedTo.id': {
            $in: await require('./models/Contact.js').find({
              accountId: {
                $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
              }
            }).select('_id').lean().then(contacts => contacts.map(c => c._id))
          }
        },
        // Tasks related to opportunities (filter by opportunity's account org)
        {
          'relatedTo.type': 'opportunity',
          'relatedTo.id': {
            $in: await require('./models/Opportunity.js').find({
              accountId: {
                $in: await Account.find({ orgCode: { $in: targetOrgs } }).select('_id').lean().then(accounts => accounts.map(a => a._id))
              }
            }).select('_id').lean().then(opportunities => opportunities.map(o => o._id))
          }
        }
      ]
    };

    console.log('🔍 Task query filters:', JSON.stringify(query, null, 2));

    // Execute the query with filters
    const tasks = await Task.find(query)
      .populate('assignedTo', 'firstName lastName')
      .populate({
        path: 'relatedTo.id',
        model: (doc) => {
          // Dynamic model population based on relatedTo.type
          switch (doc.relatedTo?.type) {
            case 'account': return 'Account';
            case 'contact': return 'Contact';
            case 'opportunity': return 'Opportunity';
            default: return 'Account';
          }
        }
      })
      .sort({ createdAt: -1 });

    console.log(`✅ Found ${tasks.length} tasks after filtering`);

    res.json(tasks);
  } catch (err) {
    console.error('❌ Error getting tasks:', err.message);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred while fetching tasks'
    });
  }
};

export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName')
      .populate('relatedTo.id');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createTask, getTasks, getTask, updateTask, deleteTask };