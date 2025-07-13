const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  createConnection,
  getConnectionsByUserId,
  getConnectionById,
  updateConnection,
  deleteConnection,
  trackComposerOpened,
} = require('../db/connection');

const router = express.Router();

// Validation helper
const validateConnectionData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && !data.email) {
    errors.push('Email is required');
  }
  
  if (!isUpdate && !data.full_name) {
    errors.push('Full name is required');
  }
  
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  if (data.full_name && typeof data.full_name !== 'string') {
    errors.push('Full name must be a string');
  }
  
  if (data.full_name && (data.full_name.length < 2 || data.full_name.length > 100)) {
    errors.push('Full name must be between 2 and 100 characters');
  }
  
  if (data.company && typeof data.company !== 'string') {
    errors.push('Company must be a string');
  }
  
  if (data.company && data.company.length > 100) {
    errors.push('Company name must not exceed 100 characters');
  }
  
  if (data.connection_type && typeof data.connection_type !== 'string') {
    errors.push('Connection type must be a string');
  }
  
  if (data.connection_type && data.connection_type.length > 50) {
    errors.push('Connection type must not exceed 50 characters');
  }
  
  if (data.job_title && typeof data.job_title !== 'string') {
    errors.push('Job title must be a string');
  }
  
  if (data.job_title && data.job_title.length > 100) {
    errors.push('Job title must not exceed 100 characters');
  }
  
  if (data.industry && typeof data.industry !== 'string') {
    errors.push('Industry must be a string');
  }
  
  if (data.industry && data.industry.length > 100) {
    errors.push('Industry must not exceed 100 characters');
  }
  
  if (data.notes && typeof data.notes !== 'string') {
    errors.push('Notes must be a string');
  }
  
  if (data.notes && data.notes.length > 1000) {
    errors.push('Notes must not exceed 1000 characters');
  }
  
  // Validate email status if provided
  if (data.email_status) {
    const validStatuses = [
      'Not Contacted',
      'First Impression',
      'Follow-up',
      'Response',
      'Meeting Scheduled'
    ];
    
    if (!validStatuses.includes(data.email_status)) {
      errors.push('Invalid email status');
    }
  }
  
  // Validate custom_connection_description if provided
  if (data.custom_connection_description && typeof data.custom_connection_description !== 'string') {
    errors.push('Custom connection description must be a string');
  }
  
  if (data.custom_connection_description && data.custom_connection_description.length > 500) {
    errors.push('Custom connection description must not exceed 500 characters');
  }
  
  // initial_purpose field removed - no validation needed
  
  // Validate last_email_draft if provided
  if (data.last_email_draft && typeof data.last_email_draft !== 'string') {
    errors.push('Last email draft must be a string');
  }
  
  if (data.last_email_draft && data.last_email_draft.length > 10000) {
    errors.push('Last email draft must not exceed 10000 characters');
  }
  
  // Validate last_email_sent_date if provided
  if (data.last_email_sent_date !== undefined && data.last_email_sent_date !== null) {
    if (typeof data.last_email_sent_date !== 'number' && typeof data.last_email_sent_date !== 'string') {
      errors.push('Last email sent date must be a valid timestamp');
    }
  }
  
  return errors;
};

// POST /api/connections - Create new connection
router.post('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionData = req.body;
    
    // Validate input
    const validationErrors = validateConnectionData(connectionData);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: validationErrors,
      });
    }
    
    // Create connection
    const connection = await createConnection(userId, connectionData);
    
    return res.status(201).json({
      message: 'Connection created successfully',
      connection,
    });
  } catch (error) {
    console.error('Error creating connection:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to create connection',
    });
  }
});

// GET /api/connections - Get all user's connections
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connections = await getConnectionsByUserId(userId);
    
    return res.json({
      message: 'Connections retrieved successfully',
      connections,
      count: connections.length,
    });
  } catch (error) {
    console.error('Error fetching connections:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch connections',
    });
  }
});

// GET /api/connections/:id - Get specific connection
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    const connection = await getConnectionById(connectionId);
    
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    // Check if user owns this connection
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access this connection',
      });
    }
    
    return res.json({
      message: 'Connection retrieved successfully',
      connection,
    });
  } catch (error) {
    console.error('Error fetching connection:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch connection',
    });
  }
});

// PUT /api/connections/:id - Update connection
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    const updates = req.body;
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    // Validate input
    const validationErrors = validateConnectionData(updates, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: validationErrors,
      });
    }
    
    // Check if connection exists and user owns it
    const existingConnection = await getConnectionById(connectionId);
    if (!existingConnection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (existingConnection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to update this connection',
      });
    }
    
    // Update connection
    const updatedConnection = await updateConnection(connectionId, updates);
    
    return res.json({
      message: 'Connection updated successfully',
      connection: updatedConnection,
    });
  } catch (error) {
    console.error('Error updating connection:', error);
    
    if (error.message === 'No valid fields to update') {
      return res.status(400).json({
        error: 'No valid updates provided',
        message: 'At least one valid field must be provided for update',
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update connection',
    });
  }
});

// DELETE /api/connections/:id - Delete connection
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    // Check if connection exists and user owns it
    const existingConnection = await getConnectionById(connectionId);
    if (!existingConnection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (existingConnection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to delete this connection',
      });
    }
    
    // Delete connection
    await deleteConnection(connectionId);
    
    return res.json({
      message: 'Connection deleted successfully',
      deleted: true,
    });
  } catch (error) {
    console.error('Error deleting connection:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete connection',
    });
  }
});

// POST /api/connections/:id/composer-opened - Track when user opens email composer
router.post('/:id/composer-opened', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.id, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    // Check if connection exists and user owns it
    const existingConnection = await getConnectionById(connectionId);
    if (!existingConnection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (existingConnection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access this connection',
      });
    }
    
    // Track composer opened
    await trackComposerOpened(connectionId);
    
    return res.json({
      message: 'Composer opened tracked successfully',
      tracked: true,
    });
  } catch (error) {
    console.error('Error tracking composer opened:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to track composer opened',
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'turnship-connections',
  });
});

// Error handling middleware for connections routes
router.use((err, req, res, next) => {
  console.error('Connections route error:', err);
  res.status(500).json({
    error: 'Connections service error',
    message: 'An error occurred in the connections service',
  });
  
  return next(err);
});

module.exports = router;