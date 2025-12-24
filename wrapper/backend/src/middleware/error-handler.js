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
    
    // Format validation errors with user-friendly messages
    details = error.validation.map(v => {
      const fieldName = v.instancePath?.replace('/', '') || v.params?.missingProperty || 'unknown';
      let userMessage = v.message || 'Invalid value';
      
      // Make error messages more user-friendly
      if (v.keyword === 'required') {
        userMessage = `${fieldName} is required`;
      } else if (v.keyword === 'minLength') {
        userMessage = `${fieldName} must be at least ${v.params.limit} characters`;
      } else if (v.keyword === 'maxLength') {
        userMessage = `${fieldName} must not exceed ${v.params.limit} characters`;
      } else if (v.keyword === 'format') {
        if (v.params.format === 'email') {
          userMessage = `${fieldName} must be a valid email address`;
        } else {
          userMessage = `${fieldName} format is invalid`;
        }
      } else if (v.keyword === 'enum') {
        userMessage = `${fieldName} must be one of: ${v.params.allowedValues.join(', ')}`;
      } else if (v.keyword === 'pattern') {
        userMessage = `${fieldName} format is invalid`;
      } else if (v.keyword === 'type') {
        userMessage = `${fieldName} must be of type ${v.params.type}`;
      }
      
      return {
      field: v.instancePath,
        message: userMessage,
      value: v.data,
      };
    });
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

  // Build response object
  const response = {
    error: message,
    statusCode,
    timestamp: new Date().toISOString(),
    path: request.url,
  };

  // Add details if present
  if (details) {
    response.details = details;
    // For validation errors, also add a combined message
    if (error.validation && Array.isArray(details) && details.length > 0) {
      if (details.length === 1) {
        response.message = details[0].message;
      } else {
        response.message = `Please fix the following errors: ${details.map((d) => d.message).join(', ')}`;
      }
    }
  }

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.stack = error.stack;
  }

  reply.code(statusCode).send(response);
} 