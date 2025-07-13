const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  getConnectionById,
  updateConnection,
  saveEmailDraft,
  getConnectionDraft,
  updateConnectionEmailStatus,
  trackComposerOpened,
  // New draft functions
  saveEmailDraftNew,
  getConnectionDrafts,
  deleteDraft,
  updateDraft,
} = require('../db/connection');
const { generateBatchEmails, DEFAULT_USER_PROFILE } = require('../services/email-ai');

const router = express.Router();

// Validation helpers
const validateEmailGenerationRequest = (data) => {
  const errors = [];
  
  if (!data.connectionIds || !Array.isArray(data.connectionIds) || data.connectionIds.length === 0) {
    errors.push('Connection IDs are required and must be a non-empty array');
  }
  
  if (data.connectionIds && data.connectionIds.some(id => !Number.isInteger(id) || id <= 0)) {
    errors.push('All connection IDs must be positive integers');
  }
  
  const validPurposes = ['summer-internship', 'just-reaching-out', 'advice'];
  if (!data.purpose || !validPurposes.includes(data.purpose)) {
    errors.push(`Purpose is required and must be one of: ${validPurposes.join(', ')}`);
  }
  
  const validTones = ['enthusiastic', 'respectful', 'confident', 'casual', 'professional', 'formal'];
  if (!data.tone || !validTones.includes(data.tone)) {
    errors.push(`Tone is required and must be one of: ${validTones.join(', ')}`);
  }
  
  const validLengths = ['short', 'medium', 'long'];
  if (!data.length || !validLengths.includes(data.length)) {
    errors.push(`Length is required and must be one of: ${validLengths.join(', ')}`);
  }
  
  return errors;
};

// Helper function to verify user owns all connections
const verifyConnectionOwnership = async (connectionIds, userId) => {
  const connectionChecks = await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        const connection = await getConnectionById(connectionId);
        return connection && connection.user_id === userId;
      } catch (error) {
        return false;
      }
    })
  );
  
  return connectionChecks.every(Boolean);
};

// Helper function to generate AI-powered email content
const generateEmailContent = async (connections, userProfile, purpose, tone, length) => {
  try {
    // Use AI service to generate batch emails
    const options = { purpose, tone, length };
    const result = await generateBatchEmails(connections, userProfile, options);
    
    // Handle any failed generations
    if (result.failed.length > 0) {
      console.warn('Some email generations failed:', result.failed);
    }
    
    // Return successful generations in expected format
    return result.successful.map(email => ({
      subject: email.subject,
      body: email.body,
      connectionId: email.connectionId,
      recipient: email.recipient,
      generated_at: email.generated_at,
      parameters: email.parameters
    }));
    
  } catch (error) {
    console.error('AI email generation failed:', error);
    
    // Fallback to basic template if AI fails
    console.log('Falling back to basic email templates...');
    return generateFallbackEmails(connections, userProfile, purpose, tone, length);
  }
};

