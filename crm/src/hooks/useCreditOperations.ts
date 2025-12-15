import { useState, useEffect, useCallback } from 'react';

interface PendingOperation {
  operationCode: string;
  timestamp: number;
  resourceType?: string;
}

interface CreditDeduction {
  operationCode: string;
  creditsDeducted: number;
  availableCredits: number;
  timestamp: number;
  resourceType?: string;
}

// Global state for tracking credit operations
let pendingOperations: Map<string, PendingOperation> = new Map();
let listeners: Set<() => void> = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

/**
 * Hook to track and manage credit operations state
 * Provides smooth state management for credit deductions
 */
export function useCreditOperations() {
  const [pendingOps, setPendingOps] = useState<Map<string, PendingOperation>>(new Map());
  const [recentDeduction, setRecentDeduction] = useState<CreditDeduction | null>(null);

  useEffect(() => {
    const updateState = () => {
      setPendingOps(new Map(pendingOperations));
    };

    listeners.add(updateState);
    updateState();

    // Listen for credit operation events
    const handleCreditOperationStart = (event: CustomEvent) => {
      const { operationCode, resourceType } = event.detail;
      pendingOperations.set(operationCode, {
        operationCode,
        timestamp: Date.now(),
        resourceType,
      });
      notifyListeners();
    };

    const handleCreditDeduction = (event: CustomEvent) => {
      const { operationCode, creditsDeducted, availableCredits, resourceType } = event.detail;
      
      // Remove from pending
      pendingOperations.delete(operationCode);
      notifyListeners();

      // Set recent deduction
      setRecentDeduction({
        operationCode,
        creditsDeducted,
        availableCredits,
        timestamp: Date.now(),
        resourceType,
      });

      // Clear after 3 seconds
      setTimeout(() => {
        setRecentDeduction(null);
      }, 3000);
    };

    window.addEventListener('creditOperationStart', handleCreditOperationStart as EventListener);
    window.addEventListener('creditDeducted', handleCreditDeduction as EventListener);

    return () => {
      listeners.delete(updateState);
      window.removeEventListener('creditOperationStart', handleCreditOperationStart as EventListener);
      window.removeEventListener('creditDeducted', handleCreditDeduction as EventListener);
    };
  }, []);

  const isOperationPending = useCallback((operationCode: string) => {
    return pendingOps.has(operationCode);
  }, [pendingOps]);

  const getPendingOperation = useCallback((operationCode: string) => {
    return pendingOps.get(operationCode);
  }, [pendingOps]);

  return {
    pendingOperations: Array.from(pendingOps.values()),
    recentDeduction,
    isOperationPending,
    getPendingOperation,
  };
}

