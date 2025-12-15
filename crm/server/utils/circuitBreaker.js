/**
 * Circuit Breaker Implementation
 * 
 * Prevents cascading failures by opening the circuit after consecutive failures.
 * Implements three states: CLOSED, OPEN, HALF_OPEN
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.successThreshold = options.successThreshold || 2;
    this.timeout = options.timeout || 30000; // Time before attempting to close circuit
    this.resetTimeout = options.resetTimeout || 60000; // Time before resetting failure count

    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;
    this.lastFailureTime = null;
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Async function to execute
   * @returns {Promise} Result of the function execution
   */
  async execute(fn) {
    // Check if circuit should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('🔄 Circuit breaker transitioning to HALF_OPEN');
      } else {
        const error = new Error('Circuit breaker is OPEN');
        error.code = 'CIRCUIT_BREAKER_OPEN';
        throw error;
      }
    }

    try {
      // Execute the function with timeout
      const result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Circuit breaker timeout')), this.timeout)
        )
      ]);

      // Success - reset failure count
      this.onSuccess();
      return result;
    } catch (error) {
      // Failure - increment failure count
      this.onFailure();
      
      // Re-throw the original error
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  onSuccess() {
    this.failureCount = 0;
    this.lastFailureTime = null;

    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED';
        this.successCount = 0;
        console.log('✅ Circuit breaker CLOSED - service is healthy');
      }
    }
  }

  /**
   * Handle failed execution
   */
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // If we fail in HALF_OPEN, go back to OPEN
      this.state = 'OPEN';
      this.successCount = 0;
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log('❌ Circuit breaker OPEN - service is unhealthy');
    } else if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
      // Transition from CLOSED to OPEN
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.resetTimeout;
      console.log('❌ Circuit breaker OPEN - too many failures');
    }
  }

  /**
   * Get current state
   */
  getState() {
    return this.state;
  }

  /**
   * Manually reset the circuit breaker
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = null;
    this.lastFailureTime = null;
  }
}

export default CircuitBreaker;

