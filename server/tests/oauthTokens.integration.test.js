const fs = require('fs');
const path = require('path');

// Set test environment before requiring connection module
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

const {
  createUser,
  updateUserTokens,
  getUserTokens,
} = require('../db/connection');

describe('OAuth Tokens DB integration', () => {
  // Helper to initialize test database schema
  const initTestDB = () => {
    return new Promise((resolve, reject) => {
      const initSqlPath = path.join(__dirname, '../db/init.sql');
      
      fs.readFile(initSqlPath, 'utf8', (err, sql) => {
        if (err) return reject(err);
        
        // Get the db instance from the connection module
        const { db } = require('../db/connection');
        
        db.exec(sql, (execErr) => {
          if (execErr) return reject(execErr);
          resolve();
        });
      });
    });
  };

  beforeAll(async () => {
    // Initialize the test database with schema
    await initTestDB();
  });

  afterEach(async () => {
    const { db } = require('../db/connection');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM oauth_tokens', (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users', (err) => {
        if (err) return reject(err);
        return resolve();
      });
    });
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.NODE_ENV;
    delete process.env.DB_PATH;
  });


  test('getUserTokens returns camelCase fields', async () => {
    const { db } = require('../db/connection');
    const user = await createUser({ displayName: 'Amy', emails: [{ value: 'amy@example.com' }] });
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)`,
        [user.id, 'acc', 'ref', new Date().toISOString(), 'profile'],
        (err) => {
          if (err) return reject(err);
          return resolve();
        },
      );
    });

    const tokens = await getUserTokens(user.id);
    expect(tokens).toEqual(
      expect.objectContaining({
        userId: user.id,
        accessToken: 'acc',
        refreshToken: 'ref',
        tokenExpiry: expect.any(String),
      }),
    );
  });

  test('updateUserTokens updates token_expiry', async () => {
    const { db } = require('../db/connection');
    const user = await createUser({ displayName: 'Bob', emails: [{ value: 'bob@example.com' }] });
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)`,
        [user.id, 'old', 'oldRef', new Date('2000-01-01').toISOString(), 'profile'],
        (err) => {
          if (err) return reject(err);
          return resolve();
        },
      );
    });

    const newExpiry = new Date(Date.now() + 3600000).toISOString();
    await updateUserTokens(user.id, {
      access_token: 'new',
      refresh_token: 'newRef',
      token_expiry: newExpiry,
    });

    const row = await getUserTokens(user.id);
    expect(row.accessToken).toBe('new');
    expect(row.refreshToken).toBe('newRef');
    expect(new Date(row.tokenExpiry).toISOString()).toBe(newExpiry);
  });

  test('updateUserTokens inserts row when none exists', async () => {
    const user = await createUser({ displayName: 'Carol', emails: [{ value: 'carol@example.com' }] });

    const expiry = new Date(Date.now() + 3600000).toISOString();
    await updateUserTokens(user.id, {
      access_token: 'insert',
      refresh_token: 'insertRef',
      token_expiry: expiry,
    });

    const row = await getUserTokens(user.id);
    expect(row.accessToken).toBe('insert');
    expect(row.refreshToken).toBe('insertRef');
    expect(new Date(row.tokenExpiry).toISOString()).toBe(expiry);
  });
});
