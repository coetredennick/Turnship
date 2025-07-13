import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineVisual from './TimelineVisual';

const mockConnection = {
  id: 1,
  timeline: {
    stages: [
      {
        id: 1,
        stage_type: 'first_impression',
        stage_status: 'sent',
        stage_order: 1
      },
      {
        id: 2,
        stage_type: 'response',
        stage_status: 'waiting',
        stage_order: 2
      },
      {
        id: 3,
        stage_type: 'follow_up',
        stage_status: 'waiting',
        stage_order: 3
      }
    ]
  }
};

const mockConnectionWithDraft = {
  id: 1,
  timeline: {
    stages: [
      {
        id: 1,
        stage_type: 'first_impression',
        stage_status: 'draft',
        stage_order: 1
      }
    ]
  }
};

const mockConnectionWithReceived = {
  id: 1,
  timeline: {
    stages: [
      {
        id: 1,
        stage_type: 'first_impression',
        stage_status: 'sent',
        stage_order: 1
      },
      {
        id: 2,
        stage_type: 'response',
        stage_status: 'received',
        stage_order: 2
      }
    ]
  }
};

describe('TimelineVisual', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders timeline with correct number of stages', async () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('aria-label', 'Timeline progression visualization');
    
    // Wait for transition to complete
    jest.advanceTimersByTime(150);
    
    // Wait for React state update
    await waitFor(() => {
      const circles = svg.querySelectorAll('circle');
      expect(circles).toHaveLength(3);
    });
  });

  it('applies correct colors based on stage status', async () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    // Wait for transition to complete
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      expect(circles).toHaveLength(3);
      
      // First stage is 'sent' (green)
      expect(circles[0]).toHaveAttribute('fill', 'rgb(16 185 129)');
      
      // Second stage is 'waiting' (red)
      expect(circles[1]).toHaveAttribute('fill', 'rgb(239 68 68)');
      
      // Third stage is 'waiting' (red)
      expect(circles[2]).toHaveAttribute('fill', 'rgb(239 68 68)');
    });
  });

  it('applies draft status color correctly', async () => {
    render(<TimelineVisual connection={mockConnectionWithDraft} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circle = screen.getByRole('img').querySelector('circle');
      expect(circle).toHaveAttribute('fill', 'rgb(245 158 11)'); // Yellow for draft
    });
  });

  it('applies received status color correctly', async () => {
    render(<TimelineVisual connection={mockConnectionWithReceived} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      expect(circles[1]).toHaveAttribute('fill', 'rgb(139 92 246)'); // Purple for received
    });
  });

  it('handles stage clicks', async () => {
    const mockOnStageClick = jest.fn();
    render(
      <TimelineVisual 
        connection={mockConnection} 
        onStageClick={mockOnStageClick} 
      />
    );
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      expect(circles).toHaveLength(3);
      fireEvent.click(circles[0]);
      
      expect(mockOnStageClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 1,
          stage_type: 'first_impression',
          stage_status: 'sent'
        })
      );
    });
  });

  it('prevents clicks during transitions', async () => {
    const mockOnStageClick = jest.fn();
    render(
      <TimelineVisual 
        connection={mockConnection} 
        onStageClick={mockOnStageClick} 
      />
    );
    
    // Don't advance timers - should still be transitioning
    // Wait a bit for initial render but don't complete transition
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      if (circles.length > 0) {
        fireEvent.click(circles[0]);
      }
    });
    
    // Should not have been called during transition
    expect(mockOnStageClick).not.toHaveBeenCalled();
  });

  it('renders in compact mode', () => {
    render(<TimelineVisual connection={mockConnection} compact />);
    
    const container = screen.getByRole('img').parentElement;
    expect(container).toHaveClass('compact');
    
    // In compact mode, labels should not be visible
    expect(screen.queryByText('First Contact')).not.toBeInTheDocument();
    expect(screen.queryByText('Response')).not.toBeInTheDocument();
  });

  it('shows stage labels in normal mode', async () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      expect(screen.getByText('First Contact')).toBeInTheDocument();
      expect(screen.getByText('Response')).toBeInTheDocument();
      expect(screen.getByText('Follow-up')).toBeInTheDocument();
    });
  });

  it('handles empty timeline', () => {
    const emptyConnection = { timeline: { stages: [] } };
    render(<TimelineVisual connection={emptyConnection} />);
    
    const svg = screen.getByRole('img');
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(0);
    
    // Should not render labels container
    expect(screen.queryByText('First Contact')).not.toBeInTheDocument();
  });

  it('handles missing timeline data', () => {
    render(<TimelineVisual connection={{}} />);
    
    const svg = screen.getByRole('img');
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(0);
  });

  it('handles null connection', () => {
    render(<TimelineVisual connection={null} />);
    
    const svg = screen.getByRole('img');
    const circles = svg.querySelectorAll('circle');
    expect(circles).toHaveLength(0);
  });

  it('limits to maximum 3 stages', async () => {
    const manyStagesConnection = {
      timeline: {
        stages: Array.from({ length: 6 }, (_, i) => ({
          id: i + 1,
          stage_type: 'first_impression',
          stage_status: 'waiting',
          stage_order: i + 1
        }))
      }
    };
    
    render(<TimelineVisual connection={manyStagesConnection} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      expect(circles).toHaveLength(3);
    });
  });

  it('shows correct stages when there are more than 3', async () => {
    const manyStagesConnection = {
      timeline: {
        stages: [
          { id: 1, stage_type: 'first_impression', stage_status: 'sent', stage_order: 1 },
          { id: 2, stage_type: 'response', stage_status: 'sent', stage_order: 2 },
          { id: 3, stage_type: 'follow_up', stage_status: 'waiting', stage_order: 3 },
          { id: 4, stage_type: 'follow_up', stage_status: 'waiting', stage_order: 4 },
          { id: 5, stage_type: 'follow_up', stage_status: 'waiting', stage_order: 5 }
        ]
      }
    };
    
    render(<TimelineVisual connection={manyStagesConnection} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const circles = screen.getByRole('img').querySelectorAll('circle');
      expect(circles).toHaveLength(3);
      
      // Should show stages around the last active stage (stage 2)
      // Expecting stages 1, 2, 3 (around active stage 2)
      expect(circles[0]).toHaveAttribute('fill', 'rgb(16 185 129)'); // sent
      expect(circles[1]).toHaveAttribute('fill', 'rgb(16 185 129)'); // sent
      expect(circles[2]).toHaveAttribute('fill', 'rgb(239 68 68)'); // waiting
    });
  });

  it('shows smooth transitions when connection changes', async () => {
    const { rerender } = render(<TimelineVisual connection={mockConnection} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveClass('transition-opacity');
    
    // Should start with transition
    expect(svg).toHaveClass('opacity-70');
    
    // After timeout, should be fully visible
    jest.advanceTimersByTime(150);
    await waitFor(() => {
      expect(svg).toHaveClass('opacity-100');
    });
    
    // Change connection and check transition happens again
    const updatedConnection = {
      ...mockConnection,
      timeline: {
        stages: [
          { ...mockConnection.timeline.stages[0], stage_status: 'draft' }
        ]
      }
    };
    
    rerender(<TimelineVisual connection={updatedConnection} />);
    
    // Should transition again
    expect(svg).toHaveClass('opacity-70');
    
    jest.advanceTimersByTime(150);
    await waitFor(() => {
      expect(svg).toHaveClass('opacity-100');
    });
  });

  it('renders connection lines between stages', async () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const svg = screen.getByRole('img');
      const lines = svg.querySelectorAll('line');
      
      // Should have 2 lines connecting 3 stages
      expect(lines).toHaveLength(2);
      
      lines.forEach(line => {
        expect(line).toHaveAttribute('stroke', 'rgb(229 231 235)');
        expect(line).toHaveAttribute('stroke-width', '2');
      });
    });
  });

  it('does not render lines for single stage', async () => {
    const singleStageConnection = {
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
    
    render(<TimelineVisual connection={singleStageConnection} />);
    
    jest.advanceTimersByTime(150);
    
    const svg = screen.getByRole('img');
    const lines = svg.querySelectorAll('line');
    expect(lines).toHaveLength(0);
  });

  it('displays correct stage icons in normal mode', async () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    jest.advanceTimersByTime(150);
    
    await waitFor(() => {
      const svg = screen.getByRole('img');
      const texts = svg.querySelectorAll('text');
      
      expect(texts[0]).toHaveTextContent('1'); // first_impression
      expect(texts[1]).toHaveTextContent('2'); // response
      expect(texts[2]).toHaveTextContent('3'); // follow_up
    });
  });

  it('does not display stage icons in compact mode', () => {
    render(<TimelineVisual connection={mockConnection} compact />);
    
    const svg = screen.getByRole('img');
    const texts = svg.querySelectorAll('text');
    expect(texts).toHaveLength(0);
  });

  it('cleans up timeout on unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = render(<TimelineVisual connection={mockConnection} />);
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });

  it('handles rapid connection changes without memory leaks', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { rerender } = render(<TimelineVisual connection={mockConnection} />);
    
    // Rapidly change connections
    rerender(<TimelineVisual connection={mockConnectionWithDraft} />);
    rerender(<TimelineVisual connection={mockConnectionWithReceived} />);
    rerender(<TimelineVisual connection={mockConnection} />);
    
    // Should clear timeouts for each change
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(3);
    
    clearTimeoutSpy.mockRestore();
  });

  it('has proper accessibility attributes', () => {
    render(<TimelineVisual connection={mockConnection} />);
    
    const svg = screen.getByRole('img');
    expect(svg).toHaveAttribute('aria-label', 'Timeline progression visualization');
    
    const circles = svg.querySelectorAll('circle');
    circles.forEach(circle => {
      expect(circle).toHaveAttribute('aria-label');
    });
  });
});