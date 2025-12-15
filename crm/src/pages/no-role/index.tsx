import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import Typography from "@/components/common/Typography";
import { ShieldX, LogOut, Mail } from "lucide-react";
import { authService } from "@/services/api/authService";

const NoRolePage: React.FC = () => {
  useEffect(() => {
    // Clear any invalid session data
    const sessionData = localStorage.getItem('userSession');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        // Keep user info but clear invalid session
        console.log('User has no role assigned');
      } catch (e) {
        // Invalid session data
      }
    }
  }, []);

  const handleLogout = () => {
    // Clear all authentication data
    authService.logout();
    localStorage.clear();
    sessionStorage.clear();
    
    // Redirect to home/login (updated for subdomain structure)
    window.location.href = '/';
  };

  const handleContactAdmin = () => {
    // Open email client or copy email
    const email = 'admin@example.com'; // Replace with actual admin email
    window.location.href = `mailto:${email}?subject=Role Assignment Request&body=Please assign a role to my account.`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-white via-yellow-50 to-white px-4 text-center gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-yellow-100 p-6">
          <ShieldX className="w-16 h-16 text-yellow-600" />
        </div>
        
        <Typography variant="h1" className="text-gray-900">
          No Role Assigned
        </Typography>
        
        <Typography variant="body1" className="text-gray-600 max-w-md">
          Your account does not have any role assigned. You need a role to access this application.
        </Typography>
        
        <Typography variant="caption" className="text-gray-500 max-w-md mt-2">
          Please contact your system administrator to assign a role to your account.
        </Typography>
      </div>

      <div className="flex flex-col gap-3 mt-4">
        <Button
          onClick={handleContactAdmin}
          variant="default"
          className="min-w-[200px]"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contact Administrator
        </Button>
        
        <Button
          onClick={handleLogout}
          variant="outline"
          className="min-w-[200px]"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </div>
  );
};

export default NoRolePage;

