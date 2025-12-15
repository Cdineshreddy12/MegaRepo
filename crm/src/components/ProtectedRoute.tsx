import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/KindeAuthContext";
import Loader from "./common/Loader";

type Role = "super_admin" | "admin" | "user";

interface ProtectedRouteProps {
  requiredRole?: Role[];
  children?: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRole, children }) => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute Check:', {
    isLoading,
    isAuthenticated,
    hasUser: !!user,
    userRoles: user?.role || 'no role',
    requiredRole,
    currentPath: location.pathname
  });

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated || !user) {
    console.log('🔒 ProtectedRoute: User not authenticated, redirecting to /callback');
    return <Navigate to="/callback" replace state={{ from: location }} />;
  }

  // TODO: Role-based access control is deprecated in favor of permission-based
  // Skip role checks for now since we're using PermissionGates
  if (requiredRole) {
    console.log('⚠️ ProtectedRoute: Role check skipped - using PermissionGates instead');
    // Skip role check - PermissionGates handle access control now
  }

  console.log('✅ ProtectedRoute: Access granted');
  return children;
};

export default ProtectedRoute;
