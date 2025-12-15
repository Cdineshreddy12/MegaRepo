"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Eye, Copy, Trash2, FileText, Calendar } from "lucide-react"
import type { PDFLayout } from "./pdf-layout-builder"
import { format } from "date-fns"

interface LayoutTemplateManagerProps {
  layouts: PDFLayout[]
  onLoadLayout: (layout: PDFLayout) => void
  onDuplicateLayout: (layout: PDFLayout) => void
  onDeleteLayout: (layoutId: string) => void
}

export function LayoutTemplateManager({
  layouts,
  onLoadLayout,
  onDuplicateLayout,
  onDeleteLayout,
}: LayoutTemplateManagerProps) {
  if (layouts.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Layout Templates</h3>
          <p className="text-gray-600 text-center">Create and save your first PDF layout template to see it here.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Saved Layout Templates</h2>
        <Badge variant="secondary">
          {layouts.length} template{layouts.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {layouts.map((layout) => {
          const totalFields = layout.sections.reduce((total, section) => total + section.fields.length, 0)

          return (
            <Card key={layout.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-2">{layout.name}</CardTitle>
                    {layout.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{layout.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(layout.updatedAt), "MMM d, yyyy")}
                  </div>
                  <Badge variant="outline">
                    {totalFields} field{totalFields !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="flex gap-2 text-sm">
                  <Badge variant="outline">{layout.pageSize}</Badge>
                  <Badge variant="outline">{layout.orientation}</Badge>
                </div>

                <div className="text-sm text-gray-600">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="font-medium">Header:</span>
                      <br />
                      {layout.sections.find((s) => s.type === "header")?.fields.length || 0} fields
                    </div>
                    <div>
                      <span className="font-medium">Body:</span>
                      <br />
                      {layout.sections.find((s) => s.type === "body")?.fields.length || 0} fields
                    </div>
                    <div>
                      <span className="font-medium">Footer:</span>
                      <br />
                      {layout.sections.find((s) => s.type === "footer")?.fields.length || 0} fields
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onLoadLayout(layout)}
                    className="flex-1 flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" />
                    Load
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDuplicateLayout(layout)}
                    className="flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDeleteLayout(layout.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
