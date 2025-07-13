const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getConnectionById } = require('../db/connection');
const {
  initializeTimeline,
  getConnectionTimeline,
  updateStageStatus,
  createNextStage,
  checkResponseDeadlines,
  getVisibleStages
} = require('../services/timeline');

const router = express.Router();

// Ownership verification middleware
const verifyConnectionOwnership = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number'
      });
    }
    
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist'
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have permission to access this connection'
      });
    }
    
    req.connection = connection;
    req.connectionId = connectionId;
    next();
  } catch (error) {
    console.error('Error verifying connection ownership:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to verify connection access'
    });
  }
};

// Validation helpers
const validateStageData = (data) => {
  const errors = [];
  
  if (data.stage_type && !['first_impression', 'response', 'follow_up'].includes(data.stage_type)) {
    errors.push('Stage type must be one of: first_impression, response, follow_up');
  }
  
  if (data.stage_status && !['waiting', 'draft', 'sent', 'received'].includes(data.stage_status)) {
    errors.push('Stage status must be one of: waiting, draft, sent, received');
  }
  
  if (data.stage_order && (!Number.isInteger(data.stage_order) || data.stage_order < 1)) {
    errors.push('Stage order must be a positive integer');
  }
  
  if (data.email_content && typeof data.email_content !== 'string') {
    errors.push('Email content must be a string');
  }
  
  if (data.draft_content && typeof data.draft_content !== 'string') {
    errors.push('Draft content must be a string');
  }
  
  return errors;
};

const validateStageUpdate = (data) => {
  const errors = [];
  
  if (data.stage_status && !['waiting', 'draft', 'sent', 'received'].includes(data.stage_status)) {
    errors.push('Stage status must be one of: waiting, draft, sent, received');
  }
  
  if (data.email_content && typeof data.email_content !== 'string') {
    errors.push('Email content must be a string');
  }
  
  if (data.draft_content && typeof data.draft_content !== 'string') {
    errors.push('Draft content must be a string');
  }
  
  return errors;
};

const validateTimelineSettings = (data) => {
  const errors = [];
  
  if (data.follow_up_wait_days !== undefined) {
    if (!Number.isInteger(data.follow_up_wait_days) || data.follow_up_wait_days < 1 || data.follow_up_wait_days > 30) {
      errors.push('Follow-up wait days must be an integer between 1 and 30');
    }
  }
  
  return errors;
};

// GET /api/connections/:id/timeline - Get complete timeline for connection
router.get('/:id/timeline', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const timeline = await getConnectionTimeline(req.connectionId);
    
    return res.json({
      message: 'Timeline retrieved successfully',
      timeline
    });
  } catch (error) {
    console.error('Error fetching timeline:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve timeline'
    });
  }
});

// POST /api/connections/:id/timeline/stage - Create new timeline stage
router.post('/:id/timeline/stage', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const stageData = req.body;
    
    // Validate input
    const validationErrors = validateStageData(stageData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid stage data',
        details: validationErrors
      });
    }
    
    // Use createNextStage if stage_type is provided, otherwise initialize timeline
    let result;
    if (stageData.stage_type) {
      if (!stageData.current_stage_id) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'current_stage_id is required when creating specific stage types'
        });
      }
      
      result = await createNextStage(req.connectionId, stageData.current_stage_id, stageData.stage_type);
    } else {
      // Initialize timeline (first_impression stage)
      result = await initializeTimeline(req.connectionId);
    }
    
    return res.status(201).json({
      message: 'Timeline stage created successfully',
      stage: result
    });
  } catch (error) {
    console.error('Error creating timeline stage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create timeline stage'
    });
  }
});

// PUT /api/connections/:id/timeline/stage/:stageId - Update timeline stage
router.put('/:id/timeline/stage/:stageId', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const stageId = parseInt(req.params.stageId, 10);
    const updateData = req.body;
    
    if (isNaN(stageId)) {
      return res.status(400).json({
        error: 'Invalid stage ID',
        message: 'Stage ID must be a valid number'
      });
    }
    
    // Validate input
    const validationErrors = validateStageUpdate(updateData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid update data',
        details: validationErrors
      });
    }
    
    const result = await updateStageStatus(req.connectionId, stageId, updateData.stage_status, updateData);
    
    return res.json({
      message: 'Timeline stage updated successfully',
      result
    });
  } catch (error) {
    console.error('Error updating timeline stage:', error);
    
    if (error.message.includes('Stage not found')) {
      return res.status(404).json({
        error: 'Stage not found',
        message: 'The specified timeline stage does not exist'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update timeline stage'
    });
  }
});

