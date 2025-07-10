import React from 'react';

const ProgressDonut = ({ 
  connection, 
  size = 20, 
  strokeWidth = 3,
  className = "" 
}) => {
  
  // Calculate progress percentage based on connection data
  const calculateProgress = (connection) => {
    if (!connection.email_status || connection.email_status === 'Not Contacted') {
      return 0; // Empty circle for not contacted
    }
    
    const { 
      status_started_date, 
      composer_opened_date, 
      last_email_draft, 
      last_email_sent_date 
    } = connection;
    
    // If email was sent for current status, 100% complete
    if (last_email_sent_date && status_started_date && last_email_sent_date >= status_started_date) {
      return 100;
    }
    
    // If draft exists for current status, 66% complete  
    if (last_email_draft && last_email_draft.trim()) {
      return 66;
    }
    
    // If composer was opened for current status, 33% complete
    if (composer_opened_date && status_started_date && composer_opened_date >= status_started_date) {
      return 33;
    }
    
    // Just started current status, 0% complete
    return 0;
  };
  
  // Get color based on status (matching StatusBadge colors)
  const getStatusColor = (status) => {
    switch (status) {
      case 'Not Contacted':
        return '#6B7280'; // gray-500
      case 'First Impression':
        return '#3B82F6'; // blue-500
      case 'Follow-up':
        return '#F97316'; // orange-500
      case 'Response':
        return '#A855F7'; // purple-500
      case 'Meeting Scheduled':
        return '#22C55E'; // green-500
      default:
        return '#6B7280'; // gray-500
    }
  };
  
  const progress = calculateProgress(connection);
  const color = getStatusColor(connection.email_status);
  const isComplete = progress === 100;
  
  // SVG calculations
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg 
        width={size} 
        height={size} 
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        {progress > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: 'stroke-dashoffset 0.5s ease-in-out'
            }}
          />
        )}
      </svg>
      
      {/* Checkmark for completed status */}
      {isComplete && (
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ color }}
        >
          <svg 
            width={size * 0.5} 
            height={size * 0.5} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
      )}
    </div>
  );
};

export default ProgressDonut; 