const express = require('express');
const passport = require('passport');
const { google } = require('googleapis');
const { requireAuth, createGoogleAuthClient } = require('../middleware/auth');
const { createUser, findUserByEmail, updateUserTokens } = require('../db/connection');

const router = express.Router();

// Initiate Google OAuth flow
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({
      error: 'OAuth not configured. Please set Google OAuth credentials.',
      code: 'OAUTH_NOT_CONFIGURED',
      status: 500
    });
  }

  passport.authenticate('google', {
    scope: [
      'profile',
      'email',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send'
    ]
  })(req, res, next);
});

// Handle OAuth callback
router.get('/google/callback', (req, res, next) => {
  // Handle OAuth denial
  if (req.query.error) {
    console.log('OAuth denied:', req.query.error);
    return res.redirect(`http://localhost:5173/?error=oauth_denied`);
  }

  passport.authenticate('google', { 
    failureRedirect: 'http://localhost:5173/?error=oauth_failed' 
  }, async (err, user, info) => {
    if (err) {
      console.error('OAuth error:', err);
      return res.redirect(`http://localhost:5173/?error=oauth_error`);
    }

    if (!user) {
      console.log('OAuth failed - no user returned');
      return res.redirect(`http://localhost:5173/?error=oauth_failed`);
    }

    try {
      // Log the user in using passport session
      req.logIn(user, (err) => {
        if (err) {
          console.error('Session login error:', err);
          return res.redirect(`http://localhost:5173/?error=session_error`);
        }

        console.log('User logged in successfully:', user.email);
        return res.redirect('http://localhost:5173/dashboard');
      });
    } catch (error) {
      console.error('Callback processing error:', error);
      return res.redirect(`http://localhost:5173/?error=callback_error`);
    }
  })(req, res, next);
});

// Get current user info (protected route)
router.get('/me', requireAuth, (req, res) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        created_at: req.user.created_at
      },
      authenticated: true
    });
  } catch (error) {
    console.error('Error in /me route:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    });
  }
});

// Logout route
router.post('/logout', (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          error: 'Logout failed',
          code: 'LOGOUT_ERROR',
          status: 500
        });
      }

      req.session.destroy((err) => {
        if (err) {
          console.error('Session destroy error:', err);
          return res.status(500).json({
            error: 'Session cleanup failed',
            code: 'SESSION_ERROR',
            status: 500
          });
        }

        res.clearCookie('connect.sid');
        res.json({ 
          message: 'Logged out successfully',
          redirectUrl: 'http://localhost:5173/'
        });
      });
    });
  } catch (error) {
    console.error('Logout route error:', error);
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      status: 500
    });
  }
});

// Test Gmail API connection (protected route)
router.get('/gmail/test', requireAuth, async (req, res) => {
  try {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.status(500).json({
        error: 'OAuth not configured',
        code: 'OAUTH_NOT_CONFIGURED',
        status: 500
      });
    }

    const auth = await createGoogleAuthClient(req.user.id);
    const gmail = google.gmail({ version: 'v1', auth });

    // Get user profile from Gmail API
    const profile = await gmail.users.getProfile({ userId: 'me' });
    
    res.json({
      message: 'Gmail API connection successful',
      profile: {
        emailAddress: profile.data.emailAddress,
        messagesTotal: profile.data.messagesTotal,
        threadsTotal: profile.data.threadsTotal,
        historyId: profile.data.historyId
      }
    });
  } catch (error) {
    console.error('Gmail API test error:', error);
    
    if (error.code === 401) {
      return res.status(401).json({
        error: 'Gmail API authentication failed. Token may be expired.',
        code: 'GMAIL_AUTH_FAILED',
        status: 401
      });
    }

    res.status(500).json({
      error: 'Gmail API test failed',
      code: 'GMAIL_API_ERROR',
      status: 500,
      details: error.message
    });
  }
});

// Error handling middleware for auth routes
router.use((error, req, res, next) => {
  console.error('Auth route error:', error);
  
  if (error.name === 'TokenError') {
    return res.status(401).json({
      error: 'Invalid or expired token',
      code: 'TOKEN_ERROR',
      status: 401
    });
  }

  res.status(500).json({
    error: 'Authentication service error',
    code: 'AUTH_SERVICE_ERROR',
    status: 500
  });
});

module.exports = router;