const { generateNetworkingEmail } = require('./server/services/email-ai');

// Test connections with different statuses and industries
const TEST_CONNECTIONS = [
  {
    id: 1,
    user_id: 1,
    full_name: 'Sarah Chen',
    email: 'sarah.chen@openai.com',
    company: 'OpenAI',
    job_title: 'Senior AI Research Scientist',
    industry: 'Artificial Intelligence',
    email_status: 'Not Contacted',
    custom_connection_description: 'Met at Stanford AI Conference, currently working on GPT safety research',
    notes: 'Very approachable, mentioned interest in mentoring students'
  },
  {
    id: 2,
    user_id: 1,
    full_name: 'Marcus Rodriguez',
    email: 'marcus.r@meta.com',
    company: 'Meta',
    job_title: 'Product Manager, AR/VR',
    industry: 'Technology',
    email_status: 'First Impression (sent)',
    custom_connection_description: 'Stanford alum, built the first VR prototype for education',
    notes: 'Sent initial email 5 days ago, no response yet'
  },
  {
    id: 3,
    user_id: 1,
    full_name: 'Dr. Elena Vasquez',
    email: 'elena.vasquez@stanford.edu',
    company: 'Stanford University',
    job_title: 'Professor of Computer Science',
    industry: 'Academia',
    email_status: 'Responded - Positive',
    custom_connection_description: 'Research advisor candidate, expertise in federated learning',
    notes: 'Responded positively, suggested we set up a meeting next week'
  },
  {
    id: 4,
    user_id: 1,
    full_name: 'Alex Kim',
    email: 'alex@techstartup.io',
    company: 'TechStartup',
    job_title: 'Co-founder & CTO',
    industry: 'Startups',
    email_status: 'Meeting Scheduled',
    custom_connection_description: 'Y Combinator alum, building AI-powered productivity tools',
    notes: 'Coffee meeting scheduled for Friday at 2pm'
  }
];

// Test different purpose and tone combinations
const TEST_SCENARIOS = [
  {
    purpose: 'summer-internship',
    tone: 'enthusiastic',
    length: 'medium',
    description: 'Summer Internship - Enthusiastic approach'
  },
  {
    purpose: 'just-reaching-out', 
    tone: 'respectful',
    length: 'short',
    description: 'General Networking - Respectful approach'
  },
  {
    purpose: 'advice',
    tone: 'confident',
    length: 'long',
    description: 'Seeking Advice - Confident approach'
  }
];

// Enhanced email generation test function
async function testEnhancedEmailGeneration() {
  console.log('🧪 Testing Enhanced Email Generation System\n');
  console.log('=' .repeat(80));
  
  try {
    for (let i = 0; i < TEST_CONNECTIONS.length; i++) {
      const connection = TEST_CONNECTIONS[i];
      const scenario = TEST_SCENARIOS[i % TEST_SCENARIOS.length];
      
      console.log(`\n📧 Test ${i + 1}: ${scenario.description}`);
      console.log(`👤 Recipient: ${connection.full_name} (${connection.company})`);
      console.log(`📊 Status: ${connection.email_status}`);
      console.log(`🎯 Purpose: ${scenario.purpose}`);
      console.log(`🎨 Tone: ${scenario.tone}`);
      console.log('-'.repeat(80));
      
      const startTime = Date.now();
      
      try {
        const result = await generateNetworkingEmail(connection, undefined, scenario);
        const endTime = Date.now();
        
        console.log(`✅ Generated in ${endTime - startTime}ms`);
        console.log(`📝 Tokens used: ${result.tokens_used || 'N/A'}\n`);
        
        console.log(`SUBJECT: ${result.subject}\n`);
        console.log('EMAIL:');
        console.log(result.body);
        console.log('\n' + '='.repeat(80));
        
        // Add delay between requests to be nice to the API
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.log(`❌ Generation failed: ${error.message}`);
        console.log('='.repeat(80));
      }
    }
    
    console.log('\n🎉 Enhanced email generation testing complete!');
    console.log('\n📊 Summary of Enhancements:');
    console.log('• Rich user profile context (achievements, skills, interests)');
    console.log('• Status-aware messaging (adapts to relationship stage)');
    console.log('• Purpose-driven conversation frameworks');
    console.log('• Personalized tone and style preferences');
    console.log('• Context-aware call-to-actions');
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Profile comparison test
async function compareBasicVsEnhanced() {
  console.log('\n🔄 Comparing Basic vs Enhanced Generation\n');
  
  const testConnection = TEST_CONNECTIONS[0];
  const testOptions = { purpose: 'summer-internship', tone: 'respectful', length: 'medium' };
  
  try {
    console.log('Generating enhanced email...');
    const enhancedResult = await generateNetworkingEmail(testConnection, undefined, testOptions);
    
    console.log('\n📧 ENHANCED EMAIL:');
    console.log(`SUBJECT: ${enhancedResult.subject}\n`);
    console.log(enhancedResult.body);
    
    console.log('\n🔍 Key Enhancement Features Demonstrated:');
    console.log('• Specific academic details (GPA, coursework)');
    console.log('• Relevant achievements and experience');
    console.log('• Status-appropriate messaging approach');
    console.log('• Purpose-driven conversation structure');
    console.log('• Personal interests for relationship building');
    
  } catch (error) {
    console.error('Enhanced generation failed:', error);
  }
}

// Run tests
async function runAllTests() {
  console.log('🚀 Starting Enhanced Email Generation Tests\n');
  
  // Test enhanced generation with various scenarios
  await testEnhancedEmailGeneration();
  
  // Compare basic vs enhanced
  await compareBasicVsEnhanced();
  
  console.log('\n✨ All tests completed!');
}

// Execute if run directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = {
  testEnhancedEmailGeneration,
  compareBasicVsEnhanced,
  runAllTests
}; 