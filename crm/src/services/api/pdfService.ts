import { api } from './index';
import { handleApiError } from './errorHandler';

export const pdfService = {
  /**
   * Generate a PDF for a quotation and return it directly as a blob
   * @param {string} quotationId - The ID of the quotation
   * @param {Object} options - PDF options like format, margins, etc.
   * @returns {Promise<Blob>} - PDF as a blob
   */
  generateQuotationPdf: async (quotationId, options = {}) => {
    try {
      const response = await api.post('/pdf/quotation', 
        {
          quotationId,
          saveToS3: false,
          options
        },
        {
          responseType: 'blob', // Important for receiving binary data
        }
      );
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  /**
   * Generate a PDF for a quotation and save it to S3
   * @param {string} quotationId - The ID of the quotation
   * @param {Object} options - PDF options like format, margins, etc.
   * @returns {Promise<Object>} - Response with document information
   */
  generateAndSaveQuotationPdf: async (quotationId, options = {}) => {
    try {
      const response = await api.post('/pdf/quotation', {
        quotationId,
        saveToS3: true,
        options
      });
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  
  /**
   * Download a PDF directly in the browser
   * @param {string} quotationId - The ID of the quotation
   * @param {string} fileName - The name to use for the downloaded file
   * @param {Object} options - PDF options
   */
  downloadQuotationPdf: async (quotationId, fileName, options = {}) => {
    try {
      // Get PDF blob
      const pdfBlob = await pdfService.generateQuotationPdf(quotationId, options);
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(pdfBlob);
      
      // Create a link element and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      return { success: true };
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }
};