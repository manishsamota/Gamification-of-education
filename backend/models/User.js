const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot be longer than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  avatar: {
    type: String,
    default: function() {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${this.name}`;
    }
  },
  provider: {
    type: String,
    enum: ['email', 'google'],
    default: 'email'
  },
  googleId: {
    type: String,
    sparse: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  gameData: {
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    weeklyProgress: { type: Number, default: 0 },
    weeklyGoal: { type: Number, default: 500 },
    rank: { type: Number, default: 999 },
    streakFreezes: { type: Number, default: 3 },
    lastXPUpdate: { type: Date, default: Date.now },
    challengesCompleted: { type: Number, default: 0 },
    perfectScores: { type: Number, default: 0 },
    dailyChallengesCompleted: { type: Number, default: 0 },
    xpThisWeek: { type: Number, default: 0 },
    xpThisMonth: { type: Number, default: 0 }
  },
  activities: [{
    date: { type: Date, default: Date.now },
    activitiesCount: { type: Number, default: 1 },
    xpGained: { type: Number, default: 0 },
    subjects: [String],
    type: { type: String, default: 'general' }
  }],
  achievements: [{
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    unlockedAt: { type: Date, default: Date.now },
    isCompleted: { type: Boolean, default: true }
  }],
  preferences: {
    notifications: { type: Boolean, default: true },
    emailNotifications: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
    darkMode: { type: Boolean, default: false },
    language: { type: String, default: 'en' }
  },
  profile: {
    bio: { type: String, maxlength: 500 },
    location: { type: String, maxlength: 100 },
    school: { type: String, maxlength: 100 },
    grade: { 
      type: String, 
      enum: ['elementary', 'middle', 'high', 'college', 'other'], 
      default: 'other' 
    },
    interests: [{ type: String, maxlength: 50 }],
    learningGoals: [{ type: String, maxlength: 100 }]
  },
  dailySchedule: {
    monday: { start: String, end: String, active: Boolean },
    tuesday: { start: String, end: String, active: Boolean },
    wednesday: { start: String, end: String, active: Boolean },
    thursday: { start: String, end: String, active: Boolean },
    friday: { start: String, end: String, active: Boolean },
    saturday: { start: String, end: String, active: Boolean },
    sunday: { start: String, end: String, active: Boolean }
  },
  subscription: {
    type: { type: String, enum: ['free', 'premium'], default: 'free' },
    startDate: Date,
    endDate: Date
  },
  lastLogin: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  age: Number
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for level progress
userSchema.virtual('levelProgress').get(function() {
  const currentLevelXP = this.gameData.totalXP % 1000;
  const requiredXP = 1000;
  
  return {
    current: currentLevelXP,
    required: requiredXP,
    percentage: (currentLevelXP / requiredXP) * 100
  };
});

// ENHANCED: Password hashing middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// ENHANCED: Email verification for Google users
userSchema.pre('save', function(next) {
  if (this.provider === 'google') {
    this.isEmailVerified = true;
  }
  next();
});

// Instance method to check password
userSchema.methods.correctPassword = async function(candidatePassword, userPassword) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// ENHANCED: Add XP with comprehensive tracking
userSchema.methods.addXP = async function(amount, source = 'general') {
  try {
    console.log(`ðŸ'Ž User.addXP: Adding ${amount} XP to ${this.name} (source: ${source})`);
    
    if (!amount || amount <= 0) {
      return { success: false, error: 'Invalid XP amount' };
    }

    const oldLevel = this.gameData.level;
    const oldTotalXP = this.gameData.totalXP;
    
    // Add XP
    this.gameData.totalXP += amount;
    this.gameData.weeklyProgress += amount;
    this.gameData.xpThisWeek += amount;
    this.gameData.xpThisMonth += amount;
    this.gameData.lastXPUpdate = new Date();
    
    // Calculate new level
    const newLevel = Math.floor(this.gameData.totalXP / 1000) + 1;
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      this.gameData.level = newLevel;
      console.log(`ðŸŽ‰ Level up! ${this.name} reached level ${newLevel}`);
    }
    
    // Add to daily activity
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayActivity = this.activities.find(activity => {
      const activityDate = new Date(activity.date);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });
    
    if (todayActivity) {
      todayActivity.xpGained += amount;
      todayActivity.activitiesCount += 1;
    } else {
      this.activities.push({
        date: today,
        activitiesCount: 1,
        xpGained: amount,
        subjects: [source],
        type: source
      });
    }
    
    await this.save();
    
    console.log(`âœ… XP added successfully: ${oldTotalXP} â†' ${this.gameData.totalXP}`);
    
    return {
      success: true,
      oldLevel,
      newLevel: this.gameData.level,
      leveledUp,
      totalXP: this.gameData.totalXP,
      xpAdded: amount
    };
    
  } catch (error) {
    console.error('âŒ Error adding XP:', error);
    return { success: false, error: error.message };
  }
};

