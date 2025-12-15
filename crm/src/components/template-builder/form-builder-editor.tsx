"use client"

import { useState, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, GripVertical, Settings, Grid3x3, Type, FileText } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { FormTemplate, FormSection, FormField } from "./form-builder"
import { FieldEditor } from "./field-editor"
import { AlignmentTools } from "./alignment-tools"
import { cn } from "@/lib/utils"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface FormBuilderEditorProps {
  template: FormTemplate
  onTemplateChange: (template: FormTemplate) => void
}

interface SortableFieldProps {
  field: FormField
  sectionId: string
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

interface SortableSectionProps {
  section: FormSection
  sectionType?: "header" | "footer"
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  children: React.ReactNode
}

function SortableField({ field, sectionId, isSelected, onSelect, onEdit, onDelete }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border cursor-move transition-all",
        isSelected 
          ? "bg-blue-50 border-blue-300 ring-2 ring-blue-200" 
          : "bg-gray-50 border-gray-200 hover:border-gray-300",
        isDragging && "opacity-50"
      )}
      onClick={(e) => {
        if (e.ctrlKey || e.metaKey) {
          e.stopPropagation()
          onSelect()
        }
      }}
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-gray-400" />
      </div>
      <div 
        className="flex-1"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{field.label}</span>
          <Badge variant="outline" className="text-xs">
            {field.type}
          </Badge>
          {field.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
          {((field as any).readOnly || (field as any).metadata?.readOnly) && (
            <Badge variant="secondary" className="text-xs">
              Read-only
            </Badge>
          )}
          {(field.metadata as any)?.width && (
            <Badge variant="outline" className="text-xs">
              Width: {(field.metadata as any).width}
            </Badge>
          )}
          {(field.metadata as any)?.align && (
            <Badge variant="outline" className="text-xs">
              Align: {(field.metadata as any).align}
            </Badge>
          )}
        </div>
        {field.placeholder && <p className="text-sm text-gray-600">Placeholder: {field.placeholder}</p>}
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
        >
          <Settings className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function SortableSection({ section, sectionType, isSelected, onSelect, onEdit, onDelete, children }: SortableSectionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "opacity-50"
      )}
    >
      {children}
    </div>
  )
}

interface SortableSectionCardProps {
  section: FormSection
  template: FormTemplate
  activeSectionId: string | null
  selectedFields: string[]
  editingField: { sectionId: string; fieldId: string } | null
  fieldSensors: ReturnType<typeof useSensors>
  onTemplateChange: (template: FormTemplate) => void
  updateSection: (sectionId: string, updates: Partial<FormSection>) => void
  updateSectionColumns: (sectionId: string, columns: 1 | 2 | 3 | 4 | 6 | 12) => void
  deleteSection: (sectionId: string) => void
  handleDragStart: (event: any) => void
  handleDragEnd: (event: any, sectionId: string) => void
  addQuickField: (sectionId: string, fieldType: "assignedTo" | "createdBy" | "updatedBy") => void
  addField: (sectionId: string, presetField?: Partial<FormField>) => void
  toggleFieldSelection: (fieldId: string) => void
  setEditingField: (field: { sectionId: string; fieldId: string } | null) => void
  deleteField: (sectionId: string, fieldId: string) => void
  activeId: string | null
}

