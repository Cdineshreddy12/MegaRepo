import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import KanbanColumn from "./kanban-column";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import Typography from "@/components/common/Typography";
import { Column } from "./types";
import { Opportunity } from "@/services/api/opportunityService";
import { SortOption } from "@/lib/types";

interface KanbanBoardProps<T> {
  title: string;
  columns: Column[];
  columnKey: keyof T;
  records: T[];
  isLoading: boolean;
  renderColumnSummary?: (columnsData: T[]) => React.ReactNode;
  renderColumnRecord: (record: T) => React.ReactNode;
  onColumnChange: (change: {
    startId: string;
    endId: string;
    previousColumn: string;
  }) => void;
  activeRecord: T | null;
  setActiveRecord: (activeRecord: T | null) => void;
  sortFn: (a: T, b:T, sortOption: SortOption) => number
}

export default function KanbanBoard<T extends { id: string }>({
  title,
  isLoading,
  columns,
  records,
  renderColumnSummary,
  renderColumnRecord,
  columnKey,
  onColumnChange,
  activeRecord,
  setActiveRecord,
  sortFn,
}: KanbanBoardProps<T>) {
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeRecord = records.find((record) => record.id === active.id);

    if (activeRecord) {
      setActiveRecord(activeRecord);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Find the active record
    const activeRecord = records.find((record) => record.id === activeId);

    // If we're not dragging over a stage column, return
    if (!activeRecord || !overId.toString().startsWith("stage-")) return;

    const newStageId = overId.toString().replace("stage-", "");

    // If the record is already in this stage, return
    if (activeRecord[columnKey] === newStageId) return;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveRecord(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    // Find the active record
    const activeRecord = records.find((record) => record.id === activeId);

    // If we're not dragging over a stage column or the record doesn't exist, return
    if (!activeRecord || !overId.toString().startsWith("stage-")) {
      setActiveRecord(null);
      return;
    }

    const newStageId = overId.toString().replace("stage-", "");

    // If the record is already in this stage, return
    if (activeRecord[columnKey] === newStageId) {
      setActiveRecord(null);
      return;
    }

    // Save the stage change to the server
    onColumnChange({
      startId: activeRecord.id,
      endId: newStageId,
      previousColumn: activeRecord[columnKey] as string,
    });
    setActiveRecord(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-muted rounded-lg p-4">
            <Skeleton className="h-8 w-3/4 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-24 w-full" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <Typography variant="h3" className="mb-6">
        {title}
      </Typography>
      <ScrollArea>
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 pb-8 pt-4 h-full">
            {columns.map((column) => {
              // Get opportunities for this stage
              const columnRecords = records.filter(
                (record) => record[columnKey] === column.id
              ) as T[];
              // Check if this stage is the target for the active Record
              return (
                <KanbanColumn<T>
                  key={column?.id || column?._id}
                  column={column}
                  records={columnRecords}
                  renderColumnSummary={(columnData) =>
                    renderColumnSummary?.(columnData)
                  }
                  renderColumnRecord={(record) => renderColumnRecord(record)}
                  sortFn={(a, b, sortOption) => sortFn(a, b, sortOption)}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeRecord ? (
              <div
                style={{
                  transform: "rotate(3deg)",
                  transformOrigin: "0 0",
                }}
              >
                {renderColumnRecord(activeRecord)}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </>
  );
}
