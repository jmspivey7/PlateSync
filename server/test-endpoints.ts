import { Express, Request, Response } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import { testSendGridConfiguration, sendCountReport } from './sendgrid';

export function setupTestEndpoints(app: Express) {
  // Test SendGrid configuration
  app.get('/api/test-sendgrid', isAuthenticated, async (_req: Request, res: Response) => {
    try {
      const result = await testSendGridConfiguration();
      
      if (result) {
        res.json({ 
          success: true, 
          message: 'SendGrid configuration test passed! Your API key is valid and working properly.' 
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: 'SendGrid configuration test failed. Check the server logs for detailed error information.'
        });
      }
    } catch (error: any) {
      console.error('Error testing SendGrid:', error);
      res.status(500).json({ 
        success: false, 
        message: `SendGrid test failed with error: ${error.message || 'Unknown error'}`
      });
    }
  });
  
  // Test Count Report Email
  app.get('/api/test-count-report', isAuthenticated, async (req: any, res: Response) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const recipients = await storage.getReportRecipients(userId);
      
      if (recipients.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No report recipients configured. Please add recipients in Settings.'
        });
      }
      
      // Send test email to the first recipient
      const recipient = recipients[0];
      console.log(`Testing count report email to ${recipient.email}`);
      
      const emailResult = await sendCountReport({
        to: recipient.email,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        churchName: user?.churchName || 'Your Church',
        batchName: 'Test Count',
        batchDate: new Date().toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        }),
        totalAmount: '1000.00',
        cashAmount: '600.00',
        checkAmount: '400.00',
        donationCount: 5
      });
      
      if (emailResult) {
        res.json({
          success: true,
          message: `Test count report email sent successfully to ${recipient.email}!`,
          recipient: recipient,
          user: {
            churchName: user?.churchName,
            emailNotificationsEnabled: user?.emailNotificationsEnabled
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Test count report email failed to send. Check server logs for details.',
          recipient: recipient
        });
      }
    } catch (error: any) {
      console.error("Error sending test count report:", error);
      res.status(500).json({ 
        success: false, 
        message: `Test count report failed with error: ${error.message || 'Unknown error'}`
      });
    }
  });
}