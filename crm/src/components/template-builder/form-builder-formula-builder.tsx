"use client";

import { useState, useEffect, useRef } from "react";
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
import type { FormField } from "./form-builder";

interface FormulaPart {
  id: string;
  type: "field" | "operator" | "constant" | "parenthesis";
  value: string;
}

interface FormBuilderFormulaBuilderProps {
  availableFields: Array<{ id: string; label: string; type: string }>;
  formula?: string;
  onFormulaChange?: (formula: string) => void;
  excludeFieldId?: string; // Field ID to exclude (the calculated field itself)
}

export function FormBuilderFormulaBuilder({
  availableFields,
  formula: initialFormula = "",
  onFormulaChange,
  excludeFieldId,
}: FormBuilderFormulaBuilderProps) {
  const [formulaParts, setFormulaParts] = useState<FormulaPart[]>([]);
  const [formula, setFormula] = useState(initialFormula);

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

  // Create mapping from field IDs to labels and vice versa
  const fieldIdToLabelMap: Record<string, string> = {};
  const fieldLabelToIdMap: Record<string, string> = {};
  usableFields.forEach((field) => {
    fieldIdToLabelMap[field.id] = field.label;
    // Normalize label: lowercase, spaces to underscores for matching
    const normalizedLabel = field.label.toLowerCase().replace(/\s+/g, '_');
    fieldLabelToIdMap[normalizedLabel] = field.id;
    fieldLabelToIdMap[field.label] = field.id;
  });

  // Track if we've already parsed to prevent re-parsing
  const parsedFormulaRef = useRef<string>("");

  useEffect(() => {
    // Only parse if formula changed externally and we haven't parsed it yet
    if (initialFormula && initialFormula.trim() !== "" && initialFormula !== parsedFormulaRef.current) {
      parsedFormulaRef.current = initialFormula;
      parseFormula(initialFormula);
    } else if (!initialFormula && formulaParts.length > 0) {
      // Clear if formula is cleared
      parsedFormulaRef.current = "";
      setFormulaParts([]);
      setFormula("");
    }
  }, [initialFormula]);

  useEffect(() => {
    // Only generate if we have parts
    if (formulaParts.length > 0) {
      generateFormula();
    }
  }, [formulaParts]);

  const parseFormula = (formulaStr: string) => {
    // Clean the formula string first
    const cleanedFormula = formulaStr.trim();
    if (!cleanedFormula) {
      setFormulaParts([]);
      return;
    }
    
    // Parse existing formula into parts using a tokenizer approach
    const parts: FormulaPart[] = [];
    
    // Tokenize the formula string
    const tokens: Array<{ index: number; value: string; type: "field" | "operator" | "parenthesis" | "constant" }> = [];
    
    let i = 0;
    const len = cleanedFormula.length;
    
    while (i < len) {
      // Skip whitespace
      if (/\s/.test(cleanedFormula[i])) {
        i++;
        continue;
      }
      
      // Check for field ID (field-...) - convert to label for display
      if (cleanedFormula.substring(i).startsWith('field-')) {
        const fieldMatch = cleanedFormula.substring(i).match(/^field-[a-zA-Z0-9_-]+/);
        if (fieldMatch) {
          const fieldId = fieldMatch[0];
          // Convert field ID to label for display
          const fieldLabel = fieldIdToLabelMap[fieldId] || fieldId;
          tokens.push({ index: i, value: fieldLabel, type: "field" });
          i += fieldMatch[0].length;
          continue;
        }
      }
      
      // Check for field labels (if they exist in the formula)
      // Look for capitalized words or multi-word labels
      for (const field of usableFields) {
        const labelPattern = new RegExp(`^${escapeRegex(field.label)}`, 'i');
        if (labelPattern.test(cleanedFormula.substring(i))) {
          tokens.push({ index: i, value: field.label, type: "field" });
          i += field.label.length;
          continue;
        }
      }
      
      // Check for parentheses
      if (cleanedFormula[i] === '(' || cleanedFormula[i] === ')') {
        tokens.push({ index: i, value: cleanedFormula[i], type: "parenthesis" });
        i++;
        continue;
      }
      
      // Check for operators (only single character operators)
      if (/[\+\-\*\/]/.test(cleanedFormula[i])) {
        tokens.push({ index: i, value: cleanedFormula[i], type: "operator" });
        i++;
        continue;
      }
      
      // Check for numbers
      const numberMatch = cleanedFormula.substring(i).match(/^\d+(\.\d+)?/);
      if (numberMatch) {
        // Verify this number is not part of a field ID
        // Look back to see if we're inside a field- pattern
        let isPartOfFieldId = false;
        for (let j = Math.max(0, i - 50); j < i; j++) {
          const substr = cleanedFormula.substring(j, i + numberMatch[0].length);
          if (substr.match(/field-[a-zA-Z0-9_-]*\d+(\.\d+)?/)) {
            isPartOfFieldId = true;
            break;
          }
        }
        
        if (!isPartOfFieldId) {
          tokens.push({ index: i, value: numberMatch[0], type: "constant" });
          i += numberMatch[0].length;
          continue;
        }
      }
      
      // If we get here, skip the character (might be whitespace or unknown)
      i++;
    }
    
    // Build parts array from tokens, ensuring no duplicates by position
    // Use a map to track tokens by their position to avoid duplicates
    const tokenMap = new Map<number, typeof tokens[0]>();
    tokens.forEach((token) => {
      // Only keep the first token at each position
      if (!tokenMap.has(token.index)) {
        tokenMap.set(token.index, token);
      }
    });
    
    // Convert map to sorted array
    const uniqueTokens = Array.from(tokenMap.values()).sort((a, b) => a.index - b.index);
    
    uniqueTokens.forEach((token, idx) => {
      parts.push({
        id: `part-${idx}-${Date.now()}-${Math.random()}`,
        type: token.type,
        value: token.value,
      });
    });
    
    setFormulaParts(parts);
  };

  const generateFormula = () => {
    if (formulaParts.length === 0) {
      setFormula("");
      if (onFormulaChange) {
        onFormulaChange("");
      }
      return;
    }
    
    // Validate formula parts before generating - remove incomplete operations
    const validParts: FormulaPart[] = [];
    for (let i = 0; i < formulaParts.length; i++) {
      const part = formulaParts[i];
      const nextPart = i < formulaParts.length - 1 ? formulaParts[i + 1] : null;
      
      // Skip operator at the end (incomplete operation)
      if (part.type === "operator" && !nextPart) {
        console.warn('[FormBuilderFormulaBuilder] Skipping operator at end');
        continue;
      }
      
      // Skip operator followed by closing paren (incomplete operation)
      if (part.type === "operator" && nextPart && nextPart.value === ")") {
        console.warn('[FormBuilderFormulaBuilder] Skipping operator before closing paren');
        continue;
      }
      
      validParts.push(part);
    }
    
    // If we removed parts, update state
    if (validParts.length !== formulaParts.length) {
      setFormulaParts(validParts);
      return; // Will regenerate with valid parts
    }
    
    // Generate formula with proper spacing
    let generated = "";
    for (let i = 0; i < validParts.length; i++) {
      const part = validParts[i];
      const prevPart = i > 0 ? validParts[i - 1] : null;
      
      // Determine if we need a space before this part
      let needsSpaceBefore = false;
      
      if (prevPart && generated.length > 0) {
        const prevValue = prevPart.value;
        const currValue = part.value;
        const prevType = prevPart.type;
        const currType = part.type;
        
        // Space needed:
        // - Between field/constant and operator
        if ((prevType === "field" || prevType === "constant") && currType === "operator") {
          needsSpaceBefore = true;
        }
        // - Between operator and field/constant
        else if (prevType === "operator" && (currType === "field" || currType === "constant")) {
          needsSpaceBefore = true;
        }
        // - Between closing paren and operator
        else if (prevValue === ")" && currType === "operator") {
          needsSpaceBefore = true;
        }
        // - Between field/constant and opening paren
        else if ((prevType === "field" || prevType === "constant") && currValue === "(") {
          needsSpaceBefore = true;
        }
        // - Between closing paren and field/constant
        else if (prevValue === ")" && (currType === "field" || currType === "constant")) {
          needsSpaceBefore = true;
        }
        // - Between operator and opening paren
        else if (prevType === "operator" && currValue === "(") {
          needsSpaceBefore = true;
        }
        // No space needed:
        // - After opening paren
        // - Before closing paren
      }
      
      // Add space if needed
      if (needsSpaceBefore) {
        generated += " ";
      }
      
      generated += part.value;
    }
    
    // Clean up any double spaces
    generated = generated.replace(/\s+/g, " ").trim();
    
    // Convert field labels back to field IDs for storage
    let formulaWithIds = generated;
    // Sort labels by length (longest first) to avoid partial replacements
    const sortedLabels = Object.keys(fieldLabelToIdMap).sort((a, b) => b.length - a.length);
    sortedLabels.forEach((label) => {
      // Use word boundaries to match whole words only
      const regex = new RegExp(`\\b${escapeRegex(label)}\\b`, 'g');
      formulaWithIds = formulaWithIds.replace(regex, fieldLabelToIdMap[label]);
    });
    
    setFormula(generated); // Display formula with labels
    if (onFormulaChange) {
      onFormulaChange(formulaWithIds); // Save formula with IDs
    }
  };
  
  // Helper function to escape regex special characters
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // Helper function to escape regex special characters
  function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  const addPart = (type: "field" | "operator" | "constant" | "parenthesis", value?: string) => {
    let partValue = value;
    
    if (type === "operator" && !value) {
      partValue = "+";
    } else if (type === "parenthesis" && !value) {
      partValue = "(";
    } else if (type === "constant" && !value) {
      partValue = "0";
    }
    
    // Prevent adding closing paren if last part is an operator (incomplete operation)
    if (type === "parenthesis" && partValue === ")") {
      const lastPart = formulaParts[formulaParts.length - 1];
      if (lastPart && lastPart.type === "operator") {
        console.warn('[FormBuilderFormulaBuilder] Cannot add closing paren after operator - incomplete operation');
        // Auto-add a default value (100) for percentage calculations when division is involved
        if (lastPart.value === "/") {
          // Add 100 before the closing paren for percentage calculations
          setFormulaParts([
            ...formulaParts,
            { id: `part-${Date.now()}-${Math.random()}`, type: "constant", value: "100" },
            { id: `part-${Date.now() + 1}-${Math.random()}`, type, value: partValue || "" }
          ]);
          return;
        }
        // For other operators, just prevent adding the closing paren
        return;
      }
    }
    
    // Prevent adding operator if last part is also an operator
    if (type === "operator" && formulaParts.length > 0) {
      const lastPart = formulaParts[formulaParts.length - 1];
      if (lastPart.type === "operator") {
        // Replace the last operator instead of adding a new one
        setFormulaParts([...formulaParts.slice(0, -1), { id: `part-${Date.now()}-${Math.random()}`, type, value: partValue || "" }]);
        return;
      }
    }
    
    const newPart: FormulaPart = {
      id: `part-${Date.now()}-${Math.random()}`,
      type,
      value: partValue || "",
    };
    
    setFormulaParts([...formulaParts, newPart]);
  };

  const updatePart = (id: string, updates: Partial<FormulaPart>) => {
    setFormulaParts(
      formulaParts.map((part) => (part.id === id ? { ...part, ...updates } : part))
    );
  };

  const removePart = (id: string) => {
    setFormulaParts(formulaParts.filter((part) => part.id !== id));
  };

  const movePart = (id: string, direction: "left" | "right") => {
    const index = formulaParts.findIndex((p) => p.id === id);
    if (index === -1) return;
    
    const newIndex = direction === "left" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formulaParts.length) return;
    
    const newParts = [...formulaParts];
    [newParts[index], newParts[newIndex]] = [newParts[newIndex], newParts[index]];
    setFormulaParts(newParts);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Available Fields</Label>
        <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md min-h-[60px]">
          {usableFields.length === 0 ? (
            <p className="text-sm text-gray-500 italic w-full">
              No numeric fields available. Add number fields to use in calculations.
            </p>
          ) : (
            usableFields.map((field) => (
              <Badge
                key={field.id}
                variant="outline"
                className="cursor-pointer hover:bg-blue-50"
                onClick={() => addPart("field", field.label)}
              >
                {field.label} ({field.type})
              </Badge>
            ))
          )}
        </div>
        <p className="text-xs text-gray-500">
          Click on a field badge above to add it to your formula
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Formula Builder</CardTitle>
            <div className="flex gap-2">
              <Button
                onClick={() => addPart("operator", "+")}
                size="sm"
                variant="outline"
              >
                + Add
              </Button>
              <Button
                onClick={() => addPart("operator", "-")}
                size="sm"
                variant="outline"
              >
                - Subtract
              </Button>
              <Button
                onClick={() => addPart("operator", "*")}
                size="sm"
                variant="outline"
              >
                × Multiply
              </Button>
              <Button
                onClick={() => addPart("operator", "/")}
                size="sm"
                variant="outline"
              >
                ÷ Divide
              </Button>
              <Button
                onClick={() => addPart("parenthesis", "(")}
                size="sm"
                variant="outline"
              >
                ( )
              </Button>
              <Button
                onClick={() => addPart("constant")}
                size="sm"
                variant="outline"
              >
                Number
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {formulaParts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No formula parts added yet.</p>
              <p className="text-sm mt-1">
                Click on field badges above or use operators to build your formula.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {formulaParts.map((part, index) => (
                <div
                  key={part.id}
                  className="flex items-center gap-2 p-2 border rounded-md bg-white"
                >
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePart(part.id, "left")}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      ←
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => movePart(part.id, "right")}
                      disabled={index === formulaParts.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      →
                    </Button>
                  </div>

                  <div className="flex-1">
                    {part.type === "field" ? (
                      <Select
                        value={part.value}
                        onValueChange={(value) => updatePart(part.id, { value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select field" />
                        </SelectTrigger>
                        <SelectContent>
                          {usableFields.map((field) => (
                            <SelectItem key={field.id} value={field.id}>
                              {field.label} ({field.type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : part.type === "operator" ? (
                      <Select
                        value={part.value}
                        onValueChange={(value) => updatePart(part.id, { value })}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="+">+ (Add)</SelectItem>
                          <SelectItem value="-">- (Subtract)</SelectItem>
                          <SelectItem value="*">× (Multiply)</SelectItem>
                          <SelectItem value="/">÷ (Divide)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : part.type === "parenthesis" ? (
                      <Select
                        value={part.value}
                        onValueChange={(value) => updatePart(part.id, { value })}
                      >
                        <SelectTrigger className="h-8 w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="(">( (Open)</SelectItem>
                          <SelectItem value=")">) (Close)</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        type="number"
                        value={part.value}
                        onChange={(e) => updatePart(part.id, { value: e.target.value })}
                        placeholder="Enter number"
                        className="h-8"
                      />
                    )}
                  </div>

                  <Badge variant="secondary" className="min-w-[80px] justify-center">
                    {part.type === "field"
                      ? "Field"
                      : part.type === "operator"
                      ? "Operator"
                      : part.type === "parenthesis"
                      ? "Parenthesis"
                      : "Number"}
                  </Badge>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removePart(part.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {formula && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generated Formula</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-3 bg-gray-50 rounded-md font-mono text-sm break-all">
              {formula || "No formula generated yet"}
            </div>
            {formula && (
              <div className="mt-2 text-xs text-gray-500">
                <p>This formula will be evaluated for each form submission.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

