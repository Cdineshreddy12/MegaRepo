import { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useKindeAuth } from '@kinde-oss/kinde-auth-react';
import AnimatedLoader from '@/components/common/AnimatedLoader';

interface PermissionGuardProps {
    children: ReactNode;
    requiredPermission: string;
    fallbackPath?: string;
}

/**
 * PermissionGuard - Protects routes based on Kinde permissions
 * 
 * Usage:
 * <PermissionGuard requiredPermission="admin:dashboard:view">
 *   <AdminDashboard />
 * </PermissionGuard>
 * 
 * Configure permissions in Kinde Dashboard:
 * 1. Go to Settings > Permissions
 * 2. Create permission with key: "admin:dashboard:view"
 * 3. Assign to appropriate roles
 * 4. Assign roles to users
 */
export function PermissionGuard({
    children,
    requiredPermission,
    fallbackPath = '/dashboard'
}: PermissionGuardProps) {
    const { isLoading, isAuthenticated, getPermission, getPermissions } = useKindeAuth();
    const [permissionChecked, setPermissionChecked] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);

    useEffect(() => {
        async function checkPermission() {
            if (!isAuthenticated || isLoading) {
                return;
            }

            try {
                // getPermissions() returns a Promise, so we need to await it
                const allPermissions = await getPermissions();

                console.log('🔍 All Kinde Permissions:', allPermissions);

                // Handle different permission formats from Kinde
                let hasRequiredPermission = false;

                if (allPermissions?.permissions) {
                    // Check if permissions is an array of strings
                    if (Array.isArray(allPermissions.permissions) && allPermissions.permissions.length > 0) {
                        if (typeof allPermissions.permissions[0] === 'string') {
                            // Format: permissions: ['company:admin:access', ...]
                            hasRequiredPermission = allPermissions.permissions.includes(requiredPermission);
                        } else {
                            // Format: permissions: [{ key: 'company:admin:access', isGranted: true }, ...]
                            hasRequiredPermission = allPermissions.permissions.some(
                                (p: any) => p.key === requiredPermission && p.isGranted === true
                            );
                        }
                    }
                }

                console.log('🔍 PermissionGuard Debug:', {
                    requiredPermission,
                    allPermissions: allPermissions?.permissions,
                    permissionFormat: typeof allPermissions?.permissions?.[0],
                    hasRequiredPermission,
                    matchingPermission: allPermissions?.permissions?.find((p: any) =>
                        typeof p === 'string' ? p === requiredPermission : p.key === requiredPermission
                    )
                });

                setHasPermission(hasRequiredPermission);
                setPermissionChecked(true);

                if (!hasRequiredPermission) {
                    console.warn(`❌ Access denied: Missing permission "${requiredPermission}"`);
                    console.log('💡 Troubleshooting steps:');
                    console.log('1. Verify permission exists in Kinde Dashboard: Settings > Permissions');
                    console.log('2. Check permission key matches exactly:', requiredPermission);
                    console.log('3. Ensure permission is assigned to user via role or directly');
                    console.log('4. **IMPORTANT**: Log out and log back in to refresh permissions');
                    console.log('5. Clear browser cache if issue persists');
                } else {
                    console.log('✅ Permission granted:', requiredPermission);
                }
            } catch (error) {
                console.error('Error checking permission:', error);
                setHasPermission(false);
                setPermissionChecked(true);
            }
        }

        checkPermission();
    }, [isAuthenticated, isLoading, requiredPermission, getPermission, getPermissions]);

    // Show loading while checking authentication or permissions
    if (isLoading || !permissionChecked) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <AnimatedLoader size="md" className="mb-6" />
                    <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
                        Checking permissions...
                    </p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Redirect to fallback if permission denied
    if (!hasPermission) {
        return <Navigate to={fallbackPath} replace />;
    }

    // User has permission, render children
    return <>{children}</>;
}

/**
 * Multiple Permission Guard - Requires ALL permissions
 */
interface MultiPermissionGuardProps {
    children: ReactNode;
    requiredPermissions: string[];
    fallbackPath?: string;
}

export function MultiPermissionGuard({
    children,
    requiredPermissions,
    fallbackPath = '/dashboard'
}: MultiPermissionGuardProps) {
    const { isLoading, isAuthenticated, getPermissions } = useKindeAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <AnimatedLoader size="md" className="mb-6" />
                    <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
                        Checking permissions...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check all required permissions
    const permissions = getPermissions();
    const hasAllPermissions = requiredPermissions.every(
        perm => permissions?.permissions?.some(p => p.key === perm && p.isGranted)
    );

    if (!hasAllPermissions) {
        console.warn(`Access denied: Missing one or more permissions`, requiredPermissions);
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
}

/**
 * Any Permission Guard - Requires AT LEAST ONE permission
 */
interface AnyPermissionGuardProps {
    children: ReactNode;
    requiredPermissions: string[];
    fallbackPath?: string;
}

export function AnyPermissionGuard({
    children,
    requiredPermissions,
    fallbackPath = '/dashboard'
}: AnyPermissionGuardProps) {
    const { isLoading, isAuthenticated, getPermissions } = useKindeAuth();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <div className="text-center">
                    <AnimatedLoader size="md" className="mb-6" />
                    <p className="text-gray-600 dark:text-gray-300 text-base font-medium">
                        Checking permissions...
                    </p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Check if user has at least one of the required permissions
    const permissions = getPermissions();
    const hasAnyPermission = requiredPermissions.some(
        perm => permissions?.permissions?.some(p => p.key === perm && p.isGranted)
    );

    if (!hasAnyPermission) {
        console.warn(`Access denied: Missing all permissions`, requiredPermissions);
        return <Navigate to={fallbackPath} replace />;
    }

    return <>{children}</>;
}
