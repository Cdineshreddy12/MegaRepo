
// routes/s3Routes.js
import express from 'express';
const router = express.Router();
import s3Controller from '../../controllers/s3Controller.js';
import auth from '../../middleware/auth.js';

// Route to get a pre-signed URL for S3 uploads
router.get('/presigned-url', auth, s3Controller.getPresignedUrl);

// Route to delete a file from S3
router.delete('/delete-file', auth, s3Controller.deleteFile);

export default router;