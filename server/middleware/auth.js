const { google } = require('googleapis');
const { getUserTokens, updateUserTokens } = require('../db/connection');
const { createOAuth2Client } = require('../services/oauth');

const requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please log in to access this resource',
    });
  }
  return next();
};

const optionalAuth = (req, res, next) => {
  next();
};

const refreshTokenIfNeeded = async (req, res, next) => {
  if (!req.user) {
    return next();
  }

  try {
    const userId = req.user.id;
    const tokens = await getUserTokens(userId);

    if (!tokens || !tokens.accessToken) {
      req.user.needsReauth = true;
      return next();
    }

    const now = new Date();
    const expiresAt = new Date(tokens.expiresAt);
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));

    if (expiresAt <= fiveMinutesFromNow) {
      if (process.env.NODE_ENV === 'development') {
        console.log('Token expires soon, attempting refresh...');
      }

      if (!tokens.refreshToken) {
        req.user.needsReauth = true;
        return next();
      }

      try {
        const oauth2Client = createOAuth2Client();
        oauth2Client.setCredentials({
          refresh_token: tokens.refreshToken,
        });

        const { credentials } = await oauth2Client.refreshAccessToken();
        await updateUserTokens(userId, {
          access_token: credentials.access_token,
          refresh_token: credentials.refresh_token || tokens.refreshToken,
          token_expiry: credentials.expiry_date,
        });

        if (process.env.NODE_ENV === 'development') {
          console.log('Token refreshed successfully');
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        req.user.needsReauth = true;
      }
    }

    return next();
  } catch (error) {
    console.error('Error in token refresh middleware:', error);
    return next();
  }
};

const createGoogleAuthClient = async (userId) => {
  const tokens = await getUserTokens(userId);
  if (!tokens) {
    throw new Error('No tokens found for user');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );

  oauth2Client.setCredentials({
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
  });

  return oauth2Client;
};

module.exports = {
  requireAuth,
  optionalAuth,
  refreshTokenIfNeeded,
  createGoogleAuthClient,
};
