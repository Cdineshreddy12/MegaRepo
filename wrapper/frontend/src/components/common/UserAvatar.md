# UserAvatar Component

A highly reusable and flexible avatar component for displaying user information with various customization options.

## Features

- **Multiple Sizes**: 6 predefined sizes from XS to 2XL
- **Status Indicators**: Online, offline, away, and busy status with colored indicators
- **Tooltips**: Optional tooltips with custom content
- **Fallback Handling**: Graceful handling of missing user data, avatars, or names
- **Clickable**: Optional click handlers with hover effects
- **Customizable**: Extensive styling and behavior customization
- **Preset Variants**: Pre-configured variants for common use cases
- **Accessibility**: Proper ARIA labels and keyboard navigation

## Basic Usage

```tsx
import UserAvatar from "@/components/common/UserAvatar";

// Basic usage
<UserAvatar user={user} />

// With size and status
<UserAvatar 
  user={user} 
  size="lg" 
  showStatus 
  status="online" 
/>

// With tooltip
<UserAvatar 
  user={user} 
  showTooltip 
  tooltipContent="John Doe - Software Engineer"
/>

// Clickable
<UserAvatar 
  user={user} 
  onClick={() => handleUserClick(user)}
  showTooltip
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `user` | `User \| null \| undefined` | - | User object or null/undefined |
| `size` | `"xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl"` | `"md"` | Avatar size |
| `showStatus` | `boolean` | `false` | Show status indicator |
| `status` | `"online" \| "offline" \| "away" \| "busy"` | `"offline"` | Status indicator color |
| `className` | `string` | - | Additional CSS classes |
| `fallbackIcon` | `React.ComponentType` | `UserIcon` | Icon for null/undefined users |
| `showTooltip` | `boolean` | `false` | Show tooltip on hover |
| `tooltipContent` | `string` | - | Custom tooltip content |
| `onClick` | `() => void` | - | Click handler |
| `disabled` | `boolean` | `false` | Disable interactions |

## Size Reference

| Size | Dimensions | Use Case |
|------|------------|----------|
| `xs` | 24x24px | Small lists, compact views |
| `sm` | 32x32px | User lists, table rows |
| `md` | 40x40px | Cards, general usage |
| `lg` | 48x48px | Headers, prominent displays |
| `xl` | 64x64px | Profile sections |
| `2xl` | 80x80px | Large profile displays |

## Preset Variants

For common use cases, use the preset variants:

```tsx
import { UserAvatarPresets } from "@/components/common/UserAvatar";

// For user lists
<UserAvatarPresets.ListItem user={user} />

// For user cards
<UserAvatarPresets.Card user={user} />

// For page headers
<UserAvatarPresets.Header user={user} />

// For profile pages
<UserAvatarPresets.Profile user={user} />

// For clickable dropdowns
<UserAvatarPresets.Clickable user={user} onClick={handleClick} />
```

## Fallback Behavior

The component handles various fallback scenarios gracefully:

1. **Null/undefined user**: Shows fallback icon
2. **Missing avatar**: Shows initials or fallback icon
3. **Missing name**: Uses email or shows "?" 
4. **Empty name**: Uses email first character
5. **Single name**: Uses first character

## Examples

### User List Item
```tsx
<UserAvatar 
  user={user} 
  size="sm" 
  showTooltip 
  tooltipContent={`${user.name} - ${user.title}`}
/>
```

### User Card
```tsx
<UserAvatar 
  user={user} 
  size="md" 
  showStatus 
  status={user.isActive ? "online" : "offline"}
  className="mb-2"
/>
```

### Clickable User Dropdown
```tsx
<UserAvatar 
  user={user} 
  size="lg" 
  onClick={() => setShowDropdown(!showDropdown)}
  showTooltip
  className="cursor-pointer"
/>
```

### Profile Header
```tsx
<UserAvatar 
  user={user} 
  size="xl" 
  showStatus 
  showTooltip 
  tooltipContent={user.name}
  className="ring-2 ring-primary ring-offset-2"
/>
```

## Styling

The component uses Tailwind CSS classes and can be customized with:

- `className` prop for additional styles
- Custom status indicator colors
- Custom fallback backgrounds
- Hover effects for clickable avatars

## Accessibility

- Proper `alt` attributes for images
- ARIA labels for interactive elements
- Keyboard navigation support
- Screen reader friendly fallbacks

## TypeScript Support

Full TypeScript support with proper type definitions for all props and the User interface from `@/types/user-management`.
