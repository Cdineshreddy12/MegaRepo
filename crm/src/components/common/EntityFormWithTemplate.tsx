/**
 * EntityFormWithTemplate Component
 * 
 * Automatically uses form templates if available, otherwise falls back to standard form.
 * This component integrates seamlessly into existing form pages.
 */

import React, { useState, useEffect } from "react";
import { TemplateBasedForm } from "./TemplateBasedForm";
import { useFormTemplate } from "@/hooks/useFormTemplate";
import { mapFormDataToEntity, mapEntityToFormData } from "@/utils/formDataMapper";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, Settings, Loader2 } from "lucide-react";

interface EntityFormWithTemplateProps {
  entityType: string; // "account", "lead", "contact", etc.
  entityData?: Record<string, any>; // For edit mode
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  standardForm: React.ReactNode; // The existing standard form component
  submitButtonText?: string;
  showTemplateToggle?: boolean; // Show toggle to switch between template and standard
  autoUseTemplate?: boolean; // Automatically use template if available (default: true)
  isEditMode?: boolean; // If true (edit mode), hide createdBy/updatedBy. They are handled in background.
}

export function EntityFormWithTemplate({
  entityType,
  entityData,
  onSubmit,
  standardForm,
  submitButtonText,
  showTemplateToggle = false,
  autoUseTemplate = true,
  isEditMode = false,
}: EntityFormWithTemplateProps) {
  const { template, loading } = useFormTemplate(entityType);
  const [useTemplate, setUseTemplate] = useState(autoUseTemplate);

  // Auto-switch to template if available and autoUseTemplate is true
  useEffect(() => {
    if (autoUseTemplate && template && !showTemplateToggle) {
      setUseTemplate(true);
    }
  }, [template, autoUseTemplate, showTemplateToggle]);


  // Map entity data to form field IDs for edit mode
  const initialData = entityData ? mapEntityToFormData(entityType, entityData) : {};
  
  // Determine edit mode: if entityData exists or explicitly set
  const editMode = isEditMode || !!entityData;

    // Map form data back to entity structure
    const handleTemplateSubmit = async (formData: Record<string, any>) => {
      // Debug: Log form data before mapping
      if (process.env.NODE_ENV === 'development') {
        console.log('[EntityFormWithTemplate] Form data received:', formData);
        console.log('[EntityFormWithTemplate] All keys:', Object.keys(formData));
        console.log('[EntityFormWithTemplate] Zone-related keys:', Object.keys(formData).filter(k => k.toLowerCase().includes('zone')));
        console.log('[EntityFormWithTemplate] Zone values:', {
          'zone': formData.zone,
          'field-zone': formData['field-zone'],
          'Zone': formData.Zone,
        });
        console.log('[EntityFormWithTemplate] Template:', template);
      }
      
      // Find zone field ID from template if it exists
      let zoneFieldId: string | null = null;
      let zoneValue: any = null;
      
      if (template && template.sections) {
        for (const section of template.sections) {
          if (section.fields && Array.isArray(section.fields)) {
            for (const field of section.fields) {
              const fieldLabel = (field.label || '').toLowerCase();
              const fieldCategory = (field.metadata?.category || field.category || '').toLowerCase();
              // Check if this is a zone field by label or category
              if (fieldLabel === 'zone' || fieldCategory === 'zones') {
                zoneFieldId = field.id;
                zoneValue = formData[zoneFieldId];
                if (process.env.NODE_ENV === 'development') {
                  console.log('[EntityFormWithTemplate] Found zone field in template:', { 
                    fieldId: zoneFieldId, 
                    label: field.label,
                    category: fieldCategory,
                    value: zoneValue,
                    valueType: typeof zoneValue,
                    valueExists: zoneValue !== undefined && zoneValue !== null && zoneValue !== ''
                  });
                }
                break;
              }
            }
            if (zoneFieldId) break;
          }
        }
      }
      
      // If zone field found in template, ensure it's included in formData
      if (zoneFieldId && zoneValue !== undefined && zoneValue !== null && zoneValue !== '') {
        formData.zone = zoneValue;
        if (process.env.NODE_ENV === 'development') {
          console.log('[EntityFormWithTemplate] Mapped zone field ID to zone:', { zoneFieldId, value: zoneValue });
        }
      } else if (zoneFieldId && process.env.NODE_ENV === 'development') {
        console.warn('[EntityFormWithTemplate] Zone field found but value is empty:', { 
          zoneFieldId, 
          value: zoneValue,
          formDataKeys: Object.keys(formData),
          zoneFieldInFormData: zoneFieldId in formData
        });
      }
      
      const entityData = mapFormDataToEntity(entityType, formData, template);
      
      // Ensure zone is included if it exists in formData (final fallback)
      if (!entityData.zone && entityType.toLowerCase() === 'account') {
        // Try zoneFieldId first
        if (zoneFieldId && formData[zoneFieldId]) {
          entityData.zone = formData[zoneFieldId];
          if (process.env.NODE_ENV === 'development') {
            console.log('[EntityFormWithTemplate] Added zone from zoneFieldId:', { zoneFieldId, value: formData[zoneFieldId] });
          }
        } else {
          // Fallback: search all keys
          const zoneKeys = Object.keys(formData).filter(k => k.toLowerCase().includes('zone'));
          for (const key of zoneKeys) {
            const zoneValue = formData[key];
            if (zoneValue !== undefined && zoneValue !== null && zoneValue !== '') {
              entityData.zone = zoneValue;
              if (process.env.NODE_ENV === 'development') {
                console.log('[EntityFormWithTemplate] Added zone from formData:', { key, value: zoneValue });
              }
              break;
            }
          }
        }
      }
      
      // Store the template ID with the entity (if a template was used)
      if (template) {
        const templateId = template.id || template._id;
        if (templateId) {
          entityData.formTemplateId = templateId;
        }
      }
      
      // Debug: Log mapped entity data
      if (process.env.NODE_ENV === 'development') {
        console.log('[EntityFormWithTemplate] Mapped entity data:', entityData);
        console.log('[EntityFormWithTemplate] Zone in mapped data:', entityData.zone);
        console.log('[EntityFormWithTemplate] Zone exists:', 'zone' in entityData);
        console.log('[EntityFormWithTemplate] Form template ID:', entityData.formTemplateId);
        console.log('[EntityFormWithTemplate] CompanyName:', entityData.companyName);
        console.log('[EntityFormWithTemplate] CompanyName exists:', 'companyName' in entityData);
        console.log('[EntityFormWithTemplate] All mapped keys:', Object.keys(entityData));
      }
      
      // Validate required fields before submission
      if (entityType.toLowerCase() === 'account' && (!entityData.companyName || entityData.companyName.trim() === '')) {
        console.error('[EntityFormWithTemplate] Missing required field: companyName');
        console.error('[EntityFormWithTemplate] Form data keys:', Object.keys(formData));
        console.error('[EntityFormWithTemplate] Template fields:', template?.sections?.flatMap(s => s.fields?.map(f => ({ id: f.id, label: f.label, type: f.type })) || []) || []);
        throw new Error('Company Name is required. Please ensure your form template includes a field for Company Name.');
      }
      
      await onSubmit(entityData);
    };

  // Wait for template to load before deciding which form to render
  // This prevents flickering between standard and template forms
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // If no template and not showing toggle, just use standard form
  if (!template && !showTemplateToggle) {
    return <>{standardForm}</>;
  }

  // If showing toggle, allow switching between template and standard
  if (showTemplateToggle) {
    return (
      <div className="space-y-4">
        <Tabs value={useTemplate && template ? "template" : "standard"} onValueChange={(val) => setUseTemplate(val === "template")}>
          <TabsList>
            <TabsTrigger value="standard" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Standard Form
            </TabsTrigger>
            {template && (
              <TabsTrigger value="template" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Template Form
              </TabsTrigger>
            )}
          </TabsList>
          <TabsContent value="standard">{standardForm}</TabsContent>
          {template && (
            <TabsContent value="template">
              <TemplateBasedForm
                entityType={entityType}
                onSubmit={handleTemplateSubmit}
                initialData={initialData}
                submitButtonText={submitButtonText}
                fallbackForm={standardForm}
                isEditMode={editMode}
              />
            </TabsContent>
          )}
        </Tabs>
      </div>
    );
  }

  // Auto-use template if available
  if (template && useTemplate) {
    return (
      <TemplateBasedForm
        entityType={entityType}
        onSubmit={handleTemplateSubmit}
        initialData={initialData}
        submitButtonText={submitButtonText}
        fallbackForm={standardForm}
        isEditMode={editMode}
      />
    );
  }

  // Fallback to standard form
  return <>{standardForm}</>;
}

