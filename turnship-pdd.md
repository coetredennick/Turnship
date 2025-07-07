# Product Development Document: Turnship
**Version:** 0.2  
**Date:** July 7, 2025  
**Status:** Revised for Small-Scale Deployment
**Target Scale:** ~50 users (single location/university)

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Development Philosophy](#development-philosophy)
3. [Technical Architecture](#technical-architecture)
4. [Development Tools & Workflow](#development-tools--workflow)
5. [Development Phases](#development-phases)
6. [Implementation Strategy](#implementation-strategy)
7. [Testing & Quality Assurance](#testing--quality-assurance)
8. [Deployment Strategy](#deployment-strategy)
9. [Timeline & Milestones](#timeline--milestones)
10. [Risk Management](#risk-management)

## 📊 Small-Scale Reality Check

**What This Is:**
- A tool for 50 students at one university
- 8-week development sprint
- < $30/month to operate
- One developer + AI tools

**What This Isn't:**
- The next big SaaS startup
- A scalable platform
- A mobile-first solution
- A complex enterprise system

---

## 1. Executive Summary

This document outlines the development plan for Turnship, a focused networking automation tool for a small group of college students (~50 users) at a single location/university. The approach emphasizes:
- Rapid development using AI tools
- Simple, maintainable architecture
- Direct user feedback loops
- Cost-effective infrastructure

## 2. Development Philosophy

### Core Principles
- **Small Scale, High Impact**: Build specifically for your user group's needs
- **Direct Feedback**: With 50 users, you can talk to everyone personally
- **Simplicity Over Scale**: Choose simple solutions that work well for dozens, not thousands
- **Cost-Conscious**: Keep running costs minimal

### Development Approach
- Solo developer with AI assistance
- Weekly user feedback sessions
- Feature decisions based on actual user requests

## 3. Technical Architecture

### Simplified Stack for Small-Scale Deployment

#### Frontend
- **Primary**: React Web App (skip mobile initially)
- **Why**: 50 college students all have laptops; mobile can come later if needed
- **Hosting**: Replit (free tier sufficient)

#### Backend
- **Runtime**: Node.js with Express
- **Database**: SQLite for development, PostgreSQL on Replit for production
- **Why**: SQLite is perfect for 50 users; Replit's Postgres is free and sufficient

#### Third-Party Integrations (Simplified)
- **Gmail API**: Read/send emails (stay within free quota)
- **OpenAI API**: For email generation (pay-per-use, ~$20/month for 50 users)
- **Skip Initially**: LinkedIn API (complex approval), Handshake API (may not be needed)

#### Infrastructure
- **Everything on Replit**: Development, staging, and production
- **Cost**: ~$7/month for Replit Hacker plan (if needed)
- **No need for**: Load balancers, CDNs, complex monitoring

## 4. Development Tools & Workflow

### Primary Development Environment
- **Cursor**: Main IDE for AI-assisted coding
  - Custom prompts for Turnship-specific patterns
  - Component generation templates
  - API integration helpers

### AI Development Assistants
- **Claude Code CLI**: For complex feature implementation
  - API endpoint generation
  - Database schema design
  - Testing suite creation
  
### Version Control & Collaboration
- **GitHub**: Repository management
  - Feature branch workflow
  - PR-based development
  - GitHub Actions for CI/CD

### Rapid Prototyping
- **Replit**: Initial development and testing
  - Quick deployment for user testing
  - Database hosting during development
  - API endpoint testing

## 5. Development Phases

### Condensed 8-Week Development Plan

#### Phase 1: Core MVP (Weeks 1-3)
**Goal**: Get a working app that sends emails and tracks responses

- **Week 1**: Authentication + Gmail Integration
  - Google OAuth login
  - Gmail API connection
  - Basic database schema
  
- **Week 2**: Email Generation + Sending
  - OpenAI integration for email generation
  - Email preview and editing
  - Send from user's Gmail
  
- **Week 3**: Connection Tracking
  - Simple dashboard showing all contacts
  - Manual status updates
  - Basic email history

**Deliverable**: Working app your 50 users can start testing

#### Phase 2: Smart Features (Weeks 4-5)
**Goal**: Add the intelligence that makes it valuable

- Email monitoring for responses
- Auto-status suggestions
- Follow-up reminders
- Template library

**Deliverable**: App that actually saves time

#### Phase 3: Polish & User Requests (Weeks 6-8)
**Goal**: Refine based on direct user feedback

- UI improvements based on user feedback
- Most requested features from your 50 users
- Bug fixes and performance improvements
- Simple analytics (response rates, etc.)

**Deliverable**: Polished app ready for your user base

### What We're Intentionally Skipping
- Mobile app (not needed for 50 laptop users)
- Complex integrations (LinkedIn, Handshake)
- Advanced analytics (overkill for small scale)
- Automated sending (manual approval is fine for 50 users)

## 6. Implementation Strategy

### 6.1 Small-Scale, High-Touch Development Approach

#### **"Local-First, Deploy-When-Ready" Strategy**

Start with local development for maximum speed, then deploy to Replit when you have something worth showing to users.

### 6.2 Simplified Implementation Plan

#### **Week 1: Local Foundation Sprint**
**Tools**: Claude Code CLI + VS Code/Cursor (local)

```
Day 1-2: Local project setup
- Initialize Node.js/Express project
- Set up SQLite for local development
- Implement Google OAuth (use ngrok for callback URL)

Day 3-4: Gmail API integration
- Read emails functionality
- Send emails from user's account
- Store email history locally

Day 5-7: Basic UI
- Simple React frontend
- Email composer
- Connection list view
```

**Key Decision**: Stay local until core features work perfectly.

#### **Week 2: Make It Useful**
**Tools**: Cursor + OpenAI API (still local)

```
Monday-Tuesday: Email generation with AI
Wednesday: Improve UI/UX based on your own testing
Thursday: Prep for deployment (PostgreSQL migration script)
Friday: Deploy to Replit and get 5 friends testing
```

**First Deploy**: End of Week 2 when you have a working product

#### **Week 3: Real User Onboarding**
**Now on Replit for easy access**

- Fix issues found by first 5 testers
- Simple dashboard with Tailwind CSS
- Manual status updates
- CSV export
- Onboard all 50 users by end of week

**Get all 50 users onboarded by end of week 3**

#### **Week 4-5: The Features They Actually Want**

Based on user feedback, implement the top 3 requested features. Likely candidates:
- Email templates they can share
- Follow-up reminders
- Basic response detection
- Bulk email operations

#### **Week 6-8: Polish and Sustain**

- Fix bugs reported by users
- Improve UI based on usage patterns
- Add simple analytics dashboard
- Set up backup and maintenance procedures

### 6.3 Local Development Setup

#### **Initial Local Stack**
```bash
# Project structure
turnship/
├── server/
│   ├── index.js
│   ├── routes/
│   ├── services/
│   └── db/
├── client/
│   ├── src/
│   └── public/
└── shared/
    └── types/
```

#### **Local Development Tools**
- **Database**: SQLite (migrate to PostgreSQL before deploying)
- **OAuth Testing**: ngrok for stable callback URLs
- **Email Testing**: Use your personal Gmail for development
- **Frontend Dev**: Vite for fast hot-reload

#### **Week 1 Local Setup Commands**
```bash
# Initialize project
mkdir turnship && cd turnship
npm init -y

# Backend dependencies
npm install express sqlite3 googleapis express-session
npm install -D nodemon

# Frontend setup (in client folder)
npm create vite@latest client -- --template react
cd client && npm install
npm install tailwindcss axios

# Development servers
# Terminal 1: npm run server (backend on :5000)
# Terminal 2: npm run dev (frontend on :3000)
```

### 6.4 Transition to Production

#### **Week 2: Migration Checklist**
- [ ] Convert SQLite schema to PostgreSQL
- [ ] Update database connection code
- [ ] Test all features locally with PostgreSQL
- [ ] Create Replit project
- [ ] Set up environment variables
- [ ] Configure custom domain (optional)
- [ ] Deploy and test with 5 users

#### **Why This Timing Works**
1. **Week 1**: You need speed, not deployment
2. **Week 2**: You have something worth showing
3. **Week 3**: Users need easy access
4. **Week 4+**: Deployment is stable, focus on features

### 6.5 Development Workflow

#### **Weeks 1-2: Local Development**
```
Morning: Write features in VS Code/Cursor
Afternoon: Test everything locally
Evening: Prepare for next day
No deployment complexity to slow you down!
```

#### **Weeks 3-8: Production Development**
```
Morning: Code new features locally
Afternoon: Push to GitHub → Auto-deploy to Replit
Evening: Get user feedback, plan next day
```

### 6.6 Local Development Best Practices

1. **Use Environment Variables**
   ```bash
   # .env.local
   GOOGLE_CLIENT_ID=xxx
   GOOGLE_CLIENT_SECRET=xxx
   OPENAI_API_KEY=xxx
   DATABASE_URL=sqlite:./dev.db
   ```

2. **ngrok for OAuth**
   ```bash
   # Terminal 3
   ngrok http 5000
   # Use the https URL for Google OAuth redirect
   ```

3. **Test Data Generator**
   ```javascript
   // Create 20 sample connections for UI testing
   npm run seed-db
   ```

4. **Git Ignore Local Files**
   ```
   dev.db
   .env.local
   node_modules/
   ```

## 7. Testing & Quality Assurance

### 7.1 AI-Assisted Testing Strategy

#### **Continuous Testing Approach**
- Generate tests alongside features using Cursor/Claude Code CLI
- Implement testing at every level: unit, integration, E2E
- Use AI to identify edge cases and generate test data

#### **Testing Phases**

**Weeks 1-4: Backend Testing**
```
claude-code: "Generate Jest test suites for:
- Authentication flows
- Email parsing and generation
- API endpoint validation
- Database operations"
```

**Weeks 5-8: Integration Testing**
```
- Mock third-party APIs for reliable testing
- Test rate limiting and error handling
- Validate data synchronization
```

**Weeks 9-12: Frontend Testing**
```
cursor: "Generate React Native Testing Library tests for:
- User flows
- Component interactions
- State management
- API integration"
```

**Weeks 13-14: E2E & Performance Testing**
```
- Playwright for web app testing
- Detox for mobile app testing
- Load testing with k6
- Security audit with automated tools
```

### 7.2 Quality Metrics
- Code coverage target: 80%
- API response time: <200ms
- App launch time: <2 seconds
- Zero critical security vulnerabilities

## 8. Deployment Strategy

### 8.1 Progressive Deployment Approach

#### **Development Environment (Weeks 1-8)**
- **Platform**: Replit
- **Purpose**: Rapid iteration and testing
- **Features**: Hot reload, shared testing URLs, integrated database

#### **Staging Environment (Weeks 9-12)**
- **Platform**: Railway or Render
- **Purpose**: Beta testing with real users
- **Features**: Production-like environment, SSL, custom domain

#### **Production Environment (Week 13+)**
- **Backend**: AWS/Google Cloud Run (auto-scaling)
- **Database**: Managed PostgreSQL (RDS/Cloud SQL)
- **Mobile**: App Store & Google Play
- **Web**: Vercel (optimal for React)

### 8.2 CI/CD Pipeline

```yaml
# GitHub Actions Workflow
1. On PR: Run tests, linting, security scan
2. On merge to main: Deploy to staging
3. On tag: Deploy to production
4. Automated: Database migrations, SSL renewal
```

### 8.3 Monitoring & Analytics
- **Error Tracking**: Sentry
- **Analytics**: Mixpanel for user behavior
- **Performance**: DataDog or New Relic
- **Uptime**: Better Uptime or Pingdom

## 9. Timeline & Milestones

### 8-Week Sprint to Launch

| Week | Focus | Success Metric |
|------|-------|----------------|
| 1 | Auth + Gmail Integration | 5 users can connect Gmail |
| 2 | Email Generation | Users can generate and send emails |
| 3 | Connection Tracking | All 50 users onboarded |
| 4-5 | User-Requested Features | 80% satisfaction rate |
| 6-7 | Polish & Bug Fixes | < 5 bugs per week |
| 8 | Stable Release | 90% of users actively using |

### Daily Routine
- **Morning**: Code new features with Cursor/Claude
- **Afternoon**: Deploy and test with users
- **Evening**: Plan next day based on feedback

---

## 10. Risk Management

### Risks for Small-Scale Deployment

#### **Technical Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Gmail API quota exceeded | High | Monitor usage, implement caching |
| Replit downtime | Medium | Daily backups, quick migration plan |
| OpenAI API costs | Low | Set spending limits, monitor usage |

#### **User Risks**
| Risk | Impact | Mitigation |
|------|--------|------------|
| Low adoption | High | Weekly pizza sessions, direct support |
| Feature creep | Medium | Strict focus on core features |
| Data privacy concerns | High | Clear privacy policy, local data option |

### Contingency Plans

**If Replit becomes insufficient:**
- Migration path to Railway (2-day process)
- All code in GitHub, easy to redeploy

**If users want mobile app:**
- Start with PWA (1 week)
- React Native only if PWA insufficient

**If growth exceeds 50 users:**
- Implement waitlist
- Plan infrastructure upgrade
- Consider pricing model

### Success Indicators
- 40+ active users (80% adoption)
- Users sending 10+ emails/week through platform
- 50% reduction in time spent on networking
- Direct job/internship offers attributed to tool

---

## Conclusion

This small-scale approach prioritizes:
1. **Speed**: 8 weeks to useful product
2. **Simplicity**: No over-engineering
3. **User Focus**: Direct feedback loops
4. **Cost Efficiency**: < $30/month to operate
5. **Maintainability**: One developer can handle everything

The key is to resist the urge to build for scale you don't have. Focus on making your 50 users incredibly happy, and everything else will follow.