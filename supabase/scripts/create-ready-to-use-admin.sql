-- =====================================================
-- CREATE ADMIN USER (READY TO RUN)
-- =====================================================
-- Credentials created:
-- Email:    admin@tradescaptain.com
-- Password: AdminPass123!
-- Role:     super_admin
-- =====================================================

INSERT INTO admin_users (
  email,
  password_hash,
  full_name,
  phone,
  role,
  status,
  hire_date,
  commission_rate
) VALUES (
  'admin@tradescaptain.com',              -- Email
  '$2a$12$8BNM2Eu6zoYUrfKXha0hMO.euayojoXQ.R97BrEzzREad6KIelXLa', -- Hash for 'AdminPass123!'
  'System Administrator',                 -- Name
  '555-0123',                             -- Phone
  'super_admin',                          -- Role
  'active',                               -- Status
  CURRENT_DATE,                           -- Hire Date
  0.00                                    -- Commission
)
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash, -- Reset password if exists
  role = 'super_admin',
  status = 'active',
  updated_at = NOW()
RETURNING id, email, role, status;
