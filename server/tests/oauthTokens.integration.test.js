const fs = require('fs');
const path = require('path');
const {
  db,
  initDB,
  createUser,
  updateUserTokens,
  getUserTokens,
} = require('../db/connection');

describe('OAuth Tokens DB integration', () => {
  const dbPath = path.join(__dirname, '..', 'dev.db');

  beforeAll(async () => {
    // Remove existing test database to ensure a clean slate
    if (fs.existsSync(dbPath)) {
      await new Promise((resolve) => {
        db.close(() => resolve());
      });
      fs.unlinkSync(dbPath);
    }
    await initDB();
  });

  afterEach(async () => {
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

  afterAll(async () => {
    await new Promise((resolve) => {
      db.close(() => resolve());
    });
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });

  test('getUserTokens returns camelCase fields', async () => {
    const user = await createUser({ displayName: 'Amy', emails: [{ value: 'amy@example.com' }] });
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)',
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
    const user = await createUser({ displayName: 'Bob', emails: [{ value: 'bob@example.com' }] });
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)',
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
