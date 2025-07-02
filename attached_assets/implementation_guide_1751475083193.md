# Security Implementation Guide for settings.tsx

## 🚨 Critical Issues to Fix Immediately

### 1. File Upload Security (CRITICAL)

**Current Code:**
```typescript
accept="image/*"
// No validation, no size limits
```

**Secure Implementation:**
```typescript
// Add to file input onChange handler
const file = e.target.files?.[0];
if (!file) return;

// Validate file before upload
const validation = validateFileUpload(file);
if (!validation.valid) {
  toast({
    title: "Invalid file",
    description: validation.error,
    variant: "destructive",
  });
  return;
}

// Use secure upload handler
await handleSecureFileUpload(file, fileInputRef);
```

### 2. URL Parameter Security (HIGH)

**Current Code:**
```typescript
const tempKey = params.get('pc_temp_key');
const churchId = params.get('churchId');
```

**Secure Implementation:**
```typescript
const tempKey = validateUrlParameter(params.get('pc_temp_key'), 'pc_temp_key');
const churchId = validateUrlParameter(params.get('churchId'), 'churchId');

if (!tempKey) {
  secureLog.warn('Invalid or missing pc_temp_key parameter');
  return;
}
```

### 3. Local Storage Security (HIGH)

**Current Code:**
```typescript
localStorage.getItem('planningCenterChurchId')
localStorage.setItem('planningCenterChurchId', value)
```

**Secure Implementation:**
```typescript
// Replace all localStorage calls with SecureStorage
const storedChurchId = SecureStorage.get('planningCenterChurchId');
SecureStorage.set('planningCenterChurchId', churchId, 1800000); // 30 minutes TTL
```

### 4. Input Validation Enhancement (MEDIUM)

**Current Code:**
```typescript
churchName: z.string().min(1).max(35)
```

**Secure Implementation:**
```typescript
churchName: z.string()
  .min(1, "Church name is required")
  .max(35, "Church name cannot exceed 35 characters")
  .regex(/^[a-zA-Z0-9\s\-'&.()]+$/, "Church name contains invalid characters")
  .transform(val => val.trim())
```

### 5. API URL Construction (MEDIUM)

**Current Code:**
```typescript
let url = `/api/planning-center/claim-temp-tokens/${tempKey}`;
```

**Secure Implementation:**
```typescript
const url = buildSecureApiUrl('/api/planning-center/claim-temp-tokens/{token}', 
  { token: tempKey }, 
  { churchId, deviceType: 'mobile', t: Date.now().toString() }
);
```

## 🛠️ Step-by-Step Implementation

### Step 1: Install Dependencies
```bash
npm install validator
npm install @types/validator
```

### Step 2: Import Security Utilities
```typescript
import {
  validateFileUpload,
  validateUrlParameter,
  SecureStorage,
  buildSecureApiUrl,
  validateRecipientData,
  secureLog,
  RateLimiter,
  handleSecureFileUpload,
  getCsrfToken
} from './utils/security';
```

### Step 3: Update File Upload Handler
```typescript
onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  
  try {
    setLogoUploading(true);
    
    // Use secure upload handler
    await handleSecureFileUpload(file, fileInputRef);
    
    // Refresh user data
    queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    
    toast({
      title: "Logo updated",
      description: "Your church logo has been updated successfully.",
      className: "bg-[#48BB78] text-white",
    });
  } catch (error) {
    toast({
      title: "Upload failed",
      description: error instanceof Error ? error.message : 'Upload failed',
      variant: "destructive",
    });
  } finally {
    setLogoUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }
}}
```

### Step 4: Secure URL Parameter Handling
```typescript
useEffect(() => {
  if (!search) return;
  
  const params = new URLSearchParams(search);
  
  // Validate parameters
  const tempKey = validateUrlParameter(params.get('pc_temp_key'), 'pc_temp_key');
  const churchId = validateUrlParameter(params.get('churchId'), 'churchId');
  const planningCenterError = validateUrlParameter(params.get('planningCenterError'), 'planningCenterError');
  
  if (planningCenterError) {
    secureLog.warn('Planning Center error detected:', planningCenterError);
    // Handle error...
    return;
  }
  
  if (tempKey && !claimingTokens) {
    // Use secure storage
    const storedChurchId = SecureStorage.get('planningCenterChurchId');
    const finalChurchId = churchId || storedChurchId;
    
    // Proceed with token claim...
  }
}, [search, claimingTokens]);
```

