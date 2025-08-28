const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback",
  scope: ['profile', 'email']
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log(' Google OAuth Profile:', {
      id: profile.id,
      name: profile.displayName,
      email: profile.emails?.[0]?.value
    });

    const email = profile.emails?.[0]?.value;
    if (!email) {
      return done(new Error('No email found in Google profile'), null);
    }

    // Check if user already exists
    let user = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { googleId: profile.id }
      ]
    });

    if (user) {
      console.log('Existing user found:', user.email);
      
      if (!user.googleId) {
        user.googleId = profile.id;
        user.provider = 'google';
        await user.save();
      }
      
      return done(null, user);
    } else {
      console.log(' Creating new Google user');
      
      // Create new user
      user = await User.create({
        name: profile.displayName,
        email: email.toLowerCase(),
        googleId: profile.id,
        avatar: profile.photos?.[0]?.value || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName}`,
        provider: 'google',
        isEmailVerified: true
      });

      console.log('New user created:', user.email);
      return done(null, user);
    }
  } catch (error) {
    console.error(' Google OAuth error:', error);
    return done(error, null);
  }
}));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;