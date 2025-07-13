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
      expect(result).toHaveProperty('timelineInitialized', true);
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
});