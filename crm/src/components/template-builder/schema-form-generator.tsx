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
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, CheckCircle2, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import { schemaService, SchemaMetadata } from "@/services/api/schemaService";
import { formService, FormTemplate } from "@/services/api/formService";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SchemaFormGeneratorProps {
  onTemplateGenerated: (template: FormTemplate) => void;
  onClose?: () => void;
}

export function SchemaFormGenerator({
  onTemplateGenerated,
  onClose,
}: SchemaFormGeneratorProps) {
  const [entityTypes, setEntityTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>("");
  const [schemaMetadata, setSchemaMetadata] = useState<SchemaMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [excludeSystemFields, setExcludeSystemFields] = useState(true);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const { toast } = useToast();

  // Load entity types
  useEffect(() => {
    const loadEntityTypes = async () => {
      try {
        setLoading(true);
        const types = await schemaService.getEntityTypes();
        setEntityTypes(types);
      } catch (error: any) {
        console.error("Error loading entity types:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load entity types",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadEntityTypes();
  }, [toast]);

  // Load schema metadata when entity type is selected
  useEffect(() => {
    if (!selectedEntityType) {
      setSchemaMetadata(null);
      setSelectedFields(new Set());
      return;
    }

    const loadSchemaMetadata = async () => {
      try {
        setLoading(true);
        const metadata = await schemaService.getSchemaMetadata(selectedEntityType, {
          excludeSystemFields,
        });
        setSchemaMetadata(metadata);
        
        // Auto-select all fields by default
        setSelectedFields(new Set(metadata.fields.map((f) => f.name)));
        
        // Set default template name
        if (!templateName) {
          setTemplateName(`${metadata.entityType.charAt(0).toUpperCase() + metadata.entityType.slice(1)} Form`);
        }
      } catch (error: any) {
        console.error("Error loading schema metadata:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to load schema metadata",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSchemaMetadata();
  }, [selectedEntityType, excludeSystemFields]);

  const toggleFieldSelection = (fieldName: string) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(fieldName)) {
      newSelection.delete(fieldName);
    } else {
      newSelection.add(fieldName);
    }
    setSelectedFields(newSelection);
  };

  const selectAllFields = () => {
    if (!schemaMetadata) return;
    setSelectedFields(new Set(schemaMetadata.fields.map((f) => f.name)));
  };

  const deselectAllFields = () => {
    setSelectedFields(new Set());
  };

  const handleGenerate = async () => {
    if (!selectedEntityType || !templateName.trim()) {
      toast({
        title: "Error",
        description: "Please select an entity type and enter a template name",
        variant: "destructive",
      });
      return;
    }

    if (selectedFields.size === 0) {
      toast({
        title: "Error",
        description: "Please select at least one field",
        variant: "destructive",
      });
      return;
    }

    try {
      setGenerating(true);
      const template = await schemaService.generateFormFromSchema({
        entityType: selectedEntityType,
        templateName,
        templateDescription,
        includeFields: Array.from(selectedFields),
        excludeFields: excludeSystemFields
          ? ["createdBy", "updatedBy", "createdAt", "updatedAt"]
          : [],
        groupingStrategy: "auto",
        saveTemplate,
      });

      toast({
        title: "Success",
        description: saveTemplate
          ? "Form template generated and saved successfully"
          : "Form template generated successfully",
      });

      onTemplateGenerated(template);
      
      if (onClose) {
        onClose();
      }
    } catch (error: any) {
      console.error("Error generating form:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate form template",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Generate Form from Schema
            </CardTitle>
            <CardDescription>
              Automatically generate form templates from your CRM entity schemas
            </CardDescription>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Entity Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="entity-type">Entity Type</Label>
          <Select
            value={selectedEntityType}
            onValueChange={setSelectedEntityType}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select entity type..." />
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

        {/* Template Details */}
        {selectedEntityType && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Template Name *</Label>
                <Input
                  id="template-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="Enter template name..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Description</Label>
                <Input
                  id="template-description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Enter description (optional)..."
                />
              </div>
            </div>

            {/* Field Selection */}
            {schemaMetadata && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Select Fields</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllFields}
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={deselectAllFields}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-2">
                    {schemaMetadata.fields.map((field) => (
                      <div
                        key={field.name}
                        className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 cursor-pointer"
                        onClick={() => toggleFieldSelection(field.name)}
                      >
                        <Checkbox
                          checked={selectedFields.has(field.name)}
                          onCheckedChange={() => toggleFieldSelection(field.name)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{field.name}</span>
                            {field.required && (
                              <Badge variant="destructive" className="text-xs">
                                Required
                              </Badge>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {field.type}
                            </Badge>
                          </div>
                          {field.ref && (
                            <span className="text-xs text-gray-500">
                              References: {field.ref}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-gray-500">
                  {selectedFields.size} of {schemaMetadata.fields.length} fields selected
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="exclude-system-fields"
                  checked={excludeSystemFields}
                  onCheckedChange={setExcludeSystemFields}
                />
                <Label htmlFor="exclude-system-fields" className="cursor-pointer">
                  Exclude system fields (createdBy, updatedBy, etc.)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="save-template"
                  checked={saveTemplate}
                  onCheckedChange={setSaveTemplate}
                />
                <Label htmlFor="save-template" className="cursor-pointer">
                  Save template to database automatically
                </Label>
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              {onClose && (
                <Button variant="outline" onClick={onClose} disabled={generating}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleGenerate} disabled={generating || !templateName.trim()}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Form Template
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {loading && !selectedEntityType && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

