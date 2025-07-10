// Demo: Enhanced Email Generation Context Builder
// Shows how the new system creates rich, status-aware contexts

const { DEV_USER_PROFILE, STATUS_CONTEXT_TEMPLATES, PURPOSE_FRAMEWORKS } = require('./server/config/dev-profile');

// Mock the enhanced context builder function (from email-ai.js)
const buildEnhancedContext = (connectionData, userProfile, options) => {
  const { full_name, company, job_title, industry, email_status, custom_connection_description, notes } = connectionData;
  
  // Get status-based context
  const statusContext = STATUS_CONTEXT_TEMPLATES[email_status] || STATUS_CONTEXT_TEMPLATES['Not Contacted'];
  
  // Get purpose framework
  const purposeFramework = PURPOSE_FRAMEWORKS[options.purpose] || PURPOSE_FRAMEWORKS['just-reaching-out'];
  
  // Build rich context object
  return {
    // Connection details
    connection: {
      name: full_name,
      company: company || 'their company',
      role: job_title || 'their role',
      industry: industry || 'their industry',
      customDescription: custom_connection_description || notes || '',
      currentStatus: email_status || 'Not Contacted'
    },
    
    // Enhanced user profile context
    user: {
      ...userProfile,
      // Build achievement highlights for relevant context
      keyAchievements: userProfile.achievements.slice(0, 2).map(a => 
        `${a.title}${a.company ? ` at ${a.company}` : ''} - ${a.description}`
      ),
      // Extract relevant technical skills
      relevantSkills: userProfile.technicalSkills.slice(0, 4).join(', '),
      // Format interests for natural language
      coreInterests: userProfile.interests.join(', '),
      personalHobbies: userProfile.personalInterests.slice(0, 2).join(' and ')
    },
    
    // Status-based messaging approach
    status: statusContext,
    
    // Purpose-driven conversation framework
    purpose: purposeFramework,
    
    // Generation preferences
    preferences: {
      tone: options.tone,
      length: options.length,
      formality: userProfile.communicationStyle.formality,
      personality: userProfile.communicationStyle.personality
    }
  };
};

// Test connections with different statuses
const DEMO_CONNECTIONS = [
  {
    id: 1,
    full_name: 'Sarah Chen',
    email: 'sarah.chen@openai.com',
    company: 'OpenAI',
    job_title: 'Senior AI Research Scientist',
    industry: 'Artificial Intelligence',
    email_status: 'Not Contacted',
    custom_connection_description: 'Met at Stanford AI Conference, currently working on GPT safety research'
  },
  {
    id: 2,
    full_name: 'Marcus Rodriguez',
    email: 'marcus.r@meta.com',
    company: 'Meta',
    job_title: 'Product Manager, AR/VR',
    industry: 'Technology',
    email_status: 'First Impression (sent)',
    custom_connection_description: 'Stanford alum, built the first VR prototype for education'
  },
  {
    id: 3,
    full_name: 'Dr. Elena Vasquez',
    email: 'elena.vasquez@stanford.edu',
    company: 'Stanford University',
    job_title: 'Professor of Computer Science',
    industry: 'Academia',
    email_status: 'Responded - Positive',
    custom_connection_description: 'Research advisor candidate, expertise in federated learning'
  }
];

// Demo different scenarios
const DEMO_SCENARIOS = [
  { purpose: 'summer-internship', tone: 'enthusiastic', length: 'medium' },
  { purpose: 'just-reaching-out', tone: 'respectful', length: 'short' },
  { purpose: 'advice', tone: 'confident', length: 'long' }
];

function demonstrateEnhancedContext() {
  console.log('🎯 Enhanced Email Generation Context Demo\n');
  console.log('This shows how the new system builds rich, personalized contexts\n');
  console.log('='.repeat(100));

  DEMO_CONNECTIONS.forEach((connection, index) => {
    const scenario = DEMO_SCENARIOS[index];
    
    console.log(`\n📧 DEMO ${index + 1}: ${connection.full_name} (${connection.email_status})`);
    console.log(`🎯 Purpose: ${scenario.purpose} | 🎨 Tone: ${scenario.tone}`);
    console.log('-'.repeat(100));
    
    const context = buildEnhancedContext(connection, DEV_USER_PROFILE, scenario);
    
    console.log('\n🏫 STUDENT CONTEXT:');
    console.log(`• Identity: ${context.user.name}, ${context.user.year} ${context.user.major} at ${context.user.university}`);
    console.log(`• Academic: ${context.user.gpa} GPA`);
    console.log(`• Key Achievements: ${context.user.keyAchievements.join('; ')}`);
    console.log(`• Technical Skills: ${context.user.relevantSkills}`);
    console.log(`• Interests: ${context.user.coreInterests}`);
    console.log(`• Personal: ${context.user.personalHobbies}`);
    
    console.log('\n👤 CONNECTION CONTEXT:');
    console.log(`• Recipient: ${context.connection.name}, ${context.connection.role} at ${context.connection.company}`);
    console.log(`• Industry: ${context.connection.industry}`);
    console.log(`• Status: ${context.connection.currentStatus}`);
    console.log(`• Notes: ${context.connection.customDescription}`);
    
    console.log('\n📋 MESSAGING STRATEGY:');
    console.log(`• Approach: ${context.status.approach}`);
    console.log(`• Tone: ${context.status.tone}`);
    console.log(`• Context: ${context.status.context}`);
    console.log(`• Call to Action: ${context.status.callToAction}`);
    
    console.log('\n🎯 PURPOSE FRAMEWORK:');
    console.log(`• Goal: ${context.purpose.primaryGoal}`);
    console.log(`• Key Messages: ${context.purpose.keyMessages.join(', ')}`);
    console.log(`• Flow: ${context.purpose.conversationFlow.join(' → ')}`);
    
    console.log('\n💬 TONE PREFERENCES:');
    console.log(`• Style: ${context.preferences.formality}`);
    console.log(`• Personality: ${context.preferences.personality}`);
    console.log(`• Length: ${context.preferences.length}`);
    
    console.log('\n' + '='.repeat(100));
  });
  
  console.log('\n🎉 ENHANCED FEATURES DEMONSTRATED:');
  console.log('✅ Rich user profile with achievements, skills, and interests');
  console.log('✅ Status-aware messaging that adapts to relationship stage');  
  console.log('✅ Purpose-driven conversation frameworks');
  console.log('✅ Personalized tone and style preferences');
  console.log('✅ Context-aware call-to-actions');
  
  console.log('\n🔄 COMPARED TO BASIC SYSTEM:');
  console.log('❌ Basic: Only name, school, major, general interests');
  console.log('✅ Enhanced: 15+ profile fields, status context, purpose frameworks');
  console.log('❌ Basic: Same approach for all connection statuses');
  console.log('✅ Enhanced: Adaptive messaging based on relationship stage');
  console.log('❌ Basic: Generic conversation structure');
  console.log('✅ Enhanced: Purpose-specific conversation flows');
  
  console.log('\n💡 THIS ENABLES:');
  console.log('• More authentic, personalized outreach');
  console.log('• Relationship-stage appropriate messaging');
  console.log('• Higher response rates through better targeting');
  console.log('• Contextually relevant conversation starters');
  console.log('• Professional networking success optimization');
}

// Run the demo
demonstrateEnhancedContext(); 