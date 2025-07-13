const {
  createStage,
  createInitialTimeline,
  getTimelineStages,
  updateStage,
  getConnectionById
} = require('../db/connection');

/**
 * Timeline Service for Connection Progression System
 * 
 * Manages the complete timeline lifecycle from first impression through follow-ups
 * Implements automatic stage progression based on user actions and time-based rules
 */

/**
 * Initialize timeline for a new connection
 * Creates the initial 'first_impression' stage in 'waiting' status (red circle)
 * 
 * @param {number} connectionId - The connection ID to initialize timeline for
 * @returns {Promise<Object>} Timeline initialization result
 */
const initializeTimeline = async (connectionId) => {
  try {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    // Verify connection exists
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Use the database helper to create initial timeline
    const result = await createInitialTimeline(connectionId);
    
    return {
      success: true,
      connectionId,
      timeline: {
        currentStage: result.stage,
        totalStages: 1,
        initialized: true
      },
      message: 'Timeline initialized with first impression stage'
    };
  } catch (error) {
    console.error('Error initializing timeline:', error);
    throw new Error(`Failed to initialize timeline: ${error.message}`);
  }
};

/**
 * Get complete timeline for a connection
 * Returns all stages with progression status and visible stage calculation
 * 
 * @param {number} connectionId - The connection ID
 * @returns {Promise<Object>} Complete timeline data
 */
const getConnectionTimeline = async (connectionId) => {
  try {
    if (!connectionId) {
      throw new Error('Connection ID is required');
    }

    const timelineData = await getTimelineStages(connectionId);
    const visibleStages = getVisibleStages(timelineData.stages);
    
    return {
      connectionId,
      stages: timelineData.stages,
      settings: timelineData.settings,
      visibleStages,
      totalStages: timelineData.stageCount,
      currentStage: getCurrentStage(timelineData.stages),
      progressionStatus: calculateProgressionStatus(timelineData.stages)
    };
  } catch (error) {
    console.error('Error getting connection timeline:', error);
    throw new Error(`Failed to get timeline: ${error.message}`);
  }
};

/**
 * Update stage status with automatic progression logic
 * Handles state transitions and creates next stages when appropriate
 * 
 * @param {number} connectionId - The connection ID
 * @param {number} stageId - The stage ID to update
 * @param {string} newStatus - New status: 'waiting', 'draft', 'sent', 'received'
 * @param {Object} content - Stage content (email_content, draft_content, etc.)
 * @returns {Promise<Object>} Update result with progression info
 */
const updateStageStatus = async (connectionId, stageId, newStatus, content = {}) => {
  try {
    if (!connectionId || !stageId || !newStatus) {
      throw new Error('Connection ID, stage ID, and new status are required');
    }

    const validStatuses = ['waiting', 'draft', 'sent', 'received'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    }

    // Get current timeline to understand stage context
    const timeline = await getTimelineStages(connectionId);
    const currentStage = timeline.stages.find(stage => stage.id === stageId);
    
    if (!currentStage) {
      throw new Error('Stage not found');
    }

    // Prepare update data
    const updateData = {
      stage_status: newStatus,
      ...content
    };

    // Add timestamps based on status
    if (newStatus === 'sent') {
      updateData.sent_at = new Date().toISOString();
      
      // Calculate response deadline for response stages
      if (currentStage.stage_type === 'first_impression' || currentStage.stage_type === 'follow_up') {
        const followUpDays = timeline.settings.follow_up_wait_days || 7;
        const deadline = new Date();
        deadline.setDate(deadline.getDate() + followUpDays);
        updateData.response_deadline = deadline.toISOString();
      }
    } else if (newStatus === 'received') {
      updateData.response_received_at = new Date().toISOString();
    }

    // Update the stage
    const updateResult = await updateStage(connectionId, stageId, updateData);

    // Auto-progression logic
    let nextStageCreated = null;
    if (newStatus === 'sent' && (currentStage.stage_type === 'first_impression' || currentStage.stage_type === 'follow_up')) {
      // When first_impression or follow_up is sent, create response stage
      nextStageCreated = await createNextStage(connectionId, stageId, 'response');
    }

    return {
      success: true,
      stageId,
      connectionId,
      statusUpdated: true,
      newStatus,
      nextStageCreated,
      timeline: updateResult.timeline,
      message: `Stage status updated to ${newStatus}${nextStageCreated ? ', response stage created' : ''}`
    };
  } catch (error) {
    console.error('Error updating stage status:', error);
    throw new Error(`Failed to update stage status: ${error.message}`);
  }
};

