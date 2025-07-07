# **Product Requirements Document: "Turnship"**

**Version:** 2.2

**Date:** July 7, 2025

**Author:** Gemini

**Status:** Draft

## **1\. Introduction**

Turnship is a mobile and web application designed to empower college students to streamline and automate their professional networking efforts. In the competitive landscape of internships and job applications, students often struggle to manage outreach, track conversations, and maintain momentum. Turnship addresses this by integrating with a user's existing email and professional networking accounts (like LinkedIn, Gmail, and Handshake) to automate personalized email campaigns, track connection statuses in real-time, and provide actionable insights into their networking effectiveness. By simplifying the operational side of networking, Turnship allows students to focus on building meaningful professional relationships.

## **2\. Guiding Principles**

* **Empowerment through Automation:** Free up students' time and mental energy by automating repetitive networking tasks.  
* **Actionable Insights:** Provide clear, data-driven feedback to help users improve their networking strategies.  
* **Seamless Integration:** Fit naturally into a student's existing workflow by integrating with the tools they already use.  
* **User-Centric Design:** Create an intuitive and supportive user experience that reduces the stress of networking.  
* **Privacy and Security First:** Ensure user data is handled with the utmost care and transparency.

## **3\. User Personas**

### **Primary Persona: "Ambitious Amy"**

* **Demographics:** 20-year-old, 3rd-year university student majoring in Finance.  
* **Goals:**  
  * Secure a competitive summer internship at a top investment bank.  
  * Build a strong professional network before graduation.  
  * Efficiently manage her time between academics, extracurriculars, and job hunting.  
* **Frustrations:**  
  * Feels overwhelmed by the number of people she needs to contact.  
  * Loses track of who she has emailed, when she should follow up, and what the outcome was.  
  * Spends too much time writing and personalizing individual emails.  
  * Isn't sure if her networking emails are effective.

## **4\. Features**

### **4.1. User Onboarding and Account Integration**

* **Description:** A simple and secure onboarding process that allows users to connect their Gmail, LinkedIn, and Handshake accounts.  
* **User Story:** As Ambitious Amy, I want to quickly sign up for Turnship and link my Gmail, LinkedIn, and Handshake accounts so the app can access my contacts, monitor my networking emails, and see job postings.  
* **Requirements:**  
  * OAuth 2.0 for secure and easy login with Google.  
  * API integration with LinkedIn for contact import (with user permission).  
  * API integration with Handshake for importing job applications and contacts.  
  * Clear explanation of what data will be accessed and why.

### **4.2. Automated Email Generation**

* **Description:** An intelligent email generator that creates personalized outreach and follow-up emails.  
* **User Story:** As Ambitious Amy, I want to generate a personalized email to a specific contact by providing a few key details, so I don't have to write it from scratch.  
* **Requirements:**  
  * A user-friendly form for generating an email with fields for:  
    * **Goal:** (e.g., Internship, Informational Interview)  
    * **Company Sector:** (e.g., Banking, Tech, Consulting)  
    * **Email Length:** (e.g., Short, Medium, Long)  
    * **Recipient Name and Company:** (auto-populated from contacts or manually entered)  
  * The app will use this information to generate a preview of the email.  
  * The user can edit the generated email before sending it directly from the app.  
  * Emails will be sent from the user's connected Gmail account.

### **4.3. Connection Tracking and Management**

* **Description:** A centralized dashboard to track the status of every networking connection.  
* **User Story:** As Ambitious Amy, I want to see all of my networking connections in one place, with their current status, so I can easily manage my outreach efforts.  
* **Requirements:**  
  * A dashboard view of all connections with the following information:  
    * Contact Name  
    * Company  
    * Date of Last Contact  
    * **Status:** (e.g., No Response, Responded \- Interested, Responded \- Not Interested, Informational Interview Scheduled, Offer Extended, Rejected)  
  * Users can manually update the status of a connection.  
  * The dashboard should be searchable and filterable.

### **4.4. Real-time Email Monitoring and Status Updates**

* **Description:** The app will automatically monitor the user's connected email account for replies and update the status of connections.  
* **User Story:** As Ambitious Amy, I want the app to automatically update a connection's status when they reply to my email, so I don't have to do it manually.  
* **Requirements:**  
  * The app will have read-only access to the user's inbox to scan for replies from networking contacts.  
  * Sentiment analysis will be used to automatically categorize replies (e.g., positive, negative, neutral) and suggest a status update.  
  * Keyword and phrase detection will identify key information (e.g., "let's schedule a call," "not the right fit right now").  
  * The user will be notified of the suggested status change and can confirm or override it.

### **4.5. Email Templates**

