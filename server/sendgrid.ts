import { MailService } from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { storage } from './storage';
import { format } from 'date-fns';
import { generateCountReportPDF } from './pdf-generator';

// Check for SendGrid API key and log status
console.log("\n📧 Initializing SendGrid email service...");

if (!process.env.SENDGRID_API_KEY) {
  console.warn("❌ SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
} else {
  // Mask API key for secure logging
  const apiKey = process.env.SENDGRID_API_KEY;
  const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`✅ SendGrid API Key found: ${maskedKey}`);
}

if (!process.env.SENDGRID_FROM_EMAIL) {
  console.warn("❌ SENDGRID_FROM_EMAIL environment variable is not set. Using fallback email which may cause delivery issues.");
} else {
  console.log(`✅ SendGrid sender email configured: ${process.env.SENDGRID_FROM_EMAIL}`);
}

// Initialize SendGrid Mail Service
const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  try {
    mailService.setApiKey(process.env.SENDGRID_API_KEY);
    console.log("✅ SendGrid API client initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing SendGrid client:", error);
  }
}

/**
 * Tests the SendGrid configuration by sending a test email
 * This function is useful for verifying that your SendGrid API key and configuration are working
 */
export async function testSendGridConfiguration(): Promise<boolean> {
  console.log('\n📧 Testing SendGrid Configuration...');
  
  // Check API key
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API Key is not set. Cannot proceed with testing.');
    return false;
  }
  
  // Log API key info (without revealing the full key)
  const apiKey = process.env.SENDGRID_API_KEY;
  const maskedKey = apiKey.substring(0, 4) + '...' + apiKey.substring(apiKey.length - 4);
  console.log(`📧 SendGrid API Key found: ${maskedKey}`);
  
  // Check for from email
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'donations@example.com';
  if (!process.env.SENDGRID_FROM_EMAIL) {
    console.log('⚠️ Warning: SENDGRID_FROM_EMAIL not set, using default value which may not work');
  } else {
    console.log(`📧 Using sender email: ${fromEmail}`);
  }
  
  try {
    console.log('📧 Attempting to send a test email...');
    
    // Create a simplified test message
    const result = await sendEmail({
      to: 'test@example.com', // This address won't receive anything, it's just for testing API connection
      from: fromEmail,
      subject: 'SendGrid API Test',
      text: 'This is a test message to verify SendGrid API connectivity.',
      html: '<p>This is a test message to verify SendGrid API connectivity.</p>'
    });
    
    if (result) {
      console.log('✅ SendGrid test successful! API connection is working.');
    } else {
      console.log('❌ SendGrid test failed. See error details above.');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Unexpected error during SendGrid test:', error);
    return false;
  }
}

interface EmailParams {
  to: string;
  from: string;
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

export async function sendEmail(
  params: EmailParams
): Promise<boolean> {
  // Always check for API key
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("⚠️ Cannot send email: SENDGRID_API_KEY is not set");
    return false;
  }
  
  // Ensure we have valid sender email
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || params.from;
  if (!fromEmail) {
    console.warn("⚠️ Cannot send email: No sender email provided");
    return false;
  }
  
  // Ensure we have valid recipient
  if (!params.to) {
    console.warn("⚠️ Cannot send email: No recipient email provided");
    return false;
  }
  
  // Set a unique ID for easier tracking in the logs
  const emailId = Math.random().toString(36).substring(2, 10);
  
  try {
    // Log a preview with the email ID for tracking
    console.log(`\n📧 [Email ${emailId}] ========== EMAIL PREVIEW ==========`);
    console.log(`📧 [Email ${emailId}] To:      `, params.to);
    console.log(`📧 [Email ${emailId}] From:    `, fromEmail);
    console.log(`📧 [Email ${emailId}] Subject: `, params.subject);
    
    // Show shortened text version for preview
    if (params.text) {
      console.log(`\n📧 [Email ${emailId}] ----- TEXT VERSION PREVIEW -----`);
      // Show first 20 lines or so of text content
      const textPreview = params.text.split('\n').slice(0, 10).join('\n');
      console.log(textPreview + '\n...(text continues)');
    }
    
    console.log(`\n📧 [Email ${emailId}] HTML version would be displayed properly in email clients`);
    
    // Show attachment info in preview
    if (params.attachments && params.attachments.length > 0) {
      console.log(`\n📧 [Email ${emailId}] ----- ATTACHMENTS -----`);
      params.attachments.forEach((attachment, index) => {
        console.log(`📧 [Email ${emailId}] Attachment ${index + 1}: ${attachment.filename} (${attachment.type})`);
      });
    }
    
    console.log(`📧 [Email ${emailId}] ============ END EMAIL PREVIEW ============`);
    
    // Prepare email data for sending
    const emailData: any = {
      to: params.to,
      from: fromEmail, // Use the verified sender
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    };
    
    // Add attachments if any
    if (params.attachments && params.attachments.length > 0) {
      console.log(`📧 [Email ${emailId}] Including ${params.attachments.length} attachments in the email`);
      emailData.attachments = params.attachments;
    }
    
    // Add tracking settings for better delivery metrics
    emailData.trackingSettings = {
      clickTracking: { enable: true },
      openTracking: { enable: true }
    };
    
    console.log(`📧 [Email ${emailId}] Sending email now...`);
    await mailService.send(emailData);
    
    console.log(`✅ [Email ${emailId}] Email sent successfully to ${params.to}`);
    return true;
  } catch (error: any) {
    // Log all error details for debugging
    console.error('\n⚠️ ========== SENDGRID ERROR ==========');
    console.error('Error sending email to:', params.to);
    console.error('Error summary:', error.message);
    
    // Log the full error object structure to inspect all available properties
    console.error('Full error structure:');
    try {
      console.error(JSON.stringify(error, null, 2));
    } catch (e) {
      console.error('Error could not be stringified:', error);
    }
    
    // Provide more specific error logging based on common SendGrid errors
    if (error.response && error.response.body && error.response.body.errors) {
      console.error('\nSendGrid API error details:');
      error.response.body.errors.forEach((err: any) => {
        console.error(`- Code: ${err.code}, Message: ${err.message}, Field: ${err.field || 'n/a'}`);
      });
    }
    
    // Check for common SendGrid issues
    if (error.code === 'ENOTFOUND') {
      console.error('Network error: Could not connect to SendGrid API server. Check your internet connection.');
    } else if (error.code === 'ETIMEDOUT') {
      console.error('Network error: Connection to SendGrid API timed out. The API might be down or unreachable.');
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Network error: Connection to SendGrid API was refused. Check firewall settings or API status.');
    }
    
    if (error.response && error.response.statusCode === 401) {
      console.error('Authentication error: Invalid API key or not authorized to use SendGrid API.');
    } else if (error.response && error.response.statusCode === 403) {
      console.error('Permission error: Your account does not have permission to send emails using SendGrid.');
    } else if (error.response && error.response.statusCode === 429) {
      console.error('Rate limit error: Too many requests to SendGrid API. You may have exceeded your plan limits.');
    }
    
    console.error('⚠️ ======= END SENDGRID ERROR =======\n');
    return false;
  }
}

