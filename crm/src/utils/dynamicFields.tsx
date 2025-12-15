/**
 * Dynamic Fields Utilities
 * 
 * Utilities to dynamically generate table columns and view fields from form templates
 * 
 * Note: This file uses .tsx extension because it contains JSX code
 */

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader, DataTableColumnCell } from "@/components/data-grid";
import { FormField, FormTemplate } from "@/components/template-builder/form-builder";
import { toPrettyString } from "@/utils/common";
import { formatDate, formatAddress } from "@/utils/format";
import { Address } from "@/types/common";

/**
 * Extract field name from field ID
 * e.g., "field-companyName" -> "companyName"
 */
export function getFieldName(fieldId: string): string {
  if (fieldId.startsWith("field-")) {
    return fieldId.replace("field-", "");
  }
  return fieldId;
}

/**
 * Check if a field should be visible in table based on template configuration
 * @param fieldName - The field name or ID to check
 * @param template - The form template
 * @returns true if field should be shown, false if hidden
 */
export function isFieldVisibleInTable(
  fieldName: string,
  template: FormTemplate | null
): boolean {
  if (!template || !template.sections) {
    return true; // Default: show field
  }

  const normalizedFieldName = getFieldName(fieldName).toLowerCase();

  // Check all fields in template
  for (const section of template.sections) {
    if (section.fields && Array.isArray(section.fields)) {
      for (const field of section.fields) {
        const fieldId = getFieldName(field.id).toLowerCase();
        if (fieldId === normalizedFieldName || field.id.toLowerCase() === normalizedFieldName) {
          // If field is explicitly hidden, return false
          if (field.metadata?.hiddenInTable === true || field.metadata?.showInTable === false) {
            return false;
          }
          // If field is explicitly shown, return true
          if (field.metadata?.showInTable === true) {
            return true;
          }
        }
      }
    }
  }

  return true; // Default: show field if not configured
}

/**
 * Get value from entity data using field ID or name
 * Only checks customFields if the field is in the template (to avoid showing COR fields)
 */
function getFieldValue(entityData: any, field: FormField, template?: any): any {
  const fieldName = getFieldName(field.id);
  const fieldNameFromLabel = field.label.toLowerCase().replace(/\s+/g, "");
  
  // Try multiple ways to get the value from standard fields
  let value = entityData[field.id] ||
    entityData[fieldName] ||
    entityData[field.name || ""] ||
    entityData[fieldNameFromLabel];
  
  // Only check customFields if the field exists in the template
  // This ensures we only show template-configured fields, not all customFields (COR fields)
  if ((value === undefined || value === null || value === "") && entityData.customFields) {
    // Check if this field is actually in the template
    const fieldInTemplate = template?.sections?.some((section: any) => 
      section.fields?.some((f: any) => f.id === field.id || getFieldName(f.id) === fieldName)
    );
    
    if (fieldInTemplate) {
      value = entityData.customFields[field.id] ||
        entityData.customFields[fieldName] ||
        entityData.customFields[field.name || ""] ||
        entityData.customFields[fieldNameFromLabel];
    }
  }
  
  return value || "";
}

/**
 * Generate table column from form field
 */
