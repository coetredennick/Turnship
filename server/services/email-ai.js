const { OpenAI } = require('openai');
const { DEV_USER_PROFILE, STATUS_CONTEXT_TEMPLATES, PURPOSE_FRAMEWORKS } = require('../config/dev-profile');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Enhanced user profile with comprehensive details
const DEFAULT_USER_PROFILE = DEV_USER_PROFILE;

// Purpose-specific prompt templates
const PURPOSE_PROMPTS = {
  'informational-interview': {
    instruction: 'You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You\'re interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email requesting a 15-20 minute informational interview.',

    template: (connectionData, userProfile, options) => {
      const {
        full_name, company, job_title, industry, custom_connection_description, notes,
      } = connectionData;
      const context = custom_connection_description || notes || '';

      return `Write a professional networking email from ${userProfile.name}, a ${userProfile.major} student at ${userProfile.university}, requesting a 15-20 minute informational interview with ${full_name} who works as ${job_title} at ${company} in the ${industry} industry.

Key details:
- Student graduating in ${userProfile.graduationYear}
- Interested in ${userProfile.interests}
- Context about the connection: ${context}
- Tone: ${options.tone}
- Length: ${options.length}

Requirements:
- Include a compelling subject line
- Be genuine and specific about why you're reaching out to this person
- Reference their specific role and company
- Show you've done research about their background
- Be respectful of their time
- Include a clear call-to-action
- ${context ? `Incorporate this context naturally: ${context}` : ''}
- Vary your language to sound natural and authentic
- Keep the ${options.tone} tone throughout

Format your response as:
SUBJECT: [subject line]

EMAIL:
[email body]`;
    },
  },

  'job-inquiry': {
    instruction: 'You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You\'re interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email inquiring about potential job opportunities.',

    template: (connectionData, userProfile, options) => {
      const {
        full_name, company, job_title, industry, custom_connection_description, notes,
      } = connectionData;
      const context = custom_connection_description || notes || '';

      return `Write a professional networking email from ${userProfile.name}, a ${userProfile.major} student at ${userProfile.university}, inquiring about potential job opportunities with ${full_name} who works as ${job_title} at ${company} in the ${industry} industry.

Key details:
- Student graduating in ${userProfile.graduationYear}
- Interested in ${userProfile.interests}
- Context about the connection: ${context}
- Tone: ${options.tone}
- Length: ${options.length}

Requirements:
- Include a compelling subject line
- Express genuine interest in the company and role
- Highlight relevant skills and experience
- Show knowledge of their company and industry
- Be specific about what type of opportunities you're seeking
- ${context ? `Incorporate this context naturally: ${context}` : ''}
- Vary your language to sound natural and authentic
- Keep the ${options.tone} tone throughout

Format your response as:
SUBJECT: [subject line]

EMAIL:
[email body]`;
    },
  },

  'industry-insights': {
    instruction: 'You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You\'re interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email seeking industry insights and advice.',

    template: (connectionData, userProfile, options) => {
      const {
        full_name, company, job_title, industry, custom_connection_description, notes,
      } = connectionData;
      const context = custom_connection_description || notes || '';

      return `Write a professional networking email from ${userProfile.name}, a ${userProfile.major} student at ${userProfile.university}, seeking industry insights and advice from ${full_name} who works as ${job_title} at ${company} in the ${industry} industry.

Key details:
- Student graduating in ${userProfile.graduationYear}
- Interested in ${userProfile.interests}
- Context about the connection: ${context}
- Tone: ${options.tone}
- Length: ${options.length}

Requirements:
- Include a compelling subject line
- Express genuine interest in their industry expertise
- Ask thoughtful questions about industry trends
- Show you've researched their background and company
- Be specific about what insights you're seeking
- ${context ? `Incorporate this context naturally: ${context}` : ''}
- Vary your language to sound natural and authentic
- Keep the ${options.tone} tone throughout

Format your response as:
SUBJECT: [subject line]

EMAIL:
[email body]`;
    },
  },

  'follow-up': {
    instruction: 'You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You\'re interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional follow-up email.',

    template: (connectionData, userProfile, options) => {
      const {
        full_name, company, job_title, industry, custom_connection_description, notes,
      } = connectionData;
      const context = custom_connection_description || notes || '';

      return `Write a professional follow-up email from ${userProfile.name}, a ${userProfile.major} student at ${userProfile.university}, to ${full_name} who works as ${job_title} at ${company} in the ${industry} industry.

Key details:
- Student graduating in ${userProfile.graduationYear}
- Interested in ${userProfile.interests}
- Context about the connection: ${context}
- Tone: ${options.tone}
- Length: ${options.length}

Requirements:
- Include a compelling subject line
- Reference your previous interaction or conversation
- Provide valuable updates or insights
- Show continued interest in maintaining the connection
- Include a clear next step or call-to-action
- ${context ? `Incorporate this context naturally: ${context}` : ''}
- Vary your language to sound natural and authentic
- Keep the ${options.tone} tone throughout

Format your response as:
SUBJECT: [subject line]

EMAIL:
[email body]`;
    },
  },

  introduction: {
    instruction: 'You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You\'re interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional introduction email.',

    template: (connectionData, userProfile, options) => {
      const {
        full_name, company, job_title, industry, custom_connection_description, notes,
      } = connectionData;
      const context = custom_connection_description || notes || '';

      return `Write a professional introduction email from ${userProfile.name}, a ${userProfile.major} student at ${userProfile.university}, introducing yourself to ${full_name} who works as ${job_title} at ${company} in the ${industry} industry.

Key details:
- Student graduating in ${userProfile.graduationYear}
- Interested in ${userProfile.interests}
- Context about the connection: ${context}
- Tone: ${options.tone}
- Length: ${options.length}

Requirements:
- Include a compelling subject line
- Provide a clear and engaging introduction
- Explain why you're reaching out to them specifically
- Show you've researched their background and company
- Express genuine interest in connecting
- ${context ? `Incorporate this context naturally: ${context}` : ''}
- Vary your language to sound natural and authentic
- Keep the ${options.tone} tone throughout

Format your response as:
SUBJECT: [subject line]

EMAIL:
[email body]`;
    },
  },
};

