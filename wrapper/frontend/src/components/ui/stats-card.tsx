import { LucideIcon } from 'lucide-react';
import { useTheme } from '@/components/theme/ThemeProvider';

interface StatsCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
}

export function StatsCard({ title, value, description, icon: Icon }: StatsCardProps) {
  const { actualTheme, glassmorphismEnabled } = useTheme();

  // Get theme-specific styles
  const getCardStyles = () => {
    if (glassmorphismEnabled) {
      // Fully glassy purple cards
      return {
        background: 'rgba(168, 85, 247, 0.15)',
        backdropFilter: 'blur(25px) saturate(180%)',
        border: '1px solid rgba(168, 85, 247, 0.4)',
        boxShadow: `
          0 8px 32px rgba(168, 85, 247, 0.2),
          0 0 0 1px rgba(168, 85, 247, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(168, 85, 247, 0.1)
        `,
        position: 'relative'
      };
    } else {
      if (actualTheme === 'dark') {
        return {
          background: '#1f2937',
          border: '1px solid #374151',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        };
      } else if (actualTheme === 'monochrome') {
        return {
          background: '#1f2937',
          border: '1px solid #374151',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        };
      } else {
        return {
          background: 'white',
          border: '1px solid #e5e7eb',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        };
      }
    }
  };

  const getInnerStyles = () => {
    if (glassmorphismEnabled) {
      // Purple glassy inner background
      return {
        background: 'rgba(168, 85, 247, 0.08)',
        backdropFilter: 'blur(15px) saturate(150%)',
        border: '1px solid rgba(168, 85, 247, 0.2)',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      };
    } else {
      if (actualTheme === 'dark') {
        return { background: '#374151' };
      } else if (actualTheme === 'monochrome') {
        return { background: '#374151' };
      } else {
        return { background: '#f9fafb' };
      }
    }
  };

  const getTextColors = () => {
    if (glassmorphismEnabled) {
      // Vibrant colors for purple glassy theme
      return {
        title: '#e879f9', // Bright pink-purple
        value: '#faf5ff', // Very light purple-white
        description: '#c084fc' // Medium purple
      };
    } else if (actualTheme === 'dark' || actualTheme === 'monochrome') {
      return {
        title: '#d1d5db',
        value: '#f9fafb',
        description: '#9ca3af'
      };
    } else {
      return {
        title: '#374151',
        value: '#111827',
        description: '#6b7280'
      };
    }
  };

  const getIconStyles = () => {
    if (glassmorphismEnabled) {
      // Bright purple glow for glassy mode
      return {
        color: '#e879f9',
        background: 'rgba(168, 85, 247, 0.2)',
        boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)',
        border: '1px solid rgba(168, 85, 247, 0.3)'
      };
    } else if (actualTheme === 'dark' || actualTheme === 'monochrome') {
      return {
        color: '#a855f7',
        background: 'rgba(168, 85, 247, 0.1)'
      };
    } else {
      return {
        color: '#7c3aed',
        background: 'rgba(124, 58, 237, 0.1)'
      };
    }
  };

  const cardStyles = getCardStyles();
  const innerStyles = getInnerStyles();
  const textColors = getTextColors();
  const iconStyles = getIconStyles();

  return (
    <div
      className="stats-card relative p-3 rounded-3xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:scale-105"
      style={{
        ...cardStyles,
        ...(glassmorphismEnabled && {
          animation: 'glassyPulse 3s ease-in-out infinite'
        })
      }}
    >
      <div className="stats-card-overlay absolute inset-0 pointer-events-none"
           style={glassmorphismEnabled ? {
             background: `repeating-conic-gradient(rgba(168, 85, 247, 0.05) 0.0000001%, rgba(168, 85, 247, 0.15) 0.000104%) 60% 60%/600% 600%`,
             filter: 'contrast(110%) opacity(0.6)',
             mixBlendMode: 'overlay'
           } : {
             background: `repeating-conic-gradient(${cardStyles.background} 0.0000001%, rgba(107, 114, 128, 0.3) 0.000104%) 60% 60%/600% 600%`,
             filter: 'contrast(105%)',
             opacity: 0.1
           }}
      />
      <div className="stats-card-inner flex flex-col items-center justify-center gap-3 overflow-hidden w-full min-h-44 rounded-2xl p-5 text-center relative z-10"
           style={innerStyles}>
        <div
          className="stats-card-icon flex items-center justify-center w-12 h-12 rounded-xl relative"
          style={iconStyles}
        >
          <Icon className="h-6 w-6 relative z-10" />
        </div>
        <div className="stats-card-content flex flex-col gap-1">
          <div className="stats-card-title text-sm font-medium"
               style={{ color: textColors.title }}>
            {title}
          </div>
          <div className="stats-card-value text-2xl font-bold"
               style={{ color: textColors.value }}>
            {value}
          </div>
          <div className="stats-card-description text-xs"
               style={{ color: textColors.description }}>
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}
