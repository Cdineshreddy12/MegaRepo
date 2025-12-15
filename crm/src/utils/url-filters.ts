/**
 * Utility functions for generating URLs with table filters
 */

import type { ColumnFiltersState, SortingState, VisibilityState, ColumnOrderState } from "@tanstack/react-table"

export interface TableUrlState {
  tableId: string
  filters?: ColumnFiltersState
  sorting?: SortingState
  search?: string
  page?: number
  pageSize?: number
  visibility?: VisibilityState
  columnOrder?: ColumnOrderState
}

/**
 * Generate a URL with table state parameters
 * @param baseUrl - The base URL to append parameters to
 * @param state - The table state to encode in the URL
 * @returns A URL string with the table state encoded as query parameters
 */
export function generateTableUrl(baseUrl: string, state: TableUrlState): string {
  const params = new URLSearchParams()
  const { tableId } = state

  // Add filters if provided
  if (state.filters && state.filters.length > 0) {
    params.set(`${tableId}_filters`, encodeURIComponent(JSON.stringify(state.filters)))
  }

  // Add sorting if provided
  if (state.sorting && state.sorting.length > 0) {
    params.set(`${tableId}_sort`, encodeURIComponent(JSON.stringify(state.sorting)))
  }

  // Add search if provided
  if (state.search) {
    params.set(`${tableId}_search`, state.search)
  }

  // Add pagination if provided
  if (state.page !== undefined && state.page > 0) {
    params.set(
      `${tableId}_pagination`,
      encodeURIComponent(
        JSON.stringify({
          pageIndex: state.page,
          pageSize: state.pageSize || 10,
        }),
      ),
    )
  }

  // Add visibility if provided
  if (state.visibility && Object.keys(state.visibility).length > 0) {
    params.set(`${tableId}_visibility`, encodeURIComponent(JSON.stringify(state.visibility)))
  }

  // Add column order if provided
  if (state.columnOrder && state.columnOrder.length > 0) {
    params.set(`${tableId}_order`, encodeURIComponent(JSON.stringify(state.columnOrder)))
  }

  // Combine base URL with parameters
  const queryString = params.toString()
  if (!queryString) return baseUrl

  // Check if the base URL already has query parameters
  return baseUrl.includes("?") ? `${baseUrl}&${queryString}` : `${baseUrl}?${queryString}`
}

/**
 * Create a filter for a specific column
 * @param columnId - The ID of the column to filter
 * @param value - The value to filter by
 * @returns A column filter object
 */
export function createColumnFilter(columnId: string, value: unknown): { id: string; value: unknown } {
  return { id: columnId, value }
}

/**
 * Generate a URL with a single column filter
 * @param baseUrl - The base URL to append parameters to
 * @param tableId - The ID of the table
 * @param columnId - The ID of the column to filter
 * @param value - The value to filter by
 * @returns A URL string with the filter encoded as a query parameter
 */
export function generateFilteredUrl(baseUrl: string, tableId: string, columnId: string, value: unknown): string {
  return generateTableUrl(baseUrl, {
    tableId,
    filters: [createColumnFilter(columnId, value)],
  })
}