export function generateTableColumn<T>(
  field: FormField,
  entityData?: T,
  template?: any
): ColumnDef<T> | null {
  // Skip if field is explicitly hidden from table
  if (field.metadata?.hiddenInTable === true || field.metadata?.showInTable === false) {
    return null;
  }

  // Skip read-only fields that shouldn't be in tables (like createdBy, updatedBy)
  if (field.readOnly || field.metadata?.readOnly || field.metadata?.autoPopulated) {
    // Only skip if it's a system field, not user-defined read-only fields
    const fieldName = getFieldName(field.id).toLowerCase();
    if (fieldName === "createdby" || fieldName === "updatedby" || fieldName === "createdat" || fieldName === "updatedat") {
      return null;
    }
  }

  // Skip certain field types that don't make sense in tables (unless explicitly enabled)
  if (!field.metadata?.showInTable && (field.type === "textarea" || field.type === "checkbox")) {
    return null;
  }

  const fieldName = getFieldName(field.id);
  const accessorKey = fieldName;

  return {
    accessorKey,
    // Use accessorFn to check both standard fields and customFields
    accessorFn: (row: any) => {
      // First try standard field
      let value = row[fieldName] || row[field.id];
      // If not found, check customFields
      if ((value === undefined || value === null || value === "") && row.customFields) {
        value = row.customFields[fieldName] || row.customFields[field.id];
      }
      return value;
    },
    header: ({ column }) => {
      return <DataTableColumnHeader column={column} title={field.label} />;
    },
    cell: ({ row }) => {
      const value = getFieldValue(row.original, field, template);
      
      // Handle different field types
      switch (field.type) {
        case "number":
          return (
            <DataTableColumnCell>
              {value !== null && value !== undefined ? Number(value).toLocaleString() : ""}
            </DataTableColumnCell>
          );
        
        case "date":
          return (
            <DataTableColumnCell variant="overline">
              {value ? formatDate(value) : ""}
            </DataTableColumnCell>
          );
        
        case "select":
        case "radio":
        case "sysConfig":
          return (
            <DataTableColumnCell>
              {value ? toPrettyString(String(value)) : ""}
            </DataTableColumnCell>
          );
        
        case "email":
          return (
            <DataTableColumnCell renderAs="email">
              {value || ""}
            </DataTableColumnCell>
          );
        
        case "phone":
          return (
            <DataTableColumnCell renderAs="tel">
              {value || ""}
            </DataTableColumnCell>
          );
        
        case "address":
          // Format address object
          if (typeof value === "object" && value !== null) {
            const formatted = formatAddress(value as Address);
            return (
              <DataTableColumnCell>
                {formatted || ""}
              </DataTableColumnCell>
            );
          }
          return <DataTableColumnCell>{value || ""}</DataTableColumnCell>;
        
        case "calculated":
          // Format calculated field value based on its format configuration
          if (value === null || value === undefined || value === "") {
            return <DataTableColumnCell>—</DataTableColumnCell>;
          }
          // Check if field has calculation config to determine format
          const format = (field as any).calculation?.format || "number";
          const decimals = (field as any).calculation?.decimalPlaces ?? 2;
          
          if (format === "currency") {
            return (
              <DataTableColumnCell>
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  minimumFractionDigits: decimals,
                  maximumFractionDigits: decimals,
                }).format(Number(value))}
              </DataTableColumnCell>
            );
          } else if (format === "percentage") {
            return (
              <DataTableColumnCell>
                {Number(value).toFixed(decimals)}%
              </DataTableColumnCell>
            );
          } else {
            return (
              <DataTableColumnCell>
                {Number(value).toFixed(decimals)}
              </DataTableColumnCell>
            );
          }
        
        case "entity":
        case "user":
        case "organization":
          // For entity lookups, try to display the name
          if (typeof value === "object" && value !== null) {
            // For accounts
            if (value.companyName) {
              return <DataTableColumnCell>{value.companyName}</DataTableColumnCell>;
            }
            // For contacts/users
            if (value.firstName || value.lastName) {
              const name = [value.firstName, value.lastName].filter(Boolean).join(" ");
              return <DataTableColumnCell>{name || value.email || value.name || ""}</DataTableColumnCell>;
            }
            // For other entities
            return (
              <DataTableColumnCell>
                {value.name || value.companyName || value.email || ""}
              </DataTableColumnCell>
            );
          }
          // If it's an ID string, try to resolve it from row data
          if (typeof value === "string" && value.length === 24 && /^[a-f\d]{24}$/i.test(value)) {
            // Check if this is accountName field and try to get accountId from row
            const fieldId = field.id.toLowerCase();
            if (fieldId.includes("accountname") || fieldId.includes("account-name")) {
              // Try to get account from accountId field
              const accountData = row.original.accountId;
              if (accountData && typeof accountData === "object") {
                return <DataTableColumnCell>{accountData.companyName || accountData.name || ""}</DataTableColumnCell>;
              }
            }
            return <DataTableColumnCell className="text-muted-foreground">—</DataTableColumnCell>;
          }
          return <DataTableColumnCell>{value || ""}</DataTableColumnCell>;
        
        default:
          return <DataTableColumnCell>{value || ""}</DataTableColumnCell>;
      }
    },
  };
}

/**
 * Check if a base column should be hidden based on template configuration
 */
