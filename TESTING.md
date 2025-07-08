# Turnship Testing Guide

## Overview

This document outlines the comprehensive testing strategy for Turnship, Amy's networking automation platform. Our testing approach ensures reliability for 50+ users with a focus on the core networking workflow: sign in, access dashboard, test Gmail, handle errors gracefully.

## Testing Architecture

### Backend Tests (`server/`)

#### Test Infrastructure
- **Framework**: Jest with Node.js environment
- **Location**: `server/tests/`
- **Configuration**: `server/jest.config.js`
- **Setup**: `server/tests/setup.js`

#### Test Coverage
1. **Auth Routes** (`auth.test.js`)
   - OAuth initiation and callback handling
   - User session management
   - Gmail API integration testing
   - Error scenarios (OAuth failures, API errors)

2. **Middleware** (`middleware.test.js`)
   - Authentication requirement checks
   - Token refresh functionality
   - Google Auth client creation
   - Session validation

3. **Database Operations** (`database.test.js`)
   - User CRUD operations
   - OAuth token storage and retrieval
   - Data integrity and constraints
   - Connection handling

### Frontend Tests (`client/`)

#### Test Infrastructure
- **Framework**: Jest + React Testing Library + JSDOM
- **Location**: `client/src/`
- **Configuration**: `client/jest.config.js`
- **Setup**: `client/src/setupTests.js`

#### Test Coverage
1. **AuthContext** (`AuthContext.test.jsx`)
   - Global authentication state management
   - Login/logout flows
   - Gmail testing integration
   - Error handling and recovery
   - URL parameter processing

2. **API Service** (`api.test.js`)
   - HTTP client configuration
   - Request/response interceptors
   - Error handling and user messages
   - OAuth flow integration

3. **Dashboard Component** (`Dashboard.test.jsx`)
   - Core networking workflow UI
   - Gmail connection testing
   - User interactions and state management
   - Responsive design and accessibility

## Key Testing Scenarios

### Amy's Daily Workflow
Our tests specifically cover Amy's primary use cases:

1. **Sign In Process**
   - OAuth redirect handling
   - Session establishment
   - Error recovery (cancelled/failed logins)

2. **Dashboard Access**
   - Protected route functionality
   - User info display
   - Navigation and layout

3. **Gmail Testing**
   - Connection validation
   - API integration
   - Success/failure feedback
   - Loading states

4. **Error Handling**
   - Network connectivity issues
   - API failures
   - Authentication errors
   - User-friendly error messages

## Running Tests

### Quick Commands
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run CI tests (non-interactive)
npm run test:ci
```

### Workspace-Specific Tests
```bash
# Server tests only
npm run test --workspace=server
npm run test:coverage --workspace=server

# Client tests only  
npm run test --workspace=client
npm run test:coverage --workspace=client
```

### Coverage Analysis
```bash
# Generate detailed coverage report
node scripts/test-coverage.js

# View coverage reports
# Server: server/coverage/lcov-report/index.html
# Client: client/coverage/lcov-report/index.html
```

## Coverage Goals

### Minimum Thresholds (80%)
- **Lines**: 80%
- **Statements**: 80%
- **Functions**: 80%
- **Branches**: 80%

### Critical Paths (90%+)
- Authentication flows
- Gmail API integration
- Error handling
- Core user workflows

## CI/CD Integration

### GitHub Actions
- **Trigger**: Push to main/develop, Pull Requests
- **Node Versions**: 18.x, 20.x
- **Checks**: 
  - Linting
  - Test execution
  - Coverage reporting
  - Security audit
  - Performance testing (Lighthouse)

### Coverage Reporting
- **Tool**: Codecov
- **Reports**: Separate tracking for server/client
- **Integration**: Automated PR comments

## Performance Testing

### Lighthouse CI
- **Metrics**: Performance, Accessibility, Best Practices, SEO
- **Thresholds**:
  - Performance: 80%
  - Accessibility: 90%
  - Best Practices: 90%
  - SEO: 80%

## Test Utilities

### Test Helpers (`client/src/tests/utils/testHelpers.jsx`)
- Mock auth contexts
- Reusable test data
- Common test scenarios
- Mock API responses

### Backend Helpers (`server/tests/utils/testHelpers.js`)
- Database test utilities
- Mock authentication
- Test server setup
- OAuth mock responses

## Best Practices

### Writing Tests
1. **Descriptive Names**: Clear test descriptions
2. **Arrange-Act-Assert**: Structured test organization
3. **Mock External Dependencies**: Isolate units under test
4. **Test Error Scenarios**: Handle failure cases
5. **Clean Up**: Reset state between tests

### Debugging Tests
1. **Console Logs**: Strategic logging in test failures
2. **Screen Debug**: React Testing Library debug output
3. **Coverage Reports**: Identify untested code paths
4. **CI Logs**: GitHub Actions detailed output

## Security Testing

### Automated Audits
- **npm audit**: Dependency vulnerability scanning
- **Frequency**: Every CI run
- **Threshold**: Moderate severity or higher

### Manual Testing
- **OAuth Flow**: Security best practices
- **Session Management**: Proper cleanup
- **Data Validation**: Input sanitization

## Reliability for 50 Users

### Load Considerations
- **Concurrent Users**: OAuth flow handling
- **Database**: Connection pooling
- **Gmail API**: Rate limiting compliance
- **Error Recovery**: Graceful degradation

### Monitoring Points
- **Authentication Success Rate**: >95%
- **Gmail API Success Rate**: >90%
- **Error Recovery**: User-friendly messages
- **Performance**: Response times <2s

## Getting Started

1. **Install Dependencies**
   ```bash
   npm run install:all
   ```

2. **Run Initial Test Suite**
   ```bash
   npm test
   ```

3. **Generate Coverage Report**
   ```bash
   npm run test:coverage
   ```

4. **View Results**
   - Open coverage HTML reports
   - Review test output
   - Check CI status

## Support

For testing questions or issues:
1. Check CI logs in GitHub Actions
2. Review coverage reports for gaps
3. Run individual test files for debugging
4. Use test:watch mode for development

---

*This testing strategy ensures Turnship provides a reliable networking automation platform for Amy and her growing user base.*