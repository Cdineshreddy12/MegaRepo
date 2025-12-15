# Animated Number Components

A collection of reusable animated number components for creating engaging user interfaces with smooth number animations.

## Components

### AnimatedNumber
The base component for animating numbers with full customization options.

```tsx
import { AnimatedNumber } from '@/components/ui/animated-number'

<AnimatedNumber
  value={1000}
  duration={2000}
  delay={0}
  prefix="$"
  suffix="+"
  separator=","
  decimals={0}
  easing="easeOut"
  className="text-2xl font-bold"
/>
```

### Preset Components

#### AnimatedCounter
For counting numbers with customizable suffix.

```tsx
import { AnimatedCounter } from '@/components/ui/animated-number'

<AnimatedCounter
  value={50000}
  suffix="+"
  duration={2000}
  easing="easeOut"
/>
```

#### AnimatedPercentage
For percentage values.

```tsx
import { AnimatedPercentage } from '@/components/ui/animated-number'

<AnimatedPercentage
  value={98.5}
  duration={2000}
  easing="easeOut"
/>
```

#### AnimatedCurrency
For currency values.

```tsx
import { AnimatedCurrency } from '@/components/ui/animated-number'

<AnimatedCurrency
  value={2500000}
  currency="$"
  duration={2000}
  easing="easeOut"
/>
```

### AnimatedStat
Advanced component with icons, labels, and multiple layouts.

```tsx
import { AnimatedStat } from '@/components/ui/animated-stat'

<AnimatedStat
  value={75000}
  label="Active Users"
  icon={<Users className="w-6 h-6" />}
  type="counter"
  suffix="+"
  size="lg"
  direction="column"
  duration={2000}
  easing="easeOut"
/>
```

### Preset Stat Components

#### AnimatedUserCount
Pre-configured for user counts.

```tsx
import { AnimatedUserCount } from '@/components/ui/animated-stat'

<AnimatedUserCount
  value={50000}
  label="Active Users"
  icon={<Users className="w-6 h-6" />}
  duration={2000}
/>
```

#### AnimatedProjectCount
Pre-configured for project counts.

```tsx
import { AnimatedProjectCount } from '@/components/ui/animated-stat'

<AnimatedProjectCount
  value={1200}
  label="Projects Completed"
  icon={<BarChart className="w-6 h-6" />}
  duration={2000}
/>
```

#### AnimatedSatisfactionRate
Pre-configured for satisfaction percentages.

```tsx
import { AnimatedSatisfactionRate } from '@/components/ui/animated-stat'

<AnimatedSatisfactionRate
  value={99.2}
  label="Customer Satisfaction"
  icon={<Star className="w-6 h-6" />}
  duration={2000}
/>
```

#### AnimatedRevenue
Pre-configured for revenue amounts.

```tsx
import { AnimatedRevenue } from '@/components/ui/animated-stat'

<AnimatedRevenue
  value={5000000}
  currency="$"
  label="Revenue"
  duration={2000}
/>
```

## Features

- **Intersection Observer**: Numbers only animate when they come into view
- **Multiple Easing Functions**: Linear, easeOut, easeInOut, bounce
- **Customizable Duration & Delay**: Control animation timing
- **Number Formatting**: Automatic thousand separators and decimal places
- **Accessibility**: ARIA live regions for screen readers
- **TypeScript Support**: Full type safety
- **Responsive Design**: Works on all screen sizes
- **Theme Support**: Integrates with your design system

## Props

### AnimatedNumber Props
- `value: number` - The target number to animate to
- `duration?: number` - Animation duration in milliseconds (default: 2000)
- `delay?: number` - Delay before animation starts in milliseconds (default: 0)
- `className?: string` - Additional CSS classes
- `prefix?: string` - Text to display before the number
- `suffix?: string` - Text to display after the number
- `separator?: string` - Thousand separator (default: ',')
- `decimals?: number` - Number of decimal places (default: 0)
- `easing?: 'linear' | 'easeOut' | 'easeInOut' | 'bounce'` - Animation easing function

### AnimatedStat Props
- All AnimatedNumber props plus:
- `label: string` - Label text to display
- `icon?: React.ReactNode` - Icon to display
- `type?: 'counter' | 'percentage' | 'currency'` - Number type
- `currency?: string` - Currency symbol for currency type
- `direction?: 'column' | 'row'` - Layout direction
- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Component size
- `valueClassName?: string` - CSS classes for the value
- `labelClassName?: string` - CSS classes for the label
- `iconClassName?: string` - CSS classes for the icon

## Usage Examples

### Basic Counter
```tsx
<AnimatedCounter value={1000} suffix="+" />
```

### Percentage with Icon
```tsx
<AnimatedStat
  value={98.5}
  label="Success Rate"
  icon={<CheckCircle className="w-6 h-6" />}
  type="percentage"
  size="lg"
/>
```

### Currency with Custom Styling
```tsx
<AnimatedCurrency
  value={2500000}
  currency="$"
  className="text-4xl font-bold text-green-600"
  duration={3000}
  easing="bounce"
/>
```

### Staggered Animation
```tsx
<div className="grid grid-cols-3 gap-4">
  <AnimatedCounter value={1000} delay={0} />
  <AnimatedCounter value={2000} delay={200} />
  <AnimatedCounter value={3000} delay={400} />
</div>
```

## Demo

See `AnimatedNumbersDemo.tsx` for a comprehensive example showcasing all features and configurations.
