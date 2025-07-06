# SendGrid Email Integration Workflow

This guide explains how to implement SendGrid for sending password reset emails in a Replit application.

## Overview

SendGrid is a cloud-based email delivery service that provides reliable transactional email functionality. This workflow demonstrates how to:
- Set up SendGrid configuration
- Create a reusable email service
- Implement password reset email functionality
- Handle email templates and personalization

## Prerequisites

1. SendGrid account with API key
2. Verified sender email address in SendGrid
3. Node.js application with the following packages:
   ```bash
   npm install @sendgrid/mail
   ```

## Step 1: Environment Configuration

### Required Environment Variables
```env
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
```

### Optional: Database Configuration
Store SendGrid settings in your database for runtime configuration:
```typescript
// System configuration keys
SENDGRID_API_KEY
SENDGRID_FROM_EMAIL
```

## Step 2: Create Email Service Module

Create a dedicated email service file (`server/email-service.ts`):

```typescript
import { MailService } from '@sendgrid/mail';

// Initialize SendGrid
const mailService = new MailService();

// Email interface
interface EmailParams {
  to: string;
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

// Main email sending function
export async function sendEmail(params: EmailParams): Promise<boolean> {
  // Check for API key
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send email: SENDGRID_API_KEY is not set");
    return false;
  }

  // Set API key
  mailService.setApiKey(process.env.SENDGRID_API_KEY);

  // Use environment sender email if not provided
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || params.from;
  if (!fromEmail) {
    console.warn("Cannot send email: No sender email provided");
    return false;
  }

  // Validate recipient
  if (!params.to) {
    console.warn("Cannot send email: No recipient email provided");
    return false;
  }

  try {
    // Prepare email data
    const emailData: any = {
      to: params.to,
      from: fromEmail,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    };

    // Add attachments if provided
    if (params.attachments && params.attachments.length > 0) {
      emailData.attachments = params.attachments;
    }

    // Add tracking settings
    emailData.trackingSettings = {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    };

    // Send email
    await mailService.send(emailData);
    console.log(`Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    console.error('SendGrid Error:', error.message);
    
    // Extract specific error messages
    if (error.response && error.response.body && error.response.body.errors) {
      const errorMessages = error.response.body.errors.map(e => e.message).join(', ');
      console.error('Detailed errors:', errorMessages);
    }
    
    return false;
  }
}
```

## Step 3: Password Reset Email Function

Create a specific function for password reset emails:

```typescript
interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;
  firstName?: string;
  lastName?: string;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
  // Get configuration (from database or environment)
  const apiKey = await getSystemConfig('SENDGRID_API_KEY') || process.env.SENDGRID_API_KEY;
  const fromEmail = await getSystemConfig('SENDGRID_FROM_EMAIL') || process.env.SENDGRID_FROM_EMAIL;

  if (!apiKey) {
    console.error('SendGrid API key is not configured');
    return false;
  }

  // Format user name
  const userName = params.firstName ? 
    `${params.firstName}${params.lastName ? ' ' + params.lastName : ''}` : 
    'User';

  // Email subject
  const subject = 'Reset Your Password';

  // Plain text version
  const text = `
Hello ${userName},

We received a request to reset your password.

To reset your password, please visit: ${params.resetUrl}

This link will expire in 1 hour for security reasons.

If you did not request a password reset, please ignore this email.

Best regards,
Your App Team
  `;

  // HTML version with styling
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
  <!-- Header -->
  <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
    <h1 style="color: #333; margin: 0;">Password Reset</h1>
  </div>
  
  <!-- Main Content -->
  <div style="padding: 30px;">
    <p style="margin-top: 0;">Hello ${userName},</p>
    
    <p>We received a request to reset the password for your account.</p>
    
    <p>To set a new password, please click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.resetUrl}" 
         style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 14px;">${params.resetUrl}</p>
    
    <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
    
    <p>If you did not request a password reset, please ignore this email.</p>
    
    <p style="margin-bottom: 0;">Best regards,<br>
    <strong>Your App Team</strong></p>
  </div>
