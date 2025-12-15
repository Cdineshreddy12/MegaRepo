import { Link } from "react-router-dom"
import { useTheme } from "@/components/theme/ThemeProvider"
import { cn } from "@/lib/utils"

export function Footer() {
  const { actualTheme } = useTheme();

  const getThemeStyles = () => {
    switch (actualTheme) {
      case 'light':
        return {
          bg: 'bg-white',
          border: 'border-slate-200',
          text: 'text-slate-600',
          textHover: 'hover:text-slate-900'
        };
      case 'monochrome':
        return {
          bg: 'bg-gray-100',
          border: 'border-gray-300',
          text: 'text-gray-600',
          textHover: 'hover:text-gray-900'
        };
      default: // dark
        return {
          bg: 'bg-slate-900',
          border: 'border-slate-700',
          text: 'text-slate-400',
          textHover: 'hover:text-slate-100'
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <footer className={cn("border-t", themeStyles.bg, themeStyles.border)}>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className={cn("text-sm", themeStyles.text)}>
            © 2024 Wrapper Business Suite. All rights reserved.
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
            <Link to="/privacy" className={cn("text-sm transition-colors", themeStyles.text, themeStyles.textHover)}>
              Privacy Policy
            </Link>
            <Link to="/terms" className={cn("text-sm transition-colors", themeStyles.text, themeStyles.textHover)}>
              Terms of Service
            </Link>
            <Link to="/support" className={cn("text-sm transition-colors", themeStyles.text, themeStyles.textHover)}>
              Support
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
