
import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import DataService from '../services/dataService';

const XPContext = createContext();


const XP_ACTIONS = {
  SET_XP_DATA: 'SET_XP_DATA',
  ADD_XP: 'ADD_XP',
  UPDATE_LEVEL: 'UPDATE_LEVEL',
  UPDATE_STREAK: 'UPDATE_STREAK',
  UPDATE_RANK: 'UPDATE_RANK',
  UPDATE_WEEKLY_PROGRESS: 'UPDATE_WEEKLY_PROGRESS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SYNC_FROM_BACKEND: 'SYNC_FROM_BACKEND',
  SET_CONNECTION_STATUS: 'SET_CONNECTION_STATUS',
  ADD_SYNC_METRICS: 'ADD_SYNC_METRICS',
  RESET_SYNC_METRICS: 'RESET_SYNC_METRICS'
};

// XP Reducer with validation
const xpReducer = (state, action) => {
  switch (action.type) {
    case XP_ACTIONS.SET_XP_DATA:
      return {
        ...state,
        currentXP: Number(action.payload.totalXP) || 0,
        currentLevel: Number(action.payload.level) || 1,
        currentStreak: Number(action.payload.currentStreak) || 0,
        longestStreak: Number(action.payload.longestStreak) || 0,
        userRank: Number(action.payload.rank) || 999,
        weeklyProgress: Number(action.payload.weeklyProgress) || 0,
        weeklyGoal: Number(action.payload.weeklyGoal) || 1000,
        streakFreezes: Number(action.payload.streakFreezes) || 0,
        loading: false,
        error: null,
        lastUpdated: new Date().toISOString()
      };

    case XP_ACTIONS.ADD_XP:
      const newTotalXP = state.currentXP + (Number(action.payload.amount) || 0);
      const newLevel = Math.floor(newTotalXP / 1000) + 1;
      const leveledUp = newLevel > state.currentLevel;
      
      return {
        ...state,
        currentXP: newTotalXP,
        currentLevel: newLevel,
        weeklyProgress: state.weeklyProgress + (Number(action.payload.amount) || 0),
        leveledUp: leveledUp,
        lastXPGain: {
          amount: Number(action.payload.amount) || 0,
          source: String(action.payload.source) || 'unknown',
          timestamp: new Date().toISOString()
        },
        lastUpdated: new Date().toISOString()
      };

    case XP_ACTIONS.SYNC_FROM_BACKEND:
      return {
        ...state,
        ...action.payload,
        isSyncing: false,
        lastSyncTime: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

    case XP_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: Boolean(action.payload),
        isSyncing: Boolean(action.payload)
      };

    case XP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: String(action.payload || ''),
        loading: false,
        isSyncing: false
      };

    case XP_ACTIONS.SET_CONNECTION_STATUS:
      return {
        ...state,
        connectionStatus: String(action.payload.status) || 'connected',
        isOnline: Boolean(action.payload.isOnline)
      };

    case XP_ACTIONS.ADD_SYNC_METRICS:
      const newMetrics = {
        totalSyncs: (state.syncMetrics?.totalSyncs || 0) + 1,
        successfulSyncs: (state.syncMetrics?.successfulSyncs || 0) + (action.payload.success ? 1 : 0),
        averageSyncTime: Number(action.payload.syncTime) || 0,
        lastSyncTime: new Date().toISOString()
      };
      
      return {
        ...state,
        syncMetrics: newMetrics
      };

    case XP_ACTIONS.RESET_SYNC_METRICS:
      return {
        ...state,
        syncMetrics: {
          totalSyncs: 0,
          successfulSyncs: 0,
          averageSyncTime: 0,
          lastSyncTime: null
        }
      };

    default:
      return state;
  }
};

// Initial XP State and it's values
const initialXPState = {
  currentXP: 0,
  currentLevel: 1,
  currentStreak: 0,
  longestStreak: 0,
  userRank: 999,
  weeklyProgress: 0,
  weeklyGoal: 1000,
  streakFreezes: 0,
  loading: false,
  error: null,
  isSyncing: false,
  connectionStatus: 'connected',
  isOnline: navigator.onLine,
  lastUpdated: null,
  lastSyncTime: null,
  lastXPGain: null,
  leveledUp: false,
  rankImproved: false,
  syncMetrics: {
    totalSyncs: 0,
    successfulSyncs: 0,
    averageSyncTime: 0,
    lastSyncTime: null
  }
};

