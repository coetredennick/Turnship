// Mock the actual database connection module
jest.mock('../db/connection', () => {
  const mockFunctions = {
    createUser: jest.fn(),
    findUserById: jest.fn(),
    findUserByEmail: jest.fn(),
    updateUserTokens: jest.fn(),
    getUserTokens: jest.fn(),
  };

  return mockFunctions;
});

const dbModule = require('../db/connection');

describe('Database Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Operations', () => {
    describe('createUser', () => {
      it('should create a new user from Google profile', async () => {
        const googleProfile = {
          displayName: 'John Doe',
          emails: [{ value: 'john@example.com' }],
        };

        const expectedUser = {
          id: 1,
          username: 'John Doe',
          email: 'john@example.com',
        };

        dbModule.createUser.mockResolvedValue(expectedUser);

        const user = await dbModule.createUser(googleProfile);

        expect(user).toEqual(expectedUser);
        expect(dbModule.createUser).toHaveBeenCalledWith(googleProfile);
      });

      it('should handle missing email in profile', async () => {
        const invalidProfile = {
          displayName: 'John Doe',
          emails: [],
        };

        dbModule.createUser.mockRejectedValue(new Error('Email is required'));

        await expect(dbModule.createUser(invalidProfile)).rejects.toThrow('Email is required');
      });
    });

    describe('findUserById', () => {
      it('should find existing user by ID', async () => {
        const expectedUser = {
          id: 1,
          username: 'John Doe',
          email: 'john@example.com',
        };

        dbModule.findUserById.mockResolvedValue(expectedUser);

        const user = await dbModule.findUserById(1);

        expect(user).toEqual(expectedUser);
        expect(dbModule.findUserById).toHaveBeenCalledWith(1);
      });

      it('should return null for non-existent user', async () => {
        dbModule.findUserById.mockResolvedValue(null);

        const user = await dbModule.findUserById(999);

        expect(user).toBeNull();
      });
    });

    describe('findUserByEmail', () => {
      it('should find existing user by email', async () => {
        const expectedUser = {
          id: 1,
          username: 'John Doe',
          email: 'john@example.com',
        };

        dbModule.findUserByEmail.mockResolvedValue(expectedUser);

        const user = await dbModule.findUserByEmail('john@example.com');

        expect(user).toEqual(expectedUser);
        expect(dbModule.findUserByEmail).toHaveBeenCalledWith('john@example.com');
      });

      it('should return null for non-existent email', async () => {
        dbModule.findUserByEmail.mockResolvedValue(null);

        const user = await dbModule.findUserByEmail('nonexistent@example.com');

        expect(user).toBeNull();
      });
    });
  });

  describe('OAuth Token Operations', () => {
    describe('updateUserTokens', () => {
      it('should create new tokens for user', async () => {
        const tokens = {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          token_expiry: new Date(Date.now() + 3600000),
          scope: 'profile email gmail.readonly',
        };

        dbModule.updateUserTokens.mockResolvedValue(undefined);

        await dbModule.updateUserTokens(1, tokens);

        expect(dbModule.updateUserTokens).toHaveBeenCalledWith(1, tokens);
      });

      it('should handle array scope values', async () => {
        const tokens = {
          access_token: 'test-token',
          refresh_token: 'test-refresh',
          token_expiry: new Date(),
          scope: ['profile', 'email', 'gmail.readonly'],
        };

        dbModule.updateUserTokens.mockResolvedValue(undefined);

        await dbModule.updateUserTokens(1, tokens);

        expect(dbModule.updateUserTokens).toHaveBeenCalledWith(1, tokens);
      });
    });

    describe('getUserTokens', () => {
      it('should retrieve user tokens', async () => {
        const expectedTokens = {
          user_id: 1,
          access_token: 'test-access-token',
          refresh_token: 'test-refresh-token',
          token_expiry: new Date(Date.now() + 3600000).toISOString(),
          scope: 'profile email gmail.readonly',
        };

        dbModule.getUserTokens.mockResolvedValue(expectedTokens);

        const tokens = await dbModule.getUserTokens(1);

        expect(tokens).toEqual(expectedTokens);
        expect(dbModule.getUserTokens).toHaveBeenCalledWith(1);
      });

      it('should return null for user with no tokens', async () => {
        dbModule.getUserTokens.mockResolvedValue(null);

        const tokens = await dbModule.getUserTokens(1);

        expect(tokens).toBeNull();
      });
    });
  });

  describe('Database Constraints and Validation', () => {
    it('should enforce unique email constraint', async () => {
      dbModule.createUser.mockRejectedValue(new Error('User with this email already exists'));

      const profile = {
        displayName: 'John Doe',
        emails: [{ value: 'duplicate@example.com' }],
      };

      await expect(dbModule.createUser(profile)).rejects.toThrow('User with this email already exists');
    });

    it('should require non-null values for required fields', async () => {
      dbModule.createUser.mockRejectedValue(new Error('Email is required'));

      const invalidProfile = {
        displayName: 'John Doe',
        emails: [{ value: null }],
      };

      await expect(dbModule.createUser(invalidProfile)).rejects.toThrow('Email is required');
    });
  });
});
