"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Eye, Layout, FileText, Settings } from "lucide-react"
import type { FormTemplate, FormSubmission, FormField } from "./form-builder"
import { FieldPalette } from "./field-palette"
import { LayoutCanvas } from "./layout-canvas"
import { PropertyPanel } from "./property-panel"
import { PDFPreview } from "./pdf-preview"
import { LayoutTemplateManager } from "./layout-template-manager"
import { useToast } from "@/hooks/useToast"

export interface LayoutField {
  id: string
  fieldId: string
  fieldType: string
  label: string
  x: number
  y: number
  width: number
  height: number
  fontSize: number
  fontWeight: "normal" | "bold"
  color: string
  backgroundColor: string
  textAlign: "left" | "center" | "right"
  borderWidth: number
  borderColor: string
  padding: number
}

export interface LayoutSection {
  id: string
  type: "header" | "body" | "footer"
  height: number
  fields: LayoutField[]
  backgroundColor: string
  borderBottom: boolean
}

export interface PDFLayout {
  id: string
  name: string
  description?: string
  templateId: string
  sections: LayoutSection[]
  pageSize: "A4" | "Letter" | "Legal"
  orientation: "portrait" | "landscape"
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
  createdAt: Date
  updatedAt: Date
}

interface PDFLayoutBuilderProps {
  template: FormTemplate
  submissions: FormSubmission[]
  onClose: () => void
}

