"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FormBuilderEditor } from "./form-builder-editor"
import { FormPreview } from "./form-preview"
import { TemplateManager } from "./template-manager"
import { Save, Eye, Settings, Database, Loader2, Sparkles } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/useToast"
import { formService, FormTemplate, CreateTemplateData } from "@/services/api/formService"
import { SchemaFormGenerator } from "./schema-form-generator"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { LayoutAiSuggestions } from "./LayoutAiSuggestions"
import { TemplateGenerator } from "./TemplateGenerator"
import { TemplateEnhancer } from "./TemplateEnhancer"

export interface FormField {
  id: string
  type: "text" | "textarea" | "number" | "select" | "checkbox" | "radio" | "date" | "email" | "phone" | "sysConfig" | "entity" | "user" | "organization" | "calculated"
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  category?: string // For sysConfig type fields
  readOnly?: boolean // For read-only fields like createdBy, updatedBy
  calculation?: {
    formula: string // Formula expression (e.g., "field-annualRevenue * field-profitabilityMargin / 100")
    decimalPlaces?: number // Number of decimal places to display (default: 2)
    format?: "number" | "currency" | "percentage" // Display format
  }
  metadata?: {
    entityType?: string // For entity/user fields
    autoPopulated?: boolean // For auto-populated fields
    readOnly?: boolean
    category?: string // For sysConfig fields
    multiple?: boolean // For multi-select entity fields
    hiddenInTable?: boolean // Hide field from table view
    showInTable?: boolean // Explicitly show field in table (overrides defaults)
    hidden?: boolean // Hide field from form view entirely
    // UI Customization
    width?: "full" | "half" | "third" | "two-thirds" | "quarter" | "three-quarters" | number // Field width in grid
    align?: "left" | "center" | "right" // Text alignment
    order?: number // Display order (lower numbers appear first)
    className?: string // Custom CSS classes
    labelPosition?: "top" | "left" | "right" | "hidden" // Label position
    helpText?: string // Help text shown below field
  }
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  conditionalLogic?: {
    dependsOn?: string
    condition?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan"
    value?: any
    show?: boolean
  }
}

export interface FormSection {
  id: string
  title: string
  description?: string
  fields: FormField[]
  metadata?: {
    hidden?: boolean // Hide section from form view
    columns?: 1 | 2 | 3 | 4 | 6 | 12 // Grid columns (default: 1, uses 12-column grid)
    spacing?: "compact" | "normal" | "loose" // Section spacing
    collapsible?: boolean // Allow section to be collapsed
    collapsedByDefault?: boolean // Start collapsed
    className?: string // Custom CSS classes
    order?: number // Display order (lower numbers appear first)
  }
  conditionalLogic?: {
    dependsOn?: string
    condition?: "equals" | "notEquals" | "contains" | "greaterThan" | "lessThan"
    value?: any
    show?: boolean
  }
}

export interface FormTemplate {
  id: string
  name: string
  description?: string
  tenantId: string
  sections: FormSection[]
  createdAt: Date
  updatedAt: Date
}

export interface FormSubmission {
  id: string
  templateId: string
  tenantId: string
  data: Record<string, any>
  submittedAt: Date
}

