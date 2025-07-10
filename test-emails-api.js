const axios = require('axios');
const path = require('path');
const {
  initDB,
  createConnection,
  getConnectionById,
} = require(path.join(__dirname, 'server', 'db', 'connection'));

const API_BASE = 'http://localhost:3001';

// Test the email API endpoints
async function testEmailsAPI() {
  try {
    console.log('🚀 Testing email API endpoints...\n');

    // Initialize database and create test connections
    await initDB();
    console.log('✅ Database initialized');

    // Create test connections
    const userId = 1;
    const testConnections = [
      {
        email: 'john.doe@techcorp.com',
        full_name: 'John Doe',
        company: 'TechCorp',
        connection_type: 'Professional',
        job_title: 'Software Engineer',
        industry: 'Technology',
        notes: 'Met at tech conference',
        custom_connection_description: 'Interested in networking automation tools'
      },
      {
        email: 'jane.smith@innovate.com',
        full_name: 'Jane Smith',
        company: 'InnovateCorp',
        connection_type: 'Professional',
        job_title: 'Product Manager',
        industry: 'Technology',
        notes: 'LinkedIn connection',
        custom_connection_description: 'Working on AI-powered products'
      }
    ];

    const createdConnections = [];
    for (const conn of testConnections) {
      const created = await createConnection(userId, conn);
      createdConnections.push(created);
      console.log(`✅ Created connection: ${created.full_name} (ID: ${created.id})`);
    }

    // Test 1: Generate emails for multiple connections
    console.log('\n📧 Testing POST /api/emails/generate...');
    const generateRequest = {
      connectionIds: createdConnections.map(c => c.id),
      purpose: 'informational-interview',
      tone: 'professional',
      length: 'medium'
    };

    try {
      const generateResponse = await axios.post(`${API_BASE}/api/emails/generate`, generateRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      
      console.log('✅ Emails generated successfully');
      console.log(`Generated ${generateResponse.data.count} emails`);
      console.log('Sample email:', {
        subject: generateResponse.data.emails[0].subject,
        recipient: generateResponse.data.emails[0].recipient.name,
        bodyPreview: generateResponse.data.emails[0].body.substring(0, 100) + '...'
      });
    } catch (error) {
      console.error('❌ Email generation failed:', error.response?.data || error.message);
    }

    // Test 2: Save email draft
    console.log('\n💾 Testing PUT /api/emails/draft/:connectionId...');
    const connectionId = createdConnections[0].id;
    const draftContent = `Subject: Great meeting you at the conference!

Hi ${createdConnections[0].full_name},

It was wonderful meeting you at the tech conference yesterday. I was really impressed by your insights on networking automation.

I'm working on a project that focuses on automating networking outreach, and I think your perspective would be invaluable. Would you be open to a quick coffee chat next week?

Best regards,
Dev User`;

    try {
      const draftResponse = await axios.put(`${API_BASE}/api/emails/draft/${connectionId}`, {
        draft: draftContent
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      
      console.log('✅ Draft saved successfully:', draftResponse.data);
    } catch (error) {
      console.error('❌ Draft save failed:', error.response?.data || error.message);
    }

    // Test 3: Get saved draft
    console.log('\n📖 Testing GET /api/emails/draft/:connectionId...');
    try {
      const getDraftResponse = await axios.get(`${API_BASE}/api/emails/draft/${connectionId}`, {
        withCredentials: true
      });
      
      console.log('✅ Draft retrieved successfully');
      console.log('Draft preview:', getDraftResponse.data.draft.content.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ Draft retrieval failed:', error.response?.data || error.message);
    }

    // Test 4: Mark email as sent
    console.log('\n📤 Testing POST /api/emails/send/:connectionId...');
    try {
      const sendResponse = await axios.post(`${API_BASE}/api/emails/send/${connectionId}`, {
        emailType: 'First Impression'
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      
      console.log('✅ Email marked as sent:', sendResponse.data);
    } catch (error) {
      console.error('❌ Email send update failed:', error.response?.data || error.message);
    }

    // Test 5: Verify connection status update
    console.log('\n🔍 Testing connection status after email sent...');
    const updatedConnection = await getConnectionById(connectionId);
    console.log('✅ Connection status updated:', {
      id: updatedConnection.id,
      email_status: updatedConnection.email_status,
      last_email_sent_date: updatedConnection.last_email_sent_date
    });

    console.log('\n🎉 All email API tests completed!');

  } catch (error) {
    console.error('❌ Test setup failed:', error.message);
  }
}

// Test validation errors
async function testValidationErrors() {
  try {
    console.log('\n🔍 Testing validation errors...');

    // Test invalid email generation request
    const invalidRequest = {
      connectionIds: ['invalid'], // Should be integers
      purpose: 'invalid-purpose',
      tone: 'invalid-tone',
      length: 'invalid-length'
    };

    try {
      await axios.post(`${API_BASE}/api/emails/generate`, invalidRequest, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation error caught correctly:', error.response.data.details);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test empty draft save
    try {
      await axios.put(`${API_BASE}/api/emails/draft/1`, {
        draft: ''
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      console.log('❌ Should have failed validation for empty draft');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Empty draft validation error caught correctly');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.error('❌ Validation test failed:', error.message);
  }
}

// Run the tests
async function runTests() {
  // First check if server is running
  try {
    await axios.get(`${API_BASE}/health`);
    console.log('✅ Server is running\n');
  } catch (error) {
    console.error('❌ Server is not running. Please start the server first.');
    console.error('Run: npm start or node server/index.js');
    return;
  }

  await testEmailsAPI();
  await testValidationErrors();
}

runTests();