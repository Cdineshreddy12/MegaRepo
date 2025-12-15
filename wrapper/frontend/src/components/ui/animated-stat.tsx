import React from 'react'
import { AnimatedCounter, AnimatedPercentage, AnimatedCurrency } from './animated-number'
import { cn } from '@/lib/utils'

interface AnimatedStatProps {
  value: number
  label: string
  icon?: React.ReactNode
  className?: string
  valueClassName?: string
  labelClassName?: string
  iconClassName?: string
  type?: 'counter' | 'percentage' | 'currency'
  currency?: string
  suffix?: string
  prefix?: string
  duration?: number
  delay?: number
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'easeOutCubic' | 'easeOutQuart' | 'easeOutQuint' | 'easeOutExpo' | 'easeOutCirc' | 'easeOutBack' | 'easeOutElastic' | 'bounce' | 'smooth' | 'smoother' | 'spring'
  direction?: 'column' | 'row'
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClasses = {
  sm: {
    value: 'text-2xl',
    label: 'text-sm',
    icon: 'w-4 h-4'
  },
  md: {
    value: 'text-3xl',
    label: 'text-base',
    icon: 'w-5 h-5'
  },
  lg: {
    value: 'text-4xl',
    label: 'text-lg',
    icon: 'w-6 h-6'
  },
  xl: {
    value: 'text-5xl',
    label: 'text-xl',
    icon: 'w-8 h-8'
  }
}

export function AnimatedStat({
  value,
  label,
  icon,
  className,
  valueClassName,
  labelClassName,
  iconClassName,
  type = 'counter',
  currency = '$',
  suffix = '',
  prefix = '',
  duration = 2000,
  delay = 0,
  easing = 'easeOut',
  direction = 'column',
  size = 'lg'
}: AnimatedStatProps) {
  const sizeConfig = sizeClasses[size]
  
  const renderAnimatedValue = () => {
    const commonProps = {
      duration,
      delay,
      easing,
      className: cn(sizeConfig.value, 'font-bold', valueClassName)
    }

    switch (type) {
      case 'percentage':
        return <AnimatedPercentage value={value} {...commonProps} />
      case 'currency':
        return <AnimatedCurrency value={value} currency={currency} {...commonProps} />
      default:
        return <AnimatedCounter value={value} suffix={suffix} prefix={prefix} {...commonProps} />
    }
  }

  return (
    <div className={cn(
      'flex',
      direction === 'column' ? 'flex-col items-center text-center' : 'flex-row items-center gap-3',
      className
    )}>
      {icon && (
        <div className={cn(
          'flex items-center justify-center',
          direction === 'column' ? 'mb-2' : 'mr-2',
          iconClassName
        )}>
          {icon}
        </div>
      )}
      
      <div className={cn(
        'flex',
        direction === 'column' ? 'flex-col items-center' : 'flex-col items-start'
      )}>
        <div className={cn(sizeConfig.value, 'font-bold', valueClassName)}>
          {renderAnimatedValue()}
        </div>
        <div className={cn(
          'text-muted-foreground',
          sizeConfig.label,
          labelClassName
        )}>
          {label}
        </div>
      </div>
    </div>
  )
}

// Preset components for common stat types
export function AnimatedUserCount({
  value,
  label = 'Active Users',
  ...props
}: Omit<AnimatedStatProps, 'type' | 'suffix'>) {
  return (
    <AnimatedStat
      value={value}
      label={label}
      type="counter"
      suffix="+"
      {...props}
    />
  )
}

export function AnimatedProjectCount({
  value,
  label = 'Projects Completed',
  ...props
}: Omit<AnimatedStatProps, 'type' | 'suffix'>) {
  return (
    <AnimatedStat
      value={value}
      label={label}
      type="counter"
      suffix="+"
      {...props}
    />
  )
}

export function AnimatedSatisfactionRate({
  value,
  label = 'Customer Satisfaction',
  ...props
}: Omit<AnimatedStatProps, 'type'>) {
  return (
    <AnimatedStat
      value={value}
      label={label}
      type="percentage"
      {...props}
    />
  )
}

export function AnimatedRevenue({
  value,
  label = 'Revenue',
  currency = '$',
  ...props
}: Omit<AnimatedStatProps, 'type'>) {
  return (
    <AnimatedStat
      value={value}
      label={label}
      type="currency"
      currency={currency}
      {...props}
    />
  )
}
