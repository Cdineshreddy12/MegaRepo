"use client"

import { useState, useEffect, useCallback } from "react"

// Custom hook to manage state in URL
export function useUrlState<T>(
  key: string,
  defaultValue: T,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  }: {
    serialize?: (value: T) => string
    deserialize?: (value: string) => T
  } = {},
): [T, (value: T) => void] {
  // Function to get initial state from URL
  const getInitialState = useCallback((): T => {
    if (typeof window === "undefined") {
      return defaultValue
    }

    try {
      const params = new URLSearchParams(window.location.search)
      const urlValue = params.get(key)

      if (urlValue === null) {
        return defaultValue
      }

      return deserialize(decodeURIComponent(urlValue))
    } catch (error) {
      console.warn(`Error reading URL parameter "${key}":`, error)
      return defaultValue
    }
  }, [key, defaultValue, deserialize])

  // State to store our value
  const [state, setState] = useState<T>(getInitialState)

  // Update URL when state changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const params = new URLSearchParams(window.location.search)

    // Check if value is default to potentially remove from URL
    const isDefault = JSON.stringify(state) === JSON.stringify(defaultValue)

    if (isDefault) {
      if (params.has(key)) {
        params.delete(key)
      }
    } else {
      params.set(key, encodeURIComponent(serialize(state)))
    }

    // Update URL without reloading the page
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
    window.history.replaceState({ path: newUrl }, "", newUrl)
  }, [state, key, defaultValue, serialize])

  // Read from URL on mount and when URL changes
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const handleUrlChange = () => {
      setState(getInitialState())
    }

    // Listen for popstate event (back/forward navigation)
    window.addEventListener("popstate", handleUrlChange)

    return () => {
      window.removeEventListener("popstate", handleUrlChange)
    }
  }, [getInitialState])

  // Listen for URL changes from other sources (like direct navigation)
  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    // Create a MutationObserver to watch for URL changes
    const observer = new MutationObserver(() => {
      const newParams = new URLSearchParams(window.location.search)
      const newValue = newParams.get(key)

      if (newValue !== null) {
        try {
          const parsedValue = deserialize(decodeURIComponent(newValue))
          // Only update if the value is different
          if (JSON.stringify(parsedValue) !== JSON.stringify(state)) {
            setState(parsedValue)
          }
        } catch (error) {
          console.warn(`Error parsing URL parameter "${key}":`, error)
        }
      } else if (params.has(key)) {
        // The parameter was removed
        setState(defaultValue)
      }
    })

    // Start observing the document with the configured parameters
    observer.observe(document, { subtree: true, childList: true })

    // Get initial params
    const params = new URLSearchParams(window.location.search)

    return () => {
      observer.disconnect()
    }
  }, [key, state, defaultValue, deserialize])

  return [state, setState]
}
