import { handleApiError } from './errorHandler';
import { api } from './index';

export interface PaymentRecord {
  amount: number;
  date: string;
  method: string;
  reference: string;
}

export interface InvoiceItem {
  type?: string;
  status?: string;
  sku?: string;
  description?: string;
  quantity?: number | string;
  unitPrice?: number | string;
  gst?: number | string;
}

export interface Invoice {
  id?: string;
  _id?: string;
  invoiceNumber: string;
  salesOrderId?: string | { _id?: string; id?: string; orderNumber?: string };
  accountId: string | { _id?: string; id?: string; companyName?: string };
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  issueDate: string | Date;
  dueDate: string | Date;
  subtotal?: number;
  taxAmount?: number;
  totalAmount?: number;
  amountPaid?: number;
  balance?: number;
  notes?: string;
  paymentTerms?: string;
  paymentHistory?: PaymentRecord[];
  createdBy?: string | { _id?: string; id?: string; name?: string; firstName?: string; lastName?: string; email?: string };
  createdAt?: string;
  updatedAt?: string;
  oem?: string;
  items?: InvoiceItem[];
}

export const invoiceService = {
  createInvoice: async (data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>, params?: Record<string, string>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.invoices.create',
          resourceType: 'invoice',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for invoice creation');

      const response = await api.post<Invoice>('/invoices', data, { params });
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.invoices.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'invoice',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for invoice creation');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getInvoices: async () => {
    try {
      const response = await api.get<Invoice[]>('/invoices');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getInvoice: async (id: string) => {
    try {
      const response = await api.get<Invoice>(`/invoices/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateInvoice: async (id: string, data: Partial<Invoice>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.invoices.update',
          resourceType: 'invoice',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for invoice update');

      const response = await api.put<Invoice>(`/invoices/${id}`, data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.invoices.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'invoice',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for invoice update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteInvoice: async (id: string) => {
    try {
      await api.delete(`/invoices/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  },

  recordPayment: async (id: string, paymentData: Omit<PaymentRecord, 'date'>) => {
    try {
      const response = await api.post<Invoice>(`/invoices/${id}/payment`, paymentData);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  }
};