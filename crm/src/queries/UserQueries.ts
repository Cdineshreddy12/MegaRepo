import { Entity, EntityService, createEntityHooks } from "@/services/queries/EntityService";
import { QUERY_KEY } from "./constants";
import { User, userService } from "@/services/api/userService";

// Ensure Contact type extends the Entity interface
interface UserType extends Entity, User {}

// Create an adapter for the userService that implements EntityService interface
const typedUserService: EntityService<UserType> = {
  getAll: (selectedOrg?: string) => userService.getUsers(selectedOrg),
  getById: (id: string) => userService.getUser(id),
  create: (data: Omit<UserType, 'id'>) => userService.createUser(data),
  update: (id: string, data: Partial<UserType>) => userService.updateUser(id, data),
  delete: async (id: string) => {
    await userService.deleteUser(id);
  }
}
// Create contact-specific hooks using the generic hook factory
export const {
  useEntities: useUsers,
  useEntity: useUser,
  useCreateEntity: useCreateUser,
  useUpdateEntity: useUpdateUser,
  useUpdateEntityOptimistic: useUpdateUserOptimistic,
  useDeleteEntity: useDeleteUser,
  useDeleteEntityOptimistic: useDeleteUserOptimistic
} = createEntityHooks<UserType>(QUERY_KEY.USER, typedUserService);