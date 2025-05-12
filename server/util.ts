import crypto from "crypto";
import { promisify } from "util";
import { nanoid } from "nanoid";

// Use promisify to convert callback-based scrypt to Promise-based
const scryptAsync = promisify(crypto.scrypt);

// Generate a unique ID for various entities
export function generateId(prefix: string = ""): string {
  return `${prefix}${nanoid(16)}`;
}

// Hash password for storage
export async function scryptHash(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derivedKey.toString("hex")}.${salt}`;
}

// Verify a password against stored hash
export async function verifyPassword(supplied: string, stored: string): Promise<boolean> {
  if (!stored || !supplied) return false;
  
  const [hashedPassword, salt] = stored.split(".");
  if (!hashedPassword || !salt) return false;
  
  const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  
  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(hashedPasswordBuf, suppliedBuf);
}

// Generate a random verification code
export function generateVerificationCode(length: number = 6): string {
  return Math.floor(100000 + Math.random() * 900000).toString().substring(0, length);
}

// Format a date in a specific format
export function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Format currency amount from string to display format
export function formatCurrency(amount: string): string {
  const numAmount = parseFloat(amount);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

// Generate a JWT token for email verification and password reset
export function generateToken(payload: any, expiresIn: string = "1h"): string {
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  
  const now = Math.floor(Date.now() / 1000);
  const exp = now + parseInt(expiresIn) * 60 * 60; // Convert hours to seconds
  
  const tokenPayload = {
    ...payload,
    iat: now,
    exp,
  };
  
  const base64Header = Buffer.from(JSON.stringify(header)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const base64Payload = Buffer.from(JSON.stringify(tokenPayload)).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  
  const signature = crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "")
    .update(`${base64Header}.${base64Payload}`)
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  
  return `${base64Header}.${base64Payload}.${signature}`;
}

// Verify and decode a JWT token
export function verifyToken(token: string): any | null {
  try {
    const [headerB64, payloadB64, signature] = token.split(".");
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "")
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf-8")
    );
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload;
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
}