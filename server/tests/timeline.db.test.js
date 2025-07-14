const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Set test environment before requiring connection module
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

// Import the database functions for integration testing
const {
  createConnection,
  createUser,
  createInitialTimeline,
  getTimelineStages,
  updateStage
} = require('../db/connection');

describe('Timeline Database Integration Tests', () => {
  let testConnectionId;
  let testUserId;
  
  // Helper to create test user
  const createTestUser = () => {
    return new Promise((resolve, reject) => {
      const googleProfile = {
        displayName: 'Test User',
        emails: [{ value: 'test@example.com' }]
      };
      
      createUser(googleProfile)
        .then(user => {
          testUserId = user.id;
          resolve(user);
        })
        .catch(reject);
    });
  };
  
  // Helper to initialize test database schema
  const initTestDB = () => {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
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
    
    // Create a test user for FK constraints
    await createTestUser();
  });
  
  afterAll(() => {
    // Clean up environment
    delete process.env.NODE_ENV;
    delete process.env.DB_PATH;
  });
  
  beforeEach(async () => {
    // Create a test connection before each test
    const testConnectionData = {
      email: 'test@example.com',
      full_name: 'Test User',
      company: 'Test Company',
      job_title: 'Test Role',
      industry: 'Technology',
      notes: 'Test connection for timeline',
      custom_connection_description: 'Met at conference'
    };
    
    const connection = await createConnection(testUserId, testConnectionData);
    testConnectionId = connection.id;
  });
  
  describe('createInitialTimeline', () => {
    it('should create initial timeline with first_impression stage', async () => {
      const result = await createInitialTimeline(testConnectionId);
      
      // Verify the result structure
      expect(result).toHaveProperty('connectionId', testConnectionId);
      expect(result).toHaveProperty('stageId');
      // Note: Since createConnection now calls createInitialTimeline automatically,
      // this will return the existing timeline (timelineInitialized: false)
      expect(result).toHaveProperty('timelineInitialized', false);
      expect(result).toHaveProperty('existed', true);
      expect(result.stage).toEqual({
        id: result.stageId,
        type: 'first_impression',
        order: 1,
        status: 'waiting'
      });
    });
    
    it('should reject when connection ID is missing', async () => {
      await expect(createInitialTimeline()).rejects.toThrow('Connection ID is required');
      await expect(createInitialTimeline(null)).rejects.toThrow('Connection ID is required');
      await expect(createInitialTimeline('')).rejects.toThrow('Connection ID is required');
    });
    
    it('should create connection_settings with default follow_up_wait_days', async () => {
      await createInitialTimeline(testConnectionId);
      
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.settings).toHaveProperty('follow_up_wait_days', 7);
    });
  });
  
  describe('getTimelineStages', () => {
    beforeEach(async () => {
      await createInitialTimeline(testConnectionId);
    });
    
    it('should return timeline stages for a connection', async () => {
      const timeline = await getTimelineStages(testConnectionId);
      
      expect(timeline).toHaveProperty('connectionId', testConnectionId);
      expect(timeline).toHaveProperty('stages');
      expect(timeline).toHaveProperty('settings');
      expect(timeline).toHaveProperty('stageCount', 1);
      
      expect(timeline.stages).toHaveLength(1);
      expect(timeline.stages[0]).toMatchObject({
        connection_id: testConnectionId,
        stage_type: 'first_impression',
        stage_order: 1,
        stage_status: 'waiting'
      });
    });
    
    it('should return stages in correct order', async () => {
      const timeline = await getTimelineStages(testConnectionId);
      
      // Verify stages are ordered by stage_order
      expect(timeline.stages[0].stage_order).toBe(1);
    });
    
    it('should reject when connection ID is missing', async () => {
      await expect(getTimelineStages()).rejects.toThrow('Connection ID is required');
      await expect(getTimelineStages(null)).rejects.toThrow('Connection ID is required');
      await expect(getTimelineStages('')).rejects.toThrow('Connection ID is required');
    });
  });
  
  describe('updateStage', () => {
    let stageId;
    
    beforeEach(async () => {
      const result = await createInitialTimeline(testConnectionId);
      stageId = result.stageId;
    });
    
    it('should update stage status from waiting to draft', async () => {
      const updateData = {
        stage_status: 'draft',
        draft_content: 'Hello, this is a test draft email.'
      };
      
      const result = await updateStage(testConnectionId, stageId, updateData);
      
      expect(result).toHaveProperty('stageId', stageId);
      expect(result).toHaveProperty('connectionId', testConnectionId);
      expect(result).toHaveProperty('updated', true);
      expect(result).toHaveProperty('timeline');
      
      // Verify the stage was actually updated
      const timeline = await getTimelineStages(testConnectionId);
      const updatedStage = timeline.stages.find(stage => stage.id === stageId);
      expect(updatedStage.stage_status).toBe('draft');
      expect(updatedStage.draft_content).toBe('Hello, this is a test draft email.');
    });
    
    it('should update stage status from draft to sent', async () => {
      // First create a draft
      await updateStage(testConnectionId, stageId, {
        stage_status: 'draft',
        draft_content: 'Test draft'
      });
      
      // Then mark as sent
      const sentTime = new Date().toISOString();
      const updateData = {
        stage_status: 'sent',
        email_content: 'Final sent email content',
        sent_at: sentTime
      };
      
      const result = await updateStage(testConnectionId, stageId, updateData);
      
      expect(result.updated).toBe(true);
      
      // Verify the stage was updated
      const timeline = await getTimelineStages(testConnectionId);
      const updatedStage = timeline.stages.find(stage => stage.id === stageId);
      expect(updatedStage.stage_status).toBe('sent');
      expect(updatedStage.email_content).toBe('Final sent email content');
      expect(updatedStage.sent_at).toBe(sentTime);
    });
    
    it('should reject when required parameters are missing', async () => {
      await expect(updateStage()).rejects.toThrow('Connection ID, stage ID, and data are required');
      await expect(updateStage(testConnectionId)).rejects.toThrow('Connection ID, stage ID, and data are required');
      await expect(updateStage(testConnectionId, stageId)).rejects.toThrow('Connection ID, stage ID, and data are required');
    });
    
    it('should reject when no valid fields are provided', async () => {
      const invalidData = {
        invalid_field: 'invalid_value',
        another_invalid: 'also_invalid'
      };
      
      await expect(updateStage(testConnectionId, stageId, invalidData))
        .rejects.toThrow('No valid fields to update');
    });
    
    it('should reject when stage ID does not exist', async () => {
      const updateData = { stage_status: 'draft' };
      
      await expect(updateStage(testConnectionId, 99999, updateData))
        .rejects.toThrow('Stage not found or access denied');
    });
  });
  
  describe('Full Timeline Workflow', () => {
    it('should support complete first impression workflow', async () => {
      // 1. Create initial timeline
      const timeline = await createInitialTimeline(testConnectionId);
      expect(timeline.stage.status).toBe('waiting');
      
      // 2. Create draft
      await updateStage(testConnectionId, timeline.stageId, {
        stage_status: 'draft',
        draft_content: 'Draft email content'
      });
      
      let stages = await getTimelineStages(testConnectionId);
      expect(stages.stages[0].stage_status).toBe('draft');
      
      // 3. Send email
      await updateStage(testConnectionId, timeline.stageId, {
        stage_status: 'sent',
        email_content: 'Final sent email',
        sent_at: new Date().toISOString()
      });
      
      stages = await getTimelineStages(testConnectionId);
      expect(stages.stages[0].stage_status).toBe('sent');
      expect(stages.stages[0].email_content).toBe('Final sent email');
    });
    
    it('should maintain timeline data consistency', async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      
      // Update the stage
      await updateStage(testConnectionId, timeline.stageId, {
        stage_status: 'draft',
        draft_content: 'Test draft'
      });
      
      // Verify timeline data is updated
      const stages = await getTimelineStages(testConnectionId);
      expect(stages.stages).toHaveLength(1);
      expect(stages.stages[0].stage_status).toBe('draft');
    });
  });
  
  describe('Default Timeline State', () => {
    it('should have default "first_impression" stage in waiting status', async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      const stages = await getTimelineStages(testConnectionId);
      
      expect(stages.stages).toHaveLength(1);
      expect(stages.stages[0].stage_type).toBe('first_impression');
      expect(stages.stages[0].stage_status).toBe('waiting');
      expect(stages.stages[0].stage_order).toBe(1);
    });
  });

  describe('Phase 9: Idempotent Timeline Creation', () => {
    it('should create initial timeline when none exists', async () => {
      // Create a fresh connection without using createConnection (which now auto-creates timeline)
      const { db } = require('../db/connection');
      const timestamp = Date.now();
      
      const freshConnectionId = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO connections (
            user_id, email, full_name, company, connection_type, 
            job_title, industry, notes, custom_connection_description,
            current_stage_id, timeline_data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [testUserId, 'fresh@example.com', 'Fresh User', 'Fresh Corp', 'professional', 'Engineer', 'Tech', 'Notes', '', null, null, timestamp, timestamp], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      // Now create timeline for the first time
      const result = await createInitialTimeline(freshConnectionId);
      
      expect(result.connectionId).toBe(freshConnectionId);
      expect(result.stageId).toBeDefined();
      expect(result.stage.type).toBe('first_impression');
      expect(result.stage.status).toBe('waiting');
      expect(result.stage.order).toBe(1);
      expect(result.timelineInitialized).toBe(true);
      expect(result.existed).toBeUndefined();
      
      // Verify timeline was created in database
      const timeline = await getTimelineStages(freshConnectionId);
      expect(timeline.stages).toHaveLength(1);
      expect(timeline.stages[0].stage_type).toBe('first_impression');
    });

    it('should return existing timeline when called again (idempotent)', async () => {
      // Create timeline first time
      const firstResult = await createInitialTimeline(testConnectionId);
      
      // Call again - should return existing timeline
      const secondResult = await createInitialTimeline(testConnectionId);
      
      expect(secondResult.connectionId).toBe(testConnectionId);
      expect(secondResult.stageId).toBe(firstResult.stageId); // Same stage ID
      expect(secondResult.stage.type).toBe('first_impression');
      expect(secondResult.stage.status).toBe('waiting');
      expect(secondResult.stage.order).toBe(1);
      expect(secondResult.timelineInitialized).toBe(false); // Not newly initialized
      expect(secondResult.existed).toBe(true); // Indicates it already existed
      
      // Verify no duplicate stages were created
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(1);
    });

    it('should not create duplicate timeline stages', async () => {
      // Create timeline multiple times
      await createInitialTimeline(testConnectionId);
      await createInitialTimeline(testConnectionId);
      await createInitialTimeline(testConnectionId);
      
      // Should still only have one stage
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(1);
      expect(timeline.stages[0].stage_type).toBe('first_impression');
      expect(timeline.stages[0].stage_order).toBe(1);
    });

    it('should work correctly with connection that has existing stages', async () => {
      // Create a fresh connection and manually add a stage with 'draft' status
      const { db } = require('../db/connection');
      const timestamp = Date.now();
      
      const freshConnectionId = await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO connections (
            user_id, email, full_name, company, connection_type, 
            job_title, industry, notes, custom_connection_description,
            current_stage_id, timeline_data, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [testUserId, 'existing@example.com', 'Existing User', 'Existing Corp', 'professional', 'Engineer', 'Tech', 'Notes', '', null, null, timestamp, timestamp], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      // Manually create a timeline stage with 'draft' status
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO connection_timeline_stages (
            connection_id, stage_type, stage_order, stage_status, 
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?)
        `, [freshConnectionId, 'first_impression', 1, 'draft', timestamp, timestamp], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      // Now call createInitialTimeline - should return existing
      const result = await createInitialTimeline(freshConnectionId);
      
      expect(result.existed).toBe(true);
      expect(result.stage.status).toBe('draft'); // Preserves existing status
      expect(result.timelineInitialized).toBe(false);
      
      // Should still only have one stage
      const timeline = await getTimelineStages(freshConnectionId);
      expect(timeline.stages).toHaveLength(1);
    });
  });
});