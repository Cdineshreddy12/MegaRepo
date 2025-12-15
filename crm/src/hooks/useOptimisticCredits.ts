import { useCallback } from 'react';
import { useCreditStore } from '@/store/credit-store';
import { useOrgStore } from '@/store/org-store';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/services/api';

interface CreditConfig {
  operationCode: string;
  creditCost: number;
}

/**
 * Hook for optimistic credit deduction
 * Deducts credits immediately in the UI before the operation completes
 */
export function useOptimisticCredits() {
  const creditStore = useCreditStore();
  const selectedOrg = useOrgStore((state) => state.selectedOrg);
  const queryClient = useQueryClient();

  /**
   * Get credit cost for an operation (from server or cache)
   */
  const getCreditCost = useCallback(async (operationCode: string): Promise<number> => {
    try {
      // Try to get from cache first
      const cached = queryClient.getQueryData<CreditConfig>(['creditConfig', operationCode, selectedOrg]);
      if (cached) {
        return cached.creditCost;
      }

      // Fetch from server
      const response = await api.get<CreditConfig>(`/credits/config/${operationCode}`, {
        params: { entityId: selectedOrg },
      });

      // Cache the result
      queryClient.setQueryData(['creditConfig', operationCode, selectedOrg], response.data);

      return response.data.creditCost || 0;
    } catch (error) {
      console.warn(`Failed to get credit cost for ${operationCode}:`, error);
      return 0; // Default to 0 if we can't determine the cost
    }
  }, [selectedOrg, queryClient]);

  /**
   * Deduct credits optimistically before operation
   */
  const deductOptimistically = useCallback(
    async (
      operationCode: string,
      resourceType?: string,
      resourceId?: string
    ): Promise<{ success: boolean; credits: number; error?: string }> => {
      if (!selectedOrg) {
        return { success: false, credits: 0, error: 'No organization selected' };
      }

      // Get credit cost
      const creditCost = await getCreditCost(operationCode);

      if (creditCost === 0) {
        // No credits needed, skip deduction
        return { success: true, credits: 0 };
      }

      // Get current balance from store
      const currentBalance = creditStore.getBalance(selectedOrg);

      if (!currentBalance) {
        // Try to fetch balance first
        try {
          const response = await api.get('/credits/balance', {
            params: { entityId: selectedOrg },
          });
          creditStore.setBalance(selectedOrg, response.data);
        } catch (error) {
          return {
            success: false,
            credits: 0,
            error: 'Failed to load credit balance',
          };
        }
      }

      // Perform optimistic deduction
      const result = creditStore.deductOptimistically(
        selectedOrg,
        operationCode,
        creditCost,
        resourceType,
        resourceId
      );

      if (result.success) {
        // Emit event for UI updates
        const event = new CustomEvent('creditDeductedOptimistically', {
          detail: {
            operationCode,
            creditsDeducted: creditCost,
            availableCredits: result.newBalance,
            resourceType,
            resourceId,
          },
          bubbles: true,
        });
        window.dispatchEvent(event);

        // Mark operation as in progress
        creditStore.startOperation(operationCode);
      }

      return {
        success: result.success,
        credits: creditCost,
        error: result.error,
      };
    },
    [selectedOrg, creditStore, getCreditCost]
  );

  /**
   * Confirm deduction after successful operation
   */
  const confirmDeduction = useCallback(
    (operationCode: string) => {
      if (!selectedOrg) return;

      creditStore.confirmDeduction(operationCode, selectedOrg);
      creditStore.endOperation(operationCode);

      // Invalidate credit balance query to sync with server
      // queryClient.invalidateQueries({ queryKey: ['creditBalance', selectedOrg] }); // temporarily disabled
    },
    [selectedOrg, creditStore, queryClient]
  );

  /**
   * Rollback deduction if operation fails
   */
  const rollbackDeduction = useCallback(
    (operationCode: string) => {
      if (!selectedOrg) return;

      creditStore.rollbackDeduction(operationCode, selectedOrg);
      creditStore.endOperation(operationCode);

      // Invalidate credit balance query to sync with server
      // queryClient.invalidateQueries({ queryKey: ['creditBalance', selectedOrg] }); // temporarily disabled

      // Emit rollback event
      const event = new CustomEvent('creditRollback', {
        detail: {
          operationCode,
          entityId: selectedOrg,
        },
        bubbles: true,
      });
      window.dispatchEvent(event);
    },
    [selectedOrg, creditStore, queryClient]
  );

  /**
   * Sync balance from server
   */
  const syncBalance = useCallback(async () => {
    if (!selectedOrg) return;

    try {
      const response = await api.get('/credits/balance', {
        params: { entityId: selectedOrg },
      });
      creditStore.setBalance(selectedOrg, response.data);
      queryClient.setQueryData(['creditBalance', selectedOrg], response.data);
    } catch (error) {
      console.error('Failed to sync credit balance:', error);
    }
  }, [selectedOrg, creditStore, queryClient]);

  return {
    deductOptimistically,
    confirmDeduction,
    rollbackDeduction,
    syncBalance,
    getCreditCost,
  };
}

