import { useCreateActivityLog } from "@/queries/ActivityLogQueries";
import { ActivityLog } from "@/services/api/activityLogService";
import { ACTION } from "@/constants";
import { ActionType, EntityType } from "@/types/common";

function getObjectDiff<T extends Record<string, unknown>>(oldData: T, newData: T) {
  const diff: Partial<Record<keyof T, { oldValue: unknown; newValue: unknown }>> = {};

  for (const key in newData) {
    if (
      Object.prototype.hasOwnProperty.call(newData, key) &&
      JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])
    ) {
      diff[key] = {
        oldValue: oldData[key],
        newValue: newData[key],
      };
    }
  }

  return diff;
}

export type LogDetails<T> = {
  action: ActionType;
  entityType: EntityType;
  oldData?: T;
};

interface MutationProps<T, L extends LogDetails<T>> {
  mainMutation: (data: T, params?: Record<string, string>) => Promise<T>;
  logDetails: L;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

const useMutationWithActivityLog = <T extends { id?: string; _id?: string }, L extends LogDetails<T>>({
  mainMutation,
  logDetails,
  onSuccess,
  onError,
}: MutationProps<T, L>) => {
  const activityLogMutation = useCreateActivityLog();

  const mutateWithActivityLog = async (data: T, params?: Record<string, string>): Promise<{
    result: T;
    log: ActivityLog;
  }> => {
    try {
      const result = await mainMutation(data, params);

      const diff =
        logDetails.action === ACTION.MODIFY && logDetails.oldData
          ? getObjectDiff(logDetails.oldData as Record<string, unknown>, result as Record<string, unknown>)
          : undefined;

      const entityId = (result._id || result.id) as string | undefined;

      const newLogDetails: Omit<ActivityLog, 'id' | 'userId' | 'user' | 'createdAt'> = {
        action: logDetails.action,
        entityType: logDetails.entityType,
        entityId: entityId ?? '',
        details: diff ?? {},
      };

      const newLog = await activityLogMutation.mutateAsync(newLogDetails);

      onSuccess?.(result);

      return { result, log: newLog };
    } catch (error) {
      onError?.(error as Error);
      console.error("Error during mutation or activity logging:", error);
      throw error;
    }
  };

  return {
    mutateWithActivityLog,
  };
};

export default useMutationWithActivityLog;
