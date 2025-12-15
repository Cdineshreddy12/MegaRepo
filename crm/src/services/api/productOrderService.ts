import { handleApiError } from './errorHandler';
import { api } from './index';

export interface ProductOrderItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
}

export interface ProductOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  status: 'draft' | 'pending' | 'approved' | 'completed' | 'cancelled';
  orderDate: string;
  deliveryDate: string;
  items: ProductOrderItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  shippingMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export const productOrderService = {
  createOrder: async (data: Omit<ProductOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.product-orders.create',
          resourceType: 'product-order',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for product order creation');

      const response = await api.post<ProductOrder>('/product-orders', data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.product-orders.create',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'product-order',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for product order creation');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOrders: async () => {
    try {
      const response = await api.get<ProductOrder[]>('/product-orders');
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  getOrder: async (id: string) => {
    try {
      const response = await api.get<ProductOrder>(`/product-orders/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  updateOrder: async (id: string, data: Partial<ProductOrder>) => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.product-orders.update',
          resourceType: 'product-order',
          resourceId: id,
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for product order update');

      const response = await api.put<ProductOrder>(`/product-orders/${id}`, data);
      
      // Emit credit deduction event if present in response (also handled by interceptor, but explicit here for clarity)
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        if (anyResponse.creditDeduction) {
          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.product-orders.update',
              creditsDeducted: anyResponse.creditDeduction.creditsDeducted || 0,
              availableCredits: anyResponse.creditDeduction.availableCredits || 0,
              resourceType: 'product-order',
              resourceId: id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for product order update');
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error)
    }
  },

  deleteOrder: async (id: string) => {
    try {
      await api.delete(`/product-orders/${id}`);
    } catch (error) {
      throw handleApiError(error)
    }
  }
};