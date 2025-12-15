import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { NavigationService } from '../lib/navigation';

/**
 * Custom hook for navigation that replaces window.location usage
 */
export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize the navigation service
  useEffect(() => {
    NavigationService.initialize(navigate);
  }, [navigate]);

  return {
    // Direct navigation methods
    goTo: (path: string, options?: { replace?: boolean; state?: any }) => {
      NavigationService.goTo(path, options);
    },

    // Specific navigation methods
    goToBilling: (query?: string) => NavigationService.goToBilling(query),
    goToDashboard: () => NavigationService.goToDashboard(),
    goToLogin: () => NavigationService.goToLogin(),
    goToOrganization: (orgCode: string, subPath?: string) => 
      NavigationService.goToOrganization(orgCode, subPath),
    goToAnalytics: (orgCode?: string) => NavigationService.goToAnalytics(orgCode),
    goToUsers: (orgCode?: string) => NavigationService.goToUsers(orgCode),
    goToUserApps: (orgCode?: string) => NavigationService.goToUserApps(orgCode),

    // Billing specific methods
    goToBillingPurchase: () => NavigationService.goToBillingPurchase(),
    goToBillingHistory: () => NavigationService.goToBillingHistory(),
    goToBillingRenew: () => NavigationService.goToBillingRenew(),
    goToBillingUpgrade: () => NavigationService.goToBillingUpgrade(),

    // External navigation
    goToExternal: (url: string) => NavigationService.goToExternal(url),

    // Refresh methods
    refresh: () => NavigationService.refresh(),

    // Current location info
    getCurrentPath: () => NavigationService.getCurrentPath(),
    getCurrentSearch: () => NavigationService.getCurrentSearch(),
    getCurrentOrigin: () => NavigationService.getCurrentOrigin(),

    // React Router location
    location,
  };
}
