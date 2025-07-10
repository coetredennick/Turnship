// Development User Profile Configuration
// This profile will be used for testing enhanced email generation logic

const DEV_USER_PROFILE = {
  // Basic Identity
  name: 'Amy Chen',
  university: 'Stanford University',
  major: 'Computer Science',
  year: 'Junior', // Freshman, Sophomore, Junior, Senior
  graduationYear: '2025',
  currentRole: 'Student',
  
  // Contact Information
  email: 'amy.chen@stanford.edu',
  linkedin: 'linkedin.com/in/amychen-stanford',
  
  // Academic Details
  gpa: '3.8',
  relevantCoursework: [
    'Machine Learning (CS229)',
    'Database Systems (CS245)', 
    'Network Security (CS255)',
    'Entrepreneurship (MS&E178)'
  ],
  
  // Core Interests (Professional)
  interests: [
    'artificial intelligence',
    'networking automation', 
    'tech entrepreneurship',
    'cybersecurity',
    'sustainable technology'
  ],
  
  // Personal Interests (For conversation starters)
  personalInterests: [
    'rock climbing',
    'photography',
    'volunteer tutoring',
    'startup pitch competitions'
  ],
  
  // Achievements & Experiences
  achievements: [
    {
      type: 'academic',
      title: 'Dean\'s List',
      description: 'Fall 2023, Winter 2024',
      year: '2023-2024'
    },
    {
      type: 'leadership',
      title: 'President, Stanford AI Society',
      description: 'Leading 200+ member organization, organized industry speaker series',
      year: '2024'
    },
    {
      type: 'internship',
      title: 'Software Engineering Intern',
      company: 'Meta',
      description: 'Built ML infrastructure for content recommendation systems',
      year: 'Summer 2023'
    },
    {
      type: 'project',
      title: 'TechBridge - Networking Automation Platform',
      description: 'Developed platform to automate professional networking for students',
      year: '2024'
    },
    {
      type: 'research',
      title: 'Research Assistant - Stanford AI Lab',
      description: 'Working on federated learning algorithms with Prof. Li',
      year: '2023-2024'
    }
  ],
  
  // Skills & Technologies
  technicalSkills: [
    'Python', 'JavaScript', 'React', 'Node.js',
    'TensorFlow', 'PyTorch', 'SQL', 'AWS'
  ],
  
  // What Makes Me Special (Personal Pitch)
  uniqueValue: 'I combine technical expertise in AI with entrepreneurial vision, having built networking automation tools that have helped 500+ students land internships. My experience leading diverse teams and translating complex technical concepts for non-technical stakeholders makes me uniquely positioned to drive innovation at the intersection of technology and human connection.',
  
  // Career Goals & Aspirations
  careerGoals: {
    shortTerm: 'Secure a summer 2024 internship in AI/ML at a top tech company',
    longTerm: 'Found a startup that democratizes access to professional networking',
    industries: ['Technology', 'Artificial Intelligence', 'Startups'],
    companies: ['Google', 'OpenAI', 'Anthropic', 'Meta', 'Microsoft', 'early-stage startups']
  },
  
  // Communication Style Preferences
  communicationStyle: {
    formality: 'professional but approachable',
    personality: 'enthusiastic, authentic, curious',
    strengths: ['active listening', 'asking thoughtful questions', 'finding common ground']
  },
  
  // Networking Approach
  networkingApproach: {
    preferredTopics: ['AI/ML trends', 'startup ecosystem', 'technical career advice'],
    conversationStarters: ['recent projects', 'industry insights', 'company culture'],
    followUpStyle: 'prompt and thoughtful with value-added content'
  }
};

