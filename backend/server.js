const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const passport = require('passport');
require('dotenv').config();

const app = express();

// this will add request logging middleware for debugging
app.use((req, res, next) => {
  console.log(` ${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${req.ip}`);
  next();
});

// Security middleware 
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" } // This will allow cross-origin requests
}));

// Much more permissive rate limiting for development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000, // 10,000 requests in dev
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for development
    if (process.env.NODE_ENV !== 'production') {
      return true;
    }
    return false;
  }
});

// Rate limiting to API routes only 
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
  console.log(' Rate limiting enabled for production');
} else {
  console.log(' Rate limiting DISABLED for development');
}

//  CORS configuration - Much more permissive
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'https://localhost:3000',
      'https://127.0.0.1:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    console.log(` CORS check - Origin: ${origin}`);
    
    // DEVELOPMENT: Allow all origins
    if (process.env.NODE_ENV !== 'production') {
      console.log(' CORS: Development mode - allowing all origins');
      return callback(null, true);
    }
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log(' CORS: No origin (allowing)');
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(' CORS: Origin allowed');
      callback(null, true);
    } else {
      console.log(' CORS: Origin blocked');
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'Accept',
    'Origin',
    'Cache-Control',
    'X-File-Name'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Passport middleware
app.use(passport.initialize());

// Import middleware with FIXED error handling
let loggerMiddleware;
try {
  loggerMiddleware = require('./middleware/logger');
  app.use(loggerMiddleware);
  console.log(' Logger middleware loaded');
} catch (error) {
  console.log(' Logger middleware not found, using basic logging');
  console.log('Error details:', error.message);
  // Basic fallback logger
  app.use((req, res, next) => {
    console.log(` ${req.method} ${req.url} - ${new Date().toISOString()}`);
    next();
  });
}

// Import error handler correctly
let errorHandler;
try {
  errorHandler = require('./middleware/errorHandler');
  console.log(' Error handler loaded');
  console.log('Error handler type:', typeof errorHandler);
} catch (error) {
  console.log(' Error handler not found, using basic error handling');
  console.log('Error details:', error.message);
  errorHandler = (err, req, res, next) => {
    console.error(' Error:', err);
    res.status(err.status || 500).json({ 
      success: false, 
      message: err.message || 'Something went wrong!',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  };
}

// Import passport config with error handling
try {
  require('./config/passport');
  console.log(' Passport config loaded');
} catch (error) {
  console.log(' Passport config not found:', error.message);
}

// Database connection
console.log(' Connecting to MongoDB...');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edugame', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log(' Connected to MongoDB');
  console.log(` Database: ${mongoose.connection.name}`);
})
.catch(err => {
  console.error(' MongoDB connection error:', err);
  process.exit(1);
});

// ROOT ROUTE 
app.get('/', (req, res) => {
  console.log('Root route accessed');
  res.status(200).json({
    success: true,
    message: 'EduGame Backend API is running! 🚀',
    version: '1.0.0',
    status: 'active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      enabled: true,
      development_mode: process.env.NODE_ENV !== 'production'
    },
    rate_limiting: {
      enabled: process.env.NODE_ENV === 'production',
      development_mode: process.env.NODE_ENV !== 'production'
    },
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      users: '/api/users',
      challenges: '/api/challenges',
      game: '/api/game',
      achievements: '/api/achievements',
      userData: '/api/user-data'
    }
  });
});

// API info route
app.get('/api', (req, res) => {
  console.log(' API root accessed');
  res.status(200).json({
    success: true,
    message: 'EduGame API',
    version: '1.0.0',
    cors_enabled: true,
    rate_limiting_disabled: process.env.NODE_ENV !== 'production',
    endpoints: [
      'GET /api/health - System health check',
      'POST /api/auth/login - User login',
      'POST /api/auth/signup - User registration',
      'GET /api/users/profile - User profile',
      'GET /api/challenges - Available challenges',
      'GET /api/user-data/dashboard - Dashboard data'
    ]
  });
});

