import React from 'react';

const StatusBadge = ({ status }) => {
  // Get appropriate color styling based on email status
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Not Contacted':
        return 'bg-gray-100 text-gray-600';
      case 'First Impression (draft)':
      case 'Follow-up (draft)':
        return 'bg-blue-100 text-blue-600';
      case 'First Impression (sent)':
      case 'Follow-up (sent)':
        return 'bg-green-100 text-green-600';
      case 'First Impression (nr)':
        return 'bg-orange-100 text-orange-600';
      case 'Responded - Positive':
        return 'bg-purple-100 text-purple-600';
      case 'Responded - Negative':
        return 'bg-red-100 text-red-600';
      case 'Meeting Scheduled':
        return 'bg-emerald-100 text-emerald-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  if (!status) {
    return null;
  }

  return (
    <span 
      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(status)}`}
      title={status} // Tooltip for accessibility
    >
      {status}
    </span>
  );
};

export default StatusBadge;