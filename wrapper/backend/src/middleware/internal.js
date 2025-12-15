export async function validateInternalApiKey(request, reply) {
  const authHeader = request.headers.authorization;
  const apiKey = request.headers['x-internal-api-key'];
  
  let providedKey = null;
  
  // Accept key from either Authorization header or x-internal-api-key header
  if (authHeader && authHeader.startsWith('Bearer ')) {
    providedKey = authHeader.substring(7);
  } else if (apiKey) {
    providedKey = apiKey;
  }
  
  if (!providedKey) {
    return reply.code(401).send({ 
      error: 'Internal API key required',
      message: 'Provide key via Authorization header or x-internal-api-key header'
    });
  }
  
  const expectedKey = process.env.INTERNAL_API_KEY;
  
  if (!expectedKey) {
    return reply.code(500).send({ 
      error: 'Internal API key not configured',
      message: 'INTERNAL_API_KEY environment variable not set'
    });
  }
  
  if (providedKey !== expectedKey) {
    return reply.code(401).send({ 
      error: 'Invalid internal API key',
      message: 'The provided API key is not valid'
    });
  }
  
  // Log internal API usage for monitoring
  request.log.info({
    type: 'internal_api_access',
    route: request.url,
    method: request.method,
    timestamp: new Date().toISOString(),
    ip: request.ip
  });
} 