// Fallback function for basic email templates
const generateFallbackEmails = (connections, userProfile, purpose, tone, length) => {
  // Map college-friendly purposes to template keys
  const purposeMapping = {
    'summer-internship': 'job-inquiry',
    'just-reaching-out': 'introduction',
    'advice': 'industry-insights'
  };
  const templatePurpose = purposeMapping[purpose] || purpose;
  
  const emailTemplates = {
    'informational-interview': {
      subject: 'Informational Interview Request',
      body: `Hi {full_name},

I hope this message finds you well. I came across your profile and was impressed by your experience in {industry}. I'm currently exploring opportunities in this field and would greatly appreciate the chance to learn from your insights.

Would you be available for a brief 15-20 minute informational interview? I'm particularly interested in understanding more about {company} and your journey in {job_title}.

I'm happy to work around your schedule and can meet virtually at your convenience.

Thank you for considering my request.

Best regards,
${userProfile.name}`
    },
    'job-inquiry': {
      subject: 'Inquiry About Opportunities at {company}',
      body: `Hello {full_name},

I hope you're doing well. I'm reaching out because I'm very interested in opportunities at {company} and noticed your role as {job_title}.

Your work in {industry} aligns perfectly with my background and career goals. I'd love to learn more about potential openings and how I might contribute to your team.

Would you be open to a brief conversation about opportunities at {company}?

I look forward to hearing from you.

Best regards,
${userProfile.name}`
    },
    'industry-insights': {
      subject: 'Seeking Industry Insights from {company}',
      body: `Dear {full_name},

I hope this message finds you well. I'm reaching out because of your expertise in {industry} and your position at {company}.

I'm currently researching trends and developments in this field and would greatly value your perspective. Your insights would be incredibly helpful as I navigate my career in {industry}.

Would you be available for a brief conversation to share your thoughts on the current state of the industry?

Thank you for your time and consideration.

Best regards,
${userProfile.name}`
    },
    'follow-up': {
      subject: 'Following Up on Our Conversation',
      body: `Hi {full_name},

I wanted to follow up on our recent conversation and thank you again for your time and valuable insights about {company} and the {industry} industry.

Our discussion was particularly enlightening and has given me a lot to think about.

I'd love to stay connected and keep you updated on my progress. Please let me know if there's anything I can help you with in return.

Best regards and thank you again,
${userProfile.name}`
    },
    'introduction': {
      subject: 'Introduction and Connection Request',
      body: `Hello {full_name},

I hope you're having a great day. I'm reaching out to introduce myself and connect with professionals in {industry}.

I noticed your impressive background at {company} and your role as {job_title}. Your experience in this field is exactly what I'm looking to learn from.

I'd love to connect and potentially learn from your expertise. Would you be open to a brief conversation?

Looking forward to connecting,
${userProfile.name}`
    }
  };
  
  const template = emailTemplates[templatePurpose];
  if (!template) {
    throw new Error(`No template found for purpose: ${purpose} (mapped to ${templatePurpose})`);
  }
  
  // Generate personalized emails for each connection
  return connections.map(connection => {
    let personalizedBody = template.body.replace(/{(\w+)}/g, (match, key) => connection[key] || match);
    
    // Adjust length based on preference
    if (length === 'short') {
      const paragraphs = personalizedBody.split('\n\n');
      personalizedBody = paragraphs.slice(0, 2).join('\n\n');
    } else if (length === 'long') {
      personalizedBody += '\n\nI\'m happy to provide more details about my background and interests if that would be helpful.';
    }
    
    return {
      subject: template.subject.replace(/{(\w+)}/g, (match, key) => connection[key] || match),
      body: personalizedBody,
      connectionId: connection.id,
      recipient: {
        email: connection.email,
        name: connection.full_name
      },
      generated_at: new Date().toISOString(),
      fallback: true
    };
  });
};

// POST /api/emails/generate - Generate email for selected connections
router.post('/generate', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { connectionIds, purpose, tone, length } = req.body;
    
    // Validate request
    const validationErrors = validateEmailGenerationRequest(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid request data',
        details: validationErrors,
      });
    }
    
    // Verify user owns all connections
    const ownsAllConnections = await verifyConnectionOwnership(connectionIds, userId);
    if (!ownsAllConnections) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to generate emails for one or more of these connections',
      });
    }
    
    // Fetch connection details
    const connections = await Promise.all(
      connectionIds.map(id => getConnectionById(id))
    );
    
    // Generate emails using essential user profile data only
    const userProfile = {
      name: req.user.full_name,
      email: req.user.email,
      university: req.user.university,
      major: req.user.major,
      year: req.user.year,
      graduationYear: req.user.graduation_year,
      currentRole: req.user.current_role || 'Student'
    };
    
    const generatedEmails = await generateEmailContent(connections, userProfile, purpose, tone, length);
    
    // Update email status to First Impression for all connections
    await Promise.all(
      connectionIds.map(id => updateConnectionEmailStatus(id, 'First Impression'))
    );
    
    return res.json({
      message: 'Emails generated successfully',
      emails: generatedEmails,
      count: generatedEmails.length,
      parameters: {
        purpose,
        tone,
        length
      }
    });
  } catch (error) {
    console.error('Error generating emails:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate emails',
    });
  }
});

