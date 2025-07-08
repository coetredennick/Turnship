import React from 'react';
import { useAuth } from '../context/AuthContext';
import { InlineLoading } from './Loading';

const Login = () => {
  const { login, loading, error, clearError } = useAuth();

  const benefits = [
    {
      icon: "✨",
      title: "Generate personalized networking emails",
      description: "AI-powered email templates tailored to your connections"
    },
    {
      icon: "📊",
      title: "Track all your connections in one place",
      description: "Never lose track of who you've met and when"
    },
    {
      icon: "⏰",
      title: "Never miss a follow-up again",
      description: "Smart reminders for timely networking follow-ups"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-white">T</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Turnship
          </h1>
          <p className="text-lg text-blue-600 font-medium mb-2">
            Networking automation for college students
          </p>
          <p className="text-gray-600">
            Stop losing track of your networking outreach
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-red-400">⚠️</span>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-red-700 text-sm">{error}</p>
                <button 
                  onClick={clearError}
                  className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Benefits List */}
        <div className="mb-8 space-y-4">
          {benefits.map((benefit, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <span className="text-xl">{benefit.icon}</span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">
                  {benefit.title}
                </h3>
                <p className="text-xs text-gray-600">
                  {benefit.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Sign In Button */}
        <button
          onClick={login}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center"
        >
          {loading ? (
            <>
              <InlineLoading size={20} className="mr-3" />
              Connecting...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </>
          )}
        </button>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Secure authentication powered by Google
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Your networking data stays private and secure
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;