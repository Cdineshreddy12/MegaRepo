import React, { useEffect, useState } from 'react'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function AuthCallback() {
  const { isLoading, isAuthenticated, error, getToken } = useKindeAuth()
  const navigate = useNavigate()
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const handleCallback = async () => {
      if (isLoading || processing) return

      try {
        // Check for CRM-specific state parameters
        const urlParams = new URLSearchParams(window.location.search)
        const stateParam = urlParams.get('state')
        
        console.log('🔍 AuthCallback: Current URL:', window.location.href)
        console.log('🔍 AuthCallback: URL search params:', window.location.search)
        console.log('🔍 AuthCallback: Raw state param:', stateParam)
        
        if (stateParam) {
          try {
            const stateData = JSON.parse(stateParam)
            console.log('🔍 AuthCallback: Parsed state data:', stateData)
            
            // Check if this is a CRM authentication flow
            if (stateData.app_code && stateData.redirect_url) {
              console.log('🔄 AuthCallback: Processing CRM authentication flow')

              // Check if there are errors in the state data
              if (stateData.error) {
                console.log('❌ AuthCallback: Error in CRM authentication flow:', stateData.error)
                setProcessing(true)

                // Redirect to CRM with error
                const errorUrl = new URL(stateData.redirect_url)
                errorUrl.searchParams.set('error', stateData.error)
                errorUrl.searchParams.set('error_description', stateData.error_description || 'Authentication failed')
                errorUrl.searchParams.set('app_code', stateData.app_code)

                console.log('🚀 AuthCallback: Redirecting to CRM with error:', errorUrl.toString())
                window.location.href = errorUrl.toString()
                return
              }

              setProcessing(true)

              // Get the token from Kinde
              const token = await getToken()

                             if (token) {
                 // Validate token and get user context using backend
                 const backendUrl = 'https://wrapper.zopkit.com'
                 const response = await fetch(`${backendUrl}/auth/validate`, {
                   method: 'POST',
                   headers: {
                     'Content-Type': 'application/json',
                   },
                   body: JSON.stringify({
                     token,
                     app_code: stateData.app_code
                   }),
                 })

                 if (response.ok) {
                   const validation = await response.json()

                   if (validation.success) {
                     // Generate app-specific token
                     const appTokenResponse = await fetch(`${backendUrl}/auth/generate-app-token`, {
                       method: 'POST',
                       headers: {
                         'Content-Type': 'application/json',
                       },
                       body: JSON.stringify({
                         token,
                         app_code: stateData.app_code
                       }),
                     })

                     if (appTokenResponse.ok) {
                       const appTokenData = await appTokenResponse.json()

                       // Redirect to CRM with token
                       const redirectUrl = new URL(stateData.redirect_url)
                       redirectUrl.searchParams.set('token', appTokenData.token)
                       redirectUrl.searchParams.set('expires_at', appTokenData.expiresAt)
                       redirectUrl.searchParams.set('app_code', stateData.app_code)

                       console.log('🚀 AuthCallback: Redirecting to CRM:', redirectUrl.toString())
                       window.location.href = redirectUrl.toString()
                       return
                     }
                   }
                 }

                 console.error('❌ AuthCallback: Failed to validate or generate app token')
               }
            }
          } catch (parseError) {
            console.error('❌ AuthCallback: Failed to parse state data:', parseError)
          }
        }
        
        // If not CRM flow or failed, proceed with normal flow
        // Check for onboarding completion with refresh parameter
        const refreshParam = urlParams.get('refresh')
        const onboardingParam = urlParams.get('onboarding')

        console.log('🔄 AuthCallback: Proceeding with normal authentication flow')
        console.log('🔍 AuthCallback: Onboarding param:', onboardingParam, 'Refresh param:', refreshParam)

        if (isAuthenticated) {
          // Check if this is onboarding completion with refresh needed
          if (onboardingParam === 'complete' && refreshParam === 'true') {
            console.log('🔄 AuthCallback: Onboarding completed with refresh needed')

            // Force a page reload to ensure fresh authentication state
            setTimeout(() => {
              console.log('🔄 AuthCallback: Reloading page to refresh authentication state')
              window.location.href = '/dashboard?onboarding=complete'
            }, 1000)
            return
          }

          // Normal flow - redirect to dashboard
          if (onboardingParam === 'complete') {
            navigate('/dashboard?onboarding=complete')
          } else {
            navigate('/dashboard')
          }
        }
        
      } catch (error) {
        console.error('❌ AuthCallback error:', error)
        // On error, redirect to login
        navigate('/login')
      }
    }

    // Small delay to ensure Kinde has processed the callback
    const timer = setTimeout(handleCallback, 1000)
    return () => clearTimeout(timer)
  }, [isLoading, isAuthenticated, error, getToken, navigate, processing])

  if (error) {
    console.error('Kinde auth error:', error)
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-red-900 mb-2">Authentication Error</h2>
          <p className="text-red-700 mb-4">{error.message || 'An error occurred during authentication'}</p>
          <button 
            onClick={() => navigate('/login')}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {processing ? 'Processing CRM authentication...' : 'Completing authentication...'}
        </h2>
        <p className="text-gray-600">
          {processing ? 'Redirecting to your application...' : 'Please wait while we log you in.'}
        </p>
      </div>
    </div>
  )
} 