import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface SectionProps {
  children: React.ReactNode,
  className?: string
}
function Section({ children, className }: SectionProps) {
  return (
    <Card className={cn("sm:col-span-4 pt-8 shadow-sm", className)}>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  )
}

export default Section
