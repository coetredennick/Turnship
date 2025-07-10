const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testAIService, generateNetworkingEmail, generateBatchEmails } = require('./server/services/email-ai');

// Test individual email generation
async function testIndividualGeneration() {
  console.log('🤖 Testing individual AI email generation...\n');
  
  const testConnection = {
    id: 1,
    full_name: 'Sarah Johnson',
    email: 'sarah.johnson@techcorp.com',
    company: 'TechCorp',
    job_title: 'Senior Product Manager',
    industry: 'Technology',
    connection_type: 'Professional',
    custom_connection_description: 'Met at Stanford AI Conference, discussed networking automation tools for product teams',
    notes: 'Very interested in AI applications for product development'
  };

  const options = {
    purpose: 'informational-interview',
    tone: 'professional',
    length: 'medium'
  };

  try {
    const result = await generateNetworkingEmail(testConnection, undefined, options);
    console.log('✅ Individual email generated successfully!');
    console.log('Subject:', result.subject);
    console.log('Body preview:', result.body.substring(0, 200) + '...');
    console.log('Tokens used:', result.tokens_used);
    console.log('Generated at:', result.generated_at);
    console.log('Parameters:', result.parameters);
    return result;
  } catch (error) {
    console.error('❌ Individual generation failed:', error.message);
    throw error;
  }
}

// Test batch email generation
async function testBatchGeneration() {
  console.log('\n📧 Testing batch AI email generation...\n');
  
  const testConnections = [
    {
      id: 1,
      full_name: 'John Smith',
      email: 'john.smith@innovate.com',
      company: 'InnovateCorp',
      job_title: 'Engineering Manager',
      industry: 'Technology',
      connection_type: 'Professional',
      custom_connection_description: 'LinkedIn connection interested in AI and automation',
      notes: 'Manages a team of 15 engineers'
    },
    {
      id: 2,
      full_name: 'Emily Chen',
      email: 'emily.chen@datatech.com',
      company: 'DataTech Solutions',
      job_title: 'Data Scientist',
      industry: 'Technology',
      connection_type: 'Professional',
      custom_connection_description: 'Alumni from Stanford, working on ML applications',
      notes: 'Published research on natural language processing'
    }
  ];

  const options = {
    purpose: 'industry-insights',
    tone: 'professional',
    length: 'medium'
  };

  try {
    const result = await generateBatchEmails(testConnections, undefined, options);
    console.log('✅ Batch emails generated successfully!');
    console.log(`Generated ${result.success_count} emails out of ${result.total}`);
    
    if (result.failed.length > 0) {
      console.log('❌ Failed generations:', result.failed);
    }
    
    result.successful.forEach((email, index) => {
      console.log(`\n--- Email ${index + 1} ---`);
      console.log('Recipient:', email.recipient.name);
      console.log('Subject:', email.subject);
      console.log('Body preview:', email.body.substring(0, 150) + '...');
    });
    
    return result;
  } catch (error) {
    console.error('❌ Batch generation failed:', error.message);
    throw error;
  }
}

// Test different purposes
async function testDifferentPurposes() {
  console.log('\n🎯 Testing different email purposes...\n');
  
  const testConnection = {
    id: 1,
    full_name: 'Michael Rodriguez',
    email: 'michael.rodriguez@startup.com',
    company: 'TechStartup Inc',
    job_title: 'CTO',
    industry: 'Technology',
    connection_type: 'Professional',
    custom_connection_description: 'Founder of successful AI startup, mentor in Stanford entrepreneurship program',
    notes: 'Previously worked at Google and Meta'
  };

  const purposes = ['informational-interview', 'job-inquiry', 'industry-insights', 'follow-up', 'introduction'];
  
  for (const purpose of purposes) {
    try {
      console.log(`Testing purpose: ${purpose}`);
      const options = {
        purpose,
        tone: 'professional',
        length: 'medium'
      };
      
      const result = await generateNetworkingEmail(testConnection, undefined, options);
      console.log(`✅ ${purpose} email generated`);
      console.log('Subject:', result.subject);
      console.log('Body preview:', result.body.substring(0, 100) + '...\n');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to generate ${purpose} email:`, error.message);
    }
  }
}

// Test different tones and lengths
async function testTonesAndLengths() {
  console.log('\n🎭 Testing different tones and lengths...\n');
  
  const testConnection = {
    id: 1,
    full_name: 'Lisa Wang',
    email: 'lisa.wang@venture.com',
    company: 'Venture Capital Firm',
    job_title: 'Principal',
    industry: 'Finance',
    connection_type: 'Professional',
    custom_connection_description: 'Invests in early-stage tech startups, Stanford alumna',
    notes: 'Focus on AI and enterprise software investments'
  };

  const combinations = [
    { tone: 'casual', length: 'short' },
    { tone: 'professional', length: 'medium' },
    { tone: 'formal', length: 'long' }
  ];
  
  for (const combo of combinations) {
    try {
      console.log(`Testing tone: ${combo.tone}, length: ${combo.length}`);
      const options = {
        purpose: 'informational-interview',
        tone: combo.tone,
        length: combo.length
      };
      
      const result = await generateNetworkingEmail(testConnection, undefined, options);
      console.log(`✅ ${combo.tone} ${combo.length} email generated`);
      console.log('Subject:', result.subject);
      console.log('Body length:', result.body.length, 'characters');
      console.log('Body preview:', result.body.substring(0, 100) + '...\n');
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Failed to generate ${combo.tone} ${combo.length} email:`, error.message);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is not set');
      console.log('Please add your OpenAI API key to the .env file');
      return;
    }
    
    console.log('🚀 Starting AI email generation tests...\n');
    console.log('OpenAI API Key configured:', process.env.OPENAI_API_KEY.substring(0, 10) + '...');
    
    await testIndividualGeneration();
    await testBatchGeneration();
    await testDifferentPurposes();
    await testTonesAndLengths();
    
    console.log('\n🎉 All AI email generation tests completed!');
    
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    
    // Check for common issues
    if (error.message.includes('insufficient_quota')) {
      console.log('\n💡 Tip: Check your OpenAI billing and usage limits');
    } else if (error.message.includes('invalid_api_key')) {
      console.log('\n💡 Tip: Verify your OpenAI API key is correct');
    } else if (error.message.includes('rate_limit_exceeded')) {
      console.log('\n💡 Tip: You may be hitting rate limits, try again later');
    }
  }
}

// Run the test suite
runAllTests();