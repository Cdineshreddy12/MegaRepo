import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface CreditBalance {
  entityId: string;
  allocatedCredits: number;
  usedCredits: number;
  availableCredits: number;
  lastUpdated: string;
}

interface PendingDeduction {
  operationCode: string;
  credits: number;
  timestamp: number;
  resourceType?: string;
  resourceId?: string;
}

interface CreditStoreState {
  // Credit balances by entityId
  balances: Map<string, CreditBalance>;
  
  // Pending optimistic deductions (for rollback)
  pendingDeductions: Map<string, PendingDeduction>;
  
  // Operations in progress
  operationsInProgress: Set<string>;
  
  // Actions
  setBalance: (entityId: string, balance: CreditBalance) => void;
  getBalance: (entityId: string) => CreditBalance | null;
  
  // Optimistic deduction (immediate UI update)
  deductOptimistically: (
    entityId: string,
    operationCode: string,
    credits: number,
    resourceType?: string,
    resourceId?: string
  ) => { success: boolean; newBalance: number; error?: string };
  
  // Confirm deduction (after successful operation)
  confirmDeduction: (operationCode: string, entityId: string) => void;
  
  // Rollback deduction (if operation fails)
  rollbackDeduction: (operationCode: string, entityId: string) => void;
  
  // Mark operation as in progress
  startOperation: (operationCode: string) => void;
  endOperation: (operationCode: string) => void;
  
  // Clear all state
  clear: () => void;
}

export const useCreditStore = create<CreditStoreState>()(
  devtools(
    (set, get) => ({
      balances: new Map(),
      pendingDeductions: new Map(),
      operationsInProgress: new Set(),

      setBalance: (entityId, balance) => {
        set((state) => {
          const newBalances = new Map(state.balances);
          newBalances.set(entityId, balance);
          return { balances: newBalances };
        });
      },

      getBalance: (entityId) => {
        return get().balances.get(entityId) || null;
      },

      deductOptimistically: (entityId, operationCode, credits, resourceType, resourceId) => {
        const state = get();
        const currentBalance = state.balances.get(entityId);

        if (!currentBalance) {
          return {
            success: false,
            newBalance: 0,
            error: 'No credit balance found for this entity',
          };
        }

        // Calculate available credits after all pending deductions
        let totalPending = 0;
        state.pendingDeductions.forEach((deduction, key) => {
          if (key.startsWith(`${entityId}:`)) {
            totalPending += deduction.credits;
          }
        });
        const availableAfterPending = Math.max(0, currentBalance.availableCredits - totalPending);
        
        if (availableAfterPending < credits) {
          return {
            success: false,
            newBalance: currentBalance.availableCredits,
            error: `Insufficient credits. Available: ${availableAfterPending}, Required: ${credits}`,
          };
        }

        // Create pending deduction record
        const pendingKey = `${entityId}:${operationCode}:${Date.now()}`;
        const pendingDeduction: PendingDeduction = {
          operationCode,
          credits,
          timestamp: Date.now(),
          resourceType,
          resourceId,
        };

        // Update balance optimistically
        const updatedBalance: CreditBalance = {
          ...currentBalance,
          usedCredits: currentBalance.usedCredits + credits,
          availableCredits: currentBalance.availableCredits - credits,
          lastUpdated: new Date().toISOString(),
        };

        set((state) => {
          const newBalances = new Map(state.balances);
          newBalances.set(entityId, updatedBalance);

          const newPending = new Map(state.pendingDeductions);
          newPending.set(pendingKey, pendingDeduction);

          return {
            balances: newBalances,
            pendingDeductions: newPending,
          };
        });

        console.log(`💰 Optimistic deduction: ${credits} credits from ${entityId} for ${operationCode}`);
        console.log(`   New balance: ${updatedBalance.availableCredits}`);

        return {
          success: true,
          newBalance: updatedBalance.availableCredits,
        };
      },

      confirmDeduction: (operationCode, entityId) => {
        set((state) => {
          const newPending = new Map(state.pendingDeductions);
          
          // Remove all pending deductions for this operation
          let removed = false;
          newPending.forEach((deduction, key) => {
            if (
              key.startsWith(`${entityId}:`) &&
              deduction.operationCode === operationCode
            ) {
              newPending.delete(key);
              removed = true;
            }
          });

          if (removed) {
            console.log(`✅ Confirmed deduction for ${operationCode} on ${entityId}`);
          }

          return { pendingDeductions: newPending };
        });
      },

      rollbackDeduction: (operationCode, entityId) => {
        set((state) => {
          const newPending = new Map(state.pendingDeductions);
          const newBalances = new Map(state.balances);
          
          // Find and rollback pending deductions
          let rolledBack = false;
          let creditsToRestore = 0;

          newPending.forEach((deduction, key) => {
            if (
              key.startsWith(`${entityId}:`) &&
              deduction.operationCode === operationCode
            ) {
              creditsToRestore += deduction.credits;
              newPending.delete(key);
              rolledBack = true;
            }
          });

          if (rolledBack) {
            // Restore credits to balance
            const balance = newBalances.get(entityId);
            if (balance) {
              newBalances.set(entityId, {
                ...balance,
                usedCredits: Math.max(0, balance.usedCredits - creditsToRestore),
                availableCredits: balance.availableCredits + creditsToRestore,
                lastUpdated: new Date().toISOString(),
              });
            }

            console.log(`🔄 Rolled back ${creditsToRestore} credits for ${operationCode} on ${entityId}`);
          }

          return {
            balances: newBalances,
            pendingDeductions: newPending,
          };
        });
      },

      startOperation: (operationCode) => {
        set((state) => {
          const newOps = new Set(state.operationsInProgress);
          newOps.add(operationCode);
          return { operationsInProgress: newOps };
        });
      },

      endOperation: (operationCode) => {
        set((state) => {
          const newOps = new Set(state.operationsInProgress);
          newOps.delete(operationCode);
          return { operationsInProgress: newOps };
        });
      },

      clear: () => {
        set({
          balances: new Map(),
          pendingDeductions: new Map(),
          operationsInProgress: new Set(),
        });
      },
    }),
    { name: 'CreditStore' }
  )
);

// Helper hook to get balance for current entity
export const useCurrentCreditBalance = () => {
  const { balances, getBalance } = useCreditStore();
  const selectedOrg = useCreditStore((state) => {
    // We'll need to get selectedOrg from org-store
    return null; // Placeholder
  });

  // This will be enhanced to get selectedOrg from org-store
  return selectedOrg ? getBalance(selectedOrg) : null;
};

// Helper function to calculate available credits after pending deductions
export const calculateAvailableAfterPending = (entityId: string): number => {
  const state = useCreditStore.getState();
  const balance = state.balances.get(entityId);
  if (!balance) return 0;

  let totalPending = 0;
  state.pendingDeductions.forEach((deduction, key) => {
    if (key.startsWith(`${entityId}:`)) {
      totalPending += deduction.credits;
    }
  });

  return Math.max(0, balance.availableCredits - totalPending);
};

