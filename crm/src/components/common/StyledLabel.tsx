import React from "react";
import Typography from "./Typography";
import { cn } from "@/lib/utils";

export type StyledLabelProps = {
  prefix: string;
  connector?: string;
  suffix: string;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

const StyledLabel: React.FC<StyledLabelProps> = ({ prefix, connector = "_", suffix, size = 'sm' }) => {
  return (
    <div className="font-sans flex items-baseline space-x-1 text-nowrap max-w-sm">
      <Typography variant="caption" className={cn("text-primary font-medium", sizes[size] || sizes.sm)}>{prefix}</Typography>
      <Typography variant="caption" className={cn(sizes[size] || sizes.sm)}>{connector}</Typography>
      <Typography variant="caption" className={cn("truncate", sizes[size] || sizes.sm)}>{suffix}</Typography>
    </div>
  );
};

export default StyledLabel;
