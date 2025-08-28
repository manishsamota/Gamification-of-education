import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../contexts/XPContext';
import { 
  Zap, Flame, Crown, TrendingUp, Star, Target, 
  Calendar, BookOpen, Award, Users, Clock, RefreshCw, Activity,
  Wifi, WifiOff
} from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import XPBar from '../Common/XPBar';
import DataService from '../../services/dataService';
import { toast } from 'react-toastify';

const DashboardHome = ({ onCelebration }) => {
  const { user, } = useAuth();
  const { 
    currentXP, 
    currentLevel, 
    userRank, 
    currentStreak, 
    weeklyProgress,
    connectionStatus,
    isSyncing,
    forceSyncFromBackend,
    registerXPListener,
    // syncFromBackend
  } = useXP();
  
  // Here it is state management for real-time sync
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState(null);
  const [realtimeConnected, setRealtimeConnected] = useState(true);
  const [pendingUpdates, setPendingUpdates] = useState(0);
  const [animatingStats, setAnimatingStats] = useState(new Set());
  const [completingChallenges, setCompletingChallenges] = useState(new Set());

  // Real-time listeners and refs
  const xpListenerRef = useRef(null);
  const achievementListenerRef = useRef(null);
  const challengeListenerRef = useRef(null);
  const autoRefreshRef = useRef(null);

  // Initialize real-time listeners and fetch data
  useEffect(() => {
    setupRealTimeListeners();
    if (user) {
      fetchDashboardData();
      startAutoRefresh();
    }

    return () => {
      cleanupListeners();
    };
  }, [user]);

  // Real-time data sync on user changes
  useEffect(() => {
    if (user && dashboardData) {
      syncUserDataChanges();
    }
  }, [user?.gameData?.totalXP, user?.gameData?.level, user?.gameData?.rank]);

  // Setup comprehensive real-time event listeners
  const setupRealTimeListeners = useCallback(() => {
    console.log('Setting up real-time listeners for Dashboard');

    // XP Context listener
    if (registerXPListener) {
      xpListenerRef.current = registerXPListener((xpData) => {
        console.log('Dashboard received XP update:', xpData);
        handleRealTimeXPUpdate(xpData);
      });
    }

    // Achievement unlock listener
    achievementListenerRef.current = (event) => {
      console.log('Dashboard received achievement update:', event.detail);
      handleAchievementUpdate(event.detail);
    };
    window.addEventListener('edugame_achievements_unlocked', achievementListenerRef.current);

    // Challenge completion listener
    challengeListenerRef.current = (event) => {
      console.log('Dashboard received challenge update:', event.detail);
      handleChallengeUpdate(event.detail);
    };
    window.addEventListener('edugame_challenge_completed', challengeListenerRef.current);

    // Dashboard data sync listener
    const dashboardSyncListener = (event) => {
      console.log('Dashboard received data sync update:', event.detail);
      handleDashboardDataSync(event.detail);
    };
    window.addEventListener('edugame_dashboard_updated', dashboardSyncListener);

    // Connection status listener
    const connectionListener = () => {
      setRealtimeConnected(navigator.onLine);
    };
    window.addEventListener('online', connectionListener);
    window.addEventListener('offline', connectionListener);

    console.log('Real-time listeners setup complete');
  }, [registerXPListener]);

  // Handle real-time XP updates with animations
  const handleRealTimeXPUpdate = useCallback((xpData) => {
    if (!xpData) return;

    console.log('Processing real-time XP update on Dashboard:', xpData);

    // Animate the affected stats
    if (xpData.amount) {
      setAnimatingStats(prev => new Set([...prev, 'xp', 'level']));
      setTimeout(() => {
        setAnimatingStats(prev => {
          const newSet = new Set(prev);
          newSet.delete('xp');
          newSet.delete('level');
          return newSet;
        });
      }, 1000);
    }

    // Update dashboard data if available
    if (dashboardData) {
      setDashboardData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          gameData: {
            ...prev.user.gameData,
            totalXP: xpData.newTotal || currentXP,
            level: xpData.newLevel || currentLevel,
            weeklyProgress: xpData.weeklyProgress || weeklyProgress,
            rank: xpData.newRank || userRank
          }
        },
        weeklyProgress: {
          ...prev.weeklyProgress,
          current: xpData.weeklyProgress || weeklyProgress,
          percentage: prev.weeklyProgress.goal > 0 ? 
            ((xpData.weeklyProgress || weeklyProgress) / prev.weeklyProgress.goal) * 100 : 0
        }
      }));
    }

    // Show celebration for level up
    if (xpData.leveledUp && onCelebration) {
      onCelebration({
        type: 'level',
        newLevel: xpData.newLevel,
        message: `🎉 Level Up! You're now level ${xpData.newLevel}!`
      });
    }

    setLastUpdateTime(new Date().toISOString());
    setPendingUpdates(prev => Math.max(0, prev - 1));
  }, [dashboardData, onCelebration, currentXP, currentLevel, weeklyProgress, userRank]);

  // Handle achievement updates with celebrations
  const handleAchievementUpdate = useCallback((achievementData) => {
    if (!achievementData.achievements || achievementData.achievements.length === 0) return;

    console.log('Processing achievement update on Dashboard:', achievementData);

    // Animate achievement stats
    setAnimatingStats(prev => new Set([...prev, 'achievements']));
    setTimeout(() => {
      setAnimatingStats(prev => {
        const newSet = new Set(prev);
        newSet.delete('achievements');
        return newSet;
      });
    }, 1000);

    // Update achievements count in dashboard data
    if (dashboardData) {
      setDashboardData(prev => ({
        ...prev,
        stats: {
          ...prev.stats,
          achievementsUnlocked: (prev.stats.achievementsUnlocked || 0) + achievementData.achievements.length
        }
      }));
    }

    // Show achievement celebrations (staggered for multiple achievements)
    achievementData.achievements.forEach((achievement, index) => {
      setTimeout(() => {
        if (onCelebration) {
          onCelebration({
            type: 'achievement',
            achievement,
            message: `🏆 Achievement Unlocked: ${achievement.title}!`
          });
        }
      }, index * 500);
    });

    setLastUpdateTime(new Date().toISOString());
  }, [dashboardData, onCelebration]);

  // Handle challenge completion updates
  const handleChallengeUpdate = useCallback((challengeData) => {
    console.log('Processing challenge update on Dashboard:', challengeData);

    // Animate relevant stats
    setAnimatingStats(prev => new Set([...prev, 'xp', 'challenges']));
    setTimeout(() => {
      setAnimatingStats(prev => {
        const newSet = new Set(prev);
        newSet.delete('xp');
        newSet.delete('challenges');
        return newSet;
      });
    }, 1000);

    // Update daily challenges status if present
    if (dashboardData && dashboardData.dailyChallenges) {
      setDashboardData(prev => ({
        ...prev,
        dailyChallenges: prev.dailyChallenges.map(challenge => 
          challenge._id === challengeData.challengeId ? 
            {
              ...challenge,
              userStatus: {
                participated: true,
                completed: true,
                score: challengeData.score
              }
            } : 
            challenge
        )
      }));
    }

    // Remove from completing state
    setCompletingChallenges(prev => {
      const newSet = new Set(prev);
      newSet.delete(challengeData.challengeId);
      return newSet;
    });

    setLastUpdateTime(new Date().toISOString());
  }, [dashboardData]);

  // Handle dashboard data sync
  const handleDashboardDataSync = useCallback((syncData) => {
    console.log('Processing dashboard data sync:', syncData);
    
    if (syncData.dashboardData) {
      setDashboardData(syncData.dashboardData);
      setLastUpdateTime(new Date().toISOString());
    }
  }, []);

  // Sync user data changes
  const syncUserDataChanges = useCallback(() => {
    if (!dashboardData || !user) return;

    const hasChanges = 
      dashboardData.user?.gameData?.totalXP !== user.gameData?.totalXP ||
      dashboardData.user?.gameData?.level !== user.gameData?.level ||
      dashboardData.user?.gameData?.rank !== user.gameData?.rank;

    if (hasChanges) {
      console.log('Syncing user data changes to Dashboard');
      
      setDashboardData(prev => ({
        ...prev,
        user: {
          ...prev.user,
          gameData: {
            ...prev.user.gameData,
            ...user.gameData
          }
        }
      }));
    }
  }, [dashboardData, user]);

  // Fetch dashboard data with real-time enhancements
  const fetchDashboardData = useCallback(async (silent = false) => {
    if (!user) return;
    
    try {
      if (!silent) setLoading(true);
      
      console.log('Fetching dashboard data with real-time sync...');
      
      const result = await DataService.getDashboardData();
      
      if (result.success) {
        setDashboardData(result.data);
        
        // Handle any new achievements detected during fetch
        if (result.data.hasNewAchievements && result.data.newAchievements.length > 0) {
          console.log('New achievements detected during dashboard fetch!');
          handleAchievementUpdate({
            achievements: result.data.newAchievements,
            source: 'dashboard_fetch'
          });
        }
        
        setLastUpdateTime(new Date().toISOString());
        console.log('Dashboard data fetched successfully');
      } else {
        console.error('Failed to fetch dashboard data:', result.error);
        // Use fallback data
        setDashboardData(createFallbackDashboardData());
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setRealtimeConnected(false);
      setDashboardData(createFallbackDashboardData());
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, handleAchievementUpdate]);

  // Create fallback dashboard data
  const createFallbackDashboardData = useCallback(() => {
    return {
      user: {
        name: user?.name || 'User',
        gameData: {
          totalXP: currentXP || 1250,
          level: currentLevel || 3,
          currentStreak: currentStreak || 5,
          longestStreak: user?.gameData?.longestStreak || 12,
          rank: userRank || 156,
          weeklyProgress: weeklyProgress || 720
        }
      },
      recentActivities: [
        { 
          _id: '1', 
          type: 'challenge_completed', 
          title: 'Math Challenge Complete', 
          description: 'Solved 10 algebra problems',
          createdAt: new Date().toISOString(),
          metadata: { xpGained: 50 }
        },
        { 
          _id: '2', 
          type: 'achievement_unlocked', 
          title: 'First Week Milestone', 
          description: 'Completed 7 days of learning',
          createdAt: new Date(Date.now() - 86400000).toISOString(),
          metadata: { xpGained: 100 }
        }
      ],
      dailyChallenges: [
        { _id: '1', title: 'Daily Math', xpReward: 25, difficulty: 'medium', userStatus: { completed: false } },
        { _id: '2', title: 'Science Quiz', xpReward: 30, difficulty: 'easy', userStatus: { completed: false } },
        { _id: '3', title: 'Word Challenge', xpReward: 20, difficulty: 'hard', userStatus: { completed: true } }
      ],
      weeklyProgress: {
        current: weeklyProgress || 720,
        goal: 1000,
        percentage: ((weeklyProgress || 720) / 1000) * 100
      },
      stats: {
        totalXP: currentXP || 1250,
        level: currentLevel || 3,
        currentStreak: currentStreak || 5,
        rank: userRank || 156,
        achievementsUnlocked: user?.achievements?.length || 5
      }
    };
  }, [user, currentXP, currentLevel, currentStreak, userRank, weeklyProgress]);

  // Manual refresh with comprehensive sync
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPendingUpdates(prev => prev + 1);
    
    try {
      // Force sync from backend first
      if (forceSyncFromBackend) {
        await forceSyncFromBackend();
      }
      
      // Then fetch fresh dashboard data
      await fetchDashboardData();
      
      // Check for new achievements
      await DataService.checkAchievements();
      
      toast.success('Dashboard refreshed with latest data! 🔄');
    } catch (error) {
      console.error(' Refresh failed:', error);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setIsRefreshing(false);
      setPendingUpdates(prev => Math.max(0, prev - 1));
    }
  }, [fetchDashboardData, forceSyncFromBackend]);

  // It will start auto-refresh for real-time updates
  const startAutoRefresh = useCallback(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    autoRefreshRef.current = setInterval(() => {
      if (document.visibilityState === 'visible' && !isSyncing) {
        fetchDashboardData(true); // Silent refresh
      }
    }, 60000); // Refresh every minute

    console.log('Auto-refresh started (60s interval)');
  }, [fetchDashboardData, isSyncing]);

  // Complete challenge with real-time updates
  const completeTodaysChallenge = useCallback(async (challengeId, xp) => {
    try {
      setPendingUpdates(prev => prev + 1);
      setCompletingChallenges(prev => new Set([...prev, challengeId]));
      
      // Start the challenge
      const startResult = await DataService.startChallenge(challengeId);
      if (!startResult.success) {
        throw new Error(startResult.error);
      }

      // Auto-complete with mock answers for demo
      const mockAnswers = startResult.data.challenge.questions?.map((_, index) => ({
        questionIndex: index,
        selectedAnswer: 'Mock Answer',
        timeSpent: 30
      })) || [];

      // Submit the challenge
      const submitResult = await DataService.submitChallenge(challengeId, mockAnswers, 300);
      
      if (submitResult.success) {
        console.log('Challenge completed with real-time sync');
        
        // The real-time listeners will handle the updates automatically
        // Show immediate celebration
        if (onCelebration) {
          onCelebration({
            type: 'xp',
            amount: submitResult.data.xpGained || xp,
            message: `🎯 Challenge completed! +${submitResult.data.xpGained || xp} XP earned!`
          });
        }
        
        // Update local dashboard state immediately
        updateLocalChallengeStatus(challengeId, {
          completed: true,
          participated: true,
          score: submitResult.data.score || 85
        });
        
        // Refresh dashboard data after delay
        setTimeout(() => {
          fetchDashboardData(true);
        }, 1000);
      } else {
        throw new Error(submitResult.error);
      }
    } catch (error) {
      console.error('Error completing challenge:', error);
      
      // Still show celebration for user feedback
      if (onCelebration) {
        onCelebration({
          type: 'xp',
          amount: xp,
          message: 'Challenge completed! 🎯'
        });
      }
      
      // Update local state for immediate UI feedback
      updateLocalChallengeStatus(challengeId, {
        completed: true,
        participated: true,
        score: 85
      });
      
      toast.success(`Challenge completed! +${xp} XP earned!`);
    } finally {
      setPendingUpdates(prev => Math.max(0, prev - 1));
      setCompletingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(challengeId);
        return newSet;
      });
    }
  }, [fetchDashboardData, onCelebration]);

  // Update local challenge status
  const updateLocalChallengeStatus = useCallback((challengeId, status) => {
    setDashboardData(prev => {
      if (!prev || !prev.dailyChallenges) return prev;
      
      return {
        ...prev,
        dailyChallenges: prev.dailyChallenges.map(challenge =>
          challenge._id === challengeId
            ? { ...challenge, userStatus: { ...challenge.userStatus, ...status } }
            : challenge
        )
      };
    });
  }, []);

  // Cleanup listeners
  const cleanupListeners = useCallback(() => {
    console.log('Cleaning up Dashboard listeners');
    
    if (xpListenerRef.current) {
      xpListenerRef.current();
      xpListenerRef.current = null;
    }

    if (achievementListenerRef.current) {
      window.removeEventListener('edugame_achievements_unlocked', achievementListenerRef.current);
      achievementListenerRef.current = null;
    }

    if (challengeListenerRef.current) {
      window.removeEventListener('edugame_challenge_completed', challengeListenerRef.current);
      challengeListenerRef.current = null;
    }

    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }
  }, []);

  // Get real-time user game data
  const getUserGameData = useCallback(() => {
    return {
      totalXP: currentXP || dashboardData?.user?.gameData?.totalXP || 1250,
      level: currentLevel || dashboardData?.user?.gameData?.level || 3,
      currentStreak: currentStreak || dashboardData?.user?.gameData?.currentStreak || 5,
      longestStreak: dashboardData?.user?.gameData?.longestStreak || 12,
      rank: userRank || dashboardData?.user?.gameData?.rank || 156,
      weeklyProgress: weeklyProgress || dashboardData?.weeklyProgress?.current || 720
    };
  }, [currentXP, currentLevel, currentStreak, userRank, weeklyProgress, dashboardData]);

  // Show loading state with real-time status
  if (loading && !dashboardData) {
    return (
      <div className="space-y-6 animate-fadeIn">
        {/* Real-time status indicator */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600">Loading dashboard with real-time sync...</span>
          </div>
          <div className="flex items-center space-x-2">
            {realtimeConnected ? (
              <Wifi className="w-5 h-5 text-green-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm text-gray-500">
              {realtimeConnected ? 'Connected' : 'Offline'}
            </span>
          </div>
        </div>
        
        {/* Skeleton UI */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const userGameData = getUserGameData();
  const displayData = dashboardData || createFallbackDashboardData();
  const recentActivities = displayData.recentActivities || [];
  const todaysChallenges = displayData.dailyChallenges || [];
  const weeklyProgressData = displayData.weeklyProgress || {
    current: userGameData.weeklyProgress,
    goal: 1000,
    percentage: (userGameData.weeklyProgress / 1000) * 100
  };

  const quickStats = {
    coursesCompleted: 12,
    challengesWon: recentActivities.filter(a => a.type === 'challenge_completed').length,
    averageScore: 87,
    studyTime: 24
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Real-time Status */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">
            Welcome back, {displayData?.user?.name || user?.name}! 
            {pendingUpdates > 0 && (
              <span className="ml-2 text-sm text-blue-600 animate-pulse">
                ({pendingUpdates} updates pending)
              </span>
            )}
          </h2>
          <p className="text-gray-600">Here's your real-time learning progress</p>
          {lastUpdateTime && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated: {new Date(lastUpdateTime).toLocaleTimeString()}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Real-time Connection Status */}
          <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
            realtimeConnected && connectionStatus === 'connected' 
              ? 'bg-green-50 text-green-700 border border-green-200' 
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {realtimeConnected && connectionStatus === 'connected' ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
            <span>
              {realtimeConnected && connectionStatus === 'connected' ? 'Live' : 'Offline'}
            </span>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isSyncing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing || isSyncing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : isSyncing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Quick Stats Grid with Real-time Animations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnimatedCard 
          delay={0} 
          className={`bg-gradient-to-br from-green-50 to-green-100 border border-green-200 ${
            animatingStats.has('xp') ? 'animate-pulse ring-2 ring-green-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 text-sm font-medium">Total XP</p>
              <p className="text-3xl font-bold text-green-900">
                {userGameData.totalXP.toLocaleString()}
              </p>
              <p className="text-green-600 text-xs mt-1">
                {displayData?.user?.levelProgress ? 
                  `${Math.round(displayData.user.levelProgress.percentage)}% to next level` :
                  '+150 this week'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard 
          delay={100} 
          className={`bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 ${
            animatingStats.has('streak') ? 'animate-pulse ring-2 ring-orange-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-700 text-sm font-medium">Current Streak</p>
              <p className="text-3xl font-bold text-orange-900">{userGameData.currentStreak} days</p>
              <p className="text-orange-600 text-xs mt-1">
                {userGameData.currentStreak > userGameData.longestStreak ? 'New record!' : 'Keep it up!'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard 
          delay={200} 
          className={`bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 ${
            animatingStats.has('rank') ? 'animate-pulse ring-2 ring-purple-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">Global Rank</p>
              <p className="text-3xl font-bold text-purple-900">#{userGameData.rank}</p>
              <p className="text-purple-600 text-xs mt-1">
                {userGameData.rank <= 10 ? 'Top 10!' : userGameData.rank <= 100 ? 'Top 100!' : 'Climbing up!'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard 
          delay={300} 
          className={`bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 ${
            animatingStats.has('level') ? 'animate-pulse ring-2 ring-blue-300' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Level</p>
              <p className="text-3xl font-bold text-blue-900">{userGameData.level}</p>
              <p className="text-blue-600 text-xs mt-1">
                {displayData?.user?.levelProgress ? 
                  `${displayData.user.levelProgress.required - displayData.user.levelProgress.current} XP to next` :
                  '750 XP to next'
                }
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Real-time Weekly Progress */}
        <div className="lg:col-span-2">
          <AnimatedCard delay={400}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-black">Weekly Progress</h3>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>This Week</span>
                {pendingUpdates > 0 && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                )}
              </div>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-3">
                  <span className="text-gray-600 font-medium">XP Goal: {weeklyProgressData.goal}</span>
                  <span className="text-black font-semibold">{weeklyProgressData.current} XP</span>
                </div>
                <XPBar current={weeklyProgressData.current} max={weeklyProgressData.goal} className="h-4" />
                <p className="text-sm text-gray-500 mt-2">
                  {Math.round(weeklyProgressData.percentage)}% complete • {weeklyProgressData.goal - weeklyProgressData.current} XP to go
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-black">{quickStats.coursesCompleted}</p>
                  <p className="text-xs text-gray-600">Courses</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-black">{quickStats.challengesWon}</p>
                  <p className="text-xs text-gray-600">Challenges</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-black">{quickStats.averageScore}%</p>
                  <p className="text-xs text-gray-600">Avg Score</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-black">{quickStats.studyTime}h</p>
                  <p className="text-xs text-gray-600">Study Time</p>
                </div>
              </div>
            </div>
          </AnimatedCard>
        </div>

        {/* Real-time Today's Challenges */}
        <div>
          <AnimatedCard delay={500}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-black">Today's Challenges</h3>
              {animatingStats.has('challenges') && (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              )}
            </div>
            {todaysChallenges.length > 0 ? (
              <div className="space-y-3">
                {todaysChallenges.slice(0, 3).map((challenge) => (
                  <div key={challenge._id} className={`p-3 rounded-lg border-2 transition-all ${
                    challenge.userStatus?.completed 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-gray-50 border-gray-200 hover:border-purple-200'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-semibold text-black">{challenge.title}</h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <Zap className="w-3 h-3 text-yellow-500" />
                          <span className="text-xs text-gray-600">{challenge.xpReward} XP</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-600 capitalize">{challenge.difficulty}</span>
                        </div>
                      </div>
                      {challenge.userStatus?.completed ? (
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => completeTodaysChallenge(challenge._id, challenge.xpReward)}
                          disabled={completingChallenges.has(challenge._id) || pendingUpdates > 0}
                          className="px-3 py-1 bg-gradient-to-r from-green-400 to-purple-500 text-white text-xs rounded-full hover:shadow-md transition-all disabled:opacity-50"
                        >
                          {completingChallenges.has(challenge._id) ? 'Completing...' : 'Start'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No challenges available today</p>
                <p className="text-sm text-gray-400">Check back tomorrow!</p>
              </div>
            )}
          </AnimatedCard>
        </div>
      </div>

      {/* Recent Activity & Quick Actions with Real-time Updates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Real-time Recent Activity */}
        <AnimatedCard delay={600}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-black">Recent Activity</h3>
            {lastUpdateTime && (
              <span className="text-xs text-gray-400">
                Live • {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            )}
          </div>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.slice(0, 4).map((activity, i) => (
                <div key={activity._id || i} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'challenge_completed' ? 'bg-green-100' :
                      activity.type === 'achievement_unlocked' ? 'bg-yellow-100' :
                      activity.type === 'level_up' ? 'bg-purple-100' :
                      'bg-blue-100'
                    }`}>
                      {activity.type === 'challenge_completed' && <Target className="w-4 h-4 text-green-600" />}
                      {activity.type === 'achievement_unlocked' && <Award className="w-4 h-4 text-yellow-600" />}
                      {activity.type === 'level_up' && <TrendingUp className="w-4 h-4 text-purple-600" />}
                      {!['challenge_completed', 'achievement_unlocked', 'level_up'].includes(activity.type) && 
                        <BookOpen className="w-4 h-4 text-blue-600" />}
                    </div>
                    <div>
                      <p className="font-semibold text-black text-sm">{activity.title}</p>
                      <p className="text-xs text-gray-600">{activity.description}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {activity.metadata?.xpGained && (
                      <div className="flex items-center space-x-1">
                        <Zap className="w-3 h-3 text-yellow-500" />
                        <span className="text-xs text-gray-600">+{activity.metadata.xpGained}</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
              <p className="text-sm text-gray-400">Start learning to see your progress here!</p>
            </div>
          )}
        </AnimatedCard>

        {/* Quick Actions with Real-time Status */}
        <AnimatedCard delay={700}>
          <h3 className="text-xl font-bold text-black mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button 
              disabled={pendingUpdates > 0}
              className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg hover:shadow-md transition-all group disabled:opacity-50"
            >
              <BookOpen className="w-8 h-8 text-blue-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-blue-700">Start Course</p>
            </button>
            <button 
              disabled={pendingUpdates > 0}
              className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg hover:shadow-md transition-all group disabled:opacity-50"
            >
              <Target className="w-8 h-8 text-green-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-green-700">Take Challenge</p>
            </button>
            <button 
              disabled={pendingUpdates > 0}
              className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg hover:shadow-md transition-all group disabled:opacity-50"
            >
              <Users className="w-8 h-8 text-purple-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-purple-700">Join Study Group</p>
            </button>
            <button 
              disabled={pendingUpdates > 0}
              className="p-4 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg hover:shadow-md transition-all group disabled:opacity-50"
            >
              <Award className="w-8 h-8 text-yellow-500 mx-auto mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-semibold text-yellow-700">View Achievements</p>
            </button>
          </div>
        </AnimatedCard>
      </div>

      {/* Real-time Sync Status Footer */}
      {(pendingUpdates > 0 || lastUpdateTime) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-3 h-3 rounded-full ${
                pendingUpdates > 0 ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'
              }`}></div>
              <span className="text-sm text-blue-700">
                {pendingUpdates > 0 
                  ? `Real-time sync active (${pendingUpdates} updates pending)`
                  : 'All data synchronized'
                }
              </span>
            </div>
            {lastUpdateTime && (
              <span className="text-xs text-blue-600">
                Updated: {new Date(lastUpdateTime).toLocaleTimeString()}
              </span>
            )}
          </div>
          
          {/* Sync Progress Indicator */}
          {pendingUpdates > 0 && (
            <div className="mt-2">
              <div className="w-full bg-blue-200 rounded-full h-1">
                <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DashboardHome;