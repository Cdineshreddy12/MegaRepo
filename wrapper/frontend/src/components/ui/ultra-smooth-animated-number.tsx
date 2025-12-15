import { useEffect, useState, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface UltraSmoothAnimatedNumberProps {
  value: number
  duration?: number
  delay?: number
  className?: string
  prefix?: string
  suffix?: string
  separator?: string
  decimals?: number
  easing?: 'linear' | 'easeOut' | 'easeInOut' | 'easeOutCubic' | 'easeOutQuart' | 'easeOutQuint' | 'easeOutExpo' | 'easeOutCirc' | 'easeOutBack' | 'easeOutElastic' | 'bounce' | 'smooth' | 'smoother' | 'spring' | 'ultraSmooth'
  precision?: number
  useSpringPhysics?: boolean
  springTension?: number
  springFriction?: number
  useBezierCurve?: boolean
  bezierPoints?: [number, number, number, number]
}

// Advanced easing functions for ultra-smooth animations
const ultraSmoothEasingFunctions = {
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
  },
  ultraSmooth: (t: number) => {
    // Ultra-smooth easing with multiple interpolation points
    if (t < 0.5) {
      return 4 * t * t * t
    } else {
      const f = 2 * t - 2
      return 1 + f * f * f / 2
    }
  }
}

// Bezier curve implementation for custom easing
const bezierCurve = (t: number, p1: number, p2: number, p3: number, p4: number) => {
  const u = 1 - t
  const tt = t * t
  const uu = u * u
  const uuu = uu * u
  const ttt = tt * t
  
  return uuu * p1 + 3 * uu * t * p2 + 3 * u * tt * p3 + ttt * p4
}

// Spring physics simulation
const springPhysics = (t: number, tension: number, friction: number) => {
  const omega = Math.sqrt(tension)
  const zeta = friction / (2 * Math.sqrt(tension))
  
  if (zeta < 1) {
    // Underdamped
    const phi = Math.acos(zeta)
    return 1 - Math.exp(-zeta * omega * t) * Math.cos(omega * Math.sqrt(1 - zeta * zeta) * t + phi)
  } else if (zeta === 1) {
    // Critically damped
    return 1 - (1 + omega * t) * Math.exp(-omega * t)
  } else {
    // Overdamped
    const alpha1 = -omega * (zeta + Math.sqrt(zeta * zeta - 1))
    const alpha2 = -omega * (zeta - Math.sqrt(zeta * zeta - 1))
    const c1 = alpha2 / (alpha2 - alpha1)
    const c2 = -alpha1 / (alpha2 - alpha1)
    return 1 - c1 * Math.exp(alpha1 * t) - c2 * Math.exp(alpha2 * t)
  }
}

export function UltraSmoothAnimatedNumber({
  value,
  duration = 2000,
  delay = 0,
  className,
  prefix = '',
  suffix = '',
  separator = ',',
  decimals = 0,
  easing = 'ultraSmooth',
  precision = 1000000, // Higher precision for smoother transitions
  useSpringPhysics = false,
  springTension = 0.3,
  springFriction = 0.8,
  useBezierCurve = false,
  bezierPoints = [0.25, 0.1, 0.25, 1]
}: UltraSmoothAnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isVisible, setIsVisible] = useState(false)
  const elementRef = useRef<HTMLSpanElement>(null)
  const animationRef = useRef<number>()
  const lastFrameTime = useRef<number>(0)
  const animationStartTime = useRef<number>(0)

  // Intersection Observer for viewport-based animation
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true)
        }
      },
      { 
        threshold: 0.1,
        rootMargin: '50px' // Start animation slightly before element is fully visible
      }
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
    const targetFPS = 120
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
      let easedProgress: number

      if (useSpringPhysics) {
        easedProgress = springPhysics(progress, springTension, springFriction)
      } else if (useBezierCurve) {
        easedProgress = bezierCurve(progress, ...bezierPoints)
      } else {
        easedProgress = ultraSmoothEasingFunctions[easing](progress)
      }

      // Ultra-precise interpolation
      const currentValue = startValue + (endValue - startValue) * easedProgress
      
      // Use high precision rounding for smoother transitions
      const roundedValue = Math.round(currentValue * precision) / precision

      setDisplayValue(roundedValue)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Ensure final value is exact
        setDisplayValue(value)
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isVisible, value, duration, delay, easing, precision, useSpringPhysics, springTension, springFriction, useBezierCurve, bezierPoints])

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
      style={{
        // Use CSS transforms for hardware acceleration
        willChange: 'transform',
        transform: 'translateZ(0)', // Force hardware acceleration
      }}
    >
      {prefix}{formatNumber(displayValue)}{suffix}
    </span>
  )
}

// Preset components with ultra-smooth defaults
export function UltraSmoothCounter({
  value,
  className,
  ...props
}: Omit<UltraSmoothAnimatedNumberProps, 'decimals' | 'separator'>) {
  return (
    <UltraSmoothAnimatedNumber
      value={value}
      decimals={0}
      separator=","
      easing="ultraSmooth"
      precision={1000000}
      className={className}
      {...props}
    />
  )
}

export function UltraSmoothPercentage({
  value,
  className,
  ...props
}: Omit<UltraSmoothAnimatedNumberProps, 'suffix' | 'decimals'>) {
  return (
    <UltraSmoothAnimatedNumber
      value={value}
      suffix="%"
      decimals={1}
      easing="ultraSmooth"
      precision={1000000}
      className={className}
      {...props}
    />
  )
}

export function UltraSmoothCurrency({
  value,
  currency = '$',
  className,
  ...props
}: Omit<UltraSmoothAnimatedNumberProps, 'prefix' | 'decimals'> & { currency?: string }) {
  return (
    <UltraSmoothAnimatedNumber
      value={value}
      prefix={currency}
      decimals={0}
      easing="ultraSmooth"
      precision={1000000}
      className={className}
      {...props}
    />
  )
}

// Spring physics variants
export function SpringAnimatedNumber({
  value,
  className,
  springTension = 0.4,
  springFriction = 0.7,
  ...props
}: Omit<UltraSmoothAnimatedNumberProps, 'useSpringPhysics' | 'springTension' | 'springFriction'> & {
  springTension?: number
  springFriction?: number
}) {
  return (
    <UltraSmoothAnimatedNumber
      value={value}
      useSpringPhysics={true}
      springTension={springTension}
      springFriction={springFriction}
      className={className}
      {...props}
    />
  )
}
