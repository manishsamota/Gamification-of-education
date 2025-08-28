
const express = require('express');
const { body, query } = require('express-validator');
const {
  getChallenges,
  getChallenge,
  getDailyChallenges,
  startChallenge,
  submitChallenge,
  getChallengeResults,
  createChallenge
} = require('../controllers/challengeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Validation rules
const getChallengesValidation = [
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
];

const submitChallengeValidation = [
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
];

const createChallengeValidation = [
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
];

// Routes
router.get('/', getChallengesValidation, getChallenges);
router.get('/daily', getDailyChallenges);
router.get('/:id', getChallenge);
router.post('/:id/start', startChallenge);
router.post('/:id/submit', submitChallengeValidation, submitChallenge);
router.get('/:id/results', getChallengeResults);

// Admin routes
router.post('/', authorize('admin'), createChallengeValidation, createChallenge);

module.exports = router;