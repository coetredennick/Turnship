import { render, screen } from '@testing-library/react'
import App from './App'

// Mock the AuthContext since App uses it
jest.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
  useAuth: () => ({
    authenticated: false,
    loading: true,
    user: null,
    error: null,
    login: jest.fn(),
    logout: jest.fn(),
    testGmail: jest.fn()
  })
}));

test('renders app with authentication provider', () => {
  render(<App />)
  
  // The app should render the AuthProvider
  const authProvider = screen.getByTestId('auth-provider')
  expect(authProvider).toBeInTheDocument()
  
  // When loading is true, it should show loading state
  const loadingText = screen.getByText(/connecting to your networking hub/i)
  expect(loadingText).toBeInTheDocument()
})