export default function FormBuilder() {
  const [activeTab, setActiveTab] = useState("builder")
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate>({
    id: "",
    name: "",
    description: "",
    tenantId: "",
    isActive: true,
    sections: [],
    settings: {},
    permissions: {},
    createdBy: "",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const [templates, setTemplates] = useState<FormTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showSchemaGenerator, setShowSchemaGenerator] = useState(false)
  const { toast } = useToast()

  // Load templates from backend on mount
  useEffect(() => {
    loadTemplates()
  }, [])

  // Debug: Log when currentTemplate changes
  useEffect(() => {
    console.log('📋 [Form Builder] currentTemplate state changed:', {
      templateId: currentTemplate.id,
      templateName: currentTemplate.name,
      sectionsCount: currentTemplate.sections?.length,
      sections: currentTemplate.sections?.map(s => ({
        id: s.id,
        title: s.title,
        columns: s.metadata?.columns,
        metadata: s.metadata
      }))
    });
  }, [currentTemplate])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const response = await formService.getTemplates({ isActive: true })
      setTemplates(response.data)
    } catch (error: any) {
      console.error("Error loading templates:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load templates",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }


  const saveTemplate = async () => {
    if (!currentTemplate.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a template name",
        variant: "destructive",
      })
      return
    }

    try {
      setSaving(true)
      
      // Ensure sections metadata.columns is preserved when saving
      const sectionsWithMetadata = currentTemplate.sections.map(section => {
        const sectionMetadata = section.metadata || {};
        // Only include metadata if it has at least one property (don't send empty objects)
        const hasMetadata = Object.keys(sectionMetadata).length > 0;
        
        return {
          ...section,
          // Only include metadata if it has properties
          ...(hasMetadata && {
            metadata: {
              ...sectionMetadata,
              // Preserve columns if it exists
              ...(sectionMetadata.columns !== undefined && { columns: sectionMetadata.columns })
            }
          })
        };
      });
      
      console.log('💾 [Form Builder] Saving template with sections metadata:', {
        sections: sectionsWithMetadata.map(s => ({
          id: s.id,
          title: s.title,
          metadata: s.metadata,
          columns: s.metadata?.columns
        }))
      });
      
      const templateData: CreateTemplateData = {
        name: currentTemplate.name,
        description: currentTemplate.description,
        orgCode: currentTemplate.orgCode,
        entityType: currentTemplate.entityType || undefined,
        isActive: currentTemplate.isActive,
        isPublic: currentTemplate.isPublic,
        sections: sectionsWithMetadata as any, // Type assertion to handle type differences
        settings: currentTemplate.settings,
        permissions: currentTemplate.permissions,
        tags: currentTemplate.tags,
        autoCreateEntity: currentTemplate.autoCreateEntity,
        entityMapping: currentTemplate.entityMapping,
        workflowTriggers: currentTemplate.workflowTriggers,
      }

      let savedTemplate: FormTemplate
      const currentTemplateId = currentTemplate.id || (currentTemplate as any)._id;
      if (currentTemplateId && currentTemplateId !== "undefined" && currentTemplateId.trim() !== "") {
        savedTemplate = await formService.updateTemplate(currentTemplateId, templateData)
      } else {
        savedTemplate = await formService.createTemplate(templateData)
      }

      // Backend now properly persists metadata.columns, so use the saved template directly
      // Ensure metadata.columns is present in the response
      const templateWithMetadata = {
        ...savedTemplate,
        sections: savedTemplate.sections.map((savedSection) => {
          // Find matching section in currentTemplate to preserve columns if backend didn't return it
          const currentSection = currentTemplate.sections.find(s => s.id === savedSection.id);
          const preservedColumns = savedSection.metadata?.columns !== undefined 
            ? savedSection.metadata.columns 
            : currentSection?.metadata?.columns;
          
          return {
            ...savedSection,
            metadata: {
              ...savedSection.metadata,
              // Use columns from backend response, fallback to currentTemplate, or default to 1
              columns: preservedColumns !== undefined ? preservedColumns : 1
            }
          };
        })
      };

      console.log('💾 [Form Builder] Template saved, metadata.columns preserved:', {
        sections: templateWithMetadata.sections.map(s => ({
          id: s.id,
          title: s.title,
          columns: s.metadata?.columns
        }))
      });

      setCurrentTemplate(templateWithMetadata as any)
      await loadTemplates()

      toast({
        title: "Success",
        description: "Template saved successfully",
      })
    } catch (error: any) {
      console.error("Error saving template:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save template",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const loadTemplate = async (template: FormTemplate) => {
    try {
      // Get the template ID - check both id and _id properties
      const templateId = template.id || (template as any)._id;
      
      if (!templateId || templateId === "undefined" || templateId.trim() === "") {
        toast({
          title: "Error",
          description: "Template ID is missing. Cannot load template.",
          variant: "destructive",
        });
        return;
      }

      const fullTemplate = await formService.getTemplate(templateId);
      
      // Ensure metadata.columns is preserved when loading
      // Backend now returns metadata.columns, so we preserve it from the loaded template
      const templateWithMetadata = {
        ...fullTemplate,
        sections: fullTemplate.sections.map((section) => {
          // Preserve metadata.columns from backend, or default to 1 if not present
          return {
            ...section,
            metadata: {
              ...section.metadata,
              // Preserve columns from backend response, or default to 1
              columns: section.metadata?.columns !== undefined ? section.metadata.columns : 1
            }
          };
        })
      };
      
      console.log('📥 [Form Builder] Loaded template with sections metadata:', {
        sections: templateWithMetadata.sections.map(s => ({
          id: s.id,
          title: s.title,
          metadata: s.metadata,
          columns: s.metadata?.columns
        }))
      });
      
      setCurrentTemplate(templateWithMetadata as any); // Type assertion to handle type differences
      setActiveTab("builder");
    } catch (error: any) {
      console.error("Error loading template:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load template",
        variant: "destructive",
      });
    }
  }

  const createNewTemplate = () => {
    setCurrentTemplate({
      id: "",
      name: "",
      description: "",
      tenantId: "",
      isActive: true,
      sections: [],
      settings: {},
      permissions: {},
      createdBy: "",
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    setActiveTab("builder")
  }

  const handleFormSubmission = async (data: Record<string, any>) => {
    const currentTemplateId = currentTemplate.id || (currentTemplate as any)._id;
    if (!currentTemplateId || currentTemplateId === "undefined" || currentTemplateId.trim() === "") {
      toast({
        title: "Error",
        description: "Please save the template before submitting forms",
        variant: "destructive",
      })
      return
    }

    try {
      await formService.submitForm({
        templateId: currentTemplateId,
        data,
        status: "submitted",
      })

      toast({
        title: "Success",
        description: "Form submitted successfully",
      })
    } catch (error: any) {
      console.error("Error submitting form:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit form",
        variant: "destructive",
      })
    }
  }

  const handleDeleteTemplate = async (id: string) => {
    if (!id || id === "undefined" || id.trim() === "") {
      toast({
        title: "Error",
        description: "Template ID is missing. Cannot delete template.",
        variant: "destructive",
      });
      return;
    }

    try {
      await formService.deleteTemplate(id)
      await loadTemplates()
      const currentTemplateId = currentTemplate.id || (currentTemplate as any)._id;
      if (currentTemplateId === id) {
        createNewTemplate()
      }
      toast({
        title: "Success",
        description: "Template deleted successfully",
      })
    } catch (error: any) {
      console.error("Error deleting template:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete template",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CRM Form Builder</h1>
          <p className="text-gray-600">Create and manage dynamic quotation forms for your CRM system</p>
        </div>

        <div className="mb-6 flex items-center gap-4">
          <div className="flex-1">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              value={currentTemplate.name}
              onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="Enter template name..."
              className="mt-1"
            />
          </div>
          <div className="flex-1">
            <Label htmlFor="template-description">Description (Optional)</Label>
            <Input
              id="template-description"
              value={currentTemplate.description || ""}
              onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Enter template description..."
              className="mt-1"
            />
          </div>
          <div className="flex gap-2 pt-6">
            <Dialog open={showSchemaGenerator} onOpenChange={setShowSchemaGenerator}>
              <DialogTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2" disabled={saving}>
                  <Sparkles className="h-4 w-4" />
                  Generate from Schema
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <SchemaFormGenerator
                  onTemplateGenerated={(template) => {
                    setCurrentTemplate(template as any)
                    setShowSchemaGenerator(false)
                    setActiveTab("builder")
                    toast({
                      title: "Success",
                      description: "Form template generated successfully",
                    })
                  }}
                  onClose={() => setShowSchemaGenerator(false)}
                />
              </DialogContent>
            </Dialog>
            <Button onClick={saveTemplate} className="flex items-center gap-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Template
                </>
              )}
            </Button>
            <Button onClick={createNewTemplate} variant="outline" disabled={saving}>
              New Template
            </Button>
            <TemplateGenerator
              onTemplateGenerated={(template) => {
                setCurrentTemplate(template);
                setActiveTab("builder");
                toast({
                  title: "Template Loaded",
                  description: "The generated template has been loaded. You can now edit and save it.",
                });
              }}
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="builder" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Builder
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </TabsTrigger>
            <TabsTrigger value="ai-suggestions" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Layout
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="builder">
            <FormBuilderEditor template={currentTemplate} onTemplateChange={setCurrentTemplate} />
          </TabsContent>

          <TabsContent value="preview">
            <FormPreview template={currentTemplate} onSubmit={handleFormSubmission} />
          </TabsContent>

          <TabsContent value="ai-suggestions">
            <div className="space-y-6">
              {/* Template Enhancer - for enhancing loaded templates */}
              <TemplateEnhancer
                template={currentTemplate}
                onApplyEnhancement={(updatedTemplate) => {
                  setCurrentTemplate(updatedTemplate);
                  toast({
                    title: "Template Enhanced",
                    description: "AI enhancements have been applied to your template",
                  });
                }}
              />
              
              <Separator />
              
              {/* Layout AI Suggestions - for layout optimization */}
              <LayoutAiSuggestions
                template={currentTemplate}
                onApplySuggestions={(updatedTemplate) => {
                  setCurrentTemplate(updatedTemplate);
                  toast({
                    title: "Suggestions Applied",
                    description: "AI layout suggestions have been applied to your template",
                  });
                }}
                onAddField={(field) => {
                  // Find the section or create it
                  let targetSection = currentTemplate.sections.find(s => s.id === field.sectionId);
                  
                  // If section doesn't exist, use first section or create a new one
                  if (!targetSection) {
                    if (currentTemplate.sections.length > 0) {
                      targetSection = currentTemplate.sections[0];
                    } else {
                      // Create a new section if none exist
                      const newSectionId = `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                      targetSection = {
                        id: newSectionId,
                        title: "General Information",
                        description: "",
                        fields: [],
                      };
                      currentTemplate.sections = [targetSection];
                    }
                  }
                  
                  // Check if field already exists
                  const fieldExists = targetSection.fields?.some(f => f.id === field.id);
                  if (fieldExists) {
                    toast({
                      title: "Field Already Exists",
                      description: `${field.label} is already in ${targetSection.title}`,
                      variant: "destructive",
                    });
                    return;
                  }
                  
                  // Create the new field with proper structure
                  const newField: FormField = {
                    id: field.id,
                    type: field.type as any,
                    label: field.label,
                    required: field.required || false,
                    placeholder: field.placeholder,
                    category: (field as any).category, // For sysConfig fields
                    metadata: {
                      ...field.suggestions,
                      helpText: field.helpText,
                      category: (field as any).category, // Also in metadata for sysConfig
                      entityType: (field as any).metadata?.entityType, // For entity fields
                    }
                  };
                  
                  // Update sections
                  const updatedSections = currentTemplate.sections.map(section =>
                    section.id === targetSection!.id
                      ? { ...section, fields: [...(section.fields || []), newField] }
                      : section
                  );
                  
                  // If we created a new section, add it to the sections array
                  if (!currentTemplate.sections.find(s => s.id === targetSection!.id)) {
                    updatedSections.push(targetSection);
                  }
                  
                  setCurrentTemplate({
                    ...currentTemplate,
                    sections: updatedSections,
                  });
                  
                  toast({
                    title: "Field Added",
                    description: `Added ${field.label} to ${targetSection.title}`,
                  });
                  
                  // Switch to builder tab to see the new field
                  setActiveTab("builder");
                }}
              />
            </div>
          </TabsContent>

          <TabsContent value="templates">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <TemplateManager
                templates={templates}
                onLoadTemplate={loadTemplate}
                onDeleteTemplate={handleDeleteTemplate}
                onTemplateUpdated={loadTemplates}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