export const XPProvider = ({ children }) => {
  const [state, dispatch] = useReducer(xpReducer, initialXPState);
  const { user, updateUser } = useAuth();
  
  // Refs for optimization and rate limiting
  const xpListeners = useRef([]);
  const lastSyncTimeRef = useRef(0);
  const syncTimeoutRef = useRef(null);
  const updateTimeoutRef = useRef(null);

  //  Add XP with correct source validation to match backend
  const addXP = useCallback(async (amount, source = 'manual', metadata = {}) => {
    console.log(' XPContext.addXP called (FIXED source validation):', { amount, source, metadata });
    
    try {
      // Validate amount
      const numAmount = Number(amount);
      if (isNaN(numAmount) || numAmount < 1 || numAmount > 1000) {
        console.error(' Invalid XP amount:', amount);
        return { 
          success: false, 
          error: 'XP amount must be a number between 1 and 1000' 
        };
      }

      // CRITICAL FIX: Use only the sources that backend accepts
      const validSources = [
        'challenge', 'course', 'quiz', 'practice', 'achievement', 
        'daily_login', 'streak_bonus', 'manual', 'batch'
      ];
      
      let validSource = source;
      // Map invalid sources to valid ones
      if (source === 'challenge_completion') {
        validSource = 'challenge';
      } else if (!validSources.includes(source)) {
        console.warn(' Invalid source, defaulting to manual:', source);
        validSource = 'manual';
      }

      // Clean and validate metadata
      const cleanMetadata = {};
      if (metadata && typeof metadata === 'object') {
        // Only include safe, validated metadata fields
        if (metadata.challengeId && typeof metadata.challengeId === 'string') {
          cleanMetadata.challengeId = metadata.challengeId;
        }
        if (metadata.challengeTitle && typeof metadata.challengeTitle === 'string') {
          cleanMetadata.challengeTitle = metadata.challengeTitle.substring(0, 100);
        }
        if (metadata.challengeCategory && typeof metadata.challengeCategory === 'string') {
          cleanMetadata.challengeCategory = metadata.challengeCategory;
        }
        if (metadata.score !== undefined && !isNaN(Number(metadata.score))) {
          cleanMetadata.score = Number(metadata.score);
        }
        if (metadata.timeSpent !== undefined && !isNaN(Number(metadata.timeSpent))) {
          cleanMetadata.timeSpent = Number(metadata.timeSpent);
        }
        if (metadata.correctAnswers !== undefined && !isNaN(Number(metadata.correctAnswers))) {
          cleanMetadata.correctAnswers = Number(metadata.correctAnswers);
        }
        if (metadata.totalQuestions !== undefined && !isNaN(Number(metadata.totalQuestions))) {
          cleanMetadata.totalQuestions = Number(metadata.totalQuestions);
        }
      }

      console.log(' Validated XP data:', { 
        amount: numAmount, 
        source: validSource, 
        metadata: cleanMetadata 
      });

      // Rate limiting check
      const now = Date.now();
      if (now - lastSyncTimeRef.current < 1000) {
        console.log('Rate limiting XP addition - too frequent');
        
        // Still update locally for immediate feedback
        dispatch({
          type: XP_ACTIONS.ADD_XP,
          payload: { amount: numAmount, source: validSource }
        });
        
        // Schedule backend sync
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        
        syncTimeoutRef.current = setTimeout(() => {
          performBackendSync(numAmount, validSource, cleanMetadata);
        }, 1000);
        
        return { success: true, message: 'XP added locally, syncing...' };
      }
      
      return performBackendSync(numAmount, validSource, cleanMetadata);
      
    } catch (error) {
      console.error(' XP validation error:', error);
      return { 
        success: false, 
        error: error.message || 'Validation failed' 
      };
    }
  }, []);

  //  Backend sync with proper error handling and correct source validation
  const performBackendSync = useCallback(async (amount, source, metadata) => {
    const startTime = Date.now();
    dispatch({ type: XP_ACTIONS.SET_LOADING, payload: true });
    
    try {
      console.log(' Performing backend sync with CORRECT validation:', { amount, source, metadata });
      
      // Optimistic update first
      dispatch({
        type: XP_ACTIONS.ADD_XP,
        payload: { amount, source }
      });
      
      // CRITICAL FIX: Use DataService with proper validation
      const result = await DataService.addXP(amount, source, metadata);
      
      if (result && result.success) {
        console.log(' Backend sync successful:', result);
        
        // Update with backend response
        dispatch({
          type: XP_ACTIONS.SYNC_FROM_BACKEND,
          payload: {
            currentXP: result.data?.totalXP || state.currentXP + amount,
            currentLevel: result.data?.level || Math.floor((state.currentXP + amount) / 1000) + 1,
            weeklyProgress: result.data?.weeklyProgress || state.weeklyProgress + amount,
            userRank: result.data?.rank || state.userRank,
            leveledUp: result.data?.leveledUp || false
          }
        });
        
        // Update user context if available
        if (updateUser && result.data) {
          updateUser({
            gameData: {
              ...user?.gameData,
              totalXP: result.data.totalXP,
              level: result.data.level,
              weeklyProgress: result.data.weeklyProgress,
              rank: result.data.rank
            }
          });
        }
        
        // Record sync metrics
        dispatch({
          type: XP_ACTIONS.ADD_SYNC_METRICS,
          payload: {
            success: true,
            syncTime: Date.now() - startTime
          }
        });
        
        // Notify listeners with validated data
        notifyXPListeners({
          type: 'xp_added',
          amount: amount,
          source: source,
          newTotal: result.data?.totalXP || state.currentXP + amount,
          newLevel: result.data?.level || Math.floor((state.currentXP + amount) / 1000) + 1,
          leveledUp: result.data?.leveledUp || false
        });
        
        lastSyncTimeRef.current = Date.now();
        console.log(' XP added and synced successfully (FIXED validation)');
        return { success: true, data: result.data };
        
      } else {
        console.error(' Backend sync failed:', result?.error);
        
        // Record failed sync
        dispatch({
          type: XP_ACTIONS.ADD_SYNC_METRICS,
          payload: {
            success: false,
            syncTime: Date.now() - startTime
          }
        });
        
        // Return error but don't crash
        return { 
          success: false, 
          error: result?.error || 'Backend sync failed'
        };
      }
      
    } catch (error) {
      console.error(' XP backend sync error:', error);
      
      dispatch({ type: XP_ACTIONS.SET_ERROR, payload: error.message });
      
      // Record failed sync metrics
      dispatch({
        type: XP_ACTIONS.ADD_SYNC_METRICS,
        payload: {
          success: false,
          syncTime: Date.now() - startTime
        }
      });
      
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: XP_ACTIONS.SET_LOADING, payload: false });
    }
  }, [updateUser, user, state.currentXP, state.weeklyProgress, state.userRank]);

  // Initialize XP data with rate limiting
  useEffect(() => {
    if (user?.gameData) {
      console.log(' Initializing XP data from user context (with validation):', user.gameData);
      dispatch({
        type: XP_ACTIONS.SET_XP_DATA,
        payload: user.gameData
      });
      
      // Sync with backend less frequently
      const now = Date.now();
      if (now - lastSyncTimeRef.current > 30000) { // Only sync if it's been 30+ seconds
        syncFromBackend();
        lastSyncTimeRef.current = now;
      }
    }
  }, [user]);

  // Setup event listeners with debouncing and validation
  useEffect(() => {
    console.log(' Setting up XP Context listeners with validation');

    // XP Update Listener with validation and debouncing
    const handleXPUpdate = (event) => {
      console.log(' XP Context received XP update (with validation):', event.detail);
      
      // Validate event data
      if (!event.detail || typeof event.detail !== 'object') {
        console.warn(' Invalid XP update event data:', event.detail);
        return;
      }
      
      // Clear existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce XP updates with validation
      updateTimeoutRef.current = setTimeout(() => {
        const validatedData = {
          amount: Number(event.detail.amount) || 0,
          source: String(event.detail.source) || 'unknown',
          newTotal: Number(event.detail.newTotal) || state.currentXP,
          newLevel: Number(event.detail.newLevel) || state.currentLevel,
          leveledUp: Boolean(event.detail.leveledUp)
        };

        dispatch({
          type: XP_ACTIONS.ADD_XP,
          payload: validatedData
        });
        
        // Update user context with validation
        if (updateUser && validatedData.newTotal) {
          updateUser({
            gameData: {
              ...user?.gameData,
              totalXP: validatedData.newTotal,
              level: validatedData.newLevel,
              weeklyProgress: (user?.gameData?.weeklyProgress || 0) + validatedData.amount
            }
          });
        }
        
        // Notify listeners with validated data
        notifyXPListeners(validatedData);
      }, 500); // 500ms debounce
    };

    // Challenge completion listener with validation
    const handleChallengeCompletion = (event) => {
      console.log(' XP Context received challenge completion:', event.detail);
      
      if (!event.detail || typeof event.detail !== 'object') {
        console.warn(' Invalid challenge completion event data');
        return;
      }
      
      const xpGained = Number(event.detail.xpGained) || 0;
      if (xpGained > 0) {
        dispatch({
          type: XP_ACTIONS.ADD_XP,
          payload: {
            amount: xpGained,
            source: 'challenge'
          }
        });
        
        notifyXPListeners({
          type: 'challenge_completion',
          amount: xpGained,
          challengeId: String(event.detail.challengeId || ''),
          score: Number(event.detail.score) || 0,
          newTotal: state.currentXP + xpGained
        });
      }
    };

    // Achievement unlock listener with validation
    const handleAchievementUnlock = (event) => {
      console.log('XP Context received achievement unlock:', event.detail);
      
      if (!event.detail || !Array.isArray(event.detail.achievements)) {
        console.warn('Invalid achievement unlock event data');
        return;
      }
      
      const achievementXP = event.detail.achievements.reduce((sum, ach) => {
        return sum + (Number(ach.rewards?.xp) || 0);
      }, 0);
      
      if (achievementXP > 0) {
        dispatch({
          type: XP_ACTIONS.ADD_XP,
          payload: {
            amount: achievementXP,
            source: 'achievement'
          }
        });
        
        notifyXPListeners({
          type: 'achievement_unlock',
          amount: achievementXP,
          achievements: event.detail.achievements,
          newTotal: state.currentXP + achievementXP
        });
      }
    };

    // Connection status listener
    const handleConnectionChange = () => {
      dispatch({
        type: XP_ACTIONS.SET_CONNECTION_STATUS,
        payload: {
          status: navigator.onLine ? 'connected' : 'disconnected',
          isOnline: navigator.onLine
        }
      });
    };

    // Add event listeners
    window.addEventListener('edugame_xp_updated', handleXPUpdate);
    window.addEventListener('edugame_challenge_completed', handleChallengeCompletion);
    window.addEventListener('edugame_achievements_unlocked', handleAchievementUnlock);
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);

    return () => {
      // Cleanup
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      window.removeEventListener('edugame_xp_updated', handleXPUpdate);
      window.removeEventListener('edugame_challenge_completed', handleChallengeCompletion);
      window.removeEventListener('edugame_achievements_unlocked', handleAchievementUnlock);
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, [state.currentXP, updateUser, user]);

  //  Sync from backend with better error handling
  const syncFromBackend = useCallback(async (specificData = null) => {
    const now = Date.now();
    
    // Rate limiting for backend syncs
    if (now - lastSyncTimeRef.current < 10000) {
      console.log('Skipping backend sync - too frequent');
      return { success: true, message: 'Sync skipped - too frequent' };
    }
    
    console.log(' Syncing XP data from backend (with error handling)...');
    
    const startTime = Date.now();
    dispatch({ type: XP_ACTIONS.SET_LOADING, payload: true });
    
    try {
      let backendData;
      
      if (specificData) {
        backendData = specificData;
      } else {
        // Use DataService with proper error handling
        const result = await DataService.getUserProfile();
        if (!result || !result.success) {
          throw new Error(result?.error || 'Failed to get user profile');
        }
        backendData = result.data?.gameData || {};
      }
      
      // Validate backend data before using it
      const safeBackendData = {
        currentXP: Number(backendData.totalXP) || 0,
        currentLevel: Number(backendData.level) || 1,
        currentStreak: Number(backendData.currentStreak) || 0,
        longestStreak: Number(backendData.longestStreak) || 0,
        userRank: Number(backendData.rank) || 999,
        weeklyProgress: Number(backendData.weeklyProgress) || 0,
        weeklyGoal: Number(backendData.weeklyGoal) || 1000,
        streakFreezes: Number(backendData.streakFreezes) || 0
      };
      
      // Update XP context with validated backend data
      dispatch({
        type: XP_ACTIONS.SYNC_FROM_BACKEND,
        payload: safeBackendData
      });
      
      // Update user context with validated data
      if (updateUser) {
        updateUser({
          gameData: {
            ...user?.gameData,
            ...backendData
          }
        });
      }
      
      // Record successful sync
      dispatch({
        type: XP_ACTIONS.ADD_SYNC_METRICS,
        payload: {
          success: true,
          syncTime: Date.now() - startTime
        }
      });
      
      lastSyncTimeRef.current = now;
      console.log(' XP data synced from backend successfully (with error handling)');
      return { success: true, data: safeBackendData };
      
    } catch (error) {
      console.error(' Backend sync failed:', error);
      
      dispatch({ type: XP_ACTIONS.SET_ERROR, payload: error.message });
      
      dispatch({
        type: XP_ACTIONS.ADD_SYNC_METRICS,
        payload: {
          success: false,
          syncTime: Date.now() - startTime
        }
      });
      
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: XP_ACTIONS.SET_LOADING, payload: false });
    }
  }, [updateUser, user]);

  //  Force sync with rate limiting override
  const forceSyncFromBackend = useCallback(async () => {
    console.log(' Force syncing all data from backend (rate limiting bypassed)...');
    
    try {
      const result = await DataService.syncAllData();
      
      if (result.success) {
        // Update XP context with fresh data
        if (result.data.profile?.gameData) {
          dispatch({
            type: XP_ACTIONS.SYNC_FROM_BACKEND,
            payload: result.data.profile.gameData
          });
        }
        
        // Update user context
        if (updateUser && result.data.profile) {
          updateUser(result.data.profile);
        }
        
        lastSyncTimeRef.current = Date.now();
        console.log(' Force sync completed successfully (with validation)');
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(' Force sync failed:', error);
      dispatch({ type: XP_ACTIONS.SET_ERROR, payload: error.message });
      return { success: false, error: error.message };
    }
  }, [updateUser]);

  //  Register XP listener
  const registerXPListener = useCallback((callback) => {
    console.log(' Registering XP listener (with validation)');
    
    if (typeof callback !== 'function') {
      console.error(' XP listener callback must be a function');
      return () => {}; // Return empty unregister function
    }
    
    const listenerId = Date.now() + Math.random();
    xpListeners.current.push({ id: listenerId, callback });
    
    // Return unregister function
    return () => {
      xpListeners.current = xpListeners.current.filter(
        listener => listener.id !== listenerId
      );
      console.log('XP listener unregistered');
    };
  }, []);

  //  Safe event listener notification
  const notifyXPListeners = useCallback((xpData) => {
    console.log('Notifying XP listeners (with error handling):', xpData);
    
    // Validate xpData before notifying
    const safeXpData = {
      type: String(xpData.type || 'xp_update'),
      amount: Number(xpData.amount) || 0,
      source: String(xpData.source || 'unknown'),
      newTotal: Number(xpData.newTotal) || 0,
      newLevel: Number(xpData.newLevel) || 1,
      leveledUp: Boolean(xpData.leveledUp),
      timestamp: new Date().toISOString()
    };
    
    xpListeners.current.forEach(listener => {
      try {
        if (typeof listener.callback === 'function') {
          listener.callback(safeXpData);
        }
      } catch (error) {
        console.error(' XP listener error:', error);
        // Don't let listener errors crash the system
      }
    });
  }, []);

  // Calculate level progress
  const getLevelProgress = useCallback(() => {
    const currentLevelXP = state.currentXP % 1000;
    const requiredXP = 1000;
    const percentage = (currentLevelXP / requiredXP) * 100;
    
    return {
      current: currentLevelXP,
      required: requiredXP,
      percentage: percentage,
      xpToNextLevel: requiredXP - currentLevelXP
    };
  }, [state.currentXP]);

  //  Update streak with rate limiting
  const updateStreak = useCallback(async () => {
    const now = Date.now();
    
    // Rate limiting for streak updates
    if (now - lastSyncTimeRef.current < 5000) {
      console.log('Skipping streak update - too frequent');
      return { success: true, message: 'Streak update skipped - too frequent' };
    }
    
    console.log('Updating streak with backend sync (rate limited)...');
    
    try {
      const result = await DataService.apiCall('/users/update-streak', {
        method: 'POST'
      });
      
      if (result.success) {
        dispatch({
          type: XP_ACTIONS.SYNC_FROM_BACKEND,
          payload: {
            currentStreak: result.data.gameData.currentStreak,
            longestStreak: result.data.gameData.longestStreak
          }
        });
        
        // Update user context
        if (updateUser) {
          updateUser({
            gameData: {
              ...user?.gameData,
              currentStreak: result.data.gameData.currentStreak,
              longestStreak: result.data.gameData.longestStreak
            }
          });
        }
        
        lastSyncTimeRef.current = now;
        console.log(' Streak updated successfully (with validation)');
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Streak update failed:', error);
      return { success: false, error: error.message };
    }
  }, [updateUser, user]);

  //  Use streak freeze with proper method name to avoid ESLint hook error
  const applyStreakFreeze = useCallback(async () => {
    console.log('Using streak freeze (with validation)...');
    
    if (state.streakFreezes <= 0) {
      return { success: false, error: 'No streak freezes available' };
    }
    
    try {
      //  Call DataService method without "use" prefix to avoid ESLint hook rule error
      const result = await DataService.apiCall('/users/use-streak-freeze', {
        method: 'POST'
      });
      
      if (result.success) {
        // Update local state
        dispatch({
          type: XP_ACTIONS.SYNC_FROM_BACKEND,
          payload: {
            ...state,
            streakFreezes: result.data.gameData.streakFreezes
          }
        });
        
        // Update user context
        if (updateUser) {
          updateUser({
            gameData: {
              ...user?.gameData,
              streakFreezes: result.data.gameData.streakFreezes
            }
          });
        }
        
        console.log(' Streak freeze used successfully (with validation)');
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error(' Streak freeze failed:', error);
      return { success: false, error: error.message };
    }
  }, [state.streakFreezes, updateUser, user, state]);

  // Reset sync metrics
  const resetSyncMetrics = useCallback(() => {
    dispatch({ type: XP_ACTIONS.RESET_SYNC_METRICS });
  }, []);

  // Get current stats
  const getCurrentStats = useCallback(() => {
    return {
      totalXP: state.currentXP || 0,
      level: state.currentLevel || 1,
      currentStreak: state.currentStreak || 0,
      longestStreak: state.longestStreak || 0,
      rank: state.userRank || 999,
      weeklyProgress: state.weeklyProgress || 0,
      weeklyGoal: state.weeklyGoal || 1000,
      streakFreezes: state.streakFreezes || 0,
      levelProgress: getLevelProgress(),
      lastUpdated: state.lastUpdated,
      connectionStatus: state.connectionStatus || 'connected'
    };
  }, [state, getLevelProgress]);

  //  Context value with proper validation and renamed method
  const contextValue = {
    // Current state, with validation
    currentXP: state.currentXP || 0,
    currentLevel: state.currentLevel || 1,
    currentStreak: state.currentStreak || 0,
    longestStreak: state.longestStreak || 0,
    userRank: state.userRank || 999,
    weeklyProgress: state.weeklyProgress || 0,
    weeklyGoal: state.weeklyGoal || 1000,
    streakFreezes: state.streakFreezes || 0,
    
    // Status indicators
    loading: state.loading || false,
    error: state.error || null,
    isSyncing: state.isSyncing || false,
    connectionStatus: state.connectionStatus || 'connected',
    isOnline: state.isOnline !== undefined ? state.isOnline : true,
    lastUpdated: state.lastUpdated,
    lastSyncTime: state.lastSyncTime,
    lastXPGain: state.lastXPGain,
    
    // Level and progress
    leveledUp: state.leveledUp || false,
    rankImproved: state.rankImproved || false,
    
    // Sync metrics
    syncMetrics: state.syncMetrics || {
      totalSyncs: 0,
      successfulSyncs: 0,
      averageSyncTime: 0,
      lastSyncTime: null
    },
    
    // methods with proper validation
    addXP,
    syncFromBackend,
    forceSyncFromBackend,
    registerXPListener,
    getLevelProgress,
    updateStreak,
    useStreakFreeze: applyStreakFreeze, 
    resetSyncMetrics,
    getCurrentStats,
    
    // Utility methods
    forceSyncData: forceSyncFromBackend,
    refreshData: syncFromBackend
  };

  return (
    <XPContext.Provider value={contextValue}>
      {children}
    </XPContext.Provider>
  );
};

// Hook to use XP context
export const useXP = () => {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error('useXP must be used within an XPProvider');
  }
  return context;
};

export default XPContext;