// DELETE /api/connections/:id/timeline/stage/:stageId - Delete timeline stage
router.delete('/:id/timeline/stage/:stageId', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const stageId = parseInt(req.params.stageId, 10);
    
    if (isNaN(stageId)) {
      return res.status(400).json({
        error: 'Invalid stage ID',
        message: 'Stage ID must be a valid number'
      });
    }
    
    // Note: Stage deletion is not implemented in the service layer yet
    // This would require additional database operations to safely remove stages
    // while maintaining timeline integrity
    return res.status(501).json({
      error: 'Not implemented',
      message: 'Stage deletion is not yet supported. Consider updating stage status instead.'
    });
  } catch (error) {
    console.error('Error deleting timeline stage:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete timeline stage'
    });
  }
});

// POST /api/connections/:id/timeline/advance - Auto-advance timeline logic
router.post('/:id/timeline/advance', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const { action, stage_id, content } = req.body;
    
    if (!action) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Action is required'
      });
    }
    
    let result;
    
    switch (action) {
      case 'initialize':
        result = await initializeTimeline(req.connectionId);
        break;
        
      case 'send_email':
        if (!stage_id) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'stage_id is required for send_email action'
          });
        }
        result = await updateStageStatus(req.connectionId, stage_id, 'sent', content || {});
        break;
        
      case 'create_draft':
        if (!stage_id) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'stage_id is required for create_draft action'
          });
        }
        result = await updateStageStatus(req.connectionId, stage_id, 'draft', content || {});
        break;
        
      case 'mark_response':
        if (!stage_id) {
          return res.status(400).json({
            error: 'Validation failed',
            message: 'stage_id is required for mark_response action'
          });
        }
        result = await updateStageStatus(req.connectionId, stage_id, 'received', content || {});
        break;
        
      case 'check_deadlines':
        // Check deadlines for all connections (system-wide operation)
        result = await checkResponseDeadlines();
        break;
        
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be one of: initialize, send_email, create_draft, mark_response, check_deadlines'
        });
    }
    
    return res.json({
      message: `Timeline advance action '${action}' completed successfully`,
      result
    });
  } catch (error) {
    console.error('Error advancing timeline:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to advance timeline'
    });
  }
});

// GET /api/connections/:id/timeline/settings - Get timeline settings
router.get('/:id/timeline/settings', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const timeline = await getConnectionTimeline(req.connectionId);
    
    return res.json({
      message: 'Timeline settings retrieved successfully',
      settings: timeline.settings
    });
  } catch (error) {
    console.error('Error fetching timeline settings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve timeline settings'
    });
  }
});

// PUT /api/connections/:id/timeline/settings - Update timeline settings
router.put('/:id/timeline/settings', requireAuth, verifyConnectionOwnership, async (req, res) => {
  try {
    const settings = req.body;
    
    // Validate input
    const validationErrors = validateTimelineSettings(settings);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid settings data',
        details: validationErrors
      });
    }
    
    // Update settings in database
    const { db } = require('../db/connection');
    const timestamp = Date.now();
    
    await new Promise((resolve, reject) => {
      db.run(`
        UPDATE connection_settings 
        SET follow_up_wait_days = ?, updated_at = ? 
        WHERE connection_id = ?
      `, [settings.follow_up_wait_days, timestamp, req.connectionId], function(err) {
        if (err) {
          reject(err);
        } else if (this.changes === 0) {
          // Create settings if they don't exist
          db.run(`
            INSERT INTO connection_settings (connection_id, follow_up_wait_days, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `, [req.connectionId, settings.follow_up_wait_days, timestamp, timestamp], (insertErr) => {
            if (insertErr) {
              reject(insertErr);
            } else {
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
    
    // Return updated settings
    const timeline = await getConnectionTimeline(req.connectionId);
    
    return res.json({
      message: 'Timeline settings updated successfully',
      settings: timeline.settings
    });
  } catch (error) {
    console.error('Error updating timeline settings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update timeline settings'
    });
  }
});

module.exports = router;