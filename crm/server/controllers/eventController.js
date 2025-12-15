import { validationResult } from 'express-validator';
import Event from '../models/Event.js';

export const createEvent = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const eventData = {
      ...req.body,
      createdBy: req.user.id
    };

    const event = new Event(eventData);
    await event.save();

    res.status(201).json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const getEvents = async (req, res) => {
  try {
    // Get effective user (handles both external and local auth)
    const { getEffectiveUser, getPermissionFilters, getAccessibleOrganizations } = await import('../utils/authHelpers.js');
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
    const baseQuery = await getPermissionFilters(user, 'event', entityId);

    console.log('🔍 Base query filters:', JSON.stringify(baseQuery));

    // Events don't have orgCode directly, so we filter by users in the organization
    // Get accessible organizations
    const accessibleOrgs = await getAccessibleOrganizations(user);
    
    if (accessibleOrgs.length === 0 && !baseQuery.orgCode) {
      console.warn('⚠️ No orgCode available for event filtering - returning empty results for security');
      return res.json([]);
    }

    // If entityId provided, validate and use it
    let targetOrgs = accessibleOrgs;
    if (baseQuery.orgCode) {
      if (!accessibleOrgs.includes(baseQuery.orgCode)) {
        console.log(`❌ Selected org ${baseQuery.orgCode} not accessible to user. Accessible: ${accessibleOrgs.join(', ')}`);
        return res.json([]); // Return empty array for security
      }
      targetOrgs = [baseQuery.orgCode];
      console.log(`✅ Org switcher: User selected org ${baseQuery.orgCode}`);
    } else if (entityId) {
      // Resolve entityId to orgCode if needed
      let orgCode = entityId;
      if (/^[a-f\d]{24}$/i.test(entityId)) {
        try {
          const Organization = (await import('../models/Organization.js')).default;
          const orgData = await Organization.findById(entityId).select('orgCode').lean();
          if (orgData && orgData.orgCode) {
            orgCode = orgData.orgCode;
          }
        } catch (error) {
          console.error('Error resolving entityId:', error);
        }
      }
      
      if (!accessibleOrgs.includes(orgCode)) {
        console.log(`❌ Selected org ${orgCode} not accessible to user`);
        return res.json([]);
      }
      targetOrgs = [orgCode];
    } else {
      // No orgCode filter - return empty for security
      console.warn('⚠️ No orgCode available for event filtering - returning empty results for security');
      return res.json([]);
    }

    // Find users in the target organizations
    const UserProfile = (await import('../models/UserProfile.js')).default;
    const usersInOrgs = await UserProfile.find({
      'organizationAssignments.entityId': { $in: targetOrgs }
    }).select('userId').lean();
    
    const userIds = usersInOrgs.map(u => u.userId);
    
    if (userIds.length === 0) {
      console.log(`⚠️ No users found in organizations: ${targetOrgs.join(', ')}, returning empty events`);
      return res.json([]);
    }

    // Filter events by createdBy users in the organization
    const query = {
      createdBy: { $in: userIds }
    };

    console.log('🔍 Final query filters:', JSON.stringify(query));

    const events = await Event.find(query)
      .populate('createdBy', 'firstName lastName')
      .populate('participants', 'firstName lastName')
      .sort({ start: 1 });

    console.log(`✅ Found ${events.length} events after filtering`);
    
    res.json(events);
  } catch (err) {
    console.error('❌ Error getting events:', err.message);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

export const getEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('participants', 'firstName lastName');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: 'Event deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

export default {
  createEvent,
  getEvents,
  getEvent,
  updateEvent,
  deleteEvent
};