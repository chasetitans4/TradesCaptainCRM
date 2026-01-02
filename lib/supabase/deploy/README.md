# TradesCaptain Supabase Database Deployment

Deploy the complete TradesCaptain database schema to a fresh Supabase project.

## Overview

This deployment package includes:
- **001_complete_schema.sql** - Consolidated schema with 100+ tables
- **002_rls_policies.sql** - Minimal RLS policies for agent data isolation
- **deploy.sh** - Automated deployment script

## Prerequisites

### 1. Supabase Project
Create a new project at [supabase.com](https://supabase.com)

### 2. Supabase CLI
Install the Supabase CLI:
```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### 3. Environment Variables
```bash
# Required: Your Supabase project reference (from dashboard URL)
export SUPABASE_PROJECT_REF=abcdefghijklmnop

# Optional: Direct database connection (for verification)
export DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres
```

Find these in Supabase Dashboard:
- **Project Reference**: Settings > General > Reference ID
- **Database URL**: Settings > Database > Connection string (URI)

## Deployment Options

### Option 1: Automated Script (Recommended)

```bash
cd lib/supabase/deploy
chmod +x deploy.sh
./deploy.sh
```

The script will:
1. Link to your Supabase project
2. Deploy the complete schema
3. Apply RLS policies
4. Generate TypeScript types
5. Verify the deployment

### Option 2: Manual SQL Execution

Using Supabase Dashboard SQL Editor:
1. Go to SQL Editor in your Supabase Dashboard
2. Copy contents of `001_complete_schema.sql`
3. Execute
4. Copy contents of `002_rls_policies.sql`
5. Execute

Using psql:
```bash
psql $DATABASE_URL -f 001_complete_schema.sql
psql $DATABASE_URL -f 002_rls_policies.sql
```

### Option 3: Supabase Migrations

```bash
# From project root
supabase link --project-ref $SUPABASE_PROJECT_REF
supabase db push
```

## TypeScript Types Generation

After deployment, generate TypeScript types:

```bash
supabase gen types typescript --project-id $SUPABASE_PROJECT_REF > lib/supabase/database.types.ts
```

## Verification

### Check Table Count (expect 100+)
```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public';
```

### Check RLS Status
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true;
```

### Check Policies
```sql
SELECT tablename, policyname
FROM pg_policies
WHERE schemaname = 'public';
```

### Check Functions
```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public';
```

## Schema Structure

### Core CRM Tables
- `businesses` - Multi-tenant business accounts
- `users` - Team members with roles
- `customers` - Customer records per business
- `jobs` - Scheduled service jobs
- `leads` - Sales pipeline leads
- `quotes` - Price quotes
- `invoices` - Customer invoices
- `payments` - Payment records

### Admin Portal Tables
- `admin_users` - Sales agents and admin staff
- `crm_accounts` - TradesCaptain CRM customers
- `web_customers` - Website-only customers
- `tc_leads` - Admin portal leads
- `commissions` - Agent commission tracking
- `payment_tracking` - Subscription payment tracking

### Communication
- `sms_conversations` - SMS threads
- `sms_messages` - Individual messages
- `emails` - Email records
- `notifications` - User notifications

### Advanced Features
- `service_agreements` - Recurring service contracts
- `customer_equipment` - Equipment tracking
- `warranties` - Warranty management
- `documents` - File storage references
- `time_entries` - Timesheet tracking

## RLS Policies

Minimal RLS is configured for agent data isolation:

| Table | Policy |
|-------|--------|
| `tc_leads` | Agents see only assigned leads |
| `crm_accounts` | Agents see only attributed accounts |
| `web_customers` | Agents see only attributed customers |
| `commissions` | Agents see only their commissions |

Admin roles (`super_admin`, `admin`) can see all data.

### Future RLS Expansion
Add more policies when you need:
- Team/manager hierarchies (5+ agents)
- Client portal access
- Multi-location isolation
- Finance-only data access

## Troubleshooting

### "Permission denied" errors
Ensure you're using the service role key for backend operations:
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

### "Relation does not exist"
Tables may need to be created in order. Run the complete schema file rather than individual parts.

### TypeScript types not matching
Regenerate types after any schema changes:
```bash
supabase gen types typescript --project-id $SUPABASE_PROJECT_REF > lib/supabase/database.types.ts
```

### RLS blocking queries
For development, you can temporarily bypass RLS:
```typescript
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false }
})
```

## Post-Deployment Checklist

- [ ] Verify table count (100+ expected)
- [ ] Test RLS policies with agent vs admin roles
- [ ] Generate and commit TypeScript types
- [ ] Update `.env` with Supabase credentials
- [ ] Test authentication flow
- [ ] Verify webhook endpoints work

## Support

For issues with this deployment:
1. Check Supabase Dashboard logs
2. Verify environment variables
3. Review PostgreSQL error messages
4. Check RLS policy conflicts

---

Generated for TradesCaptain CRM
Supabase PostgreSQL Deployment
