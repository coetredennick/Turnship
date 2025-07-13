-- Initial database schema for Turnship

-- Users table with comprehensive profile fields
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  
  -- Basic Profile Information
  full_name TEXT,
  university TEXT,
  major TEXT,
  year TEXT, -- Freshman, Sophomore, Junior, Senior
  graduation_year TEXT,
  current_role TEXT DEFAULT 'Student',
  
  -- Contact Information
  linkedin_url TEXT,
  phone TEXT,
  
  -- Gmail Integration
  gmail_connected BOOLEAN DEFAULT FALSE,
  gmail_last_sync DATETIME,
  
  -- Academic Details
  gpa TEXT,
  relevant_coursework TEXT, -- JSON array of courses
  
  -- Professional Interests
  interests TEXT, -- JSON array of professional interests
  personal_interests TEXT, -- JSON array of personal interests
  
  -- Skills & Experience
  technical_skills TEXT, -- JSON array of technical skills
  achievements TEXT, -- JSON array of achievement objects
  
  -- Personal Pitch & Goals
  unique_value TEXT, -- "What makes me special" field
  career_goals TEXT, -- JSON object with short/long term goals
  
  -- Communication Preferences
  communication_style TEXT, -- JSON object with style preferences
  networking_approach TEXT, -- JSON object with networking preferences
  
  -- Profile Completion Status
  profile_completed BOOLEAN DEFAULT FALSE,
  onboarding_step INTEGER DEFAULT 1,
  
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  project_id INTEGER NOT NULL,
  assignee_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (assignee_id) REFERENCES users(id)
);

-- OAuth tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry DATETIME,
  scope TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Connections table (updated for timeline system)
CREATE TABLE IF NOT EXISTS connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT,
  connection_type TEXT,
  job_title TEXT,
  industry TEXT,
  notes TEXT,
  custom_connection_description TEXT,
  current_stage_id INTEGER,
  timeline_data TEXT, -- JSON cache for performance
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Connection Timeline Stages table
CREATE TABLE IF NOT EXISTS connection_timeline_stages (
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

-- Connection Settings table
CREATE TABLE IF NOT EXISTS connection_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL,
  follow_up_wait_days INTEGER DEFAULT 7, -- Customizable per connection
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (connection_id) REFERENCES connections(id)
);

-- Indexes for timeline system performance
CREATE INDEX IF NOT EXISTS idx_timeline_connection_order ON connection_timeline_stages(connection_id, stage_order);
CREATE INDEX IF NOT EXISTS idx_timeline_deadlines ON connection_timeline_stages(response_deadline);