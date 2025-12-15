import Typography from "@/components/common/Typography";
import type { Table } from "@tanstack/react-table";

interface DataTableRowSelectionSummaryProps<TData> {
  table: Table<TData>;
  renderRowSelectionSummary?: (data: TData[]) => JSX.Element;
  title?: string;
}

export function DataTableRowSelectionSummary<TData>({
  table,
  renderRowSelectionSummary,
  title = "Selected Rows Summary",
}: DataTableRowSelectionSummaryProps<TData>) {
  const selectedData = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  const selectedRowCount = table.getSelectedRowModel().rows.length;
  if (selectedRowCount === 0) {
    return null; // Don't render anything if no rows are selected
  } 
  return (
      <div className="flex flex-col gap-2">
        <Typography variant="h6">
          {title}
        </Typography>
        {renderRowSelectionSummary && renderRowSelectionSummary(selectedData)}
        </div>
  );
}
