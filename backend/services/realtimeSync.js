const User = require('../models/User');
const Achievement = require('../models/Achievement');
const Challenge = require('../models/Challenge');
const Activity = require('../models/Activity');

class RealtimeSyncService {
  constructor() {
    this.syncQueue = new Map(); 
    this.isProcessing = false;
    this.batchSize = 10;
    this.syncInterval = 5000; // 5 seconds
    
    // Start background sync processor
    this.startSyncProcessor();
  }

  // Start background processor for queued sync operations
  startSyncProcessor() {
    setInterval(async () => {
      if (!this.isProcessing && this.syncQueue.size > 0) {
        await this.processSyncQueue();
      }
    }, this.syncInterval);
  }

  // Process queued sync operations in batches
  async processSyncQueue() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log(`Processing sync queue: ${this.syncQueue.size} pending operations`);
    
    try {
      const userIds = Array.from(this.syncQueue.keys()).slice(0, this.batchSize);
      
      // Process batch of users
      await Promise.all(userIds.map(async (userId) => {
        try {
          await this.syncUserData(userId);
          this.syncQueue.delete(userId);
        } catch (error) {
          console.error(`Failed to sync user ${userId}:`, error);
          // Keep in queue for retry
        }
      }));
      
      console.log(` Processed ${userIds.length} sync operations`);
    } catch (error) {
      console.error(' Sync queue processing error:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // Queue user for sync
  queueUserSync(userId, operation = 'full') {
    this.syncQueue.set(userId, {
      operation,
      timestamp: new Date(),
      retryCount: (this.syncQueue.get(userId)?.retryCount || 0) + 1
    });
    
    console.log(` User ${userId} queued for ${operation} sync (Queue size: ${this.syncQueue.size})`);
  }

  // Comprehensive user data sync
  async syncUserData(userId) {
    try {
      console.log(` Syncing user data: ${userId}`);
      
      const user = await User.findById(userId);
      if (!user) {
        console.error(`User not found: ${userId}`);
        return false;
      }

      let syncResults = {
        rankUpdated: false,
        achievementsChecked: false,
        challengeStatsUpdated: false,
        levelCorrected: false
      };

      // 1. Update user ranking
      try {
        const oldRank = user.gameData.rank;
        await User.updateRankings();
        
        const updatedUser = await User.findById(userId);
        const newRank = updatedUser.gameData.rank;
        
        if (newRank !== oldRank) {
          syncResults.rankUpdated = true;
          console.log(`Rank updated: ${oldRank} → ${newRank}`);
        }
      } catch (rankError) {
        console.error(' Rank update failed:', rankError);
      }

      // 2. Check for new achievements
      try {
        const newAchievements = await Achievement.checkUserAchievements(userId);
        if (newAchievements.length > 0) {
          syncResults.achievementsChecked = true;
          console.log(`${newAchievements.length} new achievements found`);
          
          // Create achievement activities
          for (const achievement of newAchievements) {
            await Activity.createActivity(userId, 'achievement_unlocked', {
              title: `🏆 Achievement Unlocked: ${achievement.title}`,
              description: `Unlocked the "${achievement.title}" achievement through sync!`,
              metadata: {
                achievementId: achievement._id,
                achievementTitle: achievement.title,
                achievementCategory: achievement.category,
                achievementRarity: achievement.rarity,
                xpReward: achievement.rewards.xp || 0,
                triggerSource: 'sync',
                timestamp: new Date().toISOString()
              },
              points: achievement.rewards.xp || 0
            });
          }
        }
      } catch (achievementError) {
        console.error(' Achievement check failed:', achievementError);
      }

      // 3. Sync challenge statistics
      try {
        await User.syncChallengeStats(userId);
        syncResults.challengeStatsUpdated = true;
        console.log(` Challenge stats synced for user ${userId}`);
      } catch (challengeError) {
        console.error(' Challenge stats sync failed:', challengeError);
      }

      // 4. Validate and correct level based on XP
      try {
        const finalUser = await User.findById(userId);
        const correctLevel = Math.floor(finalUser.gameData.totalXP / 1000) + 1;
        
        if (correctLevel !== finalUser.gameData.level) {
          finalUser.gameData.level = correctLevel;
          await finalUser.save();
          syncResults.levelCorrected = true;
          console.log(` Level corrected: ${finalUser.gameData.level} → ${correctLevel}`);
        }
      } catch (levelError) {
        console.error(' Level correction failed:', levelError);
      }

      console.log(` User sync completed:`, syncResults);
      return syncResults;

    } catch (error) {
      console.error(`User sync failed for ${userId}:`, error);
      return false;
    }
  }

  // Immediate sync for critical operations
  async immediateSyncUser(userId) {
    try {
      console.log(` Immediate sync requested for user ${userId}`);
      
      // Remove from queue if present
      this.syncQueue.delete(userId);
      
      // Perform immediate sync
      const result = await this.syncUserData(userId);
      
      console.log(` Immediate sync completed for user ${userId}`);
      return result;
    } catch (error) {
      console.error(`Immediate sync failed for user ${userId}:`, error);
      // Add back to queue for retry
      this.queueUserSync(userId);
      return false;
    }
  }

  // Sync multiple users (for batch operations)
  async syncMultipleUsers(userIds) {
    try {
      console.log(` Batch sync requested for ${userIds.length} users`);
      
      const results = await Promise.allSettled(
        userIds.map(userId => this.syncUserData(userId))
      );
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
      const failed = results.length - successful;
      
      console.log(` Batch sync completed: ${successful} successful, ${failed} failed`);
      
      return {
        successful,
        failed,
        total: userIds.length
      };
    } catch (error) {
      console.error(' Batch sync error:', error);
      return { successful: 0, failed: userIds.length, total: userIds.length };
    }
  }

  // Get sync queue status
  getSyncStatus() {
    return {
      queueSize: this.syncQueue.size,
      isProcessing: this.isProcessing,
      nextSync: this.isProcessing ? 'Processing...' : `${this.syncInterval / 1000}s`,
      pendingUsers: Array.from(this.syncQueue.keys())
    };
  }

  // Clear sync queue (for maintenance)
  clearSyncQueue() {
    const clearedCount = this.syncQueue.size;
    this.syncQueue.clear();
    console.log(` Sync queue cleared: ${clearedCount} operations removed`);
    return clearedCount;
  }

  //  Real-time challenge completion sync
  async syncChallengeCompletion(userId, challengeId, scoreData) {
    try {
      console.log(` Syncing challenge completion: User ${userId}, Challenge ${challengeId}`);
      
      // Update user challenge statistics
      const user = await User.findById(userId);
      if (!user) return false;

      // Increment completion counter
      user.gameData.challengesCompleted += 1;
      
      // Check if it's a perfect score
      if (scoreData.percentage >= 100) {
        user.gameData.perfectScores += 1;
        user.addPerfectScore();
      }

      // Check if it's a daily challenge
      const challenge = await Challenge.findById(challengeId);
      if (challenge && challenge.type === 'daily') {
        user.gameData.dailyChallengesCompleted += 1;
        user.addDailyChallengeCompletion();
      }

      await user.save();

      // Queue for comprehensive sync
      this.queueUserSync(userId, 'challenge_completion');

      console.log(` Challenge completion synced for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`Challenge completion sync failed:`, error);
      return false;
    }
  }

  //  Real-time XP sync across platform
  async syncXPUpdate(userId, xpData) {
    try {
      console.log(` Syncing XP update: User ${userId}, XP: ${xpData.amount}`);
      
      // Update user XP tracking fields
      const user = await User.findById(userId);
      if (!user) return false;

      user.gameData.lastXPUpdate = new Date();
      await user.save();

      // Queue for full sync to update rankings and achievements
      this.queueUserSync(userId, 'xp_update');

      console.log(` XP update synced for user ${userId}`);
      return true;
    } catch (error) {
      console.error(`XP sync failed:`, error);
      return false;
    }
  }

  // Cleanup old sync records
  async cleanup() {
    try {
      console.log('Running sync service cleanup...');
      
      // Remove stale queue entries (older than 1 hour)
      const cutoffTime = new Date(Date.now() - 60 * 60 * 1000);
      let removedCount = 0;
      
      for (const [userId, syncData] of this.syncQueue.entries()) {
        if (syncData.timestamp < cutoffTime || syncData.retryCount > 5) {
          this.syncQueue.delete(userId);
          removedCount++;
        }
      }
      
      console.log(` Cleanup completed: ${removedCount} stale entries removed`);
      return removedCount;
    } catch (error) {
      console.error(' Cleanup failed:', error);
      return 0;
    }
  }
}

// Create singleton instance
const realtimeSyncService = new RealtimeSyncService();

// Cleanup every hour
setInterval(() => {
  realtimeSyncService.cleanup();
}, 60 * 60 * 1000);

module.exports = realtimeSyncService;