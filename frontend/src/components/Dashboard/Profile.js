
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  User, Mail, Calendar, MapPin, GraduationCap, Edit3, 
  Save, X, Camera, 
  Zap, Flame, Trophy, TrendingUp, Star, 
  RefreshCw, Settings
} from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import XPBar from '../Common/XPBar';
import DataService from '../../services/dataService';
import { toast } from 'react-toastify';

let isProfileSaving = false;

const EditableInput = ({ defaultValue, onSave, type = "text", placeholder, className, rows }) => {
  const [localValue, setLocalValue] = useState(defaultValue || '');



  // Update local value when defaultValue changes
  useEffect(() => {
    setLocalValue(defaultValue || '');
  }, [defaultValue]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    // Save immediately to the external callback
    if (onSave) {
      onSave(newValue);
    }
  };

  if (type === 'textarea') {
    return (
      <textarea
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
    );
  }

  return (
    <input
      type={type}
      value={localValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
};

const Profile = () => {
  const { user, updateUser } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Prevent duplicate saves
  const [isSaving, setIsSaving] = useState(false);
  
  // Use a ref to store edit values 
  const editValuesRef = useRef({
    name: '',
    bio: '',
    location: '',
    school: '',
    grade: 'other'
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  // to fetchProfileData
  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const result = await DataService.getUserProfile();
      if (result.success) {
        setProfileData(result.data);
      } else {
        // Use fallback data from user context
        setProfileData({
          ...user,
          profile: user?.profile || {},
          gameData: user?.gameData || {},
          preferences: user?.preferences || {},
          activities: user?.activities || [],
          achievements: user?.achievements || []
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      // Use fallback data
      setProfileData({
        ...user,
        profile: {
          bio: '',
          location: '',
          school: '',
          grade: 'other',
          interests: [],
          learningGoals: [],
          ...user?.profile
        },
        gameData: {
          totalXP: 1250,
          level: 3,
          currentStreak: 5,
          longestStreak: 12,
          rank: 156,
          ...user?.gameData
        },
        preferences: {
          notifications: true,
          emailNotifications: true,
          soundEnabled: true,
          darkMode: false,
          language: 'en',
          ...user?.preferences
        },
        activities: [],
        achievements: []
      });
    } finally {
      setLoading(false);
    }
  };

  // handleRefresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchProfileData();
    setIsRefreshing(false);
  };

  // handleEditToggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Reset edit values when canceling
      editValuesRef.current = {
        name: profileData?.name || '',
        bio: profileData?.profile?.bio || '',
        location: profileData?.profile?.location || '',
        school: profileData?.profile?.school || '',
        grade: profileData?.profile?.grade || 'other'
      };
    } else {
      // Initialize edit values when starting to edit
      editValuesRef.current = {
        name: profileData?.name || '',
        bio: profileData?.profile?.bio || '',
        location: profileData?.profile?.location || '',
        school: profileData?.profile?.school || '',
        grade: profileData?.profile?.grade || 'other'
      };
    }
    setIsEditing(!isEditing);
  };


  const handleSaveProfile = async (e) => {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  if (isSaving) return;
  setIsSaving(true);

  try {
    console.log('Saving profile data:', editValuesRef.current);

    const result = await DataService.updateProfile({
      name: editValuesRef.current.name?.trim() || profileData?.name,
      profile: {
        ...profileData?.profile,
        bio: editValuesRef.current.bio?.trim() || '',
        location: editValuesRef.current.location?.trim() || '',
        school: editValuesRef.current.school?.trim() || '',
        grade: editValuesRef.current.grade || 'other'
      }
    });

    if (result.success) {
      console.log('Profile updated successfully:', result.data);
      
      setProfileData(result.data);
      updateUser({ 
        name: result.data.name,
        profile: result.data.profile 
      });
      
      editValuesRef.current = {
        name: result.data.name || '',
        bio: result.data.profile?.bio || '',
        location: result.data.profile?.location || '',
        school: result.data.profile?.school || '',
        grade: result.data.profile?.grade || 'other'
      };
      
      // setIsEditing(false);
      // toast.success('Profile updated successfully! ✅');
      
      // NO NOTIFICATIONS HERE - REMOVED COMPLETELY
      
    } 
    
    
    else {
      console.error('Profile update failed:', result.error);
     
    }
  } catch (error) {
    console.error(' Error updating profile:', error);
   
  } finally {
    setIsSaving(false);
  }
};
  // to updateEditValue
  const updateEditValue = (field, value) => {
    editValuesRef.current[field] = value;
    console.log(`Updated ${field}:`, value);
  };

  //displayData
  const displayData = profileData || {
    name: 'Loading...',
    email: 'loading@example.com',
    avatar: '',
    profile: {},
    gameData: { totalXP: 0, level: 1, currentStreak: 0, longestStreak: 0, rank: 999 },
    preferences: {},
    activities: [],
    achievements: []
  };

  //loading state
  if (loading && !profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  // ALL COMPONENTS
  const OverviewTab = () => (
    <div className="space-y-6">
      {/* Profile Header */}
      <AnimatedCard delay={0}>
        <div className="flex items-start space-x-6">
          <div className="relative">
            <img 
              src={displayData.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${displayData.name}`}
              alt={displayData.name}
              className="w-24 h-24 rounded-full border-4 border-gray-200"
            />
            {!isEditing && (
              <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center text-white hover:shadow-lg transition-all">
                <Camera className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-4">
                <EditableInput
                  defaultValue={displayData.name}
                  onSave={(value) => updateEditValue('name', value)}
                  placeholder="Your name"
                  className="text-2xl font-bold bg-transparent border-b-2 border-purple-300 focus:border-purple-500 outline-none w-full"
                />
                <EditableInput
                  type="textarea"
                  defaultValue={displayData.profile?.bio}
                  onSave={(value) => updateEditValue('bio', value)}
                  placeholder="Tell us about yourself..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-black">{displayData.name}</h1>
                <p className="text-gray-600 mt-1">{displayData.email}</p>
                <p className="text-gray-700 mt-3">{displayData.profile?.bio || 'No bio added yet.'}</p>
              </div>
            )}
            
            <div className="flex items-center space-x-4 mt-4">
              <div className="flex items-center space-x-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-gray-600">Level {displayData.gameData?.level || 1}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-gray-600">{displayData.gameData?.currentStreak || 0} day streak</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-gray-600">#{displayData.gameData?.rank || 999}</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSaving} //  Disable while saving
                  className="px-4 py-2 bg-gradient-to-r from-green-400 to-purple-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Saving...' : 'Save'}</span> {/*  Show saving state */}
                </button>
                <button
                  type="button"
                  onClick={handleEditToggle}
                  disabled={isSaving} // Disable while saving
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleEditToggle}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all flex items-center space-x-2"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </AnimatedCard>

      {/* Personal Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedCard delay={100}>
          <h3 className="text-lg font-bold text-black mb-4">Personal Information</h3>
          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <EditableInput
                    defaultValue={displayData.profile?.location}
                    onSave={(value) => updateEditValue('location', value)}
                    placeholder="Your location"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">School</label>
                  <EditableInput
                    defaultValue={displayData.profile?.school}
                    onSave={(value) => updateEditValue('school', value)}
                    placeholder="Your school"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade Level</label>
                  <select
                    defaultValue={displayData.profile?.grade || 'other'}
                    onChange={(e) => updateEditValue('grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="elementary">Elementary</option>
                    <option value="middle">Middle School</option>
                    <option value="high">High School</option>
                    <option value="college">College</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{displayData.profile?.location || 'Not specified'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <GraduationCap className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{displayData.profile?.school || 'Not specified'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700 capitalize">{displayData.profile?.grade || 'other'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-700">{displayData.email}</span>
                </div>
              </>
            )}
          </div>
        </AnimatedCard>

        {/* Level Progress Card */}
        <AnimatedCard delay={200}>
          <h3 className="text-lg font-bold text-black mb-4">Level Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-600">Level {displayData.gameData?.level || 1}</span>
                <span className="text-sm text-gray-600">{displayData.gameData?.totalXP || 0} XP</span>
              </div>
              <XPBar 
                current={(displayData.gameData?.totalXP || 0) % 1000} 
                max={1000} 
                className="h-3"
              />
              <p className="text-xs text-gray-500 mt-2">
                {1000 - ((displayData.gameData?.totalXP || 0) % 1000)} XP to next level
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <Flame className="w-6 h-6 text-orange-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-orange-900">{displayData.gameData?.currentStreak || 0}</p>
                <p className="text-xs text-orange-600">Current Streak</p>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-500 mx-auto mb-1" />
                <p className="text-lg font-bold text-blue-900">{displayData.gameData?.longestStreak || 0}</p>
                <p className="text-xs text-blue-600">Best Streak</p>
              </div>
            </div>
          </div>
        </AnimatedCard>
      </div>

      {/* Interests and Goals */}
      <AnimatedCard delay={300}>
        <h3 className="text-lg font-bold text-black mb-4">Interests & Goals</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Interests</h4>
            <div className="flex flex-wrap gap-2">
              {displayData.profile?.interests?.length > 0 ? (
                displayData.profile.interests.map((interest, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    {interest}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No interests added yet</span>
              )}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-700 mb-2">Learning Goals</h4>
            <div className="space-y-2">
              {displayData.profile?.learningGoals?.length > 0 ? (
                displayData.profile.learningGoals.map((goal, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-700">{goal}</span>
                  </div>
                ))
              ) : (
                <span className="text-gray-500 text-sm">No learning goals set yet</span>
              )}
            </div>
          </div>
        </div>
      </AnimatedCard>
    </div>
  );

  // ALL OTHER TABS
  const StatsTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Stats cards - same as before */}
    </div>
  );

  const AchievementsTab = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-500 mb-2">Achievements Coming Soon</h3>
        <p className="text-gray-400">Your achievements will be displayed here once you start completing challenges!</p>
      </div>
    </div>
  );

  const SettingsTab = () => (
    <div className="space-y-6">
      {/* Settings content - same as before */}
    </div>
  );

  // MAIN RETURN
  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header with Refresh Button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Profile</h2>
          <p className="text-gray-600">Manage your profile and settings</p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview', icon: User },
          { id: 'stats', label: 'Statistics', icon: TrendingUp },
          { id: 'achievements', label: 'Achievements', icon: Trophy },
          { id: 'settings', label: 'Settings', icon: Settings }
        ].map(tab => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-green-400 to-purple-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-purple-300'
              }`}
            >
              <IconComponent className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'stats' && <StatsTab />}
        {activeTab === 'achievements' && <AchievementsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </div>
    </div>
  );
};

export default Profile;