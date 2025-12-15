import { Row } from "@tanstack/react-table"

// Custom filter functions for different operators
const customFilterFns = {
  contains: (row: Row, id: string, filterValue: string) => {
    const value = String(row.getValue(id)).toLowerCase()
    return value.includes(String(filterValue).toLowerCase())
  },
  doesNotContain: (row: Row, id: string, filterValue: string) => {
    const value = String(row.getValue(id)).toLowerCase()
    return !value.includes(String(filterValue.value).toLowerCase())
  },
  equals: (row: any, id: string, filterValue: string) => {
    const value = String(row.getValue(id)).toLowerCase()
    return value === String(filterValue).toLowerCase()
  },
  doesNotEqual: (row: any, id: string, filterValue: any) => {
    const value = String(row.getValue(id)).toLowerCase()
    return value !== String(filterValue.value).toLowerCase()
  },
  startsWith: (row: any, id: string, filterValue: any) => {
    const value = String(row.getValue(id)).toLowerCase()
    return value.startsWith(String(filterValue.value).toLowerCase())
  },
  endsWith: (row: any, id: string, filterValue: any) => {
    const value = String(row.getValue(id)).toLowerCase()
    return value.endsWith(String(filterValue.value).toLowerCase())
  },
  isEmpty: (row: any, id: string) => {
    const value = row.getValue(id)
    return value === null || value === undefined || value === ""
  },
  isNotEmpty: (row: any, id: string) => {
    const value = row.getValue(id)
    return value !== null && value !== undefined && value !== ""
  },
  isAnyOf: (row: any, id: string, filterValue: string[]) => {
    const value = String(row.getValue(id)).toLowerCase()
    return filterValue.some((val) => value.includes(String(val).toLowerCase()))
  },
}

export const filterFn =  (row, id, filterValue) => {
    // Handle different filter types
    if (typeof filterValue === "object" && filterValue !== null) {
      const { type, value } = filterValue as { type: string; value: string }

      switch (type) {
        case "doesNotContain":
          return customFilterFns.doesNotContain(row, id, filterValue)
        case "doesNotEqual":
          return customFilterFns.doesNotEqual(row, id, filterValue)
        case "startsWith":
          return customFilterFns.startsWith(row, id, filterValue)
        case "endsWith":
          return customFilterFns.endsWith(row, id, filterValue)
        case "isEmpty":
          return customFilterFns.isEmpty(row, id)
        case "isNotEmpty":
          return customFilterFns.isNotEmpty(row, id)
        default:
          return customFilterFns.contains(row, id, value)
      }
    }

    // For array values (is any of)
    if (Array.isArray(filterValue)) {
      return customFilterFns.isAnyOf(row, id, filterValue)
    }

    // Default string contains
    return customFilterFns.contains(row, id, filterValue)
  };