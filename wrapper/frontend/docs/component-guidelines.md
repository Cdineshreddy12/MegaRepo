# Component Development Guidelines

## Component Structure

### 1. File Organization
```
components/
├── ui/                 # ShadCN UI components
├── layout/            # Layout components
├── common/            # Shared business components
└── features/          # Feature-specific components
```

### 2. Component Naming
- Use PascalCase for component names
- Use descriptive names that indicate purpose
- Prefix with feature name for feature components

Examples:
- `UserCard` (common component)
- `UserForm` (feature component)
- `AppShell` (layout component)

### 3. Component Structure
```tsx
import React from "react"
import { cn } from "@/lib/utils"

interface ComponentProps {
  // Props with proper TypeScript types
  className?: string
  children?: React.ReactNode
}

export function Component({ className, children, ...props }: ComponentProps) {
  return (
    <div className={cn("base-styles", className)} {...props}>
      {children}
    </div>
  )
}
```

## Component Guidelines

### 1. Props Interface
- Always define TypeScript interfaces for props
- Use optional props with default values when appropriate
- Include className prop for styling flexibility
- Use proper React types (React.ReactNode, React.HTMLAttributes)

### 2. Styling
- Use Tailwind CSS classes
- Use `cn()` utility for conditional classes
- Follow design system patterns
- Use CSS variables for theming

### 3. Accessibility
- Include proper ARIA attributes
- Ensure keyboard navigation
- Use semantic HTML elements
- Test with screen readers

### 4. Performance
- Use React.memo for expensive components
- Avoid unnecessary re-renders
- Use useCallback and useMemo appropriately
- Lazy load heavy components

## Component Types

### 1. UI Components (ShadCN)
- Base design system components
- Highly reusable and configurable
- No business logic
- Examples: Button, Input, Card, Dialog

### 2. Layout Components
- Application shell components
- Navigation and structure
- Examples: Header, Sidebar, Footer, AppShell

### 3. Feature Components
- Business logic components
- Feature-specific functionality
- Examples: UserForm, OrganizationCard, AnalyticsChart

### 4. Page Components
- Route-level components
- Composition of feature components
- Examples: Dashboard, UsersPage, AnalyticsPage

## Best Practices

### 1. Composition over Inheritance
- Use composition patterns
- Create flexible component APIs
- Avoid deep prop drilling

### 2. Single Responsibility
- Each component should have one clear purpose
- Separate concerns appropriately
- Keep components focused

### 3. Reusability
- Design for reusability
- Use proper abstraction levels
- Avoid over-engineering

### 4. Testing
- Write testable components
- Use proper testing patterns
- Test user interactions

## Common Patterns

### 1. Compound Components
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
</Card>
```

### 2. Render Props
```tsx
<DataProvider>
  {({ data, loading, error }) => (
    <Component data={data} loading={loading} error={error} />
  )}
</DataProvider>
```

### 3. Custom Hooks
```tsx
function useUserData(userId: string) {
  // Custom hook logic
  return { user, loading, error }
}
```

## Documentation

### 1. Component Documentation
- Use JSDoc comments
- Document props and usage
- Include examples
- Update Storybook stories

### 2. Code Comments
- Explain complex logic
- Document business rules
- Include TODO items for future improvements