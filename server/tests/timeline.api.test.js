// Set test environment FIRST
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

// Mock auth middleware before ANY imports
jest.mock('../middleware/auth', () => ({
  requireAuth: (req, res, next) => {
    // This will be set properly in beforeAll
    req.user = global.testUser || { id: 1 };
    next();
  }
}));

const request = require('supertest');
const path = require('path');
const { app } = require('../index');
const {
  createUser,
  createConnection,
  createInitialTimeline,
  db
} = require('../db/connection');

describe('Timeline API Integration Tests', () => {
  let testUserId;
  let testConnectionId;
  let authToken;
  let testUser;
  
  // Helper to create test user and get auth token
  const createTestUser = async () => {
    const timestamp = Date.now();
    const googleProfile = {
      displayName: `Test User ${timestamp}`,
      emails: [{ value: `test${timestamp}@example.com` }]
    };
    
    const user = await createUser(googleProfile);
    testUserId = user.id;
    testUser = user;
    
    // Create a mock auth token (in real app this would come from session/JWT)
    authToken = 'mock-auth-token';
    return user;
  };
  
  // Helper to initialize test database schema
  const initTestDB = () => {
    return new Promise((resolve, reject) => {
      const fs = require('fs');
      const initSqlPath = path.join(__dirname, '../db/init.sql');
      
      fs.readFile(initSqlPath, 'utf8', (err, sql) => {
        if (err) return reject(err);
        
        // Use db.exec for better compatibility with complex SQL
        db.exec(sql, (execErr) => {
          if (execErr) {
            console.error('Error executing init.sql:', execErr);
            return reject(execErr);
          }
          resolve();
        });
      });
    });
  };
  
  // Helper to create test connection
  const createTestConnection = async () => {
    const timestamp = Date.now();
    const testConnectionData = {
      email: `testconnection${timestamp}@example.com`,
      full_name: 'Test Connection',
      company: 'Test Company',
      job_title: 'Test Role',
      industry: 'Technology',
      notes: 'Test connection for timeline API',
      custom_connection_description: 'Met at conference'
    };
    
    const connection = await createConnection(testUserId, testConnectionData);
    testConnectionId = connection.id;
    return connection;
  };
  
  // Setup test environment
  beforeAll(async () => {
    await initTestDB();
    await createTestUser();
    
    // Set global testUser for the mock
    global.testUser = testUser;
  });
  
  afterAll(() => {
    delete process.env.NODE_ENV;
    delete process.env.DB_PATH;
    delete global.testUser;
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
  
  describe('GET /api/connections/:id/timeline', () => {
    it('should return timeline for existing connection', async () => {
      // Initialize timeline first
      await createInitialTimeline(testConnectionId);
      
      const response = await request(app)
        .get(`/api/connections/${testConnectionId}/timeline`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Timeline retrieved successfully');
      expect(response.body).toHaveProperty('timeline');
      expect(response.body.timeline).toHaveProperty('connectionId', testConnectionId);
      expect(response.body.timeline).toHaveProperty('stages');
      expect(response.body.timeline).toHaveProperty('settings');
      expect(response.body.timeline.stages).toHaveLength(1);
      expect(response.body.timeline.stages[0].stage_type).toBe('first_impression');
    });
    
    it('should return 404 for non-existent connection', async () => {
      const response = await request(app)
        .get('/api/connections/99999/timeline')
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Connection not found');
    });
    
    it('should return 400 for invalid connection ID', async () => {
      const response = await request(app)
        .get('/api/connections/invalid/timeline')
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Invalid connection ID');
    });
  });
  
  describe('POST /api/connections/:id/timeline/stage', () => {
    it('should initialize timeline when no stage_type provided', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/stage`)
        .send({})
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Timeline stage created successfully');
      expect(response.body).toHaveProperty('stage');
      expect(response.body.stage.timeline.currentStage.type).toBe('first_impression');
    });
    
    it('should create response stage when stage_type provided', async () => {
      // Initialize timeline first
      const timeline = await createInitialTimeline(testConnectionId);
      
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/stage`)
        .send({
          stage_type: 'response',
          current_stage_id: timeline.stageId
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('message', 'Timeline stage created successfully');
      expect(response.body.stage.stageType).toBe('response');
      expect(response.body.stage.stageOrder).toBe(2);
    });
    
    it('should validate stage_type values', async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/stage`)
        .send({
          stage_type: 'invalid_type',
          current_stage_id: timeline.stageId
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('Stage type must be one of: first_impression, response, follow_up');
    });
    
    it('should require current_stage_id when stage_type provided', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/stage`)
        .send({
          stage_type: 'response'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('current_stage_id is required');
    });
  });
  
  describe('PUT /api/connections/:id/timeline/stage/:stageId', () => {
    let stageId;
    
    beforeEach(async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      stageId = timeline.stageId;
    });
    
    it('should update stage status successfully', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/stage/${stageId}`)
        .send({
          stage_status: 'draft',
          draft_content: 'Test draft content'
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Timeline stage updated successfully');
      expect(response.body).toHaveProperty('result');
      expect(response.body.result.newStatus).toBe('draft');
    });
    
    it('should auto-create response stage when sending email', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/stage/${stageId}`)
        .send({
          stage_status: 'sent',
          email_content: 'Test sent email'
        })
        .expect(200);
      
      expect(response.body.result.newStatus).toBe('sent');
      expect(response.body.result.nextStageCreated).toBeTruthy();
      expect(response.body.result.nextStageCreated.stageType).toBe('response');
    });
    
    it('should validate stage status values', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/stage/${stageId}`)
        .send({
          stage_status: 'invalid_status'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('Stage status must be one of: waiting, draft, sent, received');
    });
    
    it('should return 404 for non-existent stage', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/stage/99999`)
        .send({
          stage_status: 'draft'
        })
        .expect(404);
      
      expect(response.body).toHaveProperty('error', 'Stage not found');
    });
    
    it('should return 400 for invalid stage ID', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/stage/invalid`)
        .send({
          stage_status: 'draft'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Invalid stage ID');
    });
  });
  
  describe('DELETE /api/connections/:id/timeline/stage/:stageId', () => {
    let stageId;
    
    beforeEach(async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      stageId = timeline.stageId;
    });
    
    it('should return 501 for stage deletion (not implemented)', async () => {
      const response = await request(app)
        .delete(`/api/connections/${testConnectionId}/timeline/stage/${stageId}`)
        .expect(501);
      
      expect(response.body).toHaveProperty('error', 'Not implemented');
      expect(response.body.message).toContain('Stage deletion is not yet supported');
    });
  });
  
  describe('POST /api/connections/:id/timeline/advance', () => {
    let stageId;
    
    beforeEach(async () => {
      const timeline = await createInitialTimeline(testConnectionId);
      stageId = timeline.stageId;
    });
    
    it('should initialize timeline with initialize action', async () => {
      // Clean up existing timeline
      const { db } = require('../db/connection');
      await new Promise((resolve) => {
        db.run('DELETE FROM connection_timeline_stages WHERE connection_id = ?', [testConnectionId], () => resolve());
      });
      
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'initialize'
        })
        .expect(200);
      
      expect(response.body.message).toContain('initialize');
      expect(response.body.result.timeline.currentStage.type).toBe('first_impression');
    });
    
    it('should send email with send_email action', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'send_email',
          stage_id: stageId,
          content: {
            email_content: 'Test email content'
          }
        })
        .expect(200);
      
      expect(response.body.message).toContain('send_email');
      expect(response.body.result.newStatus).toBe('sent');
    });
    
    it('should create draft with create_draft action', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'create_draft',
          stage_id: stageId,
          content: {
            draft_content: 'Test draft content'
          }
        })
        .expect(200);
      
      expect(response.body.message).toContain('create_draft');
      expect(response.body.result.newStatus).toBe('draft');
    });
    
    it('should mark response with mark_response action', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'mark_response',
          stage_id: stageId
        })
        .expect(200);
      
      expect(response.body.message).toContain('mark_response');
      expect(response.body.result.newStatus).toBe('received');
    });
    
    it('should check deadlines with check_deadlines action', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'check_deadlines'
        })
        .expect(200);
      
      expect(response.body.message).toContain('check_deadlines');
      expect(response.body.result).toHaveProperty('success', true);
    });
    
    it('should validate action parameter', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({})
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('Action is required');
    });
    
    it('should validate stage_id for actions that require it', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'send_email'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.message).toContain('stage_id is required');
    });
    
    it('should return 400 for invalid action', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/advance`)
        .send({
          action: 'invalid_action'
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Invalid action');
    });
  });
  
  describe('GET /api/connections/:id/timeline/settings', () => {
    beforeEach(async () => {
      await createInitialTimeline(testConnectionId);
    });
    
    it('should return timeline settings', async () => {
      const response = await request(app)
        .get(`/api/connections/${testConnectionId}/timeline/settings`)
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Timeline settings retrieved successfully');
      expect(response.body).toHaveProperty('settings');
      expect(response.body.settings).toHaveProperty('follow_up_wait_days', 7);
    });
  });
  
  describe('PUT /api/connections/:id/timeline/settings', () => {
    beforeEach(async () => {
      await createInitialTimeline(testConnectionId);
    });
    
    it('should update timeline settings', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/settings`)
        .send({
          follow_up_wait_days: 14
        })
        .expect(200);
      
      expect(response.body).toHaveProperty('message', 'Timeline settings updated successfully');
      expect(response.body.settings.follow_up_wait_days).toBe(14);
    });
    
    it('should validate follow_up_wait_days range', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/settings`)
        .send({
          follow_up_wait_days: 0
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('Follow-up wait days must be an integer between 1 and 30');
    });
    
    it('should validate follow_up_wait_days upper limit', async () => {
      const response = await request(app)
        .put(`/api/connections/${testConnectionId}/timeline/settings`)
        .send({
          follow_up_wait_days: 50
        })
        .expect(400);
      
      expect(response.body).toHaveProperty('error', 'Validation failed');
      expect(response.body.details).toContain('Follow-up wait days must be an integer between 1 and 30');
    });
  });
  
  describe('Ownership and Security', () => {
    let otherUserId;
    let otherConnectionId;
    
    beforeEach(async () => {
      // Create another user and connection with unique email and username
      const timestamp = Date.now();
      const otherUser = await createUser({
        displayName: `Other User ${timestamp}`,
        emails: [{ value: `other${timestamp}@example.com` }]
      });
      otherUserId = otherUser.id;
      
      const otherConnection = await createConnection(otherUserId, {
        email: `otherconnection${timestamp}@example.com`,
        full_name: 'Other Connection',
        company: 'Other Company',
        job_title: 'Other Role',
        industry: 'Technology'
      });
      otherConnectionId = otherConnection.id;
    });
    
    it('should deny access to other users connections', async () => {
      // Try to access other user's connection
      const response = await request(app)
        .get(`/api/connections/${otherConnectionId}/timeline`)
        .expect(403);
      
      expect(response.body).toHaveProperty('error', 'Access denied');
      expect(response.body.message).toContain('You do not have permission');
    });
    
    it('should deny update access to other users connections', async () => {
      await createInitialTimeline(otherConnectionId);
      
      const response = await request(app)
        .put(`/api/connections/${otherConnectionId}/timeline/settings`)
        .send({
          follow_up_wait_days: 14
        })
        .expect(403);
      
      expect(response.body).toHaveProperty('error', 'Access denied');
    });
  });
  
  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Try to access timeline before initialization
      const response = await request(app)
        .get(`/api/connections/${testConnectionId}/timeline`)
        .expect(200); // Should still return empty timeline
      
      expect(response.body.timeline.stages).toHaveLength(0);
    });
    
    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post(`/api/connections/${testConnectionId}/timeline/stage`)
        .set('Content-Type', 'application/json')
        .send('{"invalid": json}')
        .expect(400);
      
      // Express should handle malformed JSON and return 400
    });
  });
});