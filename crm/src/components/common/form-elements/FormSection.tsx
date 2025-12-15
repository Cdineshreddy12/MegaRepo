import { cn } from "@/lib/utils";
import React, { PropsWithChildren } from "react";
import Typography from "@/components/common/Typography";

type FormSectionProps = PropsWithChildren<{
  className?: string;
  title?: string;
  description?: string;
  required?: boolean;
  isError?: boolean;
}>;

const FormSection = React.forwardRef<HTMLDivElement, FormSectionProps>(
  (
    { className, children, title, description, required, isError, ...props },
    ref
  ) => (
    <div ref={ref} className={cn("space-y-4", className)} {...props}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <div className="flex items-center gap-2">
              <Typography variant="h6" className="min-w-fit text-gray-500">
                {required && <span className="text-red-500 mr-1">*</span>}

                {title}
              </Typography>
              <hr className="w-full border-t-2 border-slate-200 mt-1" />
            </div>
          )}
          {description && (
            <Typography
              variant="caption"
              className={cn("text-gray-500", isError && "text-red-500")}
            >
              {description}
            </Typography>
          )}
        </div>
      )}
      {children}
    </div>
  )
);

FormSection.displayName = "FormSection";

export default FormSection;
