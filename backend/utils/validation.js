const { body, query, param } = require('express-validator');

// XP validation rules
const xpValidation = {
  addXP: [
    body('amount')
      .isInt({ min: 1, max: 1000 })
      .withMessage('XP amount must be between 1 and 1000'),
    body('source')
      .optional()
      .isIn(['challenge', 'course', 'quiz', 'practice', 'achievement', 'daily_login', 'streak_bonus', 'manual', 'batch'])
      .withMessage('Invalid XP source'),
    body('metadata')
      .optional()
      .isObject()
      .withMessage('Metadata must be an object')
  ],
  
  batchXP: [
    body('xpSources')
      .isArray({ min: 1, max: 10 })
      .withMessage('XP sources must be an array with 1-10 items'),
    body('xpSources.*.amount')
      .isInt({ min: 1, max: 500 })
      .withMessage('Each XP amount must be between 1 and 500'),
    body('xpSources.*.source')
      .isIn(['challenge', 'course', 'quiz', 'practice', 'achievement'])
      .withMessage('Invalid XP source in batch')
  ]
};

// Challenge validation rules
const challengeValidation = {
  getChallenges: [
    query('type')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'special'])
      .withMessage('Invalid challenge type'),
    query('category')
      .optional()
      .isIn(['math', 'science', 'history', 'literature', 'geography', 'art', 'music', 'general'])
      .withMessage('Invalid category'),
    query('difficulty')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid difficulty level'),
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50')
  ],

  submitChallenge: [
    param('id')
      .isMongoId()
      .withMessage('Invalid challenge ID'),
    body('answers')
      .isArray({ min: 1 })
      .withMessage('Answers must be a non-empty array'),
    body('answers.*.questionIndex')
      .isInt({ min: 0 })
      .withMessage('Question index must be a non-negative integer'),
    body('answers.*.selectedAnswer')
      .notEmpty()
      .withMessage('Selected answer is required'),
    body('timeSpent')
      .isInt({ min: 1 })
      .withMessage('Time spent must be a positive integer')
  ],

  createChallenge: [
    body('title')
      .trim()
      .isLength({ min: 5, max: 100 })
      .withMessage('Title must be between 5 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage('Description must be between 10 and 500 characters'),
    body('type')
      .isIn(['daily', 'weekly', 'monthly', 'special'])
      .withMessage('Invalid challenge type'),
    body('category')
      .isIn(['math', 'science', 'history', 'literature', 'geography', 'art', 'music', 'general'])
      .withMessage('Invalid category'),
    body('difficulty')
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid difficulty level'),
    body('xpReward')
      .isInt({ min: 10, max: 1000 })
      .withMessage('XP reward must be between 10 and 1000'),
    body('questions')
      .isArray({ min: 1, max: 20 })
      .withMessage('Must have between 1 and 20 questions'),
    body('questions.*.question')
      .trim()
      .isLength({ min: 5, max: 500 })
      .withMessage('Question must be between 5 and 500 characters'),
    body('questions.*.options')
      .isArray({ min: 2, max: 6 })
      .withMessage('Must have between 2 and 6 options'),
    body('timeLimit')
      .optional()
      .isInt({ min: 5, max: 120 })
      .withMessage('Time limit must be between 5 and 120 minutes')
  ]
};

// User profile validation rules
const userValidation = {
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('profile.bio')
      .optional()
      .isLength({ max: 500 })
      .withMessage('Bio cannot exceed 500 characters'),
    body('profile.location')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Location cannot exceed 100 characters'),
    body('profile.school')
      .optional()
      .isLength({ max: 100 })
      .withMessage('School cannot exceed 100 characters'),
    body('profile.grade')
      .optional()
      .isIn(['elementary', 'middle', 'high', 'college', 'other'])
      .withMessage('Invalid grade level'),
    body('profile.interests')
      .optional()
      .isArray({ max: 10 })
      .withMessage('Maximum 10 interests allowed'),
    body('profile.learningGoals')
      .optional()
      .isArray({ max: 5 })
      .withMessage('Maximum 5 learning goals allowed')
  ],

  updateStats: [
    body('gameData')
      .optional()
      .isObject()
      .withMessage('Game data must be an object'),
    body('xpToAdd')
      .optional()
      .isInt({ min: 0, max: 1000 })
      .withMessage('XP to add must be between 0 and 1000'),
    body('source')
      .optional()
      .isString()
      .withMessage('Source must be a string')
  ]
};

// Authentication validation rules
const authValidation = {
  signup: [
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
  ],

  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],

  forgotPassword: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email')
  ],

  resetPassword: [
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
  ]
};

// Achievement validation rules
const achievementValidation = {
  create: [
    body('title')
      .trim()
      .isLength({ min: 3, max: 100 })
      .withMessage('Title must be between 3 and 100 characters'),
    body('description')
      .trim()
      .isLength({ min: 10, max: 300 })
      .withMessage('Description must be between 10 and 300 characters'),
    body('category')
      .isIn(['streak', 'xp', 'challenges', 'courses', 'social', 'special'])
      .withMessage('Invalid achievement category'),
    body('type')
      .isIn(['bronze', 'silver', 'gold', 'platinum', 'legendary'])
      .withMessage('Invalid achievement type'),
    body('criteria.type')
      .isIn(['streak_days', 'total_xp', 'challenges_completed', 'courses_completed', 'login_days', 'perfect_scores', 'daily_challenges', 'category_master'])
      .withMessage('Invalid criteria type'),
    body('criteria.target')
      .isInt({ min: 1 })
      .withMessage('Target must be a positive integer'),
    body('rewards.xp')
      .optional()
      .isInt({ min: 0, max: 1000 })
      .withMessage('XP reward must be between 0 and 1000')
  ]
};

// Pagination validation
const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort must be asc or desc')
];

// Real-time data validation
const realtimeValidation = {
  syncRequest: [
    body('operation')
      .optional()
      .isIn(['full', 'xp_only', 'rank_only', 'achievements_only'])
      .withMessage('Invalid sync operation'),
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('Invalid timestamp format')
  ],

  batchSync: [
    body('userIds')
      .isArray({ min: 1, max: 50 })
      .withMessage('User IDs must be an array with 1-50 items'),
    body('userIds.*')
      .isMongoId()
      .withMessage('All user IDs must be valid MongoDB ObjectIds')
  ]
};

// This is utility function to validate MongoDB ObjectId
const validateObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

// This is utility function to sanitize string input
const sanitizeString = (str, maxLength = 500) => {
  if (typeof str !== 'string') return '';
  return str.trim().substring(0, maxLength);
};

// This is utility function to validate XP amount
const validateXPAmount = (amount) => {
  const numAmount = Number(amount);
  return !isNaN(numAmount) && numAmount > 0 && numAmount <= 1000;
};

// This is utility function to validate time spent
const validateTimeSpent = (timeSpent) => {
  const numTime = Number(timeSpent);
  return !isNaN(numTime) && numTime > 0 && numTime <= 7200; // Maxium 2 hours
};

// Custom validation middleware for real-time operations
const validateRealTimeOperation = (req, res, next) => {
  const { operation } = req.body;
  
  // Check if operation is allowed for current user
  if (operation === 'admin_sync' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin privileges required for this operation'
    });
  }
  
  next();
};

module.exports = {
  xpValidation,
  challengeValidation,
  userValidation,
  authValidation,
  achievementValidation,
  paginationValidation,
  realtimeValidation,
  validateObjectId,
  sanitizeString,
  validateXPAmount,
  validateTimeSpent,
  validateRealTimeOperation
};