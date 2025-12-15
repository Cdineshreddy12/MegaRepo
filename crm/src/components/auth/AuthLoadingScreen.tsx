import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react';
import ZopkitLoader from '@/components/ui/ZopkitLoader';

interface AuthLoadingScreenProps {
  isLoading: boolean;
  isValidating: boolean;
  error: string | null;
  silentAuthAttempted: boolean;
  onLogin: () => void;
  onRetry: () => void;
  onClearError: () => void;
}

export const AuthLoadingScreen: React.FC<AuthLoadingScreenProps> = ({
  isLoading,
  isValidating,
  error,
  silentAuthAttempted,
  onLogin,
  onRetry,
  onClearError
}) => {
  // Show loading state
  if (isLoading || isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 text-center space-y-8 max-w-md">
          <ZopkitLoader 
            message={isValidating ? 'VALIDATING ACCESS' : 'AUTHENTICATING'}
            showProgress={true}
            size="lg"
          />
          
          {/* Additional context for validation/authentication */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-white">
                {isValidating ? 'Checking your permissions...' : 'Setting up your session...'}
              </span>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            
            <div className="text-xs text-blue-200/80 max-w-md mx-auto">
              {isValidating 
                ? 'Verifying your access rights and configuring your dashboard...'
                : 'Establishing secure connection and loading your workspace...'
              }
            </div>
          </div>
        </div>

        {/* Add custom animation styles */}
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
        `}</style>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Modern Abstract Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#ef4444_0%,transparent_25%)] opacity-20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_50%,#7f1d1d_0%,transparent_25%)] opacity-20" />
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <div className="relative z-10 w-full max-w-md animate-in fade-in zoom-in-95 duration-500">
          <Card className="backdrop-blur-xl bg-zinc-900/80 border-zinc-800 shadow-2xl ring-1 ring-red-900/20">
            <CardContent className="p-8 md:p-10">
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                    <div className="relative bg-zinc-900 p-4 rounded-xl ring-1 ring-white/10 shadow-xl">
                      <AlertTriangle className="h-10 w-10 text-red-500" />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight text-white">
                    Authentication Error
                  </h2>
                  <p className="text-zinc-400 text-sm">
                    We encountered an issue while authenticating you.
                  </p>
                </div>

                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-left">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                    <span className="text-sm text-red-200/90 leading-relaxed">
                      {error}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <Button 
                    onClick={onRetry} 
                    className="w-full h-11 bg-white text-black hover:bg-zinc-200 font-medium transition-all"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                  
                  <Button 
                    onClick={onLogin} 
                    className="w-full h-11 bg-zinc-800 text-white hover:bg-zinc-700 border border-zinc-700 transition-all"
                    variant="outline"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Login Manually
                  </Button>

                  <Button 
                    onClick={onClearError} 
                    className="w-full text-zinc-500 hover:text-zinc-300 hover:bg-transparent"
                    variant="ghost"
                    size="sm"
                  >
                    Dismiss Error
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Show login prompt if silent auth failed
  if (silentAuthAttempted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden font-sans">
        {/* Modern Abstract Background */}
        <div className="absolute inset-0">
          {/* Vibrant gradient orbs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px] animate-pulse delay-1000" />
          
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
        </div>

        {/* Main content */}
        <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
          <Card className="backdrop-blur-2xl bg-zinc-900/70 border-zinc-800/50 shadow-2xl ring-1 ring-white/10">
            <CardContent className="p-8 md:p-10">
              <div className="text-center space-y-8">
                {/* Logo/Icon Section */}
                <div className="flex justify-center">
                  <div className="relative group cursor-default">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-violet-600 to-blue-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200 animate-tilt" />
                    <div className="relative bg-black p-4 rounded-xl ring-1 ring-white/10 shadow-2xl flex items-center justify-center">
                      <Shield className="h-10 w-10 text-blue-500" />
                    </div>
                  </div>
                </div>
                
                {/* Welcome Text */}
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tight text-white">
                    Welcome Back
                  </h1>
                  <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
                    Sign in to access your CRM dashboard and manage your business data.
                  </p>
                </div>

                {/* Login Button */}
                <div className="pt-2 space-y-6">
                  <Button 
                    onClick={onLogin} 
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium text-base transition-all shadow-[0_0_20px_-5px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_-5px_rgba(255,255,255,0.5)] relative overflow-hidden group"
                    size="lg"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                    <Shield className="h-4 w-4 mr-2" />
                    Login to CRM
                  </Button>

                  {/* Security Note */}
                  <div className="flex items-center justify-center gap-2 text-xs text-zinc-500">
                    <div className="h-1 w-1 rounded-full bg-green-500"></div>
                    <span>Secure authentication powered by Kinde</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-zinc-600">
              &copy; {new Date().getFullYear()} Zopkit CRM. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};
