import React, { useEffect } from "react"
import { Button } from "@/components/ui/button"
import useRedirect from "@/hooks/useRedirect"
import Typography from "@/components/common/Typography"
import { Lock, LogIn } from "lucide-react"
import { authService } from "@/services/api/authService"
import { useAuth } from "@/contexts/KindeAuthContext"

const UnauthorizedPage: React.FC = () => {
  const redirect = useRedirect()
  const { login } = useAuth()

  useEffect(() => {
    // Clear any invalid tokens when showing unauthorized page
    const crmToken = localStorage.getItem('crm_token');
    const kindeToken = localStorage.getItem('token');
    const sessionToken = sessionStorage.getItem('kinde_token');
    
    // If no tokens exist, clear everything
    if (!crmToken && !kindeToken && !sessionToken) {
      authService.logout();
      localStorage.clear();
      sessionStorage.clear();
    }
  }, []);

  const handleLogin = () => {
    // Clear all auth data first
    authService.logout();
    localStorage.clear();
    sessionStorage.clear();
    
    // Trigger Kinde login flow
    console.log('🔐 Initiating login from unauthorized page');
    login();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-red-50 to-white px-4 text-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-red-100 p-6">
          <Lock className="w-16 h-16 text-red-600" />
        </div>
        
        <Typography variant="h1" className="text-gray-900">
          Unauthorized Access
        </Typography>
        
        <Typography variant="body1" className="text-gray-600 max-w-md">
          You are not authorized to access this application. Please log in with valid credentials.
        </Typography>
        
        <Typography variant="caption" className="text-gray-500 max-w-md mt-2">
          If you believe this is an error, please contact your system administrator.
        </Typography>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Button
          onClick={handleLogin}
          variant="default"
          className="min-w-[200px]"
        >
          <LogIn className="w-4 h-4 mr-2" />
          Go to Login
        </Button>
        
        <Button
          onClick={() => redirect.back()}
          variant="outline"
          className="min-w-[200px]"
        >
          Go Back
        </Button>
      </div>
    </div>
  )
}

export default UnauthorizedPage
