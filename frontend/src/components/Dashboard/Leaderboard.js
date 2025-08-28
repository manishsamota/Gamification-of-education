import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Crown, Medal, Award, Flame, Zap, TrendingUp, RefreshCw } from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import DataService from '../../services/dataService';
import { toast } from 'react-toastify';

const Leaderboard = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('xp');
  const [userRank, setUserRank] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);

  const leaderboardTypes = [
    { id: 'xp', label: 'Total XP', icon: Zap },
    { id: 'streak', label: 'Current Streak', icon: Flame },
    { id: 'level', label: 'Level', icon: TrendingUp }
  ];

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedType]);

  // Auto-refresh after every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchLeaderboard(true); // Silent refresh
      }
    }, 120000); // 2 minutes

    return () => clearInterval(interval);
  }, [selectedType]);

  const fetchLeaderboard = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      
      console.log(`Fetching ${selectedType} leaderboard from database...`);
      
      const result = await DataService.getLeaderboard(selectedType, 50);
      
      if (result.success) {
        console.log(` Leaderboard data received:`, result.data);
        
        setLeaderboard(result.data.leaderboard || []);
        setUserRank(result.data.userRank || 999);
        setLastFetchTime(new Date().toISOString());
        
        // Logs
        console.log(` Leaderboard stats:`, {
          totalUsers: result.data.leaderboard?.length || 0,
          userRank: result.data.userRank,
          topUser: result.data.leaderboard?.[0]?.name,
          type: selectedType
        });
      } else {
        console.error('Failed to fetch leaderboard:', result.error);
        toast.error(`Failed to load ${selectedType} leaderboard`);
        
        // I have set empty array instead of dummy data
        setLeaderboard([]);
        setUserRank(999);
      }
    } catch (error) {
      console.error(' Error fetching leaderboard:', error);
      toast.error('Failed to load leaderboard data');
      
      // Set empty array instead of dummy data
      setLeaderboard([]);
      setUserRank(999);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLeaderboard();
    setIsRefreshing(false);
    toast.success('Leaderboard refreshed! 🔄');
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-600" />;
    return null;
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return 'bg-yellow-500 text-white';
    if (rank === 2) return 'bg-gray-400 text-white';
    if (rank === 3) return 'bg-orange-600 text-white';
    return 'bg-gray-200 text-gray-700';
  };

  const getStatValue = (player, type) => {
    if (!player) return '0';
    
    switch (type) {
      case 'xp': 
        return (player.xp || player.totalXP || 0).toLocaleString();
      case 'streak': 
        return `${player.streak || player.currentStreak || 0} days`;
      case 'level': 
        return `Level ${player.level || 1}`;
      default: 
        return '0';
    }
  };

  // Here it will show loading state
  if (loading) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-black">Leaderboard</h2>
            <p className="text-gray-600">Loading real-time rankings...</p>
          </div>
        </div>
        
        {/* Loading skeleton */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Show empty state if there is not data
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-black">Leaderboard</h2>
            <p className="text-gray-600">See how you rank against other learners</p>
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

        <AnimatedCard delay={0}>
          <div className="text-center py-12">
            <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">No leaderboard data available</h3>
            <p className="text-gray-400 mb-4">
              {selectedType === 'xp' ? 'No users with XP found' :
               selectedType === 'streak' ? 'No users with streaks found' :
               'No users with levels found'}
            </p>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
            >
              Try Refreshing
            </button>
          </div>
        </AnimatedCard>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Leaderboard</h2>
          <p className="text-gray-600">
            See how you rank against other learners
            {lastFetchTime && (
              <span className="text-xs text-gray-400 ml-2">
                • Updated {new Date(lastFetchTime).toLocaleTimeString()}
              </span>
            )}
          </p>
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

      {/* Leaderboard Type Selector */}
      <div className="flex flex-wrap gap-2">
        {leaderboardTypes.map(type => {
          const IconComponent = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                selectedType === type.id
                  ? 'bg-gradient-to-r from-green-400 to-purple-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{type.label}</span>
            </button>
          );
        })}
      </div>

      {/* User's Current Rank */}
      <AnimatedCard delay={0} className="bg-gradient-to-r from-green-50 to-purple-50 border border-purple-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${getRankBadge(userRank)}`}>
              {userRank <= 3 ? getRankIcon(userRank) : userRank}
            </div>
            <div>
              <p className="font-semibold text-black">Your Rank</p>
              <p className="text-sm text-gray-600">
                {selectedType === 'xp' ? `${(user?.gameData?.totalXP || 0).toLocaleString()} XP` :
                 selectedType === 'streak' ? `${user?.gameData?.currentStreak || 0} days` :
                 `Level ${user?.gameData?.level || 1}`} • #{userRank}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold gradient-text">#{userRank}</p>
            <p className="text-sm text-gray-600">
              {userRank <= 10 ? 'Top 10!' : userRank <= 100 ? 'Top 100!' : 'Keep climbing!'}
            </p>
          </div>
        </div>
      </AnimatedCard>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-4">
        {leaderboard.slice(0, 3).map((player, index) => {
          const actualRank = index + 1;
          const isCurrentUser = player.id === user?.id;
          
          return (
            <AnimatedCard 
              key={player.id} 
              delay={(index + 1) * 100}
              className={`text-center ${
                actualRank === 1 ? 'transform scale-105 border-2 border-yellow-300 bg-gradient-to-b from-yellow-50 to-white' :
                actualRank === 2 ? 'transform scale-100 border-2 border-gray-300 bg-gradient-to-b from-gray-50 to-white' :
                'border-2 border-orange-300 bg-gradient-to-b from-orange-50 to-white'
              } ${isCurrentUser ? 'ring-2 ring-purple-300' : ''}`}
            >
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-bold text-white ${getRankBadge(actualRank)}`}>
                {getRankIcon(actualRank) || actualRank}
              </div>
              <img 
                src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                alt={player.name}
                className="w-12 h-12 rounded-full mx-auto mb-2 border-2 border-white shadow-sm"
              />
              <h3 className="font-bold text-black text-sm">{player.name}</h3>
              <p className="text-xs text-gray-600 mb-2">{getStatValue(player, selectedType)}</p>
              {actualRank === 1 && <div className="text-yellow-500 text-xs">👑 Champion</div>}
              {isCurrentUser && <div className="text-purple-600 text-xs font-medium">You!</div>}
            </AnimatedCard>
          );
        })}
      </div>

      {/* Full Leaderboard */}
      <AnimatedCard delay={400}>
        <h3 className="text-xl font-bold text-black mb-4">
          Full Rankings ({leaderboard.length} players)
        </h3>
        <div className="space-y-2">
          {leaderboard.map((player, index) => {
            const rank = index + 1;
            const isCurrentUser = player.id === user?.id;
            
            return (
              <div 
                key={player.id}
                className={`flex items-center space-x-4 p-4 rounded-lg transition-all hover:bg-gray-50 ${
                  isCurrentUser ? 'bg-gradient-to-r from-green-50 to-purple-50 border-2 border-purple-200' : 'border border-gray-100'
                }`}
              >
                {/* Rank */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getRankBadge(rank)}`}>
                  {rank <= 3 ? getRankIcon(rank) : rank}
                </div>

                {/* Avatar */}
                <img 
                  src={player.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                  alt={player.name}
                  className="w-10 h-10 rounded-full border-2 border-gray-200"
                />

                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-black">{player.name}</p>
                    {isCurrentUser && (
                      <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">You</span>
                    )}
                    {rank <= 3 && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Top 3</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Level {player.level || 1}</p>
                </div>

                {/* Stats */}
                <div className="text-right">
                  <p className="font-semibold text-black">{getStatValue(player, selectedType)}</p>
                  {selectedType !== 'streak' && (
                    <div className="flex items-center space-x-1 justify-end">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-xs text-gray-600">{player.streak || player.currentStreak || 0} day streak</span>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="flex items-center space-x-2">
                  {rank === 1 && <Crown className="w-4 h-4 text-yellow-500" />}
                  {rank === 2 && <Medal className="w-4 h-4 text-gray-400" />}
                  {rank === 3 && <Award className="w-4 h-4 text-orange-600" />}
                  {rank <= 10 && rank > 3 && (
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Database Status Info */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Data source: Database</span>
            <span>
              Last updated: {lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString() : 'Never'}
            </span>
          </div>
        </div>
      </AnimatedCard>

      {/* Leaderboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard delay={500} className="text-center">
          <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Crown className="w-6 h-6 text-yellow-600" />
          </div>
          <h4 className="font-semibold text-black mb-1">Top Performer</h4>
          <p className="text-2xl font-bold text-black">{leaderboard[0]?.name || 'No data'}</p>
          <p className="text-sm text-gray-600">{getStatValue(leaderboard[0], selectedType)}</p>
        </AnimatedCard>

        <AnimatedCard delay={600} className="text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <h4 className="font-semibold text-black mb-1">Your Progress</h4>
          <p className="text-2xl font-bold text-black">#{userRank}</p>
          <p className="text-sm text-gray-600">
            {userRank === 1 ? 'Leading!' : userRank > leaderboard.length ? 'Unranked' : `${userRank - 1} to beat`}
          </p>
        </AnimatedCard>

        <AnimatedCard delay={700} className="text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Award className="w-6 h-6 text-purple-600" />
          </div>
          <h4 className="font-semibold text-black mb-1">Competition</h4>
          <p className="text-2xl font-bold text-black">{leaderboard.length}</p>
          <p className="text-sm text-gray-600">Active learners</p>
        </AnimatedCard>
      </div>
    </div>
  );
};

export default Leaderboard;