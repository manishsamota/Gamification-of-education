import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../contexts/XPContext';
import { 
  Calendar, Flame, TrendingUp, RefreshCw, ChevronLeft, ChevronRight,
  Clock, Star, Target, Award, Activity as ActivityIcon
} from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import DataService from '../../services/dataService';
import { toast } from 'react-toastify';

// It is Real Calendar Component with Streak Freeze Support
const ActivityCalendar = ({ activities = [], onDayClick }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Month names for navigation
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar data for the selected month
  const getCalendarData = () => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
    const startDate = new Date(firstDay);
    
    // Start from Sunday of the week containing the first day
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    const calendarDays = [];
    const currentDay = new Date(startDate);
    
    // Generate 6 weeks (42 days) to ensure full calendar grid
    for (let i = 0; i < 42; i++) {
      const dateStr = currentDay.toISOString().split('T')[0];
      const dayActivity = activities.find(a => a.date === dateStr);
      
      calendarDays.push({
        date: new Date(currentDay),
        dateStr,
        dayNumber: currentDay.getDate(),
        isCurrentMonth: currentDay.getMonth() === selectedMonth,
        isToday: currentDay.toDateString() === new Date().toDateString(),
        isPast: currentDay < new Date(new Date().toDateString()),
        isFuture: currentDay > new Date(new Date().toDateString()),
        activity: dayActivity || null,
        activityCount: dayActivity ? dayActivity.count : 0,
        xp: dayActivity ? dayActivity.xp : 0
      });
      
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return calendarDays;
  };

  const calendarDays = getCalendarData();

  // Get activity intensity color
  const getActivityColor = (day) => {
    const count = day.activityCount;
    
    // Special styling for today and future days that can use streak freeze
    if ((day.isToday || day.isFuture) && day.isCurrentMonth && count === 0) {
      return 'bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-300';
    }
    
    if (count === 0) return 'bg-gray-100 hover:bg-gray-200';
    if (count <= 2) return 'bg-green-200 hover:bg-green-300';
    if (count <= 4) return 'bg-green-400 hover:bg-green-500';
    if (count <= 6) return 'bg-green-600 hover:bg-green-700';
    return 'bg-green-800 hover:bg-green-900';
  };

  const getTextColor = (count) => {
    if (count === 0) return 'text-gray-600';
    if (count <= 2) return 'text-green-800';
    return 'text-white';
  };

  // Navigation functions
  const goToPreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedMonth(today.getMonth());
    setSelectedYear(today.getFullYear());
  };

  return (
    <div className="space-y-4">
      {/* Month Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <h4 className="text-lg font-bold text-black">
            {monthNames[selectedMonth]} {selectedYear}
          </h4>
          
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
        
        <button
          onClick={goToToday}
          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        >
          Today
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Days of Week Header */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-semibold text-gray-600 bg-gray-50">
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days Grid */}
        <div className="grid grid-cols-7">
          {calendarDays.map((day, index) => (
            <div
              key={index}
              onClick={() => onDayClick?.(day)}
              className={`
                relative h-16 border-b border-r border-gray-100 cursor-pointer transition-all duration-200
                ${getActivityColor(day)}
                ${!day.isCurrentMonth ? 'opacity-40' : ''}
                ${day.isToday ? 'ring-2 ring-blue-500' : ''}
              `}
            >
              {/* Date Number */}
              <div className={`absolute top-1 left-2 text-sm font-medium ${getTextColor(day.activityCount)}`}>
                {day.dayNumber}
              </div>
              
              {/* Today Indicator */}
              {day.isToday && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full"></div>
              )}
              
              {/* Freeze Available Indicator for Present/Future Days */}
              {(day.isToday || day.isFuture) && day.isCurrentMonth && day.activityCount === 0 && (
                <div className="absolute top-1 right-1">
                  <span className="text-xs text-blue-500">❄️</span>
                </div>
              )}
              
              {/* Activity Indicators */}
              <div className="absolute bottom-1 left-1 right-1">
                {day.activity && (
                  <div className="space-y-1">
                    {/* XP Badge */}
                    {day.xp > 0 && (
                      <div className={`inline-flex items-center px-1 py-0.5 rounded text-xs font-medium ${
                        day.activityCount <= 2 ? 'bg-green-100 text-green-800' : 'bg-white bg-opacity-90 text-gray-900'
                      }`}>
                        <Star className="w-2 h-2 mr-1" />
                        {day.xp}
                      </div>
                    )}
                    
                    {/* Activity Dots */}
                    <div className="flex space-x-0.5">
                      {[...Array(Math.min(day.activityCount, 3))].map((_, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            day.activityCount <= 2 ? 'bg-green-600' : 'bg-white'
                          }`}
                        />
                      ))}
                      {day.activityCount > 3 && (
                        <span className={`text-xs font-bold ${getTextColor(day.activityCount)}`}>
                          +
                        </span>
                      )}
                    </div>
                  </div>
                )}
                
                {/* Show "Can Freeze" hint for today/future with no activity */}
                {(day.isToday || day.isFuture) && day.isCurrentMonth && day.activityCount === 0 && (
                  <div className="text-xs text-blue-500 font-medium">
                    {day.isToday ? 'Freeze?' : 'Plan'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* It is Legend with Freeze Info */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>Less</span>
        <div className="flex space-x-1">
          <div className="w-3 h-3 bg-gray-100 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-200 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-400 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-600 rounded-sm"></div>
          <div className="w-3 h-3 bg-green-800 rounded-sm"></div>
        </div>
        <span>More</span>
      </div>
      
      {/* Freeze Usage Hint */}
      <div className="text-center">
        <p className="text-xs text-blue-600">
          💡 Click on today or future days to apply streak freeze (❄️ = freeze available)
        </p>
      </div>
    </div>
  );
};

// Main ActivityGraph Component
const ActivityGraph = () => {
  const { user, updateUser } = useAuth();
  const xpContext = useXP();
  const streakFreezes = xpContext?.streakFreezes || user?.gameData?.streakFreezes || 0;
  
  const [activityData, setActivityData] = useState({
    calendar: [],
    stats: {
      currentStreak: 0,
      longestStreak: 0,
      totalDays: 0
    }
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Initialize component
  useEffect(() => {
    fetchActivityData();
  }, [user]);

  // This function is to fetch activity data
  const fetchActivityData = async () => {
    try {
      setLoading(true);
      const result = await DataService.getActivityCalendar();
      if (result.success) {
        setActivityData(result.data);
      } else {
        console.error('Failed to fetch activity data:', result.error);
        setActivityData({
          calendar: [],
          stats: {
            currentStreak: user?.gameData?.currentStreak || 0,
            longestStreak: user?.gameData?.longestStreak || 0,
            totalDays: 0
          }
        });
      }
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setActivityData({
        calendar: [],
        stats: {
          currentStreak: user?.gameData?.currentStreak || 0,
          longestStreak: user?.gameData?.longestStreak || 0,
          totalDays: 0
        }
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh function
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchActivityData();
    setIsRefreshing(false);
  };

  // streak freeze function
  const applyStreakFreeze = async () => {
    try {
      console.log('Attempting to apply streak freeze...');
      console.log('Current user:', user?.name || 'Unknown');
      console.log('Available streak freezes:', streakFreezes);
      console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
      
      // Here I am testing backend connection first
      try {
        const healthResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/health`);
        console.log('Health check status:', healthResponse.status);
        
        if (!healthResponse.ok) {
          throw new Error(`Backend health check failed: ${healthResponse.status}`);
        }
      } catch (healthError) {
        console.error('Backend connection failed:', healthError);
        return { 
          success: false, 
          error: 'Backend server is not responding. Please check if the server is running.' 
        };
      }

      if (streakFreezes <= 0) {
        console.error('No streak freezes available');
        return { 
          success: false, 
          error: 'No streak freezes available. You need at least 1 freeze to use this feature.' 
        };
      }

      // Fixed: Call the DataService method without the hook rule triggering
      const result = await DataService.applyStreakFreeze();
      
      console.log('Streak freeze API response:', result);
      
      if (result.success) {
        console.log('Streak freeze applied successfully');
        return result;
      } else {
        console.error('Streak freeze API returned error:', result.error);
        return { 
          success: false, 
          error: result.error || 'Failed to apply streak freeze. Please try again.' 
        };
      }
    } catch (error) {
      console.error('Error in streak freeze application:', error);
      
      if (error.response) {
        const serverError = error.response.data?.message || error.response.data?.error || 'Server error occurred';
        const statusCode = error.response.status;
        console.error('Server error details:', {
          status: statusCode,
          message: serverError,
          data: error.response.data
        });
        
        if (statusCode === 401) {
          return { success: false, error: 'Authentication failed. Please log in again.' };
        } else if (statusCode === 400) {
          return { success: false, error: serverError || 'Invalid request. Please try again.' };
        } else if (statusCode === 404) {
          return { success: false, error: 'User not found. Please log in again.' };
        } else {
          return { success: false, error: `Server error (${statusCode}): ${serverError}` };
        }
      } else if (error.request) {
        console.error('Network error details:', error.request);
        return { success: false, error: 'Network error. Please check your internet connection and try again.' };
      } else {
        console.error('Unknown error details:', error.message);
        return { success: false, error: error.message || 'An unexpected error occurred. Please try again.' };
      }
    }
  };

  // Use streak freeze function
  const handleUseStreakFreeze = async () => {
    console.log('Use Streak Freeze button clicked');
    console.log('Current streak freezes:', streakFreezes);
    
    if (streakFreezes <= 0) {
      toast.error('❄️ No streak freezes available! Complete challenges to earn more.', {
        toastId: 'no-freezes-available'
      });
      return;
    }

    try {
      const result = await applyStreakFreeze();
      console.log('Streak freeze result:', result);
      
      if (result.success) {
        // Update user data directly
        if (user && updateUser) {
          const updatedGameData = {
            ...user.gameData,
            streakFreezes: Math.max(0, (user.gameData?.streakFreezes || 0) - 1)
          };
          updateUser({ gameData: updatedGameData });
        }
        
        toast.success('❄️ Streak freeze applied successfully! Your streak is protected.', {
          toastId: 'freeze-applied',
          autoClose: 3000
        });
        
        await fetchActivityData();
      } else {
        console.error('Streak freeze failed:', result.error);
        toast.error(result.error || 'Failed to apply streak freeze. Please try again.', {
          toastId: 'freeze-failed'
        });
      }
    } catch (error) {
      console.error('Error in handleUseStreakFreeze:', error);
      toast.error('An unexpected error occurred. Please try again.', {
        toastId: 'freeze-error'
      });
    }
  };

  // Handle day click
  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowModal(true);
  };

  // Activity Details Modal with Streak Freeze Option
  const ActivityModal = () => {
    const [isApplyingFreeze, setIsApplyingFreeze] = useState(false);
    
    if (!selectedDay) return null;

    const formatDate = (date) => {
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    // it will check if streak freeze can be applied to this day or not
    const canApplyFreeze = () => {
      const today = new Date();
      const dayDate = selectedDay.date;
      
      // It can apply freeze for today and future days
      return dayDate >= new Date(today.toDateString()) && streakFreezes > 0;
    };

    // It willApply streak freeze to selected day
    const handleApplyFreezeToDay = async () => {
      console.log('Apply freeze to day button clicked');
      console.log('Selected day:', selectedDay);
      console.log('Available freezes:', streakFreezes);
      
      if (!canApplyFreeze()) {
        toast.error('Cannot apply freeze to this day.', {
          toastId: 'cannot-apply-freeze'
        });
        return;
      }
      
      setIsApplyingFreeze(true);
      
      try {
        const result = await applyStreakFreeze();
        console.log('Day freeze result:', result);
        
        if (result.success) {
          // Update user data directly
          if (user && updateUser) {
            const updatedGameData = {
              ...user.gameData,
              streakFreezes: Math.max(0, (user.gameData?.streakFreezes || 0) - 1)
            };
            updateUser({ gameData: updatedGameData });
          }
          
          toast.success(`❄️ Streak freeze applied to ${formatDate(selectedDay.date)}!`, {
            toastId: 'freeze-applied-day',
            autoClose: 3000
          });
          
          await fetchActivityData();
          setShowModal(false);
        } else {
          console.error('Day freeze failed:', result.error);
          toast.error(result.error || 'Failed to apply streak freeze to this day.', {
            toastId: 'day-freeze-failed'
          });
        }
      } catch (error) {
        console.error('Error in handleApplyFreezeToDay:', error);
        toast.error('An unexpected error occurred. Please try again.', {
          toastId: 'day-freeze-error'
        });
      } finally {
        setIsApplyingFreeze(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-black">
                  {formatDate(selectedDay.date)}
                </h3>
                <p className="text-gray-600">Activity Details</p>
              </div>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 p-2 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {selectedDay.activity ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <ActivityIcon className="w-5 h-5 text-green-600" />
                        <span className="text-sm font-medium text-green-700">Activities</span>
                      </div>
                      <p className="text-2xl font-bold text-green-900">
                        {selectedDay.activityCount}
                      </p>
                    </div>
                    
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                      <div className="flex items-center space-x-2 mb-2">
                        <Star className="w-5 h-5 text-yellow-600" />
                        <span className="text-sm font-medium text-yellow-700">XP Earned</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-900">
                        {selectedDay.xp}
                      </p>
                    </div>
                  </div>

                  <div className="text-center pt-2">
                    <div className={`inline-flex px-4 py-2 rounded-full text-sm font-medium ${
                      selectedDay.activityCount >= 5 ? 'bg-green-100 text-green-800' :
                      selectedDay.activityCount >= 3 ? 'bg-blue-100 text-blue-800' :
                      selectedDay.activityCount >= 1 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedDay.activityCount >= 5 ? '🔥 Highly Active Day!' :
                       selectedDay.activityCount >= 3 ? '⚡ Good Progress!' :
                       selectedDay.activityCount >= 1 ? '👍 Active Day' :
                       '😴 Rest Day'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h4 className="text-lg font-medium text-gray-600 mb-2">No Activity</h4>
                    <p className="text-gray-500 text-sm">
                      {selectedDay.isPast ? 
                        "You didn't have any learning activities on this day." :
                        selectedDay.isToday ?
                        "No activities yet today. Start learning to build your streak!" :
                        "This day hasn't happened yet."
                      }
                    </p>
                  </div>

                  {canApplyFreeze() && (
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                      <div className="flex items-center space-x-2 mb-3">
                        <span className="text-blue-500 text-lg">❄️</span>
                        <div>
                          <h4 className="font-semibold text-blue-900">Apply Streak Freeze</h4>
                          <p className="text-sm text-blue-700">
                            {selectedDay.isToday ? 
                              "Protect your streak for today if you can't study" :
                              "Pre-apply a freeze for this upcoming day"
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm text-blue-600">Available Freezes:</span>
                        <span className="font-semibold text-blue-800">{streakFreezes}</span>
                      </div>
                      
                      <button
                        onClick={handleApplyFreezeToDay}
                        disabled={isApplyingFreeze || streakFreezes === 0}
                        className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium"
                      >
                        {isApplyingFreeze ? (
                          <div className="flex items-center justify-center space-x-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Applying...</span>
                          </div>
                        ) : (
                          `Apply Freeze (${streakFreezes} left) ❄️`
                        )}
                      </button>
                      
                      {selectedDay.isToday && (
                        <p className="text-xs text-blue-600 mt-2 text-center">
                          💡 This will protect your streak if you don't complete any activities today
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading activity data...</p>
        </div>
      </div>
    );
  }

  const currentStreak = activityData.stats.currentStreak || user?.gameData?.currentStreak || 0;
  const longestStreak = activityData.stats.longestStreak || user?.gameData?.longestStreak || 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Activity Graph</h2>
          <p className="text-gray-600">Track your learning consistency and streaks</p>
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

      {/* Activity Calendar */}
      <AnimatedCard delay={0}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-black">Activity Calendar</h3>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Click any day to see details</span>
          </div>
        </div>
        <ActivityCalendar activities={activityData.calendar} onDayClick={handleDayClick} />
      </AnimatedCard>

      {/* Activity Details Modal */}
      {showModal && <ActivityModal />}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <AnimatedCard delay={100} className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-700 text-sm font-medium">Current Streak</p>
              <p className="text-3xl font-bold text-orange-900">{currentStreak} days</p>
              <p className="text-orange-600 text-xs mt-1">
                {currentStreak > longestStreak ? 'New record!' : 'Keep it going!'}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={200} className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-700 text-sm font-medium">Longest Streak</p>
              <p className="text-3xl font-bold text-blue-900">{longestStreak} days</p>
              <p className="text-blue-600 text-xs mt-1">Personal best</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={300} className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-700 text-sm font-medium">Streak Freezes</p>
              <p className="text-3xl font-bold text-purple-900">{streakFreezes}</p>
              <p className="text-purple-600 text-xs mt-1">Available</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">❄️</span>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Streak Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard delay={400}>
          <h3 className="text-xl font-bold text-black mb-4">Streak Management</h3>
          <div className="space-y-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center space-x-3 mb-3">
                <Flame className="w-6 h-6 text-orange-500" />
                <div>
                  <h4 className="font-semibold text-orange-900">Current Streak</h4>
                  <p className="text-sm text-orange-700">{currentStreak} consecutive days</p>
                </div>
              </div>
              <div className="w-full bg-orange-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min((currentStreak / 30) * 100, 100)}%` }}
                />
              </div>
              <p className="text-xs text-orange-600 mt-2">
                {30 - currentStreak > 0 
                  ? `${30 - currentStreak} days to next milestone`
                  : 'Milestone achieved! 🏆'
                }
              </p>
            </div>

            <button
              onClick={handleUseStreakFreeze}
              disabled={streakFreezes === 0}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all ${
                streakFreezes > 0
                  ? 'bg-blue-500 text-white hover:bg-blue-600 hover:shadow-lg'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {streakFreezes > 0 
                ? `Use Streak Freeze (${streakFreezes} remaining) ❄️`
                : 'No Streak Freezes Available'
              }
            </button>
          </div>
        </AnimatedCard>

        <AnimatedCard delay={500}>
          <h3 className="text-xl font-bold text-black mb-4">This Week's Progress</h3>
          <div className="space-y-3">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day, i) => {
              const today = new Date();
              const dayDate = new Date(today);
              dayDate.setDate(today.getDate() - (6 - i));
              const dateStr = dayDate.toISOString().split('T')[0];
              
              const dayActivity = activityData.calendar.find(activity => activity.date === dateStr);
              const dayProgress = dayActivity ? dayActivity.count : 0;
              
              return (
                <div key={day} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-gray-700 w-20">{day}</span>
                    <div className="flex space-x-1">
                      {[...Array(Math.max(dayProgress, 0))].map((_, j) => (
                        <div key={j} className="w-2 h-2 bg-green-500 rounded-full" />
                      ))}
                      {dayProgress === 0 && (
                        <div className="w-2 h-2 bg-gray-300 rounded-full" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-600">{dayProgress} activities</span>
                    {dayActivity && dayActivity.xp > 0 && (
                      <p className="text-xs text-green-600">+{dayActivity.xp} XP</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      </div>

      {/* Activity Stats */}
      <AnimatedCard delay={600}>
        <h3 className="text-xl font-bold text-black mb-4">Activity Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-black">{activityData.stats.totalDays}</p>
            <p className="text-sm text-gray-600">Active Days</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <Flame className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-black">{currentStreak}</p>
            <p className="text-sm text-gray-600">Current Streak</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-black">{longestStreak}</p>
            <p className="text-sm text-gray-600">Best Streak</p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-purple-600">❄️</span>
            </div>
            <p className="text-2xl font-bold text-black">{streakFreezes}</p>
            <p className="text-sm text-gray-600">Freezes Left</p>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );
};

export default ActivityGraph;