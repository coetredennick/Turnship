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
      UNIQUE(user_id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating oauth_tokens table:', err.message);
        reject(err);
      }
    });

    // Create connections table
    db.run(`CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      email TEXT NOT NULL,
      full_name TEXT NOT NULL,
      company TEXT,
      connection_type TEXT,
      job_title TEXT,
      industry TEXT,
      notes TEXT,
      status TEXT DEFAULT 'Not Contacted',
      email_status TEXT DEFAULT 'Not Contacted',
      last_email_draft TEXT,
      last_email_sent_date DATETIME,
      custom_connection_description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`, (err) => {
      if (err) {
        console.error('Error creating connections table:', err.message);
        reject(err);
      } else {
        // Add indexes for performance optimization
        addConnectionIndexes()
          .then(() => {
            // Add migration logic for existing tables
            addEmailTrackingColumns()
              .then(() => {
                console.log('Database initialized');
                resolve();
              })
              .catch((migrationErr) => {
                console.error('Migration error:', migrationErr.message);
                reject(migrationErr);
              });
          })
          .catch((indexErr) => {
            console.error('Index creation error:', indexErr.message);
            reject(indexErr);
          });
      }
    });
  });
});

// Function to add performance indexes to connections table
const addConnectionIndexes = () => new Promise((resolve, reject) => {
  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_connections_email_status ON connections(email_status)',
    'CREATE INDEX IF NOT EXISTS idx_connections_created_at ON connections(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email)',
  ];

  let completed = 0;
  let hasError = false;

  indexQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err) {
        if (!hasError) {
          hasError = true;
          console.error(`Index creation error on query ${index + 1}:`, err.message);
          reject(err);
        }
      } else {
        completed++;
        if (completed === indexQueries.length) {
          console.log('Database indexes created successfully');
          resolve();
        }
      }
    });
  });
});

// Migration function to add email tracking columns to existing tables
const addEmailTrackingColumns = () => new Promise((resolve, reject) => {
  const alterQueries = [
    'ALTER TABLE connections ADD COLUMN email_status TEXT DEFAULT "Not Contacted"',
    'ALTER TABLE connections ADD COLUMN last_email_draft TEXT',
    'ALTER TABLE connections ADD COLUMN last_email_sent_date DATETIME',
    'ALTER TABLE connections ADD COLUMN custom_connection_description TEXT',
    'ALTER TABLE connections ADD COLUMN initial_purpose TEXT',
    'ALTER TABLE connections ADD COLUMN status_started_date DATETIME',
    'ALTER TABLE connections ADD COLUMN composer_opened_date DATETIME',
  ];

  let completed = 0;
  let hasError = false;

  alterQueries.forEach((query, index) => {
    db.run(query, (err) => {
      if (err && !err.message.includes('duplicate column name')) {
        if (!hasError) {
          hasError = true;
          console.error(`Migration error on query ${index + 1}:`, err.message);
          reject(err);
        }
      } else {
        completed++;
        if (completed === alterQueries.length) {
          console.log('Email tracking columns migration completed');
          resolve();
        }
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
    scope,
  } = tokens;

  const upsertQuery = `
    INSERT INTO oauth_tokens (user_id, access_token, refresh_token, token_expiry, scope, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token=excluded.access_token,
      refresh_token=excluded.refresh_token,
      token_expiry=excluded.token_expiry,
      scope=excluded.scope,
      updated_at=excluded.updated_at
  `;

  const timestamp = Date.now();

  return new Promise((resolve, reject) => {
    db.run(upsertQuery, [
      userId,
      accessToken,
      refreshToken,
      tokenExpiry,
      scope,
      timestamp,
      timestamp,
    ], (err) => {
      if (err) {
        console.error('Error upserting user tokens:', err);
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
          tokenExpiry: row.token_expiry,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        });
      });
    });
  });
};

const getUserTokens = (userId) => new Promise((resolve, reject) => {
  db.get('SELECT * FROM oauth_tokens WHERE user_id = ?', [userId], (err, row) => {
    if (err) {
      return reject(err);
    }

    if (!row) {
      return resolve(null);
    }

    return resolve({
      id: row.id,
      userId: row.user_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiry: row.token_expiry,
      scope: row.scope,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  });
});

// Connection operations
const createConnection = (userId, connectionData) => new Promise((resolve, reject) => {
  const {
    email,
    full_name,
    company,
    connection_type,
    job_title,
    industry,
    notes,
    status = 'Not Contacted',
    email_status = 'Not Contacted',
    custom_connection_description = '',
    initial_purpose = null,
  } = connectionData;

  const timestamp = Date.now();

  db.run(
    `INSERT INTO connections (
      user_id, email, full_name, company, connection_type, 
      job_title, industry, notes, status, email_status, custom_connection_description,
      initial_purpose, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, full_name, company, connection_type, job_title, industry, notes, status, email_status, custom_connection_description, initial_purpose, timestamp, timestamp],
    function insertCallback(err) {
      if (err) {
        console.error('Error creating connection:', err);
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          user_id: userId,
          email,
          full_name,
          company,
          connection_type,
          job_title,
          industry,
          notes,
          status,
          email_status,
          custom_connection_description,
          initial_purpose,
          created_at: timestamp,
          updated_at: timestamp,
        });
      }
    },
  );
});

const getConnectionsByUserId = (userId) => new Promise((resolve, reject) => {
  db.all(
    'SELECT * FROM connections WHERE user_id = ? ORDER BY created_at DESC',
    [userId],
    (err, connections) => {
      if (err) {
        console.error('Error fetching connections:', err);
        reject(err);
      } else {
        resolve(connections || []);
      }
    },
  );
});

const getConnectionById = (connectionId) => new Promise((resolve, reject) => {
  db.get(
    'SELECT * FROM connections WHERE id = ?',
    [connectionId],
    (err, connection) => {
      if (err) {
        console.error('Error fetching connection:', err);
        reject(err);
      } else {
        resolve(connection);
      }
    },
  );
});

const updateConnection = (connectionId, updates) => new Promise((resolve, reject) => {
  const allowedFields = [
    'email', 'full_name', 'company', 'connection_type',
    'job_title', 'industry', 'notes', 'status', 'email_status',
    'custom_connection_description', 'last_email_sent_date', 'initial_purpose',
    'status_started_date', 'composer_opened_date', 'draft_status',
  ];

  const updateFields = [];
  const values = [];

  Object.keys(updates).forEach((key) => {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  });

  if (updateFields.length === 0) {
    return reject(new Error('No valid fields to update'));
  }

  // Add updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(Date.now());
  values.push(connectionId);

  const query = `UPDATE connections SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error updating connection:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Connection not found'));
    } else {
      // Return the updated connection
      getConnectionById(connectionId)
        .then(resolve)
        .catch(reject);
    }
  });
});

const deleteConnection = (connectionId) => new Promise((resolve, reject) => {
  db.run(
    'DELETE FROM connections WHERE id = ?',
    [connectionId],
    function deleteCallback(err) {
      if (err) {
        console.error('Error deleting connection:', err);
        reject(err);
      } else if (this.changes === 0) {
        reject(new Error('Connection not found'));
      } else {
        resolve({ id: connectionId, deleted: true });
      }
    },
  );
});

// Email status tracking functions
const updateConnectionEmailStatus = (connectionId, status, sentDate = null) => new Promise((resolve, reject) => {
  const validStatuses = [
    'Not Contacted',
    'First Impression',
    'Follow-up',
    'Response',
    'Meeting Scheduled',
  ];

  if (!validStatuses.includes(status)) {
    return reject(new Error(`Invalid email status: ${status}`));
  }

  const now = Date.now();
  const updateFields = ['email_status = ?', 'updated_at = ?', 'status_started_date = ?', 'composer_opened_date = ?'];
  const values = [status, now, now, null]; // Reset progress when status changes

  if (sentDate) {
    updateFields.push('last_email_sent_date = ?');
    values.push(sentDate);
  }

  values.push(connectionId);

  const query = `UPDATE connections SET ${updateFields.join(', ')} WHERE id = ?`;

  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error updating email status:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Connection not found'));
    } else {
      getConnectionById(connectionId)
        .then(resolve)
        .catch(reject);
    }
  });
});