// Helper function to adjust content based on length preference
const adjustContentLength = (content, length) => {
  switch (length) {
    case 'short':
      return `${content}\n\nPlease keep the email concise and to the point - aim for 2-3 short paragraphs maximum.`;
    case 'long':
      return `${content}\n\nPlease make the email more detailed and comprehensive - include more context, background, and specific details.`;
    case 'medium':
    default:
      return `${content}\n\nPlease keep the email at a moderate length - detailed enough to be informative but concise enough to be respectful of their time.`;
  }
};

// Helper function to map college-friendly options to AI service options
const mapCollegePurposeToAI = (purpose) => {
  const mapping = {
    'summer-internship': 'job-inquiry',
    'just-reaching-out': 'introduction',
    advice: 'industry-insights',
  };

  return mapping[purpose] || purpose;
};

const mapCollegeToneToAI = (tone) => {
  const mapping = {
    enthusiastic: 'professional',
    respectful: 'formal',
    confident: 'professional',
  };

  return mapping[tone] || tone;
};

// Helper function to adjust tone
const adjustTone = (content, tone) => {
  // Map college-friendly tones to descriptions
  switch (tone) {
    case 'enthusiastic':
      return `${content}\n\nUse an enthusiastic, energetic tone that shows genuine excitement while maintaining professionalism.`;
    case 'respectful':
      return `${content}\n\nUse a respectful, formal tone that shows proper deference and courtesy.`;
    case 'confident':
      return `${content}\n\nUse a confident, assertive tone that demonstrates self-assurance while remaining professional.`;
    case 'casual':
      return `${content}\n\nUse a friendly, conversational tone while maintaining professionalism.`;
    case 'formal':
      return `${content}\n\nUse a formal, traditional business tone with proper etiquette.`;
    case 'professional':
    default:
      return `${content}\n\nUse a professional but approachable tone.`;
  }
};

// Helper function to determine current stage based on connection data
const determineCurrentStage = (connectionData) => {
  const { last_email_sent_date, last_email_draft } = connectionData;

  // If email has been sent, we're in "Email Sent" stage
  if (last_email_sent_date) {
    return 'Email Sent';
  }

  // If there's a draft saved, we're in "Draft Made" stage
  if (last_email_draft && last_email_draft.trim().length > 0) {
    return 'Draft Made';
  }

  // Otherwise, we're in "Not Started" stage
  return 'Not Started';
};

