import React from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
  actions?: React.ReactNode
  breadcrumbs?: Array<{
    label: string
    href?: string
    icon?: LucideIcon
  }>
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  actions,
  breadcrumbs,
  className
}: PageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center">
              {index > 0 && <span className="mx-2">/</span>}
              <div className="flex items-center space-x-1">
                {crumb.icon && <crumb.icon className="h-4 w-4" />}
                {crumb.href ? (
                  <a 
                    href={crumb.href} 
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className={index === breadcrumbs.length - 1 ? 'text-foreground font-medium' : ''}>
                    {crumb.label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </nav>
      )}

      {/* Main Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            {Icon && (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <Icon className="h-5 w-5" />
              </div>
            )}
            <div className="flex items-center space-x-2">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              {badge && (
                <Badge variant={badge.variant}>{badge.text}</Badge>
              )}
            </div>
          </div>
          {description && (
            <p className="text-muted-foreground max-w-2xl">{description}</p>
          )}
        </div>
        
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      
      <Separator />
    </div>
  )
}

interface StatsHeaderProps {
  title: string
  description?: string
  stats: Array<{
    label: string
    value: string | number
    icon?: LucideIcon
    trend?: {
      value: string
      isPositive: boolean
    }
  }>
  actions?: React.ReactNode
  className?: string
}

export function StatsHeader({
  title,
  description,
  stats,
  actions,
  className
}: StatsHeaderProps) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2">
            {actions}
          </div>
        )}
      </div>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-card border rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
                {stat.trend && (
                  <p className={cn(
                    "text-xs",
                    stat.trend.isPositive ? "text-green-600" : "text-red-600"
                  )}>
                    {stat.trend.isPositive ? '+' : ''}{stat.trend.value}
                  </p>
                )}
              </div>
              {stat.icon && (
                <stat.icon className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      <Separator />
    </div>
  )
} 