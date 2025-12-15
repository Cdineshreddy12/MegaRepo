"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { FormTemplate, FormField } from "./form-builder"
import { CalendarIcon, AlertCircle, CheckCircle } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useDropdownOptionsByCategory } from "@/queries/DropdownQueries"
import { EntityLookupField } from "@/components/forms/EntityLookupField"
import { useForm } from "react-hook-form"
import { evaluateFormula, getReferencedFields, formatFormulaWithLabels, convertFieldIdsToLabels } from "@/utils/formulaEvaluator"
import { useMemo } from "react"
import { Calculator } from "lucide-react"
import Combobox from "@/components/common/form-elements/ComboBox"
import { cn } from "@/lib/utils"

// Standalone SysConfig field component for preview (doesn't require react-hook-form)
function SysConfigFieldPreview({
  field,
  fieldId,
  value,
  error,
  isSubmitting,
  onValueChange,
}: {
  field: FormField
  fieldId: string
  value: any
  error?: string
  isSubmitting: boolean
  onValueChange: (value: string) => void
}) {
  // Infer category from field name or ID if not set
  // Note: Categories must match database category names exactly (often plural)
  const inferCategory = (fieldName: string): string => {
    const lowerName = fieldName.toLowerCase();
    
    // Zone mapping - database uses "zones" (plural)
    if (lowerName.includes("zone")) return "zones";
    
    // Status mappings
    if (lowerName.includes("status")) {
      if (lowerName.includes("account")) return "account_status";
      if (lowerName.includes("lead")) return "lead_status";
      if (lowerName.includes("opportunity")) return "opportunity_status";
      if (lowerName.includes("invoice")) return "invoice_status";
      if (lowerName.includes("sales") || lowerName.includes("order")) return "sales_order_status";
      return "account_status"; // Default fallback
    }
    
    // Source mapping - database uses "lead_sources" (plural)
    if (lowerName.includes("source")) return "lead_sources";
    
    // Stage mapping - database uses "opportunity_stages" (plural)
    if (lowerName.includes("stage")) return "opportunity_stages";
    
    // Type mappings - database uses plural forms
    if (lowerName.includes("type")) {
      if (lowerName.includes("contact")) return "contact_types";
      if (lowerName.includes("service")) return "service_types";
      return "account_type";
    }
    
    return "account_status"; // Default fallback
  };

  // Check both field.category (backward compatibility) and field.metadata?.category
  // If neither exists, infer from field name/id
  const category = (
    field.category || 
    (field as any).metadata?.category || 
    inferCategory(field.id || field.label || "")
  )
  const { data, isPending, isError } = useDropdownOptionsByCategory(category)
  const options = isPending || isError || !data ? [] : data.map((option) => ({
    value: option.value,
    label: option.label,
  }))

  return (
    <div className="space-y-2">
      <Label htmlFor={fieldId} className="text-sm font-medium">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Select
        value={value || ""}
        onValueChange={onValueChange}
        disabled={isSubmitting || isPending}
        aria-describedby={error ? `${fieldId}-error` : undefined}
      >
        <SelectTrigger className={error ? "border-red-500 focus:ring-red-500" : ""}>
          <SelectValue placeholder={field.placeholder || "Select an option"} />
        </SelectTrigger>
        <SelectContent>
          {options.length > 0 ? (
            options
              .filter((option) => option.value && option.value !== "" && option.value !== null && option.value !== undefined)
              .map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))
          ) : (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              {isPending ? "Loading options..." : "No options available"}
            </div>
          )}
        </SelectContent>
      </Select>
      {error && (
        <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  )
}

interface FormPreviewProps {
  template: FormTemplate
  onSubmit: (data: Record<string, any>) => void
}

