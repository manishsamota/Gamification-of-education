const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edugame');
    console.log(' Connected to MongoDB for seeding');
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

const Achievement = require('../models/Achievement');

const challengeAchievements = [
  {
    title: 'First Steps',
    description: 'Complete your first challenge',
    icon: '🎯',
    category: 'challenges',
    type: 'bronze',
    rarity: 'common',
    criteria: {
      type: 'challenges_completed',
      target: 1,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 50,
      streakFreeze: 1
    }
  },
  {
    title: 'Challenge Rookie',
    description: 'Complete 5 challenges',
    icon: '🏃',
    category: 'challenges',
    type: 'bronze',
    rarity: 'common',
    criteria: {
      type: 'challenges_completed',
      target: 5,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 100,
      streakFreeze: 1
    }
  },
  {
    title: 'Challenge Veteran',
    description: 'Complete 25 challenges',
    icon: '🎖️',
    category: 'challenges',
    type: 'silver',
    rarity: 'uncommon',
    criteria: {
      type: 'challenges_completed',
      target: 25,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 250,
      streakFreeze: 2
    }
  },
  {
    title: 'Challenge Master',
    description: 'Complete 50 challenges',
    icon: '👑',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'challenges_completed',
      target: 50,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 500,
      streakFreeze: 3
    }
  },
  {
    title: 'Perfectionist',
    description: 'Get perfect scores on 3 challenges',
    icon: '💯',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'perfect_scores',
      target: 3,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 300,
      streakFreeze: 3
    }
  },
  {
    title: 'Flawless Victory',
    description: 'Get perfect scores on 10 challenges',
    icon: '🏆',
    category: 'challenges',
    type: 'platinum',
    rarity: 'epic',
    criteria: {
      type: 'perfect_scores',
      target: 10,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 750,
      streakFreeze: 5
    }
  },
  {
    title: 'Daily Dedication',
    description: 'Complete 7 daily challenges',
    icon: '📅',
    category: 'challenges',
    type: 'silver',
    rarity: 'uncommon',
    criteria: {
      type: 'daily_challenges',
      target: 7,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 200,
      streakFreeze: 2
    }
  },
  {
    title: 'Daily Warrior',
    description: 'Complete 30 daily challenges',
    icon: '🗓️',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'daily_challenges',
      target: 30,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 600,
      streakFreeze: 4
    }
  },
  {
    title: 'Math Master',
    description: 'Complete 10 math challenges',
    icon: '🔢',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'category_master',
      target: 10,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 400,
      streakFreeze: 2
    },
    metadata: {
      category: 'math'
    }
  },
  {
    title: 'Science Genius',
    description: 'Complete 10 science challenges',
    icon: '🧪',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'category_master',
      target: 10,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 400,
      streakFreeze: 2
    },
    metadata: {
      category: 'science'
    }
  },
  {
    title: 'History Scholar',
    description: 'Complete 10 history challenges',
    icon: '📜',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'category_master',
      target: 10,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 400,
      streakFreeze: 2
    },
    metadata: {
      category: 'history'
    }
  },
  {
    title: 'Literature Lover',
    description: 'Complete 10 literature challenges',
    icon: '📚',
    category: 'challenges',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'category_master',
      target: 10,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 400,
      streakFreeze: 2
    },
    metadata: {
      category: 'literature'
    }
  },
  // XP-based achievements
  {
    title: 'XP Novice',
    description: 'Earn 1,000 total XP',
    icon: '⚡',
    category: 'xp',
    type: 'bronze',
    rarity: 'common',
    criteria: {
      type: 'total_xp',
      target: 1000,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 100,
      streakFreeze: 1
    }
  },
  {
    title: 'XP Expert',
    description: 'Earn 5,000 total XP',
    icon: '⚡',
    category: 'xp',
    type: 'silver',
    rarity: 'uncommon',
    criteria: {
      type: 'total_xp',
      target: 5000,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 250,
      streakFreeze: 2
    }
  },
  {
    title: 'XP Legend',
    description: 'Earn 10,000 total XP',
    icon: '⚡',
    category: 'xp',
    type: 'gold',
    rarity: 'rare',
    criteria: {
      type: 'total_xp',
      target: 10000,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 500,
      streakFreeze: 3
    }
  },
  // Streak-based achievements
  {
    title: 'Streak Starter',
    description: 'Maintain a 3-day learning streak',
    icon: '🔥',
    category: 'streak',
    type: 'bronze',
    rarity: 'common',
    criteria: {
      type: 'streak_days',
      target: 3,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 75,
      streakFreeze: 1
    }
  },
  {
    title: 'Streak Keeper',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    category: 'streak',
    type: 'silver',
    rarity: 'uncommon',
    criteria: {
      type: 'streak_days',
      target: 7,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 150,
      streakFreeze: 2
    }
  },
  {
    title: 'Streak Champion',
    description: 'Maintain a 30-day learning streak',
    icon: '🔥',
    category: 'streak',
    type: 'platinum',
    rarity: 'epic',
    criteria: {
      type: 'streak_days',
      target: 30,
      timeframe: 'all_time'
    },
    rewards: {
      xp: 1000,
      streakFreeze: 5
    }
  }
];

async function seedAchievements() {
  try {
    await connectDB();
    
    console.log(' Seeding challenge and learning achievements...');
    
    // Remove existing achievements from these categories
    await Achievement.deleteMany({ 
      category: { $in: ['challenges', 'xp', 'streak'] } 
    });
    console.log(' Removed existing achievements');
    
    // Insert new achievements
    const inserted = await Achievement.insertMany(challengeAchievements);
    
    console.log(` Successfully seeded ${inserted.length} achievements`);
    console.log('\n Achievement Summary:');
    console.log('Categories:', [...new Set(inserted.map(a => a.category))].join(', '));
    console.log('Rarities:', [...new Set(inserted.map(a => a.rarity))].join(', '));
    console.log('Types:', [...new Set(inserted.map(a => a.type))].join(', '));
    
    console.log('\n Achievement Titles:');
    inserted.forEach((achievement, index) => {
      console.log(`${index + 1}. ${achievement.icon} ${achievement.title} (${achievement.rarity})`);
    });
    
    console.log('\n Achievement seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error(' Error seeding achievements:', error);
    process.exit(1);
  }
}

// this will run the seeder
if (require.main === module) {
  seedAchievements();
}

module.exports = { seedAchievements, challengeAchievements };