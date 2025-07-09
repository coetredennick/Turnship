const { google } = require('googleapis');

// Development Gmail API service using hardcoded tokens
class GmailDevService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    // Set credentials from environment variables
    this.oauth2Client.setCredentials({
      access_token: process.env.DEV_ACCESS_TOKEN,
      refresh_token: process.env.DEV_REFRESH_TOKEN,
    });
    
    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // Get user's Gmail profile
  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Gmail getProfile error:', error);
      throw error;
    }
  }

  // List messages with optional query
  async listMessages(query = '', maxResults = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: maxResults,
      });
      return response.data;
    } catch (error) {
      console.error('Gmail listMessages error:', error);
      throw error;
    }
  }

  // Get a specific message
  async getMessage(messageId) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      return response.data;
    } catch (error) {
      console.error('Gmail getMessage error:', error);
      throw error;
    }
  }

  // Send an email
  async sendEmail(to, subject, body) {
    try {
      const message = [
        `To: ${to}`,
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const encodedMessage = Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Gmail sendEmail error:', error);
      throw error;
    }
  }

  // Get user's labels
  async getLabels() {
    try {
      const response = await this.gmail.users.labels.list({ userId: 'me' });
      return response.data;
    } catch (error) {
      console.error('Gmail getLabels error:', error);
      throw error;
    }
  }

  // Search for emails with networking keywords
  async searchNetworkingEmails() {
    const queries = [
      'subject:networking',
      'subject:introduction',
      'subject:connect',
      'subject:follow up',
      'subject:meeting'
    ];
    
    try {
      const results = [];
      for (const query of queries) {
        const messages = await this.listMessages(query, 5);
        if (messages.messages) {
          results.push(...messages.messages);
        }
      }
      return { messages: results };
    } catch (error) {
      console.error('Gmail searchNetworkingEmails error:', error);
      throw error;
    }
  }
}

module.exports = GmailDevService;