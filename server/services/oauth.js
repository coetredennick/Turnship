const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { findUserByEmail, createUser, updateUserTokens, findUserById } = require('../db/connection');

const initializeOAuth = () => {
  // Set up serialize/deserialize functions (always needed for sessions)
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await findUserById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Only initialize OAuth strategy if credentials are provided
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not found. OAuth authentication will be disabled.');
    return;
  }

  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_REDIRECT_URI,
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ]
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let user = await findUserByEmail(email);

      if (!user) {
        // Create new user
        user = await createUser(profile);
      }

      // Save or update tokens
      const tokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now
      const tokens = {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        scope: profile._json.scope
      };

      await updateUserTokens(user.id, tokens);
      return done(null, user);
    } catch (error) {
      console.error('OAuth strategy error:', error);
      return done(error);
    }
  }));
};

module.exports = { initializeOAuth };