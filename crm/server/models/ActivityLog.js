import mongoose from 'mongoose';

const activityLogSchema = new mongoose.Schema({
  orgCode: {
    type: String,
    index: true,
  },
  userId: {
    type: String,
    required: true,
  },
  action: {
    type: String,
    required: true,
  },
  entityType: {
    type: String,
    required: true,
  },
  entityId: {
    type: String,
    required: false, // Make optional to handle cases where resourceId is not yet available (e.g., before creation)
  },
  details: {
    type: mongoose.Schema.Types.Mixed,  // To store any type of object (like Record<string, unknown>)
    required: true,
  },
  user: {
    firstName: {
      type: String,
    },
    lastName: {
      type: String,
    },
    email: {
      type: String,
    },
    role: {
      type: String
    }
  },
}, {
  timestamps: true
});

// Import relationships
import { activityLogRelationships } from './relationships.js';

// Add relationship methods to activity log schema
activityLogSchema.methods.getUser = activityLogRelationships.getUser;
activityLogSchema.methods.getOrganization = activityLogRelationships.getOrganization;
activityLogSchema.methods.getTenant = activityLogRelationships.getTenant;

// Create a model from the schema
const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);

export default ActivityLog;
