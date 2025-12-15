import {
  useDeleteDropdownOption,
  useDropdowns,
} from "@/queries/DropdownQueries";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "@/hooks/useToast";
import { groupBy } from "lodash";
import Typography from "@/components/common/Typography";
import { dropdownSet, configContent } from "./DropdownConfigurator.content";
import { DropdownConfig } from "./types";
import { useState } from "react";
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
import EmptyState from "@/assets/empty.svg?react";

function DropdownResults({
  selectedConfig,
}: {
  selectedConfig: DropdownConfig;
}) {
  const { data: dropdownOptionsData, isError, isPending } = useDropdowns();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [markDelete, setMarkDelete] = useState<{
    value: string;
    _id: string;
    label: string;
  } | null>(null);

  const dropdownOptions = isPending || isError ? [] : dropdownOptionsData;
  const dropdownOptionsGroupByCategory = groupBy(dropdownOptions, "category");

  const configOptions: DropdownConfig[] = Object.keys(
    dropdownOptionsGroupByCategory
  ).map((category) => {
    return {
      ...(dropdownSet.has(category)
        ? configContent[category]
        : { name: category, description: "" }),
      items: dropdownOptionsGroupByCategory[category],
    } as DropdownConfig;
  });

  const currentConfig = configOptions.find((c) => c.id === selectedConfig.id);

  const dropdownDeleteMutation = useDeleteDropdownOption();
  const deleteItem = (id: string) => {
    if (!id) return;
    dropdownDeleteMutation.mutate(id, {
      onSuccess: () => {
        toast({
          title: "Item deleted",
          description: `Item has been removed from ${currentConfig?.name}`,
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
        });
      },
    });
  };

  return (
    <div className="block">
      <div className="bg-white mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          {selectedConfig?.name}
        </h2>
        <p className="text-sm text-gray-400">{selectedConfig?.description}</p>
      </div>
      <div className="bg-white rounded-lg border border-gray-200">
        <ul className="divide-y divide-gray-200">
          {!currentConfig?.items && (
            <li className="p-4 flex flex-col justify-center items-center gap-4">
              <div className="w-[250px]">
                <EmptyState className="w-full h-full" />
              </div>
              <Typography variant="h4" className="text-gray-500">
                No Options available, you can add one
              </Typography>
            </li>
          )}
          {currentConfig?.items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <span className="text-gray-900">{item.label}</span>
                  <span className="text-sm text-gray-500">({item.value})</span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded-full transition-colors duration-150"
                  title="Delete item"
                  onClick={() => {
                    // @ts-expect-error mongo id
                    setMarkDelete(item);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {`This action cannot be undone. This will permanently delete the ${markDelete?.label} from ${currentConfig?.name}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => markDelete && deleteItem(markDelete?._id)}
              disabled={dropdownDeleteMutation.isPending}
              className="bg-destructive hover:bg-destructive hover:opacity-65"
            >
              {dropdownDeleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default DropdownResults;
