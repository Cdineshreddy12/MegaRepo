import { Entity, EntityService, createEntityHooks } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { Account, accountService } from "@/services/api/accountService";

// Ensure Account type extends the Entity interface
interface AccountType extends Entity, Account {}

// Create an adapter for the accountService that implements EntityService interface
const typedAccountService: EntityService<AccountType> = {
  getAll: (selectedOrg?: string) => accountService.getAccounts(selectedOrg),
  getById: (id: string) => accountService.getAccount(id),
  create: (data: Omit<AccountType, 'id'>, params?: Record<string, string>) => accountService.createAccount(data, params),
  update: (id: string, data: Partial<Omit<AccountType, 'id'>>, params?: Record<string, string>) => accountService.updateAccount(id, data, params),
  delete: (id: string) => accountService.deleteAccount(id)
};

// Create account-specific hooks using the generic hook factory
export const {
  useEntities: useAccounts,
  useEntity: useAccount,
  useCreateEntity: useCreateAccount,
  useUpdateEntity: useUpdateAccount,
  useUpdateEntityOptimistic: useUpdateAccountOptimistic,
  useDeleteEntity: useDeleteAccount,
  useDeleteEntityOptimistic: useDeleteAccountOptimistic,
  useSuspenseEntity: useSuspenseAccount,
  useSuspenseEntities: useSuspenseAccounts,
} = createEntityHooks<AccountType>(QUERY_KEY.ACCOUNT, typedAccountService);