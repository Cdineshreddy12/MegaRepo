import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { useParams } from "react-router-dom";
import { useActivityLog } from "@/queries/ActivityLogQueries";
import Loader from "@/components/common/Loader";
import { formatName } from "@/utils/format";
import { ActionBadge } from "@/components/common/StatusBadge";
import { ActionType } from "@/types/common";
import UserCard from "@/components/common/UserCard";

type ActivityLog = {
  _id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
};


export const ActivityLogPreview: React.FC = () => {
  const { activityLogId } = useParams();
  
  // Safety check: if activityLogId is invalid, show loading
  if (!activityLogId || activityLogId === '' || activityLogId === 'undefined' || activityLogId === 'null') {
    return <Loader />;
  }
  
  const { data, isPending } = useActivityLog(activityLogId as string);

  const log = (isPending || !data ? {} : data)   as ActivityLog;
  if (isPending) return <Loader />;
  
  const fullName = formatName(
    log?.user
      ? { firstName: log.user.firstName || "", lastName: log.user.lastName || "" }
      : null
  )?.trim() ??
    "Unknown User";

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg">
          <span className="font-medium">{fullName}</span> performed{" "}
          <ActionBadge action={log.action as ActionType}>{log.action}</ActionBadge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
        </p>
      </CardHeader>

      <CardContent className="space-y-2">
        <div className="text-sm">
          <strong>Entity:</strong> {log.entityType} (<code>{log.entityId}</code>
          )
        </div>

        <Separator />

        <div>
          <p className="text-sm font-semibold mb-1">Details</p>
          <ScrollArea className="h-48 rounded-md border bg-muted text-muted-foreground text-xs">
            <div className="p-2">
              <pre className="whitespace-pre-wrap break-words">
                {JSON.stringify(log.details, null, 2)}
              </pre>
            </div>
          </ScrollArea>
        </div>
      </CardContent>

      <CardFooter className="text-xs text-muted-foreground justify-between">
        <span>User ID: {log.userId}</span>

        {log.user && <UserCard user={log.user} showRole/>}
      </CardFooter>
    </Card>
  );
};
