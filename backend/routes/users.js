const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const Activity = require('../models/Activity');
const Achievement = require('../models/Achievement');
const { protect } = require('../middleware/auth');

const router = express.Router();

// @desc    Add XP to user with comprehensive tracking and database persistence
// @route   POST /api/users/xp
// @access  Private
router.post('/xp', [
  protect,
  body('amount').isInt({ min: 1, max: 1000 }).withMessage('XP amount must be between 1 and 1000'),
  body('source').optional().isIn(['challenge', 'course', 'quiz', 'practice', 'achievement', 'daily_login', 'streak_bonus', 'manual', 'batch']),
  body('metadata').optional().isObject()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log(' XP validation failed:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { amount, source = 'practice', metadata = {} } = req.body;
    
    console.log(` XP Addition Request: User ${req.user.id}, Amount: ${amount}, Source: ${source}`);
    
    //  Use findById to get fresh user data
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Store old values for comparison and logging
    const oldLevel = user.gameData.level;
    const oldTotalXP = user.gameData.totalXP;
    const oldWeeklyProgress = user.gameData.weeklyProgress || 0;
    const oldRank = user.gameData.rank;

    console.log(` Before XP Addition: Level ${oldLevel}, XP ${oldTotalXP}, Weekly: ${oldWeeklyProgress}, Rank: ${oldRank}`);

    //  Use the model's addXP method which handles everything properly
    const xpResult = await user.addXP(amount, source);
    
    if (!xpResult || !xpResult.success) {
      console.error(' XP addition failed:', xpResult);
      return res.status(500).json({
        success: false,
        message: 'Failed to add XP to user',
        error: xpResult?.error || 'Unknown error'
      });
    }

    //  Fetch fresh user data after XP addition
    const updatedUser = await User.findById(req.user.id);
    
    const newLevel = updatedUser.gameData.level;
    const newTotalXP = updatedUser.gameData.totalXP;
    const newWeeklyProgress = updatedUser.gameData.weeklyProgress || 0;
    const leveledUp = newLevel > oldLevel;

    console.log(` After XP Addition: Level ${newLevel}, XP ${newTotalXP}, Weekly: ${newWeeklyProgress}, Leveled Up: ${leveledUp}`);

    // Create comprehensive activity record
    try {
      await Activity.createActivity(user._id, 'xp_gained', {
        title: `XP Gained: +${amount} from ${source}`,
        description: `Earned ${amount} XP from ${source}${metadata.challengeTitle ? `: ${metadata.challengeTitle}` : ''}${leveledUp ? ` (Level up to ${newLevel}!)` : ''}`,
        metadata: {
          xpGained: amount,
          source: source,
          oldLevel,
          newLevel,
          oldTotalXP,
          newTotalXP,
          leveledUp,
          weeklyProgressBefore: oldWeeklyProgress,
          weeklyProgressAfter: newWeeklyProgress,
          xpSource: source,
          ...metadata
        },
        points: amount
      });
      
      console.log(' XP activity record created');
    } catch (activityError) {
      console.error(' Failed to create XP activity:', activityError);
      // Don't fail the XP addition if activity creation fails
    }

    // If leveled up, create separate level up activity
    if (leveledUp) {
      try {
        await Activity.createActivity(user._id, 'level_up', {
          title: `🎉 Level Up! Reached Level ${newLevel}`,
          description: `Congratulations! You've advanced from level ${oldLevel} to level ${newLevel}!`,
          metadata: {
            oldLevel,
            newLevel,
            totalXP: newTotalXP,
            xpSource: source,
            levelsGained: newLevel - oldLevel,
            triggerActivity: metadata.challengeTitle || source
          },
          points: (newLevel - oldLevel) * 50 // Bonus points for leveling up
        });

        console.log(` LEVEL UP ACTIVITY CREATED! User ${user.name} advanced from Level ${oldLevel} to Level ${newLevel}`);
      } catch (levelActivityError) {
        console.error(' Failed to create level up activity:', levelActivityError);
      }
    }

    // Check for new achievements 
    setTimeout(async () => {
      try {
        const newAchievements = await Achievement.checkUserAchievements(user._id);
        if (newAchievements.length > 0) {
          console.log(` User ${user.name} unlocked ${newAchievements.length} new achievements after XP gain!`);
          
          // Create achievement unlock activities
          for (const achievement of newAchievements) {
            await Activity.createActivity(user._id, 'achievement_unlocked', {
              title: `🏆 Achievement Unlocked: ${achievement.title}`,
              description: `Unlocked the "${achievement.title}" achievement!`,
              metadata: {
                achievementId: achievement._id,
                achievementTitle: achievement.title,
                achievementCategory: achievement.category,
                achievementRarity: achievement.rarity,
                xpReward: achievement.rewards.xp || 0,
                triggerSource: source
              },
              points: achievement.rewards.xp || 0
            });
          }
        }
      } catch (achievementError) {
        console.error(' Error checking achievements:', achievementError);
      }
    }, 100);

    // Update user rankings (async to not block response)
    setTimeout(() => {
      User.updateRankings().catch(error => {
        console.error(' Error updating rankings:', error);
      });
    }, 500);

    //  Get fresh user data to return
    const finalUser = await User.findById(req.user.id).select('-password');

    // Prepare comprehensive response data
    const responseData = {
      xpAdded: amount,
      totalXP: finalUser.gameData.totalXP,
      level: finalUser.gameData.level,
      weeklyProgress: finalUser.gameData.weeklyProgress,
      weeklyGoal: finalUser.gameData.weeklyGoal,
      currentStreak: finalUser.gameData.currentStreak,
      rank: finalUser.gameData.rank,
      leveledUp,
      oldLevel,
      newLevel,
      levelsGained: newLevel - oldLevel,
      levelProgress: finalUser.levelProgress,
      gameData: finalUser.gameData,
      // Additional context for frontend
      xpToNextLevel: 1000 - (finalUser.gameData.totalXP % 1000),
      currentLevelProgress: (finalUser.gameData.totalXP % 1000),
      weeklyProgressPercentage: finalUser.gameData.weeklyGoal > 0 ? (finalUser.gameData.weeklyProgress / finalUser.gameData.weeklyGoal) * 100 : 0,
      timestamp: new Date().toISOString(),
      source,
      metadata
    };

    console.log(`XP Addition Complete: +${amount} XP (Total: ${finalUser.gameData.totalXP}, Level: ${finalUser.gameData.level})`);

    res.json({
      success: true,
      message: `Successfully added ${amount} XP!${leveledUp ? ` Congratulations on reaching Level ${newLevel}!` : ''}`,
      data: responseData
    });

  } catch (error) {
    console.error(' Critical error in XP addition:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding XP to user',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @desc    Update user streak with XP rewards
// @route   POST /api/users/update-streak
// @access  Private
router.post('/update-streak', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const oldStreak = user.gameData.currentStreak;
    const oldLongestStreak = user.gameData.longestStreak;
    
    // Update streak using model method
    user.updateStreak();
    await user.save();
    
    const newStreak = user.gameData.currentStreak;
    const newLongestStreak = user.gameData.longestStreak;
    const streakIncreased = newStreak > oldStreak;
    const newRecord = newLongestStreak > oldLongestStreak;

    console.log(` Streak Update: ${oldStreak} → ${newStreak} days (Record: ${newRecord})`);

    // Create activity for streak update
    if (streakIncreased) {
      await Activity.createActivity(user._id, 'streak_milestone', {
        title: `🔥 Daily Streak: ${newStreak} Days`,
        description: `Maintained learning streak for ${newStreak} consecutive days!${newRecord ? ' New personal record!' : ''}`,
        metadata: {
          oldStreak,
          newStreak,
          streakCount: newStreak,
          isNewRecord: newRecord,
          longestStreak: newLongestStreak
        },
        points: newStreak * 2 // Award points equal to streak days * 2
      });

      // Award bonus XP for streak milestones
      let bonusXP = 0;
      if (newStreak % 30 === 0) { // Monthly milestone
        bonusXP = 100;
      } else if (newStreak % 7 === 0) { // Weekly milestone
        bonusXP = 25;
      } else if (newStreak % 3 === 0) { // Every 3 days
        bonusXP = 10;
      }

      if (bonusXP > 0) {
        await user.addXP(bonusXP, 'streak_bonus');
        
        await Activity.createActivity(user._id, 'xp_gained', {
          title: `🔥 Streak Bonus: +${bonusXP} XP`,
          description: `Earned ${bonusXP} bonus XP for ${newStreak}-day streak milestone!`,
          metadata: {
            xpGained: bonusXP,
            source: 'streak_bonus',
            streakDays: newStreak,
            milestoneType: newStreak % 30 === 0 ? 'monthly' : newStreak % 7 === 0 ? 'weekly' : 'mini'
          },
          points: bonusXP
        });

        console.log(` Streak Bonus: ${newStreak} days earned ${bonusXP} XP`);
      }
    }

    // Get refreshed user data
    const refreshedUser = await User.findById(req.user.id).select('-password');

    res.json({
      success: true,
      message: streakIncreased ? `Streak updated to ${newStreak} days!${newRecord ? ' New record!' : ''}` : 'Streak maintained',
      data: {
        gameData: refreshedUser.gameData,
        streakIncreased,
        oldStreak,
        newStreak,
        newRecord,
        bonusXPEarned: streakIncreased && newStreak % 3 === 0
      }
    });

  } catch (error) {
    console.error(' Update streak error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating streak'
    });
  }
});

// @desc    Use streak freeze
// @route   POST /api/users/use-streak-freeze
// @access  Private
router.post('/use-streak-freeze', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.gameData.streakFreezes <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No streak freezes available'
      });
    }

    // Use one streak freeze
    user.gameData.streakFreezes -= 1;
    await user.save();

    // Create activity record
    await Activity.createActivity(user._id, 'streak_freeze_used', {
      title: '❄️ Streak Freeze Used',
      description: 'Used a streak freeze to maintain your learning streak',
      metadata: {
        remainingFreezes: user.gameData.streakFreezes,
        currentStreak: user.gameData.currentStreak
      }
    });

    console.log(` User ${user.name} used streak freeze. Remaining: ${user.gameData.streakFreezes}`);

    res.json({
      success: true,
      message: 'Streak freeze used successfully!',
      data: {
        gameData: user.gameData,
        remainingFreezes: user.gameData.streakFreezes,
        streakFreezesRemaining: user.gameData.streakFreezes
      }
    });

  } catch (error) {
    console.error(' Use streak freeze error:', error);
    res.status(500).json({
      success: false,
      message: 'Error using streak freeze'
    });
  }
});