// PUT /api/emails/draft/:connectionId - Save/update email draft
router.put('/draft/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.connectionId, 10);
    const { draft } = req.body;
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    if (typeof draft !== 'string') {
      return res.status(400).json({
        error: 'Invalid draft content',
        message: 'Draft content must be a string',
      });
    }
    
    // Verify user owns this connection
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to save drafts for this connection',
      });
    }
    
    // Save draft with current status
    const result = await saveEmailDraft(connectionId, draft, connection.email_status);
    
    return res.json({
      message: 'Draft saved successfully',
      draft: {
        connectionId: result.connectionId,
        saved: result.draftSaved,
        length: result.draftLength
      }
    });
  } catch (error) {
    console.error('Error saving draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save draft',
    });
  }
});

// POST /api/emails/send/:connectionId - Actually send email via Gmail API
router.post('/send/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.connectionId, 10);
    const { emailType = 'First Impression', subject, body } = req.body;
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    if (!subject || !body) {
      return res.status(400).json({
        error: 'Missing email content',
        message: 'Subject and body are required to send email',
      });
    }
    
    const validEmailTypes = ['First Impression', 'Follow-up'];
    if (!validEmailTypes.includes(emailType)) {
      return res.status(400).json({
        error: 'Invalid email type',
        message: `Email type must be one of: ${validEmailTypes.join(', ')}`,
      });
    }
    
    // Verify user owns this connection
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to update this connection',
      });
    }
    
    // Try to send email via Gmail API
    let emailSent = false;
    let emailError = null;
    
    try {
      // Get user's OAuth tokens from database
      const { getUserTokens } = require('../db/connection');
      const userTokens = await getUserTokens(userId);
      
      if (!userTokens || !userTokens.accessToken) {
        throw new Error('User Gmail tokens not found. Please reconnect your Gmail account.');
      }
      
      // Create Gmail service with user's tokens
      const { google } = require('googleapis');
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      oauth2Client.setCredentials({
        access_token: userTokens.accessToken,
        refresh_token: userTokens.refreshToken,
      });
      
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
      
      // Format email message
      const message = [
        `To: ${connection.email}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      // Send the email
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      
      console.log('Email sent successfully:', result.data);
      emailSent = true;
    } catch (error) {
      console.error('Failed to send email via Gmail API:', error);
      emailError = error.message;
      
      // Check if it's a token/auth issue
      if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
        return res.status(401).json({
          error: 'Gmail authentication failed',
          message: 'Please reconnect your Gmail account. Gmail API tokens may have expired.',
          authRequired: true
        });
      }
      
      // For other errors, we'll still update the status but notify about the sending failure
    }
    
    // Update email status - advance to next stage after sending attempt
    const statusProgressionMap = {
      'First Impression': 'Follow-up',
      'Follow-up': 'Response'
    };
    
    const nextStatus = statusProgressionMap[emailType] || emailType;
    const sentDate = Date.now();
    const updatedConnection = await updateConnectionEmailStatus(connectionId, nextStatus, sentDate);
    
    return res.json({
      message: emailSent ? 'Email sent successfully' : 'Email status updated (sending failed)',
      emailSent,
      emailError,
      connection: {
        id: updatedConnection.id,
        email_status: updatedConnection.email_status,
        last_email_sent_date: updatedConnection.last_email_sent_date
      }
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to send email',
    });
  }
});

// GET /api/emails/draft/:connectionId - Get saved draft for connection
router.get('/draft/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.connectionId, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    // Verify user owns this connection
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access drafts for this connection',
      });
    }
    
    // Get draft
    const draftResult = await getConnectionDraft(connectionId);
    
    return res.json({
      message: 'Draft retrieved successfully',
      draft: {
        connectionId: draftResult.connectionId,
        content: draftResult.draft,
        hasContent: !!draftResult.draft
      }
    });
  } catch (error) {
    console.error('Error retrieving draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve draft',
    });
  }
});

// NEW ENDPOINTS FOR MULTIPLE DRAFTS SYSTEM

// POST /api/emails/drafts/:connectionId - Save new draft (multiple drafts support)
router.post('/drafts/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.connectionId, 10);
    const { subject, body } = req.body;
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    if (typeof subject !== 'string' || typeof body !== 'string') {
      return res.status(400).json({
        error: 'Invalid draft content',
        message: 'Subject and body must be strings',
      });
    }
    
    if (!subject.trim() && !body.trim()) {
      return res.status(400).json({
        error: 'Empty draft',
        message: 'Draft must have either subject or body content',
      });
    }
    
    // Verify user owns this connection
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to save drafts for this connection',
      });
    }
    
    // Save new draft
    const result = await saveEmailDraftNew(connectionId, subject, body, connection.email_status);
    
    return res.json({
      message: 'Draft saved successfully',
      draft: result
    });
  } catch (error) {
    console.error('Error saving new draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to save draft',
    });
  }
});

// GET /api/emails/drafts/:connectionId - Get all drafts for connection
router.get('/drafts/:connectionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const connectionId = parseInt(req.params.connectionId, 10);
    
    if (isNaN(connectionId)) {
      return res.status(400).json({
        error: 'Invalid connection ID',
        message: 'Connection ID must be a valid number',
      });
    }
    
    // Verify user owns this connection
    const connection = await getConnectionById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'Connection not found',
        message: 'The specified connection does not exist',
      });
    }
    
    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to access drafts for this connection',
      });
    }
    
    // Get all drafts for this connection
    const result = await getConnectionDrafts(connectionId);
    
    return res.json({
      message: 'Drafts retrieved successfully',
      drafts: result.drafts,
      count: result.drafts.length
    });
  } catch (error) {
    console.error('Error retrieving drafts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to retrieve drafts',
    });
  }
});

// PUT /api/emails/drafts/:draftId - Update existing draft
router.put('/drafts/:draftId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const draftId = parseInt(req.params.draftId, 10);
    const { subject, body } = req.body;
    
    if (isNaN(draftId)) {
      return res.status(400).json({
        error: 'Invalid draft ID',
        message: 'Draft ID must be a valid number',
      });
    }
    
    if (typeof subject !== 'string' || typeof body !== 'string') {
      return res.status(400).json({
        error: 'Invalid draft content',
        message: 'Subject and body must be strings',
      });
    }
    
    // First, verify the draft exists and user owns the connection
    const draftQuery = `
      SELECT d.*, c.user_id 
      FROM drafts d 
      JOIN connections c ON d.connection_id = c.id 
      WHERE d.id = ?
    `;
    
    const { db } = require('../db/connection');
    const draft = await new Promise((resolve, reject) => {
      db.get(draftQuery, [draftId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist',
      });
    }
    
    if (draft.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to update this draft',
      });
    }
    
    // Update the draft
    const result = await updateDraft(draftId, subject, body);
    
    return res.json({
      message: 'Draft updated successfully',
      draft: result
    });
  } catch (error) {
    console.error('Error updating draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update draft',
    });
  }
});

// DELETE /api/emails/drafts/:draftId - Delete specific draft
router.delete('/drafts/:draftId', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const draftId = parseInt(req.params.draftId, 10);
    
    if (isNaN(draftId)) {
      return res.status(400).json({
        error: 'Invalid draft ID',
        message: 'Draft ID must be a valid number',
      });
    }
    
    // First, verify the draft exists and user owns the connection
    const draftQuery = `
      SELECT d.*, c.user_id 
      FROM drafts d 
      JOIN connections c ON d.connection_id = c.id 
      WHERE d.id = ?
    `;
    
    const { db } = require('../db/connection');
    const draft = await new Promise((resolve, reject) => {
      db.get(draftQuery, [draftId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
    
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist',
      });
    }
    
    if (draft.user_id !== userId) {
      return res.status(403).json({
        error: 'Access forbidden',
        message: 'You do not have permission to delete this draft',
      });
    }
    
    // Delete the draft
    const result = await deleteDraft(draftId);
    
    return res.json({
      message: 'Draft deleted successfully',
      deleted: result
    });
  } catch (error) {
    console.error('Error deleting draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete draft',
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'turnship-emails',
  });
});

// Error handling middleware for email routes
router.use((err, req, res, next) => {
  console.error('Email route error:', err);
  res.status(500).json({
    error: 'Email service error',
    message: 'An error occurred in the email service',
  });
  
  return next(err);
});

module.exports = router;