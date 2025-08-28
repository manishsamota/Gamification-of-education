import React, { useEffect, useState } from 'react';
import { Zap, TrendingUp, Star } from 'lucide-react';
import { useXP } from '../../contexts/XPContext';

// It is real-time XP counter component
export const XPCounter = ({ className = "", showLabel = true, size = "md" }) => {
  const { currentXP, registerXPListener } = useXP();
  const [displayXP, setDisplayXP] = useState(currentXP);
  const [isAnimating, setIsAnimating] = useState(false);

  // Register for real-time XP updates
  useEffect(() => {
    const unregister = registerXPListener((xpData) => {
      if (xpData.type === 'xp_added' || xpData.type === 'xp_confirmed') {
        setIsAnimating(true);
        setDisplayXP(xpData.newTotal);
        
        // Reset animation after delay
        setTimeout(() => setIsAnimating(false), 600);
      }
    });

    return unregister;
  }, [registerXPListener]);

  // this function will update display when currentXP changes
  useEffect(() => {
    setDisplayXP(currentXP);
  }, [currentXP]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <div className={`flex items-center space-x-1 ${className} ${isAnimating ? 'animate-pulse' : ''}`}>
      <Zap className={`text-yellow-500 ${iconSizes[size]} ${isAnimating ? 'animate-bounce' : ''}`} />
      <span className={`font-semibold text-yellow-700 ${sizeClasses[size]} ${isAnimating ? 'text-green-600' : ''}`}>
        {displayXP.toLocaleString()}
        {showLabel && ' XP'}
      </span>
      {isAnimating && (
        <span className="text-green-600 text-xs animate-bounce">+</span>
      )}
    </div>
  );
};

// Real-time level display component
export const LevelDisplay = ({ className = "", showProgress = false, size = "md" }) => {
  const { currentLevel, getLevelProgress, registerXPListener } = useXP();
  const [displayLevel, setDisplayLevel] = useState(currentLevel);
  const [progress, setProgress] = useState(getLevelProgress());
  const [isLevelingUp, setIsLevelingUp] = useState(false);

  // Register for level updates
  useEffect(() => {
    const unregister = registerXPListener((xpData) => {
      if (xpData.type === 'xp_added' || xpData.type === 'xp_confirmed') {
        setDisplayLevel(xpData.newLevel);
        setProgress(((xpData.newTotal % 1000) / 1000) * 100);
        
        if (xpData.leveledUp) {
          setIsLevelingUp(true);
          setTimeout(() => setIsLevelingUp(false), 2000);
        }
      }
    });

    return unregister;
  }, [registerXPListener]);

  // Update display when level changes
  useEffect(() => {
    setDisplayLevel(currentLevel);
    setProgress(getLevelProgress());
  }, [currentLevel, getLevelProgress]);

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <div className={`${className}`}>
      <div className={`flex items-center space-x-1 ${isLevelingUp ? 'animate-bounce' : ''}`}>
        <TrendingUp className={`text-blue-500 ${iconSizes[size]} ${isLevelingUp ? 'animate-pulse' : ''}`} />
        <span className={`font-semibold text-blue-700 ${sizeClasses[size]} ${isLevelingUp ? 'text-purple-600' : ''}`}>
          Level {displayLevel}
        </span>
        {isLevelingUp && (
          <span className="text-purple-600 text-xs animate-bounce">🎉</span>
        )}
      </div>
      
      {showProgress && (
        <div className="mt-1">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-1000 ${isLevelingUp ? 'animate-pulse' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {Math.round(progress)}% to next level
          </p>
        </div>
      )}
    </div>
  );
};

// XP gain animation component
export const XPGainAnimation = ({ amount, onComplete }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete && onComplete();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div className="fixed top-20 right-4 z-50 pointer-events-none animate-bounce">
      <div className="bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2">
        <Zap className="w-4 h-4" />
        <span className="font-bold">+{amount} XP</span>
      </div>
    </div>
  );
};

// Weekly progress component with real-time updates
export const WeeklyProgressDisplay = ({ className = "" }) => {
  const { weeklyProgress, weeklyGoal, registerXPListener } = useXP();
  const [currentProgress, setCurrentProgress] = useState(weeklyProgress);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const unregister = registerXPListener((xpData) => {
      if (xpData.type === 'xp_added' || xpData.type === 'xp_confirmed') {
        setIsUpdating(true);
        setCurrentProgress(prev => prev + xpData.amount);
        
        setTimeout(() => setIsUpdating(false), 500);
      }
    });

    return unregister;
  }, [registerXPListener]);

  useEffect(() => {
    setCurrentProgress(weeklyProgress);
  }, [weeklyProgress]);

  const percentage = weeklyGoal > 0 ? (currentProgress / weeklyGoal) * 100 : 0;

  return (
    <div className={`${className}`}>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-gray-600">Weekly Progress</span>
        <span className={`font-semibold ${isUpdating ? 'text-green-600 animate-pulse' : 'text-gray-800'}`}>
          {currentProgress}/{weeklyGoal} XP
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`bg-gradient-to-r from-green-400 to-purple-500 h-2 rounded-full transition-all duration-1000 ${isUpdating ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {Math.round(percentage)}% complete
      </p>
    </div>
  );
};