interface DonationNotificationParams {
  to: string;
  amount: string;
  date: string;
  donorName: string;
  churchName: string;
  churchId: string;
  churchLogoUrl?: string;
  donationId?: string;
}

export async function sendDonationNotification(params: DonationNotificationParams): Promise<boolean> {
  // Use a verified sender email from environment variables or fall back to a placeholder
  // Note: In production, you MUST set SENDGRID_FROM_EMAIL to a verified sender
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'donations@example.com';
  
  // Generate unique ID for this donation notification for tracking
  const notificationId = Math.random().toString(36).substring(2, 8);
  
  // Log information about the donation notification
  console.log(`\n📧 [Donation-${notificationId}] Preparing donation receipt to ${params.donorName}`);
  console.log(`📧 [Donation-${notificationId}] Amount: $${params.amount}`);
  console.log(`📧 [Donation-${notificationId}] Recipient email: ${params.to}`);
  
  // Log information about the sender email configuration
  console.log(`📧 [Donation-${notificationId}] Sender Email Configuration:`);
  if (process.env.SENDGRID_FROM_EMAIL) {
    console.log(`📧 [Donation-${notificationId}] Using configured sender email: ${process.env.SENDGRID_FROM_EMAIL}`);
  } else {
    console.log(`⚠️ [Donation-${notificationId}] Warning: SENDGRID_FROM_EMAIL environment variable is not set.`);
    console.log(`⚠️ [Donation-${notificationId}] Using fallback address, which may cause delivery failures in production.`);
    console.log(`⚠️ [Donation-${notificationId}] The sender email MUST be verified in your SendGrid account.`);
  }

  // Generate a random donation ID if one is not provided
  const donationId = params.donationId || Math.floor(Math.random() * 100000).toString().padStart(6, '0');
  
  try {
    // Attempt to retrieve the donation confirmation template from the database
    const template = await storage.getEmailTemplateByType('DONATION_CONFIRMATION', params.churchId);
    
    if (template) {
      console.log('📧 Using custom donation confirmation template from database');
      
      // Replace template variables with actual values
      let subject = template.subject || `Thank You for Your Donation to ${params.churchName}`;
      let text = template.bodyText || '';
      let html = template.bodyHtml || '';
      
      // Initialize replacements with standard parameters
      const replacements: Record<string, string> = {
        '{{donorName}}': params.donorName,
        '{{amount}}': params.amount,
        '{{date}}': params.date,
        '{{churchName}}': params.churchName,
        '{{donationId}}': donationId,
      };
      
      // CRITICAL: ONLY use S3 URLs for logos in emails - NO EXCEPTIONS!
      let logoUrl = '';
      
      try {
        // Get the church logo URL directly from the database - this is the ONLY trusted source
        if (params.churchId) {
          console.log(`📧 [Donation-${notificationId}] STRICT: Getting S3 logo URL directly from database`);
          
          // Import here to avoid circular dependencies
          const { db } = await import('./db');
          const { churches } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          
          // Query the database directly for the S3 URL
          const [church] = await db.select().from(churches).where(eq(churches.id, params.churchId));
          
          if (church && church.logoUrl && church.logoUrl.includes('s3.amazonaws.com')) {
            // ONLY use the S3 URL from the database - no conversions
            logoUrl = church.logoUrl;
            console.log(`📧 [Donation-${notificationId}] SUCCESS: Using S3 URL from database: ${logoUrl}`);
          } else {
            // If no valid S3 URL in database, use NO LOGO (empty string)
            console.log(`📧 [Donation-${notificationId}] WARNING: No valid S3 URL in database, using NO LOGO`);
            logoUrl = '';
          }
        } else {
          // If no church ID, use NO LOGO (empty string)
          console.log(`📧 [Donation-${notificationId}] WARNING: No church ID provided, using NO LOGO`);
          logoUrl = '';
        }
        
        // CRITICAL: Never use Replit domain URLs in emails - they won't work
        if (logoUrl.includes('replit.app')) {
          console.log(`📧 [Donation-${notificationId}] ERROR: Found Replit domain URL - replacing with empty string`);
          logoUrl = '';
        }
      } catch (error) {
        console.error(`📧 [Donation-${notificationId}] ERROR getting logo from database:`, error);
        logoUrl = '';
      }
      
      // Add the logo URL to replacements
      replacements['{{churchLogoUrl}}'] = logoUrl;
      console.log(`📧 [Donation-${notificationId}] FINAL LOGO URL: ${logoUrl}`);
      
      // CRITICAL: Handle empty logo URL or ensure we show church name appropriately
      if (!logoUrl || logoUrl === '') {
        // Remove the image tag completely if no logo URL
        html = html.replace(/<img src="{{churchLogoUrl}}".*?>/g, '');
        
        // Add the church name prominently since we have no logo
        html = html.replace('<p style="margin: 10px 0 0; font-size: 20px; font-weight: bold;">Donation Receipt</p>', 
          `<h1 style="margin: 0; font-size: 28px; color: #2D3748;">${params.churchName}</h1>
           <p style="margin: 10px 0 0; font-size: 20px; font-weight: bold;">Donation Receipt</p>`);
      }
      
      // Apply all replacements to the template
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value || '');
        text = text.replace(new RegExp(key, 'g'), value || '');
        html = html.replace(new RegExp(key, 'g'), value || '');
      });
      
      return await sendEmail({
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      });
    } else {
      console.log('⚠️ No custom template found, using default donation confirmation template');
      
      // Default subject if no template found
      const subject = `Thank You for Your Donation to ${params.churchName}`;
      
      // Plain text version of the email (fallback)
      const text = `
Dear ${params.donorName},

Thank you for your donation of $${params.amount} on ${params.date} to ${params.churchName}.

Donation Details:
- Amount: $${params.amount}
- Date: ${params.date}
- Donation ID: #${donationId}

Your generosity makes a difference! Your contribution helps us:
- Support outreach programs in our community
- Maintain our facilities and services
- Fund special ministries and programs
- Continue our mission work

This donation confirmation serves as your official receipt for tax purposes.

We are grateful for your continued support and commitment to our church family.

Blessings,
${params.churchName}

--
This is an automated receipt from ${params.churchName} via PlateSync.
Please do not reply to this email. If you have any questions about your donation,
please contact the church office directly.
      `;
      
      // HTML version with template that properly handles church logo
      let html = '';
      
      // Use ONLY the S3 URL for logos in emails to avoid encoding/display issues
      let logoUrl = '';
      
      // Force use of S3 URL if available, no conversions or manipulations
      if (params.churchLogoUrl) {
        if (params.churchLogoUrl.includes('s3.amazonaws.com')) {
          // Use the S3 URL directly - no string manipulation needed
          logoUrl = params.churchLogoUrl;
          console.log(`📧 [DonationReceipt] Using clean S3 logo URL: ${logoUrl}`);
        } else {
          // We need to fetch the correct S3 URL from storage for this church
          try {
            // Extract church ID from the URL or params
            const churchId = params.churchId;
            
            if (churchId) {
              console.log(`📧 [DonationReceipt] Looking up correct S3 logo URL for church ${churchId}`);
              
              // Import here to avoid circular dependencies
              const { db } = await import('./db');
              const { churches } = await import('@shared/schema');
              const { eq } = await import('drizzle-orm');
              
              // Get the church record directly from the database to get the correct URL
              const [church] = await db.select().from(churches).where(eq(churches.id, churchId));
              
              if (church && church.logoUrl && church.logoUrl.includes('s3.amazonaws.com')) {
                logoUrl = church.logoUrl;
                console.log(`📧 [DonationReceipt] Found S3 logo URL in database: ${logoUrl}`);
              } else {
                console.log(`📧 [DonationReceipt] Could not find S3 URL in database, using fallback`);
                logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
              }
            } else {
              console.log(`📧 [DonationReceipt] No church ID available to look up correct logo URL`);
              logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
            }
          } catch (error) {
            console.error('📧 [DonationReceipt] Error looking up S3 logo URL:', error);
            // Use a default logo in case of error
            logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
          }
        }
      } else {
        // No logo URL provided, use default
        logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
        console.log(`📧 [DonationReceipt] No logo URL provided, using default PlateSync logo`);
      }
      
      console.log(`📧 [DonationReceipt] Final logo URL for email: ${logoUrl}`);
      
      
      if (params.churchLogoUrl) {
        // Version with church logo
        html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
  <!-- Header with Church Logo -->
  <div style="padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
    <img src="${logoUrl}" alt="${params.churchName} Logo" style="max-width: 375px; max-height: 120px;">
    <p style="margin: 20px 0 0; font-size: 18px; color: #2D3748; font-weight: 500;">Donation Receipt</p>
  </div>
        `;
      } else {
        // Version with just church name
        html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
  <!-- Header with Church Name -->
  <div style="padding: 25px; text-align: center; border-bottom: 1px solid #e2e8f0;">
    <h1 style="margin: 0; font-size: 28px; color: #2D3748;">${params.churchName}</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Donation Receipt</p>
  </div>
        `;
      }
      
      // Add the rest of the HTML content
      html += `
  <!-- Main Content -->
  <div style="padding: 30px;">
    <p style="margin-top: 0;">Dear <strong>${params.donorName}</strong>,</p>
    
    <p>Thank you for your generous donation to ${params.churchName}. Your support is a blessing to our church community and helps us continue our mission and ministry.</p>
    
    <!-- Donation Details Box -->
    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Donation Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #718096;">Amount:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">$${params.amount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Date:</td>
          <td style="padding: 8px 0;">${params.date}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Receipt #:</td>
          <td style="padding: 8px 0;">${donationId}</td>
        </tr>
      </table>
    </div>
    
    <p>Your contribution will help us:</p>
    <ul style="padding-left: 20px; line-height: 1.6;">
      <li>Support outreach programs and assistance to those in need</li>
      <li>Maintain our facilities and services for worship</li>
      <li>Fund special ministries and programs</li>
      <li>Continue our mission work in our community and beyond</li>
    </ul>
    
    <p>This email serves as your official receipt for tax purposes.</p>
    
    <p>We are grateful for your continued support and commitment to our church family.</p>
    
    <p style="margin-bottom: 0;">Blessings,<br>
    <strong>${params.churchName}</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border-top: 1px solid #e2e8f0;">
    <p style="margin: 0;">This is an automated receipt from ${params.churchName}.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email. If you have any questions about your donation, please contact the church office directly.</p>
  </div>
</div>
      `;
      
      return await sendEmail({
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      });
    }
  } catch (error) {
    console.error('Error preparing donation notification email:', error);
    return false;
  }
}

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  churchName: string;
  churchId: string;
  verificationToken: string;
  verificationUrl: string;
  role?: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  console.log('\n📧 Starting welcome email function...');
  
  // Check if SendGrid API key is set
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ SendGrid API key is not set! Cannot send welcome email.');
    return false;
  }
  
  // Get sender email from environment variable with fallback
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@platesync.com';
  console.log(`📧 Using sender email: ${fromEmail}`);
  console.log(`📧 Sending to: ${params.to}`);
  
  try {
    // Get specifically the Global Admin template with ID = 1
    console.log('📧 Looking for Global Admin welcome template with ID = 1');
    
    // Get the template directly by ID
    let template = await storage.getEmailTemplateById(1);
    
    if (template) {
      console.log(`📧 Found Global Admin welcome template with id: ${template.id}`);
    } else {
      console.log('📧 No Global Admin welcome template found');
    }
    
    // Additional debugging to see what we found
    if (template) {
      console.log(`📧 Found welcome template with id: ${template.id}`);
    }
    
    if (template) {
      console.log('📧 Using custom welcome template from database');
      
      // Replace template variables with actual values
      let subject = template.subject || `Welcome to ${params.churchName} on PlateSync`;
      let text = template.bodyText || '';
      let html = template.bodyHtml || '';
      
      // Replace template variables with both formats (old and new)
      const formattedUserRole = params.role === 'STANDARD_USER' ? 'Standard User' 
                              : params.role === 'ACCOUNT_OWNER' ? 'Account Owner' 
                              : params.role === 'USHER' ? 'Usher' 
                              : params.role === 'ADMIN' ? 'Administrator' 
                              : params.role || 'User';
                              
      const replacements: Record<string, string> = {
        '{{firstName}}': params.firstName,
        '{{lastName}}': params.lastName,
        '{{USER_NAME}}': `${params.firstName} ${params.lastName}`,
        '{{churchName}}': params.churchName,
        '{{CHURCH_NAME}}': params.churchName,
        '{{verificationUrl}}': params.verificationUrl,
        '{{verificationToken}}': params.verificationToken,
        '{{resetLink}}': `${params.verificationUrl}?token=${params.verificationToken}`,
        '{{USER_EMAIL}}': params.to,
        '{{USER_ROLE}}': params.role || 'User',
        '{{formattedUserRole}}': formattedUserRole,
        '{{userName}}': `${params.firstName} ${params.lastName}`,
      };
      
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value);
        text = text.replace(new RegExp(key, 'g'), value);
        html = html.replace(new RegExp(key, 'g'), value);
      });
      
      return await sendEmail({
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      });
    } else {
      // If no custom template found, use default template as fallback
      console.log('⚠️ No custom welcome template found, using fallback template');
      
      const subject = `Welcome to ${params.churchName} on PlateSync`;
      
      // Plain text version of the email
      const text = `
Hello ${params.firstName} ${params.lastName},

Welcome to ${params.churchName}'s PlateSync donation system!

Your account has been created and you're just one step away from accessing the system.

Please verify your email by clicking on the following link:
${params.verificationUrl}

This link will expire in 24 hours for security reasons.

If you did not request this account, please contact your administrator immediately.

Sincerely,
${params.churchName} Admin Team
      `;
      
      // HTML version that matches the app's UI - using green header with logo
      // Check if AWS S3 bucket is configured to use logo from there
      let plateSyncLogoUrl = '';
      if (process.env.AWS_S3_BUCKET) {
        plateSyncLogoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
        console.log(`📧 Using PlateSync logo from S3: ${plateSyncLogoUrl}`);
      } else {
        console.log('📧 AWS S3 bucket not configured for PlateSync logo');
      }
      
      const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    ${plateSyncLogoUrl ? 
      `<img src="${plateSyncLogoUrl}" alt="PlateSync" style="max-width: 200px; height: auto; margin-bottom: 15px;" />` : 
      `<h1 style="margin: 0; font-size: 24px;">PlateSync</h1>`}
    <p style="margin: 10px 0 0; font-size: 18px;">Welcome to ${params.churchName}</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Hello <strong>${params.firstName} ${params.lastName}</strong>,</p>
    
    <p>Welcome to ${params.churchName}'s PlateSync donation system! Your account has been created and you're just one step away from accessing the system.</p>
    
    <p>To complete your registration, please verify your email by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.verificationUrl}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Verify Email
      </a>
    </div>
    
    <p>This link will expire in 24 hours for security reasons.</p>
    
    <p>If you did not request this account, please contact your administrator immediately.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>${params.churchName} Admin Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from ${params.churchName} via PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
      `;
      
      return await sendEmail({
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      });
    }
  } catch (error) {
    console.error('Error preparing welcome email:', error);
    return false;
  }
}

interface PasswordResetEmailParams {
  to: string;
  resetUrl: string;  // Changed from resetLink to resetUrl to match existing code
  firstName?: string;
  lastName?: string;
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
  console.log('\n📧 Starting password reset email function...');
  
  // First try to get SendGrid settings from database (Global Admin settings)
  const dbApiKey = await storage.getSystemConfig('SENDGRID_API_KEY');
  const dbFromEmail = await storage.getSystemConfig('SENDGRID_FROM_EMAIL');
  
  // Use database values or fall back to environment variables
  const apiKey = dbApiKey || process.env.SENDGRID_API_KEY;
  const fromEmail = dbFromEmail || process.env.SENDGRID_FROM_EMAIL || 'noreply@platesync.com';
  
  // Check if SendGrid API key is available
  if (!apiKey) {
    console.error('❌ SendGrid API key is not set in Global Admin settings or environment! Cannot send password reset email.');
    return false;
  }
  
  console.log(`📧 Using sender email from Global Admin settings: ${fromEmail}`);
  console.log(`📧 Sending to: ${params.to}`);
  
  // We'll use direct SendGrid API approach for reliable email delivery
  let sendgridDirectMode = true;
  
  try {
    // First try to fetch the global admin password reset template from the database
    console.log('📧 Looking for global password reset template');
    // First get all password reset templates
    const allResetTemplates = await storage.getAllEmailTemplatesByType('PASSWORD_RESET');
    // Find the global admin template (has churchId = '0')
    const globalTemplate = allResetTemplates.find(t => t.churchId === '0');
    
    if (globalTemplate) {
      console.log('📧 Using global password reset template from Global Admin settings');
      
      // Format name for personalization
      const userName = params.firstName ? 
        `${params.firstName}${params.lastName ? ' ' + params.lastName : ''}` : 
        'Church Member';
      
      // Replace template variables with actual values
      let subject = globalTemplate.subject || 'Reset Your PlateSync Password';
      let text = globalTemplate.bodyText || '';
      let html = globalTemplate.bodyHtml || '';
      
      // Replace placeholder variables
      const replacements: Record<string, string> = {
        '{{userName}}': userName,
        '{{resetUrl}}': params.resetUrl,
        '{{recipientName}}': userName
      };
      
      // Apply all replacements
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value);
        text = text.replace(new RegExp(key, 'g'), value);
        html = html.replace(new RegExp(key, 'g'), value);
      });
      
      // Send the email using the template from Global Admin settings
      const emailSent = await sendEmail({
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      });
      
      if (emailSent) {
        console.log(`✅ Password reset email sent successfully to ${params.to}`);
      } else {
        console.error(`❌ Failed to send password reset email to ${params.to}`);
      }
      
      return emailSent;
    }
    
    // Fallback to default template if global template not found
    console.log('⚠️ Global password reset template not found, using default template');
    
    // Format name for personalization
    const userName = params.firstName ? 
      `${params.firstName}${params.lastName ? ' ' + params.lastName : ''}` : 
      'Church Member';
    
    const subject = 'Reset Your PlateSync Password';
    
    // Text version of the email
    const text = `
