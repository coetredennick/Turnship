// Demo: Profile System Migration Path
// Shows how easily we can transition from dev profile to user profiles

const { DEV_USER_PROFILE } = require('./server/config/dev-profile');

// Mock database functions (what we'd implement)
const mockUserProfiles = new Map();

// Simulated user profile data (what a real user might create)
const REAL_USER_PROFILES = {
  1: {
    // Basic Identity (user-entered)
    name: 'Jordan Martinez',
    university: 'UC Berkeley',
    major: 'Data Science',
    year: 'Senior',
    graduationYear: '2024',
    currentRole: 'Student',
    
    // Academic Details (user-entered)
    gpa: '3.7',
    relevantCoursework: [
      'Machine Learning (CS 189)',
      'Data Mining (Info 159)',
      'Statistics (Stat 134)'
    ],
    
    // Interests (user-selected from categories)
    interests: [
      'machine learning',
      'data visualization', 
      'fintech',
      'sports analytics'
    ],
    
    // Personal Interests (user-entered)
    personalInterests: [
      'soccer',
      'cooking',
      'traveling'
    ],
    
    // Achievements (user-added)
    achievements: [
      {
        type: 'internship',
        title: 'Data Science Intern',
        company: 'Stripe',
        description: 'Built fraud detection models, reduced false positives by 15%',
        year: 'Summer 2023'
      },
      {
        type: 'project',
        title: 'NCAA Bracket Predictor',
        description: 'ML model that outperformed 85% of ESPN brackets',
        year: '2023'
      }
    ],
    
    // Skills (user-selected/entered)
    technicalSkills: [
      'Python', 'R', 'SQL', 'Tableau',
      'Pandas', 'Scikit-learn', 'AWS'
    ],
    
    // Unique Value (user-written)
    uniqueValue: 'I bridge the gap between complex data insights and business impact, with experience turning messy datasets into actionable strategies that drive revenue growth.',
    
    // Career Goals (user-defined)
    careerGoals: {
      shortTerm: 'Land a data scientist role at a fintech startup',
      longTerm: 'Lead data science teams that democratize financial services',
      industries: ['Fintech', 'Healthcare', 'Sports'],
      companies: ['Stripe', 'Plaid', 'Robinhood', 'early-stage fintech']
    },
    
    // Communication preferences (user-selected)
    communicationStyle: {
      formality: 'professional but friendly',
      personality: 'analytical, curious, collaborative',
      strengths: ['data storytelling', 'problem-solving', 'team collaboration']
    }
  },
  
  2: {
    // Different user with different profile
    name: 'Priya Patel',
    university: 'MIT',
    major: 'Electrical Engineering',
    year: 'Junior',
    graduationYear: '2025',
    
    gpa: '3.9',
    relevantCoursework: [
      'Circuits and Electronics (6.002)',
      'Introduction to Machine Learning (6.036)'
    ],
    
    interests: [
      'robotics',
      'renewable energy',
      'embedded systems'
    ],
    
    achievements: [
      {
        type: 'research',
        title: 'Research Assistant - MIT CSAIL',
        description: 'Developing energy-efficient neural networks for edge devices',
        year: '2023-2024'
      }
    ],
    
    technicalSkills: ['C++', 'MATLAB', 'Python', 'Arduino'],
    
    uniqueValue: 'I design intelligent systems that solve real-world problems while minimizing environmental impact.',
    
    communicationStyle: {
      formality: 'formal and technical',
      personality: 'detail-oriented, innovative, sustainability-focused'
    }
  }
};

// Mock database functions
async function getUserProfile(userId) {
  // Simulate database lookup
  await new Promise(resolve => setTimeout(resolve, 10)); // simulate DB delay
  return REAL_USER_PROFILES[userId] || null;
}

async function updateUserProfile(userId, profileData) {
  // Simulate database update
  REAL_USER_PROFILES[userId] = { ...REAL_USER_PROFILES[userId], ...profileData };
  return REAL_USER_PROFILES[userId];
}

