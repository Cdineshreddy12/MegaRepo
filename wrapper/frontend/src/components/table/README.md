# Table Components

A comprehensive, reusable table system built with TanStack Table for the entire application.

## 📁 Structure

```
src/components/table/
├── index.ts           # Main exports
├── ReusableTable.tsx  # Main table component
├── types.ts           # Type definitions and utilities
├── cells.tsx          # Custom cell renderers
├── hooks.ts           # Custom hooks for table logic
└── README.md          # This file
```

## 🚀 Quick Start

```tsx
import { ReusableTable, createTextColumn, createAction, Edit, Trash2 } from '@/components/table';

const MyComponent = () => {
  const data = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
  ];

  const columns = [
    createTextColumn('name', 'Name'),
    createTextColumn('email', 'Email'),
  ];

  const actions = [
    createAction('edit', 'Edit', Edit, (item) => console.log('Edit', item)),
    createAction('delete', 'Delete', Trash2, (item) => console.log('Delete', item), {
      destructive: true
    }),
  ];

  return (
    <ReusableTable
      data={data}
      columns={columns}
      actions={actions}
      getItemId={(item) => item.id}
      title="Users"
      enablePagination={true}
      enableGlobalSearch={true}
    />
  );
};
```

## 📋 API Reference

### ReusableTable Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `T[]` | - | Array of data to display |
| `columns` | `TableColumn<T>[]` | - | Column definitions |
| `actions` | `TableAction<T>[]` | `[]` | Row actions |
| `filters` | `TableFilter[]` | `[]` | Column filters |
| `selectable` | `boolean` | `false` | Enable row selection |
| `selectedItems` | `Set<string>` | - | Selected item IDs |
| `onSelectionChange` | `(selected: Set<string>) => void` | - | Selection change handler |
| `getItemId` | `(item: T) => string` | - | Function to get item ID |
| `loading` | `boolean` | `false` | Loading state |
| `emptyMessage` | `string` | `'No data available'` | Empty state message |
| `enablePagination` | `boolean` | `true` | Enable pagination |
| `pageSize` | `number` | `10` | Items per page |
| `enableColumnVisibility` | `boolean` | `true` | Enable column visibility toggle |
| `enableGlobalSearch` | `boolean` | `true` | Enable global search |
| `searchPlaceholder` | `string` | `'Search...'` | Search input placeholder |
| `title` | `string` | - | Table title |

### Column Definition

```tsx
interface TableColumn<T = any> {
  key: string;                    // Unique identifier
  label: string;                  // Display label
  width?: string;                 // Column width
  render?: (item: T) => ReactNode; // Custom render function
  sortable?: boolean;             // Enable sorting
  filterable?: boolean;           // Enable filtering
  filterFn?: FilterFn<T>;         // Custom filter function
  cell?: (props: any) => ReactNode; // TanStack cell renderer
}
```

### Action Definition

```tsx
interface TableAction<T = any> {
  key: string;                           // Unique identifier
  label: string | ((item: T) => string); // Action label
  icon: React.ElementType;               // Lucide icon component
  onClick: (item: T) => void;            // Click handler
  disabled?: (item: T) => boolean;       // Disable condition
  destructive?: boolean;                 // Destructive action styling
  separator?: boolean;                   // Add separator before action
  variant?: ButtonVariant;               // Button variant
  className?: string;                    // Additional CSS classes
}
```

### Filter Definition

```tsx
interface TableFilter {
  key: string;              // Column key to filter
  label: string;            // Filter label
  type: 'text' | 'select';  // Filter type
  options?: { value: string; label: string }[]; // Select options
  placeholder?: string;     // Input placeholder
}
```

## 🎨 Cell Renderers

### Built-in Cell Components

```tsx
import {
  StatusBadge,
  UserCell,
  EmailCell,
  OrganizationCell,
  DateCell,
  BooleanCell,
  RoleCell,
  TruncatedText,
  PriorityCell,
  ProgressCell,
} from '@/components/table/cells';
```

### Usage Examples