/**
 * Create the next stage in timeline progression
 * Handles the progression rules: first_impression -> response -> follow_up -> response
 * 
 * @param {number} connectionId - The connection ID
 * @param {number} currentStageId - Current stage ID
 * @param {string} stageType - Type of stage to create: 'response', 'follow_up'
 * @returns {Promise<Object>} New stage creation result
 */
const createNextStage = async (connectionId, currentStageId, stageType) => {
  try {
    if (!connectionId || !currentStageId || !stageType) {
      throw new Error('Connection ID, current stage ID, and stage type are required');
    }

    const validStageTypes = ['response', 'follow_up'];
    if (!validStageTypes.includes(stageType)) {
      throw new Error(`Invalid stage type: ${stageType}. Must be one of: ${validStageTypes.join(', ')}`);
    }

    // Get current timeline to determine next stage order
    const timeline = await getTimelineStages(connectionId);
    const maxOrder = Math.max(...timeline.stages.map(stage => stage.stage_order));
    const nextOrder = maxOrder + 1;

    // Determine initial status based on stage type
    let initialStatus = 'waiting';
    if (stageType === 'follow_up') {
      initialStatus = 'waiting'; // Purple circle initially for follow-up
    }

    // Use the DRY createStage helper
    const result = await createStage(connectionId, {
      stage_type: stageType,
      stage_order: nextOrder,
      stage_status: initialStatus
    });

    return {
      stageId: result.id,
      stageType,
      stageOrder: nextOrder,
      initialStatus,
      created: true,
      message: `${stageType} stage created`
    };
  } catch (error) {
    console.error('Error creating next stage:', error);
    throw new Error(`Failed to create next stage: ${error.message}`);
  }
};

/**
 * Check for expired response deadlines and create follow-up stages
 * Background job function to automatically create follow-up stages when responses are overdue
 * 
 * @returns {Promise<Object>} Results of deadline check and follow-up creation
 */
const checkResponseDeadlines = async () => {
  try {
    const { db } = require('../db/connection');
    
    // Find all response stages with expired deadlines
    return new Promise((resolve, reject) => {
      const now = new Date().toISOString();
      
      db.all(`
        SELECT cts.*, c.user_id 
        FROM connection_timeline_stages cts
        JOIN connections c ON c.id = cts.connection_id
        WHERE cts.stage_type = 'response' 
          AND cts.stage_status = 'waiting'
          AND cts.response_deadline IS NOT NULL
          AND cts.response_deadline <= ?
      `, [now], async (err, expiredStages) => {
        if (err) {
          return reject(err);
        }
        
        const followUpsCreated = [];
        const errors = [];
        
        // Create follow-up stages for each expired response
        for (const stage of expiredStages) {
          try {
            const followUpStage = await createNextStage(stage.connection_id, stage.id, 'follow_up');
            followUpsCreated.push({
              connectionId: stage.connection_id,
              expiredStageId: stage.id,
              followUpStageId: followUpStage.stageId,
              deadline: stage.response_deadline
            });
          } catch (error) {
            errors.push({
              connectionId: stage.connection_id,
              stageId: stage.id,
              error: error.message
            });
          }
        }
        
        resolve({
          success: true,
          expiredStagesFound: expiredStages.length,
          followUpsCreated: followUpsCreated.length,
          followUps: followUpsCreated,
          errors,
          checkedAt: new Date().toISOString()
        });
      });
    });
  } catch (error) {
    console.error('Error checking response deadlines:', error);
    throw new Error(`Failed to check response deadlines: ${error.message}`);
  }
};

/**
 * Get visible stages for UI display (max 3 stages: previous, current, next)
 * Implements the timeline visual logic from the specification
 * 
 * @param {Array} stages - All timeline stages
 * @returns {Array} Visible stages for UI display
 */
const getVisibleStages = (stages) => {
  if (!stages || stages.length === 0) {
    return [];
  }

  // Sort stages by order
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  
  // If 3 or fewer stages, show all
  if (sortedStages.length <= 3) {
    return sortedStages;
  }
  
  // Find the current active stage (last non-waiting or last stage)
  let currentIndex = sortedStages.length - 1;
  for (let i = sortedStages.length - 1; i >= 0; i--) {
    if (sortedStages[i].stage_status !== 'waiting') {
      currentIndex = i;
      break;
    }
  }
  
  // Show current stage in middle with 1 before and 1 after
  if (currentIndex === 0) {
    // Current is first, show first 3
    return sortedStages.slice(0, 3);
  } else if (currentIndex === sortedStages.length - 1) {
    // Current is last, show last 3
    return sortedStages.slice(-3);
  } else {
    // Current in middle, show previous, current, next
    return sortedStages.slice(currentIndex - 1, currentIndex + 2);
  }
};

/**
 * Helper function to get the current active stage
 * @param {Array} stages - All timeline stages
 * @returns {Object|null} Current active stage
 */
