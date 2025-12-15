"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Download, FileText } from "lucide-react"
import type { PDFLayout } from "./pdf-layout-builder"
import type { FormSubmission, FormTemplate } from "./form-builder"
import { format } from "date-fns"

interface PDFPreviewProps {
  layout: PDFLayout
  submission: FormSubmission | null
  template: FormTemplate
}

export function PDFPreview({ layout, submission, template }: PDFPreviewProps) {
  const getFieldValue = (fieldId: string) => {
    if (!submission) return "Sample Data"

    // Handle special header/footer fields
    switch (fieldId) {
      case "title":
        return `${template.name} Report`
      case "date":
        return format(new Date(), "PPP")
      case "page-number":
        return "Page 1"
      case "company-logo":
        return "[Company Logo]"
      default:
        return submission.data[fieldId] || "No Data"
    }
  }

  const generatePDF = async () => {
    // This would integrate with a PDF generation library like jsPDF or react-pdf
    // For now, we'll simulate the download
    const element = document.getElementById("pdf-preview-content")
    if (!element) return

    // Simulate PDF generation
    const blob = new Blob(["PDF content would be generated here"], { type: "application/pdf" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${layout.name.replace(/\s+/g, "_")}_${format(new Date(), "yyyy-MM-dd")}.pdf`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (!submission) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Preview Data</h3>
          <p className="text-gray-600 text-center">
            Select a form submission to preview the PDF layout with real data.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold">{layout.name}</h3>
            <p className="text-sm text-gray-600">
              Preview with submission from {format(new Date(submission.submittedAt), "PPP")}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">{layout.pageSize}</Badge>
            <Badge variant="outline">{layout.orientation}</Badge>
          </div>
        </div>
        <Button onClick={generatePDF} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Generate PDF
        </Button>
      </div>

      {/* PDF Preview */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6">
        <div className="max-w-4xl mx-auto">
          <div
            id="pdf-preview-content"
            className="bg-white shadow-lg rounded-lg overflow-hidden"
            style={{
              width: layout.orientation === "portrait" ? "210mm" : "297mm",
              minHeight: layout.orientation === "portrait" ? "297mm" : "210mm",
              transform: "scale(0.8)",
              transformOrigin: "top center",
            }}
          >
            <div
              style={{
                padding: `${layout.margins.top}mm ${layout.margins.right}mm ${layout.margins.bottom}mm ${layout.margins.left}mm`,
              }}
            >
              {layout.sections.map((section) => (
                <div
                  key={section.id}
                  className="relative"
                  style={{
                    height: section.height,
                    backgroundColor: section.backgroundColor,
                    borderBottom: section.borderBottom ? "1px solid #e5e7eb" : "none",
                    marginBottom: section.type !== "footer" ? "10px" : "0",
                  }}
                >
                  {section.fields.map((field) => (
                    <div
                      key={field.id}
                      className="absolute"
                      style={{
                        left: field.x,
                        top: field.y,
                        width: field.width,
                        height: field.height,
                        fontSize: field.fontSize,
                        fontWeight: field.fontWeight,
                        color: field.color,
                        backgroundColor:
                          field.backgroundColor === "transparent" ? "transparent" : field.backgroundColor,
                        textAlign: field.textAlign,
                        border: field.borderWidth > 0 ? `${field.borderWidth}px solid ${field.borderColor}` : "none",
                        padding: field.padding,
                        display: "flex",
                        alignItems: "center",
                        overflow: "hidden",
                      }}
                    >
                      <div className="w-full">{getFieldValue(field.fieldId)}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Preview Info */}
          <div className="mt-6 text-center text-sm text-gray-600">
            <p>This is a preview of how your PDF will look when generated.</p>
            <p>Actual PDF may vary slightly depending on the PDF generation library used.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
