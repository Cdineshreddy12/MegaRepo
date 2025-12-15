# Design System Documentation

## Overview

This design system provides a unified, professional, and scalable approach to building UI components for our SaaS application. It's inspired by modern design systems from Linear, Notion, Vercel, and Stripe, focusing on clean aesthetics, excellent usability, and developer experience.

## Key Principles

### 1. Consistency
- **Unified spacing**: 4px grid system for consistent spacing
- **Typography scale**: Harmonious font sizes and weights
- **Color system**: Semantic color tokens with light/dark mode support
- **Component patterns**: Consistent behavior and styling across all components

### 2. Accessibility
- **WCAG 2.1 AA compliance**: Proper contrast ratios and focus states
- **Keyboard navigation**: Full keyboard support for all interactive elements
- **Screen reader support**: Proper ARIA labels and semantic markup
- **Focus management**: Clear focus indicators and logical tab order

### 3. Scalability
- **Design tokens**: CSS variables for easy theme customization
- **Component variants**: Flexible component APIs with consistent patterns
- **Theme system**: Light and dark mode support with automatic switching
- **Extensibility**: Easy to add new components following established patterns

## Color System

### Primary Colors
- **Blue-based palette**: Professional and trustworthy
- **50-950 scale**: From lightest to darkest variants
- **Semantic naming**: `primary-600` for main actions, `primary-100` for backgrounds

### Semantic Colors
- **Success**: Green tones for positive actions and states
- **Warning**: Yellow/amber tones for caution and attention
- **Error**: Red tones for errors and destructive actions
- **Secondary**: Slate tones for neutral elements

### Usage Guidelines
```tsx
// ✅ Good - Use semantic colors
<Button variant="success">Save Changes</Button>
<Badge variant="error">Error</Badge>

// ❌ Avoid - Arbitrary colors
<Button className="bg-green-500">Save Changes</Button>
```

## Typography

### Font Stack
- **Primary**: Inter (modern, readable)
- **Monospace**: JetBrains Mono (code and data)

### Scale
- **xs**: 12px - Captions and metadata
- **sm**: 14px - Small text and labels
- **base**: 16px - Body text (default)
- **lg**: 18px - Large body text
- **xl**: 20px - Small headings
- **2xl**: 24px - Medium headings
- **3xl**: 30px - Large headings
- **4xl**: 36px - Extra large headings

### Usage
```tsx
// ✅ Good - Use typography classes
<h1 className="text-4xl font-bold">Main Heading</h1>
<p className="text-base text-text-secondary">Body text</p>

// ❌ Avoid - Inline styles
<h1 style={{ fontSize: '36px', fontWeight: 'bold' }}>Main Heading</h1>
```

## Spacing System

### 4px Grid
- **1**: 4px - Minimal spacing
- **2**: 8px - Small spacing
- **3**: 12px - Medium-small spacing
- **4**: 16px - Base spacing
- **6**: 24px - Medium spacing
- **8**: 32px - Large spacing
- **12**: 48px - Extra large spacing
- **16**: 64px - Section spacing

### Usage
```tsx
// ✅ Good - Use spacing scale
<div className="space-y-4 p-6">
  <h2 className="mb-2">Title</h2>
  <p>Content</p>
</div>

// ❌ Avoid - Arbitrary spacing
<div style={{ padding: '24px', marginBottom: '8px' }}>
  <h2 style={{ marginBottom: '4px' }}>Title</h2>
  <p>Content</p>
</div>
```

## Component Patterns

### Button Component
```tsx
// Variants
<Button variant="default">Primary Action</Button>
<Button variant="secondary">Secondary Action</Button>
<Button variant="outline">Outline Action</Button>
<Button variant="ghost">Ghost Action</Button>
<Button variant="destructive">Delete</Button>

// Sizes
<Button size="xs">Extra Small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

// States
<Button loading loadingText="Saving...">Save</Button>
<Button disabled>Disabled</Button>
```

### Form Components
```tsx
// Form Input with validation
<FormInput
  label="Email Address"
  type="email"
  placeholder="Enter your email"
  required
  error={errors.email}
  description="We'll never share your email"
/>

// Form Select
<FormSelect
  label="Role"
  placeholder="Select a role"
  options={[
    { value: 'admin', label: 'Administrator' },
    { value: 'user', label: 'User' }
  ]}
/>

// Form Switch
<FormSwitch
  label="Email Notifications"
  description="Receive updates via email"
  checked={notifications}
  onCheckedChange={setNotifications}
/>
```