// Track when user opens email composer for current status
const trackComposerOpened = (connectionId) => new Promise((resolve, reject) => {
  const query = 'UPDATE connections SET composer_opened_date = ? WHERE id = ?';
  const values = [Date.now(), connectionId];

  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error tracking composer opened:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Connection not found'));
    } else {
      resolve({ success: true });
    }
  });
});

// Draft storage functions
const saveEmailDraft = (connectionId, draftContent, draftStatus = null) => new Promise((resolve, reject) => {
  if (typeof draftContent !== 'string') {
    return reject(new Error('Draft content must be a string'));
  }

  // Get current connection to determine status if not provided
  if (!draftStatus) {
    getConnectionById(connectionId)
      .then((connection) => {
        if (connection) {
          saveEmailDraft(connectionId, draftContent, connection.email_status)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Connection not found'));
        }
      })
      .catch(reject);
    return;
  }

  // If draft is empty, clear both draft and draft_status
  const isDraftEmpty = !draftContent || draftContent.trim() === '';
  const query = isDraftEmpty
    ? 'UPDATE connections SET last_email_draft = ?, draft_status = NULL, updated_at = ? WHERE id = ?'
    : 'UPDATE connections SET last_email_draft = ?, draft_status = ?, updated_at = ? WHERE id = ?';
  const values = isDraftEmpty
    ? [draftContent, Date.now(), connectionId]
    : [draftContent, draftStatus, Date.now(), connectionId];

  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error saving email draft:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Connection not found'));
    } else {
      resolve({
        connectionId,
        draftSaved: true,
        draftLength: draftContent.length,
      });
    }
  });
});

const getConnectionDraft = (connectionId) => new Promise((resolve, reject) => {
  const query = 'SELECT last_email_draft FROM connections WHERE id = ?';

  db.get(query, [connectionId], (err, row) => {
    if (err) {
      console.error('Error fetching connection draft:', err);
      reject(err);
    } else if (!row) {
      reject(new Error('Connection not found'));
    } else {
      resolve({
        connectionId,
        draft: row.last_email_draft || null,
      });
    }
  });
});

// Custom connection description function
const updateCustomConnectionDescription = (connectionId, description) => new Promise((resolve, reject) => {
  if (typeof description !== 'string') {
    return reject(new Error('Description must be a string'));
  }

  const query = 'UPDATE connections SET custom_connection_description = ?, updated_at = ? WHERE id = ?';
  const values = [description, Date.now(), connectionId];

  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error updating custom connection description:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Connection not found'));
    } else {
      getConnectionById(connectionId)
        .then(resolve)
        .catch(reject);
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
  createConnection,
  getConnectionsByUserId,
  getConnectionById,
  updateConnection,
  deleteConnection,
  updateConnectionEmailStatus,
  trackComposerOpened,
  saveEmailDraft,
  getConnectionDraft,
  updateCustomConnectionDescription,
};
