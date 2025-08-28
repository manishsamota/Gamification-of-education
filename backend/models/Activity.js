const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['challenge_completed', 'course_started', 'course_completed', 'quiz_taken', 'streak_milestone', 'achievement_unlocked', 'level_up', 'xp_gained', 'streak_freeze_used', 'profile_updated', 'stats_updated'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  metadata: {
    challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
    xpGained: Number,
    streakCount: Number,
    levelReached: Number,
    score: Number,
    timeSpent: Number,
    category: String
  },
  points: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  reactions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: { type: String, enum: ['like', 'celebrate', 'love', 'wow'], default: 'like' },
    createdAt: { type: Date, default: Date.now }
  }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, maxlength: 200 },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for total reactions
activitySchema.virtual('totalReactions').get(function() {
  return this.reactions.length;
});

// Virtual for reaction summary
activitySchema.virtual('reactionSummary').get(function() {
  const summary = {};
  this.reactions.forEach(reaction => {
    summary[reaction.type] = (summary[reaction.type] || 0) + 1;
  });
  return summary;
});

// Static method to create activity
activitySchema.statics.createActivity = async function(userId, type, data) {
  const activityData = {
    userId,
    type,
    title: data.title,
    description: data.description,
    metadata: data.metadata || {},
    points: data.points || 0,
    isPublic: data.isPublic !== false
  };

  return this.create(activityData);
};

// Static method to get user feed
activitySchema.statics.getUserFeed = function(userId, limit = 20, skip = 0) {
  return this.find({ userId, isPublic: true })
    .populate('userId', 'name avatar')
    .populate('metadata.challengeId', 'title category')
    .populate('metadata.achievementId', 'title icon')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get public feed (for social features)
activitySchema.statics.getPublicFeed = function(limit = 50, skip = 0) {
  return this.find({ isPublic: true })
    .populate('userId', 'name avatar gameData.level')
    .populate('metadata.challengeId', 'title category')
    .populate('metadata.achievementId', 'title icon')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to get activity stats
activitySchema.statics.getActivityStats = async function(userId, timeframe = 'week') {
  const now = new Date();
  let startDate;

  switch (timeframe) {
    case 'day':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      break;
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    default:
      startDate = new Date(0); // All time
  }

  const stats = await this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalPoints: { $sum: '$points' },
        totalXP: { $sum: '$metadata.xpGained' }
      }
    }
  ]);

  return stats;
};

// Instance method to add reaction
activitySchema.methods.addReaction = function(userId, reactionType = 'like') {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    userId,
    type: reactionType
  });
  
  return this.save();
};

// Instance method to remove reaction
activitySchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.userId.toString() !== userId.toString()
  );
  
  return this.save();
};

// Instance method to add comment
activitySchema.methods.addComment = function(userId, text) {
  if (text.length > 200) {
    throw new Error('Comment cannot be longer than 200 characters');
  }
  
  this.comments.push({
    userId,
    text: text.trim()
  });
  
  return this.save();
};

// Index for better query performance
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.index({ isPublic: 1, createdAt: -1 });
activitySchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);