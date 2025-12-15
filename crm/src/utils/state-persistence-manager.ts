/**
 * State Persistence Manager
 * Prevents state loss during redirects and maintains authentication context across page reloads
 */

export interface PersistedState {
  intendedPath: string;
  authContext: {
    source: string;
    timestamp: number;
    returnTo: string;
  };
  userPreferences: {
    theme: string;
    language: string;
    lastVisited: string;
  };
  sessionData: {
    lastActivity: number;
    authAttempts: number;
    recoveryMode: boolean;
  };
}

class StatePersistenceManager {
  private readonly STORAGE_KEY = 'crm_persisted_state';
  private readonly MAX_STATE_AGE = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start cleanup interval
    this.startCleanupInterval();
    
    // Listen for page visibility changes to update last activity
    this.setupActivityTracking();
  }

  /**
   * Save state to persistent storage
   */
  saveState(state: Partial<PersistedState>): void {
    try {
      const currentState = this.loadState();
      const newState = { ...currentState, ...state };
      
      // Add timestamp for state age tracking
      newState.sessionData = {
        ...newState.sessionData,
        lastActivity: Date.now()
      };

      // Save to sessionStorage for immediate access
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));
      
      // Also save to localStorage for persistence across tabs
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newState));

      console.log('💾 State persisted:', {
        keys: Object.keys(state),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.warn('⚠️ Failed to persist state:', error);
    }
  }

  /**
   * Load state from persistent storage
   */
  loadState(): PersistedState {
    try {
      // Try sessionStorage first (faster)
      let stateData = sessionStorage.getItem(this.STORAGE_KEY);
      
      if (!stateData) {
        // Fallback to localStorage
        stateData = localStorage.getItem(this.STORAGE_KEY);
      }

      if (!stateData) {
        return this.getDefaultState();
      }

      const state: PersistedState = JSON.parse(stateData);
      
      // Validate state age
      if (this.isStateExpired(state)) {
        console.log('⏰ Persisted state expired, using default');
        return this.getDefaultState();
      }

      // Update last activity
      state.sessionData.lastActivity = Date.now();
      
      return state;
    } catch (error) {
      console.warn('⚠️ Failed to load persisted state:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Get specific state value
   */
  getStateValue<K extends keyof PersistedState>(key: K): PersistedState[K] {
    const state = this.loadState();
    return state[key];
  }

  /**
   * Update specific state value
   */
  updateStateValue<K extends keyof PersistedState>(key: K, value: PersistedState[K]): void {
    const state = this.loadState();
    state[key] = value;
    this.saveState(state);
  }

  /**
   * Save intended path for post-authentication redirect
   */
  saveIntendedPath(path: string): void {
    console.log('🎯 Saving intended path:', path);
    this.updateStateValue('intendedPath', path);
  }

  /**
   * Get intended path and clear it
   */
  getAndClearIntendedPath(): string | null {
    const intendedPath = this.getStateValue('intendedPath');
    if (intendedPath) {
      console.log('🎯 Retrieved intended path:', intendedPath);
      this.updateStateValue('intendedPath', '');
      return intendedPath;
    }
    return null;
  }

  /**
   * Save authentication context
   */
  saveAuthContext(source: string, returnTo: string): void {
    const authContext = {
      source,
      timestamp: Date.now(),
      returnTo
    };
    
    console.log('🔐 Saving auth context:', authContext);
    this.updateStateValue('authContext', authContext);
  }

  /**
   * Get authentication context
   */
  getAuthContext(): PersistedState['authContext'] | null {
    const context = this.getStateValue('authContext');
    return context.timestamp > 0 ? context : null;
  }

  /**
   * Clear authentication context
   */
  clearAuthContext(): void {
    console.log('🧹 Clearing auth context');
    this.updateStateValue('authContext', {
      source: '',
      timestamp: 0,
      returnTo: ''
    });
  }

  /**
   * Save user preferences
   */
  saveUserPreferences(preferences: Partial<PersistedState['userPreferences']>): void {
    const currentPrefs = this.getStateValue('userPreferences');
    const newPrefs = { ...currentPrefs, ...preferences };
    
    console.log('⚙️ Saving user preferences:', newPrefs);
    this.updateStateValue('userPreferences', newPrefs);
  }

  /**
   * Get user preferences
   */
  getUserPreferences(): PersistedState['userPreferences'] {
    return this.getStateValue('userPreferences');
  }

  /**
   * Update session data
   */
  updateSessionData(updates: Partial<PersistedState['sessionData']>): void {
    const currentData = this.getStateValue('sessionData');
    const newData = { ...currentData, ...updates };
    
    this.updateStateValue('sessionData', newData);
  }

  /**
   * Get session data
   */
  getSessionData(): PersistedState['sessionData'] {
    return this.getStateValue('sessionData');
  }

  /**
   * Check if state is expired
   */
  private isStateExpired(state: PersistedState): boolean {
    const now = Date.now();
    const stateAge = now - state.sessionData.lastActivity;
    return stateAge > this.MAX_STATE_AGE;
  }

  /**
   * Get default state
   */
  private getDefaultState(): PersistedState {
    return {
      intendedPath: '',
      authContext: {
        source: '',
        timestamp: 0,
        returnTo: ''
      },
      userPreferences: {
        theme: 'light',
        language: 'en',
        lastVisited: ''
      },
      sessionData: {
        lastActivity: Date.now(),
        authAttempts: 0,
        recoveryMode: false
      }
    };
  }

  /**
   * Start cleanup interval
   */
  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanupExpiredState();
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Clean up expired state
   */
  private cleanupExpiredState(): void {
    try {
      const state = this.loadState();
      
      if (this.isStateExpired(state)) {
        console.log('🧹 Cleaning up expired state');
        this.clearAllState();
      }
    } catch (error) {
      console.warn('⚠️ State cleanup failed:', error);
    }
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking(): void {
    const updateActivity = () => {
      this.updateSessionData({ lastActivity: Date.now() });
    };

    // Update activity on user interactions
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Update activity on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        updateActivity();
      }
    });
  }

  /**
   * Clear all persisted state
   */
  clearAllState(): void {
    try {
      sessionStorage.removeItem(this.STORAGE_KEY);
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🧹 All persisted state cleared');
    } catch (error) {
      console.warn('⚠️ Failed to clear persisted state:', error);
    }
  }

  /**
   * Export state for debugging
   */
  exportState(): string {
    try {
      const state = this.loadState();
      return JSON.stringify(state, null, 2);
    } catch (error) {
      return 'Failed to export state: ' + error.message;
    }
  }

  /**
   * Import state from string
   */
  importState(stateString: string): boolean {
    try {
      const state = JSON.parse(stateString);
      this.saveState(state);
      console.log('📥 State imported successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to import state:', error);
      return false;
    }
  }
}

// Create global instance
export const statePersistenceManager = new StatePersistenceManager();

// Export for use in components
export default statePersistenceManager;