export function PDFLayoutBuilder({ template, submissions, onClose }: PDFLayoutBuilderProps) {
  const [activeTab, setActiveTab] = useState("design")
  const [selectedField, setSelectedField] = useState<LayoutField | null>(null)
  const [selectedSection, setSelectedSection] = useState<string>("body")
  const [currentLayout, setCurrentLayout] = useState<PDFLayout>({
    id: "",
    name: `${template.name} Report Layout`,
    description: "",
    templateId: template.id,
    sections: [
      {
        id: "header",
        type: "header",
        height: 80,
        fields: [],
        backgroundColor: "#ffffff",
        borderBottom: true,
      },
      {
        id: "body",
        type: "body",
        height: 600,
        fields: [],
        backgroundColor: "#ffffff",
        borderBottom: false,
      },
      {
        id: "footer",
        type: "footer",
        height: 60,
        fields: [],
        backgroundColor: "#f8f9fa",
        borderBottom: false,
      },
    ],
    pageSize: "A4",
    orientation: "portrait",
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    createdAt: new Date(),
    updatedAt: new Date(),
  })
  const [savedLayouts, setSavedLayouts] = useState<PDFLayout[]>([])
  const [previewSubmission, setPreviewSubmission] = useState<FormSubmission | null>(
    submissions.length > 0 ? submissions[0] : null,
  )
  const { toast } = useToast()

  const updateLayout = useCallback((updates: Partial<PDFLayout>) => {
    setCurrentLayout((prev) => ({ ...prev, ...updates, updatedAt: new Date() }))
  }, [])

  const updateSection = useCallback((sectionId: string, updates: Partial<LayoutSection>) => {
    setCurrentLayout((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, ...updates } : section)),
      updatedAt: new Date(),
    }))
  }, [])

  const addFieldToLayout = useCallback(
    (field: FormField, sectionId: string, position: { x: number; y: number }) => {
      const newLayoutField: LayoutField = {
        id: `layout-field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fieldId: field.id,
        fieldType: field.type,
        label: field.label,
        x: position.x,
        y: position.y,
        width: 200,
        height: field.type === "textarea" ? 60 : 30,
        fontSize: 12,
        fontWeight: "normal",
        color: "#000000",
        backgroundColor: "transparent",
        textAlign: "left",
        borderWidth: 0,
        borderColor: "#cccccc",
        padding: 4,
      }

      updateSection(sectionId, {
        fields: [...(currentLayout.sections.find((s) => s.id === sectionId)?.fields || []), newLayoutField],
      })

      toast({
        title: "Field Added",
        description: `${field.label} has been added to the ${sectionId} section`,
      })
    },
    [currentLayout.sections, updateSection, toast],
  )

  const updateLayoutField = useCallback((fieldId: string, updates: Partial<LayoutField>) => {
    setCurrentLayout((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        fields: section.fields.map((field) => (field.id === fieldId ? { ...field, ...updates } : field)),
      })),
      updatedAt: new Date(),
    }))
  }, [])

  const removeLayoutField = useCallback((fieldId: string) => {
    setCurrentLayout((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => ({
        ...section,
        fields: section.fields.filter((field) => field.id !== fieldId),
      })),
      updatedAt: new Date(),
    }))
    setSelectedField(null)
  }, [])

  const saveLayout = useCallback(() => {
    if (!currentLayout.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a layout name",
        variant: "destructive",
      })
      return
    }

    const layoutToSave = {
      ...currentLayout,
      id: currentLayout.id || `layout-${Date.now()}`,
      updatedAt: new Date(),
    }

    if (!currentLayout.id) {
      layoutToSave.createdAt = new Date()
    }

    const updatedLayouts = currentLayout.id
      ? savedLayouts.map((l) => (l.id === currentLayout.id ? layoutToSave : l))
      : [...savedLayouts, layoutToSave]

    setSavedLayouts(updatedLayouts)
    setCurrentLayout(layoutToSave)
    localStorage.setItem("pdfLayouts", JSON.stringify(updatedLayouts))

    toast({
      title: "Success",
      description: "Layout saved successfully",
    })
  }, [currentLayout, savedLayouts, toast])

  const loadLayout = useCallback((layout: PDFLayout) => {
    setCurrentLayout(layout)
    setActiveTab("design")
  }, [])

  const duplicateLayout = useCallback((layout: PDFLayout) => {
    const duplicated = {
      ...layout,
      id: "",
      name: `${layout.name} (Copy)`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    setCurrentLayout(duplicated)
    setActiveTab("design")
  }, [])

  const deleteLayout = useCallback(
    (layoutId: string) => {
      const updatedLayouts = savedLayouts.filter((l) => l.id !== layoutId)
      setSavedLayouts(updatedLayouts)
      localStorage.setItem("pdfLayouts", JSON.stringify(updatedLayouts))

      toast({
        title: "Success",
        description: "Layout deleted successfully",
      })
    },
    [savedLayouts, toast],
  )

  // Get available fields from the template
  const availableFields = template.sections.flatMap((section) =>
    section.fields.map((field) => ({ ...field, sectionTitle: section.title })),
  )

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full h-full  max-h-[100vh] overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-4">
              <FileText className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">PDF Layout Builder</h2>
                <p className="text-sm text-gray-600">Design custom PDF reports for {template.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={saveLayout} className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                Save Layout
              </Button>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>

          {/* Layout Name */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label htmlFor="layout-name">Layout Name</Label>
                <Input
                  id="layout-name"
                  value={currentLayout.name}
                  onChange={(e) => updateLayout({ name: e.target.value })}
                  placeholder="Enter layout name..."
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="layout-description">Description (Optional)</Label>
                <Input
                  id="layout-description"
                  value={currentLayout.description || ""}
                  onChange={(e) => updateLayout({ description: e.target.value })}
                  placeholder="Enter layout description..."
                  className="mt-1"
                />
              </div>
              <div className="w-48">
                <Label htmlFor="preview-submission">Preview Data</Label>
                <Select
                  value={previewSubmission?.id || ""}
                  onValueChange={(value) => {
                    const submission = submissions.find((s) => s.id === value)
                    setPreviewSubmission(submission || null)
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select submission" />
                  </SelectTrigger>
                  <SelectContent>
                    {submissions.map((submission, index) => (
                      <SelectItem key={submission.id} value={submission.id}>
                        Submission #{index + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="mx-4 mt-4 grid w-fit grid-cols-4">
                <TabsTrigger value="design" className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Design
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Preview
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Settings
                </TabsTrigger>
                <TabsTrigger value="templates" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Templates
                </TabsTrigger>
              </TabsList>

              <TabsContent value="design" className="flex-1 flex overflow-hidden mt-4">
                <div className="flex-1 flex overflow-hidden">
                  {/* Field Palette */}
                  <div className="w-64 border-r bg-gray-50 overflow-y-auto">
                    <FieldPalette
                      fields={availableFields}
                      onFieldSelect={(field) => {
                        // Add field to center of selected section
                        const section = currentLayout.sections.find((s) => s.id === selectedSection)
                        if (section) {
                          addFieldToLayout(field, selectedSection, { x: 50, y: 50 })
                        }
                      }}
                    />
                  </div>

                  {/* Layout Canvas */}
                  <div className="flex-1 overflow-auto">
                    <LayoutCanvas
                      layout={currentLayout}
                      selectedField={selectedField}
                      selectedSection={selectedSection}
                      onFieldSelect={setSelectedField}
                      onSectionSelect={setSelectedSection}
                      onFieldUpdate={updateLayoutField}
                      onFieldRemove={removeLayoutField}
                      onFieldDrop={addFieldToLayout}
                    />
                  </div>

                  {/* Property Panel */}
                  <div className="w-80 border-l bg-gray-50 overflow-y-auto">
                    <PropertyPanel
                      selectedField={selectedField}
                      selectedSection={currentLayout.sections.find((s) => s.id === selectedSection)}
                      onFieldUpdate={updateLayoutField}
                      onSectionUpdate={(updates) => updateSection(selectedSection, updates)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="overflow-auto mt-4">
                <PDFPreview layout={currentLayout} submission={previewSubmission} template={template} />
              </TabsContent>

              <TabsContent value="settings" className="p-4">
                <div className="max-w-2xl space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Page Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Page Size</Label>
                          <Select
                            value={currentLayout.pageSize}
                            onValueChange={(value: "A4" | "Letter" | "Legal") => updateLayout({ pageSize: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                              <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                              <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Orientation</Label>
                          <Select
                            value={currentLayout.orientation}
                            onValueChange={(value: "portrait" | "landscape") => updateLayout({ orientation: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="portrait">Portrait</SelectItem>
                              <SelectItem value="landscape">Landscape</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div>
                        <Label className="mb-3 block">Margins (mm)</Label>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs">Top</Label>
                            <Input
                              type="number"
                              value={currentLayout.margins.top}
                              onChange={(e) =>
                                updateLayout({
                                  margins: { ...currentLayout.margins, top: Number(e.target.value) },
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Right</Label>
                            <Input
                              type="number"
                              value={currentLayout.margins.right}
                              onChange={(e) =>
                                updateLayout({
                                  margins: { ...currentLayout.margins, right: Number(e.target.value) },
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Bottom</Label>
                            <Input
                              type="number"
                              value={currentLayout.margins.bottom}
                              onChange={(e) =>
                                updateLayout({
                                  margins: { ...currentLayout.margins, bottom: Number(e.target.value) },
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Left</Label>
                            <Input
                              type="number"
                              value={currentLayout.margins.left}
                              onChange={(e) =>
                                updateLayout({
                                  margins: { ...currentLayout.margins, left: Number(e.target.value) },
                                })
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="templates" className="p-4">
                <LayoutTemplateManager
                  layouts={savedLayouts}
                  onLoadLayout={loadLayout}
                  onDuplicateLayout={duplicateLayout}
                  onDeleteLayout={deleteLayout}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
