// Set test environment FIRST
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

const { db, initDB, createConnection } = require('../db/connection');

describe('Timeline Columns Migration', () => {
  
  beforeEach(async () => {
    // Create legacy connections table without timeline columns
    const legacySql = `
      DROP TABLE IF EXISTS connections;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS connection_timeline_stages;
      DROP TABLE IF EXISTS connection_settings;
      DROP TABLE IF EXISTS drafts;
      
      CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        full_name TEXT,
        created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
        updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE connections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        email TEXT NOT NULL,
        full_name TEXT NOT NULL,
        company TEXT,
        connection_type TEXT,
        job_title TEXT,
        industry TEXT,
        notes TEXT,
        custom_connection_description TEXT DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `;
    
    return new Promise((resolve, reject) => {
      db.exec(legacySql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
  
  it('should add timeline columns to legacy connections table', async () => {
    // Verify columns don't exist initially
    const initialColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(connections)", (err, columns) => {
        if (err) reject(err);
        else resolve(columns);
      });
    });
    
    expect(initialColumns.find(col => col.name === 'current_stage_id')).toBeUndefined();
    expect(initialColumns.find(col => col.name === 'timeline_data')).toBeUndefined();
    
    // Run migration via initDB
    await initDB();
    
    // Verify columns were added
    const migratedColumns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(connections)", (err, columns) => {
        if (err) reject(err);
        else resolve(columns);
      });
    });
    
    expect(migratedColumns.find(col => col.name === 'current_stage_id')).toBeDefined();
    expect(migratedColumns.find(col => col.name === 'timeline_data')).toBeDefined();
  });
  
  it('should allow creating connections with timeline columns', async () => {
    // Run migration first
    await initDB();
    
    // Insert test user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)",
        ['testuser', 'test@example.com', 'Test User'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Create connection (should succeed with timeline columns)
    const connectionData = {
      email: 'connection@example.com',
      full_name: 'Test Connection',
      company: 'Test Corp',
      connection_type: 'professional',
      job_title: 'Engineer',
      industry: 'Tech',
      notes: 'Test notes',
      custom_connection_description: 'Test description'
    };
    
    const result = await createConnection(userId, connectionData);
    
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.email).toBe('connection@example.com');
    expect(result.full_name).toBe('Test Connection');
  });
  
  it('should populate timeline columns with null values for new connections', async () => {
    // Run migration first
    await initDB();
    
    // Insert test user
    const userId = await new Promise((resolve, reject) => {
      db.run(
        "INSERT INTO users (username, email, full_name) VALUES (?, ?, ?)",
        ['testuser', 'test@example.com', 'Test User'],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
    
    // Create connection
    const connectionData = {
      email: 'connection@example.com',
      full_name: 'Test Connection',
      company: 'Test Corp',
      connection_type: 'professional',
      job_title: 'Engineer',
      industry: 'Tech',
      notes: 'Test notes',
      custom_connection_description: 'Test description'
    };
    
    const result = await createConnection(userId, connectionData);
    
    // Verify the connection was inserted with null timeline columns
    const savedConnection = await new Promise((resolve, reject) => {
      db.get(
        "SELECT * FROM connections WHERE id = ?",
        [result.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    expect(savedConnection.current_stage_id).toBeNull();
    expect(savedConnection.timeline_data).toBeNull();
  });
  
  it('should handle duplicate column migration gracefully', async () => {
    // Run migration first time
    await initDB();
    
    // Verify columns exist
    let columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(connections)", (err, cols) => {
        if (err) reject(err);
        else resolve(cols);
      });
    });
    
    expect(columns.find(col => col.name === 'current_stage_id')).toBeDefined();
    expect(columns.find(col => col.name === 'timeline_data')).toBeDefined();
    
    // Run migration again (should not error)
    await expect(initDB()).resolves.toBeUndefined();
    
    // Verify columns still exist
    columns = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(connections)", (err, cols) => {
        if (err) reject(err);
        else resolve(cols);
      });
    });
    
    expect(columns.find(col => col.name === 'current_stage_id')).toBeDefined();
    expect(columns.find(col => col.name === 'timeline_data')).toBeDefined();
  });
});