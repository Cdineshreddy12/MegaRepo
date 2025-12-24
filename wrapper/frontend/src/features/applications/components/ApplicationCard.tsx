import React, { memo, useMemo, useState, useRef } from 'react';
import { Database, CreditCard, Package, ShieldCheck, ExternalLink, ArrowRight, Layers, Layout, Cpu, Zap, Activity, Shield } from 'lucide-react';
import { Application, AppThemeConfig, ThemeType } from '@/types/application';
import { useTheme } from '@/components/theme/ThemeProvider';
import { cn } from '@/lib/utils';
import { ApplicationCardDecoration } from './ApplicationCardDecoration';
import { PearlButton } from '@/components/ui/pearl-button';

const THEME_POOL: { type: ThemeType; color: string; icon: React.ReactNode }[] = [
  { type: 'cyan', color: 'cyan', icon: <Zap className="w-8 h-8" /> },
  { type: 'indigo', color: 'indigo', icon: <Layers className="w-8 h-8" /> },
  { type: 'emerald', color: 'emerald', icon: <Activity className="w-8 h-8" /> },
  { type: 'rose', color: 'rose', icon: <Shield className="w-8 h-8" /> },
  { type: 'amber', color: 'amber', icon: <Cpu className="w-8 h-8" /> },
  { type: 'purple', color: 'purple', icon: <Layout className="w-8 h-8" /> },
  { type: 'red', color: 'red', icon: <Package className="w-8 h-8" /> },
  { type: 'blue', color: 'blue', icon: <Database className="w-8 h-8" /> },
  { type: 'violet', color: 'violet', icon: <ShieldCheck className="w-8 h-8" /> },
  { type: 'orange', color: 'orange', icon: <Zap className="w-8 h-8" /> },
  { type: 'yellow', color: 'yellow', icon: <Activity className="w-8 h-8" /> },
];

const getAppThemeByIndex = (index: number): AppThemeConfig => {
  const theme = THEME_POOL[index % THEME_POOL.length];

  return {
    type: theme.type,
    color: theme.color,
    colorClass: `text-${theme.color}-500`,
    bgGradient: `from-${theme.color}-500/20 via-${theme.color}-500/5 to-transparent`,
    glowClass: `group-hover:shadow-${theme.color}-500/40`,
    icon: theme.icon
  };
};

const getApplicationUrl = (application: Application): string => {
  const apiBaseUrl =
    application.baseUrl ||
    (application as any).base_url ||
    (application as any).baseurl;

  if (apiBaseUrl) return apiBaseUrl;

  const baseDomain = window.location.origin;
  const urlPatterns: Record<string, string> = {
    affiliateConnect: `${baseDomain}/affiliate`,
    crm: `https://crm.zopkit.com`,
    hr: `${baseDomain}/hr`,
  };

  return urlPatterns[application.appCode] || `${baseDomain}/apps/${application.appCode}`;
};

interface ApplicationCardProps {
  application: Application;
  onView: (app: Application) => void;
  index: number;
}

export const ApplicationCard = memo(function ApplicationCard({ application, onView, index }: ApplicationCardProps) {
  const { actualTheme } = useTheme();
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const isDark = actualTheme === 'dark';
  const theme = useMemo(() => getAppThemeByIndex(index), [index]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 25;
    const rotateY = (centerX - x) / 25;
    setRotate({ x: rotateX, y: rotateY });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = getApplicationUrl(application);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="perspective-1000 w-full h-[450px]">
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={() => onView(application)}
        style={{
          transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg)`,
        }}
        className={cn(
          "card-inner group relative h-full w-full rounded-[48px] p-10 transition-all duration-300 cursor-pointer overflow-hidden border",
          isDark
            ? "bg-slate-900/80 border-white/10 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)]"
            : "bg-white border-slate-200 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)]",
          theme.glowClass
        )}
      >
        {/* Persistent background gradient */}
        <div className={cn(
          "absolute inset-0 opacity-20 pointer-events-none transition-all duration-700 group-hover:opacity-40",
          "bg-[radial-gradient(circle_at_50%_120%,var(--tw-gradient-from),transparent_70%)]",
          theme.bgGradient
        )} />

        {/* Decoration */}
        <ApplicationCardDecoration
          type={theme.type}
          className="opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-1000 origin-bottom-right"
        />

        {/* Content Container */}
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div className={cn(
              "relative w-22 h-22 rounded-[30px] flex items-center justify-center transition-all duration-700",
              isDark ? "bg-slate-800/90 shadow-xl" : "bg-slate-50 shadow-sm",
              "group-hover:rotate-[6deg] group-hover:scale-110",
              theme.colorClass
            )}>
              {theme.icon}
              <div className={cn("absolute inset-0 rounded-[30px] opacity-15 blur-xl", theme.colorClass.replace('text-', 'bg-'))} />
            </div>

            <div className={cn(
              "w-12 h-12 rounded-full border flex items-center justify-center transition-all duration-500 opacity-60",
              isDark ? "border-white/10 text-slate-400" : "border-slate-200 text-slate-500",
              "group-hover:opacity-100 group-hover:bg-white dark:group-hover:bg-slate-800 group-hover:shadow-lg"
            )}>
              <ExternalLink className="w-5 h-5" />
            </div>
          </div>

          {/* Body */}
          <div className="space-y-4 flex-1">
            <h3 className={cn(
              "text-3xl font-black tracking-tight leading-[1.1] transition-all duration-500 uppercase italic",
              "group-hover:translate-x-1",
              isDark ? "text-white" : "text-slate-900"
            )}>
              {application.appName}
            </h3>
            <p className={cn(
              "text-base leading-relaxed font-semibold transition-all duration-500 line-clamp-3",
              isDark ? "text-slate-400 group-hover:text-slate-200" : "text-slate-500 group-hover:text-slate-700"
            )}>
              {application.description || "Enterprise-grade intelligence for your business workflows."}
            </p>
          </div>

          {/* Launch Button */}
          <div className="mt-6 flex items-center justify-center">
            <PearlButton
              onClick={handleLaunch}
              size="md"
              color={theme.color as any}
              className="w-48 text-lg font-bold uppercase tracking-widest gap-3"
            >
              Launch
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </PearlButton>
          </div>
        </div>

        {/* Card corner shine */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
});