// Enhanced status-based context templates with intelligent sub-status handling
// Each status supports 3 progress stages and contextual sub-status detection
const STATUS_CONTEXT_TEMPLATES = {
  'Not Contacted': {
    // Base template for initial outreach
    approach: 'introduction',
    tone: 'professional curiosity',
    context: 'first impression',
    callToAction: 'informational interview or brief conversation',
    description: 'Initial outreach to establish connection',
    progressStages: ['Not Started', 'Draft Made', 'Email Sent'],
    
    // Stage-specific contexts
    stageContexts: {
      'Not Started': {
        approach: 'introduction',
        tone: 'professional curiosity',
        context: 'preparing first impression',
        callToAction: 'informational interview or brief conversation'
      },
      'Draft Made': {
        approach: 'refined introduction',
        tone: 'confident and polished',
        context: 'finalizing first impression message',
        callToAction: 'compelling ask for conversation'
      },
      'Email Sent': {
        approach: 'patient follow-up',
        tone: 'respectful persistence',
        context: 'following up on initial outreach',
        callToAction: 'gentle reminder of interest'
      }
    }
  },
  
  'First Impression': {
    approach: 'strategic introduction with relationship building',
    tone: 'professional enthusiasm',
    context: 'establishing credibility and mutual interest',
    callToAction: 'meaningful conversation or connection',
    description: 'Building initial relationship and demonstrating value',
    progressStages: ['Not Started', 'Draft Made', 'Email Sent'],
    
    stageContexts: {
      'Not Started': {
        approach: 'strategic introduction',
        tone: 'professional enthusiasm',
        context: 'researching and preparing personalized outreach',
        callToAction: 'informational interview or coffee chat'
      },
      'Draft Made': {
        approach: 'personalized introduction',
        tone: 'authentic and engaging',
        context: 'crafting compelling first impression',
        callToAction: 'specific and actionable meeting request'
      },
      'Email Sent': {
        approach: 'thoughtful follow-up',
        tone: 'respectful and value-added',
        context: 'following up with additional value or context',
        callToAction: 'renewed interest with fresh perspective'
      }
    }
  },
  
  'Follow-up': {
    approach: 'continued relationship building',
    tone: 'collaborative and engaged',
    context: 'strengthening existing connection',
    callToAction: 'deepening conversation or next steps',
    description: 'Strengthening existing relationship and exploring opportunities',
    progressStages: ['Not Started', 'Draft Made', 'Email Sent'],
    
    stageContexts: {
      'Not Started': {
        approach: 'continued engagement',
        tone: 'relationship building',
        context: 'building on previous positive interaction',
        callToAction: 'next steps or deeper conversation'
      },
      'Draft Made': {
        approach: 'value-added follow-up',
        tone: 'helpful and insightful',
        context: 'sharing relevant insights or updates',
        callToAction: 'collaborative discussion or resource sharing'
      },
      'Email Sent': {
        approach: 'patient persistence',
        tone: 'understanding and professional',
        context: 'respectful check-in on continued interest',
        callToAction: 'flexible and low-pressure engagement'
      }
    }
  },
  
  'Response': {
    approach: 'adaptive engagement based on response type',
    tone: 'contextually appropriate',
    context: 'responding to their communication',
    callToAction: 'appropriate next step based on response',
    description: 'Engaging with their response - positive, negative, or neutral',
    progressStages: ['Not Started', 'Draft Made', 'Email Sent'],
    
    // Response sub-type handling
    responseTypes: {
      'positive': {
        approach: 'grateful acknowledgment',
        tone: 'appreciative and enthusiastic',
        context: 'thanking for positive response',
        callToAction: 'scheduling or next concrete step'
      },
      'negative': {
        approach: 'gracious understanding',
        tone: 'respectful and professional',
        context: 'understanding their constraints',
        callToAction: 'staying connected for future opportunities'
      },
      'neutral': {
        approach: 'clarifying value',
        tone: 'helpful and specific',
        context: 'providing more context about mutual benefit',
        callToAction: 'specific and low-commitment ask'
      }
    },
    
    stageContexts: {
      'Not Started': {
        approach: 'response preparation',
        tone: 'thoughtful and strategic',
        context: 'analyzing their response and preparing appropriate reply',
        callToAction: 'contextually appropriate engagement'
      },
      'Draft Made': {
        approach: 'tailored response',
        tone: 'personalized and thoughtful',
        context: 'crafting response that matches their tone and needs',
        callToAction: 'response-specific call to action'
      },
      'Email Sent': {
        approach: 'response follow-through',
        tone: 'consistent and professional',
        context: 'following through on response commitments',
        callToAction: 'maintaining momentum from previous response'
      }
    }
  },
  
  'Meeting Scheduled': {
    approach: 'professional meeting management',
    tone: 'organized and appreciative',
    context: 'managing scheduled interaction professionally',
    callToAction: 'meeting preparation or follow-up',
    description: 'Managing scheduled interactions and maintaining momentum',
    progressStages: ['Not Started', 'Draft Made', 'Email Sent'],
    
    stageContexts: {
      'Not Started': {
        approach: 'meeting confirmation',
        tone: 'organized and appreciative',
        context: 'confirming meeting details and preparing agenda',
        callToAction: 'confirmation and agenda preview'
      },
      'Draft Made': {
        approach: 'meeting preparation',
        tone: 'professional and prepared',
        context: 'finalizing meeting logistics and preparation',
        callToAction: 'meeting readiness and agenda confirmation'
      },
      'Email Sent': {
        approach: 'post-meeting follow-up',
        tone: 'grateful and actionable',
        context: 'following up on meeting outcomes',
        callToAction: 'next steps and continued engagement'
      }
    }
  }
};

// Purpose-specific conversation frameworks
const PURPOSE_FRAMEWORKS = {
  'summer-internship': {
    primaryGoal: 'secure internship opportunity',
    keyMessages: ['technical skills', 'relevant experience', 'cultural fit'],
    conversationFlow: ['introduction', 'company interest', 'qualification highlights', 'specific ask'],
    followUpStrategy: 'application status and additional information'
  },
  
  'just-reaching-out': {
    primaryGoal: 'build professional relationship',
    keyMessages: ['shared interests', 'mutual connections', 'learning mindset'],
    conversationFlow: ['introduction', 'connection reason', 'curiosity about their work', 'relationship building'],
    followUpStrategy: 'value-added content sharing'
  },
  
  'advice': {
    primaryGoal: 'gain insights and guidance',
    keyMessages: ['respect for expertise', 'specific questions', 'growth mindset'],
    conversationFlow: ['introduction', 'context for advice', 'specific questions', 'gratitude'],
    followUpStrategy: 'implementation updates and continued questions'
  }
};

module.exports = {
  DEV_USER_PROFILE,
  STATUS_CONTEXT_TEMPLATES,
  PURPOSE_FRAMEWORKS
}; 