const getCurrentStage = (stages) => {
  if (!stages || stages.length === 0) {
    return null;
  }
  
  const sortedStages = [...stages].sort((a, b) => a.stage_order - b.stage_order);
  
  // Find the last stage that's not in waiting status, or the last stage
  for (let i = sortedStages.length - 1; i >= 0; i--) {
    if (sortedStages[i].stage_status !== 'waiting') {
      return sortedStages[i];
    }
  }
  
  // If all are waiting, return the first stage
  return sortedStages[0];
};

/**
 * Helper function to calculate overall progression status
 * @param {Array} stages - All timeline stages
 * @returns {Object} Progression status summary
 */
const calculateProgressionStatus = (stages) => {
  if (!stages || stages.length === 0) {
    return {
      phase: 'not_started',
      activeStages: 0,
      completedStages: 0,
      waitingStages: 0
    };
  }
  
  const statusCounts = {
    waiting: 0,
    draft: 0,
    sent: 0,
    received: 0
  };
  
  stages.forEach(stage => {
    statusCounts[stage.stage_status] = (statusCounts[stage.stage_status] || 0) + 1;
  });
  
  const hasActivity = statusCounts.draft > 0 || statusCounts.sent > 0 || statusCounts.received > 0;
  const hasResponses = statusCounts.received > 0;
  
  let phase = 'not_started';
  if (hasResponses) {
    phase = 'conversation_active';
  } else if (hasActivity) {
    phase = 'outreach_active';
  }
  
  return {
    phase,
    activeStages: statusCounts.draft + statusCounts.sent,
    completedStages: statusCounts.sent + statusCounts.received,
    waitingStages: statusCounts.waiting,
    totalStages: stages.length,
    statusBreakdown: statusCounts
  };
};

// Module-level variables for job management
let deadlineCheckerHandle = null;
let jobsStarted = false;

/**
 * Schedule background jobs for timeline management
 * Includes multiple guards to prevent duplicate scheduling
 */
const scheduleJobs = () => {
  if (process.env.NODE_ENV === 'test') {
    console.log('Skipping job scheduling in test environment');
    return;
  }

  // Multiple singleton guards to prevent duplicate scheduling
  if (global.__TIMELINE_JOBS_STARTED__ || jobsStarted || deadlineCheckerHandle) {
    console.log('Timeline jobs already started, skipping duplicate scheduling');
    return;
  }

  console.log('Starting timeline background jobs...');
  
  // Schedule response deadline checker to run every minute
  deadlineCheckerHandle = setInterval(async () => {
    try {
      console.log(`[${new Date().toISOString()}] Running response deadline check...`);
      const result = await checkResponseDeadlines();
      console.log(`Response deadline check completed:`, result);
      
      // TODO: Future enhancement - emit event for job completion
      // process.emit('timelineJobCompleted', { type: 'deadlineCheck', result });
    } catch (error) {
      console.error('Error in response deadline checker:', error);
      // TODO: Future enhancement - emit error event
      // process.emit('timelineJobError', { type: 'deadlineCheck', error });
    }
  }, 60 * 1000); // Every 60 seconds

  // Set guards
  global.__TIMELINE_JOBS_STARTED__ = true;
  jobsStarted = true;
  
  console.log('Timeline background jobs scheduled successfully');
};

/**
 * Stop all timeline background jobs (for graceful shutdown)
 */
const stopJobs = () => {
  if (deadlineCheckerHandle) {
    clearInterval(deadlineCheckerHandle);
    deadlineCheckerHandle = null;
    console.log('Timeline deadline checker stopped');
  }
  
  global.__TIMELINE_JOBS_STARTED__ = false;
  jobsStarted = false;
  console.log('Timeline background jobs stopped');
};

/**
 * Stub function for detecting email responses via Gmail API
 * TODO: Implement actual Gmail API integration
 * 
 * @param {number} connectionId - The connection to check for responses
 * @returns {Promise<Object>} Response detection result
 */
const detectEmailResponses = async (connectionId) => {
  // TODO: Implement actual Gmail API integration
  console.log(`[STUB] Checking for email responses for connection ${connectionId}`);
  
  // Return fake "no response" for now
  return {
    hasResponse: false,
    lastChecked: new Date().toISOString(),
    responseCount: 0,
    stubMessage: 'Gmail detection not yet implemented'
  };
};

module.exports = {
  initializeTimeline,
  getConnectionTimeline,
  updateStageStatus,
  createNextStage,
  checkResponseDeadlines,
  getVisibleStages,
  // Helper functions for testing
  getCurrentStage,
  calculateProgressionStatus,
  // Job scheduling functions
  scheduleJobs,
  stopJobs,
  detectEmailResponses
};