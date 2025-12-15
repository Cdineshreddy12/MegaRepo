import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import useRedirect from "@/hooks/useRedirect";
import NumberAnimation from "@/components/common/NumberAnimation";
import { cn } from "@/lib/utils";
import { GripHorizontal } from "lucide-react";

interface OverviewCardProps {
  target?: string;
  icon: React.ReactElement;
  label: string;
  value?: string | number;
  actionItem?: React.ReactElement;
  enableDragAndDrop?: boolean;
}

function OverviewCard({
  target,
  icon,
  label,
  value,
  actionItem,
  enableDragAndDrop = true,
}: OverviewCardProps) {
  const redirect = useRedirect();

  return (
    <Card
      className={cn(
        "shadow-sm hover:shadow-lg show-on-hover transition-shadow duration-200 ease-in-out h-full hover: cursor-pointer"
      )}
      onClick={() => {
        if (target) {
          redirect.to(target);
        }
      }}
    >
      {enableDragAndDrop && (
        <GripHorizontal
          className="drag-handle cursor-move absolute inset-0 mx-auto text-gray-400"
          onClick={(e) => e.stopPropagation()}
        />
      )}
      <CardHeader>
        <div className="flex justify-between">
          <div className="p-4 bg-gray-50 rounded-lg">{icon}</div>
          {actionItem ? actionItem : null}
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle>{label}</CardTitle>
        {typeof value === "number" ? (
          <NumberAnimation
            from={0}
            to={value}
            duration={500}
            className="text-[clamp(1rem,2.5vw,3rem)] text-wrap break-words mt-1.5"
          />
        ) : (
          <div className="text-[clamp(1rem,2.5vw,3rem)] text-wrap break-words mt-1.5">
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OverviewCard;