function SortableSectionCard({
  section,
  template,
  activeSectionId,
  selectedFields,
  fieldSensors,
  onTemplateChange,
  updateSection,
  updateSectionColumns,
  deleteSection,
  handleDragStart,
  handleDragEnd,
  addQuickField,
  addField,
  toggleFieldSelection,
  setEditingField,
  deleteField,
  activeId,
}: SortableSectionCardProps) {
  const sectionDragProps = useSortable({ id: section.id })
  const isDragging = activeSectionId === section.id

  return (
    <div
      ref={sectionDragProps.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sectionDragProps.transform),
        transition: sectionDragProps.transition,
      }}
      className={cn(isDragging && "opacity-50")}
    >
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div 
                {...sectionDragProps.attributes} 
                {...sectionDragProps.listeners} 
                className="cursor-grab active:cursor-grabbing touch-none"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
                    placeholder="Section title..."
                  />
                </div>
                <Input
                  value={section.description || ""}
                  onChange={(e) => updateSection(section.id, { description: e.target.value })}
                  className="text-sm text-gray-600 border-none p-0 h-auto mt-1 focus-visible:ring-0"
                  placeholder="Section description (optional)..."
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String((section.metadata as any)?.columns ?? 1)}
                onValueChange={(value) => {
                  const columns = Number(value) as 1 | 2 | 3 | 4 | 6 | 12
                  updateSectionColumns(section.id, columns)
                }}
              >
                <SelectTrigger className="w-24 h-8">
                  <Grid3x3 className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                  <SelectItem value="12">12 Columns</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {section.fields.length} field{section.fields.length !== 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSection(section.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext
            id={`field-context-${section.id}`}
            sensors={fieldSensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              // Only handle field drags here, not section drags
              const id = e.active.id as string
              const isSection = template.sections.some(s => s.id === id)
              const isField = section.fields.some(f => f.id === id)
              
              // Only handle if it's a field drag
              if (!isSection && isField) {
                handleDragStart(e)
              }
              // If it's a section drag, do nothing - let parent context handle it
            }}
            onDragEnd={(e) => {
              // Only handle field drags here, not section drags
              const id = e.active.id as string
              const isSection = template.sections.some(s => s.id === id)
              const isField = section.fields.some(f => f.id === id)
              
              // Only handle if it's a field drag
              if (!isSection && isField) {
                handleDragEnd(e, section.id)
              }
              // If it's a section drag, do nothing - let parent context handle it
            }}
          >
            <SortableContext items={section.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {section.fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId={section.id}
                  isSelected={selectedFields.includes(field.id)}
                  onSelect={() => toggleFieldSelection(field.id)}
                  onEdit={() => setEditingField({ sectionId: section.id, fieldId: field.id })}
                  onDelete={() => deleteField(section.id, field.id)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId && !activeSectionId && section.fields.some(f => f.id === activeId) ? (
                <div className="opacity-50 bg-gray-100 border border-gray-300 rounded-lg p-3">
                  Dragging field...
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-xs text-gray-500 px-2">Quick Add</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(section.id, "assignedTo")}
                className="text-xs"
                disabled={section.fields.some((f) => f.id === "field-assignedTo")}
              >
                Assigned To
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(section.id, "createdBy")}
                className="text-xs"
                disabled={section.fields.some((f) => f.id === "field-createdBy")}
              >
                Created By
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(section.id, "updatedBy")}
                className="text-xs"
                disabled={section.fields.some((f) => f.id === "field-updatedBy")}
              >
                Updated By
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => addField(section.id)}
              className="w-full flex items-center gap-2 border-dashed"
            >
              <Plus className="h-4 w-4" />
              Add Custom Field
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function FormBuilderEditor({ template, onTemplateChange }: FormBuilderEditorProps) {
  const [editingField, setEditingField] = useState<{ sectionId: string; fieldId: string } | null>(null)
  const [selectedFields, setSelectedFields] = useState<string[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [showHeaderFooter, setShowHeaderFooter] = useState({
    header: (template as any).header?.show !== false,
    footer: (template as any).footer?.show !== false,
  })

  // Debug: Log when template prop changes
  console.log('🔧 [FormBuilderEditor] Template prop received:', {
    templateId: template.id,
    sectionsCount: template.sections?.length,
    sections: template.sections?.map(s => ({
      id: s.id,
      title: s.title,
      columns: s.metadata?.columns,
      metadata: s.metadata
    }))
  });

  // CRITICAL: Build availableFields at component level using useMemo
  // This ensures newly added fields are immediately available
  // Must be at top level (not inside JSX) to comply with Rules of Hooks
  const header = (template as any).header;
  const footer = (template as any).footer;
  const availableFields = useMemo(() => {
    return [
      ...(header ? header.fields : []),
      ...template.sections.flatMap((section) => section.fields),
      ...(footer ? footer.fields : []),
    ].map((field: FormField) => ({
      id: field.id,
      label: field.label,
      type: field.type,
    }));
  }, [template.sections, header, footer]);

  // Sensors for section dragging - activate immediately on grip icon
  const sectionSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 0, // Activate immediately for better responsiveness
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Sensors for field dragging - only activate when not dragging from section grip
  const fieldSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addSection = (type: "normal" | "header" | "footer" = "normal") => {
    const sectionType = type === "header" ? "header" : type === "footer" ? "footer" : "normal"
    const newSection: FormSection = {
      id: `${sectionType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: type === "header" ? "Header" : type === "footer" ? "Footer" : "New Section",
      description: "",
      fields: [],
      metadata: {
        columns: 1, // Initialize columns to 1 by default
        ...(type === "header" && { sectionType: "header", show: true }),
        ...(type === "footer" && { sectionType: "footer", show: true }),
      }
    }

    if (type === "header") {
      onTemplateChange({
        ...template,
        header: newSection,
        sections: template.sections,
      })
    } else if (type === "footer") {
      onTemplateChange({
        ...template,
        footer: newSection,
        sections: template.sections,
      })
    } else {
      onTemplateChange({
        ...template,
        sections: [...template.sections, newSection],
      })
    }
  }

  const updateSection = (sectionId: string, updates: Partial<FormSection>, sectionType?: "header" | "footer") => {
    if (sectionType === "header" && (template as any).header?.id === sectionId) {
      onTemplateChange({
        ...template,
        header: { ...(template as any).header, ...updates },
      })
    } else if (sectionType === "footer" && (template as any).footer?.id === sectionId) {
      onTemplateChange({
        ...template,
        footer: { ...(template as any).footer, ...updates },
      })
    } else {
      onTemplateChange({
        ...template,
        sections: template.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
      })
    }
  }

  const deleteSection = (sectionId: string, sectionType?: "header" | "footer") => {
    if (sectionType === "header") {
      onTemplateChange({
        ...template,
        header: undefined,
      })
    } else if (sectionType === "footer") {
      onTemplateChange({
        ...template,
        footer: undefined,
      })
    } else {
      onTemplateChange({
        ...template,
        sections: template.sections.filter((section) => section.id !== sectionId),
      })
    }
  }

  const addField = (sectionId: string, presetField?: Partial<FormField>, sectionType?: "header" | "footer") => {
    const newField: FormField = presetField ? {
      id: presetField.id || `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: presetField.type || "text",
      label: presetField.label || "New Field",
      placeholder: presetField.placeholder || "",
      required: presetField.required || false,
      ...presetField,
    } : {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "text",
      label: "New Field",
      placeholder: "",
      required: false,
    }

    if (sectionType === "header" && (template as any).header?.id === sectionId) {
      onTemplateChange({
        ...template,
        header: {
          ...(template as any).header,
          fields: [...((template as any).header?.fields || []), newField],
        },
      })
    } else if (sectionType === "footer" && (template as any).footer?.id === sectionId) {
      onTemplateChange({
        ...template,
        footer: {
          ...(template as any).footer,
          fields: [...((template as any).footer?.fields || []), newField],
        },
      })
    } else {
      onTemplateChange({
        ...template,
        sections: template.sections.map((section) =>
          section.id === sectionId ? { ...section, fields: [...section.fields, newField] } : section,
        ),
      })
    }
  }

  const addQuickField = (sectionId: string, fieldType: "assignedTo" | "createdBy" | "updatedBy", sectionType?: "header" | "footer") => {
    const quickFields = {
      assignedTo: {
        id: "field-assignedTo",
        type: "user" as const,
        label: "Assigned To",
        placeholder: "Select user to assign...",
        required: false,
        metadata: { entityType: "user" },
      },
      createdBy: {
        id: "field-createdBy",
        type: "user" as const,
        label: "Created By",
        placeholder: "User who created this record",
        required: false,
        readOnly: true,
        metadata: { entityType: "user", autoPopulated: true, readOnly: true },
      },
      updatedBy: {
        id: "field-updatedBy",
        type: "user" as const,
        label: "Updated By",
        placeholder: "User who last updated this record",
        required: false,
        readOnly: true,
        metadata: { entityType: "user", autoPopulated: true, readOnly: true },
      },
    }

    const field = quickFields[fieldType]
    const section = sectionType === "header" 
      ? (template as any).header
      : sectionType === "footer"
      ? (template as any).footer
      : template.sections.find((s) => s.id === sectionId)
    
    if (section?.fields.some((f: FormField) => f.id === field.id)) {
      return
    }

    addField(sectionId, field, sectionType)
  }

  const updateField = (sectionId: string, fieldId: string, updates: Partial<FormField>, sectionType?: "header" | "footer") => {
    if (sectionType === "header" && (template as any).header?.id === sectionId) {
      onTemplateChange({
        ...template,
        header: {
          ...(template as any).header,
          fields: ((template as any).header?.fields || []).map((field: FormField) => 
            field.id === fieldId ? { ...field, ...updates } : field
          ),
        },
      })
    } else if (sectionType === "footer" && (template as any).footer?.id === sectionId) {
      onTemplateChange({
        ...template,
        footer: {
          ...(template as any).footer,
          fields: ((template as any).footer?.fields || []).map((field: FormField) => 
            field.id === fieldId ? { ...field, ...updates } : field
          ),
        },
      })
    } else {
      onTemplateChange({
        ...template,
        sections: template.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                fields: section.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
              }
            : section,
        ),
      })
    }
  }

  const deleteField = (sectionId: string, fieldId: string, sectionType?: "header" | "footer") => {
    if (sectionType === "header" && (template as any).header?.id === sectionId) {
      onTemplateChange({
        ...template,
        header: {
          ...(template as any).header,
          fields: ((template as any).header?.fields || []).filter((field: FormField) => field.id !== fieldId),
        },
      })
    } else if (sectionType === "footer" && (template as any).footer?.id === sectionId) {
      onTemplateChange({
        ...template,
        footer: {
          ...(template as any).footer,
          fields: ((template as any).footer?.fields || []).filter((field: FormField) => field.id !== fieldId),
        },
      })
    } else {
      onTemplateChange({
        ...template,
        sections: template.sections.map((section) =>
          section.id === sectionId
            ? { ...section, fields: section.fields.filter((field) => field.id !== fieldId) }
            : section,
        ),
      })
    }
    setSelectedFields(prev => prev.filter(id => id !== fieldId))
  }

  const toggleFieldSelection = (fieldId: string) => {
    setSelectedFields(prev => 
      prev.includes(fieldId) 
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId]
    )
  }

  const handleAlignmentApplied = useCallback((updates: Array<{ sectionId: string; fieldId: string; updates: Partial<FormField> }>) => {
    const updatedTemplate = { ...template }
    
    updates.forEach(({ sectionId, fieldId, updates: fieldUpdates }) => {
      // Check header/footer
      if ((template as any).header?.id === sectionId) {
        updatedTemplate.header = {
          ...(template as any).header,
          fields: ((template as any).header?.fields || []).map((field: FormField) =>
            field.id === fieldId
              ? { ...field, ...fieldUpdates, metadata: { ...field.metadata, ...fieldUpdates.metadata } }
              : field
          ),
        }
      } else if ((template as any).footer?.id === sectionId) {
        updatedTemplate.footer = {
          ...(template as any).footer,
          fields: ((template as any).footer?.fields || []).map((field: FormField) =>
            field.id === fieldId
              ? { ...field, ...fieldUpdates, metadata: { ...field.metadata, ...fieldUpdates.metadata } }
              : field
          ),
        }
      } else {
        updatedTemplate.sections = updatedTemplate.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                fields: section.fields.map((field) =>
                  field.id === fieldId
                    ? { ...field, ...fieldUpdates, metadata: { ...field.metadata, ...fieldUpdates.metadata } }
                    : field
                )
              }
            : section
        )
      }
    })
    
    onTemplateChange(updatedTemplate)
  }, [template, onTemplateChange])

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as string
    // Check if it's a section drag first
    if (template.sections.some(s => s.id === id)) {
      setActiveSectionId(id)
      setActiveId(id)
      return
    }
    // Otherwise it's a field drag
    setActiveId(id)
  }

  const handleDragEnd = (event: DragEndEvent, sectionId: string, sectionType?: "header" | "footer") => {
    const { active, over } = event

    if (!over || active.id === over.id) {
      setActiveId(null)
      setActiveSectionId(null)
      return
    }

    // Handle section reordering
    if (activeSectionId && template.sections.some(s => s.id === active.id)) {
      const oldIndex = template.sections.findIndex(s => s.id === active.id)
      const newIndex = template.sections.findIndex(s => s.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newSections = arrayMove(template.sections, oldIndex, newIndex)
        onTemplateChange({
          ...template,
          sections: newSections,
        })
      }
      setActiveId(null)
      setActiveSectionId(null)
      return
    }

    // Handle field reordering within section
    const section = sectionType === "header"
      ? (template as any).header
      : sectionType === "footer"
      ? (template as any).footer
      : template.sections.find(s => s.id === sectionId)

    if (!section) {
      setActiveId(null)
      setActiveSectionId(null)
      return
    }

    const oldIndex = section.fields.findIndex((field: FormField) => field.id === active.id)
    const newIndex = section.fields.findIndex((field: FormField) => field.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newFields = arrayMove(section.fields, oldIndex, newIndex)

      if (sectionType === "header") {
        onTemplateChange({
          ...template,
          header: { ...(template as any).header, fields: newFields },
        })
      } else if (sectionType === "footer") {
        onTemplateChange({
          ...template,
          footer: { ...(template as any).footer, fields: newFields },
        })
      } else {
        onTemplateChange({
          ...template,
          sections: template.sections.map((s) =>
            s.id === sectionId ? { ...s, fields: newFields } : s
          ),
        })
      }
    }

    setActiveId(null)
    setActiveSectionId(null)
  }

  const updateSectionColumns = (sectionId: string, columns: 1 | 2 | 3 | 4 | 6 | 12, sectionType?: "header" | "footer") => {
    // Ensure columns is always a number
    const columnsNum = typeof columns === 'string' ? Number(columns) : columns;
    
    console.log('🔧 [Grid System] updateSectionColumns called:', {
      sectionId,
      columns,
      columnsNum,
      sectionType,
      columnsType: typeof columns,
      columnsNumType: typeof columnsNum
    });
    
    if (sectionType === "header" && (template as any).header?.id === sectionId) {
      console.log('🔧 [Grid System] Updating header section columns:', {
        sectionId,
        oldColumns: (template as any).header?.metadata?.columns,
        newColumns: columnsNum
      });
      onTemplateChange({
        ...template,
        header: {
          ...(template as any).header,
          metadata: { 
            ...(template as any).header.metadata, 
            columns: columnsNum as 1 | 2 | 3 | 4 | 6 | 12
          },
        },
      })
    } else if (sectionType === "footer" && (template as any).footer?.id === sectionId) {
      console.log('🔧 [Grid System] Updating footer section columns:', {
        sectionId,
        oldColumns: (template as any).footer?.metadata?.columns,
        newColumns: columnsNum
      });
      onTemplateChange({
        ...template,
        footer: {
          ...(template as any).footer,
          metadata: { 
            ...(template as any).footer.metadata, 
            columns: columnsNum as 1 | 2 | 3 | 4 | 6 | 12
          },
        },
      })
    } else {
      const section = template.sections.find(s => s.id === sectionId);
      console.log('🔧 [Grid System] Updating regular section columns:', {
        sectionId,
        sectionTitle: section?.title,
        oldColumns: section?.metadata?.columns,
        newColumns: columnsNum,
        allSections: template.sections.map(s => ({ id: s.id, title: s.title, columns: s.metadata?.columns }))
      });
      
      // Create a completely new sections array to ensure React detects the change
      const updatedSections = template.sections.map((section) => {
        if (section.id === sectionId) {
          // Create a completely new object to ensure React detects the change
          const updatedSection = {
                ...section,
                metadata: {
              ...(section.metadata || {}),
              columns: columnsNum as 1 | 2 | 3 | 4 | 6 | 12
            }
          };
          
          console.log('🔧 [Grid System] Section update details:', {
            sectionId: section.id,
            oldMetadata: section.metadata,
            newMetadata: updatedSection.metadata,
            oldColumns: section.metadata?.columns,
            newColumns: updatedSection.metadata.columns,
            columnsNum,
            columnsNumType: typeof columnsNum
          });
          
          return updatedSection;
        }
        return section;
      });
      
      // Verify the update was applied
      const updatedSection = updatedSections.find(s => s.id === sectionId);
      console.log('🔧 [Grid System] Verification - updated section in array:', {
        sectionId,
        found: !!updatedSection,
        columns: updatedSection?.metadata?.columns,
        metadata: updatedSection?.metadata
      });
      
      console.log('🔧 [Grid System] Updated sections array BEFORE onTemplateChange:', 
        updatedSections.map(s => ({ 
          id: s.id, 
          title: s.title, 
          columns: s.metadata?.columns,
          metadata: s.metadata 
        }))
      );
      
      // Create a completely new template object to ensure React detects the change
      const updatedTemplate = {
        ...template,
        sections: updatedSections
      };
      
      console.log('🔧 [Grid System] Calling onTemplateChange with updatedTemplate:', {
        templateId: updatedTemplate.id,
        sectionsCount: updatedTemplate.sections.length,
        targetSection: updatedTemplate.sections.find(s => s.id === sectionId),
        sections: updatedTemplate.sections.map(s => ({ 
          id: s.id, 
          title: s.title, 
          columns: s.metadata?.columns,
          fullMetadata: s.metadata
        }))
      });
      
      // Call onTemplateChange with the updated template
      onTemplateChange(updatedTemplate);
      
      console.log('🔧 [Grid System] onTemplateChange called, waiting for state update...');
    }
  }

  const toggleHeaderFooter = (type: "header" | "footer", show: boolean) => {
    setShowHeaderFooter(prev => ({ ...prev, [type]: show }))
    
    if (type === "header") {
      onTemplateChange({
        ...template,
        header: (template as any).header ? {
          ...(template as any).header,
          metadata: { ...(template as any).header.metadata, show },
        } : undefined,
      })
    } else {
      onTemplateChange({
        ...template,
        footer: (template as any).footer ? {
          ...(template as any).footer,
          metadata: { ...(template as any).footer.metadata, show },
        } : undefined,
      })
    }
  }

  const renderSection = (section: FormSection, sectionType?: "header" | "footer") => {
    const sectionId = section.id
    const fields = section.fields || []
    const isHeader = sectionType === "header"
    const isFooter = sectionType === "footer"
    const isRegularSection = !isHeader && !isFooter

    // For header/footer sections, we need to make them sortable too
    // But they're rendered separately, so we'll handle drag differently
    const sectionDragProps = useSortable({ 
      id: sectionId,
      disabled: true // Disable drag for header/footer in the main context
    })

    return (
      <Card key={sectionId} className={cn(
        "border-l-4",
        isHeader && "border-l-green-500",
        isFooter && "border-l-purple-500",
        isRegularSection && "border-l-blue-500"
      )}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="cursor-grab active:cursor-grabbing" title="Section drag is not available for header/footer sections">
              <GripVertical className="h-5 w-5 text-gray-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {isHeader && <Type className="h-4 w-4 text-green-600" />}
                  {isFooter && <FileText className="h-4 w-4 text-purple-600" />}
                  <Input
                    value={section.title}
                    onChange={(e) => updateSection(sectionId, { title: e.target.value }, sectionType)}
                    className="font-semibold text-lg border-none p-0 h-auto focus-visible:ring-0"
                    placeholder={isHeader ? "Header title..." : isFooter ? "Footer title..." : "Section title..."}
                  />
                </div>
                <Input
                  value={section.description || ""}
                  onChange={(e) => updateSection(sectionId, { description: e.target.value }, sectionType)}
                  className="text-sm text-gray-600 border-none p-0 h-auto mt-1 focus-visible:ring-0"
                  placeholder="Section description (optional)..."
                />
                {(isHeader || isFooter) && (
                  <div className="flex items-center gap-2 mt-2">
                    <Checkbox
                      id={`${sectionType}-show`}
                      checked={showHeaderFooter[sectionType || "header"]}
                      onCheckedChange={(checked) => toggleHeaderFooter(sectionType || "header", checked as boolean)}
                    />
                    <Label htmlFor={`${sectionType}-show`} className="text-xs text-gray-600 cursor-pointer">
                      Show in form
                    </Label>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={String((section.metadata as any)?.columns ?? 1)}
                onValueChange={(value) => {
                  const columns = Number(value) as 1 | 2 | 3 | 4 | 6 | 12
                  updateSectionColumns(sectionId, columns, sectionType)
                }}
              >
                <SelectTrigger className="w-24 h-8">
                  <Grid3x3 className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Columns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Column</SelectItem>
                  <SelectItem value="2">2 Columns</SelectItem>
                  <SelectItem value="3">3 Columns</SelectItem>
                  <SelectItem value="4">4 Columns</SelectItem>
                  <SelectItem value="6">6 Columns</SelectItem>
                  <SelectItem value="12">12 Columns</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="secondary">
                {fields.length} field{fields.length !== 1 ? "s" : ""}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteSection(sectionId, sectionType)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <DndContext
            id={`field-context-${sectionId}`}
            sensors={fieldSensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              // Only handle field drags here, not section drags
              const id = e.active.id as string
              const isSection = template.sections.some(s => s.id === id)
              const isField = fields.some(f => f.id === id)
              
              // Only handle if it's a field drag
              if (!isSection && isField) {
                handleDragStart(e)
              }
              // If it's a section drag, do nothing - let parent context handle it
            }}
            onDragEnd={(e) => {
              // Only handle field drags here, not section drags
              const id = e.active.id as string
              const isSection = template.sections.some(s => s.id === id)
              const isField = fields.some(f => f.id === id)
              
              // Only handle if it's a field drag
              if (!isSection && isField) {
                handleDragEnd(e, sectionId, sectionType)
              }
              // If it's a section drag, do nothing - let parent context handle it
            }}
          >
            <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
              {fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  sectionId={sectionId}
                  isSelected={selectedFields.includes(field.id)}
                  onSelect={() => toggleFieldSelection(field.id)}
                  onEdit={() => setEditingField({ sectionId, fieldId: field.id })}
                  onDelete={() => deleteField(sectionId, field.id, sectionType)}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeId && !activeSectionId && fields.some(f => f.id === activeId) ? (
                <div className="opacity-50 bg-gray-100 border border-gray-300 rounded-lg p-3">
                  Dragging...
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-gray-200"></div>
              <span className="text-xs text-gray-500 px-2">Quick Add</span>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(sectionId, "assignedTo", sectionType)}
                className="text-xs"
                disabled={fields.some((f) => f.id === "field-assignedTo")}
              >
                Assigned To
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(sectionId, "createdBy", sectionType)}
                className="text-xs"
                disabled={fields.some((f) => f.id === "field-createdBy")}
              >
                Created By
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addQuickField(sectionId, "updatedBy", sectionType)}
                className="text-xs"
                disabled={fields.some((f) => f.id === "field-updatedBy")}
              >
                Updated By
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => addField(sectionId, undefined, sectionType)}
              className="w-full flex items-center gap-2 border-dashed"
            >
              <Plus className="h-4 w-4" />
              Add Custom Field
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Form Builder</h2>
        <div className="flex gap-2">
          <Button onClick={() => addSection("header")} variant="outline" className="flex items-center gap-2">
            <Type className="h-4 w-4" />
            Add Header
          </Button>
          <Button onClick={() => addSection("footer")} variant="outline" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Add Footer
          </Button>
          <Button onClick={() => addSection()} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {/* Alignment Tools */}
      {selectedFields.length > 0 && (
        <AlignmentTools
          selectedFields={selectedFields}
          sections={[
            ...(header ? [header] : []),
            ...template.sections,
            ...(footer ? [footer] : []),
          ]}
          onAlignmentApplied={handleAlignmentApplied}
        />
      )}

      {/* Header Section */}
      {header && renderSection(header, "header")}

      {/* Regular Sections */}
      {template.sections.length === 0 && !header && !footer ? (
        <Card className="border-dashed border-2 border-gray-300">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-gray-500 text-center">
              <h3 className="text-lg font-medium mb-2">No sections yet</h3>
              <p className="mb-4">Start building your form by adding a section</p>
              <Button onClick={() => addSection()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Your First Section
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          id="section-context"
          sensors={sectionSensors}
          collisionDetection={closestCenter}
          onDragStart={(e) => {
            const id = e.active.id as string
            // Check if it's a section drag
            const isSection = template.sections.some(s => s.id === id)
            if (isSection) {
              setActiveSectionId(id)
              setActiveId(id)
            }
          }}
          onDragEnd={(e) => {
            const { active, over } = e
            if (!over || active.id === over.id) {
              setActiveId(null)
              setActiveSectionId(null)
              return
            }

            // Check if both are sections
            const activeIsSection = template.sections.some(s => s.id === active.id)
            const overIsSection = template.sections.some(s => s.id === over.id)

            if (activeIsSection && overIsSection) {
              const oldIndex = template.sections.findIndex(s => s.id === active.id)
              const newIndex = template.sections.findIndex(s => s.id === over.id)
              
              if (oldIndex !== -1 && newIndex !== -1) {
                const newSections = arrayMove(template.sections, oldIndex, newIndex)
                onTemplateChange({
                  ...template,
                  sections: newSections,
                })
              }
            }
            setActiveId(null)
            setActiveSectionId(null)
          }}
        >
          <SortableContext items={template.sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {template.sections.map((section) => {
                // Use a key that includes the columns value to force re-render when columns change
                const sectionKey = `${section.id}-${(section.metadata as any)?.columns ?? 1}`;
                console.log('🔧 [FormBuilderEditor] Rendering SortableSectionCard:', {
                  sectionId: section.id,
                  sectionTitle: section.title,
                  columns: section.metadata?.columns,
                  sectionKey
                });
                
                return (
                  <SortableSectionCard
                    key={sectionKey}
                    section={section}
                    template={template}
                    activeSectionId={activeSectionId}
                    selectedFields={selectedFields}
                    editingField={editingField}
                    fieldSensors={fieldSensors}
                    onTemplateChange={onTemplateChange}
                    updateSection={updateSection}
                    updateSectionColumns={updateSectionColumns}
                    deleteSection={deleteSection}
                    handleDragStart={handleDragStart}
                    handleDragEnd={handleDragEnd}
                    addQuickField={addQuickField}
                    addField={addField}
                    toggleFieldSelection={toggleFieldSelection}
                    setEditingField={setEditingField}
                    deleteField={deleteField}
                    activeId={activeId}
                  />
                );
              })}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeSectionId ? (
              <div className="opacity-50 bg-gray-100 border border-gray-300 rounded-lg p-3">
                Dragging section...
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Footer Section */}
      {footer && renderSection(footer, "footer")}

      {editingField && (
        <FieldEditor
          field={
            [
              ...(header ? [header] : []),
              ...template.sections,
              ...(footer ? [footer] : []),
            ]
              .find((s) => s.id === editingField.sectionId)
              ?.fields.find((f) => f.id === editingField.fieldId)!
          }
          availableFields={availableFields}
          templateId={template.id}
          onSave={(updatedField) => {
            const sectionType = header?.id === editingField.sectionId 
              ? "header" 
              : footer?.id === editingField.sectionId 
              ? "footer" 
              : undefined
            updateField(editingField.sectionId, editingField.fieldId, updatedField, sectionType)
            setEditingField(null)
          }}
          onCancel={() => setEditingField(null)}
        />
      )}
    </div>
  )
}
