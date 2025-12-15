"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Play, CheckCircle2, XCircle, Code, Layout } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { analyticsService, AnalyticsFormula, VariableMapping } from "@/services/api/analyticsService";
import { formService, FormTemplate } from "@/services/api/formService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { VisualFormulaBuilder } from "./VisualFormulaBuilder";

interface FormulaEditorProps {
  formulaId?: string;
  formTemplateId?: string;
  onSave?: (formula: AnalyticsFormula) => void;
  onCancel?: () => void;
}

export function FormulaEditor({
  formulaId,
  formTemplateId: initialFormTemplateId,
  onSave,
  onCancel,
}: FormulaEditorProps) {
  const [formula, setFormula] = useState<Partial<AnalyticsFormula>>({
    name: "",
    description: "",
    formula: "",
    outputType: "number",
    formTemplateId: initialFormTemplateId || "",
  });
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [editMode, setEditMode] = useState<"visual" | "manual">("visual");
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
    if (formulaId) {
      loadFormula();
    }
  }, [formulaId]);

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

  const loadFormula = async () => {
    if (!formulaId) return;
    
    try {
      setLoading(true);
      const loaded = await analyticsService.getFormula(formulaId);
      setFormula(loaded);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load formula",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async () => {
    if (!formula.formula) {
      toast({
        title: "Error",
        description: "Please enter a formula",
        variant: "destructive",
      });
      return;
    }

    try {
      setValidating(true);
      const result = await analyticsService.validateFormula({
        formula: formula.formula,
        formTemplateId: formula.formTemplateId,
      });
      setValidationResult(result);
      
      if (result.syntaxValid) {
        toast({
          title: "Success",
          description: "Formula syntax is valid",
        });
      } else {
        toast({
          title: "Validation Error",
          description: result.error || "Formula syntax is invalid",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to validate formula",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  const handlePreview = async () => {
    if (!formula.formula || !formula.formTemplateId) {
      toast({
        title: "Error",
        description: "Please enter a formula and select a template",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create temporary formula for preview
      const tempFormula = await analyticsService.createFormula({
        ...formula,
        name: "Preview",
      } as AnalyticsFormula);

      const result = await analyticsService.calculate({
        formulaId: tempFormula.id || tempFormula._id || "",
        dateRange: { type: "last30days" },
      });

      setPreviewResult(result);
      
      // Delete temporary formula
      if (tempFormula.id || tempFormula._id) {
        await analyticsService.deleteFormula(tempFormula.id || tempFormula._id || "");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to preview formula",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!formula.name || !formula.formula || !formula.formTemplateId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      let saved: AnalyticsFormula;

      if (formulaId) {
        saved = await analyticsService.updateFormula(formulaId, formula);
      } else {
        saved = await analyticsService.createFormula(formula as AnalyticsFormula);
      }

      // Extract and display preview if available and valid
      if (saved.preview && 
          saved.preview.formatted && 
          saved.preview.formatted !== "N/A" &&
          !saved.preview.error) {
        setPreviewResult(saved.preview);
      } else {
        // Clear preview if it's invalid
        setPreviewResult(null);
      }

      toast({
        title: "Success",
        description: saved.preview && 
                     saved.preview.formatted && 
                     saved.preview.formatted !== "N/A" &&
                     !saved.preview.error
          ? `Formula saved successfully. Preview: ${saved.preview.formatted}`
          : saved.preview?.message 
            ? `Formula saved successfully. ${saved.preview.message}`
            : "Formula saved successfully",
      });

      if (onSave) {
        onSave(saved);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save formula",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{formulaId ? "Edit Formula" : "Create Formula"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formula.name || ""}
            onChange={(e) => setFormula({ ...formula, name: e.target.value })}
            placeholder="e.g., Total Revenue"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formula.description || ""}
            onChange={(e) => setFormula({ ...formula, description: e.target.value })}
            placeholder="Describe what this formula calculates"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="template">Form Template *</Label>
          <Select
            value={formula.formTemplateId || ""}
            onValueChange={(value) => setFormula({ ...formula, formTemplateId: value })}
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

        <div className="space-y-2">
          <Label htmlFor="formula">Formula *</Label>
          <Tabs value={editMode} onValueChange={(v) => setEditMode(v as "visual" | "manual")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="visual" className="gap-2">
                <Layout className="h-4 w-4" />
                Visual Builder
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Code className="h-4 w-4" />
                Manual Edit
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="visual" className="space-y-4">
              <VisualFormulaBuilder
                formTemplateId={
                  typeof formula.formTemplateId === "string" 
                    ? formula.formTemplateId 
                    : (formula.formTemplateId as any)?.id || (formula.formTemplateId as any)?._id || ""
                }
                variableMappings={formula.variableMappings || []}
                formula={formula.formula || ""}
                onFormulaChange={(newFormula, mappings) => {
                  setFormula({
                    ...formula,
                    formula: newFormula,
                    variableMappings: mappings,
                  });
                }}
              />
            </TabsContent>
            
            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="formula-text">Formula Expression</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleValidate}
                    disabled={validating || !formula.formula}
                  >
                    {validating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Validate"
                    )}
                  </Button>
                </div>
                <Textarea
                  id="formula-text"
                  value={formula.formula || ""}
                  onChange={(e) => setFormula({ ...formula, formula: e.target.value })}
                  placeholder="e.g., SUM(field_revenue) * 0.15"
                  rows={6}
                  className="font-mono"
                />
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">
                    Use field IDs and aggregation functions: SUM(), AVG(), COUNT(), MIN(), MAX()
                  </p>
                  <div className="p-3 bg-blue-50 rounded-md">
                    <p className="text-sm font-semibold mb-2">Available Functions:</p>
                    <ul className="text-xs space-y-1 text-gray-700">
                      <li><code>SUM(field_name)</code> - Sum of all values</li>
                      <li><code>AVG(field_name)</code> - Average of all values</li>
                      <li><code>COUNT(field_name)</code> - Count of non-null values</li>
                      <li><code>MIN(field_name)</code> - Minimum value</li>
                      <li><code>MAX(field_name)</code> - Maximum value</li>
                      <li><code>DISTINCT(field_name)</code> - Count of distinct values</li>
                    </ul>
                    <p className="text-sm font-semibold mt-3 mb-2">Operators:</p>
                    <p className="text-xs text-gray-700">+ (addition), - (subtraction), * (multiplication), / (division)</p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {validationResult && (
          <Alert variant={validationResult.syntaxValid ? "default" : "destructive"}>
            {validationResult.syntaxValid ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertDescription>
              {validationResult.syntaxValid
                ? "Formula syntax is valid"
                : validationResult.error || "Formula syntax is invalid"}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="outputType">Output Type</Label>
            <Select
              value={formula.outputType || "number"}
              onValueChange={(value: any) => setFormula({ ...formula, outputType: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="currency">Currency</SelectItem>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="text">Text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayFormat">Display Format</Label>
            <Input
              id="displayFormat"
              value={formula.displayFormat || ""}
              onChange={(e) => setFormula({ ...formula, displayFormat: e.target.value })}
              placeholder="e.g., $0,0.00"
            />
          </div>
        </div>

        {previewResult && (
          <Alert>
            <AlertDescription>
              <strong>Preview:</strong> {previewResult.formatted} (from {previewResult.submissionCount} submissions)
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Formula
              </>
            )}
          </Button>
          <Button variant="outline" onClick={handlePreview}>
            <Play className="mr-2 h-4 w-4" />
            Preview
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

