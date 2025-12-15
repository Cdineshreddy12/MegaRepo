import mongoose from 'mongoose';

const communicationSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['email', 'phone', 'meeting', 'video_call', 'chat']
  },
  subject: { type: String, required: true },
  description: String,
  startTime: { type: Date, required: true },
  endTime: Date,
  duration: Number, // in minutes
  relatedToType: {
    type: String,
    required: true,
    enum: ['account', 'contact', 'opportunity']
  },
  relatedToId: { type: mongoose.Schema.Types.ObjectId, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contact' }],
  notes: String,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

communicationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model('Communication', communicationSchema);