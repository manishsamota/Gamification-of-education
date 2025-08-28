import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { 
  User,  Target, Activity, Users, 
  Calendar, Flame, Award, BookOpen, 
  ChevronRight, LogOut,  Bell
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../contexts/XPContext'; 


import { XPCounter, LevelDisplay,  } from '../Common/XPDisplay';

// Import page components
import DashboardHome from './DashboardHome';
import ActivityGraph from './ActivityGraph';
import Challenges from './Challenges';
import Achievements from './Achievements';
import Leaderboard from './Leaderboard';
import Profile from './Profile';
import CelebrationModal from '../Common/CelebrationModal';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const {  registerXPListener } = useXP(); 
  const location = useLocation();
  const navigate = useNavigate();
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState(null);

  // Here it is XP change listener for dashboard-wide updates
  useEffect(() => {
    const unregister = registerXPListener((xpData) => {
      console.log(' Dashboard received XP update:', xpData);
      
      // Could trigger additional dashboard-wide effects here
      if (xpData.leveledUp) {
        console.log(' Dashboard detected level up!');
      }
    });

    return unregister;
  }, [registerXPListener]);

  const tabs = [
    { id: 'home', label: 'Dashboard', icon: Activity, path: '/dashboard' },
    { id: 'activity', label: 'Activity Graph', icon: Calendar, path: '/dashboard/activity' },
    { id: 'challenges', label: 'Challenges', icon: Target, path: '/dashboard/challenges' },
    { id: 'achievements', label: 'Achievements', icon: Award, path: '/dashboard/achievements' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Users, path: '/dashboard/leaderboard' },
    { id: 'profile', label: 'Profile', icon: User, path: '/dashboard/profile' }
  ];

  const getActiveTab = () => {
    const path = location.pathname;
    const tab = tabs.find(t => t.path === path);
    return tab ? tab.id : 'home';
  };

  const handleTabClick = (tab) => {
    navigate(tab.path);
  };

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const showCelebrationAnimation = (data) => {
    setCelebrationData(data);
    setShowCelebration(true);
    setTimeout(() => setShowCelebration(false), 3000);
  };

  const getPageTitle = () => {
    const activeTab = getActiveTab();
    const tab = tabs.find(t => t.id === activeTab);
    return tab ? tab.label : 'Dashboard';
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-white flex">
      {/* Celebration Modal */}
      {showCelebration && celebrationData && (
        <CelebrationModal data={celebrationData} onClose={() => setShowCelebration(false)} />
      )}

      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg min-h-screen border-r border-gray-100">
        <div className="p-6">
          {/* Logo */}
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-r from-green-400 to-purple-500 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold text-black">EduGame</h1>
          </div>

          {/* User Info with Real-time XP Updates */}
          <div className="bg-gradient-to-r from-green-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="flex items-center space-x-3">
              <img 
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                alt={user.name} 
                className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-black truncate">{user.name}</p>
                {/* Real-time level display */}
                <LevelDisplay size="sm" className="text-xs" />
              </div>
            </div>
            <div className="mt-3">
              {/* Real-time XP progress */}
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>XP</span>
                <XPCounter showLabel={false} size="sm" />
              </div>
              <LevelDisplay showProgress={true} size="sm" />
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = getActiveTab() === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-gradient-to-r from-green-400 to-purple-500 text-white shadow-lg' 
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`} />
                  <span className="font-medium">{tab.label}</span>
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto text-white" />}
                </button>
              );
            })}
          </nav>

          {/* Logout Button */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all group"
            >
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-500" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Header with Real-time XP Display */}
        <header className="bg-white border-b border-gray-100 px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-black">{getPageTitle()}</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {/* Real-time Streak Counter */}
              <div className="flex items-center space-x-2 bg-orange-50 rounded-full px-4 py-2 border border-orange-200">
                <Flame className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-orange-700">{user.gameData?.currentStreak || 0}</span>
                <span className="text-sm text-orange-600">day streak</span>
              </div>
              
              {/* Real-time XP Counter */}
              <div className="bg-yellow-50 rounded-full px-4 py-2 border border-yellow-200">
                <XPCounter />
              </div>

              {/* Real-time Level Display */}
              <div className="bg-blue-50 rounded-full px-4 py-2 border border-blue-200">
                <LevelDisplay />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>

              {/* User Avatar */}
              <img 
                src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} 
                alt={user.name} 
                className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
                onClick={() => navigate('/dashboard/profile')}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 bg-gray-50">
          <div className="max-w-7xl mx-auto">
            <Routes>
              <Route path="/" element={<DashboardHome onCelebration={showCelebrationAnimation} />} />
              <Route path="/activity" element={<ActivityGraph />} />
              <Route path="/challenges" element={<Challenges onCelebration={showCelebrationAnimation} />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;