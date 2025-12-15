"use client"

import { useState, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Trash2, Calculator } from "lucide-react"
import type { FormField } from "./form-builder"
import { useDropdownCategories } from "@/queries/DropdownQueries"
import { toPrettyString } from "@/utils/common"
import { getReferencedFields, formatFormulaWithLabels, convertFieldIdsToLabels } from "@/utils/formulaEvaluator"
import { normalizeFormulaToFieldIds, validateFormula, buildLabelToIdMap } from "@/utils/formulaNormalizer"
import { AIFormulaBuilder } from "./ai-formula-builder"

interface FieldEditorProps {
  field: FormField
  availableFields?: Array<{ id: string; label: string; type: string }>
  onSave: (field: Partial<FormField>) => void
  onCancel: () => void
  templateId?: string
}

export function FieldEditor({ field, availableFields = [], onSave, onCancel, templateId }: FieldEditorProps) {
  const [editedField, setEditedField] = useState<FormField>({ ...field })
  const {data, isPending} = useDropdownCategories()
  
  // CRITICAL: Rebuild fieldIdToLabelMap whenever availableFields changes
  // This ensures newly added fields are always included in the map
  const fieldIdToLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableFields.forEach((field) => {
      const label = field.label;
      
      // Add exact field ID
      map[field.id] = label;
      
      // Add with/without field- prefix variations
      if (field.id.startsWith('field-')) {
        const withoutPrefix = field.id.replace(/^field-/, '');
        map[withoutPrefix] = label;
        
        // Handle complex IDs like field-1763874437351-ukf5g2kpt
        const parts = field.id.split('-');
        if (parts.length > 2) {
          // field-1763874437351-ukf5g2kpt -> 1763874437351-ukf5g2kpt
          const withoutFieldPrefix = parts.slice(1).join('-');
          map[withoutFieldPrefix] = label;
        }
      } else {
        map[`field-${field.id}`] = label;
        
        // Handle complex IDs without field- prefix
        if (field.id.includes('-')) {
          const parts = field.id.split('-');
          if (parts.length > 1) {
            // Add field- prefix version
            map[`field-${field.id}`] = label;
          }
        }
      }
    });
    return map;
  }, [availableFields]); // Rebuild whenever availableFields changes
  
  const fieldTypes = [
    { value: "text", label: "Text Input" },
    { value: "textarea", label: "Text Area" },
    { value: "number", label: "Number" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "date", label: "Date" },
    { value: "select", label: "Dropdown" },
    { value: "radio", label: "Radio Buttons" },
    { value: "checkbox", label: "Checkbox" },
    { value: "calculated", label: "Calculated Field" },
    { value: "sysConfig", label: "SysConfig" },
    { value: "entity", label: "CRM Entity (Account/Contact/etc.)" },
    { value: "user", label: "User" },
    { value: "organization", label: "Organization" },
  ]

  const addOption = () => {
    setEditedField((prev) => ({
      ...prev,
      options: [...(prev.options || []), `Option ${(prev.options?.length || 0) + 1}`],
    }))
  }

  const updateOption = (index: number, value: string) => {
    setEditedField((prev) => ({
      ...prev,
      options: prev.options?.map((opt, i) => (i === index ? value : opt)),
    }))
  }

  const removeOption = (index: number) => {
    setEditedField((prev) => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index),
    }))
  }

  const needsOptions = ["select", "radio"].includes(editedField.type)
  const needsCategory = ["sysConfig"].includes(editedField.type)
  const needsEntityType = ["entity"].includes(editedField.type)
  const needsCalculation = editedField.type === "calculated"
  
  
  const entityTypes = [
    { value: "account", label: "Account" },
    { value: "contact", label: "Contact" },
    { value: "lead", label: "Lead" },
    { value: "opportunity", label: "Opportunity" },
    { value: "quotation", label: "Quotation" },
    { value: "salesOrder", label: "Sales Order" },
    { value: "invoice", label: "Invoice" },
    { value: "ticket", label: "Ticket" },
  ]

  const handleSave = () => {
    // Validate that select/radio fields have options
    if (needsOptions && (!editedField.options || editedField.options.length === 0)) {
      alert("Please add at least one option for this field type")
      return
    }

    // Validate calculated fields
    if (needsCalculation) {
      if (!editedField.calculation?.formula || editedField.calculation.formula.trim() === "") {
        alert("Please provide a formula for the calculated field")
        return
      }

      // Build comprehensive fieldLabelToIdMap for getReferencedFields
      // CRITICAL: Include ALL variations (case-insensitive, normalized, etc.) to ensure proper label-to-ID conversion
      const fieldLabelToIdMap: Record<string, string> = {};
      availableFields.forEach((field) => {
        const label = field.label;
        const id = field.id;
        
        // Add exact label (case-sensitive)
        fieldLabelToIdMap[label] = id;
        
        // Add lowercase version
        const labelLower = label.toLowerCase();
        if (labelLower !== label) {
          fieldLabelToIdMap[labelLower] = id;
        }
        
        // Add title case version
        const labelTitle = label.charAt(0).toUpperCase() + label.slice(1).toLowerCase();
        if (labelTitle !== label && labelTitle !== labelLower) {
          fieldLabelToIdMap[labelTitle] = id;
        }
        
        // Add normalized label (lowercase, spaces to underscores)
        const normalizedLabel = labelLower.replace(/\s+/g, '_');
        fieldLabelToIdMap[normalizedLabel] = id;
        
        // Add normalized with spaces (lowercase, underscores to spaces)
        const normalizedWithSpaces = labelLower.replace(/_/g, ' ');
        if (normalizedWithSpaces !== labelLower) {
          fieldLabelToIdMap[normalizedWithSpaces] = id;
        }
        
        // Also map field ID variations
        fieldLabelToIdMap[id] = id;
        if (id.startsWith('field-')) {
          const withoutPrefix = id.replace(/^field-/, '');
          fieldLabelToIdMap[withoutPrefix] = id;
        } else {
          fieldLabelToIdMap[`field-${id}`] = id;
        }
      });

      // CRITICAL: First convert the formula to use field IDs instead of labels
      // This ensures validation works correctly even if the formula contains labels
      let formulaToValidate = editedField.calculation.formula;
      
      // CRITICAL: Use centralized formula normalization utility
      // This ensures consistent handling of all edge cases
      const validationResult = validateFormula(editedField.calculation.formula, availableFields);
      
      if (!validationResult.valid) {
        const errorMessage = validationResult.errors.join('. ') + 
                            (validationResult.warnings.length > 0 ? '\n\nWarnings: ' + validationResult.warnings.join('. ') : '');
        alert(errorMessage);
        return;
      }
      
      // Use the normalized formula (always with field IDs)
      formulaToValidate = validationResult.normalizedFormula || editedField.calculation.formula;
      
      // Show warnings if any
      if (validationResult.warnings.length > 0) {
        console.warn('Formula normalization warnings:', validationResult.warnings);
      }

      // Validate formula syntax - getReferencedFields now supports labels
      const referencedFields = getReferencedFields(
        formulaToValidate
      ) as string[];
      
      if (referencedFields.length === 0) {
        alert("The formula does not reference any fields. Please add field references to the formula.")
        return
      }

      // Check if referenced fields exist in available fields
      // Convert labels to IDs first - try multiple matching strategies
      const referencedFieldIds = referencedFields.map(fieldRef => {
        // If it's already a field ID that exists, return as is
        if (availableFields.some(f => f.id === fieldRef)) {
          return fieldRef;
        }
        
        // Try exact match in label map
        if (fieldLabelToIdMap[fieldRef]) {
          return fieldLabelToIdMap[fieldRef];
        }
        
        // Try case-insensitive match
        const lowerRef = fieldRef.toLowerCase();
        if (fieldLabelToIdMap[lowerRef]) {
          return fieldLabelToIdMap[lowerRef];
        }
        
        // Try normalized match (spaces to underscores)
        const normalizedRef = lowerRef.replace(/\s+/g, '_');
        if (fieldLabelToIdMap[normalizedRef]) {
          return fieldLabelToIdMap[normalizedRef];
        }
        
        // Try with/without field- prefix
        if (fieldRef.startsWith('field-')) {
          const withoutPrefix = fieldRef.replace(/^field-/, '');
          if (fieldLabelToIdMap[withoutPrefix]) {
            return fieldLabelToIdMap[withoutPrefix];
          }
        } else {
          const withPrefix = `field-${fieldRef}`;
          if (fieldLabelToIdMap[withPrefix]) {
            return fieldLabelToIdMap[withPrefix];
          }
        }
        
        // If no match found, return original (will be flagged as missing)
        return fieldRef;
      });

      // Check which referenced fields don't exist
      const missingFields = referencedFieldIds.filter(fieldRef => {
        // Check if it's a field ID that exists (try all variations)
        const fieldExists = availableFields.some(f => 
          f.id === fieldRef || 
          f.id === `field-${fieldRef}` ||
          fieldRef === `field-${f.id}` ||
          fieldRef.replace(/^field-/, '') === f.id.replace(/^field-/, '') ||
          (f.id.startsWith('field-') && f.id.replace(/^field-/, '') === fieldRef) ||
          (fieldRef.startsWith('field-') && fieldRef.replace(/^field-/, '') === f.id)
        );
        return !fieldExists;
      });

      if (missingFields.length > 0) {
        // Show the original field references from the formula that couldn't be matched
        // Extract the original references from the original formula (before conversion)
        const originalFormula = editedField.calculation.formula;
        const missingDisplayNames: string[] = [];
        
        // Try to find the original labels/IDs in the formula for better error messages
        for (const missingField of missingFields) {
          // Check if this missing field appears in the original formula
          if (originalFormula.includes(missingField)) {
            missingDisplayNames.push(missingField);
          } else {
            // Try to find a label that maps to this ID
            const label = availableFields.find(f => f.id === missingField)?.label;
            missingDisplayNames.push(label || missingField);
          }
        }
        
        alert(`The formula references fields that don't exist: ${missingDisplayNames.join(", ")}. Please check your formula.`)
        return
      }
      
      // CRITICAL: Update the formula to use field IDs instead of labels before saving
      // This ensures the formula is stored with IDs, not labels
      if (formulaToValidate !== editedField.calculation.formula) {
        setEditedField((prev) => ({
          ...prev,
          calculation: {
            ...prev.calculation,
            formula: formulaToValidate,
          },
        }));
      }
    }

    // Filter out empty options
    const cleanedField = {
      ...editedField,
      options: needsOptions ? editedField.options?.filter((opt) => opt.trim() !== "") : undefined,
    }

    onSave(cleanedField)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Edit Field</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="field-label">Field Label</Label>
              <Input
                id="field-label"
                value={editedField.label}
                onChange={(e) => setEditedField((prev) => ({ ...prev, label: e.target.value }))}
                placeholder="Enter field label..."
              />
            </div>
            <div>
              <Label htmlFor="field-type">Field Type</Label>
              <Select
                value={editedField.type}
                onValueChange={(value: any) => setEditedField((prev) => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {fieldTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="field-placeholder">Placeholder Text</Label>
            <Input
              id="field-placeholder"
              value={editedField.placeholder || ""}
              onChange={(e) => setEditedField((prev) => ({ ...prev, placeholder: e.target.value }))}
              placeholder="Enter placeholder text..."
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-required"
                checked={editedField.required}
                onCheckedChange={(checked) => setEditedField((prev) => ({ ...prev, required: !!checked }))}
              />
              <Label htmlFor="field-required">Required field</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-readonly"
                checked={(editedField as any).readOnly || (editedField as any).metadata?.readOnly || false}
                onCheckedChange={(checked) => setEditedField((prev) => ({
                  ...prev,
                  readOnly: !!checked,
                  metadata: {
                    ...(prev as any).metadata,
                    readOnly: !!checked,
                  },
                }))}
              />
              <Label htmlFor="field-readonly">Read-only field (auto-populated by system)</Label>
            </div>
          </div>

          {needsOptions && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label>Options</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                    className="flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add Option
                  </Button>
                </div>
                <div className="space-y-2">
                  {(editedField.options || []).map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                        className="text-amber-600 hover:text-amber-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {(!editedField.options || editedField.options.length === 0) && (
                    <p className="text-sm text-gray-500 italic">
                      No options added yet. Click "Add Option" to get started.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Add multiselect option for select fields */}
              {editedField.type === "select" && (
                <div className="flex items-center space-x-2 border-t pt-4">
                  <Checkbox
                    id="select-multiple"
                    checked={(editedField as any).metadata?.multiple || false}
                    onCheckedChange={(checked) =>
                      setEditedField((prev) => ({
                        ...prev,
                        metadata: {
                          ...(prev as any).metadata,
                          multiple: !!checked,
                        },
                      }))
                    }
                  />
                  <Label htmlFor="select-multiple">Allow multiple selection</Label>
                </div>
              )}
            </div>
          )}

          {needsCategory && (
            <div>
              <Label htmlFor="sysConfig-category">SysConfig Category</Label>
              <Select
                value={(editedField as any).category || (editedField as any).metadata?.category || undefined}
                onValueChange={(value: any) => {
                  if (value && value !== "") {
                    setEditedField((prev) => ({
                      ...prev,
                      category: value, // Keep for backward compatibility
                      metadata: {
                        ...(prev as any).metadata,
                        category: value, // Store in metadata for consistency
                      },
                    }));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isPending ? "Loading categories..." : "Select category"} />
                </SelectTrigger>
                <SelectContent>
                  {isPending ? (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      Loading categories...
                    </div>
                  ) : data && data.length > 0 ? (
                    data
                      .filter((category) => category && category !== "" && category !== null && category !== undefined)
                      .map((category) => (
                        <SelectItem key={category} value={category} className="capitalize">
                          <span className="capitalize">{toPrettyString(category)}</span>
                        </SelectItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-sm text-muted-foreground">
                      No categories available
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsEntityType && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="entity-type">Entity Type</Label>
                <Select
                  value={(editedField as any).metadata?.entityType || "account"}
                  onValueChange={(value: any) =>
                    setEditedField((prev) => ({
                      ...prev,
                      metadata: {
                        ...(prev as any).metadata,
                        entityType: value,
                      },
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select entity type" />
                  </SelectTrigger>
                  <SelectContent>
                    {entityTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="entity-multiple"
                  checked={(editedField as any).metadata?.multiple || false}
                  onCheckedChange={(checked) =>
                    setEditedField((prev) => ({
                      ...prev,
                      metadata: {
                        ...(prev as any).metadata,
                        multiple: !!checked,
                      },
                    }))
                  }
                />
                <Label htmlFor="entity-multiple">Allow multiple selection</Label>
              </div>
            </div>
          )}

          {(editedField.type === "user" || editedField.type === "organization") && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="entity-multiple"
                checked={(editedField as any).metadata?.multiple || false}
                onCheckedChange={(checked) =>
                  setEditedField((prev) => ({
                    ...prev,
                    metadata: {
                      ...(prev as any).metadata,
                      multiple: !!checked,
                    },
                  }))
                }
              />
              <Label htmlFor="entity-multiple">Allow multiple selection</Label>
            </div>
          )}

          {needsCalculation && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                <Label className="text-base font-semibold">Calculation Formula</Label>
              </div>
              
              <AIFormulaBuilder
                availableFields={availableFields}
                formula={editedField.calculation?.formula || ""}
                excludeFieldId={editedField.id}
                templateId={templateId}
                template={undefined} // Can be passed if needed
                onFormulaChange={(newFormula) =>
                  setEditedField((prev) => ({
                    ...prev,
                    calculation: {
                      ...prev.calculation,
                      formula: newFormula,
                    },
                    readOnly: true, // Calculated fields are always read-only
                    metadata: { ...(prev.metadata || {}), readOnly: true },
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="calculation-format">Display Format</Label>
                  <Select
                    value={editedField.calculation?.format ?? "number"}
                    onValueChange={(value: any) =>
                      setEditedField((prev) => ({
                        ...prev,
                        calculation: {
                          ...prev.calculation,
                          format: value,
                          formula: prev.calculation?.formula ?? "",
                          decimalPlaces: prev.calculation?.decimalPlaces ?? 2,
                        },
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="currency">Currency</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="calculation-decimals">Decimal Places</Label>
                  <Input
                    id="calculation-decimals"
                    type="number"
                    min="0"
                    max="10"
                    value={typeof editedField.calculation?.decimalPlaces === 'number' ? editedField.calculation.decimalPlaces : 2}
                    onChange={(e) =>
                      setEditedField((prev) => ({
                        ...prev,
                        calculation: {
                          ...prev.calculation,
                          decimalPlaces: Number.isNaN(Number(e.target.value)) || e.target.value === ''
                            ? 2
                            : Number.parseInt(e.target.value, 10),
                        },
                      }) as typeof prev)
                    }
                  />
                </div>
              </div>

              {editedField.calculation?.formula && (() => {
                // Use the memoized fieldIdToLabelMap that's always up-to-date
                // This ensures newly added fields are included
                
                const formulaString = typeof editedField.calculation.formula === 'string' 
                  ? editedField.calculation.formula 
                  : String(editedField.calculation.formula || '');
                
                const formattedFormula = formatFormulaWithLabels(
                  formulaString,
                  fieldIdToLabelMap
                );
                const referencedFieldIds = getReferencedFields(formulaString);
                const referencedLabels = convertFieldIdsToLabels(referencedFieldIds, fieldIdToLabelMap);
                
                return (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-100">
                    <p className="text-xs font-semibold text-blue-900 mb-1">Formula Preview:</p>
                    <code className="text-xs text-blue-800 break-all">{formattedFormula || "No formula"}</code>
                    {referencedLabels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        <span className="text-xs text-blue-600 font-medium">Fields:</span>
                        {referencedLabels.map((label: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          {(editedField.type === "number" || editedField.type === "text") && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-min">Minimum Value/Length</Label>
                <Input
                  id="field-min"
                  type="number"
                  value={editedField.validation?.min || ""}
                  onChange={(e) =>
                    setEditedField((prev) => ({
                      ...prev,
                      validation: {
                        ...prev.validation,
                        min: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="field-max">Maximum Value/Length</Label>
                <Input
                  id="field-max"
                  type="number"
                  value={editedField.validation?.max || ""}
                  onChange={(e) =>
                    setEditedField((prev) => ({
                      ...prev,
                      validation: {
                        ...prev.validation,
                        max: e.target.value ? Number.parseInt(e.target.value) : undefined,
                      },
                    }))
                  }
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Field</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
