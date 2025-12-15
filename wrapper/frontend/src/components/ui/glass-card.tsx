import React from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme/ThemeProvider'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'subtle' | 'purple'
  intensity?: 'light' | 'medium' | 'strong'
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className,
  variant = 'default',
  intensity = 'medium',
  ...props
}) => {
  const { actualTheme } = useTheme()

  // Variant and intensity styles
  const getGlassStyles = () => {
    const baseStyles = {
      light: {
        default: {
          background: 'bg-gradient-to-br from-white/80 to-white/60',
          border: 'border border-white/20',
          shadow: 'shadow-[0_8px_32px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.1)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        elevated: {
          background: 'bg-gradient-to-br from-white/90 to-white/70',
          border: 'border border-white/30',
          shadow: 'shadow-[0_16px_48px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1)]',
          hoverShadow: 'hover:shadow-[0_20px_56px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.4),inset_0_-1px_0_rgba(0,0,0,0.1)]',
          backdropBlur: 'backdrop-blur-md'
        },
        subtle: {
          background: 'bg-gradient-to-br from-white/60 to-white/40',
          border: 'border border-white/10',
          shadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.05)]',
          hoverShadow: 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.05)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        purple: {
          background: 'bg-gradient-to-br from-purple-50/80 to-violet-50/60',
          border: 'border border-purple-200/30',
          shadow: 'shadow-[0_8px_32px_rgba(147,51,234,0.15),inset_0_1px_0_rgba(196,181,253,0.2),inset_0_-1px_0_rgba(147,51,234,0.1)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(147,51,234,0.2),inset_0_1px_0_rgba(196,181,253,0.3),inset_0_-1px_0_rgba(147,51,234,0.1)]',
          backdropBlur: 'backdrop-blur-sm'
        }
      },
      monochrome: {
        default: {
          background: 'bg-gradient-to-br from-gray-100/80 to-gray-50/60',
          border: 'border border-gray-200/20',
          shadow: 'shadow-[0_8px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.08)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.25),inset_0_-1px_0_rgba(0,0,0,0.08)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        elevated: {
          background: 'bg-gradient-to-br from-gray-100/90 to-gray-50/70',
          border: 'border border-gray-200/30',
          shadow: 'shadow-[0_16px_48px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.2),inset_0_-1px_0_rgba(0,0,0,0.08)]',
          hoverShadow: 'hover:shadow-[0_20px_56px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.08)]',
          backdropBlur: 'backdrop-blur-md'
        },
        subtle: {
          background: 'bg-gradient-to-br from-gray-100/60 to-gray-50/40',
          border: 'border border-gray-200/10',
          shadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.04)]',
          hoverShadow: 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.04)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        purple: {
          background: 'bg-gradient-to-br from-purple-100/80 to-violet-100/60',
          border: 'border border-purple-200/20',
          shadow: 'shadow-[0_8px_32px_rgba(147,51,234,0.12),inset_0_1px_0_rgba(196,181,253,0.15),inset_0_-1px_0_rgba(147,51,234,0.08)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(147,51,234,0.18),inset_0_1px_0_rgba(196,181,253,0.25),inset_0_-1px_0_rgba(147,51,234,0.08)]',
          backdropBlur: 'backdrop-blur-sm'
        }
      },
      dark: {
        default: {
          background: 'bg-gradient-to-br from-gray-900/80 to-gray-800/60',
          border: 'border border-gray-700/20',
          shadow: 'shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.3)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.3)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        elevated: {
          background: 'bg-gradient-to-br from-gray-900/90 to-gray-800/70',
          border: 'border border-gray-700/30',
          shadow: 'shadow-[0_16px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.3)]',
          hoverShadow: 'hover:shadow-[0_20px_56px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.3)]',
          backdropBlur: 'backdrop-blur-md'
        },
        subtle: {
          background: 'bg-gradient-to-br from-gray-900/60 to-gray-800/40',
          border: 'border border-gray-700/10',
          shadow: 'shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03),inset_0_-1px_0_rgba(0,0,0,0.2)]',
          hoverShadow: 'hover:shadow-[0_6px_20px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05),inset_0_-1px_0_rgba(0,0,0,0.2)]',
          backdropBlur: 'backdrop-blur-sm'
        },
        purple: {
          background: 'bg-gradient-to-br from-purple-900/80 to-violet-900/60',
          border: 'border border-purple-700/30',
          shadow: 'shadow-[0_8px_32px_rgba(147,51,234,0.25),inset_0_1px_0_rgba(196,181,253,0.15),inset_0_-1px_0_rgba(147,51,234,0.3)]',
          hoverShadow: 'hover:shadow-[0_12px_40px_rgba(147,51,234,0.35),inset_0_1px_0_rgba(196,181,253,0.25),inset_0_-1px_0_rgba(147,51,234,0.3)]',
          backdropBlur: 'backdrop-blur-sm'
        }
      }
    }

    const themeKey = actualTheme as keyof typeof baseStyles
    const variantKey = variant as keyof typeof baseStyles.light

    return baseStyles[themeKey][variantKey] || baseStyles[themeKey].default
  }

  const glassStyles = getGlassStyles()

  // Intensity adjustments
  const getIntensityStyles = () => {
    switch (intensity) {
      case 'light':
        return {
          opacity: 'opacity-75',
          blur: 'backdrop-blur-sm'
        }
      case 'strong':
        return {
          opacity: 'opacity-95',
          blur: 'backdrop-blur-lg'
        }
      default: // medium
        return {
          opacity: 'opacity-85',
          blur: 'backdrop-blur-md'
        }
    }
  }

  const intensityStyles = getIntensityStyles()

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden transition-all duration-300",
        glassStyles.background,
        glassStyles.border,
        glassStyles.shadow,
        glassStyles.hoverShadow,
        glassStyles.backdropBlur,
        intensityStyles.opacity,
        className
      )}
      {...props}
    >
      {/* Subtle inner highlight */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

      {/* Content container */}
      <div className="relative z-10 p-6">
        {children}
      </div>
    </div>
  )
}
