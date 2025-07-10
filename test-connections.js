const {
  initDB,
  createConnection,
  getConnectionsByUserId,
  getConnectionById,
  updateConnection,
  deleteConnection,
} = require('./server/db/connection');

// Test the connections database operations
async function testConnections() {
  try {
    console.log('🚀 Testing connections database operations...\n');

    // Initialize database
    await initDB();
    console.log('✅ Database initialized');

    // Test data
    const userId = 1;
    const testConnection = {
      email: 'john.doe@example.com',
      full_name: 'John Doe',
      company: 'TechCorp',
      connection_type: 'Professional',
      job_title: 'Software Engineer',
      industry: 'Technology',
      notes: 'Met at networking event',
      status: 'Not Contacted'
    };

    // Test 1: Create connection
    console.log('📝 Testing createConnection...');
    const createdConnection = await createConnection(userId, testConnection);
    console.log('✅ Connection created:', createdConnection);

    // Test 2: Get connections by user ID
    console.log('\n📋 Testing getConnectionsByUserId...');
    const userConnections = await getConnectionsByUserId(userId);
    console.log('✅ User connections:', userConnections);

    // Test 3: Get connection by ID
    console.log('\n🔍 Testing getConnectionById...');
    const fetchedConnection = await getConnectionById(createdConnection.id);
    console.log('✅ Fetched connection:', fetchedConnection);

    // Test 4: Update connection
    console.log('\n✏️ Testing updateConnection...');
    const updates = {
      status: 'Contacted',
      notes: 'Met at networking event - followed up via email'
    };
    const updatedConnection = await updateConnection(createdConnection.id, updates);
    console.log('✅ Updated connection:', updatedConnection);

    // Test 5: Get updated connection to verify changes
    console.log('\n🔄 Verifying update...');
    const verifyUpdate = await getConnectionById(createdConnection.id);
    console.log('✅ Verified update:', verifyUpdate);

    // Test 6: Delete connection
    console.log('\n🗑️ Testing deleteConnection...');
    const deleteResult = await deleteConnection(createdConnection.id);
    console.log('✅ Delete result:', deleteResult);

    // Test 7: Verify deletion
    console.log('\n✅ Verifying deletion...');
    const deletedConnection = await getConnectionById(createdConnection.id);
    console.log('✅ Deleted connection (should be null):', deletedConnection);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testConnections();