export function FormPreview({ template, onSubmit }: FormPreviewProps) {
  // Debug: Log template changes
  useEffect(() => {
    console.log('📊 [Grid System Preview] Template received in FormPreview:', {
      templateId: template.id,
      templateName: template.name,
      sectionsCount: template.sections.length,
      sections: template.sections.map(s => ({
        id: s.id,
        title: s.title,
        columns: s.metadata?.columns,
        columnsType: typeof s.metadata?.columns,
        metadata: s.metadata
      })),
      header: (template as any).header ? {
        id: (template as any).header.id,
        columns: (template as any).header.metadata?.columns,
        columnsType: typeof (template as any).header.metadata?.columns
      } : null,
      footer: (template as any).footer ? {
        id: (template as any).footer.id,
        columns: (template as any).footer.metadata?.columns,
        columnsType: typeof (template as any).footer.metadata?.columns
      } : null
    });
  }, [template]);
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [debugMode, setDebugMode] = useState(false)

  // Memoize calculated fields configuration for performance
  const calculatedFieldsConfig = useMemo(() => {
    const config: Array<{ fieldId: string; formula: string; referencedFields: string[] }> = []
    
    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.type === "calculated" && field.calculation?.formula) {
          config.push({
            fieldId: field.id,
            formula: field.calculation.formula,
            referencedFields: getReferencedFields(field.calculation.formula)
          })
        }
      })
    })
    
    return config
  }, [template])

  // Calculate all calculated fields based on current form data
  // Optimized to only recalculate when referenced fields change
  const calculateFields = useCallback((data: Record<string, any>) => {
    const calculatedData = { ...data }
    
    calculatedFieldsConfig.forEach((config) => {
      const result = evaluateFormula(config.formula, calculatedData, undefined, { treatEmptyAsZero: false, fieldIdToLabelMap: undefined })
      if (result !== null) {
        calculatedData[config.fieldId] = result
      }
    })
    
    return calculatedData
  }, [calculatedFieldsConfig])

  // Initialize form data when template changes
  useEffect(() => {
    const initialData: Record<string, any> = {}
    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        // Set default values based on field type
        switch (field.type) {
          case "checkbox":
            initialData[field.id] = false
            break
          case "radio":
            initialData[field.id] = ""
            break
          case "select":
            // Check if multiselect
            const isMultiSelect = field.type === "multiselect" || (field.metadata as any)?.multiple || false;
            initialData[field.id] = isMultiSelect ? [] : ""
            break
          case "multiselect":
            initialData[field.id] = []
            break
          case "number":
            initialData[field.id] = ""
            break
          case "calculated":
            // Calculated fields will be computed after all fields are initialized
            initialData[field.id] = null
            break
          case "address":
            initialData[field.id] = {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: ""
            }
            break
          default:
            initialData[field.id] = ""
        }
      })
    })
    // Calculate initial values for calculated fields
    const calculatedData = calculateFields(initialData)
    setFormData(calculatedData)
    setErrors({})
  }, [template, calculateFields])

  // Track which fields need recalculation
  const fieldsToRecalculate = useMemo(() => {
    const fieldMap = new Map<string, Set<string>>() // fieldId -> set of calculated field IDs that depend on it
    
    calculatedFieldsConfig.forEach((config) => {
      config.referencedFields.forEach((refField) => {
        if (!fieldMap.has(refField)) {
          fieldMap.set(refField, new Set())
        }
        fieldMap.get(refField)!.add(config.fieldId)
      })
    })
    
    return fieldMap
  }, [calculatedFieldsConfig])

  const updateFormData = useCallback(
    (fieldId: string, value: any) => {
      setFormData((prev) => {
        const newData = { ...prev, [fieldId]: value }
        
        // Only recalculate fields that depend on this field (performance optimization)
        const affectedCalculatedFields = fieldsToRecalculate.get(fieldId) || new Set()
        
        if (affectedCalculatedFields.size > 0 || calculatedFieldsConfig.length > 0) {
          // Recalculate all calculated fields (they might depend on each other)
          const recalculatedData = calculateFields(newData)
          console.log(`Field ${fieldId} updated:`, value, "Recalculated fields:", Array.from(affectedCalculatedFields))
          return recalculatedData
        }
        
        console.log(`Field ${fieldId} updated:`, value)
        return newData
      })

      // Clear error when field is updated
      if (errors[fieldId]) {
        setErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[fieldId]
          return newErrors
        })
      }
    },
    [errors, calculateFields, fieldsToRecalculate, calculatedFieldsConfig],
  )
  
  // Format calculated value based on format settings
  const formatCalculatedValue = useCallback((value: number | null, field: FormField): string => {
    if (value === null || isNaN(value)) {
      return "—"
    }
    
    const decimalPlaces = field.calculation?.decimalPlaces ?? 2
    const format = field.calculation?.format || "number"
    
    switch (format) {
      case "currency":
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
        }).format(value)
      case "percentage":
        return `${(value * 100).toFixed(decimalPlaces)}%`
      case "number":
      default:
        return value.toFixed(decimalPlaces)
    }
  }, [])

  const validateField = useCallback((field: FormField, value: any): string | null => {
    // Required field validation
    if (field.required) {
      if (value === undefined || value === null || value === "") {
        return `${field.label} is required`
      }
      if (typeof value === "string" && !value.trim()) {
        return `${field.label} is required`
      }
      if (field.type === "checkbox" && !value) {
        return `${field.label} must be checked`
      }
    }

    // Skip further validation if field is empty and not required
    if (!value || (typeof value === "string" && !value.trim())) {
      return null
    }

    // Type-specific validation
    switch (field.type) {
      case "email":
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          return "Please enter a valid email address"
        }
        break

      case "phone":
        const phoneRegex = /^[+]?[1-9][\d]{0,15}$/
        if (!phoneRegex.test(value.replace(/[\s\-$$$$]/g, ""))) {
          return "Please enter a valid phone number"
        }
        break

      case "number":
        const numValue = Number.parseFloat(value)
        if (isNaN(numValue)) {
          return "Please enter a valid number"
        }
        if (field.validation?.min !== undefined && numValue < field.validation.min) {
          return `Minimum value is ${field.validation.min}`
        }
        if (field.validation?.max !== undefined && numValue > field.validation.max) {
          return `Maximum value is ${field.validation.max}`
        }
        break

      case "text":
      case "textarea":
        if (field.validation?.min !== undefined && value.length < field.validation.min) {
          return `Minimum length is ${field.validation.min} characters`
        }
        if (field.validation?.max !== undefined && value.length > field.validation.max) {
          return `Maximum length is ${field.validation.max} characters`
        }
        break
    }

    return null
  }, [])

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {}
    let isValid = true

    template.sections.forEach((section) => {
      section.fields.forEach((field) => {
        const value = formData[field.id]
        const error = validateField(field, value)

        if (error) {
          newErrors[field.id] = error
          isValid = false
        }
      })
    })

    setErrors(newErrors)
    return isValid
  }, [template, formData, validateField])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (validateForm()) {
        // Simulate async submission
        await new Promise((resolve) => setTimeout(resolve, 1000))
        onSubmit(formData)

        // Reset form after successful submission
        const resetData: Record<string, any> = {}
        template.sections.forEach((section) => {
          section.fields.forEach((field) => {
            resetData[field.id] = field.type === "checkbox" ? false : ""
          })
        })
        setFormData(resetData)
      }
    } catch (error) {
      console.error("Form submission error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderField = useCallback(
    (field: FormField) => {
      const value = formData[field.id] ?? ""
      const error = errors[field.id]
      const fieldId = `field-${field.id}`

      console.log(`Rendering field ${field.id}:`, { field, value, error })

      const commonProps = {
        id: fieldId,
        "aria-describedby": error ? `${fieldId}-error` : undefined,
        "aria-invalid": !!error,
      }

      try {
        switch (field.type) {
          case "text":
          case "email":
          case "phone":
          case "url":
          case "password":
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  {...commonProps}
                  type={field.type === "phone" ? "tel" : field.type}
                  value={value}
                  onChange={(e) => updateFormData(field.id, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "textarea":
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Textarea
                  {...commonProps}
                  value={value}
                  onChange={(e) => updateFormData(field.id, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                  rows={4}
                />
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "number":
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Input
                  {...commonProps}
                  type="number"
                  value={value}
                  onChange={(e) => updateFormData(field.id, e.target.value)}
                  placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                  min={field.validation?.min}
                  max={field.validation?.max}
                  step="any"
                  className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                  disabled={isSubmitting}
                />
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "calculated":
            const calculatedValue = typeof value === "number" ? value : null
            const formattedValue = formatCalculatedValue(calculatedValue, field)
            const referencedFieldIds = field.calculation?.formula 
              ? getReferencedFields(field.calculation.formula)
              : []
            
            // Build fieldIdToLabelMap for display
            // IMPORTANT: Include ALL fields (including calculated fields) so formulas can reference other calculated fields
            const fieldIdToLabelMap: Record<string, string> = {};
            template.sections.forEach((section) => {
              section.fields.forEach((f) => {
                // Include ALL fields, not just non-calculated ones
                // This allows formulas to reference other calculated fields with human-readable labels
                fieldIdToLabelMap[f.id] = f.label;
                if (f.id.startsWith("field-")) {
                  fieldIdToLabelMap[f.id.replace(/^field-/, "")] = f.label;
                } else {
                  fieldIdToLabelMap[`field-${f.id}`] = f.label;
                }
              });
            });
            
            const formattedFormula = field.calculation?.formula
              ? formatFormulaWithLabels(field.calculation.formula, fieldIdToLabelMap)
              : "";
            const referencedFieldLabels = convertFieldIdsToLabels(referencedFieldIds, fieldIdToLabelMap);
            
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-500" />
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="relative">
                  <Input
                    {...commonProps}
                    type="text"
                    value={formattedValue}
                    readOnly
                    className="bg-gray-50 border-gray-300 cursor-not-allowed font-mono"
                    disabled={true}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  </div>
                </div>
                {field.calculation?.formula && (
                  <div className="text-xs text-gray-500 space-y-1">
                    <p className="font-mono bg-gray-50 p-2 rounded">
                      Formula: {formattedFormula}
                    </p>
                    {referencedFieldLabels.length > 0 && (
                      <p className="text-xs text-gray-400">
                        Depends on: {referencedFieldLabels.join(", ")}
                      </p>
                    )}
                  </div>
                )}
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "select":
          case "multiselect":
            // Check if multiselect: either type is "multiselect" or metadata.multiple is true
            const isMultiSelect = field.type === "multiselect" || (field.metadata as any)?.multiple || false;
            const selectValue = isMultiSelect 
              ? (Array.isArray(value) ? value : (value ? [value] : []))
              : (Array.isArray(value) ? value[0] : value);
            
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {isMultiSelect ? (
                  // Multiselect: Use Combobox component
                  <Combobox
                    id={fieldId}
                    name={field.id}
                    value={selectValue}
                    onChange={(val) => updateFormData(field.id, val)}
                    options={(field.options || []).map(opt => ({ label: opt, value: opt }))}
                    multi={true}
                    placeholder={field.placeholder || "Select options..."}
                    disabled={isSubmitting}
                  />
                ) : (
                  // Single select
                  <Select value={selectValue || ""} onValueChange={(val) => updateFormData(field.id, val)} disabled={isSubmitting}>
                    <SelectTrigger
                      className={error ? "border-red-500 focus:ring-red-500" : ""}
                      aria-describedby={error ? `${fieldId}-error` : undefined}
                    >
                      <SelectValue placeholder={field.placeholder || "Select an option"} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options && field.options.length > 0 ? (
                        field.options
                          .filter((option) => option && option !== "" && option !== null && option !== undefined)
                          .map((option, index) => (
                            <SelectItem key={`${field.id}-option-${index}`} value={option}>
                              {option}
                            </SelectItem>
                          ))
                      ) : (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No options available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                )}
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )
          case "sysConfig":
            return (
              <SysConfigFieldPreview
                key={field.id}
                field={field}
                fieldId={fieldId}
                value={value}
                error={error}
                isSubmitting={isSubmitting}
                onValueChange={(val) => updateFormData(field.id, val)}
              />
            )

          case "radio":
            return (
              <div key={field.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <RadioGroup
                  value={value}
                  onValueChange={(val) => updateFormData(field.id, val)}
                  className={error ? "border border-red-500 rounded p-3" : ""}
                  disabled={isSubmitting}
                >
                  {field.options && field.options.length > 0 ? (
                    field.options.map((option, index) => (
                      <div key={`${field.id}-radio-${index}`} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${fieldId}-${index}`} disabled={isSubmitting} />
                        <Label htmlFor={`${fieldId}-${index}`} className="text-sm">
                          {option}
                        </Label>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 italic">No options configured</p>
                  )}
                </RadioGroup>
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "checkbox":
            return (
              <div key={field.id} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    {...commonProps}
                    checked={!!value}
                    onCheckedChange={(checked) => updateFormData(field.id, checked)}
                    disabled={isSubmitting}
                    className={error ? "border-red-500" : ""}
                  />
                  <Label htmlFor={fieldId} className="text-sm font-medium">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                </div>
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "date":
            return (
              <div key={field.id} className="space-y-2">
                <Label className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`w-full justify-start text-left font-normal ${
                        error ? "border-red-500 focus:ring-red-500" : ""
                      } ${!value ? "text-muted-foreground" : ""}`}
                      disabled={isSubmitting}
                      aria-describedby={error ? `${fieldId}-error` : undefined}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {value ? format(new Date(value), "PPP") : field.placeholder || "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={value ? new Date(value) : undefined}
                      onSelect={(date) => updateFormData(field.id, date?.toISOString())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          case "user":
          case "entity":
          case "organization":
            // Simple preview for user/entity fields (full EntityLookupField requires react-hook-form)
            const isReadOnly = (field as any).readOnly || (field as any).metadata?.readOnly || false;
            const entityType = field.type === "entity" 
              ? ((field as any).metadata?.entityType || "account")
              : field.type === "user" 
              ? "user"
              : "organization";
            
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {isReadOnly && <span className="text-gray-400 ml-2 text-xs">(Read-only)</span>}
                </Label>
                <Input
                  id={fieldId}
                  value={value || ""}
                  onChange={(e) => updateFormData(field.id, e.target.value)}
                  placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`}
                  disabled={isSubmitting || isReadOnly}
                  className={`${error ? "border-red-500 focus:ring-red-500" : ""} ${isReadOnly ? "bg-gray-100 cursor-not-allowed" : ""}`}
                  aria-describedby={error ? `${fieldId}-error` : undefined}
                />
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
                {((field as any).metadata?.autoPopulated || isReadOnly) && (
                  <p className="text-xs text-gray-400 italic">This field is automatically populated</p>
                )}
              </div>
            )

          case "address":
            const addressValue = typeof value === 'object' && value !== null ? value : {
              street: "",
              city: "",
              state: "",
              zipCode: "",
              country: ""
            };
            
            return (
              <div key={field.id} className="space-y-2">
                <Label htmlFor={fieldId} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="space-y-4 border rounded-md p-4 bg-gray-50">
                  <div className="space-y-1">
                    <Label htmlFor={`${fieldId}-street`} className="text-xs text-gray-600">Street Address</Label>
                    <Input
                      id={`${fieldId}-street`}
                      value={addressValue.street || ""}
                      onChange={(e) => updateFormData(field.id, { ...addressValue, street: e.target.value })}
                      placeholder="Enter street address"
                      className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-city`} className="text-xs text-gray-600">City</Label>
                      <Input
                        id={`${fieldId}-city`}
                        value={addressValue.city || ""}
                        onChange={(e) => updateFormData(field.id, { ...addressValue, city: e.target.value })}
                        placeholder="Enter city"
                        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-state`} className="text-xs text-gray-600">State/Province</Label>
                      <Input
                        id={`${fieldId}-state`}
                        value={addressValue.state || ""}
                        onChange={(e) => updateFormData(field.id, { ...addressValue, state: e.target.value })}
                        placeholder="Enter state"
                        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-zipCode`} className="text-xs text-gray-600">ZIP/Postal Code</Label>
                      <Input
                        id={`${fieldId}-zipCode`}
                        value={addressValue.zipCode || ""}
                        onChange={(e) => updateFormData(field.id, { ...addressValue, zipCode: e.target.value })}
                        placeholder="Enter ZIP code"
                        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor={`${fieldId}-country`} className="text-xs text-gray-600">Country</Label>
                      <Input
                        id={`${fieldId}-country`}
                        value={addressValue.country || ""}
                        onChange={(e) => updateFormData(field.id, { ...addressValue, country: e.target.value })}
                        placeholder="Enter country"
                        className={error ? "border-red-500 focus-visible:ring-red-500" : ""}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                </div>
                {error && (
                  <p id={`${fieldId}-error`} className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                )}
              </div>
            )

          default:
            return (
              <div key={field.id} className="space-y-2">
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">Unsupported field type: {field.type}</AlertDescription>
                </Alert>
              </div>
            )
        }
      } catch (renderError) {
        console.error(`Error rendering field ${field.id}:`, renderError)
        return (
          <div key={field.id} className="space-y-2">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>Error rendering field: {field.label}</AlertDescription>
            </Alert>
          </div>
        )
      }
    },
    [formData, errors, isSubmitting, updateFormData],
  )

  // Show empty state if no template
  if (!template.name) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-gray-500 text-center">
            <h3 className="text-lg font-medium mb-2">No form to preview</h3>
            <p className="mb-4">Create a template in the builder to see the preview</p>
            <Button onClick={() => setDebugMode(!debugMode)} variant="outline" size="sm">
              Toggle Debug Mode
            </Button>
            {debugMode && (
              <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
                <strong>Debug Info:</strong>
                <pre>
                  {JSON.stringify(
                    { template, formData, hasName: !!template.name, sectionsLength: template.sections?.length },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalFields = template.sections.reduce((total, section) => total + section.fields.length, 0)
  const errorCount = Object.keys(errors).length

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Debug Toggle */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => setDebugMode(!debugMode)} className="text-xs">
          {debugMode ? "Hide" : "Show"} Debug Info
        </Button>
      </div>

      {/* Form Status */}
      <Alert className={errorCount > 0 ? "border-yellow-500" : "border-green-500"}>
        {errorCount > 0 ? (
          <AlertCircle className="h-4 w-4 text-yellow-500" />
        ) : (
          <CheckCircle className="h-4 w-4 text-green-500" />
        )}
        <AlertDescription>
          {errorCount > 0
            ? `${errorCount} validation error${errorCount !== 1 ? "s" : ""} found`
            : `Form ready - ${totalFields} field${totalFields !== 1 ? "s" : ""} configured`}
        </AlertDescription>
      </Alert>

      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{template.name}</CardTitle>
          {template.description && <p className="text-gray-600">{template.description}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Header Section */}
            {(template as any).header && (template as any).header.metadata?.show !== false && (
              <div key={(template as any).header.id} className="space-y-6 border-b pb-6">
                <div className="border-l-4 border-l-green-500 pl-4">
                  <h3 className="text-xl font-semibold">{(template as any).header.title}</h3>
                  {(template as any).header.description && <p className="text-gray-600 mt-1">{(template as any).header.description}</p>}
                </div>
                {(template as any).header.fields.length > 0 ? (
                  (() => {
                    const section = (template as any).header;
                    // Ensure it's a number (handle both string and number cases)
                    const columnsValue = (section.metadata as any)?.columns;
                    const sectionColumns = columnsValue !== undefined && columnsValue !== null 
                      ? (typeof columnsValue === 'string' ? Number(columnsValue) : columnsValue) as 1 | 2 | 3 | 4 | 6 | 12
                      : 1;
                    
                    console.log('📊 [Grid System Preview] Rendering HEADER section:', {
                      sectionId: section.id,
                      sectionTitle: section.title,
                      columnsValue,
                      columnsValueType: typeof columnsValue,
                      sectionColumns,
                      sectionColumnsType: typeof sectionColumns,
                      metadata: section.metadata,
                      fieldsCount: section.fields.length
                    });
                    
                    const getSectionGridClass = (columns?: 1 | 2 | 3 | 4 | 6 | 12): string => {
                      // Ensure columns is a number
                      const cols = typeof columns === 'string' ? Number(columns) : (columns ?? 1);
                      const gridClass = (() => {
                        switch (cols) {
                          case 1: return "grid-cols-1";
                          case 2: return "grid-cols-2"; // Always show 2 columns
                          case 3: return "grid-cols-3"; // Always show 3 columns
                          case 4: return "grid-cols-4"; // Always show 4 columns
                          case 6: return "grid-cols-6"; // Always show 6 columns
                          case 12: return "grid-cols-12"; // Always show 12 columns
                          default: return "grid-cols-1";
                        }
                      })();
                      
                      console.log('📊 [Grid System Preview] HEADER getSectionGridClass:', {
                        inputColumns: columns,
                        inputColumnsType: typeof columns,
                        processedCols: cols,
                        gridClass,
                        sectionId: section.id
                      });
                      
                      return gridClass;
                    };
                    
                    const getFieldWidthClass = (width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number, columns: number = 1): string => {
                      if (typeof width === "number") {
                        return `col-span-${width}`;
                      }
                      
                      // Calculate col-span based on section columns for 'full' width
                      // In a 12-column grid system: col-span = 12 / columns
                      const getFullWidthSpan = (cols: number): number => {
                        switch (cols) {
                          case 1: return 12;
                          case 2: return 6;
                          case 3: return 4;
                          case 4: return 3;
                          case 6: return 2;
                          case 12: return 1;
                          default: return 12;
                        }
                      };
                      
                      switch (width) {
                        case "half": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 2))}`;
                        case "third": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 3))}`;
                        case "two-thirds": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 2 / 3))}`;
                        case "quarter": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 4))}`;
                        case "three-quarters": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 3 / 4))}`;
                        case "full":
                        default:
                          // Full width means one column in the section's grid
                          return `col-span-${getFullWidthSpan(columns)}`;
                      }
                    };
                    
                    const gridClass = getSectionGridClass(sectionColumns);
                    const gridTemplateColumns = `repeat(${sectionColumns}, minmax(0, 1fr))`;
                    
                    // Helper to calculate col-span
                    // IMPORTANT: This calculates span in the actual grid system (not 12-column system)
                    // For a 4-column grid, "full" width means span 1 column (one field per column)
                    const getColSpan = (width: string | number | undefined, cols: number): number => {
                      if (typeof width === "number") {
                        // If a number is provided, use it directly but ensure it doesn't exceed grid columns
                        return Math.min(width, cols);
                      }
                      
                      // For "full" width in an N-column grid, span 1 column (one field per column)
                      // For other widths, calculate proportionally based on the actual grid columns
                      switch (width) {
                        case "half": 
                          // Half width = span half of the grid columns (rounded up)
                          return Math.max(1, Math.ceil(cols / 2));
                        case "third": 
                          return Math.max(1, Math.ceil(cols / 3));
                        case "two-thirds": 
                          return Math.max(1, Math.ceil(cols * 2 / 3));
                        case "quarter": 
                          return Math.max(1, Math.ceil(cols / 4));
                        case "three-quarters": 
                          return Math.max(1, Math.ceil(cols * 3 / 4));
                        case "full":
                        default:
                          // Full width = 1 column in the grid (one field per column)
                          return 1;
                      }
                    };
                    
                    return (
                      <div 
                        className={cn("grid gap-6", gridClass)}
                        style={{ 
                          display: 'grid',
                          gridTemplateColumns: gridTemplateColumns,
                          gap: '1.5rem'
                        }}
                      >
                        {section.fields.map((field: FormField) => {
                          const fieldElement = renderField(field);
                          if (!fieldElement) return null;
                          
                          const fieldWidth = (field.metadata as any)?.width ?? "full";
                          const fieldAlign = (field.metadata as any)?.align;
                          const fieldClassName = (field.metadata as any)?.className;
                          const fieldWidthClass = getFieldWidthClass(fieldWidth, sectionColumns);
                          const colSpan = getColSpan(fieldWidth, sectionColumns);
                          
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                fieldWidthClass,
                                fieldAlign === "center" && "text-center",
                                fieldAlign === "right" && "text-right",
                                fieldClassName
                              )}
                              style={{
                                gridColumn: `span ${colSpan} / span ${colSpan}`
                              }}
                            >
                              {fieldElement}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No fields configured for this section</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            {/* Regular Sections */}
            {template.sections.map((section) => {
              // Get section columns from metadata, default to 1 (not 2) to match renderer
              // Ensure it's a number (handle both string and number cases)
              const columnsValue = (section as any).metadata?.columns;
              const sectionColumns = columnsValue !== undefined && columnsValue !== null 
                ? (typeof columnsValue === 'string' ? Number(columnsValue) : columnsValue) as 1 | 2 | 3 | 4 | 6 | 12
                : 1;
              
              console.log('📊 [Grid System Preview] Rendering section:', {
                sectionId: section.id,
                sectionTitle: section.title,
                columnsValue,
                columnsValueType: typeof columnsValue,
                sectionColumns,
                sectionColumnsType: typeof sectionColumns,
                metadata: section.metadata,
                fieldsCount: section.fields.length
              });
              
              const getSectionGridClass = (columns?: 1 | 2 | 3 | 4 | 6 | 12): string => {
                // Ensure columns is a number
                const cols = typeof columns === 'string' ? Number(columns) : (columns ?? 1);
                const gridClass = (() => {
                  switch (cols) {
                    case 1: return "grid-cols-1";
                    case 2: return "grid-cols-2"; // Changed: removed responsive, always show 2 columns
                    case 3: return "grid-cols-3"; // Changed: removed responsive, always show 3 columns
                    case 4: return "grid-cols-4"; // Changed: removed responsive, always show 4 columns
                    case 6: return "grid-cols-6"; // Changed: removed responsive, always show 6 columns
                    case 12: return "grid-cols-12"; // Changed: removed responsive, always show 12 columns
                    default: return "grid-cols-1";
                  }
                })();
                
                console.log('📊 [Grid System Preview] getSectionGridClass:', {
                  inputColumns: columns,
                  inputColumnsType: typeof columns,
                  processedCols: cols,
                  gridClass,
                  sectionId: section.id
                });
                
                return gridClass;
              };
              
              // Helper function to get field width class
              // Now takes sectionColumns into account to properly distribute fields across the grid
              const getFieldWidthClass = (width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number, columns: number = 1): string => {
                if (typeof width === "number") {
                  return `col-span-${width}`;
                }
                
                // Calculate col-span based on section columns for 'full' width
                // In a 12-column grid system: col-span = 12 / columns
                const getFullWidthSpan = (cols: number): number => {
                  switch (cols) {
                    case 1: return 12;
                    case 2: return 6;
                    case 3: return 4;
                    case 4: return 3;
                    case 6: return 2;
                    case 12: return 1;
                    default: return 12;
                  }
                };
                
                switch (width) {
                  case "half": 
                    // Half width should be half of the section's column span
                    return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 2))}`;
                  case "third": 
                    return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 3))}`;
                  case "two-thirds": 
                    return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 2 / 3))}`;
                  case "quarter": 
                    return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 4))}`;
                  case "three-quarters": 
                    return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 3 / 4))}`;
                  case "full":
                  default:
                    // Full width means one column in the section's grid
                    return `col-span-${getFullWidthSpan(columns)}`;
                }
              };
              
              return (
                <div key={section.id} className="space-y-6">
                  <div className="border-l-4 border-l-blue-500 pl-4">
                    <h3 className="text-xl font-semibold">{section.title}</h3>
                    {section.description && <p className="text-gray-600 mt-1">{section.description}</p>}
                  </div>

                  {section.fields.length > 0 ? (
                    (() => {
                      const gridClass = getSectionGridClass(sectionColumns);
                      const finalClassName = cn("grid gap-6", gridClass);
                      
                      // Calculate grid template columns for inline style fallback
                      const gridTemplateColumns = `repeat(${sectionColumns}, minmax(0, 1fr))`;
                      
                      console.log('📊 [Grid System Preview] Applying grid classes:', {
                        sectionId: section.id,
                        sectionTitle: section.title,
                        sectionColumns,
                        gridClass,
                        finalClassName,
                        gridTemplateColumns,
                        fieldsCount: section.fields.length
                      });
                      
                      return (
                        <div 
                          className={finalClassName}
                          style={{ 
                            display: 'grid',
                            gridTemplateColumns: gridTemplateColumns,
                            gap: '1.5rem' // gap-6 = 1.5rem
                          }}
                        >
                          {section.fields.map((field) => {
                            const fieldElement = renderField(field);
                            if (!fieldElement) return null;
                            
                          const fieldWidth = (field.metadata as any)?.width ?? "full";
                          const fieldAlign = (field.metadata as any)?.align;
                          const fieldClassName = (field.metadata as any)?.className;
                          const fieldWidthClass = getFieldWidthClass(fieldWidth, sectionColumns);
                          
                          // Calculate col-span for inline style fallback
                          // IMPORTANT: This calculates span in the actual grid system (not 12-column system)
                          // For a 4-column grid, "full" width means span 1 column (one field per column)
                          const getColSpan = (width: string | number | undefined, cols: number): number => {
                            if (typeof width === "number") {
                              // If a number is provided, use it directly but ensure it doesn't exceed grid columns
                              return Math.min(width, cols);
                            }
                            
                            // For "full" width in an N-column grid, span 1 column (one field per column)
                            // For other widths, calculate proportionally based on the actual grid columns
                            switch (width) {
                              case "half": 
                                // Half width = span half of the grid columns (rounded up)
                                return Math.max(1, Math.ceil(cols / 2));
                              case "third": 
                                return Math.max(1, Math.ceil(cols / 3));
                              case "two-thirds": 
                                return Math.max(1, Math.ceil(cols * 2 / 3));
                              case "quarter": 
                                return Math.max(1, Math.ceil(cols / 4));
                              case "three-quarters": 
                                return Math.max(1, Math.ceil(cols * 3 / 4));
                              case "full":
                              default:
                                // Full width = 1 column in the grid (one field per column)
                                return 1;
                            }
                          };
                          
                          const colSpan = getColSpan(fieldWidth, sectionColumns);
                          
                          console.log('📊 [Grid System Preview] Rendering field:', {
                            fieldId: field.id,
                            fieldLabel: field.label,
                            fieldWidth,
                            fieldWidthClass,
                            colSpan,
                            fieldAlign,
                            sectionColumns,
                            calculatedSpan: fieldWidthClass
                          });
                          
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                fieldWidthClass,
                                fieldAlign === "center" && "text-center",
                                fieldAlign === "right" && "text-right",
                                fieldClassName
                              )}
                              style={{
                                gridColumn: `span ${colSpan} / span ${colSpan}`
                              }}
                            >
                              {fieldElement}
                            </div>
                          );
                          })}
                        </div>
                      );
                    })()
                  ) : (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>No fields configured for this section</AlertDescription>
                    </Alert>
                  )}
                </div>
              );
            })}

            {/* Footer Section */}
            {(template as any).footer && (template as any).footer.metadata?.show !== false && (
              <div key={(template as any).footer.id} className="space-y-6 border-t pt-6">
                <div className="border-l-4 border-l-purple-500 pl-4">
                  <h3 className="text-xl font-semibold">{(template as any).footer.title}</h3>
                  {(template as any).footer.description && <p className="text-gray-600 mt-1">{(template as any).footer.description}</p>}
                </div>
                {(template as any).footer.fields.length > 0 ? (
                  (() => {
                    const section = (template as any).footer;
                    // Ensure it's a number (handle both string and number cases)
                    const columnsValue = (section.metadata as any)?.columns;
                    const sectionColumns = columnsValue !== undefined && columnsValue !== null 
                      ? (typeof columnsValue === 'string' ? Number(columnsValue) : columnsValue) as 1 | 2 | 3 | 4 | 6 | 12
                      : 1;
                    
                    console.log('📊 [Grid System Preview] Rendering FOOTER section:', {
                      sectionId: section.id,
                      sectionTitle: section.title,
                      columnsValue,
                      columnsValueType: typeof columnsValue,
                      sectionColumns,
                      sectionColumnsType: typeof sectionColumns,
                      metadata: section.metadata,
                      fieldsCount: section.fields.length
                    });
                    
                    const getSectionGridClass = (columns?: 1 | 2 | 3 | 4 | 6 | 12): string => {
                      // Ensure columns is a number
                      const cols = typeof columns === 'string' ? Number(columns) : (columns ?? 1);
                      const gridClass = (() => {
                        switch (cols) {
                          case 1: return "grid-cols-1";
                          case 2: return "grid-cols-2"; // Always show 2 columns
                          case 3: return "grid-cols-3"; // Always show 3 columns
                          case 4: return "grid-cols-4"; // Always show 4 columns
                          case 6: return "grid-cols-6"; // Always show 6 columns
                          case 12: return "grid-cols-12"; // Always show 12 columns
                          default: return "grid-cols-1";
                        }
                      })();
                      
                      console.log('📊 [Grid System Preview] FOOTER getSectionGridClass:', {
                        inputColumns: columns,
                        inputColumnsType: typeof columns,
                        processedCols: cols,
                        gridClass,
                        sectionId: section.id
                      });
                      
                      return gridClass;
                    };
                    
                    const getFieldWidthClass = (width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number, columns: number = 1): string => {
                      if (typeof width === "number") {
                        return `col-span-${width}`;
                      }
                      
                      // Calculate col-span based on section columns for 'full' width
                      // In a 12-column grid system: col-span = 12 / columns
                      const getFullWidthSpan = (cols: number): number => {
                        switch (cols) {
                          case 1: return 12;
                          case 2: return 6;
                          case 3: return 4;
                          case 4: return 3;
                          case 6: return 2;
                          case 12: return 1;
                          default: return 12;
                        }
                      };
                      
                      switch (width) {
                        case "half": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 2))}`;
                        case "third": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 3))}`;
                        case "two-thirds": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 2 / 3))}`;
                        case "quarter": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) / 4))}`;
                        case "three-quarters": 
                          return `col-span-${Math.max(1, Math.floor(getFullWidthSpan(columns) * 3 / 4))}`;
                        case "full":
                        default:
                          // Full width means one column in the section's grid
                          return `col-span-${getFullWidthSpan(columns)}`;
                      }
                    };
                    
                    const gridClass = getSectionGridClass(sectionColumns);
                    const gridTemplateColumns = `repeat(${sectionColumns}, minmax(0, 1fr))`;
                    
                    // Helper to calculate col-span
                    // IMPORTANT: This calculates span in the actual grid system (not 12-column system)
                    // For a 4-column grid, "full" width means span 1 column (one field per column)
                    const getColSpan = (width: string | number | undefined, cols: number): number => {
                      if (typeof width === "number") {
                        // If a number is provided, use it directly but ensure it doesn't exceed grid columns
                        return Math.min(width, cols);
                      }
                      
                      // For "full" width in an N-column grid, span 1 column (one field per column)
                      // For other widths, calculate proportionally based on the actual grid columns
                      switch (width) {
                        case "half": 
                          // Half width = span half of the grid columns (rounded up)
                          return Math.max(1, Math.ceil(cols / 2));
                        case "third": 
                          return Math.max(1, Math.ceil(cols / 3));
                        case "two-thirds": 
                          return Math.max(1, Math.ceil(cols * 2 / 3));
                        case "quarter": 
                          return Math.max(1, Math.ceil(cols / 4));
                        case "three-quarters": 
                          return Math.max(1, Math.ceil(cols * 3 / 4));
                        case "full":
                        default:
                          // Full width = 1 column in the grid (one field per column)
                          return 1;
                      }
                    };
                    
                    return (
                      <div 
                        className={cn("grid gap-6", gridClass)}
                        style={{ 
                          display: 'grid',
                          gridTemplateColumns: gridTemplateColumns,
                          gap: '1.5rem'
                        }}
                      >
                        {section.fields.map((field: FormField) => {
                          const fieldElement = renderField(field);
                          if (!fieldElement) return null;
                          
                          const fieldWidth = (field.metadata as any)?.width ?? "full";
                          const fieldAlign = (field.metadata as any)?.align;
                          const fieldClassName = (field.metadata as any)?.className;
                          const fieldWidthClass = getFieldWidthClass(fieldWidth, sectionColumns);
                          const colSpan = getColSpan(fieldWidth, sectionColumns);
                          
                          return (
                            <div
                              key={field.id}
                              className={cn(
                                fieldWidthClass,
                                fieldAlign === "center" && "text-center",
                                fieldAlign === "right" && "text-right",
                                fieldClassName
                              )}
                              style={{
                                gridColumn: `span ${colSpan} / span ${colSpan}`
                              }}
                            >
                              {fieldElement}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>No fields configured for this section</AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex justify-end pt-6 border-t">
              <Button type="submit" size="lg" disabled={isSubmitting || totalFields === 0} className="min-w-[200px]">
                {isSubmitting ? "Submitting..." : "Submit Quotation Request"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Debug Panel */}
      {debugMode && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Form Data:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(formData, null, 2)}</pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Validation Errors:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">{JSON.stringify(errors, null, 2)}</pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">Template Structure:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(template, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
