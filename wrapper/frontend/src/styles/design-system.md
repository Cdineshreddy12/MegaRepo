# Design System Implementation

This document outlines the implementation of the design system based on `designs/design.json`.

## Color Palette

### Primary Colors
- **Primary Blue**: `#2563EB` - Main brand color
- **Secondary Light Blue**: `#E0F2FE` - Accent and background color

### Text Colors
- **Dark**: `#1A202C` - Primary text
- **Medium Grey**: `#4A5568` - Secondary text
- **Light Grey**: `#718096` - Muted text
- **White**: `#FFFFFF` - Text on dark backgrounds

### Background Colors
- **White**: `#FFFFFF` - Primary background
- **Gradient**: `linear-gradient(to bottom right, #E0F2FE, #FFFFFF)` - Special backgrounds

### Border Colors
- **Light Grey**: `#E2E8F0` - Default borders

### Feedback Colors
- **Success**: `#10B981` - Success states
- **Warning**: `#F59E0B` - Warning states

### Accent Colors
- **Purple**: `#8B5CF6`
- **Red**: `#EF4444`
- **Green**: `#22C55E`
- **Blue**: `#60A5FA`

## Typography

### Font Family
- **Primary**: Inter, sans-serif

### Font Sizes
- **H1**: 3.5rem (56px)
- **H2**: 2.25rem (36px)
- **H3**: 1.5rem (24px)
- **Body Large**: 1.125rem (18px)
- **Body Standard**: 1rem (16px)
- **Small**: 0.875rem (14px)
- **Button**: 1rem (16px)
- **Pricing**: 3rem (48px)

### Font Weights
- **Regular**: 400
- **Medium**: 500
- **Semibold**: 600
- **Bold**: 700

### Line Heights
- **H1**: 1.2
- **H2**: 1.3
- **H3**: 1.4
- **Body Large**: 1.6
- **Body Standard**: 1.5
- **Small**: 1.4

## Spacing System

Based on 4px modular scale:
- **XS**: 4px
- **SM**: 8px
- **MD**: 16px
- **LG**: 24px
- **XL**: 32px
- **2XL**: 48px
- **3XL**: 64px

## Border Radius

- **SM**: 4px
- **MD**: 8px
- **LG**: 12px
- **Full**: 9999px

## Shadows

- **SM**: `0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)`
- **MD**: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)`

## Layout

- **Container Max Width**: 1200px
- **Grid System**: Flexible, responsive grid
- **Sections**: Vertical spacing 48px-64px, horizontal padding 32px

## Usage

### CSS Variables
All design tokens are available as CSS variables:
```css
color: var(--primary-blue);
background: var(--background-white);
font-size: var(--font-size-h1);
```

### Tailwind Classes
Design system tokens are available as Tailwind classes:
```html
<div class="text-primary-blue bg-background-white text-h1">
  Heading
</div>
```

### Utility Classes
Custom utility classes are available:
```html
<div class="text-primary-blue shadow-design-md radius-lg">
  Card
</div>
```

## Dark Mode

The design system includes dark mode variants for all colors, automatically applied when the `.dark` class is present on the document.

## Implementation Status

✅ CSS Variables defined
✅ Tailwind configuration updated
✅ Typography system implemented
✅ Color palette implemented
✅ Spacing system implemented
✅ Border radius system implemented
✅ Shadow system implemented
✅ Toast notifications updated
✅ Loading screens updated
✅ Dark mode support added

