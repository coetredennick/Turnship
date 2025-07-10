const axios = require('axios');

const API_BASE = 'http://localhost:3001';

// Test the connections API endpoints
async function testConnectionsAPI() {
  try {
    console.log('🚀 Testing connections API endpoints...\n');

    // Test data
    const testConnection = {
      email: 'jane.smith@example.com',
      full_name: 'Jane Smith',
      company: 'InnovateCorp',
      connection_type: 'Professional',
      job_title: 'Product Manager',
      industry: 'Technology',
      notes: 'Met at tech conference 2024',
      status: 'Not Contacted'
    };

    // Mock user for development mode
    const mockUser = {
      id: 1,
      email: 'coetredfsu@gmail.com',
      name: 'Dev User'
    };

    // Test 1: Create connection
    console.log('📝 Testing POST /api/connections...');
    const createResponse = await axios.post(`${API_BASE}/api/connections`, testConnection, {
      headers: {
        'Content-Type': 'application/json',
      },
      // In development mode, we'll need to mock the auth
      withCredentials: true
    });
    
    console.log('✅ Connection created:', createResponse.data);
    const connectionId = createResponse.data.connection.id;

    // Test 2: Get all connections
    console.log('\n📋 Testing GET /api/connections...');
    const getAllResponse = await axios.get(`${API_BASE}/api/connections`, {
      withCredentials: true
    });
    
    console.log('✅ All connections:', getAllResponse.data);

    // Test 3: Get specific connection
    console.log('\n🔍 Testing GET /api/connections/:id...');
    const getOneResponse = await axios.get(`${API_BASE}/api/connections/${connectionId}`, {
      withCredentials: true
    });
    
    console.log('✅ Single connection:', getOneResponse.data);

    // Test 4: Update connection
    console.log('\n✏️ Testing PUT /api/connections/:id...');
    const updates = {
      status: 'Contacted',
      notes: 'Met at tech conference 2024 - followed up via LinkedIn'
    };
    
    const updateResponse = await axios.put(`${API_BASE}/api/connections/${connectionId}`, updates, {
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true
    });
    
    console.log('✅ Updated connection:', updateResponse.data);

    // Test 5: Delete connection
    console.log('\n🗑️ Testing DELETE /api/connections/:id...');
    const deleteResponse = await axios.delete(`${API_BASE}/api/connections/${connectionId}`, {
      withCredentials: true
    });
    
    console.log('✅ Delete result:', deleteResponse.data);

    // Test 6: Verify deletion
    console.log('\n✅ Testing GET after deletion...');
    try {
      await axios.get(`${API_BASE}/api/connections/${connectionId}`, {
        withCredentials: true
      });
      console.log('❌ Connection should not exist after deletion');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Connection properly deleted (404 as expected)');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    console.log('\n🎉 All API tests completed successfully!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

// Test validation errors
async function testValidationErrors() {
  try {
    console.log('\n🔍 Testing validation errors...');

    // Test missing required fields
    const invalidData = {
      company: 'Test Corp'
      // Missing email and full_name
    };

    try {
      await axios.post(`${API_BASE}/api/connections`, invalidData, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      console.log('❌ Should have failed validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Validation error caught correctly:', error.response.data);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test invalid email format
    const invalidEmail = {
      email: 'not-a-valid-email',
      full_name: 'Test User'
    };

    try {
      await axios.post(`${API_BASE}/api/connections`, invalidEmail, {
        headers: {
          'Content-Type': 'application/json',
        },
        withCredentials: true
      });
      console.log('❌ Should have failed email validation');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Email validation error caught correctly:', error.response.data);
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

  await testConnectionsAPI();
  await testValidationErrors();
}

runTests();