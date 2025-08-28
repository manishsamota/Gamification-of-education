const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  },
  answers: [{
    questionIndex: Number,
    selectedAnswer: String,
    isCorrect: Boolean,
    timeSpent: Number,
    points: { type: Number, default: 0 }
  }],
  score: {
    type: Number,
    default: 0
  },
  timeSpent: {
    type: Number, 
    default: 0
  },
  attempts: {
    type: Number,
    default: 1
  }
});

const questionSchema = new mongoose.Schema({
  question: {
    type: String,
    required: true,
    maxlength: 500
  },
  type: {
    type: String,
    enum: ['multiple_choice', 'true_false', 'fill_blank'],
    default: 'multiple_choice'
  },
  options: [{
    text: {
      type: String,
      required: true
    },
    isCorrect: {
      type: Boolean,
      default: false
    }
  }],
  points: {
    type: Number,
    default: 10
  },
  explanation: {
    type: String,
    maxlength: 300
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  }
});

const challengeSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Challenge title is required'],
    trim: true,
    maxlength: [100, 'Title cannot be longer than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Challenge description is required'],
    maxlength: [500, 'Description cannot be longer than 500 characters']
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'special', 'practice'],
    default: 'practice'
  },
  category: {
    type: String,
    enum: ['math', 'science', 'history', 'literature', 'geography', 'art', 'music', 'general'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  questions: [questionSchema],
  xpReward: {
    type: Number,
    required: true,
    min: [10, 'XP reward must be at least 10'],
    max: [1000, 'XP reward cannot exceed 1000']
  },
  timeLimit: {
    type: Number, 
    min: 1,
    max: 120
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  participants: [participantSchema],
  tags: [String],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  //  Challenge statistics
  stats: {
    totalParticipants: { type: Number, default: 0 },
    completionRate: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 },
    lastUpdated: { type: Date, default: Date.now }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtuals for challenge statistics
challengeSchema.virtual('participantCount').get(function() {
  return this.participants.length;
});

challengeSchema.virtual('completionCount').get(function() {
  return this.participants.filter(p => p.completedAt).length;
});

challengeSchema.virtual('successRate').get(function() {
  const completed = this.completionCount;
  return this.participantCount > 0 ? (completed / this.participantCount) * 100 : 0;
});

challengeSchema.virtual('averageScore').get(function() {
  const completedParticipants = this.participants.filter(p => p.completedAt);
  if (completedParticipants.length === 0) return 0;
  
  const totalScore = completedParticipants.reduce((sum, p) => sum + p.score, 0);
  return totalScore / completedParticipants.length;
});

challengeSchema.virtual('status').get(function() {
  const now = new Date();
  if (this.endDate && now > this.endDate) return 'expired';
  if (now < this.startDate) return 'upcoming';
  return 'active';
});

//  Instance method to add participant with real-time tracking
challengeSchema.methods.addParticipant = async function(userId) {
  try {
    console.log(` Adding participant ${userId} to challenge ${this.title}`);
    
    // Check if user already participating
    const existingParticipant = this.participants.find(
      p => p.userId.toString() === userId.toString()
    );
    
    if (existingParticipant) {
      console.log(' User already participating in challenge');
      return existingParticipant;
    }
    
    // Add new participant
    const newParticipant = {
      userId: userId,
      startedAt: new Date(),
      answers: [],
      score: 0,
      timeSpent: 0,
      attempts: 1
    };
    
    this.participants.push(newParticipant);
    
    // Update challenge stats
    this.stats.totalParticipants = this.participants.length;
    this.stats.lastUpdated = new Date();
    
    await this.save();
    
    console.log(` Participant added successfully. Total participants: ${this.participants.length}`);
    return newParticipant;
  } catch (error) {
    console.error(' Error adding participant:', error);
    throw error;
  }
};

//  Instance method to submit answers with comprehensive scoring and real-time sync
challengeSchema.methods.submitAnswers = async function(userId, answers, timeSpent) {
  try {
    console.log(` Challenge.submitAnswers: User ${userId} submitting answers for challenge ${this.title}`);
    console.log(' Answers submitted:', answers);
    
    // Find participant
    const participantIndex = this.participants.findIndex(
      p => p.userId.toString() === userId.toString()
    );
    
    if (participantIndex === -1) {
      throw new Error('User not found in participants');
    }
    
    const participant = this.participants[participantIndex];
    
    if (participant.completedAt) {
      throw new Error('Challenge already completed');
    }
    
    // Process answers and calculate score
    let totalScore = 0;
    let correctAnswers = 0;
    const processedAnswers = [];
    
    answers.forEach((answer, index) => {
      const question = this.questions[answer.questionIndex];
      if (!question) {
        console.warn(` Question not found for index ${answer.questionIndex}`);
        return;
      }
      
      // Find correct answer
      const correctOption = question.options.find(opt => opt.isCorrect);
      const isCorrect = correctOption && correctOption.text === answer.selectedAnswer;
      
      if (isCorrect) {
        correctAnswers++;
        totalScore += question.points;
      }
      
      processedAnswers.push({
        questionIndex: answer.questionIndex,
        selectedAnswer: answer.selectedAnswer,
        correctAnswer: correctOption ? correctOption.text : 'Unknown',
        isCorrect: isCorrect,
        timeSpent: answer.timeSpent || 30,
        points: isCorrect ? question.points : 0
      });
    });
    
    const maxPossibleScore = this.questions.reduce((sum, q) => sum + q.points, 0);
    const percentageScore = maxPossibleScore > 0 ? Math.round((totalScore / maxPossibleScore) * 100) : 0;
    
    console.log(`Score Calculation: ${totalScore}/${maxPossibleScore} = ${percentageScore}% (${correctAnswers}/${this.questions.length} correct)`);
    
    // Update participant data
    participant.answers = processedAnswers;
    participant.score = percentageScore;
    participant.timeSpent = timeSpent;
    participant.completedAt = new Date();
    
    // Update challenge statistics
    this.updateChallengeStats();
    
    await this.save();
    
    console.log(` Challenge submission completed: Score ${percentageScore}%, Time ${timeSpent}s`);
    
    return {
      success: true,
      score: percentageScore,
      totalScore: totalScore,
      maxPossibleScore: maxPossibleScore,
      correctAnswers: correctAnswers,
      totalQuestions: this.questions.length,
      timeSpent: timeSpent,
      answers: processedAnswers,
      participant: participant
    };
  } catch (error) {
    console.error(' Error submitting challenge answers:', error);
    throw error;
  }
};

//  Instance method to update challenge statistics
challengeSchema.methods.updateChallengeStats = function() {
  const completedParticipants = this.participants.filter(p => p.completedAt);
  
  this.stats.totalParticipants = this.participants.length;
  this.stats.completionRate = this.participants.length > 0 ? 
    (completedParticipants.length / this.participants.length) * 100 : 0;
  
  if (completedParticipants.length > 0) {
    const totalScore = completedParticipants.reduce((sum, p) => sum + p.score, 0);
    const totalTime = completedParticipants.reduce((sum, p) => sum + p.timeSpent, 0);
    
    this.stats.averageScore = totalScore / completedParticipants.length;
    this.stats.averageTimeSpent = totalTime / completedParticipants.length;
  }
  
  this.stats.lastUpdated = new Date();
  
  console.log(`Challenge stats updated: ${this.stats.totalParticipants} participants, ${this.stats.completionRate.toFixed(1)}% completion rate`);
};

// Static method to get daily challenges
challengeSchema.statics.getDailyChallenges = function(date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return this.find({
    type: 'daily',
    isActive: true,
    startDate: { $lte: endOfDay },
    $or: [
      { endDate: { $exists: false } },
      { endDate: { $gte: startOfDay } }
    ]
  })
  .populate('createdBy', 'name avatar')
  .sort({ createdAt: -1 });
};

// Static method to get leaderboard for specific challenge
challengeSchema.statics.getChallengeLeaderboard = function(challengeId, limit = 10) {
  return this.findById(challengeId)
    .populate('participants.userId', 'name avatar gameData.level')
    .then(challenge => {
      if (!challenge) return [];
      
      return challenge.participants
        .filter(p => p.completedAt)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return a.timeSpent - b.timeSpent; // Faster time wins ties
        })
        .slice(0, limit)
        .map((participant, index) => ({
          rank: index + 1,
          user: participant.userId,
          score: participant.score,
          timeSpent: participant.timeSpent,
          completedAt: participant.completedAt
        }));
    });
};

//  Static method to get user's challenge progress
challengeSchema.statics.getUserChallengeStats = async function(userId) {
  try {
    const stats = await this.aggregate([
      { $unwind: '$participants' },
      { $match: { 'participants.userId': mongoose.Types.ObjectId(userId) } },
      {
        $group: {
          _id: null,
          totalStarted: { $sum: 1 },
          totalCompleted: {
            $sum: {
              $cond: [{ $exists: '$participants.completedAt' }, 1, 0]
            }
          },
          averageScore: {
            $avg: {
              $cond: [{ $exists: '$participants.completedAt' }, '$participants.score', null]
            }
          },
          totalXPEarned: {
            $sum: {
              $cond: [{ $exists: '$participants.completedAt' }, '$xpReward', 0]
            }
          },
          perfectScores: {
            $sum: {
              $cond: [
                { $and: [
                  { $exists: '$participants.completedAt' },
                  { $gte: ['$participants.score', 100] }
                ]}, 
                1, 
                0
              ]
            }
          },
          totalTimeSpent: {
            $sum: {
              $cond: [{ $exists: '$participants.completedAt' }, '$participants.timeSpent', 0]
            }
          }
        }
      }
    ]);
    
    return stats[0] || {
      totalStarted: 0,
      totalCompleted: 0,
      averageScore: 0,
      totalXPEarned: 0,
      perfectScores: 0,
      totalTimeSpent: 0
    };
  } catch (error) {
    console.error(' Error getting user challenge stats:', error);
    return null;
  }
};

//  Static method to sync real-time challenge data
challengeSchema.statics.syncChallengeData = async function() {
  try {
    console.log(' Syncing challenge data...');
    
    // Update all challenge statistics
    const challenges = await this.find({ isActive: true });
    
    const updatePromises = challenges.map(async (challenge) => {
      challenge.updateChallengeStats();
      return challenge.save();
    });
    
    await Promise.all(updatePromises);
    
    console.log(` Synced ${challenges.length} challenges`);
    return { success: true, count: challenges.length };
  } catch (error) {
    console.error(' Error syncing challenge data:', error);
    return { success: false, error: error.message };
  }
};

// Pre-save middleware to validate questions
challengeSchema.pre('save', function(next) {
  // Ensure each question has at least one correct answer
  for (let question of this.questions) {
    const hasCorrectAnswer = question.options.some(option => option.isCorrect);
    if (!hasCorrectAnswer) {
      return next(new Error(`Question "${question.question}" must have at least one correct answer`));
    }
  }
  
  // It will update challenge stats before saving
  if (this.isModified('participants')) {
    this.updateChallengeStats();
  }
  
  next();
});

// I have index for better query performance
challengeSchema.index({ type: 1, isActive: 1, startDate: 1 });
challengeSchema.index({ category: 1, difficulty: 1 });
challengeSchema.index({ createdBy: 1 });
challengeSchema.index({ 'participants.userId': 1 });
challengeSchema.index({ startDate: 1, endDate: 1 });

module.exports = mongoose.model('Challenge', challengeSchema);