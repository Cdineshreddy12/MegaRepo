# Skeleton Loader Component

A highly reusable and configurable skeleton loader component built with 20+ years of UI/UX experience. This component can render any kind of layout with simple configuration.

## Features

- **5 Animation Variants**: Default, Shimmer, Pulse, Wave, Glow
- **Flexible Sizing**: 10 size variants from xs to 5xl
- **Multiple Shapes**: Rectangle, Circle, Square, Pill, None
- **Custom Dimensions**: Override with customWidth/customHeight
- **Multiple Lines**: Render multiple skeleton lines with configurable spacing
- **Loading States**: Show/hide based on loading state
- **Pre-configured Components**: Ready-to-use components for common layouts
- **TypeScript Support**: Full type safety and IntelliSense
- **Accessibility**: Proper ARIA attributes and screen reader support

## Basic Usage

```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Basic skeleton
<Skeleton />

// Custom size and width
<Skeleton size="lg" width="xl" />

// Custom dimensions
<Skeleton customWidth="200px" customHeight="50px" />

// Multiple lines
<Skeleton lines={3} spacing="md" />

// With loading state
<Skeleton isLoading={loading} children={<ActualContent />} />
```

## Animation Variants

```tsx
// Default pulse animation
<Skeleton variant="default" />

// Shimmer effect
<Skeleton variant="shimmer" />

// Wave animation
<Skeleton variant="wave" />

// Glow effect
<Skeleton variant="glow" />

// Custom speed
<Skeleton speed="slow" />
<Skeleton speed="fast" />
```

## Shapes

```tsx
// Rectangle (default)
<Skeleton shape="rectangle" />

// Circle
<Skeleton shape="circle" />

// Square
<Skeleton shape="square" />

// Pill
<Skeleton shape="pill" />

// No rounding
<Skeleton shape="none" />
```

## Sizes

```tsx
<Skeleton size="xs" />    // 8px height
<Skeleton size="sm" />    // 12px height
<Skeleton size="md" />    // 16px height (default)
<Skeleton size="lg" />    // 24px height
<Skeleton size="xl" />    // 32px height
<Skeleton size="2xl" />   // 48px height
<Skeleton size="3xl" />   // 64px height
<Skeleton size="4xl" />   // 80px height
<Skeleton size="5xl" />   // 96px height
<Skeleton size="full" />  // 100% height
```

## Pre-configured Components

### SkeletonText
Perfect for text content loading:

```tsx
import { SkeletonText } from "@/components/ui/skeleton"

<SkeletonText />
<SkeletonText lines={5} />
<SkeletonText variant="shimmer" />
```

### SkeletonCard
Complete card skeleton with header, content, and actions:

```tsx
import { SkeletonCard } from "@/components/ui/skeleton"

<SkeletonCard />
<SkeletonCard variant="shimmer" />
```

### SkeletonAvatar
Circular avatar skeleton:

```tsx
import { SkeletonAvatar } from "@/components/ui/skeleton"

<SkeletonAvatar />
<SkeletonAvatar size="lg" />
<SkeletonAvatar variant="wave" />
```

### SkeletonTable
Table skeleton with configurable rows and columns:

```tsx
import { SkeletonTable } from "@/components/ui/skeleton"

<SkeletonTable />
<SkeletonTable rows={10} columns={6} />
<SkeletonTable variant="shimmer" />
```

### SkeletonList
List skeleton with avatars and text:

```tsx
import { SkeletonList } from "@/components/ui/skeleton"

<SkeletonList />
<SkeletonList items={8} />
<SkeletonList variant="wave" />
```

### SkeletonForm
Form skeleton with labels and inputs:

```tsx
import { SkeletonForm } from "@/components/ui/skeleton"

<SkeletonForm />
<SkeletonForm fields={6} />
<SkeletonForm variant="shimmer" />
```

## Advanced Usage

