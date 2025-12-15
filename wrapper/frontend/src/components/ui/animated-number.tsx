import React, { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  className?: string
  prefix?: string
  suffix?: string
  separator?: string
  decimals?: number
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'easeOutCubic' | 'easeOutQuart' | 'easeOutQuint' | 'easeOutExpo' | 'easeOutCirc' | 'easeOutBack' | 'easeOutElastic' | 'bounce' | 'smooth' | 'smoother' | 'spring'
}

const easingFunctions = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  easeOutQuint: (t: number) => 1 - Math.pow(1 - t, 5),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeOutCirc: (t: number) => Math.sqrt(1 - Math.pow(t - 1, 2)),
  easeOutBack: (t: number) => {
    const c1 = 1.70158
    const c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
  bounce: (t: number) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375
    }
  },
  smooth: (t: number) => t * t * (3 - 2 * t), // Smoothstep
  smoother: (t: number) => t * t * t * (t * (t * 6 - 15) + 10), // Smootherstep
  spring: (t: number) => {
    const tension = 0.3
    const friction = 0.8
    return 1 - Math.pow(friction, t * 10) * Math.cos(t * 10 * Math.sqrt(tension))
  }
}

export function AnimatedNumber({
  value,
  duration = 2000,
  delay = 0,
  className,
  prefix = '',
  suffix = '',
  separator = ',',
  decimals = 0,
  easing = 'easeOut'
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLSpanElement>(null)
  const animationRef = useRef<number>()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (elementRef.current) {
      observer.observe(elementRef.current)
    }

    return () => observer.disconnect()
  }, [isVisible])

  useEffect(() => {
    if (!isVisible) return

    const startTime = Date.now() + delay
    const startValue = 0
    const endValue = value
    let lastFrameTime = 0
    const targetFPS = 60
    const frameInterval = 1000 / targetFPS

    const animate = (currentTime: number) => {
      // Throttle to target FPS for smoother animation
      if (currentTime - lastFrameTime < frameInterval) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameTime = currentTime

      const elapsed = currentTime - startTime

      if (elapsed < 0) {
        animationRef.current = requestAnimationFrame(animate)
        return
      }

      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easingFunctions[easing](progress)
      
      // Use more precise interpolation for smoother transitions
      const currentValue = startValue + (endValue - startValue) * easedProgress
      
      // Round to avoid floating point precision issues
      const roundedValue = Math.round(currentValue * Math.pow(10, decimals)) / Math.pow(10, decimals)

      setDisplayValue(roundedValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, value, duration, delay, easing, decimals])

  const formatNumber = (num: number) => {
    const rounded = Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals)
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, separator)
  }

  return (
    <span
      ref={elementRef}
      className={cn('inline-block', className)}
      aria-live="polite"
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  )
}

// Preset components for common use cases
export function AnimatedCounter({
  value,
  className,
  ...props
}: Omit<AnimatedNumberProps, 'decimals' | 'separator'>) {
  return (
    <AnimatedNumber
      value={value}
      decimals={0}
      separator=","
      className={className}
      {...props}
    />
  )
}

export function AnimatedPercentage({
  value,
  className,
  ...props
}: Omit<AnimatedNumberProps, 'suffix' | 'decimals'>) {
  return (
    <AnimatedNumber
      value={value}
      suffix="%"
      decimals={0}
      className={className}
      {...props}
    />
  )
}

export function AnimatedCurrency({
  value,
  currency = '$',
  className,
  ...props
}: Omit<AnimatedNumberProps, 'prefix' | 'decimals'> & { currency?: string }) {
  return (
    <AnimatedNumber
      value={value}
      prefix={currency}
      decimals={0}
      className={className}
      {...props}
    />
  )
}
