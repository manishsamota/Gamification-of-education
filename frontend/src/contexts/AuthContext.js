
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configure axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('API Base URL:', API_BASE_URL);

// Global flags to prevent duplicate operations
let isAuthInProgress = false;

// Toast deduplication utility
class ToastManager {
  constructor() {
    this.activeToasts = new Set();
    this.lastToastTime = new Map();
  }

  showUniqueToast(type, message, options = {}) {
    const key = `${type}-${message}`;
    const now = Date.now();
    const lastTime = this.lastToastTime.get(key) || 0;
    
    // Prevent duplicate toasts within 2 seconds
    if (now - lastTime < 2000) {
      console.log('Blocking duplicate toast:', key);
      return;
    }
    
    this.lastToastTime.set(key, now);
    
    const defaultOptions = {
      toastId: key,
      autoClose: 3000,
      ...options
    };
    
    switch (type) {
      case 'success':
        return toast.success(message, defaultOptions);
      case 'error':
        return toast.error(message, defaultOptions);
      case 'info':
        return toast.info(message, defaultOptions);
      default:
        return toast(message, defaultOptions);
    }
  }

  success(message, options = {}) {
    return this.showUniqueToast('success', message, options);
  }

  error(message, options = {}) {
    return this.showUniqueToast('error', message, options);
  }

  info(message, options = {}) {
    return this.showUniqueToast('info', message, options);
  }
}

const toastManager = new ToastManager();

