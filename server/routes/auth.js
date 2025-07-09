const express = require('express');
const passport = require('passport');
const { google } = require('googleapis');
const { requireAuth } = require('../middleware/auth');
const { getUserTokens } = require('../db/connection');
const GmailDevService = require('../services/gmail-dev');

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
  console.log('OAuth callback - Error:', authErr);
  console.log('OAuth callback - User:', user);
  console.log('OAuth callback - Session before login:', req.session);
  
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

    console.log('Login successful - Session after login:', req.session);
    console.log('Login successful - User:', req.user);
    return res.redirect(`${CLIENT_URL}/dashboard`);
  });
})(req, res, next));

// DEVELOPMENT MODE: Mock authenticated user
router.get('/me', (req, res) => {
  console.log('Development mode: Returning mock user');
  
  return res.json({
    user: {
      id: 1,
      email: 'coetredfsu@gmail.com',
      name: 'Dev User',
    },
    authenticated: true,
  });
});

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

// DEVELOPMENT: Test Gmail connection with hardcoded tokens
router.get('/gmail/test', async (req, res) => {
  try {
    const gmailService = new GmailDevService();
    const profile = await gmailService.getProfile();
    
    return res.json({
      message: 'Gmail API connection successful',
      profile: {
        emailAddress: profile.emailAddress,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal,
      },
    });
  } catch (error) {
    console.error('Gmail test error:', error);
    return res.status(500).json({
      error: 'Gmail connection failed',
      message: error.message || 'Failed to connect to Gmail API',
    });
  }
});

// DEVELOPMENT: Get recent emails
router.get('/gmail/messages', async (req, res) => {
  try {
    const gmailService = new GmailDevService();
    const messages = await gmailService.listMessages('', 10);
    
    return res.json({
      messages: messages.messages || [],
      resultSizeEstimate: messages.resultSizeEstimate || 0,
    });
  } catch (error) {
    console.error('Gmail messages error:', error);
    return res.status(500).json({
      error: 'Failed to fetch messages',
      message: error.message,
    });
  }
});

// DEVELOPMENT: Search networking emails
router.get('/gmail/networking', async (req, res) => {
  try {
    const gmailService = new GmailDevService();
    const results = await gmailService.searchNetworkingEmails();
    
    return res.json({
      message: 'Networking emails retrieved',
      results: results.messages || [],
    });
  } catch (error) {
    console.error('Gmail networking search error:', error);
    return res.status(500).json({
      error: 'Failed to search networking emails',
      message: error.message,
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
