-- Update the admin user password
UPDATE admin_users
SET 
    password_hash = '$2a$10$HEYeEn4kj83/Twjuv0jYGez0KMI1zvPL17pFuTMGJ9123QF8m9p5G',
    status = 'active',
    updated_at = NOW()
WHERE email = 'admin@tradescaptain.com';

-- Ensure the user exists if the update didn't affect any rows (Upsert-like behavior)
INSERT INTO admin_users (
    id,
    email,
    password_hash,
    full_name,
    role,
    status,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid(),
    'admin@tradescaptain.com',
    '$2a$10$HEYeEn4kj83/Twjuv0jYGez0KMI1zvPL17pFuTMGJ9123QF8m9p5G',
    'System Admin',
    'super_admin',
    'active',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM admin_users WHERE email = 'admin@tradescaptain.com'
);
