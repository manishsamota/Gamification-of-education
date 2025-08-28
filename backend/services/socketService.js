const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId - Set of socket IDs
    this.socketUsers = new Map(); // socketId - userId
  }

  initialize(server) {
    console.log(' Initializing Socket.IO service...');
    
    this.io = socketIo(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling'],
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication required'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = user._id.toString();
        socket.user = user;
        next();
      } catch (error) {
        console.error(' Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    console.log(' Socket.IO service initialized');
  }

  handleConnection(socket) {
    const userId = socket.userId;
    console.log(` User connected: ${socket.user.name} (${userId})`);

    // Track user connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Join user to their personal room
    socket.join(`user:${userId}`);

    // Send initial sync data
    this.sendInitialSyncData(socket);

    // Handle real-time events
    this.setupEventHandlers(socket);

    socket.on('disconnect', () => {
      this.handleDisconnection(socket);
    });
  }

  handleDisconnection(socket) {
    const userId = this.socketUsers.get(socket.id);
    
    if (userId) {
      console.log(` User disconnected: ${userId}`);
      
      // Remove socket tracking
      if (this.userSockets.has(userId)) {
        this.userSockets.get(userId).delete(socket.id);
        if (this.userSockets.get(userId).size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.socketUsers.delete(socket.id);
    }
  }

  async sendInitialSyncData(socket) {
    try {
      const user = await User.findById(socket.userId).select('-password');
      
      socket.emit('sync:initial', {
        type: 'initial_sync',
        user: {
          gameData: user.gameData,
          profile: user.profile,
          preferences: user.preferences
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error(' Error sending initial sync data:', error);
    }
  }

  setupEventHandlers(socket) {
    // XP Update Request
    socket.on('sync:request_xp', async () => {
      try {
        const user = await User.findById(socket.userId);
        socket.emit('sync:xp_update', {
          type: 'xp_sync',
          gameData: user.gameData,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error(' Error syncing XP:', error);
      }
    });

    // Achievement Check Request
    socket.on('sync:check_achievements', async () => {
      try {
        const Achievement = require('../models/Achievement');
        const newAchievements = await Achievement.checkUserAchievements(socket.userId);
        
        if (newAchievements.length > 0) {
          this.broadcastToUser(socket.userId, 'sync:achievements_unlocked', {
            type: 'achievements_unlocked',
            achievements: newAchievements,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error(' Error checking achievements:', error);
      }
    });

    // Force Full Sync
    socket.on('sync:force_full', async () => {
      await this.sendFullSyncData(socket.userId);
    });

    // Heartbeat for connection monitoring
    socket.on('heartbeat', () => {
      socket.emit('heartbeat_ack', { timestamp: new Date().toISOString() });
    });
  }

  // Broadcast XP update to all user sessions
  async broadcastXPUpdate(userId, xpData) {
    try {
      const data = {
        type: 'xp_update',
        ...xpData,
        timestamp: new Date().toISOString(),
        source: 'realtime_sync'
      };

      this.broadcastToUser(userId, 'sync:xp_update', data);
      console.log(` XP update broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting XP update:', error);
    }
  }

  // Broadcast level up
  async broadcastLevelUp(userId, levelData) {
    try {
      const data = {
        type: 'level_up',
        ...levelData,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:level_up', data);
      console.log(` Level up broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting level up:', error);
    }
  }

  // Broadcast achievement unlock
  async broadcastAchievementUnlock(userId, achievementData) {
    try {
      const data = {
        type: 'achievement_unlocked',
        ...achievementData,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:achievement_unlocked', data);
      console.log(` Achievement unlock broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting achievement unlock:', error);
    }
  }

  // Broadcast rank change
  async broadcastRankUpdate(userId, rankData) {
    try {
      const data = {
        type: 'rank_update',
        ...rankData,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:rank_update', data);
      console.log(` Rank update broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting rank update:', error);
    }
  }

  // Broadcast streak update
  async broadcastStreakUpdate(userId, streakData) {
    try {
      const data = {
        type: 'streak_update',
        ...streakData,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:streak_update', data);
      console.log(` Streak update broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting streak update:', error);
    }
  }

  // Broadcast challenge completion
  async broadcastChallengeCompletion(userId, challengeData) {
    try {
      const data = {
        type: 'challenge_completed',
        ...challengeData,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:challenge_completed', data);
      console.log(` Challenge completion broadcasted to user ${userId}:`, data);
    } catch (error) {
      console.error(' Error broadcasting challenge completion:', error);
    }
  }

  // Broadcast leaderboard updates to all connected users
  async broadcastLeaderboardUpdate(leaderboardData) {
    try {
      const data = {
        type: 'leaderboard_update',
        ...leaderboardData,
        timestamp: new Date().toISOString()
      };

      this.io.emit('sync:leaderboard_update', data);
      console.log(' Leaderboard update broadcasted to all users');
    } catch (error) {
      console.error(' Error broadcasting leaderboard update:', error);
    }
  }

  // Send full sync data to user
  async sendFullSyncData(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password')
        .populate('achievements.achievementId', 'title description icon type rewards');

      if (!user) return;

      const Achievement = require('../models/Achievement');
      const Activity = require('../models/Activity');

      // Get recent activities
      const recentActivities = await Activity.find({ userId })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('metadata.challengeId', 'title category')
        .populate('metadata.achievementId', 'title icon');

      // Check for new achievements
      const newAchievements = await Achievement.checkUserAchievements(userId);

      const syncData = {
        type: 'full_sync',
        user: {
          gameData: user.gameData,
          profile: user.profile,
          preferences: user.preferences,
          achievements: user.achievements
        },
        recentActivities,
        newAchievements,
        timestamp: new Date().toISOString()
      };

      this.broadcastToUser(userId, 'sync:full_data', syncData);
      console.log(` Full sync data sent to user ${userId}`);

    } catch (error) {
      console.error(' Error sending full sync data:', error);
    }
  }

  // Utility method to broadcast to specific user
  broadcastToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId}`).emit(event, data);
    }
  }

  // Utility method to broadcast to all users
  broadcastToAll(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  // Get connected users count
  getConnectedUsersCount() {
    return this.userSockets.size;
  }

  // Check if user is connected
  isUserConnected(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  // Get socket instance
  getIO() {
    return this.io;
  }
}

// Export singleton instance
module.exports = new SocketService();