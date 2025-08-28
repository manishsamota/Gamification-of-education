import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { BookOpen } from 'lucide-react';

const AuthPage = () => {
  const [authMode, setAuthMode] = useState('login');

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* This is for background decorative elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-green-100/20 to-purple-100/20"></div>
      
      {/* This is for floating shapes for visual appeal */}
      <div className="absolute top-20 left-20 w-20 h-20 bg-green-400 rounded-full opacity-10 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-32 h-32 bg-purple-500 rounded-full opacity-10 animate-pulse" style={{animationDelay: '1s'}}></div>
      <div className="absolute top-1/2 left-10 w-16 h-16 bg-yellow-400 rounded-full opacity-10 animate-pulse" style={{animationDelay: '2s'}}></div>
      <div className="absolute top-10 right-1/3 w-12 h-12 bg-blue-400 rounded-full opacity-10 animate-pulse" style={{animationDelay: '3s'}}></div>
      <div className="absolute bottom-1/3 left-1/4 w-8 h-8 bg-pink-400 rounded-full opacity-10 animate-pulse" style={{animationDelay: '4s'}}></div>
      
      {/* Main content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-purple-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold gradient-text mb-2">EduGame</h1>
          <p className="text-gray-600 text-lg">Gamify Your Learning Journey</p>
        </div>

        {/* Auth Forms */}
        {authMode === 'login' ? (
          <LoginForm 
            switchToSignup={() => setAuthMode('signup')}
          />
        ) : (
          <SignupForm 
            switchToLogin={() => setAuthMode('login')}
          />
        )}

        {/* Here Features showcase */}
        <div className="mt-8 text-center">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-green-600 text-sm font-bold">XP</span>
              </div>
              <p className="text-xs text-gray-600">Earn Points</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-purple-600 text-lg">🏆</span>
              </div>
              <p className="text-xs text-gray-600">Achievements</p>
            </div>
            <div className="text-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <span className="text-yellow-600 text-lg">🔥</span>
              </div>
              <p className="text-xs text-gray-600">Streaks</p>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Join thousands of learners making education fun!
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;