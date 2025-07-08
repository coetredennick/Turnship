const { google } = require('googleapis');
const { getUserTokens, updateUserTokens } = require('../db/connection');

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      code: 'AUTH_REQUIRED'
    });
  }
  next();
};

const optionalAuth = (req, res, next) => {
  next();
};

const refreshTokenIfNeeded = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    const tokens = await getUserTokens(req.user.id);
    if (!tokens || !tokens.refresh_token) {
      return next();
    }

    const tokenExpiry = new Date(tokens.token_expiry);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (tokenExpiry <= fiveMinutesFromNow) {
      console.log('Refreshing token for user:', req.user.id);
      
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log('OAuth credentials not configured, skipping token refresh');
        return next();
      }
      
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );

      oauth2Client.setCredentials({
        refresh_token: tokens.refresh_token
      });

      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        
        await updateUserTokens(
          req.user.id,
          credentials.access_token,
          credentials.refresh_token || tokens.refresh_token,
          new Date(credentials.expiry_date).toISOString(),
          tokens.scope
        );
        console.log('Token refreshed successfully for user:', req.user.id);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError);
      }
    }
  } catch (error) {
    console.error('Error in refreshTokenIfNeeded:', error);
  }

  next();
};

const createGoogleAuthClient = async (userId) => {
  const tokens = await getUserTokens(userId);
  if (!tokens) {
    throw new Error('No tokens found for user');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token
  });

  return oauth2Client;
};

module.exports = {
  requireAuth,
  optionalAuth,
  refreshTokenIfNeeded,
  createGoogleAuthClient
};