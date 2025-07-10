import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import AddConnectionForm from '../components/AddConnectionForm';
import EmailGenerationModal from '../components/EmailGenerationModal';
import EmailComposer, { ConnectionSelectorModal, DraftBankModal } from '../components/EmailComposer';
import EditConnectionModal from '../components/EditConnectionModal';
import StatusBadge from '../components/StatusBadge';
import { InlineLoading } from '../components/Loading';
import { connectionsAPI, authAPI, handleAPIError } from '../services/api';

const Dashboard = () => {
  const { user, logout, testGmailConnection, loading } = useAuth();
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [generatedEmailForComposer, setGeneratedEmailForComposer] = useState(null);
  const [showContactDropdown, setShowContactDropdown] = useState(false);
  const [showConnectionSelector, setShowConnectionSelector] = useState(false);
  const [showDraftBank, setShowDraftBank] = useState(false);
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
    <div className="min-h-screen bg-gray-50">
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
            <button
              onClick={logout}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? <InlineLoading size={16} /> : 'Logout'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Gmail Status Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">Gmail Connection</h3>
                  <p className="text-sm text-gray-600">
                    {gmailStatus?.success 
                      ? `Connected as ${gmailStatus.data?.profile?.emailAddress}`
                      : 'Test your Gmail integration'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleGmailTest}
                disabled={testingGmail}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {testingGmail ? (
                  <>
                    <InlineLoading size={16} className="mr-2" />
                    Testing...
                  </>
                ) : (
                  'Test Gmail Connection'
                )}
              </button>
            </div>
            {gmailStatus && (
              <div className={`mt-4 p-3 rounded-md ${
                gmailStatus.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  gmailStatus.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {gmailStatus.success 
                    ? '✅ Gmail connection successful!' 
                    : `❌ ${gmailStatus.error}`}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Networking Overview */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Networking Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Recent Connections"
              value={connections.length.toString()}
              subtitle={connections.length === 0 ? "Start building your network" : "Growing your network"}
              icon="👥"
              color="blue"
            />
            <StatCard
              title="Emails Sent This Week"
              value="0"
              subtitle="Ready to reach out?"
              icon="📧"
              color="green"
            />
            <StatCard
              title="Follow-ups Due"
              value="0"
              subtitle="Stay on top of connections"
              icon="⏰"
              color="orange"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contact Dropdown */}
            <div className="relative contact-dropdown-container">
              <div 
                className={`bg-white rounded-lg border border-gray-200 p-6 shadow-sm transition-all duration-200 ${
                  connections.length === 0 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:shadow-md cursor-pointer hover:border-blue-300'
                }`}
                onClick={connections.length === 0 ? undefined : () => setShowContactDropdown(!showContactDropdown)}
              >
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gray-100 rounded-full">
                    <span className="text-xl">✨</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">Contact</h3>
                    <p className="text-sm text-gray-600">Reach out to your connections</p>
                    {connections.length === 0 && (
                      <span className="text-xs text-blue-600 font-medium">Add connections first</span>
                    )}
                  </div>
                  {connections.length > 0 && (
                    <svg className={`w-5 h-5 text-gray-400 transition-transform ${showContactDropdown ? 'transform rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </div>
              </div>
              
              {/* Dropdown Menu */}
              {showContactDropdown && connections.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg border border-gray-200 shadow-lg z-10">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowEmailModal(true);
                        setShowContactDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">🤖</span>
                        <div>
                          <p className="font-medium text-gray-900">Generate AI Email</p>
                          <p className="text-sm text-gray-500">Let AI craft personalized messages</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        // Open connection selector for manual draft
                        setShowConnectionSelector(true);
                        setShowContactDropdown(false);
                      }}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50 border-t border-gray-100"
                    >
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">✍️</span>
                        <div>
                          <p className="font-medium text-gray-900">Write Manual Email</p>
                          <p className="text-sm text-gray-500">Compose your own message</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            <QuickActionCard
              title="Add Connection"
              description="Log a new networking contact"
              icon="➕"
              disabled={false}
              onClick={() => setShowAddForm(true)}
            />
            <QuickActionCard
              title="View Analytics"
              description="Track your networking progress"
              icon="📊"
              disabled={true}
            />
          </div>
        </div>

        {/* Connections Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">My Connections</h2>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Connection
            </button>
          </div>

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

          {/* Connections List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
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
                  <div key={connection.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {connection.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{connection.full_name}</h4>
                            <p className="text-sm text-gray-500">{connection.email}</p>
                          </div>
                        </div>
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm">
                          {connection.company && (
                            <div>
                              <span className="font-medium text-gray-500">Company:</span>
                              <span className="ml-1 text-gray-900">{connection.company}</span>
                            </div>
                          )}
                          {connection.job_title && (
                            <div>
                              <span className="font-medium text-gray-500">Title:</span>
                              <span className="ml-1 text-gray-900">{connection.job_title}</span>
                            </div>
                          )}
                          {connection.industry && (
                            <div>
                              <span className="font-medium text-gray-500">Industry:</span>
                              <span className="ml-1 text-gray-900">{connection.industry}</span>
                            </div>
                          )}
                          {connection.connection_type && (
                            <div>
                              <span className="font-medium text-gray-500">Type:</span>
                              <span className="ml-1 text-gray-900">{connection.connection_type}</span>
                            </div>
                          )}
                          {connection.initial_purpose && (
                            <div>
                              <span className="font-medium text-gray-500">Purpose:</span>
                              <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                {connection.initial_purpose === 'summer-internship' ? 'Summer Internship' : 
                                 connection.initial_purpose === 'just-reaching-out' ? 'Just Reaching Out' : 
                                 'Advice'}
                              </span>
                            </div>
                          )}
                        </div>
                        {connection.notes && (
                          <div className="mt-2">
                            <span className="font-medium text-gray-500 text-sm">Notes:</span>
                            <p className="text-sm text-gray-900 mt-1">{connection.notes}</p>
                          </div>
                        )}
                        <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-2">
                            <span>Status:</span>
                            <StatusBadge 
                              status={connection.email_status || 'Not Contacted'} 
                              editable={true}
                              onStatusChange={handleStatusChange}
                              connectionId={connection.id}
                            />
                          </div>
                          <span>Added: {new Date(connection.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowDraftBank(true)}
                          className="p-1 text-gray-400 hover:text-blue-600 focus:outline-none"
                          title="Draft bank"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEditConnection(connection)}
                          className="p-1 text-gray-400 hover:text-blue-600 focus:outline-none"
                          title="Edit connection"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteConnection(connection.id)}
                          className="p-1 text-gray-400 hover:text-red-600 focus:outline-none"
                          title="Delete connection"
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

        {/* Getting Started Guide */}
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-3">
            🚀 Getting Started with Turnship
          </h3>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                1
              </div>
              <div>
                <p className="text-blue-800 font-medium">Test your Gmail connection</p>
                <p className="text-blue-700 text-sm">Make sure Turnship can access your Gmail account</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className={`flex-shrink-0 w-6 h-6 ${connections.length > 0 ? 'bg-blue-600' : 'bg-gray-400'} text-white rounded-full flex items-center justify-center text-sm font-bold`}>
                2
              </div>
              <div>
                <p className={`${connections.length > 0 ? 'text-blue-800' : 'text-gray-600'} font-medium`}>
                  {connections.length > 0 ? 'Add your first connection ✓' : 'Add your first connection'}
                </p>
                <p className={`${connections.length > 0 ? 'text-blue-700' : 'text-gray-500'} text-sm`}>
                  {connections.length > 0 ? 'Great start! Keep building your network' : 'Start building your networking database'}
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                3
              </div>
              <div>
                <p className="text-gray-600 font-medium">Generate your first email (Coming Soon)</p>
                <p className="text-gray-500 text-sm">Let AI craft personalized networking messages</p>
              </div>
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
          onClose={() => setShowDraftBank(false)}
          connections={connections}
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
      </main>
    </div>
  );
};

export default Dashboard;