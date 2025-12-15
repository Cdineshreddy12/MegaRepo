/**
 * Utility functions for safely parsing JWT tokens
 * Handles various edge cases and malformed tokens gracefully
 */

export interface JWTPayload {
  [key: string]: any;
}

/**
 * Safely decodes a JWT token payload without throwing atob errors
 * @param token - The JWT token to decode
 * @returns The decoded payload or null if decoding fails
 */
export function safeDecodeJWT(token: string): JWTPayload | null {
  try {
    // Validate token format
    if (!token || typeof token !== 'string') {
      console.warn('⚠️ Invalid token format');
      return null;
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('⚠️ Token is not in JWT format (header.payload.signature)');
      return null;
    }

    const payloadPart = parts[1];
    
    // Handle URL-safe Base64 (replace - with + and _ with /)
    let safePayload = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    
    // Add padding if needed for Base64 decoding
    const paddedPayload = safePayload + '='.repeat((4 - safePayload.length % 4) % 4);
    
    // Validate Base64 string before decoding
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(paddedPayload)) {
      console.warn('⚠️ Invalid Base64 characters in token payload');
      return null;
    }

    try {
      // Try standard atob first
      const decoded = atob(paddedPayload);
      return JSON.parse(decoded);
    } catch (atobError) {
      console.warn('⚠️ Standard atob failed, trying alternative method:', atobError);
      
      // Try alternative decoding method for malformed tokens
      try {
        const decoded = decodeURIComponent(escape(atob(paddedPayload)));
        return JSON.parse(decoded);
      } catch (altError) {
        console.warn('⚠️ Alternative decoding also failed:', altError);
        return null;
      }
    }
  } catch (error) {
    console.error('❌ Error decoding JWT token:', error);
    return null;
  }
}

/**
 * Extracts organization ID from JWT token payload
 * @param token - The JWT token
 * @returns The organization ID or null if not found
 */
export function extractOrgIdFromToken(token: string): string | null {
  const payload = safeDecodeJWT(token);
  if (!payload) return null;
  
  // Try various possible field names for organization ID
  const orgId = payload.org_code || 
                payload.organization || 
                payload.org_id || 
                payload.tenant_id || 
                payload.tenantId ||
                payload.sub;
                
  return orgId || null;
}

/**
 * Extracts user ID from JWT token payload
 * @param token - The JWT token
 * @returns The user ID or null if not found
 */
export function extractUserIdFromToken(token: string): string | null {
  const payload = safeDecodeJWT(token);
  if (!payload) return null;
  
  return payload.sub || payload.user_id || payload.userId || null;
}

/**
 * Checks if a JWT token is expired
 * @param token - The JWT token
 * @returns True if token is expired, false otherwise
 */
export function isTokenExpired(token: string): boolean {
  const payload = safeDecodeJWT(token);
  if (!payload) return true;
  
  const exp = payload.exp;
  if (!exp) return true;
  
  // exp is in seconds, Date.now() is in milliseconds
  return Date.now() >= exp * 1000;
}

/**
 * Gets token expiration time as Date object
 * @param token - The JWT token
 * @returns Date object or null if no expiration
 */
export function getTokenExpiration(token: string): Date | null {
  const payload = safeDecodeJWT(token);
  if (!payload || !payload.exp) return null;
  
  return new Date(payload.exp * 1000);
}

/**
 * Validates JWT token structure and basic format
 * @param token - The JWT token to validate
 * @returns True if token appears valid, false otherwise
 */
export function isValidJWTFormat(token: string): boolean {
  try {
    if (!token || typeof token !== 'string') return false;
    
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    
    // Check if all parts are non-empty
    if (parts.some(part => !part)) return false;
    
    // Basic Base64 validation for header and payload
    const header = parts[0];
    const payload = parts[1];
    
    // Check if they contain only valid Base64 characters
    const validBase64Regex = /^[A-Za-z0-9+/_-]*$/;
    if (!validBase64Regex.test(header) || !validBase64Regex.test(payload)) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}
