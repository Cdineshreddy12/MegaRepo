import Typography from "@/components/common/Typography";
import { cn } from "@/lib/utils";
import React, { PropsWithChildren } from "react";

type FormGroupProps = PropsWithChildren<{
  className?: string;
  title?: string;
}>;
const FormGroup = React.forwardRef<HTMLDivElement, FormGroupProps>(
  ({ className, children, title, ...props }, ref) => (
    <div ref={ref} {...props} className="grid grid-cols-1">
      {title ? (
        <Typography variant="h6" className="mb-4 text-gray-600">
          {title}
        </Typography>
      ) : null}
      <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-6", className)}>
        {children}
      </div>
    </div>
  )
);
FormGroup.displayName = "FormGroup";

export default FormGroup;
