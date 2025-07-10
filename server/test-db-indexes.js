// Test script to verify database indexes are created properly
const { db, initDB } = require('./db/connection');

async function testIndexes() {
  try {
    console.log('🔄 Testing database initialization with indexes...');
    
    // Initialize database
    await initDB();
    
    // Query to check if indexes exist
    const checkIndexes = () => new Promise((resolve, reject) => {
      db.all(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='connections'`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
    
    const indexes = await checkIndexes();
    console.log('📊 Found indexes:', indexes.map(row => row.name));
    
    // Check for our specific indexes
    const expectedIndexes = [
      'idx_connections_user_id',
      'idx_connections_email_status', 
      'idx_connections_created_at',
      'idx_connections_email'
    ];
    
    const foundIndexes = indexes.map(row => row.name);
    const missingIndexes = expectedIndexes.filter(idx => !foundIndexes.includes(idx));
    
    if (missingIndexes.length === 0) {
      console.log('✅ All required indexes are present!');
    } else {
      console.log('❌ Missing indexes:', missingIndexes);
    }
    
    // Close database connection
    db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

testIndexes();