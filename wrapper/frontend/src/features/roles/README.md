# Role Management System

A comprehensive, modular role management system built with React, TypeScript, TanStack Query, and shadcn/ui components.

## Architecture

The role management system is organized into several key modules:

### 📁 Directory Structure

```
components/roles/
├── components/           # Reusable UI components
│   ├── RoleFilters.tsx
│   ├── RoleRow.tsx
│   ├── RoleTableHeader.tsx
│   ├── BulkActions.tsx
│   ├── RoleDetailsModal.tsx
│   ├── DeleteRoleModal.tsx
│   ├── RoleEmptyState.tsx
│   ├── RoleLoadingState.tsx
│   └── EnhancedPermissionSummary.tsx
├── forms/               # Form components
│   └── RoleForm.tsx
├── hooks/               # Custom hooks
│   └── useRoleQueries.ts
├── utils/               # Utility functions
│   └── permissionUtils.ts
├── types/               # TypeScript types
│   └── role-management.ts
├── RoleManagementDashboard.tsx  # Main dashboard
└── index.ts            # Exports
```

## 🚀 Key Features

### 1. **TanStack Query Integration**
- Automatic caching and background updates
- Optimistic updates for better UX
- Error handling and retry logic
- Query invalidation on mutations

### 2. **Modular Component Architecture**
- **RoleFilters**: Advanced filtering and search
- **RoleRow**: Individual role display with actions
- **BulkActions**: Multi-select operations
- **RoleDetailsModal**: Comprehensive role information
- **RoleForm**: React Hook Form integration

### 3. **TypeScript Support**
- Comprehensive type definitions
- Type-safe API calls
- IntelliSense support

### 4. **Permission Management**
- Hierarchical permission structure
- Permission categorization (admin, write, read)
- Module-based organization
- Permission summary calculations

## 📦 Components

### RoleManagementDashboard
Main dashboard component that orchestrates all other components.

```tsx
import { RoleManagementDashboard } from '@/features/roles';

<RoleManagementDashboard />
```

### RoleFilters
Advanced filtering component with search, type filtering, and sorting.

```tsx
<RoleFilters
  filters={filters}
  onFiltersChange={handleFiltersChange}
  onClearFilters={handleClearFilters}
  totalCount={totalCount}
  filteredCount={filteredCount}
/>
```

### RoleRow
Individual role display with actions and permission summary.

```tsx
<RoleRow
  role={role}
  isSelected={isSelected}
  onToggleSelect={handleToggleSelect}
  actions={roleRowActions}
/>
```

### BulkActions
Multi-select operations for bulk role management.

```tsx
<BulkActions
  selectedCount={selectedCount}
  totalCount={totalCount}
  onBulkAction={handleBulkAction}
  onClearSelection={handleClearSelection}
  selectedRoleIds={selectedRoleIds}
  isLoading={isLoading}
/>
```

## 🔧 Hooks

### useRoles
Fetch roles with filters using TanStack Query.

```tsx
const { data, isLoading, error } = useRoles(filters);
```

### useRoleMutations
Handle role CRUD operations with optimistic updates.

```tsx
const { 
  createRole, 
  updateRole, 
  deleteRole, 
  bulkDeleteRoles,
  isCreating,
  isUpdating,
  isDeleting 
} = useRoleMutations();
```

## 🛠️ Utilities

### Permission Utils
Helper functions for permission management:

```tsx
import { 
  getPermissionSummary,
  getPermissionTypeColor,
  canEditRole,
  canDeleteRole 
} from '@/features/roles/utils/permissionUtils';

// Get permission summary
const summary = getPermissionSummary(role.permissions);

// Check if role can be edited
const canEdit = canEditRole(role);
```

## 📝 Forms

### RoleForm
React Hook Form integration with Zod validation:

```tsx
<RoleForm
  initialRole={role}
  onSubmit={handleSubmit}
  onCancel={handleCancel}
  isLoading={isLoading}
/>
```

## 🎨 Styling

The system uses shadcn/ui components for consistent styling:

- **Cards**: For content organization
- **Buttons**: For actions and interactions
- **Badges**: For status indicators
- **Dialogs**: For modals and confirmations
- **Forms**: For data input
- **Tables**: For data display

## 🔄 Data Flow

1. **Initial Load**: `useRoles` hook fetches data
2. **Filtering**: Filters update query parameters
3. **Mutations**: Actions trigger optimistic updates
4. **Cache Invalidation**: Successful mutations invalidate cache
5. **Background Refetch**: Fresh data is fetched automatically

## 🚦 State Management

- **Local State**: Component-level state for UI
- **Server State**: TanStack Query for API data
- **Form State**: React Hook Form for form data
- **Selection State**: Local state for multi-select

## 🔒 Permission System

### Permission Types
- **Admin**: Full control permissions
- **Write**: Create/update permissions  
- **Read**: View-only permissions

### Permission Structure
```typescript
{
  crm: {
    leads: ['create', 'read', 'update', 'delete'],
    contacts: ['read', 'update']
  },
  hr: {
    employees: ['read', 'update', 'manage']
  }
}
```

## 🎯 Best Practices

### 1. **Component Composition**
- Break down complex components
- Use composition over inheritance
- Keep components focused and single-purpose

### 2. **Type Safety**
- Define comprehensive interfaces
- Use generic types where appropriate
- Leverage TypeScript's type inference

### 3. **Performance**
- Use React.memo for expensive components
- Implement proper dependency arrays
- Leverage TanStack Query's caching

### 4. **Error Handling**
- Graceful error states
- User-friendly error messages
- Retry mechanisms for failed requests

## 🔧 Customization

### Adding New Filters
```tsx
// Add to RoleFiltersType
interface RoleFiltersType {
  // ... existing filters
  department?: string;
  status?: 'active' | 'inactive';
}
```

### Adding New Actions
```tsx
// Add to BulkAction type
type BulkAction = 'delete' | 'export' | 'deactivate' | 'archive';
```

### Custom Permission Logic
```tsx
// Extend permissionUtils.ts
export const getCustomPermissionSummary = (permissions: any) => {
  // Custom logic here
};
```

## 🧪 Testing

The modular architecture makes testing straightforward:

```tsx
// Test individual components
import { render, screen } from '@testing-library/react';
import { RoleRow } from '@/features/roles';

test('renders role information', () => {
  render(<RoleRow role={mockRole} />);
  expect(screen.getByText(mockRole.roleName)).toBeInTheDocument();
});
```

## 📚 Dependencies

- **React**: UI framework
- **TypeScript**: Type safety
- **TanStack Query**: Server state management
- **React Hook Form**: Form management
- **Zod**: Schema validation
- **shadcn/ui**: UI components
- **Lucide React**: Icons

## 🚀 Future Enhancements

- **Real-time Updates**: WebSocket integration
- **Advanced Permissions**: Time-based and conditional permissions
- **Role Templates**: Predefined role configurations
- **Audit Logging**: Track role changes
- **Bulk Import/Export**: CSV/JSON role management
- **Role Hierarchy**: Parent-child role relationships
