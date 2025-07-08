import React from 'react';
import { render } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';

// Mock API module
export const mockAuthAPI = {
  checkAuth: jest.fn(),
  logout: jest.fn(),
  testGmail: jest.fn(),
  initiateLogin: jest.fn()
};

// Mock auth context values
export const createMockAuthContext = (overrides = {}) => ({
  user: null,
  authenticated: false,
  loading: false,
  error: null,
  login: jest.fn(),
  logout: jest.fn(),
  checkAuth: jest.fn(),
  clearError: jest.fn(),
  testGmailConnection: jest.fn(),
  ...overrides
});

// Test user data
export const mockUser = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  picture: 'https://example.com/avatar.jpg'
};

// Mock Gmail test responses
export const mockGmailSuccess = {
  success: true,
  data: {
    profile: {
      emailAddress: 'test@example.com',
      messagesTotal: 1234,
      threadsTotal: 567,
      historyId: '12345'
    }
  }
};

export const mockGmailError = {
  success: false,
  error: 'Gmail API connection failed'
};

// Custom render function with AuthProvider
export const renderWithAuth = (ui, { authValue = {}, ...renderOptions } = {}) => {
  const mockAuthValue = createMockAuthContext(authValue);
  
  // Mock the AuthProvider to return our test values
  const MockAuthProvider = ({ children }) => {
    // Create a mock context that provides our test values
    React.createContext = jest.fn().mockReturnValue({
      Provider: ({ children }) => children,
      Consumer: ({ children }) => children(mockAuthValue)
    });
    
    return children;
  };

  const Wrapper = ({ children }) => (
    <MockAuthProvider>
      {children}
    </MockAuthProvider>
  );

  return {
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    mockAuthValue
  };
};

// Wait for async operations
export const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock axios for API testing
export const mockAxios = {
  create: jest.fn(() => mockAxios),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request: {
      use: jest.fn()
    },
    response: {
      use: jest.fn()
    }
  }
};

// Create mock API responses
export const createMockApiResponse = (data, status = 200) => ({
  data,
  status,
  statusText: 'OK',
  headers: {},
  config: {}
});

export const createMockApiError = (message, status = 500, code = 'API_ERROR') => {
  const error = new Error(message);
  error.response = {
    data: { error: message, code, status },
    status,
    statusText: 'Error'
  };
  return error;
};

// Mock localStorage
export const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// Mock document methods
export const mockDocument = {
  title: 'Test',
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

// Helper to simulate user interactions
export const simulateAuthFlow = {
  login: () => mockAuthAPI.initiateLogin(),
  logout: () => mockAuthAPI.logout(),
  checkAuth: () => mockAuthAPI.checkAuth(),
  testGmail: () => mockAuthAPI.testGmail()
};

// Mock Google OAuth responses
export const mockOAuthProfile = {
  id: 'google-123',
  displayName: 'Test User',
  emails: [{ value: 'test@example.com' }],
  photos: [{ value: 'https://example.com/photo.jpg' }]
};

// Test data generators
export const generateTestUser = (overrides = {}) => ({
  ...mockUser,
  ...overrides
});

export const generateTestError = (message = 'Test error') => ({
  error: message,
  code: 'TEST_ERROR',
  status: 500
});

// Common test scenarios
export const authScenarios = {
  unauthenticated: {
    user: null,
    authenticated: false,
    loading: false,
    error: null
  },
  authenticated: {
    user: mockUser,
    authenticated: true,
    loading: false,
    error: null
  },
  loading: {
    user: null,
    authenticated: false,
    loading: true,
    error: null
  },
  error: {
    user: null,
    authenticated: false,
    loading: false,
    error: 'Authentication failed'
  }
};

export default {
  mockAuthAPI,
  createMockAuthContext,
  renderWithAuth,
  waitFor,
  mockAxios,
  authScenarios,
  mockUser,
  mockGmailSuccess,
  mockGmailError
};