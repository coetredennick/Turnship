# Connection Progression Timeline System

## Overview
Replace the current status badge system with a visual timeline that shows the complete outreach journey for each connection. The timeline displays as a horizontal sequence of circles (o---o---o) that progress from left to right, with each circle representing a stage in the outreach process.

## Visual Design

### Timeline Structure
- **Display**: Horizontal circles connected by lines: `○---○---○`
- **Max Visible**: 3 circles at once (current stage in middle, 1 before, 1 after if exists)
- **Progression**: Left to right, older stages disappear when more than 3 exist
- **Current Stage**: Always the middle circle when 3 are visible

### Circle States
- **🔴 Red (Empty)**: Stage not started/waiting
- **🟡 Yellow (Half-filled)**: Draft exists for this stage
- **🟢 Green (Full)**: Email sent/response received
- **🟣 Purple (Special)**: Follow-up stage created due to no response

### Line Connections
- **Gray**: Incomplete connection between stages
- **Colored**: Completed connection (matches stage color)

## Stage Types & Progression

### 1. First Impression (Always First)
- **Initial State**: 🔴 Red (no draft)
- **With Draft**: 🟡 Yellow (draft created)
- **Email Sent**: 🟢 Green (email sent)
- **Auto-Progression**: When email sent → creates Response stage (🔴 Red)

### 2. Response (Waiting for Reply)
- **Initial State**: 🔴 Red (waiting for response)
- **Response Received**: 🟢 Green (via Gmail API detection)
- **No Response**: After wait period → creates Follow-up stage

### 3. Follow-up (After No Response)
- **Creation**: Auto-created when response wait period expires
- **Visual**: 🟣 Purple initially (follow-up needed)
- **With Draft**: 🟡 Yellow (follow-up draft created)
- **Email Sent**: 🟢 Green (follow-up sent)
- **Auto-Progression**: When sent → creates new Response stage

### 4. Pattern Continuation
- Response → Follow-up → Response → Follow-up (infinite cycle)
- Timeline extends dynamically as conversation progresses

## Database Schema

### New Tables

#### `connection_timeline_stages`
```sql
CREATE TABLE connection_timeline_stages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  stage_type TEXT NOT NULL, -- 'first_impression', 'response', 'follow_up'
  stage_order INTEGER NOT NULL, -- 1, 2, 3, 4...
  stage_status TEXT NOT NULL, -- 'draft', 'sent', 'received', 'waiting'
  email_content TEXT, -- Actual sent email content
  draft_content TEXT, -- Draft content if exists
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  sent_at DATETIME, -- When email was sent
  response_received_at DATETIME, -- When response was detected
  response_deadline DATETIME, -- When follow-up should be created
  FOREIGN KEY (connection_id) REFERENCES connections(id)
);
```

#### `connection_settings`
```sql
CREATE TABLE connection_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  follow_up_wait_days INTEGER DEFAULT 7, -- Customizable per connection
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES connections(id)
);
```

### Modified Tables

#### `connections` (Remove old status columns)
```sql
-- Remove these columns:
-- status, email_status, draft_status, last_email_draft, last_email_sent_date
-- status_started_date, composer_opened_date

-- Add:
ALTER TABLE connections ADD COLUMN current_stage_id INTEGER;
ALTER TABLE connections ADD COLUMN timeline_data TEXT; -- JSON cache for performance
```

## Backend Implementation

### Core Service: `server/services/timeline.js`

#### Key Functions
```javascript
// Initialize timeline for new connection
initializeTimeline(connectionId)

// Get current timeline state
getConnectionTimeline(connectionId)

// Update stage status (draft, sent, received)
updateStageStatus(connectionId, stageId, newStatus, content)

// Create next stage in progression
createNextStage(connectionId, currentStageId, stageType)

// Check for expired response deadlines
checkResponseDeadlines() // Background job

// Get visible stages (max 3)
getVisibleStages(connectionId)

// Detect responses via Gmail API
detectEmailResponses(connectionId)
```

#### Timeline Logic
```javascript
// Stage progression rules:
// first_impression (sent) → response (waiting)
// response (no response + deadline passed) → follow_up (draft)
// follow_up (sent) → response (waiting)
// response (received) → conversation continues manually
```

### API Endpoints

#### `server/routes/timeline.js`
```javascript
GET /api/connections/:id/timeline
POST /api/connections/:id/timeline/stage
PUT /api/connections/:id/timeline/stage/:stageId
DELETE /api/connections/:id/timeline/stage/:stageId
POST /api/connections/:id/timeline/advance
GET /api/connections/:id/timeline/settings
PUT /api/connections/:id/timeline/settings
```

### Background Jobs
```javascript
// Cron job to check response deadlines
setInterval(checkResponseDeadlines, 60000); // Every minute

// Gmail API integration for response detection
scheduleResponseDetection(); // Every 5 minutes
```

## Frontend Implementation

### New Component: `client/src/components/TimelineVisual.jsx`

#### Props
```javascript
{
  connection: Object, // Connection data with timeline
  onStageClick: Function, // Handle stage click to view email
  onTimelineUpdate: Function, // Handle timeline changes
  compact: Boolean // For connection card display
}
```

