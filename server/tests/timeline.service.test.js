const path = require('path');

// Set test environment before requiring modules
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

// Import timeline service and database functions
const {
  initializeTimeline,
  getConnectionTimeline,
  updateStageStatus,
  createNextStage,
  checkResponseDeadlines,
  getVisibleStages,
  getCurrentStage,
  calculateProgressionStatus
} = require('../services/timeline');

const {
  createConnection,
  createUser,
  getTimelineStages
} = require('../db/connection');

describe('Timeline Service Tests', () => {
  let testUserId;
  let testConnectionId;
  
  // Helper to create test user
  const createTestUser = async () => {
    const googleProfile = {
      displayName: 'Test User',
      emails: [{ value: 'test@example.com' }]
    };
    
    const user = await createUser(googleProfile);
    testUserId = user.id;
    return user;
  };
  
  // Helper to initialize test database schema
  const initTestDB = () => {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const initSqlPath = path.join(__dirname, '../db/init.sql');
      
      fs.readFile(initSqlPath, 'utf8', (err, sql) => {
        if (err) return reject(err);
        
        const { db } = require('../db/connection');
        db.exec(sql, (execErr) => {
          if (execErr) return reject(execErr);
          resolve();
        });
      });
    });
  };
  
  // Helper to create test connection
  const createTestConnection = async () => {
    const testConnectionData = {
      email: 'test@example.com',
      full_name: 'Test Connection',
      company: 'Test Company',
      job_title: 'Test Role',
      industry: 'Technology',
      notes: 'Test connection for timeline service',
      custom_connection_description: 'Met at conference'
    };
    
    const connection = await createConnection(testUserId, testConnectionData);
    testConnectionId = connection.id;
    return connection;
  };
  
  beforeAll(async () => {
    await initTestDB();
    await createTestUser();
  });
  
  afterAll(() => {
    delete process.env.NODE_ENV;
    delete process.env.DB_PATH;
  });
  
  beforeEach(async () => {
    // Clean up any existing timeline data
    const { db } = require('../db/connection');
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM connection_timeline_stages', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM connection_settings', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM connections', (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    await createTestConnection();
  });
  
  describe('initializeTimeline', () => {
    it('should create initial timeline with first_impression stage', async () => {
      const result = await initializeTimeline(testConnectionId);
      
      expect(result).toMatchObject({
        success: true,
        connectionId: testConnectionId,
        timeline: {
          currentStage: {
            type: 'first_impression',
            order: 1,
            status: 'waiting'
          },
          totalStages: 1,
          initialized: true
        },
        message: 'Timeline initialized with first impression stage'
      });
      
      // Verify the stage was actually created in database
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(1);
      expect(timeline.stages[0]).toMatchObject({
        stage_type: 'first_impression',
        stage_order: 1,
        stage_status: 'waiting'
      });
    });
    
    it('should reject when connection ID is missing', async () => {
      await expect(initializeTimeline()).rejects.toThrow('Connection ID is required');
      await expect(initializeTimeline(null)).rejects.toThrow('Connection ID is required');
      await expect(initializeTimeline('')).rejects.toThrow('Connection ID is required');
    });
    
    it('should reject when connection does not exist', async () => {
      await expect(initializeTimeline(99999)).rejects.toThrow('Connection not found');
    });
  });
  
  describe('getConnectionTimeline', () => {
    beforeEach(async () => {
      await initializeTimeline(testConnectionId);
    });
    
    it('should return complete timeline data', async () => {
      const timeline = await getConnectionTimeline(testConnectionId);
      
      expect(timeline).toHaveProperty('connectionId', testConnectionId);
      expect(timeline).toHaveProperty('stages');
      expect(timeline).toHaveProperty('settings');
      expect(timeline).toHaveProperty('visibleStages');
      expect(timeline).toHaveProperty('totalStages', 1);
      expect(timeline).toHaveProperty('currentStage');
      expect(timeline).toHaveProperty('progressionStatus');
      
      expect(timeline.stages).toHaveLength(1);
      expect(timeline.stages[0].stage_type).toBe('first_impression');
    });
    
    it('should calculate visible stages correctly', async () => {
      const timeline = await getConnectionTimeline(testConnectionId);
      
      expect(timeline.visibleStages).toHaveLength(1);
      expect(timeline.visibleStages[0].stage_type).toBe('first_impression');
    });
    
    it('should reject when connection ID is missing', async () => {
      await expect(getConnectionTimeline()).rejects.toThrow('Connection ID is required');
    });
  });
  
  describe('updateStageStatus', () => {
    let stageId;
    
    beforeEach(async () => {
      const result = await initializeTimeline(testConnectionId);
      stageId = result.timeline.currentStage.id;
    });
    
    it('should update stage status from waiting to draft', async () => {
      const result = await updateStageStatus(testConnectionId, stageId, 'draft', {
        draft_content: 'Hello, this is a test draft email.'
      });
      
      expect(result).toMatchObject({
        success: true,
        stageId,
        connectionId: testConnectionId,
        statusUpdated: true,
        newStatus: 'draft',
        nextStageCreated: null
      });
      
      // Verify the stage was updated
      const timeline = await getTimelineStages(testConnectionId);
      const updatedStage = timeline.stages.find(stage => stage.id === stageId);
      expect(updatedStage.stage_status).toBe('draft');
      expect(updatedStage.draft_content).toBe('Hello, this is a test draft email.');
    });
    
    it('should update stage status from draft to sent and auto-create response stage', async () => {
      // First create a draft
      await updateStageStatus(testConnectionId, stageId, 'draft', {
        draft_content: 'Test draft'
      });
      
      // Then mark as sent
      const result = await updateStageStatus(testConnectionId, stageId, 'sent', {
        email_content: 'Final sent email content'
      });
      
      expect(result.success).toBe(true);
      expect(result.newStatus).toBe('sent');
      expect(result.nextStageCreated).toBeTruthy();
      expect(result.nextStageCreated.stageType).toBe('response');
      
      // Verify the stage was updated and response stage created
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(2);
      
      const sentStage = timeline.stages.find(stage => stage.id === stageId);
      expect(sentStage.stage_status).toBe('sent');
      expect(sentStage.email_content).toBe('Final sent email content');
      expect(sentStage.sent_at).toBeTruthy();
      expect(sentStage.response_deadline).toBeTruthy();
      
      const responseStage = timeline.stages.find(stage => stage.stage_type === 'response');
      expect(responseStage).toBeTruthy();
      expect(responseStage.stage_status).toBe('waiting');
      expect(responseStage.stage_order).toBe(2);
    });
    
    it('should add timestamps when marking as sent', async () => {
      const beforeTime = new Date();
      
      const result = await updateStageStatus(testConnectionId, stageId, 'sent', {
        email_content: 'Test email'
      });
      
      const afterTime = new Date();
      
      expect(result.success).toBe(true);
      
      const timeline = await getTimelineStages(testConnectionId);
      const sentStage = timeline.stages.find(stage => stage.id === stageId);
      
      expect(sentStage.sent_at).toBeTruthy();
      const sentTime = new Date(sentStage.sent_at);
      expect(sentTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(sentTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
      expect(sentStage.response_deadline).toBeTruthy();
    });
    
    it('should reject invalid status values', async () => {
      await expect(updateStageStatus(testConnectionId, stageId, 'invalid_status'))
        .rejects.toThrow('Invalid status: invalid_status');
    });
    
    it('should reject when required parameters are missing', async () => {
      await expect(updateStageStatus()).rejects.toThrow('Connection ID, stage ID, and new status are required');
      await expect(updateStageStatus(testConnectionId)).rejects.toThrow('Connection ID, stage ID, and new status are required');
      await expect(updateStageStatus(testConnectionId, stageId)).rejects.toThrow('Connection ID, stage ID, and new status are required');
    });
    
    it('should reject when stage does not exist', async () => {
      await expect(updateStageStatus(testConnectionId, 99999, 'draft'))
        .rejects.toThrow('Stage not found');
    });
  });
  
  describe('createNextStage', () => {
    let stageId;
    
    beforeEach(async () => {
      const result = await initializeTimeline(testConnectionId);
      stageId = result.timeline.currentStage.id;
    });
    
    it('should create response stage after first_impression', async () => {
      const result = await createNextStage(testConnectionId, stageId, 'response');
      
      expect(result).toMatchObject({
        stageType: 'response',
        stageOrder: 2,
        initialStatus: 'waiting',
        created: true,
        message: 'response stage created'
      });
      
      // Verify stage was created
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(2);
      
      const responseStage = timeline.stages.find(stage => stage.stage_type === 'response');
      expect(responseStage).toBeTruthy();
      expect(responseStage.stage_order).toBe(2);
      expect(responseStage.stage_status).toBe('waiting');
    });
    
    it('should create follow_up stage with correct order', async () => {
      // Create response stage first
      await createNextStage(testConnectionId, stageId, 'response');
      
      // Then create follow_up stage
      const result = await createNextStage(testConnectionId, stageId, 'follow_up');
      
      expect(result.stageType).toBe('follow_up');
      expect(result.stageOrder).toBe(3);
      
      const timeline = await getTimelineStages(testConnectionId);
      expect(timeline.stages).toHaveLength(3);
    });
    
    it('should reject invalid stage types', async () => {
      await expect(createNextStage(testConnectionId, stageId, 'invalid_type'))
        .rejects.toThrow('Invalid stage type: invalid_type');
    });
    
    it('should reject when required parameters are missing', async () => {
      await expect(createNextStage()).rejects.toThrow('Connection ID, current stage ID, and stage type are required');
    });
  });
  
  describe('checkResponseDeadlines', () => {
    it('should find and create follow_up stages for expired deadlines', async () => {
      // Initialize timeline and send first impression
      const timeline = await initializeTimeline(testConnectionId);
      const stageId = timeline.timeline.currentStage.id;
      
      // Mark as sent to create response stage with deadline
      await updateStageStatus(testConnectionId, stageId, 'sent', {
        email_content: 'Test email'
      });
      
      // Manually set an expired deadline for testing
      const { db } = require('../db/connection');
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1); // Yesterday
      
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE connection_timeline_stages 
          SET response_deadline = ? 
          WHERE connection_id = ? AND stage_type = 'response'
        `, [expiredDate.toISOString(), testConnectionId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // Check deadlines
      const result = await checkResponseDeadlines();
      
      expect(result.success).toBe(true);
      expect(result.expiredStagesFound).toBe(1);
      expect(result.followUpsCreated).toBe(1);
      expect(result.followUps).toHaveLength(1);
      expect(result.followUps[0]).toMatchObject({
        connectionId: testConnectionId
      });
      
      // Verify follow_up stage was created
      const updatedTimeline = await getTimelineStages(testConnectionId);
      expect(updatedTimeline.stages).toHaveLength(3);
      
      const followUpStage = updatedTimeline.stages.find(stage => stage.stage_type === 'follow_up');
      expect(followUpStage).toBeTruthy();
      expect(followUpStage.stage_status).toBe('waiting');
    });
    
    it('should return empty results when no deadlines are expired', async () => {
      const result = await checkResponseDeadlines();
      
      expect(result.success).toBe(true);
      expect(result.expiredStagesFound).toBe(0);
      expect(result.followUpsCreated).toBe(0);
      expect(result.followUps).toHaveLength(0);
    });
  });
  
  describe('getVisibleStages', () => {
    it('should return all stages when 3 or fewer exist', async () => {
      const stages = [
        { id: 1, stage_order: 1, stage_type: 'first_impression', stage_status: 'sent' },
        { id: 2, stage_order: 2, stage_type: 'response', stage_status: 'waiting' }
      ];
      
      const visible = getVisibleStages(stages);
      expect(visible).toHaveLength(2);
      expect(visible).toEqual(stages);
    });
    
    it('should return maximum 3 stages when more exist', async () => {
      const stages = [
        { id: 1, stage_order: 1, stage_type: 'first_impression', stage_status: 'sent' },
        { id: 2, stage_order: 2, stage_type: 'response', stage_status: 'received' },
        { id: 3, stage_order: 3, stage_type: 'follow_up', stage_status: 'sent' },
        { id: 4, stage_order: 4, stage_type: 'response', stage_status: 'waiting' },
        { id: 5, stage_order: 5, stage_type: 'follow_up', stage_status: 'waiting' }
      ];
      
      const visible = getVisibleStages(stages);
      expect(visible).toHaveLength(3);
    });
    
    it('should handle empty stages array', async () => {
      const visible = getVisibleStages([]);
      expect(visible).toHaveLength(0);
    });
  });
  
  describe('Helper Functions', () => {
    describe('getCurrentStage', () => {
      it('should return the last non-waiting stage', async () => {
        const stages = [
          { id: 1, stage_order: 1, stage_type: 'first_impression', stage_status: 'sent' },
          { id: 2, stage_order: 2, stage_type: 'response', stage_status: 'waiting' }
        ];
        
        const current = getCurrentStage(stages);
        expect(current.id).toBe(1);
        expect(current.stage_status).toBe('sent');
      });
      
      it('should return first stage when all are waiting', async () => {
        const stages = [
          { id: 1, stage_order: 1, stage_type: 'first_impression', stage_status: 'waiting' },
          { id: 2, stage_order: 2, stage_type: 'response', stage_status: 'waiting' }
        ];
        
        const current = getCurrentStage(stages);
        expect(current.id).toBe(1);
      });
    });
    
    describe('calculateProgressionStatus', () => {
      it('should calculate status for not started timeline', async () => {
        const stages = [
          { stage_status: 'waiting' }
        ];
        
        const status = calculateProgressionStatus(stages);
        expect(status.phase).toBe('not_started');
        expect(status.waitingStages).toBe(1);
        expect(status.activeStages).toBe(0);
      });
      
      it('should calculate status for active outreach', async () => {
        const stages = [
          { stage_status: 'sent' },
          { stage_status: 'waiting' }
        ];
        
        const status = calculateProgressionStatus(stages);
        expect(status.phase).toBe('outreach_active');
        expect(status.activeStages).toBe(1);
        expect(status.completedStages).toBe(1);
      });
      
      it('should calculate status for active conversation', async () => {
        const stages = [
          { stage_status: 'sent' },
          { stage_status: 'received' }
        ];
        
        const status = calculateProgressionStatus(stages);
        expect(status.phase).toBe('conversation_active');
        expect(status.completedStages).toBe(2);
      });
    });
  });
  
  describe('Full Timeline Workflow', () => {
    it('should support complete progression: first_impression -> response -> follow_up', async () => {
      // 1. Initialize timeline
      const timeline = await initializeTimeline(testConnectionId);
      const firstStageId = timeline.timeline.currentStage.id;
      
      // 2. Create draft for first impression
      await updateStageStatus(testConnectionId, firstStageId, 'draft', {
        draft_content: 'Hello, I would like to connect...'
      });
      
      // 3. Send first impression (should auto-create response stage)
      const sentResult = await updateStageStatus(testConnectionId, firstStageId, 'sent', {
        email_content: 'Hello, I would like to connect...'
      });
      
      expect(sentResult.nextStageCreated).toBeTruthy();
      expect(sentResult.nextStageCreated.stageType).toBe('response');
      
      // 4. Simulate expired deadline and create follow-up
      const { db } = require('../db/connection');
      const expiredDate = new Date();
      expiredDate.setDate(expiredDate.getDate() - 1);
      
      await new Promise((resolve, reject) => {
        db.run(`
          UPDATE connection_timeline_stages 
          SET response_deadline = ? 
          WHERE connection_id = ? AND stage_type = 'response'
        `, [expiredDate.toISOString(), testConnectionId], (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      // 5. Check deadlines to create follow-up
      const deadlineResult = await checkResponseDeadlines();
      expect(deadlineResult.followUpsCreated).toBe(1);
      
      // 6. Verify final timeline state
      const finalTimeline = await getConnectionTimeline(testConnectionId);
      expect(finalTimeline.stages).toHaveLength(3);
      
      const stageTypes = finalTimeline.stages.map(stage => stage.stage_type);
      expect(stageTypes).toContain('first_impression');
      expect(stageTypes).toContain('response');
      expect(stageTypes).toContain('follow_up');
      
      expect(finalTimeline.progressionStatus.phase).toBe('outreach_active');
    });
  });
});