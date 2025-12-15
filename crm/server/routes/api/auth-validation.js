import express from 'express';
import jwt from 'jsonwebtoken';
const router = express.Router();

// Middleware to validate Kinde JWT token
const validateKindeToken = async (req, res, next) => {
  try {
    console.log('🔍 Backend: Token validation request received:', {
      method: req.method,
      url: req.url,
      headers: {
        authorization: req.headers.authorization ? 'Bearer [TOKEN]' : 'NOT SET',
        'content-type': req.headers['content-type'],
        origin: req.headers.origin,
        userAgent: req.headers['user-agent']
      }
    });

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Backend: Invalid authorization header:', {
        hasHeader: !!authHeader,
        startsWithBearer: authHeader ? authHeader.startsWith('Bearer ') : false,
        headerLength: authHeader ? authHeader.length : 0
      });
      
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No valid authorization header found'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      console.log('❌ Backend: No token after Bearer prefix');
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'No token provided'
      });
    }

    console.log('🔍 Backend: Token extracted:', {
      tokenLength: token.length,
      tokenPreview: `${token.substring(0, 20)}...`,
      tokenEnd: `${token.substring(token.length - 10)}...`
    });

    // For Kinde tokens, you would typically verify against Kinde's public keys
    // This is a simplified example - in production, implement proper JWT verification
    
    try {
      // Decode the token without verification for now (for development)
      const decoded = jwt.decode(token);
      
      console.log('🔍 Backend: JWT decoded:', {
        hasDecoded: !!decoded,
        payload: decoded ? {
          sub: decoded.sub,
          email: decoded.email,
          name: decoded.name,
          given_name: decoded.given_name,
          family_name: decoded.family_name,
          org_code: decoded.org_code,
          organization: decoded.organization,
          exp: decoded.exp,
          iat: decoded.iat,
          iss: decoded.iss
        } : null
      });
      
      if (!decoded) {
        console.log('❌ Backend: Token could not be decoded');
        return res.status(401).json({
          success: false,
          error: 'Invalid Token',
          message: 'Token could not be decoded'
        });
      }

      // Check token expiration
      if (decoded.exp && decoded.exp < Date.now() / 1000) {
        console.log('❌ Backend: Token expired:', {
          exp: decoded.exp,
          currentTime: Math.floor(Date.now() / 1000),
          timeDiff: decoded.exp - Math.floor(Date.now() / 1000)
        });
        
        return res.status(401).json({
          success: false,
          error: 'Token Expired',
          message: 'Token has expired'
        });
      }

      // Attach user info to request
      req.user = {
        id: decoded.sub,
        email: decoded.email,
        name: decoded.name || decoded.given_name + ' ' + decoded.family_name,
        organizationId: decoded.org_code || decoded.organization,
        roles: decoded.roles || [],
        permissions: decoded.permissions || []
      };

      console.log('✅ Backend: Token validation successful, user attached:', {
        userId: req.user.id,
        userEmail: req.user.email,
        userName: req.user.name,
        orgId: req.user.organizationId
      });

      next();
    } catch (jwtError) {
      console.error('❌ Backend: JWT verification error:', jwtError);
      return res.status(401).json({
        success: false,
        error: 'Invalid Token',
        message: 'Token verification failed'
      });
    }

  } catch (error) {
    console.error('❌ Backend: Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Token validation failed'
    });
  }
};

// POST /api/auth/validate - Validate token endpoint
router.post('/validate', validateKindeToken, (req, res) => {
  try {
    // If we reach here, token is valid
    res.json({
      success: true,
      message: 'Token is valid',
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        organizationId: req.user.organizationId,
        roles: req.user.roles,
        permissions: req.user.permissions
      }
    });
  } catch (error) {
    console.error('Validation response error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to process validation'
    });
  }
});

// GET /api/auth/user - Get current user info
router.get('/user', validateKindeToken, (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        organizationId: req.user.organizationId,
        roles: req.user.roles,
        permissions: req.user.permissions
      }
    });
  } catch (error) {
    console.error('User info error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to get user information'
    });
  }
});

// GET /api/auth/status - Check authentication status
router.get('/status', validateKindeToken, (req, res) => {
  try {
    res.json({
      success: true,
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name
      }
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: 'Failed to check status'
    });
  }
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('Auth validation error:', error);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: 'Authentication service error'
  });
});

export default router;
