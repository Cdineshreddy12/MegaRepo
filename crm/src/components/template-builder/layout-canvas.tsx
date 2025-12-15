"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2 } from "lucide-react"
import type { PDFLayout, LayoutField, LayoutSection } from "./pdf-layout-builder"
import type { FormField } from "./form-builder"

interface LayoutCanvasProps {
  layout: PDFLayout
  selectedField: LayoutField | null
  selectedSection: string
  onFieldSelect: (field: LayoutField | null) => void
  onSectionSelect: (sectionId: string) => void
  onFieldUpdate: (fieldId: string, updates: Partial<LayoutField>) => void
  onFieldRemove: (fieldId: string) => void
  onFieldDrop: (field: FormField, sectionId: string, position: { x: number; y: number }) => void
}

export function LayoutCanvas({
  layout,
  selectedField,
  selectedSection,
  onFieldSelect,
  onSectionSelect,
  onFieldUpdate,
  onFieldRemove,
  onFieldDrop,
}: LayoutCanvasProps) {
  const [draggedField, setDraggedField] = useState<LayoutField | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })

  const handleFieldMouseDown = useCallback(
    (field: LayoutField, e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()

      onFieldSelect(field)
      setDraggedField(field)

      const rect = e.currentTarget.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    [onFieldSelect],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!draggedField) return

      const canvas = e.currentTarget as HTMLElement
      const rect = canvas.getBoundingClientRect()
      const newX = Math.max(0, e.clientX - rect.left - dragOffset.x)
      const newY = Math.max(0, e.clientY - rect.top - dragOffset.y)

      onFieldUpdate(draggedField.id, { x: newX, y: newY })
    },
    [draggedField, dragOffset, onFieldUpdate],
  )

  const handleMouseUp = useCallback(() => {
    setDraggedField(null)
    setDragOffset({ x: 0, y: 0 })
  }, [])

  const renderField = (field: LayoutField) => {
    const isSelected = selectedField?.id === field.id

    return (
      <div
        key={field.id}
        className={`absolute cursor-move border-2 ${
          isSelected ? "border-blue-500 bg-blue-50" : "border-gray-300 bg-white"
        } rounded shadow-sm hover:shadow-md transition-shadow`}
        style={{
          left: field.x,
          top: field.y,
          width: field.width,
          height: field.height,
          fontSize: field.fontSize,
          fontWeight: field.fontWeight,
          color: field.color,
          backgroundColor: field.backgroundColor === "transparent" ? "white" : field.backgroundColor,
          textAlign: field.textAlign,
          borderWidth: field.borderWidth,
          borderColor: field.borderColor,
          padding: field.padding,
        }}
        onMouseDown={(e) => handleFieldMouseDown(field, e)}
      >
        <div className="h-full flex items-center justify-center text-xs font-medium text-gray-700 px-2">
          {field.label}
        </div>

        {isSelected && (
          <div className="absolute -top-8 left-0 flex gap-1">
            <Button
              size="sm"
              variant="destructive"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation()
                onFieldRemove(field.id)
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Resize handles */}
        {isSelected && (
          <>
            <div
              className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-6 bg-blue-500 cursor-ew-resize"
              onMouseDown={(e) => {
                e.stopPropagation()
                // Handle resize logic here
              }}
            />
            <div
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-6 h-2 bg-blue-500 cursor-ns-resize"
              onMouseDown={(e) => {
                e.stopPropagation()
                // Handle resize logic here
              }}
            />
          </>
        )}
      </div>
    )
  }

  const renderSection = (section: LayoutSection) => {
    const isSelected = selectedSection === section.id

    return (
      <div
        key={section.id}
        className={`relative border-2 ${
          isSelected ? "border-blue-500" : "border-gray-200"
        } rounded-lg mb-4 overflow-hidden`}
        style={{
          height: section.height,
          backgroundColor: section.backgroundColor,
          borderBottom: section.borderBottom ? "2px solid #e5e7eb" : "none",
        }}
        onClick={() => onSectionSelect(section.id)}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Section Header */}
        <div className="absolute top-2 left-2 z-10">
          <Badge variant={isSelected ? "default" : "secondary"} className="text-xs">
            {section.type.charAt(0).toUpperCase() + section.type.slice(1)}
          </Badge>
        </div>

        {/* Section Fields */}
        {section.fields.map(renderField)}

        {/* Drop Zone Indicator */}
        {isSelected && section.fields.length === 0 && (
          <div className="absolute inset-4 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
            <p className="text-gray-500 text-sm">Drop fields here or click a field from the palette</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full min-h-[600px] overflow-auto bg-gray-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Page Preview */}
        <div
          className="bg-white shadow-lg rounded-lg overflow-hidden"
          style={{
            width: layout.orientation === "portrait" ? "210mm" : "297mm",
            minHeight: layout.orientation === "portrait" ? "297mm" : "210mm",
            transform: "scale(0.7)",
            transformOrigin: "top center",
          }}
        >
          <div
            className="relative"
            style={{
              padding: `${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm`,
            }}
          >
            {layout.sections.map(renderSection)}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>Click on a section to select it, then drag fields from the palette or click to add them.</p>
          <p>Drag fields to reposition them. Click on a field to select and customize it.</p>
        </div>
      </div>
    </div>
  )
}
