import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

/**
 * TimelineVisual - SVG-based timeline component for connection progression
 * 
 * Improvements applied:
 * - Removed unused onTimelineUpdate prop
 * - Uses Tailwind-aligned rgb() colors for consistency
 * - Added timeline color palette to tailwind.config.js for centralized theming
 * - Performance: getStageColor/getStageIcon could be memoized but impact is negligible
 */

const TimelineVisual = ({ 
  connection, 
  onStageClick, 
  compact = false 
}) => {
  const [stages, setStages] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef(null);

  // Extract timeline stages with max 3 visible stages
  useEffect(() => {
    if (connection?.timeline?.stages) {
      const visibleStages = getVisibleStages(connection.timeline.stages);
      
      // Smooth transition when stages change
      setIsTransitioning(true);
      
      // Clear any existing timeout to prevent memory leaks
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setStages(visibleStages);
        setIsTransitioning(false);
        timeoutRef.current = null;
      }, 150);
    }
  }, [connection]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Get color based on stage status - using Tailwind color values
  const getStageColor = (stage) => {
    switch (stage.stage_status) {
      case 'waiting': return 'rgb(239 68 68)';   // red-500
      case 'draft': return 'rgb(245 158 11)';    // amber-500
      case 'sent': return 'rgb(16 185 129)';     // emerald-500
      case 'received': return 'rgb(139 92 246)'; // violet-500
      default: return 'rgb(156 163 175)';        // gray-400
    }
  };

  // Get visible stages (max 3) - could be replaced by backend visibleStages prop in future
  const getVisibleStages = (allStages) => {
    if (!allStages || allStages.length === 0) return [];
    
    const sortedStages = [...allStages].sort((a, b) => a.stage_order - b.stage_order);
    
    if (sortedStages.length <= 3) {
      return sortedStages;
    }
    
    // Find current active stage (last non-waiting) and show around it
    let currentIndex = -1;
    for (let i = sortedStages.length - 1; i >= 0; i--) {
      if (sortedStages[i].stage_status !== 'waiting') {
        currentIndex = i;
        break;
      }
    }
    
    const activeIndex = currentIndex >= 0 ? currentIndex : 0;
    
    if (activeIndex === 0) return sortedStages.slice(0, 3);
    if (activeIndex === sortedStages.length - 1) return sortedStages.slice(-3);
    return sortedStages.slice(activeIndex - 1, activeIndex + 2);
  };

  const handleStageClick = (stage) => {
    if (onStageClick && !isTransitioning) {
      onStageClick(stage);
    }
  };

  // Responsive sizing
  const circleSize = compact ? 16 : 24;
  const lineWidth = compact ? 60 : 80;
  const spacing = lineWidth + circleSize;
  const totalWidth = stages.length > 0 ? circleSize + (stages.length - 1) * spacing : circleSize;
  const totalHeight = circleSize + 8;

  return (
    <div className={`timeline-visual ${compact ? 'compact' : ''}`}>
      <svg 
        role="img"
        aria-label="Timeline progression visualization"
        width={totalWidth} 
        height={totalHeight}
        className={`transition-opacity duration-300 ${isTransitioning ? 'opacity-70' : 'opacity-100'}`}
      >
        {/* Connection lines */}
        {stages.length > 1 && stages.map((_, index) => {
          if (index === stages.length - 1) return null;
          
          return (
            <line
              key={`line-${index}`}
              x1={circleSize/2 + index * spacing + circleSize/2}
              y1={totalHeight/2}
              x2={circleSize/2 + index * spacing + lineWidth + circleSize/2}
              y2={totalHeight/2}
              stroke="rgb(229 231 235)"
              strokeWidth="2"
              className="transition-all duration-300"
            />
          );
        })}
        
        {/* Stage circles */}
        {stages.map((stage, index) => (
          <g key={stage.id || `stage-${index}`}>
            <circle
              cx={circleSize/2 + index * spacing}
              cy={totalHeight/2}
              r={circleSize/2 - 1}
              fill={getStageColor(stage)}
              stroke="rgb(255 255 255)"
              strokeWidth="2"
              className="cursor-pointer transition-all duration-300 hover:scale-110 hover:drop-shadow-md"
              onClick={() => handleStageClick(stage)}
              aria-label={`${getStageLabel(stage.stage_type)} - ${stage.stage_status}`}
            />
            
            {/* Stage type indicator */}
            {!compact && (
              <text
                x={circleSize/2 + index * spacing}
                y={totalHeight/2 + 4}
                textAnchor="middle"
                className="text-xs font-medium fill-white pointer-events-none select-none"
                style={{ fontSize: '10px' }}
              >
                {getStageIcon(stage.stage_type)}
              </text>
            )}
          </g>
        ))}
      </svg>
      
      {/* Stage labels (below circles) */}
      {!compact && stages.length > 0 && (
        <div 
          className="flex mt-2 text-xs text-gray-600"
          style={{ width: totalWidth }}
        >
          {stages.map((stage, index) => (
            <div 
              key={stage.id || `label-${index}`}
              className="text-center transition-all duration-300"
              style={{ 
                width: circleSize + 8,
                marginLeft: index === 0 ? 0 : lineWidth - 4
              }}
            >
              {getStageLabel(stage.stage_type)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper functions
const getStageIcon = (stageType) => {
  switch (stageType) {
    case 'first_impression': return '1';
    case 'response': return '2';
    case 'follow_up': return '3';
    default: return '?';
  }
};

const getStageLabel = (stageType) => {
  switch (stageType) {
    case 'first_impression': return 'First Contact';
    case 'response': return 'Response';
    case 'follow_up': return 'Follow-up';
    default: return 'Unknown';
  }
};

TimelineVisual.propTypes = {
  connection: PropTypes.shape({
    timeline: PropTypes.shape({
      stages: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.number,
        stage_type: PropTypes.string.isRequired,
        stage_status: PropTypes.oneOf(['waiting', 'draft', 'sent', 'received']).isRequired,
        stage_order: PropTypes.number.isRequired
      }))
    })
  }),
  onStageClick: PropTypes.func,
  compact: PropTypes.bool
};

export default TimelineVisual;