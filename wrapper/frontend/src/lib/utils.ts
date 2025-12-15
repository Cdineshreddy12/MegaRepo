import { User } from "@/types/user-management"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return 'N/A'

  const dateObj = typeof date === 'string' ? new Date(date) : date

  // Check if the date is valid
  if (isNaN(dateObj.getTime())) return 'Invalid date'

  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

export function formatNumber(amount: number) {
  return new Intl.NumberFormat('en-US').format(amount)
}

export function formatPercentage(percentage: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(percentage)
}

export const getUserStatus = (user: User): string => {
  if (!user.isActive) return 'Pending';
  if (!user.onboardingCompleted) return 'Setup Required';
  return 'Active';
}

export const getStatusColor = (user: User): string => {
  const status = getUserStatus(user);
  switch (status) {
    case 'Active': 
      return 'bg-green-100 text-green-800';
    case 'Pending': 
      return 'bg-yellow-100 text-yellow-800';
    case 'Setup Required': 
      return 'bg-orange-100 text-orange-800';
    default: 
      return 'bg-gray-100 text-gray-800';
  }
}

// Performance monitoring utilities
export class PerformanceMonitor {
  private static measurements: Map<string, number> = new Map()

  static startMeasure(name: string): void {
    this.measurements.set(name, performance.now())
  }

  static endMeasure(name: string): number {
    const startTime = this.measurements.get(name)
    if (!startTime) {
      console.warn(`No start time found for measurement: ${name}`)
      return 0
    }
    
    const duration = performance.now() - startTime
    this.measurements.delete(name)
    
    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`)
    }
    
    return duration
  }

  static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startMeasure(name)
    return fn().finally(() => {
      this.endMeasure(name)
    })
  }
}

// Error tracking utilities
export class ErrorTracker {
  static captureException(error: Error, context?: any): void {
    console.error('Error captured:', error, context)
    
    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureException(error, { extra: context })
    }
  }

  static captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}] ${message}`)
    
    // In production, send to monitoring service
    if (import.meta.env.PROD) {
      // Example: Sentry.captureMessage(message, level)
    }
  }
}

// Bundle size monitoring
export function getBundleSize(): void {
  if (import.meta.env.DEV) {
    console.log('Bundle size monitoring available in production build')
  }
}

// Debounce utility
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Sleep utility
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Get initials from name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
