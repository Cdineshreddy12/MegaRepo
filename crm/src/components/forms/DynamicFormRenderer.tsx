"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertCircle, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/useToast";
import { formService, FormTemplate, FormField, FormSection } from "@/services/api/formService";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { EntityLookupField } from "./EntityLookupField";
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries";
import { DropdownType } from "@/types/common";
import { evaluateFormula, getReferencedFields, formatFormulaWithLabels } from "@/utils/formulaEvaluator";
import { Calculator } from "lucide-react";
import Combobox from "@/components/common/form-elements/ComboBox";

// Move SysConfigFieldRenderer outside to avoid hook order issues
function SysConfigFieldRenderer({
  field,
  form,
  fieldError,
  isFieldReadOnly,
  submitting,
}: {
  field: FormField;
  form: any;
  fieldError: string | undefined;
  isFieldReadOnly: boolean;
  submitting: boolean;
}) {
  // Infer category from field name, label, or ID if not set
  const inferCategory = (fieldName: string, fieldLabel: string, fieldId: string): DropdownType => {
    const searchText = (fieldName || fieldLabel || fieldId || "").toLowerCase();
    
    if (searchText === "zone" || searchText.includes("zone")) {
      return "zones";
    }
    
    if (searchText.includes("status")) {
      if (searchText.includes("account")) return "account_status";
      if (searchText.includes("lead")) return "lead_status";
      if (searchText.includes("opportunity")) return "opportunity_status";
      if (searchText.includes("invoice")) return "invoice_status";
      if (searchText.includes("sales") || searchText.includes("order")) return "sales_order_status";
      return "account_status";
    }
    
    if (searchText.includes("source")) return "lead_sources";
    if (searchText.includes("stage")) return "opportunity_stages";
    
    if (searchText.includes("type")) {
      if (searchText.includes("contact")) return "contact_types";
      if (searchText.includes("service")) return "service_types";
      return "account_status";
    }
    
    if (searchText.includes("category")) {
      if (searchText.includes("product")) return "product_categories";
      return "account_status";
    }
    
    return "account_status";
  };

  const fieldName = (field as any).name || "";
  const fieldLabel = field.label || "";
  const fieldId = field.id || "";
  
  const category = (
    (field as any).category || 
    field.metadata?.category || 
    inferCategory(fieldName, fieldLabel, fieldId)
  ) as DropdownType;
  
  const { data, isPending, isError } = useDropdownOptionsByCategory(category);
  
  const options = isPending || isError || !data 
    ? [] 
    : Array.isArray(data)
      ? data
          .filter((option: any) => option && (option.isActive === undefined || option.isActive === true))
          .map((option: any) => ({
            value: String(option.value || option._id || option),
            label: String(option.label || option.value || option),
          }))
      : [];
  
  const fieldHtmlId = `field-${field.id}`;

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldHtmlId} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
      </Label>
      <Controller
        name={field.id}
        control={form.control}
        render={({ field: formField }) => (
          <Select
            value={formField.value !== undefined && formField.value !== null ? String(formField.value) : ""}
            onValueChange={(value) => {
              formField.onChange(value === "" ? (field.required ? undefined : "") : value);
            }}
            disabled={isFieldReadOnly || submitting || isPending}
          >
            <SelectTrigger
              className={cn(
                fieldError ? "border-red-500 focus:ring-red-500" : "",
                isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
              )}
            >
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {options.length > 0 ? (
                options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-options" disabled>
                  {isPending ? "Loading options..." : isError ? `Error loading ${category} options` : "No options available"}
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        )}
      />
      {fieldError && (
        <p id={`${fieldHtmlId}-error`} className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {String(fieldError)}
        </p>
      )}
      {field.metadata?.helpText && (
        <p className="text-sm text-gray-500">{field.metadata.helpText}</p>
      )}
    </div>
  );
}

interface DynamicFormRendererProps {
  templateId: string;
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onDraftSave?: (data: Record<string, any>) => Promise<void> | void;
  submitButtonText?: string;
  showDraftButton?: boolean;
  readOnly?: boolean;
  className?: string;
  isEditMode?: boolean; // If true (edit mode), hide createdBy/updatedBy. They are handled in background.
}

