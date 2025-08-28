import { useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
// import { useXP } from '../contexts/XPContext';
import { toast } from 'react-toastify';


export const useRealTimeSync = (options = {}) => {
  const { user, updateUser } = useAuth();
  // const xpContext = useXP();
  const listenersRef = useRef([]);
  const {
    enableXPSync = true,
    enableChallengeSync = true,
    enableAchievementSync = true,
    enableLevelSync = true,
    enableRankSync = true,
    showToasts = true,
    onXPUpdate,
    onChallengeComplete,
    onAchievementUnlock,
    onLevelUp,
    onRankImprove
  } = options;

  // Setup real-time event listeners
  useEffect(() => {
    console.log(' Setting up real-time sync listeners');

    // XP Update Handler
    const handleXPUpdate = (event) => {
      if (!enableXPSync) return;
      
      console.log(' Real-time XP update received:', event.detail);
      
      try {
        // Update user context
        if (updateUser && event.detail.newTotal) {
          updateUser({
            gameData: {
              ...user?.gameData,
              totalXP: event.detail.newTotal,
              level: event.detail.newLevel || Math.floor(event.detail.newTotal / 1000) + 1,
              weeklyProgress: event.detail.weeklyProgress || user?.gameData?.weeklyProgress,
              rank: event.detail.newRank || user?.gameData?.rank
            }
          });
        }

        // Call custom handler if provided
        if (onXPUpdate) {
          onXPUpdate(event.detail);
        }

        // Show toast notification
        if (showToasts && event.detail.amount > 0) {
          toast.success(`+${event.detail.amount} XP earned! `, {
            toastId: `xp-gained-${event.detail.timestamp}`,
            autoClose: 2000
          });
        }
      } catch (error) {
        console.error(' Error handling XP update:', error);
      }
    };

    // Challenge Completion Handler
    const handleChallengeCompletion = (event) => {
      if (!enableChallengeSync) return;
      
      console.log('Real-time challenge completion received:', event.detail);
      
      try {
        // Update user stats
        if (updateUser && event.detail.userStats) {
          updateUser({
            gameData: {
              ...user?.gameData,
              ...event.detail.userStats
            }
          });
        }

        // Call custom handler if provided
        if (onChallengeComplete) {
          onChallengeComplete(event.detail);
        }

        // Show success toast
        if (showToasts) {
          const message = `Challenge completed! ${event.detail.score}% score`;
          toast.success(message, {
            toastId: `challenge-completed-${event.detail.challengeId}`,
            autoClose: 3000
          });
        }
      } catch (error) {
        console.error(' Error handling challenge completion:', error);
      }
    };

    // Achievement Unlock Handler
    const handleAchievementUnlock = (event) => {
      if (!enableAchievementSync) return;
      
      console.log('Real-time achievement unlock received:', event.detail);
      
      try {
        const achievements = event.detail.achievements || [];
        
        // Update user achievements
        if (updateUser && achievements.length > 0) {
          const newAchievements = achievements.map(ach => ({
            achievementId: ach._id,
            unlockedAt: new Date(),
            isCompleted: true
          }));
          
          updateUser({
            achievements: [
              ...(user?.achievements || []),
              ...newAchievements
            ]
          });
        }

        // Call custom handler if provided
        if (onAchievementUnlock) {
          onAchievementUnlock(event.detail);
        }

        // Show achievement toasts
        if (showToasts) {
          achievements.forEach((achievement, index) => {
            setTimeout(() => {
              toast.success(`Achievement Unlocked: ${achievement.title}!`, {
                toastId: `achievement-${achievement._id}`,
                autoClose: 4000
              });
            }, index * 1000); // Stagger multiple achievement notifications
          });
        }
      } catch (error) {
        console.error(' Error handling achievement unlock:', error);
      }
    };

    // Level Up Handler
    const handleLevelUp = (event) => {
      if (!enableLevelSync) return;
      
      console.log('Real-time level up received:', event.detail);
      
      try {
        // Update user level
        if (updateUser) {
          updateUser({
            gameData: {
              ...user?.gameData,
              level: event.detail.newLevel,
              totalXP: event.detail.totalXP
            }
          });
        }

        // Call custom handler if provided
        if (onLevelUp) {
          onLevelUp(event.detail);
        }

        // Show level up toast
        if (showToasts) {
          toast.success(`Level Up! You reached Level ${event.detail.newLevel}!`, {
            toastId: `level-up-${event.detail.newLevel}`,
            autoClose: 5000
          });
        }
      } catch (error) {
        console.error(' Error handling level up:', error);
      }
    };

    // Rank Improvement Handler
    const handleRankImprovement = (event) => {
      if (!enableRankSync) return;
      
      console.log(' Real-time rank improvement received:', event.detail);
      
      try {
        // Update user rank
        if (updateUser) {
          updateUser({
            gameData: {
              ...user?.gameData,
              rank: event.detail.newRank
            }
          });
        }

        // Call custom handler if provided
        if (onRankImprove) {
          onRankImprove(event.detail);
        }

        // Show rank improvement toast
        if (showToasts) {
          const improvement = event.detail.rankImprovement || (event.detail.oldRank - event.detail.newRank);
          toast.success(` Rank improved! You're now #${event.detail.newRank} (+${improvement} positions)`, {
            toastId: `rank-improved-${event.detail.newRank}`,
            autoClose: 4000
          });
        }
      } catch (error) {
        console.error(' Error handling rank improvement:', error);
      }
    };

    // Add event listeners
    const listeners = [
      { event: 'edugame_xp_updated', handler: handleXPUpdate },
      { event: 'edugame_challenge_completed', handler: handleChallengeCompletion },
      { event: 'edugame_achievements_unlocked', handler: handleAchievementUnlock },
      { event: 'edugame_level_up', handler: handleLevelUp },
      { event: 'edugame_rank_improved', handler: handleRankImprovement }
    ];

    listeners.forEach(({ event, handler }) => {
      window.addEventListener(event, handler);
      listenersRef.current.push({ event, handler });
    });

    console.log(' Real-time sync listeners setup complete');

    // Cleanup function
    return () => {
      console.log(' Cleaning up real-time sync listeners');
      listenersRef.current.forEach(({ event, handler }) => {
        window.removeEventListener(event, handler);
      });
      listenersRef.current = [];
    };
  }, [
    enableXPSync, enableChallengeSync, enableAchievementSync, enableLevelSync, enableRankSync,
    showToasts, onXPUpdate, onChallengeComplete, onAchievementUnlock, onLevelUp, onRankImprove,
    updateUser, user
  ]);

  // Manual trigger functions
  const triggerXPUpdate = useCallback((xpData) => {
    const event = new CustomEvent('edugame_xp_updated', { detail: xpData });
    window.dispatchEvent(event);
  }, []);

  const triggerChallengeComplete = useCallback((challengeData) => {
    const event = new CustomEvent('edugame_challenge_completed', { detail: challengeData });
    window.dispatchEvent(event);
  }, []);

  const triggerAchievementUnlock = useCallback((achievementData) => {
    const event = new CustomEvent('edugame_achievements_unlocked', { detail: achievementData });
    window.dispatchEvent(event);
  }, []);

  const triggerLevelUp = useCallback((levelData) => {
    const event = new CustomEvent('edugame_level_up', { detail: levelData });
    window.dispatchEvent(event);
  }, []);

  const triggerRankImprove = useCallback((rankData) => {
    const event = new CustomEvent('edugame_rank_improved', { detail: rankData });
    window.dispatchEvent(event);
  }, []);

  return {
    // Trigger functions for manual events
    triggerXPUpdate,
    triggerChallengeComplete,
    triggerAchievementUnlock,
    triggerLevelUp,
    triggerRankImprove,
    
    // Status info
    isListening: listenersRef.current.length > 0,
    activeListeners: listenersRef.current.length
  };
};

// Specialized hook for challenge-specific real-time updates
export const useChallengeSync = (onChallengeComplete, onAchievementUnlock) => {
  return useRealTimeSync({
    enableXPSync: true,
    enableChallengeSync: true,
    enableAchievementSync: true,
    enableLevelSync: true,
    enableRankSync: true,
    showToasts: true,
    onChallengeComplete,
    onAchievementUnlock
  });
};

// Specialized hook for dashboard real-time updates
export const useDashboardSync = () => {
  return useRealTimeSync({
    enableXPSync: true,
    enableChallengeSync: true,
    enableAchievementSync: true,
    enableLevelSync: true,
    enableRankSync: true,
    showToasts: false
  });
};

// Specialized hook for achievement page real-time updates
export const useAchievementSync = (onNewAchievements) => {
  return useRealTimeSync({
    enableXPSync: false,
    enableChallengeSync: false,
    enableAchievementSync: true,
    enableLevelSync: false,
    enableRankSync: false,
    showToasts: false, // Achievement page handles its own notifications
    onAchievementUnlock: onNewAchievements
  });
};

export default useRealTimeSync;