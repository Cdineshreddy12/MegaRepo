import mongoose from 'mongoose';

const organizationSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  orgCode: {
    type: String,
    required: true,
    index: true
  },
  orgName: {
    type: String,
    trim: true
  },
  // References for hierarchical relationships
  parentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Organization',
    index: true
  },
  parentIdString: {
    type: String,
    index: true // For queries using external org codes
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  hierarchy: {
    level: { type: Number, default: 0 },
    path: [String], // Array of parent org codes up to root
    children: [String] // Array of child org codes
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Import relationships
import { organizationRelationships } from './relationships.js';

// Add relationship methods to organization schema
organizationSchema.methods.getParent = organizationRelationships.getParent;
organizationSchema.methods.getChildren = organizationRelationships.getChildren;
organizationSchema.methods.getDescendants = organizationRelationships.getDescendants;
organizationSchema.methods.getAssignedUsers = organizationRelationships.getAssignedUsers;
organizationSchema.methods.getCreditAllocation = organizationRelationships.getCreditAllocation;
organizationSchema.methods.getResponsiblePerson = organizationRelationships.getResponsiblePerson;

// Indexes
organizationSchema.index({ tenantId: 1, orgCode: 1 }, { unique: true });
organizationSchema.index({ tenantId: 1, parentId: 1 });
organizationSchema.index({ tenantId: 1, status: 1 });
organizationSchema.index({ tenantId: 1, 'hierarchy.path': 1 });

export default mongoose.model('Organization', organizationSchema);
