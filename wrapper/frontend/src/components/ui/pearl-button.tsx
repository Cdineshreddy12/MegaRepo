import React, { useState } from 'react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/components/theme/ThemeProvider'

interface PearlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode
  className?: string
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
}

export const PearlButton: React.FC<PearlButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const { actualTheme } = useTheme()

  // Variant and size styles
  const getVariantStyles = () => {
    const baseStyles = {
      light: {
        primary: {
          background: 'bg-gradient-to-br from-violet-50 to-purple-50',
          text: 'text-purple-900 font-semibold',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(147,51,234,0.1),inset_0_-0.2rem_0.5rem_rgba(255,255,255,0.2),inset_0_-0.7rem_1.5rem_rgba(147,51,234,0.15),0_2rem_2rem_rgba(147,51,234,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(147,51,234,0.1)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(147,51,234,0.15),inset_0_-0.2rem_0.5rem_rgba(255,255,255,0.3),inset_0_-0.7rem_1.5rem_rgba(147,51,234,0.2),0_2rem_2rem_rgba(147,51,234,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(147,51,234,0.1)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(147,51,234,0.25),inset_0_-0.2rem_0.5rem_rgba(255,255,255,0.8),inset_0_-0.7rem_1.5rem_rgba(147,51,234,0.1),0_2rem_2rem_rgba(147,51,234,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(147,51,234,0.1)]',
          overlayBg: 'bg-purple-500/10',
          highlightShadow: 'inset 0 10px 8px -10px rgba(147, 51, 234, 0.4)',
          highlightBg: 'linear-gradient(180deg, rgba(147, 51, 234, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        },
        secondary: {
          background: 'bg-gray-100',
          text: 'text-gray-700 font-medium',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(255,255,255,0.3),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.1),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.1),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.2)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.4),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.1),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.15),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.2)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.5),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.2),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.05),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.2)]',
          overlayBg: 'bg-gray-500/8',
          highlightShadow: 'inset 0 10px 8px -10px rgba(0, 0, 0, 0.2)',
          highlightBg: 'linear-gradient(180deg, rgba(0, 0, 0, 0.08) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        },
        outline: {
          background: 'bg-transparent border-2 border-purple-200',
          text: 'text-purple-700 font-medium',
          shadow: 'shadow-[0_2rem_2rem_rgba(147,51,234,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(147,51,234,0.05)]',
          hoverShadow: 'hover:shadow-[0_2rem_2rem_rgba(147,51,234,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(147,51,234,0.1)]',
          activeShadow: 'active:shadow-[0_1rem_1rem_rgba(147,51,234,0.2),0_0.5rem_0.5rem_-0.25rem_rgba(147,51,234,0.15)]',
          overlayBg: 'bg-purple-500/5',
          highlightShadow: 'inset 0 10px 8px -10px rgba(147, 51, 234, 0.2)',
          highlightBg: 'linear-gradient(180deg, rgba(147, 51, 234, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        }
      },
      monochrome: {
        primary: {
          background: 'bg-gray-100',
          text: 'text-gray-900 font-semibold',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(255,255,255,0.1),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.3),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.3),0_2rem_2rem_rgba(0,0,0,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.5)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.6),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.3),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.4),0_2rem_2rem_rgba(0,0,0,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.5)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.7),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.4),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.2),0_2rem_2rem_rgba(0,0,0,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.5)]',
          overlayBg: 'bg-gray-900/6',
          highlightShadow: 'inset 0 10px 8px -10px rgba(0, 0, 0, 0.4)',
          highlightBg: 'linear-gradient(180deg, rgba(0, 0, 0, 0.15) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        },
        secondary: {
          background: 'bg-gray-200',
          text: 'text-gray-800 font-medium',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(255,255,255,0.2),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.2),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.2),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.3)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.3),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.2),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.25),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.3)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.4),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.3),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.1),0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.3)]',
          overlayBg: 'bg-gray-900/4',
          highlightShadow: 'inset 0 10px 8px -10px rgba(0, 0, 0, 0.3)',
          highlightBg: 'linear-gradient(180deg, rgba(0, 0, 0, 0.1) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        },
        outline: {
          background: 'bg-transparent border-2 border-gray-400',
          text: 'text-gray-700 font-medium',
          shadow: 'shadow-[0_2rem_2rem_rgba(0,0,0,0.1),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.05)]',
          hoverShadow: 'hover:shadow-[0_2rem_2rem_rgba(0,0,0,0.15),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.1)]',
          activeShadow: 'active:shadow-[0_1rem_1rem_rgba(0,0,0,0.2),0_0.5rem_0.5rem_-0.25rem_rgba(0,0,0,0.15)]',
          overlayBg: 'bg-gray-900/3',
          highlightShadow: 'inset 0 10px 8px -10px rgba(0, 0, 0, 0.2)',
          highlightBg: 'linear-gradient(180deg, rgba(0, 0, 0, 0.05) 0%, rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0) 100%)'
        }
      },
      dark: {
        primary: {
          background: 'bg-gradient-to-br from-purple-900 to-indigo-900',
          text: 'text-purple-100 font-semibold',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(196,181,253,0.2),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.8),inset_0_-0.7rem_1.5rem_rgba(196,181,253,0.3),0_2rem_2rem_rgba(0,0,0,0.4),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.9)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(196,181,253,0.25),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.8),inset_0_-0.7rem_1.5rem_rgba(196,181,253,0.4),0_2rem_2rem_rgba(0,0,0,0.4),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.9)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(196,181,253,0.3),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.9),inset_0_-0.7rem_1.5rem_rgba(196,181,253,0.2),0_2rem_2rem_rgba(0,0,0,0.4),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.9)]',
          overlayBg: 'bg-purple-400/15',
          highlightShadow: 'inset 0 10px 8px -10px rgba(196, 181, 253, 0.6)',
          highlightBg: 'linear-gradient(180deg, rgba(196, 181, 253, 0.2) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)'
        },
        secondary: {
          background: 'bg-gray-800',
          text: 'text-gray-200 font-medium',
          shadow: 'shadow-[inset_0_0.5rem_1.5rem_rgba(255,255,255,0.05),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.6),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.6),0_2rem_2rem_rgba(0,0,0,0.3),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.7)]',
          hoverShadow: 'hover:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.1),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.6),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.7),0_2rem_2rem_rgba(0,0,0,0.3),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.7)]',
          activeShadow: 'active:shadow-[inset_0_0.5rem_0.8rem_rgba(255,255,255,0.15),inset_0_-0.2rem_0.5rem_rgba(0,0,0,0.7),inset_0_-0.7rem_1.5rem_rgba(0,0,0,0.5),0_2rem_2rem_rgba(0,0,0,0.3),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.7)]',
          overlayBg: 'bg-gray-600/10',
          highlightShadow: 'inset 0 10px 8px -10px rgba(255, 255, 255, 0.2)',
          highlightBg: 'linear-gradient(180deg, rgba(255, 255, 255, 0.05) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)'
        },
        outline: {
          background: 'bg-transparent border-2 border-purple-500/50',
          text: 'text-purple-300 font-medium',
          shadow: 'shadow-[0_2rem_2rem_rgba(0,0,0,0.3),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.4)]',
          hoverShadow: 'hover:shadow-[0_2rem_2rem_rgba(0,0,0,0.4),0_0.7rem_0.7rem_-0.25rem_rgba(0,0,0,0.5)]',
          activeShadow: 'active:shadow-[0_1rem_1rem_rgba(0,0,0,0.5),0_0.5rem_0.5rem_-0.25rem_rgba(0,0,0,0.6)]',
          overlayBg: 'bg-purple-500/8',
          highlightShadow: 'inset 0 10px 8px -10px rgba(196, 181, 253, 0.3)',
          highlightBg: 'linear-gradient(180deg, rgba(196, 181, 253, 0.08) 0%, rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0) 100%)'
        }
      }
    }

    const themeKey = actualTheme as keyof typeof baseStyles
    const variantKey = variant as keyof typeof baseStyles.light

    return baseStyles[themeKey][variantKey] || baseStyles[themeKey].primary
  }

  // Size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'text-xs px-4 py-2'
      case 'lg':
        return 'text-base px-8 py-4'
      default:
        return 'text-sm px-6 py-3'
    }
  }

  const variantStyles = getVariantStyles()
  const sizeStyles = getSizeStyles()

  return (
    <button
      className={cn(
        "outline-none cursor-pointer border-0 relative rounded-full transition-all duration-200",
        variantStyles.background,
        variantStyles.shadow,
        variantStyles.hoverShadow,
        variantStyles.activeShadow,
        "active:translate-y-1",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      <div className={cn("rounded-full relative overflow-hidden flex items-center justify-center", variantStyles.text, sizeStyles)}>
        {/* Background overlay */}
        <div
          className={cn("absolute inset-0 rounded-full transition-all duration-300", variantStyles.overlayBg)}
          style={{
            transform: isHovered ? 'scale(1.05)' : 'scale(1)'
          }}
        ></div>

        {/* Top highlight */}
        <div
          className="absolute left-[6%] right-[6%] top-[12%] bottom-[40%] rounded-t-[22px] transition-all duration-300"
          style={{
            opacity: isHovered ? 0.6 : 0.8,
            transform: isHovered ? 'translateY(5%)' : 'translateY(0%)',
            boxShadow: variantStyles.highlightShadow,
            background: variantStyles.highlightBg
          }}
        ></div>

        {/* Content */}
        <span
          className="relative z-10 flex items-center justify-center gap-2 font-medium transition-all duration-200"
          style={{
            transform: isHovered ? 'translateY(-2%)' : 'translateY(0%)'
          }}
        >
          {children}
        </span>
      </div>
    </button>
  )
}
