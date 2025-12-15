import mongoose from 'mongoose';

const crmTenantUserSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    required: true,
    index: true
  },
  kindeId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    index: true
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  primaryOrganizationId: {
    type: String,
    index: true,
    sparse: true
  },
  isResponsiblePerson: {
    type: Boolean,
    default: false
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isTenantAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  onboardingCompleted: {
    type: Boolean,
    default: false
  },
  lastLoginAt: {
    type: Date,
    index: true
  },
  loginCount: {
    type: Number,
    default: 0
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'YYYY-MM-DD'
    },
    notifications: {
      email: { type: Boolean, default: true },
      inApp: { type: Boolean, default: true },
      marketing: { type: Boolean, default: false }
    }
  },
  profile: {
    avatar: String,
    phone: String,
    department: String,
    jobTitle: String,
    location: String,
    bio: String,
    socialLinks: {
      linkedin: String,
      twitter: String,
      website: String
    }
  },
  security: {
    twoFactorEnabled: { type: Boolean, default: false },
    lastPasswordChange: Date,
    passwordResetRequired: { type: Boolean, default: false },
    accountLocked: { type: Boolean, default: false },
    lockReason: String,
    lockExpiresAt: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Indexes
crmTenantUserSchema.index({ tenantId: 1, userId: 1 }, { unique: true });
crmTenantUserSchema.index({ tenantId: 1, email: 1 }, { unique: true });
crmTenantUserSchema.index({ tenantId: 1, kindeId: 1 }, { unique: true });
crmTenantUserSchema.index({ tenantId: 1, isTenantAdmin: 1 });
crmTenantUserSchema.index({ tenantId: 1, isVerified: 1 });
crmTenantUserSchema.index({ tenantId: 1, onboardingCompleted: 1 });
crmTenantUserSchema.index({ tenantId: 1, lastLoginAt: -1 });
crmTenantUserSchema.index({ tenantId: 1, primaryOrganizationId: 1 });

// Virtual for full name
crmTenantUserSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Instance method to record login
crmTenantUserSchema.methods.recordLogin = function() {
  this.lastLoginAt = new Date();
  this.loginCount += 1;
  return this.save();
};

// Instance method to update profile
crmTenantUserSchema.methods.updateProfile = function(profileData) {
  this.profile = { ...this.profile, ...profileData };
  return this.save();
};

// Instance method to update preferences
crmTenantUserSchema.methods.updatePreferences = function(preferences) {
  this.preferences = { ...this.preferences, ...preferences };
  return this.save();
};

// Instance method to lock account
crmTenantUserSchema.methods.lockAccount = function(reason, durationMinutes = 30) {
  this.security.accountLocked = true;
  this.security.lockReason = reason;
  this.security.lockExpiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  this.metadata = {
    ...this.metadata,
    accountLocks: [
      ...(this.metadata.accountLocks || []),
      {
        lockedAt: new Date(),
        reason: reason,
        expiresAt: this.security.lockExpiresAt
      }
    ]
  };

  return this.save();
};

// Instance method to unlock account
crmTenantUserSchema.methods.unlockAccount = function() {
  this.security.accountLocked = false;
  this.security.lockReason = null;
  this.security.lockExpiresAt = null;

  if (this.metadata.accountLocks) {
    const lastLock = this.metadata.accountLocks[this.metadata.accountLocks.length - 1];
    if (lastLock) {
      lastLock.unlockedAt = new Date();
    }
  }

  return this.save();
};

// Instance method to check if account is locked
crmTenantUserSchema.methods.isAccountLocked = function() {
  if (!this.security.accountLocked) return false;

  // Check if lock has expired
  if (this.security.lockExpiresAt && new Date() > this.security.lockExpiresAt) {
    // Auto-unlock expired locks
    this.unlockAccount();
    return false;
  }

  return true;
};

// Static method to get tenant admins
crmTenantUserSchema.statics.getTenantAdmins = function(tenantId) {
  return this.find({
    tenantId: tenantId,
    isTenantAdmin: true,
    isVerified: true
  });
};

// Static method to get unverified users
crmTenantUserSchema.statics.getUnverifiedUsers = function(tenantId) {
  return this.find({
    tenantId: tenantId,
    isVerified: false
  }).sort({ createdAt: -1 });
};

export default mongoose.model('CrmTenantUser', crmTenantUserSchema);
