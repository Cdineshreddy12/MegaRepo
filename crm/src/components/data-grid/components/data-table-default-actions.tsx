import { Row } from "@tanstack/react-table";
import { Pencil, Loader2, Delete, Eye } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { DataTableRowActions } from "@/components/data-grid";
import { PermissionGate } from "@/components/auth/PermissionGate";

export function DataTableDefaultActions<T>({
  row,
  name,
  onView,
  onEdit,
  onDelete,
  isPending = false,
  module,
  canView = true,
  canEdit = true,
  canDelete = true
}: {
  name: string;
  row: Row<T>;
  onView?: (data: T) => void;
  onEdit?: (data: T) => void;
  onDelete?: (data: T) => void;
  isPending?: boolean;
  module?: string;
  canView?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <DataTableRowActions<T>
        row={row}
        actions={[
          {
            label: "View",
            onClick: (data: T) => onView(data),
            icon: <Eye className="h-4 w-4" />,
            // shortcut: "⌘E"
          },
          {
            label: "Edit",
            onClick: (data: T) => onEdit(data),
            icon: <Pencil className="h-4 w-4" />,
            // shortcut: "⌘E"
          },
          {
            label: "Delete",
            onClick: () => {
              setIsDeleteDialogOpen(true);
            },
            icon: <Delete className="h-4 w-4" />,
            // shortcut: "⌘⌫"
          },
          // {
          //   label: "Labels",
          //   type: "radio",
          //   value: row.original.company,
          //   options: [
          //     { label: "Bug", value: "bug" },
          //     { label: "Feature", value: "feature" },
          //     { label: "Documentation", value: "documentation" }
          //   ],
          //   onChange: (value: string, data: Lead) => {
          //     console.log(`Changed ${data.email} label to ${value}`)
          //   }
          // }
        ]}
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        className="inset-0 bg-black bg-opacity-40 backdrop-blur-sm"
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the ${name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive hover:opacity-85"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(row.original)
              }}
              disabled={isPending}
            >
              {isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}