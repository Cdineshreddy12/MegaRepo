import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Typography from "@/components/common/Typography";
import { UserX, LogOut } from "lucide-react";
import { authService } from "@/services/api/authService";
import { useNavigate } from "react-router-dom";

const UserDeletedPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Clear all authentication data when user is deleted
    authService.logout();
    
    // Clear any remaining session data
    localStorage.clear();
    sessionStorage.clear();
  }, []);

  const handleLogout = () => {
    // Clear all authentication data
    authService.logout();
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to login/home (updated for subdomain structure)
    window.location.href = '/';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-red-50 to-white px-4 text-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-red-100 p-6">
          <UserX className="w-16 h-16 text-red-600" />
        </div>
        
        <Typography variant="h1" className="text-gray-900">
          Account Removed
        </Typography>
        
        <Typography variant="body1" className="text-gray-600 max-w-md">
          Your user account has been removed from the system. You no longer have access to this application.
        </Typography>
        
        <Typography variant="caption" className="text-gray-500 max-w-md mt-2">
          If you believe this is an error, please contact your system administrator.
        </Typography>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Button
          onClick={handleLogout}
          variant="default"
          className="min-w-[200px]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Return to Login
        </Button>
      </div>
    </div>
  );
};

export default UserDeletedPage;

