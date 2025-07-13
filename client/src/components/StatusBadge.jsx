import React, { useState, useEffect, useRef } from 'react';
import ProgressDonut from './ProgressDonut';

const StatusBadge = ({ status, editable = false, onStatusChange, connectionId, connection }) => {
  const [isEditing, setIsEditing] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  // Simplified 5-status system with intelligent backend detection
  const statusOptions = [
    'Not Contacted',
    'First Impression',
    'Follow-up',
    'Response',
    'Meeting Scheduled'
  ];

  // Get badge color based on simplified 5-status system
  const getBadgeColor = (status) => {
    switch (status) {
      case 'Not Contacted':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'First Impression':
        return 'bg-blue-100 text-blue-700 border-blue-200'; // Professional/active
      case 'Follow-up':
        return 'bg-orange-100 text-orange-700 border-orange-200'; // Ongoing relationship
      case 'Response':
        return 'bg-purple-100 text-purple-700 border-purple-200'; // Interaction received
      case 'Meeting Scheduled':
        return 'bg-green-100 text-green-700 border-green-200'; // Success/progress
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
    <div className="relative" ref={dropdownRef}>
        {editable && isEditing ? (
          // Custom dropdown for editing
          <div className="absolute top-0 left-0 z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-max">
            {statusOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleStatusSelect(option)}
                className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 first:rounded-t-md last:rounded-b-md ${
                  option === status ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}
        
        {/* Badge display (clickable if editable) */}
        <span
          className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border cursor-${editable ? 'pointer hover:shadow-sm' : 'default'} ${getBadgeColor(status)}`}
          onClick={editable ? () => setIsEditing(!isEditing) : undefined}
          title={editable ? 'Click to change status' : status}
        >
          {status}
          {editable && (
            <svg className="ml-1 h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </span>
    </div>
  );
};

export default StatusBadge;