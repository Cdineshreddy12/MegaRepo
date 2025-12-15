import React from 'react'
import { Typography } from '../common/Typography'
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card'
import { Flex } from '../common/Page'
import { LucideIcon } from 'lucide-react'

export interface InfoCardProps {
  title: string
  description: string
  children?: React.ReactNode
  icon?: LucideIcon
  iconColor?: string
  footer?: React.ReactNode
}

export const InfoCard = ({ title, description, children, icon: Icon, iconColor = 'text-primary', footer }: InfoCardProps) => {
  return (
    <Card>
        <CardHeader>
        <Flex align="center" justify="between">
            <div>
              <Typography variant="small" className="text-muted-foreground">{title}</Typography>
              <Typography variant="h3" className="font-bold">{description}</Typography>
            </div>
            {Icon && <Icon className={`h-8 w-8 ${iconColor}`} />}
            </Flex>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
        {footer && <CardFooter className="flex bg-muted text-muted-foreground">{footer}</CardFooter>}
    </Card>
  )
}