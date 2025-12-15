import { Skeleton } from "@/components/ui/skeleton";
import {
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Table,
} from "@/components/ui/table";
import { columns } from "@/pages/tickets/table/columns";

function DataTableSkeleton({ loadingRows }: { loadingRows: number }) {
  return (
    <div className="space-y-4 p-4 rounded-md">
      {/* Top bar: search + controls */}
      <div className="flex items-center justify-between bg-background p-1">
        <Skeleton className="h-10 w-[300px] rounded-md" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-20 rounded-md" />
        </div>
      </div>

      {/* Table Skeleton */}
      <div className="rounded-md border bg-background p-2">
        <Table>
          <TableHeader>
            <TableRow>
              {Array.from({ length: columns.length }).map((_, index) => (
                <TableHead key={index}>
                  <Skeleton className="h-4 w-[80px]" />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: loadingRows }).map((_, rowIndex) => (
              <TableRow key={rowIndex} className="h-20">
                {/* Checkbox */}
                <TableCell className="w-[40px]">
                  <Skeleton className="h-4 w-4 rounded-sm" />
                </TableCell>

                {/* Account (icon + name) */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-5 w-5 rounded-md" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
                </TableCell>

                {/* Created By (avatar + name + email) */}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-[100px]" />
                      <Skeleton className="h-3 w-[140px]" />
                    </div>
                  </div>
                </TableCell>

                {/* Phone (icon + number) */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-md" />
                    <Skeleton className="h-3 w-[90px]" />
                  </div>
                </TableCell>

                {/* Industry */}
                <TableCell>
                  <Skeleton className="h-3 w-[100px]" />
                </TableCell>

                {/* Type */}
                <TableCell>
                  <Skeleton className="h-3 w-[80px]" />
                </TableCell>

                {/* Segment */}
                <TableCell>
                  <Skeleton className="h-3 w-[80px]" />
                </TableCell>

                {/* Employees (icon + count) */}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-md" />
                    <Skeleton className="h-3 w-[30px]" />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Bottom bar: item count + pagination */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-[100px]" />
        <Skeleton className="h-6 w-[200px]" />
      </div>
    </div>
  );
}

export default DataTableSkeleton;
