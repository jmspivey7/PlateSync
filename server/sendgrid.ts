import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
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
}

export async function sendEmail(
  params: EmailParams
): Promise<boolean> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn("Cannot send email: SENDGRID_API_KEY is not set");
    return false;
  }
  
  try {
    // We'll attempt to actually send the email in any environment (dev or prod)
    // But first show a preview in the console
    console.log('\n📧 ========== DONATION EMAIL PREVIEW ==========');
    console.log('📧 To:      ', params.to);
    console.log('📧 From:    ', params.from);
    console.log('📧 Subject: ', params.subject);
    
    // Show shortened text version for preview
    if (params.text) {
      console.log('\n📧 ----- TEXT VERSION PREVIEW -----');
      // Show first 20 lines or so of text content
      const textPreview = params.text.split('\n').slice(0, 15).join('\n');
      console.log(textPreview + '\n...(text continues)');
    }
    
    console.log('\n📧 HTML version would be displayed properly in email clients');
    console.log('📧 ============ END EMAIL PREVIEW ============\n');
    
    // In production, actually send the email
    await mailService.send({
      to: params.to,
      from: params.from,
      subject: params.subject,
      text: params.text || '',
      html: params.html || '',
    });
    
    console.log(`Email sent successfully to ${params.to}`);
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
}

export async function sendDonationNotification(params: DonationNotificationParams): Promise<boolean> {
  // Use a verified sender email from environment variables or fall back to a placeholder
  // Note: In production, you MUST set SENDGRID_FROM_EMAIL to a verified sender
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'donations@example.com';
  
  // Log information about the sender email configuration
  console.log('\n📧 Sender Email Configuration:');
  if (process.env.SENDGRID_FROM_EMAIL) {
    console.log(`📧 Using configured sender email: ${process.env.SENDGRID_FROM_EMAIL}`);
  } else {
    console.log('⚠️ Warning: SENDGRID_FROM_EMAIL environment variable is not set.');
    console.log('⚠️ Using fallback address, which may cause delivery failures in production.');
    console.log('⚠️ The sender email MUST be verified in your SendGrid account.');
  }
  
  const subject = `Thank You for Your Donation to ${params.churchName}`;
  
  // Plain text version of the email
  const text = `
Dear ${params.donorName},

Thank you for your donation of $${params.amount} on ${params.date} to ${params.churchName}.

Donation Details:
- Amount: $${params.amount}
- Date: ${params.date}
- Donation ID: #${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}

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
  
  // HTML version of the email with nicer formatting
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #2D3748; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">${params.churchName}</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Donation Receipt</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
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
          <td style="padding: 8px 0;">${Math.floor(Math.random() * 100000).toString().padStart(6, '0')}</td>
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
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated receipt from ${params.churchName} via PlateSync.</p>
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

interface WelcomeEmailParams {
  to: string;
  firstName: string;
  lastName: string;
  churchName: string;
  verificationToken: string;
  verificationUrl: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@platesync.com';
  
  const subject = `Welcome to PlateSync for ${params.churchName}`;
  
  // Plain text version of the email
  const text = `
Dear ${params.firstName} ${params.lastName},

Welcome to PlateSync! You have been added as a user for ${params.churchName}.

Please verify your email and set up your password by clicking the following link:
${params.verificationUrl}?token=${params.verificationToken}

This link will expire in 48 hours.

If you did not request this account, you can safely ignore this email.

Sincerely,
The PlateSync Team
  `;
  
  // HTML version of the email with nicer formatting
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #2D3748;">
  <!-- Header with Logo and Title -->
  <div style="background-color: #69ad4c; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="margin: 0; font-size: 24px;">PlateSync</h1>
    <p style="margin: 10px 0 0; font-size: 18px;">Welcome to ${params.churchName}</p>
  </div>
  
  <!-- Main Content -->
  <div style="background-color: #ffffff; padding: 30px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
    <p style="margin-top: 0;">Dear <strong>${params.firstName} ${params.lastName}</strong>,</p>
    
    <p>Welcome to PlateSync! You have been added as a user for <strong>${params.churchName}</strong>.</p>
    
    <p>To complete your account setup, please verify your email and create a password by clicking the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.verificationUrl}?token=${params.verificationToken}" 
         style="background-color: #69ad4c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
        Verify Email & Set Password
      </a>
    </div>
    
    <p>This link will expire in 48 hours for security reasons.</p>
    
    <p>Once verified, you'll be able to log in and access the PlateSync system to help manage donations for your church.</p>
    
    <p>If you did not request this account, you can safely ignore this email.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <!-- Footer -->
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
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
