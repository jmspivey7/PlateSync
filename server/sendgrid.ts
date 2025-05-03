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
      console.log('📧 Would send email in production:');
      console.log('To:', params.to);
      console.log('From:', params.from);
      console.log('Subject:', params.subject);
      console.log('Text:', params.text?.substring(0, 100) + '...');
      
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
  
  const subject = `${params.churchName} - Your Donation Receipt`;
  
  const text = `
    Dear ${params.donorName},
    
    Thank you for your donation of $${params.amount} on ${params.date} to ${params.churchName}.
    
    Your continued support helps us serve our community and fulfill our mission.
    
    Sincerely,
    ${params.churchName}
  `;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2D3748; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">${params.churchName}</h1>
        <p style="margin-top: 10px;">Donation Receipt</p>
      </div>
      
      <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none;">
        <p>Dear ${params.donorName},</p>
        
        <p>Thank you for your generous donation of <strong style="color: #48BB78;">$${params.amount}</strong> 
        received on <strong>${params.date}</strong>.</p>
        
        <p>Your contribution helps us continue our mission and serve our community.</p>
        
        <p>Sincerely,<br>${params.churchName}</p>
      </div>
      
      <div style="background-color: #f7fafc; padding: 15px; font-size: 12px; color: #718096; text-align: center; border: 1px solid #e2e8f0; border-top: none;">
        <p>This is an automated message from PlateSync, please do not reply to this email.</p>
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
