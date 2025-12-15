// services/documentService.js
import { api } from './index';
import { handleApiError } from './errorHandler';

export interface Document {
  _id: string;
  name: string;
  fileUrl: string;
  fileKey: string;
  fileType: string;
  entityType: string;
  entityId: string;
  createdBy: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export const documentService = {
  /**
   * Get documents for a specific entity
   * @param {string} entityType - The type of entity (e.g., 'quotation', 'invoice')
   * @param {string} entityId - The ID of the entity
   * @returns {Promise<Document[]>} - List of documents
   */
  getDocumentsByEntity: async (entityType: string, entityId: string): Promise<Document[]> => {
    try {
      const response = await api.get<Document[]>(`/documents/${entityType}/${entityId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  /**
   * Delete a document
   * @param {string} documentId - The ID of the document to delete
   * @returns {Promise<{ message: string }>} - Success message
   */
  deleteDocument: async (documentId: string): Promise<{ message: string }> => {
    try {
      const response = await api.delete<{ message: string }>(`/documents/${documentId}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};