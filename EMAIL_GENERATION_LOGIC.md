# Email Generation Logic Documentation

## Overview
The Turnship email generation system uses AI to create personalized networking emails for college students. The generation logic draws from multiple data sources to create contextually appropriate and personalized communications.

## Current Implementation

### Data Sources
The email generation currently uses:
- **Connection Details**: Name, company, job title, industry
- **Generation Options**: Purpose (Summer Internship, Just Reaching Out, Advice), tone (Enthusiastic, Respectful, Confident, Casual), length (Short, Medium, Long)
- **Connection Status**: Email status for basic context

### Current Process Flow
1. User selects connections and generation options
2. AI receives connection details and user preferences
3. System generates emails based on template patterns
4. Generated emails are saved as drafts with status tracking

## Planned Enhancements

### 1. User Profile Integration
The generation logic will draw from comprehensive user profile details to personalize emails:

#### User Profile Fields
- **College**: University name for shared connections and credibility
- **Major**: Academic focus to find relevant conversation topics
- **Year**: Current academic year (Freshman, Sophomore, Junior, Senior)
- **Interests**: Personal and professional interests to find common ground
- **Achievements**: Academic honors, projects, internships, leadership roles
- **What Makes Me Special** (Optional): Unique personal pitch or differentiator

#### Profile Usage Examples
- "As a Computer Science junior at Stanford..."
- "Given my interest in sustainable energy and my recent internship at..."
- "My experience leading the debate team has taught me..."

### 2. Connection Status Contextual Generation
The connection status will provide intelligent context for email generation:

#### Status-Based Context
- **Not Contacted**: Standard introduction approach
- **First Impression (sent)**: Follow-up language ("Hope my previous email found you well")
- **Responded - Positive**: Grateful acknowledgment ("Thanks for getting back to me!")
- **Responded - Negative**: Respectful understanding with potential future connection
- **Meeting Scheduled**: Confirmation and preparation messaging
- **Follow-up (sent)**: Continued engagement ("Just following up on our conversation")

#### Dynamic Messaging
The system will automatically inject appropriate context phrases based on the connection's current status in the relationship timeline.

### 3. Response Analysis and Adaptive Generation
Advanced feature to analyze connection responses and factor insights into future email generation:

#### Response Analysis Components
- **Sentiment Analysis**: Positive, neutral, or negative response tone
- **Interest Level**: High engagement vs. polite decline
- **Mentioned Topics**: Specific subjects the connection highlighted
- **Next Steps**: Any suggested actions or meeting proposals
- **Response Speed**: Immediate, timely, or delayed response patterns

#### Adaptive Email Features
- **Tone Matching**: Adjust formality based on connection's communication style
- **Topic Continuation**: Reference specific points from previous exchanges
- **Relationship Progression**: Escalate or de-escalate based on engagement level
- **Timing Optimization**: Suggest optimal follow-up timing based on response patterns

## Generation Logic Architecture

### Input Processing
```
User Profile + Connection Details + Status Context + Generation Options + Response History
                                        ↓
                              AI Processing Engine
                                        ↓
                        Contextually Aware Email Generation
```

### Context Layering
1. **Base Layer**: User identity and background (profile)
2. **Relationship Layer**: Connection status and history
3. **Intent Layer**: Purpose and tone preferences
4. **Adaptive Layer**: Response analysis and optimization

### Personalization Levels
- **Level 1**: Basic connection details + generation options (Current)
- **Level 2**: + User profile integration (Planned)
- **Level 3**: + Status-based context (Planned)
- **Level 4**: + Response analysis and adaptation (Advanced)

## Implementation Roadmap

### Phase 1: User Profile Integration
- Add user profile collection interface
- Integrate profile data into email generation API
- Update AI prompts to utilize personal context

### Phase 2: Status-Based Context
- Enhance connection status tracking
- Implement status-to-context mapping
- Update generation logic for relationship-aware messaging

### Phase 3: Response Analysis
- Build email response parsing system
- Implement sentiment and engagement analysis
- Create adaptive generation based on response insights

### Phase 4: Advanced Features
- Response timing optimization
- Relationship progression tracking
- Automated follow-up suggestions
- Success rate analytics

## Technical Considerations

### AI Prompt Engineering
- Dynamic prompt construction based on available data
- Fallback handling for missing profile information
- Context token optimization for API efficiency

### Data Privacy
- Secure storage of user profile information
- Response analysis with privacy preservation
- User control over data usage and retention

### Performance
- Caching of user profile data
- Efficient status-to-context mapping
- Optimized API calls for bulk generation

## Success Metrics
- Email response rates by personalization level
- User satisfaction with generated content
- Time saved compared to manual composition
- Relationship progression success rates

---

*This document will be updated as features are implemented and the system evolves.* 