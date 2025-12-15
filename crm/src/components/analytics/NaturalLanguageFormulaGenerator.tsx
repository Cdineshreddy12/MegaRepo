"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { analyticsService, FormulaGenerationResult } from "@/services/api/analyticsService";
import { formService, FormTemplate } from "@/services/api/formService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface NaturalLanguageFormulaGeneratorProps {
  onFormulaGenerated?: (result: FormulaGenerationResult) => void;
  formTemplateId?: string;
}

export function NaturalLanguageFormulaGenerator({
  onFormulaGenerated,
  formTemplateId: initialFormTemplateId,
}: NaturalLanguageFormulaGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialFormTemplateId || "");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<FormulaGenerationResult | null>(null);
  const { toast } = useToast();

  // Load templates when dialog opens
  const loadTemplates = async () => {
    if (templates.length > 0) return;
    
    try {
      setLoading(true);
      const response = await formService.getTemplates({ isActive: true });
      setTemplates(response.data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load form templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      loadTemplates();
      setResult(null);
      setDescription("");
    }
  };

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({
        title: "Error",
        description: "Please enter a description",
        variant: "destructive",
      });
      return;
    }

    if (!selectedTemplateId) {
      toast({
        title: "Error",
        description: "Please select a form template",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      setResult(null);

      const generated = await analyticsService.generateFormula({
        description: description.trim(),
        formTemplateId: selectedTemplateId,
      });

      setResult(generated);
      
      toast({
        title: "Success",
        description: "Formula generated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate formula",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleUseFormula = () => {
    if (result && onFormulaGenerated) {
      onFormulaGenerated(result);
      setOpen(false);
      setResult(null);
      setDescription("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Generate Formula with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Formula from Natural Language</DialogTitle>
          <DialogDescription>
            Describe what you want to calculate, and AI will generate the formula for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="template">Form Template</Label>
            <Select
              value={selectedTemplateId}
              onValueChange={setSelectedTemplateId}
              disabled={loading}
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
            <Label htmlFor="description">What do you want to calculate?</Label>
            <Textarea
              id="description"
              placeholder="e.g., Calculate total revenue this month, Show me average deal size, Count all closed deals..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <p className="text-sm text-gray-500">
              Describe your analytics requirement in plain English. AI will generate the appropriate formula.
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!description.trim() || !selectedTemplateId || generating}
            className="w-full"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Formula
              </>
            )}
          </Button>

          {result && (
            <div className="space-y-4 border-t pt-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Formula generated successfully!
                  {result.preview && 
                   result.preview.formatted && 
                   result.preview.formatted !== "N/A" &&
                   !result.preview.error ? (
                    <> Preview: <strong>{result.preview.formatted}</strong></>
                  ) : (
                    <> Preview unavailable{result.preview?.message ? `: ${result.preview.message}` : ''}</>
                  )}
                </AlertDescription>
              </Alert>
              
              {result.preview && 
               result.preview.formatted && 
               result.preview.formatted !== "N/A" &&
               !result.preview.error && (
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="text-2xl font-bold text-center mb-2">
                    {result.preview.formatted}
                  </div>
                  {result.preview.submissionCount !== undefined && (
                    <p className="text-sm text-gray-500 text-center">
                      From {result.preview.submissionCount} submission{result.preview.submissionCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              )}
              
              {result.preview && 
               (result.preview.formatted === "N/A" || result.preview.error) && 
               result.preview.message && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {result.preview.message}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label>Generated Formula</Label>
                <div className="p-3 bg-gray-50 rounded-md font-mono text-sm">
                  {result.formula.formula || "Pipeline aggregation"}
                </div>
              </div>

              {result.formula.variableMappings && result.formula.variableMappings.length > 0 && (
                <div className="space-y-2">
                  <Label>Field Mappings</Label>
                  <div className="space-y-1">
                    {result.formula.variableMappings.map((mapping, idx) => (
                      <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                        <span className="font-semibold">{mapping.variableName}</span> →{" "}
                        <span className="font-mono">{mapping.fieldId}</span>
                        {mapping.aggregation && (
                          <span className="text-gray-500 ml-2">({mapping.aggregation})</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUseFormula} className="flex-1">
                  Use This Formula
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setDescription("");
                  }}
                >
                  Generate Another
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

