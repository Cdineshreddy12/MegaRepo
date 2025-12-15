import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { formatDistanceToNow } from "date-fns";
import { Building2, Calendar, User } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toPrettyString } from "@/utils/common";
import { formatCurrency, formatName } from "@/utils/format";
import { Opportunity } from "@/services/api/opportunityService";
import { Account } from "@/services/api/accountService";
import { Contact } from "@/services/api/contactService";
import { useOpportunityKanbanStore } from "@/store/kanban-store";
import useRedirect from "@/hooks/useRedirect";

interface OpportunityCardProps {
  opportunity: Opportunity;
}

export default function OpportunityCard({ opportunity }: OpportunityCardProps) {
  const redirect = useRedirect();
  const { activeRecord: activeOpportunity } = useOpportunityKanbanStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: opportunity?.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isActive = activeOpportunity?.id === opportunity?.id;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab relative ",
        isDragging && "opacity-50 z-20",
        isActive && "ring-2 ring-primary z-20 "
      )}
      {...attributes}
      {...listeners}
      onClick={() =>
        redirect.to(
          `/opportunities/${opportunity?.id || opportunity?._id}/view`
        )
      }
    >
      <CardContent className="p-3 pl-8">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm line-clamp-1">
              {toPrettyString(opportunity?.name)}
            </h4>
            <Badge variant="outline" className="ml-2 whitespace-nowrap">
              {formatCurrency(opportunity?.revenue)}
            </Badge>
          </div>

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              <span className="line-clamp-1">
                {(opportunity?.accountId as unknown as Account)?.companyName}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <User className="h-3 w-3" />
              <span className="line-clamp-1">
                {typeof opportunity?.primaryContactId === "object"
                  ? formatName(opportunity?.primaryContactId as Contact)
                  : ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(opportunity?.createdAt), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
