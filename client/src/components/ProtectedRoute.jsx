import React from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import Login from './Login';

/**
 * ProtectedRoute component - Higher-order component for protecting routes
 * 
 * Usage:
 * <ProtectedRoute>
 *   <SomeProtectedComponent />
 * </ProtectedRoute>
 */
const ProtectedRoute = ({ 
  children, 
  fallback = null,
  loadingMessage = "Checking your access...",
  redirectToLogin = true 
}) => {
  const { authenticated, loading } = useAuth();

  // Show loading while checking authentication
  if (loading) {
    return <Loading message={loadingMessage} />;
  }

  // If not authenticated, show login or fallback
  if (!authenticated) {
    if (redirectToLogin) {
      return <Login />;
    }
    
    if (fallback) {
      return fallback;
    }
    
    // Default fallback - redirect to login
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Access Required
          </h2>
          
          <p className="text-gray-600 mb-6">
            You need to sign in to access your networking hub.
          </p>
          
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  // User is authenticated, render the protected content
  return children;
};

/**
 * RequireAuth hook - For functional components that need auth checking
 * 
 * Usage:
 * const MyComponent = () => {
 *   const isAuthorized = useRequireAuth();
 *   
 *   if (!isAuthorized) {
 *     return null; // ProtectedRoute will handle the redirect
 *   }
 *   
 *   return <div>Protected content</div>;
 * };
 */
export const useRequireAuth = () => {
  const { authenticated, loading } = useAuth();
  
  React.useEffect(() => {
    if (!loading && !authenticated) {
      // Redirect to login if not authenticated
      window.location.href = '/';
    }
  }, [authenticated, loading]);
  
  return authenticated && !loading;
};

/**
 * AuthGuard - Simple component for inline auth checking
 * 
 * Usage:
 * <AuthGuard fallback={<LoginPrompt />}>
 *   <ProtectedFeature />
 * </AuthGuard>
 */
export const AuthGuard = ({ children, fallback = null }) => {
  const { authenticated, loading } = useAuth();
  
  if (loading) {
    return <Loading size="small" message="Verifying access..." />;
  }
  
  if (!authenticated) {
    return fallback;
  }
  
  return children;
};

export default ProtectedRoute;