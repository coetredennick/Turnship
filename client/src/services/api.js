import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:3001',
  withCredentials: true,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor for debugging (development only)
api.interceptors.request.use(
  (config) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    return config;
  },
  (error) => {
    if (process.env.NODE_ENV === 'development') {
      console.error('API Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Response: ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Handle different error scenarios
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - redirect to login or clear auth
          if (process.env.NODE_ENV === 'development') {
            console.warn('Unauthorized request - user may need to login');
          }
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
          break;
        case 403:
          // Forbidden
          error.userMessage = 'Access denied. You do not have permission to perform this action.';
          break;
        case 404:
          // Not found
          error.userMessage = 'The requested resource was not found.';
          break;
        case 429:
          // Rate limited
          error.userMessage = 'Too many requests. Please try again later.';
          break;
        case 500:
          // Internal server error
          error.userMessage = data?.error || 'Server error. Please try again later.';
          break;
        default:
          error.userMessage = data?.error || 'An unexpected error occurred.';
      }
    } else if (error.request) {
      // Network error
      error.userMessage = 'Network error. Please check your connection and try again.';
    } else {
      // Other error
      error.userMessage = 'An unexpected error occurred.';
    }
    
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  // Check current user authentication status
  checkAuth: () => api.get('/auth/me'),
  
  // Logout user
  logout: () => api.post('/auth/logout'),
  
  // Test Gmail connection
  testGmail: () => api.get('/auth/gmail/test'),
  
  // Initiate OAuth flow (redirect)
  initiateLogin: () => {
    window.location.href = 'http://localhost:3001/auth/google';
  }
};

// General API functions for future use
export const generalAPI = {
  // Health check
  healthCheck: () => api.get('/health'),
  
  // API info
  getApiInfo: () => api.get('/api')
};

// Utility function to handle API errors consistently
export const handleAPIError = (error, defaultMessage = 'An error occurred') => {
  console.error('Handling API Error:', error);
  
  if (error.userMessage) {
    return error.userMessage;
  }
  
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  return defaultMessage;
};

export default api;