"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, CheckCircle2, AlertCircle, Wand2, Calculator, X, GripVertical } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FormTemplate } from "./form-builder";
import { formatFormulaWithLabels, convertFieldIdsToLabels, getReferencedFields } from "@/utils/formulaEvaluator";
import { normalizeFormulaToFieldIds } from "@/utils/formulaNormalizer";

// Helper function to escape regex special characters
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
import { api } from "@/services/api";
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
} from "@dnd-kit/core";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface AIFormulaBuilderProps {
  availableFields: Array<{ id: string; label: string; type: string }>;
  formula?: string;
  onFormulaChange?: (formula: string) => void;
  excludeFieldId?: string;
  template?: FormTemplate;
  templateId?: string;
}

interface AIGeneratedFormula {
  formula: string;
  originalFormula?: string; // Original formula with field IDs (if different from formatted formula)
  variableMappings: Array<{
    variableName: string;
    fieldId: string;
    fieldType: string;
    description: string;
  }>;
  description: string;
  outputType?: string;
}

interface AIFormulaResponse {
  success: boolean;
  data: {
    formula: AIGeneratedFormula;
    preview?: any;
  };
}

// Draggable field button component
function DraggableFieldButton({
  field,
  onClick,
}: {
  field: { id: string; label: string; type: string };
  onClick: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `field-${field.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isCalculated = field.type === "calculated";

  return (
    <Button
      ref={setNodeRef}
      style={style}
      variant="outline"
      size="sm"
      className={`text-xs cursor-grab active:cursor-grabbing relative group ${
        isCalculated 
          ? "border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100" 
          : ""
      }`}
      title={isCalculated ? `Calculated Field: ${field.label}` : field.label}
      onClick={onClick}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="h-3 w-3 mr-1 opacity-50 group-hover:opacity-100" />
      + {field.label}
      {isCalculated && (
        <span className="ml-1 text-[10px] opacity-75">(calc)</span>
      )}
    </Button>
  );
}

export function AIFormulaBuilder({
  availableFields,
  formula: initialFormula = "",
  onFormulaChange,
  excludeFieldId,
  template,
  templateId,
}: AIFormulaBuilderProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFormula, setGeneratedFormula] = useState<AIGeneratedFormula | null>(null);
  const [manualFormula, setManualFormula] = useState(initialFormula);
  const [error, setError] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [dropZoneActive, setDropZoneActive] = useState(false);

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Helper function to check if a field type is numeric and can be used in formulas
  const isNumericField = (fieldType: string): boolean => {
    const numericTypes = ['number', 'calculated'];
    return numericTypes.includes(fieldType);
  };

  // Filter fields to only include numeric fields (number, calculated) and exclude the field being edited
  // Exclude: text, select, date, address, user, organization, and other non-numeric types
  const usableFields = availableFields.filter(
    (field) => isNumericField(field.type) && field.id !== excludeFieldId
  );

  // CRITICAL: Rebuild fieldIdToLabelMap whenever availableFields changes
  // This ensures newly added fields are always included in the map
  // IMPORTANT: Include ALL fields (including calculated fields) so formulas can reference other calculated fields
  // CRITICAL: Add ALL variations of field IDs to ensure proper conversion from IDs to labels
  const fieldIdToLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    availableFields.forEach((field) => {
      // Include ALL fields, not just usable ones, so calculated fields can reference other calculated fields
      if (field.id !== excludeFieldId) {
        const label = field.label;
        
        // Add exact field ID
        map[field.id] = label;
        
        // Add with/without field- prefix variations
        if (field.id.startsWith("field-")) {
          const withoutPrefix = field.id.replace(/^field-/, "");
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
              // Add without "field-" prefix but keep the rest
              const withoutFieldPrefix = parts.slice(1).join('-');
              map[withoutFieldPrefix] = label;
            }
          }
        }
      }
    });
    return map;
  }, [availableFields, excludeFieldId]); // Rebuild whenever availableFields or excludeFieldId changes

  // Initialize manual formula from initialFormula
  // IMPORTANT: initialFormula contains field IDs (for storage), but we display labels
  useEffect(() => {
    if (initialFormula) {
      // Store the formula with field IDs internally (for execution/storage)
      setManualFormula(initialFormula);
      // Parse existing formula to show mappings
      parseFormulaMappings(initialFormula);
    } else {
      // Clear formula if no initial formula provided
      setManualFormula("");
    }
  }, [initialFormula]);

  const parseFormulaMappings = (formula: string) => {
    // This function is kept for potential future use
    // Currently not needed but kept for API compatibility
  };

  const generateFormulaWithAI = async () => {
    if (!aiPrompt.trim()) {
      setError("Please describe what you want to calculate");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedFormula(null);

    try {
      if (!templateId) {
        setError("Template ID is required for AI formula generation");
        return;
      }

      const response = await api.post<AIFormulaResponse>(
        "/analytics/generate-formula",
        {
          description: aiPrompt,
          formTemplateId: templateId,
        }
      );

      // Extract formula from nested response structure
      const formulaData = response.data?.data?.formula;
      if (formulaData && formulaData.formula && typeof formulaData.formula === 'string') {
        // Backend now returns:
        // - formula: human-readable labels (for display)
        // - originalFormula: field IDs (for execution/storage)
        // We need to use originalFormula (field IDs) for internal processing and storage
        const formulaWithIds = formulaData.originalFormula || formulaData.formula;
        const formulaWithLabels = formulaData.formula; // Human-readable for display
        
        // Map the response structure to our AIGeneratedFormula interface
        const mappedFormula: AIGeneratedFormula = {
          formula: formulaWithIds, // Store formula with field IDs for execution
          originalFormula: formulaWithLabels, // Store original with labels for display
          variableMappings: formulaData.variableMappings || [],
          description: formulaData.description || aiPrompt,
          outputType: formulaData.outputType,
        };
        
        setGeneratedFormula(mappedFormula);
        setManualFormula(formulaWithIds); // Store field IDs internally
        parseFormulaMappings(formulaWithIds);
        
        if (onFormulaChange) {
          onFormulaChange(formulaWithIds); // Always pass formula with field IDs for storage
        }
      } else {
        console.error("Invalid formula response structure:", response.data);
        setError("AI generated an invalid formula. Please try again.");
      }
    } catch (err: any) {
      console.error("AI formula generation error:", err);
      setError(err.response?.data?.message || err.message || "Failed to generate formula. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleManualFormulaChange = (value: string) => {
    // IMPORTANT: Use centralized formula normalization utility
    // This ensures consistent handling of labels, IDs, and edge cases
    const availableFieldsForNormalization = availableFields.map(f => ({
      id: f.id,
      label: f.label,
      type: f.type
    }));
    
    const { normalizedFormula, errors, warnings } = normalizeFormulaToFieldIds(
      value,
      availableFieldsForNormalization
    );
    
    // Show warnings but don't block (user might be typing)
    if (warnings.length > 0 && process.env.NODE_ENV === 'development') {
      console.warn('Formula normalization warnings:', warnings);
    }
    
    // Update state with normalized formula (always with field IDs)
    setManualFormula(normalizedFormula);
    parseFormulaMappings(normalizedFormula);
    
    // Notify parent with normalized formula (field IDs only)
    if (onFormulaChange) {
      onFormulaChange(normalizedFormula);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
    setDropZoneActive(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);
    setDropZoneActive(false);

    if (over && over.id === "formula-drop-zone") {
      // Extract field ID from drag ID (format: "field-{fieldId}")
      const fieldId = String(active.id).replace(/^field-/, "");
      const field = usableFields.find((f) => f.id === fieldId);
      
      if (field) {
        const currentValue = formattedFormula || formulaString;
        const newValue = currentValue
          ? `${currentValue} ${field.label}`
          : field.label;
        handleManualFormulaChange(newValue);
      }
    }
  };

  const handleDragOver = (event: any) => {
    if (event.over?.id === "formula-drop-zone") {
      setDropZoneActive(true);
    } else {
      setDropZoneActive(false);
    }
  };

  const applyGeneratedFormula = () => {
    if (generatedFormula?.formula) {
      setManualFormula(generatedFormula.formula);
      parseFormulaMappings(generatedFormula.formula);
      if (onFormulaChange) {
        onFormulaChange(generatedFormula.formula);
      }
      setActiveTab("manual");
    }
  };

  // Ensure manualFormula is always a string
  const formulaString = typeof manualFormula === 'string' ? manualFormula : String(manualFormula || '');
  
  const formattedFormula = formulaString
    ? formatFormulaWithLabels(formulaString, fieldIdToLabelMap)
    : "";

  const referencedLabels = formulaString
    ? convertFieldIdsToLabels(getReferencedFields(formulaString), fieldIdToLabelMap)
    : [];

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ai" | "manual")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Generator
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        {/* AI Tab */}
        <TabsContent value="ai" className="space-y-4 mt-4">
          <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wand2 className="h-5 w-5 text-blue-600" />
                AI Formula Generator
              </CardTitle>
              <CardDescription>
                Describe what you want to calculate in plain English, and AI will generate the formula for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-prompt">What do you want to calculate?</Label>
                <Textarea
                  id="ai-prompt"
                  placeholder="e.g., Calculate total profit by multiplying annual revenue by profitability margin percentage, then divide by 100"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  Be specific about which fields to use and what calculation you need
                </p>
              </div>

              <Button
                onClick={generateFormulaWithAI}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Formula...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Formula
                  </>
                )}
              </Button>

              {error && (
                <Alert className="border-blue-200 bg-blue-50">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">{error}</AlertDescription>
                </Alert>
              )}

              {generatedFormula && (
                <Card className="border-blue-200 bg-blue-50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-blue-600" />
                        Generated Formula
                      </CardTitle>
                      <Button
                        onClick={applyGeneratedFormula}
                        size="sm"
                        variant="outline"
                        className="border-blue-300 text-blue-700 hover:bg-blue-100"
                      >
                        Use This Formula
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-600">Formula:</Label>
                      <div className="mt-1 p-3 bg-white rounded border border-blue-200 font-mono text-sm break-all">
                        {generatedFormula.originalFormula || formatFormulaWithLabels(generatedFormula.formula, fieldIdToLabelMap)}
                      </div>
                    </div>

                    {generatedFormula.description && (
                      <div>
                        <Label className="text-xs text-gray-600">Description:</Label>
                        <p className="mt-1 text-sm text-gray-700">{generatedFormula.description}</p>
                      </div>
                    )}

                    {generatedFormula.variableMappings && generatedFormula.variableMappings.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-600 mb-2 block">Field Mappings:</Label>
                        <div className="flex flex-wrap gap-2">
                          {generatedFormula.variableMappings.map((mapping, idx) => {
                            const fieldLabel = fieldIdToLabelMap[mapping.fieldId] || mapping.fieldId;
                            return (
                              <Badge 
                                key={idx}
                                variant="outline" 
                                className="bg-white border-blue-200 text-blue-700 text-xs"
                                title={mapping.description}
                              >
                                {mapping.variableName} → {fieldLabel}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Available Fields Reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Available Fields</CardTitle>
              <CardDescription className="text-xs">
                These fields can be used in your formula
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usableFields.length === 0 ? (
                <p className="text-sm text-gray-500 italic">
                  No fields available. Add fields to use in calculations.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {usableFields.map((field) => (
                    <Badge 
                      key={field.id} 
                      variant="outline" 
                      className={`text-xs border-2 ${
                        field.type === "calculated"
                          ? "bg-purple-50 text-purple-700 border-purple-300 hover:bg-purple-100"
                          : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      }`}
                      title={field.type === "calculated" ? "Calculated Field" : field.type}
                    >
                      {field.label}
                      {field.type === "calculated" && (
                        <span className="ml-1 text-[10px] opacity-75">(calc)</span>
                      )}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manual Tab */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Manual Formula Entry</CardTitle>
              <CardDescription className="text-xs">
                Enter your formula using field labels or IDs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="manual-formula">Formula Expression</Label>
                <div
                  id="formula-drop-zone"
                  className={`relative border-2 border-dashed rounded-md transition-colors ${
                    dropZoneActive
                      ? "border-blue-400 bg-blue-50"
                      : "border-gray-200 bg-transparent"
                  }`}
                >
                  <Textarea
                    id="manual-formula"
                    value={formattedFormula || ""}
                    onChange={(e) => handleManualFormulaChange(e.target.value)}
                    placeholder="e.g., Annual Revenue * Profitability Margin / 100"
                    rows={4}
                    className="font-mono text-sm border-0 focus-visible:ring-0"
                    onDrop={(e) => {
                      e.preventDefault();
                      // Handle drop if needed (drag and drop is handled by DndContext)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                  />
                  {dropZoneActive && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded text-sm font-medium">
                        Drop field here
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  Drag fields from below or type manually. Use operators: +, -, *, /, (, )
                </p>
              </div>

              {usableFields.length > 0 && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                >
                  <div>
                    <Label className="text-xs mb-2 block">Quick Add Fields (Drag & Drop or Click):</Label>
                    <div className="flex flex-wrap gap-2">
                      {usableFields.map((field) => (
                        <DraggableFieldButton
                          key={field.id}
                          field={field}
                          onClick={() => {
                            const currentValue = formattedFormula || formulaString;
                            const newValue = currentValue
                              ? `${currentValue} ${field.label}`
                              : field.label;
                            handleManualFormulaChange(newValue);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <DragOverlay>
                    {activeDragId ? (
                      <div className="p-2 bg-blue-100 border-2 border-blue-300 rounded shadow-lg">
                        <span className="text-sm font-medium text-blue-700">
                          {usableFields.find((f) => `field-${f.id}` === activeDragId)?.label || "Dragging..."}
                        </span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              )}
            </CardContent>
          </Card>

          {/* Formula Preview */}
          {formulaString && (
            <Card className="border-blue-200 bg-blue-50/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  Formula Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-gray-600">Formula:</Label>
                  <div className="mt-1 p-3 bg-white rounded border border-blue-200 font-mono text-sm break-all">
                    {formattedFormula || formulaString}
                  </div>
                </div>

                {referencedLabels.length > 0 && (
                  <div>
                    <Label className="text-xs text-gray-600 mb-2 block">Fields Used:</Label>
                    <div className="flex flex-wrap gap-2">
                      {referencedLabels.map((label: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                          {label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