// Helper function to detect response type for "Response" status
const detectResponseType = (connectionData) => {
  const { custom_connection_description, notes } = connectionData;
  const content = (custom_connection_description || notes || '').toLowerCase();

  // Enhanced negative indicators (checked FIRST since negative responses often contain polite positive language)
  const negativeKeywords = [
    'not available', 'not interested', 'not a good fit', 'not the right time', 'not at this time',
    'busy', 'can\'t', 'cannot', 'unable', 'decline', 'pass',
    'thanks but', 'appreciate but', 'unfortunately', 'no thank you',
    'not looking', 'not currently', 'not right now', 'too busy',
    'can\'t make', 'won\'t be able', 'have to pass', 'will have to decline',
  ];

  // Enhanced positive indicators
  const positiveKeywords = [
    'yes', 'absolutely', 'definitely', 'interested', 'would love', 'sounds great',
    'happy to', 'excited', 'looking forward', 'let\'s schedule', 'let\'s meet',
    'coffee', 'lunch', 'call me', 'meeting', 'available for', 'free to',
    'works for me', 'perfect', 'great idea', 'love to chat',
  ];

  // Strong negative phrases (exact matches for common polite rejections)
  const negativeExactPhrases = [
    'thanks for reaching out, but',
    'appreciate your interest, but',
    'thank you for thinking of me, but',
    'i\'m flattered, but',
  ];

  // Check for exact negative phrases first
  if (negativeExactPhrases.some((phrase) => content.includes(phrase))) {
    console.log(`[Response Detection] Found exact negative phrase in: "${content}"`);
    return 'negative';
  }

  // Check for negative keywords (prioritized over positive)
  if (negativeKeywords.some((keyword) => content.includes(keyword))) {
    console.log(`[Response Detection] Found negative keyword in: "${content}"`);
    return 'negative';
  }

  // Check for positive response (only if no negative indicators found)
  if (positiveKeywords.some((keyword) => content.includes(keyword))) {
    console.log(`[Response Detection] Found positive keyword in: "${content}"`);
    return 'positive';
  }

  // Default to neutral
  console.log(`[Response Detection] No clear indicators, defaulting to neutral for: "${content}"`);
  return 'neutral';
};

// Helper function to get intelligent status context based on stage and sub-status
const getIntelligentStatusContext = (baseStatusContext, emailStatus, currentStage, connectionData) => {
  // Start with base context
  let intelligentContext = { ...baseStatusContext };

  // Apply stage-specific context if available
  if (baseStatusContext.stageContexts && baseStatusContext.stageContexts[currentStage]) {
    intelligentContext = {
      ...intelligentContext,
      ...baseStatusContext.stageContexts[currentStage],
    };
  }

  // Special handling for "Response" status with sub-type detection
  if (emailStatus === 'Response' && baseStatusContext.responseTypes) {
    const responseType = detectResponseType(connectionData);
    const responseTypeContext = baseStatusContext.responseTypes[responseType];

    if (responseTypeContext) {
      intelligentContext = {
        ...intelligentContext,
        ...responseTypeContext,
        responseType, // Add detected response type for reference
      };
    }
  }

  // Add stage information for reference
  intelligentContext.currentStage = currentStage;

  return intelligentContext;
};

