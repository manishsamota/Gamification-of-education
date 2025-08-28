const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

// Send welcome email
exports.sendWelcomeEmail = async (email, name) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to EduGame! 🎮',
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #00FF9C; margin: 0;">Welcome to EduGame!</h1>
            <p style="color: #666; font-size: 18px;">Your learning adventure begins now</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #00FF9C, #D67BFF); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <h2 style="margin: 0 0 15px 0;">Hi ${name}! 👋</h2>
            <p style="margin: 0; font-size: 16px;">You've successfully joined our gamified learning platform. Get ready to earn XP, unlock achievements, and climb the leaderboards!</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h3 style="color: #333;">What's waiting for you:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>🎯 <strong>Daily Challenges</strong> - Complete tasks and earn XP</li>
              <li>🏆 <strong>Achievements</strong> - Unlock badges as you progress</li>
              <li>🔥 <strong>Streak System</strong> - Maintain daily learning habits</li>
              <li>📊 <strong>Leaderboards</strong> - Compete with other learners</li>
              <li>📚 <strong>Courses</strong> - Learn at your own pace</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <a href="${process.env.FRONTEND_URL}/dashboard" style="background: linear-gradient(135deg, #00FF9C, #D67BFF); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Start Learning Now
            </a>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>Need help getting started? Reply to this email and we'll be happy to assist!</p>
            <p style="margin-top: 20px;">
              <a href="${process.env.FRONTEND_URL}" style="color: #00FF9C;">EduGame Team</a>
            </p>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully');
  } catch (error) {
    console.error('Error sending welcome email:', error);
    throw error;
  }
};

// Send achievement notification email
exports.sendAchievementEmail = async (email, name, achievement) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🏆 Achievement Unlocked: ${achievement.title}`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #D67BFF; margin: 0;">Achievement Unlocked!</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #FFD700, #FFA500); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 15px;">${achievement.icon}</div>
            <h2 style="margin: 0 0 15px 0;">${achievement.title}</h2>
            <p style="margin: 0; font-size: 16px;">${achievement.description}</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #666; font-size: 18px;">Congratulations ${name}! You've earned this achievement.</p>
            <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
              <h3 style="color: #333; margin: 0 0 10px 0;">Rewards:</h3>
              <p style="color: #666; margin: 0;">+${achievement.rewards.xp} XP</p>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard/achievements" style="background: linear-gradient(135deg, #00FF9C, #D67BFF); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              View All Achievements
            </a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Achievement email sent successfully');
  } catch (error) {
    console.error('Error sending achievement email:', error);
    throw error;
  }
};

// Send streak reminder email
exports.sendStreakReminderEmail = async (email, name, streakCount) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `🔥 Don't break your ${streakCount}-day streak!`,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #FF6B35; margin: 0;">Keep Your Streak Alive! 🔥</h1>
          </div>
          
          <div style="background: linear-gradient(135deg, #FF6B35, #F7931E); padding: 30px; border-radius: 10px; color: white; text-align: center; margin-bottom: 30px;">
            <div style="font-size: 48px; margin-bottom: 15px;">🔥</div>
            <h2 style="margin: 0 0 15px 0;">${streakCount} Day Streak</h2>
            <p style="margin: 0; font-size: 16px;">Hi ${name}! You're on fire! Don't let your learning streak die out.</p>
          </div>
          
          <div style="text-align: center; margin-bottom: 30px;">
            <p style="color: #666; font-size: 18px;">Just a quick challenge or lesson will keep your streak going!</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL}/dashboard/challenges" style="background: linear-gradient(135deg, #FF6B35, #F7931E); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">
              Continue Learning
            </a>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('Streak reminder email sent successfully');
  } catch (error) {
    console.error('Error sending streak reminder email:', error);
    throw error;
  }
};