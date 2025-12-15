// controllers/s3Controller.js

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand, S3 } from '@aws-sdk/client-s3';

import { v4 as uuidv4 } from 'uuid';

// Configure AWS SDK with environment variables
const s3 = new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  },

  region: process.env.AWS_REGION
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

export const getPresignedUrl = async (req, res) => {
  try {
    const { fileName, fileType } = req.query;
    
    if (!fileName || !fileType) {
      return res.status(400).json({ message: 'fileName and fileType are required' });
    }

    // Generate a unique file name to prevent overwrites
    const fileKey = `quotations/${uuidv4()}-${fileName}`;

    // Generate a pre-signed URL for uploading
    const presignedUrl = await getSignedUrl(s3, new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileKey,
      ContentType: fileType
    }), {
      expiresIn: 600
    });

    // Generate the permanent URL to access the file after upload
    const fileUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`;

    res.json({
      uploadUrl: presignedUrl,
      fileUrl: fileUrl,
      fileKey: fileKey
    });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    res.status(500).json({ message: 'Error generating upload URL' });
  }
};

export const deleteFile = async (req, res) => {
  try {
    const { fileKey } = req.body;
    
    if (!fileKey) {
      return res.status(400).json({ message: 'fileKey is required' });
    }

    await s3.deleteObject({
      Bucket: BUCKET_NAME,
      Key: fileKey
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ message: 'Error deleting file' });
  }
};

export default { getPresignedUrl, deleteFile };