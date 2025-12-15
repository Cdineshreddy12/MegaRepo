"use client"

import { Label } from "@/components/ui/label"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, Download, Calendar, Filter, FileText, Layout } from "lucide-react"
import type { FormSubmission, FormTemplate } from "./form-builder"
import { PDFLayoutBuilder } from "./pdf-layout-builder"
import { format } from "date-fns"

interface FormDataViewerProps {
  submissions: FormSubmission[]
  templates: FormTemplate[]
}

export function FormDataViewer({ submissions, templates }: FormDataViewerProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all")
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null)
  const [showPDFBuilder, setShowPDFBuilder] = useState(false)
  const [pdfBuilderTemplate, setPdfBuilderTemplate] = useState<FormTemplate | null>(null)

  const filteredSubmissions =
    selectedTemplate === "all" ? submissions : submissions.filter((sub) => sub.templateId === selectedTemplate)

  const getTemplateName = (templateId: string) => {
    const template = templates.find((t) => t.id === templateId)
    return template?.name || "Unknown Template"
  }

  const getTemplate = (templateId: string) => {
    return templates.find((t) => t.id === templateId)
  }

  const exportData = () => {
    const dataStr = JSON.stringify(filteredSubmissions, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement("a")
    link.href = url
    link.download = `form-submissions-${format(new Date(), "yyyy-MM-dd")}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const openPDFBuilder = (templateId: string) => {
    console.log("Opening PDF builder for template:", templateId)
    console.log(
      "Available templates:",
      templates.map((t) => ({ id: t.id, name: t.name })),
    )
    console.log(
      "Available submissions:",
      submissions.map((s) => ({ id: s.id, templateId: s.templateId })),
    )

    if (!templateId || templateId.trim() === "") {
      console.error("Template ID is empty or undefined")
      alert("Error: Template ID is missing. Please ensure the form submission has a valid template ID.")
      return
    }

    const template = getTemplate(templateId)
    if (template) {
      console.log("Found template:", template.name)
      setPdfBuilderTemplate(template)
      setShowPDFBuilder(true)
    } else {
      console.error("Template not found:", templateId)
      console.error(
        "Available template IDs:",
        templates.map((t) => t.id),
      )
      alert(
        `Error: Template with ID "${templateId}" not found. Available templates: ${templates.map((t) => t.name).join(", ")}`,
      )
    }
  }

  // Get unique templates that have submissions
  const templatesWithSubmissions = templates.filter((template) =>
    submissions.some((submission) => submission.templateId === template.id),
  )

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="text-gray-500 text-center">
            <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
            <p>Form submissions will appear here once users start filling out your forms</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Form Submissions</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Templates</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={exportData} variant="outline" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="secondary">
            {filteredSubmissions.length} submission{filteredSubmissions.length !== 1 ? "s" : ""}
          </Badge>
          {selectedTemplate !== "all" && (
            <Badge variant="outline">Filtered by: {getTemplateName(selectedTemplate)}</Badge>
          )}
        </div>

        {/* PDF Layout Builder Quick Access */}
        {templatesWithSubmissions.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Layout className="h-5 w-5" />
                PDF Report Builder
              </CardTitle>
              <p className="text-sm text-gray-600">Create custom PDF layouts for your form submissions</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {templatesWithSubmissions.map((template) => (
                  <Button
                    key={template.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log("Quick access - opening PDF builder for template:", template.id, template.name)
                      if (template.id && template.id.trim() !== "") {
                        openPDFBuilder(template.id)
                      } else {
                        alert("Error: This template doesn't have a valid ID. Please save the template first.")
                      }
                    }}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Design PDF for {template.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{getTemplateName(submission.templateId)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(submission.submittedAt), "MMM d, yyyy HH:mm")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{submission.tenantId}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedSubmission(submission)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            console.log(
                              "Table row - opening PDF builder for submission:",
                              submission.id,
                              "template:",
                              submission.templateId,
                            )
                            if (submission.templateId && submission.templateId.trim() !== "") {
                              openPDFBuilder(submission.templateId)
                            } else {
                              alert("Error: This submission doesn't have a valid template ID.")
                            }
                          }}
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <FileText className="h-3 w-3" />
                          PDF Layout
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedSubmission && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Submission Details</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {getTemplateName(selectedSubmission.templateId)} •{" "}
                    {format(new Date(selectedSubmission.submittedAt), "PPP")}
                  </p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedSubmission(null)}>
                  ×
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {Object.entries(selectedSubmission.data).map(([fieldId, value]) => (
                  <div key={fieldId} className="border-b pb-3">
                    <Label className="font-medium text-sm text-gray-700">
                      {fieldId.replace(/^field-\d+-/, "").replace(/-/g, " ")}
                    </Label>
                    <div className="mt-1">
                      {typeof value === "boolean" ? (
                        <Badge variant={value ? "default" : "secondary"}>{value ? "Yes" : "No"}</Badge>
                      ) : Array.isArray(value) ? (
                        <div className="flex flex-wrap gap-1">
                          {value.map((item, index) => (
                            <Badge key={index} variant="outline">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-900">{value || "No response"}</p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {showPDFBuilder && pdfBuilderTemplate && (
        <PDFLayoutBuilder
          template={pdfBuilderTemplate}
          submissions={submissions.filter((s) => s.templateId === pdfBuilderTemplate.id)}
          onClose={() => {
            setShowPDFBuilder(false)
            setPdfBuilderTemplate(null)
          }}
        />
      )}
    </>
  )
}
