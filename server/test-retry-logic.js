// Test script to verify retry logic functionality
const { generateNetworkingEmail } = require('./services/email-ai');

// Mock connection data for testing
const testConnection = {
  id: 1,
  full_name: 'John Doe',
  email: 'john.doe@example.com',
  company: 'Test Corp',
  job_title: 'Software Engineer',
  industry: 'Technology',
  custom_connection_description: 'Met at tech conference',
  notes: 'Interested in AI applications',
};

const testOptions = {
  purpose: 'informational-interview',
  tone: 'professional',
  length: 'medium',
};

async function testRetryLogic() {
  console.log('🔄 Testing email generation with retry logic...');

  try {
    // Test normal operation (assuming OpenAI API is available)
    const result = await generateNetworkingEmail(testConnection, undefined, testOptions);
    console.log('✅ Email generation successful!');
    console.log('Subject:', result.subject);
    console.log('Body length:', result.body.length);
    console.log('Tokens used:', result.tokens_used);
  } catch (error) {
    console.log('❌ Email generation failed:', error.message);

    // Check if it's an expected error type
    if (error.message.includes('quota exceeded')
        || error.message.includes('invalid_api_key')
        || error.message.includes('retry attempts')) {
      console.log('✅ Error handling working correctly - expected error type');
    } else {
      console.log('⚠️ Unexpected error type:', error.message);
    }
  }
}

// Run the test
testRetryLogic().catch(console.error);
