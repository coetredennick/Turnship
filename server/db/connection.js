const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'dev.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
    process.exit(1);
  }
  console.log('Connected to SQLite database');
});

const initDB = () => new Promise((resolve, reject) => {
  db.serialize(() => {
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      google_id TEXT UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) reject(err);
    });

    // Create projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating projects table:', err.message);
        reject(err);
      }
    });

    // Create tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      project_id INTEGER NOT NULL,
      assignee_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assignee_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating tasks table:', err.message);
        reject(err);
      }
    });

    // Create oauth_tokens table
    db.run(`CREATE TABLE IF NOT EXISTS oauth_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      token_expiry DATETIME,
      scope TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating oauth_tokens table:', err.message);
        reject(err);
      } else {
        console.log('Database initialized');
        resolve();
      }
    });
  });
});

// User operations
const createUser = (googleProfile) => new Promise((resolve, reject) => {
  const { displayName, emails } = googleProfile;
  const email = emails[0].value;
  const username = displayName;

  db.run(
    'INSERT INTO users (username, email) VALUES (?, ?)',
    [username, email],
    function insertCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          username,
          email,
        });
      }
    },
  );
});

const findUserById = (id) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      reject(err);
    } else {
      resolve(user);
    }
  });
});

const findUserByEmail = (email) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      reject(err);
    } else {
      resolve(user);
    }
  });
});

const updateUserTokens = (userId, tokens) => {
  const {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_expiry: tokenExpiry,
  } = tokens;

  const updateQuery = `
    UPDATE oauth_tokens 
    SET access_token = ?, refresh_token = ?, expires_at = ?, updated_at = ?
    WHERE user_id = ?
  `;

  return new Promise((resolve, reject) => {
    db.run(updateQuery, [
      accessToken, refreshToken, tokenExpiry, Date.now(), userId,
    ], (err) => {
      if (err) {
        console.error('Error updating user tokens:', err);
        return reject(err);
      }

      return db.get('SELECT * FROM oauth_tokens WHERE user_id = ?', [userId], (selectErr, row) => {
        if (selectErr) {
          console.error('Error fetching updated tokens:', selectErr);
          return reject(selectErr);
        }

        return resolve({
          id: row.id,
          userId: row.user_id,
          accessToken: row.access_token,
          refreshToken: row.refresh_token,
          expiresAt: row.expires_at,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      });
    });
  });
};

const getUserTokens = (userId) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM oauth_tokens WHERE user_id = ?', [userId], (err, tokens) => {
    if (err) {
      reject(err);
    } else {
      resolve(tokens);
    }
  });
});

module.exports = {
  db,
  initDB,
  createUser,
  findUserById,
  findUserByEmail,
  updateUserTokens,
  getUserTokens,
};
