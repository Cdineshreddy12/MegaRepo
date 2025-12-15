import { useParams } from "react-router-dom";
import { AxiosError } from "axios";

import CloseButton from "@/components/common/CloseButton";
import {
  ReusableForm,
  FormActions,
} from "@/components/common/form-elements";
import SubmitButton from "@/components/common/SubmitButton";

import { ACTION, ENTITY } from "@/constants";

import { FormCallbacks } from "@/types/common";

import { defaultValues } from "../testData";
import UserFormSchema, { UserFormValues } from "../zodSchema";

import useFormMode from "@/hooks/useFormMode";
import useMutationWithActivityLog from "@/hooks/useMutationWithActivityLog";
import { toast } from "@/hooks/useToast";

import {
  useCreateUser,
  useUser,
  useUpdateUserOptimistic,
} from "@/queries/UserQueries";
import UserFormFields from "./UserFormFields";

function UserForm({ onSuccess, onClose }: FormCallbacks) {
  const { userId } = useParams();
  const { formMode, isEditAction } = useFormMode();
  
  // Safety check: if userId is invalid and we're in edit mode, show loading
  if (userId && (userId === '' || userId === 'undefined' || userId === 'null')) {
    return <Loader />;
  }

  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUserOptimistic();

  const { data: user, isLoading } = useUser(userId);

  const prefillUser = isLoading || formMode === ACTION.CREATE ? {} : user;

  const titleMode = isEditAction ? "Update" : "Create";

  const logDetails = {
    action: isEditAction ? ACTION.MODIFY : ACTION.CREATE,
    entityType: ENTITY.USER,
  };

  const { mutateWithActivityLog } = useMutationWithActivityLog({
    mainMutation: async (data: UserFormValues) => {
      if (isEditAction) {
        return updateUserMutation.mutateAsync({
          id: user?.id, // Replace '_id' with 'id' or the correct property from UserType
          ...data,
          email: data?.email?.toLowerCase(),
          createdBy: user?.createdBy || "system", // Ensure 'createdBy' is included
        });
      }
      return createUserMutation.mutateAsync({
        data: {
          ...data,
          email: data?.email?.toLowerCase(),
          lastName: data.lastName || "", // Ensure lastName is always a string
          createdBy: "system", // Replace "system" with the appropriate value
        },
        params: {} // Users don't use org-based filtering
      });
    },
    logDetails,
    onSuccess: () => {
      toast({
        title: `${titleMode} User`,
        description: `User has been ${titleMode}d successfully`,
      });
      onSuccess();
    },
    onError: (err: unknown) => {
      console.log(err);
      const errorMessage =
        (err as AxiosError)?.response?.data?.message ||
        (err as Error)?.message ||
        `Failed to ${titleMode} user`;

      toast({
        title: `${titleMode} User`,
        description: errorMessage,
        variant: "destructive"
      });
    },
  });

  const createUser = async (formValues: UserFormValues) => {
    try {
      await mutateWithActivityLog(formValues);
    } catch (error) {
      console.error("Error in mutation:", error);
      throw error;
    }
  };

  return (
    <ReusableForm
      zodSchema={UserFormSchema}
      defaultValues={defaultValues}
      prefillData={prefillUser}
      onSubmit={createUser}
      renderActions={(form) => (
        <FormActions>
          <CloseButton onClose={onClose} entity={ENTITY.USER} />
          <SubmitButton
            entity={ENTITY.USER}
            loading={isLoading || form.formState.isSubmitting}
          />
        </FormActions>
      )}
    >
      <UserFormFields />
    </ReusableForm>
  );
}

export default UserForm;