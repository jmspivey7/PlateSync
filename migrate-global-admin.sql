-- =================================================================
-- GLOBAL ADMIN USER MIGRATION SCRIPT FOR PRODUCTION DATABASE
-- =================================================================
-- User: John Spivey (jspivey@spiveyco.com)
-- Purpose: Create Global Admin user in production while preserving dev access
-- Run this script in your PRODUCTION database only
-- =================================================================

-- First, check if the user already exists to prevent duplicates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE email = 'jspivey@spiveyco.com') THEN
        RAISE NOTICE 'User jspivey@spiveyco.com already exists in production database';
        -- Update existing user to ensure Global Admin privileges
        UPDATE users SET 
            role = 'GLOBAL_ADMIN',
            is_master_admin = true,
            is_verified = true,
            updated_at = NOW()
        WHERE email = 'jspivey@spiveyco.com';
        RAISE NOTICE 'Updated existing user to Global Admin status';
    ELSE
        -- Insert new Global Admin user
        INSERT INTO users (
            username,
            email,
            first_name,
            last_name,
            bio,
            profile_image_url,
            created_at,
            updated_at,
            church_name,
            email_notifications_enabled,
            role,
            password_reset_token,
            password_reset_expires,
            password,
            is_verified,
            church_logo_url,
            church_id,
            is_master_admin,
            is_account_owner
        ) VALUES (
            'jspivey',                          -- username
            'jspivey@spiveyco.com',            -- email
            'John',                            -- first_name
            'Spivey',                          -- last_name
            NULL,                              -- bio
            '/avatars/avatar-1747507514488-364549466.jpg', -- profile_image_url
            NOW(),                             -- created_at
            NOW(),                             -- updated_at
            'Redeemer Presbyterian Church - NOLA', -- church_name
            false,                             -- email_notifications_enabled
            'GLOBAL_ADMIN',                    -- role (CRITICAL for Global Admin access)
            NULL,                              -- password_reset_token
            NULL,                              -- password_reset_expires
            '826c351ee259230e3d52812b278b79aed6f8ca5899954f6212b6e412bfb9de6cf0f87f97f61f9213c95f9c78d2e78981ae0768d937eba5506fc3131c22e73799:c4fe9f71bef8ee45b654dce5de76040d', -- password (hashed)
            true,                              -- is_verified
            'https://repl-plates-image-repo.s3.amazonaws.com/logos/church-logo-1747925553962-697280926.png', -- church_logo_url
            '40829937',                        -- church_id
            true,                              -- is_master_admin (CRITICAL for Global Admin access)
            false                              -- is_account_owner
        );
        
        RAISE NOTICE 'Successfully created Global Admin user: jspivey@spiveyco.com';
    END IF;
END $$;

-- =================================================================
-- VERIFICATION QUERIES (Run these after the migration)
-- =================================================================

-- 1. Verify the user was created/updated correctly
SELECT 
    id,
    username,
    email,
    first_name,
    last_name,
    role,
    is_master_admin,
    is_verified,
    created_at,
    updated_at
FROM users 
WHERE email = 'jspivey@spiveyco.com';

-- 2. Verify Global Admin access rights
SELECT 
    email,
    role,
    is_master_admin,
    CASE 
        WHEN role = 'GLOBAL_ADMIN' AND is_master_admin = true THEN '✅ Full Global Admin Access'
        WHEN role = 'GLOBAL_ADMIN' AND is_master_admin = false THEN '⚠️ Partial Admin Access'
        ELSE '❌ No Admin Access'
    END AS access_status
FROM users 
WHERE email = 'jspivey@spiveyco.com';

-- =================================================================
-- IMPORTANT NOTES:
-- =================================================================
-- 1. The password hash is preserved from DEV, so the user can login with the same credentials
-- 2. Role 'GLOBAL_ADMIN' + is_master_admin = true gives full Global Admin access
-- 3. This script is idempotent - safe to run multiple times
-- 4. The user will remain in DEV database unchanged
-- 5. Profile image and church logo URLs point to S3 - should work in production
-- =================================================================