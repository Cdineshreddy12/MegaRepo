/**
 * Loop Detection Service
 * Monitors and prevents infinite redirect loops at multiple levels
 */

export interface LoopDetectionConfig {
  maxRedirects: number;
  timeWindow: number;
  maxAuthAttempts: number;
  recoveryDelay: number;
}

export interface LoopEvent {
  type: 'redirect' | 'auth_attempt' | 'callback' | 'error';
  timestamp: number;
  url: string;
  source: string;
  details?: any;
}

class LoopDetectionService {
  private config: LoopDetectionConfig = {
    maxRedirects: 3,
    timeWindow: 10000, // 10 seconds
    maxAuthAttempts: 3,
    recoveryDelay: 5000 // 5 seconds
  };

  private events: LoopEvent[] = [];
  private isRecovering = false;
  private recoveryTimeout: NodeJS.Timeout | null = null;

  /**
   * Record a loop event
   */
  recordEvent(type: LoopEvent['type'], url: string, source: string, details?: any): void {
    const event: LoopEvent = {
      type,
      timestamp: Date.now(),
      url,
      source,
      details
    };

    this.events.push(event);
    
    // Keep only recent events within time window
    const cutoff = Date.now() - this.config.timeWindow;
    this.events = this.events.filter(event => event.timestamp > cutoff);

    console.log('📝 Loop detection event recorded:', event);
    
    // Check for loops
    this.checkForLoops();
  }

  /**
   * Check if we're in a loop
   */
  private checkForLoops(): void {
    if (this.isRecovering) {
      return; // Already recovering
    }

    const now = Date.now();
    const recentEvents = this.events.filter(event => 
      now - event.timestamp < this.config.timeWindow
    );

    // Check for redirect loops
    const redirectEvents = recentEvents.filter(event => event.type === 'redirect');
    if (redirectEvents.length >= this.config.maxRedirects) {
      console.error('🚨 REDIRECT LOOP DETECTED:', {
        count: redirectEvents.length,
        max: this.config.maxRedirects,
        events: redirectEvents
      });
      this.triggerRecovery('redirect_loop');
      return;
    }

    // Check for auth attempt loops
    const authEvents = recentEvents.filter(event => event.type === 'auth_attempt');
    if (authEvents.length >= this.config.maxAuthAttempts) {
      console.error('🚨 AUTH LOOP DETECTED:', {
        count: authEvents.length,
        max: this.config.maxAuthAttempts,
        events: authEvents
      });
      this.triggerRecovery('auth_loop');
      return;
    }

    // Check for callback loops
    const callbackEvents = recentEvents.filter(event => event.type === 'callback');
    if (callbackEvents.length >= this.config.maxRedirects) {
      console.error('🚨 CALLBACK LOOP DETECTED:', {
        count: callbackEvents.length,
        max: this.config.maxRedirects,
        events: callbackEvents
      });
      this.triggerRecovery('callback_loop');
      return;
    }

    // Check for rapid error loops
    const errorEvents = recentEvents.filter(event => event.type === 'error');
    if (errorEvents.length >= this.config.maxRedirects) {
      console.error('🚨 ERROR LOOP DETECTED:', {
        count: errorEvents.length,
        max: this.config.maxRedirects,
        events: errorEvents
      });
      this.triggerRecovery('error_loop');
      return;
    }
  }

  /**
   * Trigger recovery mode
   */
  private triggerRecovery(loopType: string): void {
    if (this.isRecovering) {
      return; // Already recovering
    }

    console.log('🚨 Triggering loop recovery for:', loopType);
    this.isRecovering = true;

    // Clear all loop-related storage
    this.clearLoopStorage();

    // Set recovery timeout
    this.recoveryTimeout = setTimeout(() => {
      this.isRecovering = false;
      console.log('✅ Loop recovery completed');
    }, this.config.recoveryDelay);

    // Dispatch recovery event
    window.dispatchEvent(new CustomEvent('loopRecovery', {
      detail: { loopType, timestamp: Date.now() }
    }));
  }

  /**
   * Clear all loop-related storage
   */
  private clearLoopStorage(): void {
    try {
      // Clear localStorage
      const keysToRemove = [
        'callback_count',
        'last_callback_time',
        'crm_redirect_count',
        'crm_last_redirect',
        'auth_loop_count',
        'redirect_loop_count'
      ];

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear sessionStorage
      const sessionKeysToRemove = [
        'intendedPath',
        'jwt_token_callback',
        'jwt_token_value',
        'lastRedirectTime'
      ];

      sessionKeysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
      });

      console.log('🧹 Cleared loop-related storage');
    } catch (error) {
      console.warn('⚠️ Could not clear some storage:', error);
    }
  }

  /**
   * Check if we're currently recovering
   */
  isInRecovery(): boolean {
    return this.isRecovering;
  }

  /**
   * Force recovery mode
   */
  forceRecovery(): void {
    console.log('🔄 Force triggering loop recovery...');
    this.triggerRecovery('manual_trigger');
  }

  /**
   * Get loop statistics
   */
  getLoopStats(): {
    totalEvents: number;
    recentEvents: number;
    isRecovering: boolean;
    health: 'healthy' | 'warning' | 'critical';
  } {
    const now = Date.now();
    const recentEvents = this.events.filter(event => 
      now - event.timestamp < this.config.timeWindow
    );

    let health: 'healthy' | 'warning' | 'critical' = 'healthy';
    
    if (this.isRecovering) {
      health = 'critical';
    } else if (recentEvents.length >= this.config.maxRedirects * 0.8) {
      health = 'warning';
    }

    return {
      totalEvents: this.events.length,
      recentEvents: recentEvents.length,
      isRecovering: this.isRecovering,
      health
    };
  }

  /**
   * Reset the service (for testing or manual reset)
   */
  reset(): void {
    console.log('🔄 Resetting loop detection service...');
    this.events = [];
    this.isRecovering = false;
    
    if (this.recoveryTimeout) {
      clearTimeout(this.recoveryTimeout);
      this.recoveryTimeout = null;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LoopDetectionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Loop detection config updated:', this.config);
  }
}

// Create global instance
export const loopDetectionService = new LoopDetectionService();

// Export for use in components
export default loopDetectionService;