#### Visual Features
- SVG-based timeline rendering
- Smooth animations for stage transitions
- Hover effects showing stage details
- Click handlers for viewing stage emails
- Responsive design for different screen sizes

### Integration Points

#### Replace in `ConnectionCard.jsx`
```javascript
// Replace StatusBadge with TimelineVisual
<TimelineVisual 
  connection={connection}
  onStageClick={handleStageClick}
  compact={true}
/>
```

#### Update `Dashboard.jsx`
```javascript
// Handle timeline interactions
const handleStageClick = (connection, stage) => {
  // Open email viewer modal with stage content
  setSelectedEmail(stage.email_content);
  setShowEmailViewer(true);
};
```

#### Modify `EmailComposer.jsx`
```javascript
// Save to current timeline stage instead of generic draft
const saveDraft = (content) => {
  timelineAPI.updateStageStatus(
    connectionId, 
    currentStageId, 
    'draft', 
    content
  );
};
```

## Email Context Building

### Enhanced Context System
```javascript
// Build email context from entire timeline history
const buildTimelineContext = (connectionId) => {
  const timeline = getConnectionTimeline(connectionId);
  const context = {
    previousEmails: timeline.stages
      .filter(stage => stage.email_content)
      .map(stage => ({
        type: stage.stage_type,
        content: stage.email_content,
        sent_at: stage.sent_at,
        response_received: stage.response_received_at
      })),
    currentStage: timeline.current_stage,
    connectionDetails: getConnectionDetails(connectionId),
    conversationHistory: buildConversationThread(timeline)
  };
  return context;
};
```

### AI Email Generation Integration
```javascript
// Pass timeline context to email generation
const generateEmailWithContext = (connectionId, purpose) => {
  const context = buildTimelineContext(connectionId);
  return generateNetworkingEmail(context, purpose);
};
```

## User Experience

### Connection Editor Integration
```javascript
// Add follow-up timing setting to EditConnectionModal
<FormField>
  <label>Follow-up Wait Time</label>
  <select value={followUpDays} onChange={setFollowUpDays}>
    <option value={1}>1 day (testing)</option>
    <option value={3}>3 days</option>
    <option value={7}>1 week</option>
    <option value={14}>2 weeks</option>
  </select>
</FormField>
```

### Stage Click Behavior
```javascript
// When user clicks a timeline stage
const handleStageClick = (stage) => {
  if (stage.email_content) {
    // Show sent email content
    openEmailViewer(stage.email_content);
  } else if (stage.draft_content) {
    // Open composer with draft
    openComposer(stage.draft_content);
  } else {
    // Start new draft for this stage
    openComposer('');
  }
};
```

## Migration Strategy

### Phase 1: Database Migration
```sql
-- Create new tables
-- Migrate existing connections to timeline format
-- Preserve existing draft data
-- Remove old status columns
```

### Phase 2: Backend Services
```javascript
// Implement timeline service
// Update email routes to use timeline
// Add background jobs for response detection
// Create timeline API endpoints
```

### Phase 3: Frontend Components
```javascript
// Create TimelineVisual component
// Replace StatusBadge usage
// Update Dashboard and EmailComposer
// Add timeline settings to connection editor
```

### Phase 4: Testing & Optimization
```javascript
// Test timeline progression
// Verify response detection
// Test follow-up creation
// Performance optimization
```

## Testing Requirements

### Unit Tests
- Timeline stage progression logic
- Response deadline calculation
- Stage visibility algorithm
- Email context building

### Integration Tests
- Gmail API response detection
- Background job execution
- Timeline API endpoints
- Database migrations

### E2E Tests
- Complete outreach flow
- Timeline visual updates
- Stage click interactions
- Follow-up automation

## Performance Considerations

### Caching Strategy
```javascript
// Cache timeline data in connections.timeline_data JSON field
// Invalidate cache on timeline updates
// Use Redis for frequently accessed timelines
```

### Database Optimization
```sql
-- Indexes for timeline queries
CREATE INDEX idx_timeline_connection_order ON connection_timeline_stages(connection_id, stage_order);
CREATE INDEX idx_timeline_deadlines ON connection_timeline_stages(response_deadline);
```

### Frontend Optimization
```javascript
// Lazy load timeline data
// Use React.memo for TimelineVisual
// Debounce timeline updates
// Optimize SVG rendering
```

## Expected Outcome

### User Benefits
- Clear visual progression of outreach journey
- Automatic follow-up management
- Complete conversation context
- Intuitive timeline navigation

### Technical Benefits
- Scalable timeline system
- Automated response detection
- Flexible stage progression
- Rich email context for AI generation

### Business Benefits
- Improved networking success rates
- Reduced manual follow-up management
- Better conversation tracking
- Enhanced user engagement

## Implementation Priority

1. **High Priority**: Database schema and timeline service
2. **High Priority**: Basic timeline visual component
3. **Medium Priority**: Gmail API response detection
4. **Medium Priority**: Background job system
5. **Low Priority**: Advanced timeline features
6. **Low Priority**: Performance optimizations

---

This system completely replaces the current status badge approach with an intuitive, scalable timeline that grows with each connection's outreach journey while maintaining full context for AI-powered email generation. 