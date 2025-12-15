import { Typography } from "@/components/common/Typography";
import { IconButton, LoadingButton } from "@/components/common/LoadingButton";
import { Section, SectionAction } from "@/components/common/Page/Section";
import { Package, LucideIcon } from "lucide-react";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Reusable EmptyState component for displaying empty states across the application
 * Built on top of the Section component for consistent styling and behavior
 * 
 * @example
 * // Basic usage
 * <EmptyState 
 *   title="No data found" 
 *   description="Try refreshing the page" 
 * />
 * 
 * @example
 * // With custom icon and action
 * <EmptyState 
 *   icon={Users}
 *   title="No users found"
 *   description="Add your first user to get started"
 *   action={{
 *     label: "Add User",
 *     onClick: handleAddUser,
 *     icon: Plus,
 *     variant: "default"
 *   }}
 * />
 * 
 * @example
 * // Without card wrapper
 * <EmptyState 
 *   showCard={false}
 *   title="Loading..."
 *   description="Please wait"
 * />
 * 
 * @example
 * // With custom styling variant
 * <EmptyState 
 *   title="No data"
 *   description="Get started by adding content"
 *   variant="minimal"
 *   action={{
 *     label: "Add Content",
 *     onClick: handleAdd
 *   }}
 * />
 */

interface EmptyStateAction {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
    icon?: LucideIcon;
}

interface EmptyStateProps {
    // Icon configuration
    icon?: LucideIcon;
    iconSize?: "sm" | "md" | "lg";
    iconClassName?: string;
    
    // Content configuration
    title?: string;
    description?: string;
    
    // Action configuration
    action?: EmptyStateAction;
    
    // Loading state (for backward compatibility)
    isLoading?: boolean;
    onRefresh?: () => void;
    
    // Layout configuration
    className?: string;
    showCard?: boolean;
    
    // Section styling variants
    variant?: "default" | "outlined" | "filled" | "ghost" | "card" | "panel" | "banner" | "minimal";
    size?: "sm" | "md" | "lg";
    
    // Custom content
    children?: ReactNode;
}

const iconSizes = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
};

const iconContainerSizes = {
    sm: "p-4",
    md: "p-6", 
    lg: "p-8"
};

export function EmptyState({
    icon: Icon = Package,
    iconSize = "lg",
    iconClassName = "text-muted-foreground",
    title = "No Data Available",
    description = "There's nothing to show here yet.",
    action,
    isLoading = false,
    onRefresh,
    className = "",
    showCard = true,
    variant = "default",
    size = "md",
    children
}: EmptyStateProps) {
    // Convert EmptyStateAction to SectionAction
    const sectionAction: SectionAction | undefined = action ? {
        label: action.label,
        onClick: action.onClick,
        variant: action.variant,
        icon: action.icon,
        loading: isLoading
    } : undefined;

    // Convert refresh action to SectionAction if no primary action
    const refreshAction: SectionAction | undefined = onRefresh && !action ? {
        label: "Check Again",
        onClick: onRefresh,
        variant: "outline",
        loading: isLoading
    } : undefined;

    const headerActions = [sectionAction, refreshAction].filter(Boolean) as SectionAction[];

    const content = (
        <div className="text-center space-y-4">
            <div className="flex justify-center">
                <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-full blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                    <div className="relative bg-background/80 backdrop-blur-sm rounded-full border border-border/50 group-hover:border-primary/20 transition-all duration-300 hover:scale-105">
                        <div className={iconContainerSizes[iconSize]}>
                            <Icon className={`${iconSizes[iconSize]} ${iconClassName} group-hover:text-primary transition-colors duration-300`} />
                        </div>
                    </div>
                </div>
            </div>
            <div className="space-y-2">
                <Typography variant="h4" className="font-semibold text-foreground">{title}</Typography>
                <Typography variant="muted" className="text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</Typography>
            </div>
            
            {children}
        </div>
    );

    if (!showCard) {
        return (
            <div className={cn(className, "py-6")}>
                {content}
                {/* Render actions outside of Section when showCard is false */}
                {(sectionAction || refreshAction) && (
                    <div className="flex justify-center pt-6">
                        {sectionAction && (
                            <IconButton
                                onClick={sectionAction.onClick}
                                variant={sectionAction.variant || "default"}
                                disabled={Boolean(sectionAction.disabled) || Boolean(sectionAction.loading)}
                                startIcon={sectionAction.icon as LucideIcon}
                                className="shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                {sectionAction.label}
                            </IconButton>
                        )}
                        {refreshAction && !sectionAction && (
                            <LoadingButton
                                isLoading={Boolean(refreshAction.loading)}
                                variant={refreshAction.variant || "outline"}
                                onClick={refreshAction.onClick}
                                className="shadow-sm hover:shadow-md transition-all duration-200"
                            >
                                {refreshAction.label}
                            </LoadingButton>
                        )}
                    </div>
                )}
            </div>
        );
    }

    return (
        <Section
            title=""
            description=""
            variant={variant}
            size={size}
            className={cn(className, "py-8")}
            headerActions={headerActions}
            showDivider={false}
        >
            <div className="py-4">
                {content}
            </div>
        </Section>
    );
}
