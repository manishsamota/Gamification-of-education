const jwt = require('jsonwebtoken');
const User = require('../models/User');

//  Protect middleware with real-time user data sync
const protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get current user with real-time data
    const currentUser = await User.findById(decoded.id).select('-password');

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: 'User no longer exists'
      });
    }

    if (!currentUser.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated'
      });
    }

    //  to check user has fresh rank data
    if (!currentUser.gameData.rank || currentUser.gameData.rank === 999) {
      console.log(' Updating user rank in real-time...');
      const freshRank = await User.getUserRank(currentUser._id);
      if (freshRank) {
        currentUser.gameData.rank = freshRank;
        await currentUser.save();
      }
    }

    // Add user to request object with real-time stats
    req.user = {
      id: currentUser._id,
      name: currentUser.name,
      email: currentUser.email,
      avatar: currentUser.avatar,
      provider: currentUser.provider,
      gameData: currentUser.gameData,
      preferences: currentUser.preferences,
      profile: currentUser.profile,
      achievements: currentUser.achievements,
      isEmailVerified: currentUser.isEmailVerified,
      //  Add real-time stats method
      getRealTimeStats: () => currentUser.getRealTimeStats()
    };

    console.log(` Auth successful: ${currentUser.name} (Level ${currentUser.gameData.level}, ${currentUser.gameData.totalXP} XP, Rank #${currentUser.gameData.rank})`);
    
    next();
  } catch (error) {
    console.error(' Auth middleware error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Authorization middleware (for admin routes)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!roles.includes(req.user.role || 'user')) {
      return res.status(403).json({
        success: false,
        message: 'Access forbidden. Insufficient permissions.'
      });
    }

    next();
  };
};

//  Middleware to check if user can perform XP operations
const checkXPOperations = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required for XP operations'
      });
    }

    // Get fresh user data for XP operations
    const freshUser = await User.findById(req.user.id).select('-password');
    
    if (!freshUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add fresh user data to request
    req.freshUser = freshUser;
    
    console.log(`XP Operation Auth: User ${freshUser.name} (${freshUser.gameData.totalXP} XP, Level ${freshUser.gameData.level})`);
    
    next();
  } catch (error) {
    console.error(' XP operations check failed:', error);
    res.status(500).json({
      success: false,
      message: 'XP operation authentication failed'
    });
  }
};

//  Rate limiting middleware for XP operations
const rateLimitXP = (maxRequests = 30, windowMs = 60000) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id;
    if (!userId) return next();
    
    const now = Date.now();
    const userRequests = requestCounts.get(userId) || { count: 0, resetTime: now + windowMs };
    
    // Reset count if window has passed
    if (now > userRequests.resetTime) {
      userRequests.count = 0;
      userRequests.resetTime = now + windowMs;
    }
    
    // Check if limit exceeded
    if (userRequests.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many XP requests. Please slow down.',
        retryAfter: Math.ceil((userRequests.resetTime - now) / 1000)
      });
    }
    
    // Increment count
    userRequests.count++;
    requestCounts.set(userId, userRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance
      const cutoff = now - windowMs;
      for (const [userId, data] of requestCounts.entries()) {
        if (data.resetTime < cutoff) {
          requestCounts.delete(userId);
        }
      }
    }
    
    next();
  };
};

// Middleware to validate challenge participation
const validateChallengeParticipation = async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    const Challenge = require('../models/Challenge');
    
    const challenge = await Challenge.findById(challengeId);
    
    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (!challenge.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Challenge is not active'
      });
    }

    if (challenge.status === 'expired') {
      return res.status(400).json({
        success: false,
        message: 'Challenge has expired'
      });
    }

    req.challenge = challenge;
    next();
  } catch (error) {
    console.error(' Challenge validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Challenge validation failed'
    });
  }
};

module.exports = {
  protect,
  authorize,
  checkXPOperations,
  rateLimitXP,
  validateChallengeParticipation
};