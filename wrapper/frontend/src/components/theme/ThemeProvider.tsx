import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'monochrome' | 'system'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  actualTheme: 'light' | 'dark' | 'monochrome'
  glassmorphismEnabled: boolean
  setGlassmorphismEnabled: (enabled: boolean) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme)
  const [actualTheme, setActualTheme] = useState<'light' | 'dark' | 'monochrome'>('light')
  const [glassmorphismEnabled, setGlassmorphismEnabled] = useState<boolean>(false)

  useEffect(() => {
    // Load theme from localStorage
    const storedTheme = localStorage.getItem(storageKey) as Theme
    if (storedTheme && ['light', 'dark', 'monochrome', 'system'].includes(storedTheme)) {
      setTheme(storedTheme)
    }

    // Load glassmorphism setting
    const storedGlassmorphism = localStorage.getItem('glassmorphism-enabled')
    if (storedGlassmorphism !== null) {
      const enabled = storedGlassmorphism === 'true'
      setGlassmorphismEnabled(enabled)

      // Apply class immediately
      const body = document.body
      if (enabled) {
        body.classList.add('glassmorphism-enabled')
      } else {
        body.classList.remove('glassmorphism-enabled')
      }
    }
  }, [storageKey])

  useEffect(() => {
    const root = window.document.documentElement

    const updateTheme = () => {
      let resolvedTheme: 'light' | 'dark' | 'monochrome'

      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        resolvedTheme = systemTheme
      } else if (theme === 'monochrome') {
        resolvedTheme = 'monochrome'
      } else {
        resolvedTheme = theme
      }

      setActualTheme(resolvedTheme)

      // Remove all theme classes first
      root.classList.remove('dark', 'monochrome')

      if (resolvedTheme === 'dark') {
        root.classList.add('dark')
        console.log('🌙 Theme set to dark mode')
      } else if (resolvedTheme === 'monochrome') {
        root.classList.add('monochrome')
        console.log('⚫ Theme set to monochrome mode')
      } else {
        console.log('☀️ Theme set to light mode')
      }
    }

    updateTheme()

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        updateTheme()
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      console.log('🎨 Theme change requested:', newTheme)
      setTheme(newTheme)
      localStorage.setItem(storageKey, newTheme)
    },
    actualTheme,
    glassmorphismEnabled,
    setGlassmorphismEnabled: (enabled: boolean) => {
      console.log('✨ Glassmorphism change requested:', enabled)
      setGlassmorphismEnabled(enabled)
      localStorage.setItem('glassmorphism-enabled', enabled.toString())

      // Add/remove glassmorphism-enabled class to body
      const body = document.body
      if (enabled) {
        body.classList.add('glassmorphism-enabled')
      } else {
        body.classList.remove('glassmorphism-enabled')
      }

      // Add smooth transition class to body during glassmorphism changes
      body.style.transition = 'all 0.5s ease-in-out'
      setTimeout(() => {
        body.style.transition = ''
      }, 500)
    },
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}
