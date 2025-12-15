import { handleApiError } from './errorHandler';
import { api } from './index';
import { Zone, DocumentDeliveryMethod, PaymentTerms, Address, UserRef } from '@/types/common';

// Define account status as a union type for better type safety
export type AccountStatus = string; // 'active' | 'inactive' | 'pending';

// Define account type as a union type for better type safety
export type AccountType = string; // 'customer' | 'prospect';

// Define ownership type as a union type for better type safety
export type OwnershipType = string; // 'public' | 'private' | 'government' | 'non_profit' | null;

// Base account interface with required fields
export interface BaseAccount {
  companyName: string;
  createdBy: UserRef;
}

// Optional account fields interface
export interface AccountOptionalFields {
  phone?: string;
  email?: string;
  billingAddress?: Address;
  shippingAddress?: Address;
  description?: string;
  website?: string;
  status?: AccountStatus;
  parentAccount?: string;
  accountType?: AccountType;
  segment?: string;
  ownershipType?: OwnershipType;
  annualRevenue?: number;
  employeesCount?: number;
  industry?: string;
  zone?: Zone;
  invoicing?: DocumentDeliveryMethod;
  creditTerm?: PaymentTerms;
  gstNo?: string;
  assignedTo?: UserRef | null;
}

// Full account interface extending base and optional fields
export interface Account extends BaseAccount, AccountOptionalFields {
  id: string;
  updatedBy: UserRef;
  createdAt: string;
  updatedAt: string;
  // Custom fields from form templates
  customFields?: Record<string, any>;
  // Template ID used to create this account
  formTemplateId?: string;
}

// Type for creating a new account (omitting auto-generated fields)
export type CreateAccountData = Omit<Account, 'id' | 'createdBy' | 'updatedBy' | 'createdAt' | 'updatedAt'>;

// Type for updating an account (all fields optional except id)
export type UpdateAccountData = Partial<Omit<Account, 'id' | 'createdBy' | 'createdAt'>>;


/**
 * Account service for handling all account-related API operations
 */
export const accountService = {
  /**
   * Create a new account
   * @param data - Account data without auto-generated fields (including orgCode)
   * @param params - Optional query parameters (e.g., selectedOrg)
   * @returns Promise with created account
   */
  createAccount: async (data: CreateAccountData, params?: Record<string, string>): Promise<Account> => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.accounts.create',
          resourceType: 'account',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for account creation');

      const response = await api.post<Account>('/accounts', data, { params });
      
      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;
        
        if (anyResponse.creditDeduction) {
          const creditsDeducted =
            anyResponse.creditDeduction.creditsDeducted ??
            anyResponse.creditDeduction.creditsUsed ??
            anyResponse.creditDeduction.creditCost ??
            0;

          const availableCredits =
            anyResponse.creditDeduction.remainingCredits ??
            anyResponse.creditDeduction.availableCredits ??
            anyResponse.creditDeduction.creditRecord?.availableCredits ??
            0;

          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.accounts.create',
              creditsDeducted,
              availableCredits,
              resourceType: 'account',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for account creation:', {
            operationCode: anyResponse.creditDeduction.operationCode,
            creditsDeducted: anyResponse.creditDeduction.creditsDeducted,
            availableCredits: anyResponse.creditDeduction.availableCredits,
          });
        }
      }
      
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to create account');
    }
  },

  /**
   * Get all accounts
   * @param selectedOrg - Optional organization code to filter accounts
   * @returns Promise with array of accounts
   */
  getAccounts: async (selectedOrg?: string): Promise<Account[]> => {
    try {
      const params = selectedOrg ? { selectedOrg } : {};
      const response = await api.get<Account[]>('/accounts', { params });
      return response.data;
    } catch (error) {
      throw handleApiError(error, 'Failed to fetch accounts');
    }
  },

  /**
   * Get a specific account by ID
   * @param id - Account ID
   * @returns Promise with account data
   */
  getAccount: async (id: string): Promise<Account> => {
    try {
      const response = await api.get<Account>(`/accounts/${id}`);
      return response.data;
    } catch (error) {
      throw handleApiError(error, `Failed to fetch account with ID: ${id}`);
    }
  },

  /**
   * Update an existing account
   * @param id - Account ID
   * @param data - Partial account data to update
   * @returns Promise with updated account
   */
  updateAccount: async (id: string, data: UpdateAccountData, params?: Record<string, string>): Promise<Account> => {
    try {
      // Emit credit operation start event
      const startEvent = new CustomEvent('creditOperationStart', {
        detail: {
          operationCode: 'crm.accounts.update',
          resourceType: 'account',
        },
        bubbles: true,
      });
      window.dispatchEvent(startEvent);
      console.log('⚡ Credit operation start event emitted for account update');

      const response = await api.put<Account>(`/accounts/${id}`, data, { params });

      // Emit credit deduction event if present in response
      if (response.data && typeof response.data === 'object') {
        const anyResponse = response.data as any;

        if (anyResponse.creditDeduction) {
          const creditsDeducted =
            anyResponse.creditDeduction.creditsDeducted ??
            anyResponse.creditDeduction.creditsUsed ??
            anyResponse.creditDeduction.creditCost ??
            0;

          const availableCredits =
            anyResponse.creditDeduction.remainingCredits ??
            anyResponse.creditDeduction.availableCredits ??
            anyResponse.creditDeduction.creditRecord?.availableCredits ??
            0;

          const event = new CustomEvent('creditDeducted', {
            detail: {
              operationCode: anyResponse.creditDeduction.operationCode || 'crm.accounts.update',
              creditsDeducted,
              availableCredits,
              resourceType: 'account',
              resourceId: anyResponse._id || anyResponse.id,
            },
            bubbles: true,
          });
          window.dispatchEvent(event);
          console.log('💰 Credit deduction event emitted for account update');
        }
      }

      return response.data;
    } catch (error) {
      throw handleApiError(error, `Failed to update account with ID: ${id}`);
    }
  },

  /**
   * Delete an account
   * @param id - Account ID
   * @returns Promise that resolves when account is deleted
   */
  deleteAccount: async (id: string): Promise<void> => {
    try {
      await api.delete(`/accounts/${id}`);
    } catch (error) {
      throw handleApiError(error, `Failed to delete account with ID: ${id}`);
    }
  }
};