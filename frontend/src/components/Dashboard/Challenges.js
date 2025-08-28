import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useXP } from '../../contexts/XPContext';
import { Target, Zap, BookOpen, Clock, CheckCircle, RefreshCw, X, Trophy, Star } from 'lucide-react';
import AnimatedCard from '../Common/AnimatedCard';
import DataService from '../../services/dataService';
import { toast } from 'react-toastify';


import { useChallengeSync } from '../../hooks/useRealTimeSync';

// Here I added dummy challenges for better variety
const DUMMY_DAILY_CHALLENGES = [
  {
    _id: 'daily-1',
    title: 'Quick Math Sprint',
    description: 'Solve 10 arithmetic problems as fast as you can! Perfect for warming up your brain.',
    type: 'daily',
    category: 'math',
    difficulty: 'easy',
    xpReward: 25,
    timeLimit: 5,
    participantCount: 1247,
    questions: [
      {
        question: 'What is 15 + 27?',
        options: [
          { text: '42', isCorrect: true },
          { text: '41', isCorrect: false },
          { text: '43', isCorrect: false },
          { text: '40', isCorrect: false }
        ]
      },
      {
        question: 'What is 8 × 7?',
        options: [
          { text: '54', isCorrect: false },
          { text: '56', isCorrect: true },
          { text: '58', isCorrect: false },
          { text: '52', isCorrect: false }
        ]
      },
      {
        question: 'What is 100 - 23?',
        options: [
          { text: '77', isCorrect: true },
          { text: '73', isCorrect: false },
          { text: '83', isCorrect: false },
          { text: '87', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: true, participated: true, canReset: true, score: 92 }
  },
  {
    _id: 'daily-2',
    title: 'Science Explorer',
    description: 'Test your knowledge of basic science concepts and discover amazing facts!',
    type: 'daily',
    category: 'science',
    difficulty: 'easy',
    xpReward: 30,
    timeLimit: 8,
    participantCount: 892,
    questions: [
      {
        question: 'Which planet is closest to the Sun?',
        options: [
          { text: 'Venus', isCorrect: false },
          { text: 'Mercury', isCorrect: true },
          { text: 'Earth', isCorrect: false },
          { text: 'Mars', isCorrect: false }
        ]
      },
      {
        question: 'What do plants need to make their own food?',
        options: [
          { text: 'Sunlight, water, and carbon dioxide', isCorrect: true },
          { text: 'Only water', isCorrect: false },
          { text: 'Only sunlight', isCorrect: false },
          { text: 'Soil and rocks', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-3',
    title: 'Word Master',
    description: 'Challenge your vocabulary and spelling skills with interesting word puzzles.',
    type: 'daily',
    category: 'literature',
    difficulty: 'easy',
    xpReward: 20,
    timeLimit: 7,
    participantCount: 634,
    questions: [
      {
        question: 'What does "ubiquitous" mean?',
        options: [
          { text: 'Rare and unusual', isCorrect: false },
          { text: 'Present everywhere', isCorrect: true },
          { text: 'Very expensive', isCorrect: false },
          { text: 'Hard to understand', isCorrect: false }
        ]
      },
      {
        question: 'Which word is spelled correctly?',
        options: [
          { text: 'Recieve', isCorrect: false },
          { text: 'Receive', isCorrect: true },
          { text: 'Receve', isCorrect: false },
          { text: 'Receeve', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: true, participated: true, canReset: true, score: 85 }
  },
  {
    _id: 'daily-4',
    title: 'Geography Quest',
    description: 'Explore the world through fun geography questions about countries, capitals, and landmarks!',
    type: 'daily',
    category: 'geography',
    difficulty: 'easy',
    xpReward: 25,
    timeLimit: 6,
    participantCount: 1156,
    questions: [
      {
        question: 'What is the capital of France?',
        options: [
          { text: 'London', isCorrect: false },
          { text: 'Berlin', isCorrect: false },
          { text: 'Paris', isCorrect: true },
          { text: 'Madrid', isCorrect: false }
        ]
      },
      {
        question: 'Which continent is Egypt located in?',
        options: [
          { text: 'Asia', isCorrect: false },
          { text: 'Africa', isCorrect: true },
          { text: 'Europe', isCorrect: false },
          { text: 'South America', isCorrect: false }
        ]
      },
      {
        question: 'What is the largest ocean on Earth?',
        options: [
          { text: 'Atlantic Ocean', isCorrect: false },
          { text: 'Indian Ocean', isCorrect: false },
          { text: 'Pacific Ocean', isCorrect: true },
          { text: 'Arctic Ocean', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-5',
    title: 'History Heroes',
    description: 'Learn about important historical events and famous figures in this fun quiz!',
    type: 'daily',
    category: 'history',
    difficulty: 'easy',
    xpReward: 22,
    timeLimit: 6,
    participantCount: 743,
    questions: [
      {
        question: 'Who was the first President of the United States?',
        options: [
          { text: 'Thomas Jefferson', isCorrect: false },
          { text: 'George Washington', isCorrect: true },
          { text: 'John Adams', isCorrect: false },
          { text: 'Benjamin Franklin', isCorrect: false }
        ]
      },
      {
        question: 'In which year did World War II end?',
        options: [
          { text: '1944', isCorrect: false },
          { text: '1945', isCorrect: true },
          { text: '1946', isCorrect: false },
          { text: '1943', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-16',
    title: 'Animal Kingdom',
    description: 'Discover fascinating facts about animals from around the world!',
    type: 'daily',
    category: 'biology',
    difficulty: 'easy',
    xpReward: 18,
    timeLimit: 5,
    participantCount: 967,
    questions: [
      {
        question: 'What is the fastest land animal?',
        options: [
          { text: 'Lion', isCorrect: false },
          { text: 'Cheetah', isCorrect: true },
          { text: 'Horse', isCorrect: false },
          { text: 'Leopard', isCorrect: false }
        ]
      },
      {
        question: 'How many legs does a spider have?',
        options: [
          { text: '6', isCorrect: false },
          { text: '8', isCorrect: true },
          { text: '10', isCorrect: false },
          { text: '4', isCorrect: false }
        ]
      },
      {
        question: 'Which animal is known as the "King of the Jungle"?',
        options: [
          { text: 'Tiger', isCorrect: false },
          { text: 'Elephant', isCorrect: false },
          { text: 'Lion', isCorrect: true },
          { text: 'Gorilla', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-7',
    title: 'Color & Art Fun',
    description: 'Test your knowledge of colors, famous artworks, and creative concepts!',
    type: 'daily',
    category: 'art',
    difficulty: 'easy',
    xpReward: 15,
    timeLimit: 4,
    participantCount: 521,
    questions: [
      {
        question: 'What are the three primary colors?',
        options: [
          { text: 'Red, Yellow, Blue', isCorrect: true },
          { text: 'Red, Green, Blue', isCorrect: false },
          { text: 'Yellow, Orange, Red', isCorrect: false },
          { text: 'Blue, Purple, Green', isCorrect: false }
        ]
      },
      {
        question: 'Who painted the Mona Lisa?',
        options: [
          { text: 'Picasso', isCorrect: false },
          { text: 'Van Gogh', isCorrect: false },
          { text: 'Leonardo da Vinci', isCorrect: true },
          { text: 'Michelangelo', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-8',
    title: 'Space Adventure',
    description: 'Blast off into space knowledge with questions about planets, stars, and astronauts!',
    type: 'daily',
    category: 'astronomy',
    difficulty: 'easy',
    xpReward: 28,
    timeLimit: 7,
    participantCount: 1089,
    questions: [
      {
        question: 'How many planets are in our solar system?',
        options: [
          { text: '7', isCorrect: false },
          { text: '8', isCorrect: true },
          { text: '9', isCorrect: false },
          { text: '10', isCorrect: false }
        ]
      },
      {
        question: 'What is the name of Earth\'s natural satellite?',
        options: [
          { text: 'Sun', isCorrect: false },
          { text: 'Mars', isCorrect: false },
          { text: 'Moon', isCorrect: true },
          { text: 'Venus', isCorrect: false }
        ]
      },
      {
        question: 'Which planet is known as the "Red Planet"?',
        options: [
          { text: 'Venus', isCorrect: false },
          { text: 'Jupiter', isCorrect: false },
          { text: 'Mars', isCorrect: true },
          { text: 'Saturn', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-9',
    title: 'Food & Nutrition',
    description: 'Learn about healthy eating, food groups, and cooking basics in this tasty quiz!',
    type: 'daily',
    category: 'health',
    difficulty: 'easy',
    xpReward: 20,
    timeLimit: 5,
    participantCount: 678,
    questions: [
      {
        question: 'Which food group do apples belong to?',
        options: [
          { text: 'Vegetables', isCorrect: false },
          { text: 'Fruits', isCorrect: true },
          { text: 'Grains', isCorrect: false },
          { text: 'Dairy', isCorrect: false }
        ]
      },
      {
        question: 'What vitamin do we get from sunlight?',
        options: [
          { text: 'Vitamin A', isCorrect: false },
          { text: 'Vitamin C', isCorrect: false },
          { text: 'Vitamin D', isCorrect: true },
          { text: 'Vitamin B', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false, canReset: true }
  },
  {
    _id: 'daily-10',
    title: 'Sports Trivia',
    description: 'Score big with questions about popular sports, rules, and famous athletes!',
    type: 'daily',
    category: 'sports',
    difficulty: 'easy',
    xpReward: 24,
    timeLimit: 6,
    participantCount: 834,
    questions: [
      {
        question: 'How many players are on a basketball team on the court at one time?',
        options: [
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: true },
          { text: '6', isCorrect: false },
          { text: '7', isCorrect: false }
        ]
      },
      {
        question: 'In which sport would you perform a slam dunk?',
        options: [
          { text: 'Tennis', isCorrect: false },
          { text: 'Soccer', isCorrect: false },
          { text: 'Basketball', isCorrect: true },
          { text: 'Baseball', isCorrect: false }
        ]
      },
      {
        question: 'How many strikes result in an out in baseball?',
        options: [
          { text: '2', isCorrect: false },
          { text: '3', isCorrect: true },
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-11',
    title: 'Music Basics',
    description: 'Tune into the world of music with questions about instruments, notes, and famous songs!',
    type: 'daily',
    category: 'music',
    difficulty: 'easy',
    xpReward: 19,
    timeLimit: 5,
    participantCount: 456,
    questions: [
      {
        question: 'How many strings does a standard guitar have?',
        options: [
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: false },
          { text: '6', isCorrect: true },
          { text: '7', isCorrect: false }
        ]
      },
      {
        question: 'Which instrument has black and white keys?',
        options: [
          { text: 'Guitar', isCorrect: false },
          { text: 'Piano', isCorrect: true },
          { text: 'Drums', isCorrect: false },
          { text: 'Violin', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-12',
    title: 'General Knowledge Starter',
    description: 'A mix of easy questions covering various topics - perfect for beginners!',
    type: 'daily',
    category: 'general',
    difficulty: 'easy',
    xpReward: 16,
    timeLimit: 4,
    participantCount: 1523,
    questions: [
      {
        question: 'How many days are there in a week?',
        options: [
          { text: '6', isCorrect: false },
          { text: '7', isCorrect: true },
          { text: '8', isCorrect: false },
          { text: '5', isCorrect: false }
        ]
      },
      {
        question: 'What color do you get when you mix red and yellow?',
        options: [
          { text: 'Purple', isCorrect: false },
          { text: 'Green', isCorrect: false },
          { text: 'Orange', isCorrect: true },
          { text: 'Blue', isCorrect: false }
        ]
      },
      {
        question: 'How many sides does a triangle have?',
        options: [
          { text: '2', isCorrect: false },
          { text: '3', isCorrect: true },
          { text: '4', isCorrect: false },
          { text: '5', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-13',
    title: 'Weather Wonders',
    description: 'Learn about different weather patterns, seasons, and climate facts!',
    type: 'daily',
    category: 'science',
    difficulty: 'easy',
    xpReward: 21,
    timeLimit: 5,
    participantCount: 789,
    questions: [
      {
        question: 'What causes rain?',
        options: [
          { text: 'Clouds releasing water', isCorrect: true },
          { text: 'Wind blowing hard', isCorrect: false },
          { text: 'The sun getting hot', isCorrect: false },
          { text: 'Trees growing tall', isCorrect: false }
        ]
      },
      {
        question: 'How many seasons are there in a year?',
        options: [
          { text: '3', isCorrect: false },
          { text: '4', isCorrect: true },
          { text: '5', isCorrect: false },
          { text: '6', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-14',
    title: 'Number Patterns',
    description: 'Discover the fun in numbers with simple patterns and counting challenges!',
    type: 'daily',
    category: 'math',
    difficulty: 'easy',
    xpReward: 17,
    timeLimit: 4,
    participantCount: 612,
    questions: [
      {
        question: 'What comes next in this pattern: 2, 4, 6, 8, ?',
        options: [
          { text: '9', isCorrect: false },
          { text: '10', isCorrect: true },
          { text: '11', isCorrect: false },
          { text: '12', isCorrect: false }
        ]
      },
      {
        question: 'How many minutes are in one hour?',
        options: [
          { text: '50', isCorrect: false },
          { text: '60', isCorrect: true },
          { text: '70', isCorrect: false },
          { text: '100', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-15',
    title: 'Body & Health',
    description: 'Learn about the human body and healthy habits with these simple questions!',
    type: 'daily',
    category: 'health',
    difficulty: 'easy',
    xpReward: 23,
    timeLimit: 6,
    participantCount: 891,
    questions: [
      {
        question: 'How many bones are in an adult human body?',
        options: [
          { text: '196', isCorrect: false },
          { text: '206', isCorrect: true },
          { text: '216', isCorrect: false },
          { text: '186', isCorrect: false }
        ]
      },
      {
        question: 'Which organ pumps blood through your body?',
        options: [
          { text: 'Brain', isCorrect: false },
          { text: 'Lungs', isCorrect: false },
          { text: 'Heart', isCorrect: true },
          { text: 'Stomach', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-16',
    title: 'Technology Basics',
    description: 'Test your knowledge of computers, internet, and everyday technology!',
    type: 'daily',
    category: 'technology',
    difficulty: 'easy',
    xpReward: 26,
    timeLimit: 6,
    participantCount: 1234,
    questions: [
      {
        question: 'What does "WWW" stand for?',
        options: [
          { text: 'World Wide Web', isCorrect: true },
          { text: 'World Web Wide', isCorrect: false },
          { text: 'Web World Wide', isCorrect: false },
          { text: 'Wide World Web', isCorrect: false }
        ]
      },
      {
        question: 'Which company created the iPhone?',
        options: [
          { text: 'Google', isCorrect: false },
          { text: 'Apple', isCorrect: true },
          { text: 'Microsoft', isCorrect: false },
          { text: 'Samsung', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'daily-17',
    title: 'Famous Landmarks',
    description: 'Travel the world virtually by identifying famous buildings and monuments!',
    type: 'daily',
    category: 'geography',
    difficulty: 'easy',
    xpReward: 20,
    timeLimit: 5,
    participantCount: 987,
    questions: [
      {
        question: 'In which city would you find the Statue of Liberty?',
        options: [
          { text: 'Boston', isCorrect: false },
          { text: 'New York', isCorrect: true },
          { text: 'Philadelphia', isCorrect: false },
          { text: 'Washington D.C.', isCorrect: false }
        ]
      },
      {
        question: 'The Eiffel Tower is located in which country?',
        options: [
          { text: 'Italy', isCorrect: false },
          { text: 'Spain', isCorrect: false },
          { text: 'France', isCorrect: true },
          { text: 'Germany', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  }
];

const DUMMY_CHALLENGES = [
  {
    _id: 'challenge-1',
    title: 'Mathematics Master',
    description: 'Prove your mathematical prowess with algebra, geometry, and calculus problems.',
    type: 'weekly',
    category: 'math',
    difficulty: 'intermediate',
    xpReward: 100,
    timeLimit: 30,
    participantCount: 2341,
    questions: [
      {
        question: 'Solve for x: 2x + 5 = 13',
        options: [
          { text: 'x = 4', isCorrect: true },
          { text: 'x = 3', isCorrect: false },
          { text: 'x = 5', isCorrect: false },
          { text: 'x = 6', isCorrect: false }
        ]
      },
      {
        question: 'What is the area of a circle with radius 5?',
        options: [
          { text: '25π', isCorrect: true },
          { text: '10π', isCorrect: false },
          { text: '5π', isCorrect: false },
          { text: '15π', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  },
  {
    _id: 'challenge-2',
    title: 'Science Explorer Pro',
    description: 'Advanced science questions covering physics, chemistry, and biology concepts.',
    type: 'weekly',
    category: 'science',
    difficulty: 'intermediate',
    xpReward: 120,
    timeLimit: 25,
    participantCount: 1876,
    questions: [
      {
        question: 'What is the chemical symbol for gold?',
        options: [
          { text: 'Go', isCorrect: false },
          { text: 'Au', isCorrect: true },
          { text: 'Gd', isCorrect: false },
          { text: 'Ag', isCorrect: false }
        ]
      },
      {
        question: 'What is the speed of light in a vacuum?',
        options: [
          { text: '300,000 km/s', isCorrect: false },
          { text: '299,792,458 m/s', isCorrect: true },
          { text: '186,000 mi/s', isCorrect: false },
          { text: '250,000 km/s', isCorrect: false }
        ]
      }
    ],
    userStatus: { completed: false, participated: false }
  }
];

// Achievement Unlock Modal Component
const AchievementUnlockModal = ({ achievements, onClose }) => {
  const [currentAchievementIndex, setCurrentAchievementIndex] = useState(0);

  useEffect(() => {
    if (achievements.length === 0) return;

    const timer = setTimeout(() => {
      if (currentAchievementIndex < achievements.length - 1) {
        setCurrentAchievementIndex(currentAchievementIndex + 1);
      } else {
        setTimeout(onClose, 2000);
      }
    }, 2500);

    return () => clearTimeout(timer);
  }, [currentAchievementIndex, achievements.length, onClose]);

  if (achievements.length === 0) return null;

  const currentAchievement = achievements[currentAchievementIndex];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform animate-bounce">
        <div className="mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          
          <h2 className="text-3xl font-bold text-black mb-2">Achievement Unlocked!</h2>
          <p className="text-gray-600 text-sm">
            {currentAchievementIndex + 1} of {achievements.length}
          </p>
        </div>

        <div className="mb-6">
          <div className="text-6xl mb-4">{currentAchievement.icon}</div>
          <h3 className="text-2xl font-bold text-black mb-2">{currentAchievement.title}</h3>
          <p className="text-gray-600 mb-4">{currentAchievement.description}</p>
          
          <div className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4 ${
            currentAchievement.rarity === 'common' ? 'bg-gray-200 text-gray-800' :
            currentAchievement.rarity === 'uncommon' ? 'bg-green-200 text-green-800' :
            currentAchievement.rarity === 'rare' ? 'bg-blue-200 text-blue-800' :
            currentAchievement.rarity === 'epic' ? 'bg-purple-200 text-purple-800' :
            'bg-yellow-200 text-yellow-800'
          }`}>
            {currentAchievement.rarity}
          </div>

          <div className="flex justify-center space-x-4">
            {currentAchievement.rewards?.xp > 0 && (
              <div className="flex items-center space-x-1 bg-yellow-50 px-3 py-1 rounded-full">
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-semibold text-yellow-700">+{currentAchievement.rewards.xp} XP</span>
              </div>
            )}
            {currentAchievement.rewards?.streakFreeze > 0 && (
              <div className="flex items-center space-x-1 bg-blue-50 px-3 py-1 rounded-full">
                <span className="text-blue-500">❄️</span>
                <span className="text-sm font-semibold text-blue-700">+{currentAchievement.rewards.streakFreeze}</span>
              </div>
            )}
          </div>
        </div>

        {achievements.length > 1 && (
          <div className="flex justify-center space-x-2 mb-4">
            {achievements.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === currentAchievementIndex ? 'bg-yellow-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
        >
          {achievements.length > 1 && currentAchievementIndex < achievements.length - 1 ? 'Next' : 'Continue'}
        </button>
      </div>
    </div>
  );
};

const Challenges = ({ onCelebration }) => {
  const { user, updateUser } = useAuth();
  const { 
    currentXP, 
    currentLevel, 
    userRank, 
    addXP, 
    syncFromBackend, 
    registerXPListener, 
    forceSyncFromBackend,
    connectionStatus,
    isSyncing
  } = useXP();
  
  const [challenges, setChallenges] = useState([]);
  const [dailyChallenges, setDailyChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Achievement and real-time state
  const [showAchievements, setShowAchievements] = useState(false);
  const [unlockedAchievements, setUnlockedAchievements] = useState([]);
  const [syncingChallenges, setSyncingChallenges] = useState(new Set());

  // Real-time sync setup
  useChallengeSync(
    // Challenge completion handler
    (challengeData) => {
      console.log(' Real-time challenge completion received:', challengeData);
      
      // Update local challenge status
      updateLocalChallengeStatus(challengeData.challengeId, {
        completed: true,
        participated: true,
        score: challengeData.score
      });
      
      // Remove from syncing state
      setSyncingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(challengeData.challengeId);
        return newSet;
      });
      
      // Show celebration if available
      // if (onCelebration) {
      //   onCelebration({
      //     type: 'xp',
      //     amount: challengeData.xpGained,
      //     message: `🎯 Challenge completed! ${challengeData.score}% score, +${challengeData.xpGained} XP earned!`
      //   });
      // }
    },
    // Achievement unlock handler
    (achievementData) => {
      console.log('Real-time achievement unlock received:', achievementData);
      
      if (achievementData.achievements?.length > 0) {
        setUnlockedAchievements(achievementData.achievements);
        setShowAchievements(true);
        
        // Show individual achievement celebrations
        achievementData.achievements.forEach((achievement, index) => {
          setTimeout(() => {
            if (onCelebration) {
              onCelebration({
                type: 'achievement',
                achievement,
                message: `🏆 Achievement Unlocked: ${achievement.title}!`
              });
            }
          }, index * 1000);
        });
      }
    }
  );

  // Real-time XP listener for live updates
  useEffect(() => {
    const unregister = registerXPListener((xpData) => {
      console.log('🎯 Challenges received XP update:', xpData);
      
      // Handle different types of XP updates
      if (xpData.type === 'challenge_completion') {
        // Update challenge status in local state
        updateLocalChallengeStatus(xpData.challengeId, {
          completed: true,
          participated: true,
          score: xpData.score
        });
        
        // Show celebration if not already shown
        if (onCelebration) {
          onCelebration({
            type: 'xp',
            amount: xpData.amount,
            message: `🎯 Challenge completed! +${xpData.amount} XP earned!`
          });
        }
      }
    });

    return unregister;
  }, [registerXPListener, onCelebration]);

  // Setup real-time event listeners for challenges
  useEffect(() => {
    // Challenge completion listener
    const handleChallengeCompletion = (event) => {
      console.log('Challenge completion event received:', event.detail);
      
      updateLocalChallengeStatus(event.detail.challengeId, {
        completed: true,
        participated: true,
        score: event.detail.score
      });
      
      // Remove from syncing state
      setSyncingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(event.detail.challengeId);
        return newSet;
      });
    };

    // Achievement unlock listener
    const handleAchievementUnlock = (event) => {
      console.log('Achievement unlock event received:', event.detail);
      
      if (event.detail.achievements?.length > 0) {
        setUnlockedAchievements(event.detail.achievements);
        setShowAchievements(true);
      }
    };

    window.addEventListener('edugame_challenge_completed', handleChallengeCompletion);
    window.addEventListener('edugame_achievements_unlocked', handleAchievementUnlock);

    return () => {
      window.removeEventListener('edugame_challenge_completed', handleChallengeCompletion);
      window.removeEventListener('edugame_achievements_unlocked', handleAchievementUnlock);
    };
  }, []);

  useEffect(() => {
    fetchChallenges();
    fetchDailyChallenges();
  }, []);

  // Update local challenge status
  const updateLocalChallengeStatus = useCallback((challengeId, status) => {
    const updateChallengeList = (challengeList) => 
      challengeList.map(challenge => 
        challenge._id === challengeId 
          ? { ...challenge, userStatus: { ...challenge.userStatus, ...status } }
          : challenge
      );
    
    setChallenges(updateChallengeList);
    setDailyChallenges(updateChallengeList);
  }, []);

  const fetchChallenges = async () => {
    try {
      const result = await DataService.getChallenges();
      if (result.success && result.data.challenges?.length > 0) {
        setChallenges(result.data.challenges);
      } else {
        console.log(' No challenges from API, using dummy data');
        setChallenges(DUMMY_CHALLENGES);
      }
    } catch (error) {
      console.error('Error fetching challenges:', error);
      setChallenges(DUMMY_CHALLENGES);
    }
  };

  const fetchDailyChallenges = async () => {
    try {
      const result = await DataService.getDailyChallenges();
      if (result.success && result.data.challenges?.length > 0) {
        setDailyChallenges(result.data.challenges);
      } else {
        console.log('No daily challenges from API, using dummy data');
        setDailyChallenges(DUMMY_DAILY_CHALLENGES);
      }
    } catch (error) {
      console.error('Error fetching daily challenges:', error);
      setDailyChallenges(DUMMY_DAILY_CHALLENGES);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchChallenges(), 
      fetchDailyChallenges(), 
      forceSyncFromBackend?.()
    ]);
    setIsRefreshing(false);
  };

  //Create achievement for challenge completion
  const createChallengeAchievement = async (challenge, score, xpGained) => {
    try {
      // Generate achievement data based on challenge performance
      const achievementData = {
        _id: `achievement_${challenge._id}_${Date.now()}`,
        title: getChallengeAchievementTitle(challenge, score),
        description: getChallengeAchievementDescription(challenge, score),
        icon: getChallengeAchievementIcon(challenge, score),
        category: 'challenges',
        type: getChallengeAchievementType(score),
        rarity: getChallengeAchievementRarity(challenge, score),
        unlocked: true,
        unlockedAt: new Date().toISOString(),
        rewards: {
          xp: Math.round(xpGained * 0.2), // 20% bonus XP for achievement
          streakFreeze: score >= 90 ? 1 : 0 // Bonus freeze for excellent performance
        },
        progress: {
          current: 1,
          target: 1,
          percentage: 100
        },
        metadata: {
          challengeId: challenge._id,
          challengeTitle: challenge.title,
          challengeCategory: challenge.category,
          score: score,
          difficulty: challenge.difficulty,
          completedAt: new Date().toISOString()
        }
      };

      // Try to save to backend
      try {
        const result = await DataService.createAchievement?.(achievementData);
        if (result?.success) {
          console.log('Achievement saved to backend:', achievementData.title);
          return result.data;
        }
      } catch (backendError) {
        console.warn('Backend achievement save failed, using local:', backendError);
      }

      // Return local achievement data
      return achievementData;
      
    } catch (error) {
      console.error('Error creating challenge achievement:', error);
      return null;
    }
  };

  // Helper functions for achievement generation
  const getChallengeAchievementTitle = (challenge, score) => {
    if (score === 100) {
      return `Perfect ${challenge.category} Master!`;
    } else if (score >= 90) {
      return `${challenge.category} Expert`;
    } else if (score >= 80) {
      return `${challenge.category} Scholar`;
    } else if (score >= 70) {
      return `${challenge.category} Student`;
    } else {
      return `${challenge.category} Participant`;
    }
  };

  const getChallengeAchievementDescription = (challenge, score) => {
    if (score === 100) {
      return `Achieved a perfect score on "${challenge.title}" - flawless performance!`;
    } else if (score >= 90) {
      return `Scored ${score}% on "${challenge.title}" - excellent work!`;
    } else if (score >= 80) {
      return `Scored ${score}% on "${challenge.title}" - great job!`;
    } else if (score >= 70) {
      return `Completed "${challenge.title}" with ${score}% - good effort!`;
    } else {
      return `Completed "${challenge.title}" - every step counts!`;
    }
  };

  const getChallengeAchievementIcon = (challenge, score) => {
    if (score === 100) return '🏆';
    if (score >= 90) return '🥇';
    if (score >= 80) return '🥈';
    if (score >= 70) return '🥉';
    return '🎯';
  };

  const getChallengeAchievementType = (score) => {
    if (score === 100) return 'platinum';
    if (score >= 90) return 'gold';
    if (score >= 80) return 'silver';
    return 'bronze';
  };

  const getChallengeAchievementRarity = (challenge, score) => {
    if (score === 100) return 'legendary';
    if (score >= 95) return 'epic';
    if (score >= 85) return 'rare';
    if (score >= 75) return 'uncommon';
    return 'common';
  };

  const resetChallenge = async (challengeId) => {
    try {
      // Try to reset via backend first
      const result = await DataService.resetChallenge?.(challengeId);
      
      if (result?.success) {
        console.log('Challenge reset via backend:', challengeId);
        toast.success('Challenge reset successfully!');
      } else {
        console.log('Backend reset not available, using local reset');
        toast.success('Challenge reset! (Local mode)');
      }
      
      // Reset local status regardless of backend response
      updateLocalChallengeStatus(challengeId, {
        completed: false,
        participated: false,
        score: null
      });
      
    } catch (error) {
      console.error('Error resetting challenge:', error);
      
      // Fallback to local reset
      updateLocalChallengeStatus(challengeId, {
        completed: false,
        participated: false,
        score: null
      });
      
      toast.success('Challenge reset! (Offline mode)');
    }
  };

  const startChallenge = async (challengeId) => {
    try {
      const result = await DataService.startChallenge(challengeId);
      if (result.success) {
        setSelectedChallenge(result.data.challenge);
        setQuizAnswers({});
      } else {
        // Fallback to local challenge data
        const allChallenges = [...challenges, ...dailyChallenges];
        const challenge = allChallenges.find(c => c._id === challengeId);
        if (challenge) {
          setSelectedChallenge(challenge);
          setQuizAnswers({});
        } else {
          toast.error('Challenge not found');
        }
      }
    } catch (error) {
      console.error('Error starting challenge:', error);
      const allChallenges = [...challenges, ...dailyChallenges];
      const challenge = allChallenges.find(c => c._id === challengeId);
      if (challenge) {
        setSelectedChallenge(challenge);
        setQuizAnswers({});
      } else {
        toast.error('Failed to start challenge');
      }
    }
  };

  // ENHANCED: Challenge submission with comprehensive sync and achievement creation
  const submitChallenge = async () => {
    if (!selectedChallenge) return;

    setIsSubmitting(true);
    setSyncingChallenges(prev => new Set([...prev, selectedChallenge._id]));
    
    console.log('Submitting challenge with comprehensive sync:', selectedChallenge._id);

    try {
      const answers = Object.entries(quizAnswers).map(([questionIndex, selectedAnswer]) => ({
        questionIndex: parseInt(questionIndex),
        selectedAnswer,
        timeSpent: 30
      }));

      // Calculate local score for immediate feedback
      let localScore = 0;
      let correctAnswers = 0;
      const totalQuestions = selectedChallenge.questions?.length || 0;

      selectedChallenge.questions?.forEach((question, index) => {
        const userAnswer = quizAnswers[index];
        const correctOption = question.options?.find(opt => opt.isCorrect);
        if (correctOption && correctOption.text === userAnswer) {
          correctAnswers++;
        }
      });
      
      localScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
      const localXPGained = Math.round(selectedChallenge.xpReward * (localScore / 100));

      console.log(`Local calculation: ${correctAnswers}/${totalQuestions} = ${localScore}%, XP: ${localXPGained}`);

      // Show immediate celebration
      if (onCelebration) {
        onCelebration({
          type: 'xp',
          amount: localXPGained,
          message: `🎯 Challenge completed! Score: ${localScore}%`
        });
      }

      // Update local state immediately
      updateLocalChallengeStatus(selectedChallenge._id, {
        completed: true,
        participated: true,
        score: localScore
      });

      // It will create achievement for challenge completion
      try {
        const achievementData = await createChallengeAchievement(selectedChallenge, localScore, localXPGained);
        if (achievementData) {
          console.log('Challenge achievement created:', achievementData.title);
          
          // Show achievement celebration
          setTimeout(() => {
            if (onCelebration) {
              onCelebration({
                type: 'achievement',
                achievement: achievementData,
                message: `🏆 Achievement Unlocked: ${achievementData.title}!`
              });
            }
          }, 1000);
          
          // Add to unlocked achievements for modal display
          setUnlockedAchievements(prev => [...prev, achievementData]);
          setShowAchievements(true);
        }
      } catch (achievementError) {
        console.warn('Failed to create challenge achievement:', achievementError);
      }

      // Submit to backend for comprehensive sync
      try {
        console.log('Submitting to backend for comprehensive sync...');
        const backendResult = await DataService.submitChallenge(selectedChallenge._id, answers, 300);
        
        if (backendResult.success) {
          console.log('Backend submission successful:', backendResult.data);
          
          // Use backend calculated values if available
          const finalScore = backendResult.data.score || backendResult.data.percentage || localScore;
          const finalXPGained = backendResult.data.xpGained || localXPGained;
          
          // Update user context with comprehensive data
          if (updateUser && backendResult.data.userStats) {
            updateUser({
              gameData: {
                ...user?.gameData,
                totalXP: backendResult.data.userStats.totalXP,
                level: backendResult.data.userStats.level,
                weeklyProgress: backendResult.data.userStats.weeklyProgress,
                rank: backendResult.data.userStats.rank,
                currentStreak: backendResult.data.userStats.currentStreak
              }
            });
          }

          // Handle achievements if unlocked
          if (backendResult.data.achievementsUnlocked?.length > 0) {
            console.log(`${backendResult.data.achievementsUnlocked.length} achievements unlocked!`);
            setUnlockedAchievements(prev => [...prev, ...backendResult.data.achievementsUnlocked]);
            setShowAchievements(true);

            // Calculate total achievement XP
            const achievementXP = backendResult.data.achievementsUnlocked.reduce(
              (sum, ach) => sum + (ach.rewards?.xp || 0), 0
            );

            // Show comprehensive success message
            let successMessage = `🎯 Challenge completed! +${finalXPGained} XP earned!`;
            
            if (backendResult.data.achievementsUnlocked.length === 1) {
              successMessage += ` 🏆 Achievement unlocked: "${backendResult.data.achievementsUnlocked[0].title}"`;
            } else {
              successMessage += ` 🏆 ${backendResult.data.achievementsUnlocked.length} achievements unlocked!`;
            }
            
            if (achievementXP > 0) {
              successMessage += ` (+${achievementXP} bonus XP)`;
            }
            
            if (backendResult.data.leveledUp) {
              successMessage += ` 🎉 Level ${backendResult.data.newLevel} reached!`;
            }
            
            if (backendResult.data.rankImproved) {
              successMessage += ` 📈 Rank improved to #${backendResult.data.rankData?.newRank}!`;
            }
            
            toast.success(successMessage, { 
              toastId: 'challenge-success-comprehensive', 
              autoClose: 7000 
            });
          } else {
            // Regular success message
            let successMessage = `🎯 Challenge completed! +${finalXPGained} XP earned!`;
            
            if (backendResult.data.leveledUp) {
              successMessage += ` 🎉 Level ${backendResult.data.newLevel} reached!`;
            }
            
            if (backendResult.data.rankImproved) {
              successMessage += ` 📈 Rank improved to #${backendResult.data.rankData?.newRank}!`;
            }
            
            toast.success(successMessage, { 
              toastId: 'challenge-success', 
              autoClose: 5000 
            });
          }

          // Update final local state with backend data
          updateLocalChallengeStatus(selectedChallenge._id, {
            completed: true,
            participated: true,
            score: finalScore
          });

        } else {
          console.warn('Backend submission failed, using local calculation:', backendResult.error);
          
          // Still add XP locally if backend fails
          if (addXP) {
            await addXP(localXPGained, 'challenge_completion', {
              challengeId: selectedChallenge._id,
              challengeTitle: selectedChallenge.title,
              score: localScore,
              source: 'local_fallback'
            });
          }
          
          toast.success(`🎯 Challenge completed! +${localXPGained} XP earned!`, {
            toastId: 'challenge-local-success'
          });
        }
      } catch (backendError) {
        console.warn('Backend submission failed, using local XP addition:', backendError);
        
        // Fallback to local XP addition
        if (addXP) {
          await addXP(localXPGained, 'challenge_completion', {
            challengeId: selectedChallenge._id,
            challengeTitle: selectedChallenge.title,
            score: localScore,
            source: 'backend_fallback'
          });
        }
        
        toast.success(`🎯 Challenge completed! +${localXPGained} XP earned! (Offline mode)`, {
          toastId: 'challenge-offline-success'
        });
      }

      // Close modal
      setSelectedChallenge(null);
      setQuizAnswers({});
      
      // Refresh data after delay for backend processing
      setTimeout(() => {
        handleRefresh();
      }, 2000);
      
    } catch (error) {
      console.error('Critical error in challenge submission:', error);
      toast.error('Failed to submit challenge. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSyncingChallenges(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedChallenge._id);
        return newSet;
      });
    }
  };

  const handleAnswerSelect = (questionIndex, selectedAnswer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionIndex]: selectedAnswer
    }));
  };

  const closeModal = () => {
    setSelectedChallenge(null);
    setQuizAnswers({});
  };

  const closeAchievementModal = () => {
    setShowAchievements(false);
    setUnlockedAchievements([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading challenges...</p>
        </div>
      </div>
    );
  }

  // Quiz Modal
  if (selectedChallenge) {
    const answeredQuestions = Object.keys(quizAnswers).length;
    const totalQuestions = selectedChallenge.questions?.length || 0;
    const canSubmit = answeredQuestions === totalQuestions;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-black">{selectedChallenge.title}</h2>
                <p className="text-gray-600">{selectedChallenge.description}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-1">
                    <Zap className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm text-gray-600">Reward: {selectedChallenge.xpReward} XP</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    Current XP: {currentXP.toLocaleString()}
                  </div>
                  {connectionStatus !== 'connected' && (
                    <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                      Offline Mode
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              {selectedChallenge.questions?.map((question, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg">
                  <h3 className="text-lg font-semibold text-black mb-4">
                    Question {index + 1}: {question.question}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {question.options?.map((option, optIndex) => (
                      <button
                        key={optIndex}
                        onClick={() => handleAnswerSelect(index, option.text)}
                        className={`p-3 text-left border rounded-lg transition-all ${
                          quizAnswers[index] === option.text
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        {option.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                <span className={canSubmit ? 'text-green-600 font-medium' : ''}>
                  {answeredQuestions}/{totalQuestions} questions answered
                </span>
                {!canSubmit && (
                  <div className="text-orange-600 text-xs mt-1">
                    Please answer all questions to submit
                  </div>
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitChallenge}
                  disabled={!canSubmit || isSubmitting}
                  className="px-6 py-2 bg-gradient-to-r from-green-400 to-purple-500 text-white rounded-lg hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? (
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    `Submit & Earn ${selectedChallenge.xpReward} XP`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Achievement Unlock Modal */}
      {showAchievements && unlockedAchievements.length > 0 && (
        <AchievementUnlockModal 
          achievements={unlockedAchievements} 
          onClose={closeAchievementModal} 
        />
      )}

      {/* Enhanced Header with Real-time Data */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Challenges</h2>
          <p className="text-gray-600">Test your knowledge and earn XP</p>
          {connectionStatus !== 'connected' && (
            <p className="text-sm text-orange-600 mt-1">
              ⚠️ Some features may be limited in offline mode
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {/* Real-time stats display */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1">
              <Zap className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold text-yellow-700">
                {currentXP.toLocaleString()} XP
              </span>
            </div>
          </div>
          <div className="bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            <div className="flex items-center space-x-1">
              <span className="text-blue-600 text-xs">LVL</span>
              <span className="font-semibold text-blue-700">{currentLevel}</span>
            </div>
          </div>
          <div className="bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
            <div className="flex items-center space-x-1">
              <span className="text-purple-600 text-xs">RANK</span>
              <span className="font-semibold text-purple-700">#{userRank}</span>
            </div>
          </div>
          
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isSyncing}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${(isRefreshing || isSyncing) ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : isSyncing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* Daily Challenges */}
      {dailyChallenges.length > 0 && (
        <AnimatedCard delay={0}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-black">Today's Challenges</h3>
            <div className="text-sm text-gray-500">
              Available XP: {dailyChallenges.filter(c => !c.userStatus?.completed).reduce((sum, c) => sum + c.xpReward, 0)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dailyChallenges.slice(0, 3).map((challenge, i) => {
              const isCompleted = challenge.userStatus?.completed;
              const isSyncing = syncingChallenges.has(challenge._id);
              
              return (
                <div key={challenge._id} className="p-4 border border-gray-200 rounded-lg hover:border-purple-200 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-semibold text-black">{challenge.title}</h4>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Daily
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{challenge.description}</p>
                  
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <Zap className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm text-gray-600">{challenge.xpReward} XP</span>
                      </div>
                      {challenge.timeLimit && (
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-600">{challenge.timeLimit}m</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2">
                    <button
                      onClick={() => startChallenge(challenge._id)}
                      disabled={isCompleted || isSyncing}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                        isCompleted
                          ? 'bg-green-100 text-green-800 cursor-not-allowed'
                          : isSyncing
                          ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-400 to-purple-500 text-white hover:shadow-lg'
                      }`}
                    >
                      {isSyncing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Syncing...</span>
                        </div>
                      ) : isCompleted ? (
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Completed ({challenge.userStatus.score}%)</span>
                        </div>
                      ) : (
                        `Start Challenge (+${challenge.xpReward} XP)`
                      )}
                    </button>
                    
                    {isCompleted && challenge.userStatus?.canReset !== false && (
                      <button
                        onClick={() => resetChallenge(challenge._id)}
                        className="w-full py-1 px-3 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset & Retake</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </AnimatedCard>
      )}

      {/* All Challenges */}
      {challenges.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {challenges.map((challenge, i) => {
            const isCompleted = challenge.userStatus?.completed;
            const isSyncing = syncingChallenges.has(challenge._id);
            
            return (
              <AnimatedCard key={challenge._id} delay={i * 100}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-black line-clamp-2">{challenge.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ml-2 ${
                      challenge.type === 'daily' ? 'bg-green-100 text-green-800' :
                      challenge.type === 'weekly' ? 'bg-purple-100 text-purple-800' :
                      challenge.type === 'monthly' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {challenge.type}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-3">{challenge.description}</p>
                  
                  <div className="flex items-center flex-wrap gap-4">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-gray-600">{challenge.xpReward} XP</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-gray-600">{challenge.questions?.length || 0} questions</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4 text-purple-500" />
                      <span className="text-sm text-gray-600 capitalize">{challenge.difficulty}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Category</span>
                      <span className="capitalize">{challenge.category}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Participants</span>
                      <span>{challenge.participantCount || 0}</span>
                    </div>
                    {isCompleted && (
                      <div className="flex justify-between text-xs text-green-600 mt-1">
                        <span>Your Score</span>
                        <span>{challenge.userStatus.score || 0}%</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <button 
                      onClick={() => startChallenge(challenge._id)}
                      disabled={isCompleted || isSyncing}
                      className={`w-full py-2 px-4 rounded-lg font-semibold transition-all ${
                        isCompleted 
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                          : isSyncing
                          ? 'bg-blue-100 text-blue-800 cursor-not-allowed'
                          : 'bg-gradient-to-r from-green-400 to-purple-500 text-white hover:shadow-lg transform hover:scale-105'
                      }`}
                    >
                      {isSyncing ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <span>Syncing...</span>
                        </div>
                      ) : isCompleted ? (
                        <div className="flex items-center justify-center space-x-2">
                          <CheckCircle className="w-4 h-4" />
                          <span>Completed ({challenge.userStatus.score}%)</span>
                        </div>
                      ) : (
                        `Start Challenge (+${challenge.xpReward} XP)`
                      )}
                    </button>
                    
                    {isCompleted && challenge.userStatus?.canReset !== false && (
                      <button
                        onClick={() => resetChallenge(challenge._id)}
                        className="w-full py-1 px-3 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all"
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <RefreshCw className="w-3 h-3" />
                          <span>Reset & Retake</span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </AnimatedCard>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">No challenges available</h3>
          <p className="text-gray-400">Check back later for new challenges!</p>
        </div>
      )}
    </div>
  );
};

export default Challenges;