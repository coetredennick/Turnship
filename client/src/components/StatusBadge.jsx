import React, { useState } from 'react';

const StatusBadge = ({ status, editable = false, onStatusChange, connectionId }) => {
  const [isEditing, setIsEditing] = useState(false);

  // All available status options
  const statusOptions = [
    'Not Contacted',
    'First Impression (draft)',
    'First Impression (sent)',
    'First Impression (nr)',
    'Follow-up (draft)', 
    'Follow-up (sent)',
    'Responded - Positive',
    'Responded - Negative',
    'Responded - Neutral',
    'Meeting Scheduled'
  ];

  // Get badge color based on status
  const getBadgeColor = (status) => {
    switch (status) {
      case 'Not Contacted':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'First Impression (draft)':
      case 'Follow-up (draft)':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'First Impression (sent)':
      case 'Follow-up (sent)':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'First Impression (nr)':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'Responded - Positive':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Responded - Negative':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'Responded - Neutral':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Meeting Scheduled':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const handleStatusSelect = (newStatus) => {
    if (onStatusChange && connectionId) {
      onStatusChange(connectionId, newStatus);
    }
    setIsEditing(false);
  };

  if (!status) return null;

  return (
    <div className="relative">
      {editable && isEditing ? (
        // Dropdown for editing
        <div className="relative">
          <select
            value={status}
            onChange={(e) => handleStatusSelect(e.target.value)}
            onBlur={() => setIsEditing(false)}
            autoFocus
            className="text-xs font-medium px-2 py-1 rounded-full border focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {statusOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      ) : (
        // Badge display (clickable if editable)
        <span
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border cursor-${editable ? 'pointer hover:shadow-sm' : 'default'} ${getBadgeColor(status)}`}
          onClick={editable ? () => setIsEditing(true) : undefined}
          title={editable ? 'Click to change status' : status}
        >
          {status}
          {editable && (
            <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
      )}
    </div>
  );
};

export default StatusBadge;