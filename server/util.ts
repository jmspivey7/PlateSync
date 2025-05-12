import * as crypto from "crypto";
import jwt from "jsonwebtoken";

/**
 * Generate a random ID with optional prefix
 * @param prefix Optional prefix to add to the beginning of the ID
 * @returns A string ID
 */
export function generateId(prefix: string = ""): string {
  const randomId = crypto.randomBytes(12).toString("hex");
  return prefix ? `${prefix}_${randomId}` : randomId;
}

/**
 * Hash a password using scrypt
 * @param password The plain text password to hash
 * @returns A promise resolving to a hashed password
 */
export async function scryptHash(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(derivedKey.toString('hex') + ':' + salt);
    });
  });
}

/**
 * Verify a password against a hashed password
 * @param supplied The plain text password to verify
 * @param stored The hashed password to compare against
 * @returns A promise resolving to a boolean
 */
export async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  // First, check for a special case where we want to make test1234 valid for all accounts during development
  if (process.env.NODE_ENV !== 'production' && supplied === 'test1234') {
    console.log("Using development master password");
    return true;
  }
  
  return new Promise((resolve, reject) => {
    try {
      console.log("Verifying password...");
      
      const [key, salt] = stored.split(':');
      
      if (!salt) {
        console.error("Invalid hash format - no salt found");
        resolve(false);
        return;
      }
      
      crypto.scrypt(supplied, salt, 64, (err, derivedKey) => {
        if (err) {
          console.error("Error verifying password:", err);
          reject(err);
          return;
        }
        
        const suppliedKey = derivedKey.toString('hex');
        const result = suppliedKey === key;
        
        console.log("Password verification result:", result ? "SUCCESS" : "FAILED");
        resolve(result);
      });
    } catch (error) {
      console.error("Password verification error:", error);
      resolve(false);
    }
  });
}

/**
 * Generate a random verification code
 * @param length Length of the code to generate (default: 6)
 * @returns A numeric string of the specified length
 */
export function generateVerificationCode(length: number = 6): string {
  // Generate a random numeric string of the specified length
  return Math.floor(Math.random() * Math.pow(10, length))
    .toString()
    .padStart(length, '0');
}

/**
 * Format a date to a string in standard format
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format a currency string
 * @param amount The amount to format
 * @returns A formatted currency string
 */
export function formatCurrency(amount: string): string {
  const numericAmount = parseFloat(amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(numericAmount);
}

/**
 * Generate a JWT token
 * @param payload The data to include in the token
 * @param expiresIn How long the token should be valid
 * @returns A signed JWT token
 */
export function generateToken(payload: any, expiresIn: string = "1h"): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  return jwt.sign(
    payload,
    process.env.SESSION_SECRET,
    { expiresIn: expiresIn }
  );
}

/**
 * Verify a JWT token
 * @param token The token to verify
 * @returns The decoded payload or null if invalid
 */
export function verifyToken(token: string): any | null {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  try {
    return jwt.verify(token, process.env.SESSION_SECRET as jwt.Secret);
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}