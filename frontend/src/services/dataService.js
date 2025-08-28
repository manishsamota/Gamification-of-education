const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class DataService {
  constructor() {
    this.cache = new Map();
    this.requestQueue = new Map();
  }

  // Helper method for API calls with better error handling
  async apiCall(endpoint, options = {}) {
    try {
      const token = localStorage.getItem('token');
      
      const config = {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers
        },
        ...(options.body && { body: options.body })
      };

      console.log(` API Call: ${config.method} ${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
          console.error(' API Error Details:', errorData);
          if (errorData.errors) {
            console.error(' Validation Errors:', errorData.errors);
          }
        } catch (parseError) {
          console.error(' Failed to parse error response');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log(` API Success: ${endpoint}`, data);
      return data;

    } catch (error) {
      console.error(` API Error: ${endpoint}`, error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // Add XP method with proper validation
  async addXP(amount, source = 'practice', metadata = {}) {
    try {
      console.log(' DataService.addXP called with:', { amount, source, metadata });
      
      //  Validate inputs before sending to prevent 400 error
      if (!amount || isNaN(amount) || amount < 1 || amount > 1000) {
        console.error(' Invalid XP amount:', amount);
        return { 
          success: false, 
          error: 'XP amount must be a number between 1 and 1000' 
        };
      }

      //  Ensure source is valid
      const validSources = [
        'challenge', 'course', 'quiz', 'practice', 'achievement', 
        'daily_login', 'streak_bonus', 'manual', 'batch', 'challenge_completion'
      ];
      
      if (!validSources.includes(source)) {
        console.warn(' Invalid source, defaulting to practice:', source);
        source = 'practice';
      }

      //  Clean metadata to prevent validation errors
      const cleanMetadata = {};
      if (metadata && typeof metadata === 'object') {
        // Only include safe metadata fields
        if (metadata.challengeId) cleanMetadata.challengeId = String(metadata.challengeId);
        if (metadata.challengeTitle) cleanMetadata.challengeTitle = String(metadata.challengeTitle);
        if (metadata.challengeCategory) cleanMetadata.challengeCategory = String(metadata.challengeCategory);
        if (metadata.score !== undefined) cleanMetadata.score = Number(metadata.score) || 0;
        if (metadata.timeSpent !== undefined) cleanMetadata.timeSpent = Number(metadata.timeSpent) || 0;
        if (metadata.correctAnswers !== undefined) cleanMetadata.correctAnswers = Number(metadata.correctAnswers) || 0;
        if (metadata.totalQuestions !== undefined) cleanMetadata.totalQuestions = Number(metadata.totalQuestions) || 0;
      }

      //  Prepare request body with exact validation requirements
      const requestBody = {
        amount: parseInt(amount), // Ensure integer
        source: String(source), // Ensure string
        metadata: cleanMetadata // Clean object
      };

      console.log('📤 Sending XP request with cleaned data:', requestBody);

      const result = await this.apiCall('/users/xp', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      if (result.success) {
        console.log(' XP added successfully via DataService');
        return result;
      } else {
        console.error(' XP addition failed:', result.error);
        return result;
      }

    } catch (error) {
      console.error(' DataService.addXP error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to add XP' 
      };
    }
  }

  // Submit challenge with proper XP integration
  async submitChallenge(challengeId, answers, timeSpent) {
    try {
      console.log('🎯 DataService.submitChallenge called with proper validation');
      
      // Validate inputs
      if (!challengeId) {
        throw new Error('Challenge ID is required');
      }
      
      if (!answers || !Array.isArray(answers)) {
        throw new Error('Answers must be an array');
      }
      
      if (!timeSpent || timeSpent < 1) {
        timeSpent = 30;
      }

      // Clean answers data to prevent validation errors
      const cleanAnswers = answers.map((answer, index) => ({
        questionIndex: Number(answer.questionIndex) !== undefined ? Number(answer.questionIndex) : index,
        selectedAnswer: String(answer.selectedAnswer || ''),
        timeSpent: Number(answer.timeSpent) || 30
      }));

      console.log('📤 Submitting challenge with cleaned data:', {
        challengeId,
        answersCount: cleanAnswers.length,
        timeSpent
      });

      const result = await this.apiCall(`/challenges/${challengeId}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: cleanAnswers,
          timeSpent: parseInt(timeSpent)
        })
      });

      if (result.success) {
        console.log(' Challenge submitted successfully');
        
        // Safely emit events without causing errors
        this.emitSafeEvent('edugame_challenge_completed', {
          challengeId: challengeId,
          score: result.data?.score || 0,
          xpGained: result.data?.xpGained || 0,
          leveledUp: result.data?.leveledUp || false,
          newLevel: result.data?.newLevel || result.data?.userStats?.level || 1,
          newTotal: result.data?.userStats?.totalXP || 0,
          achievements: result.data?.achievementsUnlocked || [],
          source: 'challenge_completion'
        });

        // Emit XP update event
        this.emitSafeEvent('edugame_xp_updated', {
          amount: result.data?.xpGained || 0,
          newTotal: result.data?.userStats?.totalXP || 0,
          newLevel: result.data?.userStats?.level || 1,
          newRank: result.data?.userStats?.rank || 999,
          leveledUp: result.data?.leveledUp || false,
          source: 'challenge_completion',
          challengeId: challengeId
        });

        // Emit achievements if any
        if (result.data?.achievementsUnlocked && result.data.achievementsUnlocked.length > 0) {
          this.emitSafeEvent('edugame_achievements_unlocked', {
            achievements: result.data.achievementsUnlocked,
            source: 'challenge_completion'
          });
        }

        return result;
      } else {
        console.error(' Challenge submission failed:', result.error);
        return result;
      }

    } catch (error) {
      console.error(' DataService.submitChallenge error:', error);
      return {
        success: false,
        error: error.message || 'Failed to submit challenge'
      };
    }
  }

  // Safe event emission to prevent console errors
  emitSafeEvent(eventName, data) {
    try {
      if (typeof window !== 'undefined' && window.dispatchEvent) {
        const event = new CustomEvent(eventName, { 
          detail: {
            ...data,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(event);
        console.log(` Event emitted safely: ${eventName}`);
      }
    } catch (error) {
      console.warn(` Failed to emit event ${eventName}:`, error);
      // Don't throw error, just log warning
    }
  }

  // Get challenges with proper error handling
  async getChallenges(type = null, category = null, difficulty = null) {
    try {
      let endpoint = '/challenges';
      const params = new URLSearchParams();
      
      if (type) params.append('type', type);
      if (category) params.append('category', category);
      if (difficulty) params.append('difficulty', difficulty);
      
      if (params.toString()) {
        endpoint += `?${params.toString()}`;
      }

      return await this.apiCall(endpoint);
    } catch (error) {
      console.error(' Error fetching challenges:', error);
      return { success: false, error: error.message };
    }
  }

  // Get daily challenges
  async getDailyChallenges() {
    try {
      return await this.apiCall('/challenges/daily');
    } catch (error) {
      console.error(' Error fetching daily challenges:', error);
      return { success: false, error: error.message };
    }
  }

  // Start challenge
  async startChallenge(challengeId) {
    try {
      if (!challengeId) {
        throw new Error('Challenge ID is required');
      }

      return await this.apiCall(`/challenges/${challengeId}/start`, {
        method: 'POST'
      });
    } catch (error) {
      console.error(' Error starting challenge:', error);
      return { success: false, error: error.message };
    }
  }

  // Get dashboard data
  async getDashboardData() {
    try {
      return await this.apiCall('/user-data/dashboard');
    } catch (error) {
      console.error(' Error fetching dashboard data:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user profile
  async getUserProfile() {
    try {
      return await this.apiCall('/users/profile');
    } catch (error) {
      console.error(' Error fetching user profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Get leaderboard
  async getLeaderboard(type = 'xp', limit = 50) {
    try {
      const params = new URLSearchParams({ type, limit: limit.toString() });
      return await this.apiCall(`/users/leaderboard?${params.toString()}`);
    } catch (error) {
      console.error(' Error fetching leaderboard:', error);
      return { success: false, error: error.message };
    }
  }

  // Get achievements
  async getAchievements() {
    try {
      return await this.apiCall('/user-data/achievements');
    } catch (error) {
      console.error(' Error fetching achievements:', error);
      return { success: false, error: error.message };
    }
  }

  // Get activity calendar
  async getActivityCalendar() {
    try {
      return await this.apiCall('/user-data/activity-calendar');
    } catch (error) {
      console.error(' Error fetching activity calendar:', error);
      return { success: false, error: error.message };
    }
  }

  // Update profile
  async updateProfile(profileData) {
    try {
      if (!profileData || typeof profileData !== 'object') {
        throw new Error('Valid profile data is required');
      }

      return await this.apiCall('/users/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
      });
    } catch (error) {
      console.error(' Error updating profile:', error);
      return { success: false, error: error.message };
    }
  }

  // Use streak freeze
  async useStreakFreeze() {
    try {
      return await this.apiCall('/users/use-streak-freeze', {
        method: 'POST'
      });
    } catch (error) {
      console.error(' Error using streak freeze:', error);
      return { success: false, error: error.message };
    }
  }

  // Check achievements
  async checkAchievements() {
    try {
      return await this.apiCall('/user-data/check-achievements', {
        method: 'POST'
      });
    } catch (error) {
      console.error(' Error checking achievements:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync all data
  async syncAllData() {
    try {
      const [profileResult, dashboardResult, achievementResult] = await Promise.all([
        this.getUserProfile().catch(err => ({ success: false, error: err.message })),
        this.getDashboardData().catch(err => ({ success: false, error: err.message })),
        this.checkAchievements().catch(err => ({ success: false, error: err.message }))
      ]);

      return {
        success: true,
        data: {
          profile: profileResult.success ? profileResult.data : null,
          dashboard: dashboardResult.success ? dashboardResult.data : null,
          achievements: achievementResult.success ? achievementResult.data : null
        }
      };
    } catch (error) {
      console.error(' Error syncing all data:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
const dataServiceInstance = new DataService();
export default dataServiceInstance;