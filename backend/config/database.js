const mongoose = require('mongoose');

const connectDB = async (retries = 5) => {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')); // Hide credentials
    
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edugame', {
    
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, 
      socketTimeoutMS: 45000, 
      maxPoolSize: 10, 
      minPoolSize: 1, 
      maxIdleTimeMS: 30000, 
      connectTimeoutMS: 10000, 
      family: 4 
     
    });

    console.log(` MongoDB Connected: ${conn.connection.host}:${conn.connection.port}`);
    console.log(` Database: ${conn.connection.name}`);
    
    // Set up connection event handlers
    mongoose.connection.on('error', (error) => {
      console.error(' MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log(' MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log(' MongoDB reconnected');
    });

    mongoose.connection.on('close', () => {
      console.log(' MongoDB connection closed');
    });

    // Monitor connection status
    setInterval(() => {
      const state = mongoose.connection.readyState;
      const stateMap = {
        0: 'disconnected',
        1: 'connected', 
        2: 'connecting',
        3: 'disconnecting'
      };
      
      if (state !== 1) {
        console.log(` MongoDB state: ${stateMap[state]}`);
      }
    }, 60000); // Check every 60 seconds

    return true;
  } catch (error) {
    console.error(` MongoDB connection failed (attempt ${6 - retries}):`, error.message);
    
    if (retries > 1) {
      console.log(` Retrying connection in 5 seconds... (${retries - 1} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, 5000));
      return connectDB(retries - 1);
    } else {
      console.error(' All MongoDB connection attempts failed');
      throw error;
    }
  }
};

// Database health check
const checkDBHealth = () => {
  const state = mongoose.connection.readyState;
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting', 
    3: 'disconnecting'
  };
  
  return {
    status: stateMap[state],
    isHealthy: state === 1,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

// Get database statistics
const getDBStats = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }

    const stats = await mongoose.connection.db.stats();
    
    return {
      collections: stats.collections,
      dataSize: stats.dataSize,
      storageSize: stats.storageSize,
      indexes: stats.indexes,
      indexSize: stats.indexSize,
      avgObjSize: stats.avgObjSize,
      objects: stats.objects
    };
  } catch (error) {
    console.error(' Error getting DB stats:', error);
    return null;
  }
};

// Graceful database disconnection
const disconnectDB = async () => {
  try {
    console.log(' Closing MongoDB connection...');
    await mongoose.connection.close();
    console.log(' MongoDB connection closed successfully');
  } catch (error) {
    console.error(' Error closing MongoDB connection:', error);
    throw error;
  }
};

module.exports = {
  connectDB,
  checkDBHealth,
  getDBStats,
  disconnectDB
};