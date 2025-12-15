import { Entity, EntityService, createEntityHooks } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Contact, contactService } from "@/services/api/contactService";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

// Ensure Contact type extends the Entity interface
interface ContactType extends Entity, Contact {}

// Create an adapter for the contactService that implements EntityService interface
const typedContactService: EntityService<ContactType> = {
  getAll: (selectedOrg?: string) => contactService.getContacts(selectedOrg),
  getById: (id: string) => contactService.getContact(id),
  create: (data: Omit<ContactType, 'id'>, params?: Record<string, string>) => contactService.createContact(data, params),
  update: (id: string, data: Partial<Omit<ContactType, 'id'>>, params?: Record<string, string>) => contactService.updateContact(id, data, params),
  delete: (id: string) => contactService.deleteContact(id)
};

// Create contact-specific hooks using the generic hook factory
export const {
  useEntities: useContacts,
  useEntity: useContact,
  useCreateEntity: useCreateContact,
  useUpdateEntity: useUpdateContact,
  useUpdateEntityOptimistic: useUpdateContactOptimistic,
  useDeleteEntity: useDeleteContact,
  useDeleteEntityOptimistic: useDeleteContactOptimistic,
  useSuspenseEntities: useSuspenseContacts,
  useSuspenseEntity: useSuspenseContact,
} = createEntityHooks<ContactType>(QUERY_KEY.CONTACT, typedContactService);

// Helper function to parse query params - temporarily disabled to prevent initialization issues
export const useQueryParams = () => {
  // Return empty URLSearchParams to avoid URL parsing during initialization
  return new URLSearchParams();
};

// Hook to fetch contacts for a specific account
export const useAccountContacts = (accountId: string | undefined) => {
  // Safety check: if accountId is invalid, return a safe default
  if (!accountId || accountId === '' || accountId === 'undefined' || accountId === 'null') {
    return {
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: () => Promise.resolve([]),
    };
  }

  return useQuery({
    queryKey: [QUERY_KEY.CONTACT, 'account', accountId],
    queryFn: () => contactService.getContactsByAccount(accountId || ''),
    enabled: !!accountId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

// Hook to create a contact for a specific account
export const useCreateContactForAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      contactData,
    }: {
      accountId: string;
      contactData: Omit<Contact, 'id' | 'accountId' | 'createdBy' | 'updatedAt' | 'createdAt'>;
    }) => contactService.createContactForAccount(accountId, contactData),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CONTACT] });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CONTACT, 'account', variables.accountId],
      });
    },
  });
};

// Hook to set a contact as primary for an account
export const useSetPrimaryContact = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      contactId,
      accountId,
    }: {
      contactId: string;
      accountId: string;
    }) => contactService.setPrimaryContact(contactId, accountId),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CONTACT, 'account', variables.accountId],
      });
      queryClient.invalidateQueries({
        queryKey: [QUERY_KEY.CONTACT, variables.contactId],
      });
    },
  });
};