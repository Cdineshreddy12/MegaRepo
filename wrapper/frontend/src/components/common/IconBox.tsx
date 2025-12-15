import { cn } from '@/lib/utils'
import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const iconBoxVariants = cva(
  "inline-flex items-center justify-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-blue-50 text-blue-600 hover:bg-blue-100",
        primary: "bg-primary/10 text-primary hover:bg-primary/20",
        secondary: "bg-secondary/10 text-secondary-foreground hover:bg-secondary/20",
        success: "bg-green-50 text-green-600 hover:bg-green-100",
        warning: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100",
        error: "bg-red-50 text-red-600 hover:bg-red-100",
        info: "bg-cyan-50 text-cyan-600 hover:bg-cyan-100",
        muted: "bg-gray-50 text-gray-600 hover:bg-gray-100",
        outline: "border border-gray-200 bg-transparent text-gray-700 hover:bg-gray-50",
        ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
      },
      size: {
        xs: "p-1",
        sm: "p-1.5",
        default: "p-2",
        lg: "p-3",
        xl: "p-4",
        "2xl": "p-5",
      },
      shape: {
        square: "rounded-lg",
        circle: "rounded-full",
        rounded: "rounded-xl",
        none: "rounded-none",
      },
      shadow: {
        none: "shadow-none",
        sm: "shadow-sm",
        default: "shadow",
        md: "shadow-md",
        lg: "shadow-lg",
        xl: "shadow-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shape: "square",
      shadow: "none",
    },
  }
)

export interface IconBoxProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof iconBoxVariants> {
  icon: React.ReactNode
  className?: string
}

export const IconBox = React.forwardRef<HTMLDivElement, IconBoxProps>(
  ({ className, variant, size, shape, shadow, icon, ...props }, ref) => {
    return (
      <div
        className={cn(iconBoxVariants({ variant, size, shape, shadow, className }))}
        ref={ref}
        {...props}
      >
        {icon}
      </div>
    )
  }
)

IconBox.displayName = "IconBox"
