const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'dev.db');

// Factory function to create database instances
function createDB(dbPath = DB_PATH) {
  return new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
      if (process.env.NODE_ENV !== 'test') {
        process.exit(1);
      }
    }
    if (process.env.NODE_ENV !== 'test' && dbPath !== ':memory:') {
      console.log('Connected to SQLite database');
    }
  });
}

// Default database instance
const db = createDB(process.env.DB_PATH || DB_PATH);

const initDB = () => new Promise((resolve, reject) => {
  const fs = require('fs');
  const initSqlPath = path.join(__dirname, 'init.sql');
  
  fs.readFile(initSqlPath, 'utf8', (err, sql) => {
    if (err) {
      console.error('Error reading init.sql:', err);
      return reject(err);
    }
    
    // Use db.exec for better compatibility with complex SQL
    db.exec(sql, (execErr) => {
      if (execErr) {
        console.error('Error executing init.sql:', execErr);
        return reject(execErr);
      }
      
      // Run migrations: timeline columns first, then legacy email tracking
      addTimelineColumns()
        .then(() => addEmailTrackingColumns())
        .then(() => {
          if (process.env.NODE_ENV !== 'test') {
            console.log('Database initialized successfully');
          }
          resolve();
        })
        .catch(reject);
    });
  });
});

// Function to add performance indexes to connections table
const addConnectionIndexes = () => new Promise((resolve, reject) => {
  const indexQueries = [
    'CREATE INDEX IF NOT EXISTS idx_connections_user_id ON connections(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_connections_email_status ON connections(email_status)',
    'CREATE INDEX IF NOT EXISTS idx_connections_created_at ON connections(created_at)',
    'CREATE INDEX IF NOT EXISTS idx_connections_email ON connections(email)'
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
  // Check if we're working with a fresh timeline-enabled schema
  // If current_stage_id column exists, skip legacy migrations
  db.get("PRAGMA table_info(connections)", (err, result) => {
    if (err) {
      return reject(err);
    }
    
    // Check if we have current_stage_id column (indicates timeline schema)
    db.all("PRAGMA table_info(connections)", (pragmaErr, columns) => {
      if (pragmaErr) {
        return reject(pragmaErr);
      }
      
      const hasTimelineColumns = columns.some(col => col.name === 'current_stage_id');
      
      if (hasTimelineColumns) {
        // Skip legacy migrations for timeline-enabled schema
        createDraftsTable()
          .then(() => {
            console.log('Timeline schema detected, skipping legacy column migrations');
            resolve();
          })
          .catch(reject);
        return;
      }
      
      // Proceed with legacy migrations for older schemas
      const alterQueries = [
        'ALTER TABLE connections ADD COLUMN email_status TEXT DEFAULT "Not Contacted"',
        'ALTER TABLE connections ADD COLUMN last_email_draft TEXT',
        'ALTER TABLE connections ADD COLUMN last_email_sent_date DATETIME',
        'ALTER TABLE connections ADD COLUMN custom_connection_description TEXT',
        'ALTER TABLE connections ADD COLUMN initial_purpose TEXT',
        'ALTER TABLE connections ADD COLUMN status_started_date DATETIME',
        'ALTER TABLE connections ADD COLUMN composer_opened_date DATETIME',
        'ALTER TABLE connections ADD COLUMN draft_status TEXT'
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
              // After adding columns, create the drafts table
              createDraftsTable()
                .then(() => {
                  console.log('Email tracking columns migration completed');
                  resolve();
                })
                .catch(reject);
            }
          }
        });
      });
    });
  });
});

// Migration function to add timeline columns to existing connections table
const addTimelineColumns = () => new Promise((resolve, reject) => {
  db.all("PRAGMA table_info(connections)", (err, columns) => {
    if (err) return reject(err);
    
    const hasCurrentStageId = columns.some(col => col.name === 'current_stage_id');
    const hasTimelineData = columns.some(col => col.name === 'timeline_data');
    
    const migrations = [];
    
    if (!hasCurrentStageId) {
      migrations.push("ALTER TABLE connections ADD COLUMN current_stage_id INTEGER");
    }
    
    if (!hasTimelineData) {
      migrations.push("ALTER TABLE connections ADD COLUMN timeline_data TEXT");
    }
    
    if (migrations.length === 0) {
      return resolve(); // Already migrated
    }
    
    let completed = 0;
    migrations.forEach(migration => {
      db.run(migration, (migrationErr) => {
        if (migrationErr && !migrationErr.message.includes('duplicate column name')) {
          return reject(migrationErr);
        }
        
        completed++;
        if (completed === migrations.length) {
          if (process.env.NODE_ENV !== 'test') {
            console.log('Timeline columns migration completed');
          }
          resolve();
        }
      });
    });
  });
});