* **Description:** A library of pre-written email templates for various networking scenarios.  
* **User Story:** As Ambitious Amy, I want access to proven email templates for different situations, like following up after no response or responding to a rejection, so I can communicate professionally and effectively.  
* **Requirements:**  
  * A library of templates for different stages of the networking process:  
    * First Impression  
    * Follow-up (after no response)  
    * 2nd Follow-up  
    * Response to a "Yes"  
    * Response to a "No"  
    * Thank You After an Interview  
  * Templates can be categorized by industry/sector.  
  * Users can save and customize their own templates.

### **4.6. Configurable Outreach Approach**

* **Description:** Allows users to select their desired level of automation for outreach campaigns, providing flexibility and control.  
* **User Story:** As a new user, I want to start with a manual approach to get comfortable, but then switch to a more automated approach as I get busier, so the app can adapt to my needs.  
* **Requirements:**  
  * A settings panel where users can choose their default outreach mode:  
    * **Fully Manual:** The user writes/edits all emails and manually clicks send for each one. The app's role is primarily tracking and analytics.  
    * **Semi-Automated (Approve and Send):** The app generates emails based on templates and contact info, but the user must approve each email before it is sent.  
    * **Fully Automated:** The user defines a campaign (e.g., target industry, number of contacts). The app sends initial and follow-up emails based on predefined rules, only notifying the user of positive replies or when manual intervention is needed.

### **4.7. Content Bank (Pitches & Resume)**

* **Description:** A personal library for users to store, manage, and quickly insert reusable content like elevator pitches and their resume into emails.  
* **User Story:** As Ambitious Amy, I want to save my various elevator pitches and my resume in the app, so I can easily insert the right one for a specific company without having to re-type it or search for the file every time.  
* **Requirements:**  
  * A dedicated "Content Bank" section in the user's profile.  
  * Ability to create, edit, and save multiple text snippets (e.g., "Finance Pitch," "Tech Pitch").  
  * An option to upload and store a primary resume (e.g., PDF format).  
  * A simple "Insert" or "Embed" button within the email composer to add saved pitches or link to the resume.

### **4.8. File Attachments**

* **Description:** Allows users to attach files, such as custom pitch decks or project portfolios, to outgoing emails.  
* **User Story:** As Ambitious Amy, I want to attach my custom pitch deck to an email for a startup I'm really interested in, so I can showcase my specific skills and stand out from other applicants.  
* **Requirements:**  
  * An "Attach File" button in the email composer.  
  * Support for common file types (PDF, DOCX, PPTX, JPG, PNG).  
  * A reasonable file size limit (e.g., 10MB) per email.  
  * Files are attached directly to the email sent via the user's connected Gmail account.

## **5\. Design and UX Requirements**

* **UI:** Clean, modern, and professional. The interface should be intuitive and easy to navigate.  
* **UX:** The user journey should be seamless, from onboarding to sending emails and tracking connections. The app should feel supportive and empowering, not overwhelming.  
* **Mobile-First:** The app should be designed for a mobile-first experience, with a responsive web app for desktop use.

## **6\. Technical Requirements**

* **Frontend:** React Native for a cross-platform mobile app, and React for the web app.  
* **Backend:** Node.js with Express.  
* **Database:** MongoDB or PostgreSQL.  
* **APIs:**  
  * Google API for Gmail integration.  
  * LinkedIn API for contact integration.  
  * Handshake API for job/internship postings and university-specific networking.  
* **NLP/Sentiment Analysis:** A service like Google Cloud Natural Language API or a similar library.  
* **Hosting:** Replit (for initial development and deployment).

## **7\. Future Considerations (Post-MVP)**

* **Advanced Analytics:** Provide users with more detailed analytics on their networking efforts, such as open rates, reply rates, and conversion rates by industry or email template.  
* **Calendar Integration:** Integrate with Google Calendar to automatically schedule informational interviews and follow-ups.  
* **"Smart" Follow-up Suggestions:** The app could suggest the best time to send a follow-up email based on industry best practices or user data.  
* **Gamification:** Introduce elements of gamification to motivate users and help them build consistent networking habits.  
* **Contact Intelligence Briefing:** Before a scheduled meeting, the app could generate a one-page summary of the contact, including their recent LinkedIn activity, company news, and shared interests to help the user prepare.  
* **"Nurture" Mode for Connections:** Allows a user to move a successful connection into a "nurture" category, where the app provides periodic reminders to re-engage and maintain the long-term relationship.

## **8\. Success Metrics**

* **User Engagement:**  
  * Daily Active Users (DAU) / Monthly Active Users (MAU)  
  * Number of emails sent per user per week.  
  * Number of connections tracked per user.  
* **Conversion Rate:**  
  * Percentage of users who connect their email and LinkedIn accounts.  
  * Percentage of tracked connections that result in a positive outcome (e.g., informational interview, job offer).  
* **User Satisfaction:**  
  * App Store/Play Store ratings.  
  * Net Promoter Score (NPS).