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
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
      if (err) {
        console.error('Error creating users table:', err.message);
        reject(err);
        return;
      }
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
        return;
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
        return;
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
const createUser = (googleProfile) => {
  return new Promise((resolve, reject) => {
    const { displayName, emails } = googleProfile;
    const email = emails[0].value;
    const username = displayName;

    db.run(
      'INSERT INTO users (username, email) VALUES (?, ?)',
      [username, email],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            username,
            email
          });
        }
      }
    );
  });
};

const findUserById = (id) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [id], (err, user) => {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  });
};

const findUserByEmail = (email) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) {
        reject(err);
      } else {
        resolve(user);
      }
    });
  });
};

const updateUserTokens = (userId, tokens) => {
  return new Promise((resolve, reject) => {
    const { access_token, refresh_token, token_expiry, scope } = tokens;
    const tokenExpiryString = token_expiry instanceof Date ? token_expiry.toISOString() : token_expiry;
    const scopeString = Array.isArray(scope) ? scope.join(' ') : scope;

    db.get('SELECT * FROM oauth_tokens WHERE user_id = ?', [userId], (err, existingToken) => {
      if (err) {
        reject(err);
        return;
      }

      if (existingToken) {
        db.run(
          'UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, token_expiry = ?, scope = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?',
          [access_token, refresh_token, tokenExpiryString, scopeString, userId],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      } else {
        db.run(
          'INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope) VALUES (?, ?, ?, ?, ?)',
          [userId, access_token, refresh_token, tokenExpiryString, scopeString],
          (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          }
        );
      }
    });
  });
};

const getUserTokens = (userId) => {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM oauth_tokens WHERE user_id = ?', [userId], (err, tokens) => {
      if (err) {
        reject(err);
      } else {
        resolve(tokens);
      }
    });
  });
};

module.exports = { 
  db, 
  initDB, 
  createUser, 
  findUserById, 
  findUserByEmail, 
  updateUserTokens, 
  getUserTokens 
};
