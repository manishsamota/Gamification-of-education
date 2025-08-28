import React, { useEffect, useState } from 'react';

const XPBar = ({ current, max, className = "", animated = true, showLabel = false }) => {
  const [width, setWidth] = useState(0);
  const percentage = Math.min((current / max) * 100, 100);

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => {
        setWidth(percentage);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setWidth(percentage);
    }
  }, [percentage, animated]);

  return (
    <div className={`relative ${className}`}>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-green-400 to-purple-500 h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
          style={{ width: `${width}%` }}
        >
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
        </div>
      </div>
      
      {showLabel && (
        <div className="flex justify-between text-sm text-gray-600 mt-1">
          <span>{current.toLocaleString()}</span>
          <span>{max.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
};

export default XPBar;