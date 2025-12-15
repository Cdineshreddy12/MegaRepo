import { api } from './index';
import { handleApiError } from './errorHandler';
import { Address } from '@/types/common';

// Updated OrderItem interface to match MongoDB schema
export interface OrderItem {
  productId?: string;
  type: 'product' | 'service';
  status: 'new' | 'renewal';
  sku?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  gst: number; // GST amount (absolute value, not percentage in storage)
  total: number; // Calculated total
}

// Terms interface matching MongoDB schema
export interface Terms {
  prices?: string;
  boq?: string;
  paymentTerms?: string;
}

// Updated SalesOrder interface to match enhanced MongoDB schema
export interface SalesOrder {
  id?: string;
  _id?: string; // For compatibility with Mongoose
  
  // Basic Information
  orderNumber: string;
  accountId: string | { _id: string; name: string; industry?: string; website?: string }; // Populated or ID
  primaryContactId: string | { _id: string; name: string; phone?: string; email?: string }; // Populated or ID
  opportunityId?: string;
  quotationId?: string; // Reference to accepted quotation
  
  // Status
  status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled';
  
  // Required OEM field
  oem: string;
  
  // Dates
  orderDate: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
  
  // Contact and CRM (from form design)
  contact?: string;
  crm?: string;
  
  // Shipping and Payment Information
  shippingMethod: 'Courier' | 'Self Pickup' | 'Logistics Partner';
  freightTerms?: string;
  
  // Currency and Exchange (matching quotation schema)
  quoteCurrency: 'INR' | 'USD' | 'EUR' | 'GBP';
  currencyRate: number;
  
  // Items
  items: OrderItem[];
  
  // Financial totals (matching quotation schema structure)
  subtotal: number;
  gstTotal: number; // Total GST amount
  freightCharges: number;
  total: number; // Grand total
  
  // Terms (matching quotation structure)
  terms?: Terms;
  
  // Additional fields
  renewalTerm?: string;
  notes?: string;
  
  // Addresses
  billingAddress?: Address;
  shippingAddress?: Address;
  
  // User tracking
  createdBy: string | { _id: string; name: string }; // Populated or ID
  updatedBy?: string | { _id: string; name: string }; // Populated or ID
  createdAt?: string;
  updatedAt?: string;
}

// Type for creating a new sales order (without auto-generated fields)
export type CreateSalesOrderData = Omit<SalesOrder, 
  'id' | '_id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'gstTotal' | 'total'
> & {
  accountId: string; // Always string when creating
  primaryContactId: string; // Always string when creating
  createdBy: string; // Always string when creating
};

// Type for updating a sales order
export type UpdateSalesOrderData = Partial<CreateSalesOrderData> & {
  updatedBy: string;
};

// Enhanced sales order service
export const salesOrderService = {
  createOrder: async (data: CreateSalesOrderData) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.sales-orders.create',
          resourceType: 'sales-order',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for sales order creation');

      const response = await api.post<SalesOrder>('/sales-orders', data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.sales-orders.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'sales-order',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for sales order creation');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getOrders: async (params?: {
    accountId?: string;
    status?: SalesOrder['status'];
    oem?: string;
    quoteCurrency?: SalesOrder['quoteCurrency'];
    dateFrom?: string;
    dateTo?: string;
    quotationId?: string;
    limit?: number;
    page?: number;
  }) => {
    try {
      const response = await api.get<{
        data: SalesOrder[];
        total: number;
        page: number;
        limit: number;
      }>('/sales-orders', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getOrder: async (id: string, populate?: boolean) => {
    try {
      const response = await api.get<SalesOrder>(`/sales-orders/${id}`, {
        params: { populate }
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateOrder: async (id: string, data: UpdateSalesOrderData) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.sales-orders.update',
          resourceType: 'sales-order',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for sales order update');

      const response = await api.put<SalesOrder>(`/sales-orders/${id}`, data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.sales-orders.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'sales-order',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for sales order update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteOrder: async (id: string) => {
    try {
      await api.delete(`/sales-orders/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Create order from quotation
  createFromQuotation: async (data: {
    quotationId: string;
    orderNumber: string;
    expectedDeliveryDate?: string;
    shippingMethod?: SalesOrder['shippingMethod'];
    freightCharges?: number;
    freightTerms?: string;
    additionalNotes?: string;
    createdBy: string;
  }) => {
    try {
      const response = await api.post<SalesOrder>('/sales-orders/from-quotation', data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Update order status
  updateStatus: async (id: string, data: {
    status: SalesOrder['status'];
    updatedBy: string;
    notes?: string;
  }) => {
    try {
      const response = await api.patch<SalesOrder>(`/sales-orders/${id}/status`, data);
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get order statistics
  getStatistics: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    accountId?: string;
  }) => {
    try {
      const response = await api.get<{
        totalOrders: number;
        totalValue: number;
        statusBreakdown: Record<SalesOrder['status'], number>;
        currencyBreakdown: Record<SalesOrder['quoteCurrency'], number>;
        monthlyTrends: Array<{
          month: string;
          orders: number;
          value: number;
        }>;
      }>('/sales-orders/statistics', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  }
};