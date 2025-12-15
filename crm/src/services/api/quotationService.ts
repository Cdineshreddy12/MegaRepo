import { handleApiError } from './errorHandler';
import { api } from './index';

export interface QuotationItem {
  type: 'product' | 'service';
  status: 'new' | 'renewal';
  sku?: string; // SKU is optional as per Mongoose schema
  description: string;
  quantity: number;
  unitPrice: number;
  gst: number; // Changed from tax to gst
  total?: number;
}

export interface Quotation {
  _id: string; // Optional, corresponds to Mongoose ObjectId
  id: string; // Optional, corresponds to Mongoose ObjectId
  quotationNumber: string;
  accountId: string; // Referring to Account ObjectId
  contactId?: string; // Optional, can be null
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  issueDate: string; // Use ISO string format for dates
  validUntil: string; // Use ISO string format for dates
  items: QuotationItem[];
  subtotal: number;
  gstTotal: number; // Changed from taxTotal to gstTotal
  total: number;
  terms?: string; // Optional field for terms (could contain payment terms, etc.)
  notes?: string; // Optional field for notes
  oem: string;
  currencyRate: number;
  quoteCurrency: string; // Adding currency constraint
  renewalTerm?: string; // Optional field for renewal term
  createdAt?: string;
}


export const quotationService = {
  createQuotation: async (quotationData: Omit<Quotation, 'id' >, selectedOrg?: string) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.quotations.create',
          resourceType: 'quotation',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for quotation creation');

      const response = await api.post<Quotation>('/quotations', quotationData, {
        params: selectedOrg ? { entityId: selectedOrg } : {}
      });

      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.quotations.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'quotation',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for quotation creation');
        }
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getQuotations: async () => {
    try {
      const response = await api.get<Quotation[]>('/quotations');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getQuotation: async (id: string) => {
    try {
      const response = await api.get<Quotation>(`/quotations/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateQuotation: async (id: string, quotationData: Partial<Quotation>, selectedOrg?: string) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.quotations.update',
          resourceType: 'quotation',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for quotation update');

      const response = await api.put<Quotation>(`/quotations/${id}`, quotationData, {
        params: selectedOrg ? { entityId: selectedOrg } : {}
      });

      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.quotations.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'quotation',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for quotation update');
        }
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteQuotation: async (id: string) => {
    try {
      const response = await api.delete(`/quotations/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  }
};