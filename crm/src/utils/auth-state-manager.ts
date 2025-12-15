/**
 * Authentication State Manager
 * Prevents race conditions and infinite loops by managing authentication state globally
 */

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  hasToken: boolean;
  lastAuthCheck: number;
  authAttempts: number;
  isRecovering: boolean;
}

class AuthStateManager {
  private state: AuthState = {
    isAuthenticated: false,
    isLoading: false,
    hasToken: false,
    lastAuthCheck: 0,
    authAttempts: 0,
    isRecovering: false
  };

  private listeners: Set<(state: AuthState) => void> = new Set();
  private maxAuthAttempts = 3;
  private authTimeout = 10000; // 10 seconds

  /**
   * Get current authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Update authentication state
   */
  updateState(updates: Partial<AuthState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    
    // Log state changes for debugging
    console.log('🔄 Auth State Updated:', {
      from: oldState,
      to: this.state,
      timestamp: new Date().toISOString()
    });

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Check if we're in an infinite loop
   */
  isInfiniteLoop(): boolean {
    const now = Date.now();
    const timeSinceLastCheck = now - this.state.lastAuthCheck;
    
    // If too many auth attempts in short time, we're in a loop
    if (this.state.authAttempts >= this.maxAuthAttempts && timeSinceLastCheck < this.authTimeout) {
      console.error('🚨 INFINITE LOOP DETECTED by AuthStateManager');
      return true;
    }
    
    return false;
  }

  /**
   * Record an authentication attempt
   */
  recordAuthAttempt(): void {
    const now = Date.now();
    const timeSinceLastCheck = now - this.state.lastAuthCheck;
    
    // Reset attempts if enough time has passed
    if (timeSinceLastCheck > this.authTimeout) {
      this.state.authAttempts = 0;
    }
    
    this.state.authAttempts++;
    this.state.lastAuthCheck = now;
    
    console.log('📝 Auth attempt recorded:', {
      attempt: this.state.authAttempts,
      maxAttempts: this.maxAuthAttempts,
      timeSinceLastCheck
    });
  }

  /**
   * Reset authentication state (for recovery)
   */
  resetState(): void {
    console.log('🔄 Resetting authentication state for recovery...');
    this.state = {
      isAuthenticated: false,
      isLoading: false,
      hasToken: false,
      lastAuthCheck: 0,
      authAttempts: 0,
      isRecovering: true
    };
    this.notifyListeners();
  }

  /**
   * Clear recovery state
   */
  clearRecovery(): void {
    this.state.isRecovering = false;
    this.notifyListeners();
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getState());
      } catch (error) {
        console.error('❌ Error in auth state listener:', error);
      }
    });
  }

  /**
   * Get authentication health status
   */
  getHealthStatus(): 'healthy' | 'warning' | 'critical' {
    if (this.isInfiniteLoop()) {
      return 'critical';
    }
    
    if (this.state.authAttempts >= this.maxAuthAttempts * 0.8) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * Force break infinite loop
   */
  forceBreakLoop(): void {
    console.log('🚨 Force breaking infinite loop...');
    
    // Clear all state
    this.resetState();
    
    // Clear browser storage that might be causing loops
    try {
      localStorage.removeItem('callback_count');
      localStorage.removeItem('last_callback_time');
      localStorage.removeItem('crm_redirect_count');
      localStorage.removeItem('crm_last_redirect');
      sessionStorage.removeItem('intendedPath');
      sessionStorage.removeItem('jwt_token_callback');
      sessionStorage.removeItem('jwt_token_value');
    } catch (error) {
      console.warn('⚠️ Could not clear some storage:', error);
    }
  }
}

// Create global instance
export const authStateManager = new AuthStateManager();

// Export for use in components
export default authStateManager;
