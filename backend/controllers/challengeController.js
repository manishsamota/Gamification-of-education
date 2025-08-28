const { validationResult } = require('express-validator');
const Challenge = require('../models/Challenge');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Achievement = require('../models/Achievement');

// @desc    Get all challenges
// @route   GET /api/challenges
// @access  Private
exports.getChallenges = async (req, res) => {
  try {
    const { type, category, difficulty, page = 1, limit = 20 } = req.query;
    
    const filter = { isActive: true };
    
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    
    const challenges = await Challenge.find(filter)
      .populate('createdBy', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add user status to each challenge
    const challengesWithStatus = challenges.map(challenge => {
      const userParticipation = challenge.participants.find(
        p => p.userId.toString() === req.user.id
      );

      return {
        ...challenge.toObject(),
        userStatus: userParticipation ? {
          participated: true,
          completed: !!userParticipation.completedAt,
          score: userParticipation.score || 0,
          timeSpent: userParticipation.timeSpent || 0
        } : {
          participated: false,
          completed: false
        }
      };
    });

    const total = await Challenge.countDocuments(filter);

    res.json({
      success: true,
      data: {
        challenges: challengesWithStatus,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalChallenges: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenges',
      error: error.message
    });
  }
};

// @desc    Get daily challenges
// @route   GET /api/challenges/daily
// @access  Private
exports.getDailyChallenges = async (req, res) => {
  try {
    const dailyChallenges = await Challenge.getDailyChallenges();

    const challengesWithStatus = dailyChallenges.map(challenge => {
      const userParticipation = challenge.participants.find(
        p => p.userId.toString() === req.user.id
      );

      return {
        ...challenge.toObject(),
        userStatus: userParticipation ? {
          participated: true,
          completed: !!userParticipation.completedAt,
          score: userParticipation.score || 0,
          timeSpent: userParticipation.timeSpent || 0
        } : {
          participated: false,
          completed: false
        }
      };
    });

    res.json({
      success: true,
      data: {
        challenges: challengesWithStatus,
        date: new Date().toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error fetching daily challenges:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching daily challenges',
      error: error.message
    });
  }
};

// @desc    Get single challenge
// @route   GET /api/challenges/:id
// @access  Private
exports.getChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id)
      .populate('createdBy', 'name avatar');

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const userParticipation = challenge.participants.find(
      p => p.userId.toString() === req.user.id
    );

    const challengeWithStatus = {
      ...challenge.toObject(),
      userStatus: userParticipation ? {
        participated: true,
        completed: !!userParticipation.completedAt,
        score: userParticipation.score || 0,
        timeSpent: userParticipation.timeSpent || 0,
        startedAt: userParticipation.startedAt
      } : {
        participated: false,
        completed: false
      }
    };

    res.json({
      success: true,
      data: challengeWithStatus
    });
  } catch (error) {
    console.error('Error fetching challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge',
      error: error.message
    });
  }
};

// @desc    Start a challenge
// @route   POST /api/challenges/:id/start
// @access  Private
exports.startChallenge = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge || !challenge.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    // it will check if challenge has expired or not
    if (challenge.endDate && new Date() > challenge.endDate) {
      return res.status(400).json({
        success: false,
        message: 'Challenge has expired'
      });
    }

    // Check if user already completed the challenge
    const existingParticipation = challenge.participants.find(
      p => p.userId.toString() === req.user.id && p.completedAt
    );

    if (existingParticipation) {
      return res.status(400).json({
        success: false,
        message: 'Challenge already completed',
        data: {
          completed: true,
          score: existingParticipation.score,
          completedAt: existingParticipation.completedAt
        }
      });
    }

    // Add user as participant
    const participant = await challenge.addParticipant(req.user.id);

    // Create activity for starting challenge
    await Activity.createActivity(req.user.id, 'challenge_started', {
      title: `🎯 Started Challenge: ${challenge.title}`,
      description: `Started "${challenge.title}" challenge in ${challenge.category}`,
      metadata: {
        challengeId: challenge._id,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        challengeDifficulty: challenge.difficulty,
        xpReward: challenge.xpReward
      }
    });

    console.log(` User ${req.user.id} started challenge: ${challenge.title}`);

    res.json({
      success: true,
      message: 'Challenge started successfully',
      data: {
        challenge: {
          ...challenge.toObject(),
          userStatus: {
            participated: true,
            completed: false,
            startedAt: participant.startedAt
          }
        }
      }
    });
  } catch (error) {
    console.error('Error starting challenge:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting challenge',
      error: error.message
    });
  }
};

