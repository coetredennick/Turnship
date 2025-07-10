// Simple test to verify the response type detection bug fix
const detectResponseType = (connectionData) => {
  const { custom_connection_description, notes } = connectionData;
  const content = (custom_connection_description || notes || '').toLowerCase();
  
  // Enhanced negative indicators (checked FIRST since negative responses often contain polite positive language)
  const negativeKeywords = [
    'not available', 'not interested', 'not a good fit', 'not the right time', 'not at this time',
    'busy', 'can\'t', 'cannot', 'unable', 'decline', 'pass',
    'thanks but', 'appreciate but', 'unfortunately', 'no thank you',
    'not looking', 'not currently', 'not right now', 'too busy',
    'can\'t make', 'won\'t be able', 'have to pass', 'will have to decline'
  ];
  
  // Enhanced positive indicators
  const positiveKeywords = [
    'yes', 'absolutely', 'definitely', 'interested', 'would love', 'sounds great',
    'happy to', 'excited', 'looking forward', 'let\'s schedule', 'let\'s meet',
    'coffee', 'lunch', 'call me', 'meeting', 'available for', 'free to',
    'works for me', 'perfect', 'great idea', 'love to chat'
  ];
  
  // Strong negative phrases (exact matches for common polite rejections)
  const negativeExactPhrases = [
    'thanks for reaching out, but',
    'appreciate your interest, but',
    'thank you for thinking of me, but',
    'i\'m flattered, but'
  ];
  
  console.log(`Testing: "${content}"`);
  
  // Check for exact negative phrases first
  if (negativeExactPhrases.some(phrase => content.includes(phrase))) {
    console.log('  → Found exact negative phrase');
    return 'negative';
  }
  
  // Check for negative keywords (prioritized over positive)
  if (negativeKeywords.some(keyword => content.includes(keyword))) {
    console.log(`  → Found negative keyword`);
    return 'negative';
  }
  
  // Check for positive response (only if no negative indicators found)
  if (positiveKeywords.some(keyword => content.includes(keyword))) {
    console.log(`  → Found positive keyword`);
    return 'positive';
  }
  
  // Default to neutral
  console.log('  → No clear indicators, defaulting to neutral');
  return 'neutral';
};

console.log('🔍 RESPONSE TYPE DETECTION BUG FIX TEST\n');

// Test cases from the demo
const testCases = [
  {
    name: 'Positive Response',
    message: 'Yes, I\'d be happy to chat! Let\'s schedule a coffee next week.',
    expected: 'positive'
  },
  {
    name: 'Negative Response (The Bug Case)',
    message: 'Thanks for reaching out, but I\'m not available for meetings right now.',
    expected: 'negative'
  },
  {
    name: 'Neutral Response',
    message: 'I received your email. Can you tell me more about what you\'re looking for?',
    expected: 'neutral'
  },
  {
    name: 'Additional Negative Test',
    message: 'I appreciate your interest, but I\'m too busy right now.',
    expected: 'negative'
  },
  {
    name: 'Additional Positive Test',
    message: 'Absolutely! I would love to meet for coffee.',
    expected: 'positive'
  }
];

testCases.forEach((testCase, index) => {
  console.log(`${index + 1}. ${testCase.name}:`);
  
  const connectionData = {
    custom_connection_description: testCase.message
  };
  
  const detected = detectResponseType(connectionData);
  const isCorrect = detected === testCase.expected;
  
  console.log(`   Expected: ${testCase.expected}`);
  console.log(`   Detected: ${detected} ${isCorrect ? '✅' : '❌'}`);
  console.log('');
});

console.log('🎯 BUG FIX VERIFICATION:');
console.log('The key bug was that "available" in "not available" was matching positive keywords first.');
console.log('Fixed by: 1) Checking negative keywords FIRST, 2) Using "not available" as phrase, 3) Enhanced detection');
console.log('\nIf all tests show ✅, the bug is fixed!');