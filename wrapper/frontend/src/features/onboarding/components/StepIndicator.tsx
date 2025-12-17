import React, { useState } from 'react';
import { Check, AlertCircle, ChevronRight, BarChart3, Layout, FileText, Users, ShieldCheck, User } from 'lucide-react';
import { StepConfig } from '../config/flowConfigs';

interface StepIndicatorProps {
  stepsConfig: StepConfig[];
  currentStep: number;
  getStepStatus: (stepNumber: number) => 'completed' | 'active' | 'error' | 'upcoming';
  onStepClick?: (stepNumber: number) => void;
  className?: string;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  stepsConfig,
  currentStep,
  getStepStatus,
  onStepClick,
  className = '',
}) => {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  if (!stepsConfig || stepsConfig.length === 0) return null;

  // Helper to generate deterministic "fake" field stats for the UI
  const getStepStats = (step: StepConfig, status: string) => {
    // Generate a fixed total based on char code of title to be consistent
    const totalFields = 3 + (step.title.length % 3); 
    
    let completedFields = 0;
    if (status === 'completed') {
      completedFields = totalFields;
    } else if (status === 'active' || status === 'error') {
      // Arbitrary progress for active step
      completedFields = Math.max(1, Math.floor(totalFields * 0.4));
    }
    
    return { current: completedFields, total: totalFields };
  };

  const hasError = stepsConfig.some(s => getStepStatus(s.number) === 'error');

  return (
    <div className={`flex flex-col gap-2 font-sans ${className}`}>
      {stepsConfig.map((step) => {
        const status = getStepStatus(step.number);
        const isActive = status === 'active';
        const isCompleted = status === 'completed';
        const isError = status === 'error';
        const isUpcoming = status === 'upcoming';
        
        // Allow clicking if completed, active, or error
        const isClickable = onStepClick && (isCompleted || isActive || isError);
        const isHovered = hoveredStep === step.number;
        
        const { current, total } = getStepStats(step, status);
        const progressPercent = (current / total) * 100;

        // --- DYNAMIC STYLING CONFIGURATION ---
        let styles = {
          card: "bg-transparent border-transparent opacity-60 opacity-100",
          iconBg: "bg-slate-100 text-slate-400",
          title: "text-slate-500",
          subtext: "text-slate-400",
          barBg: "bg-slate-100",
          barFill: "bg-slate-300",
          shadow: ""
        };

        if (isCompleted) {
          styles = {
            card: "bg-white border-transparent hover:border-emerald-100 opacity-100",
            iconBg: "bg-emerald-500 text-white shadow-md shadow-emerald-200",
            title: "text-slate-800",
            subtext: "text-slate-500",
            barBg: "bg-emerald-100",
            barFill: "bg-emerald-500",
            shadow: "shadow-sm hover:shadow-md"
          };
        } else if (isError) {
          styles = {
            card: "bg-red-50 border-red-100 opacity-100 ring-1 ring-red-100",
            iconBg: "bg-red-500 text-white shadow-md shadow-red-200",
            title: "text-red-900",
            subtext: "text-red-700",
            barBg: "bg-red-200",
            barFill: "bg-red-500",
            shadow: "shadow-md"
          };
        } else if (isActive) {
          styles = {
            card: "bg-white/50 border-pink-100 opacity-100 ring-1 ring-pink-200 backdrop-blur-sm",
            iconBg: "bg-pink-500 text-white shadow-md shadow-pink-300",
            title: "text-pink-900",
            subtext: "text-pink-700",
            barBg: "bg-pink-100",
            barFill: "bg-pink-500",
            shadow: "shadow-lg shadow-pink-100/50"
          };
        } else if (isUpcoming) {
             styles.card = "bg-white border-transparent border border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100 hover:border-slate-200 hover:shadow-sm";
        }

        return (
          <div
            key={step.id}
            onClick={() => isClickable && onStepClick?.(step.number)}
            onMouseEnter={() => setHoveredStep(step.number)}
            onMouseLeave={() => setHoveredStep(null)}
            className={`
              relative flex items-center gap-3 p-2 rounded-xl border
              ${styles.card} ${styles.shadow}
              ${isClickable ? 'cursor-pointer scale-[1.01]' : 'cursor-default'}
              ${isActive ? 'scale-[1.02]' : ''}
            `}
          >
            {/* LEFT ICON CIRCLE */}
            <div className={`
              flex items-center justify-center w-10 h-10 rounded-full shrink-0
              ${styles.iconBg}
              ${isActive || isHovered ? 'scale-110' : 'scale-100'}
            `}>
              {isCompleted ? (
                <Check className="w-5 h-5" strokeWidth={3} />
              ) : isError ? (
                <AlertCircle className="w-5 h-5" strokeWidth={2.5} />
              ) : (
                <span className="text-sm font-bold font-mono">{step.number}</span>
              )}
            </div>

            {/* MIDDLE CONTENT */}
            <div className="flex-1 min-w-0 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <h4 className={`text-xs font-bold uppercase tracking-wider truncate pr-2 ${styles.title}`}>
                  {step.title}
                </h4>
                {/* Status Indicator Icon next to title */}
                {isCompleted && <Check className="w-3 h-3 text-emerald-500 shrink-0" strokeWidth={4} />}
                {isError && <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />}
              </div>

              {/* Progress Stats */}
              <div className="flex items-center gap-3">
                 <div className={`flex items-center gap-1 text-[10px] font-semibold ${styles.subtext}`}>
                    <BarChart3 className="w-3 h-3 opacity-70" />
                    <span>{current}/{total} fields</span>
                 </div>
                 
                 {/* Mini Progress Bar */}
                 <div className={`flex-1 h-1.5 rounded-full overflow-hidden max-w-[80px] ${styles.barBg}`}>
                   <div 
                     className={`h-full rounded-full ${styles.barFill}`}
                     style={{ width: `${progressPercent}%` }}
                   />
                 </div>
              </div>
            </div>

            {/* RIGHT ARROW */}
            {isClickable && (
              <div className="pl-1">
                 <ChevronRight className={`
                   w-4 h-4
                   ${isHovered ? 'translate-x-0.5 opacity-100' : 'opacity-40'}
                   ${styles.title}
                 `} />
              </div>
            )}
            
            {/* Active Indicator Line (Left Edge) */}
            {isActive && (
              <div className="absolute left-0 top-3 bottom-3 w-1 bg-white/50 rounded-r-full" />
            )}
          </div>
        );
      })}

      {/* ERROR BANNER - Matches the reference image's "Please fix errors" block */}
      {hasError && (
        <div className="mt-2 mx-1 p-3 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 shadow-sm">
           <div className="w-8 h-8 rounded-full bg-white border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
              <AlertCircle className="w-4 h-4 text-red-500" />
           </div>
           <div>
              <p className="text-xs font-bold text-red-900">Action Required</p>
              <p className="text-[10px] text-red-600 font-medium">Please fix errors to continue</p>
           </div>
        </div>
      )}
    </div>
  );
};
