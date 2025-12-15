import { Badge } from "@/components/ui";
import { GlareCard } from "@/components/ui/glare-card";
import { getApplicationIcon, getThemeColors, getStatusColors } from "./applicationUtils";
import { Application } from "@/types/application";
import { ExternalLink, ChevronRight } from "lucide-react";
import { memo } from "react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { cn } from "@/lib/utils";

// Utility function to construct application URLs
const getApplicationUrl = (application: Application): string => {
  // Prefer the base URL sent by the backend (supports multiple key casings)
  const apiBaseUrl =
    application.baseUrl ||
    (application as any).base_url ||
    (application as any).baseurl;

  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  // Construct URL based on appCode - customize as needed
  const baseDomain = window.location.origin; // Use current domain as base
  const urlPatterns: Record<string, string> = {
    affiliateConnect: `${baseDomain}/affiliate`,
    crm: `https://crm.zopkit.com`,
    hr: `${baseDomain}/hr`,
    // Add more app codes and their corresponding URLs here
  };

  return urlPatterns[application.appCode] || `${baseDomain}/apps/${application.appCode}`;
};

interface ApplicationCardProps {
  application: Application;
  onView: (app: Application) => void;
}

export const ApplicationCard = memo(function ApplicationCard({ application, onView }: ApplicationCardProps) {
  const { actualTheme } = useTheme();
  const { appName, appCode, description, isEnabled, subscriptionTier } = application;

  const themeColors = getThemeColors(actualTheme);
  const statusColors = getStatusColors(isEnabled, actualTheme);

  // Handle navigation to application
  const handleNavigateToApp = () => {
    console.log('Launch App clicked for:', application.appName);
    const url = getApplicationUrl(application);
    console.log('Navigating to URL:', url);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      console.warn('No URL available for application', application);
    }
  };

  return (
    <GlareCard
      className="h-[320px] rounded-[24px] cursor-auto" // Fixed height for consistency
    >
      <div className="flex flex-col h-full p-6 relative">

        {/* Decorative background glow */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-500/20 rounded-full blur-3xl hover:bg-indigo-500/30 transition-all duration-500"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl hover:bg-purple-500/20 transition-all duration-500"></div>

        {/* Header */}
        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className={cn(
            "h-14 w-14 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-lg transition-transform duration-300 hover:scale-110",
            themeColors.iconBg,
            themeColors.iconColor
          )}>
            <div className="w-8 h-8">
              {getApplicationIcon(appCode)}
            </div>
          </div>

          <Badge
            className={cn(
              "border backdrop-blur-md px-3 py-1 transition-all duration-300",
              statusColors.bg,
              statusColors.text,
              statusColors.border
            )}
          >
            <span className={cn("w-2 h-2 rounded-full mr-2 animate-pulse", statusColors.dot)}></span>
            {isEnabled ? "Active" : "Inactive"}
          </Badge>
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          <h3 className={cn("text-2xl font-bold mb-1 tracking-tight hover:translate-x-1 transition-transform duration-300", themeColors.titleColor)}>
            {appName}
          </h3>
          <p className={cn("text-xs uppercase font-semibold tracking-widest mb-3 opacity-60", themeColors.subtitleColor)}>
            {appCode}
          </p>
          <p className={cn("text-sm leading-relaxed line-clamp-2 mb-4 opacity-80", themeColors.descriptionColor)}>
            {description || "Access powerful tools and modules customized for your workflow."}
          </p>
        </div>

        {/* Footer / Actions */}
        <div className="relative z-10 mt-auto pt-4 border-t border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Plan</span>
              <Badge variant="outline" className="bg-white/5 border-white/10 text-slate-300 backdrop-blur-sm">
                {typeof subscriptionTier === "object" ? "Pro" : subscriptionTier || "Standard"}
              </Badge>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 relative z-20">
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-indigo-200 text-xs font-medium transition-all cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleNavigateToApp();
                }}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Launch App
              </button>
              <button
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Details clicked for:', application.appName);
                  onView(application);
                }}
              >
                Details <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </GlareCard>
  );
});