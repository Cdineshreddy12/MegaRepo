import React from "react";
import { Badge } from "@/components/ui/badge";
import {cn} from '@/lib/utils'
import { ActionType, EntityType } from '@/types/common'
import { ACTION, ENTITY, LeadStage  } from "@/constants"

const variants = {
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  primary: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  secondary: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  success: "bg-green-100 text-green-800 hover:bg-green-200",
  active: "bg-green-100 text-green-800 hover:bg-green-200",
  warning: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  danger: "bg-red-100 text-red-800 hover:bg-red-200",
  destructive:
    "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
serious: "bg-orange-100 text-orange-800 hover:bg-orange-200",
} as const;

const entityVariants = {
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  [ENTITY.ACCOUNT]: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  [ENTITY.LEAD]: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  [ENTITY.CONTACT]: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  [ENTITY.OPPORTUNITY]: "bg-green-100 text-green-800 hover:bg-green-200",
  [ENTITY.QUOTATION]: "bg-green-100 text-green-800 hover:bg-green-200",
};

const leadStageVariants = {
  default: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  [LeadStage.QUALIFICATION]: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  [LeadStage.DISCOVERY]: "bg-purple-100 text-purple-800 hover:bg-purple-200",
  [LeadStage.PROPOSAL]: "bg-green-100 text-green-800 hover:bg-green-200",
};

export type Status = keyof typeof variants;

interface StatusBadgeProps {
  children: React.ReactNode;
  status?: Status;
  className?:string

}

function StatusBadge({ children, status = "default", className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(variants[status?.toLowerCase() as Status] || variants.default, className)}
    >
      {children}
    </Badge>
  );
}

interface ActionBadgeProps extends Omit<StatusBadgeProps, 'status'>{
  action: ActionType;
}

const ACTION_STATUS_MAP: Record<ActionType, Status> = {
  [ACTION.CREATE]: 'success',
  [ACTION.MODIFY]: 'warning',
  [ACTION.DELETE]: 'danger',
}
export function ActionBadge({ children, action, className }: ActionBadgeProps) {
  return <StatusBadge status={ACTION_STATUS_MAP[action]} className={className}>{children}</StatusBadge>
}

interface EntityBadgeProps extends Omit<StatusBadgeProps, 'status'>{
  entityType: EntityType;
}

export function EntityBadge({ children, entityType, className }: EntityBadgeProps) {
return  <Badge
  className={cn(entityVariants[entityType] || entityVariants.default, className)}
>
  {children}
</Badge>
}

interface LeadStageBadgeProps extends Omit<StatusBadgeProps, 'status'>{
  status: LeadStatus;
}

export function LeadStageBadge({ children, status, className }: LeadStageBadgeProps) {
  return  <Badge
  className={cn(leadStageVariants[status] || leadStageVariants.default, className)}
>
  {children}
</Badge>
}

export default StatusBadge;
