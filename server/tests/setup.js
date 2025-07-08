const path = require('path');

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = ':memory:'; // Use in-memory SQLite for tests
process.env.SESSION_SECRET = 'test-session-secret';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.GOOGLE_REDIRECT_URI = 'http://localhost:3001/auth/google/callback';

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Global test timeout
jest.setTimeout(10000);

// Cleanup function for after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Global cleanup
afterAll(async () => {
  // Close any open database connections
  if (global.__db) {
    await global.__db.close();
  }
});
