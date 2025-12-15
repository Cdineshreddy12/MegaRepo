# Architecture Overview

## Project Structure

This project follows a **feature-based architecture** with clear separation of concerns:

```
src/
├── components/           # Shared UI components
│   ├── ui/              # ShadCN UI components
│   ├── layout/          # Layout components (Header, Sidebar, Footer)
│   └── common/          # Shared business components
├── features/            # Feature-scoped code
│   ├── users/           # User management feature
│   ├── organizations/    # Organization management
│   ├── applications/    # Application management
│   └── analytics/       # Analytics feature
├── lib/                # Utilities and shared logic
├── stores/            # Zustand state management
├── providers/         # React context providers
├── routes/            # Route components (lazy-loaded)
├── hooks/             # Global custom hooks
├── types/             # TypeScript type definitions
└── errors/            # Error handling components
```

## Key Architectural Patterns

### 1. Feature-Based Organization
- Each feature contains its own components, hooks, and services
- Promotes code locality and maintainability
- Enables independent development and testing

### 2. State Management
- **Server State**: TanStack Query for API data and caching
- **Client State**: Zustand for UI state (theme, sidebar, modals)
- **Form State**: React Hook Form with Zod validation
- **URL State**: React Router for navigation and URL parameters

### 3. Component Architecture
- **UI Components**: Reusable, design system components
- **Layout Components**: Application shell and navigation
- **Feature Components**: Business logic components
- **Page Components**: Route-level components

### 4. Error Handling
- **Error Boundaries**: Catch and handle React errors
- **API Error Handling**: Centralized error handling with user feedback
- **Validation**: Runtime validation with Zod schemas

## Technology Stack

- **React 18** with TypeScript
- **React Router 6** for client-side routing
- **TanStack Query** for server state management
- **Zustand** for client state management
- **React Hook Form** with Zod for forms
- **Tailwind CSS** for styling
- **ShadCN UI** for component library
- **Vite** for build tooling

## Performance Optimizations

- **Code Splitting**: Lazy-loaded routes and components
- **Bundle Optimization**: Manual chunk splitting for better caching
- **Query Optimization**: Proper staleTime and gcTime configuration
- **Memoization**: React.memo, useMemo, useCallback for expensive operations

## Development Workflow

1. **Feature Development**: Create feature in `src/features/`
2. **Component Development**: Use ShadCN UI components as base
3. **State Management**: Use appropriate state management solution
4. **Testing**: Unit tests with Vitest, E2E with Playwright
5. **Documentation**: Update component documentation in Storybook