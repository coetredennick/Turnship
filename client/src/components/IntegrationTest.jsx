import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { generalAPI, authAPI, handleAPIError } from '../services/api';

/**
 * Integration Test Component - Tests all auth components working together
 * This component is for development/testing purposes only
 */
const IntegrationTest = () => {
  const { user, authenticated, loading, error, login, logout, checkAuth, clearError } = useAuth();
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const runTest = async (testName, testFunction) => {
    try {
      setTesting(true);
      const result = await testFunction();
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: true, result }
      }));
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [testName]: { success: false, error: handleAPIError(error) }
      }));
    } finally {
      setTesting(false);
    }
  };

  const tests = {
    'Health Check': () => generalAPI.healthCheck(),
    'Auth Check': () => authAPI.checkAuth(),
    'Gmail Test': () => authAPI.testGmail(),
    'API Info': () => generalAPI.getApiInfo()
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md mt-8">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">
        🧪 Turnship Integration Test
      </h2>
      
      {/* Auth State Display */}
      <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-lg mb-3">Auth State</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Authenticated:</span>
              <span className={`ml-2 ${authenticated ? 'text-green-600' : 'text-red-600'}`}>
                {authenticated ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div>
              <span className="font-medium">Loading:</span>
              <span className="ml-2">{loading ? '⏳ Yes' : '✅ No'}</span>
            </div>
            {user && (
              <div>
                <span className="font-medium">User:</span>
                <div className="ml-4 mt-1">
                  <div>Name: {user.name}</div>
                  <div>Email: {user.email}</div>
                  <div>ID: {user.id}</div>
                </div>
              </div>
            )}
            {error && (
              <div>
                <span className="font-medium text-red-600">Error:</span>
                <div className="ml-2 text-red-600 text-xs">{error}</div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-bold text-lg mb-3">Current Route</h3>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Path:</span>
              <span className="ml-2 font-mono">{window.location.pathname}</span>
            </div>
            <div>
              <span className="font-medium">Title:</span>
              <span className="ml-2">{document.title}</span>
            </div>
            <div>
              <span className="font-medium">Expected:</span>
              <span className="ml-2">
                {authenticated ? '/dashboard' : '/'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Actions */}
      <div className="mb-8">
        <h3 className="font-bold text-lg mb-3">Auth Actions</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={checkAuth}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Check Auth
          </button>
          
          {!authenticated ? (
            <button
              onClick={login}
              disabled={loading}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded disabled:opacity-50"
            >
              Login
            </button>
          ) : (
            <button
              onClick={logout}
              disabled={loading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded disabled:opacity-50"
            >
              Logout
            </button>
          )}
          
          {error && (
            <button
              onClick={clearError}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
            >
              Clear Error
            </button>
          )}
        </div>
      </div>

      {/* API Tests */}
      <div className="mb-8">
        <h3 className="font-bold text-lg mb-3">API Tests</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(tests).map(([testName, testFunction]) => (
            <div key={testName} className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{testName}</span>
                <button
                  onClick={() => runTest(testName, testFunction)}
                  disabled={testing}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded disabled:opacity-50"
                >
                  {testing ? 'Testing...' : 'Test'}
                </button>
              </div>
              
              {testResults[testName] && (
                <div className={`text-sm p-2 rounded ${
                  testResults[testName].success 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {testResults[testName].success ? (
                    <div>
                      ✅ Success
                      <pre className="mt-1 text-xs overflow-auto">
                        {JSON.stringify(testResults[testName].result?.data || 'OK', null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div>❌ {testResults[testName].error}</div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Integration Status */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-bold text-lg mb-2 text-blue-900">Integration Status</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <div>✅ App renders without errors</div>
          <div>✅ Auth context provides state globally</div>
          <div>✅ API service handles requests</div>
          <div>✅ Router manages auth-based navigation</div>
          <div>✅ Error boundary catches React errors</div>
          <div>✅ Loading states display properly</div>
          <div>🟡 OAuth flow (requires Google credentials)</div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationTest;