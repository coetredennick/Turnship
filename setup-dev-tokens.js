const { google } = require('googleapis');
const readline = require('readline');
require('dotenv').config();

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3001/auth/google/callback'
);

// Generate auth URL
const scopes = [
  'profile',
  'email', 
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send'
];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: scopes,
  prompt: 'consent' // Force consent to get refresh token
});

console.log('\n🔗 STEP 1: Visit this URL to authorize Gmail access:');
console.log('\n' + authUrl + '\n');

console.log('📋 STEP 2: After authorizing, you\'ll be redirected to a callback URL.');
console.log('Copy the FULL callback URL (including the code parameter) and paste it here.\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the full callback URL here: ', async (callbackUrl) => {
  try {
    // Extract code from URL
    const url = new URL(callbackUrl);
    const code = url.searchParams.get('code');
    
    if (!code) {
      console.error('❌ No authorization code found in URL');
      rl.close();
      return;
    }

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    console.log('\n✅ SUCCESS! Your development tokens:');
    console.log('\n📋 Copy this into your .env file:\n');
    console.log(`# Development Gmail Tokens (for core-features branch)`);
    console.log(`DEV_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`DEV_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log(`DEV_TOKEN_EXPIRY=${tokens.expiry_date}`);
    
    console.log('\n🎯 Next: I\'ll modify the code to use these tokens automatically');
    
    rl.close();
  } catch (error) {
    console.error('❌ Error getting tokens:', error.message);
    rl.close();
  }
});