import { cn } from "@/lib/utils";
import React, { PropsWithChildren } from "react";

type FormActionsProps = PropsWithChildren<{
    className?: string
}>;

const ActionType = React.forwardRef<HTMLDivElement, FormActionsProps>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex justify-end space-x-4", className)} {...props} />
  ));

ActionType.displayName = "ActionType";

export default ActionType;