// @desc    Bulk update user stats
// @route   PUT /api/users/stats
// @access  Private
router.put('/stats', [
  protect,
  body('gameData').optional().isObject(),
  body('xpToAdd').optional().isInt({ min: 0 }),
  body('source').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const { gameData, xpToAdd, source = 'system' } = req.body;
    let leveledUp = false;
    let oldLevel = user.gameData.level;

    console.log(` Bulk Stats Update for ${user.name}:`, { gameData, xpToAdd, source });

    // Update game data if provided
    if (gameData) {
      Object.keys(gameData).forEach(key => {
        if (user.gameData[key] !== undefined) {
          user.gameData[key] = gameData[key];
        }
      });
    }

    // Add XP if provided
    if (xpToAdd && xpToAdd > 0) {
      await user.addXP(xpToAdd, source);
      leveledUp = user.gameData.level > oldLevel;
    }

    await user.save();

    // Create activity for bulk update
    await Activity.createActivity(user._id, 'stats_updated', {
      title: 'Stats Updated',
      description: `User statistics updated${xpToAdd ? ` (+${xpToAdd} XP)` : ''}${leveledUp ? ` (Level up to ${user.gameData.level}!)` : ''}`,
      metadata: {
        updatedFields: Object.keys(gameData || {}),
        xpAdded: xpToAdd || 0,
        source: source,
        leveledUp,
        oldLevel,
        newLevel: user.gameData.level
      },
      points: xpToAdd || 0
    });

    // Update rankings (async)
    User.updateRankings().catch(console.error);

    console.log(`Stats updated successfully for ${user.name}`);

    res.json({
      success: true,
      message: 'User stats updated successfully',
      data: {
        id: user._id,
        gameData: user.gameData,
        levelProgress: user.levelProgress,
        leveledUp,
        oldLevel,
        newLevel: user.gameData.level
      }
    });

  } catch (error) {
    console.error(' Update stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating stats'
    });
  }
});

