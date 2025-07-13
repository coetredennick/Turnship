import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AddConnectionForm from '../components/AddConnectionForm';
import EmailGenerationModal from '../components/EmailGenerationModal';
import EmailComposer, { ConnectionSelectorModal, DraftBankModal } from '../components/EmailComposer';
import EditConnectionModal from '../components/EditConnectionModal';
import StatusBadge from '../components/StatusBadge';
import ConnectionCard from '../components/ConnectionCard';
import { InlineLoading } from '../components/Loading';
import { connectionsAPI, authAPI, handleAPIError } from '../services/api';

const Dashboard = () => {
  const { user, logout, testGmailConnection, loading } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [generatedEmailForComposer, setGeneratedEmailForComposer] = useState(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showConnectionSelector, setShowConnectionSelector] = useState(false);
  const [showDraftBank, setShowDraftBank] = useState(false);
  const [draftBankConnection, setDraftBankConnection] = useState(null);
  const [loadExistingDraft, setLoadExistingDraft] = useState(true);

  // Gmail testing state
  const [testingGmail, setTestingGmail] = useState(false);
  const [gmailStatus, setGmailStatus] = useState(null);
  
  // Connections state
  const [connections, setConnections] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [addingConnection, setAddingConnection] = useState(false);
  const [connectionsError, setConnectionsError] = useState(null);
  
  // Email generation state
  const [showEmailModal, setShowEmailModal] = useState(false);
  
  // Email composer state
  const [showEmailComposer, setShowEmailComposer] = useState(false);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState(null);
  
  // Expandable connections state
  const [expandedConnections, setExpandedConnections] = useState(new Set());
  
  // Selected connections state for ConnectionCard
  const [selectedConnections, setSelectedConnections] = useState(new Set());
  
  // Email generation state for composer panel
  const [emailOptions, setEmailOptions] = useState({
    purpose: 'informational-interview',
    tone: 'professional', 
    length: 'medium'
  });
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [editingEmailId, setEditingEmailId] = useState(null);

  const handleGmailTest = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTestingGmail(true);
    try {
      const result = await testGmailConnection();
      setGmailStatus(result);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Gmail test error:', error);
      }
      setGmailStatus({ success: false, error: 'Test failed' });
    } finally {
      setTestingGmail(false);
    }
  };

  // Load connections on component mount
  useEffect(() => {
    loadConnections();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showContactDropdown && !event.target.closest('.contact-dropdown-container')) {
        setShowContactDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showContactDropdown]);

  // Load connections function
  const loadConnections = async () => {
    setLoadingConnections(true);
    setConnectionsError(null);
    try {
      const response = await connectionsAPI.getConnections();
      setConnections(response.data.connections || []);
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to load connections');
      setConnectionsError(errorMessage);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Handle adding new connection
  const handleAddConnection = async (connectionData) => {
    setAddingConnection(true);
    try {
      const response = await connectionsAPI.createConnection(connectionData);
      setConnections(prev => [response.data.connection, ...prev]);
      setShowAddForm(false);
      setConnectionsError(null);
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to add connection');
      setConnectionsError(errorMessage);
      throw error; // Re-throw to let form handle it
    } finally {
      setAddingConnection(false);
    }
  };

  // Handle delete connection
  const handleDeleteConnection = async (connectionId) => {
    if (!window.confirm('Are you sure you want to delete this connection?')) {
      return;
    }
    
    try {
      await connectionsAPI.deleteConnection(connectionId);
      setConnections(prev => prev.filter(conn => conn.id !== connectionId));
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to delete connection');
      setConnectionsError(errorMessage);
    }
  };

  // Handle email generation
  const handleEmailGenerated = (generatedEmails) => {
    // Refresh connections to update email statuses
    loadConnections();
    console.log('Generated emails:', generatedEmails);
    
    // If only one email was generated, open it in the composer
    if (generatedEmails.length === 1) {
      const email = generatedEmails[0];
      const connection = connections.find(c => c.id === email.connectionId);
      if (connection) {
        setSelectedConnection(connection);
        setGeneratedEmailForComposer(email);
        setLoadExistingDraft(false); // Use generated content, don't load existing draft
        setShowEmailModal(false);
        setShowEmailComposer(true);
      }
    }
  };
  
  // Handle email sent
  const handleEmailSent = (connectionId) => {
    // Refresh connections to update email statuses
    loadConnections();
    console.log('Email sent for connection:', connectionId);
  };
  
  // Handle draft saved
  const handleDraftSaved = (connectionId) => {
    // Refresh connections to update email statuses
    loadConnections();
    console.log('Draft saved for connection:', connectionId);
  };

  // Handle manual status change (simplified for new 5-status system)
  const handleStatusChange = async (connectionId, newStatus) => {
    try {
      // Only update the email_status - backend handles intelligent detection
      await connectionsAPI.updateConnection(connectionId, { 
        email_status: newStatus
      });
      // Refresh connections to show updated status
      loadConnections();
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to update status');
      setConnectionsError(errorMessage);
    }
  };

  // Handle manual email connection selection
  const handleManualEmailConnection = (connection) => {
    setSelectedConnection(connection);
    setGeneratedEmailForComposer(null); // No AI content, blank draft
    setLoadExistingDraft(false); // Start with blank email for manual composition
    setShowConnectionSelector(false);
    setShowEmailComposer(true);
  };

  // Handle draft bank selection
  const handleDraftSelected = (connection) => {
    setSelectedConnection(connection);
    setGeneratedEmailForComposer(null); // Load existing draft
    setLoadExistingDraft(true); // Load existing draft for editing
    setShowDraftBank(false);
    setShowEmailComposer(true);
  };

  // Handle draft deletion
  const handleDraftDeleted = (connectionId) => {
    // Refresh connections to update draft status
    loadConnections();
    console.log('Draft deleted for connection:', connectionId);
  };

  // Handle edit connection
  const handleEditConnection = (connection) => {
    setConnectionToEdit(connection);
    setShowEditModal(true);
  };

  // Handle connection updated
  const handleConnectionUpdated = () => {
    loadConnections();
    setShowEditModal(false);
    setConnectionToEdit(null);
  };

  // Toggle expanded state for connections
  const toggleExpanded = (connectionId) => {
    setExpandedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  // Handle connection selection
  const handleConnectionSelect = (connectionId) => {
    setSelectedConnections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(connectionId)) {
        newSet.delete(connectionId);
      } else {
        newSet.add(connectionId);
      }
      return newSet;
    });
  };

  // Handle email generation from composer panel
  const handleWriteEmail = async () => {
    if (selectedConnections.size === 0) return;
    
    setGeneratingEmail(true);
    try {
      // Import the email generation API
      const { emailsAPI } = await import('../services/api');
      
      const connectionIds = Array.from(selectedConnections);
      console.log('Generating emails for connection IDs:', connectionIds);
      console.log('Email options:', emailOptions);
      
      // Generate emails directly using the current options
      const response = await emailsAPI.generateEmail(
        connectionIds,
        {
          purpose: emailOptions.purpose,
          tone: emailOptions.tone,
          length: emailOptions.length
        }
      );
      
      console.log('Full API response:', response);
      console.log('Response data:', response.data);
      
      // Set all generated emails for display
      if (response.data && response.data.emails && response.data.emails.length > 0) {
        console.log(`Generated ${response.data.emails.length} emails:`, response.data.emails);
        setGeneratedEmails(response.data.emails);
      } else {
        console.log('No emails generated or unexpected response structure');
        setGeneratedEmails([]);
      }
      
      // Refresh connections to update statuses
      loadConnections();
      
    } catch (error) {
      console.error('Error generating email:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
    } finally {
      setGeneratingEmail(false);
    }
  };

  // Handle saving draft to connection
  const handleSaveDraft = async (emailId) => {
    const email = generatedEmails.find(e => e.connectionId === emailId);
    if (!email) return;
    
    try {
      const { emailsAPI } = await import('../services/api');
      
      console.log('Saving draft for connection:', email.connectionId);
      console.log('Draft content:', {
        subject: email.subject,
        body: email.body
      });
      
      // Save the draft to the connection - API expects { draft } object
      const draftContent = `Subject: ${email.subject}\n\n${email.body}`;
      
      await emailsAPI.saveDraft(email.connectionId, draftContent);
      
      // Refresh connections to update draft status
      loadConnections();
      
      // Remove this email from the generated emails list
      setGeneratedEmails(prev => prev.filter(e => e.connectionId !== emailId));
      
    } catch (error) {
      console.error('Error saving draft:', error);
      console.error('Error details:', error.response?.data || error.message);
    }
  };

  // Handle editing the generated email
  const handleEditEmail = (emailId) => {
    setEditingEmailId(emailId);
  };

  // Handle removing the generated email
  const handleRemoveEmail = (emailId) => {
    setGeneratedEmails(prev => prev.filter(e => e.connectionId !== emailId));
    setEditingEmailId(null);
  };

  // Handle updating email content during editing
  const handleUpdateEmail = (emailId, field, value) => {
    setGeneratedEmails(prev =>
      prev.map(email =>
        email.connectionId === emailId
          ? { ...email, [field]: value }
          : email
      )
    );
  };

  const StatCard = ({ title, value, subtitle, icon, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 border-blue-200 text-blue-600",
      green: "bg-green-50 border-green-200 text-green-600",
      purple: "bg-purple-50 border-purple-200 text-purple-600",
      orange: "bg-orange-50 border-orange-200 text-orange-600"
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-full ${colorClasses[color]}`}>
            <span className="text-xl">{icon}</span>
          </div>
        </div>
      </div>
    );
  };

  const QuickActionCard = ({ title, description, icon, disabled = true, onClick }) => (
    <div 
      className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-200 ${
        disabled 
          ? 'opacity-60 cursor-not-allowed' 
          : 'hover:shadow-md cursor-pointer hover:border-blue-300'
      }`}
      onClick={disabled ? undefined : onClick}
    >
      <div className="flex items-center space-x-4">
        <div className="p-3 bg-gray-100 rounded-full">
          <span className="text-xl">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          <p className="text-sm text-gray-600">{description}</p>
          {disabled && (
            <span className="text-xs text-blue-600 font-medium">Coming Soon</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-sm font-bold text-white">T</span>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Welcome back, {user?.name || 'there'}!
                </h1>
                <p className="text-sm text-gray-600">
                  Ready to expand your network?
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Gmail Connection Card */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">Gmail Connection</h3>
                    <p className="text-xs text-gray-600 truncate">
                      {gmailStatus?.success 
                        ? `Connected as ${gmailStatus.data?.profile?.emailAddress}`
                        : 'Test your Gmail integration'}
                    </p>
                  </div>
                  <button
                    onClick={handleGmailTest}
                    disabled={testingGmail}
                    className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {testingGmail ? (
                      <>
                        <InlineLoading size={12} className="mr-1" />
                        Testing...
                      </>
                    ) : (
                      'Test'
                    )}
                  </button>
                </div>
                {gmailStatus && (
                  <div className={`mt-2 p-2 rounded-md text-xs ${
                    gmailStatus.success 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}>
                    {gmailStatus.success 
                      ? '✅ Gmail connection successful!' 
                      : `❌ ${gmailStatus.error}`}
                  </div>
                )}
              </div>
              
              <button
                onClick={logout}
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {loading ? <InlineLoading size={16} /> : 'Logout'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Split-Screen Content */}
      <div className="flex flex-col xl:flex-row h-full">
        {/* Left Panel - Connections */}
        <div id="connections-panel" className="w-full xl:w-1/2">
          <div className="h-full flex flex-col">
            <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Connections Section */}
        <div className="mb-8">
          {/* Add Connection Form */}
          {showAddForm && (
            <div className="mb-6">
              <AddConnectionForm
                onSubmit={handleAddConnection}
                onCancel={() => setShowAddForm(false)}
                isLoading={addingConnection}
              />
            </div>
          )}

          {/* Connections Error */}
          {connectionsError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-700">❌ {connectionsError}</p>
            </div>
          )}

          {/* Combined Header and List Container */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-6">
                <h2 className="text-lg font-semibold text-gray-900">My Connections</h2>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-blue-600">{connections.length}</span>
                  <span className="text-sm text-gray-500">connections</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-2xl font-bold text-green-600">0</span>
                  <span className="text-sm text-gray-500">emails sent this week</span>
                </div>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Connection
              </button>
            </div>

            {/* Connections List */}
            <div>
            {loadingConnections ? (
              <div className="p-8 text-center">
                <InlineLoading size={24} className="mx-auto mb-2" />
                <p className="text-gray-500">Loading connections...</p>
              </div>
            ) : connections.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No connections yet</h3>
                <p className="text-gray-500 mb-4">Start building your network by adding your first connection.</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Your First Connection
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {connections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    selected={selectedConnections.has(connection.id)}
                    onSelect={handleConnectionSelect}
                    onExpandToggle={toggleExpanded}
                    expanded={expandedConnections.has(connection.id)}
                    onEdit={handleEditConnection}
                    onViewDrafts={(connection) => {
                      setDraftBankConnection(connection);
                      setShowDraftBank(true);
                    }}
                    onRemove={handleDeleteConnection}
                    onStatusChange={handleStatusChange}
                  />
                ))}
              </div>
            )}
            </div>
          </div>
        </div>

            </main>
          </div>
        </div>

        {/* Right Panel - Email Composer */}
        <div id="composer-panel" className="w-full xl:w-1/2 h-full flex flex-col p-6 overflow-hidden">
          {/* Email Composition Header */}
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Email Composition</h1>
          
          {/* Options Panel */}
          <div className="mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Purpose</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailOptions.purpose}
                  onChange={(e) => setEmailOptions(prev => ({...prev, purpose: e.target.value}))}
                >
                  <option value="informational-interview">Informational Interview</option>
                  <option value="job-inquiry">Job Inquiry</option>
                  <option value="industry-insights">Industry Insights</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="introduction">Introduction</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailOptions.tone}
                  onChange={(e) => setEmailOptions(prev => ({...prev, tone: e.target.value}))}
                >
                  <option value="professional">Professional</option>
                  <option value="enthusiastic">Enthusiastic</option>
                  <option value="respectful">Respectful</option>
                  <option value="confident">Confident</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Length</label>
                <select 
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={emailOptions.length}
                  onChange={(e) => setEmailOptions(prev => ({...prev, length: e.target.value}))}
                >
                  <option value="medium">Medium</option>
                  <option value="short">Short</option>
                  <option value="long">Long</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Write Email Button */}
          <button 
            onClick={handleWriteEmail}
            disabled={selectedConnections.size === 0 || generatingEmail}
            className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
          >
            {generatingEmail ? 'Generating...' : `Write Email (${selectedConnections.size} selected)`}
          </button>
          
          {/* Email Output */}
          <div 
            id="email-output" 
            className="flex-1 overflow-y-auto mt-4 border rounded-lg bg-white min-h-0"
          >
            {generatedEmails.length > 0 ? (
              <div className="p-4 space-y-6 pb-16">
                <div className="border-b border-gray-200 pb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">Generated Emails</h3>
                    <span className="text-sm text-gray-500">
                      {generatedEmails.length} email{generatedEmails.length !== 1 ? 's' : ''} generated
                    </span>
                  </div>
                </div>
                
                {generatedEmails.map((email, index) => (
                  <div key={email.connectionId} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="border-b border-gray-200 pb-3 mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-md font-medium text-gray-900">
                          Email {index + 1} - {email.recipient?.name}
                        </h4>
                        <span className="text-sm text-gray-500">
                          {new Date(email.generated_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>To:</strong> {email.recipient?.name} ({email.recipient?.email})
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>Company:</strong> {email.recipient?.company || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>Options:</strong> {email.parameters?.purpose} | {email.parameters?.tone} | {email.parameters?.length}
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                        {editingEmailId === email.connectionId ? (
                          <input
                            type="text"
                            value={email.subject}
                            onChange={(e) => handleUpdateEmail(email.connectionId, 'subject', e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        ) : (
                          <div className="p-3 bg-white border border-gray-200 rounded-md">
                            <p className="text-sm text-gray-900">{email.subject}</p>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email Body</label>
                        {editingEmailId === email.connectionId ? (
                          <textarea
                            value={email.body}
                            onChange={(e) => handleUpdateEmail(email.connectionId, 'body', e.target.value)}
                            rows={8}
                            className="w-full p-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                          />
                        ) : (
                          <div className="p-4 bg-white border border-gray-200 rounded-md">
                            <div className="whitespace-pre-wrap text-sm text-gray-900 leading-relaxed">
                              {email.body}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex space-x-3 pt-4">
                      {editingEmailId === email.connectionId ? (
                        <>
                          <button 
                            onClick={() => setEditingEmailId(null)}
                            className="flex-1 py-2 px-4 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Save Changes
                          </button>
                          <button 
                            onClick={() => setEditingEmailId(null)}
                            className="py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleSaveDraft(email.connectionId)}
                            className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                          >
                            Save as Draft
                          </button>
                          <button 
                            onClick={() => handleEditEmail(email.connectionId)}
                            className="py-2 px-4 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                          >
                            Edit
                          </button>
                          <button 
                            onClick={() => handleRemoveEmail(email.connectionId)}
                            className="py-2 px-4 bg-red-200 text-red-700 font-medium rounded-md hover:bg-red-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                          >
                            Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 h-full flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-2xl">✉️</span>
                  </div>
                  <p>Select connections and click 'Write Email' to generate a message.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Email Generation Modal */}
      <EmailGenerationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        connections={connections}
        onEmailGenerated={handleEmailGenerated}
      />
      
      {/* Connection Selector Modal for Manual Emails */}
      <ConnectionSelectorModal
        isOpen={showConnectionSelector}
        onClose={() => setShowConnectionSelector(false)}
        connections={connections}
        onConnectionSelected={handleManualEmailConnection}
      />
      
      {/* Draft Bank Modal */}
      <DraftBankModal
        isOpen={showDraftBank}
        onClose={() => {
          setShowDraftBank(false);
          setDraftBankConnection(null);
        }}
        connections={connections}
        targetConnection={draftBankConnection}
        onDraftSelected={handleDraftSelected}
        onDraftDeleted={handleDraftDeleted}
      />
      
      {/* Email Composer Modal */}
      <EmailComposer
        isOpen={showEmailComposer}
        onClose={() => setShowEmailComposer(false)}
        connection={selectedConnection}
        initialEmail={generatedEmailForComposer}
        onEmailSent={handleEmailSent}
        onDraftSaved={handleDraftSaved}
        loadExistingDraft={loadExistingDraft}
      />
      
      {/* Edit Connection Modal */}
      <EditConnectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        connection={connectionToEdit}
        onConnectionUpdated={handleConnectionUpdated}
      />
    </div>
  );
};

export default Dashboard;