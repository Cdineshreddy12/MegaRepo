// routes/api/pdf.js
import express from 'express';
const router = express.Router();
import pdfController from '../../controllers/pdfController.js';
import auth from '../../middleware/auth.js';

// Route to generate PDF for a quotation
// POST /api/pdf/quotation
router.post('/quotation', auth, pdfController.generateQuotationPdf);

export default router;