const { OpenAI } = require('openai');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Default user profile (hardcoded for now)
const DEFAULT_USER_PROFILE = {
  name: 'Amy Chen',
  university: 'Stanford University',
  major: 'Computer Science',
  graduationYear: '2025',
  currentRole: 'Student',
  interests: 'artificial intelligence, networking automation, tech entrepreneurship'
};

// Purpose-specific prompt templates
const PURPOSE_PROMPTS = {
  'informational-interview': {
    instruction: `You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You're interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email requesting a 15-20 minute informational interview.`,
    
    template: (connectionData, userProfile, options) => {
      const { full_name, company, job_title, industry, custom_connection_description, notes } = connectionData;
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
    }
  },

  'job-inquiry': {
    instruction: `You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You're interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email inquiring about potential job opportunities.`,
    
    template: (connectionData, userProfile, options) => {
      const { full_name, company, job_title, industry, custom_connection_description, notes } = connectionData;
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
    }
  },

  'industry-insights': {
    instruction: `You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You're interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional networking email seeking industry insights and advice.`,
    
    template: (connectionData, userProfile, options) => {
      const { full_name, company, job_title, industry, custom_connection_description, notes } = connectionData;
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
    }
  },

  'follow-up': {
    instruction: `You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You're interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional follow-up email.`,
    
    template: (connectionData, userProfile, options) => {
      const { full_name, company, job_title, industry, custom_connection_description, notes } = connectionData;
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
    }
  },

  'introduction': {
    instruction: `You are Amy Chen, a Computer Science student at Stanford University graduating in 2025. You're interested in artificial intelligence, networking automation, and tech entrepreneurship. Write a professional introduction email.`,
    
    template: (connectionData, userProfile, options) => {
      const { full_name, company, job_title, industry, custom_connection_description, notes } = connectionData;
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
    }
  }
};

// Helper function to adjust content based on length preference
const adjustContentLength = (content, length) => {
  switch (length) {
    case 'short':
      return content + '\n\nPlease keep the email concise and to the point - aim for 2-3 short paragraphs maximum.';
    case 'long':
      return content + '\n\nPlease make the email more detailed and comprehensive - include more context, background, and specific details.';
    case 'medium':
    default:
      return content + '\n\nPlease keep the email at a moderate length - detailed enough to be informative but concise enough to be respectful of their time.';
  }
};

// Helper function to map college-friendly options to AI service options
const mapCollegePurposeToAI = (purpose) => {
  const mapping = {
    'summer-internship': 'job-inquiry',
    'just-reaching-out': 'introduction', 
    'advice': 'industry-insights'
  };
  
  return mapping[purpose] || purpose;
};

const mapCollegeToneToAI = (tone) => {
  const mapping = {
    'enthusiastic': 'professional',
    'respectful': 'formal',
    'confident': 'professional'
  };
  
  return mapping[tone] || tone;
};

// Helper function to adjust tone
const adjustTone = (content, tone) => {
  // Map college-friendly tones to descriptions
  switch (tone) {
    case 'enthusiastic':
      return content + '\n\nUse an enthusiastic, energetic tone that shows genuine excitement while maintaining professionalism.';
    case 'respectful':
      return content + '\n\nUse a respectful, formal tone that shows proper deference and courtesy.';
    case 'confident':
      return content + '\n\nUse a confident, assertive tone that demonstrates self-assurance while remaining professional.';
    case 'casual':
      return content + '\n\nUse a friendly, conversational tone while maintaining professionalism.';
    case 'formal':
      return content + '\n\nUse a formal, traditional business tone with proper etiquette.';
    case 'professional':
    default:
      return content + '\n\nUse a professional but approachable tone.';
  }
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
      const delay = Math.pow(2, attempt - 1) * 1000;
      console.log(`OpenAI API attempt ${attempt} failed, retrying in ${delay}ms... Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
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
    
    // Get purpose-specific prompt
    const purposeConfig = PURPOSE_PROMPTS[aiPurpose];
    if (!purposeConfig) {
      throw new Error(`Unsupported purpose: ${options.purpose} (mapped to ${aiPurpose})`);
    }

    // Generate the prompt with mapped options
    const mappedOptions = { ...options, purpose: aiPurpose, tone: aiTone };
    let prompt = purposeConfig.template(connectionData, userProfile, mappedOptions);
    
    // Adjust for length and tone (use original options for tone descriptions)
    prompt = adjustContentLength(prompt, options.length);
    prompt = adjustTone(prompt, options.tone);

    // Call OpenAI API with retry logic
    const completion = await retryWithBackoff(async () => {
      return await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: purposeConfig.instruction
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7, // Balanced creativity and consistency
        presence_penalty: 0.1, // Slight penalty for repetition
        frequency_penalty: 0.1 // Slight penalty for common phrases
      });
    });

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
        job_title: connectionData.job_title
      },
      parameters: {
        purpose: options.purpose,
        tone: options.tone,
        length: options.length
      },
      tokens_used: completion.usage?.total_tokens || 0
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
    const promises = connectionsData.map(connection => 
      generateNetworkingEmail(connection, userProfile, options)
    );

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
          error: result.reason.message
        });
      }
    });

    return {
      successful,
      failed,
      total: connectionsData.length,
      success_count: successful.length,
      error_count: failed.length
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
    notes: 'Very knowledgeable about machine learning infrastructure'
  };

  const options = {
    purpose: 'informational-interview',
    tone: 'professional',
    length: 'medium'
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
  DEFAULT_USER_PROFILE
};