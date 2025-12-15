import React, { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useRef } from "react";
import { ActionType, EntityType } from "@/types/common";
import { CONTENT } from "@/constants/content";
import { useLocation, useParams } from 'react-router-dom';
import { useFormMode } from '@/hooks/useFormMode'

interface ModalProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
  onClose?: () => void
}

interface FormModalProps {
  entity: EntityType;
  type?: "bulk" | "default";
  children: React.ReactNode;
  maxWidth?: string;
  onClose?: () => void
}
export interface ModalHandles {
  open: () => void;
  close: () => void;
}

const Modal = forwardRef<ModalHandles, ModalProps>(
  ({ title, description, children, maxWidth = "max-w-6xl", onClose = () => {} }, ref) => {
    const [isOpen, setIsOpen] = useState(false);

    // Expose the open and close methods to the parent
    useImperativeHandle(ref, () => ({
      open: () => {
        if (!isOpen) {
          setIsOpen(true);
        }
      },
      close: () => {
        setIsOpen(false)
         onClose?.()
      },
    }));

    return (
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsOpen(false);
            onClose?.()
          }
        }}
      >
        <DialogContent
          className={cn(
            "max-w-6xl max-h-svh lg:max-h-[90vh] overflow-auto",
            maxWidth
          )}
        >
          <DialogHeader>
            <DialogTitle className="capitalize">{title}</DialogTitle>
            <DialogDescription className="first-letter:capitalize">{description}</DialogDescription>
          </DialogHeader>
          {children}
        </DialogContent>
      </Dialog>
    );
  }
);

Modal.displayName = "Modal";

export default Modal;

export const FormModal = forwardRef<ModalHandles, FormModalProps>(
  (
    { entity, type = "default", children, maxWidth = "max-w-6xl", onClose },
    ref
  ) => {
    const { formMode } = useFormMode()
    
    const action = formMode as ActionType

    const modalDetails = entity && formMode ? CONTENT?.FORM?.[entity]?.[action] : null;
    const modalTitle =
      type === "bulk" ? modalDetails?.titleBulk : modalDetails?.title;
    const modalDescription = type === "bulk" ? "" : modalDetails?.description;

    return (
      <Modal
        ref={ref}
        maxWidth={maxWidth}
        title={modalTitle}
        description={modalDescription}
        onClose={onClose}
      >
        {children}
      </Modal>
    );
  }
);

Modal.displayName = "Modal";
// Custom hook to manage modal states
export const useModal = () => {
  const modalRef = useRef<ModalHandles>(null);
  const open = () => modalRef.current?.open();
  const close = () => modalRef.current?.close();

  const location = useLocation();
  const params = useParams();

  const checkAndOpenModal = useCallback((editRouteSuffix = ['/edit', '/view', '/new']) => {
    if (editRouteSuffix.some(suffix => location.pathname.includes(suffix))) {
      open();
    }
  }, [location.pathname]);

  return { modalRef, open, close, params, checkAndOpenModal };
};