// @desc    Get real-time user stats
// @route   GET /api/users/stats
// @access  Private
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent activities for context
    const recentActivities = await Activity.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('metadata.challengeId', 'title')
      .populate('metadata.achievementId', 'title icon');

    // Calculate weekly XP
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyXPFromActivities = recentActivities
      .filter(activity => activity.createdAt >= weekAgo && activity.metadata?.xpGained)
      .reduce((sum, activity) => sum + (activity.metadata.xpGained || 0), 0);

    // Get achievement progress
    const allAchievements = await Achievement.find({ isActive: true });
    const unlockedCount = user.achievements.length;

    const statsData = {
      // Core game data
      totalXP: user.gameData.totalXP,
      level: user.gameData.level,
      currentStreak: user.gameData.currentStreak,
      longestStreak: user.gameData.longestStreak,
      rank: user.gameData.rank,
      streakFreezes: user.gameData.streakFreezes,
      
      // Progress data
      levelProgress: user.levelProgress,
      weeklyProgress: user.gameData.weeklyProgress || weeklyXPFromActivities,
      weeklyGoal: user.gameData.weeklyGoal,
      
      // Achievement data
      achievementsUnlocked: unlockedCount,
      totalAchievements: allAchievements.length,
      achievementProgress: allAchievements.length > 0 ? (unlockedCount / allAchievements.length) * 100 : 0,
      
      // Activity data
      recentActivities: recentActivities.slice(0, 5),
      activeDaysThisWeek: user.activities.filter(a => {
        const activityDate = new Date(a.date);
        return activityDate >= weekAgo;
      }).length,
      
      // Timestamps
      lastUpdated: new Date().toISOString(),
      lastLogin: user.lastLogin
    };

    res.json({
      success: true,
      data: statsData
    });

  } catch (error) {
    console.error(' Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user stats'
    });
  }
});

