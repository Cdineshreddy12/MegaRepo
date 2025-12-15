import React from "react";
import IconButton from "./IconButton";
import { SaveIcon, Loader } from "lucide-react";
import { ENTITY, ACTION } from "@/constants";
import { CONTENT, defaultFormActionLabels } from "@/constants/content";
import { useFormMode } from '@/hooks/useFormMode'
import { useFormContext } from "react-hook-form";

interface SubmitButtonProps {
  onSubmit?: () => void;
  entity: keyof typeof ENTITY;
  /**
   * Optional loading override. If not provided, falls back to formState.isSubmitting.
   */
  loading?: boolean;
}

const defaultLabel = defaultFormActionLabels.SUBMIT;

const Submit: React.FC<SubmitButtonProps> = ({ onSubmit = () => {}, entity, loading }) => {
  const { formMode } = useFormMode();
  const formContext = useFormContext();
  const computedLoading = loading ?? formContext?.formState?.isSubmitting ?? false;
  const modalDetails =
    entity && formMode && Object.prototype.hasOwnProperty.call(CONTENT.FORM[entity], formMode)
      ? CONTENT.FORM[entity][formMode as keyof typeof CONTENT.FORM[typeof entity]]
      : null;

  return (
    <IconButton
      type="submit"
      onClick={onSubmit}
      aria-label={defaultLabel}
      className="capitalize"
      icon={computedLoading ? () => <Loader className="animate-spin"/> : SaveIcon}
      disabled={formMode === ACTION.VIEW || computedLoading}
      loading={computedLoading}
    >
      {(formMode === ACTION.VIEW ? `View ${entity?.toLowerCase()}` : modalDetails?.title || defaultLabel)}
    </IconButton>
  );
};

export default Submit;