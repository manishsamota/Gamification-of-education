const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// this is import existing models
const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Activity = require('../models/Activity');
const Challenge = require('../models/Challenge');

// All routes are protected
router.use(protect);

// @route   GET /api/user-data/dashboard
// @desc    Get dashboard data with real-time achievement updates
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with populated achievements
    const user = await User.findById(userId)
      .select('-password')
      .populate('achievements.achievementId', 'title description icon type rewards');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get recent activities (last 10)
    const recentActivities = await Activity.find({ userId })
      .populate('metadata.challengeId', 'title category')
      .populate('metadata.achievementId', 'title icon')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get today's challenges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dailyChallenges = await Challenge.find({
      type: 'daily',
      isActive: true,
      startDate: { $lte: new Date() },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: today } }
      ]
    }).limit(3);

    // Add user status to challenges
    const challengesWithStatus = dailyChallenges.map(challenge => {
      const userParticipation = challenge.participants.find(
        p => p.userId.toString() === userId
      );

      return {
        ...challenge.toObject(),
        userStatus: userParticipation ? {
          participated: true,
          completed: !!userParticipation.completedAt,
          score: userParticipation.score || 0
        } : {
          participated: false,
          completed: false
        }
      };
    });

    // Calculate weekly progress
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyXP = user.activities
      .filter(activity => {
        const activityDate = new Date(activity.date);
        return activityDate >= weekAgo;
      })
      .reduce((sum, activity) => sum + activity.xpGained, 0);

    // Check for any achievements that might have been unlocked
    let newAchievements = [];
    try {
      newAchievements = await Achievement.checkUserAchievements(userId);
      if (newAchievements.length > 0) {
        console.log(` Dashboard detected ${newAchievements.length} new achievements for user ${userId}`);
        
        // Refresh user data to get updated achievements
        const refreshedUser = await User.findById(userId)
          .select('-password')
          .populate('achievements.achievementId', 'title description icon type rewards');
        
        // Use refreshed user data
        if (refreshedUser) {
          user.achievements = refreshedUser.achievements;
        }
      }
    } catch (achievementError) {
      console.error('Error checking achievements in dashboard:', achievementError);
    }

    const dashboardData = {
      user: {
        ...user.toObject(),
        levelProgress: user.levelProgress
      },
      recentActivities,
      dailyChallenges: challengesWithStatus,
      weeklyProgress: {
        current: weeklyXP,
        goal: user.gameData.weeklyGoal,
        percentage: user.gameData.weeklyGoal > 0 ? (weeklyXP / user.gameData.weeklyGoal) * 100 : 0
      },
      stats: {
        totalXP: user.gameData.totalXP,
        level: user.gameData.level,
        currentStreak: user.gameData.currentStreak,
        rank: user.gameData.rank,
        achievementsUnlocked: user.achievements.length
      },
      // Include newly unlocked achievements
      newAchievements: newAchievements.map(ach => ({
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
      hasNewAchievements: newAchievements.length > 0
    };

    res.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard data',
      error: error.message
    });
  }
});