// @desc    Get leaderboard with real-time data
// @route   GET /api/users/leaderboard
// @access  Private
router.get('/leaderboard', protect, async (req, res) => {
  try {
    const { type = 'xp', limit = 50 } = req.query;
    
    console.log(` Leaderboard request: type=${type}, limit=${limit}`);
    
    let sortField;
    switch (type) {
      case 'streak':
        sortField = { 'gameData.currentStreak': -1, 'gameData.totalXP': -1 };
        break;
      case 'level':
        sortField = { 'gameData.level': -1, 'gameData.totalXP': -1 };
        break;
      default:
        sortField = { 'gameData.totalXP': -1 };
    }
    
    const users = await User.find({ isActive: true })
      .select('name avatar gameData.totalXP gameData.level gameData.currentStreak gameData.rank lastLogin')
      .sort(sortField)
      .limit(parseInt(limit));

    const currentUser = await User.findById(req.user.id)
      .select('name avatar gameData.totalXP gameData.level gameData.currentStreak gameData.rank');

    // Calculate current user's rank for this specific leaderboard type
    let userRank = 1;
    if (currentUser) {
      const currentUserValue = type === 'streak' ? currentUser.gameData.currentStreak :
                              type === 'level' ? currentUser.gameData.level :
                              currentUser.gameData.totalXP;
      
      const fieldName = type === 'streak' ? 'gameData.currentStreak' :
                       type === 'level' ? 'gameData.level' :
                       'gameData.totalXP';
      
      userRank = await User.countDocuments({
        isActive: true,
        [fieldName]: { $gt: currentUserValue }
      }) + 1;
    }

    const leaderboardData = users.map((user, index) => ({
      id: user._id,
      name: user.name,
      avatar: user.avatar,
      xp: user.gameData.totalXP,
      totalXP: user.gameData.totalXP,
      level: user.gameData.level,
      streak: user.gameData.currentStreak,
      currentStreak: user.gameData.currentStreak,
      rank: index + 1,
      lastActive: user.lastLogin
    }));

    console.log(`Leaderboard generated: ${leaderboardData.length} users, user rank: ${userRank}`);

    res.json({
      success: true,
      data: {
        leaderboard: leaderboardData,
        userRank: userRank,
        currentUser: currentUser ? {
          id: currentUser._id,
          name: currentUser.name,
          avatar: currentUser.avatar,
          xp: currentUser.gameData.totalXP,
          totalXP: currentUser.gameData.totalXP,
          level: currentUser.gameData.level,
          streak: currentUser.gameData.currentStreak,
          currentStreak: currentUser.gameData.currentStreak,
          rank: userRank
        } : null,
        type: type,
        totalUsers: await User.countDocuments({ isActive: true }),
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error(' Get leaderboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching leaderboard'
    });
  }
});

// @desc    Get current user profile with real-time data
// @route   GET /api/users/profile
// @access  Private
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .populate('achievements.achievementId', 'title description icon type rewards');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent activities
    const recentActivities = await Activity.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('metadata.challengeId', 'title')
      .populate('metadata.achievementId', 'title icon');

    console.log(` Profile fetched for ${user.name}: Level ${user.gameData.level}, ${user.gameData.totalXP} XP`);

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        provider: user.provider,
        profile: user.profile,
        gameData: user.gameData,
        preferences: user.preferences,
        activities: user.activities.slice(-10),
        achievements: user.achievements,
        dailySchedule: user.dailySchedule,
        levelProgress: user.levelProgress,
        age: user.age,
        isEmailVerified: user.isEmailVerified,
        subscription: user.subscription,
        joinedAt: user.createdAt,
        lastLogin: user.lastLogin,
        recentActivities: recentActivities,
        stats: {
          totalActivities: recentActivities.length,
          xpThisWeek: recentActivities
            .filter(a => a.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
            .reduce((sum, a) => sum + (a.metadata?.xpGained || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error(' Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching profile'
    });
  }
});

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
router.put('/profile', [
  protect,
  body('name').optional().trim().isLength({ min: 2, max: 50 }),
  body('profile.bio').optional().isLength({ max: 500 }),
  body('profile.location').optional().isLength({ max: 100 }),
  body('profile.school').optional().isLength({ max: 100 }),
  body('profile.grade').optional().isIn(['elementary', 'middle', 'high', 'college', 'other']),
  body('profile.interests').optional().isArray({ max: 10 }),
  body('profile.learningGoals').optional().isArray({ max: 5 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update allowed fields
    const updates = {};
    
    if (req.body.name) {
      updates.name = req.body.name.trim();
    }
    
    if (req.body.profile) {
      const currentProfile = user.profile?.toObject ? user.profile.toObject() : (user.profile || {});
      
      updates.profile = {
        ...currentProfile,
        bio: req.body.profile.bio !== undefined ? req.body.profile.bio : currentProfile.bio,
        location: req.body.profile.location !== undefined ? req.body.profile.location : currentProfile.location,
        school: req.body.profile.school !== undefined ? req.body.profile.school : currentProfile.school,
        grade: req.body.profile.grade !== undefined ? req.body.profile.grade : currentProfile.grade,
        interests: req.body.profile.interests !== undefined 
          ? req.body.profile.interests 
          : (currentProfile.interests || []),
        learningGoals: req.body.profile.learningGoals !== undefined 
          ? req.body.profile.learningGoals 
          : (currentProfile.learningGoals || [])
      };
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { 
        new: true, 
        runValidators: true,
        upsert: false
      }
    ).select('-password');

    // Create activity for profile update
    await Activity.createActivity(req.user.id, 'profile_updated', {
      title: 'Profile Updated',
      description: 'Updated profile information',
      metadata: {
        updatedFields: Object.keys(updates),
        hasNewName: !!req.body.name,
        hasNewBio: !!req.body.profile?.bio
      }
    });

    console.log(`Profile updated for ${updatedUser.name}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        provider: updatedUser.provider,
        profile: updatedUser.profile,
        gameData: updatedUser.gameData,
        preferences: updatedUser.preferences,
        activities: updatedUser.activities.slice(-10),
        achievements: updatedUser.achievements,
        dailySchedule: updatedUser.dailySchedule,
        levelProgress: updatedUser.levelProgress,
        age: updatedUser.age,
        isEmailVerified: updatedUser.isEmailVerified,
        subscription: updatedUser.subscription,
        joinedAt: updatedUser.createdAt,
        lastLogin: updatedUser.lastLogin
      }
    });
  } catch (error) {
    console.error(' Update profile error:', error);
    
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
      message: 'Error updating profile'
    });
  }
});

// @desc    Get user activities with XP tracking
// @route   GET /api/users/activities
// @access  Private
router.get('/activities', protect, async (req, res) => {
  try {
    const { limit = 20, offset = 0, type } = req.query;
    
    const user = await User.findById(req.user.id).select('activities');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get external activities with XP information
    let activityQuery = { userId: req.user.id };
    if (type) {
      activityQuery.type = type;
    }

    const externalActivities = await Activity.find(activityQuery)
      .populate('metadata.challengeId', 'title category')
      .populate('metadata.achievementId', 'title icon')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    // Combine activities with XP totals
    const combinedActivities = [
      ...externalActivities,
      ...user.activities.map(activity => ({
        ...activity.toObject(),
        type: activity.type || 'general',
        createdAt: activity.date,
        title: `Activity on ${activity.date.toDateString()}`,
        description: `Completed ${activity.activitiesCount} activities, earned ${activity.xpGained} XP`,
        metadata: {
          xpGained: activity.xpGained,
          activitiesCount: activity.activitiesCount,
          subjects: activity.subjects
        }
      }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Calculate total XP from activities
    const totalXPFromActivities = combinedActivities
      .reduce((sum, activity) => sum + (activity.metadata?.xpGained || 0), 0);

    res.json({
      success: true,
      data: {
        activities: combinedActivities.slice(0, parseInt(limit)),
        total: combinedActivities.length,
        totalXPFromActivities,
        stats: {
          xpGainedToday: combinedActivities
            .filter(a => {
              const today = new Date();
              const activityDate = new Date(a.createdAt);
              return activityDate.toDateString() === today.toDateString();
            })
            .reduce((sum, a) => sum + (a.metadata?.xpGained || 0), 0)
        }
      }
    });
  } catch (error) {
    console.error(' Get activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activities'
    });
  }
});

// @desc    Manual XP sync endpoint for debugging
// @route   POST /api/users/sync-xp
// @access  Private
router.post('/sync-xp', protect, async (req, res) => {
  try {
    console.log(` Manual XP sync requested for user ${req.user.id}`);
    
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Recalculate level based on current XP
    const correctLevel = Math.floor(user.gameData.totalXP / 1000) + 1;
    
    if (correctLevel !== user.gameData.level) {
      console.log(` Level correction: ${user.gameData.level} → ${correctLevel}`);
      user.gameData.level = correctLevel;
      await user.save();
    }

    // Update rankings
    await User.updateRankings();

    // Get fresh data
    const syncedUser = await User.findById(req.user.id).select('-password');

    console.log(`XP sync completed for ${user.name}`);

    res.json({
      success: true,
      message: 'XP data synchronized successfully',
      data: {
        gameData: syncedUser.gameData,
        levelProgress: syncedUser.levelProgress,
        correctionMade: correctLevel !== user.gameData.level,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(' XP sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Error syncing XP data'
    });
  }
});

module.exports = router;