// Create drafts table for storing multiple drafts per connection
const createDraftsTable = () => new Promise((resolve, reject) => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS drafts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      connection_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (connection_id) REFERENCES connections(id) ON DELETE CASCADE
    )
  `;
  
  db.run(createTableQuery, (err) => {
    if (err) {
      console.error('Error creating drafts table:', err.message);
      reject(err);
    } else {
      // Create index for better performance
      db.run('CREATE INDEX IF NOT EXISTS idx_drafts_connection_id ON drafts(connection_id)', (indexErr) => {
        if (indexErr) {
          console.error('Error creating drafts index:', indexErr.message);
          reject(indexErr);
        } else {
          console.log('Drafts table created successfully');
          resolve();
        }
      });
    }
  });
});

// User operations
const createUser = (googleProfile) => new Promise((resolve, reject) => {
  const { displayName, emails } = googleProfile;
  const email = emails[0].value;
  const username = displayName;

  db.run(
    'INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)',
    [username, email, displayName],
    function insertCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          username,
          email,
          full_name: displayName,
          profile_completed: false,
          onboarding_step: 1,
        });
      }
    },
  );
});

// Create user with email/password (for traditional signup)
const createUserWithEmail = (userData) => new Promise((resolve, reject) => {
  const { 
    email, 
    username, 
    full_name,
    university,
    major,
    year,
    graduation_year
  } = userData;

  db.run(
    `INSERT INTO users (
      username, email, full_name, university, major, year, graduation_year,
      profile_completed, onboarding_step
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [username, email, full_name, university, major, year, graduation_year, false, 2],
    function insertCallback(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          id: this.lastID,
          username,
          email,
          full_name,
          university,
          major,
          year,
          graduation_year,
          profile_completed: false,
          onboarding_step: 2,
        });
      }
    },
  );
});

