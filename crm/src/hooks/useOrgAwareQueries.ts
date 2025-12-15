import { useEffect } from 'react';
import { useSelectedOrg } from '@/store/org-store';
import { useAccounts } from '@/queries/AccountQueries';
import { useContacts } from '@/queries/ContactQueries';
import { useLeads } from '@/queries/LeadQueries';
import { useOpportunities } from '@/queries/OpportunityQueries';
import { useTickets } from '@/queries/TicketQueries';
import { useActivityLogs } from '@/queries/ActivityLogQueries';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Custom hooks that automatically include the selected org in API calls
 * These replace the standard query hooks and handle org filtering automatically
 */

// Accounts with org filtering (always enabled; interceptor adds entityId)
export const useOrgAccounts = () => {
  const selectedOrg = useSelectedOrg();
  return useAccounts(selectedOrg || undefined, { enabled: true });
};

// Contacts with org filtering
export const useOrgContacts = () => {
  const selectedOrg = useSelectedOrg();
  // Enable query - API interceptor will handle entityId even if selectedOrg is null
  // But we should still enable it to fetch contacts
  const result = useContacts(selectedOrg || undefined, { 
    enabled: true, // Always enabled - API interceptor handles org filtering
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
  
  // Debug logging
  console.log('🔍 useOrgContacts Debug:', {
    selectedOrg,
    enabled: true,
    isPending: result.isPending,
    isError: result.isError,
    hasData: !!result.data,
    dataLength: result.data?.length || 0,
    dataSample: result.data?.[0] ? Object.keys(result.data[0]) : null,
  });
  
  return result;
};

// Leads with org filtering
export const useOrgLeads = () => {
  const selectedOrg = useSelectedOrg();
  return useLeads(selectedOrg, { enabled: !!selectedOrg });
};

// Opportunities with org filtering
export const useOrgOpportunities = () => {
  const selectedOrg = useSelectedOrg();
  return useOpportunities(selectedOrg, { enabled: !!selectedOrg });
};

// Tickets with org filtering
export const useOrgTickets = () => {
  const selectedOrg = useSelectedOrg();
  return useTickets(selectedOrg, { enabled: !!selectedOrg });
};

// Activity logs with org filtering
export const useOrgActivityLogs = (filters?: {
  startDate?: string
  endDate?: string
  userId?: string
  entityType?: string
}) => {
  const selectedOrg = useSelectedOrg();
  return useActivityLogs(selectedOrg, filters);
};

/**
 * Hook to automatically refresh all data when organization changes
 * This should be used in the main app component to ensure data refreshes
 */
export const useOrgChangeRefresher = () => {
  const selectedOrg = useSelectedOrg();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (selectedOrg) {
      console.log('🔄 Organization changed to:', selectedOrg, '- refreshing all data');

      // Invalidate all entity queries to force fresh data from new organization
      queryClient.invalidateQueries({
        predicate: (query) => {
          // Invalidate queries that contain organization-dependent data
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && (
            queryKey.includes('contacts') ||
            queryKey.includes('accounts') ||
            queryKey.includes('leads') ||
            queryKey.includes('opportunities') ||
            queryKey.includes('tickets') ||
            queryKey.includes('quotations') ||
            queryKey.includes('sales-orders') ||
            queryKey.includes('invoices') ||
            queryKey.includes('activity')
          );
        }
      });
    }
  }, [selectedOrg, queryClient]);
};

/**
 * Example usage in components:
 *
 * import { useOrgAccounts, useOrgContacts, useOrgChangeRefresher } from '@/hooks/useOrgAwareQueries';
 *
 * function MyComponent() {
 *   // Add this to any component that needs data refresh on org change
 *   useOrgChangeRefresher();
 *
 *   const { data: accounts, isLoading } = useOrgAccounts();
 *   const { data: contacts, isLoading: contactsLoading } = useOrgContacts();
 *
 *   // These will automatically filter by the currently selected org
 *   // No need to manually pass selectedOrg parameter
 * }
 */
