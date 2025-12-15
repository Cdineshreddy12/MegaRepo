"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, Wand2, RefreshCw, Info } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { FormTemplate } from "@/services/api/formService";
import { formLayoutAiService, FormLayoutAnalysis, MissingField } from "@/services/api/formLayoutAiService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
// Using a simple state-based collapsible instead of importing Collapsible component

interface LayoutAiSuggestionsProps {
  template: FormTemplate;
  onApplySuggestions: (updatedTemplate: FormTemplate) => void;
  onSuggestionGenerated?: (analysis: FormLayoutAnalysis) => void;
  onAddField?: (field: MissingField) => void;
}

export function LayoutAiSuggestions({
  template,
  onApplySuggestions,
  onSuggestionGenerated,
  onAddField,
}: LayoutAiSuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<FormLayoutAnalysis | null>(null);
  const [applied, setApplied] = useState(false);
  const [businessRequirements, setBusinessRequirements] = useState("");
  const [showRequirements, setShowRequirements] = useState(false);
  const { toast } = useToast();

  const handleAnalyze = async () => {
    // Allow AI analysis even with empty templates - AI can suggest fields to add
    setLoading(true);
    setApplied(false);
    try {
      const result = await formLayoutAiService.suggestLayout(
        template, 
        businessRequirements.trim() || undefined
      );
      setAnalysis(result);
      onSuggestionGenerated?.(result);
      toast({
        title: "Analysis Complete",
        description: `Generated ${result.missingFields?.length || 0} missing field suggestions, ${result.fieldSuggestions.length} field layout suggestions, and ${result.sectionSuggestions.length} section suggestions`,
      });
    } catch (error: any) {
      console.error("Layout analysis error:", error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze form layout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAll = () => {
    if (!analysis) return;

    try {
      const updatedTemplate = formLayoutAiService.applySuggestionsLocally(template, analysis);
      onApplySuggestions(updatedTemplate);
      setApplied(true);
      toast({
        title: "Suggestions Applied",
        description: "All layout suggestions have been applied to your form template",
      });
    } catch (error: any) {
      toast({
        title: "Apply Failed",
        description: error.message || "Failed to apply suggestions",
        variant: "destructive",
      });
    }
  };

  const handleApplyField = (fieldId: string) => {
    if (!analysis) return;

    const fieldSuggestion = analysis.fieldSuggestions.find(s => s.fieldId === fieldId);
    if (!fieldSuggestion) return;

    const updatedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;
    updatedTemplate.sections?.forEach(section => {
      const field = section.fields?.find(f => f.id === fieldId);
      if (field) {
        if (!field.metadata) {
          field.metadata = {};
        }
        Object.assign(field.metadata, fieldSuggestion.suggestions);
      }
    });

    onApplySuggestions(updatedTemplate);
    toast({
      title: "Field Updated",
      description: `Applied suggestions for field`,
    });
  };

  const handleApplySection = (sectionId: string) => {
    if (!analysis) return;

    const sectionSuggestion = analysis.sectionSuggestions.find(s => s.sectionId === sectionId);
    if (!sectionSuggestion) return;

    const updatedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;
    const section = updatedTemplate.sections?.find(s => s.id === sectionId);
    if (section) {
      if (!section.metadata) {
        section.metadata = {};
      }
      Object.assign(section.metadata, sectionSuggestion.suggestions);
    }

    onApplySuggestions(updatedTemplate);
    toast({
      title: "Section Updated",
      description: `Applied suggestions for section`,
    });
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) return "default";
    if (confidence >= 0.6) return "secondary";
    return "outline";
  };

  const totalFields = template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Layout Suggestions</CardTitle>
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Analyze Layout
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Get AI-powered suggestions for optimal field widths, alignments, and layouts. AI will also suggest missing CRM fields based on entity type and your business requirements.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Business Requirements Input */}
        <div className="space-y-2 border rounded-lg p-4">
          <Button
            variant="ghost"
            onClick={() => setShowRequirements(!showRequirements)}
            className="w-full justify-between p-0 h-auto"
          >
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-primary" />
              <span>Add Business Requirements (Optional)</span>
            </div>
            {showRequirements ? "Hide" : "Show"}
          </Button>
          {showRequirements && (
            <div className="space-y-2 pt-2">
              <Label htmlFor="business-requirements" className="text-sm">
                Describe your business requirements, industry, workflow, or specific needs:
              </Label>
              <Textarea
                id="business-requirements"
                placeholder="Example: We're a B2B manufacturing company. Our sales team needs to track product specifications, delivery timelines, and payment terms. We work with distributors across multiple zones and need to track credit limits and payment history..."
                value={businessRequirements}
                onChange={(e) => setBusinessRequirements(e.target.value)}
                rows={4}
                className="text-sm"
              />
              <p className="text-xs text-muted-foreground">
                The AI will use this information to suggest relevant fields, alignments, and layouts specific to your business needs.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {totalFields === 0 && (
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Add sections and fields to your template before analyzing layout suggestions
            </AlertDescription>
          </Alert>
        </CardContent>
      )}

      {analysis && (
        <CardContent className="space-y-6">
          {/* Confidence Score */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <span className="text-sm font-medium">Confidence Score</span>
            <Badge variant={getConfidenceBadge(analysis.confidence)}>
              {Math.round(analysis.confidence * 100)}%
            </Badge>
          </div>

          {/* Overall Recommendations */}
          {analysis.overallRecommendations.length > 0 && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="font-semibold mb-2">Overall Recommendations:</div>
                <ul className="list-disc list-inside space-y-1">
                  {analysis.overallRecommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Missing CRM Fields */}
          {analysis.missingFields && analysis.missingFields.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Missing CRM Fields</h4>
                <Badge variant="secondary">{analysis.missingFields.length} fields</Badge>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analysis.missingFields.map((field: MissingField) => (
                  <Card key={field.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium mb-1">
                          {field.label}
                          {field.required && (
                            <Badge variant="destructive" className="ml-2 text-xs">Required</Badge>
                          )}
                        </div>
                        <Badge variant="outline" className="mr-2 mb-2">
                          {field.type}
                        </Badge>
                        {field.helpText && (
                          <p className="text-sm text-muted-foreground mb-2">{field.helpText}</p>
                        )}
                        {field.reasoning && (
                          <p className="text-xs italic text-muted-foreground">{field.reasoning}</p>
                        )}
                      </div>
                      {onAddField && (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => onAddField(field)}
                          className="ml-4"
                        >
                          Add Field
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
              <Separator className="my-6" />
            </div>
          )}

          {/* Section Suggestions */}
          {analysis.sectionSuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Section Layouts</h4>
                <Button
                  onClick={handleApplyAll}
                  size="sm"
                  variant="outline"
                  disabled={applied}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Applied
                    </>
                  ) : (
                    "Apply All Sections"
                  )}
                </Button>
              </div>
              <div className="space-y-3">
                {analysis.sectionSuggestions.map((suggestion) => {
                  const section = template.sections?.find(s => s.id === suggestion.sectionId);
                  return (
                    <Card key={suggestion.sectionId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-2">
                            {section?.title || suggestion.sectionId}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {suggestion.suggestions.columns && (
                              <Badge variant="outline" className="mr-2">
                                Columns: {suggestion.suggestions.columns}
                              </Badge>
                            )}
                            {suggestion.suggestions.spacing && (
                              <Badge variant="outline" className="mr-2">
                                Spacing: {suggestion.suggestions.spacing}
                              </Badge>
                            )}
                            {suggestion.reasoning && (
                              <p className="mt-2 text-xs italic">{suggestion.reasoning}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleApplySection(suggestion.sectionId)}
                          size="sm"
                          variant="ghost"
                        >
                          Apply
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <Separator />

          {/* Field Suggestions */}
          {analysis.fieldSuggestions.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold">Field Layouts</h4>
                <Button
                  onClick={handleApplyAll}
                  size="sm"
                  variant="outline"
                  disabled={applied}
                >
                  {applied ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Applied
                    </>
                  ) : (
                    "Apply All Fields"
                  )}
                </Button>
              </div>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analysis.fieldSuggestions.map((suggestion) => {
                  let fieldLabel = suggestion.fieldId;
                  template.sections?.forEach(section => {
                    const field = section.fields?.find(f => f.id === suggestion.fieldId);
                    if (field) {
                      fieldLabel = field.label;
                    }
                  });

                  return (
                    <Card key={suggestion.fieldId} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-2">{fieldLabel}</div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {suggestion.suggestions.width && (
                              <Badge variant="outline" className="mr-2">
                                Width: {suggestion.suggestions.width}
                              </Badge>
                            )}
                            {suggestion.suggestions.labelPosition && (
                              <Badge variant="outline" className="mr-2">
                                Label: {suggestion.suggestions.labelPosition}
                              </Badge>
                            )}
                            {suggestion.suggestions.order !== undefined && (
                              <Badge variant="outline" className="mr-2">
                                Order: {suggestion.suggestions.order}
                              </Badge>
                            )}
                            {suggestion.suggestions.helpText && (
                              <div className="mt-2">
                                <span className="text-xs font-medium">Help Text: </span>
                                <span className="text-xs">{suggestion.suggestions.helpText}</span>
                              </div>
                            )}
                            {suggestion.reasoning && (
                              <p className="mt-2 text-xs italic">{suggestion.reasoning}</p>
                            )}
                          </div>
                        </div>
                        <Button
                          onClick={() => handleApplyField(suggestion.fieldId)}
                          size="sm"
                          variant="ghost"
                        >
                          Apply
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      )}

      {!analysis && !loading && totalFields > 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Analyze Layout" to get AI-powered suggestions for your form using Claude AI
          </p>
        </CardContent>
      )}
    </Card>
  );
}

