import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  externalId: {
    type: String,
    index: true,
    sparse: true
  },
  employeeCode: {
    type: String,
    trim: true,
    index: true,
    sparse: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    index: true,
    sparse: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  contactMobile: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound indexes for better query performance
userSchema.index({ externalId: 1, employeeCode: 1 });
userSchema.index({ email: 1, externalId: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

// Instance method to get display info
userSchema.methods.getDisplayInfo = function() {
  return {
    _id: this._id,
    externalId: this.externalId,
    employeeCode: this.employeeCode,
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,
    contactMobile: this.contactMobile,
    role: this.role,
    fullName: this.fullName
  };
};

export default mongoose.model('User', userSchema);

