import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import jwt from "jsonwebtoken";

// Convert callback-based scrypt to Promise-based
const scryptAsync = promisify(scrypt);

/**
 * Generate a random ID with optional prefix
 * @param prefix Optional prefix to add to the beginning of the ID
 * @returns A string ID
 */
export function generateId(prefix: string = ""): string {
  const randomId = randomBytes(8).toString("hex");
  return `${prefix}${randomId}`;
}

/**
 * Hash a password using scrypt
 * @param password The plain text password to hash
 * @returns A promise resolving to a hashed password
 */
export async function scryptHash(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  // Using colon as separator to match existing database format
  return `${buf.toString("hex")}:${salt}`;
}

/**
 * Verify a password against a hashed password
 * @param supplied The plain text password to verify
 * @param stored The hashed password to compare against
 * @returns A promise resolving to a boolean
 */
export async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  // Handle both period and colon separators between hash and salt
  const separator = stored.includes(".") ? "." : ":";
  const [hashed, salt] = stored.split(separator);
  
  if (!salt || !hashed) {
    console.error("Invalid stored password format");
    return false;
  }
  
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

/**
 * Generate a random verification code
 * @param length Length of the code to generate (default: 6)
 * @returns A numeric string of the specified length
 */
export function generateVerificationCode(length: number = 6): string {
  const chars = "0123456789";
  let code = "";
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    code += chars[randomIndex];
  }
  
  return code;
}

/**
 * Format a date to a string in standard format
 * @param date The date to format
 * @returns A formatted date string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Format a currency string
 * @param amount The amount to format
 * @returns A formatted currency string
 */
export function formatCurrency(amount: string): string {
  const numericAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numericAmount);
}

/**
 * Generate a JWT token
 * @param payload The data to include in the token
 * @param expiresIn How long the token should be valid
 * @returns A signed JWT token
 */
export function generateToken(payload: any, expiresIn: string = "7d"): string {
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }
  
  return jwt.sign(payload, process.env.SESSION_SECRET, { expiresIn });
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
    return jwt.verify(token, process.env.SESSION_SECRET);
  } catch (error) {
    return null;
  }
}