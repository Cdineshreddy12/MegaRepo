import React, { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/components/theme/ThemeProvider';

interface AnimatedLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AnimatedLoader: React.FC<AnimatedLoaderProps> = ({
  size = 'md',
  className = ''
}) => {
  const { actualTheme } = useTheme();

  const containerSize = {
    sm: 'w-24 h-24', // 96px
    md: 'w-32 h-32', // 128px
    lg: 'w-48 h-48'  // 192px (close to original 180px)
  };

  const fontSize = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-2xl'
  };

  const textColor = actualTheme === 'dark' ? 'text-white' : 'text-black';

  useEffect(() => {
    // Inject keyframes into document head
    const styleId = 'generating-loader-keyframes';
    const existingStyle = document.getElementById(styleId);

    if (!existingStyle) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes loader-rotate {
          0% {
            transform: rotate(90deg);
            box-shadow:
              0 10px 20px 0 #fff inset,
              0 20px 30px 0 #ad5fff inset,
              0 60px 60px 0 #471eec inset;
          }
          50% {
            transform: rotate(270deg);
            box-shadow:
              0 10px 20px 0 #fff inset,
              0 20px 10px 0 #d60a47 inset,
              0 40px 60px 0 #311e80 inset;
          }
          100% {
            transform: rotate(450deg);
            box-shadow:
              0 10px 20px 0 #fff inset,
              0 20px 30px 0 #ad5fff inset,
              0 60px 60px 0 #471eec inset;
          }
        }

        @keyframes loader-letter-anim {
          0%, 100% {
            opacity: 0.4;
            transform: translateY(0);
          }
          20% {
            opacity: 1;
            transform: scale(1.15);
          }
          40% {
            opacity: 0.7;
            transform: translateY(0);
          }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      // Cleanup on unmount
      const styleToRemove = document.getElementById(styleId);
      if (styleToRemove) {
        document.head.removeChild(styleToRemove);
      }
    };
  }, []);

  return (
    <div className={cn(
      'relative flex items-center justify-center rounded-full bg-transparent select-none',
      containerSize[size],
      className
    )}>
      {/* Animated letters */}
      <div className="flex items-center justify-center relative z-10">
        {['Z', 'O', 'P', 'K', 'I', 'T'].map((letter, index) => (
          <span
            key={index}
            className={cn(
              'inline-block font-light opacity-40 rounded-full border-none',
              textColor,
              fontSize[size]
            )}
            style={{
              animation: 'loader-letter-anim 2s infinite',
              animationDelay: `${index * 0.1}s`
            }}
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Rotating background circle */}
      <div
        className="absolute inset-0 rounded-full bg-transparent"
        style={{
          animation: 'loader-rotate 2s linear infinite'
        }}
      />
    </div>
  );
};

export default AnimatedLoader;
