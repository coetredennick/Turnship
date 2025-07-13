import React, { useState, useEffect } from 'react';
import Dashboard from '../pages/Dashboard';
import Signup from './Signup';
import Login from './Login';
import { useAuth } from '../context/AuthContext';
import Loading from './Loading';

const Router = () => {
  const { user, authenticated, loading, setUser } = useAuth();
  const [currentRoute, setCurrentRoute] = useState(window.location.pathname);

  useEffect(() => {
    // Listen for URL changes
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
    };
    
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path) => {
    window.history.pushState({}, '', path);
    setCurrentRoute(path);
  };

  const handleSignupSuccess = (newUser) => {
    setUser(newUser);
    // Skip onboarding for now and go directly to dashboard
    navigateTo('/dashboard');
  };

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    if (loggedInUser.profile_completed) {
      navigateTo('/dashboard');
    } else {
      navigateTo('/onboarding');
    }
  };

  // Show loading while checking authentication
  if (loading) {
    return <Loading />;
  }

  // Protected routes - require authentication
  const isProtectedRoute = ['/dashboard', '/onboarding'].includes(currentRoute);
  
  if (isProtectedRoute && !authenticated) {
    // Redirect to home page if trying to access protected route without auth
    if (currentRoute !== '/') {
      window.history.replaceState({}, '', '/');
      setCurrentRoute('/');
    }
  }

  // If authenticated and on home/login/signup, redirect to appropriate page
  if (authenticated && ['/', '/login', '/signup'].includes(currentRoute)) {
    const redirectPath = user?.profile_completed ? '/dashboard' : '/onboarding';
    navigateTo(redirectPath);
  }

  // Route rendering
  switch (currentRoute) {
    case '/signup':
      document.title = 'Sign Up | Turnship';
      return <Signup onSignupSuccess={handleSignupSuccess} />;
      
    case '/login':
      document.title = 'Sign In | Turnship';
      return <Login onLoginSuccess={handleLoginSuccess} />;
      
    case '/onboarding':
      document.title = 'Complete Your Profile | Turnship';
      if (!authenticated) {
        return null; // Will be redirected by the protection logic above
      }
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md w-full bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Profile Setup</h2>
            <p className="text-gray-600 mb-4">Welcome! Let's complete your profile to get started.</p>
            <button 
              onClick={() => navigateTo('/dashboard')}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Continue to Dashboard (Skip for now)
            </button>
          </div>
        </div>
      );
      
    case '/dashboard':
      document.title = 'Dashboard | Turnship';
      if (!authenticated) {
        return null; // Will be redirected by the protection logic above
      }
      return <Dashboard />;
      
    default:
      // Default route - show signup/login options
      document.title = 'Turnship | Professional Networking Automation';
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Welcome to Turnship
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Automate your professional networking
            </p>
          </div>

          <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="space-y-4">
                <button
                  onClick={() => navigateTo('/signup')}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Account
                </button>
                
                <button
                  onClick={() => navigateTo('/login')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">Or</span>
                  </div>
                </div>
                
                <button
                  onClick={() => navigateTo('/dashboard')}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-blue-600 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue as Dev User (Testing)
                </button>
              </div>
            </div>
          </div>
        </div>
      );
  }
};

export default Router;