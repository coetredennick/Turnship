const express = require('express');
const passport = require('passport');
const { google } = require('googleapis');
const { requireAuth } = require('../middleware/auth');
const { getUserTokens } = require('../db/connection');

const router = express.Router();
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Initiate Google OAuth
router.get('/google', (req, res, next) => passport.authenticate('google', {
  scope: [
    'profile',
    'email',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
})(req, res, next));

// Handle OAuth callback
router.get('/google/callback', (req, res, next) => passport.authenticate('google', {
  failureRedirect: `${CLIENT_URL}/?error=oauth_failed`,
}, async (authErr, user) => {
  if (authErr) {
    console.error('OAuth authentication error:', authErr);
    return res.redirect(`${CLIENT_URL}/?error=oauth_error`);
  }

  if (!user) {
    console.error('No user returned from OAuth');
    return res.redirect(`${CLIENT_URL}/?error=oauth_denied`);
  }

  return req.logIn(user, (loginErr) => {
    if (loginErr) {
      console.error('Login error:', loginErr);
      return res.redirect(`${CLIENT_URL}/?error=session_error`);
    }

    return res.redirect(`${CLIENT_URL}/dashboard`);
  });
})(req, res, next));

// Get current user
router.get('/me', requireAuth, (req, res) => res.json({
  user: {
    id: req.user.id,
    email: req.user.email,
    name: req.user.name,
  },
  authenticated: true,
}));

// Logout
router.post('/logout', (req, res) => req.logout((logoutErr) => {
  if (logoutErr) {
    console.error('Logout error:', logoutErr);
    return res.status(500).json({
      error: 'Logout failed',
      message: 'Failed to logout user',
    });
  }

  return res.json({
    message: 'Logged out successfully',
    authenticated: false,
  });
}));

// Test Gmail connection
router.get('/gmail/test', requireAuth, async (req, res) => {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI,
    );

    // Set credentials from user's stored tokens
    const tokens = await getUserTokens(req.user.id);
    if (!tokens) {
      return res.status(401).json({
        error: 'No tokens found',
        message: 'Please re-authenticate with Google',
      });
    }

    oauth2Client.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });

    return res.json({
      message: 'Gmail API connection successful',
      profile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
      },
    });
  } catch (error) {
    console.error('Gmail test error:', error);
    return res.status(500).json({
      error: 'Gmail connection failed',
      message: error.message || 'Failed to connect to Gmail API',
      needsReauth: error.code === 401 || error.code === 403,
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => res.json({
  status: 'healthy',
  timestamp: new Date().toISOString(),
  service: 'turnship-auth',
}));

// Error handling middleware for auth routes
router.use((err, req, res, next) => {
  console.error('Auth route error:', err);
  res.status(500).json({
    error: 'Authentication service error',
    message: 'An error occurred in the authentication service',
  });

  return next(err);
});

module.exports = router;
