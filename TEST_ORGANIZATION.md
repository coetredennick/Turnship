# Testing Organization & Structure

## Overview
This document outlines the testing strategy and organization for the Turnship networking automation platform.

## Test Suite Summary
- **Total Tests**: 44 tests across 4 test suites
- **Coverage**: 100% success rate
- **Test Types**: Unit, Integration, Component, API

## Directory Structure

### Backend (`server/tests/`)
```
tests/
├── setup.js                 # Global test configuration
├── auth.test.js             # Authentication routes integration tests (14 tests)
├── database.test.js         # Database operations tests (15 tests)  
├── middleware.test.js       # Middleware unit tests (18 tests)
├── server.test.js           # Server health tests (2 tests)
└── utils/
    └── testHelpers.js       # Backend test utilities
```

### Frontend (`client/src/tests/`)
```
src/
├── setupTests.js            # Jest/React Testing Library setup
├── context/
│   └── AuthContext.test.jsx # Auth context tests
├── pages/
│   └── Dashboard.test.jsx   # Dashboard component tests
├── services/
│   └── api.test.js          # API service tests
└── tests/
    └── utils/
        └── testHelpers.jsx  # Frontend test utilities
```

## Test Categories

### 1. Integration Tests (`auth.test.js`)
**Purpose**: End-to-end validation of authentication and Gmail integration
- OAuth configuration and error handling
- Authentication status management
- Gmail API integration with token refresh
- Error scenarios for production use

### 2. Unit Tests (`middleware.test.js`)
**Purpose**: Individual middleware function validation
- Authentication requirements (`requireAuth`, `optionalAuth`)
- Token refresh trigger logic (`refreshTokenIfNeeded`)
- Error handling and graceful degradation
- Concurrent user session support

### 3. Database Tests (`database.test.js`)
**Purpose**: Data layer validation
- User CRUD operations
- OAuth token storage and retrieval
- Database constraints and validation
- Connection error handling

### 4. Component Tests (`Dashboard.test.jsx`, `AuthContext.test.jsx`)
**Purpose**: Frontend component behavior
- User interface interactions
- State management
- Error display and handling
- Loading states

### 5. API Tests (`api.test.js`)
**Purpose**: HTTP client validation
- Request/response handling
- Error mapping and user messages
- Authentication flow integration

## Test Configuration

### Mock Strategy
- **Console Output**: Mocked globally for clean test output
- **External APIs**: Google APIs mocked for consistent testing
- **Database**: In-memory SQLite for isolation
- **Environment**: Dedicated test environment variables

### Coverage Requirements
- **Statements**: 80%
- **Functions**: 80% 
- **Lines**: 80%
- **Branches**: 80%

## Running Tests

### All Tests
```bash
npm test
```

### With Coverage
```bash
npm run test:coverage
```

### Specific Test Suite
```bash
# Backend only
npm test --workspace=server

# Frontend only  
npm test --workspace=client

# Specific file
npm test -- --testPathPattern=auth.test.js
```

## CI/CD Integration

### GitHub Actions
- **Trigger**: Every push and PR
- **Matrix**: Node 18.x, 20.x, 22.x
- **Coverage**: Uploaded to GitHub Pages
- **Security**: npm audit checks

### Quality Gates
- All tests must pass
- Coverage thresholds must be met
- No high-severity vulnerabilities
- Linting must pass

## Debugging Tests

### Common Commands
```bash
# Run single test with verbose output
npm test -- --testNamePattern="specific test name" --verbose

# Debug test with console output
NODE_ENV=test npm test -- --testPathPattern=middleware.test.js

# Coverage report with details
npm run test:coverage && open coverage/lcov-report/index.html
```

### Test Utilities
- **Server**: `testHelpers.js` for database mocking and auth setup
- **Client**: `testHelpers.jsx` for component rendering and state mocking

## Production Considerations

### For Amy's Use Case
- **Token Refresh**: Validated for 2-3 hour networking sessions
- **Error Recovery**: User-friendly messages for common failures
- **Concurrency**: Multiple student sessions supported
- **Gmail Integration**: Proper handling of API rate limits

### Monitoring Points
- Authentication success rate (>95%)
- Gmail API success rate (>90%) 
- Error recovery and user experience
- Performance (response times <2s)

## Maintenance

### Adding New Tests
1. Follow existing patterns in respective directories
2. Use appropriate test helpers for setup
3. Include both success and error scenarios
4. Update this document if structure changes

### Updating Test Strategy
1. Maintain 100% test success rate
2. Keep integration tests comprehensive
3. Mock external dependencies appropriately
4. Document any new testing patterns

## Notes

### Jest Mocking Limitations
Some complex module mocking scenarios (like googleapis OAuth2 client) are handled through integration tests rather than deep unit test mocking to avoid Jest module system conflicts.

### Console Output in Production
All debug console statements are wrapped with `process.env.NODE_ENV === 'development'` checks to keep production logs clean while maintaining debugging capability during development. 