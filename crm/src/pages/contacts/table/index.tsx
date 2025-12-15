// Components
import React from "react";
import { DataTable, DataTableEmptyState } from "@/components/data-grid";

// Columns configuration
import { columns } from "./columns";

// Hooks
import { useOrgContacts } from "@/hooks/useOrgAwareQueries";

// Types and services
import { Contact } from "@/services/api/contactService";

// Constants
import { ENTITY } from "@/constants";

// Icons
import { ShieldX } from "lucide-react";


function ContactsTable({onRowDoubleClick}: {onRowDoubleClick: (row: Contact) => void}) {
  const { data, isPending, isError, error } = useOrgContacts();

  // Debug logging
  console.log('🔍 ContactsTable Debug:', {
    isPending,
    isError,
    hasData: !!data,
    dataLength: data?.length || 0,
    dataType: Array.isArray(data) ? 'array' : typeof data,
    error: error ? {
      message: (error as any)?.message,
      status: (error as any)?.response?.status,
    } : null,
  });

  // Ensure data is an array and map it properly
  const formattedContacts: Contact[] = React.useMemo(() => {
    if (isPending || isError || !data) {
      return [];
    }
    
    if (!Array.isArray(data)) {
      console.warn('⚠️ Contacts data is not an array:', typeof data, data);
      return [];
    }
    
    return data.map((d) => ({
      ...d,
      // @ts-expect-error mongodb collection id
      id: d.id || d._id,
    }));
  }, [data, isPending, isError]);

  // Check if the error is a permission error (403)
  const isPermissionError = error && (
    (error as any)?.response?.status === 403 ||
    (error as any)?.status === 403 ||
    (error as any)?.message?.includes('403') ||
    (error as any)?.message?.includes('permission')
  );

  // Custom no data message for permission errors
  const noDataMessage = isPermissionError ? (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <ShieldX className="h-16 w-16 text-red-500 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Access Denied
      </h3>
      <p className="text-gray-600 mb-4">
        You don't have permissions to access this module
      </p>
      <p className="text-sm text-gray-500">
        Please contact your administrator to request access to the Contacts module.
      </p>
    </div>
  ) : (
    <DataTableEmptyState entityType={ENTITY.CONTACT} />
  );

  return (
    <DataTable
      columns={columns}
      data={formattedContacts}
      onRowDoubleClick={onRowDoubleClick}
      noDataMessage={noDataMessage}
      loading={isPending}
      filterVariant="column"
      isLoading={isPending}
      loadingRows={5}
      enableColumnReordering={false}
      enableExport={false}
      // exportOptions={{
      //   format: "csv",
      //   filename: "contacts-export",
      //   includeHeaders: true,
      //   onlySelectedRows: false,
      // }}
      // rowActions={[
      //   {
      //     label: "Edit Selected",
      //     icon: <FileEdit className="h-4 w-4" />,
      //     action: (rows) => console.log("Edit rows:", rows),
      //     variant: "default",
      //   },
      //   {
      //     label: "Delete Selected",
      //     icon: <Trash className="h-4 w-4" />,
      //     action: (rows) => console.log("Delete rows:", rows),
      //     variant: "destructive",
      //   },
      //   {
      //     label: "Duplicate",
      //     icon: <Copy className="h-4 w-4" />,
      //     action: (rows) => console.log("Duplicate rows:", rows),
      //     variant: "outline",
      //   },
      //   {
      //     label: "Export Selected",
      //     icon: <Download className="h-4 w-4" />,
      //     action: (rows) => console.log("Export rows:", rows),
      //     variant: "secondary",
      //   },
      // ]}
    />
  );
}

export default ContactsTable;