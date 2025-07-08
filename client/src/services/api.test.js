// Mock axios completely before any imports
const mockAxiosInstance = {
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

const mockAxios = {
  create: jest.fn(() => mockAxiosInstance),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

jest.doMock('axios', () => mockAxios);

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

// Now import the module after mocking
const { authAPI, generalAPI, handleAPIError } = require('./api.js');

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock implementations
    mockAxiosInstance.get.mockReset();
    mockAxiosInstance.post.mockReset();
    mockAxiosInstance.put.mockReset();
    mockAxiosInstance.delete.mockReset();
    mockAxiosInstance.interceptors.request.use.mockReset();
    mockAxiosInstance.interceptors.response.use.mockReset();
  });

  describe('Auth API', () => {
    describe('checkAuth', () => {
      it('should make GET request to /auth/me', async () => {
        const mockResponse = { data: { user: { id: 1, name: 'Test User' } } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await authAPI.checkAuth();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/me');
        expect(result).toEqual(mockResponse);
      });

      it('should handle 401 responses', async () => {
        const error = new Error('Unauthorized');
        error.response = { status: 401 };
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(authAPI.checkAuth()).rejects.toThrow('Unauthorized');
      });
    });

    describe('logout', () => {
      it('should make POST request to /auth/logout', async () => {
        const mockResponse = { data: { message: 'Logged out successfully' } };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await authAPI.logout();

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/auth/logout');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('testGmail', () => {
      it('should make GET request to /auth/gmail/test', async () => {
        const mockResponse = { data: { status: 'connected', email: 'test@gmail.com' } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await authAPI.testGmail();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/auth/gmail/test');
        expect(result).toEqual(mockResponse);
      });

      it('should handle Gmail API errors', async () => {
        const error = new Error('Gmail API Error');
        error.response = { status: 403, data: { error: 'Gmail access denied' } };
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(authAPI.testGmail()).rejects.toThrow('Gmail API Error');
      });
    });

    describe('initiateLogin', () => {
      it('should redirect to OAuth endpoint', () => {
        authAPI.initiateLogin();

        expect(window.location.href).toBe('http://localhost:3001/auth/google');
      });
    });
  });

  describe('General API', () => {
    describe('healthCheck', () => {
      it('should make GET request to /health', async () => {
        const mockResponse = { data: { status: 'healthy', timestamp: '2023-07-08T01:00:00Z' } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await generalAPI.healthCheck();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/health');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('getApiInfo', () => {
      it('should make GET request to /api', async () => {
        const mockResponse = { data: { version: '1.0.0', environment: 'test' } };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await generalAPI.getApiInfo();

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api');
        expect(result).toEqual(mockResponse);
      });
    });
  });

  describe('Error Handling', () => {
    describe('handleAPIError', () => {
      it('should return user message when available', () => {
        const error = {
          userMessage: 'Custom user message'
        };

        const result = handleAPIError(error);
        expect(result).toBe('Custom user message');
      });

      it('should return response error when available', () => {
        const error = {
          response: {
            data: {
              error: 'Server error message'
            }
          }
        };

        const result = handleAPIError(error);
        expect(result).toBe('Server error message');
      });

      it('should return default message when no specific error', () => {
        const error = {};

        const result = handleAPIError(error);
        expect(result).toBe('An error occurred');
      });

      it('should handle null/undefined errors', () => {
        expect(handleAPIError(null)).toBe('An error occurred');
        expect(handleAPIError(undefined)).toBe('An error occurred');
      });
    });
  });
});