"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Edit, Trash2, Play, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { analyticsService, AnalyticsFormula } from "@/services/api/analyticsService";
import { NaturalLanguageFormulaGenerator } from "./NaturalLanguageFormulaGenerator";
import { FormulaEditor } from "./FormulaEditor";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface FormulaListProps {
  formTemplateId?: string;
  onSelectFormula?: (formula: AnalyticsFormula) => void;
}

export function FormulaList({ formTemplateId, onSelectFormula }: FormulaListProps) {
  const [formulas, setFormulas] = useState<AnalyticsFormula[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingFormula, setEditingFormula] = useState<AnalyticsFormula | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFormulas();
  }, [formTemplateId]);

  const loadFormulas = async () => {
    try {
      setLoading(true);
      const data = await analyticsService.getFormulas({
        formTemplateId,
      });
      console.log('📊 Formulas loaded:', data.length);
      console.log('📊 First formula preview:', data[0]?.preview);
      setFormulas(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load formulas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this formula?")) {
      return;
    }

    try {
      await analyticsService.deleteFormula(id);
      toast({
        title: "Success",
        description: "Formula deleted successfully",
      });
      loadFormulas();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete formula",
        variant: "destructive",
      });
    }
  };

  const handleCalculate = async (formula: AnalyticsFormula) => {
    try {
      const result = await analyticsService.calculate({
        formulaId: formula.id || formula._id || "",
        dateRange: { type: "last30days" },
      });
      
      toast({
        title: "Calculation Result",
        description: `${formula.name}: ${result.formatted}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to calculate",
        variant: "destructive",
      });
    }
  };

  const handleFormulaGenerated = (result: any) => {
    loadFormulas();
    if (onSelectFormula && result.formula) {
      onSelectFormula(result.formula);
    }
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingFormula(null);
    loadFormulas();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Analytics Formulas</h2>
        <div className="flex gap-2">
          <NaturalLanguageFormulaGenerator
            formTemplateId={formTemplateId}
            onFormulaGenerated={handleFormulaGenerated}
          />
          <Button onClick={() => {
            setEditingFormula(null);
            setShowEditor(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create Formula
          </Button>
        </div>
      </div>

      {formulas.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-gray-500">No formulas found. Create your first formula!</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Formula</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Output Type</TableHead>
                <TableHead>Preview</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formulas.map((formula) => (
                <TableRow key={formula.id || formula._id}>
                  <TableCell className="font-medium">{formula.name}</TableCell>
                  <TableCell>
                    <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                      {formula.formula || "Pipeline"}
                    </code>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <div className="text-sm text-gray-600">
                      {formula.description || formula.preview?.explanation || "No description"}
                    </div>
                  </TableCell>
                  <TableCell>{formula.outputType || "number"}</TableCell>
                  <TableCell>
                    {(() => {
                      const hasPreview = formula.preview && 
                                         formula.preview.formatted && 
                                         formula.preview.formatted !== "N/A" &&
                                         !formula.preview.error;
                      
                      if (!hasPreview) {
                        console.log('⚠️ Invalid preview for formula:', {
                          id: formula.id || formula._id,
                          name: formula.name,
                          preview: formula.preview,
                          formatted: formula.preview?.formatted,
                          error: formula.preview?.error,
                          message: formula.preview?.message
                        });
                      }
                      
                      return hasPreview ? (
                        <span className="font-semibold text-green-600">
                          {formula.preview.formatted}
                        </span>
                      ) : (
                        <span className="text-gray-400" title={formula.preview?.message || "No preview available"}>
                          N/A
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell>{formula.usageCount || 0} times</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCalculate(formula)}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFormula(formula);
                          setShowEditor(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(formula.id || formula._id || "")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <FormulaEditor
            formulaId={editingFormula?.id || editingFormula?._id}
            formTemplateId={formTemplateId}
            onSave={handleSave}
            onCancel={() => setShowEditor(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

