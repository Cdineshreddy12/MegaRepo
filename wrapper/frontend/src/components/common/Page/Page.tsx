import React, { PropsWithChildren, ReactNode } from "react";
import { Typography } from "@/components/common/Typography";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  hideBackButton = false,
}: {
  title: string | ReactNode;
  description?: string;
  actions?: ReactNode[];
  hideBackButton?: boolean;
}) {
  return (
    <div className="pb-4 flex justify-between items-center">
      <div className="flex gap-4 items-center">
        {!hideBackButton ? (
          <Button variant="outline" onClick={() => {}}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
          </Button>
        ) : null}
        <div className="flex flex-col gap-2 w-full">
          <Typography variant="h3">{title}</Typography>
          {description ? (
            <Typography variant="body" className="text-muted-foreground leading-none text-ellipsis">
              {description}
            </Typography>
          ) : null}
        </div>
      </div>
      <div className="flex gap-3">{React.Children.toArray(actions)}</div>
    </div>
  );
}
type PageProps = PropsWithChildren<{
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  removeBackground?: boolean;
}>;

export function Page({
  header,
  children,
  footer,
  className,
  removeBackground = false,
}: PageProps) {
  return (
    <div className="w-full">
      <div className="rounded-lg overflow-hidden">
        {/* Header */}
        {header ? <div className="px-4">{header}</div> : null}
        {/* Content */}
        <div
          className={cn(
            "space-y-8",
            !removeBackground && "bg-background mx-4 p-4",
            className
          )}
        >
          {children}
        </div>
        {footer}
      </div>
    </div>
  );
}

export function PageFooter({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <footer className="m-4 p-2 bg-background/50 bg-clip-padding backdrop-filter backdrop-blur-sm bg-opacity-10">
      {children}
    </footer>
  );
}
export default Page;
