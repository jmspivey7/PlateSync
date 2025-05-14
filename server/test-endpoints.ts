import { Express, Request, Response } from 'express';
import { isAuthenticated } from './replitAuth';
import { storage } from './storage';
import { testSendGridConfiguration, sendCountReport } from './sendgrid';
import { users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { db } from './db';
import crypto from 'crypto';

export function setupTestEndpoints(app: Express) {
  // DELETE Test User endpoint - allows cleaning up test user data
  app.delete('/api/dev/delete-test-user', async (req, res) => {
    try {
      const email = req.query.email as string;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email parameter is required"
        });
      }
      
      console.log(`Attempting to delete test user with email: ${email}`);
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found with this email"
        });
      }
      
      // Get all relationships for this user
      const userId = user.id;
      console.log(`Found user with ID: ${userId}`);
      
      // Use a transaction to ensure all deletions happen together
      try {
        await db.transaction(async (tx) => {
          console.log("Starting transaction for test user deletion");
          
          // 1. Delete subscriptions related to this user's church
          // Note: this uses CASCADE for churchId -> churches.id
          console.log("Cleaning up subscriptions...");
          await tx.execute(
            sql`DELETE FROM subscriptions WHERE church_id = ${userId}`
          );
          
          // 2. Delete batches and their dependencies (donations)
          console.log("Cleaning up batches and donations...");
          await tx.execute(
            sql`DELETE FROM donations WHERE church_id = ${userId}`
          );
          await tx.execute(
            sql`DELETE FROM batches WHERE church_id = ${userId}`
          );
          
          // 3. Delete service options
          console.log("Cleaning up service options...");
          await tx.execute(
            sql`DELETE FROM service_options WHERE church_id = ${userId}`
          );
          
          // 4. Delete members
          console.log("Cleaning up members...");
          await tx.execute(
            sql`DELETE FROM members WHERE church_id = ${userId}`
          );
          
          // 5. Delete report recipients (uses cascade)
          console.log("Cleaning up report recipients...");
          await tx.execute(
            sql`DELETE FROM report_recipients WHERE church_id = ${userId}`
          );
          
          // 6. Delete email templates (uses cascade)
          console.log("Cleaning up email templates...");
          await tx.execute(
            sql`DELETE FROM email_templates WHERE church_id = ${userId}`
          );
          
          // 7. Delete planning center tokens (uses cascade)
          console.log("Cleaning up planning center tokens...");
          await tx.execute(
            sql`DELETE FROM planning_center_tokens WHERE church_id = ${userId}`
          );
          
          // 8. Delete verification codes
          console.log("Cleaning up verification codes...");
          await tx.execute(
            sql`DELETE FROM verification_codes WHERE church_id = ${userId}`
          );
          
          // 9. Handle churches table - check if this user is an account owner
          console.log("Handling church relationship...");
          const accountOwnerResult = await tx.execute(
            sql`SELECT * FROM churches WHERE account_owner_id = ${userId}`
          );
          
          const isAccountOwner = accountOwnerResult.rows.length > 0;
          
          // Delete the church if this user is the account owner
          if (isAccountOwner) {
            console.log(`User ${email} is an account owner for ${accountOwnerResult.rows.length} churches`);
            await tx.execute(
              sql`DELETE FROM churches WHERE id = ${userId}`
            );
            console.log(`Deleted church with ID: ${userId}`);
          }
          
          // 10. Finally delete the user
          console.log("Deleting user...");
          await tx.delete(users).where(eq(users.id, userId));
          
          console.log(`Successfully deleted test user: ${email} and all related data`);
        });
        
        return res.json({
          success: true,
          message: `Successfully deleted user with email: ${email} and all related data`
        });
      } catch (txError) {
        console.error("Transaction error:", txError);
        throw txError; // Re-throw to be caught by the outer try/catch
      }
    } catch (error) {
      console.error("Error deleting test user:", error);
      return res.status(500).json({
        success: false,
        message: "Error deleting test user"
      });
    }
  });
  
  // Generate new verification token for an existing user
  app.post('/api/regenerate-verification-token', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required"
        });
      }
      
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found with this email"
        });
      }
      
      // Generate new token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 24); // 24 hour expiration
      
      // Update user with new token using raw SQL to handle column name mismatch
      const updatedUserResult = await db.execute(
        sql`UPDATE users 
            SET password_reset_token = ${token}, 
                password_reset_expires = ${expires}, 
                updated_at = ${new Date()} 
            WHERE id = ${user.id} 
            RETURNING *`
      );
      
      const updatedUser = updatedUserResult.rows[0];
      
      // Get application URL from request for verification link
      const appUrl = `${req.protocol}://${req.get('host')}`;
      const verificationUrl = `${appUrl}/verify?token=${token}`;
      
      return res.json({
        success: true,
        message: "New verification token generated",
        userId: updatedUser.id,
        email: updatedUser.email,
        verificationUrl
      });
      
    } catch (error) {
      console.error("Error regenerating verification token:", error);
      return res.status(500).json({
        success: false,
        message: "Error regenerating token"
      });
    }
  });

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
      
      // Look up user with this token using raw SQL to handle column name mismatch
      const users_with_token_result = await db.execute(
        sql`SELECT * FROM users WHERE password_reset_token = ${token}`
      );
      
      const users_with_token = users_with_token_result.rows;
      
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
      
      // Make sure to include the absolute URL for the church logo
      const logoPath = user?.churchLogoUrl || '';
      
      // Build full URL - convert relative path to absolute URL for email client
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      const churchLogoUrl = logoPath ? `${baseUrl}${logoPath}` : '';
      
      console.log(`Using church logo URL for email: ${churchLogoUrl || 'None available'}`);
      
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
        donationCount: 5,
        churchLogoUrl
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