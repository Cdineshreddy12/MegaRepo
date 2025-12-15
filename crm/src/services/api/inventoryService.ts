import { AxiosResponse } from "axios";
import { handleApiError } from "./errorHandler";
import { api } from "./index";

// Updated interfaces to align with Mongoose schemas
export interface Product {
  _id?: string; // Use '_id' for MongoDB compatibility
  id?: string; // Use 'id' for consistency with other entities
  name: string;
  sku: string;
  category: string;
  brand: string;
  basePrice: number;
  sellingPrice: number;
  quantity: number;
  stockLevel: number; // Added stockLevel
  minStockLevel: number;
  location: string;
  status: 'active' | 'inactive';
  warrantyPeriod: number;
  taxRate: number;
  description?: string;
  specifications?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface InventorySerialNumber {
  _id?: string; // Use '_id' for MongoDB compatibility
  id?: string;
  productId: string; // Reference to the product
  serialNumber: string;
  status: 'sold' | 'available' | 'damaged';
  customer?: string | null; // Reference to Customer
  warrantyStart: string;
  warrantyEnd: string;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryMovement {
  _id?: string; // Use '_id' for MongoDB compatibility
  id?: string;
  productId: string; // Reference to the product
  type: 'inbound' | 'outbound' | 'transfer' | 'adjustment';
  quantity: number; // Non-negative quantity
  fromLocation: string; // Source location
  toLocation: string; // Destination location
  reference?: string; // Optional reference
  createdBy: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string; // Optional notes
}

export type ProductFormValues = Omit<
  Product,
  "_id" | "id"
>;
export type ProductUpdatePayload = Partial<ProductFormValues>;

export type InventorySerialNumberFormValues = Omit<
  InventorySerialNumber,
  "_id" | "id" | "createdAt" | "updatedAt"
>;
export type InventoryMovementFormValues = Omit<
  InventoryMovement,
  "_id" | "id" | "createdAt" | "updatedAt"
>;

export const inventoryService = {
  createProduct: async (
    data: Omit<ProductFormValues, "id">
  ): Promise<Product> => {
    try {
      const response: AxiosResponse<Product> = await api.post(
        "/inventory",
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getProducts: async (): Promise<Product[]> => {
    try {
      const response: AxiosResponse<Product[]> = await api.get("/inventory");
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    try {
      const response: AxiosResponse<Product> = await api.get(
        `/inventory/${id}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateProduct: async (
    id: string,
    data: ProductUpdatePayload
  ): Promise<Product> => {
    try {
      const response: AxiosResponse<Product> = await api.put(
        `/inventory/${id}`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteProduct: async (id: string): Promise<void> => {
    try {
      await api.delete(`/inventory/${id}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  adjustStockLevel: async (
    id: string,
    adjustment: number
  ): Promise<Product> => {
    try {
      const response: AxiosResponse<Product> = await api.post(
        `/inventory/${id}/adjust-stock`,
        { adjustment }
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  recordInventoryMovement: async (
    data: InventoryMovementFormValues
  ): Promise<InventoryMovement> => {
    try {
      const response: AxiosResponse<InventoryMovement> = await api.post(
        `/inventory/movements`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getInventoryMovements: async (): Promise<InventoryMovement[]> => {
    try {
      const response: AxiosResponse<InventoryMovement[]> = await api.get(
        `/inventory/movements`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getInventoryMovement: async (movementId: string): Promise<InventoryMovement> => {
    try {
      const response: AxiosResponse<InventoryMovement> = await api.get(
        `/inventory/movements/${movementId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  updateInventoryMovement: async (
    movementId: string,
    updateData: Partial<InventoryMovementFormValues>
  ): Promise<InventoryMovement> => {
    try {
      const response: AxiosResponse<InventoryMovement> = await api.put(
        `/inventory/movements/${movementId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  deleteInventoryMovement: async (movementId: string): Promise<void> => {
    try {
      await api.delete(`/inventory/movements/${movementId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },

  createInventorySerialNumber: async (
    data: InventorySerialNumberFormValues
  ): Promise<InventorySerialNumber> => {
    try {
      const response: AxiosResponse<InventorySerialNumber> = await api.post(
        `/inventory/serial-numbers`,
        data
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
  getInventorySerialNumbers: async (): Promise<InventorySerialNumber[]> => {
    try {
      const response: AxiosResponse<InventorySerialNumber[]> = await api.get(
        `/inventory/serial-numbers`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  getInventorySerialNumber: async (
    serialNumberId: string
  ): Promise<InventorySerialNumber> => {
    try {
      const response: AxiosResponse<InventorySerialNumber> = await api.get(
        `/inventory/serial-numbers/${serialNumberId}`
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  updateInventorySerialNumber: async (
    serialNumberId: string,
    updateData: Partial<InventorySerialNumberFormValues>
  ): Promise<InventorySerialNumber> => {
    try {
      const response: AxiosResponse<InventorySerialNumber> = await api.put(
        `/inventory/serial-numbers/${serialNumberId}`,
        updateData
      );
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  deleteInventorySerialNumber: async (serialNumberId: string): Promise<void> => {
    try {
      await api.delete(`/inventory/serial-numbers/${serialNumberId}`);
    } catch (error) {
      throw handleApiError(error);
    }
  },
};