// Update user profile
const updateUserProfile = (userId, profileData) => new Promise((resolve, reject) => {
  const allowedFields = [
    'full_name', 'university', 'major', 'year', 'graduation_year', 'current_role',
    'linkedin_url', 'phone', 'gpa', 'relevant_coursework', 'interests', 
    'personal_interests', 'technical_skills', 'achievements', 'unique_value',
    'career_goals', 'communication_style', 'networking_approach', 
    'profile_completed', 'onboarding_step', 'gmail_connected', 'gmail_last_sync'
  ];
  
  const updateFields = [];
  const values = [];
  
  Object.keys(profileData).forEach(key => {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      // Convert arrays and objects to JSON strings
      if (Array.isArray(profileData[key]) || typeof profileData[key] === 'object') {
        values.push(JSON.stringify(profileData[key]));
      } else {
        values.push(profileData[key]);
      }
    }
  });
  
  if (updateFields.length === 0) {
    return reject(new Error('No valid fields to update'));
  }
  
  // Add updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(Date.now());
  values.push(userId);
  
  const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
  
  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error updating user profile:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('User not found'));
    } else {
      // Return the updated user
      findUserById(userId)
        .then(user => {
          // Parse JSON fields back to objects/arrays
          const parsedUser = { ...user };
          const jsonFields = ['relevant_coursework', 'interests', 'personal_interests', 
                             'technical_skills', 'achievements', 'career_goals', 
                             'communication_style', 'networking_approach'];
          
          jsonFields.forEach(field => {
            if (parsedUser[field]) {
              try {
                parsedUser[field] = JSON.parse(parsedUser[field]);
              } catch (e) {
                // Keep as string if not valid JSON
              }
            }
          });
          
          resolve(parsedUser);
        })
        .catch(reject);
    }
  });
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
    custom_connection_description = ''
  } = connectionData;

  const timestamp = Date.now();

  db.run(
    `INSERT INTO connections (
      user_id, email, full_name, company, connection_type, 
      job_title, industry, notes, custom_connection_description,
      current_stage_id, timeline_data, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, email, full_name, company, connection_type, job_title, industry, notes, custom_connection_description, null, null, timestamp, timestamp],
    function insertCallback(err) {
      if (err) {
        console.error('Error creating connection:', err);
        reject(err);
      } else {
        const connectionId = this.lastID;
        
        // Create initial timeline stage for the new connection
        createInitialTimeline(connectionId)
          .then(timelineResult => {
            // Return the connection with timeline data populated
            resolve({
              id: connectionId,
              user_id: userId,
              email,
              full_name,
              company,
              connection_type,
              job_title,
              industry,
              notes,
              custom_connection_description,
              current_stage_id: timelineResult.stageId,
              timeline_data: JSON.stringify({
                currentStage: 1,
                stages: [{
                  id: timelineResult.stageId,
                  type: 'first_impression',
                  order: 1,
                  status: 'waiting'
                }]
              }),
              created_at: timestamp,
              updated_at: timestamp,
            });
          })
          .catch(timelineErr => {
            console.error('Error creating initial timeline:', timelineErr);
            // Return connection without timeline data if timeline creation fails
            resolve({
              id: connectionId,
              user_id: userId,
              email,
              full_name,
              company,
              connection_type,
              job_title,
              industry,
              notes,
              custom_connection_description,
              current_stage_id: null,
              timeline_data: null,
              created_at: timestamp,
              updated_at: timestamp,
            });
          });
      }
    }
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
    }
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
    }
  );
});

const updateConnection = (connectionId, updates) => new Promise((resolve, reject) => {
  const allowedFields = [
    'email', 'full_name', 'company', 'connection_type', 
    'job_title', 'industry', 'notes', 'status', 'email_status',
    'custom_connection_description', 'last_email_sent_date',
    'status_started_date', 'composer_opened_date', 'draft_status'
  ];
  
  const updateFields = [];
  const values = [];
  
  Object.keys(updates).forEach(key => {
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
    }
  );
});

// Email status tracking functions
const updateConnectionEmailStatus = (connectionId, status, sentDate = null) => new Promise((resolve, reject) => {
  const validStatuses = [
    'Not Contacted',
    'First Impression',
    'Follow-up',
    'Response',
    'Meeting Scheduled'
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
      .then(connection => {
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
        draftLength: draftContent.length
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
        draft: row.last_email_draft || null
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

// New draft storage functions for multiple drafts
const saveEmailDraftNew = (connectionId, subject, body, status = null) => new Promise((resolve, reject) => {
  if (typeof subject !== 'string' || typeof body !== 'string') {
    return reject(new Error('Subject and body must be strings'));
  }
  
  // Get current connection to determine status if not provided
  if (!status) {
    getConnectionById(connectionId)
      .then(connection => {
        if (connection) {
          saveEmailDraftNew(connectionId, subject, body, connection.email_status)
            .then(resolve)
            .catch(reject);
        } else {
          reject(new Error('Connection not found'));
        }
      })
      .catch(reject);
    return;
  }
  
  const timestamp = Date.now();
  const query = `
    INSERT INTO drafts (connection_id, subject, body, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const values = [connectionId, subject, body, status, timestamp, timestamp];
  
  db.run(query, values, function insertCallback(err) {
    if (err) {
      console.error('Error saving email draft:', err);
      reject(err);
    } else {
      resolve({
        id: this.lastID,
        connectionId,
        subject,
        body,
        status,
        draftSaved: true,
        created_at: timestamp
      });
    }
  });
});

const getConnectionDrafts = (connectionId) => new Promise((resolve, reject) => {
  const query = 'SELECT * FROM drafts WHERE connection_id = ? ORDER BY created_at DESC';
  
  db.all(query, [connectionId], (err, rows) => {
    if (err) {
      console.error('Error fetching connection drafts:', err);
      reject(err);
    } else {
      resolve({
        connectionId,
        drafts: rows || []
      });
    }
  });
});

const deleteDraft = (draftId) => new Promise((resolve, reject) => {
  const query = 'DELETE FROM drafts WHERE id = ?';
  
  db.run(query, [draftId], function deleteCallback(err) {
    if (err) {
      console.error('Error deleting draft:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Draft not found'));
    } else {
      resolve({
        id: draftId,
        deleted: true
      });
    }
  });
});

const updateDraft = (draftId, subject, body) => new Promise((resolve, reject) => {
  if (typeof subject !== 'string' || typeof body !== 'string') {
    return reject(new Error('Subject and body must be strings'));
  }
  
  const query = 'UPDATE drafts SET subject = ?, body = ?, updated_at = ? WHERE id = ?';
  const values = [subject, body, Date.now(), draftId];
  
  db.run(query, values, function updateCallback(err) {
    if (err) {
      console.error('Error updating draft:', err);
      reject(err);
    } else if (this.changes === 0) {
      reject(new Error('Draft not found'));
    } else {
      // Return the updated draft
      db.get('SELECT * FROM drafts WHERE id = ?', [draftId], (selectErr, row) => {
        if (selectErr) {
          reject(selectErr);
        } else {
          resolve(row);
        }
      });
    }
  });
});

