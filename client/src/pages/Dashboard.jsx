import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AddConnectionForm from '../components/AddConnectionForm';
import EmailGenerationModal from '../components/EmailGenerationModal';
import EmailComposer, { ConnectionSelectorModal, DraftBankModal } from '../components/EmailComposer';
import EditConnectionModal from '../components/EditConnectionModal';
import StatusBadge from '../components/StatusBadge';
import ConnectionCard from '../components/ConnectionCard';
import { InlineLoading } from '../components/Loading';
import { connectionsAPI, authAPI, timelineAPI, handleAPIError } from '../services/api';

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
  
  // Gmail connection state
  const [gmailConnected, setGmailConnected] = useState(false);
  const [checkingGmailStatus, setCheckingGmailStatus] = useState(true);
  
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
  
  // Timeline integration state
  const [currentStageId, setCurrentStageId] = useState(null);
  
  // Email generation state for composer panel
  const [emailOptions, setEmailOptions] = useState({
    purpose: 'summer-internship',
    tone: 'professional', 
    length: 'medium'
  });
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmails, setGeneratedEmails] = useState([]);
  const [editingEmailId, setEditingEmailId] = useState(null);
  
  // Profile management state
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState('view'); // 'view' or 'edit'

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

  // Handle Gmail connection
  const handleConnectGmail = () => {
    // Redirect to OAuth flow
    window.location.href = 'http://localhost:3001/auth/google';
  };

  // Load connections on component mount
  useEffect(() => {
    loadConnections();
  }, []);

  // Check Gmail connection status
  useEffect(() => {
    const checkGmailStatus = async () => {
      try {
        setCheckingGmailStatus(true);
        const response = await authAPI.checkGmailStatus();
        setGmailConnected(response.data.connected);
      } catch (error) {
        console.error('Error checking Gmail status:', error);
        setGmailConnected(false);
      } finally {
        setCheckingGmailStatus(false);
      }
    };

    if (user) {
      checkGmailStatus();
    }
  }, [user]);

  // Refresh Gmail status when user returns from OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromOAuth = urlParams.get('oauth_success');
    
    if (fromOAuth && user) {
      // Clear the URL parameter
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Refresh Gmail status
      const refreshGmailStatus = async () => {
        try {
          setCheckingGmailStatus(true);
          const response = await authAPI.checkGmailStatus();
          setGmailConnected(response.data.connected);
        } catch (error) {
          console.error('Error refreshing Gmail status:', error);
        } finally {
          setCheckingGmailStatus(false);
        }
      };
      
      refreshGmailStatus();
    }
  }, [user]);

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

  // Load connections function with timeline data and caching
  const loadConnections = async (forceRefresh = false) => {
    setLoadingConnections(true);
    setConnectionsError(null);
    try {
      const response = await connectionsAPI.getConnections();
      const connections = response.data.connections || [];
      
      // Fetch timeline data for connections (with error resilience)
      let connectionsWithTimeline;
      try {
        connectionsWithTimeline = await Promise.all(
          connections.map(async (connection) => {
            // Skip timeline fetch if we have cached data and not forcing refresh
            if (!forceRefresh && connection.timeline) {
              return connection;
            }
            
            try {
              const timelineResponse = await timelineAPI.getTimeline(connection.id);
              return {
                ...connection,
                timeline: timelineResponse.data.timeline,
                timelineLastFetched: Date.now() // Simple cache timestamp
              };
            } catch (timelineError) {
              // Timeline API might not be ready yet (Phase 1) - gracefully fallback
              console.info(`Timeline not available for connection ${connection.id} (this is normal in Phase 1):`, timelineError.response?.status || timelineError.message);
              // Return connection with empty timeline if individual fetch fails
              return {
                ...connection,
                timeline: { stages: [] },
                timelineLastFetched: Date.now()
              };
            }
          })
        );
      } catch (batchError) {
        console.warn('Timeline batch fetch failed, using connections without timeline:', batchError);
        // If entire batch fails, use connections without timeline data
        connectionsWithTimeline = connections.map(conn => ({
          ...conn,
          timeline: { stages: [] }
        }));
      }
      
      setConnections(connectionsWithTimeline);
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to load connections');
      setConnectionsError(errorMessage);
    } finally {
      setLoadingConnections(false);
    }
  };

  // Handle opening email viewer for sent stages (Phase 2 stub)
  const openEmailViewer = (stage, connection) => {
    console.log('Opening email viewer for stage:', stage, 'connection:', connection?.full_name);
    // TODO: Phase 3+ - Implement actual email viewer/tracker component
    alert(`Email sent for ${stage.stage_type} stage.\nConnection: ${connection.full_name}\nStage ID: ${stage.id}`);
  };

  // Handle opening response viewer for received stages (Phase 2 stub)
  const openResponseViewer = (stage, connection) => {
    console.log('Opening response viewer for stage:', stage, 'connection:', connection?.full_name);
    // TODO: Phase 3+ - Implement actual response details component
    alert(`Response received for ${stage.stage_type} stage.\nConnection: ${connection.full_name}\nStage ID: ${stage.id}`);
  };

  // Handle timeline updates from EmailComposer
  const handleTimelineUpdated = (timelineData) => {
    console.log('Timeline updated:', timelineData);
    // Update the connection timeline in the local state
    if (timelineData && selectedConnection) {
      setConnections(prevConnections => 
        prevConnections.map(conn => 
          conn.id === selectedConnection.id 
            ? { ...conn, timeline: timelineData.timeline || timelineData }
            : conn
        )
      );
    }
  };

  // Handle timeline stage click - Phase 2: Implement stage-specific actions
  const handleStageClick = (stage, connection) => {
    console.log('Stage clicked:', stage, 'for connection:', connection?.id);
    
    if (!connection) {
      console.error('No connection provided for stage click');
      return;
    }
    
    switch (stage.stage_status) {
      case 'waiting':
        // Open composer for waiting stage (new email for this stage type)
        console.log('Opening composer for waiting stage:', stage.stage_type);
        setSelectedConnection(connection);
        setCurrentStageId(stage.id); // Set stage ID for timeline integration
        setLoadExistingDraft(false); // New email, not loading existing draft
        setShowEmailComposer(true);
        break;
        
      case 'draft':
        // Open composer with existing draft for this stage
        console.log('Opening composer with draft for stage:', stage.stage_type);
        setSelectedConnection(connection);
        setCurrentStageId(stage.id); // Set stage ID for timeline integration
        setLoadExistingDraft(true); // Load existing draft
        setShowEmailComposer(true);
        break;
        
      case 'sent':
        // Open email viewer/tracker for sent stage
        openEmailViewer(stage, connection);
        break;
        
      case 'received':
        // Show response details for received stage  
        openResponseViewer(stage, connection);
        break;
        
      default:
        console.warn('Unknown stage status:', stage.stage_status);
        // Fallback: open composer as default action
        setSelectedConnection(connection);
        setCurrentStageId(stage.id); // Set stage ID for timeline integration
        setLoadExistingDraft(false);
        setShowEmailComposer(true);
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

  // Handle viewing draft bank for specific connection
  const handleViewDrafts = (connection) => {
    setDraftBankConnection(connection);
    setShowDraftBank(true);
  };

  // Handle draft selection from draft bank
  const handleDraftSelected = (connection, draft) => {
    setSelectedConnection(connection);
    // Pass the draft data as initialEmail
    setGeneratedEmailForComposer({
      id: draft.id,
      subject: draft.subject,
      body: draft.body,
      connectionId: connection.id
    });
    setLoadExistingDraft(false); // Don't load existing draft, use the selected one
    setShowEmailComposer(true);
  };

  // Handle draft deleted
  const handleDraftDeleted = (draftId) => {
    // Refresh connections to update any UI that might show draft counts
    loadConnections();
    console.log('Draft deleted:', draftId);
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
      
      // Use new multiple drafts API
      await emailsAPI.saveNewDraft(email.connectionId, email.subject, email.body);
      
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
                  Welcome back, {user?.full_name || user?.username || user?.name || 'there'}!
                </h1>
                <p className="text-sm text-gray-600">
                  Ready to expand your network?
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-white">
                      {user?.full_name ? user.full_name.charAt(0).toUpperCase() : user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {user?.full_name || user?.name || 'User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user?.email || 'No email'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="py-1">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{user?.full_name || user?.name}</p>
                        <p className="text-xs text-gray-500">{user?.email}</p>
                        {user?.university && (
                          <p className="text-xs text-gray-500">{user.university}</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setProfileModalMode('view');
                          setShowProfileModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span>View Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setProfileModalMode('edit');
                          setShowProfileModal(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>Edit Profile</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Gmail Connection Status */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${gmailConnected ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <svg className={`w-4 h-4 ${gmailConnected ? 'text-green-600' : 'text-yellow-600'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-gray-900">Gmail</h3>
                    <div className="flex items-center space-x-2">
                      {checkingGmailStatus ? (
                        <span className="text-xs text-gray-500">Checking...</span>
                      ) : gmailConnected ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Connected
                        </span>
                      )}
                    </div>
                  </div>
                  {!checkingGmailStatus && !gmailConnected && (
                    <button
                      onClick={handleConnectGmail}
                      className="px-3 py-1 text-xs font-medium text-white bg-blue-600 border border-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Connect
                    </button>
                  )}
                </div>
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
                      handleViewDrafts(connection);
                    }}
                    onRemove={handleDeleteConnection}
                    onStatusChange={handleStatusChange}
                    onStageClick={handleStageClick}
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
                  <option value="summer-internship">Summer Internship</option>
                  <option value="advice">Advice</option>
                  <option value="just-reaching-out">Just reaching out</option>
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
        onClose={() => {
          setShowEmailComposer(false);
          setCurrentStageId(null); // Clear stage ID when closing
        }}
        connection={selectedConnection}
        initialEmail={generatedEmailForComposer}
        onEmailSent={handleEmailSent}
        onDraftSaved={handleDraftSaved}
        loadExistingDraft={loadExistingDraft}
        currentStageId={currentStageId}
        onTimelineUpdated={handleTimelineUpdated}
      />
      
      {/* Edit Connection Modal */}
      <EditConnectionModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        connection={connectionToEdit}
        onConnectionUpdated={handleConnectionUpdated}
      />

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {profileModalMode === 'view' ? 'Profile Information' : 'Edit Profile'}
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {profileModalMode === 'view' ? (
                // View Mode
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                    <p className="text-gray-900">{user?.full_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <p className="text-gray-900">{user?.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">University</label>
                    <p className="text-gray-900">{user?.university || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Major</label>
                    <p className="text-gray-900">{user?.major || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <p className="text-gray-900">{user?.year || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
                    <p className="text-gray-900">{user?.graduation_year || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn</label>
                    <p className="text-gray-900">{user?.linkedin_url || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
                  </div>
                </div>
              ) : (
                // Edit Mode - Simple message for now
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">Profile editing functionality coming soon!</p>
                  <p className="text-sm text-gray-500">
                    For now, you can view your profile information above.
                  </p>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              {profileModalMode === 'view' && (
                <button
                  onClick={() => setProfileModalMode('edit')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              )}
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;