### Loading States
```tsx
const [loading, setLoading] = useState(true)

// Show skeleton while loading, content when loaded
<Skeleton 
  isLoading={loading} 
  children={<UserProfile user={user} />}
/>

// Multiple lines with loading indicator
<Skeleton 
  lines={3}
  showIndicator
  loadingText="Loading user data..."
  isLoading={loading}
/>
```

### Custom Layouts
```tsx
// Complex layout skeleton
<div className="flex space-x-4">
  <SkeletonAvatar size="lg" />
  <div className="flex-1 space-y-2">
    <Skeleton height={20} width="60%" />
    <Skeleton height={16} width="40%" />
    <div className="flex space-x-2">
      <Skeleton height={32} width={80} />
      <Skeleton height={32} width={100} />
    </div>
  </div>
</div>
```

### Responsive Skeleton
```tsx
// Responsive width
<Skeleton 
  className="w-full md:w-1/2 lg:w-1/3"
  height={200}
/>

// Responsive lines
<Skeleton 
  lines={window.innerWidth < 768 ? 2 : 4}
/>
```

## API Reference

### SkeletonProps

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `"default" \| "shimmer" \| "pulse" \| "wave" \| "glow"` | `"default"` | Animation variant |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl" \| "4xl" \| "5xl" \| "full"` | `"md"` | Height size |
| `width` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl" \| "4xl" \| "5xl" \| "full" \| "auto"` | `"full"` | Width size |
| `shape` | `"rectangle" \| "circle" \| "square" \| "pill" \| "none"` | `"rectangle"` | Shape variant |
| `speed` | `"slow" \| "normal" \| "fast"` | `"normal"` | Animation speed |
| `customWidth` | `string \| number` | - | Custom width override |
| `customHeight` | `string \| number` | - | Custom height override |
| `lines` | `number` | `1` | Number of skeleton lines |
| `spacing` | `"xs" \| "sm" \| "md" \| "lg" \| "xl"` | `"md"` | Spacing between lines |
| `showIndicator` | `boolean` | `false` | Show loading indicator |
| `loadingText` | `string` | `"Loading..."` | Custom loading text |
| `isLoading` | `boolean` | `true` | Loading state |
| `children` | `React.ReactNode` | - | Content to show when not loading |

## Best Practices

1. **Match Content Structure**: Design skeleton to match actual content layout
2. **Use Appropriate Variants**: Choose animation that fits your brand
3. **Consider Loading Time**: Use different skeletons for different loading durations
4. **Accessibility**: Always provide loading indicators for screen readers
5. **Performance**: Use `isLoading` prop to avoid unnecessary renders
6. **Responsive Design**: Consider different skeleton layouts for different screen sizes

## Examples

### E-commerce Product Card
```tsx
<div className="border rounded-lg p-4">
  <Skeleton height={200} width="full" className="mb-4" />
  <Skeleton height={20} width="80%" className="mb-2" />
  <Skeleton height={16} width="60%" className="mb-4" />
  <div className="flex justify-between items-center">
    <Skeleton height={24} width={60} />
    <Skeleton height={40} width={100} />
  </div>
</div>
```

### User Profile
```tsx
<div className="flex items-center space-x-4">
  <SkeletonAvatar size="xl" />
  <div className="flex-1">
    <Skeleton height={24} width="40%" className="mb-2" />
    <Skeleton height={16} width="60%" className="mb-1" />
    <Skeleton height={14} width="30%" />
  </div>
</div>
```

### Dashboard Stats
```tsx
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
  {Array.from({ length: 3 }, (_, i) => (
    <div key={i} className="p-6 border rounded-lg">
      <Skeleton height={16} width="50%" className="mb-2" />
      <Skeleton height={32} width="80%" className="mb-1" />
      <Skeleton height={14} width="30%" />
    </div>
  ))}
</div>
```

This skeleton component provides everything you need to create professional loading states that enhance user experience and maintain visual consistency across your application.
