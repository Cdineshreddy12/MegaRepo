import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ChevronDown, ChevronUp, LucideIcon } from "lucide-react";
import { LoadingButton, IconButton } from "@/components/common/LoadingButton";

// Types for the improved Section component
export interface SectionAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
  icon?: LucideIcon;
  disabled?: boolean;
  loading?: boolean;
}

export interface SectionBadge {
  text: string;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export interface SectionProps {
  // Content
  title?: string;
  description?: string;
  children?: React.ReactNode;
  
  // Optional sections
  footer?: React.ReactNode;
  headerActions?: SectionAction[];
  badges?: SectionBadge[];
  
  // State management
  loading?: boolean;
  error?: string;
  collapsed?: boolean;
  collapsible?: boolean;
  onToggleCollapse?: () => void;
  
  // Styling
  className?: string;
  contentClassName?: string;
  footerClassName?: string;
  headerClassName?: string;
  
  // Layout options
  variant?: "default" | "outlined" | "filled" | "ghost" | "card" | "panel" | "banner" | "minimal";
  size?: "sm" | "md" | "lg";
  spacing?: "none" | "sm" | "md" | "lg";
  
  // Content behavior
  showDivider?: boolean;
  scrollable?: boolean;
  maxHeight?: string | number;
  
  // Accessibility
  id?: string;
  "aria-label"?: string;
  "aria-describedby"?: string;
}

/**
 * Enhanced Section Component
 * 
 * A flexible, feature-rich section component with support for loading states,
 * error handling, collapsible content, actions, badges, and clean styling variants.
 * 
 * @example
 * // Basic usage
 * <Section title="Dashboard" description="Overview of your data">
 *   <div>Content here</div>
 * </Section>
 * 
 * @example
 * // Without title (actions only)
 * <Section 
 *   headerActions={[
 *     { label: "Export", onClick: handleExport, icon: Download },
 *     { label: "Refresh", onClick: handleRefresh, icon: RefreshCw }
 *   ]}
 * >
 *   <AnalyticsChart />
 * </Section>
 * 
 * @example
 * // With actions and badges
 * <Section 
 *   title="Analytics" 
 *   badges={[{ text: "Live", variant: "destructive" }]}
 *   headerActions={[
 *     { label: "Export", onClick: handleExport, icon: Download },
 *     { label: "Refresh", onClick: handleRefresh, icon: RefreshCw }
 *   ]}
 * >
 *   <AnalyticsChart />
 * </Section>
 * 
 * @example
 * // Collapsible section with internal state (simple)
 * <Section 
 *   title="Settings"
 *   collapsible
 * >
 *   <SettingsForm />
 * </Section>
 * 
 * @example
 * // Collapsible section with external state (advanced)
 * <Section 
 *   title="Settings"
 *   collapsible
 *   collapsed={isCollapsed}
 *   onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
 *   loading={isLoading}
 * >
 *   <SettingsForm />
 * </Section>
 * 
 * @example
 * // Headerless section (no header rendered)
 * <Section variant="default">
 *   <div>Content without any header</div>
 * </Section>
 * 
 * @example
 * // Clean styling variants (no borders, no shadows)
 * <Section title="Default Card" variant="default">
 *   <div>Clean card styling with background</div>
 * </Section>
 * 
 * <Section title="Ghost Style" variant="ghost">
 *   <div>Transparent background, no borders or shadows</div>
 * </Section>
 * 
 * <Section title="Minimal Style" variant="minimal">
 *   <div>Completely clean - no background, borders, or shadows</div>
 * </Section>
 * 
 * <Section title="Panel Style" variant="panel">
 *   <div>Subtle panel styling for secondary content</div>
 * </Section>
 * 
 * <Section title="Banner Style" variant="banner">
 *   <div>Gradient background for announcements</div>
 * </Section>
 */
export function Section({
  // Content
  title,
  description,
  children,
  
  // Optional sections
  footer,
  headerActions = [],
  badges = [],
  
  // State management
  loading = false,
  error,
  collapsed = false,
  collapsible = false,
  onToggleCollapse,
  
  // Styling
  className,
  contentClassName,
  footerClassName,
  headerClassName,
  
  // Layout options
  variant = "default",
  size = "md",
  spacing = "md",
  showDivider = false,
  scrollable = false,
  maxHeight,
  
  // Accessibility
  id,
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: SectionProps) {
  // Internal state management for collapsed state
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  
  // Use external state if provided, otherwise use internal state
  const isCollapsed = collapsed !== undefined ? collapsed : internalCollapsed;
  const handleToggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));
  
