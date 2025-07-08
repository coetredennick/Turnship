const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');

// Create in-memory test database
const createTestDatabase = () => {
  const db = new sqlite3.Database(':memory:');
  
  // Promisify database methods
  db.runAsync = promisify(db.run.bind(db));
  db.getAsync = promisify(db.get.bind(db));
  db.allAsync = promisify(db.all.bind(db));
  
  return db;
};

// Initialize test database with schema
const initTestDatabase = async (db) => {
  await db.runAsync(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  await db.runAsync(`CREATE TABLE IF NOT EXISTS oauth_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expiry DATETIME,
    scope TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  return db;
};

// Create test user
const createTestUser = async (db, userData = {}) => {
  const defaultUser = {
    username: 'Test User',
    email: 'test@example.com',
    ...userData
  };

  const result = await db.runAsync(
    'INSERT INTO users (username, email) VALUES (?, ?)',
    [defaultUser.username, defaultUser.email]
  );

  return {
    id: result.lastID,
    ...defaultUser
  };
};

// Create test OAuth tokens
const createTestTokens = async (db, userId, tokenData = {}) => {
  const defaultTokens = {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    token_expiry: new Date(Date.now() + 3600000).toISOString(),
    scope: 'profile email https://www.googleapis.com/auth/gmail.readonly',
    ...tokenData
  };

  await db.runAsync(
    'INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)',
    [userId, defaultTokens.access_token, defaultTokens.refresh_token, defaultTokens.token_expiry, defaultTokens.scope]
  );

  return defaultTokens;
};

// Mock Google OAuth profile
const createMockGoogleProfile = (overrides = {}) => ({
  id: 'google-user-id-123',
  displayName: 'Test User',
  emails: [{ value: 'test@example.com' }],
  photos: [{ value: 'https://example.com/photo.jpg' }],
  _json: {
    scope: 'profile email https://www.googleapis.com/auth/gmail.readonly'
  },
  ...overrides
});

// Mock Gmail API response
const createMockGmailProfile = (overrides = {}) => ({
  data: {
    emailAddress: 'test@example.com',
    messagesTotal: 1234,
    threadsTotal: 567,
    historyId: '12345',
    ...overrides
  }
});

// Create authenticated session for testing
const createAuthenticatedSession = (agent, user) => {
  const session = {
    passport: {
      user: user.id
    }
  };
  
  // Mock session middleware
  agent.set('Cookie', [`connect.sid=${Buffer.from(JSON.stringify(session)).toString('base64')}`]);
  
  return agent;
};

// Wait for async operations
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
  createTestDatabase,
  initTestDatabase,
  createTestUser,
  createTestTokens,
  createMockGoogleProfile,
  createMockGmailProfile,
  createAuthenticatedSession,
  waitFor
};