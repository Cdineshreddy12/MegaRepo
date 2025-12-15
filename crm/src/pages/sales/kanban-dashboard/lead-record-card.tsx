import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Star, User } from "lucide-react";
import { Lead } from "@/services/api/leadService";
import { formatDistanceToNow } from "date-fns";
import { formatName } from "@/utils/format";
import { toPrettyString } from "@/utils/common";
import { useLeadKanbanStore } from "@/store/kanban-store";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import ColorBadge from "@/components/ColorBadge";
import useRedirect from "@/hooks/useRedirect";

interface ProjectCardProps {
  lead: Lead;
}

export default function LeadRecordCard({ lead }: ProjectCardProps) {
  const redirect = useRedirect()
  const { activeRecord: activeLead } = useLeadKanbanStore();
  const leadId = lead?.id || lead?._id
  const activeLeadId = activeLead?.id || activeLead?._id

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: leadId,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = activeLeadId === leadId ;

  return (
    <Card
      key={leadId}
      ref={setNodeRef}
      style={style}
      className={cn(
      "cursor-grab relative p-4",
      isDragging && "opacity-50 z-20",
      isActive && "ring-2 ring-primary z-20"
      )}
      {...attributes}
      {...listeners}
      onClick={() => redirect.to(`/leads/${leadId}/view`)}
    >
      <CardContent className="p-0 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
        <h3 className="font-semibold text-lg leading-tight">
          {lead?.product}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{lead?.companyName}</p>
        </div>
      </div>

      {/* Rating and Time */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
        <Star className="w-4 h-4 fill-muted text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{lead?.score}</span>
        </div>
        <div className="flex items-center gap-1">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(lead?.createdAt), {
          addSuffix: true,
          })}
        </span>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <User className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-foreground">{formatName(lead)}</span>
        </div>
        <ColorBadge value={lead?.status}>
        {toPrettyString(lead?.status || "")}
        </ColorBadge>
      </div>

      {/* Source */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
        <span className="font-medium">Source:</span> {lead?.source}
        </p>
      </div>
      </CardContent>
    </Card>
  );
}