// Retry wrapper function with exponential backoff for OpenAI API calls
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      // Don't retry on authentication or invalid request errors
      if (error.status === 401 || error.status === 400) {
        console.log(`OpenAI API error (no retry): ${error.status} - ${error.message}`);
        throw error;
      }

      // Don't retry on insufficient quota (billing issue)
      if (error.code === 'insufficient_quota' || error.code === 'invalid_api_key') {
        console.log(`OpenAI API error (no retry): ${error.code} - ${error.message}`);
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        console.log(`OpenAI API failed after ${maxRetries} attempts: ${error.message}`);
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = 2 ** (attempt - 1) * 1000;
      console.log(`OpenAI API attempt ${attempt} failed, retrying in ${delay}ms... Error: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

// Enhanced context builder for status-aware email generation with intelligent sub-status handling
const buildEnhancedContext = (connectionData, userProfile, options) => {
  const {
    full_name, company, job_title, industry, email_status, custom_connection_description, notes, last_email_sent_date,
  } = connectionData;

  // Get base status context
  const baseStatusContext = STATUS_CONTEXT_TEMPLATES[email_status] || STATUS_CONTEXT_TEMPLATES['Not Contacted'];

  // Determine current stage for intelligent context selection
  const currentStage = determineCurrentStage(connectionData);

  // Get intelligent status context based on stage and sub-status
  const statusContext = getIntelligentStatusContext(baseStatusContext, email_status, currentStage, connectionData);

  // Get purpose framework
  const purposeFramework = PURPOSE_FRAMEWORKS[options.purpose] || PURPOSE_FRAMEWORKS['just-reaching-out'];

  // Build rich context object
  return {
    // Connection details
    connection: {
      name: full_name,
      company: company || 'their company',
      role: job_title || 'their role',
      industry: industry || 'their industry',
      customDescription: custom_connection_description || notes || '',
      currentStatus: email_status || 'Not Contacted',
    },

    // Enhanced user profile context
    user: {
      ...userProfile,
      // Build achievement highlights for relevant context
      keyAchievements: userProfile.achievements.slice(0, 2).map((a) => `${a.title}${a.company ? ` at ${a.company}` : ''} - ${a.description}`),
      // Extract relevant technical skills
      relevantSkills: userProfile.technicalSkills.slice(0, 4).join(', '),
      // Format interests for natural language
      coreInterests: userProfile.interests.join(', '),
      personalHobbies: userProfile.personalInterests.slice(0, 2).join(' and '),
    },

    // Status-based messaging approach
    status: statusContext,

    // Purpose-driven conversation framework
    purpose: purposeFramework,

    // Generation preferences
    preferences: {
      tone: options.tone,
      length: options.length,
      formality: userProfile.communicationStyle.formality,
      personality: userProfile.communicationStyle.personality,
    },
  };
};

// Enhanced prompt template that uses rich context
const buildContextAwarePrompt = (context, aiPurpose) => {
  const {
    connection, user, status, purpose, preferences,
  } = context;

  return `You are ${user.name}, a ${user.year} ${user.major} student at ${user.university} graduating in ${user.graduationYear}. 

STUDENT BACKGROUND:
- Academic: ${user.gpa} GPA, relevant coursework in ${user.relevantCoursework.slice(0, 2).join(' and ')}
- Experience: ${user.keyAchievements.join('; ')}
- Technical Skills: ${user.relevantSkills}
- Interests: ${user.coreInterests}
- Personal: Enjoys ${user.personalHobbies}
- Unique Value: ${user.uniqueValue}

CONNECTION CONTEXT:
- Recipient: ${connection.name}${connection.role ? `, ${connection.role}` : ''}${connection.company ? ` at ${connection.company}` : ''}
- Industry: ${connection.industry}
- Relationship Status: ${connection.currentStatus}
- Connection Notes: ${connection.customDescription || 'No specific context provided'}

MESSAGING APPROACH (Based on Status):
- Approach: ${status.approach}
- Tone: ${status.tone}
- Context: ${status.context}
- Call to Action: ${status.callToAction}

PURPOSE FRAMEWORK (${purpose.primaryGoal}):
- Key Messages: ${purpose.keyMessages.join(', ')}
- Conversation Flow: ${purpose.conversationFlow.join(' → ')}

GENERATION PREFERENCES:
- Tone: ${preferences.tone}
- Length: ${preferences.length}
- Style: ${preferences.formality}, ${preferences.personality}

Generate a professional networking email that:
1. Uses the appropriate ${status.approach} approach for someone with ${connection.currentStatus} status
2. Incorporates relevant details from your background that connect to their ${connection.industry} work
3. Follows the ${purpose.primaryGoal} conversation framework
4. Maintains a ${preferences.tone} tone throughout
5. Includes a compelling subject line
6. ${status.context === 'first impression' ? 'Makes a strong first impression' : `Acknowledges ${status.context}`}
7. Ends with a ${status.callToAction}

Format your response as:
SUBJECT: [compelling subject line]

EMAIL:
[personalized email body]`;
};

// Core function to generate networking email
const generateNetworkingEmail = async (connectionData, userProfile = DEFAULT_USER_PROFILE, options) => {
  try {
    // Validate inputs
    if (!connectionData || !connectionData.full_name || !connectionData.email) {
      throw new Error('Connection data must include full_name and email');
    }

    if (!options || !options.purpose || !options.tone || !options.length) {
      throw new Error('Options must include purpose, tone, and length');
    }

    // Map college-friendly options to AI service options
    const aiPurpose = mapCollegePurposeToAI(options.purpose);
    const aiTone = mapCollegeToneToAI(options.tone);

    // Build enhanced context for status-aware generation
    const enhancedContext = buildEnhancedContext(connectionData, userProfile, options);

    // Generate context-aware prompt
    let prompt = buildContextAwarePrompt(enhancedContext, aiPurpose);

    // Adjust for length and tone (use original options for tone descriptions)
    prompt = adjustContentLength(prompt, options.length);
    prompt = adjustTone(prompt, options.tone);

    // Call OpenAI API with retry logic
    const completion = await retryWithBackoff(async () => await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert at writing personalized, professional networking emails for college students. Generate emails that are authentic, contextually appropriate, and relationship-stage aware. Use the provided context to create compelling, personalized outreach that builds genuine professional connections.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 1000,
      temperature: 0.7, // Balanced creativity and consistency
      presence_penalty: 0.1, // Slight penalty for repetition
      frequency_penalty: 0.1, // Slight penalty for common phrases
    }));

    const generatedContent = completion.choices[0].message.content.trim();

    // Parse the response to extract subject and body
    const subjectMatch = generatedContent.match(/SUBJECT:\s*(.+)/i);
    const emailMatch = generatedContent.match(/EMAIL:\s*([\s\S]+)/i);

    if (!subjectMatch || !emailMatch) {
      throw new Error('Failed to parse generated email format');
    }

    const subject = subjectMatch[1].trim();
    const body = emailMatch[1].trim();

    return {
      subject,
      body,
      generated_at: new Date().toISOString(),
      connectionId: connectionData.id,
      recipient: {
        name: connectionData.full_name,
        email: connectionData.email,
        company: connectionData.company,
        job_title: connectionData.job_title,
      },
      parameters: {
        purpose: options.purpose,
        tone: options.tone,
        length: options.length,
      },
      tokens_used: completion.usage?.total_tokens || 0,
    };
  } catch (error) {
    console.error('Error generating networking email:', error);

    // Handle specific OpenAI errors
    if (error.code === 'insufficient_quota') {
      throw new Error('OpenAI API quota exceeded. Please check your billing.');
    } else if (error.code === 'invalid_api_key') {
      throw new Error('Invalid OpenAI API key. Please check your configuration.');
    } else if (error.code === 'rate_limit_exceeded') {
      throw new Error('OpenAI API rate limit exceeded. Please try again later.');
    }

    // Add context about retry attempts for network or temporary errors
    if (error.status >= 500 || error.code === 'network_error' || error.code === 'timeout') {
      throw new Error(`Failed to generate email after retry attempts: ${error.message}`);
    }

    throw new Error(`Failed to generate email: ${error.message}`);
  }
};

// Batch generation function for multiple connections
const generateBatchEmails = async (connectionsData, userProfile = DEFAULT_USER_PROFILE, options) => {
  try {
    if (!Array.isArray(connectionsData) || connectionsData.length === 0) {
      throw new Error('Connections data must be a non-empty array');
    }

    // Generate emails for all connections
    const promises = connectionsData.map((connection) => generateNetworkingEmail(connection, userProfile, options));

    const results = await Promise.allSettled(promises);

    // Separate successful and failed generations
    const successful = [];
    const failed = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          connectionId: connectionsData[index].id,
          connectionName: connectionsData[index].full_name,
          error: result.reason.message,
        });
      }
    });

    return {
      successful,
      failed,
      total: connectionsData.length,
      success_count: successful.length,
      error_count: failed.length,
    };
  } catch (error) {
    console.error('Error in batch email generation:', error);
    throw new Error(`Batch generation failed: ${error.message}`);
  }
};

// Test function to verify AI service
const testAIService = async () => {
  const testConnection = {
    id: 1,
    full_name: 'John Doe',
    email: 'john.doe@techcorp.com',
    company: 'TechCorp',
    job_title: 'Senior Software Engineer',
    industry: 'Technology',
    custom_connection_description: 'Met at Stanford Tech Conference, interested in AI applications',
    notes: 'Very knowledgeable about machine learning infrastructure',
  };

  const options = {
    purpose: 'informational-interview',
    tone: 'professional',
    length: 'medium',
  };

  try {
    const result = await generateNetworkingEmail(testConnection, DEFAULT_USER_PROFILE, options);
    console.log('AI Service Test Result:', result);
    return result;
  } catch (error) {
    console.error('AI Service Test Failed:', error);
    throw error;
  }
};

module.exports = {
  generateNetworkingEmail,
  generateBatchEmails,
  testAIService,
  DEFAULT_USER_PROFILE,
};
