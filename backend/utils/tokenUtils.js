const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'access'
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    }
  );
};

// Generate refresh token
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'refresh'
    }, 
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, 
    {
      expiresIn: '30d' // Refresh tokens last longer
    }
  );
};

// Verify JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// Extract token from authorization header
const extractTokenFromHeader = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7); // Remove 'Bearer ' prefix
};

// Generate password reset token
const generatePasswordResetToken = (userId) => {
  return jwt.sign(
    { 
      id: userId,
      type: 'password_reset'
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '1h' // Password reset tokens expire quickly
    }
  );
};

// Generate email verification token
const generateEmailVerificationToken = (userId, email) => {
  return jwt.sign(
    { 
      id: userId,
      email: email,
      type: 'email_verification'
    }, 
    process.env.JWT_SECRET, 
    {
      expiresIn: '24h' // Email verification tokens last 24 hours
    }
  );
};

// Decode token without verification (useful for checking expired tokens)
const decodeToken = (token) => {
  try {
    return jwt.decode(token);
  } catch (error) {
    return null;
  }
};

// Check if token is expired
const isTokenExpired = (token) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Generate a secure random token (for non-JWT purposes)
const generateSecureToken = (length = 32) => {
  const crypto = require('crypto');
  return crypto.randomBytes(length).toString('hex');
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generatePasswordResetToken,
  generateEmailVerificationToken,
  decodeToken,
  isTokenExpired,
  generateSecureToken
};