// Helper function to clean user data
const cleanUserData = (userData) => {
  if (!userData) return null;
  
  try {
    return {
      id: String(userData.id || ''),
      name: String(userData.name || '').replace(/[^\w\s.-]/g, ''),
      email: String(userData.email || '').replace(/[^\w@.-]/g, ''),
      avatar: String(userData.avatar || ''),
      provider: String(userData.provider || 'email'),
      isEmailVerified: Boolean(userData.isEmailVerified),
      gameData: {
        totalXP: Number(userData.gameData?.totalXP || 0),
        level: Number(userData.gameData?.level || 1),
        currentStreak: Number(userData.gameData?.currentStreak || 0),
        longestStreak: Number(userData.gameData?.longestStreak || 0),
        rank: Number(userData.gameData?.rank || 999),
        weeklyProgress: Number(userData.gameData?.weeklyProgress || 0),
        weeklyGoal: Number(userData.gameData?.weeklyGoal || 500),
        streakFreezes: Number(userData.gameData?.streakFreezes || 3),
        ...userData.gameData
      },
      preferences: userData.preferences || {},
      profile: userData.profile || {}
    };
  } catch (error) {
    console.error('Error cleaning user data:', error);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  // Set up axios configuration
  useEffect(() => {
    axios.defaults.baseURL = API_BASE_URL;
    
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Response interceptor to handle token expiration
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          console.log('Token expired, clearing auth state');
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          
          //  Use deduplication for session expired
          toastManager.error('Session expired. Please login again.');
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        console.log('Checking auth status...');
        const response = await axios.get('/auth/me');
        console.log('Auth check response:', response.data);
        
        if (response.data && response.data.user) {
          const cleanUser = cleanUserData(response.data.user);
          console.log('Setting clean user:', cleanUser);
          setUser(cleanUser);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };

  //  Login with deduplicated notifications
  const login = async (email, password) => {
    if (isAuthInProgress) {
      console.log('Auth operation already in progress');
      return { success: false, message: 'Authentication in progress' };
    }
    
    isAuthInProgress = true;
    setAuthLoading(true);
    
    try {
      console.log('Attempting login...');
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      console.log('Login response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        console.log('Setting clean user after login:', cleanUser);
        setUser(cleanUser);
        
        //  Use deduplication - only show login success here
        toastManager.success(`Welcome back, ${cleanUser.name}!`);
        
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      
      //  Use deduplication for login errors
      toastManager.error(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
      setTimeout(() => {
        isAuthInProgress = false;
      }, 1000);
    }
  };

  //  Signup with deduplicated notifications
  const signup = async (userData) => {
    if (isAuthInProgress) {
      console.log('Auth operation already in progress');
      return { success: false, message: 'Authentication in progress' };
    }
    
    isAuthInProgress = true;
    setAuthLoading(true);
    
    try {
      console.log('Attempting signup...');
      const response = await axios.post('/auth/signup', userData);
      
      console.log('Signup response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        console.log('Setting clean user after signup:', cleanUser);
        setUser(cleanUser);
        
        //  Use deduplication - only show signup success here
        toastManager.success(`Welcome to EduGame, ${cleanUser.name}!`);
        
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Signup error:', error);
      const message = error.response?.data?.message || 'Signup failed';
      
      //  Use deduplication for signup errors
      toastManager.error(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
      setTimeout(() => {
        isAuthInProgress = false;
      }, 1000);
    }
  };

  //  Google auth with deduplicated notifications
  const googleAuth = async (tokenId) => {
    setAuthLoading(true);
    try {
      console.log('Attempting Google auth...');
      const response = await axios.post('/auth/google', {
        tokenId
      });
      
      console.log('Google auth response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        setUser(cleanUser);
        
        //  Use deduplication for Google auth
        toastManager.success(`Welcome, ${cleanUser.name}!`);
        
        return { success: true };
      }
    } catch (error) {
      console.error('Google auth error:', error);
      const message = error.response?.data?.message || 'Google login failed';
      
      //  Use deduplication for Google auth errors
      toastManager.error(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  //  Handle auth success WITHOUT showing toast 
  const handleAuthSuccess = async (token) => {
    try {
      console.log('Handling auth success...');
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.get('/auth/me');
      
      if (response.data && response.data.user) {
        const cleanUser = cleanUserData(response.data.user);
        setUser(cleanUser);
                
        return { success: true };
      }
    } catch (error) {
      console.error('Auth success handler failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      
      toastManager.error('Authentication failed. Please try again.');
      
      return { success: false };
    }
  };

  const logout = () => {
    const userName = user?.name;
    
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);

    toastManager.info(`Goodbye${userName ? `, ${userName}` : ''}! See you soon!`);
  };

  // Better updateUser with data validation and change detection
  const updateUser = (updatedUserData) => {
    if (!updatedUserData) {
      console.log('No user data provided for update');
      return;
    }

    try {
      const cleanUpdatedData = cleanUserData(updatedUserData);
      
      if (!cleanUpdatedData) {
        console.log('Failed to clean user data');
        return;
      }

      // Deep merge with existing user data
      setUser(prevUser => {
        if (!prevUser) return cleanUpdatedData;
        
        const mergedUser = {
          ...prevUser,
          ...cleanUpdatedData,
          gameData: {
            ...prevUser.gameData,
            ...cleanUpdatedData.gameData
          },
          profile: {
            ...prevUser.profile,
            ...cleanUpdatedData.profile
          },
          preferences: {
            ...prevUser.preferences,
            ...cleanUpdatedData.preferences
          }
        };

        console.log('User updated:', {
          oldXP: prevUser.gameData?.totalXP,
          newXP: mergedUser.gameData?.totalXP,
          oldLevel: prevUser.gameData?.level,
          newLevel: mergedUser.gameData?.level
        });

        return mergedUser;
      });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  // Refresh user data from backend
  const refreshUserData = async () => {
    try {
      console.log('Refreshing user data from backend...');
      
      const response = await axios.get('/auth/me');
      
      if (response.data && response.data.user) {
        const cleanUser = cleanUserData(response.data.user);
        setUser(cleanUser);
        console.log('User data refreshed successfully');
        return { success: true, data: cleanUser };
      } else {
        throw new Error('Invalid user data received');
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      return { success: false, error: error.message };
    }
  };

  const updateUserStats = async (statsUpdate) => {
    try {
      const response = await axios.put('/users/stats', statsUpdate);
      if (response.data.success) {
        const updatedUser = {
          ...user,
          gameData: {
            ...user.gameData,
            ...response.data.data.gameData
          }
        };
        setUser(updatedUser);
        return response.data;
      }
    } catch (error) {
      console.error('Failed to update user stats:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    user,
    login,
    signup,
    googleAuth,
    handleAuthSuccess,
    logout,
    updateUser,
    updateUserStats,
    refreshUserData,
    loading,
    authLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};