Hello ${userName},
      
We received a request to reset your password for PlateSync. If you did not make this request, please ignore this email.
      
To reset your password, please click on the link below:
${params.resetUrl}
      
This link will expire in 1 hour.
      
If you have any issues, please contact your church administrator.
      
Sincerely,
The PlateSync Team
    `;
    
    // HTML version of the email with PlateSync branding (logo and green color scheme)
    // Check if AWS S3 bucket is configured to use logo from there
    let plateSyncLogoUrl = '';
    if (process.env.AWS_S3_BUCKET) {
      plateSyncLogoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
      console.log(`📧 Using PlateSync logo from S3: ${plateSyncLogoUrl}`);
    } else {
      // Fallback to the app domain if S3 info not available
      plateSyncLogoUrl = 'https://plate-sync-jspivey.replit.app/assets/platesync-logo.png';
      console.log(`📧 Using PlateSync logo from app domain: ${plateSyncLogoUrl}`);
    }
    
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
  <div style="padding: 20px; text-align: center;">
    <img src="${plateSyncLogoUrl}" alt="PlateSync Logo" style="width: 270px; margin: 0 auto;">
  </div>
  
  <!-- Main Content -->
  <div style="padding: 0 30px 30px;">
    <p style="margin-top: 0;">Hello ${userName},</p>
    
    <p>We received a request to reset the password for your PlateSync account.</p>
    
    <p>To set a new password, please click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.resetUrl}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Reset Password
      </a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="word-break: break-all; background-color: #f8f9fa; padding: 10px; border-radius: 4px; font-size: 14px;">${params.resetUrl}</p>
    
    <p><strong>Note:</strong> This link will expire in 1 hour for security reasons.</p>
    
    <p>If you did not request a password reset, please ignore this email or contact your administrator if you have concerns.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
</div>
    `;
    
    // Send the email
    const emailSent = await sendEmail({
      to: params.to,
      from: fromEmail,
      subject,
      text,
      html
    });
    
    if (emailSent) {
      console.log(`✅ Password reset email sent successfully to ${params.to}`);
    } else {
      console.error(`❌ Failed to send password reset email to ${params.to}`);
    }
    
    return emailSent;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
}

