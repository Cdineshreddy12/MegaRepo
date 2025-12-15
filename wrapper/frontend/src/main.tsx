import React from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { NuqsAdapter } from 'nuqs/adapters/react'
import App from "@/App"
import "@/index.css"



// Suppress browser extension warnings for video elements
const originalWarn = console.warn;
console.warn = function (...args) {
  // Filter out video element warnings from browser extensions
  if (args[0] && typeof args[0] === 'string' && args[0].includes('Video element not found')) {
    return; // Suppress this specific warning
  }
  originalWarn.apply(console, args);
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: (failureCount, error: any) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return false
        }
        return failureCount < 3
      },
    },
    mutations: {
      retry: false,
    },
  },
})

createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>
        <App />
        <SonnerToaster position="top-right" richColors offset="80px" gap={12} />
      </NuqsAdapter>
    </QueryClientProvider>
  </React.StrictMode>
) 