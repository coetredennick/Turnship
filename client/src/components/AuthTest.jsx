import React from 'react';
import { useAuth } from '../context/AuthContext';
import { InlineLoading } from './Loading';

const AuthTest = () => {
  const { user, authenticated, loading, error, login, logout, testGmailConnection, clearError } = useAuth();

  const handleGmailTest = async () => {
    const result = await testGmailConnection();
    if (process.env.NODE_ENV === 'development') {
      console.log('Gmail test result:', result);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-md mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Auth Context Test</h2>
      
      <div className="space-y-3">
        <div>
          <span className="font-medium">Authenticated:</span> 
          <span className={authenticated ? 'text-green-600' : 'text-red-600'}>
            {authenticated ? ' ✓ Yes' : ' ✗ No'}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Loading:</span> 
          <span className="ml-2">
            {loading ? <InlineLoading size={16} /> : '✓ Ready'}
          </span>
        </div>
        
        {user && (
          <div>
            <span className="font-medium">User:</span>
            <div className="ml-4 text-sm">
              <div>Name: {user.name}</div>
              <div>Email: {user.email}</div>
              <div>ID: {user.id}</div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <div className="text-red-700 text-sm">{error}</div>
            <button 
              onClick={clearError}
              className="mt-1 text-red-600 hover:text-red-800 text-xs underline"
            >
              Clear Error
            </button>
          </div>
        )}
        
        <div className="space-y-2 pt-4">
          {!authenticated ? (
            <button
              onClick={login}
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
            >
              {loading ? 'Connecting...' : 'Login with Google'}
            </button>
          ) : (
            <>
              <button
                onClick={handleGmailTest}
                disabled={loading}
                className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test Gmail Connection'}
              </button>
              <button
                onClick={logout}
                disabled={loading}
                className="w-full bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Logging out...' : 'Logout'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthTest;