const request = require('supertest');
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const authRoutes = require('../routes/auth');

// Mock external dependencies properly
jest.mock('../services/oauth', () => ({
  initializeOAuth: jest.fn(),
}));

// Mock database with realistic implementations
const mockDb = {
  initDB: jest.fn().mockResolvedValue(),
  findUserById: jest.fn(),
  findUserByEmail: jest.fn(),
  createUser: jest.fn(),
  updateUserTokens: jest.fn(),
  getUserTokens: jest.fn(),
};

jest.mock('../db/connection', () => mockDb);

// Mock the auth middleware
const mockCreateGoogleAuthClient = jest.fn();
jest.mock('../middleware/auth', () => ({
  requireAuth: jest.fn((req, res, next) => {
    if (req.session && req.session.user) {
      req.user = req.session.user;
      return next();
    }
    return res.status(401).json({ error: 'Authentication required' });
  }),
  refreshTokenIfNeeded: jest.fn((req, res, next) => next()),
  createGoogleAuthClient: mockCreateGoogleAuthClient,
}));

// Mock Gmail API with realistic responses
const mockGmailAPI = {
  users: {
    getProfile: jest.fn().mockResolvedValue({
      data: {
        emailAddress: 'test@example.com',
        messagesTotal: 1234,
        threadsTotal: 567,
        historyId: '12345',
      },
    }),
  },
};

const mockOAuth2Client = {
  setCredentials: jest.fn(),
  refreshAccessToken: jest.fn().mockResolvedValue({
    credentials: {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expiry_date: Date.now() + 3600000,
    },
  }),
};

// Create a mock google object that behaves like the real googleapis
const mockGoogle = {
  auth: {
    OAuth2: jest.fn().mockImplementation(() => mockOAuth2Client),
  },
  gmail: jest.fn().mockImplementation(() => mockGmailAPI),
};

jest.mock('googleapis', () => ({
  google: mockGoogle,
}));

describe('Auth Routes Integration Tests', () => {
  let app;
  let testUser;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Reset mock implementations
    mockOAuth2Client.setCredentials.mockClear();
    mockOAuth2Client.refreshAccessToken.mockClear();
    mockGmailAPI.users.getProfile.mockClear();
    mockCreateGoogleAuthClient.mockClear();
    mockGoogle.gmail.mockClear();

    // Reset Gmail API mock to success state
    mockGmailAPI.users.getProfile.mockResolvedValue({
      data: {
        emailAddress: 'test@example.com',
        messagesTotal: 1234,
        threadsTotal: 567,
        historyId: '12345',
      },
    });

    // Ensure gmail mock returns the expected structure
    mockGoogle.gmail.mockReturnValue(mockGmailAPI);

    // Set up test user
    testUser = {
      id: 1,
      username: 'Test User',
      email: 'test@example.com',
      created_at: new Date().toISOString(),
    };

    // Set default environment variables
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
    process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';
  });

  describe('OAuth Configuration Tests', () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());

      // Mock minimal auth middleware for testing
      app.use((req, res, next) => {
        req.user = null; // Default to not authenticated
        next();
      });

      app.use('/auth', require('../routes/auth'));
    });

    it('should return 500 when OAuth credentials are missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      const response = await request(app)
        .get('/auth/google')
        .expect(500);

      expect(response.body.error).toBe('OAuth not configured. Please set Google OAuth credentials.');
      expect(response.body.code).toBe('OAUTH_NOT_CONFIGURED');
    });

    it('should handle OAuth denial properly', async () => {
      const response = await request(app)
        .get('/auth/google/callback?error=access_denied')
        .expect(302);

      expect(response.headers.location).toBe('http://localhost:5173/?error=oauth_denied');
    });
  });

  describe('Authentication Status Tests', () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it('should return 401 when user is not authenticated', async () => {
      app.use((req, res, next) => {
        req.user = null;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/me')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should return user info when authenticated', async () => {
      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/me')
        .expect(200);

      expect(response.body.authenticated).toBe(true);
      expect(response.body.user.id).toBe(testUser.id);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.username).toBe(testUser.username);
    });
  });

  describe('Logout Tests', () => {
    it('should logout successfully', async () => {
      app = express();
      app.use(express.json());

      app.use((req, res, next) => {
        req.user = testUser;
        req.logout = jest.fn((callback) => {
          delete req.user;
          callback();
        });
        req.session = {
          destroy: jest.fn((callback) => callback()),
        };
        next();
      });

      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logged out successfully');
      expect(response.body.redirectUrl).toBe('http://localhost:5173/');
    });

    it('should handle logout errors gracefully', async () => {
      app = express();
      app.use(express.json());

      app.use((req, res, next) => {
        req.user = testUser;
        req.logout = jest.fn((callback) => {
          callback(new Error('Logout failed'));
        });
        next();
      });

      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .post('/auth/logout')
        .expect(500);

      expect(response.body.error).toBe('Logout failed');
      expect(response.body.code).toBe('LOGOUT_ERROR');
    });
  });

  describe('Gmail API Integration Tests', () => {
    beforeEach(() => {
      app = express();
      app.use(express.json());
    });

    it('should return 401 when user is not authenticated', async () => {
      app.use((req, res, next) => {
        req.user = null;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
      expect(response.body.code).toBe('AUTH_REQUIRED');
    });

    it('should return 500 when OAuth not configured', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;

      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(500);

      expect(response.body.error).toBe('OAuth not configured');
      expect(response.body.code).toBe('OAUTH_NOT_CONFIGURED');
    });

    it('should return Gmail profile when properly authenticated and configured', async () => {
      // Mock createGoogleAuthClient to return our mocked OAuth client
      mockCreateGoogleAuthClient.mockResolvedValue(mockOAuth2Client);

      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(200);

      expect(response.body.message).toBe('Gmail API connection successful');
      expect(response.body.profile.emailAddress).toBe('test@example.com');
      expect(response.body.profile.messagesTotal).toBe(1234);
      expect(response.body.profile.threadsTotal).toBe(567);

      // Verify createGoogleAuthClient was called with the right user ID
      expect(mockCreateGoogleAuthClient).toHaveBeenCalledWith(testUser.id);
      expect(mockGoogle.gmail).toHaveBeenCalledWith({ version: 'v1', auth: mockOAuth2Client });
    });

    it('should handle expired tokens by returning 401', async () => {
      // Mock createGoogleAuthClient to return client, but Gmail API returns 401
      mockCreateGoogleAuthClient.mockResolvedValue(mockOAuth2Client);

      // Mock Gmail API to return 401 for expired token
      mockGmailAPI.users.getProfile.mockRejectedValue({
        code: 401,
        message: 'Invalid Credentials',
      });

      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(401);

      expect(response.body.error).toBe('Gmail API authentication failed. Token may be expired.');
      expect(response.body.code).toBe('GMAIL_AUTH_FAILED');
    });

    it('should handle Gmail API errors gracefully', async () => {
      // Mock createGoogleAuthClient to return our OAuth client
      mockCreateGoogleAuthClient.mockResolvedValue(mockOAuth2Client);

      // Mock Gmail API error
      mockGmailAPI.users.getProfile.mockRejectedValue(new Error('Gmail API Error'));

      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(500);

      expect(response.body.error).toBe('Gmail API test failed');
      expect(response.body.code).toBe('GMAIL_API_ERROR');
      expect(response.body.details).toBe('Gmail API Error');
    });

    it('should handle missing user tokens', async () => {
      // Mock createGoogleAuthClient to throw error for missing tokens
      mockCreateGoogleAuthClient.mockRejectedValue(new Error('No tokens found for user'));

      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(500);

      expect(response.body.error).toBe('Gmail API test failed');
      expect(response.body.code).toBe('GMAIL_API_ERROR');
    });
  });

  describe('Error Scenarios Amy Might Encounter', () => {
    it('should handle database connection errors gracefully', async () => {
      // Mock createGoogleAuthClient to throw database error
      mockCreateGoogleAuthClient.mockRejectedValue(new Error('Database connection failed'));

      app = express();
      app.use(express.json());
      app.use((req, res, next) => {
        req.user = testUser;
        next();
      });
      app.use('/auth', require('../routes/auth'));

      const response = await request(app)
        .get('/auth/gmail/test')
        .expect(500);

      expect(response.body.error).toBe('Gmail API test failed');
    });

    it('should handle concurrent user sessions properly', async () => {
      // Test that multiple users can be authenticated simultaneously
      const user1 = { ...testUser, id: 1, email: 'user1@example.com' };
      const user2 = { ...testUser, id: 2, email: 'user2@example.com' };

      mockDb.getUserTokens
        .mockResolvedValueOnce({ access_token: 'token1', refresh_token: 'refresh1' })
        .mockResolvedValueOnce({ access_token: 'token2', refresh_token: 'refresh2' });

      // Create two authenticated apps
      const app1 = express();
      app1.use(express.json());
      app1.use((req, res, next) => { req.user = user1; next(); });
      app1.use('/auth', require('../routes/auth'));

      const app2 = express();
      app2.use(express.json());
      app2.use((req, res, next) => { req.user = user2; next(); });
      app2.use('/auth', require('../routes/auth'));

      // Both should be able to access their profiles
      const response1 = await request(app1).get('/auth/me').expect(200);
      const response2 = await request(app2).get('/auth/me').expect(200);

      expect(response1.body.user.email).toBe('user1@example.com');
      expect(response2.body.user.email).toBe('user2@example.com');
    });
  });
});