// Update streak method
userSchema.methods.updateStreak = function() {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  // Check if user has activity today
  const hasActivityToday = this.activities.some(activity => {
    const activityDate = new Date(activity.date);
    return activityDate.toDateString() === today.toDateString();
  });
  
  if (hasActivityToday) {
    // Check if user had activity yesterday
    const hasActivityYesterday = this.activities.some(activity => {
      const activityDate = new Date(activity.date);
      return activityDate.toDateString() === yesterday.toDateString();
    });
    
    if (hasActivityYesterday || this.gameData.currentStreak === 0) {
      const oldStreak = this.gameData.currentStreak;
      this.gameData.currentStreak += 1;
      
      if (this.gameData.currentStreak > this.gameData.longestStreak) {
        this.gameData.longestStreak = this.gameData.currentStreak;
      }
      
      return {
        streakIncreased: true,
        oldStreak,
        newStreak: this.gameData.currentStreak,
        isNewRecord: this.gameData.currentStreak === this.gameData.longestStreak
      };
    }
  }
  
  return {
    streakIncreased: false,
    oldStreak: this.gameData.currentStreak,
    newStreak: this.gameData.currentStreak,
    isNewRecord: false
  };
};

// Static method to update all user rankings
userSchema.statics.updateRankings = async function() {
  try {
    console.log('ðŸ† Updating user rankings...');
    
    const users = await this.find({ isActive: true })
      .select('_id gameData.totalXP')
      .sort({ 'gameData.totalXP': -1 });
    
    const updatePromises = users.map((user, index) => {
      const rank = index + 1;
      return this.findByIdAndUpdate(user._id, { 'gameData.rank': rank });
    });
    
    await Promise.all(updatePromises);
    
    console.log(`âœ… Updated rankings for ${users.length} users`);
    return { success: true, count: users.length };
  } catch (error) {
    console.error('âŒ Error updating rankings:', error);
    return { success: false, error: error.message };
  }
};

// Static method to get user rank
userSchema.statics.getUserRank = async function(userId) {
  try {
    const user = await this.findById(userId).select('gameData.totalXP');
    if (!user) return null;
    
    const rank = await this.countDocuments({
      isActive: true,
      'gameData.totalXP': { $gt: user.gameData.totalXP }
    }) + 1;
    
    return rank;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
};

// Static method to sync challenge stats
userSchema.statics.syncChallengeStats = async function(userId) {
  try {
    const Challenge = mongoose.model('Challenge');
    
    const challengeStats = await Challenge.aggregate([
      { $unwind: '$participants' },
      { $match: { 'participants.userId': mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalCompleted: {
            $sum: { $cond: [{ $exists: '$participants.completedAt' }, 1, 0] }
          },
          perfectScores: {
            $sum: { $cond: [{ $gte: ['$participants.score', 100] }, 1, 0] }
          }
        }
      }
    ]);
    
    if (challengeStats.length > 0) {
      const stats = challengeStats[0];
      await this.findByIdAndUpdate(userId, {
        'gameData.challengesCompleted': stats.totalCompleted,
        'gameData.perfectScores': stats.perfectScores
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error syncing challenge stats:', error);
    return { success: false, error: error.message };
  }
};

// Index for better performance
userSchema.index({ email: 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ 'gameData.totalXP': -1 });
userSchema.index({ 'gameData.rank': 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);