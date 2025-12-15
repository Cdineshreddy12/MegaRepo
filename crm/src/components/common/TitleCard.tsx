import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface TitleCardProps {
  title?: string
  description?: string
  className?: string,
  containerClassName?: string,
  actionBar?: React.ReactNode
}

function TitleCard({
  children,
  title,
  description,
  className,
  containerClassName,
  actionBar,
}: React.PropsWithChildren<TitleCardProps>) {
  return (
    <Card className={cn("shadow-sm", containerClassName)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {title ? <CardTitle>{title}</CardTitle> : null}
            {description ? <CardDescription>{description}</CardDescription> : null}
          </div>
          {actionBar ? actionBar : null}
        </div>
      </CardHeader>
      <CardContent className={className}>{children}</CardContent>
    </Card>
  );
}

export default TitleCard;
