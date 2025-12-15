export function errorHandler(error, request, reply) {
  // Log the error
  request.log.error(error);

  // Default error response
  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  // Handle specific error types
  if (error.validation) {
    // Validation errors
    statusCode = 400;
    message = 'Validation Error';
    details = error.validation.map(v => ({
      field: v.instancePath,
      message: v.message,
      value: v.data,
    }));
  } else if (error.statusCode) {
    // HTTP errors
    statusCode = error.statusCode;
    message = error.message;
  } else if (error.code === 'FST_JWT_NO_AUTHORIZATION_IN_HEADER') {
    statusCode = 401;
    message = 'No authorization header';
  } else if (error.code === 'FST_JWT_AUTHORIZATION_TOKEN_INVALID') {
    statusCode = 401;
    message = 'Invalid authorization token';
  } else if (error.code === 'FST_RATE_LIMIT_REACHED') {
    statusCode = 429;
    message = 'Rate limit exceeded';
  } else if (error.code === 'ECONNREFUSED') {
    statusCode = 503;
    message = 'Service unavailable';
  } else if (error.name === 'DrizzleError') {
    statusCode = 500;
    message = 'Database error';
    details = process.env.NODE_ENV === 'development' ? error.message : null;
  }

  // Send error response
  reply.code(statusCode).send({
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
    ...(details && { details }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  });
} 