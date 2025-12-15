import { useState, useEffect } from 'react'

export type Theme = 'blue' | 'purple' | 'green' | 'orange' | 'pink'

const themeConfig = {
  blue: {
    '--primary-50': '239 246 255',
    '--primary-100': '219 234 254',
    '--primary-200': '191 219 254',
    '--primary-300': '147 197 253',
    '--primary-400': '96 165 250',
    '--primary-500': '59 130 246',
    '--primary-600': '37 99 235',
    '--primary-700': '29 78 216',
    '--primary-800': '30 64 175',
    '--primary-900': '30 58 138',
    '--primary-950': '23 37 84',
  },
  purple: {
    '--primary-50': '250 245 255',
    '--primary-100': '243 232 255',
    '--primary-200': '233 213 255',
    '--primary-300': '216 180 254',
    '--primary-400': '196 181 253',
    '--primary-500': '168 85 247',
    '--primary-600': '147 51 234',
    '--primary-700': '126 34 206',
    '--primary-800': '107 33 168',
    '--primary-900': '88 28 135',
    '--primary-950': '59 7 100',
  },
  green: {
    '--primary-50': '240 253 244',
    '--primary-100': '220 252 231',
    '--primary-200': '187 247 208',
    '--primary-300': '134 239 172',
    '--primary-400': '74 222 128',
    '--primary-500': '34 197 94',
    '--primary-600': '22 163 74',
    '--primary-700': '21 128 61',
    '--primary-800': '22 101 52',
    '--primary-900': '20 83 45',
    '--primary-950': '5 46 22',
  },
  orange: {
    '--primary-50': '255 247 237',
    '--primary-100': '255 237 213',
    '--primary-200': '254 215 170',
    '--primary-300': '253 186 116',
    '--primary-400': '251 146 60',
    '--primary-500': '249 115 22',
    '--primary-600': '234 88 12',
    '--primary-700': '194 65 12',
    '--primary-800': '154 52 18',
    '--primary-900': '124 45 18',
    '--primary-950': '67 20 7',
  },
  pink: {
    '--primary-50': '253 244 255',
    '--primary-100': '250 232 255',
    '--primary-200': '245 208 254',
    '--primary-300': '240 171 252',
    '--primary-400': '232 121 249',
    '--primary-500': '217 70 239',
    '--primary-600': '192 38 211',
    '--primary-700': '162 28 175',
    '--primary-800': '134 25 143',
    '--primary-900': '112 26 117',
    '--primary-950': '74 4 78',
  },
}

const darkThemeConfig = {
  blue: {
    '--primary-50': '23 37 84',
    '--primary-100': '30 58 138',
    '--primary-200': '30 64 175',
    '--primary-300': '29 78 216',
    '--primary-400': '37 99 235',
    '--primary-500': '59 130 246',
    '--primary-600': '96 165 250',
    '--primary-700': '147 197 253',
    '--primary-800': '191 219 254',
    '--primary-900': '219 234 254',
    '--primary-950': '239 246 255',
  },
  purple: {
    '--primary-50': '59 7 100',
    '--primary-100': '88 28 135',
    '--primary-200': '107 33 168',
    '--primary-300': '126 34 206',
    '--primary-400': '147 51 234',
    '--primary-500': '168 85 247',
    '--primary-600': '196 181 253',
    '--primary-700': '216 180 254',
    '--primary-800': '233 213 255',
    '--primary-900': '243 232 255',
    '--primary-950': '250 245 255',
  },
  green: {
    '--primary-50': '5 46 22',
    '--primary-100': '20 83 45',
    '--primary-200': '22 101 52',
    '--primary-300': '21 128 61',
    '--primary-400': '22 163 74',
    '--primary-500': '34 197 94',
    '--primary-600': '74 222 128',
    '--primary-700': '134 239 172',
    '--primary-800': '187 247 208',
    '--primary-900': '220 252 231',
    '--primary-950': '240 253 244',
  },
  orange: {
    '--primary-50': '67 20 7',
    '--primary-100': '124 45 18',
    '--primary-200': '154 52 18',
    '--primary-300': '194 65 12',
    '--primary-400': '234 88 12',
    '--primary-500': '249 115 22',
    '--primary-600': '251 146 60',
    '--primary-700': '253 186 116',
    '--primary-800': '254 215 170',
    '--primary-900': '255 237 213',
    '--primary-950': '255 247 237',
  },
  pink: {
    '--primary-50': '74 4 78',
    '--primary-100': '112 26 117',
    '--primary-200': '134 25 143',
    '--primary-300': '162 28 175',
    '--primary-400': '192 38 211',
    '--primary-500': '217 70 239',
    '--primary-600': '232 121 249',
    '--primary-700': '240 171 252',
    '--primary-800': '245 208 254',
    '--primary-900': '250 232 255',
    '--primary-950': '253 244 255',
  },
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('blue')
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as Theme
    const savedDarkMode = localStorage.getItem('darkMode') === 'true'
    
    if (savedTheme) {
      setTheme(savedTheme)
    }
    if (savedDarkMode) {
      setIsDarkMode(savedDarkMode)
      document.documentElement.classList.add('dark')
    }
    
    // Apply the theme on initial load
    const initialTheme = savedTheme || 'blue'
    const initialDarkMode = savedDarkMode || false
    const themeColors = initialDarkMode ? darkThemeConfig[initialTheme] : themeConfig[initialTheme]
    const root = document.documentElement
    
    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }, [])

  const applyTheme = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    
    const root = document.documentElement
    const themeColors = isDarkMode ? darkThemeConfig[newTheme] : themeConfig[newTheme]
    
    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }

  const toggleDarkMode = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    localStorage.setItem('darkMode', newDarkMode.toString())
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // Reapply theme colors for the new mode
    const themeColors = newDarkMode ? darkThemeConfig[theme] : themeConfig[theme]
    const root = document.documentElement
    
    Object.entries(themeColors).forEach(([property, value]) => {
      root.style.setProperty(property, value)
    })
  }

  const changeTheme = (newTheme: Theme) => {
    applyTheme(newTheme)
  }

  return {
    theme,
    isDarkMode,
    changeTheme,
    toggleDarkMode,
  }
}
