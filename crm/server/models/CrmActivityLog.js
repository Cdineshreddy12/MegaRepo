import mongoose from 'mongoose';

const crmActivityLogSchema = new mongoose.Schema({
  logId: {
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
    sparse: true // Optional - which sub-org the action was in
  },
  operationType: {
    type: String,
    required: true,
    enum: [
      'create', 'read', 'update', 'delete',
      'import', 'export', 'bulk_operation',
      'login', 'logout', 'permission_change',
      'role_assignment', 'credit_usage'
    ],
    index: true
  },
  resourceType: {
    type: String,
    required: true,
    enum: [
      'lead', 'contact', 'account', 'opportunity',
      'task', 'activity', 'file', 'report',
      'user', 'role', 'permission', 'organization',
      'credit', 'system', 'quotation', 'invoice', 'sales_order'
    ],
    index: true
  },
  resourceId: {
    type: String,
    index: true,
    sparse: true // Optional - reference to specific resource
  },
  operationDetails: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
    // Store action-specific data like:
    // { oldValue: '...', newValue: '...', field: 'status' }
    // { recordCount: 50, fileName: 'contacts.csv' }
    // { roleId: '...', entityId: '...' }
  },
  ipAddress: {
    type: String,
    trim: true
  },
  userAgent: {
    type: String,
    trim: true
  },
  sessionId: {
    type: String,
    index: true,
    sparse: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low',
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'failure', 'warning', 'info'],
    default: 'success',
    index: true
  },
  errorMessage: {
    type: String,
    trim: true
  },
  processingTime: {
    type: Number, // milliseconds
    min: 0
  },
  creditsConsumed: {
    type: Number,
    min: 0,
    default: 0
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
crmActivityLogSchema.index({ tenantId: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, userId: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, entityId: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, operationType: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, resourceType: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, severity: 1, timestamp: -1 });
crmActivityLogSchema.index({ tenantId: 1, status: 1, timestamp: -1 });
crmActivityLogSchema.index({ sessionId: 1, timestamp: -1 });

// Pre-save middleware to auto-generate logId
crmActivityLogSchema.pre('save', function(next) {
  if (this.isNew && !this.logId) {
    this.logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  next();
});

// Instance method to mark as failed
crmActivityLogSchema.methods.markFailed = function(errorMessage) {
  this.status = 'failure';
  this.errorMessage = errorMessage;
  this.severity = 'high';
  return this.save();
};

// Static method to get user activity summary
crmActivityLogSchema.statics.getUserActivitySummary = function(tenantId, userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        userId: userId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          operationType: '$operationType',
          resourceType: '$resourceType'
        },
        count: { $sum: 1 },
        totalCredits: { $sum: '$creditsConsumed' },
        avgProcessingTime: { $avg: '$processingTime' },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] }
        },
        failureCount: {
          $sum: { $cond: [{ $eq: ['$status', 'failure'] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        operationType: '$_id.operationType',
        resourceType: '$_id.resourceType',
        count: 1,
        totalCredits: 1,
        avgProcessingTime: 1,
        successCount: 1,
        failureCount: 1,
        successRate: {
          $multiply: [
            { $divide: ['$successCount', '$count'] },
            100
          ]
        },
        _id: 0
      }
    }
  ]);
};

// Static method to get tenant activity summary
crmActivityLogSchema.statics.getTenantActivitySummary = function(tenantId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        tenantId: tenantId,
        timestamp: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$userId',
        totalActions: { $sum: 1 },
        totalCredits: { $sum: '$creditsConsumed' },
        operationsByType: {
          $push: '$operationType'
        }
      }
    },
    {
      $project: {
        userId: '$_id',
        totalActions: 1,
        totalCredits: 1,
        uniqueOperations: { $size: { $setUnion: ['$operationsByType', []] } },
        _id: 0
      }
    },
    {
      $sort: { totalActions: -1 }
    }
  ]);
};

export default mongoose.model('CrmActivityLog', crmActivityLogSchema);
