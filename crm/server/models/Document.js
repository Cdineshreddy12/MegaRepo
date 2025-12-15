// models/Document.js
import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileKey: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true
  },
  // Reference to the entity this document belongs to
  entityType: {
    type: String,
    required: true,
    enum: ['quotation', 'invoice', 'salesOrder', 'account', 'opportunity', 'lead']
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  // User who uploaded the document
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

export default mongoose.model('Document', documentSchema);