// Timeline helper functions for Connection Progression System

// Create a new timeline stage with proper cache updates
const createStage = (connectionId, stageData) => new Promise((resolve, reject) => {
  const {
    stage_type,
    stage_order,
    stage_status = 'waiting',
    email_content,
    draft_content,
    sent_at,
    response_received_at,
    response_deadline
  } = stageData;

  if (!connectionId || !stage_type || !stage_order) {
    return reject(new Error('Connection ID, stage type, and stage order are required'));
  }

  const timestamp = Date.now();
  
  // Start a transaction to create stage and update connection
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    // Insert new stage
    db.run(`
      INSERT INTO connection_timeline_stages (
        connection_id, stage_type, stage_order, stage_status, 
        email_content, draft_content, sent_at, response_received_at, response_deadline,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      connectionId, stage_type, stage_order, stage_status,
      email_content, draft_content, sent_at, response_received_at, response_deadline,
      timestamp, timestamp
    ], function(err) {
      if (err) {
        db.run('ROLLBACK');
        return reject(err);
      }
      
      const newStageId = this.lastID;
      
      // Update connections.current_stage_id to the new stage
      db.run('UPDATE connections SET current_stage_id = ?, updated_at = ? WHERE id = ?', 
        [newStageId, timestamp, connectionId], (updateErr) => {
          if (updateErr) {
            db.run('ROLLBACK');
            return reject(updateErr);
          }
          
          // Update timeline cache
          getTimelineStages(connectionId)
            .then(timeline => {
              const timelineData = JSON.stringify({
                currentStage: timeline.stages.length > 0 ? Math.max(...timeline.stages.map(s => s.stage_order)) : 1,
                stages: timeline.stages.map(stage => ({
                  id: stage.id,
                  type: stage.stage_type,
                  order: stage.stage_order,
                  status: stage.stage_status
                }))
              });
              
              db.run(`
                UPDATE connections 
                SET timeline_data = ?, updated_at = ? 
                WHERE id = ?
              `, [timelineData, timestamp, connectionId], (cacheErr) => {
                if (cacheErr) {
                  db.run('ROLLBACK');
                  return reject(cacheErr);
                }
                
                db.run('COMMIT', (commitErr) => {
                  if (commitErr) {
                    return reject(commitErr);
                  }
                  
                  resolve({
                    id: newStageId,
                    connectionId,
                    stage_type,
                    stage_order,
                    stage_status,
                    created_at: timestamp,
                    updated_at: timestamp,
                    timeline: timeline
                  });
                });
              });
            })
            .catch(err => {
              db.run('ROLLBACK');
              reject(err);
            });
        });
    });
  });
});

// Create initial timeline for a new connection (idempotent)
const createInitialTimeline = (connectionId) => new Promise((resolve, reject) => {
  if (!connectionId) {
    return reject(new Error('Connection ID is required'));
  }
  
  // First check if timeline already exists (idempotent behavior)
  db.get(`
    SELECT id, stage_type, stage_order, stage_status 
    FROM connection_timeline_stages 
    WHERE connection_id = ? 
    ORDER BY stage_order ASC 
    LIMIT 1
  `, [connectionId], (checkErr, existingStage) => {
    if (checkErr) {
      return reject(checkErr);
    }
    
    // If timeline already exists, return existing data
    if (existingStage) {
      return resolve({
        connectionId,
        stageId: existingStage.id,
        stage: {
          id: existingStage.id,
          type: existingStage.stage_type,
          order: existingStage.stage_order,
          status: existingStage.stage_status
        },
        timelineInitialized: false, // Already existed
        existed: true
      });
    }
    
    // Timeline doesn't exist, create it
    const timestamp = Date.now();
    
    // Start a transaction to create the initial timeline and settings
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      
      // Create the first stage: 'first_impression' with 'waiting' status (red circle)
      db.run(`
        INSERT INTO connection_timeline_stages (
          connection_id, stage_type, stage_order, stage_status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [connectionId, 'first_impression', 1, 'waiting', timestamp, timestamp], function(err) {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        
        const stageId = this.lastID;
      
      // Create default connection settings
      db.run(`
        INSERT INTO connection_settings (
          connection_id, follow_up_wait_days, created_at, updated_at
        ) VALUES (?, ?, ?, ?)
      `, [connectionId, 7, timestamp, timestamp], (settingsErr) => {
        if (settingsErr) {
          db.run('ROLLBACK');
          return reject(settingsErr);
        }
        
        // Update connection with current stage and timeline cache
        const timelineData = JSON.stringify({
          currentStage: 1,
          stages: [{
            id: stageId,
            type: 'first_impression',
            order: 1,
            status: 'waiting'
          }]
        });
        
        db.run(`
          UPDATE connections 
          SET current_stage_id = ?, timeline_data = ?, updated_at = ? 
          WHERE id = ?
        `, [stageId, timelineData, timestamp, connectionId], (updateErr) => {
          if (updateErr) {
            db.run('ROLLBACK');
            return reject(updateErr);
          }
          
          db.run('COMMIT', (commitErr) => {
            if (commitErr) {
              return reject(commitErr);
            }
            
            resolve({
              connectionId,
              stageId,
              stage: {
                id: stageId,
                type: 'first_impression',
                order: 1,
                status: 'waiting'
              },
              timelineInitialized: true
            });
          });
        });
      });
    });
    });
  });
});

