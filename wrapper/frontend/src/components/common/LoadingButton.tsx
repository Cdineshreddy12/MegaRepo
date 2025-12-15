import { Button, ButtonProps } from '@/components/ui/button'
import { LucideIcon, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface IconButtonProps extends ButtonProps {
    startIcon?: LucideIcon
    endIcon?: LucideIcon
    startIconClassName?: string
    endIconClassName?: string
}

export function IconButton({ children, className, startIcon: StartIcon, endIcon: EndIcon, startIconClassName, endIconClassName, ...props }: IconButtonProps) {
    return (
        <Button
            className={cn(className, 'gap-2')}
            {...props}
        >
            {StartIcon && <StartIcon className={cn(startIconClassName, "w-4 h-4")} />}
            {children}
            {EndIcon && <EndIcon className={cn(endIconClassName, "w-4 h-4")} />}
        </Button>
    )
}

interface LoadingButtonProps extends IconButtonProps {
    isLoading: boolean
}

export  function LoadingButton({
    isLoading,
    variant = 'outline',
    children,
    startIcon,
    startIconClassName,
    ...props
}: LoadingButtonProps) {
    return (
        <IconButton
            variant={variant}
            {...props}
            disabled={isLoading}
            startIcon={isLoading ? RefreshCw : startIcon}
            startIconClassName={cn(
                startIconClassName,
                isLoading && "animate-spin"
            )}
        >
            {children}
        </IconButton>

    )
}

export default LoadingButton