</div>
  `;

  // Send the email
  return await sendEmail({
    to: params.to,
    from: fromEmail,
    subject,
    text,
    html
  });
}
```

## Step 4: Email Template System (Advanced)

For more flexibility, implement a template system:

```typescript
interface EmailTemplate {
  id: number;
  templateType: 'PASSWORD_RESET' | 'WELCOME' | 'NOTIFICATION';
  subject: string;
  bodyHtml: string;
  bodyText: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function sendTemplatedEmail(
  templateType: string,
  recipient: string,
  variables: Record<string, string>
): Promise<boolean> {
  // Get template from database
  const template = await getEmailTemplate(templateType);
  
  if (!template) {
    console.error(`Email template ${templateType} not found`);
    return false;
  }

  // Replace template variables
  let subject = template.subject;
  let text = template.bodyText;
  let html = template.bodyHtml;

  // Apply variable replacements
  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value);
    text = text.replace(new RegExp(placeholder, 'g'), value);
    html = html.replace(new RegExp(placeholder, 'g'), value);
  });

  return await sendEmail({
    to: recipient,
    subject,
    text,
    html
  });
}
```

## Step 5: Integration in Routes

Use the email service in your API routes:

```typescript
import { sendPasswordResetEmail } from './email-service';

// Password reset endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user by email
    const user = await findUserByEmail(email);
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    // Generate reset token
    const resetToken = generateSecureToken();
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
    
    // Save token to database with expiration
    await savePasswordResetToken(user.id, resetToken, new Date(Date.now() + 3600000)); // 1 hour

    // Send email
    const emailSent = await sendPasswordResetEmail({
      to: user.email,
      resetUrl,
      firstName: user.firstName,
      lastName: user.lastName
    });

    if (emailSent) {
      res.json({ message: 'Password reset email sent successfully' });
    } else {
      res.status(500).json({ message: 'Failed to send password reset email' });
    }
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
```

## Step 6: Error Handling and Logging

Implement comprehensive error handling:

```typescript
function logEmailActivity(type: string, recipient: string, success: boolean, error?: string) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    recipient,
    success,
    error
  };
  
  console.log(`Email Activity: ${JSON.stringify(logEntry)}`);
  
  // Optionally save to database for audit trail
  // await saveEmailLog(logEntry);
}

// Enhanced email function with logging
export async function sendEmailWithLogging(params: EmailParams): Promise<boolean> {
  const success = await sendEmail(params);
  
  logEmailActivity(
    'transactional',
    params.to,
    success,
    success ? undefined : 'Send failed'
  );
  
  return success;
}
```

## Step 7: Testing Setup

Create a test endpoint for verifying email functionality:

```typescript
// Test email endpoint (only in development)
app.post('/api/test-email', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  const { email } = req.body;
  
  const testEmailSent = await sendPasswordResetEmail({
    to: email,
    resetUrl: 'https://example.com/test-reset',
    firstName: 'Test',
    lastName: 'User'
  });

  res.json({ 
    success: testEmailSent,
    message: testEmailSent ? 'Test email sent' : 'Failed to send test email'
  });
});
```

## Best Practices

### Security
- Always validate email addresses
- Use verified sender domains
- Implement rate limiting for email endpoints
- Log email activities for audit purposes

### Reliability
- Handle SendGrid API errors gracefully
- Implement retry logic for failed sends
- Use both HTML and text versions
- Test emails in different clients

### Performance
- Use templates to avoid regenerating content
- Cache email templates in memory
- Implement background job processing for bulk emails

### Monitoring
- Track email delivery rates
- Monitor API usage and limits
- Set up alerts for failed sends
- Log all email activities

## Environment Variables Summary

```env
# Required
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

# Optional
NODE_ENV=development
```

## Common Issues and Solutions

1. **"Forbidden" errors**: Check sender email verification in SendGrid
2. **API key errors**: Ensure API key has proper permissions
3. **Template variables not replacing**: Check variable naming and escaping
4. **Emails going to spam**: Use authenticated domains and proper content

This workflow provides a robust foundation for implementing SendGrid email functionality in any Replit application.