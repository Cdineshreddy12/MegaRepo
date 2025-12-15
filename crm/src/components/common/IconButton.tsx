import React from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface IconButtonProps extends ButtonProps {
  icon: React.ElementType;
  position?: "start" | "end";
  onClick: () => void;
  children?: React.ReactNode;
  loading?: boolean;
}

function IconButton({
  icon: IconComponent,
  position = "start",
  children,
  variant,
  onClick,
  loading = false,
  disabled,
  ...restProps
}: IconButtonProps) {

  return (
    <Button 
      onClick={onClick} 
      variant={variant} 
      disabled={disabled || loading}
      {...restProps}
    >
      {position === "start" && (
        loading ? (
          <Loader2 size={20} className="mr-1 animate-spin" />
        ) : (
          <IconComponent size={20} className="mr-1" />
        )
      )}
      {children}
      {position === "end" && (
        loading ? (
          <Loader2 size={20} className="ml-1 animate-spin" />
        ) : (
          <IconComponent size={20} className="ml-1" />
        )
      )}
    </Button>
  );
}

export default IconButton;