function shouldHideBaseColumn<T>(
  column: ColumnDef<T>,
  template: FormTemplate | null
): boolean {
  if (!template || !template.sections) {
    return false;
  }

  const accessorKey = column.accessorKey as string;
  if (!accessorKey) {
    return false;
  }

  // Check all fields in template to see if this column should be hidden
  for (const section of template.sections) {
    if (section.fields && Array.isArray(section.fields)) {
      for (const field of section.fields) {
        const fieldName = getFieldName(field.id);
        const fieldId = field.id.toLowerCase();
        
        // If field matches this column and is marked as hidden in table
        if (fieldName === accessorKey || field.id === accessorKey) {
          if (field.metadata?.hiddenInTable === true || field.metadata?.showInTable === false) {
            return true;
          }
        }
        
        // Hide base accountId column if template has accountName field
        if (accessorKey === "accountId" && (fieldId.includes("accountname") || fieldId.includes("account-name"))) {
          return true;
        }
        
        // Hide base name column if template has opportunityName field
        if (accessorKey === "name" && (fieldId.includes("opportunityname") || fieldId.includes("opportunity-name"))) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Generate table columns from form template
 * When template is present, only show template fields (hide all base columns except select/actions)
 */
export function generateTableColumnsFromTemplate<T>(
  template: FormTemplate | null,
  baseColumns: ColumnDef<T>[] = []
): ColumnDef<T>[] {
  if (!template || !template.sections) {
    return baseColumns;
  }

  const dynamicColumns: ColumnDef<T>[] = [];
  
  // When template is present, only keep select and actions columns from base
  // All other columns will come from template fields only
  const selectColumn = baseColumns.find(col => col.id === "select");
  const actionsColumn = baseColumns.find(col => col.id === "actions");
  
  const existingAccessorKeys = new Set<string>();
  
  // Add select and actions to existing keys so template fields don't conflict
  if (selectColumn) {
    existingAccessorKeys.add("select");
  }
  if (actionsColumn) {
    existingAccessorKeys.add("actions");
  }

  // Collect all fields from all sections, respecting order and visibility
  const allFields: FormField[] = [];
  
  // Sort sections by order
  const sortedSections = [...template.sections].sort((a, b) => {
    const orderA = a.metadata?.order ?? 999;
    const orderB = b.metadata?.order ?? 999;
    return orderA - orderB;
  });

  sortedSections.forEach((section) => {
    if (section.fields && Array.isArray(section.fields)) {
      // Sort fields by order metadata
      const sortedFields = [...section.fields].sort((a, b) => {
        const orderA = a.metadata?.order ?? 999;
        const orderB = b.metadata?.order ?? 999;
        return orderA - orderB;
      });

      sortedFields.forEach((field) => {
        // Only include fields that should be visible in table
        if (!isFieldVisibleInTable(field.id, template)) {
          return;
        }
        
        // Skip if column already exists
        const fieldName = getFieldName(field.id);
        if (existingAccessorKeys.has(fieldName) || existingAccessorKeys.has(field.id)) {
          return;
        }

        const column = generateTableColumn<T>(field, undefined, template);
        if (column) {
          dynamicColumns.push(column);
          existingAccessorKeys.add(fieldName);
        }
      });
    }
  });

  // Build final columns: select, template fields, actions
  // When template is present, ONLY show template fields (no base columns except select/actions)
  const finalColumns: ColumnDef<T>[] = [];
  
  if (selectColumn) {
    finalColumns.push(selectColumn);
  }
  
  finalColumns.push(...dynamicColumns);
  
  if (actionsColumn) {
    finalColumns.push(actionsColumn);
  }
  
  return finalColumns;
}

/**
 * Render a field value in view mode
 */
export function renderFieldValue(field: FormField, value: any): React.ReactNode {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">No {field.label.toLowerCase()} provided</span>;
  }

  switch (field.type) {
    case "number":
      return Number(value).toLocaleString();
    
    case "date":
      return formatDate(value);
    
    case "select":
    case "radio":
    case "sysConfig":
      return toPrettyString(String(value));
    
    case "email":
      return (
        <a href={`mailto:${value}`} className="text-primary hover:underline">
          {value}
        </a>
      );
    
    case "phone":
      return (
        <a href={`tel:${value}`} className="text-primary hover:underline">
          {value}
        </a>
      );
    
    case "textarea":
      return (
        <p className="text-muted-foreground whitespace-pre-wrap">{value}</p>
      );
    
    case "checkbox":
      return value ? "Yes" : "No";
    
    case "address":
      // Format address object
      if (typeof value === "object" && value !== null) {
        return formatAddress(value as Address);
      }
      return String(value);
    
    case "calculated":
      // Format calculated field value
      if (value === null || value === undefined || value === "") {
        return <span className="text-muted-foreground">—</span>;
      }
      const format = (field as any).calculation?.format || "number";
      const decimals = (field as any).calculation?.decimalPlaces ?? 2;
      
      if (format === "currency") {
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        }).format(Number(value));
      } else if (format === "percentage") {
        return `${Number(value).toFixed(decimals)}%`;
      } else {
        return Number(value).toFixed(decimals);
      }
    
    case "entity":
    case "user":
    case "organization":
      // Handle populated objects (from backend populate)
      if (typeof value === "object" && value !== null) {
        // For accounts
        if (value.companyName) {
          return value.companyName;
        }
        // For contacts/users
        if (value.firstName || value.lastName) {
          const name = [value.firstName, value.lastName].filter(Boolean).join(" ");
          return name || value.email || value.name || String(value);
        }
        // For other entities
        return value.name || value.companyName || value.email || String(value);
      }
      // If it's an ID string, return empty (should be populated by backend)
      if (typeof value === "string" && value.length === 24 && /^[a-f\d]{24}$/i.test(value)) {
        return <span className="text-muted-foreground">Not resolved</span>;
      }
      return String(value);
    
    default:
      return String(value);
  }
}

/**
 * Get all fields from template grouped by sections
 */
export function getFieldsFromTemplate(template: FormTemplate | null): Array<{
  section: { id: string; title: string; description?: string };
  fields: FormField[];
}> {
  if (!template || !template.sections) {
    return [];
  }

  return template.sections.map((section) => ({
    section: {
      id: section.id,
      title: section.title,
      description: section.description,
    },
    fields: section.fields || [],
  }));
}

