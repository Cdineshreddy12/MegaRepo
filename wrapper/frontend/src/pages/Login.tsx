import React, { useState, useEffect } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2, Shield, Zap, BarChart3, Users, CheckCircle2, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '@/lib/api'
import { crmAuthService } from '../services/crmAuthService'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const { 
    isAuthenticated, 
    user, 
    isLoading, 
    getToken, 
    login,
    getOrganization,
    getUserOrganizations 
  } = useKindeAuth()
  
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [userOrgs, setUserOrgs] = useState<any>(null)
  const [currentOrg, setCurrentOrg] = useState<any>(null)
  const [attemptCount, setAttemptCount] = useState(0)

  // CRM-specific parameters
  const returnTo = searchParams.get('returnTo')
  const source = searchParams.get('source')
  const error = searchParams.get('error')
  const crmRedirect = searchParams.get('crmRedirect')
  
  // Determine if this is a CRM request
  const isCrmRequest = source === 'crm' || crmRedirect === 'true'
  
  // Store user's intended path when CRM request is detected
  useEffect(() => {
    if (isCrmRequest && returnTo) {
      console.log('🔍 CRM request detected, storing intended path')
      try {
        const returnUrl = new URL(returnTo)
        const intendedPath = returnUrl.pathname === '/' ? '/' : returnUrl.pathname
        sessionStorage.setItem('crm_intended_path', intendedPath)
        console.log('💾 Stored intended path:', intendedPath)
      } catch (err) {
        console.error('❌ Error storing intended path:', err)
      }
    }
  }, [isCrmRequest, returnTo])
  
  // Get organization data when user is authenticated
  useEffect(() => {
    const fetchOrgData = async () => {
      if (!isAuthenticated || !user || isLoading) return
      
      try {
        const org = await getOrganization()
        console.log('🏢 Current organization:', org)
        setCurrentOrg(org)
        
        const orgs = await getUserOrganizations()
        console.log('🏢 User organizations:', orgs)
        setUserOrgs(orgs)
      } catch (err) {
        console.error('❌ Error fetching organization data:', err)
      }
    }

    fetchOrgData()
  }, [isAuthenticated, user, isLoading, getOrganization, getUserOrganizations])

  // Handle CRM redirect after authentication
  useEffect(() => {
    const handleCrmRedirect = async () => {
      if (!isAuthenticated || !user || !returnTo || !isCrmRequest || isLoading || isRedirecting) {
        return
      }

      // Check for infinite redirect loops
      const crmRedirectCount = parseInt(localStorage.getItem('crm_redirect_count') || '0')
      if (crmRedirectCount > 3) {
        console.error('🚨 CRM INFINITE LOOP DETECTED - Too many redirects')
        localStorage.removeItem('crm_redirect_count')
        window.location.href = 'https://crm.zopkit.com/'
        return
      }
      localStorage.setItem('crm_redirect_count', (crmRedirectCount + 1).toString())

      console.log('🔄 Processing CRM redirect to:', returnTo)
      setIsRedirecting(true)
      
      try {
        // Validate return URL using CRM auth service
        if (!crmAuthService.validateReturnToUrl(returnTo)) {
          console.error('❌ Invalid CRM return URL:', returnTo)
          toast.error('Invalid return URL. Please contact support.')
          setIsRedirecting(false)
          return
        }
        
        // Get access token from Kinde
        let token = null
        
        try {
          token = await getToken()
        } catch (tokenError) {
          console.warn('⚠️ Could not get token via getToken():', tokenError)
        }
        
        // Clear the CRM params from current URL to prevent loops
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.delete('returnTo')
        currentUrl.searchParams.delete('source')
        currentUrl.searchParams.delete('crmRedirect')
        currentUrl.searchParams.delete('error')
        window.history.replaceState({}, '', currentUrl.toString())
        
        // Generate CRM callback URL with JWT authentication
        const callbackUrl = crmAuthService.generateCRMCallback(user, returnTo)
        
        console.log('🎯 CRM Authentication Success:', {
          user: user.email,
          originalReturnTo: returnTo,
          callbackUrl: callbackUrl
        })
        
        // Clear stored paths and redirect count
        sessionStorage.removeItem('crm_intended_path')
        localStorage.removeItem('crm_redirect_count')
        localStorage.removeItem('crm_last_redirect')
        
        // Store authentication data for debugging
        localStorage.setItem('crm_callback_url', callbackUrl)
        localStorage.setItem('crm_user_id', user.id || user.email || 'unknown')
        localStorage.setItem('crm_callback_timestamp', Date.now().toString())
        
        // Redirect to CRM callback endpoint with JWT authentication
        window.location.href = callbackUrl
        
      } catch (err) {
        console.error('❌ Failed to generate CRM authentication:', err)
        console.log('🔄 Fallback: Redirecting to CRM root')
        window.location.href = crmAuthService.generateFallbackUrl()
      }
    }
    
    const timer = setTimeout(handleCrmRedirect, 500)
    return () => clearTimeout(timer)
  }, [isAuthenticated, user, returnTo, isCrmRequest, isLoading, isRedirecting, getToken])

  // Handle post-login redirect for authenticated users
  useEffect(() => {
    const handlePostLoginRedirect = async () => {
      if (!isAuthenticated || !user || isLoading || returnTo || isRedirecting) {
        return
      }

      console.log('🔄 User authenticated, checking onboarding status')
      setIsRedirecting(true)

      try {
        const response = await api.get('/onboarding/status')
        const status = response.data

        if (status.user && status.isOnboarded && !status.needsOnboarding) {
          console.log('✅ User onboarded, redirecting to dashboard')
          navigate('/dashboard', { replace: true })
        } else if (status.authStatus?.onboardingCompleted === true || 
                   status.authStatus?.userType === 'INVITED_USER' ||
                   status.authStatus?.isInvitedUser === true) {
          console.log('✅ Invited user detected, redirecting to dashboard')
          navigate('/dashboard', { replace: true })
        } else {
          console.log('🔄 User needs onboarding')
          navigate('/onboarding', { replace: true })
        }
      } catch (err) {
        console.error('❌ Error checking onboarding status:', err)
        navigate('/onboarding', { replace: true })
      }
    }

    handlePostLoginRedirect()
  }, [isAuthenticated, user, isLoading, returnTo, navigate, isRedirecting])

  // Show loading while handling post-login redirect
  if (!isLoading && isAuthenticated && user && !returnTo && !isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute inset-2 border-2 border-transparent border-t-blue-500 border-r-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">Setting up your workspace</p>
            <p className="text-slate-400 text-sm mt-2">Initializing your environment...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while auth is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute inset-2 border-2 border-transparent border-t-blue-500 border-r-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">Verifying credentials</p>
            <p className="text-slate-400 text-sm mt-2">Connecting to Zopkit...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while redirecting to CRM
  if (!isLoading && isAuthenticated && user && returnTo && isCrmRequest && isRedirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute inset-2 border-2 border-transparent border-t-emerald-500 border-r-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Globe className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">Redirecting to CRM</p>
            <p className="text-slate-400 text-sm mt-2">Establishing secure connection...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show loading while redirecting to dashboard
  if (isRedirecting && !returnTo && isCrmRequest === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full opacity-20 animate-pulse"></div>
            <div className="absolute inset-2 border-2 border-transparent border-t-blue-500 border-r-cyan-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <Zap className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div>
            <p className="text-slate-200 font-semibold text-lg">Redirecting to dashboard</p>
            <p className="text-slate-400 text-sm mt-2">Loading your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  const handleBackToCRM = () => {
    if (returnTo && crmAuthService.validateReturnToUrl(returnTo)) {
      window.location.href = returnTo
    } else {
      toast.error('Invalid return URL')
    }
  }

  const handleLogin = async () => {
    try {
      setIsLoggingIn(true)
      setAttemptCount(prev => prev + 1)
      console.log('🔄 Starting Google login flow')
      await login()
    } catch (err) {
      console.error('❌ Login error:', err)
      toast.error('Failed to start login process. Please try again.')
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-1/4 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/3 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-4000"></div>
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
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

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Column - Hero Section */}
          <div className="hidden lg:flex flex-col justify-center space-y-8">
            {/* Logo */}
            <div className="space-y-4">
              <div className="inline-flex items-center space-x-3 group cursor-pointer">
                <div className="relative w-14 h-14">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl opacity-80 group-hover:opacity-100 transition-opacity"></div>
                  <div className="absolute inset-0.5 bg-slate-900 rounded-xl flex items-center justify-center">
                    <span className="text-white font-black text-xl bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">Z</span>
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-white">Zopkit</h2>
                  <p className="text-xs text-slate-400 font-medium">Enterprise Platform</p>
                </div>
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-3">
              <h1 className="text-5xl font-black text-white leading-tight">
                Unified Enterprise <br />
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-transparent">Management Platform</span>
              </h1>
              <p className="text-lg text-slate-400 leading-relaxed max-w-xl">
                Streamline your business operations with our comprehensive suite of tools designed for modern enterprises.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 group-hover:bg-blue-600/40 transition-colors">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Lightning Fast</p>
                    <p className="text-xs text-slate-400">Optimized for speed</p>
                  </div>
                </div>
              </div>

              <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-cyan-600/20 group-hover:bg-cyan-600/40 transition-colors">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Bank-Grade Security</p>
                    <p className="text-xs text-slate-400">256-bit encryption</p>
                  </div>
                </div>
              </div>

              <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-blue-600/20 group-hover:bg-blue-600/40 transition-colors">
                    <Users className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Team Collaboration</p>
                    <p className="text-xs text-slate-400">Real-time sync</p>
                  </div>
                </div>
              </div>

              <div className="group p-4 rounded-xl bg-white/5 border border-white/10 hover:border-cyan-500/50 hover:bg-white/10 transition-all">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-cyan-600/20 group-hover:bg-cyan-600/40 transition-colors">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Advanced Analytics</p>
                    <p className="text-xs text-slate-400">Actionable insights</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
              <div>
                <p className="text-2xl font-black text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">50K+</p>
                <p className="text-xs text-slate-400 mt-1">Active Users</p>
              </div>
              <div>
                <p className="text-2xl font-black text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">99.9%</p>
                <p className="text-xs text-slate-400 mt-1">Uptime</p>
              </div>
              <div>
                <p className="text-2xl font-black text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text">180+</p>
                <p className="text-xs text-slate-400 mt-1">Countries</p>
              </div>
            </div>
          </div>

          {/* Right Column - Login Card */}
          <div className="flex items-center justify-center lg:justify-end">
            <Card className="w-full max-w-sm shadow-2xl border-0 bg-slate-900/95 backdrop-blur-md">
              <CardHeader className="pb-6 space-y-4">
                {/* Mobile Logo - Only show on mobile */}
                <div className="lg:hidden flex justify-center mb-2">
                  <div className="relative w-12 h-12">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-xl opacity-80"></div>
                    <div className="absolute inset-0.5 bg-slate-900 rounded-lg flex items-center justify-center">
                      <span className="text-white font-black text-lg bg-gradient-to-br from-blue-400 to-cyan-400 bg-clip-text text-transparent">Z</span>
                    </div>
                  </div>
                </div>

                {isCrmRequest ? (
                  <>
                    <div className="text-center space-y-2">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-600/20 border border-emerald-500/30 mx-auto">
                        <Globe className="w-6 h-6 text-emerald-400" />
                      </div>
                      <CardTitle className="text-2xl text-white">CRM Access</CardTitle>
                      <CardDescription className="text-slate-400">
                        Authenticate to access your CRM workspace
                      </CardDescription>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <CardTitle className="text-2xl text-white">Welcome Back</CardTitle>
                      <CardDescription className="text-slate-400">
                        Sign in to your Zopkit account
                      </CardDescription>
                    </div>
                  </>
                )}
              </CardHeader>

              <CardContent className="space-y-5">
                {/* Google Sign In Button */}
                <Button 
                  onClick={handleLogin}
                  disabled={isLoggingIn}
                  className={`w-full h-11 font-semibold text-base rounded-lg transition-all relative group overflow-hidden ${
                    isCrmRequest 
                      ? 'bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700' 
                      : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700'
                  } ${isLoggingIn ? 'opacity-80 cursor-not-allowed' : 'shadow-lg shadow-blue-600/30'}`}
                >
                  <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <div className="relative flex items-center justify-center">
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </div>
                </Button>

                {/* Divider */}
                <div className="flex items-center space-x-3">
                  <div className="flex-1 h-px bg-gradient-to-r from-white/0 to-white/20"></div>
                  <span className="text-xs text-slate-500 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-white/0 to-white/20"></div>
                </div>

                {/* Trust Badges */}
                <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">Secure Login</p>
                      <p className="text-xs text-slate-400">Protected by industry-standard authentication</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">SOC 2 Type II</p>
                      <p className="text-xs text-slate-400">Compliance certified enterprise platform</p>
                    </div>
                  </div>
                </div>

                {/* Organization Info - Only show if authenticated */}
                {isAuthenticated && currentOrg && (
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border border-blue-500/30 space-y-3">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                      <span className="text-sm font-semibold text-white">Authentication Verified</span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-slate-300">
                        <span className="text-slate-500">Email:</span> {user?.email}
                      </p>
                      <p className="text-slate-300">
                        <span className="text-slate-500">Organization:</span> {currentOrg.orgName}
                      </p>
                      {userOrgs?.orgCodes?.length > 1 && (
                        <p className="text-slate-300">
                          <span className="text-slate-500">Teams:</span> Access to {userOrgs.orgCodes.length} organizations
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* CRM Return Info */}
                {isCrmRequest && returnTo && (
                  <div className="p-3 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-xs">
                    <p className="text-emerald-300 font-medium">
                      ✓ You will be securely redirected to your CRM after authentication
                    </p>
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-600/10 border border-red-500/30 text-xs">
                    <p className="text-red-300 font-medium">
                      Authentication Error: {decodeURIComponent(error)}
                    </p>
                  </div>
                )}

                {/* Back to CRM Button */}
                {isCrmRequest && (
                  <Button
                    onClick={handleBackToCRM}
                    variant="outline"
                    className="w-full bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to CRM
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/40 backdrop-blur-sm py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-2 text-sm text-slate-400">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>256-bit SSL Encrypted</span>
              <span className="text-slate-600">•</span>
              <span>SOC 2 Type II Compliant</span>
              <span className="text-slate-600">•</span>
              <span>GDPR Ready</span>
            </div>
            <div className="flex items-center space-x-4 text-sm">
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
              <span className="text-slate-600">•</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              <span className="text-slate-600">•</span>
              <a href="#" className="text-slate-400 hover:text-white transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}