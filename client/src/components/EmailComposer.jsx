import React, { useState, useEffect, useRef } from 'react';
import { InlineLoading } from './Loading';
import { emailsAPI, connectionsAPI, timelineAPI, handleAPIError } from '../services/api';

// Draft Bank Modal - Shows all saved drafts
const DraftBankModal = ({ isOpen, onClose, connections, targetConnection, onDraftSelected, onDraftDeleted }) => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get draft status badge color (matching StatusBadge color system)
  const getDraftStatusBadgeColor = (status) => {
    switch (status) {
      case 'Not Contacted':
        return 'bg-gray-100 text-gray-700';
      case 'First Impression':
        return 'bg-blue-100 text-blue-700'; // Professional/active
      case 'Follow-up':
        return 'bg-orange-100 text-orange-700'; // Ongoing relationship
      case 'Response':
        return 'bg-purple-100 text-purple-700'; // Interaction received
      case 'Meeting Scheduled':
        return 'bg-green-100 text-green-700'; // Success/progress
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  // Load drafts when modal opens or target connection changes
  useEffect(() => {
    if (isOpen && targetConnection) {
      loadDrafts();
    }
  }, [isOpen, targetConnection]);

  const loadDrafts = async () => {
    if (!targetConnection) return;
    
    setLoading(true);
    setError(null);
    try {
      // Use new multiple drafts API
      const response = await emailsAPI.getDrafts(targetConnection.id);
      setDrafts(response.data.drafts || []);
    } catch (error) {
      setError('Failed to load drafts');
      console.error('Error loading drafts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDraftEdit = (draft) => {
    // Pass the draft data to the composer
    onDraftSelected(targetConnection, draft);
    onClose();
  };

  const handleDraftDelete = async (draftId) => {
    if (!window.confirm('Are you sure you want to delete this draft?')) {
      return;
    }

    try {
      await emailsAPI.deleteDraft(draftId);
      if (onDraftDeleted) {
        onDraftDeleted(draftId);
      }
      // Reload drafts
      loadDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      setError('Failed to delete draft');
    }
  };

  // Get draft preview (first 100 characters)
  const getDraftPreview = (body) => {
    if (!body) return 'Empty draft';
    return body.length > 100 ? body.substring(0, 100) + '...' : body;
  };

  // Format date for display
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {targetConnection ? `Drafts for ${targetConnection.full_name}` : 'Email Drafts'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <InlineLoading size={24} className="mx-auto mb-2" />
              <p className="text-gray-500">Loading drafts...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">❌ {error}</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No drafts for {targetConnection?.full_name}
              </h3>
              <p className="text-gray-500">
                Email drafts saved for {targetConnection?.full_name} will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => handleDraftEdit(draft)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getDraftStatusBadgeColor(draft.status)}`}>
                            {draft.status} Draft
                          </span>
                          <span className="text-xs text-gray-400">
                            {formatDate(draft.created_at)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mb-2">
                        <p className="font-medium text-gray-900 text-sm mb-1">
                          Subject: {draft.subject || 'No subject'}
                        </p>
                        <p className="text-sm text-gray-600 bg-gray-50 rounded p-2">
                          {getDraftPreview(draft.body)}
                        </p>
                      </div>
                      
                      <p className="text-xs text-gray-400">
                        Click to edit
                      </p>
                    </div>
                    
                    <div className="ml-4 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDraftDelete(draft.id);
                        }}
                        className="text-red-600 hover:text-red-700 p-1 rounded"
                        title="Delete draft"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Simple Connection Selector Modal
const ConnectionSelectorModal = ({ isOpen, onClose, connections, onConnectionSelected }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredConnections = connections.filter(connection =>
    connection.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    connection.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (connection.company && connection.company.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Select Connection</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search connections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredConnections.map((connection) => (
              <div
                key={connection.id}
                onClick={() => onConnectionSelected(connection)}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {connection.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{connection.full_name}</p>
                    <p className="text-sm text-gray-500">{connection.email}</p>
                    {connection.company && (
                      <p className="text-sm text-gray-400">{connection.company}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {filteredConnections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No connections found matching "{searchTerm}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const EmailComposer = ({ 
  isOpen, 
  onClose, 
  connection, 
  initialEmail = null,
  onEmailSent,
  onDraftSaved,
  loadExistingDraft = true, // New parameter: false for manual emails, true for draft editing
  currentStageId = null, // Stage ID when opened from timeline stage click
  onTimelineUpdated = null // Callback to update parent timeline cache
}) => {
  const [email, setEmail] = useState({
    subject: '',
    body: ''
  });
  const [isDraftSaving, setIsDraftSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showSendConfirmation, setShowSendConfirmation] = useState(false);
  const [currentDraftId, setCurrentDraftId] = useState(null); // Track current draft being edited
  
  const autoSaveTimeoutRef = useRef(null);
  const initialEmailRef = useRef(null);

  // Initialize email content when modal opens
  useEffect(() => {
    if (isOpen && connection) {
      // Track that user opened composer for this connection (for progress tracking)
      trackComposerOpened();
      
      if (initialEmail) {
        // Use provided initial email (from generation or draft editing)
        setEmail({
          subject: initialEmail.subject || '',
          body: initialEmail.body || ''
        });
        setCurrentDraftId(initialEmail.id || null); // Set draft ID if editing existing draft
        initialEmailRef.current = initialEmail;
      } else if (loadExistingDraft) {
        // Load existing draft only if loadExistingDraft is true (old system)
        loadDraft();
      } else {
        // Start with blank email for manual composition
        setEmail({
          subject: '',
          body: ''
        });
        setCurrentDraftId(null);
      }
      setError(null);
      setHasUnsavedChanges(false);
    }
  }, [isOpen, connection, initialEmail, loadExistingDraft]);
  
  // Track composer opened for progress indicator
  const trackComposerOpened = async () => {
    try {
      await connectionsAPI.trackComposerOpened(connection.id);
    } catch (error) {
      // Silent fail - this is just for progress tracking
      console.log('Could not track composer opened:', error);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    if (hasUnsavedChanges && isOpen && (email.subject || email.body)) {
      // Clear existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
      
      // Set new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        saveDraft(true); // Auto-save
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, email, isOpen]);

  // Load existing draft (old system - for backward compatibility)
  const loadDraft = async () => {
    try {
      const response = await emailsAPI.getDraft(connection.id);
      
      if (response.data.draft.content) {
        // Parse draft content (assuming it's formatted as "Subject: ...\n\n...")
        const lines = response.data.draft.content.split('\n');
        const subjectLine = lines.find(line => line.startsWith('Subject: '));
        const subject = subjectLine ? subjectLine.replace('Subject: ', '') : '';
        const body = lines.slice(lines.findIndex(line => line.trim() === '') + 1).join('\n');
        
        setEmail({ subject, body });
      }
    } catch (error) {
      // Draft doesn't exist or couldn't be loaded - that's okay
      console.log('No existing draft found');
    }
  };

  // Save draft (new system)
  const saveDraft = async (isAutoSave = false) => {
    if (!email.subject && !email.body) return;
    
    setIsDraftSaving(true);
    setError(null);
    
    try {
      let result;
      
      if (currentDraftId) {
        // Update existing draft
        result = await emailsAPI.updateDraft(currentDraftId, email.subject, email.body);
      } else {
        // Create new draft
        result = await emailsAPI.saveNewDraft(connection.id, email.subject, email.body);
        setCurrentDraftId(result.data.draft.id);
      }
      
      // Update timeline to draft status
      try {
        const stageId = currentStageId || connection.current_stage_id;
        if (stageId) {
          const timelineResponse = await timelineAPI.updateStage(connection.id, stageId, {
            stage_status: 'draft',
            draft_content: email.body
          });
          
          // Update parent timeline cache
          if (onTimelineUpdated && timelineResponse.data) {
            onTimelineUpdated(timelineResponse.data);
          }
        }
      } catch (timelineError) {
        console.warn('Failed to update timeline for draft:', timelineError);
        // Don't fail the draft save if timeline update fails
      }
      
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      
      if (onDraftSaved) {
        onDraftSaved(connection.id);
      }
      
      if (!isAutoSave) {
        // Show brief success message for manual saves
        setTimeout(() => setLastSaved(null), 3000);
      }
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to save draft');
      setError(errorMessage);
    } finally {
      setIsDraftSaving(false);
    }
  };

  // Send email
  const sendEmail = async () => {
    if (!email.subject || !email.body) {
      setError('Please fill in both subject and body before sending');
      return;
    }
    
    setIsSending(true);
    setError(null);
    
    try {
      // First save as draft with current status label
      const draftContent = `Subject: ${email.subject}\n\n${email.body}`;
      await emailsAPI.saveDraft(connection.id, draftContent);
      
      // Then actually send the email with subject and body
      const response = await emailsAPI.sendEmail(connection.id, 'First Impression', email.subject, email.body);
      
      // Update timeline to sent status
      try {
        const stageId = currentStageId || connection.current_stage_id;
        if (stageId) {
          // Update current stage to sent
          const updateResponse = await timelineAPI.updateStage(connection.id, stageId, {
            stage_status: 'sent',
            email_content: email.body,
            sent_at: Date.now()
          });
          
          // Advance timeline to create next stage
          const advanceResponse = await timelineAPI.advanceTimeline(connection.id, 'send_email', stageId);
          
          // Update parent timeline cache with the most recent response
          if (onTimelineUpdated && advanceResponse.data) {
            onTimelineUpdated(advanceResponse.data);
          }
        }
      } catch (timelineError) {
        console.warn('Failed to update timeline for sent email:', timelineError);
        // Don't fail the email send if timeline update fails
      }
      
      // Check if email was actually sent
      if (response.data.emailSent) {
        console.log('✅ Email sent successfully via Gmail API');
      } else {
        console.warn('⚠️ Email status updated but Gmail sending failed:', response.data.emailError);
        
        // Check if it's an authentication issue
        if (response.data.authRequired) {
          setError(
            <div>
              <p className="mb-2">{response.data.message}</p>
              <button
                onClick={() => window.location.href = 'http://localhost:3001/auth/google'}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Connect Gmail
              </button>
            </div>
          );
        } else {
          setError(`Email status updated but sending failed: ${response.data.emailError}`);
        }
      }
      
      if (onEmailSent) {
        onEmailSent(connection.id);
      }
      
      setShowSendConfirmation(false);
      onClose();
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to send email');
      setError(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  // Handle email content changes
  const handleEmailChange = (field, value) => {
    setEmail(prev => ({
      ...prev,
      [field]: value
    }));
    setHasUnsavedChanges(true);
  };

  // Handle close with unsaved changes
  const handleClose = () => {
    if (hasUnsavedChanges) {
      const shouldSave = window.confirm('You have unsaved changes. Save draft before closing?');
      if (shouldSave) {
        saveDraft().then(() => onClose());
      } else {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (!isOpen || !connection) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-600">
                  {connection.full_name?.charAt(0) || '?'}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Email to {connection.full_name}
                </h2>
                <p className="text-sm text-gray-500">
                  {connection.job_title} at {connection.company} • {connection.email}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {lastSaved && (
                <span className="text-xs text-green-600">
                  Saved {lastSaved.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label="Close composer"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          <div className="p-6 space-y-4">
            {/* Mode Toggle - Removed Preview Mode */}
            <div className="flex items-center space-x-4">
              <h3 className="text-sm font-medium text-gray-900">Compose Email</h3>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode Only */}
            <div className="space-y-4">
              {/* Subject Line */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={email.subject}
                  onChange={(e) => handleEmailChange('subject', e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Email Body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Body
                </label>
                <textarea
                  value={email.body}
                  onChange={(e) => handleEmailChange('body', e.target.value)}
                  placeholder="Write your email content here..."
                  rows={16}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {hasUnsavedChanges && (
                <span className="text-xs text-orange-600">Unsaved changes</span>
              )}
              {isDraftSaving && (
                <span className="text-xs text-blue-600 flex items-center">
                  <InlineLoading size={12} className="mr-1" />
                  Saving...
                </span>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={() => saveDraft(false)}
                disabled={isDraftSaving || (!email.subject && !email.body)}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDraftSaving ? (
                  <>
                    <InlineLoading size={16} className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Draft'
                )}
              </button>
              <button
                onClick={() => setShowSendConfirmation(true)}
                disabled={isSending || !email.subject || !email.body}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSending ? (
                  <>
                    <InlineLoading size={16} className="mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Send Confirmation Modal */}
      {showSendConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Send Email?
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to send this email to {connection.full_name}? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowSendConfirmation(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                onClick={sendEmail}
                disabled={isSending}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <InlineLoading size={16} className="mr-2" />
                    Sending...
                  </>
                ) : (
                  'Send Email'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { ConnectionSelectorModal, DraftBankModal };
export default EmailComposer;