// @desc    Submit challenge with COMPLETE XP INTEGRATION
// @route   POST /api/challenges/:id/submit
// @access  Private
exports.submitChallenge = async (req, res) => {
  try {
    console.log(' COMPLETE XP INTEGRATION - Challenge submission started');
    console.log('User ID:', req.user.id);
    console.log('Challenge ID:', req.params.id);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const challengeId = req.params.id;
    const { answers, timeSpent } = req.body;
    const userId = req.user.id;

    // Get challenge and user data with fresh database reads
    const [challenge, user] = await Promise.all([
      Challenge.findById(challengeId),
      User.findById(userId)
    ]);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(' Processing challenge submission...');

    // Store old values for comparison
    const oldUserStats = {
      totalXP: user.gameData.totalXP,
      level: user.gameData.level,
      rank: user.gameData.rank,
      currentStreak: user.gameData.currentStreak,
      weeklyProgress: user.gameData.weeklyProgress || 0,
      challengesCompleted: user.gameData.challengesCompleted || 0
    };

    console.log(' Pre-submission stats:', oldUserStats);

    // Submit answers to challenge using the model method
    const submissionResult = await challenge.submitAnswers(userId, answers, timeSpent);
    
    if (!submissionResult.success) {
      return res.status(400).json({
        success: false,
        message: submissionResult.error || 'Failed to submit challenge'
      });
    }

    console.log(' Challenge answers submitted successfully');
    console.log(' Challenge results:', submissionResult);

    // Calculate XP reward based on performance (same logic as your existing code)
    const baseXPReward = challenge.xpReward;
    const performanceMultiplier = Math.max(0.1, submissionResult.score / 100); // At least 10% of XP even for 0 score
    const xpGained = Math.round(baseXPReward * performanceMultiplier);

    console.log(` XP Calculation: ${baseXPReward} * ${performanceMultiplier.toFixed(2)} = ${xpGained} XP`);

    //  Add XP to user with comprehensive tracking
    const xpResult = await user.addXP(xpGained, 'challenge_completion', {
      challengeId: challengeId,
      challengeTitle: challenge.title,
      challengeCategory: challenge.category,
      challengeDifficulty: challenge.difficulty,
      score: submissionResult.score,
      timeSpent: timeSpent,
      correctAnswers: submissionResult.correctAnswers,
      totalQuestions: submissionResult.totalQuestions,
      baseXPReward: baseXPReward,
      performanceMultiplier: performanceMultiplier
    });

    if (!xpResult || !xpResult.success) {
      console.error(' Failed to add XP:', xpResult?.error);
      // Continue with response but log the error
    } else {
      console.log(' XP added successfully');
    }

    // Get fresh user data after XP addition
    const updatedUser = await User.findById(userId);

    // Update user's challenge completion count
    updatedUser.gameData.challengesCompleted = (updatedUser.gameData.challengesCompleted || 0) + 1;
    
    // Update streak if this is a daily activity
    if (challenge.type === 'daily') {
      updatedUser.updateStreak();
    }
    
    await updatedUser.save();

    console.log(' User challenge stats updated');

    //  Update user rankings in database
    await User.updateRankings();
    
    // Get user data with updated ranking
    const userWithNewRank = await User.findById(userId);
    
    const newUserStats = {
      totalXP: userWithNewRank.gameData.totalXP,
      level: userWithNewRank.gameData.level,
      rank: userWithNewRank.gameData.rank,
      currentStreak: userWithNewRank.gameData.currentStreak,
      weeklyProgress: userWithNewRank.gameData.weeklyProgress || 0,
      challengesCompleted: userWithNewRank.gameData.challengesCompleted || 0
    };

    console.log(' Post-submission stats:', newUserStats);

    // Calculate changes for UI updates
    const leveledUp = newUserStats.level > oldUserStats.level;
    const rankImproved = newUserStats.rank < oldUserStats.rank;
    const levelsGained = newUserStats.level - oldUserStats.level;
    const rankImprovement = rankImproved ? oldUserStats.rank - newUserStats.rank : 0;

    //  Create comprehensive challenge completion activity
    await Activity.createActivity(userId, 'challenge_completed', {
      title: `🎯 Challenge Completed: ${challenge.title}`,
      description: `Completed "${challenge.title}" with ${submissionResult.score}% score, earned ${xpGained} XP${leveledUp ? `, leveled up to ${newUserStats.level}` : ''}${rankImproved ? `, rank improved by ${rankImprovement}` : ''}`,
      metadata: {
        challengeId: challengeId,
        challengeTitle: challenge.title,
        challengeCategory: challenge.category,
        challengeDifficulty: challenge.difficulty,
        challengeType: challenge.type,
        score: submissionResult.score,
        xpGained: xpGained,
        baseXPReward: baseXPReward,
        performanceMultiplier: performanceMultiplier,
        timeSpent: timeSpent,
        correctAnswers: submissionResult.correctAnswers,
        totalQuestions: submissionResult.totalQuestions,
        // Stat changes
        oldLevel: oldUserStats.level,
        newLevel: newUserStats.level,
        leveledUp: leveledUp,
        levelsGained: levelsGained,
        oldRank: oldUserStats.rank,
        newRank: newUserStats.rank,
        rankImproved: rankImproved,
        rankImprovement: rankImprovement,
        oldTotalXP: oldUserStats.totalXP,
        newTotalXP: newUserStats.totalXP,
        oldWeeklyProgress: oldUserStats.weeklyProgress,
        newWeeklyProgress: newUserStats.weeklyProgress,
        challengeCompleted: true
      },
      points: xpGained
    });

    console.log(' Challenge completion activity created');

    //  Check for new achievements triggered by challenge completion
    let newAchievements = [];
    try {
      console.log(' Checking for new achievements...');
      newAchievements = await Achievement.checkUserAchievements(userId);
      if (newAchievements.length > 0) {
        console.log(` ${newAchievements.length} new achievements unlocked!`);
        
        // Create achievement unlock activities
        for (const achievement of newAchievements) {
          await Activity.createActivity(userId, 'achievement_unlocked', {
            title: `🏆 Achievement Unlocked: ${achievement.title}`,
            description: `Unlocked "${achievement.title}" achievement by completing the "${challenge.title}" challenge!`,
            metadata: {
              achievementId: achievement._id,
              achievementTitle: achievement.title,
              achievementDescription: achievement.description,
              achievementCategory: achievement.category,
              achievementType: achievement.type,
              achievementRarity: achievement.rarity,
              xpReward: achievement.rewards.xp || 0,
              streakFreezeReward: achievement.rewards.streakFreeze || 0,
              triggerSource: 'challenge_completion',
              triggerChallengeId: challengeId,
              triggerChallengeTitle: challenge.title
            },
            points: achievement.rewards.xp || 0
          });

          console.log(`Achievement "${achievement.title}" recorded`);
        }
      }
    } catch (achievementError) {
      console.error(' Error checking achievements:', achievementError);
    }

    // Get final user stats after all updates
    const finalUser = await User.findById(userId);
    const finalStats = {
      totalXP: finalUser.gameData.totalXP,
      level: finalUser.gameData.level,
      rank: finalUser.gameData.rank,
      currentStreak: finalUser.gameData.currentStreak,
      weeklyProgress: finalUser.gameData.weeklyProgress,
      challengesCompleted: finalUser.gameData.challengesCompleted,
      streakFreezes: finalUser.gameData.streakFreezes,
      levelProgress: finalUser.levelProgress
    };

    console.log(' Final user stats:', finalStats);

    //  Prepare comprehensive response data for all frontend components
    const responseData = {
      // Challenge submission results
      success: true,
      challengeId: challengeId,
      score: submissionResult.score,
      percentage: submissionResult.score, // For backward compatibility
      correctAnswers: submissionResult.correctAnswers,
      totalQuestions: submissionResult.totalQuestions,
      timeSpent: timeSpent,
      
      // XP and progression
      xpGained: xpGained,
      baseXPReward: baseXPReward,
      performanceMultiplier: performanceMultiplier,
      
      // Level progression
      leveledUp: leveledUp,
      oldLevel: oldUserStats.level,
      newLevel: newUserStats.level,
      levelsGained: levelsGained,
      
      // Ranking information
      rankImproved: rankImproved,
      rankData: {
        oldRank: oldUserStats.rank,
        newRank: newUserStats.rank,
        rankImproved: rankImproved,
        rankImprovement: rankImprovement
      },
      
      // Achievement information
      achievementsUnlocked: newAchievements.map(ach => ({
        _id: ach._id,
        title: ach.title,
        description: ach.description,
        icon: ach.icon,
        category: ach.category,
        type: ach.type,
        rarity: ach.rarity,
        rewards: ach.rewards,
        unlockedAt: new Date(),
        unlocked: true
      })),
      
      //  Complete user stats for dashboard/leaderboard updates
      userStats: finalStats,
      
      // Challenge information
      challenge: {
        id: challenge._id,
        title: challenge.title,
        category: challenge.category,
        difficulty: challenge.difficulty,
        type: challenge.type,
        completed: true
      },
      
      // Real-time update flags for frontend
      realTimeUpdates: {
        xpUpdated: true,
        levelUpdated: leveledUp,
        rankUpdated: true,
        achievementsUpdated: newAchievements.length > 0,
        challengeCompleted: true,
        dashboardShouldRefresh: true,
        leaderboardShouldRefresh: rankImproved,
        streakUpdated: challenge.type === 'daily'
      },
      
      // Additional context
      statChanges: {
        xpChange: newUserStats.totalXP - oldUserStats.totalXP,
        levelChange: levelsGained,
        rankChange: rankImprovement,
        weeklyProgressChange: newUserStats.weeklyProgress - oldUserStats.weeklyProgress,
        challengeCompletionIncrease: 1
      },
      
      timestamp: new Date().toISOString()
    };

    console.log(' Challenge submission completed with FULL XP INTEGRATION');

    // Send success response with all data needed by frontend
    res.json({
      success: true,
      message: `Challenge completed successfully! Scored ${submissionResult.score}% and earned ${xpGained} XP${leveledUp ? `, leveled up to ${newUserStats.level}` : ''}${rankImproved ? `, rank improved by ${rankImprovement} positions` : ''}${newAchievements.length > 0 ? `, unlocked ${newAchievements.length} achievement${newAchievements.length > 1 ? 's' : ''}` : ''}!`,
      data: responseData
    });

    //  Emit real-time events for immediate UI updates (if you have WebSocket/Socket.io)
    try {
      // These events will be caught by your existing frontend real-time listeners
      const eventPayload = {
        type: 'challenge_completed',
        userId: userId,
        challengeId: challengeId,
        xpGained: xpGained,
        newTotal: newUserStats.totalXP,
        newLevel: newUserStats.level,
        newRank: newUserStats.rank,
        leveledUp: leveledUp,
        rankImproved: rankImproved,
        achievements: newAchievements,
        score: submissionResult.score,
        source: 'challenge_completion'
      };

      // Emit XP update event
      process.nextTick(() => {
        const eventEmitter = require('events');
        const gameEvents = new eventEmitter();
        gameEvents.emit('edugame_xp_updated', eventPayload);
        
        if (newAchievements.length > 0) {
          gameEvents.emit('edugame_achievements_unlocked', {
            userId: userId,
            achievements: newAchievements,
            source: 'challenge_completion'
          });
        }
        
        gameEvents.emit('edugame_challenge_completed', {
          userId: userId,
          challengeId: challengeId,
          score: submissionResult.score,
          xpGained: xpGained
        });
      });

      console.log(' Real-time events emitted');
    } catch (eventError) {
      console.error(' Error emitting real-time events:', eventError);
      // Don't fail the response if event emission fails
    }

  } catch (error) {
    console.error(' CRITICAL ERROR in challenge submission with XP integration:', error);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Error submitting challenge',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// @desc    Get challenge results
// @route   GET /api/challenges/:id/results
// @access  Private
exports.getChallengeResults = async (req, res) => {
  try {
    const challenge = await Challenge.findById(req.params.id);

    if (!challenge) {
      return res.status(404).json({
        success: false,
        message: 'Challenge not found'
      });
    }

    const userParticipation = challenge.participants.find(
      p => p.userId.toString() === req.user.id
    );

    if (!userParticipation || !userParticipation.completedAt) {
      return res.status(400).json({
        success: false,
        message: 'Challenge not completed yet'
      });
    }

    // Get leaderboard for this challenge
    const leaderboard = await Challenge.getChallengeLeaderboard(req.params.id, 10);

    res.json({
      success: true,
      data: {
        challenge: {
          id: challenge._id,
          title: challenge.title,
          category: challenge.category,
          difficulty: challenge.difficulty
        },
        userResult: {
          score: userParticipation.score,
          timeSpent: userParticipation.timeSpent,
          completedAt: userParticipation.completedAt,
          answers: userParticipation.answers
        },
        leaderboard: leaderboard,
        userRank: leaderboard.findIndex(entry => 
          entry.user._id.toString() === req.user.id
        ) + 1
      }
    });
  } catch (error) {
    console.error('Error fetching challenge results:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching challenge results',
      error: error.message
    });
  }
};

// @desc    Create a new challenge (Admin only)
// @route   POST /api/challenges
// @access  Private/Admin
exports.createChallenge = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const challengeData = {
      ...req.body,
      createdBy: req.user.id
    };

    const challenge = await Challenge.create(challengeData);

    console.log(` New challenge created: ${challenge.title} by ${req.user.id}`);

    res.status(201).json({
      success: true,
      message: 'Challenge created successfully',
      data: challenge
    });
  } catch (error) {
    console.error('Error creating challenge:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Error creating challenge',
      error: error.message
    });
  }
};