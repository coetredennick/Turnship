import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import EmailComposer from './EmailComposer';
import { emailsAPI, connectionsAPI, timelineAPI } from '../services/api';

// Mock the API services
jest.mock('../services/api', () => ({
  emailsAPI: {
    saveNewDraft: jest.fn(),
    updateDraft: jest.fn(),
    saveDraft: jest.fn(),
    sendEmail: jest.fn(),
    getDraft: jest.fn()
  },
  connectionsAPI: {
    trackComposerOpened: jest.fn()
  },
  timelineAPI: {
    updateStage: jest.fn(),
    advanceTimeline: jest.fn()
  },
  handleAPIError: jest.fn()
}));

// Mock Loading component
jest.mock('./Loading', () => ({
  InlineLoading: ({ size, className }) => (
    <div data-testid="loading-spinner" className={className} style={{ width: size, height: size }}>
      Loading...
    </div>
  )
}));

describe('EmailComposer - Timeline Integration Tests', () => {
  const mockConnection = {
    id: 1,
    full_name: 'John Doe',
    email: 'john@example.com',
    company: 'Test Corp',
    job_title: 'Engineer',
    current_stage_id: 5
  };

  const mockTimelineResponse = {
    data: {
      timeline: {
        stages: [
          { id: 5, stage_status: 'draft', stage_type: 'first_impression' }
        ]
      }
    }
  };

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    connection: mockConnection,
    onEmailSent: jest.fn(),
    onDraftSaved: jest.fn(),
    loadExistingDraft: false,
    currentStageId: 5,
    onTimelineUpdated: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API default responses
    emailsAPI.saveNewDraft.mockResolvedValue({
      data: { draft: { id: 123 } }
    });
    emailsAPI.updateDraft.mockResolvedValue({
      data: { draft: { id: 123 } }
    });
    emailsAPI.saveDraft.mockResolvedValue({});
    emailsAPI.sendEmail.mockResolvedValue({
      data: { emailSent: true }
    });
    connectionsAPI.trackComposerOpened.mockResolvedValue({});
    timelineAPI.updateStage.mockResolvedValue(mockTimelineResponse);
    timelineAPI.advanceTimeline.mockResolvedValue(mockTimelineResponse);
  });

  describe('Draft Saving with Timeline Integration', () => {
    it('should call timeline API when saving draft with currentStageId', async () => {
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click save draft
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(emailsAPI.saveNewDraft).toHaveBeenCalledWith(1, 'Test Subject', 'Test body content');
        expect(timelineAPI.updateStage).toHaveBeenCalledWith(1, 5, {
          stage_status: 'draft',
          draft_content: 'Test body content'
        });
        expect(defaultProps.onTimelineUpdated).toHaveBeenCalledWith(mockTimelineResponse.data);
      });
    });

    it('should fallback to connection.current_stage_id when currentStageId is null', async () => {
      const propsWithoutStageId = { ...defaultProps, currentStageId: null };
      render(<EmailComposer {...propsWithoutStageId} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click save draft
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(timelineAPI.updateStage).toHaveBeenCalledWith(1, 5, {
          stage_status: 'draft',
          draft_content: 'Test body content'
        });
      });
    });

    it('should not fail draft saving if timeline update fails', async () => {
      timelineAPI.updateStage.mockRejectedValue(new Error('Timeline API failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click save draft
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(emailsAPI.saveNewDraft).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update timeline for draft:', expect.any(Error));
        expect(defaultProps.onDraftSaved).toHaveBeenCalledWith(1);
      });
      
      consoleSpy.mockRestore();
    });

    it('should skip timeline update when no stage ID is available', async () => {
      const propsWithoutStageId = { 
        ...defaultProps, 
        currentStageId: null,
        connection: { ...mockConnection, current_stage_id: null }
      };
      render(<EmailComposer {...propsWithoutStageId} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click save draft
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(emailsAPI.saveNewDraft).toHaveBeenCalled();
        expect(timelineAPI.updateStage).not.toHaveBeenCalled();
      });
    });
  });

  describe('Email Sending with Timeline Integration', () => {
    it('should call timeline APIs when sending email', async () => {
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click send email
      const sendButton = screen.getByText('Send Email');
      fireEvent.click(sendButton);
      
      // Wait for confirmation modal to appear
      await screen.findByText('Send Email?');
      
      // Click the red send button in the confirmation modal
      const sendButtons = screen.getAllByText('Send Email');
      const confirmSendButton = sendButtons.find(button => 
        button.closest('button').className.includes('bg-red-600')
      );
      fireEvent.click(confirmSendButton);
      
      await waitFor(() => {
        expect(emailsAPI.saveDraft).toHaveBeenCalled();
        expect(emailsAPI.sendEmail).toHaveBeenCalledWith(1, 'First Impression', 'Test Subject', 'Test body content');
        expect(timelineAPI.updateStage).toHaveBeenCalledWith(1, 5, {
          stage_status: 'sent',
          email_content: 'Test body content',
          sent_at: expect.any(Number)
        });
        expect(timelineAPI.advanceTimeline).toHaveBeenCalledWith(1, 'send_email', 5);
        expect(defaultProps.onTimelineUpdated).toHaveBeenCalledWith(mockTimelineResponse.data);
      });
    });

    it('should not fail email sending if timeline updates fail', async () => {
      timelineAPI.updateStage.mockRejectedValue(new Error('Timeline API failed'));
      timelineAPI.advanceTimeline.mockRejectedValue(new Error('Timeline advance failed'));
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click send email
      const sendButton = screen.getByText('Send Email');
      fireEvent.click(sendButton);
      
      // Wait for confirmation modal to appear
      await screen.findByText('Send Email?');
      
      // Click the red send button in the confirmation modal
      const sendButtons = screen.getAllByText('Send Email');
      const confirmSendButton = sendButtons.find(button => 
        button.closest('button').className.includes('bg-red-600')
      );
      fireEvent.click(confirmSendButton);
      
      await waitFor(() => {
        expect(emailsAPI.sendEmail).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to update timeline for sent email:', expect.any(Error));
        expect(defaultProps.onEmailSent).toHaveBeenCalledWith(1);
      });
      
      consoleSpy.mockRestore();
    });

    it('should prioritize currentStageId over connection.current_stage_id for sending', async () => {
      const connectionWithDifferentStageId = {
        ...mockConnection,
        current_stage_id: 10 // Different from currentStageId
      };
      
      render(<EmailComposer {...defaultProps} connection={connectionWithDifferentStageId} />);
      
      // Fill in email content
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Click send email
      const sendButton = screen.getByText('Send Email');
      fireEvent.click(sendButton);
      
      // Wait for confirmation modal to appear
      await screen.findByText('Send Email?');
      
      // Click the red send button in the confirmation modal
      const sendButtons = screen.getAllByText('Send Email');
      const confirmSendButton = sendButtons.find(button => 
        button.closest('button').className.includes('bg-red-600')
      );
      fireEvent.click(confirmSendButton);
      
      await waitFor(() => {
        // Should use currentStageId (5) not connection.current_stage_id (10)
        expect(timelineAPI.updateStage).toHaveBeenCalledWith(1, 5, expect.any(Object));
        expect(timelineAPI.advanceTimeline).toHaveBeenCalledWith(1, 'send_email', 5);
      });
    });
  });

  describe('Timeline Callback Integration', () => {
    it('should not call onTimelineUpdated when callback is null', async () => {
      const propsWithoutCallback = { ...defaultProps, onTimelineUpdated: null };
      render(<EmailComposer {...propsWithoutCallback} />);
      
      // Fill in email content and save draft
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(timelineAPI.updateStage).toHaveBeenCalled();
        // Should not throw error when callback is null
      });
    });

    it('should handle missing timeline data in response gracefully', async () => {
      timelineAPI.updateStage.mockResolvedValue({ data: null });
      
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content and save draft
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      const saveDraftButton = screen.getByText('Save Draft');
      fireEvent.click(saveDraftButton);
      
      await waitFor(() => {
        expect(timelineAPI.updateStage).toHaveBeenCalled();
        expect(defaultProps.onTimelineUpdated).not.toHaveBeenCalled();
      });
    });
  });

  describe('Auto-save with Timeline Integration', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should trigger timeline update on auto-save', async () => {
      render(<EmailComposer {...defaultProps} />);
      
      // Fill in email content to trigger auto-save
      const subjectInput = screen.getByPlaceholderText('Enter email subject...');
      const bodyTextarea = screen.getByPlaceholderText('Write your email content here...');
      
      fireEvent.change(subjectInput, { target: { value: 'Test Subject' } });
      fireEvent.change(bodyTextarea, { target: { value: 'Test body content' } });
      
      // Fast-forward to trigger auto-save (30 seconds)
      jest.advanceTimersByTime(30000);
      
      await waitFor(() => {
        expect(emailsAPI.saveNewDraft).toHaveBeenCalled();
        expect(timelineAPI.updateStage).toHaveBeenCalledWith(1, 5, {
          stage_status: 'draft',
          draft_content: 'Test body content'
        });
      });
    });
  });
});