// controllers/documentController.js
import Document from '../models/Document.js';

export const createDocument = async (req, res) => {
  try {
    const { name, fileUrl, fileKey, fileType, entityType, entityId, metadata } = req.body;
    
    // Validate required fields
    if (!name || !fileUrl || !fileKey || !fileType || !entityType || !entityId) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const document = new Document({
      name,
      fileUrl,
      fileKey,
      fileType,
      entityType,
      entityId,
      createdBy: req.user.userId,
      metadata: metadata || {}
    });
    
    await document.save();
    
    res.status(201).json(document);
  } catch (error) {
    console.error('Error creating document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getDocumentsByEntity = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    const documents = await Document.find({ entityType, entityId })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'firstName lastName');
    
    res.json(documents);
  } catch (error) {
    console.error('❌ Error fetching documents:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred while fetching documents'
    });
  }
};

export const deleteDocument = async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    
    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }
    
    // Check if user has permission to delete
    // This is a simple check - you might want more complex permission logic
    if (document.createdBy.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized to delete this document' });
    }
    
    await Document.findByIdAndDelete(req.params.id);
    
    // Note: You'll need to also delete the file from S3 using the s3Controller
    // This could be done here or by making a separate request to the delete-file endpoint
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export default { createDocument, getDocumentsByEntity, deleteDocument };