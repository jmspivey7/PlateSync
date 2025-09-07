-- Fixed Global Admin User Migration Script
-- Generate UUID for the ID field

INSERT INTO users (
    id,
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
    gen_random_uuid()::text,
    'jspivey',
    'jspivey@spiveyco.com',
    'John',
    'Spivey',
    NULL,
    '/avatars/avatar-1747507514488-364549466.jpg',
    NOW(),
    NOW(),
    'Redeemer Presbyterian Church - NOLA',
    false,
    'GLOBAL_ADMIN',
    NULL,
    NULL,
    '826c351ee259230e3d52812b278b79aed6f8ca5899954f6212b6e412bfb9de6cf0f87f97f61f9213c95f9c78d2e78981ae0768d937eba5506fc3131c22e73799:c4fe9f71bef8ee45b654dce5de76040d',
    true,
    'https://repl-plates-image-repo.s3.amazonaws.com/logos/church-logo-1747925553962-697280926.png',
    '40829937',
    true,
    false
)
ON CONFLICT (email) 
DO UPDATE SET 
    role = 'GLOBAL_ADMIN',
    is_master_admin = true,
    is_verified = true,
    updated_at = NOW();