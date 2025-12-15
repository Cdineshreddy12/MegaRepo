
// routes/documentRoutes.js
import express from 'express';
const router = express.Router();
import documentController from '../../controllers/documentController.js';
import auth from '../../middleware/auth.js';

// Create a new document reference
router.post('/', auth, documentController.createDocument);

// Get documents by entity type and ID
router.get('/:entityType/:entityId', auth, documentController.getDocumentsByEntity);

// Delete a document reference
router.delete('/:id', auth, documentController.deleteDocument);

export default router;