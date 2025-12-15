"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Palette, Type, Move, Square } from "lucide-react"
import type { LayoutField, LayoutSection } from "./pdf-layout-builder"

interface PropertyPanelProps {
  selectedField: LayoutField | null
  selectedSection: LayoutSection | undefined
  onFieldUpdate: (fieldId: string, updates: Partial<LayoutField>) => void
  onSectionUpdate: (updates: Partial<LayoutSection>) => void
}

export function PropertyPanel({ selectedField, selectedSection, onFieldUpdate, onSectionUpdate }: PropertyPanelProps) {
  if (!selectedField && !selectedSection) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <div className="text-center text-gray-500">
          <Square className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>Select a field or section to edit properties</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {selectedField && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Type className="h-5 w-5" />
              Field Properties
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{selectedField.fieldType}</Badge>
              <Badge variant="secondary">{selectedField.label}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Position & Size */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Move className="h-4 w-4" />
                Position & Size
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">X Position</Label>
                  <Input
                    type="number"
                    value={selectedField.x}
                    onChange={(e) => onFieldUpdate(selectedField.id, { x: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y Position</Label>
                  <Input
                    type="number"
                    value={selectedField.y}
                    onChange={(e) => onFieldUpdate(selectedField.id, { y: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Width</Label>
                  <Input
                    type="number"
                    value={selectedField.width}
                    onChange={(e) => onFieldUpdate(selectedField.id, { width: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Height</Label>
                  <Input
                    type="number"
                    value={selectedField.height}
                    onChange={(e) => onFieldUpdate(selectedField.id, { height: Number(e.target.value) })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Typography */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Type className="h-4 w-4" />
                Typography
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Font Size</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedField.fontSize]}
                      onValueChange={([value]) => onFieldUpdate(selectedField.id, { fontSize: value })}
                      min={8}
                      max={24}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-8">{selectedField.fontSize}px</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Font Weight</Label>
                  <Select
                    value={selectedField.fontWeight}
                    onValueChange={(value: "normal" | "bold") => onFieldUpdate(selectedField.id, { fontWeight: value })}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="bold">Bold</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Text Align</Label>
                  <Select
                    value={selectedField.textAlign}
                    onValueChange={(value: "left" | "center" | "right") =>
                      onFieldUpdate(selectedField.id, { textAlign: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="left">Left</SelectItem>
                      <SelectItem value="center">Center</SelectItem>
                      <SelectItem value="right">Right</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Colors */}
            <div>
              <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                <Palette className="h-4 w-4" />
                Colors
              </Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Text Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={selectedField.color}
                      onChange={(e) => onFieldUpdate(selectedField.id, { color: e.target.value })}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={selectedField.color}
                      onChange={(e) => onFieldUpdate(selectedField.id, { color: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Background Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={
                        selectedField.backgroundColor === "transparent" ? "#ffffff" : selectedField.backgroundColor
                      }
                      onChange={(e) => onFieldUpdate(selectedField.id, { backgroundColor: e.target.value })}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Select
                      value={selectedField.backgroundColor}
                      onValueChange={(value) => onFieldUpdate(selectedField.id, { backgroundColor: value })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="transparent">Transparent</SelectItem>
                        <SelectItem value="#ffffff">White</SelectItem>
                        <SelectItem value="#f8f9fa">Light Gray</SelectItem>
                        <SelectItem value="#e9ecef">Gray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Border & Spacing */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Border & Spacing</Label>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Border Width</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedField.borderWidth]}
                      onValueChange={([value]) => onFieldUpdate(selectedField.id, { borderWidth: value })}
                      min={0}
                      max={5}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-8">{selectedField.borderWidth}px</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Border Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      type="color"
                      value={selectedField.borderColor}
                      onChange={(e) => onFieldUpdate(selectedField.id, { borderColor: e.target.value })}
                      className="w-12 h-8 p-1 border rounded"
                    />
                    <Input
                      type="text"
                      value={selectedField.borderColor}
                      onChange={(e) => onFieldUpdate(selectedField.id, { borderColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Padding</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Slider
                      value={[selectedField.padding]}
                      onValueChange={([value]) => onFieldUpdate(selectedField.id, { padding: value })}
                      min={0}
                      max={20}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-xs w-8">{selectedField.padding}px</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSection && !selectedField && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Square className="h-5 w-5" />
              Section Properties
            </CardTitle>
            <Badge variant="outline">{selectedSection.type}</Badge>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Height (px)</Label>
              <Input
                type="number"
                value={selectedSection.height}
                onChange={(e) => onSectionUpdate({ height: Number(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Background Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="color"
                  value={selectedSection.backgroundColor}
                  onChange={(e) => onSectionUpdate({ backgroundColor: e.target.value })}
                  className="w-12 h-8 p-1 border rounded"
                />
                <Input
                  type="text"
                  value={selectedSection.backgroundColor}
                  onChange={(e) => onSectionUpdate({ backgroundColor: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selectedSection.borderBottom}
                onChange={(e) => onSectionUpdate({ borderBottom: e.target.checked })}
                className="rounded"
              />
              <Label className="text-xs">Show bottom border</Label>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
