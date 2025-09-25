/**
 * Security utilities for PlateSync application
 * Implements file upload validation, input sanitization, and URL parameter validation
 */

import { z } from 'zod';

// File upload validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

// Validation results interface
interface ValidationResult {
  valid: boolean;
  error?: string;
  errors?: string[];
}

/**
 * Validates file uploads for security threats
 */
export function validateFileUpload(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: 'Only image files (JPG, PNG, GIF, WebP) are allowed'
    };
  }

  // Check file extension
  const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return {
      valid: false,
      error: 'Invalid file extension. Only JPG, PNG, GIF, WebP files are allowed'
    };
  }

  // Check for suspicious filenames
  const suspiciousPatterns = [
    /\.php\./i,
    /\.asp\./i,
    /\.jsp\./i,
    /\.exe\./i,
    /\.bat\./i,
    /\.sh\./i,
    /\.cmd\./i,
    /\.scr\./i,
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(file.name)) {
      return {
        valid: false,
        error: 'Filename contains suspicious content and cannot be uploaded'
      };
    }
  }

  // Check for null bytes and other dangerous characters
  if (file.name.includes('\0') || file.name.includes('\x00')) {
    return {
      valid: false,
      error: 'Filename contains invalid characters'
    };
  }

  return { valid: true };
}

/**
 * Validates and sanitizes URL parameters
 */
export function validateUrlParameter(value: string | null, paramName: string): string | null {
  if (!value) return null;

  // Check parameter length to prevent abuse
  // OAuth codes can be much longer than regular parameters
  let maxLength = 50;
  if (paramName === 'pc_temp_key') {
    maxLength = 100;
  } else if (paramName === 'code' || paramName === 'state') {
    // OAuth authorization codes and state parameters can be very long
    maxLength = 500;
  }
  
  if (value.length > maxLength) {
    console.warn(`URL parameter ${paramName} exceeds maximum length`, { length: value.length, maxLength });
    return null;
  }

  // Remove dangerous characters
  const sanitized = value
    .replace(/[<>'"&\x00-\x1f\x7f-\x9f]/g, '') // Remove HTML/script chars and control chars
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/vbscript:/gi, '') // Remove vbscript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .trim();

  // Check for common injection patterns
  const dangerousPatterns = [
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /javascript:/i,
    /vbscript:/i,
    /data:/i,
    /\.\.\//g, // Path traversal
    /\/etc\/passwd/i,
    /\/proc\//i,
    /\0/g // Null bytes
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(sanitized)) {
      console.warn(`URL parameter ${paramName} contains suspicious content`, { value: sanitized });
      return null;
    }
  }

  return sanitized || null;
}

/**
 * Enhanced input validation schemas
 */
export const secureSchemas = {
  churchName: z.string()
    .min(1, "Church name is required")
    .max(35, "Church name cannot exceed 35 characters")
    .regex(/^[a-zA-Z0-9\s\-'&.(),]+$/, "Church name contains invalid characters")
    .transform(val => val.trim()),

  email: z.string()
    .min(1, "Email is required")
    .email("Invalid email format")
    .max(254, "Email is too long")
    .toLowerCase()
    .refine(val => !val.includes('+'), "Email aliases with + are not allowed")
    .transform(val => val.trim()),

  firstName: z.string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .regex(/^[a-zA-Z\s\-'.]+$/, "First name contains invalid characters")
    .transform(val => val.trim()),

  lastName: z.string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .regex(/^[a-zA-Z\s\-'.]+$/, "Last name contains invalid characters")
    .transform(val => val.trim()),

  serviceName: z.string()
    .min(1, "Service name is required")
    .max(50, "Service name is too long")
    .regex(/^[a-zA-Z0-9\s\-'&.():]+$/, "Service name contains invalid characters")
    .transform(val => val.trim())
};

/**
 * Validates recipient data comprehensively
 */
export function validateRecipientData(
  firstName: string, 
  lastName: string, 
  email: string
): ValidationResult {
  const errors: string[] = [];

  try {
    secureSchemas.firstName.parse(firstName);
  } catch (e) {
    if (e instanceof z.ZodError) {
      errors.push(...e.errors.map(err => err.message));
    }
  }

  try {
    secureSchemas.lastName.parse(lastName);
  } catch (e) {
    if (e instanceof z.ZodError) {
      errors.push(...e.errors.map(err => err.message));
    }
  }

  try {
    secureSchemas.email.parse(email);
  } catch (e) {
    if (e instanceof z.ZodError) {
      errors.push(...e.errors.map(err => err.message));
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}

/**
 * Rate limiter for preventing abuse
 */
export class RateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    // Reset if outside window
    if (now - record.lastAttempt > windowMs) {
      this.attempts.set(key, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if under limit
    if (record.count < maxAttempts) {
      record.count++;
      record.lastAttempt = now;
      return true;
    }

    return false;
  }

  getRemainingTime(key: string, windowMs: number = 60000): number {
    const record = this.attempts.get(key);
    if (!record) return 0;
    
    const elapsed = Date.now() - record.lastAttempt;
    return Math.max(0, windowMs - elapsed);
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Secure logging utility that sanitizes sensitive data
 */
export const secureLog = {
  info: (message: string, data?: any) => {
    console.log(message, data ? secureLog.sanitize(data) : '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(message, data ? secureLog.sanitize(data) : '');
  },
  
  error: (message: string, data?: any) => {
    console.error(message, data ? secureLog.sanitize(data) : '');
  },

  sanitize: (data: any): any => {
    if (typeof data === 'string') {
      // Truncate long strings and mask sensitive patterns
      const truncated = data.length > 100 ? data.substring(0, 100) + '...' : data;
      return truncated.replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID-****');
    }
    
    if (typeof data === 'object' && data !== null) {
      const sanitized: any = Array.isArray(data) ? [] : {};
      
      for (const [key, value] of Object.entries(data)) {
        // Mask sensitive keys
        if (['token', 'key', 'secret', 'password', 'auth'].some(sensitive => 
          key.toLowerCase().includes(sensitive))) {
          sanitized[key] = typeof value === 'string' && value.length > 6 
            ? value.substring(0, 6) + '****' 
            : '****';
        } else {
          sanitized[key] = secureLog.sanitize(value);
        }
      }
      
      return sanitized;
    }
    
    return data;
  }
};

/**
 * Secure file upload handler
 */
export async function handleSecureFileUpload(file: File, fileInputRef?: React.RefObject<HTMLInputElement>): Promise<void> {
  // Validate file first
  const validation = validateFileUpload(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Create FormData for upload
  const formData = new FormData();
  formData.append('logo', file);

  const response = await fetch('/api/settings/logo', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
    throw new Error(errorData.message || 'Failed to upload file');
  }

  // Clear file input after successful upload
  if (fileInputRef?.current) {
    fileInputRef.current.value = '';
  }
}

/**
 * Enhanced server-side file validation
 */
export function validateFileOnServer(file: any): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    };
  }

  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      error: 'Only image files (JPG, PNG, GIF, WebP) are allowed'
    };
  }

  // Check original filename
  if (file.originalname) {
    const extension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: 'Invalid file extension'
      };
    }

    // Check for suspicious patterns in filename
    const suspiciousPatterns = [
      /\.php\./i, /\.asp\./i, /\.jsp\./i, /\.exe\./i,
      /<script/i, /javascript:/i, /\0/
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return {
          valid: false,
          error: 'Filename contains suspicious content'
        };
      }
    }
  }

  return { valid: true };
}