//  health check endpoint
app.get('/api/health', (req, res) => {
  console.log(' Health check accessed');
  res.status(200).json({
    success: true,
    message: 'EduGame API is healthy',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())} seconds`,
    mongodb: {
      status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      host: mongoose.connection.host,
      database: mongoose.connection.name
    },
    environment: process.env.NODE_ENV || 'development',
    cors: {
      enabled: true,
      permissive_in_dev: process.env.NODE_ENV !== 'production'
    },
    rate_limiting: {
      enabled: process.env.NODE_ENV === 'production',
      disabled_in_dev: process.env.NODE_ENV !== 'production'
    },
    memory: process.memoryUsage(),
    nodeVersion: process.version
  });
});

// CORS test endpoint
app.get('/api/cors-test', (req, res) => {
  console.log(' CORS test accessed');
  res.status(200).json({
    success: true,
    message: 'CORS is working!',
    origin: req.get('origin'),
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
});

// Import and mount routes with  error handling
const routes = [
  { path: '/api/auth', file: './routes/auth', name: 'Auth' },
  { path: '/api/users', file: './routes/users', name: 'Users' },
  { path: '/api/challenges', file: './routes/challenges', name: 'Challenges' },
  { path: '/api/game', file: './routes/game', name: 'Game' },
  { path: '/api/achievements', file: './routes/achievements', name: 'Achievements' },
  { path: '/api/user-data', file: './routes/userData', name: 'UserData' }
];

routes.forEach(({ path, file, name }) => {
  try {
    const router = require(file);
    console.log(` ${name} routes loaded from ${file}`);
    console.log(` Mounted at: ${path}`);
    
    // Add route-specific logging and CORS headers
    app.use(path, (req, res, next) => {
      console.log(` ${name} route: ${req.method} ${req.originalUrl}`);
      
      // CORS headers are set for all API routes
      res.header('Access-Control-Allow-Origin', req.get('origin') || '*');
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,PATCH,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control, X-File-Name');
      
      next();
    }, router);
    
  } catch (error) {
    console.log(` ${name} routes failed to load from ${file}:`);
    console.log(`   Error: ${error.message}`);
  }
});

// This will catch-all for API routes that don't exist
app.use('/api/*', (req, res) => {
  console.log(` API 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'Check available endpoints at /api',
    availableEndpoints: [
      'GET /api/health',
      'GET /api/cors-test',
      'POST /api/auth/login',
      'POST /api/auth/signup',
      'GET /api/users/profile',
      'GET /api/challenges',
      'GET /api/user-data/dashboard'
    ],
    timestamp: new Date().toISOString()
  });
});

// This is global 404 handler for non-API routes
app.use('*', (req, res) => {
  console.log(` Global 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    suggestion: 'This is the EduGame API. Visit /api for available endpoints',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(' Global error handler triggered:', err.message);
  
  // CORS errors 
  if (err.message === 'Not allowed by CORS') {
    if (process.env.NODE_ENV !== 'production') {
     
      console.log(' CORS error in development - allowing request');
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation',
      origin: req.get('origin'),
      solution: 'Contact administrator to whitelist your domain'
    });
  }
  
 
  if (typeof errorHandler === 'function') {
    errorHandler(err, req, res, next);
  } else {
    // Fallback error handler
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { 
        stack: err.stack
      }),
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 5000;

//  server startup
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('\n ==========================================');
  console.log(' EduGame Backend Server Started!');
  console.log(' ==========================================');
  console.log(`Server running on port ${PORT}`);
  console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Local URL: http://localhost:${PORT}`);
  console.log(` Health Check: http://localhost:${PORT}/api/health`);
  console.log(` CORS Test: http://localhost:${PORT}/api/cors-test`);
  console.log(` API Info: http://localhost:${PORT}/api`);
  console.log(` Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  
  // Development-specific logs
  if (process.env.NODE_ENV !== 'production') {
    console.log('\n DEVELOPMENT MODE SETTINGS:');
    console.log(' CORS: Allowing ALL origins');
    console.log(' Rate Limiting: DISABLED');
    console.log(' Detailed Error Messages: ENABLED');
    console.log(' Request Logging: ENABLED');
  }
  
  console.log(' ==========================================\n');
  

  console.log(' Testing routes...');
  console.log(' Root route (/) should return API info');
  console.log(' Health route (/api/health) should return system status');
  console.log(' CORS test (/api/cors-test) should work from frontend');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log(' SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log(' Server closed');
    mongoose.connection.close(false, () => {
      console.log(' MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  console.log(' SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log(' Server closed');
    mongoose.connection.close(false, () => {
      console.log(' MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = app;