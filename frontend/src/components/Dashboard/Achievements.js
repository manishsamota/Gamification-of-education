import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Trophy, Lock, Star, Target, Flame, BookOpen, RefreshCw, Sparkles } from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import XPBar from '../Common/XPBar';
import DataService from '../../services/dataService';


const DUMMY_ACHIEVEMENTS_DATA = {
  achievements: [
    // Streak Category - Bronze to Legendary
    {
      _id: 'streak-1',
      title: 'First Steps',
      description: 'Complete your first day of learning',
      icon: '🥉',
      category: 'streak',
      type: 'bronze',
      rarity: 'common',
      unlocked: true,
      unlockedAt: '2024-01-15T10:30:00Z',
      rewards: { xp: 25, streakFreeze: 0 },
      criteria: { type: 'streak_days', target: 1 },
      progress: { current: 5, target: 1, percentage: 100 }
    },
    {
      _id: 'streak-2',
      title: 'Week Warrior',
      description: 'Maintain a 7-day learning streak',
      icon: '🥈',
      category: 'streak',
      type: 'silver',
      rarity: 'uncommon',
      unlocked: true,
      unlockedAt: '2024-01-22T14:20:00Z',
      rewards: { xp: 100, streakFreeze: 1 },
      criteria: { type: 'streak_days', target: 7 },
      progress: { current: 5, target: 7, percentage: 100 }
    },
    {
      _id: 'streak-3',
      title: 'Monthly Master',
      description: 'Achieve a 30-day learning streak',
      icon: '🥇',
      category: 'streak',
      type: 'gold',
      rarity: 'rare',
      unlocked: false,
      rewards: { xp: 500, streakFreeze: 3 },
      criteria: { type: 'streak_days', target: 30 },
      progress: { current: 5, target: 30, percentage: 16.7 }
    },
    {
      _id: 'streak-4',
      title: 'Unstoppable Force',
      description: 'Maintain a 100-day learning streak',
      icon: '💎',
      category: 'streak',
      type: 'platinum',
      rarity: 'epic',
      unlocked: false,
      rewards: { xp: 2000, streakFreeze: 10 },
      criteria: { type: 'streak_days', target: 100 },
      progress: { current: 5, target: 100, percentage: 5 }
    },

    // XP Category
    {
      _id: 'xp-1',
      title: 'Point Collector',
      description: 'Earn your first 100 XP',
      icon: '⚡',
      category: 'xp',
      type: 'bronze',
      rarity: 'common',
      unlocked: true,
      unlockedAt: '2024-01-16T09:15:00Z',
      rewards: { xp: 50, streakFreeze: 0 },
      criteria: { type: 'total_xp', target: 100 },
      progress: { current: 1250, target: 100, percentage: 100 }
    },
    {
      _id: 'xp-2',
      title: 'XP Enthusiast',
      description: 'Accumulate 1,000 total XP',
      icon: '⭐',
      category: 'xp',
      type: 'silver',
      rarity: 'uncommon',
      unlocked: true,
      unlockedAt: '2024-02-05T16:45:00Z',
      rewards: { xp: 200, streakFreeze: 1 },
      criteria: { type: 'total_xp', target: 1000 },
      progress: { current: 1250, target: 1000, percentage: 100 }
    },
    {
      _id: 'xp-3',
      title: 'Power Learner',
      description: 'Reach 5,000 total XP',
      icon: '🌟',
      category: 'xp',
      type: 'gold',
      rarity: 'rare',
      unlocked: false,
      rewards: { xp: 1000, streakFreeze: 2 },
      criteria: { type: 'total_xp', target: 5000 },
      progress: { current: 1250, target: 5000, percentage: 25 }
    },
    {
      _id: 'xp-4',
      title: 'XP Legend',
      description: 'Accumulate 25,000 total XP',
      icon: '👑',
      category: 'xp',
      type: 'legendary',
      rarity: 'legendary',
      unlocked: false,
      rewards: { xp: 5000, streakFreeze: 5 },
      criteria: { type: 'total_xp', target: 25000 },
      progress: { current: 1250, target: 25000, percentage: 5 }
    },

    // Challenge Category
    {
      _id: 'challenge-1',
      title: 'Challenge Starter',
      description: 'Complete your first challenge',
      icon: '🎯',
      category: 'challenges',
      type: 'bronze',
      rarity: 'common',
      unlocked: true,
      unlockedAt: '2024-01-17T11:30:00Z',
      rewards: { xp: 50, streakFreeze: 0 },
      criteria: { type: 'challenges_completed', target: 1 },
      progress: { current: 3, target: 1, percentage: 100 }
    },
    {
      _id: 'challenge-2',
      title: 'Challenge Enthusiast',
      description: 'Complete 10 challenges',
      icon: '🏆',
      category: 'challenges',
      type: 'silver',
      rarity: 'uncommon',
      unlocked: false,
      rewards: { xp: 300, streakFreeze: 1 },
      criteria: { type: 'challenges_completed', target: 10 },
      progress: { current: 3, target: 10, percentage: 30 }
    },
    {
      _id: 'challenge-3',
      title: 'Perfect Score',
      description: 'Get 100% on any challenge',
      icon: '💯',
      category: 'challenges',
      type: 'gold',
      rarity: 'rare',
      unlocked: true,
      unlockedAt: '2024-02-01T13:20:00Z',
      rewards: { xp: 500, streakFreeze: 2 },
      criteria: { type: 'perfect_scores', target: 1 },
      progress: { current: 1, target: 1, percentage: 100 }
    },
    {
      _id: 'challenge-4',
      title: 'Speed Demon',
      description: 'Complete a challenge in under 2 minutes',
      icon: '⚡',
      category: 'challenges',
      type: 'platinum',
      rarity: 'epic',
      unlocked: false,
      rewards: { xp: 750, streakFreeze: 3 },
      criteria: { type: 'custom', target: 1 },
      progress: { current: 0, target: 1, percentage: 0 }
    },

    // Course Category
    {
      _id: 'course-1',
      title: 'Course Explorer',
      description: 'Start your first course',
      icon: '📚',
      category: 'courses',
      type: 'bronze',
      rarity: 'common',
      unlocked: false,
      rewards: { xp: 100, streakFreeze: 0 },
      criteria: { type: 'courses_completed', target: 1 },
      progress: { current: 0, target: 1, percentage: 0 }
    },
    {
      _id: 'course-2',
      title: 'Dedicated Student',
      description: 'Complete 3 courses',
      icon: '🎓',
      category: 'courses',
      type: 'gold',
      rarity: 'rare',
      unlocked: false,
      rewards: { xp: 1000, streakFreeze: 2 },
      criteria: { type: 'courses_completed', target: 3 },
      progress: { current: 0, target: 3, percentage: 0 }
    },

    // Social Category
    {
      _id: 'social-1',
      title: 'Social Learner',
      description: 'Join your first study group',
      icon: '👥',
      category: 'social',
      type: 'silver',
      rarity: 'uncommon',
      unlocked: false,
      rewards: { xp: 200, streakFreeze: 1 },
      criteria: { type: 'custom', target: 1 },
      progress: { current: 0, target: 1, percentage: 0 }
    },
    {
      _id: 'social-2',
      title: 'Team Player',
      description: 'Help 5 other learners',
      icon: '🤝',
      category: 'social',
      type: 'gold',
      rarity: 'rare',
      unlocked: false,
      rewards: { xp: 500, streakFreeze: 2 },
      criteria: { type: 'custom', target: 5 },
      progress: { current: 0, target: 5, percentage: 0 }
    },

    // Here I have added special Category, for more variety
    {
      _id: 'special-1',
      title: 'Early Bird',
      description: 'Complete a challenge before 8 AM',
      icon: '🌅',
      category: 'special',
      type: 'platinum',
      rarity: 'epic',
      unlocked: false,
      rewards: { xp: 300, streakFreeze: 1 },
      criteria: { type: 'custom', target: 1 },
      progress: { current: 0, target: 1, percentage: 0 }
    },
    {
      _id: 'special-2',
      title: 'Night Owl',
      description: 'Study after 10 PM for 5 days',
      icon: '🦉',
      category: 'special',
      type: 'gold',
      rarity: 'rare',
      unlocked: false,
      rewards: { xp: 400, streakFreeze: 2 },
      criteria: { type: 'custom', target: 5 },
      progress: { current: 0, target: 5, percentage: 0 }
    },
    {
      _id: 'special-3',
      title: 'Weekend Warrior',
      description: 'Study on both Saturday and Sunday',
      icon: '⚔️',
      category: 'special',
      type: 'silver',
      rarity: 'uncommon',
      unlocked: true,
      unlockedAt: '2024-01-28T12:00:00Z',
      rewards: { xp: 250, streakFreeze: 1 },
      criteria: { type: 'custom', target: 1 },
      progress: { current: 1, target: 1, percentage: 100 }
    },
    {
      _id: 'special-4',
      title: 'Consistency King',
      description: 'Study for 14 consecutive days',
      icon: '👑',
      category: 'special',
      type: 'legendary',
      rarity: 'legendary',
      unlocked: false,
      rewards: { xp: 1500, streakFreeze: 5 },
      criteria: { type: 'streak_days', target: 14 },
      progress: { current: 5, target: 14, percentage: 35.7 }
    }
  ],
  stats: {
    total: 18,
    unlocked: 7,
    percentage: 38.9
  },
  newlyUnlocked: [],
  hasNewAchievements: false,
  lastUpdated: new Date().toISOString()
};

