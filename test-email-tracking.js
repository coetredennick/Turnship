const path = require('path');
const {
  initDB,
  createConnection,
  getConnectionsByUserId,
  getConnectionById,
  updateConnectionEmailStatus,
  saveEmailDraft,
  getConnectionDraft,
  updateCustomConnectionDescription,
} = require(path.join(__dirname, 'server', 'db', 'connection'));

// Test the new email tracking and draft storage functions
async function testEmailTracking() {
  try {
    console.log('🚀 Testing email tracking and draft storage...\n');

    // Initialize database
    await initDB();
    console.log('✅ Database initialized with new email tracking columns');

    // Test data
    const userId = 1;
    const testConnection = {
      email: 'test@example.com',
      full_name: 'Test User',
      company: 'Test Corp',
      connection_type: 'Professional',
      job_title: 'Software Engineer',
      industry: 'Technology',
      notes: 'Test connection for email tracking',
      custom_connection_description: 'Met at tech conference - interested in networking automation'
    };

    // Test 1: Create connection with custom description
    console.log('📝 Testing createConnection with custom description...');
    const createdConnection = await createConnection(userId, testConnection);
    console.log('✅ Connection created:', {
      id: createdConnection.id,
      email_status: createdConnection.email_status,
      custom_connection_description: createdConnection.custom_connection_description
    });

    const connectionId = createdConnection.id;

    // Test 2: Update email status to draft
    console.log('\n📧 Testing updateConnectionEmailStatus to draft...');
    const draftStatus = await updateConnectionEmailStatus(connectionId, 'First Impression (draft)');
    console.log('✅ Email status updated to draft:', {
      id: draftStatus.id,
      email_status: draftStatus.email_status
    });

    // Test 3: Save email draft
    console.log('\n💾 Testing saveEmailDraft...');
    const draftContent = `Subject: Great meeting you at the conference!

Hi Test User,

It was wonderful meeting you at the tech conference yesterday. I was really impressed by your insights on networking automation and would love to continue our conversation.

I'm working on a project called Turnship that focuses on automating networking outreach, and I think your perspective would be invaluable. Would you be open to a quick coffee chat next week?

Best regards,
Dev User`;

    const draftResult = await saveEmailDraft(connectionId, draftContent);
    console.log('✅ Email draft saved:', draftResult);

    // Test 4: Get connection draft
    console.log('\n📖 Testing getConnectionDraft...');
    const retrievedDraft = await getConnectionDraft(connectionId);
    console.log('✅ Draft retrieved:', {
      connectionId: retrievedDraft.connectionId,
      draftLength: retrievedDraft.draft?.length || 0,
      hasContent: !!retrievedDraft.draft
    });

    // Test 5: Update email status to sent
    console.log('\n📤 Testing updateConnectionEmailStatus to sent...');
    const sentDate = Date.now();
    const sentStatus = await updateConnectionEmailStatus(connectionId, 'First Impression (sent)', sentDate);
    console.log('✅ Email status updated to sent:', {
      id: sentStatus.id,
      email_status: sentStatus.email_status,
      last_email_sent_date: sentStatus.last_email_sent_date
    });

    // Test 6: Update custom connection description
    console.log('\n📝 Testing updateCustomConnectionDescription...');
    const newDescription = 'Met at tech conference - interested in networking automation. Sent first impression email on ' + new Date().toLocaleDateString();
    const updatedConnection = await updateCustomConnectionDescription(connectionId, newDescription);
    console.log('✅ Custom description updated:', {
      id: updatedConnection.id,
      custom_connection_description: updatedConnection.custom_connection_description
    });

    // Test 7: Test different email statuses
    console.log('\n🔄 Testing various email statuses...');
    const statuses = [
      'Follow-up (draft)',
      'Follow-up (sent)',
      'Responded - Positive',
      'Meeting Scheduled'
    ];

    for (const status of statuses) {
      const result = await updateConnectionEmailStatus(connectionId, status);
      console.log(`✅ Status updated to: ${result.email_status}`);
    }

    // Test 8: Test invalid status (should fail)
    console.log('\n❌ Testing invalid email status...');
    try {
      await updateConnectionEmailStatus(connectionId, 'Invalid Status');
      console.log('❌ Should have failed with invalid status');
    } catch (error) {
      console.log('✅ Correctly rejected invalid status:', error.message);
    }

    // Test 9: Get final connection state
    console.log('\n🔍 Testing final connection state...');
    const finalConnection = await getConnectionById(connectionId);
    console.log('✅ Final connection state:', {
      id: finalConnection.id,
      full_name: finalConnection.full_name,
      email_status: finalConnection.email_status,
      has_draft: !!finalConnection.last_email_draft,
      last_email_sent_date: finalConnection.last_email_sent_date,
      custom_connection_description: finalConnection.custom_connection_description
    });

    console.log('\n🎉 All email tracking tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the tests
testEmailTracking();