import { useCallback } from 'react';

interface CreditDeductionEvent {
  operationCode: string;
  creditsDeducted: number;
  availableCredits: number;
  resourceType?: string;
  resourceId?: string;
}

/**
 * Hook to emit credit deduction events for real-time UI updates
 */
export function useCreditDeduction() {
  const emitCreditDeduction = useCallback((event: CreditDeductionEvent) => {
    // Dispatch custom event that CreditBalance component listens to
    const customEvent = new CustomEvent('creditDeducted', {
      detail: event,
      bubbles: true,
    });
    
    window.dispatchEvent(customEvent);
    
    console.log('💰 Credit deduction event emitted:', event);
  }, []);

  return { emitCreditDeduction };
}

export default useCreditDeduction;

