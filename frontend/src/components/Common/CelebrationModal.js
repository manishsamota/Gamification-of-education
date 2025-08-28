import React, { useEffect, useState } from 'react';
import { Zap, Trophy, Star } from 'lucide-react';

const CelebrationModal = ({ data, onClose }) => {
  const [confetti, setConfetti] = useState([]);

  useEffect(() => {
    // this will generate Confetti pieces
    const pieces = [];
    for (let i = 0; i < 50; i++) {
      pieces.push({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 3,
        color: ['#00FF9C', '#D67BFF', '#FFD700', '#FF6B6B'][Math.floor(Math.random() * 4)]
      });
    }
    setConfetti(pieces);

    // this will auto close after 3 seconds
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      {/* Confetti */}
      {confetti.map(piece => (
        <div
          key={piece.id}
          className="absolute w-2 h-2 confetti"
          style={{
            left: `${piece.left}%`,
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`
          }}
        />
      ))}

      {/* Modal Content */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform animate-bounce-custom">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse-custom">
            {data.type === 'xp' && <Zap className="w-10 h-10 text-white" />}
            {data.type === 'achievement' && <Trophy className="w-10 h-10 text-white" />}
            {data.type === 'level' && <Star className="w-10 h-10 text-white" />}
          </div>
          
          <h2 className="text-3xl font-bold text-black mb-2">
            {data.type === 'xp' && 'XP Gained!'}
            {data.type === 'achievement' && 'Achievement Unlocked!'}
            {data.type === 'level' && 'Level Up!'}
          </h2>
          
          <p className="text-gray-600 text-lg">
            {data.message}
          </p>
        </div>

        <div className="mb-6">
          {data.type === 'xp' && (
            <div className="text-4xl font-bold gradient-text">
              +{data.amount} XP
            </div>
          )}
          
          {data.type === 'achievement' && (
            <div className="text-5xl mb-2">
              {data.icon || '🏆'}
            </div>
          )}
          
          {data.type === 'level' && (
            <div className="text-4xl font-bold gradient-text">
              Level {data.newLevel}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="bg-gradient-to-r from-green-400 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Awesome!
        </button>
      </div>
    </div>
  );
};

export default CelebrationModal;