```tsx
// Status badge with automatic styling
<StatusBadge status="active" /> // Green badge with check icon
<StatusBadge status="pending" /> // Yellow badge with clock icon

// User cell with avatar
<UserCell user={{ name: 'John Doe', email: 'john@example.com' }} showEmail />

// Date formatting
<DateCell date="2024-01-15" format="long" />

// Progress bar
<ProgressCell progress={75} showPercentage />
```

## 🪝 Custom Hooks

### useTable Hook

```tsx
import { useTable } from '@/components/table/hooks';

const { table, sorting, globalFilter } = useTable(data, columns, {
  enableSorting: true,
  enableFiltering: true,
  enablePagination: true,
  pageSize: 20,
});
```

### useSelectableTable Hook

```tsx
import { useSelectableTable } from '@/components/table/hooks';

const {
  table,
  selectedItems,
  clearSelection,
  selectAll
} = useSelectableTable(data, columns, getItemId, {
  onSelectionChange: (selected) => console.log('Selected:', selected),
});
```

## 🛠️ Helper Functions

### Creating Columns

```tsx
import { createTextColumn, createCustomColumn } from '@/components/table';

// Simple text column
const nameColumn = createTextColumn('name', 'Full Name', {
  sortable: true,
  width: '200px'
});

// Custom column with render function
const statusColumn = createCustomColumn(
  'status',
  'Status',
  (user) => <StatusBadge status={user.status} />
);
```

### Creating Actions

```tsx
import { createAction, Edit, Trash2 } from '@/components/table';

const editAction = createAction('edit', 'Edit', Edit, handleEdit);
const deleteAction = createAction('delete', 'Delete', Trash2, handleDelete, {
  destructive: true,
  disabled: (item) => !item.canDelete,
});
```

### Creating Filters

```tsx
import { createTextFilter, createSelectFilter } from '@/components/table';

const searchFilter = createTextFilter('name', 'Search by name');
const statusFilter = createSelectFilter('status', 'Status', [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]);
```

## 🎯 Advanced Usage

### Custom Filter Functions

```tsx
const columns = [
  {
    key: 'createdAt',
    label: 'Created',
    filterable: true,
    filterFn: (row, columnId, filterValue) => {
      const date = new Date(row.getValue(columnId));
      return date.toISOString().includes(filterValue);
    },
  },
];
```

### Custom Cell Renderer with TanStack

```tsx
const columns = [
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }) => (
      <StatusBadge status={getValue() as string} />
    ),
  },
];
```

### Server-side Filtering/Pagination

```tsx
const MyTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // Implement server-side filtering/pagination
  const fetchData = async (filters, pagination) => {
    setLoading(true);
    const response = await api.get('/data', { params: { ...filters, ...pagination } });
    setData(response.data);
    setLoading(false);
  };

  return (
    <ReusableTable
      data={data}
      columns={columns}
      loading={loading}
      enablePagination={false} // Handle pagination manually
      enableGlobalSearch={false} // Handle search manually
    />
  );
};
```

## 🎨 Theming

The table components automatically adapt to your theme:

- **Light Mode**: Clean white backgrounds with subtle shadows
- **Dark Mode**: Dark backgrounds with purple accents
- **Monochrome**: Minimal gray color scheme
- **Glassmorphism**: Transparent backgrounds with purple gradients

## 🔧 Best Practices

1. **Use TypeScript**: Define proper types for your data
2. **Memoize columns**: Use `useTableColumns` hook for performance
3. **Handle loading states**: Always show loading indicators
4. **Provide meaningful empty states**: Custom empty messages help UX
5. **Use appropriate cell renderers**: Leverage built-in components for consistency
6. **Consider performance**: For large datasets, implement virtual scrolling

## 📚 Examples

Check out these existing implementations:
- `UserManagementDashboard.tsx` - Roles and assignments tables
- `UserTable.tsx` - User management table
- `OverviewPage.tsx` - Stats cards (uses different component)

## 🤝 Contributing

When adding new cell renderers or features:

1. Add to appropriate file (`cells.tsx`, `hooks.ts`, etc.)
2. Export from `index.ts`
3. Update this README with documentation
4. Add TypeScript types if needed
5. Include usage examples
