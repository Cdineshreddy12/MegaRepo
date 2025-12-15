"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useState } from "react"
import { Search, Type, Hash, Mail, Phone, Calendar, List, CheckSquare, Circle } from "lucide-react"
import type { FormField } from "./form-builder"

interface FieldPaletteProps {
  fields: (FormField & { sectionTitle: string })[]
  onFieldSelect: (field: FormField) => void
}

export function FieldPalette({ fields, onFieldSelect }: FieldPaletteProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredFields = fields.filter(
    (field) =>
      field.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      field.sectionTitle.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getFieldIcon = (type: string) => {
    switch (type) {
      case "text":
      case "textarea":
        return <Type className="h-4 w-4" />
      case "number":
        return <Hash className="h-4 w-4" />
      case "email":
        return <Mail className="h-4 w-4" />
      case "phone":
        return <Phone className="h-4 w-4" />
      case "date":
        return <Calendar className="h-4 w-4" />
      case "select":
        return <List className="h-4 w-4" />
      case "checkbox":
        return <CheckSquare className="h-4 w-4" />
      case "radio":
        return <Circle className="h-4 w-4" />
      default:
        return <Type className="h-4 w-4" />
    }
  }

  const getFieldTypeColor = (type: string) => {
    switch (type) {
      case "text":
      case "textarea":
        return "bg-blue-100 text-blue-800"
      case "number":
        return "bg-green-100 text-green-800"
      case "email":
        return "bg-purple-100 text-purple-800"
      case "phone":
        return "bg-orange-100 text-orange-800"
      case "date":
        return "bg-red-100 text-red-800"
      case "select":
      case "radio":
        return "bg-yellow-100 text-yellow-800"
      case "checkbox":
        return "bg-pink-100 text-pink-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold mb-3">Available Fields</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search fields..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredFields.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No fields found</p>
          </div>
        ) : (
          filteredFields.map((field) => (
            <Card
              key={field.id}
              className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
              onClick={() => onFieldSelect(field)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getFieldIcon(field.type)}
                    <span className="font-medium text-sm">{field.label}</span>
                  </div>
                  <Badge variant="outline" className={`text-xs ${getFieldTypeColor(field.type)}`}>
                    {field.type}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600">
                  <p>Section: {field.sectionTitle}</p>
                  {field.placeholder && <p>Placeholder: {field.placeholder}</p>}
                  {field.required && (
                    <Badge variant="destructive" className="text-xs mt-1">
                      Required
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}

        {/* Static Header/Footer Fields */}
        <div className="border-t pt-4 mt-4">
          <h4 className="font-medium text-sm mb-3 text-gray-700">Header/Footer Elements</h4>
          <div className="space-y-2">
            {[
              { id: "title", label: "Report Title", type: "text" },
              { id: "date", label: "Generated Date", type: "date" },
              { id: "page-number", label: "Page Number", type: "text" },
              { id: "company-logo", label: "Company Logo", type: "image" },
            ].map((element) => (
              <Card
                key={element.id}
                className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-green-500"
                onClick={() => onFieldSelect(element as any)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    {getFieldIcon(element.type)}
                    <span className="font-medium text-sm">{element.label}</span>
                    <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                      {element.type}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
