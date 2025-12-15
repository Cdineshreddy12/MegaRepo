"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  MoveHorizontal,
  MoveVertical,
  Sparkles,
  Grid3x3,
  LayoutGrid
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/useToast"
import type { FormField, FormSection } from "./form-builder"
import { formLayoutAiService } from "@/services/api/formLayoutAiService"

interface AlignmentToolsProps {
  selectedFields: string[]
  sections: FormSection[]
  onAlignmentApplied: (updates: Array<{ sectionId: string; fieldId: string; updates: Partial<FormField> }>) => void
}

export function AlignmentTools({ selectedFields, sections, onAlignmentApplied }: AlignmentToolsProps) {
  const [isAiAligning, setIsAiAligning] = useState(false)
  const { toast } = useToast()

  // Find all selected fields with their section info
  const getSelectedFieldData = useCallback(() => {
    const fieldData: Array<{ sectionId: string; fieldId: string; field: FormField }> = []
    
    sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (selectedFields.includes(field.id)) {
          fieldData.push({ sectionId: section.id, fieldId: field.id, field })
        }
      })
    })
    
    return fieldData
  }, [selectedFields, sections])

  const handleAlign = useCallback((align: "left" | "center" | "right") => {
    const fieldData = getSelectedFieldData()
    
    if (fieldData.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select fields to align",
        variant: "destructive"
      })
      return
    }

    const updates = fieldData.map(({ sectionId, fieldId }) => ({
      sectionId,
      fieldId,
      updates: {
        metadata: {
          ...fieldData.find(f => f.fieldId === fieldId)?.field.metadata,
          align
        }
      }
    }))

    onAlignmentApplied(updates)
    toast({
      title: "Alignment applied",
      description: `Aligned ${fieldData.length} field(s) ${align}`
    })
  }, [getSelectedFieldData, onAlignmentApplied, toast])

  const handleDistribute = useCallback((direction: "horizontal" | "vertical") => {
    const fieldData = getSelectedFieldData()
    
    if (fieldData.length < 2) {
      toast({
        title: "Need more fields",
        description: "Select at least 2 fields to distribute",
        variant: "destructive"
      })
      return
    }

    // Group fields by section
    const fieldsBySection = new Map<string, typeof fieldData>()
    fieldData.forEach((field) => {
      if (!fieldsBySection.has(field.sectionId)) {
        fieldsBySection.set(field.sectionId, [])
      }
      fieldsBySection.get(field.sectionId)!.push(field)
    })

    const updates: Array<{ sectionId: string; fieldId: string; updates: Partial<FormField> }> = []

    fieldsBySection.forEach((fields, sectionId) => {
      // Calculate equal spacing
      const totalFields = fields.length
      const section = sections.find(s => s.id === sectionId)
      const sectionColumns = (section?.metadata as any)?.columns ?? 2
      
      // Calculate width per field for equal distribution
      const widthPerField = sectionColumns / totalFields
      const colSpan = Math.max(1, Math.floor(12 * widthPerField / sectionColumns))

      fields.forEach((field, index) => {
        updates.push({
          sectionId,
          fieldId: field.fieldId,
          updates: {
            metadata: {
              ...field.field.metadata,
              width: colSpan as any
            }
          }
        })
      })
    })

    onAlignmentApplied(updates)
    toast({
      title: "Distribution applied",
      description: `Distributed ${fieldData.length} field(s) ${direction === "horizontal" ? "horizontally" : "vertically"}`
    })
  }, [getSelectedFieldData, sections, onAlignmentApplied, toast])

  const handleAiAlignment = useCallback(async () => {
    if (selectedFields.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select fields for AI alignment",
        variant: "destructive"
      })
      return
    }

    setIsAiAligning(true)
    try {
      const fieldData = getSelectedFieldData()
      const fields = fieldData.map(f => f.field)
      
      // Call AI service for alignment suggestions
      const suggestions = await formLayoutAiService.suggestAlignment({
        fields: fields.map(f => ({
          id: f.id,
          label: f.label,
          type: f.type,
          currentWidth: (f.metadata as any)?.width,
          currentAlign: (f.metadata as any)?.align
        })),
        context: {
          sectionColumns: fieldData[0] ? (sections.find(s => s.id === fieldData[0].sectionId)?.metadata as any)?.columns ?? 2 : 2
        }
      })

      // Apply AI suggestions
      const updates = fieldData.map((field, index) => {
        const suggestion = suggestions[index]
        return {
          sectionId: field.sectionId,
          fieldId: field.fieldId,
          updates: {
            metadata: {
              ...field.field.metadata,
              width: suggestion.width,
              align: suggestion.align
            }
          }
        }
      })

      onAlignmentApplied(updates)
      toast({
        title: "AI Alignment applied",
        description: `AI optimized alignment for ${fieldData.length} field(s)`
      })
    } catch (error: any) {
      console.error("AI alignment error:", error)
      toast({
        title: "AI Alignment failed",
        description: error.message || "Failed to apply AI alignment",
        variant: "destructive"
      })
    } finally {
      setIsAiAligning(false)
    }
  }, [selectedFields, getSelectedFieldData, sections, onAlignmentApplied, toast])

  const handleSetGridColumns = useCallback((columns: 1 | 2 | 3 | 4 | 6 | 12) => {
    const fieldData = getSelectedFieldData()
    
    if (fieldData.length === 0) {
      toast({
        title: "No fields selected",
        description: "Please select fields to set grid columns",
        variant: "destructive"
      })
      return
    }

    // Get unique section IDs
    const sectionIds = Array.from(new Set(fieldData.map(f => f.sectionId)))
    
    const updates: Array<{ sectionId: string; fieldId: string; updates: Partial<FormField> }> = []
    
    sectionIds.forEach((sectionId) => {
      // Update section metadata for columns
      // Note: This requires updating the section, not individual fields
      // For now, we'll update fields to match the new grid
      const sectionFields = fieldData.filter(f => f.sectionId === sectionId)
      const section = sections.find(s => s.id === sectionId)
      
      if (section) {
        // Calculate appropriate width for fields based on new column count
        const fieldsPerRow = Math.ceil(sectionFields.length / Math.ceil(sectionFields.length / columns))
        const colSpan = Math.floor(12 / columns)
        
        sectionFields.forEach((field) => {
          updates.push({
            sectionId,
            fieldId: field.fieldId,
            updates: {
              metadata: {
                ...field.field.metadata,
                width: colSpan as any
              }
            }
          })
        })
      }
    })

    onAlignmentApplied(updates)
    toast({
      title: "Grid columns updated",
      description: `Set grid to ${columns} column(s)`
    })
  }, [getSelectedFieldData, sections, onAlignmentApplied, toast])

  const selectedCount = selectedFields.length

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>Alignment Tools</span>
          {selectedCount > 0 && (
            <Badge variant="secondary">{selectedCount} selected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Text Alignment */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Text Alignment</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAlign("left")}
              disabled={selectedCount === 0}
              className="flex-1"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAlign("center")}
              disabled={selectedCount === 0}
              className="flex-1"
            >
              <AlignCenter className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAlign("right")}
              disabled={selectedCount === 0}
              className="flex-1"
            >
              <AlignRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Distribution */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Distribution</Label>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDistribute("horizontal")}
              disabled={selectedCount < 2}
              className="flex-1"
            >
              <MoveHorizontal className="h-4 w-4 mr-1" />
              Horizontal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDistribute("vertical")}
              disabled={selectedCount < 2}
              className="flex-1"
            >
              <MoveVertical className="h-4 w-4 mr-1" />
              Vertical
            </Button>
          </div>
        </div>

        {/* Grid Columns */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">Grid Columns</Label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 6, 12].map((cols) => (
              <Button
                key={cols}
                variant="outline"
                size="sm"
                onClick={() => handleSetGridColumns(cols as 1 | 2 | 3 | 4 | 6 | 12)}
                disabled={selectedCount === 0}
                className="text-xs"
              >
                <Grid3x3 className="h-3 w-3 mr-1" />
                {cols}
              </Button>
            ))}
          </div>
        </div>

        {/* AI Alignment */}
        <div className="space-y-2">
          <Label className="text-xs text-gray-500">AI Alignment</Label>
          <Button
            variant="outline"
            size="sm"
            onClick={handleAiAlignment}
            disabled={selectedCount === 0 || isAiAligning}
            className="w-full"
          >
            {isAiAligning ? (
              <>
                <Sparkles className="h-4 w-4 mr-2 animate-spin" />
                Aligning...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                AI Optimize Alignment
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

