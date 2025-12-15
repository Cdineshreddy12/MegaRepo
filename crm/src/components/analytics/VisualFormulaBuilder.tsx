"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Trash2, GripVertical } from "lucide-react";
import { formService, FormTemplate } from "@/services/api/formService";
import { VariableMapping } from "@/services/api/analyticsService";
import { useToast } from "@/hooks/useToast";

interface AggregationConfig {
  id: string;
  fieldId: string;
  aggregation: "SUM" | "AVG" | "COUNT" | "MIN" | "MAX" | "DISTINCT" | "NONE";
  variableName?: string;
}

interface VisualFormulaBuilderProps {
  formTemplateId?: string;
  variableMappings?: VariableMapping[];
  formula?: string;
  onFormulaChange?: (formula: string, mappings: VariableMapping[]) => void;
}

export function VisualFormulaBuilder({
  formTemplateId,
  variableMappings: initialMappings = [],
  formula: initialFormula = "",
  onFormulaChange,
}: VisualFormulaBuilderProps) {
  // Helper to extract string ID from formTemplateId (handles both string and object)
  const extractTemplateId = (id: string | undefined): string => {
    if (!id) return "";
    if (typeof id === "string") return id;
    // If it's an object, try to get id or _id
    if (typeof id === "object" && id !== null) {
      return (id as any).id || (id as any)._id || "";
    }
    return String(id);
  };

  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(extractTemplateId(formTemplateId));
  const [availableFields, setAvailableFields] = useState<Array<{ id: string; label: string; type: string }>>([]);
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([]);
  const [operations, setOperations] = useState<Array<{ type: "field" | "operator" | "constant"; value: string }>>([]);
  const [formula, setFormula] = useState(initialFormula);
  const [variableMappings, setVariableMappings] = useState<VariableMapping[]>(initialMappings);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    // Update selectedTemplateId when formTemplateId prop changes
    const extractedId = extractTemplateId(formTemplateId);
    if (extractedId && extractedId !== selectedTemplateId) {
      setSelectedTemplateId(extractedId);
    }
  }, [formTemplateId]);

  useEffect(() => {
    if (selectedTemplateId) {
      loadTemplateFields(selectedTemplateId);
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    generateFormulaFromBuilder();
  }, [aggregations, operations, variableMappings]);

  const loadTemplates = async () => {
    try {
      const response = await formService.getTemplates({ isActive: true });
      setTemplates(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load form templates",
        variant: "destructive",
      });
    }
  };

  const loadTemplateFields = async (templateId: string) => {
    // Ensure templateId is a string
    const templateIdStr = extractTemplateId(templateId);
    if (!templateIdStr) {
      console.warn('No template ID provided');
      return;
    }

    try {
      let template = templates.find(t => {
        const tId = t.id || t._id || "";
        return tId === templateIdStr || String(tId) === String(templateIdStr);
      });
      
      // If template not found in cached templates, try to fetch it
      if (!template) {
        try {
          // Ensure we pass a string ID, not an object
          template = await formService.getTemplate(templateIdStr);
        } catch (err: any) {
          console.error('Failed to fetch template:', err);
          toast({
            title: "Error",
            description: err.message || "Template not found",
            variant: "destructive",
          });
          return;
        }
      }
      
      const fields: Array<{ id: string; label: string; type: string }> = [];
      if (template.sections) {
        template.sections.forEach((section: any) => {
          if (section.fields) {
            section.fields.forEach((field: any) => {
              fields.push({
                id: field.id,
                label: field.label,
                type: field.type,
              });
            });
          }
        });
      }
      setAvailableFields(fields);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load template fields",
        variant: "destructive",
      });
    }
  };

  const addAggregation = () => {
    const newAgg: AggregationConfig = {
      id: `agg-${Date.now()}`,
      fieldId: "",
      aggregation: "SUM",
    };
    setAggregations([...aggregations, newAgg]);
  };

  const updateAggregation = (id: string, updates: Partial<AggregationConfig>) => {
    setAggregations(aggregations.map(agg => 
      agg.id === id ? { ...agg, ...updates } : agg
    ));
  };

  const removeAggregation = (id: string) => {
    setAggregations(aggregations.filter(agg => agg.id !== id));
    // Also remove from variable mappings
    setVariableMappings(variableMappings.filter(m => m.fieldId !== aggregations.find(a => a.id === id)?.fieldId));
  };

  const addOperation = (type: "operator" | "constant", value: string) => {
    setOperations([...operations, { type, value }]);
  };

  const removeOperation = (index: number) => {
    setOperations(operations.filter((_, i) => i !== index));
  };

  const generateFormulaFromBuilder = () => {
    if (aggregations.length === 0) {
      setFormula("");
      return;
    }

    // Build formula from aggregations and operations
    let formulaParts: string[] = [];
    let currentIndex = 0;

    aggregations.forEach((agg, idx) => {
      if (agg.fieldId) {
        const mapping = variableMappings.find(m => m.fieldId === agg.fieldId);
        const fieldName = mapping?.variableName || agg.fieldId;
        
        if (agg.aggregation !== "NONE") {
          formulaParts.push(`${agg.aggregation}(${fieldName})`);
        } else {
          formulaParts.push(fieldName);
        }

        // Add operations between aggregations
        if (idx < aggregations.length - 1) {
          // Check if there's an operation at this position
          const operation = operations[currentIndex];
          if (operation && operation.type === "operator") {
            formulaParts.push(operation.value);
            currentIndex++;
          } else {
            formulaParts.push("+"); // Default to addition
          }
        }
      }
    });

    // Add remaining operations
    while (currentIndex < operations.length) {
      const op = operations[currentIndex];
      if (op.type === "operator") {
        formulaParts.push(op.value);
      } else if (op.type === "constant") {
        formulaParts.push(op.value);
      }
      currentIndex++;
    }

    const generatedFormula = formulaParts.join(" ");
    setFormula(generatedFormula);

    // Update variable mappings
    const newMappings: VariableMapping[] = aggregations
      .filter(agg => agg.fieldId)
      .map(agg => {
        const existing = variableMappings.find(m => m.fieldId === agg.fieldId);
        const field = availableFields.find(f => f.id === agg.fieldId);
        
        return {
          variableName: agg.variableName || existing?.variableName || agg.fieldId.replace(/^field-/, ""),
          fieldId: agg.fieldId,
          fieldType: (field?.type || existing?.fieldType || "number") as any,
          aggregation: agg.aggregation !== "NONE" ? agg.aggregation : undefined,
          description: existing?.description || field?.label,
        };
      });

    setVariableMappings(newMappings);

    if (onFormulaChange) {
      onFormulaChange(generatedFormula, newMappings);
    }
  };

  const parseExistingFormula = (formula: string) => {
    // Try to parse existing formula into aggregations
    const aggregationPattern = /\b(SUM|AVG|COUNT|MIN|MAX|DISTINCT)\s*\(([^)]+)\)/gi;
    const matches: Array<{ func: string; field: string }> = [];
    let match;

    while ((match = aggregationPattern.exec(formula)) !== null) {
      matches.push({
        func: match[1],
        field: match[2],
      });
    }

    if (matches.length > 0) {
      const parsedAggregations: AggregationConfig[] = matches.map((m, idx) => ({
        id: `agg-${idx}`,
        fieldId: m.field,
        aggregation: m.func as any,
      }));
      setAggregations(parsedAggregations);
    }
  };

  useEffect(() => {
    if (initialFormula && aggregations.length === 0) {
      parseExistingFormula(initialFormula);
    }
  }, [initialFormula]);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Form Template</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={(value) => {
            setSelectedTemplateId(value);
            setAggregations([]);
            setOperations([]);
            setFormula("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a form template" />
          </SelectTrigger>
          <SelectContent>
            {templates.map((template) => (
              <SelectItem key={template.id || template._id} value={template.id || template._id || ""}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Field Aggregations</CardTitle>
            <Button onClick={addAggregation} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Aggregation
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {aggregations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No aggregations added yet.</p>
              <p className="text-sm">Click "Add Aggregation" to start building your formula.</p>
            </div>
          ) : (
            aggregations.map((agg, index) => (
              <Card key={agg.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex items-center pt-2">
                    <GripVertical className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Field</Label>
                      <Select
                        value={agg.fieldId}
                        onValueChange={(value) => {
                          const field = availableFields.find(f => f.id === value);
                          updateAggregation(agg.id, {
                            fieldId: value,
                            variableName: field?.id.replace(/^field-/, "") || value,
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableFields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Aggregation</Label>
                      <Select
                        value={agg.aggregation}
                        onValueChange={(value: any) => updateAggregation(agg.id, { aggregation: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SUM">SUM</SelectItem>
                          <SelectItem value="AVG">AVG</SelectItem>
                          <SelectItem value="COUNT">COUNT</SelectItem>
                          <SelectItem value="MIN">MIN</SelectItem>
                          <SelectItem value="MAX">MAX</SelectItem>
                          <SelectItem value="DISTINCT">DISTINCT</SelectItem>
                          <SelectItem value="NONE">None (Direct Field)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Variable Name (Optional)</Label>
                      <Input
                        value={agg.variableName || ""}
                        onChange={(e) => updateAggregation(agg.id, { variableName: e.target.value })}
                        placeholder="e.g., revenue"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeAggregation(agg.id)}
                    className="mt-6"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {index < aggregations.length - 1 && (
                  <div className="mt-3 flex items-center gap-2">
                    <Select
                      value={operations[index]?.value || "+"}
                      onValueChange={(value) => {
                        const newOps = [...operations];
                        newOps[index] = { type: "operator", value };
                        setOperations(newOps);
                      }}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="+">+ (Add)</SelectItem>
                        <SelectItem value="-">- (Subtract)</SelectItem>
                        <SelectItem value="*">* (Multiply)</SelectItem>
                        <SelectItem value="/">/ (Divide)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      {formula && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-50 rounded-md font-mono text-sm">
              {formula || "No formula generated yet"}
            </div>
            {variableMappings.length > 0 && (
              <div className="mt-3 space-y-2">
                <Label className="text-sm font-semibold">Field Mappings:</Label>
                <div className="flex flex-wrap gap-2">
                  {variableMappings.map((mapping, idx) => (
                    <Badge key={idx} variant="outline">
                      {mapping.variableName} → {mapping.fieldId}
                      {mapping.aggregation && ` (${mapping.aggregation})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

