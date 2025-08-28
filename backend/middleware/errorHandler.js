const errorHandler = (err, req, res, next) => {
  console.error('Error Handler Middleware:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  let error = { ...err };
  error.message = err.message;


  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = { message, statusCode: 404 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // CORS errors
  if (err.message === 'Not allowed by CORS') {
    error = { message: 'CORS policy violation', statusCode: 403 };
  }

  // Rate limit errors
  if (err.message && err.message.includes('Too many requests')) {
    error = { message: 'Rate limit exceeded', statusCode: 429 };
  }

  const statusCode = error.statusCode || err.statusCode || err.status || 500;
  const message = error.message || err.message || 'Server Error';

  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    }),
    timestamp: new Date().toISOString(),
    statusCode: statusCode
  });
};

module.exports = errorHandler;