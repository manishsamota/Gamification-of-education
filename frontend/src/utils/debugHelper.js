// frontend/src/utils/debugHelper.js - CREATE THIS FILE
class DebugHelper {
  static logChallengeSubmission(challengeId, answers, timeSpent) {
    console.group('🐛 Challenge Submission Debug');
    console.log('Challenge ID:', challengeId);
    console.log('Time Spent:', timeSpent);
    console.log('Answers Object:', answers);
    console.log('Answers Array:', Object.entries(answers));
    console.log('Formatted for API:', Object.entries(answers).map(([questionIndex, selectedAnswer]) => ({
      questionIndex: parseInt(questionIndex),
      selectedAnswer,
      timeSpent: 30
    })));
    console.log('Token exists:', !!localStorage.getItem('token'));
    console.log('API Base URL:', process.env.REACT_APP_API_URL || 'http://localhost:5000/api');
    console.groupEnd();
  }

  static logUserState(user) {
    console.group('👤 User State Debug');
    console.log('User exists:', !!user);
    console.log('User ID:', user?.id);
    console.log('User XP:', user?.gameData?.totalXP);
    console.log('User Level:', user?.gameData?.level);
    console.groupEnd();
  }

  static async testBackendConnection() {
    console.group('🌐 Backend Connection Test');
    
    try {
      // Test health endpoint
      const healthResponse = await fetch('http://localhost:5000/api/health');
      console.log('Health check status:', healthResponse.status);
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('Health data:', healthData);
      }
    } catch (error) {
      console.error('Health check failed:', error);
    }

    try {
      // Test auth endpoint
      const token = localStorage.getItem('token');
      if (token) {
        const authResponse = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        console.log('Auth check status:', authResponse.status);
        
        if (authResponse.ok) {
          const authData = await authResponse.json();
          console.log('Auth data:', authData);
        } else {
          console.error('Auth check failed:', await authResponse.text());
        }
      } else {
        console.log('No token found');
      }
    } catch (error) {
      console.error('Auth test failed:', error);
    }

    console.groupEnd();
  }

  static logChallengeState(selectedChallenge, quizAnswers) {
    console.group('🎯 Challenge State Debug');
    console.log('Selected Challenge:', selectedChallenge);
    console.log('Challenge ID:', selectedChallenge?._id);
    console.log('Questions:', selectedChallenge?.questions?.length);
    console.log('Quiz Answers:', quizAnswers);
    console.log('Answered Questions:', Object.keys(quizAnswers).length);
    console.log('Can Submit:', Object.keys(quizAnswers).length === (selectedChallenge?.questions?.length || 0));
    console.groupEnd();
  }
}

// Add to window for easy debugging in browser console
window.DebugHelper = DebugHelper;

export default DebugHelper;