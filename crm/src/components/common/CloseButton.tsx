import React from "react";
import IconButton from "./IconButton";
import { XIcon } from "lucide-react";
import { ENTITY } from "@/constants";
import { CONTENT, defaultFormActionLabels } from "@/constants/content";

interface CloseButtonProps {
  onClose?: () => void;
  entity: keyof typeof ENTITY;
}

const defaultLabel = defaultFormActionLabels.CLOSE;

const CloseButton: React.FC<CloseButtonProps> = ({ 
  onClose = () => {}, 
  entity,
}) => {
  // Determine the label text from CONTENT or fall back to default
  const buttonLabel = entity && CONTENT.FORM_ACTION_LABELS?.[entity]?.CLOSE || defaultLabel;
  
  // Handle click with explicit logging
  const handleClick = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <IconButton
      onClick={handleClick}
      aria-label={buttonLabel}
      icon={XIcon}
      variant="outline"
      type="button"
    >
      {buttonLabel}
    </IconButton>
  );
};

export default CloseButton;