interface CountReportParams {
  to: string;
  recipientName: string;
  churchName: string;
  batchName: string;
  batchDate: string;
  totalAmount: string;
  cashAmount: string;
  checkAmount: string;
  donationCount: number;
  churchId?: string;
  churchLogoUrl?: string;
  donations?: Array<{
    memberId: number | null;
    memberName: string;
    donationType: string;
    amount: string;
    checkNumber?: string;
    date?: string | Date;
    notes?: string;
  }>;
  date?: Date;         // Raw date object for formatting the PDF filename
  serviceOption?: string; // Service option for the filename
}

export async function sendCountReport(params: CountReportParams): Promise<boolean> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'reports@platesync.com';
  
  try {
    // Generate PDF attachment if donations are provided
    let pdfAttachment: any = null;
    
    if (params.donations && params.donations.length > 0) {
      console.log('Generating PDF attachment for count report...');
      
      // CRITICAL: Get the church logo directly from the database for PDF generation
      let churchLogoPath: string | undefined;
      let s3LogoUrl: string | undefined;
      
      // First try to get the logo directly from database if churchId is available
      if (params.churchId) {
        try {
          console.log(`📊 [CountReport] Fetching logo directly from database for church ID: ${params.churchId}`);
          
          // Import here to avoid circular dependencies
          const { db } = await import('./db');
          const { churches } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          
          // Get the church record directly to access the proper S3 URL
          const [church] = await db.select().from(churches).where(eq(churches.id, params.churchId));
          
          if (church && church.logoUrl && church.logoUrl.includes('s3.amazonaws.com')) {
            // Store the S3 URL for email template
            s3LogoUrl = church.logoUrl;
            console.log(`📊 [CountReport] Using S3 URL from database: ${s3LogoUrl}`);
            
            // Also extract filename for local PDF generation
            const parts = church.logoUrl.split('/logos/');
            if (parts.length > 1) {
              const filename = parts[1];
              churchLogoPath = path.join(process.cwd(), 'public', 'logos', filename);
              
              // Verify file exists locally
              if (fs.existsSync(churchLogoPath)) {
                console.log(`📊 [CountReport] Found local logo file at: ${churchLogoPath}`);
              } else {
                console.log(`📊 [CountReport] Local logo file not found at: ${churchLogoPath}`);
                churchLogoPath = undefined;
              }
            }
          }
        } catch (dbError) {
          console.error('📊 [CountReport] Error fetching logo from database:', dbError);
        }
      } 
      // Fallback to using provided URL if database fetch failed
      else if (params.churchLogoUrl) {
        try {
          // Store S3 URL for email template if it's already in S3 format
          if (params.churchLogoUrl.includes('s3.amazonaws.com')) {
            s3LogoUrl = params.churchLogoUrl;
            console.log(`📊 [CountReport] Using provided S3 URL: ${s3LogoUrl}`);
          }
          
          // Extract filename for local PDF generation
          let filename = '';
          if (params.churchLogoUrl.includes('/logos/')) {
            const parts = params.churchLogoUrl.split('/logos/');
            if (parts.length > 1) {
              filename = parts[1];
            }
          } else {
            const urlParts = params.churchLogoUrl.split('/');
            filename = urlParts[urlParts.length - 1];
          }
          
          // Look for the file locally
          if (filename) {
            churchLogoPath = path.join(process.cwd(), 'public', 'logos', filename);
            if (fs.existsSync(churchLogoPath)) {
              console.log(`📊 [CountReport] Found local logo file at: ${churchLogoPath}`);
            } else {
              console.log(`📊 [CountReport] Local logo file not found at: ${churchLogoPath}`);
              churchLogoPath = undefined;
            }
          }
        } catch (logoError) {
          console.error('📊 [CountReport] Error processing logo URL:', logoError);
          churchLogoPath = undefined;
        }
      }
      
      try {
        // Format date for filename
        const reportDate = params.date || new Date(params.batchDate);
        const dateForFilename = format(reportDate, 'yyyy-MM-dd');
        
        // Format the service option for filename
        const serviceOption = params.serviceOption || params.batchName;
        
        // Generate the PDF
        // IMPORTANT: We must ensure we only show EITHER the logo OR the name
        // Use a completely new approach - pass empty string for churchName when we have logo
        const pdfFilePath = await generateCountReportPDF({
          churchName: churchLogoPath ? '' : params.churchName, // Only use church name if no logo - use empty string
          churchLogoPath,
          date: reportDate,
          totalAmount: params.totalAmount,
          cashAmount: params.cashAmount, 
          checkAmount: params.checkAmount,
          donations: params.donations
        });
        
        console.log(`PDF generated successfully at: ${pdfFilePath}`);
        
        // Create attachment if PDF was generated successfully
        if (pdfFilePath && fs.existsSync(pdfFilePath)) {
          const fileContent = fs.readFileSync(pdfFilePath);
          const attachmentFilename = `${dateForFilename} - ${serviceOption} - Detail.pdf`;
          
          pdfAttachment = {
            content: fileContent.toString('base64'),
            filename: attachmentFilename,
            type: 'application/pdf',
            disposition: 'attachment'
          };
          
          console.log(`Created attachment: ${attachmentFilename}`);
          
          // Clean up the temporary file
          fs.unlinkSync(pdfFilePath);
          console.log(`Cleaned up temporary PDF file: ${pdfFilePath}`);
        }
      } catch (pdfError) {
        console.error('Error generating PDF attachment:', pdfError);
        // Continue without the attachment if there's an error
      }
    }
    
    // Generate CSV attachment with donation data
    let csvAttachment: any = null;
    
    if (params.donations && params.donations.length > 0) {
      console.log('Generating CSV attachment for count report...');
      
      // Format date for filename
      const reportDate = params.date || new Date(params.batchDate);
      const dateForFilename = format(reportDate, 'yyyy-MM-dd');
      
      try {
        // Create CSV content with headers
        let csvContent = 'Date,Donor Name,Member ID,Donation Type,Amount,Check Number,Notes\n';
        
        // Add a row for each donation
        params.donations.forEach(donation => {
          // Format date - note that donation.date could be undefined
          let donationDate = format(reportDate, 'MM/dd/yyyy'); // Default to batch date
          
          if (donation.date) {
            donationDate = donation.date instanceof Date 
              ? format(donation.date, 'MM/dd/yyyy')
              : format(new Date(donation.date), 'MM/dd/yyyy');
          }
          
          // Format member name - escape any commas in the name
          const memberName = donation.memberName ? `"${donation.memberName.replace(/"/g, '""')}"` : 'Anonymous';
          
          // Format donation type
          const donationType = donation.donationType || '';
          
          // Format amount
          const amount = donation.amount || '0.00';
          
          // Format check number (only for check donations)
          const checkNumber = donation.checkNumber || '';
          
          // Format notes - escape any commas or quotes in the notes
          const notes = donation.notes ? `"${donation.notes.replace(/"/g, '""')}"` : '';
          
          // Add the row to CSV content
          csvContent += `${donationDate},${memberName},${donation.memberId || ''},${donationType},${amount},${checkNumber},${notes}\n`;
        });
        
        // Create a temporary file for the CSV
        const tempDir = os.tmpdir();
        const csvFilePath = path.join(tempDir, `${dateForFilename}_finalized_count.csv`);
        fs.writeFileSync(csvFilePath, csvContent);
        
        console.log(`CSV generated successfully at: ${csvFilePath}`);
        
        // Create attachment
        const fileContent = fs.readFileSync(csvFilePath);
        csvAttachment = {
          content: fileContent.toString('base64'),
          filename: `${dateForFilename}_finalized_count.csv`,
          type: 'text/csv',
          disposition: 'attachment'
        };
        
        console.log(`Created CSV attachment: ${dateForFilename}_finalized_count.csv`);
        
        // Clean up the temporary file
        fs.unlinkSync(csvFilePath);
        console.log(`Cleaned up temporary CSV file: ${csvFilePath}`);
      } catch (csvError) {
        console.error('Error generating CSV attachment:', csvError);
        // Continue without the CSV attachment if there's an error
      }
    }
    
    // Attempt to retrieve the count report template from the database if a churchId is provided
    let template;
    if (params.churchLogoUrl) {
      const churchId = params.churchLogoUrl.split('/').pop()?.split('.')[0];
      if (churchId) {
        template = await storage.getEmailTemplateByType('COUNT_REPORT', churchId);
      }
    }
    
    if (template) {
      console.log('📧 Using custom count report template from database');
      
      // Replace template variables with actual values
      let subject = template.subject || `Count Report: ${params.batchName} - ${params.churchName}`;
      let text = template.bodyText || '';
      let html = template.bodyHtml || '';
      
      // Use ONLY the S3 URL for logos in emails to avoid encoding/display issues
      let logoUrl = '';
      
      // Force use of S3 URL if available, no conversions or manipulations
      if (params.churchLogoUrl) {
        if (params.churchLogoUrl.includes('s3.amazonaws.com')) {
          // Use the S3 URL directly - no string manipulation needed
          logoUrl = params.churchLogoUrl;
          console.log(`📧 [CountReport] Using clean S3 logo URL: ${logoUrl}`);
        } else {
          // We need to fetch the correct S3 URL from storage for this church
          try {
            // Extract church ID directly from params
            const churchId = params.churchId || '';
            
            if (churchId) {
              console.log(`📧 [CountReport] Looking up correct S3 logo URL for church ${churchId}`);
              
              // Import here to avoid circular dependencies
              const { db } = await import('./db');
              const { churches } = await import('@shared/schema');
              const { eq } = await import('drizzle-orm');
              
              // Get the church record directly from the database to get the correct URL
              const [church] = await db.select().from(churches).where(eq(churches.id, churchId));
              
              if (church && church.logoUrl && church.logoUrl.includes('s3.amazonaws.com')) {
                logoUrl = church.logoUrl;
                console.log(`📧 [CountReport] Found S3 logo URL in database: ${logoUrl}`);
              } else {
                console.log(`📧 [CountReport] Could not find S3 URL in database, using fallback`);
                logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
              }
            } else {
              console.log(`📧 [CountReport] No church ID available to look up correct logo URL`);
              logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
            }
          } catch (error) {
            console.error('📧 [CountReport] Error looking up S3 logo URL:', error);
            // Use a default logo in case of error
            logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
          }
        }
      } else {
        // No logo URL provided, use default
        logoUrl = `https://${process.env.AWS_S3_BUCKET}.s3.amazonaws.com/logos/platesync-logo.png`;
        console.log(`📧 [CountReport] No logo URL provided, using default PlateSync logo`);
      }
      
      console.log(`📧 [CountReport] Final logo URL for email: ${logoUrl}`);
      
      // Replace template variables
      const replacements: Record<string, string> = {
        '{{recipientName}}': params.recipientName,
        '{{churchName}}': params.churchName,
        '{{batchName}}': params.batchName,
        '{{batchDate}}': params.batchDate,
        '{{churchLogoUrl}}': logoUrl,
        '{{totalAmount}}': params.totalAmount,
        '{{cashAmount}}': params.cashAmount,
        '{{checkAmount}}': params.checkAmount,
        '{{donationCount}}': params.donationCount.toString(),
      };
      
      // Special handling for churchLogoUrl
      if (logoUrl) {
        // Include the church logo if available
        html = html.replace(/{{churchLogoUrl}}/g, logoUrl);
      } else {
        // If no logo, replace with a generic transparent 1px image to avoid broken image
        const fallbackImgSrc = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        html = html.replace(/{{churchLogoUrl}}/g, fallbackImgSrc);
        
        // Add CSS to hide the image when using the fallback
        html = html.replace(/<img\s+src="{{churchLogoUrl}}"/g, '<img src="{{churchLogoUrl}}" style="display:none;"');
      }
      
      Object.entries(replacements).forEach(([key, value]) => {
        subject = subject.replace(new RegExp(key, 'g'), value);
        text = text.replace(new RegExp(key, 'g'), value);
        html = html.replace(new RegExp(key, 'g'), value);
      });
      
      // Prepare email data with attachments
      const emailData: EmailParams = {
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      };
      
      // Add both PDF and CSV attachments if they were generated
      const attachments = [];
      if (pdfAttachment) attachments.push(pdfAttachment);
      if (csvAttachment) attachments.push(csvAttachment);
      
      if (attachments.length > 0) {
        emailData.attachments = attachments;
      }
      
      return await sendEmail(emailData);
    } else {
      console.log('⚠️ No custom template found, using default count report template');
      
      // Default subject
      const subject = `Count Report: ${params.batchName} - ${params.churchName}`;
      
      // Plain text version of the email
      const text = `
Dear ${params.recipientName},

A count has been finalized for ${params.churchName}, and a Detailed Count Report is attached to this email for your review.

Count Details:
- Count: ${params.batchName}
- Date: ${params.batchDate}
- Total Amount: $${params.totalAmount}
- Cash: $${params.cashAmount}
- Checks: $${params.checkAmount}
- Number of Donations: ${params.donationCount}

This report is automatically generated by PlateSync when a count is finalized after attestation.

Sincerely,
PlateSync Reporting System
      `;
      
      // HTML version with template that properly handles church logo
      let html = '';
      
      // CRITICAL: Get S3 URL directly from database for final count report email
      let s3LogoUrl = '';
      
      // Try to get church logo S3 URL from database (the ONLY reliable source)
      if (params.churchId) {
        try {
          console.log(`📊 [FinalCountReport] Getting S3 logo URL directly from database for church: ${params.churchId}`);
          
          // Import required modules
          const { db } = await import('./db');
          const { churches } = await import('@shared/schema');
          const { eq } = await import('drizzle-orm');
          
          // Get church record to access correct S3 URL
          const [church] = await db.select().from(churches).where(eq(churches.id, params.churchId));
          
          if (church && church.logoUrl && church.logoUrl.includes('s3.amazonaws.com')) {
            // ONLY use S3 URL from database
            s3LogoUrl = church.logoUrl;
            console.log(`📊 [FinalCountReport] SUCCESS: Using S3 URL from database: ${s3LogoUrl}`);
          } else {
            console.log(`📊 [FinalCountReport] WARNING: No valid S3 URL in database`);
          }
        } catch (error) {
          console.error(`📊 [FinalCountReport] ERROR: Failed to get logo from database:`, error);
        }
      }
      
      // Check if we have a valid S3 URL (ignore any non-S3 URLs completely)
      if (s3LogoUrl && s3LogoUrl.includes('s3.amazonaws.com')) {
        console.log(`📊 [FinalCountReport] Using S3 logo URL in email: ${s3LogoUrl}`);
        // Version with church logo - matching Donation Receipt clean style
        html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Church Logo (clean white style) -->
  <div style="padding: 25px; text-align: center; background-color: white; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0;">
    <img src="${s3LogoUrl}" alt="${params.churchName} Logo" style="max-width: 375px; max-height: 120px;">
    <h2 style="margin: 20px 0 0; font-size: 18px; color: #2D3748; font-weight: bold;">Final Count Report</h2>
  </div>
        `;
      } else {
        // Version with just church name
        html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Church Name (clean white style) -->
  <div style="padding: 25px; text-align: center; background-color: white; border-radius: 8px 8px 0 0; border: 1px solid #e2e8f0;">
    <h1 style="margin: 0; font-size: 24px; color: #2D3748;">${params.churchName}</h1>
    <h2 style="margin: 10px 0 0; font-size: 18px; color: #2D3748; font-weight: bold;">Final Count Report</h2>
  </div>
        `;
      }
      
      // Add the rest of the HTML content
      html += `
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>${params.recipientName}</strong>,</p>
    
    <p>A count has been finalized for <strong>${params.churchName}</strong>, and a <strong>Detailed Count Report</strong> is attached to this email for your review.</p>
    
    <!-- Count Details Box -->
    <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 25px 0;">
      <h2 style="margin-top: 0; color: #4299E1; font-size: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">Count Details</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; width: 40%; color: #718096;">Count:</td>
          <td style="padding: 8px 0; font-weight: bold;">${params.batchName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Date:</td>
          <td style="padding: 8px 0;">${params.batchDate}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Total Amount:</td>
          <td style="padding: 8px 0; font-weight: bold; color: #48BB78;">$${params.totalAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Cash:</td>
          <td style="padding: 8px 0;">$${params.cashAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Checks:</td>
          <td style="padding: 8px 0;">$${params.checkAmount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #718096;">Number of Donations:</td>
          <td style="padding: 8px 0;">${params.donationCount}</td>
        </tr>
      </table>
    </div>
    
    <p>This report is automatically generated by PlateSync when a count is finalized after attestation.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>PlateSync Reporting System</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated report from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
      `;
      
      // Prepare email data with attachments
      const emailData: EmailParams = {
        to: params.to,
        from: fromEmail,
        subject,
        text,
        html
      };
      
      // Add both PDF and CSV attachments if they were generated
      const attachments = [];
      if (pdfAttachment) attachments.push(pdfAttachment);
      if (csvAttachment) attachments.push(csvAttachment);
      
      if (attachments.length > 0) {
        emailData.attachments = attachments;
      }
      
      return await sendEmail(emailData);
    }
  } catch (error) {
    console.error('Error preparing count report email:', error);
    
    // Fallback to the default template
    const subject = `Count Report: ${params.batchName} - ${params.churchName}`;
    
    // Plain text version of the email
    const text = `
Dear ${params.recipientName},

A count has been finalized for ${params.churchName}, and a Detailed Count Report is attached to this email for your review.

Count Details:
- Count: ${params.batchName}
- Date: ${params.batchDate}
- Total Amount: $${params.totalAmount}
- Cash: $${params.cashAmount}
- Checks: $${params.checkAmount}
- Number of Donations: ${params.donationCount}

This report is automatically generated by PlateSync when a count is finalized after attestation.

Sincerely,
PlateSync Reporting System
    `;
    
    // Simple HTML version
    const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 5px;">
  <h1 style="color: #4a5568; text-align: center;">${params.churchName}</h1>
  <h2 style="color: #4a5568; text-align: center;">Final Count Report</h2>
  
  <p>Dear ${params.recipientName},</p>
  
  <p>A count has been finalized for ${params.churchName}, and a Detailed Count Report is attached to this email for your review.</p>
  
  <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 15px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #4299E1;">Count Details</h3>
    <p><strong>Count:</strong> ${params.batchName}</p>
    <p><strong>Date:</strong> ${params.batchDate}</p>
    <p><strong>Total Amount:</strong> $${params.totalAmount}</p>
    <p><strong>Cash:</strong> $${params.cashAmount}</p>
    <p><strong>Checks:</strong> $${params.checkAmount}</p>
    <p><strong>Number of Donations:</strong> ${params.donationCount}</p>
  </div>
  
  <p>This report is automatically generated by PlateSync when a count is finalized after attestation.</p>
  
  <p>Sincerely,<br>
  PlateSync Reporting System</p>
</div>
    `;
    
    // Prepare email data with attachments
    const emailData: EmailParams = {
      to: params.to,
      from: fromEmail,
      subject,
      text,
      html
    };
    
    // Add both PDF and CSV attachments if they were generated
    const attachments = [];
    let pdfAttachment: any = null; // Define the variable to avoid TypeScript errors
    let csvAttachment: any = null; // Define the variable to avoid TypeScript errors
    if (pdfAttachment) attachments.push(pdfAttachment);
    if (csvAttachment) attachments.push(csvAttachment);
    
    if (attachments.length > 0) {
      emailData.attachments = attachments;
    }
    
    return await sendEmail(emailData);
  }
}

