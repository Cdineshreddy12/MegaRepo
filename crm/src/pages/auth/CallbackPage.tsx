import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/KindeAuthContext';
import { Loader } from '@/components/common/Loader';
import logo from '@/assets/logo.jpeg';
import { CheckCircle, Shield, Database, User } from 'lucide-react';

const CallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading, login } = useAuth();
  const safetyTimerRef = useRef<number | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  const steps = [
    { icon: Shield, label: 'Verifying Credentials', description: 'Validating your authentication token' },
    { icon: Database, label: 'Loading Profile', description: 'Retrieving your user information' },
    { icon: User, label: 'Setting Up Session', description: 'Configuring your CRM access' },
    { icon: CheckCircle, label: 'Ready to Go!', description: 'Taking you to your dashboard' }
  ];

  useEffect(() => {
    console.log('🔄 Kinde callback processing...');

    // Progress through steps based on authentication state
    if (isLoading && isAuthenticated === false) {
      setCurrentStep(0);
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 30));
      }, 100);
      return () => clearInterval(progressInterval);
    }

    // If authentication is complete, go to app root
    if (!isLoading && isAuthenticated) {
        console.log('✅ Kinde authentication successful, redirecting to app');
        setCurrentStep(3);
        setProgress(100);
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1000);
      return;
    }

    // If loading finished but not authenticated, start login
    if (!isLoading && !isAuthenticated) {
      console.log('❌ Kinde authentication failed/stalled, starting login');
      login?.();
      return;
    }

    // Safety timer: if we stay loading here too long, force login
    if (safetyTimerRef.current) {
      window.clearTimeout(safetyTimerRef.current);
    }
    safetyTimerRef.current = window.setTimeout(() => {
      if (!isAuthenticated) {
        console.log('⏳ Callback safety timer fired, starting login');
        login?.();
      }
    }, 5000);

    return () => {
      if (safetyTimerRef.current) {
        window.clearTimeout(safetyTimerRef.current);
      }
    };
  }, [isAuthenticated, isLoading, navigate, login]);

  // Auto-progress through steps during loading
  useEffect(() => {
    if (isLoading) {
      const stepInterval = setInterval(() => {
        setCurrentStep(prev => {
          if (prev < 2) {
            setProgress(30 + (prev + 1) * 20);
            return prev + 1;
          }
          return prev;
        });
      }, 1500);

      return () => clearInterval(stepInterval);
    }
  }, [isLoading]);

  const CurrentStepIcon = steps[currentStep].icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      {/* Enhanced animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        {/* Additional floating elements */}
        <div className="absolute top-20 left-20 w-4 h-4 bg-white rounded-full opacity-30 animate-ping"></div>
        <div className="absolute bottom-32 right-16 w-2 h-2 bg-blue-300 rounded-full opacity-40 animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-purple-300 rounded-full opacity-50 animate-bounce"></div>
      </div>

      <div className="relative z-10 text-center max-w-lg w-full">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur-lg opacity-50 animate-pulse"></div>
              <div className="relative bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/20">
                <img
                  src={logo}
                  alt="Zopkit CRM"
                  className="h-12 w-auto mx-auto"
                />
              </div>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Zopkit CRM</h1>
          <p className="text-blue-100 text-sm">Secure Business Management Platform</p>
        </div>

        {/* Main content card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Progress bar */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-medium text-blue-100">Authentication Progress</span>
              <span className="text-sm font-medium text-blue-100">{progress}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          {/* Current step indicator */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-lg opacity-60 animate-pulse"></div>
              <div className="relative bg-white/20 backdrop-blur-sm p-4 rounded-full border border-white/30">
                <CurrentStepIcon className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>

          {/* Step information */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-white mb-2">
              {steps[currentStep].label}
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              {steps[currentStep].description}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center space-x-2 mb-6">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index <= currentStep
                    ? 'bg-gradient-to-r from-blue-400 to-purple-500'
                    : 'bg-white/30'
                }`}
              />
            ))}
          </div>

          {/* Additional status info */}
          <div className="text-center">
            <p className="text-blue-200 text-xs opacity-75">
              {isLoading ? 'Processing your login securely...' : 'Almost ready!'}
            </p>
          </div>
        </div>

        {/* Security note */}
        <div className="mt-6 text-center">
          <p className="text-blue-200 text-xs opacity-60">
            🔒 Your connection is secure and encrypted
          </p>
        </div>
      </div>

      {/* Enhanced animation styles */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CallbackPage;