### Card Components
```tsx
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
</Card>

// Card variants
<Card variant="elevated">Enhanced shadow</Card>
<Card variant="outlined">Prominent border</Card>
<Card variant="ghost">Minimal styling</Card>
```

## Dark Mode

The design system includes comprehensive dark mode support through CSS variables:

```css
/* Light mode (default) */
:root {
  --background: 0 0% 100%;
  --text-primary: 0 0% 9%;
  --border: 0 0% 90%;
}

/* Dark mode */
.dark {
  --background: 0 0% 4%;
  --text-primary: 0 0% 98%;
  --border: 0 0% 15%;
}
```

### Usage
```tsx
// Toggle dark mode
const toggleDarkMode = () => {
  document.documentElement.classList.toggle('dark')
}

// Or use a theme provider
<ThemeProvider defaultTheme="system">
  <App />
</ThemeProvider>
```

## Accessibility Features

### Focus Management
- **Visible focus indicators**: Clear ring around focused elements
- **Logical tab order**: Proper keyboard navigation flow
- **Skip links**: Jump to main content for screen readers

### Color Contrast
- **AA compliance**: All color combinations meet WCAG 2.1 AA standards
- **High contrast mode**: Enhanced contrast for accessibility needs
- **Color-blind friendly**: Colors work for all types of color vision

### Screen Reader Support
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **ARIA labels**: Descriptive labels for interactive elements
- **Live regions**: Announce dynamic content changes

## Best Practices

### 1. Component Usage
```tsx
// ✅ Good - Use design system components
<Button variant="primary" size="lg">
  <Plus className="h-4 w-4 mr-2" />
  Add Item
</Button>

// ❌ Avoid - Custom styling
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Add Item
</button>
```

### 2. Layout Patterns
```tsx
// ✅ Good - Use consistent spacing
<div className="space-y-6">
  <h1 className="text-3xl font-bold">Title</h1>
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    <Card>Content 1</Card>
    <Card>Content 2</Card>
  </div>
</div>

// ❌ Avoid - Inconsistent spacing
<div>
  <h1 style={{ marginBottom: '20px' }}>Title</h1>
  <div style={{ display: 'grid', gap: '16px' }}>
    <Card>Content 1</Card>
    <Card>Content 2</Card>
  </div>
</div>
```

### 3. Form Design
```tsx
// ✅ Good - Proper form structure
<form className="space-y-6">
  <FormInput
    label="Full Name"
    required
    error={errors.name}
  />
  <FormSelect
    label="Country"
    options={countries}
    required
  />
  <div className="flex justify-end gap-3">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</form>
```

## Migration Guide

### From Old Components
1. **Replace custom classes** with design system components
2. **Update color references** to use semantic tokens
3. **Standardize spacing** using the 4px grid
4. **Add proper focus states** and accessibility features

### Example Migration
```tsx
// Before
<div className="bg-white p-4 rounded border">
  <h3 className="text-lg font-semibold mb-2">Title</h3>
  <p className="text-gray-600">Content</p>
</div>

// After
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-text-secondary">Content</p>
  </CardContent>
</Card>
```

## Contributing

### Adding New Components
1. **Follow existing patterns** for consistency
2. **Include all variants** (sizes, states, etc.)
3. **Add proper TypeScript types** and documentation
4. **Test accessibility** with keyboard and screen readers
5. **Update this documentation** with usage examples

### Component Template
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const componentVariants = cva(
  "base-classes",
  {
    variants: {
      variant: {
        default: "default-styles",
        // other variants
      },
      size: {
        sm: "small-styles",
        default: "default-styles",
        lg: "large-styles",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ComponentProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof componentVariants> {}

const Component = React.forwardRef<HTMLElement, ComponentProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <element
        ref={ref}
        className={cn(componentVariants({ variant, size, className }))}
        {...props}
      />
    )
  }
)
Component.displayName = "Component"

export { Component, componentVariants }
```

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com/primitives)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Design System Examples](https://designsystemsrepo.com/)

---

*This design system is continuously evolving. Please contribute improvements and report issues to help us maintain the highest quality standards.*
