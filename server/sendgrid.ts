import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email notifications will not be sent.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
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
    // For a development environment, log the email instead of sending it
    if (process.env.NODE_ENV === 'development') {
      console.log('\n📧 ========== DONATION EMAIL PREVIEW ==========');
      console.log('📧 To:      ', params.to);
      console.log('📧 From:    ', params.from);
      console.log('📧 Subject: ', params.subject);
      
      // Show shortened text version for development
      if (params.text) {
        console.log('\n📧 ----- TEXT VERSION PREVIEW -----');
        // Show first 20 lines or so of text content
        const textPreview = params.text.split('\n').slice(0, 15).join('\n');
        console.log(textPreview + '\n...(text continues)');
      }
      
      console.log('\n📧 HTML version would be displayed properly in email clients');
      console.log('📧 ============ END EMAIL PREVIEW ============\n');
      
      // In development, consider the email as "sent" successfully
      return true;
    }
    
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
    // Log detailed error information
    console.error('SendGrid email error:', error);
    
    // Provide more specific error logging based on common SendGrid errors
    if (error.response && error.response.body && error.response.body.errors) {
      error.response.body.errors.forEach((err: any) => {
        console.error('SendGrid error details:', err);
      });
    }
    
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
