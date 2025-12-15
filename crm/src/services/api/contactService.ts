import { Address } from '@/types/common';
import { handleApiError } from './errorHandler';
import { api } from './index';


interface ContactImage {
  url?: string;
  publicId?: string;
}

interface BusinessCard {
  url?: string;
  publicId?: string;
}

export interface Contact {
  _id: string; // MongoDB ObjectId
  id: string;
  accountId: string; // Refers to the Account model
  firstName: string;
  lastName: string;
  email?: string;
  secondaryEmail?: string;
  phone?: string;
  alternatePhone?: string;
  jobTitle?: string;
  department?: string;
  contactType?: string;
  leadSource?: string;
  linkedinUrl?: string;
  address?: Address;
  isPrimaryContact?: boolean;
  contactImage?: ContactImage;
  businessCard?: BusinessCard;
  createdBy: string; // Refers to the User model
  assignedTo?: string; // Refers to the User model
  createdAt: Date;
  updatedAt: Date;
}

export const contactService = {
  createContact: async (data: Omit<Contact, 'id' | 'createdBy' | 'updatedAt' | 'createdAt'>, params?: Record<string, string>) => {
    try {
      console.log('📤 ContactService.createContact called with data:', data);

      // Emit credit operation start event for UI tracking
      // Note: Optimistic credit deduction happens via the credit store in components
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.contacts.create',
          resourceType: 'contact',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for contact creation');

      // Check if we have files that need to be uploaded
      const hasFiles = (data.contactImage && data.contactImage.length > 0) ||
                      (data.businessCard && data.businessCard.length > 0);

      let requestData: any;
      let headers: any = {};

      if (hasFiles) {
        // Send as FormData for file uploads
        console.log('📎 Files detected, sending as FormData');
        const formData = new FormData();

        // Add all non-file fields to FormData
        Object.keys(data).forEach(key => {
          if (key !== 'contactImage' && key !== 'businessCard') {
            const value = (data as any)[key];
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          }
        });

        // Add files to FormData
        if (data.contactImage && data.contactImage.length > 0) {
          formData.append('contactImage', data.contactImage[0]);
        }
        if (data.businessCard && data.businessCard.length > 0) {
          formData.append('businessCard', data.businessCard[0]);
        }

        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
        console.log('📡 Making multipart API request to /contacts');
      } else {
        // Send as JSON for regular data
        console.log('📡 Making JSON API request to /contacts with data:', JSON.stringify(data, null, 2));
        requestData = data;
      }

      const response = await api.post<Contact>('/contacts', requestData, {
        headers,
        params
      });
      console.log('✅ API response received:', response.data);
      
      // Note: Credit deduction events are now handled automatically by the API interceptor
      // No need to manually emit them here to avoid double emission
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getContacts: async (selectedOrg?: string) => {
    try {
      const params: any = {};
      if (selectedOrg) {
        params.entityId = selectedOrg;
      }
      const response = await api.get<Contact[]>('/contacts', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getContact: async (id: string) => {
    try {
      const response = await api.get<Contact>(`/contacts/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateContact: async (id: string, data: Partial<Contact>, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.contacts.update',
          resourceType: 'contact',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for contact update');

      // Check if we have files that need to be uploaded
      const hasFiles = (data.contactImage && data.contactImage.length > 0) ||
                      (data.businessCard && data.businessCard.length > 0);

      let requestData: any;
      let headers: any = {};

      if (hasFiles) {
        // Send as FormData for file uploads
        console.log('📎 Files detected in update, sending as FormData');
        const formData = new FormData();

        // Add all non-file fields to FormData
        Object.keys(data).forEach(key => {
          if (key !== 'contactImage' && key !== 'businessCard') {
            const value = (data as any)[key];
            if (value !== null && value !== undefined) {
              if (typeof value === 'object') {
                formData.append(key, JSON.stringify(value));
              } else {
                formData.append(key, String(value));
              }
            }
          }
        });

        // Add files to FormData
        if (data.contactImage && data.contactImage.length > 0) {
          formData.append('contactImage', data.contactImage[0]);
        }
        if (data.businessCard && data.businessCard.length > 0) {
          formData.append('businessCard', data.businessCard[0]);
        }

        requestData = formData;
        headers['Content-Type'] = 'multipart/form-data';
        console.log('📡 Making multipart PUT request to /contacts/' + id);
      } else {
        // Send as JSON for regular data
        console.log('📡 Making JSON PUT request to /contacts/' + id + ' with data:', JSON.stringify(data, null, 2));
        requestData = data;
      }

      const response = await api.put<Contact>(`/contacts/${id}`, requestData, {
        headers,
        params
      });

      // Note: Credit deduction events are now handled automatically by the API interceptor
      // No need to manually emit them here to avoid double emission

      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteContact: async (id: string) => {
    try {
      await api.delete(`/contacts/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  },
  
  // Get contacts for a specific account
  getContactsByAccount: async (accountId: string) => {
    try {
      const response = await api.get<Contact[]>(`/accounts/${accountId}/contacts`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },
  
  // Create a contact specifically for an account
  createContactForAccount: async (
    accountId: string, 
    data: Omit<Contact, 'id' | 'accountId' | 'createdBy' | 'updatedAt' | 'createdAt'>
  ) => {
    try {
      const contactData = {
        ...data,
        accountId
      };
      const response = await api.post<Contact>('/contacts', contactData);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },
  
  // Set a contact as primary for an account
  setPrimaryContact: async (contactId: string, accountId: string) => {
    try {
      const response = await api.put<Contact>(
        `/contacts/${contactId}/set-primary`, 
        { accountId }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  }
};