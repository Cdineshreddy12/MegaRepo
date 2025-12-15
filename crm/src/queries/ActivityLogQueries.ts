import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEY } from "./constants";
import { activityLogService } from "@/services/api/activityLogService";

export const useActivityLogs = (selectedOrg?: string, filters?: {
    startDate?: string
    endDate?: string
    userId?: string
    entityType?: string
}) => {
    // If a specific userId is provided and it's 'me', call my-activity; otherwise admin/audit
    const isMyActivity = filters?.userId === 'me';
    return useQuery({
      queryKey: [
        QUERY_KEY.ACTIVITY,
        selectedOrg,
        isMyActivity ? 'me' : (filters?.userId || 'all'),
        filters?.startDate,
        filters?.endDate,
        filters?.entityType
      ],
      queryFn: () => isMyActivity ? activityLogService.getMyLogs(selectedOrg, {
        startDate: filters?.startDate,
        endDate: filters?.endDate,
        entityType: filters?.entityType
      }) : activityLogService.getLogs(selectedOrg, filters),
      enabled: !!selectedOrg
    });
  };
  
export const useActivityLog = (id: string) => {
  // Safety check: if id is invalid, return a safe default
  if (!id || id === '' || id === 'undefined' || id === 'null') {
    return {
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve(undefined),
    };
  }

  return useQuery({
    queryKey: [QUERY_KEY.ACTIVITY, id],
    queryFn: () => activityLogService.getLog(id),
    enabled: !!id
  })
}
export const useCreateActivityLog = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: activityLogService.createUserActivityLog,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.ACTIVITY] }); // Refresh users after creation
    },
  });
};
