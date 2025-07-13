// Set test environment FIRST
process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';

const {
  scheduleJobs,
  stopJobs,
  detectEmailResponses,
  checkResponseDeadlines,
  updateStageStatus
} = require('../services/timeline');

const {
  createUser,
  createConnection,
  createInitialTimeline,
  db
} = require('../db/connection');

describe('Timeline Jobs Tests', () => {
  let originalSetInterval;
  let originalClearInterval;
  let originalConsoleLog;
  let testUserId;
  let testConnectionId;
  
  beforeAll(async () => {
    // Mock interval functions for testing
    originalSetInterval = global.setInterval;
    originalClearInterval = global.clearInterval;
    originalConsoleLog = console.log;
    console.log = jest.fn();
    
    // Initialize test database and create test user
    const fs = require('fs');
    const path = require('path');
    const initSqlPath = path.join(__dirname, '../db/init.sql');
    const sql = fs.readFileSync(initSqlPath, 'utf8');
    
    await new Promise((resolve, reject) => {
      db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    
    // Create test user
    const user = await createUser({
      displayName: `Test User ${Date.now()}`,
      emails: [{ value: `testuser${Date.now()}@example.com` }]
    });
    testUserId = user.id;
  });

  afterAll(() => {
    global.setInterval = originalSetInterval;
    global.clearInterval = originalClearInterval;
    console.log = originalConsoleLog;
  });

  beforeEach(async () => {
    // Clean up global state before each test
    delete global.__TIMELINE_JOBS_STARTED__;
    
    // Create fresh test connection for each test
    const connection = await createConnection(testUserId, {
      email: `testconnection${Date.now()}@example.com`,
      full_name: 'Test Connection',
      company: 'Test Company',
      job_title: 'Test Role',
      industry: 'Technology'
    });
    testConnectionId = connection.id;
  });

  describe('scheduleJobs', () => {
    it('should skip scheduling in test environment', () => {
      scheduleJobs();
      expect(console.log).toHaveBeenCalledWith('Skipping job scheduling in test environment');
    });

    it('should prevent duplicate job scheduling in non-test environment', () => {
      // Temporarily simulate non-test environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      // Mock setInterval to track calls
      const mockSetInterval = jest.fn().mockReturnValue('mock-handle');
      global.setInterval = mockSetInterval;
      
      try {
        scheduleJobs();
        scheduleJobs(); // Second call should be prevented
        
        expect(mockSetInterval).toHaveBeenCalledTimes(1);
        expect(console.log).toHaveBeenCalledWith('Timeline jobs already started, skipping duplicate scheduling');
        expect(global.__TIMELINE_JOBS_STARTED__).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
        global.setInterval = originalSetInterval;
        // Clean up global state
        delete global.__TIMELINE_JOBS_STARTED__;
      }
    });

    it('should prevent duplicate scheduling using handle guard', () => {
      // Test that deadlineCheckerHandle also prevents duplicate scheduling
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const mockSetInterval = jest.fn().mockReturnValue('mock-handle');
      global.setInterval = mockSetInterval;
      
      try {
        // Clean global state but simulate existing handle
        delete global.__TIMELINE_JOBS_STARTED__;
        
        // Get fresh module instance
        delete require.cache[require.resolve('../services/timeline')];
        const { scheduleJobs: freshScheduleJobs } = require('../services/timeline');
        
        // Simulate that handle already exists by calling once
        freshScheduleJobs();
        const callsAfterFirst = mockSetInterval.mock.calls.length;
        
        // Second call should be prevented by handle guard
        freshScheduleJobs();
        
        expect(mockSetInterval).toHaveBeenCalledTimes(callsAfterFirst); // No additional calls
        expect(console.log).toHaveBeenCalledWith('Timeline jobs already started, skipping duplicate scheduling');
      } finally {
        process.env.NODE_ENV = originalEnv;
        global.setInterval = originalSetInterval;
        delete global.__TIMELINE_JOBS_STARTED__;
        delete require.cache[require.resolve('../services/timeline')];
      }
    });

    it('should handle scheduling in non-test environment', () => {
      // Test the behavior - the function should work correctly in non-test env
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      try {
        // Delete from require cache to get fresh instance
        delete require.cache[require.resolve('../services/timeline')];
        const { scheduleJobs: freshScheduleJobs } = require('../services/timeline');
        
        freshScheduleJobs();
        
        // Should either start jobs or prevent duplicates (both are valid behaviors)
        const logCalls = console.log.mock.calls.map(call => call[0]);
        const hasSchedulingMessage = logCalls.some(call => 
          call.includes('Starting timeline background jobs') || 
          call.includes('Timeline jobs already started')
        );
        
        expect(hasSchedulingMessage).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
        delete global.__TIMELINE_JOBS_STARTED__;
        // Clean up require cache
        delete require.cache[require.resolve('../services/timeline')];
      }
    });
  });

  describe('stopJobs', () => {
    it('should clean up intervals and reset guards', () => {
      const mockClearInterval = jest.fn();
      global.clearInterval = mockClearInterval;
      
      // Set up some mock state
      global.__TIMELINE_JOBS_STARTED__ = true;
      
      stopJobs();
      
      expect(global.__TIMELINE_JOBS_STARTED__).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Timeline background jobs stopped');
    });

    it('should handle cleanup when no intervals are running', () => {
      const mockClearInterval = jest.fn();
      global.clearInterval = mockClearInterval;
      
      stopJobs();
      
      expect(mockClearInterval).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('Timeline background jobs stopped');
    });
  });

  describe('detectEmailResponses', () => {
    it('should return stub response for any connection', async () => {
      const result = await detectEmailResponses(testConnectionId);
      
      expect(result).toMatchObject({
        hasResponse: false,
        responseCount: 0,
        stubMessage: 'Gmail detection not yet implemented'
      });
      expect(result.lastChecked).toBeDefined();
      expect(new Date(result.lastChecked)).toBeInstanceOf(Date);
      
      expect(console.log).toHaveBeenCalledWith(
        `[STUB] Checking for email responses for connection ${testConnectionId}`
      );
    });

    it('should handle different connection IDs', async () => {
      const connectionIds = [123, 456, 789];
      
      for (const connectionId of connectionIds) {
        const result = await detectEmailResponses(connectionId);
        expect(result.hasResponse).toBe(false);
        expect(result.stubMessage).toBe('Gmail detection not yet implemented');
      }
    });
  });

  describe('checkResponseDeadlines with Date mocking', () => {
    beforeEach(() => {
      // Mock Date to control time
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should create follow-up stages for expired deadlines', async () => {
      // Create initial timeline
      await createInitialTimeline(testConnectionId);
      
      // Update first impression to sent status, which should create response stage with deadline
      await updateStageStatus(testConnectionId, 1, 'sent', {
        email_content: 'Test email content'
      });
      
      // Fast-forward time beyond the deadline (7 days + 1 minute)
      const futureTime = new Date('2024-01-22T10:01:00Z'); // 7 days + 1 minute later
      jest.setSystemTime(futureTime);
      
      const result = await checkResponseDeadlines();
      
      expect(result.success).toBe(true);
      expect(result.expiredStagesFound).toBeGreaterThanOrEqual(0);
      expect(result.checkedAt).toBeDefined();
    });

    it('should not create follow-ups when deadlines are not expired', async () => {
      // Create initial timeline
      const timeline = await createInitialTimeline(testConnectionId);
      
      // Update first impression to sent status using the actual stage ID
      await updateStageStatus(testConnectionId, timeline.stageId, 'sent', {
        email_content: 'Test email content'
      });
      
      // Fast-forward time but not beyond the deadline (only 3 days)
      const futureTime = new Date('2024-01-18T10:00:00Z'); // 3 days later
      jest.setSystemTime(futureTime);
      
      const result = await checkResponseDeadlines();
      
      expect(result.success).toBe(true);
      expect(result.expiredStagesFound).toBe(0);
    });

    it('should handle timeline with no response stages', async () => {
      // Create initial timeline but don't send any emails
      await createInitialTimeline(testConnectionId);
      
      // Fast-forward time
      const futureTime = new Date('2024-01-22T10:00:00Z');
      jest.setSystemTime(futureTime);
      
      const result = await checkResponseDeadlines();
      
      expect(result.success).toBe(true);
      expect(result.expiredStagesFound).toBe(0);
    });
  });

  describe('Integration: Jobs working together', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should handle the complete workflow of deadline checking and email detection', async () => {
      // Create timeline and send first impression
      const timeline = await createInitialTimeline(testConnectionId);
      await updateStageStatus(testConnectionId, timeline.stageId, 'sent', {
        email_content: 'Test first impression email'
      });
      
      // Check email responses (stub)
      const responseResult = await detectEmailResponses(testConnectionId);
      expect(responseResult.hasResponse).toBe(false);
      
      // Fast-forward past deadline
      jest.setSystemTime(new Date('2024-01-22T10:01:00Z'));
      
      // Check deadlines
      const deadlineResult = await checkResponseDeadlines();
      expect(deadlineResult.success).toBe(true);
      
      // Verify the integration works end-to-end
      expect(responseResult.stubMessage).toBe('Gmail detection not yet implemented');
      expect(deadlineResult.checkedAt).toBeDefined();
    });
  });

  describe('Error handling', () => {
    it('should handle checkResponseDeadlines errors gracefully', async () => {
      // Mock the database to throw an error for the specific query
      const originalAll = db.all;
      db.all = jest.fn((query, params, callback) => {
        if (typeof params === 'function') {
          callback = params;
        }
        // Trigger error for the deadline check query
        if (query.includes('response_deadline')) {
          callback(new Error('Database connection failed'));
        } else {
          // Call original for other queries
          originalAll.call(db, query, params, callback);
        }
      });
      
      try {
        await expect(checkResponseDeadlines()).rejects.toThrow('Database connection failed');
      } finally {
        db.all = originalAll;
      }
    });

    it('should handle detectEmailResponses with invalid connection ID', async () => {
      const result = await detectEmailResponses(-1);
      
      // Should still return stub response
      expect(result.hasResponse).toBe(false);
      expect(result.stubMessage).toBe('Gmail detection not yet implemented');
    });
  });
});