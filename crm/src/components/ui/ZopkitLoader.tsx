import React from 'react';

interface ZopkitLoaderProps {
  message?: string;
  showProgress?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const ZopkitLoader: React.FC<ZopkitLoaderProps> = ({ 
  message = 'LOADING', 
  showProgress = true, 
  size = 'md' 
}) => {
  // Size configuration for different use cases
  const sizeConfig = {
    sm: { 
      textSize: 'text-5xl', 
      progressWidth: 'w-48', 
      dotSize: 'w-1 h-1',
      spacing: 'space-y-6'
    },
    md: { 
      textSize: 'text-7xl', 
      progressWidth: 'w-64', 
      dotSize: 'w-1.5 h-1.5',
      spacing: 'space-y-8'
    },
    lg: { 
      textSize: 'text-8xl', 
      progressWidth: 'w-80', 
      dotSize: 'w-2 h-2',
      spacing: 'space-y-10'
    }
  };

  const config = sizeConfig[size];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-white via-blue-50 to-white dark:from-gray-950 dark:via-blue-950 dark:to-gray-950 flex items-center justify-center z-50">
      <div className="relative">
        {/* Main container */}
        <div className={`flex flex-col items-center ${config.spacing}`}>
          {/* Logo and brand name with fill effect */}
          <div className="relative">
            {/* Background text (unfilled) */}
            <div className={`${config.textSize} font-bold tracking-tight`}>
              <span className="text-gray-200 dark:text-gray-800">zopkit</span>
            </div>
            
            {/* Animated fill overlay */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`${config.textSize} font-bold tracking-tight animate-fill`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-blue-400">
                  zopkit
                </span>
              </div>
            </div>

            {/* Secondary wave fill effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className={`${config.textSize} font-bold tracking-tight animate-wave-fill`}>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-blue-200 to-white opacity-60">
                  zopkit
                </span>
              </div>
            </div>

            {/* Shimmer effect */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent"></div>
            </div>
          </div>

          {/* Progress indicator */}
          {showProgress && (
            <div className={`${config.progressWidth} space-y-3`}>
              {/* Progress bar */}
              <div className="h-1 bg-gray-200/50 dark:bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
                <div className="h-full bg-gradient-to-r from-blue-400 via-sky-300 to-blue-400 rounded-full animate-progress shadow-sm shadow-blue-300/50"></div>
              </div>
              
              {/* Loading text */}
              <div className="text-center">
                <span className="text-sm text-gray-400 dark:text-gray-500 font-medium tracking-wider animate-pulse">
                  {message}
                </span>
              </div>
            </div>
          )}

          {/* Professional dots indicator */}
          <div className="flex items-center space-x-1.5">
            <div className={`${config.dotSize} bg-gradient-to-r from-blue-400 to-sky-300 rounded-full animate-dot-1`}></div>
            <div className={`${config.dotSize} bg-gradient-to-r from-sky-300 to-blue-400 rounded-full animate-dot-2`}></div>
            <div className={`${config.dotSize} bg-gradient-to-r from-blue-400 to-sky-300 rounded-full animate-dot-3`}></div>
          </div>
        </div>

        {/* Subtle glow effect */}
        <div className="absolute inset-0 -z-10 blur-3xl opacity-20">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 bg-gradient-to-r from-blue-300 to-sky-200 animate-pulse"></div>
        </div>

        {/* Additional ambient light */}
        <div className="absolute inset-0 -z-20">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-200/20 rounded-full blur-3xl animate-float"></div>
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-sky-200/20 rounded-full blur-3xl animate-float-delayed"></div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fill {
          0% {
            clip-path: polygon(0 100%, 0 100%, 0 100%, 0 100%);
          }
          100% {
            clip-path: polygon(0 0, 100% 0, 100% 100%, 0 100%);
          }
        }

        @keyframes wave-fill {
          0% {
            clip-path: polygon(0 100%, 20% 98%, 40% 100%, 60% 98%, 80% 100%, 100% 98%, 100% 100%, 0 100%);
          }
          50% {
            clip-path: polygon(0 50%, 20% 48%, 40% 50%, 60% 48%, 80% 50%, 100% 48%, 100% 100%, 0 100%);
          }
          100% {
            clip-path: polygon(0 0, 20% 0, 40% 0, 60% 0, 80% 0, 100% 0, 100% 100%, 0 100%);
          }
        }

        @keyframes progress {
          0% {
            width: 0%;
            background-position: 0% 50%;
          }
          50% {
            width: 70%;
            background-position: 100% 50%;
          }
          100% {
            width: 100%;
            background-position: 0% 50%;
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }

        @keyframes dot-1 {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          40% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes dot-2 {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          40% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes dot-3 {
          0%, 80%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          40% {
            opacity: 1;
            transform: scale(1.4);
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.1);
          }
        }

        @keyframes float-delayed {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(-30px, -30px) scale(1.1);
          }
        }

        .animate-fill {
          animation: fill 3s ease-in-out infinite;
          background-size: 200% 200%;
        }

        .animate-wave-fill {
          animation: wave-fill 3s ease-in-out infinite;
          animation-delay: 0.5s;
        }

        .animate-progress {
          animation: progress 3s ease-in-out infinite;
          background-size: 200% 200%;
        }

        .animate-shimmer {
          animation: shimmer 3s ease-in-out infinite;
        }

        .animate-dot-1 {
          animation: dot-1 1.4s ease-in-out infinite;
        }

        .animate-dot-2 {
          animation: dot-2 1.4s ease-in-out infinite;
          animation-delay: 0.2s;
        }

        .animate-dot-3 {
          animation: dot-3 1.4s ease-in-out infinite;
          animation-delay: 0.4s;
        }

        .animate-float {
          animation: float 6s ease-in-out infinite;
        }

        .animate-float-delayed {
          animation: float-delayed 6s ease-in-out infinite;
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
};

export default ZopkitLoader;
