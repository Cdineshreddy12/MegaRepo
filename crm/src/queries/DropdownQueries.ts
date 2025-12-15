import { dropdownService } from "@/services/api/dropdownService";
import { useQueryClient, useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { QUERY_KEY } from "./constants";
import { DropdownType } from "@/types/common";

export const useCreateDropdownOption = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: dropdownService.createOption,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.DROPDOWN] });
        }
    })
}

export const useDropdowns = () => {
    return useQuery({
        queryKey: [QUERY_KEY.DROPDOWN],
        queryFn: dropdownService.getOptions,
    })
}

export const useDropdownOptionsByCategory = (category: DropdownType) => {
    return useQuery({
        queryKey: [QUERY_KEY.DROPDOWN, category],
        queryFn: () => dropdownService.getOptionsByCategory(category),
        staleTime: 1000 * 60 * 15, // 15 minutes
        enabled: !!category, // Ensure category is provided
        retry: 2, // Retry failed requests
        refetchOnWindowFocus: false, // Don't refetch on window focus to avoid unnecessary calls
    })
}

export const useSuspenseDropdownOptionsByCategory = (category: DropdownType) => {
    return useSuspenseQuery({
        queryKey: [QUERY_KEY.DROPDOWN, category],
        queryFn: () => dropdownService.getOptionsByCategory(category)
    })
}

export const useDeleteDropdownOption = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => dropdownService.deleteOption(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.DROPDOWN] });
        }
    })
}

export const useDropdownCategories = () => {
    return useQuery({
        queryKey: [QUERY_KEY.DROPDOWN_CATEGORIES],
        queryFn: dropdownService.getDropdownCategories,
        // staleTime: 1000 * 60 * 15 // 15 minutes
    })
}