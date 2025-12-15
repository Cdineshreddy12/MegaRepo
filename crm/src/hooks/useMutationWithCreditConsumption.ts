import { useConsumeCredits, useUserCredits } from "@/queries/CreditQueries";
import { useUserSession } from "@/contexts/UserSessionContext";
import { creditService, ConsumeCreditsRequest } from "@/services/api/creditService";
import { ACTION } from "@/constants";
import { ActionType, EntityType } from "@/types/common";

export type CreditConsumptionLogDetails<T> = {
  action: ActionType;
  entityType: EntityType;
  operationCode: string;
  oldData?: T;
};

interface MutationWithCreditProps<T extends { id?: string; _id?: string }, L extends CreditConsumptionLogDetails<T>> {
  mainMutation: (data: T) => Promise<T>;
  logDetails: L;
  onSuccess?: (data: T, creditResult?: any) => void;
  onError?: (error: Error) => void;
  skipCreditCheck?: boolean; // For operations that don't consume credits
}

const useMutationWithCreditConsumption = <T extends { id?: string; _id?: string }, L extends CreditConsumptionLogDetails<T>>({
  mainMutation,
  logDetails,
  onSuccess,
  onError,
  skipCreditCheck = false
}: MutationWithCreditProps<T, L>) => {
  const consumeCreditsMutation = useConsumeCredits();
  const { data: creditData } = useUserCredits();
  const { updateCredits } = useUserSession();

  const mutateWithCreditConsumption = async (data: T): Promise<{
    result: T;
    creditResult?: any;
  }> => {
    try {
      // Skip credit consumption if specified
      if (skipCreditCheck) {
        const result = await mainMutation(data);
        onSuccess?.(result);
        return { result };
      }

      // Check if we have credit data
      if (!creditData) {
        throw new Error('Unable to load credit information. Please refresh and try again.');
      }

      // Get credit cost for the operation
      const creditCost = creditService.getCreditCost(logDetails.operationCode);

      // If operation costs credits, consume them first
      let creditResult;
      if (creditCost > 0) {
        // Check if user has sufficient credits
        if (!creditService.hasSufficientCredits(creditCost, creditData.organizationCredits.available)) {
          throw new Error(
            `Insufficient credits. Required: ${creditCost}, Available: ${creditData.organizationCredits.available}`
          );
        }

        // Consume credits
        creditResult = await consumeCreditsMutation.mutateAsync({
          operationCode: logDetails.operationCode,
          entityType: logDetails.entityType,
          entityId: (data._id || data.id) as string,
          operationDetails: {
            action: logDetails.action,
            entityType: logDetails.entityType,
            creditCost,
            ...logDetails.oldData ? { hasOldData: true } : {}
          }
        });

        // Update local credit balance
        updateCredits(creditResult.remaining);
      }

      // Execute the main mutation
      const result = await mainMutation(data);

      onSuccess?.(result, creditResult);
      return { result, creditResult };

    } catch (error) {
      onError?.(error as Error);
      console.error("Error during mutation with credit consumption:", error);
      throw error;
    }
  };

  return {
    mutateWithCreditConsumption,
    isConsumingCredits: consumeCreditsMutation.isPending,
    creditError: consumeCreditsMutation.error,
  };
};

export default useMutationWithCreditConsumption;

