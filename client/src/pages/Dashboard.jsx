import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { InlineLoading } from '../components/Loading';

const Dashboard = () => {
  const { user, logout, testGmailConnection, loading } = useAuth();
  const [gmailStatus, setGmailStatus] = useState(null);
  const [testingGmail, setTestingGmail] = useState(false);

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
              value="0"
              subtitle="Start building your network"
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
            <QuickActionCard
              title="Generate Email"
              description="AI-powered networking emails"
              icon="✨"
              disabled={true}
            />
            <QuickActionCard
              title="Add Connection"
              description="Log a new networking contact"
              icon="➕"
              disabled={true}
            />
            <QuickActionCard
              title="View Analytics"
              description="Track your networking progress"
              icon="📊"
              disabled={true}
            />
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
              <div className="flex-shrink-0 w-6 h-6 bg-gray-400 text-white rounded-full flex items-center justify-center text-sm font-bold">
                2
              </div>
              <div>
                <p className="text-gray-600 font-medium">Add your first connection (Coming Soon)</p>
                <p className="text-gray-500 text-sm">Start building your networking database</p>
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
      </main>
    </div>
  );
};

export default Dashboard;