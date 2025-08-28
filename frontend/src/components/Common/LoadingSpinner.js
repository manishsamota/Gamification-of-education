import React from 'react';
import { BookOpen } from 'lucide-react';

const LoadingSpinner = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-r from-green-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
          <BookOpen className="w-8 h-8 text-white" />
        </div>
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Loading EduGame...</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;