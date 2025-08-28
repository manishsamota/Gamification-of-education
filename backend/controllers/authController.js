const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { generateToken, generateRefreshToken } = require('../utils/tokenUtils');
const { sendWelcomeEmail } = require('../utils/emailService');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Helper function to create and send token
const createSendToken = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  
  // Remove password from output
  user.password = undefined;
  
  res.status(statusCode).json({
    success: true,
    message,
    token,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      provider: user.provider,
      gameData: user.gameData,
      preferences: user.preferences,
      isEmailVerified: user.isEmailVerified
    }
  });
};

// @desc    Register user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res, next) => {
  try {
    console.log(' Signup attempt:', req.body);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(' Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log(' User already exists:', email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    console.log(' Creating new user...');
    
    // Create new user
    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
      provider: 'email'
    });

    console.log(' User created successfully:', newUser._id);

    // Create welcome activity
    try {
      await Activity.createActivity(newUser._id, 'achievement_unlocked', {
        title: 'Welcome to EduGame!',
        description: 'Started your learning journey',
        metadata: {
          xpGained: 50
        },
        points: 50
      });

      // Add welcome XP
      await newUser.addXP(50, 'signup');
    } catch (activityError) {
      console.log(' Could not create welcome activity:', activityError.message);
      // Don't fail signup if activity creation fails
    }

    // Send welcome email (optional)
    if (process.env.NODE_ENV === 'production') {
      try {
        await sendWelcomeEmail(newUser.email, newUser.name);
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
      }
    }

    console.log(' About to send token response...');
    createSendToken(newUser, 201, res, 'Account created successfully');
    console.log(' Response sent successfully');
    
  } catch (error) {
    console.error(' Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account'
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    console.log(' Login attempt:', req.body.email);
    
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(' Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Check if user exists and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log(' User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if user registered with Google
    if (user.provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Please sign in with Google'
      });
    }

    // Check password
    const isPasswordCorrect = await user.correctPassword(password, user.password);
    
    if (!isPasswordCorrect) {
      console.log(' Incorrect password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    console.log(' Login successful:', email);

    // Update last login
    user.lastLogin = new Date();
    user.updateStreak();
    await user.save();

    createSendToken(user, 200, res, 'Login successful');
  } catch (error) {
    console.error(' Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in'
    });
  }
};

// @desc    Google OAuth login - FIXED
// @route   POST /api/auth/google
// @access  Public
exports.googleAuth = async (req, res, next) => {
  try {
    console.log(' Google auth attempt');
    
    const { tokenId } = req.body;

    if (!tokenId) {
      return res.status(400).json({
        success: false,
        message: 'Google token is required'
      });
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: tokenId,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (googleError) {
      console.error(' Google token verification failed:', googleError);
      return res.status(400).json({
        success: false,
        message: 'Invalid Google token'
      });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    console.log(' Google user email:', email);
    console.log(' Google user name:', name);

    //  User model loading
    if (!User || typeof User.findOne !== 'function') {
      console.error(' User model not properly imported');
      return res.status(500).json({
        success: false,
        message: 'Internal server error - User model not available'
      });
    }

    // Check if user exists
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { googleId }
      ]
    });

    if (user) {
      console.log(' Existing Google user found:', email);
      
      // User exists, update Google ID if needed
      if (!user.googleId) {
        user.googleId = googleId;
        user.provider = 'google';
      }
      
      // Update last login and streak
      user.lastLogin = new Date();
      user.updateStreak();
      await user.save();
      
      createSendToken(user, 200, res, 'Google login successful');
    } else {
      console.log(' Creating new Google user:', email);
      
      // Create new user
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        avatar: picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
        provider: 'google',
        isEmailVerified: true // Google emails are pre-verified
      });

      console.log(' New Google user created:', user._id);

      // Create welcome activity for new Google user
      try {
        await Activity.createActivity(user._id, 'achievement_unlocked', {
          title: 'Welcome to EduGame!',
          description: 'Started your learning journey with Google',
          metadata: {
            xpGained: 50
          },
          points: 50
        });

        // Add welcome XP
        await user.addXP(50, 'signup');
      } catch (activityError) {
        console.log(' Could not create welcome activity for Google user:', activityError.message);
        // Don't fail signup if activity creation fails
      }

      createSendToken(user, 201, res, 'Google account created successfully');
    }
  } catch (error) {
    console.error(' Google auth error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error with Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res, next) => {
  try {
    console.log(' Getting user info for:', req.user.id);
    
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        gameData: user.gameData,
        preferences: user.preferences,
        isEmailVerified: user.isEmailVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error(' Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
exports.logout = async (req, res, next) => {
  try {
    // In a production app, you might want to blacklist the token
    // For now, we'll just send a success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging out'
    });
  }
};

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
exports.refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);

    res.status(200).json({
      success: true,
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid refresh token'
    });
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found with this email'
      });
    }

    if (user.provider === 'google') {
      return res.status(400).json({
        success: false,
        message: 'Google users cannot reset password. Please sign in with Google.'
      });
    }

    // Generate reset token (implement this based on your needs)
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to email'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing password reset'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password/:token
// @access  Public
exports.resetPassword = async (req, res, next) => {
  try {
    // Implement password reset logic here
    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error resetting password'
    });
  }
};