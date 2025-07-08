import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';
import Login from './Login';
import Dashboard from '../pages/Dashboard';

const Router = () => {
  const { authenticated, loading, checkAuth, error } = useAuth();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Handle initial load and OAuth callback
  useEffect(() => {
    const currentPath = window.location.pathname;
    
    // Check for OAuth callback
    if (currentPath === '/dashboard' && !authenticated && !loading) {
      // User landed on dashboard (likely from OAuth callback)
      console.log('OAuth callback detected, checking authentication...');
      checkAuth();
    }
    
    // Mark initial load as complete after first auth check
    if (!loading) {
      setIsInitialLoad(false);
    }
  }, [authenticated, loading, checkAuth]);

  // Handle route changes based on auth state
  useEffect(() => {
    if (!loading && !isInitialLoad) {
      const currentPath = window.location.pathname;
      
      if (authenticated && currentPath !== '/dashboard') {
        // Authenticated user not on dashboard - redirect
        console.log('Redirecting authenticated user to dashboard');
        window.history.replaceState({}, 'Dashboard | Turnship', '/dashboard');
        document.title = 'Dashboard | Turnship';
      } else if (!authenticated && currentPath !== '/') {
        // Unauthenticated user trying to access protected route - redirect to home
        console.log('Redirecting unauthenticated user to home');
        window.history.replaceState({}, 'Turnship | Networking Automation', '/');
        document.title = 'Turnship | Networking Automation';
      }
    }
  }, [authenticated, loading, isInitialLoad]);

  // Show loading state during initial load or auth transitions
  if (loading || isInitialLoad) {
    return <Loading message="Connecting to your networking hub..." />;
  }

  // Show error state if there's a critical error
  if (error && !authenticated) {
    return <Login />;
  }

  // Render appropriate component based on auth state
  if (authenticated) {
    document.title = 'Dashboard | Turnship';
    return <Dashboard />;
  } else {
    document.title = 'Turnship | Networking Automation';
    return <Login />;
  }
};

export default Router;