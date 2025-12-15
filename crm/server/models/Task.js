import mongoose from 'mongoose';

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['not_started', 'in_progress', 'completed', 'deferred'],
    default: 'not_started'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  activityType: {
    type: String,
    enum: ['call', 'meeting', 'email', 'demo', 'presentation', 'follow_up'],
    required: true
  },
  estimatedDuration: Number, // in minutes
  relatedTo: {
    type: { type: String, enum: ['account', 'contact', 'opportunity'] },
    id: { type: mongoose.Schema.Types.ObjectId, refPath: 'relatedTo.type' }
  },
  reminderAt: Date,
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    interval: Number,
    endDate: Date
  },
  completedAt: Date,
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User'},
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Task', taskSchema);