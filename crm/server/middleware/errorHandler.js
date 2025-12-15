function errorHandler(err, req, res, next) {
  console.error("error middleware", err);

  // Handle MongoDB duplicate key error (E11000)
  if (err.code === 11000 || (err.message && err.message.includes('E11000'))) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      message: `Duplicate entry for ${field}`,
      error: 'DUPLICATE_ENTRY',
    });
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      message: 'Validation failed',
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  // Fallback for unknown errors
  res.status(500).json({ message: 'Internal Server Error' });
}

export default errorHandler;
