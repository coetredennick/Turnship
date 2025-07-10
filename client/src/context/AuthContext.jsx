import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { authAPI, handleAPIError } from '../services/api';

// Default unauthenticated state used for tests and production
const defaultState = {
  user: null,
  authenticated: false,
  loading: true,
  error: null
};

// In development we mock an authenticated user to simplify manual testing.
const devState = {
  user: {
    id: 1,
    email: 'coetredfsu@gmail.com',
    name: 'Dev User'
  },
  authenticated: true,
  loading: false,
  error: null
};

const initialState = process.env.NODE_ENV === 'development' ? devState : defaultState;

// Auth action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT'
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        authenticated: !!action.payload,
        loading: false,
        error: null
      };

    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false
      };

    default:
      return state;
  }
};

// Create auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Validate current auth status with the API unless in development mode
  const checkAuth = async () => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

    // In development we simply use the mock user to avoid network calls
    if (process.env.NODE_ENV === 'development') {
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: devState.user });
      return;
    }

    try {
      const response = await authAPI.checkAuth();
      dispatch({ type: AUTH_ACTIONS.SET_USER, payload: response.data.user });
    } catch (error) {
      if (error?.response?.status === 401) {
        // Not authenticated is not considered an error
        dispatch({ type: AUTH_ACTIONS.SET_USER, payload: null });
      } else {
        const errorMessage = handleAPIError(
          error,
          'Failed to check authentication status'
        );
        dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
      }
    }
  };

  // Login function (redirects to OAuth)
  const login = () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
      authAPI.initiateLogin();
    } catch (error) {
      const errorMessage = handleAPIError(error, 'Failed to start login process');
      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

      await authAPI.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Logout error:', error);
      }
      // Even if logout fails on server, clear local state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Clear error function
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Test Gmail connection
  const testGmailConnection = async () => {
    try {
      // Don't set global loading state for Gmail test to avoid Router redirects
      const response = await authAPI.testGmail();

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Gmail test error:', error);
      }
      const errorMessage = handleAPIError(error, 'Failed to test Gmail connection');
      // Don't set global error state for Gmail test - let Dashboard handle it

      return {
        success: false,
        error: errorMessage
      };
    }
  };

  // Check auth on mount and when window gains focus
  useEffect(() => {
    checkAuth();

    // Listen for successful OAuth redirects
    const handleOAuthSuccess = () => {
      if (window.location.pathname === '/dashboard') {
        checkAuth();
      }
    };

    // Check auth when window gains focus (user might have logged in elsewhere)
    const handleFocus = () => {
      if (!state.authenticated && !state.loading) {
        checkAuth();
      }
    };

    // Handle OAuth success
    handleOAuthSuccess();

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Handle URL query parameters for OAuth errors
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
      let errorMessage = 'Authentication failed';

      switch (error) {
        case 'oauth_denied':
          errorMessage = 'Login was cancelled. Please try again to access your networking dashboard.';
          break;
        case 'oauth_failed':
          errorMessage = 'Login failed. Please try again.';
          break;
        case 'oauth_error':
          errorMessage = 'An error occurred during login. Please try again.';
          break;
        case 'session_error':
          errorMessage = 'Session error. Please try logging in again.';
          break;
        case 'callback_error':
          errorMessage = 'Login processing error. Please try again.';
          break;
        default:
          errorMessage = 'An unexpected error occurred during login.';
      }

      dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });

      // Clear error from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const value = {
    // State
    user: state.user,
    authenticated: state.authenticated,
    loading: state.loading,
    error: state.error,

    // Functions
    login,
    logout,
    checkAuth,
    clearError,
    testGmailConnection
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

export default AuthContext;