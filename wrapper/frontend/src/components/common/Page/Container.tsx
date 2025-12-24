import { cn } from '@/lib/utils'
import React from 'react'

export const Container = ({
  children,
  className
}: {
  children: React.ReactNode
  className?: string
}) => {
  return (
    <div className={cn("space-y-8 px-4", className)}>
      {children}
    </div>
  )
}