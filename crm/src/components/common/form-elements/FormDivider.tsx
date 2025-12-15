import { cn } from "@/lib/utils";
import React, { PropsWithChildren } from "react";

type FormDividerProps = PropsWithChildren<{
    className?: string
}>;

const FormDivider = React.forwardRef<HTMLDivElement, FormDividerProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("relative my-8", className)} {...props}>
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-gray-200" />
    </div>
    <div className="relative flex justify-center text-sm">
      <span className="bg-white px-2 text-gray-500">OR</span>
    </div>
  </div>
));
FormDivider.displayName = "FormDivider";

export default FormDivider;
