import { cn } from "@/lib/utils";
import React from "react";

type TypographyProps = {
  variant?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    | "body"
    | "caption"
    | "overline"
    | "overline-normal-case";  // Added a new variant for normal case overline
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
  [key: string]: any;
};

// Map of variants to their corresponding element and styles
const variantMap = {
  h1: {
    element: "h1",
    className: "text-4xl font-bold text-foreground",
  },
  h2: {
    element: "h2",
    className: "text-3xl font-bold text-foreground",
  },
  h3: {
    element: "h3",
    className: "text-2xl font-bold text-foreground",
  },
  h4: {
    element: "h4",
    className: "text-xl font-bold text-foreground",
  },
  h5: {
    element: "h5",
    className: "text-lg font-bold text-foreground",
  },
  h6: {
    element: "h6",
    className: "text-base font-bold text-foreground",
  },
  body: {
    element: "p",
    className: "text-base text-foreground",
  },
  caption: {
    element: "span",
    className: "text-sm text-muted-foreground",
  },
  overline: {
    element: "span",
    className: "text-xs tracking-wider text-foreground", // Removed uppercase
  },
  "overline-normal-case": {
    element: "span",
    className: "text-xs tracking-wider text-foreground", // Same as overline but without uppercase
  },
};

const Typography = ({
  variant = "body",
  children,
  className,
  as,
  ...props
}: TypographyProps) => {
  // Safeguard: If the variant doesn't exist in the map, use 'body' as fallback
  const variantConfig = variantMap[variant] || variantMap["body"];
  
  // Get the mapped element and styles for the variant
  const { element: Element, className: variantClassName } = variantConfig;
  
  // Use the provided 'as' prop or the default element for the variant
  const Tag = as || Element;

  return (
    <Tag className={cn(variantClassName, className)} {...props}>
      {children}
    </Tag>
  );
};

export default Typography;