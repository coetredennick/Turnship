import React from 'react' // eslint-disable-line no-unused-vars
import { AuthProvider } from './context/AuthContext'
import Router from './components/Router'
import ErrorBoundary from './components/ErrorBoundary'
import './App.css'

// Main App component with AuthProvider and error boundary
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App