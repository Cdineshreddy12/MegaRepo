"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Eye, Trash2, Copy, Calendar, Star, StarOff, CheckCircle2 } from "lucide-react"
import { useToast } from "@/hooks/useToast"
import { formService } from "@/services/api/formService"
import type { FormTemplate } from "./form-builder"
import { format } from "date-fns"

interface TemplateManagerProps {
  templates: FormTemplate[]
  onLoadTemplate: (template: FormTemplate) => void
  onDeleteTemplate: (id: string) => void
  onTemplateUpdated?: () => void // Callback to refresh templates
}

export function TemplateManager({ templates, onLoadTemplate, onDeleteTemplate, onTemplateUpdated }: TemplateManagerProps) {
  const { toast } = useToast()
  const [settingDefault, setSettingDefault] = useState<string | null>(null)

  // Group templates by entityType
  const groupedTemplates = templates.reduce((acc, template) => {
    const entityType = template.entityType || "custom"
    if (!acc[entityType]) {
      acc[entityType] = []
    }
    acc[entityType].push(template)
    return acc
  }, {} as Record<string, FormTemplate[]>)

  const duplicateTemplate = (template: FormTemplate) => {
    const duplicated = {
      ...template,
      id: "",
      name: `${template.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    onLoadTemplate(duplicated)
  }

  const handleSetDefault = async (template: FormTemplate) => {
    const templateId = template.id || (template as any)._id
    if (!templateId) {
      toast({
        title: "Error",
        description: "Template ID is missing",
        variant: "destructive",
      })
      return
    }

    if (!template.entityType) {
      toast({
        title: "Error",
        description: "Template must have an entity type to be set as default",
        variant: "destructive",
      })
      return
    }

    try {
      setSettingDefault(templateId)
      await formService.setDefaultTemplate(templateId)
      toast({
        title: "Success",
        description: `"${template.name}" is now the default template for ${template.entityType}`,
      })
      if (onTemplateUpdated) {
        onTemplateUpdated()
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to set default template",
        variant: "destructive",
      })
    } finally {
      setSettingDefault(null)
    }
  }

  if (templates.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-gray-500 text-center">
            <h3 className="text-lg font-medium mb-2">No templates saved</h3>
            <p>Create and save your first template to see it here</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Saved Templates</h2>
        <Badge variant="secondary">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {Object.entries(groupedTemplates).map(([entityType, entityTemplates]) => {
        const defaultTemplate = entityTemplates.find(t => t.isDefault)
        const defaultTemplateId = defaultTemplate?.id || (defaultTemplate as any)?._id
        
        return (
          <Card key={entityType} className="space-y-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold capitalize">
                    {entityType === "custom" ? "Custom Templates" : `${entityType} Templates`}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Select which template to use when creating {entityType === "custom" ? "custom" : entityType} forms
                  </p>
                </div>
                {defaultTemplate && (
                  <Badge variant="default" className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-current" />
                    Active: {defaultTemplate.name}
                  </Badge>
                )}
              </div>
              
              {/* Template Selector for Entity Type */}
              {entityType !== "custom" && entityTemplates.length > 1 && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor={`template-selector-${entityType}`}>
                    Active Template for {entityType.charAt(0).toUpperCase() + entityType.slice(1)} Forms
                  </Label>
                  <Select
                    value={defaultTemplateId && defaultTemplateId !== "" ? defaultTemplateId : undefined}
                    onValueChange={async (value) => {
                      if (!value || value === "") return;
                      const selectedTemplate = entityTemplates.find(
                        t => (t.id || (t as any)._id) === value
                      )
                      if (selectedTemplate) {
                        await handleSetDefault(selectedTemplate)
                      }
                    }}
                  >
                    <SelectTrigger id={`template-selector-${entityType}`} className="w-full max-w-md">
                      <SelectValue placeholder="Select active template">
                        {defaultTemplate ? defaultTemplate.name : "Select a template"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {entityTemplates
                        .filter((template) => {
                          const templateId = template.id || (template as any)._id;
                          return templateId && templateId !== "" && templateId !== null && templateId !== undefined;
                        })
                        .map((template) => {
                          const templateId = template.id || (template as any)._id;
                          const isSelected = templateId === defaultTemplateId;
                          return (
                            <SelectItem key={templateId} value={templateId}>
                              <div className="flex items-center gap-2">
                                {isSelected && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                <span className={isSelected ? "font-semibold" : ""}>{template.name}</span>
                                {template.description && (
                                  <span className="text-xs text-gray-500 ml-2">
                                    - {template.description}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    This template will be used by default when creating new {entityType} forms
                  </p>
                </div>
              )}
              
              {entityType !== "custom" && entityTemplates.length === 1 && (
                <div className="mt-4">
                  <Badge variant="outline" className="text-sm">
                    Only one template available - it will be used automatically
                  </Badge>
                </div>
              )}
            </CardHeader>
            
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {entityTemplates.map((template, index) => {
                const templateId = template.id || (template as any)._id || `template-${index}`
                const isDefault = template.isDefault || false
                const isLoading = settingDefault === templateId

                return (
                  <Card key={templateId} className="hover:shadow-md transition-shadow relative">
                    {isDefault && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="default" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" />
                          Default
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2 pr-8">{template.name}</CardTitle>
                          {template.description && (
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{template.description}</p>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(template.updatedAt), "MMM d, yyyy")}
                        </div>
                        <Badge variant="outline">
                          {template.sections.length} section{template.sections.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>

                      <div className="text-sm text-gray-600">
                        <p>{template.sections.reduce((total, section) => total + section.fields.length, 0)} total fields</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onLoadTemplate(template)}
                            className="flex-1 flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            Load
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => duplicateTemplate(template)}
                            className="flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onDeleteTemplate(templateId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        {template.entityType && (
                          <Button
                            variant={isDefault ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleSetDefault(template)}
                            disabled={isLoading || isDefault}
                            className="w-full flex items-center justify-center gap-1"
                          >
                            {isLoading ? (
                              <>Loading...</>
                            ) : isDefault ? (
                              <>
                                <Star className="h-3 w-3 fill-current" />
                                Default Template
                              </>
                            ) : (
                              <>
                                <StarOff className="h-3 w-3" />
                                Set as Default
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