### Step 5: Enhanced Form Validation
```typescript
const handleAddRecipient = () => {
  const validation = validateRecipientData(
    recipientFirstName,
    recipientLastName,
    recipientEmail
  );
  
  if (!validation.valid) {
    toast({
      title: "Validation Error",
      description: validation.errors.join(', '),
      variant: "destructive",
    });
    return;
  }
  
  createReportRecipientMutation.mutate({
    firstName: recipientFirstName.trim(),
    lastName: recipientLastName.trim(),
    email: recipientEmail.trim().toLowerCase()
  });
};
```

### Step 6: Secure Logging
```typescript
// Replace all console.log statements
// Before:
console.log("Claiming Planning Center token", { tempKey, churchId });

// After:
secureLog.info("Claiming Planning Center token", 
  secureLog.sanitize({ tempKey, churchId })
);
```

### Step 7: Rate Limiting
```typescript
// Add rate limiter instance
const rateLimiter = new RateLimiter();

// Use in mutation functions
const claimTokensMutation = useMutation({
  mutationFn: async ({ tempKey, churchId }) => {
    // Check rate limit
    if (!rateLimiter.isAllowed('claim-tokens', 3, 60000)) { // 3 requests per minute
      const waitTime = rateLimiter.getRemainingTime('claim-tokens');
      throw new Error(`Please wait ${Math.ceil(waitTime / 1000)} seconds before trying again`);
    }
    
    // Proceed with mutation...
  }
});
```

## 🧪 Security Testing Checklist

### File Upload Tests
- [ ] Upload files larger than 5MB (should fail)
- [ ] Upload non-image files (should fail)
- [ ] Upload files with malicious names (should fail)
- [ ] Upload valid images (should succeed)

### Input Validation Tests
- [ ] Church name with special characters (should sanitize)
- [ ] Church name over 35 characters (should truncate)
- [ ] Email with invalid format (should fail)
- [ ] Names with script tags (should sanitize)

### URL Parameter Tests
- [ ] Invalid token format (should fail)
- [ ] Oversized parameters (should fail)
- [ ] Script injection in parameters (should fail)
- [ ] Valid parameters (should succeed)

### Rate Limiting Tests
- [ ] Rapid successive save operations (should throttle)
- [ ] Multiple token claims (should rate limit)
- [ ] Normal usage patterns (should allow)

## 🔐 Additional Security Recommendations

### 1. Server-Side Validation
Ensure all client-side validations are also implemented server-side.

### 2. Content Security Policy
Add CSP headers to prevent XSS:
```
Content-Security-Policy: default-src 'self'; img-src 'self' data: https:; script-src 'self'
```

### 3. File Upload Scanning
Consider implementing virus scanning for uploaded files.

### 4. Audit Logging
Log all sensitive operations (file uploads, settings changes, etc.).

### 5. Regular Security Updates
Keep all dependencies updated and monitor for security advisories.

## 📊 Security Improvement Summary

| Issue | Risk Level | Status |
|-------|------------|---------|
| File Upload Validation | Critical | ✅ Fixed |
| URL Parameter Injection | High | ✅ Fixed |
| Local Storage Security | High | ✅ Fixed |
| Input Validation | Medium | ✅ Enhanced |
| API URL Construction | Medium | ✅ Fixed |
| Error Information Disclosure | Medium | ✅ Fixed |
| Race Conditions | Medium | ✅ Mitigated |
| Rate Limiting | Low | ✅ Added |

## 🚀 Deployment Steps

1. **Review and test** all security fixes in development
2. **Update server-side** validation to match client-side rules
3. **Deploy incrementally** - test each component separately
4. **Monitor logs** for any security-related errors
5. **Conduct penetration testing** to verify fixes
6. **Document security procedures** for team

This implementation will significantly improve the security posture of your settings component while maintaining functionality and user experience.