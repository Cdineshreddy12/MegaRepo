import { useRef, useState, CSSProperties, PointerEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/theme/ThemeProvider";

export const GlareCard = ({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) => {
  const { actualTheme } = useTheme();
  const isPointerInside = useRef(false);
  const refElement = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({
    glare: { x: 50, y: 50 },
    background: { x: 50, y: 50 },
    rotate: { x: 0, y: 0 },
  });

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const rotateFactor = 0.4;
    const rect = event.currentTarget.getBoundingClientRect();
    const position = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    const percentage = {
      x: (100 / rect.width) * position.x,
      y: (100 / rect.height) * position.y,
    };
    const delta = {
      x: percentage.x - 50,
      y: percentage.y - 50,
    };

    const { current: currentElement } = refElement;
    if (currentElement) {
      currentElement.style.setProperty("--opacity", "1");
    }

    setState({
      glare: {
        x: percentage.x,
        y: percentage.y,
      },
      background: {
        x: 50 + percentage.x / 4 - 12.5,
        y: 50 + percentage.y / 4 - 12.5,
      },
      rotate: {
        x: -(delta.x / 3.5),
        y: delta.y / 2,
      },
    });
  };

  const handlePointerEnter = () => {
    isPointerInside.current = true;
    if (refElement.current) {
      setTimeout(() => {
        if (isPointerInside.current && refElement.current) {
          refElement.current.style.setProperty("--duration", "0s");
        }
      }, 300);
    }
  };

  const handlePointerLeave = () => {
    isPointerInside.current = false;
    if (refElement.current) {
      refElement.current.style.removeProperty("--duration");
      refElement.current.style.setProperty("--opacity", "0");
    }
    setState({
      glare: { x: 50, y: 50 },
      background: { x: 50, y: 50 },
      rotate: { x: 0, y: 0 },
    });
  };

  // Theme-specific styles
  const getThemeStyles = () => {
    switch (actualTheme) {
      case 'light':
        return {
          cardBg: 'bg-white',
          cardBorder: 'border-slate-200',
          gradientFrom: 'from-white',
          gradientVia: 'via-slate-50',
          gradientTo: 'to-white',
          glareColor: 'rgba(0,0,0,0.15)',
          glareColorMid: 'rgba(0,0,0,0.1)',
          mixBlend: 'mix-blend-multiply'
        };
      case 'monochrome':
        return {
          cardBg: 'bg-gray-100',
          cardBorder: 'border-gray-300',
          gradientFrom: 'from-gray-100',
          gradientVia: 'via-gray-50',
          gradientTo: 'to-gray-100',
          glareColor: 'rgba(0,0,0,0.12)',
          glareColorMid: 'rgba(0,0,0,0.08)',
          mixBlend: 'mix-blend-darken'
        };
      default: // dark
        return {
          cardBg: 'bg-slate-900',
          cardBorder: 'border-white/10',
          gradientFrom: 'from-slate-900',
          gradientVia: 'via-slate-800',
          gradientTo: 'to-slate-900',
          glareColor: 'rgba(255,255,255,0.8)',
          glareColorMid: 'rgba(255,255,255,0.65)',
          mixBlend: 'mix-blend-overlay'
        };
    }
  };

  const themeStyles = getThemeStyles();

  return (
    <div
      ref={refElement}
      className={cn(
        "relative isolate [contain:layout_style] [perspective:600px] transition-transform duration-[200ms] ease-in-out active:scale-[0.98]",
        className
      )}
      style={{
        "--duration": "300ms",
        "--opacity": "0",
      } as CSSProperties}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={onClick}
    >
      <div
        className="h-full w-full transition-transform duration-[var(--duration)] ease-[cubic-bezier(0.2,0.8,0.2,1)]"
        style={{
          transform: `rotateY(${state.rotate.x}deg) rotateX(${state.rotate.y}deg)`,
        }}
      >
        <div className={cn(
          "relative h-full w-full overflow-hidden rounded-[24px] border shadow-2xl",
          themeStyles.cardBg,
          themeStyles.cardBorder
        )}>
          {/* Background Gradient Layer */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br z-0",
            themeStyles.gradientFrom,
            themeStyles.gradientVia,
            themeStyles.gradientTo
          )} />

          <div className="relative z-10 h-full w-full">
            {children}
          </div>

          {/* Glare Effect */}
          <div
            className={cn(
              "absolute inset-0 z-20 w-full h-full transition-opacity duration-[var(--duration)] ease-in-out pointer-events-none",
              themeStyles.mixBlend
            )}
            style={{
              opacity: "var(--opacity)",
              background: `radial-gradient(
                farthest-corner circle at ${state.glare.x}% ${state.glare.y}%,
                ${themeStyles.glareColor} 10%,
                ${themeStyles.glareColorMid} 20%,
                rgba(255,255,255,0) 90%
              )`
            }}
          />
        </div>
      </div>
    </div>
  );
};