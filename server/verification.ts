import { randomInt } from 'crypto';
import { storage } from './storage';
import { sendEmail } from './sendgrid';
import { db } from './db';
import { verificationCodes } from '../shared/schema';
import { eq, and } from 'drizzle-orm';

// Generate a random 6-digit code
export function generateVerificationCode(): string {
  // Generate a random number between 100000 and 999999 (inclusive)
  return randomInt(100000, 1000000).toString();
}

// Store a verification code in the database
export async function storeVerificationCode(email: string, churchId: string): Promise<string> {
  // Generate a 6-digit code
  const code = generateVerificationCode();
  
  // Set expiration time (10 minutes from now)
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + 10);
  
  // Delete any existing codes for this email
  await db.delete(verificationCodes)
    .where(and(
      eq(verificationCodes.email, email),
      eq(verificationCodes.churchId, churchId)
    ));
  
  // Store the new code
  await db.insert(verificationCodes)
    .values({
      email,
      churchId,
      code,
      expiresAt,
      createdAt: new Date()
    });
  
  return code;
}

// Verify a code for an email
export async function verifyCode(email: string, churchId: string, code: string): Promise<boolean> {
  // Get the verification code from the database
  const [storedCode] = await db.select()
    .from(verificationCodes)
    .where(and(
      eq(verificationCodes.email, email),
      eq(verificationCodes.churchId, churchId)
    ));
  
  if (!storedCode) {
    // No code found for this email
    return false;
  }
  
  if (new Date() > storedCode.expiresAt) {
    // Code has expired
    return false;
  }
  
  if (storedCode.code !== code) {
    // Code doesn't match
    return false;
  }
  
  // Code matches - delete it to prevent reuse
  await db.delete(verificationCodes)
    .where(eq(verificationCodes.id, storedCode.id));
  
  return true;
}

// Send verification email
export async function sendVerificationEmail(email: string, churchId: string, churchName: string): Promise<boolean> {
  try {
    // Generate and store verification code
    const code = await storeVerificationCode(email, churchId);
    
    // Send email with the code
    const result = await sendEmail(
      process.env.SENDGRID_API_KEY!,
      {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL!,
        subject: `PlateSync: Your Verification Code`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #69ad4c;">Welcome to PlateSync</h2>
            <p>Hello from ${churchName},</p>
            <p>To finish setting up your PlateSync account, please enter the following verification code in the verification page:</p>
            <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
              ${code}
            </div>
            <p>This code will expire in 10 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
            <p>Thank you,<br>The PlateSync Team</p>
          </div>
        `,
      }
    );
    
    return result;
  } catch (error) {
    console.error('Failed to send verification email:', error);
    return false;
  }
}