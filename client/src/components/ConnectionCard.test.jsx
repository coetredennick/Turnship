import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConnectionCard from './ConnectionCard';

// Mock TimelineVisual component
jest.mock('./TimelineVisual', () => {
  return function MockTimelineVisual({ connection, onStageClick, compact }) {
    return (
      <div data-testid="timeline-visual">
        <span>Timeline for {connection.id}</span>
        <button
          onClick={() => onStageClick && onStageClick({ id: 1, stage_status: 'waiting' }, connection)}
          data-testid="mock-stage-click"
        >
          Click Stage
        </button>
        {compact && <span data-testid="compact-mode">Compact</span>}
      </div>
    );
  };
});

// Mock StatusBadge component
jest.mock('./StatusBadge', () => {
  return function MockStatusBadge({ status, onStatusChange, connectionId }) {
    return (
      <div data-testid="status-badge">
        <span>{status}</span>
        <button
          onClick={() => onStatusChange && onStatusChange(connectionId, 'First Impression')}
          data-testid="mock-status-change"
        >
          Change Status
        </button>
      </div>
    );
  };
});

// Mock ProgressDonut component
jest.mock('./ProgressDonut', () => {
  return function MockProgressDonut() {
    return <div data-testid="progress-donut">Progress</div>;
  };
});

describe('ConnectionCard - Phase 1 Timeline Integration', () => {
  const mockConnection = {
    id: 1,
    full_name: 'John Doe',
    company: 'Acme Corp',
    email_status: 'Not Contacted',
    timeline: {
      stages: [
        {
          id: 1,
          stage_type: 'first_impression',
          stage_status: 'waiting',
          stage_order: 1
        }
      ]
    }
  };

  const mockConnectionWithoutTimeline = {
    id: 2,
    full_name: 'Jane Smith',
    company: 'Tech Inc',
    email_status: 'First Impression'
  };

  const defaultProps = {
    selected: false,
    onSelect: jest.fn(),
    onExpandToggle: jest.fn(),
    expanded: false,
    onEdit: jest.fn(),
    onViewDrafts: jest.fn(),
    onRemove: jest.fn(),
    onStatusChange: jest.fn(),
    onStageClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders StatusBadge (Phase 1 compatibility)', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.getByText('Not Contacted')).toBeInTheDocument();
  });

  it('renders TimelineVisual when connection has timeline data and onStageClick is provided', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    expect(screen.getByTestId('timeline-visual')).toBeInTheDocument();
    expect(screen.getByText('Timeline for 1')).toBeInTheDocument();
    expect(screen.getByTestId('compact-mode')).toBeInTheDocument(); // Should be compact
  });

  it('does not render TimelineVisual when connection lacks timeline data', () => {
    render(<ConnectionCard connection={mockConnectionWithoutTimeline} {...defaultProps} />);
    
    expect(screen.queryByTestId('timeline-visual')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toBeInTheDocument(); // StatusBadge still shows
  });

  it('does not render TimelineVisual when onStageClick is not provided', () => {
    const propsWithoutStageClick = { ...defaultProps };
    delete propsWithoutStageClick.onStageClick;
    
    render(<ConnectionCard connection={mockConnection} {...propsWithoutStageClick} />);
    
    expect(screen.queryByTestId('timeline-visual')).not.toBeInTheDocument();
    expect(screen.getByTestId('status-badge')).toBeInTheDocument(); // StatusBadge still shows
  });

  it('handles stage clicks correctly with connection context', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    const stageButton = screen.getByTestId('mock-stage-click');
    fireEvent.click(stageButton);
    
    expect(defaultProps.onStageClick).toHaveBeenCalledWith(
      { id: 1, stage_status: 'waiting' },
      mockConnection
    );
  });

  it('handles status changes correctly (Phase 1 compatibility)', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    const statusButton = screen.getByTestId('mock-status-change');
    fireEvent.click(statusButton);
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith(
      mockConnection.id,
      'First Impression'
    );
  });

  it('displays both StatusBadge and TimelineVisual in Phase 1', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    // Both should be present during Phase 1 migration
    expect(screen.getByTestId('status-badge')).toBeInTheDocument();
    expect(screen.getByTestId('timeline-visual')).toBeInTheDocument();
  });

  it('renders other connection card elements correctly', () => {
    render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByTestId('progress-donut')).toBeInTheDocument();
  });

  describe('Phase 2: Stage-specific interactions', () => {
    it('passes stage and connection to onStageClick handler', () => {
      render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
      
      const stageButton = screen.getByTestId('mock-stage-click');
      fireEvent.click(stageButton);
      
      // Verify the handler receives both stage and connection
      expect(defaultProps.onStageClick).toHaveBeenCalledWith(
        { id: 1, stage_status: 'waiting' },
        mockConnection
      );
    });

    it('maintains backward compatibility with StatusBadge interactions', () => {
      render(<ConnectionCard connection={mockConnection} {...defaultProps} />);
      
      const statusButton = screen.getByTestId('mock-status-change');
      fireEvent.click(statusButton);
      
      // StatusBadge functionality should still work
      expect(defaultProps.onStatusChange).toHaveBeenCalledWith(
        mockConnection.id,
        'First Impression'
      );
    });
  });
});