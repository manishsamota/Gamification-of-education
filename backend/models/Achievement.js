
const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Achievement title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Achievement description is required'],
    maxlength: [300, 'Description cannot be longer than 300 characters']
  },
  icon: {
    type: String,
    default: '🏆'
  },
  category: {
    type: String,
    enum: ['streak', 'xp', 'challenges', 'courses', 'social', 'special'],
    required: true
  },
  type: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'legendary'],
    default: 'bronze'
  },
  criteria: {
    type: {
      type: String,
      enum: ['streak_days', 'total_xp', 'challenges_completed', 'courses_completed', 'login_days', 'perfect_scores', 'custom'],
      required: true
    },
    target: {
      type: Number,
      required: true
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all_time'],
      default: 'all_time'
    }
  },
  rewards: {
    xp: {
      type: Number,
      default: 0
    },
    badge: String,
    title: String,
    streakFreeze: {
      type: Number,
      default: 0
    }
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSecret: {
    type: Boolean,
    default: false
  },
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Achievement'
  }],
  order: {
    type: Number,
    default: 0
  },
  totalUnlocked: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// these are virtuals
achievementSchema.virtual('rarityPercentage').get(function() {
  const rarityMap = {
    common: 50,
    uncommon: 25,
    rare: 10,
    epic: 3,
    legendary: 1
  };
  return rarityMap[this.rarity] || 50;
});

//  Static method to check user achievements with better challenge integration
achievementSchema.statics.checkUserAchievements = async function(userId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  if (!user) return [];

  const achievements = await this.find({ isActive: true });
  const newlyUnlocked = [];

  for (const achievement of achievements) {
    // This will check if user already has this achievement
    const hasAchievement = user.achievements.some(
      userAch => userAch.achievementId.toString() === achievement._id.toString()
    );

    if (hasAchievement) continue;

    // Check if user meets the criteria
    const meetsRequirements = await checkAchievementCriteria(user, achievement);
    
    if (meetsRequirements) {
      // Add achievement to user
      user.achievements.push({
        achievementId: achievement._id,
        unlockedAt: new Date(),
        isCompleted: true
      });

      // Applied rewards before saving user it is important for XP achievements
      if (achievement.rewards.xp > 0) {
        console.log(` Achievement "${achievement.title}" grants ${achievement.rewards.xp} XP`);
        await user.addXP(achievement.rewards.xp, 'achievement_unlock', {
          achievementId: achievement._id,
          achievementTitle: achievement.title
        });
      }

      if (achievement.rewards.streakFreeze > 0) {
        user.gameData.streakFreezes += achievement.rewards.streakFreeze;
        console.log(`Achievement "${achievement.title}" grants ${achievement.rewards.streakFreeze} streak freezes`);
      }

      // Update achievement stats
      achievement.totalUnlocked += 1;
      await achievement.save();

      newlyUnlocked.push(achievement);
    }
  }

  if (newlyUnlocked.length > 0) {
    await user.save();
    console.log(`User ${user.name} unlocked ${newlyUnlocked.length} achievements!`);
  }

  return newlyUnlocked;
};

//  Helper function to check achievement criteria with better challenge tracking
async function checkAchievementCriteria(user, achievement) {
  const { type, target, timeframe } = achievement.criteria;

  try {
    switch (type) {
      case 'streak_days':
        return user.gameData.currentStreak >= target;

      case 'total_xp':
        return user.gameData.totalXP >= target;

      case 'challenges_completed':
        // This is  better challenge completion tracking
        const Challenge = mongoose.model('Challenge');
        let completedChallenges;
        
        if (timeframe === 'daily') {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          completedChallenges = await Challenge.countDocuments({
            'participants.userId': user._id,
            'participants.completedAt': { 
              $exists: true, 
              $gte: today, 
              $lt: tomorrow 
            }
          });
        } else if (timeframe === 'weekly') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          completedChallenges = await Challenge.countDocuments({
            'participants.userId': user._id,
            'participants.completedAt': { 
              $exists: true, 
              $gte: weekAgo 
            }
          });
        } else {
         
          completedChallenges = await Challenge.countDocuments({
            'participants.userId': user._id,
            'participants.completedAt': { $exists: true }
          });
        }
        
        console.log(` User ${user.name} has completed ${completedChallenges} challenges (${timeframe})`);
        return completedChallenges >= target;

      case 'perfect_scores':
        //  Perfect score tracking
        const Challenge2 = mongoose.model('Challenge');
        let perfectScores;
        
        if (timeframe === 'weekly') {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          
          perfectScores = await Challenge2.countDocuments({
            'participants.userId': user._id,
            'participants.score': { $gte: 100 },
            'participants.completedAt': { 
              $exists: true, 
              $gte: weekAgo 
            }
          });
        } else {
          perfectScores = await Challenge2.countDocuments({
            'participants.userId': user._id,
            'participants.score': { $gte: 100 },
            'participants.completedAt': { $exists: true }
          });
        }
        
        console.log(` User ${user.name} has ${perfectScores} perfect scores (${timeframe})`);
        return perfectScores >= target;

      case 'courses_completed':
        // Placeholder for when courses are implemented
        return false;

      case 'login_days':
        const loginDays = user.activities.length;
        return loginDays >= target;

      default:
        return false;
    }
  } catch (error) {
    console.error(` Error checking achievement criteria for ${achievement.title}:`, error);
    return false;
  }
}

// static methods and instance methods 
achievementSchema.statics.getUserProgress = async function(userId, achievementId) {
  const User = mongoose.model('User');
  const user = await User.findById(userId);
  const achievement = await this.findById(achievementId);

  if (!user || !achievement) return null;

  const { type, target } = achievement.criteria;
  let current = 0;

  switch (type) {
    case 'streak_days':
      current = user.gameData.currentStreak;
      break;
    case 'total_xp':
      current = user.gameData.totalXP;
      break;
    case 'challenges_completed':
      const Challenge = mongoose.model('Challenge');
      current = await Challenge.countDocuments({
        'participants.userId': user._id,
        'participants.completedAt': { $exists: true }
      });
      break;
    case 'login_days':
      current = user.activities.length;
      break;
  }

  return {
    current,
    target,
    percentage: Math.min((current / target) * 100, 100),
    isCompleted: current >= target
  };
};


achievementSchema.pre('save', function(next) {
  if (this.isNew && !this.order) {
    const rarityOrder = {
      common: 1,
      uncommon: 2,
      rare: 3,
      epic: 4,
      legendary: 5
    };
    this.order = (rarityOrder[this.rarity] || 1) * 1000 + this.criteria.target;
  }
  next();
});

achievementSchema.index({ category: 1, type: 1 });
achievementSchema.index({ isActive: 1, rarity: 1 });
achievementSchema.index({ 'criteria.type': 1 });

module.exports = mongoose.model('Achievement', achievementSchema);