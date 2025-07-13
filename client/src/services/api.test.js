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
const { authAPI, connectionsAPI, timelineAPI, generalAPI, handleAPIError } = require('./api.js');

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

  describe('Timeline API', () => {
    describe('getTimeline', () => {
      it('should make GET request to timeline endpoint', async () => {
        const mockResponse = { 
          data: { 
            message: 'Timeline retrieved successfully',
            timeline: { 
              connectionId: 1, 
              stages: [{ id: 1, stage_type: 'first_impression', stage_status: 'waiting' }],
              settings: { follow_up_wait_days: 7 }
            } 
          } 
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await timelineAPI.getTimeline(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/connections/1/timeline');
        expect(result).toEqual(mockResponse);
      });

      it('should handle 404 for non-existent connection', async () => {
        const error = new Error('Connection not found');
        error.response = { status: 404, data: { error: 'Connection not found' } };
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(timelineAPI.getTimeline(999)).rejects.toThrow('Connection not found');
      });
    });

    describe('createStage', () => {
      it('should make POST request to create stage with data', async () => {
        const stageData = { stage_type: 'response', current_stage_id: 1 };
        const mockResponse = { 
          data: { 
            message: 'Timeline stage created successfully',
            stage: { id: 2, stage_type: 'response', stage_order: 2 } 
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.createStage(1, stageData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/stage', stageData);
        expect(result).toEqual(mockResponse);
      });

      it('should handle initialization when no stage_type provided', async () => {
        const mockResponse = { 
          data: { 
            message: 'Timeline stage created successfully',
            stage: { timeline: { currentStage: { type: 'first_impression' } } }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.createStage(1, {});

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/stage', {});
        expect(result).toEqual(mockResponse);
      });

      it('should handle validation errors', async () => {
        const error = new Error('Validation failed');
        error.response = { 
          status: 400, 
          data: { 
            error: 'Validation failed',
            details: ['Stage type must be one of: first_impression, response, follow_up']
          } 
        };
        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(timelineAPI.createStage(1, { stage_type: 'invalid' })).rejects.toThrow('Validation failed');
      });
    });

    describe('updateStage', () => {
      it('should make PUT request to update stage', async () => {
        const updateData = { stage_status: 'sent', email_content: 'Test email content' };
        const mockResponse = { 
          data: { 
            message: 'Timeline stage updated successfully',
            result: { newStatus: 'sent', nextStageCreated: null }
          } 
        };
        mockAxiosInstance.put.mockResolvedValue(mockResponse);

        const result = await timelineAPI.updateStage(1, 2, updateData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/connections/1/timeline/stage/2', updateData);
        expect(result).toEqual(mockResponse);
      });

      it('should handle auto-creation of response stage', async () => {
        const updateData = { stage_status: 'sent', email_content: 'First impression email' };
        const mockResponse = { 
          data: { 
            result: { 
              newStatus: 'sent', 
              nextStageCreated: { stageType: 'response', stageOrder: 2 }
            }
          } 
        };
        mockAxiosInstance.put.mockResolvedValue(mockResponse);

        const result = await timelineAPI.updateStage(1, 1, updateData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/connections/1/timeline/stage/1', updateData);
        expect(result.data.result.nextStageCreated.stageType).toBe('response');
      });

      it('should handle 404 for non-existent stage', async () => {
        const error = new Error('Stage not found');
        error.response = { status: 404, data: { error: 'Stage not found' } };
        mockAxiosInstance.put.mockRejectedValue(error);

        await expect(timelineAPI.updateStage(1, 999, {})).rejects.toThrow('Stage not found');
      });
    });

    describe('deleteStage', () => {
      it('should make DELETE request and return 501 not implemented', async () => {
        const mockResponse = { 
          data: { 
            error: 'Not implemented',
            message: 'Stage deletion is not yet supported'
          } 
        };
        // Mock 501 status but resolve (since it's expected behavior)
        mockAxiosInstance.delete.mockResolvedValue(mockResponse);

        const result = await timelineAPI.deleteStage(1, 2);

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/connections/1/timeline/stage/2');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('advanceTimeline', () => {
      it('should make POST request to advance timeline with initialize action', async () => {
        const mockResponse = { 
          data: { 
            message: "Timeline advance action 'initialize' completed successfully",
            result: { timeline: { currentStage: { type: 'first_impression' } } }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.advanceTimeline(1, 'initialize');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/advance', {
          action: 'initialize',
          stage_id: undefined,
          content: undefined
        });
        expect(result).toEqual(mockResponse);
      });

      it('should make POST request with send_email action', async () => {
        const content = { email_content: 'Test email content' };
        const mockResponse = { 
          data: { 
            message: "Timeline advance action 'send_email' completed successfully",
            result: { newStatus: 'sent' }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.advanceTimeline(1, 'send_email', 2, content);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/advance', {
          action: 'send_email',
          stage_id: 2,
          content
        });
        expect(result).toEqual(mockResponse);
      });

      it('should handle create_draft action', async () => {
        const content = { draft_content: 'Draft email content' };
        const mockResponse = { 
          data: { 
            result: { newStatus: 'draft' }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.advanceTimeline(1, 'create_draft', 2, content);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/advance', {
          action: 'create_draft',
          stage_id: 2,
          content
        });
        expect(result.data.result.newStatus).toBe('draft');
      });

      it('should handle mark_response action', async () => {
        const mockResponse = { 
          data: { 
            result: { newStatus: 'received' }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.advanceTimeline(1, 'mark_response', 2);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/advance', {
          action: 'mark_response',
          stage_id: 2,
          content: undefined
        });
        expect(result.data.result.newStatus).toBe('received');
      });

      it('should handle check_deadlines action', async () => {
        const mockResponse = { 
          data: { 
            result: { success: true, expiredStagesFound: 0 }
          } 
        };
        mockAxiosInstance.post.mockResolvedValue(mockResponse);

        const result = await timelineAPI.advanceTimeline(1, 'check_deadlines');

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/connections/1/timeline/advance', {
          action: 'check_deadlines',
          stage_id: undefined,
          content: undefined
        });
        expect(result.data.result.success).toBe(true);
      });

      it('should handle invalid action validation', async () => {
        const error = new Error('Invalid action');
        error.response = { 
          status: 400, 
          data: { error: 'Invalid action' } 
        };
        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(timelineAPI.advanceTimeline(1, 'invalid_action')).rejects.toThrow('Invalid action');
      });
    });

    describe('getTimelineSettings', () => {
      it('should make GET request to timeline settings endpoint', async () => {
        const mockResponse = { 
          data: { 
            message: 'Timeline settings retrieved successfully',
            settings: { follow_up_wait_days: 7 }
          } 
        };
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await timelineAPI.getTimelineSettings(1);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/connections/1/timeline/settings');
        expect(result).toEqual(mockResponse);
      });
    });

    describe('updateTimelineSettings', () => {
      it('should make PUT request to update timeline settings', async () => {
        const settingsData = { follow_up_wait_days: 14 };
        const mockResponse = { 
          data: { 
            message: 'Timeline settings updated successfully',
            settings: { follow_up_wait_days: 14 }
          } 
        };
        mockAxiosInstance.put.mockResolvedValue(mockResponse);

        const result = await timelineAPI.updateTimelineSettings(1, settingsData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/api/connections/1/timeline/settings', settingsData);
        expect(result).toEqual(mockResponse);
      });

      it('should handle validation errors for invalid range', async () => {
        const error = new Error('Validation failed');
        error.response = { 
          status: 400, 
          data: { 
            error: 'Validation failed',
            details: ['Follow-up wait days must be an integer between 1 and 30']
          } 
        };
        mockAxiosInstance.put.mockRejectedValue(error);

        await expect(timelineAPI.updateTimelineSettings(1, { follow_up_wait_days: 50 })).rejects.toThrow('Validation failed');
      });
    });

    describe('Error Handling and Edge Cases', () => {
      it('should handle network errors consistently', async () => {
        const networkError = new Error('Network Error');
        networkError.request = {}; // Indicates network error
        mockAxiosInstance.get.mockRejectedValue(networkError);

        await expect(timelineAPI.getTimeline(1)).rejects.toThrow('Network Error');
      });

      it('should handle 403 forbidden responses', async () => {
        const error = new Error('Access denied');
        error.response = { status: 403, data: { error: 'Access denied' } };
        mockAxiosInstance.get.mockRejectedValue(error);

        await expect(timelineAPI.getTimelineSettings(1)).rejects.toThrow('Access denied');
      });

      it('should handle server errors', async () => {
        const error = new Error('Internal server error');
        error.response = { status: 500, data: { error: 'Internal server error' } };
        mockAxiosInstance.post.mockRejectedValue(error);

        await expect(timelineAPI.createStage(1, {})).rejects.toThrow('Internal server error');
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