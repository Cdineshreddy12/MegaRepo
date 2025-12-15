"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Wand2, RefreshCw, Info, Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { FormTemplate } from "@/services/api/formService";
import { formLayoutAiService } from "@/services/api/formLayoutAiService";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { FormField, FormSection } from "./form-builder";

interface TemplateEnhancement {
  type: "add_field" | "modify_field" | "add_section" | "modify_section" | "reorganize";
  description: string;
  fieldId?: string;
  sectionId?: string;
  newField?: FormField;
  fieldModifications?: Partial<FormField>;
  sectionModifications?: Partial<FormSection>;
  reasoning: string;
  priority: "high" | "medium" | "low";
}

interface TemplateEnhancementResult {
  enhancements: TemplateEnhancement[];
  summary: string;
  confidence: number;
}

interface TemplateEnhancerProps {
  template: FormTemplate;
  onApplyEnhancement: (updatedTemplate: FormTemplate) => void;
}

export function TemplateEnhancer({ template, onApplyEnhancement }: TemplateEnhancerProps) {
  const [loading, setLoading] = useState(false);
  const [enhancements, setEnhancements] = useState<TemplateEnhancementResult | null>(null);
  const [appliedEnhancements, setAppliedEnhancements] = useState<Set<string>>(new Set());
  const [enhancementPrompt, setEnhancementPrompt] = useState("");
  const { toast } = useToast();

  const handleEnhance = async () => {
    if (!template.sections || template.sections.length === 0) {
      toast({
        title: "No Template Loaded",
        description: "Please load a template first before enhancing it",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setAppliedEnhancements(new Set());
    
    try {
      // Use the existing AI service to analyze the template
      const analysis = await formLayoutAiService.suggestLayout(
        template,
        enhancementPrompt.trim() || undefined
      );

      // Convert analysis to enhancements
      const templateEnhancements: TemplateEnhancement[] = [];

      // Add missing fields as enhancements
      if (analysis.missingFields) {
        analysis.missingFields.forEach((field, index) => {
          templateEnhancements.push({
            type: "add_field",
            description: `Add field: ${field.label}`,
            newField: {
              id: field.id,
              type: field.type as any,
              label: field.label,
              placeholder: field.placeholder || "",
              required: field.required || false,
              category: (field as any).category,
              metadata: {
                helpText: field.helpText,
                category: (field as any).category,
                entityType: (field as any).metadata?.entityType,
                ...field.suggestions,
              },
            },
            sectionId: field.sectionId || template.sections[0]?.id,
            reasoning: field.reasoning || `This field is commonly used in ${template.entityType || 'CRM'} forms`,
            priority: field.required ? "high" : "medium",
          });
        });
      }

      // Add field layout improvements as enhancements
      analysis.fieldSuggestions.forEach((suggestion) => {
        templateEnhancements.push({
          type: "modify_field",
          description: `Improve layout for field`,
          fieldId: suggestion.fieldId,
          fieldModifications: {
            metadata: suggestion.suggestions,
          },
          reasoning: suggestion.reasoning || "AI suggests better layout for improved UX",
          priority: "medium",
        });
      });

      // Add section improvements as enhancements
      analysis.sectionSuggestions.forEach((suggestion) => {
        templateEnhancements.push({
          type: "modify_section",
          description: `Improve section layout`,
          sectionId: suggestion.sectionId,
          sectionModifications: {
            metadata: suggestion.suggestions,
          },
          reasoning: suggestion.reasoning || "AI suggests better section organization",
          priority: "medium",
        });
      });

      const result: TemplateEnhancementResult = {
        enhancements: templateEnhancements,
        summary: analysis.overallRecommendations.join(" "),
        confidence: analysis.confidence,
      };

      setEnhancements(result);
      
      toast({
        title: "Enhancement Analysis Complete",
        description: `Found ${templateEnhancements.length} enhancement suggestions`,
      });
    } catch (error: any) {
      console.error("Template enhancement error:", error);
      toast({
        title: "Enhancement Failed",
        description: error.message || "Failed to enhance template. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyEnhancement = (enhancement: TemplateEnhancement, index: number) => {
    const enhancementKey = `${enhancement.type}-${index}`;
    if (appliedEnhancements.has(enhancementKey)) {
      return;
    }

    const updatedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;

    try {
      switch (enhancement.type) {
        case "add_field":
          if (enhancement.newField && enhancement.sectionId) {
            const section = updatedTemplate.sections.find(s => s.id === enhancement.sectionId);
            if (section) {
              // Check if field already exists
              const fieldExists = section.fields?.some(f => f.id === enhancement.newField!.id);
              if (!fieldExists) {
                section.fields = [...(section.fields || []), enhancement.newField];
              }
            }
          }
          break;

        case "modify_field":
          if (enhancement.fieldId && enhancement.fieldModifications) {
            updatedTemplate.sections.forEach(section => {
              const field = section.fields?.find(f => f.id === enhancement.fieldId);
              if (field) {
                if (!field.metadata) {
                  field.metadata = {};
                }
                Object.assign(field.metadata, enhancement.fieldModifications?.metadata);
                // Also update other field properties if provided
                if (enhancement.fieldModifications.label) {
                  field.label = enhancement.fieldModifications.label;
                }
                if (enhancement.fieldModifications.placeholder !== undefined) {
                  field.placeholder = enhancement.fieldModifications.placeholder;
                }
                if (enhancement.fieldModifications.required !== undefined) {
                  field.required = enhancement.fieldModifications.required;
                }
              }
            });
          }
          break;

        case "modify_section":
          if (enhancement.sectionId && enhancement.sectionModifications) {
            const section = updatedTemplate.sections.find(s => s.id === enhancement.sectionId);
            if (section) {
              if (!section.metadata) {
                section.metadata = {};
              }
              Object.assign(section.metadata, enhancement.sectionModifications.metadata);
              if (enhancement.sectionModifications.title) {
                section.title = enhancement.sectionModifications.title;
              }
              if (enhancement.sectionModifications.description !== undefined) {
                section.description = enhancement.sectionModifications.description;
              }
            }
          }
          break;

        case "add_section":
          if (enhancement.sectionModifications) {
            const newSection: FormSection = {
              id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: enhancement.sectionModifications.title || "New Section",
              description: enhancement.sectionModifications.description || "",
              fields: [],
              metadata: enhancement.sectionModifications.metadata,
            };
            updatedTemplate.sections.push(newSection);
          }
          break;
      }

      onApplyEnhancement(updatedTemplate);
      setAppliedEnhancements(prev => new Set([...prev, enhancementKey]));
      
      toast({
        title: "Enhancement Applied",
        description: enhancement.description,
      });
    } catch (error: any) {
      toast({
        title: "Apply Failed",
        description: error.message || "Failed to apply enhancement",
        variant: "destructive",
      });
    }
  };

  const applyAllEnhancements = () => {
    if (!enhancements) return;

    let updatedTemplate = JSON.parse(JSON.stringify(template)) as FormTemplate;

    enhancements.enhancements.forEach((enhancement, index) => {
      const enhancementKey = `${enhancement.type}-${index}`;
      if (appliedEnhancements.has(enhancementKey)) {
        return;
      }

      switch (enhancement.type) {
        case "add_field":
          if (enhancement.newField && enhancement.sectionId) {
            const section = updatedTemplate.sections.find(s => s.id === enhancement.sectionId);
            if (section) {
              const fieldExists = section.fields?.some(f => f.id === enhancement.newField!.id);
              if (!fieldExists) {
                section.fields = [...(section.fields || []), enhancement.newField];
              }
            }
          }
          break;

        case "modify_field":
          if (enhancement.fieldId && enhancement.fieldModifications) {
            updatedTemplate.sections.forEach(section => {
              const field = section.fields?.find(f => f.id === enhancement.fieldId);
              if (field) {
                if (!field.metadata) {
                  field.metadata = {};
                }
                Object.assign(field.metadata, enhancement.fieldModifications?.metadata);
              }
            });
          }
          break;

        case "modify_section":
          if (enhancement.sectionId && enhancement.sectionModifications) {
            const section = updatedTemplate.sections.find(s => s.id === enhancement.sectionId);
            if (section) {
              if (!section.metadata) {
                section.metadata = {};
              }
              Object.assign(section.metadata, enhancement.sectionModifications.metadata);
            }
          }
          break;
      }
    });

    onApplyEnhancement(updatedTemplate);
    setAppliedEnhancements(new Set(enhancements.enhancements.map((_, index) => `${enhancements.enhancements[index].type}-${index}`)));
    
    toast({
      title: "All Enhancements Applied",
      description: `Applied ${enhancements.enhancements.length} enhancements to your template`,
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
      default:
        return "outline";
    }
  };

  const totalFields = template.sections?.reduce((sum, s) => sum + (s.fields?.length || 0), 0) || 0;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Template Enhancer</CardTitle>
          </div>
          <Button
            onClick={handleEnhance}
            disabled={loading || totalFields === 0}
            variant="outline"
            size="sm"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enhancing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Enhance Template
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Use AI to enhance your loaded template by adding missing fields, improving layouts, and optimizing structure. 
          Describe what you want to improve or add for better suggestions.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Enhancement Prompt */}
        <div className="space-y-2 border rounded-lg p-4">
          <Label htmlFor="enhancement-prompt" className="text-sm font-medium">
            What would you like to enhance? (Optional)
          </Label>
          <Textarea
            id="enhancement-prompt"
            placeholder="Example: Add fields for tracking customer preferences, improve the layout for mobile devices, add validation rules, or suggest better field organization..."
            value={enhancementPrompt}
            onChange={(e) => setEnhancementPrompt(e.target.value)}
            rows={3}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Leave empty for general improvements, or describe specific enhancements you need
          </p>
        </div>

        {totalFields === 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Load a template first to enhance it. Go to the Templates tab to load an existing template.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      {enhancements && (
        <CardContent className="space-y-6">
          {/* Summary */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">Enhancement Summary</span>
              <Badge variant="default">
                {Math.round(enhancements.confidence * 100)}% Confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{enhancements.summary}</p>
          </div>

          {/* Apply All Button */}
          {enhancements.enhancements.length > 0 && (
            <div className="flex justify-end">
              <Button
                onClick={applyAllEnhancements}
                variant="default"
                size="sm"
                disabled={appliedEnhancements.size === enhancements.enhancements.length}
              >
                <Plus className="mr-2 h-4 w-4" />
                Apply All Enhancements ({enhancements.enhancements.length})
              </Button>
            </div>
          )}

          <Separator />

          {/* Enhancements List */}
          <div className="space-y-4">
            <h4 className="font-semibold">Enhancement Suggestions</h4>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {enhancements.enhancements.map((enhancement, index) => {
                const enhancementKey = `${enhancement.type}-${index}`;
                const isApplied = appliedEnhancements.has(enhancementKey);
                
                // Get field/section name
                let targetName = "";
                if (enhancement.fieldId) {
                  template.sections.forEach(section => {
                    const field = section.fields?.find(f => f.id === enhancement.fieldId);
                    if (field) {
                      targetName = field.label;
                    }
                  });
                } else if (enhancement.sectionId) {
                  const section = template.sections.find(s => s.id === enhancement.sectionId);
                  if (section) {
                    targetName = section.title;
                  }
                }

                return (
                  <Card key={index} className={`p-4 ${isApplied ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {enhancement.type === "add_field" && <Plus className="h-4 w-4 text-green-600" />}
                          {enhancement.type === "modify_field" && <Edit className="h-4 w-4 text-blue-600" />}
                          {enhancement.type === "modify_section" && <RefreshCw className="h-4 w-4 text-purple-600" />}
                          <span className="font-medium">
                            {enhancement.type === "add_field" && enhancement.newField
                              ? `Add Field: ${enhancement.newField.label}`
                              : enhancement.type === "modify_field"
                              ? `Modify Field: ${targetName || enhancement.fieldId}`
                              : enhancement.type === "modify_section"
                              ? `Modify Section: ${targetName || enhancement.sectionId}`
                              : enhancement.description}
                          </span>
                          <Badge variant={getPriorityColor(enhancement.priority)} className="text-xs">
                            {enhancement.priority}
                          </Badge>
                          {isApplied && (
                            <Badge variant="outline" className="text-xs">
                              Applied
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{enhancement.reasoning}</p>
                        {enhancement.newField && (
                          <div className="mt-2 space-y-1">
                            <Badge variant="outline" className="mr-2">
                              Type: {enhancement.newField.type}
                            </Badge>
                            {enhancement.newField.required && (
                              <Badge variant="destructive" className="text-xs">Required</Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => applyEnhancement(enhancement, index)}
                        size="sm"
                        variant={isApplied ? "outline" : "default"}
                        disabled={isApplied}
                        className="ml-4"
                      >
                        {isApplied ? (
                          <>
                            <Info className="mr-2 h-4 w-4" />
                            Applied
                          </>
                        ) : (
                          <>
                            <Plus className="mr-2 h-4 w-4" />
                            Apply
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      )}

      {!enhancements && !loading && totalFields > 0 && (
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Click "Enhance Template" to get AI-powered suggestions for improving your loaded template
          </p>
        </CardContent>
      )}
    </Card>
  );
}

