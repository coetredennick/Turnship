import React from 'react';
import StatusBadge from './StatusBadge';
import TimelineVisual from './TimelineVisual';
import ProgressDonut from './ProgressDonut';

const ConnectionCard = ({
  connection,
  selected,
  onSelect,
  onExpandToggle,
  expanded,
  onEdit,
  onViewDrafts,
  onRemove,
  onStatusChange,
  onStageClick
}) => {
  return (
    <div className={`px-4 py-1 border-b hover:bg-gray-50 transition-colors relative h-17 ${
      selected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
    }`}>

      {/* Main Content - Tight Spacing */}
      <div className="pt-1 h-full flex flex-col justify-center">
        {/* Main Row - Checkbox + Avatar + Name aligned */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect(connection.id)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 flex-shrink-0"
            />
            <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-medium text-blue-600">
                {connection.full_name?.charAt(0) || '?'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Name */}
              <div className="font-bold text-gray-900 truncate">
                {connection.full_name}
              </div>
              {/* Dash separator */}
              <span className="text-gray-400">-</span>
              {/* Company */}
              <div className="text-sm text-gray-400 truncate">
                {connection.company || 'No Company'}
              </div>
            </div>
          </div>
          
          {/* Actions positioned on the right */}
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Progress Donut */}
            <div className="w-6 mt-1.5">
              <ProgressDonut connection={connection} size={20} />
            </div>
            
            {/* Status Badge - Phase 1: Keep alongside TimelineVisual */}
            <StatusBadge 
              status={connection.email_status || 'Not Contacted'} 
              editable={true}
              onStatusChange={onStatusChange}
              connectionId={connection.id}
            />
            
            {/* Timeline Visual - Phase 1: Add alongside StatusBadge */}
            {connection.timeline && onStageClick && (
              <div className="ml-2">
                <TimelineVisual 
                  connection={connection}
                  onStageClick={(stage) => onStageClick(stage, connection)}
                  compact={true}
                />
              </div>
            )}
            
            {/* Vertically Stacked Action Buttons - Compressed */}
            <div className="flex flex-col space-y-0">
              <button
                onClick={() => onEdit(connection)}
                className="w-8 h-5 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors flex items-center justify-center"
                title="Edit connection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              
              <button
                onClick={() => onViewDrafts(connection)}
                className="w-8 h-5 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors flex items-center justify-center"
                title="View drafts"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
              
              <button
                onClick={() => onRemove(connection.id)}
                className="w-8 h-5 text-gray-400 hover:text-red-600 focus:outline-none transition-colors flex items-center justify-center"
                title="Remove connection"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {/* Expand/Collapse Chevron */}
            <button
              onClick={() => onExpandToggle(connection.id)}
              className="w-8 h-8 text-gray-400 hover:text-gray-600 focus:outline-none transition-all duration-200 flex items-center justify-center ml-1"
              aria-label={expanded ? "Collapse details" : "Expand details"}
            >
              <svg 
                className={`w-5 h-5 transition-transform duration-200 ${expanded ? 'transform rotate-90' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      {/* Expandable Content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 bg-gray-50 -mx-4 px-4 py-4 rounded-b-lg transition-all duration-300 ease-in-out">
          <div className="space-y-4">
            {/* Full Connection Description */}
            {connection.custom_connection_description && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Connection Description</h5>
                <p className="text-sm text-gray-900 leading-relaxed">{connection.custom_connection_description}</p>
              </div>
            )}
            
            {/* Full Notes */}
            {connection.notes && (
              <div>
                <h5 className="text-sm font-medium text-gray-700 mb-2">Notes</h5>
                <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">{connection.notes}</p>
              </div>
            )}
            
            {/* Timestamps and Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Timeline</h5>
                <div className="space-y-1">
                  <div>
                    <span className="font-medium text-gray-700">Created:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(connection.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  {connection.updated_at && connection.updated_at !== connection.created_at && (
                    <div>
                      <span className="font-medium text-gray-700">Updated:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(connection.updated_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  )}
                  {connection.last_email_sent_date && (
                    <div>
                      <span className="font-medium text-gray-700">Last Email:</span>
                      <span className="ml-2 text-gray-900">
                        {new Date(connection.last_email_sent_date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <h5 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Details</h5>
                <div className="space-y-1">
                  {connection.industry && (
                    <div>
                      <span className="font-medium text-gray-700">Industry:</span>
                      <span className="ml-2 text-gray-900">{connection.industry}</span>
                    </div>
                  )}
                  {connection.connection_type && (
                    <div>
                      <span className="font-medium text-gray-700">Connection Type:</span>
                      <span className="ml-2 text-gray-900">{connection.connection_type}</span>
                    </div>
                  )}

                  {connection.last_email_draft && (
                    <div>
                      <span className="font-medium text-gray-700">Draft Status:</span>
                      <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                        Has Draft
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;