// Enhanced email generation that works with both dev and user profiles
async function generateEmailWithProfile(userId, connectionData, options) {
  // This is the ONE LINE CHANGE needed for migration:
  const userProfile = await getUserProfile(userId) || DEV_USER_PROFILE;
  
  console.log(`📋 Using profile for: ${userProfile.name} (${userProfile.university})`);
  
  // Same generation logic works for both dev and user profiles!
  return {
    profile: userProfile,
    message: `Email generated for ${connectionData.full_name} using ${userProfile.name}'s profile`,
    context: {
      background: `${userProfile.major} student at ${userProfile.university}`,
      achievements: userProfile.achievements?.slice(0, 2).map(a => a.title) || ['Sample achievement'],
      interests: userProfile.interests?.join(', ') || 'general interests'
    }
  };
}

// Demo the migration path
async function demonstrateMigration() {
  console.log('🔄 Profile System Migration Demo\n');
  console.log('Shows how easy transition from dev profile to user profiles would be\n');
  
  const testConnection = {
    id: 1,
    full_name: 'Sarah Johnson',
    company: 'Google',
    job_title: 'Product Manager'
  };
  
  const options = { purpose: 'summer-internship', tone: 'enthusiastic', length: 'medium' };
  
  console.log('='.repeat(80));
  
  // Scenario 1: User without profile (uses dev profile fallback)
  console.log('\n📧 SCENARIO 1: New user without profile (fallback to dev profile)');
  console.log('User ID: 999 (no profile in database)');
  console.log('-'.repeat(50));
  
  const result1 = await generateEmailWithProfile(999, testConnection, options);
  console.log(`✅ ${result1.message}`);
  console.log(`📚 Background: ${result1.context.background}`);
  console.log(`🏆 Achievements: ${result1.context.achievements.join(', ')}`);
  console.log(`💡 Interests: ${result1.context.interests}`);
  
  // Scenario 2: User with custom profile (Berkeley student)
  console.log('\n📧 SCENARIO 2: Existing user with custom profile');
  console.log('User ID: 1 (Jordan Martinez from UC Berkeley)');
  console.log('-'.repeat(50));
  
  const result2 = await generateEmailWithProfile(1, testConnection, options);
  console.log(`✅ ${result2.message}`);
  console.log(`📚 Background: ${result2.context.background}`);
  console.log(`🏆 Achievements: ${result2.context.achievements.join(', ')}`);
  console.log(`💡 Interests: ${result2.context.interests}`);
  
  // Scenario 3: Different user profile (MIT student)
  console.log('\n📧 SCENARIO 3: Another user with different profile');
  console.log('User ID: 2 (Priya Patel from MIT)');
  console.log('-'.repeat(50));
  
  const result3 = await generateEmailWithProfile(2, testConnection, options);
  console.log(`✅ ${result3.message}`);
  console.log(`📚 Background: ${result3.context.background}`);
  console.log(`🏆 Achievements: ${result3.context.achievements.join(', ')}`);
  console.log(`💡 Interests: ${result3.context.interests}`);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n🎉 MIGRATION BENEFITS DEMONSTRATED:');
  console.log('✅ Same code works for dev profile AND user profiles');
  console.log('✅ Graceful fallback for users without profiles');
  console.log('✅ Personalized experience for users with profiles');
  console.log('✅ Zero disruption to existing email generation logic');
  
  console.log('\n🔧 IMPLEMENTATION REQUIREMENTS:');
  console.log('• Database table: user_profiles (30 min)');
  console.log('• API endpoints: GET/PUT /profile (45 min)');
  console.log('• Email integration: ONE line change (5 min)');
  console.log('• Frontend forms: Profile management UI (2-3 hours)');
  
  console.log('\n🚀 ROLLOUT STRATEGY:');
  console.log('1. Deploy database + API (no user impact)');
  console.log('2. Add profile creation to onboarding (optional)');
  console.log('3. Gradually encourage profile completion');
  console.log('4. A/B test profile vs dev profile performance');
  
  console.log('\n💡 IMMEDIATE BENEFITS:');
  console.log('• Personalized emails increase response rates');
  console.log('• Users feel more authentic and confident');
  console.log('• Better matching of student background to opportunities');
  console.log('• Profile completion becomes a value-add feature');
}

// Run the demo
demonstrateMigration().catch(console.error); 