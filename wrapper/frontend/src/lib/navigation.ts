import { NavigateOptions } from 'react-router-dom';

/**
 * Navigation utility to replace window.location usage
 * Provides consistent client-side navigation across the app
 */
export class NavigationService {
  private static navigate: ((to: string, options?: NavigateOptions) => void) | null = null;

  /**
   * Initialize the navigation service with React Router's navigate function
   */
  static initialize(navigate: (to: string, options?: NavigateOptions) => void) {
    this.navigate = navigate;
  }

  /**
   * Navigate to a route (replaces window.location.href)
   */
  static goTo(path: string, options?: NavigateOptions) {
    if (this.navigate) {
      this.navigate(path, options);
    } else {
      // Fallback to window.location if navigate is not initialized
      window.location.href = path;
    }
  }

  /**
   * Navigate to billing page with query parameters
   */
  static goToBilling(query?: string) {
    const path = query ? `/billing?${query}` : '/billing';
    this.goTo(path);
  }

  /**
   * Navigate to dashboard
   */
  static goToDashboard() {
    this.goTo('/dashboard');
  }

  /**
   * Navigate to login
   */
  static goToLogin() {
    this.goTo('/login');
  }

  /**
   * Navigate to organization dashboard
   */
  static goToOrganization(orgCode: string, subPath?: string) {
    const path = subPath ? `/org/${orgCode}/${subPath}` : `/org/${orgCode}`;
    this.goTo(path);
  }

  /**
   * Navigate to analytics
   */
  static goToAnalytics(orgCode?: string) {
    if (orgCode) {
      this.goTo(`/org/${orgCode}/analytics`);
    } else {
      this.goTo('/dashboard/analytics');
    }
  }

  /**
   * Navigate to users management
   */
  static goToUsers(orgCode?: string) {
    if (orgCode) {
      this.goTo(`/org/${orgCode}/users`);
    } else {
      this.goTo('/dashboard/users');
    }
  }

  /**
   * Navigate to user application management
   */
  static goToUserApps(orgCode?: string) {
    if (orgCode) {
      this.goTo(`/org/${orgCode}/user-application-management`);
    } else {
      this.goTo('/dashboard/user-application-management');
    }
  }

  /**
   * Navigate to billing with specific actions
   */
  static goToBillingPurchase() {
    this.goToBilling('purchase=true');
  }

  static goToBillingHistory() {
    this.goToBilling('history=true');
  }

  static goToBillingRenew() {
    this.goToBilling('renew=true');
  }

  static goToBillingUpgrade() {
    this.goToBilling('upgrade=true');
  }

  /**
   * Navigate to external URL (use sparingly)
   */
  static goToExternal(url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  /**
   * Refresh current page data without full reload
   * Use this instead of window.location.reload()
   */
  static refresh() {
    // This should trigger a re-render or data refresh
    // Implementation depends on your state management
    window.location.reload(); // Fallback for now
  }

  /**
   * Get current pathname (replaces window.location.pathname)
   */
  static getCurrentPath(): string {
    return window.location.pathname;
  }

  /**
   * Get current search params (replaces window.location.search)
   */
  static getCurrentSearch(): string {
    return window.location.search;
  }

  /**
   * Get current origin (replaces window.location.origin)
   */
  static getCurrentOrigin(): string {
    return window.location.origin;
  }
}

/**
 * Hook to use navigation service in components
 */
export function useNavigation() {
  return NavigationService;
}
