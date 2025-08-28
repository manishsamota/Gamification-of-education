const express = require('express');
const passport = require('passport');
const { body } = require('express-validator');
const {
  signup,
  login,
  googleAuth,
  getMe,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { generateToken } = require('../utils/tokenUtils');

const router = express.Router();

// Below here validation rules
const signupValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
];

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

const forgotPasswordValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email')
];

const resetPasswordValidation = [
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

// here below auth routes
router.post('/signup', signupValidation, signup);
router.post('/login', loginValidation, login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
router.post('/refresh', refreshToken);
router.post('/forgot-password', forgotPasswordValidation, forgotPassword);
router.post('/reset-password/:token', resetPasswordValidation, resetPassword);

// Google OAuth routes

router.get('/google',
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })
);

// Google OAuth callback route
router.get('/google/callback',
  passport.authenticate('google', { session: false }),
  async (req, res) => {
    try {
      console.log(' Google OAuth callback hit');
      console.log(' User from passport:', req.user ? 'User exists' : 'No user');
      
      if (!req.user) {
        console.log(' No user from passport authentication');
        const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(`${frontendURL}/auth?error=no_user`);
      }

      console.log(' User authenticated:', req.user._id);
      
      // Generate JWT token
      const token = generateToken(req.user._id);
      console.log(' Token generated:', token ? 'Success' : 'Failed');
      
      // this will update last login and streak
      req.user.lastLogin = new Date();
      req.user.updateStreak();
      await req.user.save();
      console.log('User data updated');
      
      // it will redirect to frontend with token
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectURL = `${frontendURL}/auth/success?token=${token}`;
      
      console.log(' FRONTEND_URL from env:', process.env.FRONTEND_URL);
      console.log(' Final redirect URL:', redirectURL);
      console.log(' About to redirect to frontend...');
      
      res.redirect(redirectURL);
      
      console.log('Redirect sent successfully');
      
    } catch (error) {
      console.error(' Google callback error:', error);
      const frontendURL = process.env.FRONTEND_URL || 'http://localhost:3000';
      res.redirect(`${frontendURL}/auth/error`);
    }
  }
);

// Google OAuth for frontend that handles Google ID tokens from frontend
router.post('/google', googleAuth);

module.exports = router;