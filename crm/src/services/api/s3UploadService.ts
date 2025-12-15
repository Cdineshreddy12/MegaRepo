// services/s3UploadService.js
import axios from 'axios';

/**
 * Service for handling S3 uploads
 */
export const s3UploadService = {
  /**
   * Get a pre-signed URL for S3 upload
   * @param {string} fileName - The name of the file to upload
   * @param {string} fileType - The MIME type of the file
   * @returns {Promise<{uploadUrl: string, fileUrl: string}>} - The pre-signed URL and the permanent file URL
   */
  getPresignedUrl: async (fileName, fileType) => {
    try {
      const response = await axios.get(`/api/s3/presigned-url`, {
        params: { fileName, fileType }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting presigned URL:', error);
      throw error;
    }
  },

  /**
   * Upload a file to S3 using a pre-signed URL
   * @param {string} presignedUrl - The pre-signed URL for upload
   * @param {Blob} file - The file to upload
   * @param {string} contentType - The MIME type of the file
   * @returns {Promise<void>}
   */
  uploadToS3: async (presignedUrl, file, contentType) => {
    try {
      await axios.put(presignedUrl, file, {
        headers: {
          'Content-Type': contentType,
        },
      });
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  },

  /**
   * Save reference to the uploaded document in the database
   * @param {Object} documentData - Data about the document to save
   * @returns {Promise<Object>} - The saved document reference
   */
  saveDocumentReference: async (documentData) => {
    try {
      const response = await axios.post('/api/documents', documentData);
      return response.data;
    } catch (error) {
      console.error('Error saving document reference:', error);
      throw error;
    }
  }
};