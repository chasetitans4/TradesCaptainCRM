-- =====================================================
-- CREATE INTERNAL ADMIN USER (for Admin Portal)
-- This is for internal staff, NOT business customers
-- =====================================================
--
-- USAGE:
-- 1. First, generate a bcrypt hash for the password:
--    - Option A: Use https://bcrypt-generator.com/
--    - Option B: Run in Node.js:
--      const bcrypt = require('bcryptjs');
--      bcrypt.hash('YourPassword123!', 12).then(console.log);
--
-- 2. Replace the values below with actual data
-- 3. Run in Supabase SQL Editor
--
-- ROLES:
-- - super_admin: Full system access, can manage other admins
-- - admin: Full access to admin portal features
-- - agent: Sales agent, can manage leads and clients
-- - support: Customer support, can view clients and tickets
-- - finance: Financial access, can view billing and commissions
--
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
  'newadmin@tradescaptain.com',           -- <-- CHANGE: Admin email
  '$2a$12$REPLACE_WITH_BCRYPT_HASH',      -- <-- CHANGE: Bcrypt hash of password
  'Admin Full Name',                       -- <-- CHANGE: Full name
  '+1234567890',                           -- <-- CHANGE: Phone (optional, can be NULL)
  'admin',                                 -- <-- CHANGE: Role (see options above)
  'active',                                -- Status: 'active', 'inactive', 'suspended'
  CURRENT_DATE,                            -- Hire date
  0.10                                     -- Commission rate (10%) - only matters for agents
)
ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW()
RETURNING id, email, full_name, role, status, created_at;

-- =====================================================
-- QUICK PASSWORD HASH GENERATION (Run in Node.js REPL)
-- =====================================================
-- node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('YourPassword123!', 12).then(h => console.log('Hash:', h))"
--
-- Example output:
-- Hash: $2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4gO7Xb0MqKfmHMPy
