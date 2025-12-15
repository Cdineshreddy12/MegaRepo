/**
 * TemplateBasedForm Component
 * 
 * Automatically detects and uses form templates for CRM entities.
 * Falls back to standard form if no template is found.
 */

import { ReactNode } from "react";
import { DynamicFormRenderer } from "@/components/forms/DynamicFormRenderer";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface TemplateBasedFormProps {
  entityType: string; // "account", "lead", "contact", etc.
  templateId?: string; // Optional specific template ID to use
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  initialData?: Record<string, any>;
  submitButtonText?: string;
  showDraftButton?: boolean;
  readOnly?: boolean;
  fallbackForm?: ReactNode; // Standard form to show if no template found
  onDataMap?: (formData: Record<string, any>) => Record<string, any>; // Custom data mapping
  isEditMode?: boolean; // If true (edit mode), hide createdBy/updatedBy. They are handled in background.
}

export function TemplateBasedForm({
  entityType,
  templateId,
  onSubmit,
  initialData = {},
  submitButtonText,
  showDraftButton = false,
  readOnly = false,
  fallbackForm,
  onDataMap,
  isEditMode = false,
}: TemplateBasedFormProps) {
  // Determine if this is edit mode based on initialData
  const editMode = isEditMode || (initialData && Object.keys(initialData).length > 0);
  const { template, loading, error } = useFormTemplate(entityType, templateId);

  // Map form data using custom mapper or default mapping
  const handleSubmit = async (data: Record<string, any>) => {
    try {
      const mappedData = onDataMap ? onDataMap(data) : data;
      await onSubmit(mappedData);
    } catch (error) {
      // Error handling is done in parent component
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Error loading form template: {error}
          {fallbackForm && <div className="mt-4">{fallbackForm}</div>}
        </AlertDescription>
      </Alert>
    );
  }

  if (!template) {
    if (fallbackForm) {
      return <>{fallbackForm}</>;
    }
    return (
      <Alert>
        <AlertDescription>
          No form template found for {entityType}. Please create one in Form Builder.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DynamicFormRenderer
      templateId={template.id || template._id || ""}
      initialData={initialData}
      onSubmit={handleSubmit}
      submitButtonText={submitButtonText}
      showDraftButton={showDraftButton}
      readOnly={readOnly}
      isEditMode={editMode}
    />
  );
}