// Get timeline stages for a connection
const getTimelineStages = (connectionId) => new Promise((resolve, reject) => {
  if (!connectionId) {
    return reject(new Error('Connection ID is required'));
  }

  const query = `
    SELECT * FROM connection_timeline_stages 
    WHERE connection_id = ? 
    ORDER BY stage_order ASC
  `;
  
  db.all(query, [connectionId], (err, stages) => {
    if (err) {
      console.error('Error fetching timeline stages:', err);
      return reject(err);
    }
    
    // Also get connection settings
    db.get(`
      SELECT * FROM connection_settings 
      WHERE connection_id = ?
    `, [connectionId], (settingsErr, settings) => {
      if (settingsErr) {
        console.error('Error fetching connection settings:', settingsErr);
        return reject(settingsErr);
      }
      
      resolve({
        connectionId,
        stages: stages || [],
        settings: settings || { follow_up_wait_days: 7 },
        stageCount: stages ? stages.length : 0
      });
    });
  });
});

// Update stage status and content
const updateStage = (connectionId, stageId, data) => new Promise((resolve, reject) => {
  if (!connectionId || !stageId || !data) {
    return reject(new Error('Connection ID, stage ID, and data are required'));
  }

  const allowedFields = [
    'stage_status', 'email_content', 'draft_content', 
    'sent_at', 'response_received_at', 'response_deadline'
  ];
  
  const updateFields = [];
  const values = [];
  
  Object.keys(data).forEach(key => {
    if (allowedFields.includes(key)) {
      updateFields.push(`${key} = ?`);
      values.push(data[key]);
    }
  });
  
  if (updateFields.length === 0) {
    return reject(new Error('No valid fields to update'));
  }
  
  // Add updated_at timestamp
  updateFields.push('updated_at = ?');
  values.push(Date.now());
  values.push(stageId);
  values.push(connectionId);
  
  const query = `
    UPDATE connection_timeline_stages 
    SET ${updateFields.join(', ')} 
    WHERE id = ? AND connection_id = ?
  `;
  
  db.run(query, values, function(err) {
    if (err) {
      console.error('Error updating stage:', err);
      return reject(err);
    }
    
    if (this.changes === 0) {
      return reject(new Error('Stage not found or access denied'));
    }
    
    // Update timeline cache in connections table
    getTimelineStages(connectionId)
      .then(timeline => {
        const timelineData = JSON.stringify({
          currentStage: timeline.stages.length > 0 ? Math.max(...timeline.stages.map(s => s.stage_order)) : 1,
          stages: timeline.stages.map(stage => ({
            id: stage.id,
            type: stage.stage_type,
            order: stage.stage_order,
            status: stage.stage_status
          }))
        });
        
        db.run(`
          UPDATE connections 
          SET timeline_data = ?, updated_at = ? 
          WHERE id = ?
        `, [timelineData, Date.now(), connectionId], (updateErr) => {
          if (updateErr) {
            console.error('Error updating timeline cache:', updateErr);
          }
          
          resolve({
            stageId,
            connectionId,
            updated: true,
            timeline: timeline
          });
        });
      })
      .catch(reject);
  });
});

module.exports = {
  db,
  createDB,
  initDB,
  createUser,
  createUserWithEmail,
  updateUserProfile,
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
  // New draft functions
  saveEmailDraftNew,
  getConnectionDrafts,
  deleteDraft,
  updateDraft,
  // Timeline functions
  createStage,
  createInitialTimeline,
  getTimelineStages,
  updateStage,
};
