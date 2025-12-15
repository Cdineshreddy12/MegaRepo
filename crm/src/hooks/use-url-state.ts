"use client"

import { useState } from "react"

// Custom hook to manage state in URL
export function useUrlState<T>(
  _key: string,
  defaultValue: T,
  _options?: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  },
): [T, (value: T) => void] {
  // Temporarily use simple local state to avoid URL-related initialization issues
  const [state, setState] = useState<T>(defaultValue)

  return [state, setState]
}
