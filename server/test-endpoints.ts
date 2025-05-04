import { Express, Request, Response } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import { testSendGridConfiguration, sendCountReport } from './sendgrid';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from './db';

export function setupTestEndpoints(app: Express) {
  // Check token endpoint for verification debugging
  app.get('/api/test-verification-token', async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          message: "Token is required"
        });
      }
      
      // Look up user with this token
      const users_with_token = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token));
      
      if (users_with_token.length === 0) {
        return res.json({
          success: false,
          message: "No user found with this token",
          tokenProvided: token
        });
      }
      
      const user = users_with_token[0];
      
      // Check if token is expired
      const now = new Date();
      const isExpired = user.passwordResetExpires && now > user.passwordResetExpires;
      
      return res.json({
        success: true,
        message: "User found with this token",
        userEmail: user.email,
        isExpired: isExpired,
        expiresAt: user.passwordResetExpires,
        tokenLength: token.length
      });
      
    } catch (error) {
      console.error("Error checking verification token:", error);
      return res.status(500).json({
        success: false,
        message: "Error checking token"
      });
    }
  });
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