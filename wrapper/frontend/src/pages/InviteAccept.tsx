import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useKindeAuth } from '@kinde-oss/kinde-auth-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, CheckCircle, AlertTriangle, Users, Building2 } from 'lucide-react'
import { SocialLogin } from '@/components/auth/SocialLogin'
import toast from 'react-hot-toast'
import api from '@/lib/api'

interface InvitationDetails {
  email: string
  organizationName: string
  inviterName: string
  roles: string[]
  message?: string
  orgCode: string
}

export function InviteAccept() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { isAuthenticated, user, isLoading } = useKindeAuth()
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const orgCode = searchParams.get('org')
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitationDetails = async () => {
      // If we have a token, use token-based flow
      if (token) {
        try {
          console.log('🔍 Fetching invitation details by token:', { token })
          
          const response = await api.get('/invitations/details-by-token', {
            params: { token }
          })

          if (response.data.success) {
            setInvitation(response.data.invitation)
          } else {
            setError(response.data.message || 'Failed to load invitation')
          }
          setLoading(false)
        } catch (err: any) {
          console.error('Error fetching invitation by token:', err)
          if (err.response?.status === 404) {
            setError('Invitation not found or has expired')
          } else if (err.response?.status === 410) {
            setError('This invitation has expired')
          } else if (err.response?.status === 409) {
            setError('This invitation has already been accepted')
          } else {
            setError('Unable to load invitation details')
          }
          setLoading(false)
        }
        return
      }

      // Legacy flow with org and email parameters
      if (!orgCode) {
        setError('Invalid invitation link - missing organization or token')
        setLoading(false)
        return
      }

      try {
        console.log('🔍 Fetching invitation details:', { orgCode, email })
        
        const response = await api.get('/invitations/details', {
          params: { org: orgCode, email: email || '' }
        })

        if (response.data.success) {
          setInvitation(response.data.invitation)
        } else {
          setError(response.data.message || 'Failed to load invitation')
        }
        setLoading(false)
      } catch (err: any) {
        console.error('Error fetching invitation:', err)
        if (err.response?.status === 404) {
          setError('Invitation not found or has expired')
        } else {
          setError('Unable to load invitation details')
        }
        setLoading(false)
      }
    }

    fetchInvitationDetails()
  }, [orgCode, email, token])

  // Handle post-authentication invite acceptance
  useEffect(() => {
    if (isAuthenticated && user && invitation && !accepting) {
      console.log('✅ User authenticated with invitation, proceeding to accept...')
      // Add a small delay to ensure auth state is fully settled
      const timer = setTimeout(() => {
        handleAcceptInvitation()
      }, 1000) // Increased delay to ensure auth state is fully settled
      
      return () => clearTimeout(timer)
    }
  }, [isAuthenticated, user, invitation, accepting])

  // Additional effect to handle authentication state changes
  useEffect(() => {
    if (isAuthenticated && user && !invitation && token) {
      console.log('🔄 User authenticated but invitation not loaded, refetching...')
      // User just authenticated, refetch invitation details
      const fetchInvitationDetails = async () => {
        try {
          const response = await api.get('/invitations/details-by-token', {
            params: { token }
          })

          if (response.data.success) {
            setInvitation(response.data.invitation)
          } else {
            setError(response.data.message || 'Failed to load invitation')
          }
        } catch (err: any) {
          console.error('Error refetching invitation after auth:', err)
          setError('Failed to load invitation details after authentication')
        }
      }
      
      fetchInvitationDetails()
    }
  }, [isAuthenticated, user, token])

  // Store invitation context in localStorage to preserve it during authentication
  useEffect(() => {
    if (token) {
      localStorage.setItem('pendingInvitationToken', token)
      console.log('💾 Stored invitation token in localStorage:', token)
    }
    
    // Cleanup on unmount
    return () => {
      if (token) {
        localStorage.removeItem('pendingInvitationToken')
        console.log('🧹 Cleaned up invitation token from localStorage')
      }
    }
  }, [token])

  // Check for pending invitation on mount
  useEffect(() => {
    const pendingToken = localStorage.getItem('pendingInvitationToken')
    if (pendingToken && !token) {
      console.log('🔄 Found pending invitation token in localStorage:', pendingToken)
      // Redirect back to invitation acceptance with the stored token
      navigate(`/invite/accept?token=${pendingToken}`, { replace: true })
    }
  }, [token, navigate])

  const handleAcceptInvitation = async () => {
    if (!invitation || !user) {
      console.log('❌ Cannot accept invitation:', { hasInvitation: !!invitation, hasUser: !!user })
      return
    }

    console.log('🚀 Starting invitation acceptance process...', {
      invitation: invitation,
      user: user,
      token: token
    })

    setAccepting(true)
    try {
      // Use token-based acceptance if we have a token
      if (token) {
        console.log('✅ Accepting invitation by token:', { 
          token, 
          kindeUserId: user.id 
        })
        
        const response = await api.post('/invitations/accept-by-token', {
          token,
          kindeUserId: user.id
        })

        console.log('✅ Invitation acceptance response:', response.data)

        if (response.data.success) {
          toast.success(`Welcome to ${invitation.organizationName}!`)
          
          // INVITED USERS: Always redirect to dashboard (they skip onboarding)
          // The backend ensures onboardingCompleted=true for invited users
          console.log('🎉 Invitation accepted successfully, redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard?welcome=true&invited=true')
          }, 1500)
        } else {
          throw new Error(response.data.message || 'Failed to accept invitation')
        }
      } else {
        // Legacy org/email based acceptance
        console.log('✅ Accepting invitation:', { 
          org: invitation.orgCode, 
          email: invitation.email, 
          kindeUserId: user.id 
        })
        
        const response = await api.post('/invitations/accept', {
          org: invitation.orgCode,
          email: invitation.email,
          kindeUserId: user.id
        })

        console.log('✅ Invitation acceptance response:', response.data)

        if (response.data.success) {
          toast.success(`Welcome to ${invitation.organizationName}!`)
          
          // INVITED USERS: Always redirect to dashboard (they skip onboarding)
          // The backend ensures onboardingCompleted=true for invited users
          console.log('🎉 Invitation accepted successfully, redirecting to dashboard...')
          setTimeout(() => {
            navigate('/dashboard?welcome=true&invited=true')
          }, 1500)
        } else {
          throw new Error(response.data.message || 'Failed to accept invitation')
        }
      }
    } catch (err: any) {
      console.error('❌ Error accepting invitation:', err)
      if (err.response?.status === 409) {
        toast.error('This invitation has already been accepted')
        setTimeout(() => {
          navigate('/dashboard')
        }, 1500)
      } else if (err.response?.status === 410) {
        toast.error('This invitation has expired')
        setAccepting(false)
      } else {
        toast.error(err.response?.data?.message || 'Failed to accept invitation. Please try again.')
        setAccepting(false)
      }
    }
  }

  const handleSignIn = () => {
    // If user is already authenticated, just accept the invitation
    if (isAuthenticated && user) {
      handleAcceptInvitation()
      return
    }

    // Otherwise, trigger authentication with the specific org
    // The SocialLogin component will handle this
  }

  const handleDecline = () => {
    toast.error('Invitation declined')
    navigate('/landing')
  }

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-6">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
          <p className="text-lg font-medium text-gray-700">Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="text-center p-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-6">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</CardTitle>
            <CardDescription className="text-gray-600">{error}</CardDescription>
          </CardHeader>
          <CardContent className="px-10 pb-10">
            <Button 
              onClick={() => navigate('/landing')} 
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-blue-500/30"
              variant="default"
            >
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (accepting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
          <CardHeader className="text-center p-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-6">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">Joining Organization</CardTitle>
            <CardDescription className="text-gray-600">Please wait while we set up your access...</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        {/* Modern Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20 mb-6">
            <Users className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3 tracking-tight">Join Your Team</h1>
          <p className="text-lg text-gray-600 font-medium">Sign in to accept your invitation</p>
        </div>

        {/* Authentication Card */}
        {!isAuthenticated ? (
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="p-10">
              <SocialLogin
                orgCode={invitation?.orgCode}
                title=""
                subtitle=""
                providers={['google']}
                onSuccess={() => {
                  toast.success('Welcome! Setting up your account...')
                  // handleAcceptInvitation will be called automatically via useEffect
                }}
                onError={(error) => {
                  toast.error(error)
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden">
            <CardContent className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome back!</h2>
              <p className="text-gray-600 mb-8">
                You're signed in as <strong className="text-gray-900">{user?.email}</strong>
              </p>
              <Button
                onClick={handleAcceptInvitation}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-6 rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200"
                disabled={accepting}
                size="lg"
              >
                {accepting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Joining your team...
                  </>
                ) : (
                  'Join Team'
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Modern Footer */}
        {invitation?.orgCode && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-50 rounded-full">
              <Building2 className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700 font-medium">
                Organization: <strong className="text-blue-900">{invitation.orgCode}</strong>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 