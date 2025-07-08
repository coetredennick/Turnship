import React from 'react';

const Loading = ({ 
  message = "Connecting to your networking hub...", 
  size = "large",
  className = "" 
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      spinner: "w-6 h-6",
      text: "text-sm",
      container: "py-4"
    },
    medium: {
      spinner: "w-8 h-8",
      text: "text-base",
      container: "py-8"
    },
    large: {
      spinner: "w-12 h-12",
      text: "text-lg",
      container: "py-16"
    }
  };

  const config = sizeConfig[size] || sizeConfig.large;

  return (
    <div className={`flex flex-col items-center justify-center ${config.container} ${className}`}>
      {/* Animated spinner */}
      <div className="relative">
        <div 
          className={`${config.spinner} border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        />
        {/* Pulsing backdrop */}
        <div 
          className={`absolute inset-0 ${config.spinner} border-4 border-blue-100 rounded-full animate-pulse opacity-30`}
        />
      </div>
      
      {/* Loading message */}
      <p className={`mt-4 ${config.text} text-gray-600 font-medium text-center max-w-sm`}>
        {message}
      </p>
      
      {/* Animated dots */}
      <div className="flex space-x-1 mt-2">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  );
};

// Inline loading spinner for buttons or small spaces
export const InlineLoading = ({ size = 16, className = "" }) => {
  return (
    <div 
      className={`inline-block border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin ${className}`}
      style={{ width: size, height: size }}
    />
  );
};

// Full screen loading overlay
export const FullScreenLoading = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm mx-4">
        <Loading message={message} size="medium" />
      </div>
    </div>
  );
};

export default Loading;