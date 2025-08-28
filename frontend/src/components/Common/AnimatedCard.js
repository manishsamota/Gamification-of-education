import React from 'react';

const AnimatedCard = ({ children, className = "", delay = 0, onClick }) => {
  return (
    <div 
      className={`bg-white rounded-xl shadow-card p-6 transform transition-all duration-500 hover:scale-[1.02] hover:shadow-card-hover cursor-pointer ${className}`}
      style={{ 
        animationDelay: `${delay}ms`,
        animation: 'fadeIn 0.5s ease-out forwards'
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default AnimatedCard;