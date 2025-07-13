import React, { useState, useEffect } from 'react';
import { InlineLoading } from './Loading';
import { emailsAPI, handleAPIError } from '../services/api';

const EmailGenerationModal = ({ isOpen, onClose, connections = [], onEmailGenerated }) => {
  const [selectedConnections, setSelectedConnections] = useState([]);
  const [options, setOptions] = useState({
    purpose: 'summer-internship',
    tone: 'respectful',
    length: 'medium'
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState(null);
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [error, setError] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [savingDrafts, setSavingDrafts] = useState({});
  const [draftSaveResults, setDraftSaveResults] = useState({});

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedConnections([]);
      setGeneratedEmails([]);
      setError(null);
      setShowResults(false);
      setSavingDrafts({});
      setDraftSaveResults({});
    }
  }, [isOpen]);

  // No smart defaults needed since initial_purpose is removed

  // Get email status badge color (matching simplified 5-status system)
  const getStatusBadgeColor = (status) => {
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

  // Check if connection should be disabled (removed restriction)
  const isConnectionDisabled = (connection) => {
    // Allow email generation for all connections regardless of status
    // Users can now generate follow-ups, responses, and emails for any status
    return false;
  };

  // Handle connection selection
  const handleConnectionSelect = (connectionId) => {
    const connection = connections.find(c => c.id === connectionId);
    
    if (isConnectionDisabled(connection)) {
      return;
    }

    setSelectedConnections(prev => 
      prev.includes(connectionId) 
        ? prev.filter(id => id !== connectionId)
        : [...prev, connectionId]
    );
  };

  // Handle select all toggle
  const handleSelectAll = () => {
    const availableConnections = connections.filter(c => !isConnectionDisabled(c));
    const allSelected = availableConnections.every(c => selectedConnections.includes(c.id));
    
    if (allSelected) {
      setSelectedConnections([]);
    } else {
      setSelectedConnections(availableConnections.map(c => c.id));
    }
  };

  // Handle form submission
  const handleGenerate = async () => {
    if (selectedConnections.length === 0) {
      setError('Please select at least one connection');
      return;
    }

    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setError(null);

    try {
      const response = await emailsAPI.generateEmail(selectedConnections, options);
      setGeneratedEmails(response.data.emails);
      setShowResults(true);
      
      // Notify parent component
      if (onEmailGenerated) {
        onEmailGenerated(response.data.emails);
      }
    } catch (error) {
      console.error('Email generation error:', error);
      if (error.code === 'ECONNABORTED') {
        setError('Email generation is taking longer than expected. Please try again or contact support if this persists.');
      } else {
        const errorMessage = handleAPIError(error, 'Failed to generate emails');
        setError(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(null);
    }
  };

  // Handle back to form
  const handleBackToForm = () => {
    setShowResults(false);
    setGeneratedEmails([]);
    setError(null);
  };

  // Handle save draft
  const handleSaveDraft = async (email) => {
    const connectionId = email.connectionId;
    setSavingDrafts(prev => ({ ...prev, [connectionId]: true }));
    setDraftSaveResults(prev => ({ ...prev, [connectionId]: null }));
    
    try {
      const draftContent = `Subject: ${email.subject}\n\n${email.body}`;
      // Find the connection to get current status for labeling the draft
      const connection = connections.find(c => c.id === connectionId);
      await emailsAPI.saveDraft(connectionId, draftContent);
      setDraftSaveResults(prev => ({ 
        ...prev, 
        [connectionId]: { success: true, message: 'Draft saved successfully!' }
      }));
      
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setDraftSaveResults(prev => ({ ...prev, [connectionId]: null }));
      }, 3000);
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to save draft');
      setDraftSaveResults(prev => ({ 
        ...prev, 
        [connectionId]: { success: false, message: errorMessage }
      }));
    } finally {
      setSavingDrafts(prev => ({ ...prev, [connectionId]: false }));
    }
  };

  // Handle close modal
  const handleClose = () => {
    setShowResults(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              {showResults ? 'Generated Emails' : 'Generate Networking Emails'}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 focus:outline-none"
              aria-label="Close modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {!showResults ? (
            /* Generation Form */
            <div className="p-6 space-y-6">
              {/* Connection Selection */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Select Connections</h3>
                  <button
                    onClick={handleSelectAll}
                    className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
                  >
                    {selectedConnections.length === connections.filter(c => !isConnectionDisabled(c)).length 
                      ? 'Deselect All' 
                      : 'Select All Available'}
                  </button>
                </div>
                
                {connections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No connections available. Add some connections first!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                    {connections.map((connection) => {
                      const isDisabled = isConnectionDisabled(connection);
                      const isSelected = selectedConnections.includes(connection.id);
                      
                      return (
                        <div
                          key={connection.id}
                          className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                            isDisabled 
                              ? 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-60' 
                              : isSelected 
                                ? 'bg-blue-50 border-blue-300' 
                                : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleConnectionSelect(connection.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={isDisabled}
                                readOnly
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                  <span className="text-sm font-medium text-blue-600">
                                    {connection.full_name?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {connection.full_name}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {connection.email}
                                  </p>
                                </div>
                              </div>
                              <div className="mt-2">
                                <p className="text-xs text-gray-600">
                                  {connection.job_title} at {connection.company}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center space-x-2">
                                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                                  getStatusBadgeColor(connection.email_status || 'Not Contacted')
                                }`}>
                                  {connection.email_status || 'Not Contacted'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Email Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose/Goal
                  </label>
                  <select
                    value={options.purpose}
                    onChange={(e) => setOptions(prev => ({ ...prev, purpose: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="summer-internship">Summer Internship</option>
                    <option value="just-reaching-out">Just Reaching Out</option>
                    <option value="advice">Advice</option>
                  </select>
                </div>

                {/* Tone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={options.tone}
                    onChange={(e) => setOptions(prev => ({ ...prev, tone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="enthusiastic">Enthusiastic</option>
                    <option value="respectful">Respectful</option>
                    <option value="confident">Confident</option>
                    <option value="casual">Casual</option>
                  </select>
                </div>

                {/* Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Length
                  </label>
                  <select
                    value={options.length}
                    onChange={(e) => setOptions(prev => ({ ...prev, length: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="short">Short</option>
                    <option value="medium">Medium</option>
                    <option value="long">Long</option>
                  </select>
                </div>
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
            </div>
          ) : (
            /* Generated Emails Results */
            <div className="p-6 space-y-4">
              {generatedEmails.map((email, index) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">
                          {email.recipient.name?.charAt(0) || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{email.recipient.name}</p>
                        <p className="text-sm text-gray-500">{email.recipient.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`)}
                        className="text-sm text-blue-600 hover:text-blue-700 focus:outline-none"
                      >
                        Copy
                      </button>
                      <button
                        onClick={() => handleSaveDraft(email)}
                        disabled={savingDrafts[email.connectionId] || draftSaveResults[email.connectionId]?.success}
                        className={`text-sm focus:outline-none disabled:opacity-50 ${
                          draftSaveResults[email.connectionId]?.success 
                            ? 'text-green-600' 
                            : 'text-green-600 hover:text-green-700'
                        }`}
                      >
                        {savingDrafts[email.connectionId] ? (
                          <>
                            <InlineLoading size={12} className="mr-1" />
                            Saving...
                          </>
                        ) : draftSaveResults[email.connectionId]?.success ? (
                          <>
                            <svg className="w-3 h-3 mr-1 inline" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            Saved!
                          </>
                        ) : (
                          'Save as Draft'
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Subject:</p>
                      <p className="text-sm text-gray-900">{email.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email:</p>
                      <div className="bg-white rounded border p-3 text-sm text-gray-900 whitespace-pre-wrap">
                        {email.body}
                      </div>
                    </div>
                  </div>
                  
                  {/* Draft save feedback */}
                  {draftSaveResults[email.connectionId] && !draftSaveResults[email.connectionId].success && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                      {draftSaveResults[email.connectionId].message}
                    </div>
                  )}
                  {draftSaveResults[email.connectionId]?.success && (
                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-600">
                      {draftSaveResults[email.connectionId].message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            {!showResults ? (
              <>
                <div className="text-sm text-gray-500">
                  {selectedConnections.length} connection{selectedConnections.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || selectedConnections.length === 0}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <InlineLoading size={16} className="mr-2" />
                        Generating AI emails... (this may take up to 60 seconds)
                      </>
                    ) : (
                      'Generate Emails'
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between w-full">
                <button
                  onClick={handleBackToForm}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Generate More
                </button>
                <div className="text-sm text-gray-500">
                  {generatedEmails.length} email{generatedEmails.length !== 1 ? 's' : ''} generated
                </div>
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailGenerationModal;