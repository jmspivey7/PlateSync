import { Router } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { scryptHash, verifyPassword } from "../util";
import { sendPasswordResetEmail } from "../sendgrid";

const router = Router();

// Forgot Password - request a password reset
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        message: "Email is required" 
      });
    }
    
    console.log(`Password reset requested for email: ${email}`);
    
    // Look up user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    
    // If user is not found, we still return 200 to avoid leaking info about valid emails
    if (!user) {
      console.log(`User not found for email: ${email}, still returning 200 for security`);
      return res.status(200).json({ 
        message: "If your email exists in our system, you will receive password reset instructions" 
      });
    }
    
    // Generate a random token for password reset
    const resetToken = crypto.randomBytes(32).toString("hex");
    console.log(`Generated reset token for user ${user.id}: ${resetToken}`);
    
    // Set token expiration (1 hour from now)
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);
    
    // Save the token and expiration to the user record
    await db
      .update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    console.log(`Reset token saved for user ${user.id}, expires at ${resetExpires}`);
    
    // Build the reset URL
    const resetUrl = `${req.protocol}://${req.get("host")}/reset-password?token=${resetToken}`;
    console.log(`Reset URL: ${resetUrl}`);
    
    // Send email with password reset link using direct SendGrid API
    console.log(`Attempting to send password reset email to ${user.email} with URL: ${resetUrl}`);
    try {
      // Get SendGrid settings from database
      const apiKey = await storage.getSystemConfig('SENDGRID_API_KEY');
      const fromEmail = await storage.getSystemConfig('SENDGRID_FROM_EMAIL');
      
      if (!apiKey || !fromEmail) {
        throw new Error('SendGrid API key or from email not configured in Global Admin settings');
      }
      
      // Format name for personalization
      const userName = user.firstName ? 
        `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}` : 
        'Church Member';
      
      // Email content
      const subject = 'Reset Your PlateSync Password';
      const text = `
Hello ${userName},
      
We received a request to reset your password for PlateSync. If you did not make this request, please ignore this email.
      
To reset your password, please click on the link below:
${resetUrl}
      
This link will expire in 1 hour.
      
If you have any issues, please contact your church administrator.
      
Sincerely,
The PlateSync Team
      `;
      
      // HTML version with branding
      const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
  <div style="padding: 20px; text-align: center;">
    <img src="https://images.squarespace-cdn.com/content/v1/676190801265eb0dc09c3768/739cc76d-9a1c-49b8-81d4-debf5f1bb208/PlateSync+Logo.png" alt="PlateSync Logo" style="width: 270px; margin: 0 auto;">
  </div>
  
  <div style="padding: 0 30px 30px;">
    <p style="margin-top: 0;">Hello ${userName},</p>
    
    <p>We received a request to reset the password for your PlateSync account.</p>
    
    <p>To set a new password, please click the button below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #69ad4c; color: white; font-weight: bold; padding: 12px 30px; text-decoration: none; border-radius: 4px; font-size: 16px;">Reset Password</a>
    </div>
    
    <p>This link will expire in 1 hour for security reasons.</p>
    
    <p>If you did not request a password reset, please ignore this email and your password will remain unchanged.</p>
    
    <p>If you have any issues, please contact your church administrator.</p>
    
    <p style="margin-bottom: 0;">Sincerely,<br>
    <strong>The PlateSync Team</strong></p>
  </div>
  
  <div style="background-color: #f7fafc; padding: 20px; text-align: center; font-size: 14px; color: #718096; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0;">This is an automated message from PlateSync.</p>
    <p style="margin: 8px 0 0;">Please do not reply to this email.</p>
  </div>
</div>
      `;
      
      // Make direct API request to SendGrid
      console.log('Making direct API request to SendGrid');
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: user.email }],
              subject: subject
            }
          ],
          from: { email: fromEmail },
          content: [
            {
              type: "text/plain",
              value: text
            },
            {
              type: "text/html",
              value: html
            }
          ]
        })
      });
      
      if (response.ok) {
        console.log(`✅ Password reset email successfully sent to ${user.email} using direct SendGrid API`);
      } else {
        const errorText = await response.text();
        console.error(`❌ SendGrid API error: ${response.status} ${response.statusText}`);
        console.error(`❌ Error details: ${errorText}`);
      }
    } catch (emailError) {
      console.error('❌ Error sending password reset email:', emailError);
      // We still return success to the client for security reasons
    }
    
    res.status(200).json({ 
      message: "If your email exists in our system, you will receive password reset instructions" 
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).json({ message: "An error occurred while processing your request" });
  }
});

// Reset Password - reset password with token
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }
    
    console.log(`Password reset attempt with token: ${token}`);
    
    // Look up user by reset token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    
    // If user not found or token doesn't match
    if (!user) {
      console.log(`No user found with token: ${token}`);
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }
    
    // Check if token is expired
    const now = new Date();
    if (!user.passwordResetExpires || now > user.passwordResetExpires) {
      console.log(`Token expired for user ${user.id}, expired at: ${user.passwordResetExpires}`);
      return res.status(400).json({ message: "Reset token has expired" });
    }
    
    // Hash the new password
    const hashedPassword = await scryptHash(password);
    
    // Update the user record with new password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    console.log(`Password reset successful for user ${user.id}`);
    
    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Error in reset password:", error);
    res.status(500).json({ message: "An error occurred while resetting your password" });
  }
});

export default router;