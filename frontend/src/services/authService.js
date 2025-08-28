
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import NotificationService from '../services/notificationService'; 

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Configuation of axios base URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
console.log('API Base URL:', API_BASE_URL);

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
      gameData: userData.gameData || {},
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
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          setUser(null);
          // notification service to prevent duplicates
          NotificationService.sessionExpired();
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
        console.log(' Checking auth status...');
        const response = await axios.get('/auth/me');
        console.log(' Auth check response:', response.data);
        
        if (response.data && response.data.user) {
          const cleanUser = cleanUserData(response.data.user);
          console.log(' Setting clean user:', cleanUser);
          setUser(cleanUser);
        }
      }
    } catch (error) {
      console.error(' Auth check failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
    } finally {
      setLoading(false);
    }
  };


  const login = async (email, password) => {
    setAuthLoading(true);
    try {
      console.log(' Attempting login...');
      const response = await axios.post('/auth/login', {
        email,
        password
      });

      console.log(' Login response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        console.log(' Setting clean user after login:', cleanUser);
        setUser(cleanUser);
        
        // notification service
        NotificationService.loginSuccess(cleanUser.name);
        
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error(' Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      
      // notification service
      NotificationService.loginError(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const signup = async (userData) => {
    setAuthLoading(true);
    try {
      console.log(' Attempting signup...');
      const response = await axios.post('/auth/signup', userData);
      
      console.log(' Signup response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        console.log(' Setting clean user after signup:', cleanUser);
        setUser(cleanUser);
        
        // notification service
        NotificationService.signupSuccess(cleanUser.name);
        
        return { success: true };
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error(' Signup error:', error);
      const message = error.response?.data?.message || 'Signup failed';
      
      // notification service
      NotificationService.signupError(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const googleAuth = async (tokenId) => {
    setAuthLoading(true);
    try {
      console.log(' Attempting Google auth...');
      const response = await axios.post('/auth/google', {
        tokenId
      });
      
      console.log(' Google auth response:', response.data);
      
      if (response.data.success && response.data.token && response.data.user) {
        const { token, user } = response.data;
        
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const cleanUser = cleanUserData(user);
        setUser(cleanUser);
        
        // notification service
        NotificationService.loginSuccess(cleanUser.name);
        
        return { success: true };
      }
    } catch (error) {
      console.error(' Google auth error:', error);
      const message = error.response?.data?.message || 'Google login failed';
      
      // notification service
      NotificationService.loginError(message);
      
      return { success: false, message };
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuthSuccess = async (token) => {
    try {
      console.log('🎯 Handling auth success...');
      localStorage.setItem('token', token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      const response = await axios.get('/auth/me');
      
      if (response.data && response.data.user) {
        const cleanUser = cleanUserData(response.data.user);
        setUser(cleanUser);
        
        // notification service
        NotificationService.loginSuccess(cleanUser.name);
        
        return { success: true };
      }
    } catch (error) {
      console.error(' Auth success handler failed:', error);
      localStorage.removeItem('token');
      delete axios.defaults.headers.common['Authorization'];
      
      // notification service
      NotificationService.loginError('Authentication failed. Please try again.');
      
      return { success: false };
    }
  };

  const logout = () => {
    const userName = user?.name;
    
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    
    // notification service
    NotificationService.logoutSuccess(userName);
  };

  // Simple updateUser without any notifications
  const updateUser = (updatedUserData) => {
    const cleanUpdatedData = cleanUserData(updatedUserData);
    setUser(prev => ({ ...prev, ...cleanUpdatedData }));
    // NO NOTIFICATIONS HERE - let the calling component handle them
  };

  const updateUserStats = async (statsUpdate) => {
    try {
      const response = await axios.put('/users/stats', statsUpdate);
      setUser(prev => ({ ...prev, gameData: response.data.gameData }));
      return response.data;
    } catch (error) {
      console.error('Failed to update user stats:', error);
      // No notifications for stats updates
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
    loading,
    authLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};