export function DynamicFormRenderer({
  templateId,
  initialData = {},
  onSubmit,
  onDraftSave,
  submitButtonText = "Submit",
  showDraftButton = false,
  readOnly = false,
  className = "",
  isEditMode = false, // Default to create mode (false)
}: DynamicFormRendererProps) {
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  // Generate Zod schema from template
  const generateSchema = useCallback((template: FormTemplate): z.ZodObject<any> => {
    const shape: Record<string, z.ZodTypeAny> = {};

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        // Skip hidden fields (createdBy/updatedBy in edit/update mode - handled in background)
        const fieldName = (field as any).name || "";
        const fieldIdLower = field.id.toLowerCase();
        const fieldLabelLower = field.label.toLowerCase();
        const fieldNameLower = fieldName.toLowerCase();
        
        if (isEditMode && (
          fieldIdLower.includes("createdby") || 
          fieldIdLower.includes("updatedby") ||
          fieldLabelLower.includes("created by") ||
          fieldLabelLower.includes("updated by") ||
          fieldNameLower.includes("createdby") ||
          fieldNameLower.includes("updatedby")
        )) {
          // Skip validation for hidden fields - make them optional
          shape[field.id] = z.any().optional();
          return;
        }

        let fieldSchema: z.ZodTypeAny = z.any();

        switch (field.type) {
          case "text":
          case "textarea":
          case "phone":
          case "url":
          case "password":
            // Start with string schema
            let textSchema: z.ZodString = z.string();
            
            // Apply validation rules
            if (field.validation?.minLength) {
              textSchema = textSchema.min(field.validation.minLength, {
                message: `${field.label} must be at least ${field.validation.minLength} characters`
              });
            }
            if (field.validation?.maxLength) {
              textSchema = textSchema.max(field.validation.maxLength, {
                message: `${field.label} must be at most ${field.validation.maxLength} characters`
              });
            }
            if (field.validation?.pattern) {
              textSchema = textSchema.regex(new RegExp(field.validation.pattern), {
                message: field.validation.customMessage || `${field.label} format is invalid`
              });
            }
            
            fieldSchema = textSchema;
            break;

          case "email":
            fieldSchema = z.string().email({ message: `${field.label} must be a valid email` });
            break;

          case "number":
            fieldSchema = z.union([
              z.number(),
              z.string().transform((val) => {
                if (val === "" || val === null || val === undefined) return undefined;
                const num = Number(val);
                return isNaN(num) ? undefined : num;
              })
            ]).refine((val) => {
              if (val === undefined || val === null) return !field.required;
              return typeof val === "number";
            }, {
              message: `${field.label} must be a valid number`
            });
            if (field.validation?.min !== undefined) {
              fieldSchema = fieldSchema.refine((val) => {
                if (val === undefined || val === null) return !field.required;
                return Number(val) >= field.validation!.min!;
              }, {
                message: `${field.label} must be at least ${field.validation.min}`
              });
            }
            if (field.validation?.max !== undefined) {
              fieldSchema = fieldSchema.refine((val) => {
                if (val === undefined || val === null) return !field.required;
                return Number(val) <= field.validation!.max!;
              }, {
                message: `${field.label} must be at most ${field.validation.max}`
              });
            }
            break;

          case "checkbox":
            fieldSchema = z.boolean().default(false);
            break;

          case "date":
          case "datetime":
            fieldSchema = z.date().nullable().optional();
            break;

          case "select":
          case "multiselect":
            // Check if multiselect: either type is "multiselect" or metadata.multiple is true
            const isMultiSelect = field.type === "multiselect" || (field.metadata as any)?.multiple || false;
            if (isMultiSelect) {
              // Multiselect: array of strings
              fieldSchema = field.required 
                ? z.array(z.string()).min(1, "At least one option must be selected")
                : z.array(z.string()).default([]).optional();
            } else if (field.options && field.options.length > 0) {
              // Single select: For required fields, use enum. For optional, allow empty string
              if (field.required) {
                fieldSchema = z.enum(field.options as [string, ...string[]], {
                  errorMap: () => ({ message: `${field.label} is required` })
                });
              } else {
                // Optional: allow empty string or one of the options
                fieldSchema = z.union([
                  z.enum(field.options as [string, ...string[]]),
                  z.literal(""),
                  z.undefined(),
                  z.null()
                ]).optional();
              }
            } else {
              fieldSchema = z.string();
            }
            break;
          case "radio":
            if (field.options && field.options.length > 0) {
              // For required fields, use enum. For optional, allow empty string
              if (field.required) {
                fieldSchema = z.enum(field.options as [string, ...string[]], {
                  errorMap: () => ({ message: `${field.label} is required` })
                });
              } else {
                // Optional: allow empty string or one of the options
                fieldSchema = z.union([
                  z.enum(field.options as [string, ...string[]]),
                  z.literal(""),
                  z.undefined(),
                  z.null()
                ]).optional();
              }
            } else {
              fieldSchema = z.string();
            }
            break;

          case "entity":
          case "user":
          case "organization":
          case "sysConfig":
            fieldSchema = z.string().nullable().optional();
            break;

          case "address":
            // Address is an object with street, city, state, zipCode, country
            fieldSchema = z.object({
              street: z.string().optional(),
              city: z.string().optional(),
              state: z.string().optional(),
              zipCode: z.string().optional(),
              country: z.string().optional(),
            }).nullable().optional();
            break;

          case "calculated":
            // Calculated fields are read-only and computed from other fields
            fieldSchema = z.union([
              z.number(),
              z.string(),
              z.null(),
              z.undefined()
            ]).optional();
            break;

          default:
            fieldSchema = z.any().optional();
        }

        // Handle required vs optional
        if (!field.required) {
          // Optional fields: allow empty string, null, undefined
          if (field.type === "number") {
            fieldSchema = fieldSchema.optional().nullable();
          } else if (field.type === "checkbox") {
            // Checkbox defaults to false, so it's always valid
            fieldSchema = fieldSchema;
          } else if (field.type === "select" || field.type === "radio") {
            // Already handled above - don't add additional optional
            fieldSchema = fieldSchema;
          } else if (field.type === "date" || field.type === "datetime") {
            // Already nullable/optional
            fieldSchema = fieldSchema;
          } else {
            // For text fields, allow empty string, null, undefined
            fieldSchema = z.union([
              fieldSchema,
              z.literal(""),
              z.null(),
              z.undefined()
            ]).optional();
          }
        } else {
          // Required fields: must have a non-empty value
          if (field.type === "select" || field.type === "radio") {
            // Enum already validates, just need to ensure not empty
            fieldSchema = fieldSchema.refine((val) => {
              return val !== "" && val !== undefined && val !== null;
            }, {
              message: `${field.label} is required`
            });
          } else if (field.type === "text" || field.type === "textarea" || field.type === "email" || field.type === "phone" || field.type === "url") {
            // For required text fields, ensure value is not empty after trimming
            // Add refine to the existing fieldSchema (which already has minLength, maxLength, pattern validations)
            fieldSchema = (fieldSchema as z.ZodString).refine((val) => {
              // For required fields, must have non-empty value after trimming
              if (val === undefined || val === null || val === "") return false;
              if (typeof val === "string" && val.trim() === "") return false;
              return true;
            }, {
              message: `${field.label} is required`
            });
          } else {
            // For other field types
            fieldSchema = fieldSchema.refine((val) => {
              if (val === undefined || val === null || val === "") return false;
              if (Array.isArray(val) && val.length === 0) return false;
              if (typeof val === "string" && val.trim() === "") return false;
              return true;
            }, {
              message: `${field.label} is required`
            });
          }
        }

        shape[field.id] = fieldSchema;
      });
    });

    return z.object(shape);
  }, [isEditMode]);

  // Load template
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        setLoading(true);
        const loadedTemplate = await formService.getTemplate(templateId);
        setTemplate(loadedTemplate);
      } catch (error: any) {
        console.error("Error loading form template:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load form template",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    if (templateId) {
      loadTemplate();
    }
  }, [templateId, toast]);

  // Generate schema memoized
  const schema = useMemo(() => {
    return template ? generateSchema(template) : z.object({});
  }, [template, generateSchema]);

  // Initialize form defaults
  const formDefaults = useMemo(() => {
    const defaults: Record<string, any> = { ...initialData };
    if (template) {
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          // Only set default if not already in initialData
          if (defaults[field.id] === undefined) {
            if (field.defaultValue !== undefined) {
              defaults[field.id] = field.defaultValue;
            } else if (field.type === "checkbox") {
              defaults[field.id] = false;
            } else if (field.type === "multiselect" || ((field.type === "select" && (field.metadata as any)?.multiple))) {
              defaults[field.id] = [];
            } else if (field.type === "calculated") {
              defaults[field.id] = null;
            } else if (field.type === "address") {
              defaults[field.id] = {
                street: "",
                city: "",
                state: "",
                zipCode: "",
                country: ""
              };
            } else {
              defaults[field.id] = "";
            }
          }
        });
      });
    }
    return defaults;
  }, [template, initialData]);

  // Initialize form - only create once
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: formDefaults,
    mode: "onBlur", // Changed from onChange to reduce validation noise
    shouldUnregister: false, // Keep all fields registered
  });

  // Log form errors for debugging
  useEffect(() => {
    const errors = form.formState.errors;
    if (Object.keys(errors).length > 0 && process.env.NODE_ENV === 'development') {
      console.error('[DynamicFormRenderer] ❌ Form validation errors:', errors);
      console.log('[DynamicFormRenderer] Current form values:', form.getValues());
      console.log('[DynamicFormRenderer] Form is valid:', form.formState.isValid);
      
      // Log each error in detail
      Object.entries(errors).forEach(([fieldId, error]: [string, any]) => {
        const field = template?.sections
          ?.flatMap(s => s.fields || [])
          .find(f => f.id === fieldId);
        console.error(`[DynamicFormRenderer] Field "${field?.label || fieldId}" error:`, error.message || error);
      });
    }
  }, [form.formState.errors, form, template]);

  // Track template ID to prevent unnecessary resets
  const lastTemplateIdRef = useRef<string | null>(null);
  
  // Update form defaults only when template ID changes (not on every render)
  useEffect(() => {
    const currentTemplateId = template?.id || null;
    if (template && currentTemplateId && currentTemplateId !== lastTemplateIdRef.current) {
      // Template changed - reset form with new defaults
      lastTemplateIdRef.current = currentTemplateId;
      form.reset(formDefaults);
    }
  }, [template?.id]); // Only depend on template ID, not formDefaults

  // Check conditional logic
  const shouldShowField = useCallback((field: FormField, formValues: Record<string, any>): boolean => {
    if (!field.conditionalLogic) return true;

    const { dependsOn, condition, value, show } = field.conditionalLogic;
    
    // If only 'show' property exists, use it directly
    if (dependsOn === undefined && condition === undefined && value === undefined && show !== undefined) {
      return show === true;
    }

    // If dependsOn is missing, default to showing
    if (!dependsOn) {
      return show !== false;
    }

    const dependentValue = formValues[dependsOn];

    if (dependentValue === undefined || dependentValue === null) {
      return condition === "isEmpty" ? show : !show;
    }

    switch (condition) {
      case "equals":
        return (dependentValue === value) === show;
      case "notEquals":
        return (dependentValue !== value) === show;
      case "contains":
        return (String(dependentValue).includes(String(value))) === show;
      case "notContains":
        return (!String(dependentValue).includes(String(value))) === show;
      case "greaterThan":
        return (Number(dependentValue) > Number(value)) === show;
      case "lessThan":
        return (Number(dependentValue) < Number(value)) === show;
      case "isEmpty":
        return (dependentValue === "" || dependentValue === null || dependentValue === undefined) === show;
      case "isNotEmpty":
        return (dependentValue !== "" && dependentValue !== null && dependentValue !== undefined) === show;
      default:
        return true;
    }
  }, []);

  const shouldShowSection = useCallback((section: FormSection, formValues: Record<string, any>): boolean => {
    if (!section.conditionalLogic) return true;
    
    // If only 'show' property exists, use it directly
    const { dependsOn, condition, value, show } = section.conditionalLogic;
    if (dependsOn === undefined && condition === undefined && value === undefined && show !== undefined) {
      return show === true;
    }
    
    return shouldShowField({ ...section.conditionalLogic, id: "", type: "text", label: "", required: false } as FormField, formValues);
  }, [shouldShowField]);

  // Handle form submission
  const handleSubmit = async (data: Record<string, any>) => {
    try {
      setSubmitting(true);
      setErrors({});

      // Get all form values (including untouched fields)
      const allFormValues = form.getValues() as Record<string, any>;
      
      // Merge with submitted data to ensure all fields are included
      const completeData: Record<string, any> = { ...allFormValues, ...data };

      // Log validation state before proceeding
      if (process.env.NODE_ENV === 'development') {
        console.log('[DynamicFormRenderer] ✅ Form validation passed! Proceeding with submission...');
        console.log('[DynamicFormRenderer] Form is valid:', form.formState.isValid);
        console.log('[DynamicFormRenderer] Form errors:', form.formState.errors);
      }

      // Debug: Log form data before submission
      if (process.env.NODE_ENV === 'development') {
        console.log('[DynamicFormRenderer] Form submission data (from handleSubmit):', data);
        console.log('[DynamicFormRenderer] All form values (from getValues):', allFormValues);
        console.log('[DynamicFormRenderer] Complete merged data:', completeData);
        console.log('[DynamicFormRenderer] All form data keys:', Object.keys(completeData));
        console.log('[DynamicFormRenderer] Zone-related keys:', Object.keys(completeData).filter(k => k.toLowerCase().includes('zone')));
        console.log('[DynamicFormRenderer] CompanyName-related keys:', Object.keys(completeData).filter(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('name')));
        console.log('[DynamicFormRenderer] Zone field values:', {
          'zone': completeData.zone,
          'field-zone': completeData['field-zone'],
          'Zone': completeData.Zone,
          'allZoneKeys': Object.keys(completeData).filter(k => k.toLowerCase().includes('zone')),
        });
        console.log('[DynamicFormRenderer] CompanyName field values:', {
          'companyName': completeData.companyName,
          'field-companyName': completeData['field-companyName'],
          'allCompanyKeys': Object.keys(completeData).filter(k => k.toLowerCase().includes('company') || k.toLowerCase().includes('name')),
        });
        console.log('[DynamicFormRenderer] Template fields:', template?.sections?.flatMap(s => s.fields?.map(f => ({ id: f.id, label: f.label, type: f.type })) || []) || []);
      }

      // Server-side validation
      if (template) {
        const validation = await formService.validateFormData(templateId, completeData);
        if (!validation.success && validation.errors.length > 0) {
          const errorMap: Record<string, string> = {};
          validation.errors.forEach((error) => {
            errorMap[error.fieldId] = error.message;
          });
          setErrors(errorMap);
          toast({
            title: "Validation Error",
            description: "Please fix the errors in the form",
            variant: "destructive"
          });
          return;
        }
      }

      await onSubmit(completeData);
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit form",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle draft save
  const handleDraftSave = async () => {
    try {
      setSavingDraft(true);
      const formData = form.getValues();
      if (onDraftSave) {
        await onDraftSave(formData);
      }
    } catch (error: any) {
      console.error("Error saving draft:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save draft",
        variant: "destructive"
      });
    } finally {
      setSavingDraft(false);
    }
  };

  // Helper function to render label based on position
  // CRITICAL: Build fieldIdToLabelMap once at component level using useMemo
  // This ensures all fields (including newly added calculated fields) are included
  // and the map is always up-to-date when template changes
  const fieldIdToLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    template?.sections?.forEach((section) => {
      section.fields?.forEach((f) => {
        const label = f.label;
        
        // Add exact field ID
        map[f.id] = label;
        
        // Add with/without field- prefix variations
        if (f.id.startsWith("field-")) {
          const withoutPrefix = f.id.replace(/^field-/, "");
          map[withoutPrefix] = label;
          
          // Handle complex IDs like field-1763874437351-ukf5g2kpt
          const parts = f.id.split('-');
          if (parts.length > 2) {
            // field-1763874437351-ukf5g2kpt -> 1763874437351-ukf5g2kpt
            const withoutFieldPrefix = parts.slice(1).join('-');
            map[withoutFieldPrefix] = label;
          }
        } else {
          map[`field-${f.id}`] = label;
          
          // Handle complex IDs without field- prefix
          if (f.id.includes('-')) {
            const parts = f.id.split('-');
            if (parts.length > 1) {
              // Add field- prefix version
              map[`field-${f.id}`] = label;
            }
          }
        }
      });
    });
    return map;
  }, [template]); // Rebuild whenever template changes

  const renderFieldLabel = useCallback((field: FormField, fieldId: string, isFieldReadOnly: boolean) => {
    const labelPosition = field.metadata?.labelPosition ?? "top";
    
    if (labelPosition === "hidden") {
      return null;
    }

    const labelContent = (
      <>
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
        {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
      </>
    );

    if (labelPosition === "left") {
      return (
        <div className="flex items-center gap-2">
          <Label htmlFor={fieldId} className="text-sm font-medium min-w-[120px]">
            {labelContent}
          </Label>
        </div>
      );
    }

    if (labelPosition === "right") {
      return (
        <div className="flex items-center justify-end gap-2">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {labelContent}
          </Label>
        </div>
      );
    }

    // Default: top
    return (
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {labelContent}
      </Label>
    );
  }, []);

  // Render field
  const renderField = useCallback((field: FormField, formValues: Record<string, any>) => {
    const fieldError = errors[field.id] || (form.formState.errors as any)[field.id]?.message;
    const fieldId = `field-${field.id}`;

    // Hide fields marked as hidden in metadata
    if ((field.metadata as any)?.hidden === true) {
      return null;
    }

    // Hide createdBy and updatedBy fields in edit/update mode (handled in background)
    // Check field name, id, and label for these fields
    const fieldName = (field as any).name || "";
    const fieldIdLower = field.id.toLowerCase();
    const fieldLabelLower = field.label.toLowerCase();
    const fieldNameLower = fieldName.toLowerCase();
    
    if (isEditMode && (
      fieldIdLower.includes("createdby") || 
      fieldIdLower.includes("updatedby") ||
      fieldLabelLower.includes("created by") ||
      fieldLabelLower.includes("updated by") ||
      fieldNameLower.includes("createdby") ||
      fieldNameLower.includes("updatedby")
    )) {
      return null;
    }

    if (!shouldShowField(field, formValues)) {
      return null;
    }

    const isFieldReadOnly = readOnly || (field as any).readOnly || (field.metadata as any)?.readOnly || false;
    const labelPosition = (field.metadata as any)?.labelPosition ?? "top";
    
    const commonProps = {
      id: fieldId,
      disabled: isFieldReadOnly || submitting,
      readOnly: isFieldReadOnly,
      "aria-describedby": fieldError ? `${fieldId}-error` : undefined,
      "aria-invalid": !!fieldError
    };

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
      case "password":
        const textFieldContent = (
          <>
            {labelPosition === "top" && renderFieldLabel(field, fieldId, isFieldReadOnly)}
            {labelPosition === "left" && (
              <div className="flex items-start gap-2">
                {renderFieldLabel(field, fieldId, isFieldReadOnly)}
                <div className="flex-1 space-y-2">
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => (
                <Input
                  {...commonProps}
                  {...formField}
                  type={field.type === "phone" ? "tel" : field.type}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  className={cn(
                    fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                    isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                  )}
                />
              )}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {field.metadata?.helpText && (
                    <p className="text-xs text-gray-500">{field.metadata.helpText}</p>
                  )}
                </div>
              </div>
            )}
            {labelPosition !== "left" && (
              <>
                <Controller
                  name={field.id}
                  control={form.control}
                  render={({ field: formField }) => (
                    <Input
                      {...commonProps}
                      {...formField}
                      type={field.type === "phone" ? "tel" : field.type}
                      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                      className={cn(
                        fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                        isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                      )}
                    />
                  )}
                />
                {fieldError && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {String(fieldError)}
                  </p>
                )}
                {field.metadata?.helpText && (
                  <p className="text-xs text-gray-500">{field.metadata.helpText}</p>
                )}
              </>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </>
        );
        return (
          <div key={field.id} className={cn("space-y-2", labelPosition === "left" && "")}>
            {textFieldContent}
          </div>
        );

      case "textarea":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
            </Label>
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => (
                <Textarea
                  {...commonProps}
                  {...formField}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  className={cn(
                    fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                    isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                  )}
                  rows={4}
                />
              )}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
            </Label>
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => (
                <Input
                  {...commonProps}
                  {...formField}
                  type="number"
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  className={cn(
                    fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                    isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                  )}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "" || value === null || value === undefined) {
                      formField.onChange(undefined);
                    } else {
                      const numValue = Number(value);
                      formField.onChange(isNaN(numValue) ? undefined : numValue);
                    }
                  }}
                />
              )}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "select":
      case "multiselect":
        // Check if multiselect: either type is "multiselect" or metadata.multiple is true
        const isMultiSelect = field.type === "multiselect" || (field.metadata as any)?.multiple || false;
        // Convert options to Combobox format
        const selectOptions = (field.options || []).map(opt => ({
          label: opt,
          value: opt,
        }));
        
        return (
          <div key={field.id} className="space-y-2">
            {renderFieldLabel(field, fieldId, isFieldReadOnly)}
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => {
                const currentValue = isMultiSelect 
                  ? (Array.isArray(formField.value) ? formField.value : (formField.value ? [String(formField.value)] : []))
                  : (Array.isArray(formField.value) ? String(formField.value[0] || "") : String(formField.value || ""));
                
                return (
                  <>
                    <Combobox
                      id={fieldId}
                      name={formField.name}
                      value={currentValue}
                      onChange={(value: string | string[]) => {
                        formField.onChange(value);
                      }}
                      options={selectOptions}
                      multi={isMultiSelect}
                      placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                      disabled={isFieldReadOnly || submitting}
                    />
                    {field.metadata?.helpText && (
                      <p className="text-xs text-gray-500 mt-1">{field.metadata.helpText}</p>
                    )}
                  </>
                );
              }}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "radio":
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
            </Label>
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => (
                <RadioGroup
                  value={formField.value || ""}
                  onValueChange={formField.onChange}
                  disabled={isFieldReadOnly || submitting}
                >
                  {field.options?.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${fieldId}-${option}`} />
                      <Label htmlFor={`${fieldId}-${option}`} className={cn(
                        "font-normal",
                        isFieldReadOnly ? "cursor-not-allowed text-gray-500" : "cursor-pointer"
                      )}>
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.id} className="space-y-2">
            <div className="flex items-center space-x-2">
              <Controller
                name={field.id}
                control={form.control}
                render={({ field: formField }) => (
                  <Checkbox
                    {...commonProps}
                    checked={formField.value || false}
                    onCheckedChange={formField.onChange}
                  />
                )}
              />
              <Label htmlFor={fieldId} className={cn(
                "text-sm font-medium",
                isFieldReadOnly ? "cursor-not-allowed text-gray-500" : "cursor-pointer"
              )}>
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
                {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
              </Label>
            </div>
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
            </Label>
            <Controller
              name={field.id}
              control={form.control}
              render={({ field: formField }) => (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formField.value && "text-muted-foreground",
                        fieldError && "border-red-500",
                        isFieldReadOnly && "bg-gray-100 cursor-not-allowed"
                      )}
                      disabled={isFieldReadOnly || submitting}
                    >
                      {formField.value ? format(formField.value, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  {!isFieldReadOnly && (
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formField.value}
                        onSelect={formField.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  )}
                </Popover>
              )}
            />
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "divider":
        return <hr key={field.id} className="my-4" />;

          case "html":
        return (
          <div
            key={field.id}
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: field.metadata?.helpText || "" }}
          />
        );

      case "entity":
      case "user":
      case "organization":
        const entityType = field.type === "entity" 
          ? (field.metadata?.entityType || "account")
          : field.type === "user" 
          ? "user"
          : "organization";
        
        return (
          <div key={field.id} className="space-y-2">
            {/* EntityLookupField renders its own label, so we don't render a separate one */}
            <EntityLookupField
              name={field.id}
              control={form.control}
              entityType={entityType as any}
              label={field.label}
              required={field.required}
              multiple={field.metadata?.multiple || false}
              placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
              error={fieldError}
              disabled={isFieldReadOnly || submitting}
            />
            {field.metadata?.helpText && (
              <p className="text-sm text-gray-500">{field.metadata.helpText}</p>
            )}
            {(field.metadata as any)?.autoPopulated && (
              <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
            )}
          </div>
        );

      case "sysConfig":
        return <SysConfigFieldRenderer key={field.id} field={field} form={form} fieldError={fieldError} isFieldReadOnly={isFieldReadOnly} submitting={submitting} />;

      case "address":
        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              {isFieldReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
            </Label>
            <div className="space-y-4 border rounded-md p-4">
              <Controller
                name={`${field.id}.street`}
                control={form.control}
                render={({ field: formField }) => (
                  <div className="space-y-1">
                    <Label htmlFor={`${fieldId}-street`} className="text-xs text-gray-600">Street Address</Label>
                    <Input
                      {...commonProps}
                      {...formField}
                      id={`${fieldId}-street`}
                      placeholder="Enter street address"
                      className={cn(
                        fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                        isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                      )}
                    />
                  </div>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name={`${field.id}.city`}
                  control={form.control}
                  render={({ field: formField }) => (
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-city`} className="text-xs text-gray-600">City</Label>
                      <Input
                        {...commonProps}
                        {...formField}
                        id={`${fieldId}-city`}
                        placeholder="Enter city"
                        className={cn(
                          fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                          isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                        )}
                      />
                    </div>
                  )}
                />
                <Controller
                  name={`${field.id}.state`}
                  control={form.control}
                  render={({ field: formField }) => (
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-state`} className="text-xs text-gray-600">State/Province</Label>
                      <Input
                        {...commonProps}
                        {...formField}
                        id={`${fieldId}-state`}
                        placeholder="Enter state"
                        className={cn(
                          fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                          isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                        )}
                      />
                    </div>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name={`${field.id}.zipCode`}
                  control={form.control}
                  render={({ field: formField }) => (
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-zipCode`} className="text-xs text-gray-600">ZIP/Postal Code</Label>
                      <Input
                        {...commonProps}
                        {...formField}
                        id={`${fieldId}-zipCode`}
                        placeholder="Enter ZIP code"
                        className={cn(
                          fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                          isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                        )}
                      />
                    </div>
                  )}
                />
                <Controller
                  name={`${field.id}.country`}
                  control={form.control}
                  render={({ field: formField }) => (
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-country`} className="text-xs text-gray-600">Country</Label>
                      <Input
                        {...commonProps}
                        {...formField}
                        id={`${fieldId}-country`}
                        placeholder="Enter country"
                        className={cn(
                          fieldError ? "border-red-500 focus-visible:ring-red-500" : "",
                          isFieldReadOnly ? "bg-gray-100 cursor-not-allowed" : ""
                        )}
                      />
                    </div>
                  )}
                />
              </div>
            </div>
            {fieldError && (
              <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {String(fieldError)}
              </p>
            )}
            {field.metadata?.helpText && (
              <p className="text-sm text-gray-500">{field.metadata.helpText}</p>
            )}
          </div>
        );

      case "calculated":
        // Calculate value based on formula
        // Use the form's current value (which is kept up-to-date by the useEffect)
        const currentFormValue = form.getValues(field.id as any);
        const calculatedValue = typeof currentFormValue === 'number' && !isNaN(currentFormValue) && isFinite(currentFormValue)
          ? currentFormValue
          : null;
        const referencedFields = (field as any).calculation?.formula 
          ? getReferencedFields((field as any).calculation.formula)
          : [];

        // Use the global fieldIdToLabelMap built at component level
        // This ensures all fields (including newly added ones) are included

        // Convert field IDs to human-readable labels, removing duplicates
        const referencedFieldLabels = Array.from(new Set(
          referencedFields
            .map((fieldId: string) => fieldIdToLabelMap[fieldId] || fieldId)
            .filter((label: string) => label) // Remove empty labels
        ));

        // Format the calculated value
        const formatCalculatedValue = (val: number | null): string => {
          if (val === null || val === undefined || isNaN(val)) return "—";
          const format = (field as any).calculation?.format || "number";
          let decimals = (field as any).calculation?.decimalPlaces ?? 2;
          
          // For very small numbers (< 0.01), automatically increase decimal places
          // to show meaningful precision instead of rounding to 0.00
          if (Math.abs(val) > 0 && Math.abs(val) < 0.01 && decimals < 6) {
            // Find the first non-zero digit after the decimal point
            const absVal = Math.abs(val);
            const log10 = Math.floor(Math.log10(absVal));
            // Add extra decimal places to show at least 2 significant digits
            decimals = Math.max(decimals, Math.abs(log10) + 2);
            // Cap at 10 decimal places to avoid extremely long numbers
            decimals = Math.min(decimals, 10);
          }
          
          switch (format) {
            case "currency":
              return new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals,
              }).format(val);
            case "percentage":
              return `${val.toFixed(decimals)}%`;
            case "number":
            default:
              // Remove trailing zeros for better readability, but keep at least 2 decimal places for small numbers
              const formatted = val.toFixed(decimals);
              // If the number is very small, don't remove trailing zeros
              if (Math.abs(val) < 0.01) {
                return formatted;
              }
              // Otherwise, remove trailing zeros
              return parseFloat(formatted).toString();
          }
        };

        return (
          <div key={field.id} className="space-y-2">
            <Label htmlFor={fieldId} className="text-sm font-medium flex items-center gap-2">
              <Calculator className="h-4 w-4 text-gray-500" />
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
              <span className="text-gray-400 ml-2 text-xs">(Calculated)</span>
            </Label>
            <Input
              {...commonProps}
              type="text"
              value={formatCalculatedValue(calculatedValue)}
              placeholder="Calculated value"
              className="bg-gray-100 cursor-not-allowed font-mono"
              readOnly
              disabled
            />
            {(field as any).calculation?.formula && (() => {
              // Format formula with human-readable labels
              const formattedFormula = formatFormulaWithLabels(
                (field as any).calculation.formula,
                fieldIdToLabelMap
              );
              
              return (
                <div className="text-xs text-gray-500 space-y-1">
                  <p className="font-mono bg-gray-50 p-2 rounded border">
                    Formula: {formattedFormula}
                  </p>
                  {referencedFieldLabels.length > 0 && (
                    <p className="text-gray-400">
                      Uses: {referencedFieldLabels.join(", ")}
                    </p>
                  )}
                </div>
              );
            })()}
            {field.metadata?.helpText && (
              <p className="text-sm text-gray-500">{field.metadata.helpText}</p>
            )}
          </div>
        );

      default:
        return (
          <div key={field.id} className="space-y-2">
            <Label className="text-sm font-medium">{field.label}</Label>
            <Alert>
              <AlertDescription>Field type "{field.type}" is not yet supported</AlertDescription>
            </Alert>
          </div>
        );
    }
  }, [form, errors, readOnly, submitting, shouldShowField, fieldIdToLabelMap]);

  // CRITICAL: All hooks must be called BEFORE any early returns
  // Track if we're currently updating calculated fields to prevent infinite loops
  const isUpdatingCalculatedFieldsRef = useRef(false);
  
  // Get all calculated field IDs and their dependencies (memoized to avoid recalculation)
  const calculatedFieldsConfig = useMemo(() => {
    if (!template) return [];
    try {
      const config: Array<{
        fieldId: string;
        formula: string;
        referencedFields: string[];
        fieldLabelToIdMap: Record<string, string>;
        fieldIdToLabelMap: Record<string, string>; // Reverse map: ID -> label
      }> = [];
      
      // Build label to ID map once for all fields (including calculated fields for reference)
      // Also build reverse map (ID -> label) for easier lookup in formula evaluator
      const globalLabelToIdMap: Record<string, string> = {};
      const globalIdToLabelMap: Record<string, string> = {}; // Reverse map for lookup
      
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.label) {
            // Add exact label
            globalLabelToIdMap[field.label] = field.id;
            
            // Add lowercase version
            const labelLower = field.label.toLowerCase();
            if (labelLower !== field.label) {
              globalLabelToIdMap[labelLower] = field.id;
            }
            
            // Add title case version (first letter uppercase, rest lowercase)
            const labelTitle = field.label.charAt(0).toUpperCase() + field.label.slice(1).toLowerCase();
            if (labelTitle !== field.label && labelTitle !== labelLower) {
              globalLabelToIdMap[labelTitle] = field.id;
            }
            
            // Add normalized label (lowercase, spaces to underscores)
            const normalizedLabel = labelLower.replace(/\s+/g, '_');
            globalLabelToIdMap[normalizedLabel] = field.id;
            
            // Build reverse map: ID -> label
            globalIdToLabelMap[field.id] = field.label;
            if (field.id.startsWith("field-")) {
              const withoutPrefix = field.id.replace(/^field-/, '');
              globalIdToLabelMap[withoutPrefix] = field.label;
            } else {
              globalIdToLabelMap[`field-${field.id}`] = field.label;
            }
            
            // IMPORTANT: Do NOT add individual words from multi-word labels
            // This causes partial matches (e.g., "profit" and "ratio" instead of "Profit Ratio")
            // The formula evaluator will handle case-insensitive matching of full labels
          }
        });
      });
      
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.type === "calculated" && (field as any).calculation?.formula) {
            const referencedFields = getReferencedFields((field as any).calculation.formula);
            const fieldConfig = {
              fieldId: field.id,
              formula: (field as any).calculation.formula,
              referencedFields,
              fieldLabelToIdMap: globalLabelToIdMap,
              fieldIdToLabelMap: globalIdToLabelMap, // Add reverse map for percentage detection
            };
            config.push(fieldConfig);
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DynamicFormRenderer] Added calculated field config:`, {
                fieldId: fieldConfig.fieldId,
                fieldLabel: field.label,
                formula: fieldConfig.formula,
                referencedFields: fieldConfig.referencedFields.length
              });
            }
          }
        });
      });
      return config;
    } catch {
      return [];
    }
  }, [template]);

  // Watch only the fields that are referenced by calculated fields (more efficient)
  // Map formula references to actual template field IDs
  const watchedFieldIds = useMemo(() => {
    if (!template) return [];
    
    const ids = new Set<string>();
    
    // Build a map of all field references to actual field IDs
    // IMPORTANT: Include ALL fields (including calculated) so calculated fields can reference other calculated fields
    const referenceToFieldId = new Map<string, string>();
    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        // Include ALL fields, not just non-calculated ones
        // Map field ID to itself
        referenceToFieldId.set(field.id, field.id);
        
        // Map variations
        if (field.id.startsWith('field-')) {
          const withoutPrefix = field.id.replace(/^field-/, '');
          referenceToFieldId.set(withoutPrefix, field.id);
          referenceToFieldId.set(field.id, field.id);
        } else {
          referenceToFieldId.set(`field-${field.id}`, field.id);
          referenceToFieldId.set(field.id, field.id);
        }
        
        // Map by label if available
        if (field.label) {
          const normalizedLabel = field.label.toLowerCase().replace(/\s+/g, '_');
          referenceToFieldId.set(normalizedLabel, field.id);
          referenceToFieldId.set(field.label, field.id);
        }
      });
    });
    
    // For each referenced field in formulas, find the actual field ID
    calculatedFieldsConfig.forEach((config) => {
      config.referencedFields.forEach((refField) => {
        const actualFieldId = referenceToFieldId.get(refField);
        if (actualFieldId) {
          ids.add(actualFieldId);
        } else {
          // Fallback: try to match directly
          // Check if refField matches any field ID
          template.sections.forEach((section) => {
            section.fields.forEach((field) => {
              if (field.id === refField || 
                  field.id === refField.replace(/^field-/, '') ||
                  field.id === `field-${refField}`) {
                ids.add(field.id);
              }
            });
          });
        }
      });
    });
    
    return Array.from(ids);
  }, [calculatedFieldsConfig, template]);

  // Watch only the referenced fields (not all fields) to reduce re-renders
  const watchedValues = watchedFieldIds.length > 0 
    ? form.watch(watchedFieldIds as any)
    : {};
  
  // Watch all form values only if we have calculated fields (for building fieldValues map)
  const allFormValues = form.watch() as Record<string, any>;

  // Recalculate calculated fields when referenced field values change
  useEffect(() => {
    // Early return inside effect to maintain hook order
    if (!template || calculatedFieldsConfig.length === 0 || isUpdatingCalculatedFieldsRef.current) {
      return;
    }
    
    try {
      isUpdatingCalculatedFieldsRef.current = true;
      
      // Build comprehensive field values map
      // This map needs to support all possible ways a field can be referenced in formulas
      const fieldValues: Record<string, any> = {};
      
      // Build a map of field IDs to their metadata for percentage detection
      const fieldMetadataMap = new Map<string, { label: string; isPercentage: boolean }>();
      
      // Helper function to detect if a field is a percentage field
      // Only fields that represent percentages (like discount, growth rate) should be normalized
      // NOT fields that are already percentages but used in multiplication (like profitability margin)
      const isPercentageField = (field: FormField): boolean => {
        const label = (field.label || '').toLowerCase();
        const fieldName = ((field as any).name || '').toLowerCase();
        
        // Check if label/name contains percentage-related keywords
        // Only normalize fields that are typically used as percentages in subtraction/addition
        // (like discount, growth rate), NOT fields used in multiplication (like margin)
        const percentageKeywords = ['discount', 'growth', 'rate', 'fee'];
        const searchText = `${label} ${fieldName}`;
        
        // Profitability margin should NOT be normalized - it's used correctly as-is in formulas
        const excludeKeywords = ['profitability', 'margin'];
        if (excludeKeywords.some(keyword => searchText.includes(keyword))) {
          return false;
        }
        
        return percentageKeywords.some(keyword => searchText.includes(keyword));
      };
      
      // First pass: build metadata map
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.type !== "calculated") {
            const isPercentage = isPercentageField(field);
            fieldMetadataMap.set(field.id, { label: field.label || '', isPercentage });
            // Also store with field- prefix variations
            if (field.id.startsWith("field-")) {
              const withoutPrefix = field.id.replace(/^field-/, '');
              fieldMetadataMap.set(withoutPrefix, { label: field.label || '', isPercentage });
            } else {
              fieldMetadataMap.set(`field-${field.id}`, { label: field.label || '', isPercentage });
            }
          }
        });
      });
      
      template.sections.forEach((section) => {
        section.fields.forEach((field) => {
          if (field.type !== "calculated") {
            // Get value from form - try both with and without field- prefix
            let val = allFormValues[field.id];
            if (val === undefined && field.id.startsWith("field-")) {
              val = allFormValues[field.id.replace(/^field-/, '')];
            } else if (val === undefined && !field.id.startsWith("field-")) {
              val = allFormValues[`field-${field.id}`];
            }
            
            // Check if this is a percentage field
            const isPercentage = isPercentageField(field);
            
            // Store the raw value (not converted to number yet) so we can detect empty fields
            // We'll convert to number only when needed for calculation
            // Store with ALL possible key variations for maximum compatibility
            // This ensures formulas can reference fields in any format
            
            // 1. Store with exact field ID (as stored in form) - store raw value
            fieldValues[field.id] = val; // Store raw value, not converted number
            
            // 2. Store with/without field- prefix (store raw value)
            if (field.id.startsWith("field-")) {
              const withoutPrefix = field.id.replace(/^field-/, '');
              fieldValues[withoutPrefix] = val; // Store raw value
              
              // 3. For complex IDs like field-1763874437351-ukf5g2kpt, also store the full ID without prefix
              // This handles cases where formula might reference just "1763874437351-ukf5g2kpt"
              // Don't split further - keep the full ID after removing "field-" prefix
            } else {
              // Field ID doesn't start with "field-", add it
              fieldValues[`field-${field.id}`] = val; // Store raw value
            }
            
            // 4. Note: Percentage normalization is handled by the formula evaluator
            // based on field labels, not here. This ensures consistent behavior.
            
            // 5. Also store with field label variations (if label exists)
            // This is handled separately via fieldLabelToIdMap in evaluateFormula
          }
        });
      });
      
      // Sort calculated fields by dependencies (topological sort)
      // Fields that depend on other calculated fields should be calculated after their dependencies
      // Build dependency graph: which calculated fields depend on which other calculated fields
      const dependencyMap = new Map<string, Set<string>>(); // fieldId -> set of fieldIds it depends on
      const fieldIdToConfigMap = new Map<string, typeof calculatedFieldsConfig[0]>();
      
      calculatedFieldsConfig.forEach(cfg => {
        fieldIdToConfigMap.set(cfg.fieldId, cfg);
        const dependencies = new Set<string>();
        
        // Check if this field's formula references any other calculated fields
        cfg.referencedFields.forEach(refField => {
          // Check if refField is a calculated field
          const isCalculatedField = calculatedFieldsConfig.some(c => 
            c.fieldId === refField || 
            c.fieldId === refField.replace(/^field-/, '') ||
            c.fieldId === `field-${refField}`
          );
          
          if (isCalculatedField) {
            // Find the actual calculated field ID
            const depField = calculatedFieldsConfig.find(c => 
              c.fieldId === refField || 
              c.fieldId === refField.replace(/^field-/, '') ||
              c.fieldId === `field-${refField}`
            );
            if (depField) {
              dependencies.add(depField.fieldId);
            }
          }
        });
        
        dependencyMap.set(cfg.fieldId, dependencies);
      });
      
      // Topological sort: calculate fields in dependency order
      const visited = new Set<string>();
      const visiting = new Set<string>();
      const sortedConfigs: typeof calculatedFieldsConfig = [];
      
      const visitField = (fieldId: string) => {
        if (visiting.has(fieldId)) {
          // Circular dependency detected, skip sorting for this field
          return;
        }
        if (visited.has(fieldId)) {
          return;
        }
        
        visiting.add(fieldId);
        const currentFieldConfig = fieldIdToConfigMap.get(fieldId);
        if (currentFieldConfig) {
          const dependencies = dependencyMap.get(fieldId) || new Set();
          dependencies.forEach(depId => {
            visitField(depId);
          });
        }
        visiting.delete(fieldId);
        visited.add(fieldId);
        
        const finalFieldConfig = fieldIdToConfigMap.get(fieldId);
        if (finalFieldConfig && !sortedConfigs.includes(finalFieldConfig)) {
          sortedConfigs.push(finalFieldConfig);
        }
      };
      
      calculatedFieldsConfig.forEach(cfg => {
        if (!visited.has(cfg.fieldId)) {
          visitField(cfg.fieldId);
        }
      });
      
      // Use sorted configs for calculation
      const configsToProcess = sortedConfigs.length > 0 ? sortedConfigs : calculatedFieldsConfig;
      
      // Calculate each calculated field in dependency order
      configsToProcess.forEach((fieldConfig) => {
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DynamicFormRenderer] Calculating field "${fieldConfig.fieldId}"`);
          console.log(`[DynamicFormRenderer] Formula: ${fieldConfig.formula}`);
          console.log(`[DynamicFormRenderer] Field values available:`, Object.keys(fieldValues));
          console.log(`[DynamicFormRenderer] Sample field values:`, 
            Object.entries(fieldValues).slice(0, 5).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
          );
        }
        
        // CRITICAL: Check if all referenced calculated fields have been successfully calculated
        // If a calculated field depends on another calculated field that returned null, 
        // we should also return null (not calculate with 0)
        const referencedFields = getReferencedFields(fieldConfig.formula);
        const calculatedFieldIds = new Set(calculatedFieldsConfig.map(cfg => cfg.fieldId));
        
        // Check if any referenced field is a calculated field that doesn't exist in fieldValues
        const hasMissingCalculatedDependency = referencedFields.some(ref => {
          // Try to find the actual field ID for this reference
          let actualFieldId = ref;
          
          // Check if it's already a field ID
          if (calculatedFieldIds.has(ref)) {
            actualFieldId = ref;
          } else {
            // Try to find it in the label-to-ID map
            actualFieldId = fieldConfig.fieldLabelToIdMap[ref] || 
                           fieldConfig.fieldLabelToIdMap[ref.toLowerCase()] ||
                           fieldConfig.fieldLabelToIdMap[ref.toLowerCase().replace(/\s+/g, '_')] ||
                           ref;
          }
          
          // Check if this is a calculated field
          if (calculatedFieldIds.has(actualFieldId)) {
            // Check all variations of this field ID in fieldValues
            const variations = [
              actualFieldId,
              actualFieldId.startsWith('field-') ? actualFieldId.replace(/^field-/, '') : `field-${actualFieldId}`,
            ];
            
            // Also check by label
            const label = fieldConfig.fieldIdToLabelMap[actualFieldId];
            if (label) {
              variations.push(label, label.toLowerCase(), label.toLowerCase().replace(/\s+/g, '_'));
            }
            
            // If NONE of the variations exist in fieldValues, this calculated field returned null
            const exists = variations.some(v => fieldValues.hasOwnProperty(v));
            if (!exists) {
              if (process.env.NODE_ENV === 'development') {
                console.log(`[DynamicFormRenderer] Field "${fieldConfig.fieldId}" depends on calculated field "${actualFieldId}" which returned null - skipping calculation`);
              }
              return true; // Missing calculated dependency
            }
          }
          
          return false;
        });
        
        let calculatedValue: number | null = null;
        
        // Only calculate if all calculated dependencies are available
        if (!hasMissingCalculatedDependency) {
          // Evaluate formula - treat empty INPUT fields as zero, but calculated fields must exist
          // This allows partial calculations when INPUT fields are empty, but prevents
          // calculations when DEPENDENT calculated fields are missing
          try {
            calculatedValue = evaluateFormula(
              fieldConfig.formula, 
              fieldValues, 
              fieldConfig.fieldLabelToIdMap,
              { 
                treatEmptyAsZero: true, // Treat empty INPUT fields as 0, but calculated fields must exist
                fieldIdToLabelMap: fieldConfig.fieldIdToLabelMap // Pass reverse map for percentage detection
              }
            ) as number | null;
          } catch (error) {
            if (process.env.NODE_ENV === 'development') {
              console.error(`[DynamicFormRenderer] Error evaluating formula for "${fieldConfig.fieldId}":`, error);
            }
            calculatedValue = null;
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log(`[DynamicFormRenderer] Skipping calculation for "${fieldConfig.fieldId}" - missing calculated dependencies`);
          }
          calculatedValue = null;
        }
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DynamicFormRenderer] Calculated value for "${fieldConfig.fieldId}":`, calculatedValue);
        }
        
        // Update form value if it changed
        // Accept very small numbers (even 0.000001) as valid results
        if (calculatedValue !== null && !isNaN(calculatedValue) && isFinite(calculatedValue)) {
          const currentValue = form.getValues(fieldConfig.fieldId as any);
          const currentNum = typeof currentValue === 'number' ? currentValue : parseFloat(String(currentValue || 0)) || 0;
          
          // Compare with tolerance for floating point numbers (use smaller tolerance for very small numbers)
          const tolerance = Math.abs(calculatedValue) < 0.01 ? 0.0000001 : 0.0001;
          if (Math.abs(currentNum - calculatedValue) > tolerance) {
            form.setValue(fieldConfig.fieldId as any, calculatedValue, { 
              shouldValidate: false, 
              shouldDirty: false, 
              shouldTouch: false,
            });
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`[DynamicFormRenderer] Updated calculated field "${fieldConfig.fieldId}": ${currentNum} -> ${calculatedValue}`);
            }
          }
          
          // CRITICAL: Add calculated field value to fieldValues map IMMEDIATELY after calculation
          // This allows dependent calculated fields to use this value
          fieldValues[fieldConfig.fieldId] = calculatedValue;
          if (fieldConfig.fieldId.startsWith('field-')) {
            const withoutPrefix = fieldConfig.fieldId.replace(/^field-/, '');
            fieldValues[withoutPrefix] = calculatedValue;
          } else {
            fieldValues[`field-${fieldConfig.fieldId}`] = calculatedValue;
          }
          
          // Also add to fieldValues using the label if available
          // CRITICAL: Store calculated values with multiple label variations for formula matching
          const fieldLabel = fieldConfig.fieldIdToLabelMap[fieldConfig.fieldId];
          if (fieldLabel) {
            // Store with exact label (case-sensitive)
            fieldValues[fieldLabel] = calculatedValue;
            // Store with lowercase label
            fieldValues[fieldLabel.toLowerCase()] = calculatedValue;
            // Store with normalized label (lowercase, spaces to underscores)
            const normalizedLabel = fieldLabel.toLowerCase().replace(/\s+/g, '_');
            fieldValues[normalizedLabel] = calculatedValue;
            // Store with label with underscores (preserve case)
            const underscoreLabel = fieldLabel.replace(/\s+/g, '_');
            fieldValues[underscoreLabel] = calculatedValue;
            // Store with label with underscores (lowercase)
            const underscoreLabelLower = fieldLabel.toLowerCase().replace(/\s+/g, '_');
            if (underscoreLabelLower !== normalizedLabel) {
              fieldValues[underscoreLabelLower] = calculatedValue;
            }
          }
        } else if (process.env.NODE_ENV === 'development') {
          console.warn(`[DynamicFormRenderer] Calculated field "${fieldConfig.fieldId}" returned invalid value:`, calculatedValue);
        }
      });
    } catch (error) {
      console.error("[DynamicFormRenderer] Error calculating field values:", error);
    } finally {
      // Use setTimeout to ensure the update completes before allowing next update
      setTimeout(() => {
        isUpdatingCalculatedFieldsRef.current = false;
      }, 0);
    }
  }, [watchedValues, template, form, calculatedFieldsConfig, allFormValues]);

  // Early returns AFTER all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!template) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Form template not found</AlertDescription>
      </Alert>
    );
  }

  // Helper function to get grid column class and inline style based on width
  // Now takes sectionColumns into account to properly distribute fields across the grid
  const getFieldWidthClass = (width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number, sectionColumns: number = 1): { className: string; style: React.CSSProperties } => {
    // Calculate col-span based on section columns for 'full' width
    // In an N-column grid: "full" means span 1 column (one field per column)
    const getColSpan = (): number => {
      if (typeof width === "number") {
        // If a number is provided, use it directly but ensure it doesn't exceed grid columns
        return Math.min(width, sectionColumns);
      }
      
      // For "full" width in an N-column grid, span 1 column (one field per column)
      // For other widths, calculate proportionally based on the actual grid columns
      switch (width) {
        case "half": 
          // Half width = span half of the grid columns (rounded up)
          return Math.max(1, Math.ceil(sectionColumns / 2));
        case "third": 
          return Math.max(1, Math.ceil(sectionColumns / 3));
        case "two-thirds": 
          return Math.max(1, Math.ceil(sectionColumns * 2 / 3));
        case "quarter": 
          return Math.max(1, Math.ceil(sectionColumns / 4));
        case "three-quarters": 
          return Math.max(1, Math.ceil(sectionColumns * 3 / 4));
        case "full":
        default:
          // Full width = 1 column in the grid (one field per column)
          return 1;
      }
    };
    
    const colSpan = getColSpan();
    
    return {
      className: `col-span-${colSpan}`,
      style: {
        gridColumn: `span ${colSpan} / span ${colSpan}`
      }
    };
  };

  // Helper function to get section grid columns and inline style
  const getSectionGridClass = (columns?: 1 | 2 | 3 | 4 | 6 | 12): { className: string; style: React.CSSProperties } => {
    const cols = columns ?? 1;
    const gridClass = (() => {
      switch (cols) {
        case 1: return "grid-cols-1";
        case 2: return "grid-cols-2";
        case 3: return "grid-cols-3";
        case 4: return "grid-cols-4";
        case 6: return "grid-cols-6";
        case 12: return "grid-cols-12";
        default: return "grid-cols-1";
      }
    })();
    
    return {
      className: gridClass,
      style: {
        gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`
      }
    };
  };

  // Helper function to get spacing class
  const getSpacingClass = (spacing?: "compact" | "normal" | "loose"): string => {
    switch (spacing) {
      case "compact":
        return "space-y-2";
      case "loose":
        return "space-y-8";
      case "normal":
      default:
        return "space-y-4";
    }
  };

  // Get header and footer
  const header = (template as any).header;
  const footer = (template as any).footer;

  // Filter and sort sections
  const visibleSections = template.sections
    .filter((section) => {
      // Hide sections marked as hidden
      if ((section as any).metadata?.hidden === true) {
        return false;
      }
      // Check conditional logic
      return shouldShowSection(section, allFormValues);
    })
    .sort((a, b) => {
      const orderA = (a as any).metadata?.order ?? 999;
      const orderB = (b as any).metadata?.order ?? 999;
      return orderA - orderB;
    });

  // Helper to render a section
  const renderSectionContent = (section: FormSection) => {
    const visibleFields = section.fields
      .filter((field) => {
        if ((field.metadata as any)?.hidden === true) return false;
        return shouldShowField(field, allFormValues);
      })
      .sort((a, b) => {
        const orderA = (a.metadata as any)?.order ?? 999;
        const orderB = (b.metadata as any)?.order ?? 999;
        return orderA - orderB;
      });

    if (visibleFields.length === 0) return null;

    const sectionColumns = (section as any).metadata?.columns ?? 1;
    const sectionSpacing = (section as any).metadata?.spacing ?? "normal";
    const sectionClassName = (section as any).metadata?.className;

    return (
      <div 
        key={section.id} 
        className={cn(
          getSpacingClass(sectionSpacing),
          sectionClassName
        )}
      >
        {section.title && (
          <div>
            <h3 className="text-lg font-semibold">{section.title}</h3>
            {section.description && <p className="text-sm text-gray-500 mt-1">{section.description}</p>}
          </div>
        )}
        {(() => {
          const gridConfig = getSectionGridClass(sectionColumns);
          return (
            <div 
              className={cn("grid gap-4", gridConfig.className)}
              style={{
                display: 'grid',
                gridTemplateColumns: gridConfig.style.gridTemplateColumns,
                gap: '1rem'
              }}
            >
              {visibleFields.map((field) => {
                const fieldElement = renderField(field, allFormValues);
                if (!fieldElement) return null;

                const fieldWidth = (field.metadata as any)?.width ?? "full";
                const fieldAlign = (field.metadata as any)?.align;
                const fieldClassName = (field.metadata as any)?.className;
                const fieldWidthConfig = getFieldWidthClass(fieldWidth, sectionColumns);

                return (
                  <div
                    key={field.id}
                    className={cn(
                      fieldWidthConfig.className,
                      fieldAlign === "center" && "text-center",
                      fieldAlign === "right" && "text-right",
                      fieldClassName
                    )}
                    style={fieldWidthConfig.style}
                  >
                    {fieldElement}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    );
  };

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("space-y-6", className)}>
      {/* Header Section */}
      {header && (header.metadata as any)?.show !== false && renderSectionContent(header)}

      {/* Regular Sections */}
      {visibleSections.map((section) => renderSectionContent(section))}

      {/* Footer Section */}
      {footer && (footer.metadata as any)?.show !== false && renderSectionContent(footer)}

      <div className="flex gap-4 pt-4">
        <Button 
          type="submit" 
          disabled={submitting || readOnly}
          onClick={async () => {
            // Log form state when submit button is clicked
            if (process.env.NODE_ENV === 'development') {
              console.log('[DynamicFormRenderer] 🔵 Submit button clicked');
              console.log('[DynamicFormRenderer] Form state:', {
                isValid: form.formState.isValid,
                errors: form.formState.errors,
                values: form.getValues(),
                isSubmitting: submitting,
                isDirty: form.formState.isDirty,
              });
              
              // Trigger validation manually to see errors
              const isValid = await form.trigger();
              console.log('[DynamicFormRenderer] Manual validation result:', isValid);
              
              if (!isValid) {
                console.error('[DynamicFormRenderer] ❌ Validation failed! Errors:', form.formState.errors);
                
                // Show toast with validation errors
                const errorMessages = Object.entries(form.formState.errors)
                  .map(([fieldId, error]: [string, any]) => {
                    const field = template?.sections
                      ?.flatMap(s => s.fields || [])
                      .find(f => f.id === fieldId);
                    return `${field?.label || fieldId}: ${error.message || 'Invalid value'}`;
                  })
                  .join(', ');
                
                toast({
                  title: "Validation Error",
                  description: `Please fix the following errors: ${errorMessages}`,
                  variant: "destructive"
                });
              } else {
                console.log('[DynamicFormRenderer] ✅ Validation passed, form will submit');
              }
            }
          }}
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            submitButtonText
          )}
        </Button>
        {showDraftButton && onDraftSave && (
          <Button type="button" variant="outline" onClick={handleDraftSave} disabled={savingDraft || readOnly}>
            {savingDraft ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Draft"
            )}
          </Button>
        )}
      </div>
    </form>
  );
}