const Achievements = () => {
  const { user } = useAuth();
  
  // state for achievements data
  const [achievements, setAchievements] = useState([]);
  const [achievementStats, setAchievementStats] = useState({
    total: 0,
    unlocked: 0,
    percentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [newlyUnlockedIds, setNewlyUnlockedIds] = useState(new Set());

  // categories to include 'special'
  const categories = ['all', 'streak', 'xp', 'challenges', 'courses', 'social', 'special'];

  // Fetch achievements on mount and set up auto-refresh
  useEffect(() => {
    fetchAchievements();
    
    // It set up periodic refresh to catch new achievements
    const refreshInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchAchievements(true); // Silent refresh
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(refreshInterval);
  }, []);

  // Listen for user changes to detect potential new achievements
  useEffect(() => {
    if (user && lastFetchTime) {
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      // if it's been more than 10 seconds since last fetch and user data changed, refresh
      if (timeSinceLastFetch > 10000) {
        fetchAchievements(true);
      }
    }
  }, [user?.gameData?.totalXP, user?.gameData?.level, user?.gameData?.currentStreak]);

  // This function to fetch achievements with change detection and dummy data fallback
  const fetchAchievements = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      const result = await DataService.getAchievements();
      
      if (result.success && result.data.achievements?.length > 0) {
        const newAchievements = result.data.achievements;
        const newStats = result.data.stats;
        
        // Detect newly unlocked achievements
        if (achievements.length > 0 && !silent) {
          const previouslyUnlocked = new Set(
            achievements.filter(a => a.unlocked).map(a => a._id)
          );
          const currentlyUnlocked = new Set(
            newAchievements.filter(a => a.unlocked).map(a => a._id)
          );
          
          const newlyUnlocked = [...currentlyUnlocked].filter(id => !previouslyUnlocked.has(id));
          
          if (newlyUnlocked.length > 0) {
            console.log(` Detected ${newlyUnlocked.length} newly unlocked achievements!`);
            setNewlyUnlockedIds(new Set(newlyUnlocked));
            
            // Clear the "newly unlocked" highlighting after 5 seconds
            setTimeout(() => {
              setNewlyUnlockedIds(new Set());
            }, 5000);
          }
        }
        
        setAchievements(newAchievements);
        setAchievementStats(newStats);
        setLastFetchTime(Date.now());
      } else {
        console.log('No achievements from API, using dummy data');
        
        // Use dummy data as fallback
        setAchievements(DUMMY_ACHIEVEMENTS_DATA.achievements);
        setAchievementStats(DUMMY_ACHIEVEMENTS_DATA.stats);
        setLastFetchTime(Date.now());
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      
      // Use dummy data on error
      setAchievements(DUMMY_ACHIEVEMENTS_DATA.achievements);
      setAchievementStats(DUMMY_ACHIEVEMENTS_DATA.stats);
      setLastFetchTime(Date.now());
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Manual refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAchievements();
    setIsRefreshing(false);
  };

  const filteredAchievements = selectedCategory === 'all' 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const getRarityColor = (rarity) => {
    switch (rarity) {
      case 'common': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'uncommon': return 'bg-green-100 text-green-800 border-green-300';
      case 'rare': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'epic': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'legendary': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'streak': return Flame;
      case 'xp': return Star;
      case 'challenges': return Target;
      case 'courses': return BookOpen;
      case 'social': return Trophy;
      case 'special': return Sparkles;
      default: return Trophy;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading achievements...</p>
        </div>
      </div>
    );
  }

  const completionPercentage = achievementStats.total > 0 ? (achievementStats.unlocked / achievementStats.total) * 100 : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Refresh Button and Real-time Stats */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Achievements</h2>
          <p className="text-gray-600">
            Track your learning milestones and unlock rewards
            {lastFetchTime && (
              <span className="text-xs text-gray-400 ml-2">
                • Updated {new Date(lastFetchTime).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time achievement count */}
          <div className="bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200">
            <div className="flex items-center space-x-1">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-700">
                {achievementStats.unlocked}/{achievementStats.total}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Progress Overview with Real-time Data */}
      <AnimatedCard delay={0}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold text-black">Achievement Progress</h3>
            <p className="text-gray-600">Your learning milestone journey</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-black">{achievementStats.unlocked}/{achievementStats.total}</p>
            <p className="text-sm text-gray-600">Achievements</p>
          </div>
        </div>
        
        {achievementStats.total > 0 && (
          <>
            <XPBar 
              current={achievementStats.unlocked} 
              max={achievementStats.total} 
              className="h-4 mb-2" 
              showLabel={false}
            />
            <p className="text-sm text-gray-500">
              {Math.round(completionPercentage)}% complete • {achievementStats.total - achievementStats.unlocked} remaining
            </p>
          </>
        )}

        {/* Show recently unlocked count if any */}
        {newlyUnlockedIds.size > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-green-600" />
              <span className="text-green-800 font-semibold">
                🎉 {newlyUnlockedIds.size} new achievement{newlyUnlockedIds.size > 1 ? 's' : ''} unlocked!
              </span>
            </div>
          </div>
        )}
      </AnimatedCard>

      {/* Category Filter - Updated to include 'special' category */}
      <div className="flex flex-wrap gap-2">
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
              selectedCategory === category
                ? 'bg-gradient-to-r from-green-400 to-purple-500 text-white shadow-lg'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Achievements Grid with Real-time Updates */}
      {filteredAchievements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAchievements.map((achievement, i) => {
            const IconComponent = getCategoryIcon(achievement.category);
            const isUnlocked = achievement.unlocked;
            const isNewlyUnlocked = newlyUnlockedIds.has(achievement._id);
            const progress = achievement.progress || { current: 0, target: 1, percentage: 0 };

            return (
              <AnimatedCard 
                key={achievement._id} 
                delay={i * 100} 
                className={`${isUnlocked ? 'glow' : 'opacity-75'} ${
                  isUnlocked ? 'border-2 border-green-200' : ''
                } ${
                  isNewlyUnlocked ? 'ring-4 ring-yellow-300 ring-opacity-50 animate-pulse' : ''
                } transition-all duration-500`}
              >
                <div className="text-center space-y-4">
                  {/* Achievement Icon with New Badge */}
                  <div className="relative">
                    <div className={`relative w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
                      isUnlocked 
                        ? 'bg-gradient-to-r from-green-400 to-purple-500' 
                        : 'bg-gray-300'
                    }`}>
                      {isUnlocked ? (
                        <div className="text-2xl">{achievement.icon}</div>
                      ) : (
                        <Lock className="w-6 h-6 text-gray-500" />
                      )}
                      
                      {/* Rarity Badge */}
                      <div className={`absolute -top-2 -right-2 px-2 py-1 rounded-full text-xs font-bold border ${getRarityColor(achievement.rarity)}`}>
                        {achievement.rarity}
                      </div>
                    </div>

                    {/* New Achievement Badge */}
                    {isNewlyUnlocked && (
                      <div className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full border-2 border-white animate-bounce">
                        NEW!
                      </div>
                    )}
                  </div>

                  {/* Achievement Info */}
                  <div>
                    <h3 className={`text-lg font-bold ${isUnlocked ? 'text-black' : 'text-gray-500'}`}>
                      {achievement.title}
                    </h3>
                    <p className={`text-sm ${isUnlocked ? 'text-gray-600' : 'text-gray-400'}`}>
                      {achievement.description}
                    </p>
                  </div>

                  {/* This is progress Bar with Real-time Updates */}
                  {!isUnlocked && progress && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Progress</span>
                        <span className="text-gray-700">{progress.current}/{progress.target}</span>
                      </div>
                      <XPBar 
                        current={progress.current} 
                        max={progress.target} 
                        className="h-2"
                        animated={true}
                      />
                      <p className="text-xs text-gray-500">
                        {Math.round(progress.percentage)}% complete
                      </p>
                    </div>
                  )}

                  {/* Reward Info */}
                  <div className={`p-3 rounded-lg ${
                    isUnlocked ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-center justify-center space-x-4 text-sm">
                      {achievement.rewards?.xp > 0 && (
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className={isUnlocked ? 'text-green-700' : 'text-gray-600'}>
                            +{achievement.rewards.xp} XP
                          </span>
                        </div>
                      )}
                      {achievement.rewards?.streakFreeze > 0 && (
                        <div className="flex items-center space-x-1">
                          <span className="text-blue-500">❄️</span>
                          <span className={isUnlocked ? 'text-green-700' : 'text-gray-600'}>
                            +{achievement.rewards.streakFreeze} Freeze
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category & Type */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-1">
                      <IconComponent className="w-3 h-3 text-gray-500" />
                      <span className="text-gray-500 capitalize">{achievement.category}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      achievement.type === 'bronze' ? 'bg-orange-100 text-orange-800' :
                      achievement.type === 'silver' ? 'bg-gray-100 text-gray-800' :
                      achievement.type === 'gold' ? 'bg-yellow-100 text-yellow-800' :
                      achievement.type === 'platinum' ? 'bg-blue-100 text-blue-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {achievement.type}
                    </span>
                  </div>

                  {/* Date with Real-time Display */}
                  {isUnlocked && achievement.unlockedAt && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}</p>
                      {isNewlyUnlocked && (
                        <p className="text-green-600 font-semibold animate-pulse">
                          🎉 Just unlocked!
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      ) : (
        /* it is Empty State */
        <div className="text-center py-12">
          <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">
            {selectedCategory === 'all' ? 'No achievements found' : 'No achievements in this category'}
          </h3>
          <p className="text-gray-400">
            {selectedCategory === 'all' 
              ? 'Start learning to unlock your first achievement!' 
              : 'Try selecting a different category'
            }
          </p>
          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="mt-4 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              View All Achievements
            </button>
          )}
        </div>
      )}

      {/* It is achievement Stats Footer */}
      {achievementStats.total > 0 && (
        <AnimatedCard delay={600}>
          <h3 className="text-lg font-bold text-black mb-4">Achievement Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-black">{achievementStats.unlocked}</p>
              <p className="text-sm text-gray-600">Unlocked</p>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-black">{achievementStats.total - achievementStats.unlocked}</p>
              <p className="text-sm text-gray-600">Remaining</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <Star className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-black">{Math.round(completionPercentage)}%</p>
              <p className="text-sm text-gray-600">Complete</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Sparkles className="w-8 h-8 text-purple-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-black">{newlyUnlockedIds.size}</p>
              <p className="text-sm text-gray-600">Recently Unlocked</p>
            </div>
          </div>
        </AnimatedCard>
      )}
    </div>
  );
};

export default Achievements;