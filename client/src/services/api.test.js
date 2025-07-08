// Mock axios before importing anything
jest.mock('axios');

import axios from 'axios';
const mockedAxios = axios;

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    pathname: '/',
    assign: jest.fn(),
    replace: jest.fn()
  },
  writable: true
});

describe('API Service', () => {
  let mockAxiosInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock axios instance with all required methods
    mockAxiosInstance = {
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

    // Make axios.create return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    // Reset window location
    window.location.pathname = '/';
    window.location.href = 'http://localhost:3000';
  });

  describe('API Instance Configuration', () => {
    it('should create axios instance with correct configuration', () => {
      // Reset modules to ensure fresh import
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      
      // Import to trigger instance creation
      require('./api');

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'http://localhost:3001',
        withCredentials: true,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
    });

    it('should set up request and response interceptors', () => {
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
      
      require('./api');

      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Auth API', () => {
    beforeEach(() => {
      // Reset the module to get fresh instance
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
    });

    describe('checkAuth', () => {
      it('should make GET request to /auth/me', async () => {
        const mockResponse = {
          data: { 
            user: { id: 1, email: 'test@example.com' }, 
            authenticated: true 
          }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const { authAPI } = require('./api');
        const result = await authAPI.checkAuth();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
        expect(result).toEqual(mockResponse);
      });

      it('should handle 401 responses', async () => {
        const error = new Error('Unauthorized');
        error.response = { status: 401 };
        mockAxiosInstance.get.mockRejectedValue(error);

        const { authAPI } = require('./api');
        
        await expect(authAPI.checkAuth()).rejects.toThrow('Unauthorized');
      });
    });

    describe('logout', () => {
      it('should make POST request to /auth/logout', async () => {
        const mockResponse = { 
          data: { message: 'Logged out successfully' } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const { authAPI } = require('./api');
        const result = await authAPI.logout();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('testGmail', () => {
      it('should make GET request to /auth/gmail/test', async () => {
        const mockResponse = {
          data: {
            message: 'Gmail API connection successful',
            profile: { emailAddress: 'test@example.com' }
          }
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const { authAPI } = require('./api');
        const result = await authAPI.testGmail();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/gmail/test');
        expect(result).toEqual(mockResponse);
      });

      it('should handle Gmail API errors', async () => {
        const error = new Error('Gmail API Error');
        error.response = { 
          status: 500, 
          data: { error: 'Gmail API connection failed' } 
        };
        mockAxiosInstance.get.mockRejectedValue(error);

        const { authAPI } = require('./api');
        
        await expect(authAPI.testGmail()).rejects.toThrow('Gmail API Error');
      });
    });

    describe('initiateLogin', () => {
      it('should redirect to OAuth endpoint', () => {
        const { authAPI } = require('./api');
        
        authAPI.initiateLogin();

        expect(window.location.href).toBe('http://localhost:3001/auth/google');
      });
    });
  });

  describe('General API', () => {
    beforeEach(() => {
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
    });

    describe('healthCheck', () => {
      it('should make GET request to /health', async () => {
        const mockResponse = { 
          data: { status: 'OK', timestamp: '2023-01-01T00:00:00.000Z' } 
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const { generalAPI } = require('./api');
        const result = await generalAPI.healthCheck();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getApiInfo', () => {
      it('should make GET request to /api', async () => {
        const mockResponse = { 
          data: { message: 'Turnship API v1' } 
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const { generalAPI } = require('./api');
        const result = await generalAPI.getApiInfo();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
    });

    describe('handleAPIError', () => {
      it('should return user message when available', () => {
        const error = { userMessage: 'Custom user message' };
        
        const { handleAPIError } = require('./api');
        const result = handleAPIError(error);

        expect(result).toBe('Custom user message');
      });

      it('should return response error when available', () => {
        const error = {
          response: {
            data: { error: 'Server error message' }
          }
        };
        
        const { handleAPIError } = require('./api');
        const result = handleAPIError(error);

        expect(result).toBe('Server error message');
      });

      it('should return default message when no specific error', () => {
        const error = new Error('Generic error');
        
        const { handleAPIError } = require('./api');
        const result = handleAPIError(error, 'Default message');

        expect(result).toBe('Default message');
      });

      it('should handle null/undefined errors', () => {
        const { handleAPIError } = require('./api');
        const result = handleAPIError(null, 'Fallback message');

        expect(result).toBe('Fallback message');
      });
    });

    describe('Response Interceptor Error Handling', () => {
      it('should handle 401 unauthorized errors', () => {
        // Import to set up interceptors
        require('./api');
        
        // Get the response interceptor error handler
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 401, data: {} }
        };

        const result = errorHandler(error);

        expect(result).rejects.toBe(error);
        expect(error.userMessage).toBeDefined();
      });

      it('should handle 403 forbidden errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 403, data: {} }
        };

        errorHandler(error);

        expect(error.userMessage).toBe('Access denied. You do not have permission to perform this action.');
      });

      it('should handle 404 not found errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 404, data: {} }
        };

        errorHandler(error);

        expect(error.userMessage).toBe('The requested resource was not found.');
      });

      it('should handle 429 rate limit errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 429, data: {} }
        };

        errorHandler(error);

        expect(error.userMessage).toBe('Too many requests. Please try again later.');
      });

      it('should handle 500 server errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { 
            status: 500, 
            data: { error: 'Internal server error' }
          }
        };

        errorHandler(error);

        expect(error.userMessage).toBe('Internal server error');
      });

      it('should handle network errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          request: {},
          message: 'Network Error'
        };

        errorHandler(error);

        expect(error.userMessage).toBe('Network error. Please check your connection and try again.');
      });

      it('should handle generic errors', () => {
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          message: 'Something went wrong'
        };

        errorHandler(error);

        expect(error.userMessage).toBe('An unexpected error occurred.');
      });

      it('should redirect on 401 when not on home page', () => {
        window.location.pathname = '/dashboard';
        
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 401, data: {} }
        };

        errorHandler(error);

        expect(window.location.href).toBe('/');
      });

      it('should not redirect on 401 when already on home page', () => {
        window.location.pathname = '/';
        const originalHref = window.location.href;
        
        require('./api');
        
        const interceptorCall = mockAxiosInstance.interceptors.response.use.mock.calls[0];
        const errorHandler = interceptorCall[1];

        const error = {
          response: { status: 401, data: {} }
        };

        errorHandler(error);

        expect(window.location.href).toBe(originalHref);
      });
    });


  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      jest.resetModules();
      mockedAxios.create.mockReturnValue(mockAxiosInstance);
    });

    it('should handle complete auth flow', async () => {
      // Mock successful responses
      const authResponse = {
        data: { 
          user: { id: 1, email: 'test@example.com' }, 
          authenticated: true 
        }
      };
      const gmailResponse = {
        data: {
          message: 'Gmail API connection successful',
          profile: { emailAddress: 'test@example.com' }
        }
      };
      const logoutResponse = {
        data: { message: 'Logged out successfully' }
      };

      mockAxiosInstance.get
        .mockResolvedValueOnce(authResponse) // checkAuth
        .mockResolvedValueOnce(gmailResponse); // testGmail
      mockAxiosInstance.post.mockResolvedValue(logoutResponse); // logout

      const { authAPI } = require('./api');

      // Test auth flow
      const authResult = await authAPI.checkAuth();
      expect(authResult).toEqual(authResponse);

      const gmailResult = await authAPI.testGmail();
      expect(gmailResult).toEqual(gmailResponse);

      const logoutResult = await authAPI.logout();
      expect(logoutResult).toEqual(logoutResponse);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1);
    });

    it('should handle error recovery scenarios', async () => {
      // First request fails, second succeeds
      const error = new Error('Network error');
      const successResponse = { data: { status: 'OK' } };

      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(successResponse);

      const { generalAPI } = require('./api');

      // First call should fail
      await expect(generalAPI.healthCheck()).rejects.toThrow('Network error');

      // Second call should succeed
      const result = await generalAPI.healthCheck();
      expect(result).toEqual(successResponse);
    });
  });
});