// @route   GET /api/user-data/achievements
// @desc    Get user achievements with real-time progress and updates
// @access  Private
router.get('/achievements', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check for new achievements before fetching
    let newlyUnlocked = [];
    try {
      newlyUnlocked = await Achievement.checkUserAchievements(userId);
      if (newlyUnlocked.length > 0) {
        console.log(` Found ${newlyUnlocked.length} newly unlocked achievements for user ${userId}`);
      }
    } catch (achievementError) {
      console.error('Error checking for new achievements:', achievementError);
    }

    // Get all achievements
    const allAchievements = await Achievement.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    
    // Get user with fresh achievement data
    const user = await User.findById(userId)
      .populate('achievements.achievementId', 'title description icon category type rarity rewards criteria');

    // Calculate progress for all achievements with real-time data
    const achievementsWithProgress = await Promise.all(
      allAchievements.map(async (achievement) => {
        const userAchievement = user.achievements.find(
          ua => ua.achievementId && ua.achievementId._id.toString() === achievement._id.toString()
        );

        if (userAchievement) {
          return {
            ...achievement.toObject(),
            unlocked: true,
            unlockedAt: userAchievement.unlockedAt,
            progress: { 
              current: achievement.criteria.target, 
              target: achievement.criteria.target, 
              percentage: 100 
            }
          };
        } else {
          // Get real-time progress
          const progress = await Achievement.getUserProgress(userId, achievement._id);
          return {
            ...achievement.toObject(),
            unlocked: false,
            progress: progress || { 
              current: 0, 
              target: achievement.criteria.target, 
              percentage: 0 
            }
          };
        }
      })
    );

    // Calculate enhanced stats
    const unlockedCount = user.achievements.length;
    const totalCount = allAchievements.length;

    res.json({
      success: true,
      data: {
        achievements: achievementsWithProgress,
        stats: {
          total: totalCount,
          unlocked: unlockedCount,
          percentage: totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0
        },
        // Include newly unlocked achievements for real-time updates
        newlyUnlocked: newlyUnlocked.map(ach => ({
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
        hasNewAchievements: newlyUnlocked.length > 0,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching achievements',
      error: error.message
    });
  }
});

// @route   GET /api/user-data/activity-calendar
// @desc    Get activity calendar data with achievement context
// @access  Private
router.get('/activity-calendar', async (req, res) => {
  try {
    const userId = req.user.id;
    const { year = new Date().getFullYear(), month } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Filter activities by date range
    let startDate, endDate;
    
    if (month) {
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0);
    } else {
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31);
    }

    // Get activities from user model
    const userActivities = user.activities.filter(activity => {
      const activityDate = new Date(activity.date);
      return activityDate >= startDate && activityDate <= endDate;
    });

    // Get activities from Activity collection including achievement unlocks
    const externalActivities = await Activity.find({
      userId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('metadata.achievementId', 'title icon');

    // Combine and group activities by date
    const calendar = {};
    
    // Process user model activities
    userActivities.forEach(activity => {
      const dateKey = activity.date.toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = {
          date: dateKey,
          count: 0,
          xp: 0,
          achievements: []
        };
      }
      calendar[dateKey].count += activity.activitiesCount;
      calendar[dateKey].xp += activity.xpGained;
    });

    // Process external activities including achievements
    externalActivities.forEach(activity => {
      const dateKey = activity.createdAt.toISOString().split('T')[0];
      if (!calendar[dateKey]) {
        calendar[dateKey] = {
          date: dateKey,
          count: 0,
          xp: 0,
          achievements: []
        };
      }
      calendar[dateKey].count += 1;
      calendar[dateKey].xp += activity.metadata?.xpGained || 0;
      
      // Track achievement unlocks by date
      if (activity.type === 'achievement_unlocked' && activity.metadata?.achievementId) {
        calendar[dateKey].achievements.push({
          id: activity.metadata.achievementId._id,
          title: activity.metadata.achievementId.title,
          icon: activity.metadata.achievementId.icon
        });
      }
    });

    res.json({
      success: true,
      data: {
        calendar: Object.values(calendar).sort((a, b) => new Date(a.date) - new Date(b.date)),
        stats: {
          currentStreak: user.gameData.currentStreak,
          longestStreak: user.gameData.longestStreak,
          totalDays: Object.keys(calendar).length,
          totalAchievements: Object.values(calendar).reduce((sum, day) => sum + day.achievements.length, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching activity calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching activity calendar',
      error: error.message
    });
  }
});

// @route   POST /api/user-data/check-achievements
// @desc    Manually check for new achievements (for real-time updates)
// @access  Private
router.post('/check-achievements', async (req, res) => {
  try {
    const userId = req.user.id;
    
    console.log(`Manual achievement check requested for user ${userId}`);
    
    // Check for new achievements
    const newAchievements = await Achievement.checkUserAchievements(userId);
    
    if (newAchievements.length > 0) {
      console.log(` Found ${newAchievements.length} new achievements!`);
      
      // Get updated user data
      const user = await User.findById(userId)
        .select('-password')
        .populate('achievements.achievementId', 'title description icon type rewards');
      
      // Create activity records for the new achievements
      for (const achievement of newAchievements) {
        await Activity.createActivity(userId, 'achievement_unlocked', {
          title: ` Achievement Unlocked: ${achievement.title}`,
          description: `Unlocked "${achievement.title}" achievement!`,
          metadata: {
            achievementId: achievement._id,
            achievementTitle: achievement.title,
            achievementCategory: achievement.category,
            achievementRarity: achievement.rarity,
            xpReward: achievement.rewards.xp || 0,
            triggerSource: 'manual_check'
          },
          points: achievement.rewards.xp || 0
        });
      }
      
      res.json({
        success: true,
        message: `${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''} unlocked!`,
        data: {
          newAchievements: newAchievements.map(ach => ({
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
          userStats: {
            totalXP: user.gameData.totalXP,
            level: user.gameData.level,
            achievementsUnlocked: user.achievements.length
          }
        }
      });
    } else {
      res.json({
        success: true,
        message: 'No new achievements available',
        data: {
          newAchievements: [],
          userStats: {
            totalXP: req.user.gameData?.totalXP || 0,
            level: req.user.gameData?.level || 1,
            achievementsUnlocked: req.user.achievements?.length || 0
          }
        }
      });
    }

  } catch (error) {
    console.error('Error checking achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking for new achievements',
      error: error.message
    });
  }
});

// @route   GET /api/user-data/achievement-progress/:achievementId
// @desc    Get real-time progress for a specific achievement
// @access  Private
router.get('/achievement-progress/:achievementId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { achievementId } = req.params;
    
    const achievement = await Achievement.findById(achievementId);
    if (!achievement) {
      return res.status(404).json({
        success: false,
        message: 'Achievement not found'
      });
    }
    
    const progress = await Achievement.getUserProgress(userId, achievementId);
    
    res.json({
      success: true,
      data: {
        achievementId,
        progress: progress || {
          current: 0,
          target: achievement.criteria.target,
          percentage: 0,
          isCompleted: false
        }
      }
    });

  } catch (error) {
    console.error('Error fetching achievement progress:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching achievement progress',
      error: error.message
    });
  }
});

// @route   GET /api/user-data/recent-achievements
// @desc    Get recently unlocked achievements
// @access  Private
router.get('/recent-achievements', async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;
    
    // Get recent achievement unlock activities
    const recentAchievements = await Activity.find({
      userId,
      type: 'achievement_unlocked'
    })
    .populate('metadata.achievementId', 'title description icon category type rarity rewards')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));
    
    const achievements = recentAchievements.map(activity => ({
      _id: activity.metadata.achievementId._id,
      title: activity.metadata.achievementId.title,
      description: activity.metadata.achievementId.description,
      icon: activity.metadata.achievementId.icon,
      category: activity.metadata.achievementId.category,
      type: activity.metadata.achievementId.type,
      rarity: activity.metadata.achievementId.rarity,
      rewards: activity.metadata.achievementId.rewards,
      unlockedAt: activity.createdAt,
      unlocked: true
    }));
    
    res.json({
      success: true,
      data: {
        recentAchievements: achievements,
        total: recentAchievements.length
      }
    });

  } catch (error) {
    console.error('Error fetching recent achievements:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching recent achievements',
      error: error.message
    });
  }
});

