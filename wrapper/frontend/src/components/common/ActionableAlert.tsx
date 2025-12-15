import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'
import { Button } from '../ui'
import { X } from 'lucide-react'

const alertVariants = cva(
  "border rounded-lg p-4",
  {
    variants: {
      severity: {
        default: "border-gray-200 bg-gray-50 text-gray-800",
        destructive: "border-red-200 bg-red-50 text-red-800",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-800",
        success: "border-green-200 bg-green-50 text-green-800"
      }
    },
    defaultVariants: {
      severity: "default"
    }
  }
)

const subtitleVariants = cva(
  "text-sm",
  {
    variants: {
      severity: {
        default: "text-gray-700",
        destructive: "text-red-700",
        warning: "text-yellow-700",
        success: "text-green-700"
      }
    },
    defaultVariants: {
      severity: "default"
    }
  }
)

interface ActionableAlertProps extends VariantProps<typeof alertVariants> {
  title: string
  subTitle?: string
  actions: React.ReactNode
  className?: string
  onClose?: () => void
}

export default function ActionableAlert({ 
  title, 
  subTitle, 
  actions, 
  severity,
  className,
  onClose
}: ActionableAlertProps) {
  return (
    <Alert className={cn(alertVariants({ severity }), "relative", className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-8">
          <AlertTitle className="font-medium mb-1">
            {title}
          </AlertTitle>
          
         <AlertDescription className={subtitleVariants({ severity })}>
         {subTitle && (
            <div className={subtitleVariants({ severity })}>
              {subTitle}
            </div>
          )}
          
          {actions && ( 
            <div className="flex gap-2 mt-3">
              {actions}  
            </div>
          )}
         </AlertDescription>
        </div>
        
        {onClose && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="h-6 w-6 p-0 hover:bg-transparent"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  )
}
