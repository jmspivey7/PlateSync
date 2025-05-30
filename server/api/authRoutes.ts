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
    
    // Send email with password reset link
    console.log(`Attempting to send password reset email to ${user.email} with URL: ${resetUrl}`);
    try {
      const emailSent = await sendPasswordResetEmail({
        to: user.email || '',
        resetUrl: resetUrl,
        firstName: user.firstName || '',
        lastName: user.lastName || ''
      });
      
      if (emailSent) {
        console.log(`✅ Password reset email successfully sent to ${user.email}`);
      } else {
        console.error(`❌ Failed to send password reset email to ${user.email}`);
        // We still return success to the client for security reasons
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

// Set Password - for Welcome Email verification flow
router.post("/set-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: "Token and password are required" });
    }
    
    console.log(`Set password attempt with token: ${token}`);
    
    // Look up user by reset token (Welcome Email uses same field)
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    
    // If user not found or token doesn't match
    if (!user) {
      console.log(`No user found with token: ${token}`);
      return res.status(400).json({ message: "Invalid or expired verification token" });
    }
    
    // Check if token is expired
    const now = new Date();
    if (!user.passwordResetExpires || now > user.passwordResetExpires) {
      console.log(`Token expired for user ${user.id}, expired at: ${user.passwordResetExpires}`);
      return res.status(400).json({ message: "Verification token has expired" });
    }
    
    // Hash the new password using the same method as reset-password
    const hashedPassword = await scryptHash(password);
    console.log(`Generated hash for new password: ${hashedPassword.substring(0, 20)}...`);
    
    // Update the user record with new password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        isVerified: true, // Mark email as verified for Welcome Email flow
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));
    
    console.log(`Password set successful for user ${user.id} via Welcome Email flow`);
    
    res.status(200).json({ message: "Password has been set successfully" });
  } catch (error) {
    console.error("Error in set password:", error);
    res.status(500).json({ message: "An error occurred while setting your password" });
  }
});

// Validate Token - check if a token is valid
router.get("/validate-token", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }
    
    console.log(`Token validation attempt with token: ${token}`);
    
    // Look up user by reset token
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.passwordResetToken, token as string));
    
    // If user not found or token doesn't match
    if (!user) {
      console.log(`No user found with token: ${token}`);
      return res.status(400).json({ message: "Invalid verification token" });
    }
    
    // Check if token is expired
    const now = new Date();
    if (!user.passwordResetExpires || now > user.passwordResetExpires) {
      console.log(`Token expired for user ${user.id}, expired at: ${user.passwordResetExpires}`);
      return res.status(400).json({ message: "Verification token has expired" });
    }
    
    console.log(`Token validation successful for user ${user.id}`);
    
    res.status(200).json({ message: "Token is valid" });
  } catch (error) {
    console.error("Error in token validation:", error);
    res.status(500).json({ message: "An error occurred while validating token" });
  }
});

export default router;