// @route   GET /api/user-data/stats
// @desc    Get comprehensive user stats including achievement data
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId)
      .select('-password')
      .populate('achievements.achievementId', 'category type rarity');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get achievement statistics
    const allAchievements = await Achievement.find({ isActive: true });
    const unlockedAchievements = user.achievements.length;
    
    // Calculate achievement breakdown by category and rarity
    const achievementBreakdown = {
      byCategory: {},
      byRarity: {},
      byType: {}
    };
    
    user.achievements.forEach(userAch => {
      if (userAch.achievementId) {
        const ach = userAch.achievementId;
        
        achievementBreakdown.byCategory[ach.category] = (achievementBreakdown.byCategory[ach.category] || 0) + 1;
        achievementBreakdown.byRarity[ach.rarity] = (achievementBreakdown.byRarity[ach.rarity] || 0) + 1;
        achievementBreakdown.byType[ach.type] = (achievementBreakdown.byType[ach.type] || 0) + 1;
      }
    });
    
    // Get recent activities
    const recentActivities = await Activity.find({ userId })
      .sort({ createdAt: -1 })
      .limit(10);
    
    const stats = {
      // Core game stats
      totalXP: user.gameData.totalXP,
      level: user.gameData.level,
      currentStreak: user.gameData.currentStreak,
      longestStreak: user.gameData.longestStreak,
      rank: user.gameData.rank,
      weeklyProgress: user.gameData.weeklyProgress,
      weeklyGoal: user.gameData.weeklyGoal,
      
      // Achievement stats
      achievements: {
        total: allAchievements.length,
        unlocked: unlockedAchievements,
        percentage: allAchievements.length > 0 ? (unlockedAchievements / allAchievements.length) * 100 : 0,
        breakdown: achievementBreakdown
      },
      
      // Activity stats
      activities: {
        total: recentActivities.length,
        thisWeek: recentActivities.filter(a => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return a.createdAt >= weekAgo;
        }).length
      },
      
      // Progress info
      levelProgress: user.levelProgress,
      joinedAt: user.createdAt,
      lastLogin: user.lastLogin
    };
    
    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching user stats',
      error: error.message
    });
  }
});

module.exports = router;