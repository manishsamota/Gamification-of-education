const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// @desc    Health check endpoint
// @route   GET /api/health
// @access  Public
router.get('/', (req, res) => {
  const healthCheck = {
    uptime: process.uptime(),
    message: 'EduGame API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      memory: process.memoryUsage(),
      cpu: process.cpuUsage()
    }
  };
  
  try {
    const dbStatus = mongoose.connection.readyState;
    const status = dbStatus === 1 ? 200 : 503;
    
    res.status(status).json({
      success: dbStatus === 1,
      data: healthCheck
    });
  } catch (error) {
    healthCheck.message = 'Health check failed';
    healthCheck.error = error.message;
    
    res.status(503).json({
      success: false,
      data: healthCheck
    });
  }
});

// @desc    Detailed system status
// @route   GET /api/health/detailed
// @access  Public
router.get('/detailed', async (req, res) => {
  try {
    const User = require('../models/User');
    const Challenge = require('../models/Challenge');
    const Achievement = require('../models/Achievement');
    const Activity = require('../models/Activity');

    const [userCount, challengeCount, achievementCount, activityCount] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Challenge.countDocuments({ isActive: true }),
      Achievement.countDocuments({ isActive: true }),
      Activity.countDocuments()
    ]);

    const systemStatus = {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        status: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        host: mongoose.connection.host,
        name: mongoose.connection.name
      },
      collections: {
        users: userCount,
        challenges: challengeCount,
        achievements: achievementCount,
        activities: activityCount
      },
      memory: process.memoryUsage(),
      environment: process.env.NODE_ENV || 'development'
    };

    res.json({
      success: true,
      data: systemStatus
    });

  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Detailed health check failed',
      error: error.message
    });
  }
});

module.exports = router; 