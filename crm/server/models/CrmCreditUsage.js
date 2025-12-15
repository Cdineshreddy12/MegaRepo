import mongoose from 'mongoose';
// Clean schema with only required fields for CRM credit usage
const crmCreditUsageSchema = new mongoose.Schema({
  usageId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: String,
    required: true,
    index: true
  },
  entityId: {
    type: String,
    index: true,
    sparse: true // Optional - for entity-level usage
  },
  operationType: {
    type: String,
    required: true,
    enum: [
      'create', 'read', 'update', 'delete',
      'import', 'export', 'bulk_operation',
      'api_call', 'file_upload', 'report_generation'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'lead', 'contact', 'account', 'opportunity',
      'task', 'activity', 'file', 'report', 'api',
      'quotation', 'invoice', 'sales_order', 'product_order',
      'ticket', 'communication', 'form_builder', 'analytics'
    ],
    index: true
  },
  operationCode: {
    type: String,
    required: true,
    index: true // Reference to crmcreditconfigs collection operationCode
  },
  configId: {
    type: String,
    index: true, // Reference to crmcreditconfigs collection configId
    sparse: true // Optional - may not always be present for legacy records
  },
  creditsConsumed: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
crmCreditUsageSchema.index({ tenantId: 1, timestamp: -1 });
crmCreditUsageSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
crmCreditUsageSchema.index({ tenantId: 1, entityId: 1, timestamp: -1 });
crmCreditUsageSchema.index({ tenantId: 1, operationType: 1, timestamp: -1 });
crmCreditUsageSchema.index({ tenantId: 1, resourceType: 1, timestamp: -1 });

// Pre-save middleware to auto-generate usageId
crmCreditUsageSchema.pre('save', function(next) {
  if (this.isNew && !this.usageId) {
    this.usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Static method to get usage summary
crmCreditUsageSchema.statics.getUsageSummary = function(tenantId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          operationType: '$operationType',
          resourceType: '$resourceType'
        },
        totalCredits: { $sum: '$creditsUsed' },
        operationCount: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        operationType: '$_id.operationType',
        resourceType: '$_id.resourceType',
        totalCredits: 1,
        operationCount: 1,
        uniqueUserCount: { $size: '$uniqueUsers' },
        _id: 0
      }
    }
  ]);
};

// Import relationships
import { creditUsageRelationships } from './relationships.js';

// Add relationship methods to credit usage schema
crmCreditUsageSchema.methods.getUser = creditUsageRelationships.getUser;
crmCreditUsageSchema.methods.getOrganization = creditUsageRelationships.getOrganization;
crmCreditUsageSchema.methods.getCreditConfig = creditUsageRelationships.getCreditConfig;

export default mongoose.model('CrmCreditUsage', crmCreditUsageSchema);