  // Simplified variant styles (no borders, no shadows)
  const variantStyles = {
    default: "rounded-xl bg-card text-card-foreground",
    outlined: "rounded-xl bg-transparent text-foreground",
    filled: "rounded-xl bg-muted/50 text-foreground",
    ghost: "rounded-lg bg-transparent text-foreground border-0 shadow-none",
    card: "rounded-xl bg-card text-card-foreground",
    panel: "rounded-lg bg-card/50 text-card-foreground",
    banner: "rounded-lg bg-gradient-to-r from-primary/5 to-secondary/5 text-foreground",
    minimal: "bg-transparent text-foreground shadow-none",
  };

  // Size styles
  const sizeStyles = {
    sm: {
      card: "p-0",
      header: "p-4",
      content: "p-4",
      footer: "p-4",
    },
    md: {
      card: "p-0",
      header: "p-6",
      content: "p-6",
      footer: "p-6",
    },
    lg: {
      card: "p-0",
      header: "p-8",
      content: "p-8",
      footer: "p-8",
    },
  };

  // Spacing styles
  const spacingStyles = {
    none: "",
    sm: "space-y-2",
    md: "space-y-4",
    lg: "space-y-6",
  };

  const currentSizeStyles = sizeStyles[size];
  
  // Determine if header should be rendered
  const shouldRenderHeader = title || description || headerActions.length > 0 || badges.length > 0 || collapsible;

  return (
    <Card 
      className={cn(
        variantStyles[variant],
        currentSizeStyles.card,
        className
      )}
      id={id}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    >
      {shouldRenderHeader && (
        <CardHeader 
          className={cn(
            currentSizeStyles.header,
            headerClassName,
            spacingStyles[spacing]
          )}
        >
          <div className="flex flex-col lg:flex-row items-start justify-between space-y-3 lg:space-y-0 lg:gap-3">
            <div className="flex-1 min-w-0">
              {(title || badges.length > 0) && (
                <div className="flex items-center gap-2 mb-1">
                  {title && (
                    <CardTitle>
                      {title}
                    </CardTitle>
                  )}
                  {badges.map((badge, index) => (
                    <Badge 
                      key={index} 
                      variant={badge.variant || "default"}
                    >
                      {badge.text}
                    </Badge>
                  ))}
                </div>
              )}
              {description && (
                <CardDescription>
                  {description}
                </CardDescription>
              )}
            </div>
            
            <div className="flex items-center gap-2 flex-wrap lg:ml-4">
              {headerActions.map((action, index) => (
                <LoadingButton
                  key={index}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  isLoading={action.loading || false}
                  startIcon={action.icon}
                >
                  {action.label}
                </LoadingButton>
              ))}
              
              {collapsible && (
                <IconButton
                  variant="ghost"
                  size="sm"
                  onClick={handleToggleCollapse}
                  aria-label={isCollapsed ? "Expand section" : "Collapse section"}
                  startIcon={isCollapsed ? ChevronDown : ChevronUp}
                />
              )}
            </div>
          </div>
        </CardHeader>
      )}
      {!isCollapsed && (
        <>
          {showDivider && shouldRenderHeader && <div className="border-t" />}
          
          <CardContent 
            className={cn(
              'grid grid-cols-1',
              currentSizeStyles.content,
              contentClassName,
              scrollable && "overflow-auto",
              spacingStyles[spacing]
            )}
            style={maxHeight ? { maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight } : undefined}
          >
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">{error}</span>
              </div>
            ) : (
              children
            )}
          </CardContent>

          {footer && (
            <>
              {showDivider && shouldRenderHeader && <div className="border-t" />}
              <CardFooter 
                className={cn(
                  currentSizeStyles.footer,
                  footerClassName
                )}
              >
                {footer}
              </CardFooter>
            </>
          )}
        </>
      )}
    </Card>
  );
}

export default Section;
